import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Category, WeeklyDateRanges } from './src/types/finance';
import { localFallbackAutoPlot } from './src/utils/formatters';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health Check
  app.get('/api/health', (_req, res) => {
    const hasGemini = Boolean(getGeminiClient());
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      geminiConfigured: hasGemini,
      mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    });
  });

  // Auto-Plot endpoint using Gemini API with local parser fallback
  app.post('/api/auto-plot', async (req, res) => {
    try {
      const { rawText, categories, weeklyDateRanges } = req.body as {
        rawText?: string;
        categories?: Category[];
        weeklyDateRanges?: WeeklyDateRanges;
      };

      if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
        return res.status(400).json({ error: 'Teks mutasi tidak boleh kosong.' });
      }

      const safeCategories = Array.isArray(categories) ? categories : [];
      const defaultDate =
        weeklyDateRanges?.['Week 2']?.endDate ||
        new Date().toISOString().slice(0, 10);

      const ai = getGeminiClient();
      if (!ai) {
        const items = localFallbackAutoPlot(rawText, safeCategories, defaultDate);
        return res.json({
          engine: 'local-parser',
          items,
          message:
            'GEMINI_API_KEY tidak tersedia, diproses menggunakan parser regex lokal.',
        });
      }

      const categoryCatalog = safeCategories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
      }));

      const systemInstruction = `Kamu adalah asisten akuntansi pribadi berbahasa Indonesia.
Tugasmu: pecah teks mutasi rekening bank mentah (MyBCA/BCA/QRIS) atau catatan harian bebas menjadi array transaksi terstruktur.
Aturan ketat:
1. Bersihkan kolom catatan/merchant ("notes") dari format tanggal mentah, kode referensi acak, serta kata status seperti "Successful", "Berhasil", "DB", "CR", atau nominal berulang. Buat singkat, rapi, dan mudah dibaca (contoh: "Fore Coffee", "Nasi Padang Sederhana", "PLN Token Listrik").
2. Pilih categoryId, categoryName, subcategoryId, subcategoryName yang PALING COCOK dari katalog kategori yang diberikan. Jika tabungan/investasi/reksadana/dana darurat, gunakan kategori "Saving".
3. Tentukan "type": "income" untuk uang masuk (gaji, freelance, CR, bunga, cashback, transfer masuk) dan "expense" untuk uang keluar (DB, QRIS bayar, belanja, tagihan, setor tabungan).
4. Format "date" wajib YYYY-MM-DD. Jika tahun/tanggal tidak disebut, gunakan ${defaultDate}.
5. Format "amount" berupa angka bulat positif (contoh: 28k -> 28000, 1.5jt -> 1500000).
6. Isi "channel" dengan salah satu dari: "MyBCA QRIS", "MyBCA Transfer", "BCA Debit", "Cash", "Manual".
7. Isi "reason" dengan penjelasan singkat 1 kalimat Bahasa Indonesia alasan pemilihan kategori.`;

      const prompt = `Katalog Kategori:\n${JSON.stringify(
        categoryCatalog
      )}\n\nTeks Mutasi / Catatan Mentah:\n${rawText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: 'Tanggal YYYY-MM-DD' },
                amount: { type: Type.NUMBER, description: 'Nominal angka positif' },
                type: {
                  type: Type.STRING,
                  description: 'expense atau income',
                },
                notes: {
                  type: Type.STRING,
                  description: 'Nama merchant atau keterangan bersih',
                },
                channel: {
                  type: Type.STRING,
                  description: 'MyBCA QRIS, MyBCA Transfer, BCA Debit, Cash, atau Manual',
                },
                categoryId: { type: Type.STRING },
                categoryName: { type: Type.STRING },
                subcategoryId: { type: Type.STRING },
                subcategoryName: { type: Type.STRING },
                reason: {
                  type: Type.STRING,
                  description: 'Alasan singkat plotting dalam Bahasa Indonesia',
                },
              },
              required: [
                'date',
                'amount',
                'type',
                'notes',
                'channel',
                'categoryId',
                'categoryName',
                'reason',
              ],
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '[]').trim());
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const fallbackItems = localFallbackAutoPlot(
          rawText,
          safeCategories,
          defaultDate
        );
        return res.json({
          engine: 'local-parser',
          items: fallbackItems,
        });
      }

      const normalized = parsed.map((row: Record<string, unknown>, idx: number) => {
        const matchedCat =
          safeCategories.find((c) => c.id === row.categoryId) ||
          safeCategories.find(
            (c) =>
              c.name.toLowerCase() === String(row.categoryName || '').toLowerCase()
          ) ||
          safeCategories[0];

        const matchedSub =
          matchedCat?.subcategories.find((s) => s.id === row.subcategoryId) ||
          matchedCat?.subcategories.find(
            (s) =>
              s.name.toLowerCase() ===
              String(row.subcategoryName || '').toLowerCase()
          ) ||
          matchedCat?.subcategories[0];

        return {
          id: `plot-${Date.now().toString(36)}-${idx}`,
          selected: true,
          date:
            typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date)
              ? row.date
              : defaultDate,
          amount: Math.max(0, Math.round(Number(row.amount) || 0)),
          type: row.type === 'income' ? 'income' : 'expense',
          notes: String(row.notes || 'Transaksi').trim(),
          channel: String(row.channel || 'Manual').trim(),
          categoryId: matchedCat?.id || String(row.categoryId || 'cat-other'),
          categoryName: matchedCat?.name || String(row.categoryName || 'Lain-lain'),
          subcategoryId: matchedSub?.id,
          subcategoryName: matchedSub?.name,
          reason: String(row.reason || 'Dipetakan oleh Gemini AI'),
        };
      });

      return res.json({
        engine: 'gemini',
        items: normalized,
      });
    } catch (err) {
      console.error('Auto-plot error, falling back to local parser:', err);
      const { rawText, categories, weeklyDateRanges } = req.body || {};
      const defaultDate =
        weeklyDateRanges?.['Week 2']?.endDate ||
        new Date().toISOString().slice(0, 10);
      const fallbackItems = localFallbackAutoPlot(
        String(rawText || ''),
        Array.isArray(categories) ? categories : [],
        defaultDate
      );
      return res.json({
        engine: 'local-parser',
        items: fallbackItems,
        warning:
          'Fallback ke parser lokal karena layanan AI sedang tidak tersedia.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
      plugins: [
        {
          name: 'disable-hmr-websocket-connect',
          transform(code: string, id: string) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.endsWith('/vite/dist/client/client.mjs')) {
              return code.replace(
                'transport.connect(createHMRHandler(handleMessage));',
                '/* WebSocket HMR connection disabled */'
              );
            }
          },
        },
      ],
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DompetSaku server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

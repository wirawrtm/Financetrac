// server.ts
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// src/utils/formatters.ts
function generateId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function localFallbackAutoPlot(rawText, categories, defaultDate = "2026-11-13") {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const items = [];
  const findCat = (keyword, fallbackType) => {
    const match = categories.find(
      (c) => c.name.toLowerCase().includes(keyword.toLowerCase()) && (c.type === fallbackType || c.type === "both")
    );
    if (match) return match;
    return categories.find((c) => c.name.toLowerCase().includes("lain") && (c.type === fallbackType || c.type === "both")) || categories.find((c) => c.type === fallbackType || c.type === "both") || categories[0];
  };
  for (const line of lines) {
    if (/^(tanggal|mutasi|saldo|no\.|keterangan)$/i.test(line)) continue;
    let date = defaultDate;
    const isoDateMatch = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const slashDateMatch = line.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (isoDateMatch) {
      date = isoDateMatch[1];
    } else if (slashDateMatch) {
      const dd = slashDateMatch[1].padStart(2, "0");
      const mm = slashDateMatch[2].padStart(2, "0");
      const yyyy = slashDateMatch[3] ? slashDateMatch[3].length === 2 ? `20${slashDateMatch[3]}` : slashDateMatch[3] : defaultDate.slice(0, 4);
      date = `${yyyy}-${mm}-${dd}`;
    }
    const lower = line.toLowerCase();
    const isIncome = /\b(cr|credit|masuk|gaji|payroll|bonus|freelance|dividen|bunga|cashback|terima|topup masuk)\b/i.test(lower) || /\+\s*(?:rp|idr)?\s*\d/i.test(line);
    const type = isIncome ? "income" : "expense";
    let amount = 0;
    const kMatch = line.match(/\b(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)\b/i);
    const jtMatch = line.match(/\b(\d+(?:[.,]\d+)?)\s*(jt|juta|m)\b/i);
    const idrMatch = line.match(/(?:rp\.?\s*|idr\s*|[-+]\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?:[.,]\d{2})?/gi);
    if (jtMatch) {
      amount = Math.round(parseFloat(jtMatch[1].replace(",", ".")) * 1e6);
    } else if (kMatch) {
      amount = Math.round(parseFloat(kMatch[1].replace(",", ".")) * 1e3);
    } else if (idrMatch) {
      let best = 0;
      for (const token of idrMatch) {
        const cleaned = token.replace(/[^\d.,]/g, "");
        const withoutCents = cleaned.replace(/[.,]\d{2}$/, "");
        const digits = Number(withoutCents.replace(/[.,]/g, ""));
        if (!Number.isNaN(digits) && digits >= 500 && digits > best) {
          best = digits;
        }
      }
      amount = best;
    }
    if (amount <= 0) continue;
    let cleanedNotes = line.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "").replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, "").replace(/\b(successful|berhasil|pending|settled|db|cr|idr|rp\.?)\b/gi, "").replace(/\b\d+(?:[.,]\d+)?\s*(k|rb|ribu|jt|juta)\b/gi, "").replace(/[-+]?\s*\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?/g, "").replace(/\b\d{4,}\b/g, "").replace(/\s{2,}/g, " ").replace(/^[\s\-|:•]+|[\s\-|:•]+$/g, "").trim();
    if (!cleanedNotes) {
      cleanedNotes = type === "income" ? "Pemasukan Mutasi" : "Pengeluaran Mutasi";
    }
    let channel = "Manual";
    if (/qris/i.test(lower)) channel = "MyBCA QRIS";
    else if (/transfer|trf|bi-fast|bifast/i.test(lower)) channel = "MyBCA Transfer";
    else if (/debit|edc/i.test(lower)) channel = "BCA Debit";
    else if (/cash|tunai/i.test(lower)) channel = "Cash";
    else if (/mybca|bca/i.test(lower)) channel = "MyBCA Transfer";
    let cat = findCat("lain", type);
    let subId;
    let subName;
    let reason = "Dipetakan otomatis berdasarkan pola teks lokal";
    if (type === "income") {
      if (/gaji|salary|payroll|freelance|proyek|bonus|komisi/i.test(lower)) {
        cat = findCat("gaji", "income");
        reason = "Terdeteksi kata kunci pendapatan / gaji";
      } else if (/bunga|dividen|tabungan|saving|cashback|reksadana/i.test(lower)) {
        cat = findCat("saving", "income");
        reason = "Terdeteksi imbal hasil / cashback tabungan";
      }
    } else {
      if (/tabung|saving|darurat|reksadana|bibit|deposito|emas/i.test(lower)) {
        cat = findCat("saving", "expense");
        reason = "Terdeteksi alokasi tabungan / investasi (Saving)";
      } else if (/kopi|coffee|starbucks|fore|kenangan|makan|nasi|padang|warung|resto|indomaret|alfamart|supermarket|grocery|groceries|snack|gofood|grabfood/i.test(lower)) {
        cat = findCat("makan", "expense");
        reason = "Terdeteksi merchant makanan, kafe, atau belanja harian";
      } else if (/bensin|spbu|pertamina|shell|pertamax|gojek|grab|parkir|tol|kereta|mrt|transjakarta/i.test(lower)) {
        cat = findCat("transport", "expense");
        reason = "Terdeteksi biaya bahan bakar atau transportasi";
      } else if (/listrik|pln|token|air|pdam|internet|wifi|biznet|indihome|pulsa|telkomsel|bpjs/i.test(lower)) {
        cat = findCat("tagihan", "expense");
        reason = "Terdeteksi pembayaran tagihan rutin & utilitas";
      } else if (/netflix|spotify|bioskop|xxi|game|steam|hiburan|youtube/i.test(lower)) {
        cat = findCat("hiburan", "expense");
        reason = "Terdeteksi langganan streaming atau hiburan";
      } else if (/uniqlo|baju|sepatu|tokopedia|shopee|lazada|belanja|skincare/i.test(lower)) {
        cat = findCat("belanja", "expense");
        reason = "Terdeteksi transaksi belanja pribadi / e-commerce";
      }
    }
    if (cat && cat.subcategories.length > 0) {
      const subMatch = cat.subcategories.find(
        (s) => lower.includes(s.name.toLowerCase().split(" ")[0])
      );
      const chosenSub = subMatch || cat.subcategories[0];
      subId = chosenSub.id;
      subName = chosenSub.name;
    }
    items.push({
      id: generateId("plot"),
      selected: true,
      date,
      amount,
      type,
      notes: cleanedNotes,
      channel,
      categoryId: cat?.id || "cat-other",
      categoryName: cat?.name || "Lain-lain",
      subcategoryId: subId,
      subcategoryName: subName,
      reason
    });
  }
  return items;
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PORT = Number(process.env.PORT || 3e3);
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", (_req, res) => {
    const hasGemini = Boolean(getGeminiClient());
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      geminiConfigured: hasGemini,
      mode: process.env.NODE_ENV === "production" ? "production" : "development"
    });
  });
  app.post("/api/auto-plot", async (req, res) => {
    try {
      const { rawText, categories, weeklyDateRanges } = req.body;
      if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
        return res.status(400).json({ error: "Teks mutasi tidak boleh kosong." });
      }
      const safeCategories = Array.isArray(categories) ? categories : [];
      const defaultDate = weeklyDateRanges?.["Week 2"]?.endDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const ai = getGeminiClient();
      if (!ai) {
        const items = localFallbackAutoPlot(rawText, safeCategories, defaultDate);
        return res.json({
          engine: "local-parser",
          items,
          message: "GEMINI_API_KEY tidak tersedia, diproses menggunakan parser regex lokal."
        });
      }
      const categoryCatalog = safeCategories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name }))
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
      const prompt = `Katalog Kategori:
${JSON.stringify(
        categoryCatalog
      )}

Teks Mutasi / Catatan Mentah:
${rawText}`;
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Tanggal YYYY-MM-DD" },
                amount: { type: Type.NUMBER, description: "Nominal angka positif" },
                type: {
                  type: Type.STRING,
                  description: "expense atau income"
                },
                notes: {
                  type: Type.STRING,
                  description: "Nama merchant atau keterangan bersih"
                },
                channel: {
                  type: Type.STRING,
                  description: "MyBCA QRIS, MyBCA Transfer, BCA Debit, Cash, atau Manual"
                },
                categoryId: { type: Type.STRING },
                categoryName: { type: Type.STRING },
                subcategoryId: { type: Type.STRING },
                subcategoryName: { type: Type.STRING },
                reason: {
                  type: Type.STRING,
                  description: "Alasan singkat plotting dalam Bahasa Indonesia"
                }
              },
              required: [
                "date",
                "amount",
                "type",
                "notes",
                "channel",
                "categoryId",
                "categoryName",
                "reason"
              ]
            }
          }
        }
      });
      const parsed = JSON.parse((response.text ?? "[]").trim());
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const fallbackItems = localFallbackAutoPlot(
          rawText,
          safeCategories,
          defaultDate
        );
        return res.json({
          engine: "local-parser",
          items: fallbackItems
        });
      }
      const normalized = parsed.map((row, idx) => {
        const matchedCat = safeCategories.find((c) => c.id === row.categoryId) || safeCategories.find(
          (c) => c.name.toLowerCase() === String(row.categoryName || "").toLowerCase()
        ) || safeCategories[0];
        const matchedSub = matchedCat?.subcategories.find((s) => s.id === row.subcategoryId) || matchedCat?.subcategories.find(
          (s) => s.name.toLowerCase() === String(row.subcategoryName || "").toLowerCase()
        ) || matchedCat?.subcategories[0];
        return {
          id: `plot-${Date.now().toString(36)}-${idx}`,
          selected: true,
          date: typeof row.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : defaultDate,
          amount: Math.max(0, Math.round(Number(row.amount) || 0)),
          type: row.type === "income" ? "income" : "expense",
          notes: String(row.notes || "Transaksi").trim(),
          channel: String(row.channel || "Manual").trim(),
          categoryId: matchedCat?.id || String(row.categoryId || "cat-other"),
          categoryName: matchedCat?.name || String(row.categoryName || "Lain-lain"),
          subcategoryId: matchedSub?.id,
          subcategoryName: matchedSub?.name,
          reason: String(row.reason || "Dipetakan oleh Gemini AI")
        };
      });
      return res.json({
        engine: "gemini",
        items: normalized
      });
    } catch (err) {
      console.error("Auto-plot error, falling back to local parser:", err);
      const { rawText, categories, weeklyDateRanges } = req.body || {};
      const defaultDate = weeklyDateRanges?.["Week 2"]?.endDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const fallbackItems = localFallbackAutoPlot(
        String(rawText || ""),
        Array.isArray(categories) ? categories : [],
        defaultDate
      );
      return res.json({
        engine: "local-parser",
        items: fallbackItems,
        warning: "Fallback ke parser lokal karena layanan AI sedang tidak tersedia."
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: "spa",
      plugins: [
        {
          name: "disable-hmr-websocket-connect",
          transform(code, id) {
            const normalizedId = id.replace(/\\/g, "/");
            if (normalizedId.endsWith("/vite/dist/client/client.mjs")) {
              return code.replace(
                "transport.connect(createHMRHandler(handleMessage));",
                "/* WebSocket HMR connection disabled */"
              );
            }
          }
        }
      ]
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DompetSaku server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();

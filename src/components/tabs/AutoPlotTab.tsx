import React, { useState } from 'react';
import {
  CheckSquare,
  ClipboardPaste,
  Eraser,
  FileText,
  Loader2,
  Save,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import {
  AutoPlotItem,
  Category,
  Transaction,
  TransactionType,
  WeeklyDateRanges,
} from '../../types/finance';
import {
  detectWeekFromDate,
  formatNumberID,
  generateId,
  localFallbackAutoPlot,
} from '../../utils/formatters';
import { ThousandInput } from '../ThousandInput';

interface AutoPlotTabProps {
  categories: Category[];
  weeklyDateRanges: WeeklyDateRanges;
  isMobileLayout?: boolean;
  onSaveBulkTransactions: (trxs: Transaction[]) => void;
  onNotify: (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message?: string
  ) => void;
}

const SAMPLE_MUTATION_TEXT = `13/11 QRIS FORE COFFEE JAKARTA Successful DB 42.000
13/11 TRF E-BANKING BI-FAST PLN PRABAYAR Successful DB 202.500
12/11 50000 Makan siang nasi padang
11/11 28k Kopi susu gula aren
11/11 TRF DARI PT KREASI DIGITAL CR 3.500.000 Successful
10/11 Setor tabungan reksadana Bibit 500rb
09/11 INDOMARET KEMANG QRIS Successful 87.500`;

export const AutoPlotTab: React.FC<AutoPlotTabProps> = ({
  categories,
  weeklyDateRanges,
  isMobileLayout = false,
  onSaveBulkTransactions,
  onNotify,
}) => {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [engineLabel, setEngineLabel] = useState<string | null>(null);
  const [items, setItems] = useState<AutoPlotItem[]>([]);

  const handlePasteClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        setRawText((prev) => (prev ? `${prev}\n${clip}` : clip));
        onNotify('info', 'Teks ditempel dari clipboard');
      } else {
        onNotify('warning', 'Clipboard kosong');
      }
    } catch {
      onNotify(
        'warning',
        'Akses clipboard diblokir browser',
        'Silakan tempel teks secara manual (Ctrl+V / Cmd+V).'
      );
    }
  };

  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      onNotify('warning', 'Masukkan teks mutasi atau catatan terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/auto-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          categories,
          weeklyDateRanges,
        }),
      });

      if (!resp.ok) {
        throw new Error('Gagal menghubungi layanan auto-plot');
      }

      const data = (await resp.json()) as {
        engine: string;
        items: AutoPlotItem[];
        message?: string;
        warning?: string;
      };

      setItems(data.items || []);
      setEngineLabel(
        data.engine === 'gemini'
          ? 'Gemini AI Server'
          : 'Parser Cerdas Lokal'
      );

      if ((data.items || []).length === 0) {
        onNotify(
          'warning',
          'Tidak ada transaksi terdeteksi',
          'Pastikan setiap baris memuat nominal angka dan keterangan.'
        );
      } else {
        onNotify(
          'success',
          `${data.items.length} rekomendasi transaksi siap ditinjau`
        );
      }
    } catch {
      // Offline / network fallback directly in browser
      const defaultDate = weeklyDateRanges['Week 2']?.endDate || '2026-11-13';
      const fallback = localFallbackAutoPlot(rawText, categories, defaultDate);
      setItems(fallback);
      setEngineLabel('Parser Offline Lokal');
      onNotify(
        'info',
        `${fallback.length} transaksi diproses secara lokal`
      );
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (id: string, patch: Partial<AutoPlotItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleBulkSave = () => {
    const selected = items.filter((i) => i.selected && i.amount > 0);
    if (selected.length === 0) {
      onNotify('warning', 'Pilih minimal 1 transaksi untuk disimpan');
      return;
    }

    const now = Date.now();
    const trxs: Transaction[] = selected.map((item, idx) => ({
      id: generateId(`ai${idx}`),
      date: item.date,
      amount: item.amount,
      type: item.type,
      week: detectWeekFromDate(item.date, weeklyDateRanges),
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      subcategoryId: item.subcategoryId,
      subcategoryName: item.subcategoryName,
      notes: item.notes.trim() || 'Transaksi Mutasi',
      channel: item.channel || 'MyBCA Transfer',
      createdAt: now + idx,
    }));

    onSaveBulkTransactions(trxs);
    setItems((prev) => prev.filter((i) => !i.selected));
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Plotting AI — Auto-Parsing Mutasi Teks
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Tempel mutasi mentah MyBCA atau catatan harian bebas, lalu tinjau
          hasil kategorisasi sebelum disimpan massal.
        </p>
      </div>

      {/* Input Area */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700">
            Teks Mutasi / Catatan Harian
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRawText(SAMPLE_MUTATION_TEXT)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800"
            >
              <FileText className="w-3.5 h-3.5" />
              Contoh Teks
            </button>
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Tempel Clipboard
            </button>
            <button
              type="button"
              onClick={() => {
                setRawText('');
                setItems([]);
                setEngineLabel(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600"
            >
              <Eraser className="w-3.5 h-3.5" />
              Bersihkan
            </button>
          </div>
        </div>

        <textarea
          rows={6}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Tempel beberapa baris mutasi atau catatan cepat, misalnya:\n13/11 QRIS FORE COFFEE Successful 42.000\n50000 Makan siang nasi padang\n28k Kopi susu`}
          className="w-full rounded-xl border border-slate-200 p-4 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {engineLabel ? `Mesin aktif: ${engineLabel}` : 'Siap memproses teks multi-baris'}
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={handleAnalyze}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? 'Menganalisis...' : 'Analisis & Plotting'}
          </button>
        </div>
      </div>

      {/* Review Recommendations */}
      {items.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Hasil Rekomendasi Plotting ({formatNumberID(selectedCount)}/
                {formatNumberID(items.length)} dipilih)
              </h3>
              <p className="text-xs text-slate-500">
                Periksa atau ubah kategori, nominal, dan catatan sebelum simpan
                massal
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allSelected = selectedCount === items.length;
                  setItems((prev) =>
                    prev.map((i) => ({ ...i, selected: !allSelected }))
                  );
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                {selectedCount === items.length
                  ? 'Batal Centang Semua'
                  : 'Centang Semua'}
              </button>
              <button
                type="button"
                onClick={handleBulkSave}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Massal ({formatNumberID(selectedCount)})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const compatCats = categories;
              const activeCat =
                compatCats.find((c) => c.id === item.categoryId) ||
                compatCats[0];

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    item.selected
                      ? 'border-slate-200 bg-slate-50/60'
                      : 'border-slate-100 bg-white opacity-60'
                  }`}
                >
                  <div
                    className={`grid gap-2.5 sm:gap-3 items-center ${
                      isMobileLayout
                        ? 'grid-cols-1'
                        : 'grid-cols-1 lg:grid-cols-12'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between gap-2 ${
                        isMobileLayout ? '' : 'lg:col-span-1'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(item.id, { selected: !item.selected })
                        }
                        aria-label="Pilih item"
                        className="inline-flex items-center gap-2 text-slate-800"
                      >
                        {item.selected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                        <span
                          className={`text-xs font-medium text-slate-600 ${
                            isMobileLayout ? 'inline' : 'inline lg:hidden'
                          }`}
                        >
                          {item.selected ? 'Dipilih' : 'Lewati'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter((i) => i.id !== item.id)
                          )
                        }
                        aria-label="Hapus rekomendasi"
                        className={`${
                          isMobileLayout ? 'inline-flex' : 'inline-flex lg:hidden'
                        } p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) =>
                        updateItem(item.id, { date: e.target.value })
                      }
                      className={`${
                        isMobileLayout ? '' : 'lg:col-span-2'
                      } w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-mono`}
                    />

                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) =>
                        updateItem(item.id, { notes: e.target.value })
                      }
                      className={`${
                        isMobileLayout ? '' : 'lg:col-span-3'
                      } w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium`}
                    />

                    <select
                      value={item.type}
                      onChange={(e) => {
                        const nextType = e.target.value as TransactionType;
                        updateItem(item.id, {
                          type: nextType,
                        });
                      }}
                      className={`${
                        isMobileLayout ? '' : 'lg:col-span-1'
                      } w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs`}
                    >
                      <option value="expense">Keluar</option>
                      <option value="income">Masuk</option>
                    </select>

                    <ThousandInput
                      value={item.amount}
                      onValueChange={(_, numeric) =>
                        updateItem(item.id, {
                          amount: Math.max(0, numeric),
                        })
                      }
                      ariaLabel="Nominal rekomendasi"
                      className={`${
                        isMobileLayout ? '' : 'lg:col-span-2'
                      } w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-mono tabular-nums`}
                    />

                    <select
                      value={activeCat?.id || ''}
                      onChange={(e) => {
                        const chosen = compatCats.find(
                          (c) => c.id === e.target.value
                        );
                        updateItem(item.id, {
                          categoryId: e.target.value,
                          categoryName: chosen?.name || 'Lain-lain',
                          subcategoryId: chosen?.subcategories[0]?.id,
                          subcategoryName: chosen?.subcategories[0]?.name,
                        });
                      }}
                      className={`${
                        isMobileLayout ? '' : 'lg:col-span-2'
                      } w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs`}
                    >
                      {compatCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <div
                      className={`${
                        isMobileLayout
                          ? 'hidden'
                          : 'hidden lg:flex lg:col-span-1 items-center justify-end gap-1'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter((i) => i.id !== item.id)
                          )
                        }
                        aria-label="Hapus rekomendasi"
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Sub-kategori:</span>
                      <select
                        value={item.subcategoryId || ''}
                        onChange={(e) => {
                          const sub = activeCat?.subcategories.find(
                            (s) => s.id === e.target.value
                          );
                          updateItem(item.id, {
                            subcategoryId: sub?.id,
                            subcategoryName: sub?.name,
                          });
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                      >
                        <option value="">Umum</option>
                        {(activeCat?.subcategories || []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <span aria-hidden="true">·</span>
                      <span>Channel: {item.channel}</span>
                    </div>
                    <span className="min-w-0 break-words">
                      Alasan: {item.reason}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

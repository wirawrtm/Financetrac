import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Landmark,
  Layers,
  PiggyBank,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  Category,
  Transaction,
  TransactionType,
  WeeklyDateRanges,
} from '../../types/finance';
import {
  detectWeekFromDate,
  formatCurrency,
  generateId,
} from '../../utils/formatters';

interface InputTransactionTabProps {
  categories: Category[];
  weeklyDateRanges: WeeklyDateRanges;
  currency: 'IDR' | 'USD';
  editingTransaction: Transaction | null;
  onCancelEdit: () => void;
  onSaveSingle: (trx: Transaction, openPortalAfter?: boolean) => void;
  onSaveBatch: (trxs: Transaction[]) => void;
  onDeleteTransaction: (trx: Transaction) => void;
  onInlineAddSubcategory: (categoryId: string, subName: string) => {
    id: string;
    name: string;
  } | null;
}

const CHANNELS = [
  'MyBCA QRIS',
  'MyBCA Transfer',
  'BCA Debit',
  'Cash',
  'Manual',
];

const PRESET_AMOUNTS = [25000, 50000, 100000, 250000, 500000, 1000000];

interface BatchRow {
  id: string;
  date: string;
  type: TransactionType;
  amount: string;
  categoryId: string;
  subcategoryId: string;
  notes: string;
  channel: string;
}

export const InputTransactionTab: React.FC<InputTransactionTabProps> = ({
  categories,
  weeklyDateRanges,
  currency,
  editingTransaction,
  onCancelEdit,
  onSaveSingle,
  onSaveBatch,
  onDeleteTransaction,
  onInlineAddSubcategory,
}) => {
  const [mode, setMode] = useState<'single' | 'multiple'>('single');

  // Single / Edit form state
  const todayIso = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(todayIso);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState('MyBCA QRIS');

  // Inline subcategory creator
  const [showAddSub, setShowAddSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  // Batch rows state
  const createEmptyRow = (): BatchRow => {
    const defaultCat =
      categories.find((c) => c.type === 'expense' || c.type === 'both') ||
      categories[0];
    return {
      id: generateId('row'),
      date: todayIso,
      type: 'expense',
      amount: '',
      categoryId: defaultCat?.id || '',
      subcategoryId: defaultCat?.subcategories[0]?.id || '',
      notes: '',
      channel: 'MyBCA QRIS',
    };
  };

  const [batchRows, setBatchRows] = useState<BatchRow[]>(() => [
    createEmptyRow(),
    createEmptyRow(),
  ]);

  // Populate form when editingTransaction changes
  useEffect(() => {
    if (editingTransaction) {
      setMode('single');
      setType(editingTransaction.type);
      setAmountStr(String(editingTransaction.amount));
      setDate(editingTransaction.date);
      setCategoryId(editingTransaction.categoryId);
      setSubcategoryId(editingTransaction.subcategoryId || '');
      setNotes(editingTransaction.notes);
      setChannel(editingTransaction.channel);
    } else {
      const defaultCat = categories.find(
        (c) => c.type === 'expense' || c.type === 'both'
      );
      if (!categoryId && defaultCat) {
        setCategoryId(defaultCat.id);
        setSubcategoryId(defaultCat.subcategories[0]?.id || '');
      }
    }
  }, [editingTransaction]);

  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === type || c.type === 'both'),
    [categories, type]
  );

  const selectedCategory = useMemo(
    () =>
      availableCategories.find((c) => c.id === categoryId) ||
      availableCategories[0],
    [availableCategories, categoryId]
  );

  // Sync category when type switches
  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const compatible = categories.filter(
      (c) => c.type === nextType || c.type === 'both'
    );
    if (!compatible.some((c) => c.id === categoryId)) {
      const first = compatible[0];
      setCategoryId(first?.id || '');
      setSubcategoryId(first?.subcategories[0]?.id || '');
    }
  };

  const detectedWeek = useMemo(
    () => detectWeekFromDate(date, weeklyDateRanges),
    [date, weeklyDateRanges]
  );

  const handleShortcutSaving = () => {
    const savingCat = categories.find(
      (c) => c.id === 'cat-saving' || c.name.toLowerCase() === 'saving'
    );
    if (savingCat) {
      setCategoryId(savingCat.id);
      setSubcategoryId(savingCat.subcategories[0]?.id || '');
    }
  };

  const handleAddInlineSub = () => {
    if (!selectedCategory || !newSubName.trim()) return;
    const created = onInlineAddSubcategory(selectedCategory.id, newSubName.trim());
    if (created) {
      setSubcategoryId(created.id);
      setNewSubName('');
      setShowAddSub(false);
    }
  };

  const handleMultiplyThousand = () => {
    const numeric = Number(amountStr.replace(/[^\d]/g, '')) || 0;
    if (numeric > 0) {
      setAmountStr(String(numeric * 1000));
    }
  };

  const handleSubmitSingle = (openPortalAfter = false) => {
    const amount = Number(amountStr.replace(/[^\d]/g, '')) || 0;
    if (amount <= 0) return;

    const cat = selectedCategory || categories[0];
    const sub = cat?.subcategories.find((s) => s.id === subcategoryId);

    const payload: Transaction = {
      id: editingTransaction ? editingTransaction.id : generateId('trx'),
      date,
      amount,
      type,
      week: detectedWeek,
      categoryId: cat?.id || 'cat-other',
      categoryName: cat?.name || 'Lain-lain',
      subcategoryId: sub?.id,
      subcategoryName: sub?.name,
      notes: notes.trim() || cat?.name || 'Transaksi',
      channel,
      createdAt: editingTransaction ? editingTransaction.createdAt : Date.now(),
    };

    onSaveSingle(payload, openPortalAfter);
    if (!editingTransaction) {
      setAmountStr('');
      setNotes('');
    }
  };

  const handleSaveMultiple = (e: React.FormEvent) => {
    e.preventDefault();
    const valid: Transaction[] = [];
    const now = Date.now();

    batchRows.forEach((row, idx) => {
      const amt = Number(row.amount.replace(/[^\d]/g, '')) || 0;
      if (amt <= 0) return;
      const cat =
        categories.find((c) => c.id === row.categoryId) || categories[0];
      const sub = cat?.subcategories.find((s) => s.id === row.subcategoryId);

      valid.push({
        id: generateId(`trx${idx}`),
        date: row.date,
        amount: amt,
        type: row.type,
        week: detectWeekFromDate(row.date, weeklyDateRanges),
        categoryId: cat?.id || 'cat-other',
        categoryName: cat?.name || 'Lain-lain',
        subcategoryId: sub?.id,
        subcategoryName: sub?.name,
        notes: row.notes.trim() || cat?.name || 'Transaksi Batch',
        channel: row.channel,
        createdAt: now + idx,
      });
    });

    if (valid.length === 0) return;
    onSaveBatch(valid);
    setBatchRows([createEmptyRow(), createEmptyRow()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {editingTransaction ? 'Edit Transaksi' : 'Input Transaksi'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {editingTransaction
              ? 'Perbarui detail transaksi tanpa mengubah waktu pencatatan asli'
              : 'Catat transaksi tunggal atau banyak baris sekaligus'}
          </p>
        </div>

        {!editingTransaction && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                mode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Transaction
            </button>
            <button
              type="button"
              onClick={() => setMode('multiple')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                mode === 'multiple'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Multiple Transaction
            </button>
          </div>
        )}
      </div>

      {mode === 'single' ? (
        <div className="rounded-2xl bg-white border border-slate-100 p-5 sm:p-6 max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitSingle(false);
            }}
            className="space-y-5"
          >
            {/* Type Switch */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  type === 'expense'
                    ? 'bg-[#D9463E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  type === 'income'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pemasukan
              </button>
            </div>

            {/* Amount + Presets + 000 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nominal Transaksi (IDR)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={1}
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleMultiplyThousand}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-mono font-bold transition-colors whitespace-nowrap"
                >
                  +000
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountStr(String(val))}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono tabular-nums text-slate-700"
                  >
                    {formatCurrency(val, currency, { compact: true })}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Detected Week */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Otomatis masuk ke:{' '}
                  <strong className="text-slate-800">{detectedWeek}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Channel Pembayaran
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category + Saving Shortcut + Subcategory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Kategori Utama
                  </label>
                  <button
                    type="button"
                    onClick={handleShortcutSaving}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800"
                  >
                    <PiggyBank className="w-3 h-3" />
                    Pilih Saving
                  </button>
                </div>
                <select
                  value={selectedCategory?.id || ''}
                  onChange={(e) => {
                    const nextCat = availableCategories.find(
                      (c) => c.id === e.target.value
                    );
                    setCategoryId(e.target.value);
                    setSubcategoryId(nextCat?.subcategories[0]?.id || '');
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Sub-Kategori
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddSub((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                  >
                    <Plus className="w-3 h-3" />
                    Tambah Baru
                  </button>
                </div>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Umum / Tanpa Sub-Kategori --</option>
                  {(selectedCategory?.subcategories || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {showAddSub && (
                  <div className="mt-2 flex gap-1.5">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder="Nama sub-kategori baru..."
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineSub}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSub(false)}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes / Merchant */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan / Nama Merchant
              </label>
              <input
                type="text"
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Kopi Susu Fore Coffee, Belanja Bulanan..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              {editingTransaction ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
                  >
                    Batal Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTransaction(editingTransaction)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                {!editingTransaction && (
                  <button
                    type="button"
                    onClick={() => handleSubmitSingle(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0A3D91] text-sm font-semibold transition-colors"
                  >
                    <Landmark className="w-4 h-4" />
                    Simpan & Portal MyBCA
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
                >
                  {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Multiple Batch Transaction Mode */
        <form
          onSubmit={handleSaveMultiple}
          className="rounded-2xl bg-white border border-slate-100 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Layers className="w-4 h-4" />
              <span>Input Banyak Transaksi ({batchRows.length} baris)</span>
            </div>
            <button
              type="button"
              onClick={() => setBatchRows([...batchRows, createEmptyRow()])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Baris
            </button>
          </div>

          <div className="space-y-3">
            {batchRows.map((row, idx) => {
              const rowCats = categories.filter(
                (c) => c.type === row.type || c.type === 'both'
              );
              const activeCat =
                rowCats.find((c) => c.id === row.categoryId) || rowCats[0];

              return (
                <div
                  key={row.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <span className="md:col-span-1 text-xs font-mono text-slate-400">
                    #{idx + 1}
                  </span>

                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) =>
                      setBatchRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, date: e.target.value } : r
                        )
                      )
                    }
                    className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-mono"
                  />

                  <select
                    value={row.type}
                    onChange={(e) => {
                      const nextType = e.target.value as TransactionType;
                      const compat = categories.filter(
                        (c) => c.type === nextType || c.type === 'both'
                      );
                      setBatchRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id
                            ? {
                                ...r,
                                type: nextType,
                                categoryId: compat[0]?.id || r.categoryId,
                                subcategoryId:
                                  compat[0]?.subcategories[0]?.id || '',
                              }
                            : r
                        )
                      );
                    }}
                    className="md:col-span-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                  >
                    <option value="expense">Keluar</option>
                    <option value="income">Masuk</option>
                  </select>

                  <input
                    type="number"
                    min={1}
                    placeholder="Nominal"
                    value={row.amount}
                    onChange={(e) =>
                      setBatchRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, amount: e.target.value } : r
                        )
                      )
                    }
                    className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-mono tabular-nums"
                  />

                  <select
                    value={activeCat?.id || ''}
                    onChange={(e) => {
                      const nextCat = rowCats.find(
                        (c) => c.id === e.target.value
                      );
                      setBatchRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id
                            ? {
                                ...r,
                                categoryId: e.target.value,
                                subcategoryId:
                                  nextCat?.subcategories[0]?.id || '',
                              }
                            : r
                        )
                      );
                    }}
                    className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                  >
                    {rowCats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Catatan / Merchant"
                    value={row.notes}
                    onChange={(e) =>
                      setBatchRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, notes: e.target.value } : r
                        )
                      )
                    }
                    className="md:col-span-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
                  />

                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={batchRows.length <= 1}
                      onClick={() =>
                        setBatchRows((prev) =>
                          prev.filter((r) => r.id !== row.id)
                        )
                      }
                      aria-label="Hapus baris"
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
            >
              Simpan Semua Transaksi Valid
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

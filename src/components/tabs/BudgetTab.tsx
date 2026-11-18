import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CopyCheck, Wallet } from 'lucide-react';
import {
  Category,
  Transaction,
  WeekKey,
  WeeklyBudgets,
  WeeklyDateRanges,
} from '../../types/finance';
import { formatCurrency, formatNumberID } from '../../utils/formatters';
import { isSavingCategoryTransaction } from '../../db/dummyDb';
import { ThousandInput } from '../ThousandInput';

interface BudgetTabProps {
  transactions: Transaction[];
  categories: Category[];
  weeklyBudgets: WeeklyBudgets;
  weeklyDateRanges: WeeklyDateRanges;
  currency: 'IDR' | 'USD';
  isMobileLayout?: boolean;
  onSaveBudgetsAndRanges: (
    budgets: WeeklyBudgets,
    ranges: WeeklyDateRanges
  ) => void;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({
  transactions,
  categories,
  weeklyBudgets,
  weeklyDateRanges,
  currency,
  isMobileLayout = false,
  onSaveBudgetsAndRanges,
}) => {
  const [draftBudgets, setDraftBudgets] =
    useState<WeeklyBudgets>(weeklyBudgets);
  const [draftRanges, setDraftRanges] =
    useState<WeeklyDateRanges>(weeklyDateRanges);
  const [uniformAmount, setUniformAmount] = useState('1500000');
  const [inspectWeek, setInspectWeek] = useState<
    'Week 1' | 'Week 2' | 'Week 3' | 'Week 4'
  >('Week 2');

  useEffect(() => {
    setDraftBudgets(weeklyBudgets);
    setDraftRanges(weeklyDateRanges);
  }, [weeklyBudgets, weeklyDateRanges]);

  const handleApplyUniform = () => {
    const amt = Math.max(0, Number(uniformAmount) || 0);
    setDraftBudgets({
      'Week 1': amt,
      'Week 2': amt,
      'Week 3': amt,
      'Week 4': amt,
      Monthly: amt * 4,
    });
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBudgetsAndRanges(draftBudgets, draftRanges);
  };

  const weekSummaries = useMemo(() => {
    const keys: WeekKey[] = [
      'Week 1',
      'Week 2',
      'Week 3',
      'Week 4',
      'Monthly',
    ];
    return keys.map((wk) => {
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            !isSavingCategoryTransaction(t) &&
            (wk === 'Monthly' ? true : t.week === wk)
        )
        .reduce((sum, t) => sum + t.amount, 0);
      const limit = weeklyBudgets[wk] || 0;
      const remaining = limit - spent;
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return { wk, spent, limit, remaining, pct };
    });
  }, [transactions, weeklyBudgets]);

  const categoryRealization = useMemo(() => {
    const weekTrxs = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        !isSavingCategoryTransaction(t) &&
        t.week === inspectWeek
    );
    const totalWeekSpent = weekTrxs.reduce((s, t) => s + t.amount, 0);
    const map = new Map<string, number>();
    for (const t of weekTrxs) {
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
    }

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          catId,
          name: cat?.name || 'Lain-lain',
          color: cat?.color || '#64748B',
          amount,
          share:
            totalWeekSpent > 0 ? Math.round((amount / totalWeekSpent) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categories, inspectWeek]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Perencanaan Anggaran Mingguan & Bulanan
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur batas anggaran dan rentang tanggal Week 1–4. Perubahan rentang
          tanggal otomatis menyinkronkan label minggu pada transaksi yang ada.
        </p>
      </div>

      {/* Overview Cards */}
      <div
        className={`grid gap-3 ${
          isMobileLayout
            ? 'grid-cols-2'
            : 'grid-cols-2 lg:grid-cols-5'
        }`}
      >
        {weekSummaries.map((item) => (
          <div
            key={item.wk}
            className={`min-w-0 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-3.5 sm:p-4 ${
              item.wk === 'Monthly'
                ? isMobileLayout
                  ? 'col-span-2'
                  : 'col-span-2 lg:col-span-1'
                : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-900 truncate">
                {item.wk === 'Monthly' ? 'Bulanan' : item.wk}
              </span>
              <span
                className={`font-mono font-semibold tabular-nums shrink-0 ${
                  item.pct > 100 ? 'text-red-600' : 'text-slate-500'
                }`}
              >
                {formatNumberID(item.pct)}%
              </span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900 tabular-nums truncate">
              {formatCurrency(item.spent, currency)}
            </p>
            <p className="text-[11px] text-slate-400 tabular-nums truncate">
              dari {formatCurrency(item.limit, currency)}
            </p>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  item.pct > 100
                    ? 'bg-red-600'
                    : item.pct > 80
                    ? 'bg-amber-500'
                    : 'bg-slate-900'
                }`}
                style={{ width: `${Math.min(100, item.pct)}%` }}
              />
            </div>
            <p
              className={`mt-2 text-[11px] tabular-nums truncate ${
                item.remaining < 0 ? 'text-red-600 font-medium' : 'text-slate-500'
              }`}
            >
              {item.remaining >= 0
                ? `Sisa ${formatCurrency(item.remaining, currency, {
                    compact: true,
                  })}`
                : `Over ${formatCurrency(Math.abs(item.remaining), currency, {
                    compact: true,
                  })}`}
            </p>
          </div>
        ))}
      </div>

      {/* Form: Uniform + Per-Week Caps + Date Ranges */}
      <form
        onSubmit={handleSaveAll}
        className="rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-4 sm:p-5 space-y-6"
      >
        <div
          className={`flex justify-between gap-4 pb-5 border-b border-slate-100 ${
            isMobileLayout ? 'flex-col' : 'flex-col sm:flex-row sm:items-end'
          }`}
        >
          <div className="flex-1 min-w-0 max-w-sm">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Atur Nominal Seragam ke Seluruh Minggu (W1–W4)
            </label>
            <div
              className={`flex gap-2 ${
                isMobileLayout ? 'flex-col' : 'flex-col sm:flex-row'
              }`}
            >
              <ThousandInput
                allowZero
                value={uniformAmount}
                onValueChange={(raw) => setUniformAmount(raw)}
                ariaLabel="Nominal anggaran seragam"
                className="w-full min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono tabular-nums"
              />
              <button
                type="button"
                onClick={handleApplyUniform}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <CopyCheck className="w-3.5 h-3.5" />
                Terapkan Seragam
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <Check className="w-4 h-4" />
            Simpan Anggaran & Rentang Tanggal
          </button>
        </div>

        <div className="space-y-3">
          {(['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Monthly'] as WeekKey[]).map(
            (wk) => (
              <div
                key={wk}
                className={`grid gap-3 items-center p-3.5 rounded-xl bg-slate-50 border border-slate-100 ${
                  isMobileLayout
                    ? 'grid-cols-1'
                    : 'grid-cols-1 md:grid-cols-12'
                }`}
              >
                <div
                  className={`${
                    isMobileLayout ? '' : 'md:col-span-2'
                  } flex items-center gap-2`}
                >
                  <Wallet className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-900">
                    {wk === 'Monthly' ? 'Monthly (Bulanan)' : wk}
                  </span>
                </div>

                <div className={isMobileLayout ? '' : 'md:col-span-4'}>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Batas Anggaran (IDR)
                  </label>
                  <ThousandInput
                    allowZero
                    value={draftBudgets[wk]}
                    onValueChange={(_, numeric) =>
                      setDraftBudgets({
                        ...draftBudgets,
                        [wk]: Math.max(0, numeric),
                      })
                    }
                    ariaLabel={`Batas anggaran ${wk}`}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>

                <div className={isMobileLayout ? '' : 'md:col-span-3'}>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={draftRanges[wk]?.startDate || ''}
                    onChange={(e) =>
                      setDraftRanges({
                        ...draftRanges,
                        [wk]: {
                          ...draftRanges[wk],
                          startDate: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div className={isMobileLayout ? '' : 'md:col-span-3'}>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={draftRanges[wk]?.endDate || ''}
                    onChange={(e) =>
                      setDraftRanges({
                        ...draftRanges,
                        [wk]: {
                          ...draftRanges[wk],
                          endDate: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
            )
          )}
        </div>
      </form>

      {/* Per-Category Weekly Realization */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-700 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900">
              Realisasi Pengeluaran per Kategori
            </h3>
          </div>

          <div className="max-w-full flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {(['Week 1', 'Week 2', 'Week 3', 'Week 4'] as const).map((wk) => (
              <button
                key={wk}
                type="button"
                onClick={() => setInspectWeek(wk)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  inspectWeek === wk
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {wk}
              </button>
            ))}
          </div>
        </div>

        {categoryRealization.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Belum ada pengeluaran tercatat di {inspectWeek}.
          </p>
        ) : (
          <div
            className={`grid gap-x-6 gap-y-3.5 ${
              isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {categoryRealization.map((row) => (
              <div key={row.catId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-800 truncate min-w-0">
                    {row.name}
                  </span>
                  <span className="font-mono tabular-nums text-slate-700 shrink-0">
                    {formatCurrency(row.amount, currency)} ·{' '}
                    {formatNumberID(row.share)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${row.share}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

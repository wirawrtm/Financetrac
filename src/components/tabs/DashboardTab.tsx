import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  Category,
  DriveImageItem,
  TabKey,
  Transaction,
  UserProfile,
  WeekKey,
  WeeklyBudgets,
  WeeklyDateRanges,
} from '../../types/finance';
import {
  detectWeekFromDate,
  formatCurrency,
  formatMonthYearID,
  formatNumberID,
  formatShortDateTime,
} from '../../utils/formatters';
import { PROTECTED_SAVING_SUBCATEGORY_ID } from '../../db/dummyDb';
import { CategoryIcon } from '../CategoryIcon';
import { LeatherWalletCard } from '../LeatherWalletCard';

interface DashboardTabProps {
  transactions: Transaction[];
  categories: Category[];
  weeklyBudgets: WeeklyBudgets;
  weeklyDateRanges: WeeklyDateRanges;
  profile: UserProfile;
  gallery: DriveImageItem[];
  isMobileLayout: boolean;
  onNavigateTab: (tab: TabKey) => void;
  onOpenProfile: () => void;
  onOpenMyBca: () => void;
  onEditTransaction: (trx: Transaction) => void;
  onDeleteTransaction: (trx: Transaction) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  transactions,
  categories,
  weeklyBudgets,
  weeklyDateRanges,
  profile,
  gallery,
  isMobileLayout,
  onNavigateTab,
  onOpenProfile,
  onOpenMyBca,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [selectedBudgetWeek, setSelectedBudgetWeek] =
    useState<WeekKey>('Monthly');
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let savingOut = 0;
    let savingIn = 0;

    for (const t of transactions) {
      const isSavingCat =
        t.categoryId === 'cat-saving' ||
        t.categoryName.trim().toLowerCase() === 'saving';
      const isSavingSub =
        t.subcategoryId === PROTECTED_SAVING_SUBCATEGORY_ID ||
        (t.subcategoryName || '').trim().toLowerCase() === 'saving';
      const isSaving = isSavingCat && isSavingSub;
      if (t.type === 'income') {
        totalIncome += t.amount;
        if (isSaving) savingIn += t.amount;
      } else {
        totalExpense += t.amount;
        if (isSaving) savingOut += t.amount;
      }
    }

    const currentBalance = profile.initialBalance + totalIncome - totalExpense;
    const totalSaving = savingOut + savingIn;

    return {
      currentBalance,
      totalIncome,
      totalExpense,
      totalSaving,
      savingOut,
      savingIn,
    };
  }, [transactions, profile.initialBalance]);

  // Weekly stats (Week 1-4)
  const weeklyStats = useMemo(() => {
    const keys: ('Week 1' | 'Week 2' | 'Week 3' | 'Week 4')[] = [
      'Week 1',
      'Week 2',
      'Week 3',
      'Week 4',
    ];
    return keys.map((week) => {
      let income = 0;
      let expense = 0;
      for (const t of transactions) {
        if (t.week === week) {
          if (t.type === 'income') income += t.amount;
          else expense += t.amount;
        }
      }
      const budget = weeklyBudgets[week] || 0;
      const pct = budget > 0 ? Math.min(100, Math.round((expense / budget) * 100)) : 0;
      const rawPct = budget > 0 ? Math.round((expense / budget) * 100) : 0;
      const remaining = budget - expense;
      return {
        week,
        income,
        expense,
        budget,
        pct,
        rawPct,
        remaining,
        overBudget: budget > 0 && expense > budget,
        range: weeklyDateRanges[week],
      };
    });
  }, [transactions, weeklyBudgets, weeklyDateRanges]);

  // Selected week budget breakdown by category & subcategory
  const selectedBudgetBreakdown = useMemo(() => {
    const filtered = transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (selectedBudgetWeek === 'Monthly') return true;
      return t.week === selectedBudgetWeek;
    });

    const totalSpent = filtered.reduce((acc, t) => acc + t.amount, 0);
    const limit = weeklyBudgets[selectedBudgetWeek] || 0;

    type SubBreakdownEntry = {
      name: string;
      total: number;
      count: number;
      weekTotals: Record<'Week 1' | 'Week 2' | 'Week 3' | 'Week 4', number>;
    };

    const catMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        total: number;
        color: string;
        subs: Map<string, SubBreakdownEntry>;
        weekTotals: Record<'Week 1' | 'Week 2' | 'Week 3' | 'Week 4', number>;
      }
    >();

    for (const t of filtered) {
      const cat = categories.find((c) => c.id === t.categoryId);
      const entry = catMap.get(t.categoryId) || {
        categoryId: t.categoryId,
        categoryName: cat?.name || t.categoryName,
        total: 0,
        color: cat?.color || '#64748B',
        subs: new Map<string, SubBreakdownEntry>(),
        weekTotals: {
          'Week 1': 0,
          'Week 2': 0,
          'Week 3': 0,
          'Week 4': 0,
        },
      };
      entry.total += t.amount;
      const isValidWeek =
        t.week === 'Week 1' ||
        t.week === 'Week 2' ||
        t.week === 'Week 3' ||
        t.week === 'Week 4';
      if (isValidWeek) {
        entry.weekTotals[t.week as 'Week 1' | 'Week 2' | 'Week 3' | 'Week 4'] +=
          t.amount;
      }

      const subLabel = t.subcategoryName || 'Umum';
      const subEntry = entry.subs.get(subLabel) || {
        name: subLabel,
        total: 0,
        count: 0,
        weekTotals: {
          'Week 1': 0,
          'Week 2': 0,
          'Week 3': 0,
          'Week 4': 0,
        },
      };
      subEntry.total += t.amount;
      subEntry.count += 1;
      if (isValidWeek) {
        subEntry.weekTotals[
          t.week as 'Week 1' | 'Week 2' | 'Week 3' | 'Week 4'
        ] += t.amount;
      }
      entry.subs.set(subLabel, subEntry);
      catMap.set(t.categoryId, entry);
    }

    const breakdown = Array.from(catMap.values())
      .map((entry) => ({
        ...entry,
        subList: Array.from(entry.subs.values()).sort(
          (a, b) => b.total - a.total
        ),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalSpent,
      limit,
      remaining: limit - totalSpent,
      pct: limit > 0 ? Math.round((totalSpent / limit) * 100) : 0,
      breakdown,
    };
  }, [transactions, selectedBudgetWeek, weeklyBudgets, categories]);

  // Grouped recent transactions (latest 8)
  const groupedRecent = useMemo(() => {
    const sorted = [...transactions]
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt - a.createdAt;
      })
      .slice(0, 8);

    const groups: { monthKey: string; label: string; items: Transaction[] }[] =
      [];
    for (const trx of sorted) {
      const monthKey = trx.date.slice(0, 7);
      let grp = groups.find((g) => g.monthKey === monthKey);
      if (!grp) {
        grp = {
          monthKey,
          label: formatMonthYearID(monthKey),
          items: [],
        };
        groups.push(grp);
      }
      grp.items.push(trx);
    }
    return groups;
  }, [transactions]);

  const maxChartVal = useMemo(() => {
    let max = 1;
    for (const w of weeklyStats) {
      if (w.budget > max) max = w.budget;
      if (w.expense > max) max = w.expense;
    }
    return max;
  }, [weeklyStats]);

  const activeRunningWeek = useMemo(() => {
    if (selectedBudgetWeek !== 'Monthly') return selectedBudgetWeek;
    const todayIso = new Date().toISOString().slice(0, 10);
    const detected = detectWeekFromDate(todayIso, weeklyDateRanges);
    return detected === 'Monthly' ? 'Week 2' : detected;
  }, [selectedBudgetWeek, weeklyDateRanges]);

  const activeRunningStat = useMemo(
    () =>
      weeklyStats.find((w) => w.week === activeRunningWeek) || weeklyStats[0],
    [weeklyStats, activeRunningWeek]
  );

  return (
    <div className="space-y-6">
      {/* Top Hero: Tactile Leather Wallet */}
      <div className={isMobileLayout ? '' : 'max-w-[440px]'}>
        {(() => {
          const totalMonthlyPlusWeeklyBudget =
            (weeklyBudgets['Week 1'] || 0) +
            (weeklyBudgets['Week 2'] || 0) +
            (weeklyBudgets['Week 3'] || 0) +
            (weeklyBudgets['Week 4'] || 0) +
            (weeklyBudgets.Monthly || 0);
          return (
            <LeatherWalletCard
              balance={summary.currentBalance}
              monthlyBudget={totalMonthlyPlusWeeklyBudget}
              monthlySpending={summary.totalExpense}
              monthlyRemaining={
                totalMonthlyPlusWeeklyBudget - summary.totalExpense
              }
              monthlySaving={summary.totalSaving}
              runningWeekLabel={activeRunningWeek}
              budget={activeRunningStat?.budget ?? 0}
              remaining={activeRunningStat?.remaining ?? 0}
              spending={activeRunningStat?.expense ?? 0}
              profile={profile}
            />
          );
        })()}
      </div>

      {/* Transactions Section (Styled directly after the visual reference) */}
      <div
        className={`grid gap-6 ${
          isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* Left/Main: Recent Transactions Card */}
        <div className={isMobileLayout ? '' : 'lg:col-span-7'}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              Transaksi Terbaru
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('history')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              Lihat Semua
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {groupedRecent.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-100 p-8 text-center">
              <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="mt-3 text-sm font-semibold text-slate-800">
                Belum ada transaksi tercatat
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Mulai catat pengeluaran atau pemasukan pertama Anda.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('input')}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Tambah Transaksi
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedRecent.map((grp) => (
                <div key={grp.monthKey}>
                  <p className="text-xs font-semibold text-slate-400 mb-2">
                    {grp.label}
                  </p>
                  <div className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                    {grp.items.map((trx) => {
                      const cat = categories.find(
                        (c) => c.id === trx.categoryId
                      );
                      return (
                        <div
                          key={trx.id}
                          className="group flex items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-3 sm:py-3.5 hover:bg-slate-50/70 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => onEditTransaction(trx)}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left"
                          >
                            <CategoryIcon
                              category={cat}
                              gallery={gallery}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {trx.notes}
                              </p>
                              <p className="text-xs text-slate-400 truncate mt-0.5 tabular-nums">
                                {formatShortDateTime(trx.date, trx.createdAt)} ·{' '}
                                {trx.channel}
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <div className="text-right min-w-0">
                              <p
                                className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
                                  trx.type === 'expense'
                                    ? 'text-[#D9463E]'
                                    : 'text-slate-900'
                                }`}
                              >
                                {formatCurrency(trx.amount, profile.currency, {
                                  showSign: true,
                                  type: trx.type,
                                })}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[100px] sm:max-w-[130px] ml-auto">
                                {trx.categoryName}
                                {trx.subcategoryName
                                  ? ` / ${trx.subcategoryName}`
                                  : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => onEditTransaction(trx)}
                                aria-label="Edit transaksi"
                                title="Edit transaksi"
                                className={`${
                                  isMobileLayout ? 'hidden' : 'hidden sm:inline-flex'
                                } p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction(trx)}
                                aria-label="Hapus transaksi"
                                title="Hapus transaksi"
                                className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Weekly Budget Status & Charts */}
        <div className={`space-y-5 ${isMobileLayout ? '' : 'lg:col-span-5'}`}>
          {/* Weekly Cashflow Visual Bar Chart */}
          <div className="rounded-3xl bg-white border border-slate-100 px-3.5 py-4 sm:p-5 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">
                  Arus Kas Mingguan
                </h3>
                <p className="text-xs text-slate-500">
                  Perbandingan budget &amp; pengeluaran W1–W4
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block" />
                  Budget
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9463E] inline-block" />
                  Keluar
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 sm:gap-2 pt-1">
              {weeklyStats.map((w) => {
                const budgetHeight =
                  w.budget > 0
                    ? Math.max(28, Math.round((w.budget / maxChartVal) * 108))
                    : 14;
                const outHeight =
                  w.expense > 0
                    ? Math.max(28, Math.round((w.expense / maxChartVal) * 108))
                    : 14;
                const isSelected = selectedBudgetWeek === w.week;
                const hasSelection = selectedBudgetWeek !== 'Monthly';

                return (
                  <button
                    key={w.week}
                    type="button"
                    onClick={() =>
                      setSelectedBudgetWeek((prev) =>
                        prev === w.week ? 'Monthly' : w.week
                      )
                    }
                    aria-pressed={isSelected}
                    className={`min-w-0 flex flex-col items-center rounded-2xl px-0.5 sm:px-1.5 py-2 sm:py-2.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                      isSelected
                        ? 'bg-slate-100 ring-2 ring-slate-900 shadow-xs'
                        : hasSelection
                        ? 'opacity-65 hover:opacity-100 hover:bg-slate-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Top Percentage */}
                    <span
                      className={`mb-2 text-[11px] font-bold tabular-nums whitespace-nowrap ${
                        w.overBudget
                          ? 'text-[#D9463E]'
                          : isSelected
                          ? 'text-slate-900'
                          : 'text-slate-600'
                      }`}
                    >
                      {formatNumberID(w.rawPct)}%
                    </span>

                    {/* Overlapping Thick Rounded Bars */}
                    <div className="h-32 w-full flex items-end justify-center pb-2.5 border-b border-slate-200/70">
                      <div
                        className={`relative z-0 ${
                          isMobileLayout ? 'w-10' : 'w-10 sm:w-14'
                        } rounded-full transition-all ${
                          w.budget > 0 ? 'bg-slate-900' : 'bg-slate-200'
                        }`}
                        style={{ height: `${budgetHeight}px` }}
                        title={`Budget: ${formatCurrency(w.budget, profile.currency)}`}
                      />
                      <div
                        className={`relative z-10 ${
                          isMobileLayout
                            ? '-ml-5 w-10'
                            : '-ml-5 sm:-ml-7 w-10 sm:w-14'
                        } rounded-full ring-2 ${
                          isSelected ? 'ring-slate-100' : 'ring-white'
                        } transition-all ${
                          w.expense > 0 ? 'bg-[#D9463E]' : 'bg-rose-100'
                        }`}
                        style={{ height: `${outHeight}px` }}
                        title={`Keluar: ${formatCurrency(w.expense, profile.currency)}`}
                      />
                    </div>

                    {/* Week Label & Remaining (Sisa) */}
                    <span
                      className={`mt-2 text-xs font-bold ${
                        isSelected ? 'text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {w.week.replace('Week ', 'W')}
                    </span>
                    <span
                      className={`max-w-full truncate text-[10px] tabular-nums ${
                        w.remaining < 0
                          ? 'text-[#D9463E] font-semibold'
                          : 'text-slate-500'
                      }`}
                      title={`Sisa anggaran: ${formatCurrency(w.remaining, profile.currency)}`}
                    >
                      Sisa{' '}
                      {w.remaining < 0 ? '-' : ''}
                      {formatCurrency(Math.abs(w.remaining), profile.currency, {
                        compact: true,
                      })}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedBudgetWeek !== 'Monthly' && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                {(() => {
                  const active = weeklyStats.find(
                    (item) => item.week === selectedBudgetWeek
                  );
                  if (!active) return null;
                  return (
                    <>
                      <span className="text-slate-600 tabular-nums">
                        <strong className="text-slate-900">{active.week}</strong>{' '}
                        · Budget{' '}
                        {formatCurrency(active.budget, profile.currency, {
                          compact: true,
                        })}{' '}
                        · Keluar{' '}
                        {formatCurrency(active.expense, profile.currency, {
                          compact: true,
                        })}{' '}
                        · Sisa{' '}
                        <strong
                          className={
                            active.remaining < 0
                              ? 'text-[#D9463E]'
                              : 'text-emerald-700'
                          }
                        >
                          {active.remaining < 0 ? '-' : ''}
                          {formatCurrency(
                            Math.abs(active.remaining),
                            profile.currency,
                            { compact: true }
                          )}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedBudgetWeek('Monthly')}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                      >
                        Reset Pilihan
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Budget Status Breakdown by Week/Monthly & Category/Subcategory */}
          <div className="rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Status Anggaran
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('budget')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Kelola
              </button>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(
                ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Monthly'] as WeekKey[]
              ).map((wk) => (
                <button
                  key={wk}
                  type="button"
                  onClick={() => setSelectedBudgetWeek(wk)}
                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedBudgetWeek === wk
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {wk === 'Monthly' ? 'Bulanan' : wk.replace('Week ', 'W')}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="text-xs text-slate-500">
                  Terpakai ({formatNumberID(selectedBudgetBreakdown.pct)}%)
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-700">
                  {formatCurrency(
                    selectedBudgetBreakdown.totalSpent,
                    profile.currency
                  )}{' '}
                  /{' '}
                  {formatCurrency(
                    selectedBudgetBreakdown.limit,
                    profile.currency
                  )}
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    selectedBudgetBreakdown.pct > 100
                      ? 'bg-red-600'
                      : selectedBudgetBreakdown.pct > 80
                      ? 'bg-amber-500'
                      : 'bg-slate-900'
                  }`}
                  style={{
                    width: `${Math.min(100, selectedBudgetBreakdown.pct)}%`,
                  }}
                />
              </div>
              <p
                className={`mt-1.5 text-xs tabular-nums ${
                  selectedBudgetBreakdown.remaining < 0
                    ? 'text-red-600 font-medium'
                    : 'text-slate-500'
                }`}
              >
                {selectedBudgetBreakdown.remaining >= 0
                  ? `Sisa anggaran: ${formatCurrency(
                      selectedBudgetBreakdown.remaining,
                      profile.currency
                    )}`
                  : `Melebihi anggaran: ${formatCurrency(
                      Math.abs(selectedBudgetBreakdown.remaining),
                      profile.currency
                    )}`}
              </p>
            </div>

            {/* Per-Week Spending Charts & Numbers Summary (W1-W4) */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div
                className={`grid gap-2 ${
                  isMobileLayout ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
                }`}
              >
                {weeklyStats.map((w) => {
                  const isActiveWk = selectedBudgetWeek === w.week;
                  return (
                    <button
                      key={w.week}
                      type="button"
                      onClick={() =>
                        setSelectedBudgetWeek(
                          isActiveWk ? 'Monthly' : w.week
                        )
                      }
                      className={`min-w-0 text-left rounded-xl px-2.5 py-2 transition-colors ${
                        isActiveWk
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <span
                          className={
                            isActiveWk ? 'text-slate-300' : 'text-slate-500'
                          }
                        >
                          {w.week.replace('Week ', 'W')}
                        </span>
                        <span
                          className={`font-mono tabular-nums ${
                            w.overBudget
                              ? isActiveWk
                                ? 'text-rose-300'
                                : 'text-[#D9463E]'
                              : isActiveWk
                              ? 'text-slate-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatNumberID(w.rawPct)}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-mono font-bold tabular-nums truncate">
                        {formatCurrency(w.expense, profile.currency, {
                          compact: true,
                        })}
                      </p>
                      <div
                        className={`mt-1.5 h-1.5 w-full rounded-full overflow-hidden ${
                          isActiveWk ? 'bg-white/20' : 'bg-slate-200'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${
                            w.overBudget
                              ? 'bg-[#D9463E]'
                              : isActiveWk
                              ? 'bg-emerald-300'
                              : 'bg-slate-900'
                          }`}
                          style={{ width: `${Math.min(100, w.rawPct)}%` }}
                        />
                      </div>
                      <p
                        className={`mt-1 text-[10px] tabular-nums truncate ${
                          isActiveWk
                            ? 'text-slate-300'
                            : w.remaining < 0
                            ? 'text-[#D9463E]'
                            : 'text-slate-400'
                        }`}
                      >
                        / {formatCurrency(w.budget, profile.currency, { compact: true })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Separate Card: Rincian Kategori & Sub-Kategori */}
          <div className="rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 overflow-hidden space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Rincian Kategori &amp; Sub-Kategori
                </h3>
                <p className="text-[11px] text-slate-500">
                  Periode:{' '}
                  {selectedBudgetWeek === 'Monthly'
                    ? 'Bulanan'
                    : selectedBudgetWeek}
                </p>
              </div>
              {selectedBudgetBreakdown.breakdown.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const allOpen =
                      selectedBudgetBreakdown.breakdown.every(
                        (c) => expandedCategories[c.categoryId] ?? false
                      );
                    const next: Record<string, boolean> = {};
                    for (const c of selectedBudgetBreakdown.breakdown) {
                      next[c.categoryId] = !allOpen;
                    }
                    setExpandedCategories(next);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors shrink-0"
                >
                  {selectedBudgetBreakdown.breakdown.every(
                    (c) => expandedCategories[c.categoryId] ?? false
                  )
                    ? 'Tutup Semua'
                    : 'Buka Semua'}
                </button>
              )}
            </div>

            {selectedBudgetBreakdown.breakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Belum ada pengeluaran di periode {selectedBudgetWeek}.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedBudgetBreakdown.breakdown.map((item) => {
                  const pctOfSpent =
                    selectedBudgetBreakdown.totalSpent > 0
                      ? Math.round(
                          (item.total / selectedBudgetBreakdown.totalSpent) * 100
                        )
                      : 0;
                  const maxCatWeekVal = Math.max(
                    1,
                    item.weekTotals['Week 1'],
                    item.weekTotals['Week 2'],
                    item.weekTotals['Week 3'],
                    item.weekTotals['Week 4']
                  );
                  const isExpanded =
                    expandedCategories[item.categoryId] ?? false;

                  return (
                    <div
                      key={item.categoryId}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-2.5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategories((prev) => ({
                            ...prev,
                            [item.categoryId]: !(
                              prev[item.categoryId] ?? false
                            ),
                          }))
                        }
                        aria-expanded={isExpanded}
                        className="w-full flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs rounded-lg py-0.5 hover:bg-white/70 transition-colors text-left"
                      >
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-slate-800 truncate">
                            {item.categoryName}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                            ({formatNumberID(item.subList.length)} sub)
                          </span>
                        </span>
                        <span className="font-mono tabular-nums text-slate-700 shrink-0 ml-auto">
                          {formatCurrency(item.total, profile.currency)} ·{' '}
                          {formatNumberID(pctOfSpent)}%
                        </span>
                      </button>

                      {/* Per-Week Chart Bars (W1-W4) for this Category */}
                      <div
                        className={`grid gap-2 ${
                          isMobileLayout
                            ? 'grid-cols-2'
                            : 'grid-cols-2 sm:grid-cols-4'
                        }`}
                      >
                        {(
                          ['Week 1', 'Week 2', 'Week 3', 'Week 4'] as const
                        ).map((wk) => {
                          const val = item.weekTotals[wk];
                          const barWidth =
                            val > 0
                              ? Math.max(
                                  16,
                                  Math.round((val / maxCatWeekVal) * 100)
                                )
                              : 0;
                          const isDimmed =
                            selectedBudgetWeek !== 'Monthly' &&
                            selectedBudgetWeek !== wk;
                          return (
                            <div
                              key={wk}
                              className={`min-w-0 space-y-1 transition-opacity ${
                                isDimmed ? 'opacity-40' : ''
                              }`}
                            >
                              <div className="h-2 w-full rounded-full bg-slate-200/70 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${barWidth}%`,
                                    backgroundColor: item.color,
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1 text-[10px] font-mono tabular-nums text-slate-500">
                                <span>{wk.replace('Week ', 'W')}</span>
                                <strong className="font-semibold text-slate-700 truncate">
                                  {formatCurrency(val, profile.currency, {
                                    compact: true,
                                  })}
                                </strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Collapsible Sub-Category Detail List (separated into individual cards) */}
                      {isExpanded && item.subList.length > 0 && (
                        <div
                          className="pt-1.5 pl-2.5 border-l-2 space-y-2"
                          style={{ borderColor: `${item.color}45` }}
                        >
                          {item.subList.map((sub) => {
                            const subPctOfCat =
                              item.total > 0
                                ? Math.round((sub.total / item.total) * 100)
                                : 0;
                            const maxSubWeekVal = Math.max(
                              1,
                              sub.weekTotals['Week 1'],
                              sub.weekTotals['Week 2'],
                              sub.weekTotals['Week 3'],
                              sub.weekTotals['Week 4']
                            );
                            return (
                              <div
                                key={sub.name}
                                className="rounded-xl bg-white border border-slate-100 px-3 py-2.5 space-y-1.5 shadow-2xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px]">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-semibold text-slate-700 truncate">
                                      {sub.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                                      ({formatNumberID(sub.count)} trx)
                                    </span>
                                  </div>
                                  <span className="font-mono tabular-nums text-slate-700 shrink-0 ml-auto">
                                    <strong className="font-semibold text-slate-900">
                                      {formatCurrency(
                                        sub.total,
                                        profile.currency
                                      )}
                                    </strong>{' '}
                                    · {formatNumberID(subPctOfCat)}%
                                  </span>
                                </div>

                                {/* Per-Week Mini Chart Bars (W1-W4) for Sub-Category */}
                                <div
                                  className={`grid gap-2 pt-0.5 ${
                                    isMobileLayout
                                      ? 'grid-cols-2'
                                      : 'grid-cols-2 sm:grid-cols-4'
                                  }`}
                                >
                                  {(
                                    [
                                      'Week 1',
                                      'Week 2',
                                      'Week 3',
                                      'Week 4',
                                    ] as const
                                  ).map((wk) => {
                                    const subWkVal = sub.weekTotals[wk];
                                    const subBarWidth =
                                      subWkVal > 0
                                        ? Math.max(
                                            14,
                                            Math.round(
                                              (subWkVal / maxSubWeekVal) * 100
                                            )
                                          )
                                        : 0;
                                    const isSubWkDimmed =
                                      selectedBudgetWeek !== 'Monthly' &&
                                      selectedBudgetWeek !== wk;
                                    return (
                                      <div
                                        key={wk}
                                        className={`space-y-1 transition-opacity ${
                                          isSubWkDimmed ? 'opacity-40' : ''
                                        }`}
                                      >
                                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                              width: `${subBarWidth}%`,
                                              backgroundColor: item.color,
                                              opacity: 0.8,
                                            }}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono tabular-nums">
                                          <span className="text-slate-400">
                                            {wk.replace('Week ', 'W')}
                                          </span>
                                          <span
                                            className={
                                              subWkVal > 0
                                                ? 'font-semibold text-slate-700 truncate'
                                                : 'text-slate-300'
                                            }
                                          >
                                            {formatCurrency(
                                              subWkVal,
                                              profile.currency,
                                              { compact: true }
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

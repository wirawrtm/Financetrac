import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Banknote,
  Calendar,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleArrowDown,
  CircleArrowUp,
  CircleDollarSign,
  CircleMinus,
  CirclePlus,
  Coins,
  Flame,
  Minus,
  Pencil,
  Plus,
  Receipt,
  Search,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  Category,
  CustomCalendarPeriod,
  DriveImageItem,
  HistoryAmountIconEntry,
  HistoryAmountIconsConfig,
  Transaction,
  WeekKey,
  WeeklyDateRanges,
} from '../../types/finance';
import {
  formatCurrency,
  formatDateID,
  formatMonthYearID,
  formatNumberID,
  formatShortDateTime,
  getImageCandidateUrls,
} from '../../utils/formatters';
import {
  DEFAULT_HISTORY_AMOUNT_ICONS,
  isSavingCategoryTransaction,
} from '../../db/dummyDb';
import { CategoryIcon } from '../CategoryIcon';

const AMOUNT_ICON_PRESETS = [
  { key: 'TrendingUp', label: 'Naik' },
  { key: 'TrendingDown', label: 'Turun' },
  { key: 'ArrowUpRight', label: 'Kanan Atas' },
  { key: 'ArrowDownRight', label: 'Kanan Bawah' },
  { key: 'ArrowDownLeft', label: 'Masuk' },
  { key: 'ArrowUp', label: 'Atas' },
  { key: 'ArrowDown', label: 'Bawah' },
  { key: 'CircleArrowUp', label: 'Bulat Atas' },
  { key: 'CircleArrowDown', label: 'Bulat Bawah' },
  { key: 'ArrowBigUp', label: 'Panah Tebal Atas' },
  { key: 'ArrowBigDown', label: 'Panah Tebal Bawah' },
  { key: 'ChevronUp', label: 'Chevron Atas' },
  { key: 'ChevronDown', label: 'Chevron Bawah' },
  { key: 'Plus', label: 'Plus' },
  { key: 'Minus', label: 'Minus' },
  { key: 'CirclePlus', label: 'Plus Bulat' },
  { key: 'CircleMinus', label: 'Minus Bulat' },
  { key: 'Banknote', label: 'Uang Kertas' },
  { key: 'Coins', label: 'Koin' },
  { key: 'Wallet', label: 'Dompet' },
  { key: 'CircleDollarSign', label: 'Dolar Bulat' },
  { key: 'Receipt', label: 'Struk' },
  { key: 'ShoppingBag', label: 'Belanja' },
  { key: 'Flame', label: 'Api' },
  { key: 'Sparkles', label: 'Kilau' },
] as const;

function renderAmountLucideIcon(iconName: string, className = 'w-3.5 h-3.5') {
  if (iconName.startsWith('text:')) {
    const symbol = iconName.slice(5);
    return (
      <span
        className={`${className} inline-flex items-center justify-center leading-none text-[11px] font-bold select-none`}
      >
        {symbol}
      </span>
    );
  }
  switch (iconName) {
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'TrendingDown':
      return <TrendingDown className={className} />;
    case 'ArrowUpRight':
      return <ArrowUpRight className={className} />;
    case 'ArrowDownRight':
      return <ArrowDownRight className={className} />;
    case 'ArrowDownLeft':
      return <ArrowDownLeft className={className} />;
    case 'ArrowUp':
      return <ArrowUp className={className} />;
    case 'ArrowDown':
      return <ArrowDown className={className} />;
    case 'CircleArrowUp':
      return <CircleArrowUp className={className} />;
    case 'CircleArrowDown':
      return <CircleArrowDown className={className} />;
    case 'ArrowBigUp':
      return <ArrowBigUp className={className} />;
    case 'ArrowBigDown':
      return <ArrowBigDown className={className} />;
    case 'ChevronUp':
      return <ChevronUp className={className} />;
    case 'ChevronDown':
      return <ChevronDown className={className} />;
    case 'Plus':
      return <Plus className={className} />;
    case 'Minus':
      return <Minus className={className} />;
    case 'CirclePlus':
      return <CirclePlus className={className} />;
    case 'CircleMinus':
      return <CircleMinus className={className} />;
    case 'Banknote':
      return <Banknote className={className} />;
    case 'Coins':
      return <Coins className={className} />;
    case 'Wallet':
      return <Wallet className={className} />;
    case 'CircleDollarSign':
      return <CircleDollarSign className={className} />;
    case 'Receipt':
      return <Receipt className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    default:
      return <TrendingUp className={className} />;
  }
}

const AmountDirectionIcon: React.FC<{
  entry: HistoryAmountIconEntry;
  gallery: DriveImageItem[];
  className?: string;
}> = ({ entry, gallery, className = 'w-3.5 h-3.5' }) => {
  const linkedDrive = entry.driveItemId
    ? gallery.find((g) => g.id === entry.driveItemId)
    : undefined;

  const candidateUrls = useMemo(
    () =>
      getImageCandidateUrls({
        fileId: linkedDrive?.fileId,
        rawUrl: linkedDrive?.rawUrl,
        directUrl: linkedDrive?.directUrl,
        fallbackUrl: linkedDrive?.fallbackUrl,
        imageUrl: entry.imageUrl,
      }),
    [
      linkedDrive?.fileId,
      linkedDrive?.rawUrl,
      linkedDrive?.directUrl,
      linkedDrive?.fallbackUrl,
      entry.imageUrl,
    ]
  );

  const candidatesKey = candidateUrls.join('|');
  const [srcIdx, setSrcIdx] = useState(0);

  useEffect(() => {
    setSrcIdx(0);
  }, [candidatesKey]);

  const activeUrl = candidateUrls[srcIdx] || '';

  if (activeUrl) {
    return (
      <img
        src={activeUrl}
        alt="Ikon nominal"
        referrerPolicy="no-referrer"
        className={`${className} object-contain bg-transparent shrink-0`}
        onError={() => setSrcIdx((prev) => prev + 1)}
      />
    );
  }

  return renderAmountLucideIcon(entry.icon, `${className} shrink-0`);
};

interface HistoryTabProps {
  transactions: Transaction[];
  categories: Category[];
  weeklyDateRanges: WeeklyDateRanges;
  customCalendarPeriod: CustomCalendarPeriod;
  historyAmountIcons?: HistoryAmountIconsConfig;
  currency?: 'IDR' | 'USD';
  gallery: DriveImageItem[];
  isMobileLayout: boolean;
  onUpdateCustomCalendar: (period: CustomCalendarPeriod) => void;
  onUpdateWeeklyRanges: (ranges: WeeklyDateRanges) => void;
  onUpdateHistoryAmountIcons: (config: HistoryAmountIconsConfig) => void;
  onEditTransaction: (trx: Transaction) => void;
  onDeleteTransaction: (trx: Transaction) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  transactions,
  categories,
  weeklyDateRanges,
  customCalendarPeriod,
  historyAmountIcons = DEFAULT_HISTORY_AMOUNT_ICONS,
  currency = 'IDR',
  gallery,
  isMobileLayout,
  onUpdateCustomCalendar,
  onUpdateWeeklyRanges,
  onUpdateHistoryAmountIcons,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [calYearMonth, setCalYearMonth] = useState('2026-11');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [weekFilter, setWeekFilter] = useState<'ALL' | WeekKey>('ALL');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom calendar modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [draftPeriod, setDraftPeriod] =
    useState<CustomCalendarPeriod>(customCalendarPeriod);
  const [draftRanges, setDraftRanges] =
    useState<WeeklyDateRanges>(weeklyDateRanges);

  const [showIconModal, setShowIconModal] = useState(false);
  const [focusedIconSide, setFocusedIconSide] = useState<
    'income' | 'expense' | null
  >(null);
  const [draftIcons, setDraftIcons] =
    useState<HistoryAmountIconsConfig>(historyAmountIcons);

  const openIconModal = (focusSide: 'income' | 'expense' | null = null) => {
    setDraftIcons({
      income: { ...historyAmountIcons.income },
      expense: { ...historyAmountIcons.expense },
    });
    setFocusedIconSide(focusSide);
    setShowIconModal(true);
  };

  const handleSaveIconsModal = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizeEntry = (
      entry: HistoryAmountIconEntry,
      fallbackIcon: string
    ): HistoryAmountIconEntry => {
      const cleanedIcon = entry.icon.trim() || fallbackIcon;
      const out: HistoryAmountIconEntry = { icon: cleanedIcon };
      if (entry.driveItemId && entry.driveItemId.trim()) {
        out.driveItemId = entry.driveItemId.trim();
      }
      if (entry.imageUrl && entry.imageUrl.trim()) {
        out.imageUrl = entry.imageUrl.trim();
      }
      return out;
    };

    onUpdateHistoryAmountIcons({
      income: normalizeEntry(
        draftIcons.income,
        DEFAULT_HISTORY_AMOUNT_ICONS.income.icon
      ),
      expense: normalizeEntry(
        draftIcons.expense,
        DEFAULT_HISTORY_AMOUNT_ICONS.expense.icon
      ),
    });
    setShowIconModal(false);
  };

  const openCustomModal = () => {
    setDraftPeriod(customCalendarPeriod);
    setDraftRanges(weeklyDateRanges);
    setShowCustomModal(true);
  };

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const [yStr, mStr] = calYearMonth.split('-');
    const year = Number(yStr);
    const month = Number(mStr) - 1;
    const firstDayOfMonth = new Date(year, month, 1);
    // Monday-start index (0 = Mon ... 6 = Sun)
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayActivity = new Map<
      string,
      { count: number; hasIncome: boolean; hasExpense: boolean }
    >();

    for (const t of transactions) {
      if (t.date.startsWith(calYearMonth)) {
        const cur = dayActivity.get(t.date) || {
          count: 0,
          hasIncome: false,
          hasExpense: false,
        };
        cur.count += 1;
        if (t.type === 'income') cur.hasIncome = true;
        else cur.hasExpense = true;
        dayActivity.set(t.date, cur);
      }
    }

    const cells: {
      dateStr: string | null;
      dayNum: number | null;
      activity?: { count: number; hasIncome: boolean; hasExpense: boolean };
    }[] = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYearMonth}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNum: d,
        activity: dayActivity.get(dateStr),
      });
    }
    return cells;
  }, [calYearMonth, transactions]);

  const shiftMonth = (delta: number) => {
    const [y, m] = calYearMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nextYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
    setCalYearMonth(nextYm);
    setSelectedDay(null);
  };

  // Apply presets inside Custom Calendar Modal
  const applyPreset = (preset: string) => {
    const refDate = new Date('2026-11-13T12:00:00');
    const toIso = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'payday') {
      setDraftPeriod({
        ...draftPeriod,
        isActive: true,
        startDate: '2026-10-25',
        endDate: '2026-11-24',
        label: 'Siklus Gajian (25 Okt – 24 Nov)',
      });
    } else if (preset === 'this_month') {
      setDraftPeriod({
        ...draftPeriod,
        isActive: true,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        label: 'Bulan Ini (November 2026)',
      });
    } else if (preset === 'last_7') {
      const start = new Date(refDate);
      start.setDate(start.getDate() - 6);
      setDraftPeriod({
        ...draftPeriod,
        isActive: true,
        startDate: toIso(start),
        endDate: toIso(refDate),
        label: '7 Hari Terakhir',
      });
    } else if (preset === 'last_30') {
      const start = new Date(refDate);
      start.setDate(start.getDate() - 29);
      setDraftPeriod({
        ...draftPeriod,
        isActive: true,
        startDate: toIso(start),
        endDate: toIso(refDate),
        label: '30 Hari Terakhir',
      });
    } else if (preset === 'first_half') {
      setDraftPeriod({
        ...draftPeriod,
        isActive: true,
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        label: 'Paruh Pertama (1–15 Nov)',
      });
    } else if (preset === 'second_half') {
      setDraftPeriod({
        ...draftPeriod,
        isActive: true,
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        label: 'Paruh Kedua (16–30 Nov)',
      });
    }
  };

  const handleSaveCustomModal = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomCalendar({
      ...draftPeriod,
      updatedAt: Date.now(),
    });
    onUpdateWeeklyRanges(draftRanges);
    setShowCustomModal(false);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...transactions]
      .filter((t) => {
        if (selectedDay && t.date !== selectedDay) return false;
        if (
          !selectedDay &&
          customCalendarPeriod.isActive &&
          customCalendarPeriod.startDate &&
          customCalendarPeriod.endDate
        ) {
          if (
            t.date < customCalendarPeriod.startDate ||
            t.date > customCalendarPeriod.endDate
          ) {
            return false;
          }
        }
        if (weekFilter !== 'ALL' && t.week !== weekFilter) return false;
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (q) {
          const hay = `${t.notes} ${t.categoryName} ${
            t.subcategoryName || ''
          } ${t.channel}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt - a.createdAt;
      });
  }, [
    transactions,
    selectedDay,
    customCalendarPeriod,
    weekFilter,
    typeFilter,
    searchQuery,
  ]);

  const periodStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filteredTransactions) {
      if (isSavingCategoryTransaction(t)) continue;
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return {
      income,
      expense,
      net: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups: {
      dateKey: string;
      label: string;
      net: number;
      items: Transaction[];
    }[] = [];
    for (const t of filteredTransactions) {
      const dateKey = t.date;
      let grp = groups.find((g) => g.dateKey === dateKey);
      if (!grp) {
        grp = { dateKey, label: formatDateID(dateKey), net: 0, items: [] };
        groups.push(grp);
      }
      if (!isSavingCategoryTransaction(t)) {
        grp.net += t.type === 'income' ? t.amount : -t.amount;
      }
      grp.items.push(t);
    }
    return groups;
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Header & Custom Period Banner */}
      <div
        className={`flex justify-between gap-3 ${
          isMobileLayout
            ? 'flex-col'
            : 'flex-col sm:flex-row sm:items-center'
        }`}
      >
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Riwayat & Kalender Transaksi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {customCalendarPeriod.isActive
              ? `Periode Aktif: ${customCalendarPeriod.label} (${formatDateID(
                  customCalendarPeriod.startDate
                )} – ${formatDateID(customCalendarPeriod.endDate)})`
              : 'Menampilkan seluruh periode transaksi'}
          </p>
        </div>

        <div
          className={`flex flex-col gap-2 ${
            isMobileLayout ? 'items-start' : 'items-start sm:items-end'
          }`}
        >
          <div className="max-w-full flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {(['ALL', 'Week 1', 'Week 2', 'Week 3', 'Week 4'] as const).map(
              (w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeekFilter(w)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    weekFilter === w
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {w === 'ALL' ? 'Semua' : w.replace('Week ', 'W')}
                </button>
              )
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateCustomCalendar({
                  ...customCalendarPeriod,
                  isActive: !customCalendarPeriod.isActive,
                  updatedAt: Date.now(),
                })
              }
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                customCalendarPeriod.isActive
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {customCalendarPeriod.isActive
                ? 'Periode Kustom: Aktif'
                : 'Periode Kustom: Nonaktif'}
            </button>
            <button
              type="button"
              onClick={openCustomModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Atur Kalender Kustom
            </button>
            <button
              type="button"
              onClick={() => openIconModal(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Custom Ikon
            </button>
          </div>
        </div>
      </div>

      {/* Period Summary Strip */}
      <div
        className={`grid gap-3 ${
          isMobileLayout ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        <div className="min-w-0 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-3.5 sm:p-4">
          <p className="text-xs text-slate-500 truncate">Pemasukan Periode</p>
          <p className="mt-1 text-sm sm:text-base font-bold text-slate-900 tabular-nums truncate">
            {formatCurrency(periodStats.income, currency)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-3.5 sm:p-4">
          <p className="text-xs text-slate-500 truncate">Pengeluaran Periode</p>
          <p className="mt-1 text-sm sm:text-base font-bold text-[#D9463E] tabular-nums truncate">
            {formatCurrency(periodStats.expense, currency)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-3.5 sm:p-4">
          <p className="text-xs text-slate-500 truncate">Selisih Bersih</p>
          <p
            className={`mt-1 inline-flex items-center gap-1.5 max-w-full text-sm sm:text-base font-bold tabular-nums truncate ${
              periodStats.net > 0
                ? 'text-emerald-700'
                : periodStats.net < 0
                ? 'text-[#D9463E]'
                : 'text-slate-700'
            }`}
          >
            {periodStats.net > 0 && (
              <button
                type="button"
                onClick={() => openIconModal('income')}
                title="Klik untuk ganti ikon pemasukan"
                aria-label="Ganti ikon pemasukan"
                className="inline-flex items-center justify-center rounded hover:bg-emerald-50 p-0.5 -m-0.5 transition-transform hover:scale-110 cursor-pointer shrink-0"
              >
                <AmountDirectionIcon
                  entry={historyAmountIcons.income}
                  gallery={gallery}
                  className="w-4 h-4"
                />
              </button>
            )}
            {periodStats.net < 0 && (
              <button
                type="button"
                onClick={() => openIconModal('expense')}
                title="Klik untuk ganti ikon pengeluaran"
                aria-label="Ganti ikon pengeluaran"
                className="inline-flex items-center justify-center rounded hover:bg-rose-50 p-0.5 -m-0.5 transition-transform hover:scale-110 cursor-pointer shrink-0"
              >
                <AmountDirectionIcon
                  entry={historyAmountIcons.expense}
                  gallery={gallery}
                  className="w-4 h-4"
                />
              </button>
            )}
            <span className="truncate">
              {formatCurrency(Math.abs(periodStats.net), currency)}
            </span>
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-3.5 sm:p-4">
          <p className="text-xs text-slate-500 truncate">Jumlah Transaksi</p>
          <p className="mt-1 text-sm sm:text-base font-bold text-slate-900 tabular-nums truncate">
            {formatNumberID(periodStats.count)} item
          </p>
        </div>
      </div>

      {/* Main Content Split: Calendar Left + List Right */}
      <div
        className={`grid gap-6 items-start ${
          isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* Interactive Monthly Calendar */}
        <div
          className={`rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-5 ${
            isMobileLayout ? '' : 'lg:col-span-5 lg:sticky lg:top-24'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                {formatMonthYearID(calYearMonth)}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Bulan sebelumnya"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Bulan berikutnya"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-2">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span>Min</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateStr || !cell.dayNum) {
                return <div key={`empty-${idx}`} className="h-10" />;
              }

              const isSelected = selectedDay === cell.dateStr;
              const inCustomPeriod =
                customCalendarPeriod.isActive &&
                cell.dateStr >= customCalendarPeriod.startDate &&
                cell.dateStr <= customCalendarPeriod.endDate;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() =>
                    setSelectedDay(isSelected ? null : cell.dateStr)
                  }
                  className={`h-10 rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-colors relative tabular-nums ${
                    isSelected
                      ? 'bg-slate-900 text-white font-bold'
                      : inCustomPeriod
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-900'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <span>{cell.dayNum}</span>
                  {cell.activity && (
                    <span className="flex items-center gap-0.5 mt-0.5">
                      {cell.activity.hasIncome && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                      {cell.activity.hasExpense && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-rose-300' : 'bg-[#D9463E]'
                          }`}
                        />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Tanggal dipilih:{' '}
                <strong className="text-slate-900">
                  {formatDateID(selectedDay)}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-slate-500 hover:text-slate-900 font-medium"
              >
                Reset Tanggal
              </button>
            </div>
          )}
        </div>

        {/* Filters + Transaction Feed */}
        <div
          className={`space-y-4 ${isMobileLayout ? '' : 'lg:col-span-7'}`}
        >
          {/* Search & Segmented Filters */}
          <div
            className={`rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-4 flex gap-3 ${
              isMobileLayout
                ? 'flex-col'
                : 'flex-col sm:flex-row sm:items-center'
            }`}
          >
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari merchant, catatan, kategori, atau channel..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-w-full flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto shrink-0 self-end sm:self-auto">
              {(
                [
                  { key: 'all', label: 'Semua' },
                  { key: 'expense', label: 'Keluar' },
                  { key: 'income', label: 'Masuk' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTypeFilter(t.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    typeFilter === t.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped List */}
          {groupedTransactions.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Tidak ada transaksi yang cocok dengan filter saat ini.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Coba ubah rentang kalender kustom, minggu, atau kata kunci.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedTransactions.map((grp) => (
                <div key={grp.dateKey}>
                  <p className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400 mb-2">
                    <span>{grp.label}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] text-sm font-extrabold tabular-nums whitespace-nowrap ${
                        grp.net < 0
                          ? 'text-[#D9463E]'
                          : grp.net > 0
                          ? 'text-slate-900'
                          : 'text-slate-500'
                      }`}
                    >
                      {grp.net < 0 && (
                        <button
                          type="button"
                          onClick={() => openIconModal('expense')}
                          title="Klik untuk ganti ikon pengeluaran"
                          aria-label="Ganti ikon pengeluaran"
                          className="inline-flex items-center justify-center rounded hover:bg-rose-50 p-0.5 -m-0.5 transition-transform hover:scale-110 cursor-pointer shrink-0"
                        >
                          <AmountDirectionIcon
                            entry={historyAmountIcons.expense}
                            gallery={gallery}
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      )}
                      {grp.net > 0 && (
                        <button
                          type="button"
                          onClick={() => openIconModal('income')}
                          title="Klik untuk ganti ikon pemasukan"
                          aria-label="Ganti ikon pemasukan"
                          className="inline-flex items-center justify-center rounded hover:bg-slate-100 p-0.5 -m-0.5 transition-transform hover:scale-110 cursor-pointer shrink-0"
                        >
                          <AmountDirectionIcon
                            entry={historyAmountIcons.income}
                            gallery={gallery}
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      )}
                      <span>
                        {formatCurrency(Math.abs(grp.net), currency)}
                      </span>
                    </span>
                  </p>
                  <div className="ml-[26px] sm:ml-7 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] divide-y divide-slate-100 overflow-visible">
                    {grp.items.map((trx) => {
                      const cat =
                        categories.find((c) => c.id === trx.categoryId) ||
                        categories.find(
                          (c) =>
                            c.name.trim().toLowerCase() ===
                            trx.categoryName.trim().toLowerCase()
                        );
                      return (
                        <div
                          key={trx.id}
                          className="group flex items-stretch justify-between gap-2.5 sm:gap-3 pr-3.5 sm:pr-4 pl-0 py-0 overflow-visible first:rounded-t-2xl last:rounded-b-2xl hover:bg-slate-50/70 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => onEditTransaction(trx)}
                            className="flex items-stretch gap-2.5 sm:gap-3 min-w-0 flex-1 text-left"
                          >
                            <CategoryIcon
                              category={cat}
                              gallery={gallery}
                              size="md"
                              variant="card-bleed"
                              bleedOffsetClass="-ml-[26px] sm:-ml-7"
                            />
                            <div className="min-w-0 flex-1 py-3 sm:py-3.5 flex flex-col justify-center">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {trx.notes}
                              </p>
                              <p className="text-xs text-slate-400 truncate mt-0.5 tabular-nums">
                                {formatShortDateTime(trx.date, trx.createdAt)} ·{' '}
                                {trx.week} · {trx.channel}
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 py-3 sm:py-3.5">
                            <div className="text-right min-w-0">
                              <p
                                className={`inline-flex items-center justify-end gap-1 text-sm font-semibold tabular-nums whitespace-nowrap ${
                                  trx.type === 'expense'
                                    ? 'text-[#D9463E]'
                                    : 'text-slate-900'
                                }`}
                              >
                                {trx.type === 'expense' ? (
                                  <button
                                    type="button"
                                    onClick={() => openIconModal('expense')}
                                    title="Klik untuk ganti ikon pengeluaran"
                                    aria-label="Ganti ikon pengeluaran"
                                    className="inline-flex items-center justify-center rounded hover:bg-rose-50 p-0.5 -m-0.5 transition-transform hover:scale-110 cursor-pointer shrink-0"
                                  >
                                    <AmountDirectionIcon
                                      entry={historyAmountIcons.expense}
                                      gallery={gallery}
                                      className="w-3.5 h-3.5"
                                    />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openIconModal('income')}
                                    title="Klik untuk ganti ikon pemasukan"
                                    aria-label="Ganti ikon pemasukan"
                                    className="inline-flex items-center justify-center rounded hover:bg-slate-100 p-0.5 -m-0.5 transition-transform hover:scale-110 cursor-pointer shrink-0"
                                  >
                                    <AmountDirectionIcon
                                      entry={historyAmountIcons.income}
                                      gallery={gallery}
                                      className="w-3.5 h-3.5"
                                    />
                                  </button>
                                )}
                                <span>
                                  {formatCurrency(trx.amount, currency)}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[100px] sm:max-w-[140px] ml-auto">
                                {trx.categoryName}
                                {trx.subcategoryName
                                  ? ` / ${trx.subcategoryName}`
                                  : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onEditTransaction(trx)}
                              aria-label="Edit transaksi"
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
                              className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      </div>

      {/* Custom Calendar & Weekly Range Settings Modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-cal-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <CalendarRange className="w-5 h-5 text-slate-800 shrink-0" />
                <div className="min-w-0">
                  <h3
                    id="custom-cal-title"
                    className="text-sm sm:text-base font-semibold text-slate-900"
                  >
                    Pengaturan Kalender Periode Kustom & Mingguan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Disimpan permanen ke Cloud Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                aria-label="Tutup modal kalender"
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveCustomModal}
              className="p-4 sm:p-6 space-y-5 overflow-y-auto"
            >
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Preset Cepat
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'payday', label: 'Siklus Gajian (25–24)' },
                    { id: 'this_month', label: 'Bulan Ini' },
                    { id: 'last_7', label: '7 Hari Terakhir' },
                    { id: 'last_30', label: '30 Hari Terakhir' },
                    { id: 'first_half', label: 'Paruh Pertama' },
                    { id: 'second_half', label: 'Paruh Kedua' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Label Periode Kustom
                  </label>
                  <input
                    type="text"
                    required
                    value={draftPeriod.label}
                    onChange={(e) =>
                      setDraftPeriod({ ...draftPeriod, label: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={draftPeriod.startDate}
                    onChange={(e) =>
                      setDraftPeriod({
                        ...draftPeriod,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={draftPeriod.endDate}
                    onChange={(e) =>
                      setDraftPeriod({
                        ...draftPeriod,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftPeriod.isActive}
                      onChange={(e) =>
                        setDraftPeriod({
                          ...draftPeriod,
                          isActive: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded accent-slate-900"
                    />
                    Aktifkan Filter Periode Ini
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-3">
                  Rentang Tanggal Mingguan (Week 1 – Week 4)
                </p>
                <div className="space-y-2.5">
                  {(['Week 1', 'Week 2', 'Week 3', 'Week 4'] as const).map(
                    (wk) => (
                      <div
                        key={wk}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        <span className="sm:col-span-2 text-xs font-semibold text-slate-700">
                          {wk}
                        </span>
                        <input
                          type="date"
                          value={draftRanges[wk].startDate}
                          onChange={(e) =>
                            setDraftRanges({
                              ...draftRanges,
                              [wk]: {
                                ...draftRanges[wk],
                                startDate: e.target.value,
                              },
                            })
                          }
                          className="sm:col-span-5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
                        />
                        <input
                          type="date"
                          value={draftRanges[wk].endDate}
                          onChange={(e) =>
                            setDraftRanges({
                              ...draftRanges,
                              [wk]: {
                                ...draftRanges[wk],
                                endDate: e.target.value,
                              },
                            })
                          }
                          className="sm:col-span-5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Amount Icons Modal */}
      {showIconModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-icon-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="custom-icon-title"
                    className="text-sm sm:text-base font-semibold text-slate-900"
                  >
                    Custom Ikon Pemasukan &amp; Pengeluaran
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih ikon bawaan, aset dari Galeri, atau URL gambar custom
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIconModal(false)}
                aria-label="Tutup modal custom ikon"
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveIconsModal}
              className="p-4 sm:p-6 space-y-5 overflow-y-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(focusedIconSide === 'expense'
                  ? [
                      {
                        key: 'expense' as const,
                        title: 'Ikon Pengeluaran (Minus)',
                        sample: 50000,
                        textColor: 'text-[#D9463E]',
                      },
                      {
                        key: 'income' as const,
                        title: 'Ikon Pemasukan (Plus)',
                        sample: 150000,
                        textColor: 'text-slate-900',
                      },
                    ]
                  : [
                      {
                        key: 'income' as const,
                        title: 'Ikon Pemasukan (Plus)',
                        sample: 150000,
                        textColor: 'text-slate-900',
                      },
                      {
                        key: 'expense' as const,
                        title: 'Ikon Pengeluaran (Minus)',
                        sample: 50000,
                        textColor: 'text-[#D9463E]',
                      },
                    ]
                ).map((side) => {
                  const entry = draftIcons[side.key];
                  const isFocused = focusedIconSide === side.key;
                  const customTextVal =
                    !entry.driveItemId &&
                    !entry.imageUrl &&
                    entry.icon.startsWith('text:')
                      ? entry.icon.slice(5)
                      : '';
                  return (
                    <div
                      key={side.key}
                      className={`rounded-xl border p-4 space-y-3 transition-colors ${
                        isFocused
                          ? 'border-slate-900 ring-2 ring-slate-900/10 bg-white'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900">
                          {side.title}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-100 shadow-xs text-xs font-bold tabular-nums ${side.textColor}`}
                        >
                          <AmountDirectionIcon
                            entry={entry}
                            gallery={gallery}
                            className="w-3.5 h-3.5"
                          />
                          <span>{formatCurrency(side.sample, currency)}</span>
                        </span>
                      </div>

                      <div>
                        <p className="text-[11px] font-medium text-slate-600 mb-1.5">
                          Pilih Ikon Bawaan
                        </p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {AMOUNT_ICON_PRESETS.map((preset) => {
                            const isSelected =
                              !entry.driveItemId &&
                              !entry.imageUrl &&
                              entry.icon === preset.key;
                            return (
                              <button
                                key={preset.key}
                                type="button"
                                title={preset.label}
                                onClick={() =>
                                  setDraftIcons((prev) => ({
                                    ...prev,
                                    [side.key]: { icon: preset.key },
                                  }))
                                }
                                className={`h-9 rounded-lg border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {renderAmountLucideIcon(
                                  preset.key,
                                  'w-4 h-4'
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Atau Emoji / Simbol Custom
                        </label>
                        <input
                          type="text"
                          maxLength={8}
                          value={customTextVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftIcons((prev) => ({
                              ...prev,
                              [side.key]: val.trim()
                                ? { icon: `text:${val.trim()}` }
                                : {
                                    icon: DEFAULT_HISTORY_AMOUNT_ICONS[side.key]
                                      .icon,
                                  },
                            }));
                          }}
                          placeholder="Contoh: 🔻 🔺 💸 + -"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Atau Pilih dari Galeri Aset
                        </label>
                        {gallery.length > 0 && (
                          <div className="grid grid-cols-5 gap-1.5 mb-2">
                            {gallery.map((g) => {
                              const isPicked = entry.driveItemId === g.id;
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  title={g.name}
                                  onClick={() =>
                                    setDraftIcons((prev) => ({
                                      ...prev,
                                      [side.key]: {
                                        icon: prev[side.key].icon,
                                        driveItemId: g.id,
                                        imageUrl: g.directUrl,
                                      },
                                    }))
                                  }
                                  className={`h-9 rounded-lg border p-1 flex items-center justify-center bg-white transition-colors ${
                                    isPicked
                                      ? 'border-slate-900 ring-2 ring-slate-900/20'
                                      : 'border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <AmountDirectionIcon
                                    entry={{
                                      icon: entry.icon,
                                      driveItemId: g.id,
                                      imageUrl: g.directUrl,
                                    }}
                                    gallery={gallery}
                                    className="w-6 h-6"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <select
                          value={entry.driveItemId || ''}
                          onChange={(e) => {
                            const nextId = e.target.value;
                            const found = gallery.find((g) => g.id === nextId);
                            setDraftIcons((prev) => ({
                              ...prev,
                              [side.key]: nextId
                                ? {
                                    icon: prev[side.key].icon,
                                    driveItemId: nextId,
                                    imageUrl: found?.directUrl,
                                  }
                                : { icon: prev[side.key].icon },
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <option value="">-- Gunakan Ikon Bawaan --</option>
                          {gallery.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Atau URL Gambar / Drive Custom
                        </label>
                        <input
                          type="text"
                          value={!entry.driveItemId ? entry.imageUrl || '' : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftIcons((prev) => ({
                              ...prev,
                              [side.key]: val.trim()
                                ? {
                                    icon: prev[side.key].icon,
                                    imageUrl: val,
                                  }
                                : { icon: prev[side.key].icon },
                            }));
                          }}
                          placeholder="https://drive.google.com/... atau URL gambar"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setDraftIcons({
                      income: { ...DEFAULT_HISTORY_AMOUNT_ICONS.income },
                      expense: { ...DEFAULT_HISTORY_AMOUNT_ICONS.expense },
                    })
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Reset Default
                </button>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowIconModal(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800"
                  >
                    Simpan Ikon
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

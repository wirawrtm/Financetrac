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
  ChevronDown,
  ChevronUp,
  CircleArrowDown,
  CircleArrowUp,
  CircleDollarSign,
  CircleMinus,
  CirclePlus,
  Coins,
  Flame,
  Minus,
  Plus,
  Receipt,
  Settings2,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  DriveImageItem,
  HistoryAmountIconEntry,
  HistoryAmountIconsConfig,
} from '../types/finance';
import { formatCurrency, getImageCandidateUrls } from '../utils/formatters';
import { DEFAULT_HISTORY_AMOUNT_ICONS } from '../db/dummyDb';

export const AMOUNT_ICON_PRESETS = [
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

export function renderAmountLucideIcon(
  iconName: string,
  className = 'w-3.5 h-3.5'
) {
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

export const AmountDirectionIcon: React.FC<{
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

interface CustomAmountIconsModalProps {
  open: boolean;
  initialIcons: HistoryAmountIconsConfig;
  focusedSide: 'income' | 'expense' | null;
  gallery: DriveImageItem[];
  currency?: 'IDR' | 'USD';
  onClose: () => void;
  onSave: (config: HistoryAmountIconsConfig) => void;
}

export const CustomAmountIconsModal: React.FC<CustomAmountIconsModalProps> = ({
  open,
  initialIcons,
  focusedSide,
  gallery,
  currency = 'IDR',
  onClose,
  onSave,
}) => {
  const [draftIcons, setDraftIcons] =
    useState<HistoryAmountIconsConfig>(initialIcons);

  useEffect(() => {
    if (open) {
      setDraftIcons({
        income: { ...initialIcons.income },
        expense: { ...initialIcons.expense },
      });
    }
  }, [open, initialIcons]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
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

    onSave({
      income: normalizeEntry(
        draftIcons.income,
        DEFAULT_HISTORY_AMOUNT_ICONS.income.icon
      ),
      expense: normalizeEntry(
        draftIcons.expense,
        DEFAULT_HISTORY_AMOUNT_ICONS.expense.icon
      ),
    });
    onClose();
  };

  const sides =
    focusedSide === 'expense'
      ? ([
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
        ] as const)
      : ([
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
        ] as const);

  return (
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
                Pilih ikon bawaan, emoji/simbol, aset Galeri, atau URL gambar
                custom
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal custom ikon"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-5 overflow-y-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sides.map((side) => {
              const entry = draftIcons[side.key];
              const isFocused = focusedSide === side.key;
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
                            {renderAmountLucideIcon(preset.key, 'w-4 h-4')}
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
                onClick={onClose}
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
  );
};

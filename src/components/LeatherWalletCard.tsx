import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CustomCalendarPeriod } from '../types/finance';
import { formatCurrency, formatDateID, formatNumberID } from '../utils/formatters';

interface LeatherWalletCardProps {
  balance: number;
  monthlyBudget: number;
  monthlySpending: number;
  monthlyRemaining: number;
  monthlySaving: number;
  runningWeekLabel: string;
  budget: number;
  remaining: number;
  spending: number;
  customPeriod?: CustomCalendarPeriod;
  currency?: 'IDR' | 'USD';
}

export const LeatherWalletCard: React.FC<LeatherWalletCardProps> = ({
  balance,
  monthlyBudget,
  monthlySpending,
  monthlyRemaining,
  monthlySaving,
  runningWeekLabel,
  budget,
  remaining,
  spending,
  customPeriod,
  currency = 'IDR',
}) => {
  const [hidden, setHidden] = useState(false);
  const [primaryCard, setPrimaryCard] = useState<'weekly' | 'monthly'>('weekly');

  const isMonthlyPrimary = primaryCard === 'monthly';
  const isCustomPeriodActive = Boolean(
    customPeriod?.isActive && customPeriod.startDate && customPeriod.endDate
  );
  const customPeriodTitle = customPeriod?.label?.trim() || 'Periode Kustom';
  const monthlyCardTitle = isCustomPeriodActive
    ? customPeriodTitle
    : 'Budget Monthly';

  const activeBudget = isMonthlyPrimary ? monthlyBudget : budget;
  const activeSpending = isMonthlyPrimary ? monthlySpending : spending;
  const activeRemaining = isMonthlyPrimary ? monthlyRemaining : remaining;
  const spendingPct =
    activeBudget > 0 ? Math.round((activeSpending / activeBudget) * 100) : 0;

  return (
    <div className="relative pt-3 select-none">
      {/* Back Peeking Card (Clickable to swap to front/primary) */}
      <div className="relative mx-auto w-[92%] z-0">
        <AnimatePresence initial={false} mode="popLayout">
          {isMonthlyPrimary ? (
            <motion.button
              key="back-weekly"
              type="button"
              onClick={() => setPrimaryCard('weekly')}
              aria-label={`Jadikan kartu Budget ${runningWeekLabel} sebagai kartu utama`}
              initial={{ y: 20, scale: 0.96, opacity: 0.5 }}
              animate={{ y: 4, scale: 1, opacity: 1 }}
              exit={{ y: 22, scale: 1.03, opacity: 0 }}
              whileHover={{ y: 0 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="w-full h-14 rounded-t-[26px] px-4 pt-3.5 flex items-start justify-between gap-2 text-white shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              style={{
                background:
                  'linear-gradient(155deg, #6B3E24 0%, #56301A 45%, #442412 100%)',
              }}
            >
              <span className="font-bold tracking-tight text-xs sm:text-sm text-[#F5EBE2] truncate">
                Budget {runningWeekLabel}
              </span>
              <span className="mt-0.5 text-xs text-[#E7D4C5]/95 font-semibold tabular-nums shrink-0">
                {hidden
                  ? '••••••••'
                  : `${remaining < 0 ? '-' : ''}${formatCurrency(
                      Math.abs(remaining),
                      currency
                    )}`}
              </span>
            </motion.button>
          ) : (
            <motion.button
              key="back-monthly"
              type="button"
              onClick={() => setPrimaryCard('monthly')}
              aria-label={`Jadikan kartu ${monthlyCardTitle} sebagai kartu utama`}
              initial={{ y: 20, scale: 0.96, opacity: 0.5 }}
              animate={{ y: 4, scale: 1, opacity: 1 }}
              exit={{ y: 22, scale: 1.03, opacity: 0 }}
              whileHover={{ y: 0 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="w-full h-14 rounded-t-[26px] bg-gradient-to-r from-[#082458] via-[#0D3984] to-[#144DA8] shadow-md px-4 pt-3.5 flex items-start justify-between gap-2 text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <span className="font-bold tracking-tight text-xs sm:text-sm truncate">
                {monthlyCardTitle}
              </span>
              <span className="mt-0.5 text-xs text-blue-100/95 font-semibold tabular-nums shrink-0">
                {hidden
                  ? '••••••••'
                  : formatCurrency(monthlySaving, currency)}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Primary Front Card */}
      <div className="relative z-10 -mt-3">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={primaryCard}
            initial={{ y: -28, scale: 0.93, opacity: 0.85 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.95, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 26,
              mass: 0.85,
            }}
            className={`relative rounded-[26px] p-[6px] ${
              isMonthlyPrimary
                ? 'shadow-[0_14px_30px_-10px_rgba(8,36,88,0.45)]'
                : 'shadow-[0_14px_30px_-10px_rgba(61,32,16,0.45)]'
            }`}
            style={{
              background: isMonthlyPrimary
                ? 'linear-gradient(155deg, #144DA8 0%, #0D3984 50%, #082458 100%)'
                : 'linear-gradient(155deg, #6B3E24 0%, #56301A 45%, #442412 100%)',
            }}
          >
            {/* Inner Stitched / Framed Border */}
        <div
          className={`rounded-[21px] border border-dashed px-4 sm:px-5 pt-5 sm:pt-6 pb-4 sm:pb-5 relative overflow-hidden ${
            isMonthlyPrimary
              ? 'border-blue-300/45'
              : 'border-[#9A6848]/70'
          }`}
        >
          {/* Subtle top curved pocket lip shadow */}
          <div
            className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"
            aria-hidden="true"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`text-xs font-medium tracking-wide truncate ${
                  isMonthlyPrimary ? 'text-blue-100/85' : 'text-[#E7D4C5]/85'
                }`}
              >
                Total Spending ·{' '}
                {isMonthlyPrimary
                  ? isCustomPeriodActive
                    ? customPeriodTitle
                    : 'Monthly'
                  : runningWeekLabel}
              </p>
              {isCustomPeriodActive && customPeriod && (
                <p
                  className={`mt-0.5 text-[10.5px] font-medium tracking-wide truncate ${
                    isMonthlyPrimary ? 'text-blue-100/70' : 'text-[#E7D4C5]/70'
                  }`}
                >
                  {formatDateID(customPeriod.startDate)} –{' '}
                  {formatDateID(customPeriod.endDate)}
                </p>
              )}
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xl sm:text-[28px] font-bold tracking-tight text-white tabular-nums leading-tight">
                <span>
                  {hidden
                    ? '••••••••••'
                    : formatCurrency(activeSpending, currency)}
                </span>
                {!hidden && (
                  <span
                    className={`text-xs sm:text-sm font-semibold tabular-nums ${
                      spendingPct > 100
                        ? 'text-rose-200'
                        : isMonthlyPrimary
                        ? 'text-blue-100/90'
                        : 'text-[#E7D4C5]/90'
                    }`}
                  >
                    ({formatNumberID(spendingPct)}%)
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHidden((prev) => !prev)}
              aria-label={
                hidden ? 'Tampilkan total spending' : 'Sembunyikan total spending'
              }
              title={
                hidden ? 'Tampilkan total spending' : 'Sembunyikan total spending'
              }
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors shrink-0 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isMonthlyPrimary
                  ? 'bg-blue-500/30 hover:bg-blue-500/45 border-blue-200/40 text-blue-50'
                  : 'bg-[#7A4A2E]/75 hover:bg-[#8B5637] border-[#A67454]/45 text-[#F5EBE2]'
              }`}
            >
              {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Budget, Spending, and Highlighted Remaining (Right) */}
          <div
            className={`mt-4 pt-3.5 border-t flex items-center justify-between gap-2.5 sm:gap-3 ${
              isMonthlyPrimary ? 'border-blue-300/30' : 'border-[#9A6848]/40'
            }`}
          >
            <div
              className={`flex items-center min-w-0 flex-1 ${
                isMonthlyPrimary ? 'gap-2.5 sm:gap-4' : 'gap-3 sm:gap-5'
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-medium ${
                    isMonthlyPrimary ? 'text-blue-100/75' : 'text-[#E7D4C5]/75'
                  }`}
                >
                  Budget
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-white tabular-nums truncate">
                  {hidden
                    ? '••••••'
                    : formatCurrency(activeBudget, currency, {
                        compact: true,
                      })}
                </p>
              </div>
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-medium ${
                    isMonthlyPrimary ? 'text-blue-100/75' : 'text-[#E7D4C5]/75'
                  }`}
                >
                  Spending
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-white tabular-nums truncate">
                  {hidden
                    ? '••••••'
                    : formatCurrency(activeSpending, currency, {
                        compact: true,
                      })}
                </p>
              </div>
              {isMonthlyPrimary && (
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-blue-100/75">
                    Remaining
                  </p>
                  <p
                    className={`mt-0.5 text-xs sm:text-sm font-semibold tabular-nums truncate ${
                      activeRemaining < 0 ? 'text-rose-200' : 'text-white'
                    }`}
                  >
                    {hidden
                      ? '••••••'
                      : `${activeRemaining < 0 ? '-' : ''}${formatCurrency(
                          Math.abs(activeRemaining),
                          currency,
                          { compact: true }
                        )}`}
                  </p>
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <p
                className={`text-[11px] sm:text-xs font-semibold tracking-wide ${
                  isMonthlyPrimary
                    ? 'text-emerald-200'
                    : activeRemaining < 0
                    ? 'text-rose-200'
                    : 'text-emerald-200'
                }`}
              >
                {isMonthlyPrimary ? 'Saving' : 'Remaining'}
              </p>
              <p
                className={`mt-1 text-xl sm:text-[28px] font-bold tabular-nums leading-none whitespace-nowrap ${
                  isMonthlyPrimary
                    ? 'text-emerald-300'
                    : activeRemaining < 0
                    ? 'text-rose-200'
                    : 'text-emerald-300'
                }`}
              >
                {hidden
                  ? '••••••'
                  : isMonthlyPrimary
                  ? formatCurrency(monthlySaving, currency, {
                      compact: true,
                    })
                  : `${activeRemaining < 0 ? '-' : ''}${formatCurrency(
                      Math.abs(activeRemaining),
                      currency,
                      { compact: true }
                    )}`}
              </p>
            </div>
            </div>
          </div>
        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

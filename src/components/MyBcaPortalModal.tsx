import React from 'react';
import { Copy, ExternalLink, Landmark, ShieldCheck, X } from 'lucide-react';
import { UserProfile } from '../types/finance';

interface MyBcaPortalModalProps {
  open: boolean;
  profile: UserProfile;
  onCopyAccount: () => void;
  onGoToAutoPlot: () => void;
  onClose: () => void;
}

export const MyBcaPortalModal: React.FC<MyBcaPortalModalProps> = ({
  open,
  profile,
  onCopyAccount,
  onGoToAutoPlot,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mybca-portal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-[#0A3D91] to-[#1254C2] px-4 sm:px-6 py-4 sm:py-5 text-white flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="mybca-portal-title" className="text-base font-semibold truncate">
                Portal MyBCA & Mutasi
              </h3>
              <p className="text-xs text-blue-100 truncate">
                Akses cepat rekening & sinkronisasi mutasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup portal"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Rekening Terhubung</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {profile.bankAccount || 'Belum diatur'}
            </p>
            <p className="mt-0.5 text-xs font-mono text-slate-500">
              Kartu: {profile.cardNumber || 'Belum diatur'}
            </p>
            <button
              type="button"
              onClick={onCopyAccount}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              <Copy className="w-3.5 h-3.5" />
              Salin Info Rekening
            </button>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Untuk menjaga keamanan offline, aplikasi ini tidak menyimpan PIN
              atau kredensial bank. Anda dapat menyalin mutasi e-Statement dari
              portal MyBCA lalu menempelkannya di menu{' '}
              <strong className="text-slate-900">Plotting AI</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <a
              href="https://mybca.bca.co.id"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A3D91] hover:bg-[#083075] text-white text-sm font-semibold transition-colors"
            >
              Buka Web MyBCA
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToAutoPlot();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium transition-colors"
            >
              Ke Plotting AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

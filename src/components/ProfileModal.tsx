import React, { useEffect, useState } from 'react';
import { User, X } from 'lucide-react';
import { UserProfile } from '../types/finance';

interface ProfileModalProps {
  open: boolean;
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  profile,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState<UserProfile>(profile);

  useEffect(() => {
    if (open) setForm(profile);
  }, [open, profile]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      name: form.name.trim() || 'Pengguna',
      initialBalance: Number(form.initialBalance) || 0,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="profile-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                Profil & Parameter Akun
              </h3>
              <p className="text-xs text-slate-500">
                Disimpan langsung ke Cloud Firestore
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup profil"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Mata Uang Tampilan
              </label>
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm({
                    ...form,
                    currency: e.target.value as 'IDR' | 'USD',
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="IDR">IDR (Rupiah)</option>
                <option value="USD">USD (Dolar AS - $)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Saldo Awal (dalam IDR)
              </label>
              <input
                type="number"
                value={form.initialBalance}
                onChange={(e) =>
                  setForm({ ...form, initialBalance: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nomor Kartu
              </label>
              <input
                type="text"
                value={form.cardNumber}
                onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Rekening Bank Utama
            </label>
            <input
              type="text"
              value={form.bankAccount}
              onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              URL Avatar (opsional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

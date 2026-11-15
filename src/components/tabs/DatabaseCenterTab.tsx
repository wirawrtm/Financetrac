import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  Download,
  FlaskConical,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  DiagnosticLog,
  runDatabaseDiagnosticTests,
} from '../../db/dummyDb';
import { DummyDatabase } from '../../types/finance';
import {
  formatCurrency,
  formatDateID,
  formatNumberID,
} from '../../utils/formatters';

interface DatabaseCenterTabProps {
  db: DummyDatabase;
  isMobileLayout?: boolean;
  cloudUser?: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
  isCloudBusy?: boolean;
  onSyncNowToCloud?: () => void;
  onRequestClearTransactions: () => void;
  onImportJson: (rawText: string) => void;
  onNotify: (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message?: string
  ) => void;
}

const APPS_SCRIPT_ARCHIVE = `// Arsip Referensi Google Apps Script (Cadangan Offline)
// Catatan: Aplikasi DompetSaku berjalan 100% lokal di browser (localStorage).
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Transactions');
  const rows = sheet ? sheet.getDataRange().getValues() : [];
  return ContentService.createTextOutput(JSON.stringify({ rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function appendTransaction(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Transactions');
  sheet.appendRow([
    payload.id,
    payload.date,
    payload.type,
    payload.amount,
    payload.categoryName,
    payload.subcategoryName || '',
    payload.notes,
    payload.channel
  ]);
}`;

export const DatabaseCenterTab: React.FC<DatabaseCenterTabProps> = ({
  db,
  isMobileLayout = false,
  cloudUser,
  isCloudBusy = false,
  onSyncNowToCloud,
  onRequestClearTransactions,
  onImportJson,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'tables' | 'manage' | 'diag' | 'script'>(
    'tables'
  );
  const [activeTable, setActiveTable] = useState<
    'transactions' | 'categories' | 'budgets' | 'gallery' | 'profile'
  >('transactions');
  const [trxSearch, setTrxSearch] = useState('');
  const [diagLogs, setDiagLogs] = useState<DiagnosticLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredTransactions = useMemo(() => {
    const q = trxSearch.trim().toLowerCase();
    return [...db.transactions]
      .filter((t) => {
        if (!q) return true;
        return `${t.id} ${t.notes} ${t.categoryName} ${t.subcategoryName || ''} ${
          t.channel
        } ${t.date}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.transactions, trxSearch]);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dompetsaku-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', 'Cadangan database berhasil diekspor (.json)');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      onImportJson(text);
    } catch {
      onNotify('error', 'Gagal membaca file JSON');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRunDiagnostics = () => {
    const res = runDatabaseDiagnosticTests(db, cloudUser?.email || cloudUser?.uid);
    setDiagLogs(res.logs);
    if (res.failed === 0) {
      onNotify(
        'success',
        `Semua ${res.passed} pengujian database lulus`,
        'Integritas skema & Cloud Firestore terverifikasi.'
      );
    } else {
      onNotify('error', `${res.failed} pengujian gagal`);
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_ARCHIVE);
      onNotify('success', 'Arsip script disalin ke clipboard');
    } catch {
      onNotify('warning', 'Gagal menyalin otomatis, silakan salin manual');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Pusat Database
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Seluruh data aplikasi dimuat dan disimpan langsung pada Cloud Firestore tanpa data dummy.
        </p>
      </div>

      {/* Cloud Firestore Practical 1-Click Card */}
      <div
        className={`rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 flex justify-between gap-4 ${
          isMobileLayout
            ? 'flex-col'
            : 'flex-col sm:flex-row sm:items-center'
        }`}
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              cloudUser
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Cloud className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">
              Database Permanen Aktif (Akses Publik)
            </p>
            <p className="text-xs text-slate-500 mt-0.5 break-words">
              Workspace: {cloudUser?.email || 'wirabatik@gmail.com'} ·
              Terhubung langsung tanpa login atau verifikasi.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onSyncNowToCloud && (
            <button
              type="button"
              disabled={isCloudBusy}
              onClick={onSyncNowToCloud}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isCloudBusy ? 'animate-spin' : ''}`}
              />
              Sinkronkan Ulang
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            Publik & Permanen
          </span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div
        className={`grid gap-3 ${
          isMobileLayout ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        <div className="min-w-0 rounded-2xl bg-white border border-slate-100 p-3.5 sm:p-4">
          <p className="text-xs text-slate-500">Baris Transaksi</p>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
            {formatNumberID(db.transactions.length)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white border border-slate-100 p-3.5 sm:p-4">
          <p className="text-xs text-slate-500">Kategori Aktif</p>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
            {formatNumberID(db.categories.length)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white border border-slate-100 p-3.5 sm:p-4">
          <p className="text-xs text-slate-500">Aset Galeri</p>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
            {formatNumberID(db.gallery.length)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white border border-slate-100 p-3.5 sm:p-4">
          <p className="text-xs text-slate-500">Mesin Penyimpanan</p>
          <p className="mt-1 text-sm font-bold text-emerald-700 truncate">
            {cloudUser ? 'Cloud Firestore (Aktif)' : 'Cloud Firestore'}
          </p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="max-w-full overflow-x-auto flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(
          [
            { key: 'tables', label: 'Tabel Data' },
            { key: 'manage', label: 'Manajemen Cadangan' },
            { key: 'diag', label: 'Konsol Uji Diagnostik' },
            { key: 'script', label: 'Arsip Script' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subTab === tab.key
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab 1: Data Tables Viewer */}
      {subTab === 'tables' && (
        <div className="rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: 'transactions', label: 'Transaksi' },
                  { key: 'categories', label: 'Kategori' },
                  { key: 'budgets', label: 'Anggaran & Kalender' },
                  { key: 'gallery', label: 'Galeri' },
                  { key: 'profile', label: 'Profil' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTable(t.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    activeTable === t.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTable === 'transactions' && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={trxSearch}
                  onChange={(e) => setTrxSearch(e.target.value)}
                  placeholder="Cari di tabel transaksi..."
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs"
                />
              </div>
            )}
          </div>

          {activeTable === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-2 font-semibold">Tanggal</th>
                    <th className="py-2.5 px-2 font-semibold">Minggu</th>
                    <th className="py-2.5 px-2 font-semibold">Keterangan</th>
                    <th className="py-2.5 px-2 font-semibold">Kategori</th>
                    <th className="py-2.5 px-2 font-semibold">Channel</th>
                    <th className="py-2.5 px-2 font-semibold text-right">
                      Nominal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-mono whitespace-nowrap">
                        {t.date}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {t.week}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-900">
                        {t.notes}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600">
                        {t.categoryName}
                        {t.subcategoryName ? ` / ${t.subcategoryName}` : ''}
                      </td>
                      <td className="py-2.5 px-2 text-slate-500">
                        {t.channel}
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                          t.type === 'expense'
                            ? 'text-[#D9463E]'
                            : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(t.amount, db.userProfile.currency, {
                          showSign: true,
                          type: t.type,
                        })}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-slate-400"
                      >
                        Tidak ada baris transaksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTable === 'categories' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-2 font-semibold">ID</th>
                    <th className="py-2.5 px-2 font-semibold">Nama Kategori</th>
                    <th className="py-2.5 px-2 font-semibold">Sub-Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.categories.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-2 font-mono text-slate-500">
                        {c.id}
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600">
                        {c.subcategories.map((s) => s.name).join(', ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTable === 'budgets' && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="font-bold text-slate-900 mb-1">
                  Kalender Kustom Aktif
                </p>
                <p className="text-slate-600">
                  Status:{' '}
                  <strong>
                    {db.customCalendarPeriod.isActive ? 'Aktif' : 'Nonaktif'}
                  </strong>{' '}
                  · Label: <strong>{db.customCalendarPeriod.label}</strong> ·
                  Rentang:{' '}
                  <span className="font-mono">
                    {formatDateID(db.customCalendarPeriod.startDate)} –{' '}
                    {formatDateID(db.customCalendarPeriod.endDate)}
                  </span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 px-2">Periode</th>
                      <th className="py-2 px-2">Mulai</th>
                      <th className="py-2 px-2">Selesai</th>
                      <th className="py-2 px-2 text-right">Batas Anggaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(
                      [
                        'Week 1',
                        'Week 2',
                        'Week 3',
                        'Week 4',
                        'Monthly',
                      ] as const
                    ).map((wk) => (
                      <tr key={wk}>
                        <td className="py-2 px-2 font-semibold">{wk}</td>
                        <td className="py-2 px-2 font-mono">
                          {db.weeklyDateRanges[wk]?.startDate || '-'}
                        </td>
                        <td className="py-2 px-2 font-mono">
                          {db.weeklyDateRanges[wk]?.endDate || '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {formatCurrency(
                            db.weeklyBudgets[wk] || 0,
                            db.userProfile.currency
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTable === 'gallery' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 px-2">Nama</th>
                    <th className="py-2 px-2">File ID</th>
                    <th className="py-2 px-2">Direct URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.gallery.map((g) => (
                    <tr key={g.id}>
                      <td className="py-2 px-2 font-semibold">{g.name}</td>
                      <td className="py-2 px-2 font-mono">{g.fileId || '-'}</td>
                      <td className="py-2 px-2 font-mono truncate max-w-xs">
                        {g.directUrl}
                      </td>
                    </tr>
                  ))}
                  {db.gallery.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-6 text-center text-slate-400"
                      >
                        Belum ada aset gambar tersimpan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTable === 'profile' && (
            <div
              className={`grid gap-3 text-xs ${
                isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500">Nama Pemilik</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {db.userProfile.name}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500">Mata Uang</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {db.userProfile.currency}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500">Saldo Awal</span>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(
                    db.userProfile.initialBalance,
                    db.userProfile.currency
                  )}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500">Nomor Kartu & Rekening</span>
                <p className="mt-0.5 font-mono text-slate-900 break-words">
                  {db.userProfile.cardNumber} · {db.userProfile.bankAccount}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Backup & Reset */}
      {subTab === 'manage' && (
        <div
          className={`grid gap-4 ${
            isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          <div className="rounded-2xl bg-white border border-slate-100 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Database className="w-4 h-4" />
              Ekspor & Impor Cadangan (.json)
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Unduh seluruh snapshot data Cloud Firestore ke file JSON atau
              pulihkan kembali dari file cadangan sebelumnya.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
              >
                <Upload className="w-3.5 h-3.5" />
                Impor JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <RotateCcw className="w-4 h-4" />
              Pembersihan Data Transaksi
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kosongkan seluruh tabel transaksi di Cloud Firestore tanpa
              menghapus struktur kategori, anggaran, dan profil akun Anda.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={onRequestClearTransactions}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Kosongkan Tabel Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Database Diagnostic Console */}
      {subTab === 'diag' && (
        <div className="rounded-2xl bg-white border border-slate-100 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Konsol Uji Diagnostik Database
              </h3>
              <p className="text-xs text-slate-500">
                Memeriksa koneksi Cloud Firestore, integritas kategori sistem,
                serialisasi skema JSON, dan konfigurasi kalender tanpa menulis data contoh.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunDiagnostics}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              <FlaskConical className="w-4 h-4" />
              Jalankan Tes Database
            </button>
          </div>

          {diagLogs.length === 0 ? (
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center text-xs text-slate-500">
              Klik "Jalankan Tes Database" untuk memverifikasi integritas data Cloud Firestore.
            </div>
          ) : (
            <div className="space-y-2">
              {diagLogs.map((log, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3.5 sm:px-4 py-3 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {log.status === 'PASS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{log.step}</p>
                      <p className="text-slate-600 mt-0.5 break-words">{log.detail}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                    {log.status} · {formatNumberID(log.durationMs)}ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 4: Read-only Script Archive */}
      {subTab === 'script' && (
        <div className="rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Arsip Script Referensi (Hanya-Baca)
              </h3>
              <p className="text-xs text-slate-500">
                Referensi cadangan Google Apps Script bila suatu saat ingin
                sinkronisasi ke Spreadsheet.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyScript}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              Salin Script
            </button>
          </div>
          <pre className="rounded-xl bg-slate-900 text-slate-100 p-4 text-xs font-mono overflow-x-auto leading-relaxed">
            {APPS_SCRIPT_ARCHIVE}
          </pre>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Link2, Plus, Trash2 } from 'lucide-react';
import {
  Category,
  DriveImageItem,
  HistoryAmountIconsConfig,
} from '../../types/finance';
import { DEFAULT_HISTORY_AMOUNT_ICONS } from '../../db/dummyDb';
import {
  generateId,
  getImageCandidateUrls,
  parseGoogleDriveUrl,
} from '../../utils/formatters';

interface GalleryTabProps {
  gallery: DriveImageItem[];
  categories: Category[];
  historyAmountIcons?: HistoryAmountIconsConfig;
  isMobileLayout?: boolean;
  onAddGalleryItem: (item: DriveImageItem) => void;
  onDeleteGalleryItem: (id: string) => void;
  onLinkToCategory: (itemId: string, categoryId: string) => void;
  onUpdateHistoryAmountIcons?: (config: HistoryAmountIconsConfig) => void;
}

const GalleryPreviewImage: React.FC<{
  item: DriveImageItem;
  compact?: boolean;
}> = ({ item, compact = false }) => {
  const candidates = useMemo(
    () =>
      getImageCandidateUrls({
        fileId: item.fileId,
        rawUrl: item.rawUrl,
        directUrl: item.directUrl,
        fallbackUrl: item.fallbackUrl,
      }),
    [item.fileId, item.rawUrl, item.directUrl, item.fallbackUrl]
  );
  const candidatesKey = candidates.join('|');
  const [srcIdx, setSrcIdx] = useState(0);

  useEffect(() => {
    setSrcIdx(0);
  }, [candidatesKey]);

  const activeSrc = candidates[srcIdx] || '';

  if (!activeSrc) {
    return (
      <div
        className={
          compact
            ? 'w-full h-full bg-slate-100 flex items-center justify-center text-slate-400'
            : 'w-full h-36 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400'
        }
      >
        <ImageIcon className={compact ? 'w-4 h-4' : 'w-6 h-6'} />
        {!compact && <span className="mt-1 text-[11px]">{item.name}</span>}
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? 'w-full h-full flex items-center justify-center bg-transparent p-1'
          : 'w-full h-36 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-2'
      }
    >
      <img
        src={activeSrc}
        alt={item.name}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain"
        onError={() => setSrcIdx((prev) => prev + 1)}
      />
    </div>
  );
};

export const GalleryTab: React.FC<GalleryTabProps> = ({
  gallery,
  categories,
  historyAmountIcons = DEFAULT_HISTORY_AMOUNT_ICONS,
  isMobileLayout = false,
  onAddGalleryItem,
  onDeleteGalleryItem,
  onLinkToCategory,
  onUpdateHistoryAmountIcons,
}) => {
  const [name, setName] = useState('');
  const [rawUrl, setRawUrl] = useState('');
  const [categoryRefId, setCategoryRefId] = useState('');

  const parsedPreview = parseGoogleDriveUrl(rawUrl);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rawUrl.trim()) return;

    const parsed = parseGoogleDriveUrl(rawUrl);
    if (!parsed.directUrl) return;

    const item: DriveImageItem = {
      id: generateId('img'),
      name: name.trim(),
      rawUrl: rawUrl.trim(),
      directUrl: parsed.directUrl,
      fallbackUrl: parsed.fallbackUrl,
      fileId: parsed.fileId,
      categoryRefId: categoryRefId || undefined,
      createdAt: Date.now(),
    };

    onAddGalleryItem(item);
    setName('');
    setRawUrl('');
    setCategoryRefId('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Galeri Aset & Tautan Google Drive
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Tempel tautan berbagi Google Drive untuk mengekstrak File ID menjadi
          tautan gambar langsung, lalu hubungkan ke kategori sebagai ikon
          kustom.
        </p>
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-4 sm:p-5 space-y-4"
      >
        <div
          className={`grid gap-4 ${
            isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'
          }`}
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Aset / Ikon
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Logo Kopi Kenangan"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              URL Google Drive / Gambar Langsung
            </label>
            <input
              type="url"
              required
              value={rawUrl}
              onChange={(e) => setRawUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/FILE_ID/view"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hubungkan ke Kategori (Opsional)
            </label>
            <select
              value={categoryRefId}
              onChange={(e) => setCategoryRefId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
            >
              <option value="">-- Tidak dihubungkan --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rawUrl.trim() && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
              <GalleryPreviewImage
                compact
                item={{
                  id: 'preview',
                  name: name || 'Preview',
                  rawUrl: rawUrl.trim(),
                  directUrl: parsedPreview.directUrl,
                  fallbackUrl: parsedPreview.fallbackUrl,
                  fileId: parsedPreview.fileId,
                  createdAt: 0,
                }}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-slate-600">
                File ID:{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {parsedPreview.fileId || 'URL non-Drive langsung'}
                </span>
              </p>
              <p className="text-slate-500 truncate font-mono">
                Direct URL: {parsedPreview.directUrl}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Simpan ke Galeri Aset
          </button>
        </div>
      </form>

      {/* Gallery Grid */}
      {gallery.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-10 text-center">
          <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            Galeri Aset Masih Kosong
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Tambahkan tautan Google Drive atau gambar ikon merek agar dapat
            dipilih sebagai ikon kategori kustom.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            isMobileLayout
              ? 'grid-cols-1'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {gallery.map((item) => (
            <div
              key={item.id}
              className="min-w-0 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] p-4 space-y-3"
            >
              <GalleryPreviewImage item={item} />

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {item.fileId ? `ID: ${item.fileId}` : item.directUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteGalleryItem(item.id)}
                  aria-label={`Hapus ${item.name}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={item.categoryRefId || ''}
                    onChange={(e) => onLinkToCategory(item.id, e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  >
                    <option value="">Belum terhubung ke kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kategori: {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {onUpdateHistoryAmountIcons && (
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500 shrink-0">
                      Ikon Riwayat:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const isCurrent =
                            historyAmountIcons.income.driveItemId === item.id;
                          onUpdateHistoryAmountIcons({
                            ...historyAmountIcons,
                            income: isCurrent
                              ? { ...DEFAULT_HISTORY_AMOUNT_ICONS.income }
                              : {
                                  icon:
                                    historyAmountIcons.income.icon ||
                                    'TrendingUp',
                                  driveItemId: item.id,
                                  imageUrl: item.directUrl,
                                },
                          });
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          historyAmountIcons.income.driveItemId === item.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Pemasukan (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const isCurrent =
                            historyAmountIcons.expense.driveItemId === item.id;
                          onUpdateHistoryAmountIcons({
                            ...historyAmountIcons,
                            expense: isCurrent
                              ? { ...DEFAULT_HISTORY_AMOUNT_ICONS.expense }
                              : {
                                  icon:
                                    historyAmountIcons.expense.icon ||
                                    'TrendingDown',
                                  driveItemId: item.id,
                                  imageUrl: item.directUrl,
                                },
                          });
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          historyAmountIcons.expense.driveItemId === item.id
                            ? 'bg-[#D9463E] text-white border-[#D9463E]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Pengeluaran (-)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

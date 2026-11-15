import React, { useState } from 'react';
import {
  Check,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Category, DriveImageItem } from '../../types/finance';
import { isProtectedSavingSubcategory } from '../../db/dummyDb';
import { generateId } from '../../utils/formatters';
import { CATEGORY_ICON_OPTIONS, CategoryIcon } from '../CategoryIcon';

interface CategoriesTabProps {
  categories: Category[];
  gallery: DriveImageItem[];
  isMobileLayout?: boolean;
  onAddCategory: (cat: Category) => void;
  onUpdateCategory: (cat: Category) => void;
  onRequestDeleteCategory: (cat: Category) => void;
  onAddSubcategory: (categoryId: string, name: string) => void;
  onRenameSubcategory: (
    categoryId: string,
    subId: string,
    newName: string
  ) => void;
  onDeleteSubcategory: (categoryId: string, subId: string) => void;
}

const COLOR_PRESETS = [
  '#0F766E',
  '#D97706',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#0D9488',
  '#16A34A',
  '#D9463E',
  '#1E293B',
  '#64748B',
];

export const CategoriesTab: React.FC<CategoriesTabProps> = ({
  categories,
  gallery,
  isMobileLayout = false,
  onAddCategory,
  onUpdateCategory,
  onRequestDeleteCategory,
  onAddSubcategory,
  onRenameSubcategory,
  onDeleteSubcategory,
}) => {
  // Add/Edit category form state
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [icon, setIcon] = useState('Utensils');
  const [driveItemId, setDriveItemId] = useState('');

  // Inline subcategory inputs per category card
  const [newSubDraft, setNewSubDraft] = useState<Record<string, string>>({});
  const [editingSub, setEditingSub] = useState<{
    catId: string;
    subId: string;
    value: string;
  } | null>(null);

  const resetForm = () => {
    setEditingCat(null);
    setName('');
    setColor('#2563EB');
    setIcon('Utensils');
    setDriveItemId('');
  };

  const startEditCategory = (c: Category) => {
    setEditingCat(c);
    setName(c.name);
    setColor(c.color);
    setIcon(c.icon);
    setDriveItemId(c.driveItemId || '');
  };

  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const linkedDrive = gallery.find((g) => g.id === driveItemId);

    if (editingCat) {
      const isSaving =
        editingCat.id === 'cat-saving' ||
        editingCat.name.toLowerCase() === 'saving';

      onUpdateCategory({
        ...editingCat,
        name: isSaving ? 'Saving' : name.trim(),
        type: 'both',
        color,
        icon,
        driveItemId: driveItemId || undefined,
        imageUrl: linkedDrive?.directUrl,
      });
      resetForm();
    } else {
      onAddCategory({
        id: generateId('cat'),
        name: name.trim(),
        type: 'both',
        color,
        icon,
        driveItemId: driveItemId || undefined,
        imageUrl: linkedDrive?.directUrl,
        subcategories: [],
      });
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Kategori &amp; Sub-Kategori
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Semua kategori dapat digunakan untuk pemasukan maupun pengeluaran.
          Kelola sub-kategori, warna, serta ikon bawaan atau dari Galeri Aset.
        </p>
      </div>

      {/* Create / Edit Category Card */}
      <form
        onSubmit={handleSubmitCategory}
        className="rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {editingCat ? `Edit Kategori: ${editingCat.name}` : 'Tambah Kategori Baru'}
          </h3>
          {editingCat && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Batal Edit
            </button>
          )}
        </div>

        <div
          className={`grid gap-3 ${
            isMobileLayout
              ? 'grid-cols-1'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Kategori
            </label>
            <input
              type="text"
              required
              disabled={editingCat?.id === 'cat-saving'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Kesehatan"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Ikon Bawaan
            </label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {CATEGORY_ICON_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Gambar dari Galeri (Opsional)
            </label>
            <select
              value={driveItemId}
              onChange={(e) => setDriveItemId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Gunakan Ikon Bawaan</option>
              {gallery.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Warna:</span>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Pilih warna ${c}`}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            {editingCat ? 'Simpan Perubahan' : 'Tambah Kategori'}
          </button>
        </div>
      </form>

      {/* Categories List & Subcategories */}
      <div
        className={`grid gap-4 ${
          isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {categories.map((cat) => {
          const isProtected =
            cat.id === 'cat-saving' ||
            cat.name.toLowerCase() === 'saving' ||
            cat.id === 'cat-other';

          return (
            <div
              key={cat.id}
              className="min-w-0 rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon category={cat} gallery={gallery} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {cat.name}
                        </h4>
                        {isProtected && (
                          <Lock
                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            aria-label="Kategori sistem"
                          />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pemasukan &amp; Pengeluaran · {cat.subcategories.length}{' '}
                        sub-kategori
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditCategory(cat)}
                      aria-label={`Edit ${cat.name}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!isProtected && (
                      <button
                        type="button"
                        onClick={() => onRequestDeleteCategory(cat)}
                        aria-label={`Hapus ${cat.name}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcategories */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  {cat.subcategories.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Belum ada sub-kategori
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {cat.subcategories.map((sub) => {
                        const isProtectedSub = isProtectedSavingSubcategory(
                          cat,
                          sub
                        );
                        const isEditingThis =
                          !isProtectedSub &&
                          editingSub?.catId === cat.id &&
                          editingSub?.subId === sub.id;

                        return (
                          <div
                            key={sub.id}
                            className="py-1.5 flex items-center justify-between gap-2"
                          >
                            {isEditingThis ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={editingSub.value}
                                  onChange={(e) =>
                                    setEditingSub({
                                      ...editingSub,
                                      value: e.target.value,
                                    })
                                  }
                                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingSub.value.trim()) {
                                      onRenameSubcategory(
                                        cat.id,
                                        sub.id,
                                        editingSub.value.trim()
                                      );
                                    }
                                    setEditingSub(null);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-900 text-white"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSub(null)}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs text-slate-700 truncate">
                                    {sub.name}
                                  </span>
                                  {isProtectedSub && (
                                    <Lock
                                      className="w-3 h-3 text-slate-400 shrink-0"
                                      aria-label="Sub-kategori sistem"
                                    />
                                  )}
                                </div>
                                {isProtectedSub ? (
                                  <span className="text-[10px] font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md shrink-0">
                                    Sistem
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingSub({
                                          catId: cat.id,
                                          subId: sub.id,
                                          value: sub.name,
                                        })
                                      }
                                      aria-label={`Ubah sub-kategori ${sub.name}`}
                                      className="p-1 rounded text-slate-400 hover:text-slate-900"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onDeleteSubcategory(cat.id, sub.id)
                                      }
                                      aria-label={`Hapus sub-kategori ${sub.name}`}
                                      className="p-1 rounded text-slate-400 hover:text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Subcategory Inline */}
              <div className="flex gap-1.5 pt-2">
                <input
                  type="text"
                  value={newSubDraft[cat.id] || ''}
                  onChange={(e) =>
                    setNewSubDraft({ ...newSubDraft, [cat.id]: e.target.value })
                  }
                  placeholder="Tambah sub-kategori..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = (newSubDraft[cat.id] || '').trim();
                    if (!val) return;
                    onAddSubcategory(cat.id, val);
                    setNewSubDraft({ ...newSubDraft, [cat.id]: '' });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  + Tambah
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

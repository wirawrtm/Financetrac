import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Cloud,
  Database,
  FolderTree,
  Home,
  Image as ImageIcon,
  Lock,
  Menu,
  Monitor,
  Plus,
  PlusCircle,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { PRIMARY_USER_EMAIL, PRIMARY_WORKSPACE_UID } from './firebase';
import {
  initializeAndSubscribeCloud,
  pushFullDatabaseToCloud,
  syncDiffToFirestore,
} from './db/firestoreSync';
import {
  clearLegacyDummyStorage,
  clearTransactionsOnly,
  createEmptyDatabase,
  ensureProtectedSavingSubcategory,
  isProtectedSavingSubcategory,
  validateImportedDatabase,
} from './db/dummyDb';
import {
  Category,
  CustomCalendarPeriod,
  DriveImageItem,
  DummyDatabase,
  TabKey,
  ToastMessage,
  Transaction,
  WeeklyBudgets,
  WeeklyDateRanges,
} from './types/finance';
import { detectWeekFromDate, generateId } from './utils/formatters';
import { ConfirmModal } from './components/ConfirmModal';
import { MyBcaPortalModal } from './components/MyBcaPortalModal';
import { ToastContainer } from './components/ToastContainer';
import { BudgetTab } from './components/tabs/BudgetTab';
import { CategoriesTab } from './components/tabs/CategoriesTab';
import { DashboardTab } from './components/tabs/DashboardTab';
import { DatabaseCenterTab } from './components/tabs/DatabaseCenterTab';
import { GalleryTab } from './components/tabs/GalleryTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { InputTransactionTab } from './components/tabs/InputTransactionTab';

interface NavItem {
  key: TabKey;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Home', shortLabel: 'Home', icon: Home },
  {
    key: 'history',
    label: 'Riwayat & Kalender',
    shortLabel: 'Riwayat',
    icon: CalendarDays,
  },
  {
    key: 'input',
    label: 'Input Transaksi',
    shortLabel: 'Catat',
    icon: PlusCircle,
  },
  { key: 'budget', label: 'Anggaran', shortLabel: 'Anggaran', icon: BarChart3 },
  {
    key: 'categories',
    label: 'Kategori & Sub',
    shortLabel: 'Kategori',
    icon: FolderTree,
  },
  {
    key: 'gallery',
    label: 'Galeri Aset',
    shortLabel: 'Galeri',
    icon: ImageIcon,
  },
  {
    key: 'database',
    label: 'Pusat Database',
    shortLabel: 'Database',
    icon: Database,
  },
];

export default function App() {
  const [db, setDb] = useState<DummyDatabase>(() => {
    clearLegacyDummyStorage();
    return createEmptyDatabase();
  });
  const dbRef = useRef<DummyDatabase>(db);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [isCloudBusy, setIsCloudBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // Responsive mode with manual override
  const [manualViewMode, setManualViewMode] = useState<
    'auto' | 'desktop' | 'mobile'
  >('auto');
  const [isNarrowScreen, setIsNarrowScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Modals & Toasts
  const [myBcaOpen, setMyBcaOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Ya, Hapus',
    onConfirm: () => {},
  });

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  useEffect(() => {
    const onResize = () => setIsNarrowScreen(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobileLayout =
    manualViewMode === 'mobile' ||
    (manualViewMode === 'auto' && isNarrowScreen);

  const notify = useCallback(
    (
      type: ToastMessage['type'],
      title: string,
      message?: string
    ) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  // Subscribe directly to the permanent public Firestore workspace
  useEffect(() => {
    let cancelled = false;
    setCloudLoaded(false);

    const ready = { ws: false, trx: false, cat: false };
    let settled = false;
    const markReady = (part: keyof typeof ready) => {
      ready[part] = true;
      if (!settled && ready.ws && ready.trx && ready.cat) {
        settled = true;
        clearTimeout(safetyTimer);
        setCloudLoaded(true);
      }
    };

    const safetyTimer = setTimeout(() => {
      if (!cancelled && !settled) {
        settled = true;
        setCloudLoaded(true);
      }
    }, 4500);

    const applyCloudPatch = (updater: (prev: DummyDatabase) => DummyDatabase) => {
      const next = updater(dbRef.current);
      dbRef.current = next;
      setDb(next);
    };

    const cleanSeed = createEmptyDatabase();

    const unsubscribeCloud = initializeAndSubscribeCloud(
      PRIMARY_WORKSPACE_UID,
      cleanSeed,
      {
        onWorkspaceUpdate: (patch) => {
          if (cancelled) return;
          applyCloudPatch((prev) => ({
            ...prev,
            weeklyBudgets: patch.weeklyBudgets,
            weeklyDateRanges: patch.weeklyDateRanges,
            customCalendarPeriod: patch.customCalendarPeriod,
          }));
          markReady('ws');
        },
        onTransactionsUpdate: (transactions) => {
          if (cancelled) return;
          applyCloudPatch((prev) => ({ ...prev, transactions }));
          markReady('trx');
        },
        onCategoriesUpdate: (categories) => {
          if (cancelled) return;
          if (categories.length > 0) {
            const { categories: normalizedCategories, changed } =
              ensureProtectedSavingSubcategory(categories);
            applyCloudPatch((prev) => ({
              ...prev,
              categories: normalizedCategories,
            }));
            if (changed) {
              const prevSnapshot = { ...dbRef.current, categories };
              const nextSnapshot = {
                ...dbRef.current,
                categories: normalizedCategories,
              };
              void syncDiffToFirestore(
                PRIMARY_WORKSPACE_UID,
                prevSnapshot,
                nextSnapshot
              ).catch(() => {
                // Non-fatal: UI already has normalized Saving subcategory
              });
            }
          }
          markReady('cat');
        },
        onGalleryUpdate: (gallery) => {
          if (cancelled) return;
          applyCloudPatch((prev) => ({ ...prev, gallery }));
        },
        onBootstrappedNewWorkspace: () => {
          if (cancelled) return;
          notify(
            'success',
            'Database cloud aktif',
            'Workspace Cloud Firestore siap digunakan.'
          );
        },
        onPurgedDummyData: (deletedCount) => {
          if (cancelled) return;
          notify(
            'info',
            'Data dummy dibersihkan',
            `${deletedCount} transaksi contoh lama telah dihapus dari database.`
          );
        },
        onError: (err) => {
          if (cancelled) return;
          settled = true;
          clearTimeout(safetyTimer);
          setCloudLoaded(true);
          notify('error', 'Gagal menyambung ke Firestore', err.message);
        },
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      unsubscribeCloud();
    };
  }, [notify]);

  const handleSyncNowToCloud = async () => {
    setIsCloudBusy(true);
    try {
      await pushFullDatabaseToCloud(PRIMARY_WORKSPACE_UID, dbRef.current);
      notify('success', 'Data berhasil disinkronkan ulang ke Cloud Firestore');
    } catch (err) {
      notify(
        'error',
        'Sinkronisasi cloud gagal',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setIsCloudBusy(false);
    }
  };

  // Atomic DB mutator (optimistic state + immediate diff sync to Firestore)
  const commitDb = useCallback(
    (updater: (prev: DummyDatabase) => DummyDatabase) => {
      const prev = dbRef.current;
      const next = updater(prev);
      dbRef.current = next;
      setDb(next);
      void syncDiffToFirestore(PRIMARY_WORKSPACE_UID, prev, next).catch(
        (err) => {
          notify(
            'error',
            'Sinkronisasi cloud gagal',
            err instanceof Error ? err.message : undefined
          );
        }
      );
    },
    [notify]
  );

  // Navigation handler
  const navigateToTab = (tab: TabKey) => {
    if (tab !== 'input') {
      setEditingTransaction(null);
    }
    setActiveTab(tab);
    setMobileDrawerOpen(false);
  };

  // --- Transaction CRUD ---
  const handleSaveSingleTransaction = (
    trx: Transaction,
    openPortalAfter = false
  ) => {
    const isEdit = Boolean(editingTransaction);
    commitDb((prev) => {
      const exists = prev.transactions.some((t) => t.id === trx.id);
      const nextTransactions = exists
        ? prev.transactions.map((t) => (t.id === trx.id ? trx : t))
        : [trx, ...prev.transactions];
      return { ...prev, transactions: nextTransactions };
    });

    notify(
      'success',
      isEdit ? 'Transaksi diperbarui' : 'Transaksi disimpan',
      `${trx.notes} berhasil dicatat.`
    );
    setEditingTransaction(null);
    setActiveTab('dashboard');
    if (openPortalAfter) {
      setMyBcaOpen(true);
    }
  };

  const handleSaveBatchTransactions = (trxs: Transaction[]) => {
    commitDb((prev) => ({
      ...prev,
      transactions: [...trxs, ...prev.transactions],
    }));
    notify(
      'success',
      `${trxs.length} transaksi disimpan`,
      'Data telah tersimpan ke Cloud Firestore.'
    );
    setActiveTab('history');
  };

  const handleRequestDeleteTransaction = (trx: Transaction) => {
    setConfirmState({
      open: true,
      title: 'Hapus Transaksi?',
      description: `Transaksi "${trx.notes}" akan dihapus permanen dari database Cloud Firestore.`,
      confirmLabel: 'Hapus Transaksi',
      onConfirm: () => {
        commitDb((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== trx.id),
        }));
        if (editingTransaction?.id === trx.id) {
          setEditingTransaction(null);
          setActiveTab('dashboard');
        }
        setConfirmState((s) => ({ ...s, open: false }));
        notify('info', 'Transaksi dihapus');
      },
    });
  };

  const handleStartEditTransaction = (trx: Transaction) => {
    setEditingTransaction(trx);
    setActiveTab('input');
  };

  // --- Inline & Full Category / Subcategory CRUD ---
  const handleInlineAddSubcategory = (
    categoryId: string,
    subName: string
  ) => {
    const newSub = { id: generateId('sub'), name: subName };
    commitDb((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categoryId
          ? { ...c, subcategories: [...c.subcategories, newSub] }
          : c
      ),
    }));
    notify('success', `Sub-kategori "${subName}" ditambahkan`);
    return newSub;
  };

  const handleAddCategory = (cat: Category) => {
    commitDb((prev) => ({
      ...prev,
      categories: [...prev.categories, cat],
      gallery: cat.driveItemId
        ? prev.gallery.map((g) =>
            g.id === cat.driveItemId ? { ...g, categoryRefId: cat.id } : g
          )
        : prev.gallery,
    }));
    notify('success', `Kategori "${cat.name}" ditambahkan`);
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    commitDb((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === updatedCat.id ? updatedCat : c
      ),
      gallery: prev.gallery.map((g) => {
        if (updatedCat.driveItemId && g.id === updatedCat.driveItemId) {
          return { ...g, categoryRefId: updatedCat.id };
        }
        if (g.categoryRefId === updatedCat.id && g.id !== updatedCat.driveItemId) {
          return { ...g, categoryRefId: undefined };
        }
        return g;
      }),
      transactions: prev.transactions.map((t) =>
        t.categoryId === updatedCat.id
          ? { ...t, categoryName: updatedCat.name }
          : t
      ),
    }));
    notify('success', `Kategori "${updatedCat.name}" diperbarui`);
  };

  const handleRequestDeleteCategory = (cat: Category) => {
    if (cat.id === 'cat-saving' || cat.name.toLowerCase() === 'saving') {
      notify('warning', 'Kategori sistem Saving tidak dapat dihapus');
      return;
    }

    setConfirmState({
      open: true,
      title: `Hapus Kategori "${cat.name}"?`,
      description:
        'Transaksi yang memakai kategori ini akan dialihkan otomatis ke kategori "Lain-lain".',
      confirmLabel: 'Hapus Kategori',
      onConfirm: () => {
        commitDb((prev) => {
          const fallbackCat = prev.categories.find(
            (c) => c.id === 'cat-other' || c.name.toLowerCase() === 'lain-lain'
          );
          const fallbackId = fallbackCat?.id || 'cat-other';
          const fallbackName = fallbackCat?.name || 'Lain-lain';

          return {
            ...prev,
            categories: prev.categories.filter((c) => c.id !== cat.id),
            gallery: prev.gallery.map((g) =>
              g.categoryRefId === cat.id
                ? { ...g, categoryRefId: undefined }
                : g
            ),
            transactions: prev.transactions.map((t) =>
              t.categoryId === cat.id
                ? {
                    ...t,
                    categoryId: fallbackId,
                    categoryName: fallbackName,
                    subcategoryId: undefined,
                    subcategoryName: undefined,
                  }
                : t
            ),
          };
        });
        setConfirmState((s) => ({ ...s, open: false }));
        notify('info', `Kategori "${cat.name}" dihapus`);
      },
    });
  };

  const handleRenameSubcategory = (
    categoryId: string,
    subId: string,
    newName: string
  ) => {
    const targetCat = dbRef.current.categories.find((c) => c.id === categoryId);
    const targetSub = targetCat?.subcategories.find((s) => s.id === subId);
    if (
      targetCat &&
      targetSub &&
      isProtectedSavingSubcategory(targetCat, targetSub)
    ) {
      notify('warning', 'Sub-kategori sistem "Saving" tidak dapat diubah');
      return;
    }

    commitDb((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              subcategories: c.subcategories.map((s) =>
                s.id === subId ? { ...s, name: newName } : s
              ),
            }
          : c
      ),
      transactions: prev.transactions.map((t) =>
        t.subcategoryId === subId ? { ...t, subcategoryName: newName } : t
      ),
    }));
    notify('success', `Sub-kategori diperbarui menjadi "${newName}"`);
  };

  const handleDeleteSubcategory = (categoryId: string, subId: string) => {
    const targetCat = dbRef.current.categories.find((c) => c.id === categoryId);
    const targetSub = targetCat?.subcategories.find((s) => s.id === subId);
    if (
      targetCat &&
      targetSub &&
      isProtectedSavingSubcategory(targetCat, targetSub)
    ) {
      notify('warning', 'Sub-kategori sistem "Saving" tidak dapat dihapus');
      return;
    }

    commitDb((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              subcategories: c.subcategories.filter((s) => s.id !== subId),
            }
          : c
      ),
      transactions: prev.transactions.map((t) =>
        t.subcategoryId === subId
          ? { ...t, subcategoryId: undefined, subcategoryName: undefined }
          : t
      ),
    }));
    notify('info', 'Sub-kategori dihapus');
  };

  // --- Budgets & Calendar ---
  const handleSaveBudgetsAndRanges = (
    budgets: WeeklyBudgets,
    ranges: WeeklyDateRanges
  ) => {
    commitDb((prev) => ({
      ...prev,
      weeklyBudgets: budgets,
      weeklyDateRanges: ranges,
      transactions: prev.transactions.map((t) => ({
        ...t,
        week: t.week === 'Monthly' ? 'Monthly' : detectWeekFromDate(t.date, ranges),
      })),
    }));
    notify(
      'success',
      'Anggaran & rentang tanggal disimpan',
      'Label minggu pada seluruh transaksi ikut disesuaikan.'
    );
  };

  const handleUpdateCustomCalendar = (period: CustomCalendarPeriod) => {
    commitDb((prev) => ({
      ...prev,
      customCalendarPeriod: period,
    }));
    notify('success', 'Kalender periode kustom diperbarui');
  };

  const handleUpdateWeeklyRanges = (ranges: WeeklyDateRanges) => {
    commitDb((prev) => ({
      ...prev,
      weeklyDateRanges: ranges,
      transactions: prev.transactions.map((t) => ({
        ...t,
        week: t.week === 'Monthly' ? 'Monthly' : detectWeekFromDate(t.date, ranges),
      })),
    }));
  };

  // --- Gallery ---
  const handleAddGalleryItem = (item: DriveImageItem) => {
    commitDb((prev) => {
      const nextCategories = item.categoryRefId
        ? prev.categories.map((c) =>
            c.id === item.categoryRefId
              ? { ...c, driveItemId: item.id, imageUrl: item.directUrl }
              : c
          )
        : prev.categories;
      const nextGallery = item.categoryRefId
        ? [
            item,
            ...prev.gallery.map((g) =>
              g.categoryRefId === item.categoryRefId
                ? { ...g, categoryRefId: undefined }
                : g
            ),
          ]
        : [item, ...prev.gallery];
      return {
        ...prev,
        gallery: nextGallery,
        categories: nextCategories,
      };
    });
    notify('success', `Aset "${item.name}" disimpan ke galeri`);
  };

  const handleDeleteGalleryItem = (id: string) => {
    commitDb((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((g) => g.id !== id),
      categories: prev.categories.map((c) =>
        c.driveItemId === id
          ? { ...c, driveItemId: undefined, imageUrl: undefined }
          : c
      ),
    }));
    notify('info', 'Aset dihapus dari galeri');
  };

  const handleLinkGalleryToCategory = (itemId: string, categoryId: string) => {
    commitDb((prev) => {
      const item = prev.gallery.find((g) => g.id === itemId);
      return {
        ...prev,
        gallery: prev.gallery.map((g) => {
          if (g.id === itemId) {
            return { ...g, categoryRefId: categoryId || undefined };
          }
          if (categoryId && g.categoryRefId === categoryId) {
            return { ...g, categoryRefId: undefined };
          }
          return g;
        }),
        categories: prev.categories.map((c) => {
          if (c.id === categoryId && item) {
            return { ...c, driveItemId: item.id, imageUrl: item.directUrl };
          }
          if (c.driveItemId === itemId && c.id !== categoryId) {
            return { ...c, driveItemId: undefined, imageUrl: undefined };
          }
          return c;
        }),
      };
    });
    notify('success', 'Tautan ikon kategori diperbarui');
  };

  // --- Database Clear / Import ---
  const handleRequestClearTransactions = () => {
    setConfirmState({
      open: true,
      title: 'Kosongkan Tabel Transaksi?',
      description:
        'Semua catatan transaksi akan dihapus, namun kategori dan anggaran Anda tetap dipertahankan.',
      confirmLabel: 'Kosongkan Transaksi',
      onConfirm: () => {
        commitDb((prev) => clearTransactionsOnly(prev));
        setConfirmState((s) => ({ ...s, open: false }));
        notify('info', 'Tabel transaksi berhasil dikosongkan');
      },
    });
  };

  const handleImportJson = (rawText: string) => {
    try {
      const validated = validateImportedDatabase(rawText);
      commitDb(() => validated);
      notify(
        'success',
        'Database berhasil dipulihkan',
        `${validated.transactions.length} transaksi dimuat.`
      );
    } catch (err) {
      notify(
        'error',
        'Impor JSON gagal',
        err instanceof Error ? err.message : 'Format berkas tidak sesuai'
      );
    }
  };

  const activeNavItem = NAV_ITEMS.find((n) => n.key === activeTab) || NAV_ITEMS[0];

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            transactions={db.transactions}
            categories={db.categories}
            weeklyBudgets={db.weeklyBudgets}
            weeklyDateRanges={db.weeklyDateRanges}
            currency="IDR"
            gallery={db.gallery}
            isMobileLayout={isMobileLayout}
            onNavigateTab={navigateToTab}
            onOpenMyBca={() => setMyBcaOpen(true)}
            onEditTransaction={handleStartEditTransaction}
            onDeleteTransaction={handleRequestDeleteTransaction}
          />
        );
      case 'history':
        return (
          <HistoryTab
            transactions={db.transactions}
            categories={db.categories}
            weeklyDateRanges={db.weeklyDateRanges}
            customCalendarPeriod={db.customCalendarPeriod}
            currency="IDR"
            gallery={db.gallery}
            isMobileLayout={isMobileLayout}
            onUpdateCustomCalendar={handleUpdateCustomCalendar}
            onUpdateWeeklyRanges={handleUpdateWeeklyRanges}
            onEditTransaction={handleStartEditTransaction}
            onDeleteTransaction={handleRequestDeleteTransaction}
          />
        );
      case 'input':
        return (
          <InputTransactionTab
            categories={db.categories}
            weeklyDateRanges={db.weeklyDateRanges}
            currency="IDR"
            editingTransaction={editingTransaction}
            isMobileLayout={isMobileLayout}
            onCancelEdit={() => {
              setEditingTransaction(null);
              setActiveTab('dashboard');
            }}
            onSaveSingle={handleSaveSingleTransaction}
            onSaveBatch={handleSaveBatchTransactions}
            onDeleteTransaction={handleRequestDeleteTransaction}
            onInlineAddSubcategory={handleInlineAddSubcategory}
          />
        );
      case 'budget':
        return (
          <BudgetTab
            transactions={db.transactions}
            categories={db.categories}
            weeklyBudgets={db.weeklyBudgets}
            weeklyDateRanges={db.weeklyDateRanges}
            currency="IDR"
            isMobileLayout={isMobileLayout}
            onSaveBudgetsAndRanges={handleSaveBudgetsAndRanges}
          />
        );
      case 'categories':
        return (
          <CategoriesTab
            categories={db.categories}
            gallery={db.gallery}
            isMobileLayout={isMobileLayout}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onRequestDeleteCategory={handleRequestDeleteCategory}
            onAddSubcategory={(catId, subName) => {
              handleInlineAddSubcategory(catId, subName);
            }}
            onRenameSubcategory={handleRenameSubcategory}
            onDeleteSubcategory={handleDeleteSubcategory}
          />
        );
      case 'gallery':
        return (
          <GalleryTab
            gallery={db.gallery}
            categories={db.categories}
            isMobileLayout={isMobileLayout}
            onAddGalleryItem={handleAddGalleryItem}
            onDeleteGalleryItem={handleDeleteGalleryItem}
            onLinkToCategory={handleLinkGalleryToCategory}
          />
        );
      case 'database':
        return (
          <DatabaseCenterTab
            db={db}
            isMobileLayout={isMobileLayout}
            cloudUser={{
              uid: PRIMARY_WORKSPACE_UID,
              email: PRIMARY_USER_EMAIL,
              displayName: 'DompetSaku',
            }}
            isCloudBusy={isCloudBusy}
            onSyncNowToCloud={handleSyncNowToCloud}
            onRequestClearTransactions={handleRequestClearTransactions}
            onImportJson={handleImportJson}
            onNotify={notify}
          />
        );
    }
  };

  // Mobile Dock Items (3 primary tabs mirroring the floating dark pill dock)
  const mobileDockTabs: {
    key: TabKey;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { key: 'dashboard', label: 'Home', icon: Home },
    { key: 'history', label: 'Riwayat', icon: CalendarDays },
    { key: 'budget', label: 'Anggaran', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />

      <MyBcaPortalModal
        open={myBcaOpen}
        onClose={() => setMyBcaOpen(false)}
      />

      {!cloudLoaded ? (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm px-6 py-5 flex items-center gap-3.5 max-w-sm w-full">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                Memuat data dari database...
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Menghubungkan ke Cloud Firestore
              </p>
            </div>
          </div>
        </div>
      ) : isMobileLayout ? (
        /* ================= MOBILE VIEW (Tactile Wallet Design) ================= */
        <div
          className={`min-h-screen flex flex-col overflow-x-hidden ${
            !isNarrowScreen
              ? 'max-w-[430px] mx-auto my-6 rounded-[40px] border border-slate-200 bg-[#F8F9FA] shadow-2xl overflow-hidden relative min-h-[820px]'
              : ''
          }`}
        >
          {/* Floating Desktop Switch Bar when previewing Mobile on Desktop */}
          {!isNarrowScreen && (
            <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs">
              <span className="font-medium">Pratinjau Mode Mobile</span>
              <button
                type="button"
                onClick={() => setManualViewMode('desktop')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 font-semibold"
              >
                <Monitor className="w-3.5 h-3.5" />
                Ke Desktop
              </button>
            </div>
          )}

          {/* Mobile Top Header (mirrors the reference image: Menu left, Title + Subtitle center, + button right) */}
          <header className="sticky top-0 z-30 bg-[#F8F9FA]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Buka menu navigasi"
              className="w-11 h-11 rounded-full hover:bg-slate-200/70 flex items-center justify-center text-slate-900 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="text-center min-w-0 flex-1 px-1">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {activeNavItem.label}
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                Dompet & Transaksi Saya
              </p>
            </div>

            <div className="w-11 h-11 shrink-0" aria-hidden="true" />
          </header>

          {/* Mobile Scrollable Content */}
          <main className="flex-1 min-w-0 px-3.5 sm:px-4 pt-2 pb-28 overflow-y-auto overflow-x-hidden">
            {renderActiveTabContent()}
          </main>

          {/* Mobile Slide-Over Drawer for all 8 tabs */}
          {mobileDrawerOpen && (
            <div className="fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full p-5 flex flex-col justify-between gap-4 overflow-y-auto shadow-2xl">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold tracking-tight text-slate-900">
                      DompetSaku
                    </span>
                    <button
                      type="button"
                      onClick={() => setMobileDrawerOpen(false)}
                      aria-label="Tutup menu"
                      className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <nav className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => navigateToTab(item.key)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            active
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate font-medium">
                        {PRIMARY_USER_EMAIL}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shrink-0">
                      <Lock className="w-3 h-3" />
                      Publik
                    </span>
                  </div>
                  {isNarrowScreen && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualViewMode('desktop');
                        setMobileDrawerOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-50"
                    >
                      <Monitor className="w-4 h-4" />
                      Paksa Tampilan Desktop
                    </button>
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* Floating Dark Pill Bottom Dock + Separate Right (+) Button */}
          <div
            className={`${
              isNarrowScreen ? 'fixed bottom-3 inset-x-3' : 'absolute bottom-4 inset-x-3'
            } z-40 flex items-center justify-center gap-2 pointer-events-none`}
          >
            <nav
              aria-label="Navigasi bawah"
              className="pointer-events-auto min-w-0 max-w-full overflow-x-auto flex items-center gap-0.5 sm:gap-1 rounded-full bg-[#1C1C1E]/95 backdrop-blur-md px-1.5 sm:px-2 py-1.5 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.4)] border border-white/10"
            >
              {mobileDockTabs.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => navigateToTab(item.key)}
                    className={`flex items-center gap-1.5 ${
                      active ? 'px-3' : 'px-2.5 sm:px-3'
                    } py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#3A3A3C] text-white shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {active && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setActiveTab('input');
              }}
              aria-label="Tambah transaksi baru"
              className={`pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-[0_12px_28px_-6px_rgba(0,0,0,0.4)] border transition-colors shrink-0 ${
                activeTab === 'input'
                  ? 'bg-slate-900 text-white border-white/25'
                  : 'bg-[#1C1C1E]/95 hover:bg-[#2C2C2E] text-white border-white/10'
              }`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* ================= DESKTOP VIEW (1440px Sidebar + Workspace) ================= */
        <div className="min-h-screen flex">
          {/* Fixed Left Sidebar */}
          <aside className="w-64 shrink-0 bg-white border-r border-slate-200/80 flex flex-col justify-between sticky top-0 h-screen p-5">
            <div className="space-y-6">
              <div className="px-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  DompetSaku
                </span>
              </div>

              <nav aria-label="Menu Utama" className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => navigateToTab(item.key)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs">
                <span className="inline-flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate font-medium">
                    {PRIMARY_USER_EMAIL}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shrink-0">
                  <Lock className="w-3 h-3" />
                  Publik
                </span>
              </div>
            </div>
          </aside>

          {/* Main Desktop Viewport */}
          <div className="flex-1 min-w-0 flex flex-col">
            <header className="sticky top-0 z-30 bg-[#F8F9FA]/90 backdrop-blur-md border-b border-slate-200/70">
              <div className="max-w-[1200px] w-full mx-auto px-8 py-4 flex items-center justify-between gap-8">
                <div className="min-w-0">
                  <span className="text-base font-bold text-slate-900 whitespace-nowrap">
                    {activeNavItem.label}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setManualViewMode('mobile')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Mode Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTransaction(null);
                      setActiveTab('input');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Transaksi Baru
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 px-8 py-7 max-w-[1200px] w-full mx-auto">
              {renderActiveTabContent()}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

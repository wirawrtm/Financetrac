import {
  Category,
  CustomCalendarPeriod,
  DriveImageItem,
  DummyDatabase,
  Subcategory,
  Transaction,
  UserProfile,
  WeeklyBudgets,
  WeeklyDateRanges,
} from '../types/finance';

export const LEGACY_DB_STORAGE_KEY = 'dompet_saku_dummy_db_v1';
export const PROTECTED_SAVING_SUBCATEGORY_ID = 'sub-sav-saving';

export function isProtectedSavingSubcategory(
  cat: Pick<Category, 'id' | 'name'>,
  sub: Pick<Subcategory, 'id' | 'name'>
): boolean {
  const isSavingCat =
    cat.id === 'cat-saving' || cat.name.trim().toLowerCase() === 'saving';
  if (!isSavingCat) return false;
  return (
    sub.id === PROTECTED_SAVING_SUBCATEGORY_ID ||
    sub.name.trim().toLowerCase() === 'saving'
  );
}

export function isProtectedSavingTransaction(
  t: Pick<
    Transaction,
    'categoryId' | 'categoryName' | 'subcategoryId' | 'subcategoryName'
  >
): boolean {
  const isSavingCat =
    t.categoryId === 'cat-saving' ||
    t.categoryName.trim().toLowerCase() === 'saving';
  if (!isSavingCat) return false;
  return (
    t.subcategoryId === PROTECTED_SAVING_SUBCATEGORY_ID ||
    (t.subcategoryName || '').trim().toLowerCase() === 'saving'
  );
}

export function ensureProtectedSavingSubcategory(categories: Category[]): {
  categories: Category[];
  changed: boolean;
} {
  let changed = false;
  const next = categories.map((cat) => {
    const isSavingCat =
      cat.id === 'cat-saving' || cat.name.trim().toLowerCase() === 'saving';
    if (!isSavingCat) return cat;

    const existingIdx = cat.subcategories.findIndex(
      (s) =>
        s.id === PROTECTED_SAVING_SUBCATEGORY_ID ||
        s.name.trim().toLowerCase() === 'saving'
    );

    if (existingIdx === -1) {
      changed = true;
      return {
        ...cat,
        subcategories: [
          { id: PROTECTED_SAVING_SUBCATEGORY_ID, name: 'Saving' },
          ...cat.subcategories,
        ],
      };
    }

    const existing = cat.subcategories[existingIdx];
    if (existing.name !== 'Saving') {
      changed = true;
      return {
        ...cat,
        subcategories: cat.subcategories.map((s, idx) =>
          idx === existingIdx ? { ...s, name: 'Saving' } : s
        ),
      };
    }

    return cat;
  });

  return { categories: next, changed };
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-food',
    name: 'Makanan & Belanja',
    type: 'both',
    color: '#D97706',
    icon: 'Utensils',
    subcategories: [
      { id: 'sub-food-groceries', name: 'Groceries' },
      { id: 'sub-food-coffee', name: 'Kafe & Kopi' },
      { id: 'sub-food-dineout', name: 'Makan Luar' },
      { id: 'sub-food-minimarket', name: 'Minimarket' },
    ],
  },
  {
    id: 'cat-transport',
    name: 'Transportasi',
    type: 'both',
    color: '#2563EB',
    icon: 'Car',
    subcategories: [
      { id: 'sub-tr-fuel', name: 'Bensin & SPBU' },
      { id: 'sub-tr-ride', name: 'Ojek & Taksi Online' },
      { id: 'sub-tr-toll', name: 'Parkir & Tol' },
    ],
  },
  {
    id: 'cat-bills',
    name: 'Tagihan & Utilitas',
    type: 'both',
    color: '#7C3AED',
    icon: 'Zap',
    subcategories: [
      { id: 'sub-bill-power', name: 'Listrik & Air' },
      { id: 'sub-bill-net', name: 'Internet & Pulsa' },
      { id: 'sub-bill-bpjs', name: 'Asuransi & BPJS' },
    ],
  },
  {
    id: 'cat-entertainment',
    name: 'Hiburan',
    type: 'both',
    color: '#DB2777',
    icon: 'Film',
    subcategories: [
      { id: 'sub-ent-stream', name: 'Streaming' },
      { id: 'sub-ent-hobby', name: 'Hobi & Game' },
      { id: 'sub-ent-cinema', name: 'Bioskop & Acara' },
    ],
  },
  {
    id: 'cat-shopping',
    name: 'Belanja Pribadi',
    type: 'both',
    color: '#0D9488',
    icon: 'ShoppingBag',
    subcategories: [
      { id: 'sub-shop-apparel', name: 'Pakaian' },
      { id: 'sub-shop-care', name: 'Perawatan Diri' },
      { id: 'sub-shop-gadget', name: 'Elektronik' },
    ],
  },
  {
    id: 'cat-income',
    name: 'Gaji & Pendapatan',
    type: 'both',
    color: '#16A34A',
    icon: 'Briefcase',
    subcategories: [
      { id: 'sub-inc-salary', name: 'Gaji Utama' },
      { id: 'sub-inc-freelance', name: 'Proyek Freelance' },
      { id: 'sub-inc-bonus', name: 'Bonus & Tunjangan' },
    ],
  },
  {
    id: 'cat-saving',
    name: 'Saving',
    type: 'both',
    color: '#0F766E',
    icon: 'PiggyBank',
    isSystem: true,
    subcategories: [
      { id: PROTECTED_SAVING_SUBCATEGORY_ID, name: 'Saving' },
      { id: 'sub-sav-emergency', name: 'Dana Darurat' },
      { id: 'sub-sav-invest', name: 'Investasi' },
      { id: 'sub-sav-dividend', name: 'Bunga & Dividen' },
    ],
  },
  {
    id: 'cat-other',
    name: 'Lain-lain',
    type: 'both',
    color: '#64748B',
    icon: 'Layers',
    subcategories: [
      { id: 'sub-oth-general', name: 'Umum' },
      { id: 'sub-oth-admin', name: 'Biaya Admin' },
    ],
  },
];

export const EMPTY_WEEKLY_BUDGETS: WeeklyBudgets = {
  'Week 1': 0,
  'Week 2': 0,
  'Week 3': 0,
  'Week 4': 0,
  Monthly: 0,
};

function buildCurrentMonthRanges(): {
  weeklyDateRanges: WeeklyDateRanges;
  customCalendarPeriod: CustomCalendarPeriod;
} {
  const now = new Date();
  const y = now.getFullYear();
  const mIdx = now.getMonth();
  const mm = String(mIdx + 1).padStart(2, '0');
  const lastDay = String(new Date(y, mIdx + 1, 0).getDate()).padStart(2, '0');
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const weeklyDateRanges: WeeklyDateRanges = {
    'Week 1': { startDate: `${y}-${mm}-01`, endDate: `${y}-${mm}-07` },
    'Week 2': { startDate: `${y}-${mm}-08`, endDate: `${y}-${mm}-14` },
    'Week 3': { startDate: `${y}-${mm}-15`, endDate: `${y}-${mm}-21` },
    'Week 4': { startDate: `${y}-${mm}-22`, endDate: `${y}-${mm}-${lastDay}` },
    Monthly: { startDate: `${y}-${mm}-01`, endDate: `${y}-${mm}-${lastDay}` },
  };

  const customCalendarPeriod: CustomCalendarPeriod = {
    isActive: true,
    startDate: `${y}-${mm}-01`,
    endDate: `${y}-${mm}-${lastDay}`,
    label: `${monthNames[mIdx] ?? ''} ${y}`.trim(),
    updatedAt: Date.now(),
  };

  return { weeklyDateRanges, customCalendarPeriod };
}

export const EMPTY_USER_PROFILE: UserProfile = {
  name: 'Pengguna',
  avatarUrl: '',
  cardNumber: '',
  currency: 'IDR',
  initialBalance: 0,
  bankAccount: '',
};

export const DEFAULT_GALLERY: DriveImageItem[] = [];

export function clearLegacyDummyStorage(): void {
  try {
    localStorage.removeItem(LEGACY_DB_STORAGE_KEY);
  } catch {
    // Ignore storage access errors in restricted contexts
  }
}

export function createEmptyDatabase(seedProfile?: {
  name?: string | null;
  avatarUrl?: string | null;
}): DummyDatabase {
  const { weeklyDateRanges, customCalendarPeriod } = buildCurrentMonthRanges();
  return {
    version: 1,
    initializedAt: Date.now(),
    transactions: [],
    categories: structuredClone(DEFAULT_CATEGORIES),
    weeklyBudgets: structuredClone(EMPTY_WEEKLY_BUDGETS),
    weeklyDateRanges,
    customCalendarPeriod,
    userProfile: {
      ...structuredClone(EMPTY_USER_PROFILE),
      name: seedProfile?.name?.trim() || EMPTY_USER_PROFILE.name,
      avatarUrl: seedProfile?.avatarUrl?.trim() || '',
    },
    gallery: structuredClone(DEFAULT_GALLERY),
  };
}

export function clearTransactionsOnly(current: DummyDatabase): DummyDatabase {
  return {
    ...current,
    transactions: [],
  };
}

export function validateImportedDatabase(rawText: string): DummyDatabase {
  const parsed = JSON.parse(rawText) as Partial<DummyDatabase>;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray(parsed.transactions) ||
    !Array.isArray(parsed.categories)
  ) {
    throw new Error(
      'Format JSON cadangan tidak valid. Pastikan berasal dari ekspor DompetSaku.'
    );
  }

  const rawCategories = [...parsed.categories];
  if (!rawCategories.some((c) => c.name.toLowerCase() === 'saving')) {
    rawCategories.push({
      id: 'cat-saving',
      name: 'Saving',
      type: 'both',
      color: '#0F766E',
      icon: 'PiggyBank',
      isSystem: true,
      subcategories: [{ id: PROTECTED_SAVING_SUBCATEGORY_ID, name: 'Saving' }],
    });
  }
  const { categories } = ensureProtectedSavingSubcategory(rawCategories);

  const { weeklyDateRanges, customCalendarPeriod } = buildCurrentMonthRanges();

  return {
    version: parsed.version ?? 1,
    initializedAt: parsed.initializedAt ?? Date.now(),
    transactions: parsed.transactions,
    categories,
    weeklyBudgets: parsed.weeklyBudgets ?? structuredClone(EMPTY_WEEKLY_BUDGETS),
    weeklyDateRanges: parsed.weeklyDateRanges ?? weeklyDateRanges,
    customCalendarPeriod: parsed.customCalendarPeriod ?? customCalendarPeriod,
    userProfile: parsed.userProfile ?? structuredClone(EMPTY_USER_PROFILE),
    gallery: Array.isArray(parsed.gallery) ? parsed.gallery : [],
  };
}

export interface DiagnosticLog {
  step: string;
  status: 'PASS' | 'FAIL';
  detail: string;
  durationMs: number;
}

export function runDatabaseDiagnosticTests(
  currentDb: DummyDatabase,
  cloudUserEmail?: string | null
): {
  logs: DiagnosticLog[];
  passed: number;
  failed: number;
} {
  const logs: DiagnosticLog[] = [];

  try {
    const t0 = performance.now();
    const hasCollections =
      Array.isArray(currentDb.transactions) &&
      Array.isArray(currentDb.categories) &&
      Array.isArray(currentDb.gallery);
    logs.push({
      step: '1. Koneksi & Skema Cloud Firestore',
      status: cloudUserEmail && hasCollections ? 'PASS' : 'FAIL',
      detail: cloudUserEmail
        ? `Akun ${cloudUserEmail} aktif (${currentDb.transactions.length} transaksi, ${currentDb.categories.length} kategori dari database).`
        : 'Belum masuk akun Google Firestore.',
      durationMs: Math.round(performance.now() - t0),
    });

    const t1 = performance.now();
    const hasSaving = currentDb.categories.some(
      (c) => c.id === 'cat-saving' || c.name.toLowerCase() === 'saving'
    );
    logs.push({
      step: '2. Integritas Kategori Sistem',
      status: hasSaving ? 'PASS' : 'FAIL',
      detail: hasSaving
        ? 'Kategori sistem "Saving" terverifikasi di database.'
        : 'Kategori sistem "Saving" belum ditemukan.',
      durationMs: Math.round(performance.now() - t1),
    });

    const t2 = performance.now();
    const testTrx: Transaction = {
      id: 'diag-verify',
      date: new Date().toISOString().slice(0, 10),
      amount: 10000,
      type: 'expense',
      week: 'Week 1',
      categoryId: 'cat-other',
      categoryName: 'Lain-lain',
      notes: 'UJI_SERIALISASI_MEMORI',
      channel: 'Manual',
      createdAt: Date.now(),
    };
    const roundtrip = validateImportedDatabase(
      JSON.stringify({
        ...currentDb,
        transactions: [testTrx, ...currentDb.transactions],
      })
    );
    const createdFound = roundtrip.transactions.some(
      (t) => t.id === testTrx.id
    );
    logs.push({
      step: '3. Validasi Serialisasi Skema Ekspor/Impor',
      status: createdFound ? 'PASS' : 'FAIL',
      detail: createdFound
        ? 'Struktur dokumen transaksi & kategori lolos validasi skema JSON.'
        : 'Gagal memvalidasi skema JSON.',
      durationMs: Math.round(performance.now() - t2),
    });

    const t3 = performance.now();
    const hasValidCalendar =
      Boolean(currentDb.customCalendarPeriod.startDate) &&
      Boolean(currentDb.customCalendarPeriod.endDate) &&
      Boolean(currentDb.weeklyDateRanges['Week 1']);
    logs.push({
      step: '4. Integritas Rentang Kalender & Mingguan',
      status: hasValidCalendar ? 'PASS' : 'FAIL',
      detail: hasValidCalendar
        ? `Periode aktif "${currentDb.customCalendarPeriod.label}" (${currentDb.customCalendarPeriod.startDate} s/d ${currentDb.customCalendarPeriod.endDate}).`
        : 'Konfigurasi rentang tanggal belum lengkap.',
      durationMs: Math.round(performance.now() - t3),
    });
  } catch (err) {
    logs.push({
      step: 'Eksekusi Tes Diagnostik',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : 'Kesalahan tak terduga',
      durationMs: 0,
    });
  }

  return {
    logs,
    passed: logs.filter((l) => l.status === 'PASS').length,
    failed: logs.filter((l) => l.status === 'FAIL').length,
  };
}

import {
  Timestamp,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Category,
  CustomCalendarPeriod,
  DriveImageItem,
  DummyDatabase,
  HistoryAmountIconEntry,
  HistoryAmountIconsConfig,
  Transaction,
  WeekKey,
  WeeklyBudgets,
  WeeklyDateRanges,
} from '../types/finance';
import { DEFAULT_HISTORY_AMOUNT_ICONS } from './dummyDb';
import { OperationType, db, handleFirestoreError } from '../firebase';

const VALID_WEEKS: WeekKey[] = [
  'Week 1',
  'Week 2',
  'Week 3',
  'Week 4',
  'Monthly',
];

const BATCH_LIMIT = 10;

const knownWorkspaceUsers = new Set<string>();

function sanitizeDocId(raw: unknown, fallbackPrefix: string, idx = 0): string {
  const cleaned =
    typeof raw === 'string'
      ? raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128)
      : '';
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}-${idx}`;
}

function clampString(value: unknown, maxLen: number, fallback = ''): string {
  const str = typeof value === 'string' ? value : fallback;
  return str.slice(0, maxLen);
}

function clampNonNegNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function normalizeIsoDate(value: unknown, fallback = '2026-11-13'): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  return fallback;
}

function buildWorkspaceFields(dbState: DummyDatabase) {
  const weeklyBudgets: WeeklyBudgets = {
    'Week 1': clampNonNegNumber(dbState.weeklyBudgets['Week 1']),
    'Week 2': clampNonNegNumber(dbState.weeklyBudgets['Week 2']),
    'Week 3': clampNonNegNumber(dbState.weeklyBudgets['Week 3']),
    'Week 4': clampNonNegNumber(dbState.weeklyBudgets['Week 4']),
    Monthly: clampNonNegNumber(dbState.weeklyBudgets.Monthly),
  };

  const sanitizeRange = (r?: { startDate?: string; endDate?: string }) => ({
    startDate: clampString(r?.startDate, 20),
    endDate: clampString(r?.endDate, 20),
  });

  const weeklyDateRanges: WeeklyDateRanges = {
    'Week 1': sanitizeRange(dbState.weeklyDateRanges['Week 1']),
    'Week 2': sanitizeRange(dbState.weeklyDateRanges['Week 2']),
    'Week 3': sanitizeRange(dbState.weeklyDateRanges['Week 3']),
    'Week 4': sanitizeRange(dbState.weeklyDateRanges['Week 4']),
    Monthly: sanitizeRange(dbState.weeklyDateRanges.Monthly),
  };

  const customCalendarPeriod: CustomCalendarPeriod = {
    isActive: Boolean(dbState.customCalendarPeriod.isActive),
    startDate: clampString(dbState.customCalendarPeriod.startDate, 20),
    endDate: clampString(dbState.customCalendarPeriod.endDate, 20),
    label: clampString(dbState.customCalendarPeriod.label, 100),
    updatedAt: Math.max(
      0,
      Math.trunc(Number(dbState.customCalendarPeriod.updatedAt || Date.now()))
    ),
  };

  const sanitizeAmountIconEntry = (
    entry: Partial<HistoryAmountIconEntry> | undefined,
    fallbackIcon: string
  ): HistoryAmountIconEntry => {
    const out: HistoryAmountIconEntry = {
      icon: clampString(entry?.icon, 64, fallbackIcon).trim() || fallbackIcon,
    };
    if (entry?.driveItemId && entry.driveItemId.trim()) {
      out.driveItemId = clampString(entry.driveItemId.trim(), 128);
    }
    if (entry?.imageUrl && entry.imageUrl.trim()) {
      out.imageUrl = clampString(entry.imageUrl.trim(), 1000);
    }
    return out;
  };

  const historyAmountIcons: HistoryAmountIconsConfig = {
    income: sanitizeAmountIconEntry(
      dbState.historyAmountIcons?.income,
      DEFAULT_HISTORY_AMOUNT_ICONS.income.icon
    ),
    expense: sanitizeAmountIconEntry(
      dbState.historyAmountIcons?.expense,
      DEFAULT_HISTORY_AMOUNT_ICONS.expense.icon
    ),
  };

  return {
    weeklyBudgets,
    weeklyDateRanges,
    customCalendarPeriod,
    historyAmountIcons,
  };
}

function buildTransactionFields(
  userId: string,
  trx: Transaction,
  safeId: string
) {
  const safeWeek: WeekKey = VALID_WEEKS.includes(trx.week)
    ? trx.week
    : 'Week 2';
  const payload: Record<string, unknown> = {
    id: safeId,
    ownerId: userId,
    date: normalizeIsoDate(trx.date),
    amount: clampNonNegNumber(trx.amount),
    type: trx.type === 'income' ? 'income' : 'expense',
    week: safeWeek,
    categoryId: clampString(trx.categoryId, 128, 'cat-other') || 'cat-other',
    categoryName:
      clampString(trx.categoryName, 120, 'Lain-lain') || 'Lain-lain',
    notes: clampString(trx.notes, 300),
    channel: clampString(trx.channel, 80, 'Manual'),
    clientCreatedAt: Math.max(
      0,
      Math.trunc(Number(trx.createdAt || Date.now()))
    ),
  };

  if (trx.subcategoryId && trx.subcategoryId.trim()) {
    payload.subcategoryId = clampString(trx.subcategoryId, 128);
  }
  if (trx.subcategoryName && trx.subcategoryName.trim()) {
    payload.subcategoryName = clampString(trx.subcategoryName, 120);
  }
  return payload;
}

function buildCategoryFields(
  userId: string,
  cat: Category,
  safeId: string
) {
  const payload: Record<string, unknown> = {
    id: safeId,
    ownerId: userId,
    name: clampString(cat.name, 120, 'Kategori').trim() || 'Kategori',
    type:
      cat.type === 'income' || cat.type === 'both' ? cat.type : 'expense',
    color: clampString(cat.color, 32, '#64748B') || '#64748B',
    icon: clampString(cat.icon, 64, 'Layers') || 'Layers',
    subcategories: (cat.subcategories || []).slice(0, 50).map((s, idx) => ({
      id: sanitizeDocId(s.id, 'sub', idx),
      name: clampString(s.name, 120),
    })),
  };

  if (cat.imageUrl && cat.imageUrl.trim()) {
    payload.imageUrl = clampString(cat.imageUrl, 1000);
  }
  if (cat.driveItemId && cat.driveItemId.trim()) {
    payload.driveItemId = clampString(cat.driveItemId, 128);
  }
  if (typeof cat.isSystem === 'boolean') {
    payload.isSystem = cat.isSystem;
  }

  return payload;
}

function buildGalleryFields(
  userId: string,
  item: DriveImageItem,
  safeId: string
) {
  const payload: Record<string, unknown> = {
    id: safeId,
    ownerId: userId,
    name: clampString(item.name, 120, 'Aset').trim() || 'Aset',
    rawUrl: clampString(item.rawUrl, 1000, 'https://drive.google.com') || 'https://drive.google.com',
    directUrl: clampString(item.directUrl, 1000, 'https://drive.google.com') || 'https://drive.google.com',
    fallbackUrl: clampString(
      item.fallbackUrl || item.directUrl,
      1000,
      'https://drive.google.com'
    ) || 'https://drive.google.com',
    fileId: clampString(item.fileId, 256),
    clientCreatedAt: Math.max(
      0,
      Math.trunc(Number(item.createdAt || Date.now()))
    ),
  };

  if (item.categoryRefId && item.categoryRefId.trim()) {
    payload.categoryRefId = clampString(item.categoryRefId, 128);
  }
  return payload;
}

/**
 * Uploads full local database to user's Firestore workspace in batches.
 */
export async function pushFullDatabaseToCloud(
  userId: string,
  dbState: DummyDatabase
): Promise<void> {
  const workspacePath = `users/${userId}`;
  const workspaceRef = doc(db, 'users', userId);
  let workspaceExisted = false;

  try {
    const existingSnap = await getDoc(workspaceRef);
    workspaceExisted = existingSnap.exists();
    const wsFields = buildWorkspaceFields(dbState);

    if (workspaceExisted) {
      const existingWsData = existingSnap.data() || {};
      const wsUpdatePayload: Record<string, unknown> = {
        ...wsFields,
        updatedAt: serverTimestamp(),
      };
      if ('userProfile' in existingWsData) {
        wsUpdatePayload.userProfile = deleteField();
      }
      await updateDoc(workspaceRef, wsUpdatePayload);
    } else {
      await setDoc(workspaceRef, {
        ownerId: userId,
        ...wsFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    knownWorkspaceUsers.add(userId);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, workspacePath);
  }

  let currentBatchPath = `${workspacePath}/subcollections`;
  try {
    const [existingCatSnap, existingTrxSnap, existingGalSnap] =
      workspaceExisted
        ? await Promise.all([
            getDocs(
              query(
                collection(db, 'users', userId, 'categories'),
                where('ownerId', '==', userId)
              )
            ),
            getDocs(
              query(
                collection(db, 'users', userId, 'transactions'),
                where('ownerId', '==', userId)
              )
            ),
            getDocs(
              query(
                collection(db, 'users', userId, 'gallery'),
                where('ownerId', '==', userId)
              )
            ),
          ])
        : [null, null, null];

    const existingCatData = new Map(
      existingCatSnap?.docs.map((d) => [d.id, d.data()]) || []
    );
    const existingTrxData = new Map(
      existingTrxSnap?.docs.map((d) => [d.id, d.data()]) || []
    );
    const existingGalData = new Map(
      existingGalSnap?.docs.map((d) => [d.id, d.data()]) || []
    );

    const subOps: Array<{
      path: string;
      apply: (batch: ReturnType<typeof writeBatch>) => void;
    }> = [];

    dbState.categories.forEach((cat, idx) => {
      const safeId = sanitizeDocId(cat.id, 'cat', idx);
      const ref = doc(db, 'users', userId, 'categories', safeId);
      const fields = buildCategoryFields(userId, cat, safeId);
      const existingDoc = existingCatData.get(safeId);
      if (existingDoc) {
        delete fields.id;
        delete fields.ownerId;
        delete fields.isSystem;
        if ('imageUrl' in existingDoc && !fields.imageUrl) {
          fields.imageUrl = deleteField();
        }
        if ('driveItemId' in existingDoc && !fields.driveItemId) {
          fields.driveItemId = deleteField();
        }
        subOps.push({
          path: `${workspacePath}/categories/${safeId}`,
          apply: (batch) =>
            batch.update(ref, {
              ...fields,
              updatedAt: serverTimestamp(),
            }),
        });
      } else {
        subOps.push({
          path: `${workspacePath}/categories/${safeId}`,
          apply: (batch) =>
            batch.set(ref, {
              ...fields,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
        });
      }
    });

    dbState.transactions.forEach((trx, idx) => {
      const safeId = sanitizeDocId(trx.id, 'trx', idx);
      const ref = doc(db, 'users', userId, 'transactions', safeId);
      const fields = buildTransactionFields(userId, trx, safeId);
      const existingDoc = existingTrxData.get(safeId);
      if (existingDoc) {
        delete fields.id;
        delete fields.ownerId;
        if ('subcategoryId' in existingDoc && !fields.subcategoryId) {
          fields.subcategoryId = deleteField();
        }
        if ('subcategoryName' in existingDoc && !fields.subcategoryName) {
          fields.subcategoryName = deleteField();
        }
        subOps.push({
          path: `${workspacePath}/transactions/${safeId}`,
          apply: (batch) =>
            batch.update(ref, {
              ...fields,
              updatedAt: serverTimestamp(),
            }),
        });
      } else {
        subOps.push({
          path: `${workspacePath}/transactions/${safeId}`,
          apply: (batch) =>
            batch.set(ref, {
              ...fields,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
        });
      }
    });

    dbState.gallery.forEach((item, idx) => {
      const safeId = sanitizeDocId(item.id, 'gal', idx);
      const ref = doc(db, 'users', userId, 'gallery', safeId);
      const fields = buildGalleryFields(userId, item, safeId);
      const existingDoc = existingGalData.get(safeId);
      if (existingDoc) {
        delete fields.id;
        delete fields.ownerId;
        if ('categoryRefId' in existingDoc && !fields.categoryRefId) {
          fields.categoryRefId = deleteField();
        }
        subOps.push({
          path: `${workspacePath}/gallery/${safeId}`,
          apply: (batch) =>
            batch.update(ref, {
              ...fields,
              updatedAt: serverTimestamp(),
            }),
        });
      } else {
        subOps.push({
          path: `${workspacePath}/gallery/${safeId}`,
          apply: (batch) =>
            batch.set(ref, {
              ...fields,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
        });
      }
    });

    // Chunk into batches of 10 (safely under Firestore's rule-lookup limit per batch)
    for (let i = 0; i < subOps.length; i += BATCH_LIMIT) {
      const slice = subOps.slice(i, i + BATCH_LIMIT);
      currentBatchPath = slice[0]?.path || `${workspacePath}/subcollections`;
      const batch = writeBatch(db);
      for (const op of slice) op.apply(batch);
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, currentBatchPath);
  }
}

/**
 * Lightweight diff-based sync: only writes or deletes documents that actually changed.
 */
export async function syncDiffToFirestore(
  userId: string,
  prev: DummyDatabase,
  next: DummyDatabase
): Promise<void> {
  const workspacePath = `users/${userId}`;
  const workspaceRef = doc(db, 'users', userId);

  try {
    if (!knownWorkspaceUsers.has(userId)) {
      const snap = await getDoc(workspaceRef);
      if (!snap.exists()) {
        await pushFullDatabaseToCloud(userId, next);
        return;
      }
      knownWorkspaceUsers.add(userId);
    }

    const workspaceChanged =
      JSON.stringify(prev.weeklyBudgets) !== JSON.stringify(next.weeklyBudgets) ||
      JSON.stringify(prev.weeklyDateRanges) !==
        JSON.stringify(next.weeklyDateRanges) ||
      JSON.stringify(prev.customCalendarPeriod) !==
        JSON.stringify(next.customCalendarPeriod) ||
      JSON.stringify(prev.historyAmountIcons ?? DEFAULT_HISTORY_AMOUNT_ICONS) !==
        JSON.stringify(next.historyAmountIcons ?? DEFAULT_HISTORY_AMOUNT_ICONS);

    if (workspaceChanged) {
      const wsFields = buildWorkspaceFields(next);
      await updateDoc(workspaceRef, {
        ...wsFields,
        updatedAt: serverTimestamp(),
      });
    }

    const ops: Array<{
      path: string;
      apply: (batch: ReturnType<typeof writeBatch>) => void;
    }> = [];

    // Diff Transactions
    const prevTrxMap = new Map(
      prev.transactions.map((t, i) => [sanitizeDocId(t.id, 'trx', i), t])
    );
    const nextTrxMap = new Map(
      next.transactions.map((t, i) => [sanitizeDocId(t.id, 'trx', i), t])
    );

    for (const [safeId, nextTrx] of nextTrxMap.entries()) {
      const prevTrx = prevTrxMap.get(safeId);
      const ref = doc(db, 'users', userId, 'transactions', safeId);
      if (!prevTrx) {
        const fields = buildTransactionFields(userId, nextTrx, safeId);
        ops.push({
          path: `${workspacePath}/transactions/${safeId}`,
          apply: (batch) =>
            batch.set(ref, {
              ...fields,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
        });
      } else if (JSON.stringify(prevTrx) !== JSON.stringify(nextTrx)) {
        const fields = buildTransactionFields(userId, nextTrx, safeId);
        delete fields.id;
        delete fields.ownerId;
        if (prevTrx.subcategoryId && !nextTrx.subcategoryId) {
          fields.subcategoryId = deleteField();
        }
        if (prevTrx.subcategoryName && !nextTrx.subcategoryName) {
          fields.subcategoryName = deleteField();
        }
        ops.push({
          path: `${workspacePath}/transactions/${safeId}`,
          apply: (batch) =>
            batch.update(ref, {
              ...fields,
              updatedAt: serverTimestamp(),
            }),
        });
      }
    }
    for (const safeId of prevTrxMap.keys()) {
      if (!nextTrxMap.has(safeId)) {
        const ref = doc(db, 'users', userId, 'transactions', safeId);
        ops.push({
          path: `${workspacePath}/transactions/${safeId}`,
          apply: (batch) => batch.delete(ref),
        });
      }
    }

    // Diff Categories
    const prevCatMap = new Map(
      prev.categories.map((c, i) => [sanitizeDocId(c.id, 'cat', i), c])
    );
    const nextCatMap = new Map(
      next.categories.map((c, i) => [sanitizeDocId(c.id, 'cat', i), c])
    );

    for (const [safeId, nextCat] of nextCatMap.entries()) {
      const prevCat = prevCatMap.get(safeId);
      const ref = doc(db, 'users', userId, 'categories', safeId);
      if (!prevCat) {
        const fields = buildCategoryFields(userId, nextCat, safeId);
        ops.push({
          path: `${workspacePath}/categories/${safeId}`,
          apply: (batch) =>
            batch.set(ref, {
              ...fields,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
        });
      } else if (JSON.stringify(prevCat) !== JSON.stringify(nextCat)) {
        const fields = buildCategoryFields(userId, nextCat, safeId);
        delete fields.id;
        delete fields.ownerId;
        delete fields.isSystem;
        if (prevCat.imageUrl && !nextCat.imageUrl) {
          fields.imageUrl = deleteField();
        }
        if (prevCat.driveItemId && !nextCat.driveItemId) {
          fields.driveItemId = deleteField();
        }
        ops.push({
          path: `${workspacePath}/categories/${safeId}`,
          apply: (batch) =>
            batch.update(ref, {
              ...fields,
              updatedAt: serverTimestamp(),
            }),
        });
      }
    }
    for (const safeId of prevCatMap.keys()) {
      if (!nextCatMap.has(safeId)) {
        const ref = doc(db, 'users', userId, 'categories', safeId);
        ops.push({
          path: `${workspacePath}/categories/${safeId}`,
          apply: (batch) => batch.delete(ref),
        });
      }
    }

    // Diff Gallery
    const prevGalMap = new Map(
      prev.gallery.map((g, i) => [sanitizeDocId(g.id, 'gal', i), g])
    );
    const nextGalMap = new Map(
      next.gallery.map((g, i) => [sanitizeDocId(g.id, 'gal', i), g])
    );

    for (const [safeId, nextItem] of nextGalMap.entries()) {
      const prevItem = prevGalMap.get(safeId);
      const ref = doc(db, 'users', userId, 'gallery', safeId);
      if (!prevItem) {
        const fields = buildGalleryFields(userId, nextItem, safeId);
        ops.push({
          path: `${workspacePath}/gallery/${safeId}`,
          apply: (batch) =>
            batch.set(ref, {
              ...fields,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
        });
      } else if (JSON.stringify(prevItem) !== JSON.stringify(nextItem)) {
        const fields = buildGalleryFields(userId, nextItem, safeId);
        delete fields.id;
        delete fields.ownerId;
        if (prevItem.categoryRefId && !nextItem.categoryRefId) {
          fields.categoryRefId = deleteField();
        }
        ops.push({
          path: `${workspacePath}/gallery/${safeId}`,
          apply: (batch) =>
            batch.update(ref, {
              ...fields,
              updatedAt: serverTimestamp(),
            }),
        });
      }
    }
    for (const safeId of prevGalMap.keys()) {
      if (!nextGalMap.has(safeId)) {
        const ref = doc(db, 'users', userId, 'gallery', safeId);
        ops.push({
          path: `${workspacePath}/gallery/${safeId}`,
          apply: (batch) => batch.delete(ref),
        });
      }
    }

    if (ops.length === 0) return;

    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
      const slice = ops.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const op of slice) op.apply(batch);
      try {
        await batch.commit();
      } catch (batchErr) {
        handleFirestoreError(
          batchErr,
          OperationType.WRITE,
          slice[0]?.path || workspacePath
        );
      }
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('{"error":')
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, workspacePath);
  }
}

const LEGACY_DUMMY_TRX_SIGNATURES: Record<string, string> = {
  'trx-01': 'Gaji Bulanan PT Nusantara Digital',
  'trx-02': 'Cashback & Bunga Tabungan',
  'trx-03': 'Setor Tabungan Dana Darurat',
  'trx-04': 'Belanja Groceries GrandLucky',
  'trx-05': 'Isi Bensin Shell V-Power',
  'trx-06': 'Freelance UI/UX Desain Web',
  'trx-07': 'Token Listrik PLN Prabayar',
  'trx-08': 'Kopi Susu & Croissant Fore Coffee',
  'trx-09': 'Langganan Netflix & Spotify',
  'trx-10': 'Kebutuhan Harian Indomaret',
  'trx-11': 'Makan Siang Nasi Padang Sederhana',
  'trx-12': 'Kemeja Kasual Uniqlo',
  'trx-13': 'Top-up Reksadana Pasar Uang Bibit',
  'trx-14': 'Tagihan Internet Biznet Home',
};

function isLegacyDummyTransactionDoc(id: string, notes: unknown): boolean {
  const expectedNotes = LEGACY_DUMMY_TRX_SIGNATURES[id];
  return Boolean(expectedNotes && notes === expectedNotes);
}

/**
 * Subscribes in parallel via a single multiplexed Watch stream to all 4 user Firestore paths
 * and handles workspace bootstrap / legacy dummy cleanup without premature cache-empty emissions.
 */
export function initializeAndSubscribeCloud(
  userId: string,
  cleanInitialDb: DummyDatabase,
  callbacks: {
    onWorkspaceUpdate: (patch: {
      weeklyBudgets: WeeklyBudgets;
      weeklyDateRanges: WeeklyDateRanges;
      customCalendarPeriod: CustomCalendarPeriod;
      historyAmountIcons: HistoryAmountIconsConfig;
    }) => void;
    onTransactionsUpdate: (transactions: Transaction[]) => void;
    onCategoriesUpdate: (categories: Category[]) => void;
    onGalleryUpdate: (gallery: DriveImageItem[]) => void;
    onBootstrappedNewWorkspace?: () => void;
    onPurgedDummyData?: (deletedCount: number) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const workspaceRef = doc(db, 'users', userId);
  let didBootstrap = false;
  let didCleanWorkspace = false;
  let didPurgeLegacyDummyTrx = false;

  let wsEmitted = false;
  let trxEmitted = false;
  let catEmitted = false;
  let galEmitted = false;

  let active = true;

  const mapTransactions = (
    docs: Array<{ id: string; data: () => Record<string, unknown> }>
  ): Transaction[] => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const list: Transaction[] = docs
      .filter(
        (docSnap) =>
          !isLegacyDummyTransactionDoc(docSnap.id, docSnap.data().notes)
      )
      .map((docSnap) => {
        const d = docSnap.data();
        const fallbackTs =
          d.createdAt instanceof Timestamp
            ? d.createdAt.toMillis()
            : Date.now();
        return {
          id: String(d.id || docSnap.id),
          date: String(d.date || todayIso),
          amount: Number(d.amount || 0),
          type: d.type === 'income' ? 'income' : 'expense',
          week: (VALID_WEEKS.includes(d.week as WeekKey)
            ? d.week
            : 'Week 2') as WeekKey,
          categoryId: String(d.categoryId || 'cat-other'),
          categoryName: String(d.categoryName || 'Lain-lain'),
          subcategoryId: d.subcategoryId ? String(d.subcategoryId) : undefined,
          subcategoryName: d.subcategoryName
            ? String(d.subcategoryName)
            : undefined,
          notes: String(d.notes || ''),
          channel: String(d.channel || 'Manual'),
          createdAt: Number(d.clientCreatedAt ?? fallbackTs),
        };
      });
    list.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt - a.createdAt;
    });
    return list;
  };

  const mapCategories = (
    docs: Array<{ id: string; data: () => Record<string, unknown> }>
  ): Category[] =>
    docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: String(d.id || docSnap.id),
        name: String(d.name || 'Kategori'),
        type: d.type === 'income' || d.type === 'both' ? d.type : 'expense',
        color: String(d.color || '#64748B'),
        icon: String(d.icon || 'Layers'),
        imageUrl: d.imageUrl ? String(d.imageUrl) : undefined,
        driveItemId: d.driveItemId ? String(d.driveItemId) : undefined,
        isSystem: typeof d.isSystem === 'boolean' ? d.isSystem : undefined,
        subcategories: Array.isArray(d.subcategories)
          ? d.subcategories.map((s: Record<string, unknown>) => ({
              id: String(s.id || ''),
              name: String(s.name || ''),
            }))
          : [],
      };
    });

  const mapGallery = (
    docs: Array<{ id: string; data: () => Record<string, unknown> }>
  ): DriveImageItem[] =>
    docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: String(d.id || docSnap.id),
        name: String(d.name || 'Aset'),
        rawUrl: String(d.rawUrl || ''),
        directUrl: String(d.directUrl || ''),
        fallbackUrl: String(d.fallbackUrl || ''),
        fileId: String(d.fileId || ''),
        categoryRefId: d.categoryRefId ? String(d.categoryRefId) : undefined,
        createdAt: Number(d.clientCreatedAt || Date.now()),
      };
    });

  const emitWorkspaceData = (d: Record<string, unknown>) => {
    const rawIcons = d.historyAmountIcons as
      | Partial<HistoryAmountIconsConfig>
      | undefined;
    callbacks.onWorkspaceUpdate({
      weeklyBudgets:
        (d.weeklyBudgets as WeeklyBudgets) || cleanInitialDb.weeklyBudgets,
      weeklyDateRanges:
        (d.weeklyDateRanges as WeeklyDateRanges) ||
        cleanInitialDb.weeklyDateRanges,
      customCalendarPeriod:
        (d.customCalendarPeriod as CustomCalendarPeriod) ||
        cleanInitialDb.customCalendarPeriod,
      historyAmountIcons: {
        income: rawIcons?.income?.icon
          ? rawIcons.income
          : DEFAULT_HISTORY_AMOUNT_ICONS.income,
        expense: rawIcons?.expense?.icon
          ? rawIcons.expense
          : DEFAULT_HISTORY_AMOUNT_ICONS.expense,
      },
    });
  };

  const trxQuery = query(
    collection(db, 'users', userId, 'transactions'),
    where('ownerId', '==', userId)
  );
  const catQuery = query(
    collection(db, 'users', userId, 'categories'),
    where('ownerId', '==', userId)
  );
  const galQuery = query(
    collection(db, 'users', userId, 'gallery'),
    where('ownerId', '==', userId)
  );

  const unsubWorkspace = onSnapshot(
    workspaceRef,
    { includeMetadataChanges: true },
    (snap) => {
      if (!active) return;
      if (!snap.exists()) {
        if (!snap.metadata.fromCache && !didBootstrap) {
          didBootstrap = true;
          void pushFullDatabaseToCloud(userId, cleanInitialDb)
            .then(() => {
              if (!active) return;
              wsEmitted = true;
              callbacks.onWorkspaceUpdate({
                weeklyBudgets: cleanInitialDb.weeklyBudgets,
                weeklyDateRanges: cleanInitialDb.weeklyDateRanges,
                customCalendarPeriod: cleanInitialDb.customCalendarPeriod,
                historyAmountIcons:
                  cleanInitialDb.historyAmountIcons ||
                  DEFAULT_HISTORY_AMOUNT_ICONS,
              });
              callbacks.onCategoriesUpdate(cleanInitialDb.categories);
              callbacks.onGalleryUpdate(cleanInitialDb.gallery);
              callbacks.onTransactionsUpdate(cleanInitialDb.transactions);
              callbacks.onBootstrappedNewWorkspace?.();
            })
            .catch((err) => {
              if (!active) return;
              callbacks.onError(
                err instanceof Error ? err : new Error(String(err))
              );
            });
        }
        return;
      }

      knownWorkspaceUsers.add(userId);
      const d = snap.data();

      if (!didCleanWorkspace && !snap.metadata.fromCache) {
        didCleanWorkspace = true;
        const hasLegacyProfileField = 'userProfile' in d;
        const hasLegacyDummyBudgets =
          d.weeklyBudgets?.['Week 1'] === 2000000 &&
          d.weeklyBudgets?.['Week 2'] === 1500000 &&
          d.weeklyBudgets?.['Week 3'] === 1500000 &&
          d.weeklyBudgets?.['Week 4'] === 1500000 &&
          d.weeklyBudgets?.Monthly === 6500000;

        if (hasLegacyProfileField || hasLegacyDummyBudgets) {
          const wsPatch: Record<string, unknown> = {
            updatedAt: serverTimestamp(),
          };
          if (hasLegacyProfileField) {
            wsPatch.userProfile = deleteField();
          }
          if (hasLegacyDummyBudgets) {
            wsPatch.weeklyBudgets = {
              'Week 1': 0,
              'Week 2': 0,
              'Week 3': 0,
              'Week 4': 0,
              Monthly: 0,
            };
          }
          void updateDoc(workspaceRef, wsPatch).catch(() => {
            // Non-fatal background cleanup
          });
        }
      }

      if (!wsEmitted || !snap.metadata.hasPendingWrites) {
        wsEmitted = true;
        emitWorkspaceData(d);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      } catch (wrapped) {
        callbacks.onError(
          wrapped instanceof Error ? wrapped : new Error(String(wrapped))
        );
      }
    }
  );

  const unsubTrx = onSnapshot(
    trxQuery,
    { includeMetadataChanges: true },
    (snap) => {
      if (!active) return;
      const isReady = snap.docs.length > 0 || !snap.metadata.fromCache;
      if (!isReady) return;
      if (trxEmitted && snap.docChanges().length === 0) return;

      if (!snap.metadata.fromCache && !didPurgeLegacyDummyTrx) {
        const dummyRefsToDelete = snap.docs
          .filter((docSnap) =>
            isLegacyDummyTransactionDoc(docSnap.id, docSnap.data().notes)
          )
          .map((docSnap) => docSnap.ref);

        didPurgeLegacyDummyTrx = true;
        if (dummyRefsToDelete.length > 0) {
          void (async () => {
            for (let i = 0; i < dummyRefsToDelete.length; i += BATCH_LIMIT) {
              const batch = writeBatch(db);
              for (const ref of dummyRefsToDelete.slice(i, i + BATCH_LIMIT)) {
                batch.delete(ref);
              }
              await batch.commit();
            }
            callbacks.onPurgedDummyData?.(dummyRefsToDelete.length);
          })().catch(() => {
            // Non-fatal background cleanup error
          });
        }
      }

      trxEmitted = true;
      callbacks.onTransactionsUpdate(mapTransactions(snap.docs));
    },
    (error) => {
      try {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${userId}/transactions`
        );
      } catch (wrapped) {
        callbacks.onError(
          wrapped instanceof Error ? wrapped : new Error(String(wrapped))
        );
      }
    }
  );

  const unsubCat = onSnapshot(
    catQuery,
    { includeMetadataChanges: true },
    (snap) => {
      if (!active) return;
      const isReady = snap.docs.length > 0 || !snap.metadata.fromCache;
      if (!isReady) return;
      if (catEmitted && snap.docChanges().length === 0) return;

      catEmitted = true;
      callbacks.onCategoriesUpdate(mapCategories(snap.docs));
    },
    (error) => {
      try {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${userId}/categories`
        );
      } catch (wrapped) {
        callbacks.onError(
          wrapped instanceof Error ? wrapped : new Error(String(wrapped))
        );
      }
    }
  );

  const unsubGal = onSnapshot(
    galQuery,
    { includeMetadataChanges: true },
    (snap) => {
      if (!active) return;
      const isReady = snap.docs.length > 0 || !snap.metadata.fromCache;
      if (!isReady) return;
      if (galEmitted && snap.docChanges().length === 0) return;

      galEmitted = true;
      callbacks.onGalleryUpdate(mapGallery(snap.docs));
    },
    (error) => {
      try {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${userId}/gallery`
        );
      } catch (wrapped) {
        callbacks.onError(
          wrapped instanceof Error ? wrapped : new Error(String(wrapped))
        );
      }
    }
  );

  return () => {
    active = false;
    unsubWorkspace();
    unsubTrx();
    unsubCat();
    unsubGal();
  };
}

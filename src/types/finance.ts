export type TransactionType = 'expense' | 'income';

export type WeekKey = 'Week 1' | 'Week 2' | 'Week 3' | 'Week 4' | 'Monthly';

export type TabKey =
  | 'dashboard'
  | 'history'
  | 'input'
  | 'budget'
  | 'categories'
  | 'gallery'
  | 'database';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  week: WeekKey;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  notes: string;
  channel: string;
  createdAt: number;
}

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'both';
  color: string;
  icon: string;
  imageUrl?: string;
  driveItemId?: string;
  isSystem?: boolean;
  subcategories: Subcategory[];
}

export interface WeeklyDateRange {
  startDate: string;
  endDate: string;
}

export type WeeklyBudgets = Record<WeekKey, number>;

export type WeeklyDateRanges = Record<WeekKey, WeeklyDateRange>;

export interface CustomCalendarPeriod {
  isActive: boolean;
  startDate: string;
  endDate: string;
  label: string;
  updatedAt: number;
}

export interface DriveImageItem {
  id: string;
  name: string;
  rawUrl: string;
  directUrl: string;
  fallbackUrl: string;
  fileId: string;
  categoryRefId?: string;
  createdAt: number;
}

export interface HistoryAmountIconEntry {
  icon: string;
  driveItemId?: string;
  imageUrl?: string;
}

export interface HistoryAmountIconsConfig {
  income: HistoryAmountIconEntry;
  expense: HistoryAmountIconEntry;
}

export interface DummyDatabase {
  version: number;
  initializedAt: number;
  transactions: Transaction[];
  categories: Category[];
  weeklyBudgets: WeeklyBudgets;
  weeklyDateRanges: WeeklyDateRanges;
  customCalendarPeriod: CustomCalendarPeriod;
  gallery: DriveImageItem[];
  historyAmountIcons?: HistoryAmountIconsConfig;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

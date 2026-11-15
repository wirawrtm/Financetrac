import {
  AutoPlotItem,
  Category,
  TransactionType,
  WeekKey,
  WeeklyDateRanges,
} from '../types/finance';

export function formatCurrency(
  amount: number,
  currency: 'IDR' | 'USD' = 'IDR',
  options?: { showSign?: boolean; type?: TransactionType; compact?: boolean }
): string {
  const abs = Math.abs(amount);
  const sign =
    options?.showSign && options?.type
      ? options.type === 'expense'
        ? '- '
        : '+ '
      : amount < 0
      ? '- '
      : '';

  if (currency === 'USD') {
    const converted = abs / 15500;
    if (options?.compact && converted >= 1000) {
      return `${sign}$${(converted / 1000).toFixed(1)}k`;
    }
    return `${sign}$${converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (options?.compact && abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace('.0', '')} jt`;
  }
  if (options?.compact && abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)} rb`;
  }

  return `${sign}${Math.round(abs).toLocaleString('id-ID')}`;
}

export function formatDateID(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  return `${String(day).padStart(2, '0')} ${months[month] ?? ''} ${year}`;
}

export function formatMonthYearID(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const months = [
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
  const idx = Number(m) - 1;
  return `${months[idx] ?? m} ${y}`;
}

export function formatShortDateTime(dateStr: string, createdAt: number): string {
  const d = new Date(createdAt);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const [, m, day] = dateStr.split('-');
  return `${hh}:${mm} · ${day}/${m}`;
}

export function detectWeekFromDate(
  dateStr: string,
  ranges: WeeklyDateRanges
): WeekKey {
  const weeks: ('Week 1' | 'Week 2' | 'Week 3' | 'Week 4')[] = [
    'Week 1',
    'Week 2',
    'Week 3',
    'Week 4',
  ];
  for (const w of weeks) {
    const r = ranges[w];
    if (r && r.startDate && r.endDate && dateStr >= r.startDate && dateStr <= r.endDate) {
      return w;
    }
  }
  // Fallback based on day of month
  const day = Number(dateStr.split('-')[2] || '1');
  if (day <= 7) return 'Week 1';
  if (day <= 14) return 'Week 2';
  if (day <= 21) return 'Week 3';
  return 'Week 4';
}

export function parseGoogleDriveUrl(rawUrl: string): {
  fileId: string;
  directUrl: string;
  fallbackUrl: string;
  isValidDrive: boolean;
} {
  const trimmed = rawUrl.trim();
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,})/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      const fileId = match[1];
      return {
        fileId,
        directUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
        fallbackUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
        isValidDrive: true,
      };
    }
  }

  return {
    fileId: '',
    directUrl: trimmed,
    fallbackUrl: trimmed,
    isValidDrive: false,
  };
}

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Deterministic local parser for raw MyBCA mutation text or free-form Indonesian notes.
 * Used as offline fallback when Gemini API key is absent or unreachable.
 */
export function localFallbackAutoPlot(
  rawText: string,
  categories: Category[],
  defaultDate = '2026-11-13'
): AutoPlotItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: AutoPlotItem[] = [];

  const findCat = (keyword: string, fallbackType: TransactionType) => {
    const match = categories.find(
      (c) => c.name.toLowerCase().includes(keyword.toLowerCase()) && (c.type === fallbackType || c.type === 'both')
    );
    if (match) return match;
    return (
      categories.find((c) => c.name.toLowerCase().includes('lain') && (c.type === fallbackType || c.type === 'both')) ||
      categories.find((c) => c.type === fallbackType || c.type === 'both') ||
      categories[0]
    );
  };

  for (const line of lines) {
    // Skip header-only or status-only lines
    if (/^(tanggal|mutasi|saldo|no\.|keterangan)$/i.test(line)) continue;

    // Extract date (YYYY-MM-DD or DD/MM/YYYY or DD/MM)
    let date = defaultDate;
    const isoDateMatch = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const slashDateMatch = line.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);

    if (isoDateMatch) {
      date = isoDateMatch[1];
    } else if (slashDateMatch) {
      const dd = slashDateMatch[1].padStart(2, '0');
      const mm = slashDateMatch[2].padStart(2, '0');
      const yyyy = slashDateMatch[3]
        ? slashDateMatch[3].length === 2
          ? `20${slashDateMatch[3]}`
          : slashDateMatch[3]
        : defaultDate.slice(0, 4);
      date = `${yyyy}-${mm}-${dd}`;
    }

    // Detect type
    const lower = line.toLowerCase();
    const isIncome =
      /\b(cr|credit|masuk|gaji|payroll|bonus|freelance|dividen|bunga|cashback|terima|topup masuk)\b/i.test(lower) ||
      /\+\s*(?:rp|idr)?\s*\d/i.test(line);

    const type: TransactionType = isIncome ? 'income' : 'expense';

    // Extract amount (supports 50000, 50.000, 50,000, Rp 150.000, 28k, 1.5jt)
    let amount = 0;
    const kMatch = line.match(/\b(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)\b/i);
    const jtMatch = line.match(/\b(\d+(?:[.,]\d+)?)\s*(jt|juta|m)\b/i);
    const idrMatch = line.match(/(?:rp\.?\s*|idr\s*|[-+]\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?:[.,]\d{2})?/gi);

    if (jtMatch) {
      amount = Math.round(parseFloat(jtMatch[1].replace(',', '.')) * 1_000_000);
    } else if (kMatch) {
      amount = Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1_000);
    } else if (idrMatch) {
      // Pick the largest numeric candidate that isn't a year or date segment
      let best = 0;
      for (const token of idrMatch) {
        const cleaned = token.replace(/[^\d.,]/g, '');
        // Remove trailing .00 or ,00
        const withoutCents = cleaned.replace(/[.,]\d{2}$/, '');
        const digits = Number(withoutCents.replace(/[.,]/g, ''));
        if (!Number.isNaN(digits) && digits >= 500 && digits > best) {
          best = digits;
        }
      }
      amount = best;
    }

    if (amount <= 0) continue;

    // Clean merchant/notes
    let cleanedNotes = line
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
      .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, '')
      .replace(/\b(successful|berhasil|pending|settled|db|cr|idr|rp\.?)\b/gi, '')
      .replace(/\b\d+(?:[.,]\d+)?\s*(k|rb|ribu|jt|juta)\b/gi, '')
      .replace(/[-+]?\s*\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?/g, '')
      .replace(/\b\d{4,}\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s\-|:•]+|[\s\-|:•]+$/g, '')
      .trim();

    if (!cleanedNotes) {
      cleanedNotes = type === 'income' ? 'Pemasukan Mutasi' : 'Pengeluaran Mutasi';
    }

    // Channel detection
    let channel = 'Manual';
    if (/qris/i.test(lower)) channel = 'MyBCA QRIS';
    else if (/transfer|trf|bi-fast|bifast/i.test(lower)) channel = 'MyBCA Transfer';
    else if (/debit|edc/i.test(lower)) channel = 'BCA Debit';
    else if (/cash|tunai/i.test(lower)) channel = 'Cash';
    else if (/mybca|bca/i.test(lower)) channel = 'MyBCA Transfer';

    // Category & subcategory recommendation
    let cat = findCat('lain', type);
    let subId: string | undefined;
    let subName: string | undefined;
    let reason = 'Dipetakan otomatis berdasarkan pola teks lokal';

    if (type === 'income') {
      if (/gaji|salary|payroll|freelance|proyek|bonus|komisi/i.test(lower)) {
        cat = findCat('gaji', 'income');
        reason = 'Terdeteksi kata kunci pendapatan / gaji';
      } else if (/bunga|dividen|tabungan|saving|cashback|reksadana/i.test(lower)) {
        cat = findCat('saving', 'income');
        reason = 'Terdeteksi imbal hasil / cashback tabungan';
      }
    } else {
      if (/tabung|saving|darurat|reksadana|bibit|deposito|emas/i.test(lower)) {
        cat = findCat('saving', 'expense');
        reason = 'Terdeteksi alokasi tabungan / investasi (Saving)';
      } else if (/kopi|coffee|starbucks|fore|kenangan|makan|nasi|padang|warung|resto|indomaret|alfamart|supermarket|grocery|groceries|snack|gofood|grabfood/i.test(lower)) {
        cat = findCat('makan', 'expense');
        reason = 'Terdeteksi merchant makanan, kafe, atau belanja harian';
      } else if (/bensin|spbu|pertamina|shell|pertamax|gojek|grab|parkir|tol|kereta|mrt|transjakarta/i.test(lower)) {
        cat = findCat('transport', 'expense');
        reason = 'Terdeteksi biaya bahan bakar atau transportasi';
      } else if (/listrik|pln|token|air|pdam|internet|wifi|biznet|indihome|pulsa|telkomsel|bpjs/i.test(lower)) {
        cat = findCat('tagihan', 'expense');
        reason = 'Terdeteksi pembayaran tagihan rutin & utilitas';
      } else if (/netflix|spotify|bioskop|xxi|game|steam|hiburan|youtube/i.test(lower)) {
        cat = findCat('hiburan', 'expense');
        reason = 'Terdeteksi langganan streaming atau hiburan';
      } else if (/uniqlo|baju|sepatu|tokopedia|shopee|lazada|belanja|skincare/i.test(lower)) {
        cat = findCat('belanja', 'expense');
        reason = 'Terdeteksi transaksi belanja pribadi / e-commerce';
      }
    }

    if (cat && cat.subcategories.length > 0) {
      const subMatch = cat.subcategories.find((s) =>
        lower.includes(s.name.toLowerCase().split(' ')[0])
      );
      const chosenSub = subMatch || cat.subcategories[0];
      subId = chosenSub.id;
      subName = chosenSub.name;
    }

    items.push({
      id: generateId('plot'),
      selected: true,
      date,
      amount,
      type,
      notes: cleanedNotes,
      channel,
      categoryId: cat?.id || 'cat-other',
      categoryName: cat?.name || 'Lain-lain',
      subcategoryId: subId,
      subcategoryName: subName,
      reason,
    });
  }

  return items;
}

import {
  TransactionType,
  WeekKey,
  WeeklyDateRanges,
} from '../types/finance';

export function formatNumberID(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('id-ID');
}

export function formatThousandDigits(raw: string | number): string {
  const str = typeof raw === 'number' ? String(Math.trunc(raw)) : raw;
  const isNegative = str.trim().startsWith('-');
  const digits = str.replace(/[^\d]/g, '');
  if (!digits) return isNegative ? '-' : '';
  const cleaned = digits.replace(/^0+(?=\d)/, '');
  const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-${formatted}` : formatted;
}

export function parseThousandDigits(raw: string): number {
  const trimmed = raw.trim();
  const isNegative = trimmed.startsWith('-');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const num = Number(digits);
  return isNegative ? -num : num;
}

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
      return `${sign}$${(converted / 1000).toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}k`;
    }
    return `${sign}$${converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (options?.compact && abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    return `${sign}${millions.toLocaleString('id-ID', {
      maximumFractionDigits: 1,
    })} jt`;
  }
  if (options?.compact && abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000).toLocaleString('id-ID')} rb`;
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
    /lh3\.google(?:usercontent)?\.com\/d\/([a-zA-Z0-9_-]{10,})/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      const fileId = match[1];
      return {
        fileId,
        directUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
        fallbackUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w512`,
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

export function getImageCandidateUrls(sources: {
  fileId?: string;
  rawUrl?: string;
  directUrl?: string;
  fallbackUrl?: string;
  imageUrl?: string;
}): string[] {
  const seen = new Set<string>();
  const addUrl = (url?: string) => {
    const cleaned = (url || '').trim();
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
    }
  };

  let detectedFileId = (sources.fileId || '').trim();
  if (!detectedFileId) {
    for (const candidate of [
      sources.rawUrl,
      sources.directUrl,
      sources.fallbackUrl,
      sources.imageUrl,
    ]) {
      if (candidate) {
        const parsed = parseGoogleDriveUrl(candidate);
        if (parsed.isValidDrive && parsed.fileId) {
          detectedFileId = parsed.fileId;
          break;
        }
      }
    }
  }

  if (detectedFileId) {
    addUrl(`https://lh3.googleusercontent.com/d/${detectedFileId}`);
    addUrl(`https://drive.google.com/thumbnail?id=${detectedFileId}&sz=w512`);
    addUrl(`https://drive.google.com/uc?export=view&id=${detectedFileId}`);
  }

  addUrl(sources.directUrl);
  addUrl(sources.fallbackUrl);
  addUrl(sources.imageUrl);

  return Array.from(seen);
}

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

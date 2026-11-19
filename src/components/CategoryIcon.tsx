import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Car,
  Coffee,
  Film,
  Gift,
  Heart,
  Home,
  Layers,
  PiggyBank,
  Plane,
  ShoppingBag,
  Smartphone,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react';
import { Category, DriveImageItem } from '../types/finance';
import { getImageCandidateUrls } from '../utils/formatters';

export const CATEGORY_ICON_OPTIONS = [
  { key: 'Utensils', label: 'Makanan' },
  { key: 'Coffee', label: 'Kopi & Kafe' },
  { key: 'Car', label: 'Transportasi' },
  { key: 'Zap', label: 'Tagihan' },
  { key: 'Film', label: 'Hiburan' },
  { key: 'ShoppingBag', label: 'Belanja' },
  { key: 'Briefcase', label: 'Gaji & Kerja' },
  { key: 'PiggyBank', label: 'Tabungan' },
  { key: 'Home', label: 'Rumah' },
  { key: 'Heart', label: 'Kesehatan' },
  { key: 'Smartphone', label: 'Gadget & Pulsa' },
  { key: 'BookOpen', label: 'Edukasi' },
  { key: 'Plane', label: 'Perjalanan' },
  { key: 'Gift', label: 'Hadiah' },
  { key: 'Wallet', label: 'Dompet' },
  { key: 'Layers', label: 'Lainnya' },
] as const;

export function renderLucideCategoryIcon(iconName: string, className = 'w-4 h-4') {
  switch (iconName) {
    case 'Utensils':
      return <Utensils className={className} />;
    case 'Coffee':
      return <Coffee className={className} />;
    case 'Car':
      return <Car className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Film':
      return <Film className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'PiggyBank':
      return <PiggyBank className={className} />;
    case 'Home':
      return <Home className={className} />;
    case 'Heart':
      return <Heart className={className} />;
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Plane':
      return <Plane className={className} />;
    case 'Gift':
      return <Gift className={className} />;
    case 'Wallet':
      return <Wallet className={className} />;
    default:
      return <Layers className={className} />;
  }
}

interface CategoryIconProps {
  category?: Category;
  gallery?: DriveImageItem[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card-bleed';
  bleedOffsetClass?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  gallery = [],
  size = 'md',
  variant = 'default',
  bleedOffsetClass = '-ml-3',
}) => {
  const sizeClass =
    size === 'xs'
      ? 'w-6 h-6'
      : size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
      ? 'w-11 h-11'
      : 'w-10 h-10';

  const iconSize =
    size === 'xs'
      ? 'w-3 h-3'
      : size === 'sm'
      ? 'w-3.5 h-3.5'
      : size === 'lg'
      ? 'w-5 h-5'
      : 'w-4 h-4';

  const linkedDrive = category?.driveItemId
    ? gallery.find((g) => g.id === category.driveItemId)
    : undefined;

  const candidateUrls = useMemo(
    () =>
      getImageCandidateUrls({
        fileId: linkedDrive?.fileId,
        rawUrl: linkedDrive?.rawUrl,
        directUrl: linkedDrive?.directUrl,
        fallbackUrl: linkedDrive?.fallbackUrl,
        imageUrl: category?.imageUrl,
      }),
    [
      linkedDrive?.fileId,
      linkedDrive?.rawUrl,
      linkedDrive?.directUrl,
      linkedDrive?.fallbackUrl,
      category?.imageUrl,
    ]
  );

  const candidatesKey = candidateUrls.join('|');
  const [srcIdx, setSrcIdx] = useState(0);

  useEffect(() => {
    setSrcIdx(0);
  }, [candidatesKey]);

  const activeImageUrl = candidateUrls[srcIdx] || '';
  const color = category?.color || '#64748B';

  const isCardBleed = variant === 'card-bleed';

  if (activeImageUrl) {
    return (
      <div
        className={
          isCardBleed
            ? `w-[52px] sm:w-14 self-stretch shrink-0 ${bleedOffsetClass} bg-transparent flex items-center justify-center overflow-visible`
            : `${sizeClass} shrink-0 bg-transparent flex items-center justify-center`
        }
      >
        <img
          src={activeImageUrl}
          alt={category?.name || 'Ikon kategori'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain bg-transparent"
          onError={() => setSrcIdx((prev) => prev + 1)}
        />
      </div>
    );
  }

  return (
    <div
      className={
        isCardBleed
          ? `w-[52px] sm:w-14 self-stretch shrink-0 ${bleedOffsetClass} rounded-xl flex items-center justify-center text-white font-semibold shadow-xs`
          : `${sizeClass} rounded-full shrink-0 flex items-center justify-center text-white font-semibold shadow-xs`
      }
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {renderLucideCategoryIcon(
        category?.icon || 'Layers',
        isCardBleed ? 'w-5 h-5' : iconSize
      )}
    </div>
  );
};

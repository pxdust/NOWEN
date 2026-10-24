import type { BookmarkIconTier } from './bookmarkPresentation'

export type CardViewMode = 'compact' | 'standard' | 'comfortable'

/** 与首页书签网格断点一致。宽度用视口，Tailwind 断点也按视口计算。 */
/**
 * 图标网格密度。迷你更密，大更疏。
 * 适中档沿用极简模式原来的列数，避免两套图标看起来不一样。
 */
export const ICON_TIER_GRID_CLASS: Record<BookmarkIconTier, string> = {
  mini: 'grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-[repeat(14,minmax(0,1fr))] 2xl:grid-cols-[repeat(16,minmax(0,1fr))] gap-x-1 gap-y-2.5 items-start',
  medium: 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-x-2 gap-y-4 items-start',
  large: 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-5 items-start',
}

/** 适中档。旧的极简网格类名继续指向它。 */
export const ICON_GRID_CLASS = ICON_TIER_GRID_CLASS.medium

export function columnsForIconTier(tier: BookmarkIconTier, width: number): number {
  if (tier === 'mini') {
    if (width >= 1536) return 16
    if (width >= 1280) return 14
    if (width >= 1024) return 12
    if (width >= 768) return 10
    if (width >= 640) return 8
    return 5
  }
  if (tier === 'large') {
    if (width >= 1536) return 10
    if (width >= 1280) return 8
    if (width >= 1024) return 7
    if (width >= 768) return 6
    if (width >= 640) return 4
    return 3
  }
  if (width >= 1280) return 12
  if (width >= 1024) return 10
  if (width >= 768) return 8
  if (width >= 640) return 6
  return 4
}

/** 图标网格一次大约补 3 行。 */
export function loadMoreIconStep(tier: BookmarkIconTier, width: number): number {
  return columnsForIconTier(tier, width) * 3
}

export const VIEW_MODE_GRID_CLASS: Record<CardViewMode, string> = {
  compact: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3',
  standard: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4',
  comfortable: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5',
}

export function columnsForViewMode(mode: CardViewMode, width: number): number {
  if (mode === 'compact') {
    if (width >= 1280) return 6
    if (width >= 1024) return 5
    if (width >= 768) return 4
    if (width >= 640) return 3
    return 2
  }
  if (mode === 'comfortable') {
    if (width >= 1280) return 4
    if (width >= 1024) return 3
    if (width >= 640) return 2
    return 1
  }
  if (width >= 1536) return 6
  if (width >= 1280) return 5
  if (width >= 768) return 4
  if (width >= 640) return 3
  return 2
}

/** 加载更多一次大约补 3 行，而不是固定 +100。 */
export function loadMoreStep(mode: CardViewMode, width: number): number {
  return columnsForViewMode(mode, width) * 3
}

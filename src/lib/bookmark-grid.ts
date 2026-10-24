export type CardViewMode = 'compact' | 'standard' | 'comfortable'

/** 与首页书签网格断点一致。宽度用视口，Tailwind 断点也按视口计算。 */
/** 极简模式：一格一个网站图标，不沿用方形卡片的列宽。 */
export const ICON_GRID_CLASS = 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-x-2 gap-y-4'

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

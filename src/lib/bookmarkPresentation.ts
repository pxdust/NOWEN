/** 书签图标网格的密度。只记在本机，不写入站点设置。 */
export type BookmarkIconTier = 'mini' | 'medium' | 'large'

/** 图标网格是默认。详细卡片仍可切回，沿用原来的紧凑/标准/宽松。 */
export type BookmarkLayout = 'icons' | 'cards'

export const BOOKMARK_ICON_TIERS: BookmarkIconTier[] = ['mini', 'medium', 'large']

export const BOOKMARK_ICON_TIER_KEY = 'nowen-bookmark-icon-tier'
export const BOOKMARK_LAYOUT_KEY = 'nowen-bookmark-layout'

/** 同一标签页内同步多个 useBookmarkPresentation（storage 事件只跨标签页）。 */
export const BOOKMARK_ICON_TIER_CHANGE_EVENT = 'nowen-bookmark-icon-tier-change'
export const BOOKMARK_LAYOUT_CHANGE_EVENT = 'nowen-bookmark-layout-change'

export const DEFAULT_BOOKMARK_ICON_TIER: BookmarkIconTier = 'medium'
export const DEFAULT_BOOKMARK_LAYOUT: BookmarkLayout = 'icons'

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function isBookmarkIconTier(value: unknown): value is BookmarkIconTier {
  return value === 'mini' || value === 'medium' || value === 'large'
}

export function isBookmarkLayout(value: unknown): value is BookmarkLayout {
  return value === 'icons' || value === 'cards'
}

export function readBookmarkIconTier(
  storage: Pick<Storage, 'getItem'> | null = browserStorage(),
): BookmarkIconTier {
  if (!storage) return DEFAULT_BOOKMARK_ICON_TIER
  try {
    const raw = storage.getItem(BOOKMARK_ICON_TIER_KEY)
    return isBookmarkIconTier(raw) ? raw : DEFAULT_BOOKMARK_ICON_TIER
  } catch {
    return DEFAULT_BOOKMARK_ICON_TIER
  }
}

export function writeBookmarkIconTier(
  tier: BookmarkIconTier,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): void {
  if (!storage || !isBookmarkIconTier(tier)) return
  try {
    storage.setItem(BOOKMARK_ICON_TIER_KEY, tier)
  } catch {
    return
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOOKMARK_ICON_TIER_CHANGE_EVENT, { detail: tier }))
  }
}

export function readBookmarkLayout(
  storage: Pick<Storage, 'getItem'> | null = browserStorage(),
): BookmarkLayout {
  if (!storage) return DEFAULT_BOOKMARK_LAYOUT
  try {
    const raw = storage.getItem(BOOKMARK_LAYOUT_KEY)
    return isBookmarkLayout(raw) ? raw : DEFAULT_BOOKMARK_LAYOUT
  } catch {
    return DEFAULT_BOOKMARK_LAYOUT
  }
}

export function writeBookmarkLayout(
  layout: BookmarkLayout,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): void {
  if (!storage || !isBookmarkLayout(layout)) return
  try {
    storage.setItem(BOOKMARK_LAYOUT_KEY, layout)
  } catch {
    return
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOOKMARK_LAYOUT_CHANGE_EVENT, { detail: layout }))
  }
}

import { useCallback, useEffect, useState } from 'react'
import {
  BOOKMARK_ICON_TIER_CHANGE_EVENT,
  BOOKMARK_ICON_TIER_KEY,
  BOOKMARK_LAYOUT_CHANGE_EVENT,
  BOOKMARK_LAYOUT_KEY,
  type BookmarkIconTier,
  type BookmarkLayout,
  isBookmarkIconTier,
  isBookmarkLayout,
  readBookmarkIconTier,
  readBookmarkLayout,
  writeBookmarkIconTier,
  writeBookmarkLayout,
} from '../lib/bookmarkPresentation'

export function useBookmarkPresentation() {
  const [tier, setTierState] = useState<BookmarkIconTier>(() => readBookmarkIconTier())
  const [layout, setLayoutState] = useState<BookmarkLayout>(() => readBookmarkLayout())

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === BOOKMARK_ICON_TIER_KEY) setTierState(readBookmarkIconTier())
      if (event.key === BOOKMARK_LAYOUT_KEY) setLayoutState(readBookmarkLayout())
    }
    const syncTier = (event: Event) => {
      const detail = (event as CustomEvent<BookmarkIconTier>).detail
      setTierState(isBookmarkIconTier(detail) ? detail : readBookmarkIconTier())
    }
    const syncLayout = (event: Event) => {
      const detail = (event as CustomEvent<BookmarkLayout>).detail
      setLayoutState(isBookmarkLayout(detail) ? detail : readBookmarkLayout())
    }
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener(BOOKMARK_ICON_TIER_CHANGE_EVENT, syncTier)
    window.addEventListener(BOOKMARK_LAYOUT_CHANGE_EVENT, syncLayout)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener(BOOKMARK_ICON_TIER_CHANGE_EVENT, syncTier)
      window.removeEventListener(BOOKMARK_LAYOUT_CHANGE_EVENT, syncLayout)
    }
  }, [])

  const setTier = useCallback((next: BookmarkIconTier) => {
    writeBookmarkIconTier(next)
    setTierState(next)
  }, [])

  const setLayout = useCallback((next: BookmarkLayout) => {
    writeBookmarkLayout(next)
    setLayoutState(next)
  }, [])

  return { tier, layout, setTier, setLayout }
}

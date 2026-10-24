import { describe, expect, it, vi } from 'vitest'
import {
  BOOKMARK_ICON_TIER_KEY,
  BOOKMARK_LAYOUT_KEY,
  readBookmarkIconTier,
  readBookmarkLayout,
  writeBookmarkIconTier,
  writeBookmarkLayout,
} from '../bookmarkPresentation'

function memoryStorage(initial?: Record<string, string>) {
  const data = new Map(Object.entries(initial ?? {}))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    dump: () => data,
  }
}

describe('bookmark icon presentation', () => {
  it('defaults to the icon grid at medium and ignores unknown values', () => {
    const storage = memoryStorage()
    expect(readBookmarkLayout(storage)).toBe('icons')
    expect(readBookmarkIconTier(storage)).toBe('medium')

    storage.setItem(BOOKMARK_LAYOUT_KEY, 'list')
    storage.setItem(BOOKMARK_ICON_TIER_KEY, 'huge')
    expect(readBookmarkLayout(storage)).toBe('icons')
    expect(readBookmarkIconTier(storage)).toBe('medium')
  })

  it('round-trips layout and tier on the local preference keys', () => {
    const storage = memoryStorage()
    writeBookmarkLayout('cards', storage)
    writeBookmarkIconTier('mini', storage)
    expect(storage.dump().get(BOOKMARK_LAYOUT_KEY)).toBe('cards')
    expect(storage.dump().get(BOOKMARK_ICON_TIER_KEY)).toBe('mini')
    expect(readBookmarkLayout(storage)).toBe('cards')
    expect(readBookmarkIconTier(storage)).toBe('mini')

    writeBookmarkIconTier('large', storage)
    expect(readBookmarkIconTier(storage)).toBe('large')
  })

  it('notifies the current tab when the tier changes', () => {
    const listener = vi.fn()
    window.addEventListener('nowen-bookmark-icon-tier-change', listener)
    writeBookmarkIconTier('large', memoryStorage())
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('nowen-bookmark-icon-tier-change', listener)
  })
})

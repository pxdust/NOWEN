/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../lib/i18n'
import {
  BOOKMARK_ICON_TIER_KEY,
  BOOKMARK_LAYOUT_KEY,
} from '../../../lib/bookmarkPresentation'
import { BookmarkPresentationSettings } from '../BookmarkPresentationSettings'

afterEach(() => {
  cleanup()
})

describe('BookmarkPresentationSettings', () => {
  it('writes the existing local keys and forwards card density', () => {
    const store = new Map<string, string>()
    const storage = window.localStorage
    const originalGet = storage.getItem
    const originalSet = storage.setItem
    storage.getItem = ((key: string) => store.get(key) ?? null) as Storage['getItem']
    storage.setItem = ((key: string, value: string) => {
      store.set(key, value)
    }) as Storage['setItem']
    const onCardViewModeChange = vi.fn()

    try {
      const { rerender } = render(
        <BookmarkPresentationSettings
          cardViewMode="standard"
          onCardViewModeChange={onCardViewModeChange}
        />,
      )

      expect(screen.getByTestId('bookmark-presentation-settings')).toBeTruthy()
      expect(screen.getByTestId('bookmark-presentation')).toHaveAttribute('data-layout', 'icons')

      fireEvent.click(screen.getByRole('button', { name: '迷你' }))
      expect(store.get(BOOKMARK_ICON_TIER_KEY)).toBe('mini')

      fireEvent.click(screen.getByRole('button', { name: '详细卡片' }))
      expect(store.get(BOOKMARK_LAYOUT_KEY)).toBe('cards')

      rerender(
        <BookmarkPresentationSettings
          cardViewMode="standard"
          onCardViewModeChange={onCardViewModeChange}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: '宽松视图' }))
      expect(onCardViewModeChange).toHaveBeenCalledWith('comfortable')
    } finally {
      storage.getItem = originalGet
      storage.setItem = originalSet
    }
  })
})

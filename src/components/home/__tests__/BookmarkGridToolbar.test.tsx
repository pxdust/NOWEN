/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../lib/i18n'
import { BookmarkGridToolbar } from '../BookmarkGridToolbar'

afterEach(() => {
  cleanup()
})

describe('BookmarkGridToolbar', () => {
  it('switches icon tiers and can fall back to detail cards', () => {
    const onTierChange = vi.fn()
    const onLayoutChange = vi.fn()
    const onCardViewModeChange = vi.fn()
    const { rerender } = render(
      <BookmarkGridToolbar
        layout="icons"
        tier="medium"
        onLayoutChange={onLayoutChange}
        onTierChange={onTierChange}
        onCardViewModeChange={onCardViewModeChange}
      />,
    )

    const bar = screen.getByTestId('bookmark-presentation')
    expect(bar).toHaveAttribute('data-layout', 'icons')
    expect(bar).toHaveAttribute('data-tier', 'medium')

    fireEvent.click(screen.getByRole('button', { name: '迷你' }))
    expect(onTierChange).toHaveBeenCalledWith('mini')

    fireEvent.click(screen.getByRole('button', { name: '详细卡片' }))
    expect(onLayoutChange).toHaveBeenCalledWith('cards')

    rerender(
      <BookmarkGridToolbar
        layout="cards"
        tier="medium"
        cardViewMode="standard"
        onLayoutChange={onLayoutChange}
        onTierChange={onTierChange}
        onCardViewModeChange={onCardViewModeChange}
      />,
    )
    expect(screen.getByTestId('bookmark-presentation')).toHaveAttribute('data-layout', 'cards')
    fireEvent.click(screen.getByRole('button', { name: '宽松视图' }))
    expect(onCardViewModeChange).toHaveBeenCalledWith('comfortable')
    expect(screen.queryByRole('button', { name: '迷你' })).toBeNull()
  })

  it('hides the card layout while minimal mode forces icons', () => {
    render(
      <BookmarkGridToolbar
        layout="cards"
        tier="large"
        allowCards={false}
        onLayoutChange={() => undefined}
        onTierChange={() => undefined}
      />,
    )
    expect(screen.getByTestId('bookmark-presentation')).toHaveAttribute('data-layout', 'icons')
    expect(screen.queryByRole('button', { name: '详细卡片' })).toBeNull()
    expect(screen.getByRole('button', { name: '大' })).toHaveAttribute('aria-pressed', 'true')
  })
})
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BookmarkIconButton } from '../BookmarkIconButton'
import type { Bookmark } from '../../../types/bookmark'

vi.mock('../../../lib/api', () => ({
  visitsApi: { track: vi.fn().mockResolvedValue(undefined) },
}))

const bookmark: Bookmark = {
  id: 'gh',
  url: 'https://github.com',
  title: 'GitHub',
  description: '代码托管，极简模式不该显示这段',
  icon: 'github',
  category: 'dev',
  tags: ['code'],
  orderIndex: 0,
  isPinned: false,
  isReadLater: false,
  isRead: false,
  createdAt: 0,
  updatedAt: 0,
  visibility: 'public',
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('BookmarkIconButton', () => {
  it('shows the site icon label and hides the card description', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(
      <BookmarkIconButton
        bookmark={bookmark}
        isInternal={false}
        onContextMenu={() => undefined}
      />,
    )

    const button = screen.getByTestId('bookmark-icon')
    expect(button).toHaveTextContent('GitHub')
    expect(button).not.toHaveTextContent('代码托管')
    expect(button.querySelector('svg, img')).toBeTruthy()

    fireEvent.click(button)
    expect(open).toHaveBeenCalledWith('https://github.com', '_blank', 'noopener,noreferrer')

    const description = screen.getByTestId('bookmark-description')
    expect(description).toHaveTextContent('代码托管')
    expect(description.className).toContain('hidden')
    expect(screen.getByTestId('bookmark-icon-frame').className).toContain('rounded-none')
    expect(screen.getByTestId('bookmark-icon-frame').className).toContain('h-14')
  })

  it('scales the shared tile for mini and large, and prefers a custom icon url', () => {
    const { rerender } = render(
      <BookmarkIconButton
        bookmark={{ ...bookmark, iconUrl: 'https://cdn.example/icon.png', favicon: 'https://cdn.example/favicon.ico' }}
        isInternal={false}
        tier="mini"
        onContextMenu={() => undefined}
      />,
    )

    const frame = screen.getByTestId('bookmark-icon-frame')
    expect(screen.getByTestId('bookmark-icon')).toHaveAttribute('data-tier', 'mini')
    expect(frame.className).toContain('h-10')
    expect(frame.className).toContain('rounded-none')
    expect(frame.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/icon.png')

    rerender(
      <BookmarkIconButton
        bookmark={bookmark}
        isInternal={false}
        tier="large"
        onContextMenu={() => undefined}
      />,
    )
    expect(screen.getByTestId('bookmark-icon-frame').className).toContain('h-[4.75rem]')
    expect(screen.getByTestId('bookmark-icon')).toHaveTextContent('GitHub')
    expect(screen.getByTestId('bookmark-icon')).not.toHaveTextContent('代码托管')
  })

  it('opens on middle click', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(
      <BookmarkIconButton
        bookmark={bookmark}
        isInternal={false}
        onContextMenu={() => undefined}
      />,
    )
    fireEvent(screen.getByTestId('bookmark-icon'), new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }))
    expect(open).toHaveBeenCalledWith('https://github.com', '_blank', 'noopener,noreferrer')
  })
})

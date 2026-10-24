/** @vitest-environment jsdom */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

    expect(screen.queryByTestId('bookmark-description')).not.toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(button).not.toHaveAttribute('title')
    expect(button.className).toContain('gap-1')
    expect(button.className).not.toContain('gap-2')
    const frame = screen.getByTestId('bookmark-icon-frame')
    expect(frame).toHaveAttribute('data-icon-surface', 'plain')
    expect(frame.style.background).toBe('')
    expect(frame.style.border).toBe('')
    expect(frame.className).toContain('h-8')
    expect(frame.className).toContain('w-14')
    expect(frame.querySelector('.bookmark-icon-glyph')).toBeTruthy()

    fireEvent.mouseEnter(button)
    fireEvent.focus(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(screen.queryByText('代码托管，极简模式不该显示这段')).not.toBeInTheDocument()

    const hit = button.parentElement
    expect(hit).toHaveClass('bookmark-icon-hit')
    expect(hit?.className.split(/\s+/) ?? []).not.toContain('group')
  })

  it('lifts only the hovered icon, not every icon inside a parent group', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).not.toMatch(/\.group:hover \.bookmark-icon-glyph/)
    expect(css).not.toMatch(/\.group:focus-within \.bookmark-icon-glyph/)
    expect(css).not.toMatch(/\.group:hover \.bookmark-icon-stage/)
    expect(css).toContain('.bookmark-icon-hit:hover .bookmark-icon-glyph')
    expect(css).toContain('.bookmark-icon-hit:focus-within .bookmark-icon-glyph')
    expect(css).toContain('.bookmark-icon-hit:hover .bookmark-icon-stage::after')
    expect(css).toContain('.bookmark-icon-hit:focus-within .bookmark-icon-stage::after')

    render(
      <div className="group">
        <BookmarkIconButton bookmark={bookmark} isInternal={false} onContextMenu={() => undefined} />
        <BookmarkIconButton
          bookmark={{ ...bookmark, id: 'gl', title: 'GitLab', url: 'https://gitlab.com' }}
          isInternal={false}
          onContextMenu={() => undefined}
        />
      </div>,
    )

    const hits = document.querySelectorAll('.bookmark-icon-hit')
    expect(hits).toHaveLength(2)
    for (const hit of hits) {
      expect(hit.className.split(/\s+/)).not.toContain('group')
      expect(hit.querySelector('.bookmark-icon-glyph')).toBeTruthy()
    }
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
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
    expect(screen.getByTestId('bookmark-icon').className).toContain('gap-1')
    expect(frame.className).toContain('h-6')
    expect(frame.className).toContain('w-10')
    expect(frame).toHaveAttribute('data-icon-surface', 'plain')
    expect(frame.style.background).toBe('')
    expect(frame.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/icon.png')
    expect(frame.querySelector('.bookmark-icon-glyph')).toBeTruthy()

    rerender(
      <BookmarkIconButton
        bookmark={bookmark}
        isInternal={false}
        tier="large"
        onContextMenu={() => undefined}
      />,
    )
    expect(screen.getByTestId('bookmark-icon-frame').className).toContain('h-11')
    expect(screen.getByTestId('bookmark-icon-frame').className).toContain('w-[4.75rem]')
    expect(screen.getByTestId('bookmark-icon').className).toContain('gap-1.5')
    expect(screen.getByTestId('bookmark-icon')).toHaveTextContent('GitHub')
    expect(screen.getByTestId('bookmark-icon')).not.toHaveTextContent('代码托管')

    rerender(
      <BookmarkIconButton
        bookmark={bookmark}
        isInternal={false}
        onWallpaper
        onContextMenu={() => undefined}
      />,
    )
    const wallpaperFrame = screen.getByTestId('bookmark-icon-frame')
    expect(wallpaperFrame.style.background).toBe('')
    expect(wallpaperFrame.style.border).toBe('')
    expect(wallpaperFrame.querySelector('.bookmark-icon-glyph')).toBeTruthy()
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

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
  })
})

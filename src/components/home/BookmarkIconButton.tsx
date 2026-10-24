import { ExternalLink, Lock } from 'lucide-react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { visitsApi } from '../../lib/api'
import { getBookmarkUrl } from '../../hooks/useNetworkEnv'
import type { BookmarkIconTier } from '../../lib/bookmarkPresentation'
import { cn } from '../../lib/utils'
import { IconRenderer } from '../IconRenderer'
import type { Bookmark } from '../../types/bookmark'

interface BookmarkIconButtonProps {
  bookmark: Bookmark
  isInternal: boolean
  onContextMenu: (event: MouseEvent, bookmark: Bookmark) => void
  /** 壁纸上给标题补一层阴影，图标本身保持清楚 */
  onWallpaper?: boolean
  /** 迷你 / 适中 / 大。缺省适中，和极简模式原来的尺寸一致。 */
  tier?: BookmarkIconTier
}

/** 三档共用同一颗图标，不再铺磁贴底。极简模式和普通图标网格都走这里。 */
export const BOOKMARK_ICON_TIER_CLASS: Record<BookmarkIconTier, {
  frame: string
  glyph: string
  fallback: string
  label: string
  button: string
}> = {
  mini: {
    frame: 'h-10 w-10',
    glyph: 'h-6 w-6',
    fallback: 'h-5 w-5',
    label: 'text-[11px] leading-tight line-clamp-1',
    button: 'gap-1 px-0.5 py-1',
  },
  medium: {
    frame: 'h-14 w-14',
    glyph: 'h-8 w-8',
    fallback: 'h-7 w-7',
    label: 'text-xs leading-tight line-clamp-2',
    button: 'gap-2 px-1 py-1.5',
  },
  large: {
    frame: 'h-[4.75rem] w-[4.75rem]',
    glyph: 'h-11 w-11',
    fallback: 'h-9 w-9',
    label: 'text-sm leading-snug line-clamp-2',
    button: 'gap-2.5 px-1.5 py-2',
  },
}

/**
 * 书签图标磁贴：只显示图标和名称。描述留在悬停提示里。
 * 极简模式和普通首页图标网格都用这一颗。
 */
export function BookmarkIconButton({
  bookmark,
  isInternal,
  onContextMenu,
  onWallpaper = false,
  tier = 'medium',
}: BookmarkIconButtonProps) {
  const metric = BOOKMARK_ICON_TIER_CLASS[tier]
  const open = () => {
    visitsApi.track(bookmark.id).catch(() => undefined)
    window.open(getBookmarkUrl(bookmark, isInternal), '_blank', 'noopener,noreferrer')
  }

  const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button === 1) event.preventDefault()
  }

  const onAuxClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 1) return
    event.preventDefault()
    open()
    try {
      window.focus()
    } catch {
      // 某些 WebView 不允许脚本主动聚焦，打开行为本身仍然有效。
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    open()
  }

  return (
    <div className="group relative h-full w-full">
      {/* 用 div 而不是 button，避免和拖拽排序抢指针（dnd 外层已经是可拖拽节点）。 */}
      <div
        role="button"
        tabIndex={0}
        data-testid="bookmark-icon"
        data-tier={tier}
        title={bookmark.title}
        aria-label={bookmark.title}
        onClick={open}
        onKeyDown={onKeyDown}
        onMouseDown={onMouseDown}
        onAuxClick={onAuxClick}
        onContextMenu={(event) => onContextMenu(event, bookmark)}
        className={cn(
          'flex h-full w-full cursor-pointer select-none flex-col items-center rounded-none text-center',
          metric.button,
        )}
      >
        <span
          data-testid="bookmark-icon-frame"
          data-icon-surface="plain"
          className={cn(
            'relative flex items-center justify-center bg-transparent',
            metric.frame,
          )}
        >
          <span className="bookmark-icon-stage">
            <span className="bookmark-icon-glyph inline-flex leading-none">
              <SiteIcon bookmark={bookmark} glyphClass={metric.glyph} fallbackClass={metric.fallback} />
            </span>
          </span>
          {bookmark.visibility === 'private' && (
            <span
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full"
              style={{ background: 'rgba(245, 158, 11, 0.9)' }}
            >
              <Lock className="h-2.5 w-2.5 text-white" />
            </span>
          )}
        </span>
        <span
          className={cn('w-full', metric.label)}
          style={{
            color: onWallpaper ? 'rgba(255,255,255,0.92)' : 'var(--color-text-primary)',
            textShadow: onWallpaper ? '0 1px 6px rgba(0,0,0,0.75)' : undefined,
          }}
        >
          {bookmark.title}
        </span>
      </div>
      {bookmark.description ? (
        <span
          data-testid="bookmark-description"
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-max max-w-[14rem] -translate-x-1/2 rounded-none px-2 py-1 text-left text-[11px] leading-snug group-hover:block"
          style={{
            background: onWallpaper ? 'rgba(0,0,0,0.78)' : 'var(--color-bg-secondary)',
            color: onWallpaper ? 'rgba(255,255,255,0.92)' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-glass-border)',
          }}
        >
          {bookmark.description}
        </span>
      ) : null}
    </div>
  )
}

function SiteIcon({
  bookmark,
  glyphClass,
  fallbackClass,
}: {
  bookmark: Bookmark
  glyphClass: string
  fallbackClass: string
}) {
  const frame: CSSProperties = { color: 'var(--color-primary)' }
  if (bookmark.iconUrl) {
    return (
      <img
        src={bookmark.iconUrl}
        alt=""
        className={cn(glyphClass, 'object-contain')}
        loading="lazy"
        onError={(event) => {
          const img = event.target as HTMLImageElement
          if (bookmark.favicon && img.src !== bookmark.favicon) {
            img.src = bookmark.favicon
            return
          }
          img.style.display = 'none'
        }}
      />
    )
  }
  if (bookmark.icon) {
    return <IconRenderer icon={bookmark.icon} className={glyphClass} style={frame} />
  }
  if (bookmark.favicon) {
    return (
      <img
        src={bookmark.favicon}
        alt=""
        className={cn(glyphClass, 'object-contain')}
        loading="lazy"
        onError={(event) => {
          (event.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  return <ExternalLink className={fallbackClass} style={{ color: 'var(--color-text-muted)' }} />
}

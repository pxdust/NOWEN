import { ExternalLink, Lock } from 'lucide-react'
import type { CSSProperties, MouseEvent } from 'react'
import { visitsApi } from '../../lib/api'
import { getBookmarkUrl } from '../../hooks/useNetworkEnv'
import { IconRenderer } from '../IconRenderer'
import type { Bookmark } from '../../types/bookmark'

interface BookmarkIconButtonProps {
  bookmark: Bookmark
  isInternal: boolean
  onContextMenu: (event: MouseEvent, bookmark: Bookmark) => void
  /** 壁纸上给标题补一层阴影，图标本身保持清楚 */
  onWallpaper?: boolean
}

/**
 * 极简模式的书签：只显示图标和名称，不铺描述、标签和整张卡片。
 */
export function BookmarkIconButton({
  bookmark,
  isInternal,
  onContextMenu,
  onWallpaper = false,
}: BookmarkIconButtonProps) {
  const open = () => {
    visitsApi.track(bookmark.id).catch(() => undefined)
    window.open(getBookmarkUrl(bookmark, isInternal), '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      type="button"
      data-testid="bookmark-icon"
      title={bookmark.title}
      onClick={open}
      onContextMenu={(event) => onContextMenu(event, bookmark)}
      className="group flex w-full flex-col items-center gap-2 rounded-xl px-1 py-1.5 text-center"
    >
      <span
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
        style={{
          background: onWallpaper ? 'rgba(255,255,255,0.16)' : 'var(--color-glass)',
          border: onWallpaper ? '1px solid rgba(255,255,255,0.28)' : '1px solid var(--color-glass-border)',
          boxShadow: onWallpaper ? '0 8px 24px rgba(0,0,0,0.28)' : undefined,
        }}
      >
        <SiteIcon bookmark={bookmark} />
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
        className="line-clamp-2 w-full text-xs leading-tight"
        style={{
          color: onWallpaper ? 'rgba(255,255,255,0.92)' : 'var(--color-text-primary)',
          textShadow: onWallpaper ? '0 1px 6px rgba(0,0,0,0.75)' : undefined,
        }}
      >
        {bookmark.title}
      </span>
    </button>
  )
}

function SiteIcon({ bookmark }: { bookmark: Bookmark }) {
  const frame: CSSProperties = { color: 'var(--color-primary)' }
  if (bookmark.iconUrl) {
    return (
      <img
        src={bookmark.iconUrl}
        alt=""
        className="h-8 w-8 object-contain"
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
    return <IconRenderer icon={bookmark.icon} className="h-8 w-8" style={frame} />
  }
  if (bookmark.favicon) {
    return (
      <img
        src={bookmark.favicon}
        alt=""
        className="h-8 w-8 object-contain"
        loading="lazy"
        onError={(event) => {
          (event.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  return <ExternalLink className="h-7 w-7" style={{ color: 'var(--color-text-muted)' }} />
}

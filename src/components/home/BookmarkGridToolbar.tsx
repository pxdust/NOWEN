import type { ReactNode } from 'react'
import { Grid3X3, LayoutGrid, StretchHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { BookmarkIconTier, BookmarkLayout } from '../../lib/bookmarkPresentation'
import { BOOKMARK_ICON_TIERS } from '../../lib/bookmarkPresentation'
import type { CardViewMode } from '../../lib/bookmark-grid'
import { cn } from '../../lib/utils'

const CARD_MODES: { key: CardViewMode; titleKey: string }[] = [
  { key: 'compact', titleKey: 'bookmark.view_compact' },
  { key: 'standard', titleKey: 'bookmark.view_standard' },
  { key: 'comfortable', titleKey: 'bookmark.view_comfortable' },
]

const TIER_ICONS: Record<BookmarkIconTier, typeof Grid3X3> = {
  mini: Grid3X3,
  medium: LayoutGrid,
  large: StretchHorizontal,
}

interface BookmarkGridToolbarProps {
  layout: BookmarkLayout
  tier: BookmarkIconTier
  /** 极简模式强制图标网格，不提供切回详细卡片。 */
  allowCards?: boolean
  cardViewMode?: CardViewMode
  onLayoutChange: (layout: BookmarkLayout) => void
  onTierChange: (tier: BookmarkIconTier) => void
  onCardViewModeChange?: (mode: CardViewMode) => void
}

export function BookmarkGridToolbar({
  layout,
  tier,
  allowCards = true,
  cardViewMode = 'standard',
  onLayoutChange,
  onTierChange,
  onCardViewModeChange,
}: BookmarkGridToolbarProps) {
  const { t } = useTranslation()
  const showingIcons = !allowCards || layout === 'icons'

  return (
    <div
      role="toolbar"
      aria-label={t('bookmark.presentation')}
      data-testid="bookmark-presentation"
      data-layout={showingIcons ? 'icons' : 'cards'}
      data-tier={tier}
      className="flex flex-wrap items-center gap-2"
    >
      {allowCards && (
        <Segmented>
          <SegmentButton
            active={layout === 'icons'}
            label={t('bookmark.layout_icons')}
            attrs={{ 'data-layout-option': 'icons' }}
            onClick={() => onLayoutChange('icons')}
          />
          <SegmentButton
            active={layout === 'cards'}
            label={t('bookmark.layout_cards')}
            attrs={{ 'data-layout-option': 'cards' }}
            onClick={() => onLayoutChange('cards')}
          />
        </Segmented>
      )}
      {showingIcons ? (
        <Segmented>
          {BOOKMARK_ICON_TIERS.map((item) => (
            <SegmentButton
              key={item}
              active={tier === item}
              label={t(`bookmark.icon_tier_${item}`)}
              attrs={{ 'data-tier-option': item }}
              onClick={() => onTierChange(item)}
            />
          ))}
        </Segmented>
      ) : (
        <Segmented>
          {CARD_MODES.map(({ key, titleKey }) => (
            <SegmentButton
              key={key}
              active={cardViewMode === key}
              label={t(titleKey)}
              attrs={{ 'data-card-mode': key }}
              onClick={() => onCardViewModeChange?.(key)}
            />
          ))}
        </Segmented>
      )}
    </div>
  )
}

export interface BookmarkPresentationMenuItem {
  id: string
  label: string
  icon: ReactNode
  onClick: () => void
  active?: boolean
  divider?: boolean
}

/** 右键菜单里的布局和尺寸。调用方决定是否在选尺寸时切回图标网格。 */
export function buildBookmarkPresentationMenuItems({
  t,
  tier,
  layout,
  showIcons,
  allowCards,
  onTier,
  onLayout,
}: {
  t: TFunction
  tier: BookmarkIconTier
  layout: BookmarkLayout
  showIcons: boolean
  allowCards: boolean
  onTier: (tier: BookmarkIconTier) => void
  onLayout: (layout: BookmarkLayout) => void
}): BookmarkPresentationMenuItem[] {
  const items: BookmarkPresentationMenuItem[] = []
  if (allowCards) {
    items.push({
      id: 'layout-icons',
      label: t('bookmark.layout_icons'),
      icon: <Grid3X3 className="w-4 h-4" />,
      onClick: () => onLayout('icons'),
      active: layout === 'icons',
      divider: true,
    })
    items.push({
      id: 'layout-cards',
      label: t('bookmark.layout_cards'),
      icon: <LayoutGrid className="w-4 h-4" />,
      onClick: () => onLayout('cards'),
      active: layout === 'cards',
    })
  }
  BOOKMARK_ICON_TIERS.forEach((item, index) => {
    const Icon = TIER_ICONS[item]
    items.push({
      id: `icon-tier-${item}`,
      label: t(`bookmark.icon_tier_${item}`),
      icon: <Icon className="w-4 h-4" />,
      onClick: () => onTier(item),
      active: showIcons && tier === item,
      divider: index === 0,
    })
  })
  return items
}

function Segmented({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-none p-0.5"
      style={{ background: 'var(--color-bg-tertiary)' }}
    >
      {children}
    </div>
  )
}

function SegmentButton({
  active,
  label,
  onClick,
  attrs,
}: {
  active: boolean
  label: string
  onClick: () => void
  attrs?: Record<string, string>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        'rounded-none px-2 py-1 text-xs font-medium transition-colors',
        active ? '' : 'hover:bg-white/5',
      )}
      style={{
        background: active ? 'var(--color-glass)' : 'transparent',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
      }}
      {...attrs}
    >
      {label}
    </button>
  )
}

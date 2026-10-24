import { useTranslation } from 'react-i18next'
import { BookmarkGridToolbar } from '../home/BookmarkGridToolbar'
import { useBookmarkPresentation } from '../../hooks/useBookmarkPresentation'
import { useMinimalMode } from '../../hooks/useMinimalMode'
import type { CardViewMode } from '../../lib/bookmark-grid'

interface BookmarkPresentationSettingsProps {
  cardViewMode: CardViewMode
  onCardViewModeChange: (mode: CardViewMode) => void
}

/**
 * 首页书签的布局和尺寸。图标网格 / 详细卡片，以及迷你 / 适中 / 大，
 * 仍写入原来的本机键；详细卡片的密度走站点设置。
 */
export function BookmarkPresentationSettings({
  cardViewMode,
  onCardViewModeChange,
}: BookmarkPresentationSettingsProps) {
  const { t } = useTranslation()
  const { tier, layout, setTier, setLayout } = useBookmarkPresentation()
  const { enabled: minimalMode } = useMinimalMode()

  return (
    <div className="space-y-2" data-testid="bookmark-presentation-settings">
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {t('bookmark.presentation')}
      </p>
      <div
        className="space-y-3 rounded-xl px-4 py-3"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-glass-border)',
        }}
      >
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t('bookmark.presentation_desc')}
        </p>
        <BookmarkGridToolbar
          layout={layout}
          tier={tier}
          cardViewMode={cardViewMode}
          onLayoutChange={setLayout}
          onTierChange={setTier}
          onCardViewModeChange={onCardViewModeChange}
        />
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('bookmark.presentation_persist_hint')}
        </p>
        {minimalMode && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {t('bookmark.presentation_minimal_hint')}
          </p>
        )}
      </div>
    </div>
  )
}

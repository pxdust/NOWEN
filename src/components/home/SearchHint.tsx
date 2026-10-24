import { useTranslation } from 'react-i18next';
import { Search, Command } from 'lucide-react';

interface SearchHintProps {
  onOpenSearch: () => void;
  /** edge 贴在完整首页右上角；stage 是极简模式时钟下的居中胶囊 */
  variant?: 'default' | 'edge' | 'stage';
  /** 壁纸上提高对比，避免搜索条融进背景 */
  onWallpaper?: boolean;
}

export function SearchHint({ onOpenSearch, variant = 'default', onWallpaper = false }: SearchHintProps) {
  const { t } = useTranslation();
  const edge = variant === 'edge';
  const stage = variant === 'stage';

  return (
    <button
      type="button"
      data-testid={stage ? 'hero-search' : undefined}
      onClick={onOpenSearch}
      aria-label={t('search_placeholder')}
      className={
        stage
          ? 'flex w-full max-w-lg items-center gap-3 rounded-full px-5 py-3 text-left text-sm backdrop-blur-xl transition-opacity hover:opacity-90 sm:px-6 sm:py-3.5 sm:text-base'
          : edge
            ? 'flex items-center gap-1.5 rounded-none px-2 py-1.5 text-xs sm:gap-2 sm:px-2.5 sm:text-sm'
            : 'flex w-full items-center gap-2 rounded-none px-3 py-1.5 text-left text-sm sm:w-64'
      }
      style={
        stage
          ? {
              background: onWallpaper ? 'rgba(0, 0, 0, 0.32)' : 'var(--color-glass)',
              border: onWallpaper ? '1px solid rgba(255, 255, 255, 0.28)' : '1px solid var(--color-glass-border)',
              color: onWallpaper ? 'rgba(255, 255, 255, 0.92)' : 'var(--color-text-secondary)',
              boxShadow: onWallpaper ? '0 12px 40px rgba(0, 0, 0, 0.28)' : '0 10px 30px rgba(0, 0, 0, 0.12)',
            }
          : {
              background: 'var(--color-glass)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text-muted)',
            }
      }
    >
      <Search className={stage ? 'h-4 w-4 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />
      <span className={edge ? 'hidden max-w-[8rem] truncate tracking-wide sm:inline' : 'min-w-0 flex-1 truncate tracking-wide'}>
        {t('search_placeholder')}
      </span>
      <kbd
        className={
          stage
            ? 'ml-auto hidden items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] sm:flex'
            : edge
              ? 'hidden items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] md:flex'
              : 'hidden items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] sm:flex'
        }
        style={{
          background: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <Command className="h-3 w-3" />K
      </kbd>
    </button>
  );
}

export default SearchHint;

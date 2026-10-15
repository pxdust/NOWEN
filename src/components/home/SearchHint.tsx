import { useTranslation } from 'react-i18next';
import { Search, Command } from 'lucide-react';

interface SearchHintProps {
  onOpenSearch: () => void;
}

export function SearchHint({ onOpenSearch }: SearchHintProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpenSearch}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm sm:w-64"
      style={{
        background: 'var(--color-glass)',
        border: '1px solid var(--color-glass-border)',
        color: 'var(--color-text-muted)',
      }}
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate tracking-wide">{t('search_placeholder')}</span>
      <kbd
        className="hidden items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] sm:flex"
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

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BookMarked,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Clock,
  X,
} from 'lucide-react';
import { Bookmark } from '../../types/bookmark';
import { visitsApi } from '../../lib/api';
import { useNetworkEnv, getBookmarkUrl } from '../../hooks/useNetworkEnv';

interface ReadLaterSectionProps {
  bookmarks: Bookmark[];
  isLiteMode?: boolean;
  onMarkRead?: (id: string) => void;
  onRemove?: (id: string) => void;
}

// 主 Hero 卡片
function HeroBookmark({ 
  bookmark, 
  totalCount,
  isLiteMode,
  onMarkRead,
  onRemove,
}: { 
  bookmark: Bookmark;
  totalCount: number;
  isLiteMode?: boolean;
  onMarkRead?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { isInternal } = useNetworkEnv();
  const domain = new URL(bookmark.url).hostname.replace('www.', '');
  
  const handleClick = useCallback(() => {
    visitsApi.track(bookmark.id).catch(console.error);
    window.open(getBookmarkUrl(bookmark, isInternal), '_blank');
  }, [bookmark.id, bookmark.url, bookmark.internalUrl, isInternal]);

  const handleMarkRead = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead?.(bookmark.id);
  }, [bookmark.id, onMarkRead]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(bookmark.id);
  }, [bookmark.id, onRemove]);

  // 展开后的头图卡。不用 3D，路由器上不值得。
  void isLiteMode;
  return (
      <div
        className="group relative p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg overflow-hidden"
        style={{
          background: 'var(--color-glass)',
          border: '1px solid var(--color-glass-border)',
        }}
        onClick={handleClick}
      >
        <div className="flex flex-col md:flex-row gap-5">
          {/* 图片 */}
          {bookmark.ogImage && (
            <div className="w-full md:w-2/5 aspect-[16/10] rounded-xl overflow-hidden flex-shrink-0">
              <img 
                src={bookmark.ogImage} 
                alt="" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
            </div>
          )}
          
          {/* 内容 */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              {/* 标签行 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 text-xs font-medium">
                  <BookMarked className="w-3 h-3" />
                  {t('readLater.title')}
                </span>
                <button
                  type="button"
                  className="ml-auto rounded-lg p-1.5"
                  style={{ color: 'var(--color-text-muted)' }}
                  title={t('readLater.remove')}
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </button>
                {totalCount > 1 && (
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      background: 'var(--color-glass-hover)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    +{totalCount - 1} {t('readLater.more')}
                  </span>
                )}
              </div>
              
              {/* 标题 */}
              <h2
                className="text-xl md:text-2xl font-serif font-medium mb-2 line-clamp-2 transition-colors group-hover:text-[var(--color-primary)]"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {bookmark.title}
              </h2>
              
              {/* 描述 */}
              {bookmark.description && (
                <p 
                  className="text-sm line-clamp-2 mb-3"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {bookmark.description}
                </p>
              )}
              
              {/* 来源和时间 */}
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span>{domain}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(bookmark.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-2 mt-4">
              <motion.button
                className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                style={{ 
                  background: 'var(--color-glass-hover)',
                  color: 'var(--color-text-secondary)',
                }}
                onClick={handleMarkRead}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CheckCircle2 className="w-4 h-4" />
                {t('readLater.markRead')}
              </motion.button>
              
              <motion.button
                className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
                style={{ 
                  background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
                }}
                onClick={handleClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('readLater.startReading')}
                <ExternalLink className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
  );
}

// 列表项组件
function ListItem({ 
  bookmark, 
  index,
  onMarkRead,
  onRemove,
  onClick,
}: { 
  bookmark: Bookmark;
  index: number;
  onMarkRead?: (id: string) => void;
  onRemove?: (id: string) => void;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const domain = new URL(bookmark.url).hostname.replace('www.', '');

  return (
    <motion.div
      className="group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
      style={{
        background: 'var(--color-glass)',
        border: '1px solid var(--color-glass-border)',
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ 
        background: 'var(--color-glass-hover)',
        x: 4,
      }}
      onClick={onClick}
    >
      {/* 缩略图 */}
      {bookmark.ogImage ? (
        <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <img 
            src={bookmark.ogImage} 
            alt="" 
            className="w-full h-full object-cover" 
          />
        </div>
      ) : (
        <div 
          className="w-16 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--color-glass-hover)' }}
        >
          <BookMarked className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
        </div>
      )}
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <h4 
          className="font-medium text-sm line-clamp-1 mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {bookmark.title}
        </h4>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>{domain}</span>
          <span>·</span>
          <span>{new Date(bookmark.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
        <motion.button
          className="p-2 rounded-lg transition-colors hover:bg-[var(--color-glass-hover)]"
          style={{ color: 'var(--color-text-muted)' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead?.(bookmark.id);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={t('readLater.markRead')}
        >
          <CheckCircle2 className="w-4 h-4" />
        </motion.button>
        <motion.button
          className="p-2 rounded-lg transition-colors hover:bg-[var(--color-glass-hover)]"
          style={{ color: 'var(--color-text-muted)' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove?.(bookmark.id);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={t('readLater.remove')}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>
      
      {/* 箭头指示 */}
      <ChevronRight 
        className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
        style={{ color: 'var(--color-text-muted)' }}
      />
    </motion.div>
  );
}

// 主组件
export function ReadLaterSection({ 
  bookmarks, 
  isLiteMode,
  onMarkRead,
  onRemove,
}: ReadLaterSectionProps) {
  const { t } = useTranslation();
  const { isInternal } = useNetworkEnv();
  const [detailOpen, setDetailOpen] = useState(false);

  const unreadBookmarks = bookmarks.filter(b => b.isReadLater && !b.isRead);
  if (unreadBookmarks.length === 0) return null;

  const heroBookmark = unreadBookmarks[0];
  const restBookmarks = unreadBookmarks.slice(1);
  let domain = heroBookmark.url;
  try {
    domain = new URL(heroBookmark.url).hostname.replace('www.', '');
  } catch {
    domain = heroBookmark.url;
  }

  return (
    <section className="mb-8" data-section="read-later">
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={detailOpen}
          onClick={() => setDetailOpen((open) => !open)}
        >
          <BookMarked className="h-4 w-4 shrink-0 text-orange-400" />
          <span className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {heroBookmark.title}
          </span>
          <span className="hidden truncate text-xs sm:inline" style={{ color: 'var(--color-text-muted)' }}>
            {domain}
          </span>
          {unreadBookmarks.length > 1 && (
            <span className="shrink-0 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              +{unreadBookmarks.length - 1}
            </span>
          )}
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 transition-transform ${detailOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-text-muted)' }}
          />
        </button>
        <button
          type="button"
          title={t('readLater.markRead')}
          aria-label={t('readLater.markRead')}
          className="shrink-0 rounded-lg p-1.5"
          style={{ color: 'var(--color-text-muted)' }}
          onClick={() => onMarkRead?.(heroBookmark.id)}
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
      </div>

      {detailOpen && (
        <div className="mt-3 space-y-3">
          <HeroBookmark
            bookmark={heroBookmark}
            totalCount={unreadBookmarks.length}
            isLiteMode={isLiteMode}
            onMarkRead={onMarkRead}
            onRemove={onRemove}
          />
          {restBookmarks.map((bookmark, index) => (
            <ListItem
              key={bookmark.id}
              bookmark={bookmark}
              index={index}
              onMarkRead={onMarkRead}
              onRemove={onRemove}
              onClick={() => {
                visitsApi.track(bookmark.id).catch(console.error);
                window.open(getBookmarkUrl(bookmark, isInternal), '_blank');
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ReadLaterSection;

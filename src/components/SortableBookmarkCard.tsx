import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BookmarkCard } from './BookmarkCard'
import { Bookmark } from '../types/bookmark'

interface SortableBookmarkCardProps {
  bookmark: Bookmark
  onEdit?: (bookmark: Bookmark) => void
  onDelete?: (id: string) => void
  onTogglePin?: (id: string) => void
  onToggleReadLater?: (id: string) => void
  onMarkAsRead?: (id: string) => void
  isNew?: boolean
}

export function SortableBookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleReadLater,
  onMarkAsRead,
  isNew,
}: SortableBookmarkCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id })

  // VIBE CODING: 拖拽时的"悬浮感" - 卡片上浮、变亮、提升层级
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 1,
    scale: isDragging ? 1.04 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'manipulation',
  }

  return (
    <div ref={setNodeRef} style={{ ...style, height: '100%' }} {...attributes} {...listeners}>
      <BookmarkCard
        bookmark={bookmark}
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        onToggleReadLater={onToggleReadLater}
        onMarkAsRead={onMarkAsRead}
        isDragging={isDragging}
        isNew={isNew}
      />
    </div>
  )
}

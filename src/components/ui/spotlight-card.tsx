import { useRef, useCallback, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

interface SpotlightCardProps {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  lightweight?: boolean // 轻量模式：禁用 spotlight/border beam，用纯 CSS hover 代替 framer-motion
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  /**
   * 是否让鼠标中键执行卡片主操作。
   * 书签卡片都会提供右键菜单，因此默认在存在 onContextMenu 时启用；
   * 其他类型的可点击卡片可显式开启或关闭。
   */
  openOnMiddleClick?: boolean
}

const INTERACTIVE_DESCENDANT_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[contenteditable="true"]',
].join(',')

function isInteractiveDescendant(event: React.MouseEvent<HTMLDivElement>) {
  const target = event.target
  if (!(target instanceof Element) || target === event.currentTarget) {
    return false
  }

  const interactiveElement = target.closest(INTERACTIVE_DESCENDANT_SELECTOR)

  // closest() 会继续向卡片外层查找。书签外层的 dnd-kit SortableCard
  // 会被标记为 role="button"，不能把它误判为卡片内部的操作按钮。
  return Boolean(
    interactiveElement &&
    interactiveElement !== event.currentTarget &&
    event.currentTarget.contains(interactiveElement),
  )
}

/**
 * VIBE CODING 性能优化：
 * - 使用 RAF 节流鼠标移动事件
 * - 使用 CSS 变量传递位置，减少 React 重渲染
 * - 添加 will-change 提示
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(102, 126, 234, 0.15)',
  size = 'md',
  lightweight = false,
  onClick,
  onContextMenu,
  openOnMiddleClick = Boolean(onContextMenu),
}: SpotlightCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const rafIdRef = useRef(0)
  const pointRef = useRef({ x: 0, y: 0 })
  const reducedMotion = usePrefersReducedMotion()

  const paintGlow = useCallback(() => {
    const glow = glowRef.current
    if (!glow) return
    const { x, y } = pointRef.current
    glow.style.transform = `translate3d(${x - 144}px, ${y - 144}px, 0)`
  }, [])

  // 进入时量一次矩形，移动时只改 transform，避免每帧重绘 radial-gradient。
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = rectRef.current
    if (!rect) return
    pointRef.current.x = e.clientX - rect.left
    pointRef.current.y = e.clientY - rect.top
    if (rafIdRef.current) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0
      paintGlow()
    })
  }, [paintGlow])

  const handleMouseEnter = useCallback(() => {
    if (containerRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect()
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    rectRef.current = null
  }, [])

  // 中键按下时阻止浏览器进入自动滚屏模式，但不影响卡片内按钮等独立控件。
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (
      event.button === 1 &&
      openOnMiddleClick &&
      onClick &&
      !isInteractiveDescendant(event)
    ) {
      event.preventDefault()
    }
  }, [onClick, openOnMiddleClick])

  // auxclick 专门处理非主鼠标键；button === 1 表示中键。
  const handleAuxClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (
      event.button !== 1 ||
      !openOnMiddleClick ||
      !onClick ||
      isInteractiveDescendant(event)
    ) {
      return
    }

    event.preventDefault()
    onClick()

    // 卡片主操作会通过 window.open 打开书签；重新聚焦当前页，保持“后台打开”体验。
    try {
      window.focus()
    } catch {
      // 某些 WebView 不允许脚本主动聚焦，打开行为本身仍然有效。
    }
  }, [onClick, openOnMiddleClick])

  // 清理 RAF
  useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current)
  }, [])

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
    xl: 'p-8',
  }

  // 轻量模式：纯 CSS，无 framer-motion，无 spotlight 特效
  if (lightweight) {
    return (
      <div
        onMouseDown={handleMouseDown}
        onAuxClick={handleAuxClick}
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={cn(
          'relative overflow-hidden rounded-none backdrop-blur-md',
          'transition-transform duration-300 hover:-translate-y-1',
          onClick && 'cursor-pointer active:scale-[0.98]',
          sizeClasses[size],
          className
        )}
        style={{
          background: 'var(--color-glass)',
          border: '1px solid var(--color-glass-border)',
          boxShadow: 'var(--color-shadow)',
        }}
      >
        <div className="relative z-10">{children}</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={reducedMotion ? undefined : handleMouseMove}
      onMouseEnter={reducedMotion ? undefined : handleMouseEnter}
      onMouseLeave={reducedMotion ? undefined : handleMouseLeave}
      onMouseDown={handleMouseDown}
      onAuxClick={handleAuxClick}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'group spotlight-card relative overflow-hidden rounded-none backdrop-blur-md',
        onClick && 'cursor-pointer',
        sizeClasses[size],
        className
      )}
      style={{
        background: 'var(--color-glass)',
        border: '1px solid var(--color-glass-border)',
      }}
    >
      {!reducedMotion && (
        <div
          ref={glowRef}
          className="spotlight-glow pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full opacity-0 dark:block hidden"
          style={{
            background: `radial-gradient(circle, ${spotlightColor} 0%, rgba(255,255,255,0.07) 34%, transparent 70%)`,
            transform: 'translate3d(-999px, -999px, 0)',
          }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  )
}

// 带状态指示器的卡片
interface StatusCardProps extends SpotlightCardProps {
  status?: 'online' | 'offline' | 'loading'
  statusColor?: string
}

export function StatusCard({
  children,
  status,
  statusColor,
  ...props
}: StatusCardProps) {
  const getStatusColor = () => {
    if (statusColor) return statusColor
    switch (status) {
      case 'online': return '#22c55e'
      case 'offline': return '#ef4444'
      case 'loading': return '#eab308'
      default: return undefined
    }
  }

  const color = getStatusColor()

  return (
    <SpotlightCard {...props}>
      {status && color && (
        <div className="absolute top-3 right-3 z-20">
          <span
            className="relative flex h-2.5 w-2.5"
          >
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: color }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ backgroundColor: color }}
            />
          </span>
        </div>
      )}
      {children}
    </SpotlightCard>
  )
}

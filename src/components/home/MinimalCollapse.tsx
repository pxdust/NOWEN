import { useEffect, useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const EXIT_MS = 300

interface MinimalCollapseProps {
  hidden: boolean
  children: ReactNode
}

/**
 * 极简模式的显隐。用 grid 行高 + 透明度过渡，动画结束后再卸载，
 * 避免运维卡片在收起过程中继续占位，也避免开着时白跑监控请求。
 */
export function MinimalCollapse({ hidden, children }: MinimalCollapseProps) {
  const reduced = usePrefersReducedMotion()
  const [present, setPresent] = useState(!hidden)
  const [visible, setVisible] = useState(!hidden)

  useEffect(() => {
    if (!hidden) {
      setPresent(true)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }

    setVisible(false)
    if (!present || reduced) {
      setPresent(false)
      return
    }

    const timer = window.setTimeout(() => setPresent(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [hidden, present, reduced])

  if (!present) return null

  return (
    <div
      data-testid="minimal-collapse"
      data-visible={visible ? 'true' : 'false'}
      aria-hidden={visible ? undefined : true}
      className={
        reduced
          ? visible ? 'grid grid-rows-[1fr]' : 'grid grid-rows-[0fr]'
          : `grid transition-[grid-template-rows,opacity] duration-300 ease-out ${visible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`
      }
      style={{ pointerEvents: visible ? undefined : 'none' }}
    >
      <div className="min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

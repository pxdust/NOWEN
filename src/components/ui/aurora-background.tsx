import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { BackgroundBeamsWithCollision } from './background-beams-with-collision'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.innerWidth < 768

interface AuroraBackgroundProps {
  children?: React.ReactNode
  className?: string
  showRadialGradient?: boolean
  showBeams?: boolean
  /** 壁纸启用时使用透明模式，所有 Aurora 装饰层都必须停止渲染。 */
  transparent?: boolean
}

export function AuroraBackground({
  children,
  className,
  showRadialGradient = true,
  showBeams = false,
  transparent = false,
}: AuroraBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const spotRef = useRef<HTMLDivElement>(null)
  const rafIdRef = useRef(0)
  const pointerRef = useRef({ x: -4000, y: -4000 })
  const [isDark, setIsDark] = useState(true)
  const mobile = useMemo(() => isMobileViewport(), [])
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }

    syncTheme()

    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  const paintSpot = useCallback(() => {
    const spot = spotRef.current
    if (!spot) return
    const { x, y } = pointerRef.current
    spot.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }, [])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    pointerRef.current.x = event.clientX
    pointerRef.current.y = event.clientY
    if (rafIdRef.current) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0
      paintSpot()
    })
  }, [paintSpot])

  const trackPointer = !transparent && !mobile && !reducedMotion

  useEffect(() => {
    if (!trackPointer) return

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }
  }, [handleMouseMove, trackPointer])

  const renderDecorations = !transparent
  const drift = !mobile && !reducedMotion

  return (
    <div
      ref={containerRef}
      data-testid="aurora-background"
      data-transparent={transparent ? 'true' : 'false'}
      className={cn('relative min-h-screen w-full overflow-hidden', className)}
      style={{
        background: transparent ? 'transparent' : 'var(--color-bg-primary)',
        transition: 'background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {renderDecorations && (
        <div data-testid="aurora-decorations" aria-hidden="true">
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.div
                key="dark-aurora"
                className="fixed inset-0 overflow-hidden pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: 'var(--color-bg-gradient)' }}
                />
                <div className="aurora-wash aurora-wash-dark" />
                {drift && (
                  <>
                    <div className="aurora-orb aurora-orb-a aurora-drift-a" />
                    <div className="aurora-orb aurora-orb-b aurora-drift-b" />
                    <div ref={spotRef} className="aurora-spot" />
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="light-aurora"
                className="fixed inset-0 overflow-hidden pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: 'var(--color-bg-gradient)' }}
                />
                <div className={cn('aurora-wash aurora-wash-light', mobile && !reducedMotion && 'aurora-breathe')} />
                {drift && (
                  <>
                    <div className="aurora-orb aurora-orb-a aurora-drift-a" />
                    <div className="aurora-orb aurora-orb-b aurora-drift-b" />
                    <div ref={spotRef} className="aurora-spot" />
                  </>
                )}
                <div
                  className="absolute left-0 right-0 top-0 h-[40vh]"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, transparent 100%)',
                    opacity: 0.5,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {showRadialGradient && (
            <div
              className="fixed inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 0%, var(--color-bg-primary) 70%)'
                  : 'radial-gradient(ellipse 100% 100% at 50% 30%, transparent 0%, var(--color-bg-primary) 80%)',
                transition: 'background 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          )}

          {showBeams && (
            <div className="fixed inset-0 pointer-events-none">
              <BackgroundBeamsWithCollision
                containerClassName="absolute inset-0"
                className="h-full w-full"
                isDark={isDark}
                isMobile={mobile}
              />
            </div>
          )}
        </div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  )
}

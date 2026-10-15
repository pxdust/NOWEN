"use client"
import { cn } from "../../lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import React, { useState, useCallback, useEffect, useRef } from "react"

export const BackgroundBeamsWithCollision = ({
  children,
  className,
  isDark = true,
  isMobile = false,
}: {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  isDark?: boolean
  isMobile?: boolean
}) => {
  const allBeams = [
    { initialX: 10, translateX: 10, duration: 7, repeatDelay: 3, delay: 2 },
    { initialX: 600, translateX: 600, duration: 3, repeatDelay: 3, delay: 4 },
    { initialX: 100, translateX: 100, duration: 7, repeatDelay: 7, className: "h-6" },
    { initialX: 400, translateX: 400, duration: 5, repeatDelay: 14, delay: 4 },
    { initialX: 800, translateX: 800, duration: 11, repeatDelay: 2, className: "h-20" },
    { initialX: 1000, translateX: 1000, duration: 4, repeatDelay: 2, className: "h-12" },
    { initialX: 1200, translateX: 1200, duration: 6, repeatDelay: 4, delay: 2, className: "h-6" },
    { initialX: 200, translateX: 200, duration: 8, repeatDelay: 5, delay: 1 },
    { initialX: 1400, translateX: 1400, duration: 5, repeatDelay: 6, className: "h-8" },
    { initialX: 300, translateX: 300, duration: 9, repeatDelay: 4, delay: 3, className: "h-16" },
  ]

  // 移动端只保留 4 条光束，减少 GPU 压力
  const beams = isMobile ? allBeams.slice(0, 4) : allBeams

  const beamGradient = isDark
    ? "linear-gradient(to top, var(--color-glow), var(--color-glow-secondary), transparent)"
    : "linear-gradient(to top, rgba(59, 130, 246, 0.6), rgba(147, 51, 234, 0.4), transparent)"
  
  const beamShadow = isDark
    ? "0 0 8px var(--color-glow), 0 0 16px var(--color-glow-secondary)"
    : "0 0 8px rgba(59, 130, 246, 0.5), 0 0 16px rgba(147, 51, 234, 0.3)"
  
  const lineGradient = isDark
    ? "linear-gradient(90deg, transparent 10%, var(--color-glow) 50%, transparent 90%)"
    : "linear-gradient(90deg, transparent 10%, rgba(59, 130, 246, 0.5) 50%, transparent 90%)"
  
  const lineShadow = isDark
    ? "0 0 20px 5px var(--color-glow), 0 0 40px 10px var(--color-glow-secondary)"
    : "0 0 15px 3px rgba(59, 130, 246, 0.4), 0 0 30px 8px rgba(147, 51, 234, 0.2)"

  const explosionColor = isDark
    ? "var(--color-glow)"
    : "rgba(59, 130, 246, 0.8)"

  const [explosions, setExplosions] = useState<{ id: number; x: number }[]>([])

  const addExplosion = useCallback((x: number) => {
    const id = Date.now() + Math.random()
    setExplosions(prev => [...prev, { id, x }])
  }, [])

  const removeExplosion = useCallback((id: number) => {
    setExplosions(prev => prev.filter(e => e.id !== id))
  }, [])

  return (
    <div
      className={cn(
        "relative flex items-center w-full h-full justify-center overflow-hidden",
        className
      )}
    >
      {beams.map((beam, idx) => (
        <BeamEffect
          key={`beam-${idx}`}
          beamOptions={beam}
          beamGradient={beamGradient}
          beamShadow={beamShadow}
          onCollision={isMobile ? undefined : addExplosion}
        />
      ))}

      {children}
      
      {/* 碰撞爆炸粒子 */}
      <AnimatePresence>
        {explosions.map(e => (
          <ExplosionParticles
            key={e.id}
            x={e.x}
            color={explosionColor}
            onComplete={() => removeExplosion(e.id)}
          />
        ))}
      </AnimatePresence>

      {/* 底部碰撞线 */}
      <div
        className="absolute bottom-0 w-full inset-x-0 pointer-events-none h-1"
        style={{
          background: lineGradient,
          boxShadow: lineShadow,
        }}
      />
    </div>
  )
}

// 爆炸粒子组件
const ExplosionParticles = React.memo(({
  x,
  color,
  onComplete,
}: {
  x: number
  color: string
  onComplete: () => void
}) => {
  const particles = React.useMemo(() => 
    Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI + Math.PI
      const speed = 15 + Math.random() * 25
      return {
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 5,
        size: 1.5 + Math.random() * 2.5,
        duration: 0.3 + Math.random() * 0.4,
      }
    }), []
  )

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, bottom: 2 }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      onAnimationComplete={onComplete}
    >
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: color,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: p.dx,
            y: p.dy,
            opacity: 0,
            scale: 0.2,
          }}
          transition={{
            duration: p.duration,
            ease: "easeOut",
          }}
        />
      ))}
    </motion.div>
  )
})

ExplosionParticles.displayName = "ExplosionParticles"

function beamKeyframes(activePortion: number): Keyframe[] {
  const end = Math.min(Math.max(activePortion, 0.05), 1)
  const fadeIn = end * 0.12
  const fallDone = Math.max(end * 0.92, fadeIn + 0.01)
  const frames: Keyframe[] = [
    { transform: 'translate3d(0, -200px, 0)', opacity: 0.2, offset: 0 },
    { transform: 'translate3d(0, -200px, 0)', opacity: 0.85, offset: fadeIn },
    { transform: 'translate3d(0, calc(100vh - 10px), 0)', opacity: 0.9, offset: Math.min(fallDone, end - 0.01) },
    { transform: 'translate3d(0, calc(100vh - 10px), 0)', opacity: 0, offset: end },
  ]
  if (end < 0.999) {
    frames.push({ transform: 'translate3d(0, calc(100vh - 10px), 0)', opacity: 0, offset: 1 })
  }
  return frames
}

/**
 * 光束用 WAAPI 做 transform/opacity，落点用时长推算。
 * 不再每帧 getBoundingClientRect（原先最多 10 条光束 × 2 次强制布局）。
 */
const BeamEffect = React.memo(({
  beamOptions = {},
  beamGradient,
  beamShadow,
  onCollision,
}: {
  beamOptions?: {
    initialX?: number
    translateX?: number
    initialY?: number
    translateY?: number
    rotate?: number
    className?: string
    duration?: number
    delay?: number
    repeatDelay?: number
  }
  beamGradient?: string
  beamShadow?: string
  onCollision?: (x: number) => void
}) => {
  const beamRef = useRef<HTMLDivElement>(null)
  const onCollisionRef = useRef(onCollision)
  onCollisionRef.current = onCollision

  const durationSec = beamOptions.duration || 8
  const delaySec = beamOptions.delay || 0
  const pauseSec = beamOptions.repeatDelay || 0
  const originX = beamOptions.translateX || beamOptions.initialX || 0

  useEffect(() => {
    const el = beamRef.current
    if (!el || typeof el.animate !== 'function') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const duration = durationSec * 1000
    const pause = pauseSec * 1000
    const delay = delaySec * 1000
    const cycle = duration + pause
    const animation = el.animate(beamKeyframes(duration / cycle), {
      duration: cycle,
      delay,
      iterations: Infinity,
      easing: 'linear',
      fill: 'both',
    })

    let intervalId = 0
    let timeoutId = 0
    if (onCollisionRef.current) {
      timeoutId = window.setTimeout(() => {
        if (!document.hidden) onCollisionRef.current?.(originX)
        intervalId = window.setInterval(() => {
          if (document.hidden) return
          onCollisionRef.current?.(originX)
        }, cycle)
      }, delay + duration)
    }

    return () => {
      animation.cancel()
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [delaySec, durationSec, originX, pauseSec, Boolean(onCollision)])

  return (
    <div
      ref={beamRef}
      className={cn(
        "absolute top-20 m-auto h-14 w-px rounded-full",
        beamOptions.className
      )}
      style={{
        left: originX,
        opacity: 0,
        background: beamGradient || "linear-gradient(to top, var(--color-glow), var(--color-glow-secondary), transparent)",
        boxShadow: beamShadow || "0 0 8px var(--color-glow), 0 0 16px var(--color-glow-secondary)",
      }}
    />
  )
})

BeamEffect.displayName = "BeamEffect"

export default BackgroundBeamsWithCollision

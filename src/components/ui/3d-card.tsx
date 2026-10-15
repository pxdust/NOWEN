import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '../../lib/utils'

interface Card3DProps {
  children: React.ReactNode
  className?: string
  containerClassName?: string
  glowColor?: string
}

export function Card3D({
  children,
  className,
  containerClassName,
  glowColor = 'rgba(102, 126, 234, 0.4)',
}: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 })
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['12deg', '-12deg'])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-12deg', '12deg'])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = rectRef.current
    if (!rect || rect.width === 0 || rect.height === 0) return

    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseEnter = () => {
    if (ref.current) rectRef.current = ref.current.getBoundingClientRect()
    setIsHovered(true)
  }
  const handleMouseLeave = () => {
    setIsHovered(false)
    rectRef.current = null
    x.set(0)
    y.set(0)
  }

  return (
    <div
      className={cn('relative', containerClassName)}
      style={{ perspective: '1000px' }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className={cn(
          'relative rounded-2xl',
          isHovered && 'shadow-glow-md',
          className
        )}
      >
        {/* Glow Border */}
        <motion.div
          className="absolute -inset-[1px] rounded-2xl opacity-0 transition-opacity duration-500"
          style={{
            background: `linear-gradient(135deg, ${glowColor}, transparent 40%, transparent 60%, ${glowColor})`,
          }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        />

        {/* Border Beam Effect */}
        {isHovered && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div
              className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-spin"
              style={{
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                animationDuration: '3s',
              }}
            />
          </div>
        )}

        {/* Card Content */}
        <div
          className="relative z-10 rounded-2xl backdrop-blur-md"
          style={{ 
            transform: 'translateZ(0)',
            background: 'var(--color-glass)',
            border: '1px solid var(--color-glass-border)',
            boxShadow: 'var(--color-shadow)',
          }}
        >
          {children}
        </div>

        {/* Inner Highlight */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
            transform: 'translateZ(20px)',
          }}
        />
      </motion.div>
    </div>
  )
}

// Card子组件 - 带视差效果
interface CardItemProps {
  children: React.ReactNode
  className?: string
  translateZ?: number
}

export function CardItem({ children, className, translateZ = 20 }: CardItemProps) {
  return (
    <div
      className={className}
      style={{
        transform: `translateZ(${translateZ}px)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  )
}

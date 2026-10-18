import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, RefreshCw, Wallet } from 'lucide-react'
import { fetchPackageUsage, type PackagePlan, type PackageQuotaWindow, type PackageSizeTier, type PackageUsageResponse } from '../../lib/api'
import { formatPackageMoney, formatPackageTime } from '../../lib/packageMoney'

const PAGE_THRESHOLD = 3
const COLLAPSE_KEY = 'nowen-package-widget-collapsed'
const POS_KEY = 'nowen-package-widget-pos'
const TIER_KEY = 'nowen-package-widget-tier'
const MIN_VISIBLE = 48
export const PACKAGE_CAROUSEL_MS = 5000
export const PACKAGE_SIZE_TIERS: PackageSizeTier[] = ['mini', 'medium', 'large']

interface WidgetPoint {
  x: number
  y: number
}

const RING_COLOR = {
  daily: { from: '#7DD3FC', to: '#2563EB' },
  weekly: { from: '#F0ABFC', to: '#7C3AED' },
} as const

function errorKey(code: string | undefined): string {
  switch (code) {
    case 'not_configured':
    case 'missing_user_id':
    case 'timeout':
    case 'upstream_failed':
    case 'upstream_unauthorized':
    case 'private':
      return `packageUsage.error.${code}`
    default:
      return 'packageUsage.error.generic'
  }
}

function quotaLabel(mode: PackagePlan['quotaMode'], side: 'daily' | 'weekly', t: (key: string) => string): string {
  if (mode === 'daily_and_weekly') {
    return side === 'daily' ? t('packageUsage.mode.dailyInCombo') : t('packageUsage.mode.weeklyInCombo')
  }
  return side === 'daily' ? t('packageUsage.mode.dailyOnly') : t('packageUsage.mode.weeklyOnly')
}

function resolveQuotaMode(plan: PackagePlan): PackagePlan['quotaMode'] {
  if (plan.quotaMode) return plan.quotaMode
  if (plan.daily && plan.weekly) return 'daily_and_weekly'
  if (plan.daily) return 'daily'
  if (plan.weekly) return 'weekly'
  return 'none'
}

export function isPackageSizeTier(value: unknown): value is PackageSizeTier {
  return value === 'mini' || value === 'medium' || value === 'large'
}

/** 个人选择盖过管理员默认档；两边都没有时用大档，也就是原来的完整卡片。 */
export function resolvePackageTier(override: unknown, adminDefault: unknown): PackageSizeTier {
  if (isPackageSizeTier(override)) return override
  if (isPackageSizeTier(adminDefault)) return adminDefault
  return 'large'
}

export type RingLayout =
  | { mode: 'nested'; outer: 'weekly'; inner: 'daily' }
  | { mode: 'single'; side: 'daily' | 'weekly' }
  | { mode: 'none' }

/** 迷你环：只有日或只有周是单环；两套都在时外圈是周、内圈是日。 */
export function ringLayout(plan: PackagePlan): RingLayout {
  if (plan.daily && plan.weekly) return { mode: 'nested', outer: 'weekly', inner: 'daily' }
  if (plan.weekly) return { mode: 'single', side: 'weekly' }
  if (plan.daily) return { mode: 'single', side: 'daily' }
  return { mode: 'none' }
}

/** 适中只留一根主进度条，日周同时存在时优先周额度。 */
export function primaryQuotaSide(plan: PackagePlan): 'daily' | 'weekly' | null {
  if (plan.weekly) return 'weekly'
  if (plan.daily) return 'daily'
  return null
}

export function compactQuotaAmount(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function quotaFraction(window: PackageQuotaWindow): string {
  if (window.unlimited) {
    return typeof window.used === 'number' ? compactQuotaAmount(window.used) : '∞'
  }
  if (typeof window.used === 'number' && typeof window.limit === 'number') {
    return `${compactQuotaAmount(window.used)}/${compactQuotaAmount(window.limit)}`
  }
  if (typeof window.limit === 'number') return compactQuotaAmount(window.limit)
  if (typeof window.used === 'number') return compactQuotaAmount(window.used)
  return '—'
}

function quotaPercent(window: PackageQuotaWindow): number | null {
  if (window.unlimited) return null
  if (typeof window.used !== 'number' || typeof window.limit !== 'number' || window.limit <= 0) return null
  return Math.min(100, Math.max(0, (window.used / window.limit) * 100))
}

function storage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

function readCollapsed(): boolean {
  try { return storage()?.getItem(COLLAPSE_KEY) === '1' } catch { return false }
}

function readPos(): WidgetPoint | null {
  try {
    const raw = storage()?.getItem(POS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<WidgetPoint>
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number' && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
      return { x: parsed.x, y: parsed.y }
    }
  } catch { /* ignore */ }
  return null
}

function writePos(point: WidgetPoint) {
  try { storage()?.setItem(POS_KEY, JSON.stringify(point)) } catch { /* ignore */ }
}

function readTierOverride(): PackageSizeTier | null {
  try {
    const raw = storage()?.getItem(TIER_KEY)
    return isPackageSizeTier(raw) ? raw : null
  } catch {
    return null
  }
}

function writeTierOverride(tier: PackageSizeTier) {
  try { storage()?.setItem(TIER_KEY, tier) } catch { /* ignore */ }
}

/** 拖动后至少留出 48px 在视口内。 */
export function clampPackageWidget(x: number, y: number, width: number, height: number): WidgetPoint {
  const viewW = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewH = typeof window === 'undefined' ? 800 : window.innerHeight
  const safeWidth = Number.isFinite(width) && width > 0 ? width : MIN_VISIBLE
  const safeHeight = Number.isFinite(height) && height > 0 ? height : MIN_VISIBLE
  return {
    x: Math.min(viewW - MIN_VISIBLE, Math.max(MIN_VISIBLE - safeWidth, x)),
    y: Math.min(viewH - MIN_VISIBLE, Math.max(MIN_VISIBLE - safeHeight, y)),
  }
}

function tierWidthClass(tier: PackageSizeTier, floating: boolean): string {
  if (tier === 'mini') return 'w-[16.25rem] max-w-[calc(100vw-1.5rem)]'
  if (tier === 'medium') return 'w-[22rem] max-w-[calc(100vw-1.5rem)]'
  return floating ? 'w-[min(36rem,calc(100vw-1.5rem))]' : 'w-full max-w-xl'
}

function placeMenu(x: number, y: number): { x: number; y: number } {
  const menuWidth = 168
  const menuHeight = 148
  const viewW = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewH = typeof window === 'undefined' ? 800 : window.innerHeight
  return {
    x: Math.max(8, Math.min(x, viewW - menuWidth - 8)),
    y: Math.max(8, Math.min(y, viewH - menuHeight - 8)),
  }
}

function fractionColor(side: 'daily' | 'weekly'): string {
  const ink = side === 'daily' ? '#2563EB' : '#7C3AED'
  return `color-mix(in srgb, ${ink} 72%, var(--color-text-primary))`
}

function QuotaRing({
  id,
  size,
  stroke,
  side,
  percent,
}: {
  id: string
  size: number
  stroke: number
  side: 'daily' | 'weekly'
  percent: number | null
}) {
  const radius = (size - stroke) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const pct = percent == null ? 0 : Math.min(100, Math.max(0, percent))
  const dash = (pct / 100) * circumference
  const color = RING_COLOR[side]
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden>
      <defs>
        <linearGradient id={id} x1="18%" y1="0%" x2="82%" y2="100%">
          <stop offset="0%" stopColor={color.from} />
          <stop offset="100%" stopColor={color.to} />
        </linearGradient>
      </defs>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(148, 163, 184, 0.16)"
        strokeWidth={stroke}
      />
      {percent != null && pct > 0 && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${Math.max(0, circumference - dash)}`}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ filter: `drop-shadow(0 0 8px ${color.to}66)` }}
        />
      )}
    </svg>
  )
}

function RingCenter({ label, side }: { label: string; side: 'daily' | 'weekly' }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
      <Calendar className="h-4 w-4" style={{ color: RING_COLOR[side].to }} />
      <span className="text-[11px] font-medium leading-none tabular-nums" style={{ color: fractionColor(side) }} data-ring-label={side}>
        {label}
      </span>
    </div>
  )
}

function RingStack({ plan }: { plan: PackagePlan }) {
  const { t } = useTranslation()
  const reactId = useId().replace(/:/g, '')
  const layout = ringLayout(plan)
  if (layout.mode === 'none') return <div data-ring-mode="none" />

  if (layout.mode === 'single') {
    const window = layout.side === 'daily' ? plan.daily : plan.weekly
    if (!window) return null
    const size = 132
    const label = quotaFraction(window)
    const caption = t(layout.side === 'daily' ? 'packageUsage.ring.daily' : 'packageUsage.ring.weekly')
    return (
      <div
        className="relative mx-auto"
        style={{ width: size, height: size }}
        data-ring-mode="single"
        data-ring-side={layout.side}
        role="img"
        aria-label={`${caption} ${label}`}
      >
        <QuotaRing id={`${reactId}-single`} size={size} stroke={11} side={layout.side} percent={quotaPercent(window)} />
        <RingCenter label={label} side={layout.side} />
      </div>
    )
  }

  const daily = plan.daily
  const weekly = plan.weekly
  if (!daily || !weekly) return null
  const outerSize = 156
  const innerSize = 108
  const innerLabel = quotaFraction(daily)
  const outerLabel = quotaFraction(weekly)
  return (
    <div className="mx-auto flex flex-col items-center">
      <div
        className="relative"
        style={{ width: outerSize, height: outerSize }}
        data-ring-mode="nested"
        data-ring-outer="weekly"
        data-ring-inner="daily"
        role="img"
        aria-label={`${t('packageUsage.ring.weekly')} ${outerLabel}，${t('packageUsage.ring.daily')} ${innerLabel}`}
      >
        <QuotaRing id={`${reactId}-weekly`} size={outerSize} stroke={11} side="weekly" percent={quotaPercent(weekly)} />
        <div className="absolute inset-0 flex items-center justify-center">
          <QuotaRing id={`${reactId}-daily`} size={innerSize} stroke={9} side="daily" percent={quotaPercent(daily)} />
        </div>
        <RingCenter label={innerLabel} side="daily" />
      </div>
      <div className="mt-1.5 text-xs font-medium tabular-nums" style={{ color: fractionColor('weekly') }} data-ring-label="weekly">
        {outerLabel}
      </div>
    </div>
  )
}

function GripButton({ onPointerDown }: { onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-label={t('packageUsage.drag')}
      onPointerDown={onPointerDown}
      className="cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
}

function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-expanded={!collapsed}
      aria-label={collapsed ? t('packageUsage.expand') : t('packageUsage.collapse')}
      onClick={onClick}
      className="rounded-md p-1"
      style={{ color: 'var(--color-text-muted)' }}
    >
      {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
    </button>
  )
}

function QuotaRow({
  label,
  window,
  currency,
  showReset,
}: {
  label: string
  window: NonNullable<PackagePlan['daily']>
  currency: string
  showReset: boolean
}) {
  const { t } = useTranslation()
  const finite = !window.unlimited && typeof window.limit === 'number' && window.limit > 0 && typeof window.used === 'number'
  const pct = finite ? Math.min(100, Math.max(0, (window.used! / window.limit!) * 100)) : 0
  const value = window.unlimited
    ? (typeof window.used === 'number'
      ? t('packageUsage.usedUnlimited', { used: formatPackageMoney(window.used, currency) })
      : t('packageUsage.unlimited'))
    : finite
      ? `${formatPackageMoney(window.used!, currency)} / ${formatPackageMoney(window.limit!, currency)}`
      : typeof window.limit === 'number'
        ? formatPackageMoney(window.limit, currency)
        : null
  if (value === null) return null
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span className="tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
      </div>
      {finite && (
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--color-bg-tertiary)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
        </div>
      )}
      {showReset && window.resetsAt && (
        <div className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('packageUsage.resetsAt', { time: formatPackageTime(window.resetsAt) })}
        </div>
      )}
    </div>
  )
}

function PackageBlock({ plan, currency, density }: { plan: PackagePlan; currency: string; density: 'medium' | 'large' }) {
  const { t } = useTranslation()
  const mode = resolveQuotaMode(plan)
  const primary = density === 'medium' ? primaryQuotaSide(plan) : null
  const showDaily = density === 'large' ? Boolean(plan.daily) : primary === 'daily'
  const showWeekly = density === 'large' ? Boolean(plan.weekly) : primary === 'weekly'
  return (
    <div
      className="rounded-xl p-3"
      data-density={density}
      data-primary-quota={density === 'medium' ? primary ?? 'none' : undefined}
      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-glass-border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {plan.name}
          </div>
          {density === 'large' && mode === 'daily_and_weekly' && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]"
              style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}
            >
              {t('packageUsage.mode.combo')}
            </span>
          )}
        </div>
        {density === 'large' && (
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {typeof plan.daysLeft === 'number' && (
              <span>{t('packageUsage.daysLeft', { count: plan.daysLeft })}</span>
            )}
            {plan.expiresAt && <span>{t('packageUsage.expiresAt', { time: formatPackageTime(plan.expiresAt) })}</span>}
          </div>
        )}
      </div>
      {(showDaily || showWeekly) && (
        <div className="mt-3 space-y-3">
          {showDaily && plan.daily && (
            <QuotaRow label={quotaLabel(mode, 'daily', t)} window={plan.daily} currency={currency} showReset={density === 'large'} />
          )}
          {showWeekly && plan.weekly && (
            <QuotaRow label={quotaLabel(mode, 'weekly', t)} window={plan.weekly} currency={currency} showReset={density === 'large'} />
          )}
        </div>
      )}
    </div>
  )
}

function collapsedNames(packages: PackagePlan[]): string {
  const names = packages.map((plan) => plan.name).filter(Boolean)
  if (names.length <= 2) return names.join('、')
  return `${names.slice(0, 2).join('、')} +${names.length - 2}`
}

export function PackageUsageSection() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PackageUsageResponse | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [pos, setPos] = useState<WidgetPoint | null>(readPos)
  const [override, setOverride] = useState<PackageSizeTier | null>(readTierOverride)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselPaused, setCarouselPaused] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<null | {
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    width: number
    height: number
    moved: boolean
  }>(null)

  const tier = resolvePackageTier(override, data?.defaultTier)

  useEffect(() => {
    let stopped = false
    let timer = 0
    let controller = new AbortController()

    const load = async () => {
      controller.abort()
      controller = new AbortController()
      const signal = controller.signal
      try {
        const next = await fetchPackageUsage(signal)
        if (stopped || signal.aborted) return
        setData(next)
        setError(next.ok ? '' : next.error || 'generic')
        setLoading(false)
        window.clearInterval(timer)
        if (next.refreshIntervalMin > 0) {
          timer = window.setInterval(() => { void load() }, next.refreshIntervalMin * 60_000)
        }
      } catch (err) {
        if (stopped || signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
        setError(err instanceof Error && err.message ? err.message : 'generic')
        setLoading(false)
      }
    }

    void load()
    return () => {
      stopped = true
      controller.abort()
      window.clearInterval(timer)
    }
  }, [reloadKey])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (!drag.moved && Math.hypot(dx, dy) < 4) return
      drag.moved = true
      setPos(clampPackageWidget(drag.originX + dx, drag.originY + dy, drag.width, drag.height))
    }
    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const moved = drag.moved
      dragRef.current = null
      if (!moved) return
      setPos((current) => {
        if (current) writePos(current)
        return current
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  useEffect(() => {
    const onViewportResize = () => {
      const rect = cardRef.current?.getBoundingClientRect()
      setPos((current) => {
        if (!current) return current
        const next = clampPackageWidget(current.x, current.y, rect?.width ?? 320, rect?.height ?? 64)
        if (next.x === current.x && next.y === current.y) return current
        writePos(next)
        return next
      })
    }
    window.addEventListener('resize', onViewportResize)
    return () => window.removeEventListener('resize', onViewportResize)
  }, [])

  useEffect(() => {
    const rect = cardRef.current?.getBoundingClientRect()
    setPos((current) => {
      if (!current) return current
      const next = clampPackageWidget(current.x, current.y, rect?.width ?? 320, rect?.height ?? 64)
      if (next.x === current.x && next.y === current.y) return current
      writePos(next)
      return next
    })
  }, [tier, collapsed])

  useEffect(() => {
    if (!menu) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && menuRef.current?.contains(target)) return
      setMenu(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const packageCount = data?.packages?.length ?? 0
  useEffect(() => {
    if (tier !== 'mini' || collapsed || carouselPaused || packageCount < 2) return
    const timer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % packageCount)
    }, PACKAGE_CAROUSEL_MS)
    return () => window.clearInterval(timer)
  }, [tier, collapsed, carouselPaused, packageCount])

  if (!loading && data && !data.enabled) return null

  const packages = data?.packages ?? []
  const paged = tier !== 'mini' && packages.length > PAGE_THRESHOLD
  const pageCount = paged ? packages.length : 1
  const safePage = Math.min(page, Math.max(0, pageCount - 1))
  const safeCarousel = packages.length === 0 ? 0 : carouselIndex % packages.length
  const visible = tier === 'mini'
    ? packages.slice(safeCarousel, safeCarousel + 1)
    : paged
      ? packages.slice(safePage, safePage + 1)
      : packages
  const currency = data?.currency || 'USD'
  const summary = !loading && error
    ? t(errorKey(error))
    : !loading && data?.ok
      ? [data.balance === null ? '—' : formatPackageMoney(data.balance, currency), collapsedNames(packages)].filter(Boolean).join(' · ')
      : ''
  const rotating = tier === 'mini' && !collapsed && packages.length > 1

  const onGripDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button != null && event.button !== 0) return
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos ? pos.x : rect.left,
      originY: pos ? pos.y : rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    }
    event.preventDefault()
  }

  const toggleCollapsed = () => {
    const next = !collapsed
    try { storage()?.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
    setCollapsed(next)
  }

  const onContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu(placeMenu(event.clientX, event.clientY))
  }

  const chooseTier = (next: PackageSizeTier) => {
    writeTierOverride(next)
    setOverride(next)
    setMenu(null)
  }

  const retry = () => {
    setLoading(true)
    setError('')
    setReloadKey((current) => current + 1)
  }

  const balanceText = !data || data.balance === null ? '—' : formatPackageMoney(data.balance, currency)
  const miniPlan = visible[0]

  const menuNode = menu && typeof document !== 'undefined' ? createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('packageUsage.tier.menu')}
      data-package-tier-menu
      className="fixed z-50 min-w-[9.5rem] rounded-xl p-1 shadow-lg backdrop-blur-xl"
      style={{
        left: menu.x,
        top: menu.y,
        background: 'var(--color-glass)',
        border: '1px solid var(--color-glass-border)',
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {PACKAGE_SIZE_TIERS.map((item) => {
        const selected = item === tier
        return (
          <button
            key={item}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            data-tier-option={item}
            onClick={() => chooseTier(item)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm"
            style={{
              background: selected ? 'var(--color-bg-tertiary)' : 'transparent',
              color: 'var(--color-text-primary)',
            }}
          >
            <span>{t(`packageUsage.tier.${item}`)}</span>
            {selected && <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />}
          </button>
        )
      })}
    </div>,
    document.body,
  ) : null

  const card = (
    <section
      ref={cardRef}
      className={[
        pos ? 'fixed z-30' : 'relative mb-8 min-w-0',
        'select-none',
        tierWidthClass(tier, pos != null),
      ].join(' ')}
      style={{ left: pos?.x, top: pos?.y }}
      data-section="package-usage"
      data-tier={tier}
      onContextMenu={onContextMenu}
      onMouseEnter={rotating ? () => setCarouselPaused(true) : undefined}
      onMouseLeave={rotating ? () => setCarouselPaused(false) : undefined}
    >
      <div
        className={`overflow-hidden backdrop-blur-xl ${tier === 'mini' ? 'rounded-[28px]' : 'rounded-2xl'}`}
        style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}
      >
        {collapsed && (
          <div className="flex items-center gap-2 px-3 py-2.5">
            <GripButton onPointerDown={onGripDown} />
            <Wallet className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
            <h2 className="shrink-0 text-sm font-medium tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
              {t('packageUsage.section')}
            </h2>
            {summary && (
              <div className="min-w-0 truncate text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                {summary}
              </div>
            )}
            <div className="ml-auto">
              <CollapseButton collapsed onClick={toggleCollapsed} />
            </div>
          </div>
        )}

        {!collapsed && tier === 'mini' && (
          <div className="relative px-4 pb-5 pt-3">
            <div className="absolute left-1.5 top-1.5 z-10">
              <GripButton onPointerDown={onGripDown} />
            </div>
            <div className="absolute right-1.5 top-1.5 z-10">
              <CollapseButton collapsed={false} onClick={toggleCollapsed} />
            </div>
            <div className="pt-9">
            {loading && (
              <div className="pb-6" aria-busy="true" aria-label={t('packageUsage.loading')}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl" style={{ background: 'var(--color-bg-tertiary)' }} />
                  <div className="space-y-2">
                    <div className="h-3 w-16 rounded" style={{ background: 'var(--color-bg-tertiary)' }} />
                    <div className="h-7 w-24 rounded" style={{ background: 'var(--color-bg-tertiary)' }} />
                  </div>
                </div>
                <div className="mx-auto mt-5 h-32 w-32 rounded-full" style={{ background: 'var(--color-bg-tertiary)' }} />
              </div>
            )}
            {!loading && error && (
              <div className="flex items-center justify-between gap-3 pb-2">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t(errorKey(error))}</p>
                <button type="button" onClick={retry} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('packageUsage.retry')}
                </button>
              </div>
            )}
            {!loading && !error && data?.ok && (
              <div data-carousel-index={rotating ? safeCarousel : undefined}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: 'rgba(37, 99, 235, 0.16)', border: '1px solid rgba(96, 165, 250, 0.28)' }}
                  >
                    <Wallet className="h-6 w-6" style={{ color: '#60A5FA' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {miniPlan?.name || t('packageUsage.section')}
                    </div>
                    <div className="mt-0.5 text-[1.65rem] font-semibold leading-none tabular-nums tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                      {balanceText}
                    </div>
                    <div className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t('packageUsage.balanceShort')}</div>
                  </div>
                </div>
                {miniPlan && (
                  <div className="mt-4">
                    <RingStack plan={miniPlan} />
                  </div>
                )}
                {rotating && (
                  <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
                    {packages.map((plan, index) => (
                      <span
                        key={plan.id || `${plan.name}-${index}`}
                        className="h-1.5 rounded-full"
                        style={{
                          width: index === safeCarousel ? 14 : 6,
                          background: index === safeCarousel ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          opacity: index === safeCarousel ? 1 : 0.35,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {!collapsed && tier !== 'mini' && (
          <>
            <div className="flex shrink-0 items-center gap-2 px-3 py-2.5">
              <GripButton onPointerDown={onGripDown} />
              <Wallet className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
              <h2 className="shrink-0 text-sm font-medium tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                {t('packageUsage.section')}
              </h2>
              <div className="ml-auto">
                <CollapseButton collapsed={false} onClick={toggleCollapsed} />
              </div>
            </div>
            <div className="px-4 pb-4 sm:px-5">
              {loading && (
                <div className="space-y-3" aria-busy="true" aria-label={t('packageUsage.loading')}>
                  <div className="h-3 w-16 rounded" style={{ background: 'var(--color-bg-tertiary)' }} />
                  <div className="h-8 w-32 rounded" style={{ background: 'var(--color-bg-tertiary)' }} />
                  <div className="h-16 rounded-xl" style={{ background: 'var(--color-bg-tertiary)' }} />
                </div>
              )}
              {!loading && error && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t(errorKey(error))}</p>
                  <button type="button" onClick={retry} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('packageUsage.retry')}
                  </button>
                </div>
              )}
              {!loading && !error && data?.ok && (
                <div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('packageUsage.balance')}</div>
                  <div className={`mt-1 font-semibold tabular-nums tracking-tight ${tier === 'large' ? 'text-3xl' : 'text-2xl'}`} style={{ color: 'var(--color-text-primary)' }}>
                    {balanceText}
                  </div>
                  <div className="mt-4 space-y-3">
                    {visible.map((plan, index) => (
                      <PackageBlock key={`${plan.id || plan.name}-${index}`} plan={plan} currency={currency} density={tier} />
                    ))}
                  </div>
                  {paged && (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        aria-label={t('packageUsage.prev')}
                        disabled={safePage === 0}
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                        className="rounded-lg p-1.5 disabled:opacity-40"
                        style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                        {t('packageUsage.pager', { current: safePage + 1, total: pageCount })}
                      </span>
                      <button
                        type="button"
                        aria-label={t('packageUsage.next')}
                        disabled={safePage >= pageCount - 1}
                        onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                        className="rounded-lg p-1.5 disabled:opacity-40"
                        style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )

  return (
    <>
      {pos && typeof document !== 'undefined' ? createPortal(card, document.body) : card}
      {menuNode}
    </>
  )
}

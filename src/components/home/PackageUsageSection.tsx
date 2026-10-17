import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, RefreshCw, Wallet } from 'lucide-react'
import { fetchPackageUsage, type PackagePlan, type PackageUsageResponse } from '../../lib/api'
import { formatPackageMoney, formatPackageTime } from '../../lib/packageMoney'

const PAGE_THRESHOLD = 3
const COLLAPSE_KEY = 'nowen-package-widget-collapsed'
const POS_KEY = 'nowen-package-widget-pos'
const MIN_VISIBLE = 48

interface WidgetPoint {
  x: number
  y: number
}

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

function QuotaRow({
  label,
  window,
  currency,
}: {
  label: string
  window: NonNullable<PackagePlan['daily']>
  currency: string
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
      {window.resetsAt && (
        <div className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('packageUsage.resetsAt', { time: formatPackageTime(window.resetsAt) })}
        </div>
      )}
    </div>
  )
}

function PackageBlock({ plan, currency }: { plan: PackagePlan; currency: string }) {
  const { t } = useTranslation()
  const mode = resolveQuotaMode(plan)
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-glass-border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {plan.name}
          </div>
          {mode === 'daily_and_weekly' && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]"
              style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}
            >
              {t('packageUsage.mode.combo')}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {typeof plan.daysLeft === 'number' && (
            <span>{t('packageUsage.daysLeft', { count: plan.daysLeft })}</span>
          )}
          {plan.expiresAt && <span>{t('packageUsage.expiresAt', { time: formatPackageTime(plan.expiresAt) })}</span>}
        </div>
      </div>
      {mode !== 'none' && (plan.daily || plan.weekly) && (
        <div className="mt-3 space-y-3">
          {plan.daily && (
            <QuotaRow label={quotaLabel(mode, 'daily', t)} window={plan.daily} currency={currency} />
          )}
          {plan.weekly && (
            <QuotaRow label={quotaLabel(mode, 'weekly', t)} window={plan.weekly} currency={currency} />
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
  const cardRef = useRef<HTMLElement>(null)
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
    if (!pos) return
    const onResize = () => {
      const rect = cardRef.current?.getBoundingClientRect()
      setPos((current) => {
        if (!current) return current
        const next = clampPackageWidget(current.x, current.y, rect?.width ?? 320, rect?.height ?? 64)
        if (next.x === current.x && next.y === current.y) return current
        writePos(next)
        return next
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos])

  if (!loading && data && !data.enabled) return null

  const packages = data?.packages ?? []
  const paged = packages.length > PAGE_THRESHOLD
  const pageCount = paged ? packages.length : 1
  const safePage = Math.min(page, Math.max(0, pageCount - 1))
  const visible = paged ? packages.slice(safePage, safePage + 1) : packages
  const currency = data?.currency || 'USD'
  const summary = !loading && error
    ? t(errorKey(error))
    : !loading && data?.ok
      ? [data.balance === null ? '—' : formatPackageMoney(data.balance, currency), collapsedNames(packages)].filter(Boolean).join(' · ')
      : ''

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

  const card = (
    <section
      ref={cardRef}
      className={pos
        ? 'fixed z-30 w-[min(36rem,calc(100vw-1.5rem))] select-none'
        : 'relative mb-8 min-w-0 max-w-xl select-none'}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      data-section="package-usage"
    >
      <div
        className="rounded-2xl backdrop-blur-xl"
        style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            aria-label={t('packageUsage.drag')}
            onPointerDown={onGripDown}
            className="cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Wallet className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
          <h2 className="shrink-0 text-sm font-medium tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
            {t('packageUsage.section')}
          </h2>
          {collapsed && summary && (
            <div className="min-w-0 truncate text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
              {summary}
            </div>
          )}
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('packageUsage.expand') : t('packageUsage.collapse')}
            onClick={toggleCollapsed}
            className="ml-auto rounded-md p-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
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
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {t(errorKey(error))}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true)
                    setError('')
                    setReloadKey((current) => current + 1)
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('packageUsage.retry')}
                </button>
              </div>
            )}

            {!loading && !error && data?.ok && (
              <div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('packageUsage.balance')}</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {data.balance === null ? '—' : formatPackageMoney(data.balance, currency)}
                </div>
                <div className="mt-4 space-y-3">
                  {visible.map((plan, index) => (
                    <PackageBlock key={`${plan.id || plan.name}-${index}`} plan={plan} currency={currency} />
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
        )}
      </div>
    </section>
  )

  if (pos && typeof document !== 'undefined') return createPortal(card, document.body)
  return card
}

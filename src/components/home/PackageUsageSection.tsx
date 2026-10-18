import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, RefreshCw, Wallet } from 'lucide-react'
import { fetchPackageUsage, type PackagePlan, type PackageUsageResponse } from '../../lib/api'
import { formatPackageMoney, formatPackageTime } from '../../lib/packageMoney'

const PAGE_THRESHOLD = 3
const COLLAPSE_KEY = 'nowen-package-widget-collapsed'
const POS_KEY = 'nowen-package-widget-pos'
const SIZE_KEY = 'nowen-package-widget-size'
const MIN_VISIBLE = 48
export const PACKAGE_WIDGET_MIN_WIDTH = 240
export const PACKAGE_WIDGET_MIN_HEIGHT = 160

interface WidgetPoint {
  x: number
  y: number
}

interface WidgetSize {
  width: number
  height: number | null
}

export type PackageResizeDir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

const RESIZE_HANDLES: { dir: PackageResizeDir; className: string }[] = [
  { dir: 'n', className: 'inset-x-3 top-0 h-2 cursor-ns-resize' },
  { dir: 's', className: 'inset-x-3 bottom-0 h-2 cursor-ns-resize' },
  { dir: 'e', className: 'bottom-2 right-0 top-2 w-2 cursor-ew-resize' },
  { dir: 'w', className: 'bottom-2 left-0 top-2 w-2 cursor-ew-resize' },
  { dir: 'nw', className: 'left-0 top-0 h-3.5 w-3.5 cursor-nwse-resize' },
  { dir: 'ne', className: 'right-0 top-0 h-3.5 w-3.5 cursor-nesw-resize' },
  { dir: 'sw', className: 'bottom-0 left-0 h-3.5 w-3.5 cursor-nesw-resize' },
  { dir: 'se', className: 'bottom-0 right-0 h-6 w-6 cursor-nwse-resize' },
]

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

function readSize(): WidgetSize | null {
  try {
    const raw = storage()?.getItem(SIZE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<WidgetSize>
    if (typeof parsed.width !== 'number' || !Number.isFinite(parsed.width)) return null
    const storedHeight = typeof parsed.height === 'number' && Number.isFinite(parsed.height) ? parsed.height : null
    const clamped = clampPackageWidgetSize(parsed.width, storedHeight ?? PACKAGE_WIDGET_MIN_HEIGHT)
    return { width: clamped.width, height: storedHeight == null ? null : clamped.height }
  } catch { /* ignore */ }
  return null
}

function writeSize(size: WidgetSize) {
  try { storage()?.setItem(SIZE_KEY, JSON.stringify(size)) } catch { /* ignore */ }
}

function clampAxis(value: number, preferredMin: number, viewport: number): number {
  const view = Number.isFinite(viewport) && viewport > 0 ? viewport : preferredMin
  const min = Math.min(preferredMin, view)
  const max = Math.max(min, view)
  const safe = Number.isFinite(value) ? value : preferredMin
  return Math.round(Math.min(max, Math.max(min, safe)))
}

/** 宽高限制在可用范围内，并且不超过当前视口。 */
export function clampPackageWidgetSize(width: number, height: number): { width: number; height: number } {
  const viewW = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewH = typeof window === 'undefined' ? 800 : window.innerHeight
  return {
    width: clampAxis(width, PACKAGE_WIDGET_MIN_WIDTH, viewW),
    height: clampAxis(height, PACKAGE_WIDGET_MIN_HEIGHT, viewH),
  }
}

function dirAffectsHeight(dir: PackageResizeDir): boolean {
  return dir !== 'e' && dir !== 'w'
}

function dirMovesLeft(dir: PackageResizeDir): boolean {
  return dir === 'w' || dir === 'nw' || dir === 'sw'
}

function dirMovesTop(dir: PackageResizeDir): boolean {
  return dir === 'n' || dir === 'ne' || dir === 'nw'
}

function resizeCursor(dir: PackageResizeDir): string {
  if (dir === 'n' || dir === 's') return 'ns-resize'
  if (dir === 'e' || dir === 'w') return 'ew-resize'
  if (dir === 'ne' || dir === 'sw') return 'nesw-resize'
  return 'nwse-resize'
}

/** 按拖动的边或角计算新矩形；拉动左边或上边时对边保持不动。 */
export function resizePackageWidget(
  origin: { x: number; y: number; width: number; height: number },
  dx: number,
  dy: number,
  dir: PackageResizeDir,
): { x: number; y: number; width: number; height: number } {
  const width = dir === 'n' || dir === 's'
    ? origin.width
    : dirMovesLeft(dir) ? origin.width - dx : origin.width + dx
  const height = dir === 'e' || dir === 'w'
    ? origin.height
    : dirMovesTop(dir) ? origin.height - dy : origin.height + dy
  const clamped = clampPackageWidgetSize(width, height)
  return {
    x: dirMovesLeft(dir) ? origin.x + (origin.width - clamped.width) : origin.x,
    y: dirMovesTop(dir) ? origin.y + (origin.height - clamped.height) : origin.y,
    width: clamped.width,
    height: clamped.height,
  }
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
  const [size, setSize] = useState<WidgetSize | null>(readSize)
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
  const resizeRef = useRef<null | {
    pointerId: number
    dir: PackageResizeDir
    startX: number
    startY: number
    originX: number
    originY: number
    width: number
    height: number
    storedHeight: number | null
    promote: boolean
    moved: boolean
    latestSize: WidgetSize | null
    latestPos: WidgetPoint | null
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
      if (drag && event.pointerId === drag.pointerId) {
        const dx = event.clientX - drag.startX
        const dy = event.clientY - drag.startY
        if (!drag.moved && Math.hypot(dx, dy) < 4) return
        drag.moved = true
        setPos(clampPackageWidget(drag.originX + dx, drag.originY + dy, drag.width, drag.height))
      }
      const resize = resizeRef.current
      if (!resize || event.pointerId !== resize.pointerId) return
      const dx = event.clientX - resize.startX
      const dy = event.clientY - resize.startY
      if (!resize.moved && Math.hypot(dx, dy) < 4) return
      resize.moved = true
      document.body.style.cursor = resizeCursor(resize.dir)
      const next = resizePackageWidget(
        { x: resize.originX, y: resize.originY, width: resize.width, height: resize.height },
        dx,
        dy,
        resize.dir,
      )
      const nextSize: WidgetSize = {
        width: next.width,
        height: dirAffectsHeight(resize.dir) ? next.height : resize.storedHeight,
      }
      resize.latestSize = nextSize
      setSize(nextSize)
      if (!resize.promote) return
      const clamped = clampPackageWidget(next.x, next.y, nextSize.width, nextSize.height ?? resize.height)
      resize.latestPos = clamped
      setPos(clamped)
    }
    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (drag && event.pointerId === drag.pointerId) {
        const moved = drag.moved
        dragRef.current = null
        if (moved) {
          setPos((current) => {
            if (current) writePos(current)
            return current
          })
        }
      }
      const resize = resizeRef.current
      if (!resize || event.pointerId !== resize.pointerId) return
      const moved = resize.moved
      const latestSize = resize.latestSize
      const latestPos = resize.latestPos
      resizeRef.current = null
      document.body.style.cursor = ''
      if (!moved || !latestSize) return
      writeSize(latestSize)
      setSize(latestSize)
      if (!latestPos) return
      writePos(latestPos)
      setPos(latestPos)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  useEffect(() => {
    const onViewportResize = () => {
      const rect = cardRef.current?.getBoundingClientRect()
      setSize((current) => {
        if (!current) return current
        const clamped = clampPackageWidgetSize(current.width, current.height ?? PACKAGE_WIDGET_MIN_HEIGHT)
        const next: WidgetSize = {
          width: clamped.width,
          height: current.height == null ? null : clamped.height,
        }
        if (next.width === current.width && next.height === current.height) return current
        writeSize(next)
        return next
      })
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

  const onResizeDown = (dir: PackageResizeDir, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button != null && event.button !== 0) return
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    resizeRef.current = {
      pointerId: event.pointerId,
      dir,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos ? pos.x : rect.left,
      originY: pos ? pos.y : rect.top,
      width: size?.width ?? rect.width,
      height: size?.height ?? rect.height,
      storedHeight: size?.height ?? null,
      promote: pos != null || dirMovesLeft(dir) || dirMovesTop(dir),
      moved: false,
      latestSize: null,
      latestPos: null,
    }
    event.preventDefault()
    event.stopPropagation()
  }

  const toggleCollapsed = () => {
    const next = !collapsed
    try { storage()?.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
    setCollapsed(next)
  }

  const lockHeight = size?.height != null && !collapsed
  const handles = collapsed ? RESIZE_HANDLES.filter((handle) => handle.dir === 'e' || handle.dir === 'w') : RESIZE_HANDLES
  const card = (
    <section
      ref={cardRef}
      className={[
        pos ? 'fixed z-30' : 'relative mb-8 min-w-0',
        'select-none',
        size ? '' : pos ? 'w-[min(36rem,calc(100vw-1.5rem))]' : 'max-w-xl',
      ].filter(Boolean).join(' ')}
      style={{
        left: pos?.x,
        top: pos?.y,
        width: size?.width,
        height: lockHeight && size?.height != null ? size.height : undefined,
      }}
      data-section="package-usage"
    >
      <div
        className={`overflow-hidden rounded-2xl backdrop-blur-xl ${lockHeight ? 'flex h-full min-h-0 flex-col' : ''}`}
        style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}
      >
        <div className="flex shrink-0 items-center gap-2 px-3 py-2.5">
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
            className="ml-auto mr-1 rounded-md p-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className={lockHeight ? 'min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-5' : 'px-4 pb-4 sm:px-5'}>
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
      {handles.map((handle) => (
        <button
          key={handle.dir}
          type="button"
          aria-label={t(`packageUsage.resize.${handle.dir}`)}
          data-resize={handle.dir}
          onPointerDown={(event) => onResizeDown(handle.dir, event)}
          className={`absolute z-20 m-0 min-h-0 min-w-0 touch-none border-0 bg-transparent p-0 outline-none hover:bg-[var(--color-glass-border)] focus-visible:bg-[var(--color-glass-border)] ${handle.className}`}
        />
      ))}
      {!collapsed && (
        <span aria-hidden className="pointer-events-none absolute bottom-1 right-1 z-30">
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ color: 'var(--color-text-secondary)' }}>
            <path d="M11 3.5V11H3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M11 7.25V11H7.25" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </section>
  )

  if (pos && typeof document !== 'undefined') return createPortal(card, document.body)
  return card
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, RefreshCw, Wallet } from 'lucide-react'
import { fetchPackageUsage, type PackagePlan, type PackageUsageResponse } from '../../lib/api'
import { formatPackageMoney, formatPackageTime } from '../../lib/packageMoney'

const PAGE_THRESHOLD = 3

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
        <div className="min-w-0 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {plan.name}
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

export function PackageUsageSection() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PackageUsageResponse | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

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

  if (!loading && data && !data.enabled) return null

  const packages = data?.packages ?? []
  const paged = packages.length > PAGE_THRESHOLD
  const pageCount = paged ? packages.length : 1
  const safePage = Math.min(page, Math.max(0, pageCount - 1))
  const visible = paged ? packages.slice(safePage, safePage + 1) : packages
  const currency = data?.currency || 'USD'

  return (
    <section className="mb-8 min-w-0 max-w-xl" data-section="package-usage">
      <div className="mb-3 flex items-center gap-3">
        <Wallet className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        <h2 className="text-xl font-medium tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
          {t('packageUsage.section')}
        </h2>
      </div>

      <div
        className="rounded-2xl p-4 backdrop-blur-xl sm:p-5"
        style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}
      >
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
    </section>
  )
}

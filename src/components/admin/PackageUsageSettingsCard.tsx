import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Eye, EyeOff, RefreshCw, Save, Wallet } from 'lucide-react'
import {
  fetchPackageUsageConfig,
  savePackageUsageConfig,
  testPackageUsage,
  type PackageSizeTier,
  type PackageUsageConfig,
  type WidgetVisibility,
} from '../../lib/api'
import { formatPackageMoney } from '../../lib/packageMoney'

interface PackageUsageSettingsCardProps {
  visibility: WidgetVisibility
  onVisibilityChange: (visibility: WidgetVisibility) => void
  onSaveVisibility: (visibility: WidgetVisibility) => Promise<void>
}

const inputStyle = {
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-glass-border)',
  color: 'var(--color-text-primary)',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</span>}
    </label>
  )
}

export function PackageUsageSettingsCard({
  visibility,
  onVisibilityChange,
  onSaveVisibility,
}: PackageUsageSettingsCardProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<PackageUsageConfig['preset']>('newapi')
  const [baseUrl, setBaseUrl] = useState('')
  const [userId, setUserId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [timeoutSec, setTimeoutSec] = useState(10)
  const [refreshIntervalMin, setRefreshIntervalMin] = useState(5)
  const [currency, setCurrency] = useState('USD')
  const [packageDetailPath, setPackageDetailPath] = useState('')
  const [amountMode, setAmountMode] = useState<PackageUsageConfig['amountMode']>('quota')
  const [defaultTier, setDefaultTier] = useState<PackageSizeTier>('large')
  const [enabled, setEnabled] = useState(visibility.packageUsage === true)
  const [access, setAccess] = useState<'public' | 'private'>(visibility.packageUsageAccess === 'public' ? 'public' : 'private')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)

  useEffect(() => {
    setEnabled(visibility.packageUsage === true)
    setAccess(visibility.packageUsageAccess === 'public' ? 'public' : 'private')
  }, [visibility.packageUsage, visibility.packageUsageAccess])

  useEffect(() => {
    let cancelled = false
    fetchPackageUsageConfig()
      .then((config) => {
        if (cancelled) return
        setPreset(config.preset || 'newapi')
        setBaseUrl(config.baseUrl || '')
        setUserId(config.userId || '')
        setAccessToken(config.tokenPreview || '')
        setTimeoutSec(config.timeoutSec || 10)
        setRefreshIntervalMin(config.refreshIntervalMin ?? 5)
        setCurrency(config.currency || 'USD')
        setPackageDetailPath(config.packageDetailPath || '')
        setAmountMode(config.amountMode || 'quota')
        setDefaultTier(config.defaultTier === 'mini' || config.defaultTier === 'medium' || config.defaultTier === 'large' ? config.defaultTier : 'large')
      })
      .catch(() => {
        if (!cancelled) setMessage(t('admin.settings.package.load_error'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [t])

  const publishVisibility = (nextEnabled: boolean, nextAccess: 'public' | 'private') => {
    onVisibilityChange({
      ...visibility,
      packageUsage: nextEnabled,
      packageUsageAccess: nextAccess,
    })
  }

  const payload = () => ({
    preset,
    baseUrl,
    userId,
    timeoutSec,
    refreshIntervalMin,
    currency,
    packageDetailPath,
    amountMode,
    defaultTier,
    ...(accessToken && !accessToken.startsWith('•') ? { accessToken } : {}),
  })

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setMessage('')
    try {
      const savedConfig = await savePackageUsageConfig(payload())
      setAccessToken(savedConfig.tokenPreview || accessToken)
      const nextVisibility = {
        ...visibility,
        packageUsage: enabled,
        packageUsageAccess: access,
      }
      await onSaveVisibility(nextVisibility)
      setSaved(true)
      setMessageOk(true)
      setMessage(t('admin.settings.package.saved'))
      window.setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      setMessageOk(false)
      setMessage(error instanceof Error ? error.message : t('admin.settings.package.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setMessage('')
    try {
      const result = await testPackageUsage(payload())
      if (!result.ok) {
        setMessageOk(false)
        setMessage(t(`packageUsage.error.${result.error || 'generic'}`, { defaultValue: t('packageUsage.error.generic') }))
        return
      }
      const balance = result.balance === null ? '—' : formatPackageMoney(result.balance, result.currency)
      setMessageOk(true)
      setMessage(t('admin.settings.package.test_ok', { balance, count: result.packages.length }))
    } catch (error) {
      setMessageOk(false)
      setMessage(error instanceof Error ? error.message : t('admin.settings.package.test_error'))
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6" style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
        <div className="h-12 w-48 rounded" style={{ background: 'var(--color-bg-tertiary)' }} />
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-6 backdrop-blur-xl"
      style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}
    >
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/20 to-orange-600/20">
          <Wallet className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('admin.settings.package.title')}</h3>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('admin.settings.package.subtitle')}</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(['newapi', 'custom'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPreset(item)}
            className="rounded-full px-3 py-1.5 text-sm"
            style={{
              background: preset === item ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
              color: preset === item ? 'white' : 'var(--color-text-secondary)',
            }}
          >
            {t(`admin.settings.package.preset_${item}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('admin.settings.package.base_url')} hint={t('admin.settings.package.base_url_hint')}>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://nowcoding.ai" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label={t('admin.settings.package.user_id')} hint={t('admin.settings.package.user_id_hint')}>
          <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="318" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label={t('admin.settings.package.token')} hint={t('admin.settings.package.token_hint')}>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              autoComplete="off"
              className="w-full rounded-xl px-4 py-3 pr-10 text-sm outline-none"
              style={inputStyle}
            />
            <button type="button" onClick={() => setShowToken((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label={t('admin.settings.package.toggle_token')}>
              {showToken ? <EyeOff className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} /> : <Eye className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />}
            </button>
          </div>
        </Field>
        <Field label={t('admin.settings.package.currency')}>
          <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}>
            <option value="USD">USD</option>
            <option value="CNY">CNY</option>
          </select>
        </Field>
        <Field label={t('admin.settings.package.timeout')}>
          <input type="number" min={1} max={120} value={timeoutSec} onChange={(event) => setTimeoutSec(Number(event.target.value))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label={t('admin.settings.package.interval')} hint={t('admin.settings.package.interval_hint')}>
          <input type="number" min={0} max={1440} value={refreshIntervalMin} onChange={(event) => setRefreshIntervalMin(Number(event.target.value))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label={t('admin.settings.package.amount_mode')} hint={t('admin.settings.package.amount_mode_hint')}>
          <select value={amountMode} onChange={(event) => setAmountMode(event.target.value as PackageUsageConfig['amountMode'])} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}>
            <option value="quota">{t('admin.settings.package.amount_quota')}</option>
            <option value="money">{t('admin.settings.package.amount_money')}</option>
          </select>
        </Field>
        <Field label={t('admin.settings.package.detail_path')} hint={t('admin.settings.package.detail_path_hint')}>
          <input value={packageDetailPath} onChange={(event) => setPackageDetailPath(event.target.value)} placeholder="/api/subscription/self" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
        </Field>
        <div className="md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('admin.settings.package.default_tier')}</span>
          <div className="flex flex-wrap gap-2">
            {(['mini', 'medium', 'large'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={defaultTier === item}
                onClick={() => setDefaultTier(item)}
                className="rounded-full px-3 py-1.5 text-sm"
                style={{
                  background: defaultTier === item ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                  color: defaultTier === item ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                {t(`admin.settings.package.tier_${item}`)}
              </button>
            ))}
          </div>
          <span className="mt-1 block text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('admin.settings.package.default_tier_hint')}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const next = !enabled
            setEnabled(next)
            publishVisibility(next, access)
          }}
          className="rounded-full px-3 py-1.5 text-sm"
          style={{
            background: enabled ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
            color: enabled ? 'white' : 'var(--color-text-secondary)',
          }}
        >
          {enabled ? t('admin.settings.package.enabled') : t('admin.settings.package.disabled')}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = access === 'private' ? 'public' : 'private'
            setAccess(next)
            publishVisibility(enabled, next)
          }}
          className="rounded-full px-3 py-1.5 text-sm"
          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
        >
          {access === 'private' ? t('admin.settings.widget.access_private_label') : t('admin.settings.widget.access_public_label')}
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {t('admin.settings.package.shape_hint')}
      </p>

      {message && (
        <div
          className="mt-4 rounded-xl px-3 py-2 text-sm"
          style={{
            background: messageOk ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            color: messageOk ? 'var(--color-text-primary)' : 'var(--color-text-primary)',
          }}
        >
          {message}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => { void handleTest() }} disabled={testing} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
          <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
          {testing ? t('admin.settings.package.testing') : t('admin.settings.package.test')}
        </button>
        <button type="button" onClick={() => { void handleSave() }} disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white" style={{ background: 'var(--color-primary)' }}>
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? t('admin.settings.package.saving') : t('admin.settings.package.save')}
        </button>
      </div>
    </div>
  )
}

import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Maximize2, Minimize2, Square } from 'lucide-react'

const loadMonitors = () => import('../monitorBundle')
const SystemMonitorCard = lazy(() => loadMonitors().then((m) => ({ default: m.SystemMonitorCard })))
const HardwareIdentityCard = lazy(() => loadMonitors().then((m) => ({ default: m.HardwareIdentityCard })))
const VitalSignsCard = lazy(() => loadMonitors().then((m) => ({ default: m.VitalSignsCard })))
const NetworkTelemetryCard = lazy(() => loadMonitors().then((m) => ({ default: m.NetworkTelemetryCard })))
const ProcessMatrixCard = lazy(() => loadMonitors().then((m) => ({ default: m.ProcessMatrixCard })))

type WidgetSizeMode = 'S' | 'M' | 'L'
type WidgetId = 'systemMonitor' | 'hardwareIdentity' | 'vitalSigns' | 'networkTelemetry' | 'processMatrix'

interface SystemWidgetsSectionProps {
  visibility: Partial<Record<WidgetId, boolean>>
  widgetSizeMode: WidgetSizeMode
  onWidgetSizeModeChange: (mode: WidgetSizeMode) => void
}

const WIDGETS: { id: WidgetId; Component: ComponentType<{ forceCollapsed?: boolean; className?: string }> }[] = [
  { id: 'systemMonitor', Component: SystemMonitorCard },
  { id: 'hardwareIdentity', Component: HardwareIdentityCard },
  { id: 'vitalSigns', Component: VitalSignsCard },
  { id: 'networkTelemetry', Component: NetworkTelemetryCard },
  { id: 'processMatrix', Component: ProcessMatrixCard },
]

const SIZE_MODES = [
  { key: 'S' as const, icon: Minimize2, titleKey: 'monitor.widget_size_small' },
  { key: 'M' as const, icon: Square, titleKey: 'monitor.widget_size_medium' },
  { key: 'L' as const, icon: Maximize2, titleKey: 'monitor.widget_size_large' },
]

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 768))
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const onChange = () => setDesktop(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return desktop
}

function ChipFallback() {
  return (
    <div
      className="h-12 rounded-2xl"
      style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}
    />
  )
}

export function SystemWidgetsSection({
  visibility,
  widgetSizeMode,
  onWidgetSizeModeChange,
}: SystemWidgetsSectionProps) {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const visible = WIDGETS.filter((widget) => visibility[widget.id] !== false)
  const visibleKey = visible.map((widget) => widget.id).join('|')
  const [expandedId, setExpandedId] = useState<WidgetId | null>(null)

  useEffect(() => {
    const ids = visibleKey.split('|').filter(Boolean) as WidgetId[]
    if (ids.length === 0) return
    setExpandedId((current) => (current && ids.includes(current) ? current : ids[0]))
  }, [visibleKey])

  if (visible.length === 0) return null

  const expanded = visible.find((widget) => widget.id === expandedId) ?? visible[0]
  const showExpanded = isDesktop && widgetSizeMode !== 'S'
  const chips = showExpanded ? visible.filter((widget) => widget.id !== expanded.id) : visible

  const selectWidget = (id: WidgetId) => {
    setExpandedId(id)
    if (isDesktop && widgetSizeMode === 'S') onWidgetSizeModeChange('M')
  }

  return (
    <section className="mb-8 min-w-0" data-section="system">
      <div className="mb-3 flex items-center gap-3">
        <Activity className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        <h2 className="text-xl font-medium tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
          {t('monitor.section', '系统')}
        </h2>
        <div
          className="ml-auto flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ background: 'var(--color-bg-tertiary)' }}
        >
          {SIZE_MODES.map(({ key, icon: Icon, titleKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => onWidgetSizeModeChange(key)}
              className={`rounded-md p-1.5 transition-colors ${widgetSizeMode === key ? 'shadow-sm' : ''}`}
              style={{
                background: widgetSizeMode === key ? 'var(--color-glass)' : 'transparent',
                color: widgetSizeMode === key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}
              title={t(titleKey, key)}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1" data-monitor-row>
          {chips.map(({ id, Component }) => (
            <div
              key={id}
              role="button"
              tabIndex={0}
              className="w-[240px] shrink-0 cursor-pointer text-left"
              onClick={() => selectWidget(id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  selectWidget(id)
                }
              }}
            >
              <Suspense fallback={<ChipFallback />}>
                <Component forceCollapsed className="pointer-events-none" />
              </Suspense>
            </div>
          ))}
        </div>
      )}

      {showExpanded && (
        <div className="mt-3 hidden md:block">
          <Suspense fallback={<ChipFallback />}>
            <expanded.Component forceCollapsed={widgetSizeMode === 'L' ? false : undefined} />
          </Suspense>
        </div>
      )}
    </section>
  )
}

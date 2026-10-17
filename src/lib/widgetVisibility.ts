import type { WidgetVisibility } from './api'

const FIELD_KINDS = {
  systemMonitor: 'boolean',
  hardwareIdentity: 'boolean',
  vitalSigns: 'boolean',
  networkTelemetry: 'boolean',
  processMatrix: 'boolean',
  dockMiniMonitor: 'boolean',
  mobileTicker: 'boolean',
  aiAssistant: 'boolean',
  packageUsage: 'boolean',
  systemMonitorAccess: 'access',
  hardwareIdentityAccess: 'access',
  vitalSignsAccess: 'access',
  networkTelemetryAccess: 'access',
  processMatrixAccess: 'access',
  dockMiniMonitorAccess: 'access',
  mobileTickerAccess: 'access',
  aiAssistantAccess: 'access',
  packageUsageAccess: 'access',
} as const satisfies Record<keyof WidgetVisibility, 'boolean' | 'access'>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isAccessMode(value: unknown): value is 'public' | 'private' {
  return value === 'public' || value === 'private'
}

/** 只接受普通的组件可见性对象。点击事件等宿主对象会被排除。 */
export function isWidgetVisibility(value: unknown): value is WidgetVisibility {
  if (!isPlainObject(value)) return false

  return Object.entries(value).every(([key, field]) => {
    const kind = FIELD_KINDS[key as keyof typeof FIELD_KINDS]
    if (!kind) return false
    if (field === undefined) return true
    if (kind === 'boolean') return typeof field === 'boolean'
    return isAccessMode(field)
  })
}

/** 显式传入的可见性才覆盖当前状态；事件或其他参数回退到当前状态。 */
export function resolveWidgetVisibility(next: unknown, current: WidgetVisibility): WidgetVisibility {
  return isWidgetVisibility(next) ? next : current
}

import type { WidgetVisibility } from './api'

/** 与套餐尺寸档位一样，只记在本机，不写入站点设置。 */
export const MINIMAL_MODE_STORAGE_KEY = 'nowen-minimal-mode'

/** 同一标签页内同步多个 useMinimalMode（storage 事件只跨标签页）。 */
export const MINIMAL_MODE_CHANGE_EVENT = 'nowen-minimal-mode-change'

/**
 * 极简模式要收起的运维组件。沿用 widgetVisibility 的布尔开关，
 * 不改访问模式，也不动 AI 助手（它不是首页仪表卡片）。
 * 进程矩阵即服务蜂巢 / Docker。
 */
const OPS_WIDGET_KEYS = [
  'systemMonitor',
  'hardwareIdentity',
  'vitalSigns',
  'networkTelemetry',
  'processMatrix',
  'dockMiniMonitor',
  'mobileTicker',
  'packageUsage',
] as const satisfies readonly (keyof WidgetVisibility)[]

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readMinimalMode(storage: Pick<Storage, 'getItem'> | null = browserStorage()): boolean {
  if (!storage) return false
  try {
    return storage.getItem(MINIMAL_MODE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeMinimalMode(
  enabled: boolean,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(MINIMAL_MODE_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    return
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MINIMAL_MODE_CHANGE_EVENT, { detail: enabled }))
  }
}

type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'altKey' | 'metaKey' | 'ctrlKey' | 'shiftKey'> & {
  code?: string
  repeat?: boolean
}

/** Alt+M。避开 ⌘/Ctrl 组合，避免和现有的 ⌘K / ⌘N / ⌘J 以及浏览器快捷键撞车。macOS 上 Option+M 的 key 可能是 µ，所以同时认 code。 */
export function isMinimalModeShortcut(event: ShortcutEvent): boolean {
  if (event.repeat) return false
  if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return false
  return event.key.toLowerCase() === 'm' || event.code === 'KeyM'
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const editable = target.closest('input, textarea, select, [contenteditable]')
  if (!editable) return false
  if (
    editable instanceof HTMLInputElement
    || editable instanceof HTMLTextAreaElement
    || editable instanceof HTMLSelectElement
  ) {
    return true
  }
  return editable instanceof HTMLElement && editable.isContentEditable
}

/** 在现有可见性上临时关掉运维组件。不修改入参，关闭极简模式时继续用原来的对象。 */
export function applyMinimalWidgetVisibility<T extends WidgetVisibility>(visibility: T): T {
  const next = { ...visibility }
  for (const key of OPS_WIDGET_KEYS) {
    next[key] = false
  }
  return next
}

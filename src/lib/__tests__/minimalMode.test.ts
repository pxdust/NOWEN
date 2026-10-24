import { describe, expect, it, vi } from 'vitest'
import type { WidgetVisibility } from '../api'
import {
  MINIMAL_MODE_STORAGE_KEY,
  applyMinimalWidgetVisibility,
  isEditableShortcutTarget,
  isMinimalModeShortcut,
  readMinimalMode,
  writeMinimalMode,
} from '../minimalMode'

function memoryStorage(initial?: Record<string, string>) {
  const data = new Map(Object.entries(initial ?? {}))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    dump: () => data,
  }
}

const visibility: WidgetVisibility = {
  systemMonitor: true,
  hardwareIdentity: true,
  vitalSigns: true,
  networkTelemetry: true,
  processMatrix: true,
  dockMiniMonitor: true,
  mobileTicker: true,
  aiAssistant: true,
  packageUsage: true,
  packageUsageAccess: 'private',
  systemMonitorAccess: 'public',
  aiAssistantAccess: 'private',
}

describe('minimal mode storage', () => {
  it('defaults off and round-trips on the local UI preference key', () => {
    const storage = memoryStorage()
    expect(readMinimalMode(storage)).toBe(false)
    writeMinimalMode(true, storage)
    expect(storage.dump().get(MINIMAL_MODE_STORAGE_KEY)).toBe('1')
    expect(readMinimalMode(storage)).toBe(true)
    writeMinimalMode(false, storage)
    expect(readMinimalMode(storage)).toBe(false)
  })
})

describe('applyMinimalWidgetVisibility', () => {
  it('turns off ops widgets and leaves the saved object alone', () => {
    const masked = applyMinimalWidgetVisibility(visibility)
    expect(masked).toMatchObject({
      systemMonitor: false,
      processMatrix: false,
      packageUsage: false,
      dockMiniMonitor: false,
      aiAssistant: true,
      packageUsageAccess: 'private',
    })
    expect(visibility.packageUsage).toBe(true)
    expect(masked).not.toBe(visibility)
  })
})

describe('Alt+M shortcut', () => {
  it('accepts Alt+M and ignores text fields and browser chords', () => {
    expect(isMinimalModeShortcut({ key: 'm', code: 'KeyM', altKey: true, metaKey: false, ctrlKey: false, shiftKey: false })).toBe(true)
    expect(isMinimalModeShortcut({ key: 'µ', code: 'KeyM', altKey: true, metaKey: false, ctrlKey: false, shiftKey: false })).toBe(true)
    expect(isMinimalModeShortcut({ key: 'm', code: 'KeyM', altKey: true, metaKey: true, ctrlKey: false, shiftKey: false })).toBe(false)
    const input = document.createElement('input')
    expect(isEditableShortcutTarget(input)).toBe(true)
    expect(isEditableShortcutTarget(document.body)).toBe(false)
  })

  it('notifies the current tab', () => {
    const listener = vi.fn()
    window.addEventListener('nowen-minimal-mode-change', listener)
    writeMinimalMode(true, memoryStorage())
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('nowen-minimal-mode-change', listener)
  })
})

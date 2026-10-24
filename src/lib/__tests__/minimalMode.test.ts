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
  it('defaults off and round-trips the same key style as other local UI prefs', () => {
    const storage = memoryStorage()
    expect(readMinimalMode(storage)).toBe(false)

    writeMinimalMode(true, storage)
    expect(storage.dump().get(MINIMAL_MODE_STORAGE_KEY)).toBe('1')
    expect(readMinimalMode(storage)).toBe(true)

    writeMinimalMode(false, storage)
    expect(readMinimalMode(storage)).toBe(false)
  })

  it('ignores a broken storage', () => {
    const storage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(readMinimalMode(storage)).toBe(false)
    expect(() => writeMinimalMode(true, storage)).not.toThrow()
  })
})

describe('applyMinimalWidgetVisibility', () => {
  it('turns off ops widgets without mutating the saved visibility', () => {
    const masked = applyMinimalWidgetVisibility(visibility)

    expect(masked).toMatchObject({
      systemMonitor: false,
      hardwareIdentity: false,
      vitalSigns: false,
      networkTelemetry: false,
      processMatrix: false,
      dockMiniMonitor: false,
      mobileTicker: false,
      packageUsage: false,
      aiAssistant: true,
      packageUsageAccess: 'private',
      systemMonitorAccess: 'public',
      aiAssistantAccess: 'private',
    })
    expect(visibility.packageUsage).toBe(true)
    expect(visibility.systemMonitor).toBe(true)
    expect(masked).not.toBe(visibility)
  })
})

describe('Alt+M shortcut', () => {
  it('accepts Alt+M and macOS Option+M (code KeyM)', () => {
    expect(isMinimalModeShortcut({ key: 'm', code: 'KeyM', altKey: true, metaKey: false, ctrlKey: false, shiftKey: false })).toBe(true)
    expect(isMinimalModeShortcut({ key: 'M', altKey: true, metaKey: false, ctrlKey: false, shiftKey: false })).toBe(true)
    expect(isMinimalModeShortcut({ key: 'µ', code: 'KeyM', altKey: true, metaKey: false, ctrlKey: false, shiftKey: false })).toBe(true)
  })

  it('ignores repeats and chords that already belong to the app or the browser', () => {
    expect(isMinimalModeShortcut({ key: 'm', altKey: true, metaKey: false, ctrlKey: false, shiftKey: false, repeat: true })).toBe(false)
    expect(isMinimalModeShortcut({ key: 'm', code: 'KeyM', altKey: true, metaKey: true, ctrlKey: false, shiftKey: false })).toBe(false)
    expect(isMinimalModeShortcut({ key: 'm', code: 'KeyM', altKey: true, metaKey: false, ctrlKey: true, shiftKey: false })).toBe(false)
    expect(isMinimalModeShortcut({ key: 'k', code: 'KeyK', altKey: true, metaKey: false, ctrlKey: false, shiftKey: false })).toBe(false)
    expect(isMinimalModeShortcut({ key: 'm', code: 'KeyM', altKey: false, metaKey: true, ctrlKey: false, shiftKey: false })).toBe(false)
  })

  it('does not steal the shortcut from text fields', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    expect(isEditableShortcutTarget(input)).toBe(true)
    expect(isEditableShortcutTarget(document.body)).toBe(false)
    input.remove()
  })
})

describe('writeMinimalMode events', () => {
  it('notifies the current tab when storage is available', () => {
    const storage = memoryStorage()
    const listener = vi.fn()
    window.addEventListener('nowen-minimal-mode-change', listener)
    writeMinimalMode(true, storage)
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('nowen-minimal-mode-change', listener)
  })
})

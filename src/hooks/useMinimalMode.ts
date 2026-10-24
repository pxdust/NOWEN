import { useCallback, useEffect, useState } from 'react'
import {
  MINIMAL_MODE_CHANGE_EVENT,
  MINIMAL_MODE_STORAGE_KEY,
  readMinimalMode,
  writeMinimalMode,
} from '../lib/minimalMode'

export function useMinimalMode() {
  const [enabled, setEnabled] = useState(() => readMinimalMode())

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== MINIMAL_MODE_STORAGE_KEY) return
      setEnabled(readMinimalMode())
    }
    const syncFromThisTab = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail
      setEnabled(typeof detail === 'boolean' ? detail : readMinimalMode())
    }
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener(MINIMAL_MODE_CHANGE_EVENT, syncFromThisTab)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener(MINIMAL_MODE_CHANGE_EVENT, syncFromThisTab)
    }
  }, [])

  const setMinimalMode = useCallback((next: boolean) => {
    writeMinimalMode(next)
    setEnabled(next)
  }, [])

  const toggle = useCallback(() => {
    const next = !readMinimalMode()
    writeMinimalMode(next)
    setEnabled(next)
  }, [])

  return { enabled, toggle, setEnabled: setMinimalMode }
}

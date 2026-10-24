/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../lib/i18n'
import type { WidgetVisibility } from '../../../lib/api'
import { WidgetSettingsCard } from '../WidgetSettingsCard'

const visibility: WidgetVisibility = {
  systemMonitor: false,
  hardwareIdentity: false,
  vitalSigns: false,
  networkTelemetry: false,
  processMatrix: false,
  dockMiniMonitor: false,
  mobileTicker: false,
  aiAssistant: false,
  packageUsage: false,
  packageUsageAccess: 'private',
}

function renderCard(onSave = vi.fn().mockResolvedValue(undefined), onChange = vi.fn()) {
  render(
    <WidgetSettingsCard
      visibility={visibility}
      onChange={onChange}
      onSave={onSave}
      isSaving={false}
      success={false}
      error=""
    />,
  )
  return { onSave, onChange }
}

afterEach(() => {
  cleanup()
})

describe('WidgetSettingsCard 保存', () => {
  it('点击保存时不把点击事件传给 onSave', () => {
    const { onSave } = renderCard()

    fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]).toEqual([])
  })

  it('切换套餐额度后保存仍然只调用无参 onSave', () => {
    const { onSave, onChange } = renderCard()

    fireEvent.click(screen.getByText('套餐额度'))
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      packageUsage: true,
      packageUsageAccess: 'private',
    }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]).toEqual([])
  })
})

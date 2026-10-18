/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../lib/i18n'
import type { WidgetVisibility } from '../../../lib/api'
import { fetchPackageUsageConfig, savePackageUsageConfig } from '../../../lib/api'
import { PackageUsageSettingsCard } from '../PackageUsageSettingsCard'

vi.mock('../../../lib/api', () => ({
  fetchPackageUsageConfig: vi.fn(),
  savePackageUsageConfig: vi.fn(),
  testPackageUsage: vi.fn(),
}))

const mockedFetch = vi.mocked(fetchPackageUsageConfig)
const mockedSave = vi.mocked(savePackageUsageConfig)

const visibility: WidgetVisibility = {
  packageUsage: true,
  packageUsageAccess: 'private',
}

const config = {
  preset: 'newapi' as const,
  baseUrl: 'https://nowcoding.ai',
  userId: '318',
  timeoutSec: 10,
  refreshIntervalMin: 5,
  currency: 'USD',
  packageDetailPath: '',
  amountMode: 'quota' as const,
  defaultTier: 'medium' as const,
  hasToken: true,
  tokenPreview: '••••••1234',
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  mockedFetch.mockReset()
  mockedSave.mockReset()
  mockedFetch.mockResolvedValue(config)
  mockedSave.mockImplementation(async (incoming) => ({
    ...config,
    ...incoming,
    hasToken: true,
    tokenPreview: config.tokenPreview,
  }))
})

describe('PackageUsageSettingsCard 默认尺寸', () => {
  it('读取管理员默认档，保存时写回所选档，且不提交令牌明文', async () => {
    const onSaveVisibility = vi.fn().mockResolvedValue(undefined)
    render(
      <PackageUsageSettingsCard
        visibility={visibility}
        onVisibilityChange={vi.fn()}
        onSaveVisibility={onSaveVisibility}
      />,
    )

    const medium = await screen.findByRole('button', { name: '适中' })
    expect(medium).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '迷你' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: '迷你' }))
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

    await waitFor(() => {
      expect(onSaveVisibility).toHaveBeenCalledWith(expect.objectContaining({
        packageUsage: true,
        packageUsageAccess: 'private',
      }))
    })
    expect(mockedSave).toHaveBeenCalledTimes(1)
    const payload = mockedSave.mock.calls[0][0]
    expect(payload.defaultTier).toBe('mini')
    expect(payload.accessToken).toBeUndefined()
    expect(JSON.stringify(payload)).not.toContain('1234')
  })
})

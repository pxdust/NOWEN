/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../lib/i18n'
import { PackageUsageSection } from '../PackageUsageSection'
import { fetchPackageUsage } from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  fetchPackageUsage: vi.fn(),
}))

const mockedFetch = vi.mocked(fetchPackageUsage)

afterEach(() => {
  cleanup()
})

beforeEach(async () => {
  await i18n.changeLanguage('zh')
  mockedFetch.mockReset()
})

describe('PackageUsageSection quota modes', () => {
  it('按每个套餐的实际字段显示周限额、仅日限额、双限额和不限额', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      enabled: true,
      balance: 3.68,
      currency: 'USD',
      refreshIntervalMin: 0,
      updatedAt: '2026-10-17T00:00:00.000Z',
      packages: [
        {
          id: 'week',
          name: '周卡',
          quotaMode: 'weekly',
          weekly: { used: 1, limit: 4 },
        },
        {
          id: 'day',
          name: '日卡',
          quotaMode: 'daily',
          daily: { used: 2, unlimited: true },
        },
        {
          id: 'both',
          name: '双周期',
          quotaMode: 'daily_and_weekly',
          daily: { used: 1, limit: 2 },
          weekly: { used: 3, limit: 8 },
        },
      ],
    })

    render(<PackageUsageSection />)

    const week = (await screen.findByText('周卡')).closest('.rounded-xl') as HTMLElement
    const day = screen.getByText('日卡').closest('.rounded-xl') as HTMLElement
    const both = screen.getByText('双周期').closest('.rounded-xl') as HTMLElement

    expect(within(week).getByText('周限额')).toBeInTheDocument()
    expect(within(week).queryByText('仅日限额')).toBeNull()
    expect(within(week).queryByText('日限额')).toBeNull()
    expect(within(week).queryByText('周总限额')).toBeNull()

    expect(within(day).getByText('仅日限额')).toBeInTheDocument()
    expect(within(day).getByText(/不限额/)).toBeInTheDocument()
    expect(within(day).queryByText('周限额')).toBeNull()
    expect(day.querySelector('.h-1\\.5')).toBeNull()

    expect(within(both).getByText('日限额')).toBeInTheDocument()
    expect(within(both).getByText('周总限额')).toBeInTheDocument()
    expect(within(both).queryByText('仅日限额')).toBeNull()
    expect(within(both).queryByText('周限额')).toBeNull()
    expect(both.querySelectorAll('.h-1\\.5')).toHaveLength(2)
  })
})

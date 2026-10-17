/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../lib/i18n'
import { PackageUsageSection } from '../PackageUsageSection'
import { fetchPackageUsage } from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  fetchPackageUsage: vi.fn(),
}))

const mockedFetch = vi.mocked(fetchPackageUsage)
const memory = new Map<string, string>()

afterEach(() => {
  cleanup()
})

beforeEach(async () => {
  memory.clear()
  window.localStorage.getItem = (key: string) => memory.get(key) ?? null
  window.localStorage.setItem = (key: string, value: string) => { memory.set(key, String(value)) }
  window.localStorage.clear = () => { memory.clear() }
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
    expect(within(week).queryByText('每日额度')).toBeNull()
    expect(within(week).queryByText('每周额度')).toBeNull()
    expect(within(week).queryByText('周日限额')).toBeNull()

    expect(within(day).getByText('仅日限额')).toBeInTheDocument()
    expect(within(day).getByText(/不限额/)).toBeInTheDocument()
    expect(within(day).queryByText('周限额')).toBeNull()
    expect(within(day).queryByText('周日限额')).toBeNull()
    expect(day.querySelector('.h-1\\.5')).toBeNull()

    expect(within(both).getByText('周日限额')).toBeInTheDocument()
    expect(within(both).getByText('每日额度')).toBeInTheDocument()
    expect(within(both).getByText('每周额度')).toBeInTheDocument()
    expect(within(both).queryByText('仅日限额')).toBeNull()
    expect(within(both).queryByText('周限额')).toBeNull()
    expect(within(both).queryByText('周总限额')).toBeNull()
    expect(both.querySelectorAll('.h-1\\.5')).toHaveLength(2)
  })

  it('按配额换算后的日周金额显示在两根进度条上', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      enabled: true,
      balance: 3.68,
      currency: 'USD',
      refreshIntervalMin: 0,
      updatedAt: '2026-10-17T00:00:00.000Z',
      packages: [{
        id: '4517',
        name: '【双休套餐】Codex 月卡 1000$',
        quotaMode: 'daily_and_weekly',
        daysLeft: 23,
        daily: { used: 0.04, limit: 50 },
        weekly: { used: 153.75, limit: 250 },
      }],
    })

    render(<PackageUsageSection />)
    const card = (await screen.findByText('【双休套餐】Codex 月卡 1000$')).closest('.rounded-xl') as HTMLElement
    expect(within(card).getByText('周日限额')).toBeInTheDocument()
    expect(within(card).getByText('每日额度')).toBeInTheDocument()
    expect(within(card).getByText('每周额度')).toBeInTheDocument()
    expect(within(card).getByText('$0.04 / $50.00')).toBeInTheDocument()
    expect(within(card).getByText('$153.75 / $250.00')).toBeInTheDocument()
    expect(within(card).queryByText('仅日限额')).toBeNull()
  })

  it('可以收起成一行摘要，并拖到屏幕上的新位置', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      enabled: true,
      balance: 3.68,
      currency: 'USD',
      refreshIntervalMin: 0,
      updatedAt: '2026-10-17T00:00:00.000Z',
      packages: [
        { id: 'both', name: '双休套餐', quotaMode: 'daily_and_weekly', daily: { used: 1, limit: 2 }, weekly: { used: 3, limit: 8 } },
      ],
    })

    render(<PackageUsageSection />)
    expect(await screen.findByText('周日限额')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '收起套餐' }))
    expect(screen.queryByText('每日额度')).toBeNull()
    expect(screen.queryByText('每周额度')).toBeNull()
    expect(screen.getByText(/双休套餐/)).toBeInTheDocument()
    expect(window.localStorage.getItem('nowen-package-widget-collapsed')).toBe('1')

    fireEvent.click(screen.getByRole('button', { name: '展开套餐' }))
    expect(screen.getByText('每日额度')).toBeInTheDocument()

    const section = document.querySelector('[data-section="package-usage"]') as HTMLElement
    section.getBoundingClientRect = () => ({
      x: 12,
      y: 24,
      left: 12,
      top: 24,
      width: 320,
      height: 180,
      right: 332,
      bottom: 204,
      toJSON() { return {} },
    })
    const grip = screen.getByRole('button', { name: '拖动套餐' })
    fireEvent.pointerDown(grip, { clientX: 20, clientY: 30, pointerId: 1, button: 0 })
    fireEvent.pointerMove(window, { clientX: 90, clientY: 70, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 90, clientY: 70, pointerId: 1 })

    const placed = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(placed.style.left).toBe('82px')
    expect(placed.style.top).toBe('64px')
    expect(JSON.parse(window.localStorage.getItem('nowen-package-widget-pos') || '{}')).toEqual({ x: 82, y: 64 })
  })
})

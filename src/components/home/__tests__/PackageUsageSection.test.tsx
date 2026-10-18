/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../lib/i18n'
import {
  PACKAGE_CAROUSEL_MS,
  PackageUsageSection,
  primaryQuotaSide,
  resolvePackageTier,
  ringLayout,
} from '../PackageUsageSection'
import { fetchPackageUsage } from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  fetchPackageUsage: vi.fn(),
}))

const mockedFetch = vi.mocked(fetchPackageUsage)
const memory = new Map<string, string>()

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

function expectSquarePackageShell() {
  const shell = document.querySelector('[data-section="package-usage"] .overflow-hidden.backdrop-blur-xl') as HTMLElement
  expect(shell).toBeTruthy()
  expect(shell.className).toContain('rounded-none')
  expect(shell.className).not.toContain('rounded-2xl')
  expect(shell.className).not.toContain('rounded-[28px]')
}

const sampleUsage = {
  ok: true as const,
  enabled: true,
  balance: 3.68,
  currency: 'USD',
  refreshIntervalMin: 0,
  updatedAt: '2026-10-17T00:00:00.000Z',
  packages: [{
    id: '4517',
    name: '【双休套餐】Codex 月卡 1000$',
    quotaMode: 'daily_and_weekly' as const,
    daysLeft: 23,
    daily: { used: 0.04, limit: 50 },
    weekly: { used: 153.75, limit: 250 },
  }],
}

beforeEach(async () => {
  memory.clear()
  setViewport(1280, 800)
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

    const week = (await screen.findByText('周卡')).closest('[data-density]') as HTMLElement
    const day = screen.getByText('日卡').closest('[data-density]') as HTMLElement
    const both = screen.getByText('双周期').closest('[data-density]') as HTMLElement

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
    const card = (await screen.findByText('【双休套餐】Codex 月卡 1000$')).closest('[data-density]') as HTMLElement
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

describe('套餐尺寸档', () => {
  it('按日、周窗口决定单环或嵌套双环，适中优先周额度', () => {
    expect(PACKAGE_CAROUSEL_MS).toBe(5000)
    expect(resolvePackageTier(null, 'mini')).toBe('mini')
    expect(resolvePackageTier('medium', 'mini')).toBe('medium')
    expect(resolvePackageTier('nope', 'nope')).toBe('large')

    expect(ringLayout({ name: '日', quotaMode: 'daily', daily: { used: 24, limit: 50 } }))
      .toEqual({ mode: 'single', side: 'daily' })
    expect(ringLayout({ name: '周', quotaMode: 'weekly', weekly: { used: 153, limit: 250 } }))
      .toEqual({ mode: 'single', side: 'weekly' })
    expect(ringLayout({
      name: '双',
      quotaMode: 'daily_and_weekly',
      daily: { used: 24, limit: 50 },
      weekly: { used: 153, limit: 250 },
    })).toEqual({ mode: 'nested', outer: 'weekly', inner: 'daily' })
    expect(ringLayout({ name: '空', quotaMode: 'none' })).toEqual({ mode: 'none' })
    expect(primaryQuotaSide({ name: '双', daily: { used: 1, limit: 2 }, weekly: { used: 3, limit: 8 } })).toBe('weekly')
    expect(primaryQuotaSide({ name: '日', daily: { used: 1, limit: 2 } })).toBe('daily')
  })

  it('去掉自由缩放，旧的宽高记录不再决定卡片尺寸', async () => {
    window.localStorage.setItem('nowen-package-widget-size', JSON.stringify({ width: 460, height: 320 }))
    mockedFetch.mockResolvedValue(sampleUsage)
    render(<PackageUsageSection />)
    await screen.findByText('每周额度')

    const section = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(section.getAttribute('data-tier')).toBe('large')
    expectSquarePackageShell()
    expect(section.style.width).toBe('')
    expect(section.style.height).toBe('')
    expect(document.querySelector('[data-resize]')).toBeNull()
    expect(screen.queryByRole('button', { name: '从右下角调整套餐大小' })).toBeNull()
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(window.localStorage.getItem('nowen-package-widget-size')).toBe(JSON.stringify({ width: 460, height: 320 }))
  })

  it('管理员默认迷你，右键菜单可以改成个人档并盖过默认值', async () => {
    mockedFetch.mockResolvedValue({ ...sampleUsage, defaultTier: 'mini' })
    const first = render(<PackageUsageSection />)
    const nested = await screen.findByRole('img', { name: /周限额 153.75\/250/ })
    expect(nested).toHaveAttribute('data-ring-mode', 'nested')
    expect(nested).toHaveAttribute('data-ring-outer', 'weekly')
    expect(nested).toHaveAttribute('data-ring-inner', 'daily')
    expect(screen.getByText('0.04/50')).toBeInTheDocument()
    expect(screen.getByText('153.75/250')).toBeInTheDocument()
    expect(screen.queryByText('每日额度')).toBeNull()
    expect(screen.queryByRole('tab', { name: '迷你' })).toBeNull()

    const section = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(section.getAttribute('data-tier')).toBe('mini')
    expectSquarePackageShell()
    fireEvent.contextMenu(section, { clientX: 40, clientY: 48 })
    const menu = screen.getByRole('menu', { name: '套餐尺寸' })
    expect(within(menu).getByRole('menuitemradio', { name: '迷你' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: '大' }))

    expect(screen.queryByRole('menu')).toBeNull()
    expect(await screen.findByText('每日额度')).toBeInTheDocument()
    expect(screen.getByText('每周额度')).toBeInTheDocument()
    expect(document.querySelector('[data-section="package-usage"]')?.getAttribute('data-tier')).toBe('large')
    expect(window.localStorage.getItem('nowen-package-widget-tier')).toBe('large')
    expect(window.localStorage.getItem('nowen-package-widget-size')).toBeNull()

    first.unmount()
    render(<PackageUsageSection />)
    expect(await screen.findByText('周日限额')).toBeInTheDocument()
    expect(document.querySelector('[data-section="package-usage"]')?.getAttribute('data-tier')).toBe('large')
  })

  it('迷你按窗口画单环，适中只留周进度，大档保留到期和重置', async () => {
    const dailyOnly = {
      ...sampleUsage,
      defaultTier: 'mini' as const,
      packages: [{ id: 'day', name: '日卡', quotaMode: 'daily' as const, daily: { used: 24, limit: 50 } }],
    }
    mockedFetch.mockResolvedValue(dailyOnly)
    const view = render(<PackageUsageSection />)
    const dailyRing = await screen.findByRole('img', { name: '日限额 24/50' })
    expect(dailyRing).toHaveAttribute('data-ring-mode', 'single')
    expect(dailyRing).toHaveAttribute('data-ring-side', 'daily')
    expect(document.querySelector('[data-ring-mode="nested"]')).toBeNull()
    view.unmount()

    mockedFetch.mockResolvedValue({
      ...sampleUsage,
      defaultTier: 'mini',
      packages: [{ id: 'week', name: '周卡', quotaMode: 'weekly', weekly: { used: 153, limit: 250 } }],
    })
    const weeklyView = render(<PackageUsageSection />)
    const weeklyRing = await screen.findByRole('img', { name: '周限额 153/250' })
    expect(weeklyRing).toHaveAttribute('data-ring-mode', 'single')
    expect(weeklyRing).toHaveAttribute('data-ring-side', 'weekly')
    weeklyView.unmount()

    mockedFetch.mockResolvedValue({
      ...sampleUsage,
      defaultTier: 'medium',
      packages: [{
        id: 'both',
        name: '双休套餐',
        quotaMode: 'daily_and_weekly',
        expiresAt: '2026-11-09T00:00:00.000Z',
        daily: { used: 1, limit: 2, resetsAt: '2026-10-18T00:00:00.000Z' },
        weekly: { used: 3, limit: 8, resetsAt: '2026-10-20T00:00:00.000Z' },
      }],
    })
    const mediumView = render(<PackageUsageSection />)
    expectSquarePackageShell()
    const medium = (await screen.findByText('双休套餐')).closest('[data-density="medium"]') as HTMLElement
    expect(medium.className).toContain('rounded-none')
    expect(medium).toHaveAttribute('data-primary-quota', 'weekly')
    expect(within(medium).getByText('每周额度')).toBeInTheDocument()
    expect(within(medium).queryByText('每日额度')).toBeNull()
    expect(within(medium).queryByText(/到期/)).toBeNull()
    expect(within(medium).queryByText(/重置/)).toBeNull()
    expect(medium.querySelectorAll('.h-1\\.5')).toHaveLength(1)
    mediumView.unmount()

    window.localStorage.setItem('nowen-package-widget-tier', 'large')
    render(<PackageUsageSection />)
    const large = (await screen.findByText('双休套餐')).closest('[data-density="large"]') as HTMLElement
    expect(large.className).toContain('rounded-none')
    expectSquarePackageShell()
    expect(within(large).getByText('每日额度')).toBeInTheDocument()
    expect(within(large).getByText('每周额度')).toBeInTheDocument()
    expect(within(large).getByText(/到期/)).toBeInTheDocument()
    expect(within(large).getAllByText(/重置/)).toHaveLength(2)
    expect(large.querySelectorAll('.h-1\\.5')).toHaveLength(2)
  })

  it('迷你有多个套餐时每 5 秒轮播，悬停时停住', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    mockedFetch.mockResolvedValue({
      ...sampleUsage,
      defaultTier: 'mini',
      packages: [
        { id: 'day', name: '日卡', quotaMode: 'daily', daily: { used: 24, limit: 50 } },
        { id: 'week', name: '周卡', quotaMode: 'weekly', weekly: { used: 153, limit: 250 } },
      ],
    })
    render(<PackageUsageSection />)
    expect(await screen.findByText('日卡')).toBeInTheDocument()
    expect(screen.queryByText('周卡')).toBeNull()
    expect(document.querySelector('[data-carousel-index="0"]')).not.toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PACKAGE_CAROUSEL_MS - 1)
    })
    expect(screen.getByText('日卡')).toBeInTheDocument()
    expect(screen.queryByText('周卡')).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.getByText('周卡')).toBeInTheDocument()
    expect(screen.queryByText('日卡')).toBeNull()
    expect(document.querySelector('[data-carousel-index="1"]')).not.toBeNull()

    const section = document.querySelector('[data-section="package-usage"]') as HTMLElement
    fireEvent.mouseEnter(section)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PACKAGE_CAROUSEL_MS)
    })
    expect(screen.getByText('周卡')).toBeInTheDocument()

    fireEvent.mouseLeave(section)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PACKAGE_CAROUSEL_MS)
    })
    expect(screen.getByText('日卡')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('收起后仍是一行摘要，换档不会锁高度，展开后回到该档内容', async () => {
    mockedFetch.mockResolvedValue(sampleUsage)
    render(<PackageUsageSection />)
    expect(await screen.findByText('每日额度')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '收起套餐' }))
    const collapsed = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expectSquarePackageShell()
    expect(collapsed.style.height).toBe('')
    expect(screen.queryByText('每日额度')).toBeNull()
    expect(screen.getByText(/双休套餐/)).toBeInTheDocument()

    fireEvent.contextMenu(collapsed, { clientX: 30, clientY: 40 })
    fireEvent.click(screen.getByRole('menuitemradio', { name: '迷你' }))
    const miniCollapsed = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(miniCollapsed.getAttribute('data-tier')).toBe('mini')
    expectSquarePackageShell()
    expect(miniCollapsed.style.height).toBe('')
    expect(miniCollapsed.style.width).toBe('')
    expect(document.querySelector('[data-ring-mode]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '展开套餐' }))
    expect(await screen.findByRole('img', { name: /周限额/ })).toHaveAttribute('data-ring-mode', 'nested')
    const expanded = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(expanded.style.height).toBe('')
    expectSquarePackageShell()
    expect(expanded.className).toContain('w-[16.25rem]')
  })
})

/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../lib/i18n'
import { PackageUsageSection, PACKAGE_WIDGET_MIN_HEIGHT, PACKAGE_WIDGET_MIN_WIDTH, resizePackageWidget } from '../PackageUsageSection'
import { fetchPackageUsage } from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  fetchPackageUsage: vi.fn(),
}))

const mockedFetch = vi.mocked(fetchPackageUsage)
const memory = new Map<string, string>()

afterEach(() => {
  cleanup()
})

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

function mockCardRect(section: HTMLElement, rect: { left: number; top: number; width: number; height: number }) {
  section.getBoundingClientRect = () => ({
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON() { return {} },
  })
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

describe('PackageUsageSection resize', () => {
  it('按拖动的边计算尺寸，并守住最小尺寸和对边', () => {
    expect(resizePackageWidget({ x: 10, y: 20, width: 360, height: 240 }, 80, 40, 'se'))
      .toEqual({ x: 10, y: 20, width: 440, height: 280 })
    expect(resizePackageWidget({ x: 10, y: 20, width: 360, height: 240 }, -400, -400, 'se'))
      .toEqual({ x: 10, y: 20, width: PACKAGE_WIDGET_MIN_WIDTH, height: PACKAGE_WIDGET_MIN_HEIGHT })

    const west = resizePackageWidget({ x: 100, y: 40, width: 300, height: 200 }, 180, 0, 'w')
    expect(west.x + west.width).toBe(400)
    expect(west.width).toBe(PACKAGE_WIDGET_MIN_WIDTH)

    setViewport(200, 120)
    expect(resizePackageWidget({ x: 0, y: 0, width: 360, height: 240 }, 50, 50, 'se'))
      .toEqual({ x: 0, y: 0, width: 200, height: 120 })
  })

  it('拖动角落后记住宽高，刷新后仍按该尺寸渲染，且日周额度不变', async () => {
    mockedFetch.mockResolvedValue(sampleUsage)
    const { unmount } = render(<PackageUsageSection />)
    expect(await screen.findByText('$0.04 / $50.00')).toBeInTheDocument()
    expect(screen.getByText('$153.75 / $250.00')).toBeInTheDocument()

    const section = document.querySelector('[data-section="package-usage"]') as HTMLElement
    mockCardRect(section, { left: 16, top: 20, width: 360, height: 240 })
    const handle = screen.getByRole('button', { name: '从右下角调整套餐大小' })
    fireEvent.pointerDown(handle, { clientX: 370, clientY: 250, pointerId: 3, button: 0 })
    fireEvent.pointerMove(window, { clientX: 470, clientY: 330, pointerId: 3 })
    fireEvent.pointerUp(window, { clientX: 470, clientY: 330, pointerId: 3 })

    const sized = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(sized.style.width).toBe('460px')
    expect(sized.style.height).toBe('320px')
    expect(JSON.parse(window.localStorage.getItem('nowen-package-widget-size') || '{}')).toEqual({ width: 460, height: 320 })
    expect(screen.getByText('每日额度')).toBeInTheDocument()
    expect(screen.getByText('每周额度')).toBeInTheDocument()
    expect(screen.getByText('$0.04 / $50.00')).toBeInTheDocument()
    expect(screen.getByText('$153.75 / $250.00')).toBeInTheDocument()

    unmount()
    render(<PackageUsageSection />)
    expect(await screen.findByText('周日限额')).toBeInTheDocument()
    const restored = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(restored.style.width).toBe('460px')
    expect(restored.style.height).toBe('320px')
  })

  it('收起后仍可改宽度，展开后恢复高度，拖动也不丢尺寸', async () => {
    window.localStorage.setItem('nowen-package-widget-size', JSON.stringify({ width: 420, height: 280 }))
    mockedFetch.mockResolvedValue(sampleUsage)
    render(<PackageUsageSection />)
    const section = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(section.style.width).toBe('420px')
    expect(section.style.height).toBe('280px')

    fireEvent.click(screen.getByRole('button', { name: '收起套餐' }))
    const collapsed = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(collapsed.style.height).toBe('')
    expect(collapsed.style.width).toBe('420px')
    expect(screen.queryByRole('button', { name: '从右下角调整套餐大小' })).toBeNull()
    expect(screen.queryByText('每日额度')).toBeNull()

    mockCardRect(collapsed, { left: 12, top: 16, width: 420, height: 44 })
    const edge = screen.getByRole('button', { name: '从右边调整套餐大小' })
    fireEvent.pointerDown(edge, { clientX: 430, clientY: 30, pointerId: 4, button: 0 })
    fireEvent.pointerMove(window, { clientX: 480, clientY: 30, pointerId: 4 })
    fireEvent.pointerUp(window, { clientX: 480, clientY: 30, pointerId: 4 })

    const widened = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(widened.style.width).toBe('470px')
    expect(widened.style.height).toBe('')
    expect(JSON.parse(window.localStorage.getItem('nowen-package-widget-size') || '{}')).toEqual({ width: 470, height: 280 })

    fireEvent.click(screen.getByRole('button', { name: '展开套餐' }))
    expect(await screen.findByText('每周额度')).toBeInTheDocument()
    const expanded = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(expanded.style.width).toBe('470px')
    expect(expanded.style.height).toBe('280px')

    mockCardRect(expanded, { left: 12, top: 16, width: 470, height: 280 })
    const grip = screen.getByRole('button', { name: '拖动套餐' })
    fireEvent.pointerDown(grip, { clientX: 20, clientY: 30, pointerId: 5, button: 0 })
    fireEvent.pointerMove(window, { clientX: 90, clientY: 80, pointerId: 5 })
    fireEvent.pointerUp(window, { clientX: 90, clientY: 80, pointerId: 5 })
    const placed = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(placed.style.left).toBe('82px')
    expect(placed.style.top).toBe('66px')
    expect(placed.style.width).toBe('470px')
    expect(placed.style.height).toBe('280px')
    expect(JSON.parse(window.localStorage.getItem('nowen-package-widget-pos') || '{}')).toEqual({ x: 82, y: 66 })
  })

  it('从左边缩放会改位置，并保证卡片至少有一部分留在屏幕内', async () => {
    setViewport(500, 400)
    window.localStorage.setItem('nowen-package-widget-pos', JSON.stringify({ x: 470, y: 40 }))
    window.localStorage.setItem('nowen-package-widget-size', JSON.stringify({ width: 240, height: 180 }))
    mockedFetch.mockResolvedValue(sampleUsage)
    render(<PackageUsageSection />)
    await screen.findByText('当前余额')

    const handle = screen.getByRole('button', { name: '从右边调整套餐大小' })
    fireEvent.pointerDown(handle, { clientX: 700, clientY: 80, pointerId: 6, button: 0 })
    fireEvent.pointerMove(window, { clientX: 900, clientY: 80, pointerId: 6 })
    fireEvent.pointerUp(window, { clientX: 900, clientY: 80, pointerId: 6 })

    const placed = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(placed.style.width).toBe('440px')
    expect(placed.style.left).toBe('452px')
    const left = Number.parseFloat(placed.style.left)
    const width = Number.parseFloat(placed.style.width)
    expect(left).toBeLessThanOrEqual(500 - 48)
    expect(left + width).toBeGreaterThanOrEqual(48)
    expect(500 - left).toBeGreaterThanOrEqual(48)
    expect(JSON.parse(window.localStorage.getItem('nowen-package-widget-size') || '{}')).toEqual({ width: 440, height: 180 })
    expect(JSON.parse(window.localStorage.getItem('nowen-package-widget-pos') || '{}')).toEqual({ x: 452, y: 40 })
  })

  it('忽略无效尺寸，小于可用尺寸的记录会抬到下限', async () => {
    window.localStorage.setItem('nowen-package-widget-size', '{')
    mockedFetch.mockResolvedValue(sampleUsage)
    const broken = render(<PackageUsageSection />)
    await screen.findByText('当前余额')
    const section = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(section.style.width).toBe('')
    expect(section.style.height).toBe('')
    broken.unmount()

    window.localStorage.setItem('nowen-package-widget-size', JSON.stringify({ width: 10, height: 10 }))
    render(<PackageUsageSection />)
    const clamped = document.querySelector('[data-section="package-usage"]') as HTMLElement
    expect(clamped.style.width).toBe(`${PACKAGE_WIDGET_MIN_WIDTH}px`)
    expect(clamped.style.height).toBe(`${PACKAGE_WIDGET_MIN_HEIGHT}px`)
    await screen.findByText('当前余额')
  })

  it('轻微晃动和右键不会写入尺寸', async () => {
    mockedFetch.mockResolvedValue(sampleUsage)
    render(<PackageUsageSection />)
    await screen.findByText('当前余额')
    const section = document.querySelector('[data-section="package-usage"]') as HTMLElement
    mockCardRect(section, { left: 16, top: 20, width: 360, height: 240 })
    const handle = screen.getByRole('button', { name: '从下边调整套餐大小' })
    fireEvent.pointerDown(handle, { clientX: 40, clientY: 260, pointerId: 7, button: 2 })
    fireEvent.pointerMove(window, { clientX: 40, clientY: 320, pointerId: 7 })
    fireEvent.pointerUp(window, { clientX: 40, clientY: 320, pointerId: 7 })
    expect(window.localStorage.getItem('nowen-package-widget-size')).toBeNull()

    fireEvent.pointerDown(handle, { clientX: 40, clientY: 260, pointerId: 8, button: 0 })
    fireEvent.pointerMove(window, { clientX: 41, clientY: 262, pointerId: 8 })
    fireEvent.pointerUp(window, { clientX: 41, clientY: 262, pointerId: 8 })
    expect(window.localStorage.getItem('nowen-package-widget-size')).toBeNull()
    expect(section.style.height).toBe('')
  })
})

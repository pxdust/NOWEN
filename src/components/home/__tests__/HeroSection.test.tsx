/** @vitest-environment jsdom */

import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../lib/i18n'
import { setActiveQuotes } from '../../../data/quotes'
import { HeroSection } from '../HeroSection'
import type { WeatherData } from '../../../hooks/useWeather'

vi.mock('../../../hooks/useTime', () => ({
  useTime: (enableLunar: boolean) => ({
    formattedTime: '15:20:24',
    formattedDate: '10月15日星期四',
    lunarDate: enableLunar
      ? { display: '九月初六', festival: null, jieQi: null, month: '九', day: '初六', fullDate: '九月初六' }
      : { display: '', festival: null, jieQi: null, month: '', day: '', fullDate: '' },
  }),
}))

const weather: WeatherData = {
  temperature: 23,
  feelsLike: 23,
  humidity: 40,
  description: '多云',
  icon: '02d',
  city: '杭州',
  windSpeed: 3,
  windDirection: '东风',
  visibility: 10,
  pressure: 1012,
  sunrise: '06:00',
  sunset: '18:00',
  isDay: true,
  forecast: [],
}

function renderHero(overrides: Partial<ComponentProps<typeof HeroSection>> = {}) {
  return render(
    <HeroSection
      showWeather
      showLunar
      showSearch
      weather={weather}
      onRefreshWeather={() => undefined}
      onOpenSearch={() => undefined}
      {...overrides}
    />,
  )
}

beforeEach(() => {
  setActiveQuotes(['推石上山的西西弗斯是快乐的，因为他知晓这种徒劳。'], false, true)
})

afterEach(() => {
  cleanup()
  setActiveQuotes([], true, true)
  vi.restoreAllMocks()
})

describe('HeroSection centered stack', () => {
  it('occupies a quarter-screen band and centers time, weather, and a larger quote', () => {
    renderHero()

    const section = screen.getByTestId('hero-section')
    expect(section.className).toContain('min-h-[25vh]')
    expect(section.className).toContain('items-center')
    expect(section.className).toContain('justify-center')

    const stack = screen.getByTestId('hero-stack')
    expect(stack.className).toContain('flex-col')
    expect(stack.className).toContain('items-center')
    expect(stack.className).toContain('justify-center')

    const time = screen.getByTestId('hero-time')
    const meta = screen.getByTestId('hero-meta')
    const quote = screen.getByTestId('hero-quote')

    expect(time).toHaveTextContent('15:20:24')
    expect(meta).toHaveTextContent('10月15日星期四')
    expect(meta).toHaveTextContent('九月初六')
    expect(meta).toHaveTextContent('23°')
    expect(meta).toHaveTextContent('杭州')
    expect(quote.className).toContain('text-lg')
    expect(quote.className).toContain('sm:text-xl')
    expect(quote.className).toContain('line-clamp-2')
    expect(quote.className).not.toContain('text-sm')

    expect(time.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(meta.compareDocumentPosition(quote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps the search hint on the edge, outside the centered stack', () => {
    renderHero()

    const edge = screen.getByTestId('hero-edge')
    const stack = screen.getByTestId('hero-stack')
    const search = screen.getByRole('button', { name: '搜索或输入命令...' })

    expect(edge.contains(search)).toBe(true)
    expect(stack.contains(search)).toBe(false)
  })

  it('shows the quote in lite mode without sparkle animation when showQuotes is on', () => {
    renderHero({ isLiteMode: true })

    const quote = screen.getByTestId('hero-quote')
    expect(quote).toHaveTextContent('推石上山的西西弗斯是快乐的')
    expect(quote.querySelector('.sparkle-pop')).toBeNull()
  })

  it('hides the quote when showQuotes is off', () => {
    setActiveQuotes(['不该出现的名言'], false, false)
    renderHero({ isLiteMode: true })

    expect(screen.queryByTestId('hero-quote')).toBeNull()
  })

  it('toggles icon mode from the clock without resizing the full-dashboard time', () => {
    const onToggleMinimal = vi.fn()
    renderHero({ onToggleMinimal, minimalMode: false })

    const time = screen.getByTestId('hero-time')
    expect(time.tagName).toBe('BUTTON')
    expect(time.className).toContain('text-4xl')
    expect(time.className).toContain('sm:text-5xl')
    expect(time.className).toContain('cursor-pointer')
    expect(time).toHaveAttribute('title', expect.stringContaining('Alt+M'))
    expect(screen.getByTestId('hero-section').className).toContain('min-h-[25vh]')
    expect(screen.getByTestId('hero-edge')).toBeTruthy()

    fireEvent.click(time)
    expect(onToggleMinimal).toHaveBeenCalledTimes(1)
  })

  it('respects weather and lunar toggles', () => {
    renderHero({ showWeather: false, showLunar: false })

    const meta = screen.getByTestId('hero-meta')
    expect(meta).toHaveTextContent('10月15日星期四')
    expect(meta).not.toHaveTextContent('九月初六')
    expect(meta).not.toHaveTextContent('23°')
    expect(screen.queryByTestId('hero-lunar')).toBeNull()
  })
})

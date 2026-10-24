import { describe, expect, it } from 'vitest'
import { columnsForIconTier, columnsForViewMode, ICON_GRID_CLASS, ICON_TIER_GRID_CLASS, loadMoreIconStep, loadMoreStep, VIEW_MODE_GRID_CLASS } from '../bookmark-grid'

describe('bookmark grid breakpoints', () => {
  it('keeps standard columns at 2 / 3 / 4 / 4 / 5 / 6', () => {
    expect(columnsForViewMode('standard', 390)).toBe(2)
    expect(columnsForViewMode('standard', 640)).toBe(3)
    expect(columnsForViewMode('standard', 768)).toBe(4)
    expect(columnsForViewMode('standard', 1024)).toBe(4)
    expect(columnsForViewMode('standard', 1440)).toBe(5)
    expect(columnsForViewMode('standard', 1536)).toBe(6)
  })

  it('adds a fourth comfortable column from xl', () => {
    expect(columnsForViewMode('comfortable', 390)).toBe(1)
    expect(columnsForViewMode('comfortable', 1024)).toBe(3)
    expect(columnsForViewMode('comfortable', 1280)).toBe(4)
    expect(VIEW_MODE_GRID_CLASS.comfortable).toContain('xl:grid-cols-4')
  })

  it('does not densify compact beyond the existing climb', () => {
    expect(columnsForViewMode('compact', 390)).toBe(2)
    expect(columnsForViewMode('compact', 1280)).toBe(6)
    expect(VIEW_MODE_GRID_CLASS.compact).toContain('xl:grid-cols-6')
    expect(VIEW_MODE_GRID_CLASS.standard).toContain('xl:grid-cols-5')
    expect(VIEW_MODE_GRID_CLASS.standard).toContain('2xl:grid-cols-6')
  })

  it('packs icon tiers denser as they get smaller, and keeps medium on the old icon grid', () => {
    expect(ICON_TIER_GRID_CLASS.medium).toBe(ICON_GRID_CLASS)
    expect(ICON_TIER_GRID_CLASS.medium).toContain('xl:grid-cols-12')
    expect(ICON_TIER_GRID_CLASS.mini).toContain('grid-cols-5')
    expect(ICON_TIER_GRID_CLASS.mini).toContain('repeat(16,minmax(0,1fr))')
    expect(ICON_TIER_GRID_CLASS.large).toContain('grid-cols-3')
    expect(ICON_TIER_GRID_CLASS.large).toContain('2xl:grid-cols-10')

    expect(columnsForIconTier('mini', 390)).toBe(5)
    expect(columnsForIconTier('mini', 768)).toBe(10)
    expect(columnsForIconTier('mini', 1280)).toBe(14)
    expect(columnsForIconTier('mini', 1600)).toBe(16)
    expect(columnsForIconTier('medium', 390)).toBe(4)
    expect(columnsForIconTier('medium', 1440)).toBe(12)
    expect(columnsForIconTier('large', 390)).toBe(3)
    expect(columnsForIconTier('large', 1024)).toBe(7)
    expect(columnsForIconTier('large', 1600)).toBe(10)
    expect(loadMoreIconStep('mini', 390)).toBe(15)
    expect(loadMoreIconStep('large', 1440)).toBe(24)
  })

  it('loads about three rows instead of 100 cards', () => {
    expect(loadMoreStep('standard', 390)).toBe(6)
    expect(loadMoreStep('standard', 1440)).toBe(15)
    expect(loadMoreStep('standard', 1920)).toBe(18)
    expect(loadMoreStep('comfortable', 390)).toBe(3)
  })
})

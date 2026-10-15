import { describe, expect, it } from 'vitest'
import { columnsForViewMode, loadMoreStep, VIEW_MODE_GRID_CLASS } from '../bookmark-grid'

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

  it('loads about three rows instead of 100 cards', () => {
    expect(loadMoreStep('standard', 390)).toBe(6)
    expect(loadMoreStep('standard', 1440)).toBe(15)
    expect(loadMoreStep('standard', 1920)).toBe(18)
    expect(loadMoreStep('comfortable', 390)).toBe(3)
  })
})

import { describe, expect, it } from 'vitest'
import type { WidgetVisibility } from '../api'
import { isWidgetVisibility, resolveWidgetVisibility } from '../widgetVisibility'

const current: WidgetVisibility = {
  systemMonitor: true,
  hardwareIdentity: false,
  packageUsage: false,
  packageUsageAccess: 'private',
}

const explicitVisibility: WidgetVisibility = {
  ...current,
  packageUsage: true,
  packageUsageAccess: 'public',
}

class FakeClickEvent {
  type = 'click'
  nativeEvent = {}
  currentTarget = {}
  _targetInst: FakeClickEvent

  constructor() {
    this._targetInst = this
  }
}

describe('resolveWidgetVisibility', () => {
  it('保留显式传入的可见性，包括套餐额度开关', () => {
    expect(resolveWidgetVisibility(explicitVisibility, current)).toEqual(explicitVisibility)
    expect(JSON.stringify(resolveWidgetVisibility(explicitVisibility, current))).toContain('"packageUsage":true')
  })

  it('没有传入配置时使用当前状态', () => {
    expect(resolveWidgetVisibility(undefined, current)).toBe(current)
    expect(resolveWidgetVisibility(null, current)).toBe(current)
  })

  it('忽略点击事件，避免把循环结构交给 JSON.stringify', () => {
    const event = new FakeClickEvent()
    expect(() => JSON.stringify(event)).toThrow(/circular/i)
    expect(isWidgetVisibility(event)).toBe(false)
    expect(isWidgetVisibility(new MouseEvent('click'))).toBe(false)

    const resolved = resolveWidgetVisibility(event, current)
    expect(resolved).toBe(current)
    expect(resolveWidgetVisibility(new MouseEvent('click'), current)).toBe(current)
    expect(() => JSON.stringify(resolved)).not.toThrow()
    expect(JSON.parse(JSON.stringify(resolved))).toEqual(current)
  })

  it('忽略带有未知字段的普通对象', () => {
    expect(resolveWidgetVisibility({ packageUsage: true, nativeEvent: {} }, current)).toBe(current)
  })
})

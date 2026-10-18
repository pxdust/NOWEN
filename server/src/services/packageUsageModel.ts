/**
 * 套餐用量归一化。
 *
 * NewAPI `/api/user/self` 只提供钱包余额（quota / 500000）和分组名。
 * 日/周额度来自 `/api/subscription/self` + `/api/subscription/plans`：
 * 一个套餐只有一种重置周期时，只填对应的 daily 或 weekly。
 * 上游若同时给出 daily 与 weekly 对象，则两者都保留。
 * 每个套餐单独推断额度模式，只输出上游真正给出的窗口：
 * - 只有 weekly → quotaMode=weekly（周限额）
 * - 只有 daily → quotaMode=daily（仅日限额）
 * - 两者都有 → quotaMode=daily_and_weekly（周日限额：每日额度 + 每周额度）
 * - 都没有 → quotaMode=none
 * limit_type / quota_reset_period 为「周日限额」时表示周限额和日限额同时存在，
 * 不会把单一的 amount_used / amount_total 当成周限额。
 * NewAPI 订阅常把日额度放在 amount_used / amount_total（plan_quota_reset_period 为 daily），
 * 把周额度放在 weekly_amount_used / weekly_amount_total。两个总额都大于 0 时两根都显示，
 * 不因为周期字段写成 daily、或外层才有 plan_quota_reset_period / plan_title 而丢掉周额度。
 * 同时识别 day_used_amount、day_limit_amount、week_used_amount、week_limit_amount，
 * 以及套餐对象外层（不只 subscription 内层）上的这些字段。
 * limit 为 0，或字段标明 unlimited，表示不限额：保留 used（若上游给了），不补进度条用的上限。
 * 缺字段就不输出，调用方不要补 0。
 *
 * 自定义套餐接口（管理员填写的路径）可返回：
 * {
 *   packages: [{
 *     id?, name, status?, daysLeft?, expiresAt?,
 *     daily?: { used, limit, resetsAt? },
 *     weekly?: { used, limit, resetsAt? }
 *   }]
 * }
 * amountMode=quota 时，used/limit 按 NewAPI 配额单位 ÷500000；
 * amountMode=money 时原样当作金额。对象自带 unit=quota|usd|cny 时以对象为准。
 */

export const QUOTA_PER_UNIT = 500_000

export type PackagePreset = 'newapi' | 'custom'
export type AmountMode = 'quota' | 'money'
export type PackageSizeTier = 'mini' | 'medium' | 'large'

export interface PackageUsageConfig {
  preset: PackagePreset
  baseUrl: string
  accessToken: string
  userId: string
  timeoutSec: number
  refreshIntervalMin: number
  currency: string
  /** 以 / 开头的路径。空字符串表示使用预设默认路径。 */
  packageDetailPath: string
  amountMode: AmountMode
  /** 首页玻璃卡的默认密度。不是密钥。 */
  defaultTier: PackageSizeTier
}

export interface PublicPackageUsageConfig {
  preset: PackagePreset
  baseUrl: string
  userId: string
  timeoutSec: number
  refreshIntervalMin: number
  currency: string
  packageDetailPath: string
  amountMode: AmountMode
  defaultTier: PackageSizeTier
  hasToken: boolean
  tokenPreview: string
}

export type PackageQuotaMode = 'none' | 'daily' | 'weekly' | 'daily_and_weekly'

export interface PackageQuotaWindow {
  /** 上游给出的已用金额。缺省表示上游没给，不要当成 0。 */
  used?: number
  /** 有限上限。不限额时省略。 */
  limit?: number
  /** 上游明确的 0 上限 / unlimited。 */
  unlimited?: boolean
  resetsAt?: string
}

export interface PackagePlan {
  id?: string
  name: string
  status?: string
  daysLeft?: number
  expiresAt?: string
  quotaMode: PackageQuotaMode
  daily?: PackageQuotaWindow
  weekly?: PackageQuotaWindow
}

export interface PackageUsageDto {
  ok: boolean
  enabled: boolean
  balance: number | null
  currency: string
  packages: PackagePlan[]
  updatedAt: string | null
  refreshIntervalMin: number
  defaultTier: PackageSizeTier
  error?: string
}

const DEFAULTS: PackageUsageConfig = {
  preset: 'newapi',
  baseUrl: '',
  accessToken: '',
  userId: '',
  timeoutSec: 10,
  refreshIntervalMin: 5,
  currency: 'USD',
  packageDetailPath: '',
  amountMode: 'quota',
  defaultTier: 'large',
}

export function defaultPackageUsageConfig(): PackageUsageConfig {
  return { ...DEFAULTS }
}

export function normalizePackageTier(value: unknown, fallback: PackageSizeTier = 'large'): PackageSizeTier {
  return value === 'mini' || value === 'medium' || value === 'large' ? value : fallback
}

export function isMaskedToken(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.startsWith('•') || trimmed.includes('…') || trimmed.includes('...')
}

export function tokenPreview(token: string): string {
  if (!token) return ''
  if (token.length <= 4) return '••••••'
  return '••••••' + token.slice(-4)
}

export function toPublicConfig(cfg: PackageUsageConfig | null | undefined): PublicPackageUsageConfig {
  const src = cfg ?? DEFAULTS
  return {
    preset: src.preset === 'custom' ? 'custom' : 'newapi',
    baseUrl: src.baseUrl || '',
    userId: src.userId || '',
    timeoutSec: src.timeoutSec || DEFAULTS.timeoutSec,
    refreshIntervalMin: src.refreshIntervalMin ?? DEFAULTS.refreshIntervalMin,
    currency: src.currency || DEFAULTS.currency,
    packageDetailPath: src.packageDetailPath || '',
    amountMode: src.amountMode === 'money' ? 'money' : 'quota',
    defaultTier: normalizePackageTier(src.defaultTier),
    hasToken: !!src.accessToken,
    tokenPreview: tokenPreview(src.accessToken),
  }
}

export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('请求地址不是有效的 URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('请求地址只支持 http 或 https')
  }
  if (url.username || url.password) {
    throw new Error('请求地址不能包含账号密码')
  }
  url.hash = ''
  url.search = ''
  const path = url.pathname.replace(/\/+$/, '')
  return url.origin + (path === '/' ? '' : path)
}

export function assertSafePath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return ''
  if (!trimmed.startsWith('/') || trimmed.includes('://') || trimmed.includes('..')) {
    throw new Error('套餐详情路径必须以 / 开头，且不能跳出站点')
  }
  if (!/^\/[A-Za-z0-9._~/-]*$/.test(trimmed)) {
    throw new Error('套餐详情路径包含不支持的字符')
  }
  return trimmed
}

export function joinUrl(base: string, path: string): string {
  const root = new URL(base.endsWith('/') ? base : `${base}/`)
  const relative = path.replace(/^\/+/, '')
  const url = new URL(relative, root)
  if (url.origin !== root.origin) {
    throw new Error('套餐详情路径不能指向其他站点')
  }
  return url.toString()
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function mergePackageConfig(
  previous: Partial<PackageUsageConfig> | null | undefined,
  incoming: unknown,
): PackageUsageConfig {
  const prev = { ...DEFAULTS, ...(previous ?? {}) }
  const raw = incoming && typeof incoming === 'object' ? incoming as Record<string, unknown> : {}
  const nextToken = typeof raw.accessToken === 'string' ? raw.accessToken.trim() : ''
  const accessToken = nextToken && !isMaskedToken(nextToken) ? nextToken : (prev.accessToken || '')
  const currencyRaw = typeof raw.currency === 'string' && raw.currency.trim()
    ? raw.currency.trim().toUpperCase()
    : prev.currency || DEFAULTS.currency

  return {
    preset: raw.preset === 'custom' ? 'custom' : raw.preset === 'newapi' ? 'newapi' : prev.preset,
    baseUrl: typeof raw.baseUrl === 'string' ? raw.baseUrl.trim() : prev.baseUrl,
    accessToken,
    userId: typeof raw.userId === 'string' ? raw.userId.trim() : prev.userId,
    timeoutSec: clampInt(raw.timeoutSec ?? raw.timeout, prev.timeoutSec || DEFAULTS.timeoutSec, 1, 120),
    refreshIntervalMin: clampInt(
      raw.refreshIntervalMin ?? raw.refreshInterval,
      prev.refreshIntervalMin ?? DEFAULTS.refreshIntervalMin,
      0,
      1440,
    ),
    currency: currencyRaw.slice(0, 8) || DEFAULTS.currency,
    packageDetailPath: typeof raw.packageDetailPath === 'string' ? raw.packageDetailPath.trim() : prev.packageDetailPath,
    amountMode: raw.amountMode === 'money' ? 'money' : raw.amountMode === 'quota' ? 'quota' : prev.amountMode,
    defaultTier: normalizePackageTier(raw.defaultTier, normalizePackageTier(prev.defaultTier)),
  }
}

export function finalizePackageConfig(cfg: PackageUsageConfig): PackageUsageConfig {
  return {
    ...cfg,
    baseUrl: cfg.baseUrl ? normalizeBaseUrl(cfg.baseUrl) : '',
    packageDetailPath: assertSafePath(cfg.packageDetailPath || ''),
    userId: cfg.userId.trim(),
    currency: (cfg.currency || 'USD').toUpperCase().slice(0, 8),
  }
}

export function packageDetailPathFor(cfg: PackageUsageConfig): string {
  if (cfg.packageDetailPath) return cfg.packageDetailPath
  if (cfg.preset === 'newapi') return '/api/subscription/self'
  return ''
}

// ---------- 上游响应解析 ----------

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function unwrap(body: unknown): { data: unknown; error?: string } {
  if (!body || typeof body !== 'object') return { data: body }
  const record = body as Record<string, unknown>
  if (record.success === false) {
    return { data: null, error: text(record.message) || text(record.error) || 'upstream_failed' }
  }
  if ('data' in record && (record.success === true || record.success === undefined)) {
    return { data: record.data }
  }
  return { data: body }
}

function readTimeMs(value: unknown): number | null {
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  const n = num(value)
  if (n === null || n <= 0) return null
  if (n > 1e12) return n
  if (n > 1e9) return n * 1000
  return null
}

function toIso(value: unknown): string | undefined {
  const ms = readTimeMs(value)
  return ms === null ? undefined : new Date(ms).toISOString()
}

function amountScale(unitHint: unknown, fallback: AmountMode): AmountMode {
  const unit = text(unitHint).toLowerCase()
  if (['quota', 'raw', 'units'].includes(unit)) return 'quota'
  if (['usd', 'cny', 'rmb', 'eur', 'money', '$', '¥', '￥'].includes(unit)) return 'money'
  return fallback
}

function toMoney(value: number, mode: AmountMode): number {
  return roundMoney(mode === 'quota' ? value / QUOTA_PER_UNIT : value)
}

function isUnlimitedFlag(value: unknown): boolean {
  if (value === true || value === 1) return true
  const flag = text(value).toLowerCase()
  return flag === 'unlimited' || flag === 'infinite' || flag === 'none' || flag === '不限' || flag === '不限额'
}

function readPair(
  used: unknown,
  limit: unknown,
  mode: AmountMode,
  resetsAt?: string,
  unlimitedFlag?: boolean,
): PackageQuotaWindow | undefined {
  const usedN = num(used)
  const limitN = num(limit)
  if ((usedN !== null && usedN < 0) || (limitN !== null && limitN < 0)) return undefined
  const unlimited = unlimitedFlag === true || limitN === 0
  if (!unlimited && (limitN === null || limitN <= 0)) return undefined
  const window: PackageQuotaWindow = {}
  if (unlimited) window.unlimited = true
  else if (limitN !== null) window.limit = toMoney(limitN, mode)
  if (usedN !== null) window.used = toMoney(usedN, mode)
  if (resetsAt) window.resetsAt = resetsAt
  return window
}

function quotaModeFor(daily?: PackageQuotaWindow, weekly?: PackageQuotaWindow): PackageQuotaMode {
  if (daily && weekly) return 'daily_and_weekly'
  if (daily) return 'daily'
  if (weekly) return 'weekly'
  return 'none'
}

/** 周日限额 = 周限额 + 日限额同时存在，不是「仅周日」，也不是单独的周限额。 */
function classifyPeriod(raw: unknown): 'daily' | 'weekly' | 'combo' | 'other' {
  const period = text(raw).trim().toLowerCase().replace(/\s+/g, '')
  if (!period) return 'other'
  if ([
    '周日限额',
    '周+日限额',
    '周加日限额',
    '周+日',
    'week_day',
    'daily_and_weekly',
    'day_and_week',
    'weekly_and_daily',
  ].includes(period)) return 'combo'
  if (period.includes('周') && period.includes('日') && !period.includes('仅')) return 'combo'
  if (['daily', 'day', 'today', '每日', '日限额', '仅日限额', '每日额度', '日'].includes(period)) return 'daily'
  if (['weekly', 'week', '每周', '周限额', '每周额度', '周', '仅周限额'].includes(period)) return 'weekly'
  return 'other'
}

function readWindow(source: unknown, side: 'daily' | 'weekly', mode: AmountMode): PackageQuotaWindow | undefined {
  if (!source || typeof source !== 'object') return undefined
  const record = source as Record<string, unknown>
  const short = side === 'daily' ? 'day' : 'week'
  const nested = record[side]
    ?? record[short]
    ?? record[`${side}Quota`]
    ?? record[`${side}_quota`]
    ?? record[`${short}Quota`]
    ?? record[`${short}_quota`]
  if (nested && typeof nested === 'object') {
    const box = nested as Record<string, unknown>
    const pair = readPair(
      box.used ?? box.used_quota ?? box.amount_used ?? box.use,
      box.limit ?? box.quota ?? box.amount_total ?? box.total,
      amountScale(box.unit ?? box.currency, mode),
      toIso(box.resetsAt ?? box.resets_at ?? box.reset_at ?? box.next_reset_time ?? box.nextResetTime),
      isUnlimitedFlag(box.unlimited ?? box.is_unlimited ?? box.no_limit),
    )
    if (pair) return pair
  }

  const usedKeys = side === 'daily'
    ? ['daily_used', 'daily_used_quota', 'daily_quota_used', 'today_used', 'today_used_quota', 'day_used', 'day_used_amount', 'day_used_quota', 'daily_amount_used', 'used_day']
    : ['weekly_used', 'weekly_used_quota', 'weekly_quota_used', 'week_used', 'week_used_quota', 'week_used_amount', 'weekly_amount_used', 'used_week']
  const limitKeys = side === 'daily'
    ? ['daily_limit', 'daily_quota', 'daily_total', 'daily_quota_limit', 'today_quota', 'today_limit', 'day_limit', 'day_limit_amount', 'day_quota', 'day_quota_amount', 'daily_amount', 'daily_amount_total']
    : ['weekly_limit', 'weekly_quota', 'weekly_total', 'weekly_quota_limit', 'week_quota', 'week_limit', 'week_limit_amount', 'week_quota_amount', 'weekly_amount', 'weekly_amount_total']
  const used = usedKeys.map((key) => record[key]).find((value) => num(value) !== null)
  const limitKey = limitKeys.find((key) => num(record[key]) !== null)
  const limit = limitKey ? record[limitKey] : undefined
  const resetKey = side === 'daily'
    ? record.daily_reset_at ?? record.dailyResetAt ?? record.today_reset_at ?? record.day_reset_at ?? record.next_reset_time ?? record.nextResetTime
    : record.weekly_reset_at ?? record.weeklyResetAt ?? record.week_reset_at ?? record.weekly_next_reset_time ?? record.weeklyNextResetTime
  const unlimited = isUnlimitedFlag(record[`${side}_unlimited`] ?? record[`${side}Unlimited`] ?? record[`${short}_unlimited`])
  // NewAPI 用 weekly_amount_total = 0 表示没有周上限，不是「不限额」。
  if (
    !unlimited
    && limitKey
    && ['weekly_amount_total', 'weeklyAmountTotal', 'weekly_amount'].includes(limitKey)
    && num(limit) === 0
  ) {
    return undefined
  }
  return readPair(used, limit, mode, toIso(resetKey), unlimited)
}

function readQuotaList(source: unknown, mode: AmountMode): { daily?: PackageQuotaWindow; weekly?: PackageQuotaWindow } {
  if (!source || typeof source !== 'object') return {}
  const record = source as Record<string, unknown>
  const list = record.quotas ?? record.sub_quotas ?? record.subQuotas ?? record.limits
  if (!Array.isArray(list)) return {}
  const found: { daily?: PackageQuotaWindow; weekly?: PackageQuotaWindow } = {}
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const period = classifyPeriod(row.period ?? row.reset_period ?? row.quota_reset_period ?? row.type ?? row.cycle ?? row.name ?? row.title)
    const pair = readPair(
      row.used ?? row.used_quota ?? row.amount_used,
      row.limit ?? row.quota ?? row.amount_total ?? row.total,
      amountScale(row.unit ?? row.currency, mode),
      toIso(row.resetsAt ?? row.resets_at ?? row.reset_at ?? row.next_reset_time ?? row.nextResetTime),
      isUnlimitedFlag(row.unlimited ?? row.is_unlimited),
    )
    if (!pair || period === 'combo' || period === 'other') continue
    if (period === 'daily') found.daily = found.daily ?? pair
    if (period === 'weekly') found.weekly = found.weekly ?? pair
  }
  return found
}

function fromPeriodAmounts(source: Record<string, unknown>, mode: AmountMode): PackageQuotaWindow | undefined {
  return readPair(
    source.amount_used ?? source.amountUsed ?? source.used_quota ?? source.usedQuota,
    source.amount_total ?? source.amountTotal ?? source.total_amount ?? source.totalAmount,
    amountScale(source.unit ?? source.currency, mode),
    toIso(source.next_reset_time ?? source.nextResetTime ?? source.reset_at ?? source.resetsAt),
  )
}

interface PlanMeta {
  title?: string
  period?: string
}

function indexPlans(payload: unknown): Map<string, PlanMeta> {
  const map = new Map<string, PlanMeta>()
  const { data } = unwrap(payload)
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? ((data as Record<string, unknown>).plans
        ?? (data as Record<string, unknown>).items
        ?? (data as Record<string, unknown>).list)
      : null
  if (!Array.isArray(list)) return map
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const box = item as Record<string, unknown>
    const plan = box.plan && typeof box.plan === 'object' ? box.plan as Record<string, unknown> : box
    const id = plan.id ?? box.plan_id ?? box.planId
    if (id === undefined || id === null || id === '') continue
    const title = text(plan.title ?? plan.name)
    const period = text(plan.quota_reset_period ?? plan.plan_quota_reset_period ?? plan.reset_period ?? plan.period).toLowerCase()
    map.set(String(id), {
      title: title || undefined,
      period: period || undefined,
    })
  }
  return map
}

function pickList(payload: unknown): unknown[] {
  const { data } = unwrap(payload)
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const record = data as Record<string, unknown>
  if (Array.isArray(record.subscriptions)) return record.subscriptions
  if (Array.isArray(record.packages)) return record.packages
  if (Array.isArray(record.items)) return record.items
  return []
}

function isActive(source: Record<string, unknown>, now: number): boolean {
  const status = text(source.status ?? source.state).toLowerCase()
  if (['expired', 'cancelled', 'canceled', 'disabled', 'inactive', 'invalid'].includes(status)) return false
  const end = readTimeMs(source.end_time ?? source.endTime ?? source.expires_at ?? source.expiresAt ?? source.expire_time)
  if (end !== null && end <= now) return false
  return true
}

function readDaysLeft(source: Record<string, unknown>, now: number): number | undefined {
  const explicit = num(source.daysLeft ?? source.days_left ?? source.remain_days ?? source.remaining_days ?? source.remainDays)
  if (explicit !== null && explicit >= 0) return Math.round(explicit)
  const end = readTimeMs(source.end_time ?? source.endTime ?? source.expires_at ?? source.expiresAt ?? source.expire_time)
  if (end === null || end <= now) return undefined
  const endDate = new Date(end)
  const nowDate = new Date(now)
  const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  const nowUtc = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate())
  return Math.max(0, Math.round((endUtc - nowUtc) / 86_400_000))
}

function mapPackage(item: unknown, plans: Map<string, PlanMeta>, mode: AmountMode, now: number): PackagePlan | null {
  if (!item || typeof item !== 'object') return null
  const box = item as Record<string, unknown>
  const sub = box.subscription && typeof box.subscription === 'object'
    ? box.subscription as Record<string, unknown>
    : box
  const embedded = (box.plan && typeof box.plan === 'object' ? box.plan : sub.plan) as Record<string, unknown> | undefined
  if (!isActive(sub, now)) return null

  const planId = sub.plan_id ?? sub.planId ?? embedded?.id
  const catalog = planId !== undefined && planId !== null ? plans.get(String(planId)) : undefined
  const name = text(sub.name ?? sub.title ?? sub.plan_name ?? sub.planName ?? sub.plan_title ?? sub.package_name)
    || text(box.plan_title ?? box.planTitle ?? box.name ?? box.title)
    || text(embedded?.title ?? embedded?.name)
    || catalog?.title
    || ''
  const idRaw = sub.id ?? planId
  const id = idRaw === undefined || idRaw === null || idRaw === '' ? undefined : String(idRaw)
  const resolvedName = name || (id ? `套餐 #${id}` : '')
  if (!resolvedName) return null

  const periodKind = classifyPeriod(
    box.plan_quota_reset_period ?? box.planQuotaResetPeriod
    ?? embedded?.quota_reset_period ?? embedded?.reset_period
    ?? sub.plan_quota_reset_period ?? sub.planQuotaResetPeriod
    ?? sub.quota_reset_period ?? sub.reset_period
    ?? catalog?.period,
  )
  const limitKind = classifyPeriod(
    sub.limit_type ?? sub.limitType ?? sub.quota_type ?? sub.quotaType
    ?? embedded?.limit_type ?? embedded?.limitType ?? embedded?.quota_type
    ?? box.limit_type ?? box.limitType ?? box.quota_type ?? box.quotaType,
  )
  const listed = readQuotaList(sub, mode)
  const listedEmbedded = embedded ? readQuotaList(embedded, mode) : {}
  const listedBox = box !== sub ? readQuotaList(box, mode) : {}
  let daily = readWindow(sub, 'daily', mode)
    ?? readWindow(embedded, 'daily', mode)
    ?? (box !== sub ? readWindow(box, 'daily', mode) : undefined)
    ?? listed.daily
    ?? listedEmbedded.daily
    ?? listedBox.daily
  let weekly = readWindow(sub, 'weekly', mode)
    ?? readWindow(embedded, 'weekly', mode)
    ?? (box !== sub ? readWindow(box, 'weekly', mode) : undefined)
    ?? listed.weekly
    ?? listedEmbedded.weekly
    ?? listedBox.weekly
  // 已经从 weekly_amount_* / week_* 读到的周窗口。后面不要再用同一份 amount_* 覆盖它。
  const weeklyFromFields = weekly
  // 「周日限额」是周+日同时存在。单一 amount_used/amount_total 不能拆成两根进度条，也不当成周限额。
  const combo = periodKind === 'combo' || limitKind === 'combo'
  if (!combo && !daily && (periodKind === 'daily' || limitKind === 'daily')) {
    daily = fromPeriodAmounts(sub, mode) ?? (box !== sub ? fromPeriodAmounts(box, mode) : undefined)
  }
  if (!combo && !weekly && (periodKind === 'weekly' || limitKind === 'weekly')) {
    weekly = fromPeriodAmounts(sub, mode) ?? (box !== sub ? fromPeriodAmounts(box, mode) : undefined)
  }
  // amount_* 与 weekly_amount_* 是两套总额。周字段已经单独出现时，amount_* 是另一根（日）额度，
  // 即使 plan_quota_reset_period 写成 daily，或这个字段缺失，也不能只显示其中一根。
  const amountTotal = num(sub.amount_total ?? sub.amountTotal)
    ?? (box !== sub ? num(box.amount_total ?? box.amountTotal) : null)
  if (!daily && weeklyFromFields && amountTotal !== null && amountTotal > 0) {
    daily = fromPeriodAmounts(sub, mode) ?? (box !== sub ? fromPeriodAmounts(box, mode) : undefined)
  }

  const daysLeft = readDaysLeft(sub, now)
  const expiresAt = toIso(sub.expiresAt ?? sub.expires_at ?? sub.end_time ?? sub.endTime ?? sub.expire_time)
  const status = text(sub.status ?? sub.state) || undefined
  const plan: PackagePlan = { name: resolvedName, quotaMode: quotaModeFor(daily, weekly) }
  if (id) plan.id = id
  if (status) plan.status = status
  if (daysLeft !== undefined) plan.daysLeft = daysLeft
  if (expiresAt) plan.expiresAt = expiresAt
  if (daily) plan.daily = daily
  if (weekly) plan.weekly = weekly
  return plan
}

function readBalance(user: Record<string, unknown> | null): number | null {
  if (!user) return null
  // NewAPI 钱包余额固定是 quota 配额单位，和套餐 amountMode 分开。
  const quota = num(user.quota)
  if (quota !== null) return roundMoney(quota / QUOTA_PER_UNIT)
  const balance = num(user.balance ?? user.remain ?? user.remaining)
  return balance === null ? null : roundMoney(balance)
}

function readCurrency(user: Record<string, unknown> | null, fallback: string): string {
  const value = text(user?.currency).toUpperCase()
  if (/^[A-Z]{3}$/.test(value)) return value
  return (fallback || 'USD').toUpperCase()
}

export interface NormalizeUsageInput {
  userSelf: unknown
  packagePayload?: unknown
  plansPayload?: unknown
  amountMode: AmountMode
  currency: string
  now?: number
}

export function normalizeUsage(input: NormalizeUsageInput): { balance: number | null; currency: string; packages: PackagePlan[]; error?: string } {
  const unwrappedUser = unwrap(input.userSelf)
  if (unwrappedUser.error) {
    return { balance: null, currency: input.currency || 'USD', packages: [], error: 'upstream_failed' }
  }
  const user = unwrappedUser.data && typeof unwrappedUser.data === 'object' && !Array.isArray(unwrappedUser.data)
    ? unwrappedUser.data as Record<string, unknown>
    : null
  if (!user) {
    return { balance: null, currency: input.currency || 'USD', packages: [], error: 'upstream_failed' }
  }

  const now = input.now ?? Date.now()
  const plans = indexPlans(input.plansPayload)
  const seen = new Set<string>()
  const packages: PackagePlan[] = []
  const items = [...pickList(input.packagePayload), ...pickList(user)]
  for (const item of items) {
    const plan = mapPackage(item, plans, input.amountMode, now)
    if (!plan) continue
    const key = plan.id ? `id:${plan.id}` : `name:${plan.name}`
    if (seen.has(key)) continue
    seen.add(key)
    packages.push(plan)
    if (packages.length >= 20) break
  }

  if (packages.length === 0) {
    const group = text(user.group ?? user.group_name ?? user.plan_name ?? user.planName)
    packages.push({ name: group || '默认套餐', quotaMode: 'none' })
  }

  return {
    balance: readBalance(user),
    currency: readCurrency(user, input.currency),
    packages,
  }
}

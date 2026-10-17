import { queryOne, run } from '../utils/index.js'
import {
  type PackageUsageConfig,
  type PackageUsageDto,
  type PublicPackageUsageConfig,
  defaultPackageUsageConfig,
  finalizePackageConfig,
  joinUrl,
  mergePackageConfig,
  normalizeUsage,
  packageDetailPathFor,
  toPublicConfig,
} from './packageUsageModel.js'

const SETTINGS_KEY = 'packageUsage'
const MAX_BODY = 1_000_000

interface CacheEntry {
  key: string
  expiresAt: number
  dto: PackageUsageDto
}

let cache: CacheEntry | null = null
let inflight: { key: string; promise: Promise<PackageUsageDto> } | null = null

export function clearPackageUsageCache(): void {
  cache = null
  inflight = null
}

function readStored(): PackageUsageConfig | null {
  const row = queryOne('SELECT value FROM settings WHERE key = ?', [SETTINGS_KEY]) as
    | { value: string }
    | undefined
  if (!row?.value) return null
  try {
    const parsed = JSON.parse(row.value) as Partial<PackageUsageConfig>
    return finalizePackageConfig(mergePackageConfig(null, parsed))
  } catch (error) {
    console.error('读取套餐配置失败:', error instanceof Error ? error.message : error)
    return null
  }
}

export function getPublicPackageConfig(): PublicPackageUsageConfig {
  const stored = readStored()
  return toPublicConfig(stored ?? defaultPackageUsageConfig())
}

export function savePackageConfig(incoming: unknown): PublicPackageUsageConfig {
  const previous = readStored()
  const merged = finalizePackageConfig(mergePackageConfig(previous, incoming))
  const serialized = JSON.stringify(merged)
  const now = new Date().toISOString()
  const existing = queryOne('SELECT key FROM settings WHERE key = ?', [SETTINGS_KEY])
  if (existing) {
    run('UPDATE settings SET value = ?, updatedAt = ? WHERE key = ?', [serialized, now, SETTINGS_KEY])
  } else {
    run('INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)', [SETTINGS_KEY, serialized, now])
  }
  clearPackageUsageCache()
  return toPublicConfig(merged)
}

/** 供公开 settings 响应合并令牌，避免回写掩码时清空密钥。 */
export function mergeStoredPackageConfig(existingRaw: string | undefined, incoming: unknown): string {
  let previous: Partial<PackageUsageConfig> | null = null
  if (existingRaw) {
    try { previous = JSON.parse(existingRaw) } catch { previous = null }
  }
  return JSON.stringify(finalizePackageConfig(mergePackageConfig(previous, incoming)))
}

export function publicPackageSettingsValue(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Partial<PackageUsageConfig>
    return JSON.stringify(toPublicConfig(mergePackageConfig(null, {
      ...parsed,
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : '',
    })))
  } catch {
    return ''
  }
}

function cacheKey(cfg: PackageUsageConfig): string {
  return JSON.stringify({
    preset: cfg.preset,
    baseUrl: cfg.baseUrl,
    userId: cfg.userId,
    path: packageDetailPathFor(cfg),
    amountMode: cfg.amountMode,
    currency: cfg.currency,
    token: cfg.accessToken,
  })
}

function emptyDto(cfg: PackageUsageConfig | null, error: string): PackageUsageDto {
  return {
    ok: false,
    enabled: true,
    balance: null,
    currency: cfg?.currency || 'USD',
    packages: [],
    updatedAt: null,
    refreshIntervalMin: cfg?.refreshIntervalMin ?? 0,
    error,
  }
}

async function fetchJson(url: string, cfg: PackageUsageConfig): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.accessToken}`,
      'New-Api-User': cfg.userId,
    },
    signal: AbortSignal.timeout(cfg.timeoutSec * 1000),
  })
  if (response.status >= 300 && response.status < 400) {
    return { ok: false, error: 'upstream_failed' }
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, error: 'upstream_unauthorized' }
  }
  if (response.status === 404) {
    return { ok: false, error: 'not_found' }
  }
  if (response.status < 200 || response.status >= 300) {
    return { ok: false, error: 'upstream_failed' }
  }
  const text = await response.text()
  if (text.length > MAX_BODY) return { ok: false, error: 'upstream_failed' }
  if (!text) return { ok: true, body: null }
  try {
    return { ok: true, body: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, error: 'upstream_failed' }
  }
}

async function queryUncached(cfg: PackageUsageConfig): Promise<PackageUsageDto> {
  if (!cfg.baseUrl || !cfg.accessToken) return emptyDto(cfg, 'not_configured')
  if (cfg.preset === 'newapi' && !cfg.userId) return emptyDto(cfg, 'missing_user_id')

  let userSelf: unknown
  try {
    const self = await fetchJson(joinUrl(cfg.baseUrl, '/api/user/self'), cfg)
    if (!self.ok) return emptyDto(cfg, self.error === 'not_found' ? 'upstream_failed' : self.error)
    userSelf = self.body
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    console.error('套餐余额查询失败:', timedOut ? 'timeout' : error instanceof Error ? error.message : 'error')
    return emptyDto(cfg, timedOut ? 'timeout' : 'upstream_failed')
  }

  const detailPath = packageDetailPathFor(cfg)
  let packagePayload: unknown
  if (detailPath) {
    try {
      const detail = await fetchJson(joinUrl(cfg.baseUrl, detailPath), cfg)
      if (detail.ok) packagePayload = detail.body
    } catch (error) {
      console.error('套餐详情查询失败:', error instanceof Error ? error.name : 'error')
    }
  }

  let plansPayload: unknown
  if (cfg.preset === 'newapi') {
    try {
      const plans = await fetchJson(joinUrl(cfg.baseUrl, '/api/subscription/plans'), cfg)
      if (plans.ok) plansPayload = plans.body
    } catch (error) {
      console.error('套餐目录查询失败:', error instanceof Error ? error.name : 'error')
    }
  }

  const normalized = normalizeUsage({
    userSelf,
    packagePayload,
    plansPayload,
    amountMode: cfg.amountMode,
    currency: cfg.currency,
  })
  if (normalized.error) return emptyDto(cfg, normalized.error)

  return {
    ok: true,
    enabled: true,
    balance: normalized.balance,
    currency: normalized.currency,
    packages: normalized.packages,
    updatedAt: new Date().toISOString(),
    refreshIntervalMin: cfg.refreshIntervalMin,
  }
}

export async function queryPackageUsage(options?: {
  override?: unknown
  bypassCache?: boolean
}): Promise<PackageUsageDto> {
  const stored = readStored()
  const cfg = finalizePackageConfig(mergePackageConfig(stored, options?.override ?? stored ?? {}))
  if (!cfg.baseUrl || !cfg.accessToken) return emptyDto(cfg, 'not_configured')

  const key = cacheKey(cfg)
  const now = Date.now()
  if (!options?.bypassCache && cache && cache.key === key && cache.expiresAt > now) {
    return cache.dto
  }
  if (!options?.bypassCache && inflight?.key === key) return inflight.promise

  const promise = queryUncached(cfg).then((dto) => {
    const ttl = cfg.refreshIntervalMin > 0
      ? Math.max(15_000, cfg.refreshIntervalMin * 60_000)
      : 15_000
    if (dto.ok) cache = { key, expiresAt: Date.now() + ttl, dto }
    return dto
  }).finally(() => {
    if (inflight?.promise === promise) inflight = null
  })
  inflight = { key, promise }
  return promise
}

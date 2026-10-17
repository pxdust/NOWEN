import { Router, Request, Response } from 'express'
import { queryOne } from '../utils/index.js'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/index.js'
import {
  getPublicPackageConfig,
  queryPackageUsage,
  savePackageConfig,
} from '../services/packageUsage.js'

const router = Router()

function widgetAccess(): { enabled: boolean; isPublic: boolean } {
  const row = queryOne('SELECT value FROM settings WHERE key = ?', ['widgetVisibility']) as
    | { value: string }
    | undefined
  if (!row?.value) return { enabled: false, isPublic: false }
  try {
    const parsed = JSON.parse(row.value) as { packageUsage?: boolean; packageUsageAccess?: string }
    return {
      enabled: parsed.packageUsage === true,
      isPublic: parsed.packageUsageAccess === 'public',
    }
  } catch {
    return { enabled: false, isPublic: false }
  }
}

router.get('/config', authMiddleware, (_req: Request, res: Response) => {
  res.json(getPublicPackageConfig())
})

router.put('/config', authMiddleware, (req: Request, res: Response) => {
  try {
    res.json(savePackageConfig(req.body))
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败'
    res.status(400).json({ error: message })
  }
})

router.post('/test', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dto = await queryPackageUsage({ override: req.body, bypassCache: true })
    res.json(dto)
  } catch (error) {
    const message = error instanceof Error ? error.message : '测试失败'
    res.status(400).json({ ok: false, error: message })
  }
})

router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  const access = widgetAccess()
  if (!access.enabled) {
    return res.json({
      ok: true,
      enabled: false,
      balance: null,
      currency: 'USD',
      packages: [],
      updatedAt: null,
      refreshIntervalMin: 0,
    })
  }
  if (!access.isPublic && !(req as Request & { user?: unknown }).user) {
    return res.status(401).json({ ok: false, error: 'private' })
  }
  try {
    const dto = await queryPackageUsage()
    res.json({ ...dto, enabled: true })
  } catch (error) {
    console.error('套餐用量查询失败:', error instanceof Error ? error.message : error)
    res.status(500).json({ ok: false, enabled: true, error: 'upstream_failed', balance: null, currency: 'USD', packages: [], updatedAt: null, refreshIntervalMin: 0 })
  }
})

export default router

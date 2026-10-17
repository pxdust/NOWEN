import assert from 'node:assert/strict'
import {
  mergePackageConfig,
  normalizeUsage,
  toPublicConfig,
  type PackageUsageConfig,
} from '../src/services/packageUsageModel.ts'

const NOW = Date.parse('2026-10-17T00:00:00Z')

function userSelf(extra: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      quota: 1_840_000,
      used_quota: 4_323_575_000,
      group: 'default',
      ...extra,
    },
  }
}

async function main() {
  const balanceOnly = normalizeUsage({
    userSelf: userSelf(),
    amountMode: 'quota',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(balanceOnly.balance, 3.68)
  assert.equal(balanceOnly.currency, 'USD')
  assert.equal(balanceOnly.packages.length, 1)
  assert.equal(balanceOnly.packages[0].name, 'default')
  assert.equal(balanceOnly.packages[0].quotaMode, 'none')
  assert.equal(balanceOnly.packages[0].daily, undefined)
  assert.equal(balanceOnly.packages[0].weekly, undefined)

  const emptyGroup = normalizeUsage({
    userSelf: userSelf({ group: '' }),
    amountMode: 'quota',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(emptyGroup.packages[0].name, '默认套餐')

  const dailyOnly = normalizeUsage({
    userSelf: userSelf({ group: 'vip' }),
    plansPayload: {
      success: true,
      data: [{ plan: { id: 7, title: 'Codex 月卡', quota_reset_period: 'daily' } }],
    },
    packagePayload: {
      success: true,
      data: {
        subscriptions: [{
          subscription: {
            id: 11,
            plan_id: 7,
            status: 'active',
            amount_used: 13_570_000,
            amount_total: 25_000_000,
            end_time: Date.parse('2026-11-09T10:17:00Z') / 1000,
            next_reset_time: Date.parse('2026-10-18T00:00:00Z') / 1000,
          },
        }],
      },
    },
    amountMode: 'quota',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(dailyOnly.packages.length, 1)
  assert.equal(dailyOnly.packages[0].name, 'Codex 月卡')
  assert.equal(dailyOnly.packages[0].quotaMode, 'daily')
  assert.equal(dailyOnly.packages[0].daily?.used, 27.14)
  assert.equal(dailyOnly.packages[0].daily?.limit, 50)
  assert.equal(dailyOnly.packages[0].weekly, undefined)
  assert.equal(dailyOnly.packages[0].daysLeft, 23)
  assert.ok(dailyOnly.packages[0].daily?.resetsAt)

  const weeklyOnly = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      data: {
        subscriptions: [{
          subscription: {
            id: 3,
            status: 'active',
            amount_used: 100_000,
            amount_total: 200_000,
            quota_reset_period: 'weekly',
            end_time: Date.parse('2026-10-20T00:00:00Z') / 1000,
          },
        }],
      },
    },
    amountMode: 'quota',
    currency: 'CNY',
    now: NOW,
  })
  assert.equal(weeklyOnly.currency, 'CNY')
  assert.equal(weeklyOnly.packages[0].quotaMode, 'weekly')
  assert.equal(weeklyOnly.packages[0].weekly?.used, 0.2)
  assert.equal(weeklyOnly.packages[0].weekly?.limit, 0.4)
  assert.equal(weeklyOnly.packages[0].daily, undefined)

  const bothAndPartial = normalizeUsage({
    userSelf: userSelf({ quota: 500_000, currency: 'CNY' }),
    packagePayload: {
      packages: [
        {
          id: 'a',
          name: '日卡',
          status: 'active',
          days_left: 2,
          daily: { used: 1, limit: 4 },
        },
        {
          id: 'b',
          name: '双周期',
          status: 'active',
          daily: { used: 27.14, limit: 50, resets_at: '2026-10-18T00:00:00Z' },
          weekly: { used: 149.5, limit: 250 },
          expires_at: '2026-11-09T10:17:00Z',
        },
        {
          id: 'c',
          name: '已过期',
          status: 'expired',
          daily: { used: 1, limit: 1 },
        },
        {
          id: 'd',
          name: '不限额',
          status: 'active',
          daily: { used: 3, limit: 0 },
        },
        {
          id: 'e',
          name: '周不限日有限',
          status: 'active',
          daily: { used: 1, limit: 10 },
          weekly: { unlimited: true },
        },
      ],
    },
    amountMode: 'money',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(bothAndPartial.balance, 1)
  assert.equal(bothAndPartial.currency, 'CNY')
  assert.deepEqual(bothAndPartial.packages.map((item) => item.name), ['日卡', '双周期', '不限额', '周不限日有限'])
  assert.deepEqual(bothAndPartial.packages.map((item) => item.quotaMode), ['daily', 'daily_and_weekly', 'daily', 'daily_and_weekly'])
  assert.equal(bothAndPartial.packages[0].daily?.used, 1)
  assert.equal(bothAndPartial.packages[0].weekly, undefined)
  assert.equal(bothAndPartial.packages[0].daysLeft, 2)
  assert.equal(bothAndPartial.packages[1].daily?.limit, 50)
  assert.equal(bothAndPartial.packages[1].weekly?.used, 149.5)
  assert.equal(bothAndPartial.packages[1].expiresAt, '2026-11-09T10:17:00.000Z')
  assert.equal(bothAndPartial.packages[2].daily?.unlimited, true)
  assert.equal(bothAndPartial.packages[2].daily?.used, 3)
  assert.equal(bothAndPartial.packages[2].daily?.limit, undefined)
  assert.equal(bothAndPartial.packages[2].weekly, undefined)
  assert.equal(bothAndPartial.packages[3].daily?.limit, 10)
  assert.equal(bothAndPartial.packages[3].weekly?.unlimited, true)
  assert.equal(bothAndPartial.packages[3].weekly?.used, undefined)
  assert.equal(bothAndPartial.packages[3].weekly?.limit, undefined)

  const monthly = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      subscriptions: [{
        subscription: {
          id: 9,
          status: 'active',
          amount_used: 500_000,
          amount_total: 1_000_000,
          quota_reset_period: 'monthly',
          end_time: Date.parse('2026-12-01T00:00:00Z') / 1000,
        },
      }],
    },
    amountMode: 'quota',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(monthly.packages[0].name, '套餐 #9')
  assert.equal(monthly.packages[0].quotaMode, 'none')
  assert.equal(monthly.packages[0].daily, undefined)
  assert.equal(monthly.packages[0].weekly, undefined)
  assert.equal(typeof monthly.packages[0].daysLeft, 'number')

  const unlimitedDaily = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      subscriptions: [{
        subscription: {
          id: 4,
          status: 'active',
          amount_used: 500_000,
          amount_total: 0,
          quota_reset_period: 'daily',
          end_time: Date.parse('2026-10-20T00:00:00Z') / 1000,
        },
      }],
    },
    amountMode: 'quota',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(unlimitedDaily.packages[0].quotaMode, 'daily')
  assert.equal(unlimitedDaily.packages[0].daily?.unlimited, true)
  assert.equal(unlimitedDaily.packages[0].daily?.used, 1)
  assert.equal(unlimitedDaily.packages[0].daily?.limit, undefined)
  assert.equal(unlimitedDaily.packages[0].weekly, undefined)

  const failed = normalizeUsage({
    userSelf: { success: false, message: '无权访问' },
    amountMode: 'quota',
    currency: 'USD',
  })
  assert.equal(failed.error, 'upstream_failed')
  assert.equal(failed.balance, null)
  assert.equal(failed.packages.length, 0)

  const stored: PackageUsageConfig = {
    preset: 'newapi',
    baseUrl: 'https://nowcoding.ai',
    accessToken: 'sk-live-secret-1234',
    userId: '318',
    timeoutSec: 10,
    refreshIntervalMin: 5,
    currency: 'USD',
    packageDetailPath: '',
    amountMode: 'quota',
  }
  const pub = toPublicConfig(stored)
  assert.equal(pub.hasToken, true)
  assert.equal(pub.tokenPreview, '••••••1234')
  assert.equal(JSON.stringify(pub).includes('sk-live'), false)

  const kept = mergePackageConfig(stored, { ...pub, baseUrl: 'https://example.com', accessToken: pub.tokenPreview })
  assert.equal(kept.accessToken, stored.accessToken)
  assert.equal(kept.baseUrl, 'https://example.com')

  const replaced = mergePackageConfig(stored, { accessToken: 'new-token-9999' })
  assert.equal(replaced.accessToken, 'new-token-9999')
  assert.equal(replaced.userId, '318')

  console.log('package usage normalizer ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

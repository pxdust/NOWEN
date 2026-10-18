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
    defaultTier: 'large',
  }
  const pub = toPublicConfig(stored)
  assert.equal(pub.hasToken, true)
  assert.equal(pub.tokenPreview, '••••••1234')
  assert.equal(pub.defaultTier, 'large')
  assert.equal(JSON.stringify(pub).includes('sk-live'), false)

  const kept = mergePackageConfig(stored, { ...pub, baseUrl: 'https://example.com', accessToken: pub.tokenPreview })
  assert.equal(kept.accessToken, stored.accessToken)
  assert.equal(kept.baseUrl, 'https://example.com')
  assert.equal(kept.defaultTier, 'large')

  const miniDefault = mergePackageConfig(stored, { defaultTier: 'mini' })
  assert.equal(miniDefault.defaultTier, 'mini')
  assert.equal(miniDefault.accessToken, stored.accessToken)
  const invalidTier = mergePackageConfig(miniDefault, { defaultTier: 'huge' })
  assert.equal(invalidTier.defaultTier, 'mini')
  const omittedTier = mergePackageConfig(miniDefault, { currency: 'CNY' })
  assert.equal(omittedTier.defaultTier, 'mini')
  assert.equal(omittedTier.currency, 'CNY')
  const freshTier = mergePackageConfig(null, {})
  assert.equal(freshTier.defaultTier, 'large')
  const publicMini = toPublicConfig(miniDefault)
  assert.equal(publicMini.defaultTier, 'mini')
  assert.equal(JSON.stringify(publicMini).includes('sk-live'), false)

  const replaced = mergePackageConfig(stored, { accessToken: 'new-token-9999' })
  assert.equal(replaced.accessToken, 'new-token-9999')
  assert.equal(replaced.userId, '318')

  const weekAndDay = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      packages: [{
        name: '双休套餐',
        status: 'active',
        limit_type: '周日限额',
        quota_reset_period: 'weekly',
        amount_used: 999,
        amount_total: 999,
        day_used_amount: 27.14,
        day_limit_amount: 50,
        week_used_amount: 149.5,
        week_limit_amount: 250,
      }],
    },
    amountMode: 'money',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(weekAndDay.packages[0].name, '双休套餐')
  assert.equal(weekAndDay.packages[0].quotaMode, 'daily_and_weekly')
  assert.equal(weekAndDay.packages[0].daily?.used, 27.14)
  assert.equal(weekAndDay.packages[0].daily?.limit, 50)
  assert.equal(weekAndDay.packages[0].weekly?.used, 149.5)
  assert.equal(weekAndDay.packages[0].weekly?.limit, 250)

  const comboOnOuter = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      subscriptions: [{
        limit_type: '周日限额',
        day_used_amount: 1,
        day_limit_amount: 2,
        week_used_amount: 3,
        week_limit_amount: 4,
        subscription: {
          id: 8,
          status: 'active',
          name: '外层额度',
          quota_reset_period: 'weekly',
          amount_used: 50,
          amount_total: 80,
        },
      }],
    },
    amountMode: 'money',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(comboOnOuter.packages[0].name, '外层额度')
  assert.equal(comboOnOuter.packages[0].quotaMode, 'daily_and_weekly')
  assert.equal(comboOnOuter.packages[0].daily?.limit, 2)
  assert.equal(comboOnOuter.packages[0].weekly?.limit, 4)

  const comboWithoutSplit = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      packages: [{
        name: '未拆分',
        status: 'active',
        limit_type: '周日限额',
        quota_reset_period: 'weekly',
        amount_used: 10,
        amount_total: 20,
      }],
    },
    amountMode: 'money',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(comboWithoutSplit.packages[0].quotaMode, 'none')
  assert.equal(comboWithoutSplit.packages[0].daily, undefined)
  assert.equal(comboWithoutSplit.packages[0].weekly, undefined)

  // 线上 /api/subscription/self：周期写在外层 plan_quota_reset_period=daily，
  // 日额度是 amount_*，周额度是 weekly_amount_*。配额 ÷500000。
  const liveDual = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      success: true,
      data: {
        all_subscriptions: [{
          subscription: {
            id: 3889,
            status: 'expired',
            amount_total: 50_000_000,
            amount_used: 2_447_591,
            weekly_amount_total: 250_000_000,
            weekly_amount_used: 105_182_838,
            end_time: 1_791_771_033,
          },
          plan_title: '【双休套餐】Codex 月卡 2000$',
          plan_quota_reset_period: 'daily',
        }],
        subscriptions: [{
          subscription: {
            id: 4517,
            amount_total: 25_000_000,
            amount_used: 20_460,
            weekly_amount_total: 125_000_000,
            weekly_amount_used: 76_875_149,
            weekly_next_reset_time: 1_792_376_277,
            next_reset_time: 1_792_339_200,
            end_time: 1_794_190_677,
            status: 'active',
          },
          plan_title: '【双休套餐】Codex 月卡 1000$',
          plan_quota_reset_period: 'daily',
        }],
      },
    },
    amountMode: 'quota',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(liveDual.balance, 3.68)
  assert.equal(liveDual.packages.length, 1)
  assert.equal(liveDual.packages[0].id, '4517')
  assert.equal(liveDual.packages[0].name, '【双休套餐】Codex 月卡 1000$')
  assert.equal(liveDual.packages[0].quotaMode, 'daily_and_weekly')
  assert.equal(liveDual.packages[0].daily?.used, 0.04)
  assert.equal(liveDual.packages[0].daily?.limit, 50)
  assert.equal(liveDual.packages[0].daily?.resetsAt, '2026-10-18T16:00:00.000Z')
  assert.equal(liveDual.packages[0].weekly?.used, 153.75)
  assert.equal(liveDual.packages[0].weekly?.limit, 250)
  assert.equal(liveDual.packages[0].weekly?.resetsAt, '2026-10-19T02:17:57.000Z')
  assert.equal(liveDual.packages[0].expiresAt, '2026-11-09T02:17:57.000Z')
  assert.equal(liveDual.packages[0].daysLeft, 23)
  assert.equal(liveDual.packages[0].status, 'active')

  const dualWithoutPeriod = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      subscriptions: [{
        plan_title: '无周期字段',
        subscription: {
          id: 12,
          status: 'active',
          amount_used: 20_460,
          amount_total: 25_000_000,
          weekly_amount_used: 76_875_149,
          weekly_amount_total: 125_000_000,
          end_time: Date.parse('2026-11-09T02:17:57Z') / 1000,
        },
      }],
    },
    amountMode: 'quota',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(dualWithoutPeriod.packages[0].quotaMode, 'daily_and_weekly')
  assert.equal(dualWithoutPeriod.packages[0].daily?.used, 0.04)
  assert.equal(dualWithoutPeriod.packages[0].daily?.limit, 50)
  assert.equal(dualWithoutPeriod.packages[0].weekly?.used, 153.75)
  assert.equal(dualWithoutPeriod.packages[0].weekly?.limit, 250)

  const dailyWrapperOnly = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      subscriptions: [{
        plan_title: '仅日卡',
        plan_quota_reset_period: 'daily',
        subscription: {
          id: 13,
          status: 'active',
          amount_used: 500_000,
          amount_total: 1_000_000,
          end_time: Date.parse('2026-10-20T00:00:00Z') / 1000,
        },
      }],
    },
    amountMode: 'quota',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(dailyWrapperOnly.packages[0].name, '仅日卡')
  assert.equal(dailyWrapperOnly.packages[0].quotaMode, 'daily')
  assert.equal(dailyWrapperOnly.packages[0].daily?.used, 1)
  assert.equal(dailyWrapperOnly.packages[0].daily?.limit, 2)
  assert.equal(dailyWrapperOnly.packages[0].weekly, undefined)

  const zeroWeekly = normalizeUsage({
    userSelf: userSelf(),
    packagePayload: {
      subscriptions: [{
        plan_title: '周字段为零',
        plan_quota_reset_period: 'daily',
        subscription: {
          id: 14,
          status: 'active',
          amount_used: 500_000,
          amount_total: 1_000_000,
          weekly_amount_used: 0,
          weekly_amount_total: 0,
          end_time: Date.parse('2026-10-20T00:00:00Z') / 1000,
        },
      }],
    },
    amountMode: 'quota',
    currency: 'USD',
    now: NOW,
  })
  assert.equal(zeroWeekly.packages[0].quotaMode, 'daily')
  assert.equal(zeroWeekly.packages[0].weekly, undefined)

  console.log('package usage normalizer ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

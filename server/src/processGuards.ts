/**
 * 网络抓取 / HTML 解析失败不能把 API 进程打死。
 * Node 默认会把未处理的 Promise 拒绝转成未捕获异常并退出；
 * 这里接住这类错误，只对真正无法继续的异常退出。
 */

type EmergencySave = () => void

interface ErrorLike {
  name?: string
  message?: string
  code?: string
  cause?: unknown
  errors?: unknown[]
}

const NON_FATAL_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ECONNABORTED',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_ABORTED',
  'ABORT_ERR',
])

let installed = false
let emergencySave: EmergencySave | null = null

export function setEmergencySave(fn: EmergencySave) {
  emergencySave = fn
}

function asErrorLike(err: unknown): ErrorLike | null {
  if (!err || typeof err !== 'object') return null
  return err as ErrorLike
}

function collectCodes(err: unknown, codes: Set<string>, depth = 0) {
  if (depth > 5) return
  const like = asErrorLike(err)
  if (!like) return
  if (like.code) codes.add(String(like.code))
  if (like.cause) collectCodes(like.cause, codes, depth + 1)
  if (Array.isArray(like.errors)) {
    for (const nested of like.errors) collectCodes(nested, codes, depth + 1)
  }
}

export function isNonFatalProcessError(err: unknown): boolean {
  const like = asErrorLike(err)
  if (!like) {
    return typeof err === 'string' && /fetch failed|invalid url|parse error/i.test(err)
  }

  const name = like.name || ''
  const message = like.message || (typeof err === 'string' ? err : '')
  if (name === 'AbortError' || name === 'SyntaxError') return true
  if (/fetch failed|invalid url|failed to parse|parse error|unexpected token|unable to parse/i.test(message)) {
    return true
  }

  const codes = new Set<string>()
  collectCodes(err, codes)
  for (const code of codes) {
    if (NON_FATAL_CODES.has(code)) return true
  }
  return false
}

function describeError(err: unknown): string {
  const like = asErrorLike(err)
  if (!like) return String(err)
  const codes = new Set<string>()
  collectCodes(err, codes)
  const codeText = codes.size > 0 ? ` (${[...codes].join(', ')})` : ''
  const name = like.name || 'Error'
  return `${name}: ${like.message || String(err)}${codeText}`
}

function saveBeforeExit() {
  if (!emergencySave) return
  try {
    emergencySave()
    console.log('✅ Emergency database save completed')
  } catch (saveErr) {
    console.error('❌ Emergency save failed:', saveErr)
  }
}

export function installProcessGuards() {
  if (installed) return
  installed = true

  process.on('unhandledRejection', (reason) => {
    console.error(`⚠️ 未处理的 Promise 拒绝（服务继续运行）: ${describeError(reason)}`)
  })

  process.on('uncaughtException', (err) => {
    if (isNonFatalProcessError(err)) {
      console.error(`⚠️ 未捕获的网络/解析错误（服务继续运行）: ${describeError(err)}`)
      return
    }

    console.error('💥 Uncaught exception:', err)
    saveBeforeExit()
    process.exit(1)
  })
}

installProcessGuards()

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMetadata } from '../src/services/metadata.js'

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tsxBin = path.join(serverDir, 'node_modules', 'tsx', 'dist', 'cli.mjs')

function runGuard(mode: string) {
  return spawnSync(process.execPath, [tsxBin, path.join(serverDir, 'test', 'guard-child.ts')], {
    cwd: serverDir,
    env: { ...process.env, MODE: mode },
    encoding: 'utf8',
    timeout: 10000,
  })
}

async function main() {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async () => {
    throw Object.assign(new TypeError('fetch failed'), { code: 'ENOTFOUND' })
  }) as typeof fetch

  const unreachable = await parseMetadata('http://istoreos.tail6d0449.ts.net:19798/')
  assert.equal(unreachable.title, 'istoreos.tail6d0449.ts.net')
  assert.equal(typeof unreachable.favicon, 'string')

  globalThis.fetch = (async () => ({
    ok: true,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => {
      throw new SyntaxError('parse error')
    },
    arrayBuffer: async () => {
      throw new SyntaxError('parse error')
    },
  })) as typeof fetch

  const parsed = await parseMetadata('http://example.com/path')
  assert.equal(parsed.title, 'example.com')
  assert.ok(parsed.favicon)

  const invalid = await parseMetadata('not a url')
  assert.equal(invalid.favicon, '')
  assert.equal(invalid.title, 'not a url')

  globalThis.fetch = originalFetch

  for (const mode of ['rejection', 'nonfatal', 'parse']) {
    const result = runGuard(mode)
    assert.equal(
      result.status,
      0,
      `${mode} should keep the process alive\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    )
    assert.match(result.stdout, /STILL_ALIVE/)
  }

  const fatal = runGuard('fatal')
  assert.notEqual(fatal.status, 0, 'unrelated uncaught exceptions should still exit')
  assert.doesNotMatch(fatal.stdout || '', /STILL_ALIVE/)

  console.log('resilience tests passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

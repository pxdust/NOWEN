import '../src/processGuards.js'

const mode = process.env.MODE

if (mode === 'rejection') {
  Promise.reject(Object.assign(new TypeError('fetch failed'), { code: 'ENOTFOUND' }))
} else if (mode === 'nonfatal') {
  setTimeout(() => {
    throw Object.assign(new TypeError('fetch failed'), { code: 'ENOTFOUND' })
  }, 20)
} else if (mode === 'parse') {
  setTimeout(() => {
    throw new SyntaxError('parse error')
  }, 20)
} else if (mode === 'fatal') {
  setTimeout(() => {
    throw new Error('boom-fatal')
  }, 20)
} else {
  console.error(`unknown MODE: ${mode}`)
  process.exit(2)
}

setTimeout(() => {
  console.log('STILL_ALIVE')
  process.exit(0)
}, 400)

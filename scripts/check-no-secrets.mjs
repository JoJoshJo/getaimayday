// Post-build guard: fails if the App Check debug token (from .env / .env.local)
// or the env var name leaked into dist/. Run automatically by `npm run build`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const dist = join(root, 'dist')

function readEnv(file) {
  const p = join(root, file)
  if (!existsSync(p)) return {}
  return Object.fromEntries(
    readFileSync(p, 'utf8')
      .split('\n')
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
  )
}

const env = { ...readEnv('.env'), ...readEnv('.env.local'), ...readEnv('.env.production'), ...readEnv('.env.production.local') }
// Not 'FIREBASE_APPCHECK_DEBUG_TOKEN': the App Check SDK itself contains that name.
const needles = ['VITE_APPCHECK_DEBUG_TOKEN']
if (env.VITE_APPCHECK_DEBUG_TOKEN) needles.push(env.VITE_APPCHECK_DEBUG_TOKEN)

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
const leaks = []
for (const f of walk(dist).filter((f) => /\.(js|html|json|webmanifest|map)$/.test(f))) {
  const text = readFileSync(f, 'utf8')
  for (const n of needles) if (text.includes(n)) leaks.push(`${f.replace(root, '')} contains ${n === env.VITE_APPCHECK_DEBUG_TOKEN ? '<the debug token value>' : n}`)
}
if (leaks.length) {
  console.error('✖ Secret check FAILED:\n  ' + leaks.join('\n  '))
  process.exit(1)
}
console.log(`✔ Secret check: no App Check debug token in dist/ (${needles.length} patterns checked)`)

// Session 12: the lab's sample images must ship (they were left out of the Firebase upload).
// Fails the build if a /lab/*.png referenced in src/features/lab/ is missing from dist/,
// if firebase.json ignores lab/, or if the service worker precaches a lab file (lab only, no offline need).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const labDir = join(root, 'src/features/lab')
const refs = new Set()
for (const f of readdirSync(labDir)) for (const m of readFileSync(join(labDir, f), 'utf8').matchAll(/['"`](\/lab\/[\w.-]+\.(?:png|jpe?g))['"`]/g)) refs.add(m[1])

const problems = []
if (refs.size === 0) problems.push('no /lab/ sample paths found in src/features/lab (expected 5)')
for (const r of refs) if (!existsSync(join(root, 'dist', r))) problems.push(`missing from dist: ${r}`)
const ignore = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8')).hosting?.ignore ?? []
for (const g of ignore) if (/(^|\/)lab(\/|$)/.test(g)) problems.push(`firebase.json hosting.ignore excludes the lab samples: "${g}"`)
const sw = existsSync(join(root, 'dist/sw.js')) ? readFileSync(join(root, 'dist/sw.js'), 'utf8') : ''
if (/["']\/?lab\//.test(sw)) problems.push('dist/sw.js precaches a lab file (keep **/lab/** in globIgnores)')

if (problems.length) {
  console.error('✖ Lab samples check failed:\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log(`✔ Lab samples: ${refs.size} in dist/, uploaded by Firebase, not precached`)

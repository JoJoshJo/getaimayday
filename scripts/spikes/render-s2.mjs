// Renders the 5 FAKE ransom-screen test images for spike S2 (MASTER.md §12).
// Needs `playwright-core` (not a project dependency) and Google Chrome:
//   (from a folder where playwright-core is installed)
//   REPO_ROOT=/path/to/getaimayday/ node /path/to/render-s2.mjs
// Output: public/lab/s2-{1..5}.png (served at /lab/…, NOT precached).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const root = process.env.REPO_ROOT ?? new URL('../..', import.meta.url).pathname
const samples = JSON.parse(readFileSync(join(root, 'scripts/spikes/s2-samples.json'), 'utf8'))

// Test images only: these colors are NOT app design tokens (the app never shows them).
const css = `
body{margin:0;width:1024px;height:640px;display:grid;place-items:center;font-family:Arial,Helvetica,sans-serif}
.note{width:900px;padding:36px 48px;box-sizing:border-box;position:relative}
.note h1{margin:0 0 12px;font-size:44px} .note h2{margin:0 0 12px;font-size:26px} .note p{font-size:24px;margin:10px 0;line-height:1.35}
.blue{background:#0b3d91;color:#fff} .red{background:#3a0000;color:#ffdada} .red h1{color:#ff3b3b;letter-spacing:6px}
.black{background:#000;color:#39ff6a;font-family:"Courier New",monospace} .inject{color:#fff;font-weight:bold}
.wall{background:#111;color:#f5f5f5;font-family:Impact,Arial Black,sans-serif} .wall h1{color:#ffd400}
.scam{background:#fff;color:#111;border:8px solid #d00000} .scam h1{color:#d00000}
.fake{position:fixed;right:10px;bottom:8px;font:bold 14px Arial;color:#888;background:#fff;padding:2px 6px}
`
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1024, height: 640 } })
for (const s of samples) {
  await page.setContent(`<!doctype html><style>${css}</style>${s.html}<div class="fake">FAKE TEST IMAGE · AIMayday spike S2 · #${s.n}</div>`)
  const out = join(root, `public/lab/s2-${s.n}.png`)
  await page.screenshot({ path: out })
  console.log('wrote', out.replace(root, ''))
}
await browser.close()

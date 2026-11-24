# SESSION HANDOFF LOG

Append one entry per session: date, what was done, files changed, commit hashes, keys/IDs discovered (never secrets), gotchas, next step.

---

## 2026-11-23 — Planning (Claude chat)
- Wrote .brain/MASTER.md (plan v1). No code yet.
- Next: review MASTER.md with J (Tue Nov 24, 2–5 PM), pick design direction, manual Firebase setup, Spike S1.

## 2026-11-24 — Session 1: project foundation (Claude Code)

**Done**
- Moved MASTER.md + SESSION_HANDOFF.md into `.brain/`; replaced the S1 spike bullet in MASTER.md §12 (no Chrome flags; S1 remaining = Nano via AI Logic + App Check, then fully offline). Commit `61cf052`.
- Scaffolded React 19 + Vite 8 + TypeScript 7 in repo root (kept README, LICENSE, .gitignore; added `dev-dist` to .gitignore). `package.json`: `engines.node >=20.19`, `license Apache-2.0`, scripts `dev/build/preview/test/lint`.
- PWA: `vite-plugin-pwa` 2.0 (generateSW, autoUpdate). Config in `src/sw/pwa.config.ts`. Icons generated at build time from `public/logo.svg` (placeholder) via `@vite-pwa/assets-generator` (`pwa-assets.config.ts`). 12 files precached (~250 KB).
- Folder structure per MASTER.md §5 (empty folders hold `.gitkeep`). `.brain/PLANS_SPEC.md` and `.brain/PACK_SCHEMA.md` NOT created (to write with J).
- i18n: small in-house context (no library). `src/i18n/{en,fr}.json`, `messages.ts` (LANGUAGES, format), `index.tsx` (provider + `useI18n`). EN default; choice saved in localStorage key `aimayday.lang`; `<html lang>` updated. EN/FR toggle in the top bar.
- Plan format: `src/plans/schema.ts` (zod 4): `{id, incident, version (semver), steps[{id, title, detail, why, source_name, source_url (https), do_not?}]}`, strict, unique step ids. Loader `src/plans/index.ts` (import.meta.glob, bundled → offline).
- Ransomware plan `src/plans/{en,fr}/ransomware.json` v1.0.0: 15 steps, step 1 = use a clean device. Sources: CISA #StopRansomware Guide, NIST SP 800-61r3, FBI IC3, cisa.gov/report (all URLs checked: HTTP 200). Never advises paying, wiping, or contacting attackers.
- UI: `src/features/incident/PlanView.tsx` — one step at a time (prev/next) or show all, checkbox per step, progress bar, Do-not / Why / Source per step, online/offline status, disclaimer. All tokens in `src/ui/tokens.ts` (injected as CSS vars, light + dark); `src/ui/styles.css` only references vars.
- Tests `tests/plans.test.ts` (Vitest, 12 passing): schema for every plan × language, same id/incident/version/step ids/order and do_not presence across languages, clean-device step within first 2, negative schema cases, i18n key parity.

**Files** `.brain/*`, `.gitignore`, `.claude/launch.json`, `.oxlintrc.json`, `index.html`, `package.json`, `package-lock.json`, `public/logo.svg`, `pwa-assets.config.ts`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `src/**`, `tests/plans.test.ts`.

**Commands** `npm create vite@latest (react-ts, in scratch dir, copied over)`, `npm install`, `npm i -D vite-plugin-pwa vitest @vite-pwa/assets-generator`, `npm i zod`, `npm test`, `npm run build`, `npx oxlint`.

**Verification**
- `npm run build` ✔, `npm test` 12/12 ✔, `oxlint` 0 warnings.
- Offline: headless real Chrome (playwright-core, scratch only, not a project dep) against `vite preview`: precache 12 entries; with network emulated offline AND with the server killed, reload loads the app, EN + FR plan render, toggle and checkbox/next work. PASS.

**Commits** `61cf052` (brain move + S1 fix), `8f5afde` (Session 1 code), plus this handoff commit.

**Gotchas**
- **Don't put `webmanifest` in workbox `globPatterns`.** The plugin already precaches it; a duplicate with a different revision makes Workbox throw inside sw.js *silently* → SW activates with an EMPTY cache and offline fails. Comment left in `src/sw/pwa.config.ts`.
- The Claude desktop browser pane shows no CacheStorage for the SW and can't do the offline test reliably — use real Chrome for offline checks.
- `claude` CLI not installed on J's Mac → Firebase agent skills (rule 7) NOT installed yet. J to install before Session 2.
- `npm audit`: 4 moderate (glob/minimatch via workbox-build, build-time only). Fix = downgrade vite-plugin-pwa to 1.1.0 (breaking) → left as is.
- Node 25.8.2 (non-LTS) works; no engine warnings.
- Checkbox state is in memory only (resets on reload) until the incident log/storage layer lands (MUST #5).
- FR plan is a straight translation of the US plan (FBI IC3, CISA). French-speaking users outside the US (France: cybermalveillance.gouv.fr; Canada: Centre canadien pour la cybersécurité) are not covered yet — decide with J.
- "Do not:" label + text starting "Do not…" reads repetitive — tidy in design/content pass.

**Next step**
- J: review ransomware plan wording EN + FR (Security+ / French review), and do the offline check by hand in Chrome.
- J: install Claude Code CLI + Firebase agent skills; Firebase project + web app + AI Logic + App Check (MASTER §15).
- Session 2: Firebase init + App Check + Remote Config (MUST #2), then S1 remaining part.

## 2026-11-24 — Session 2: design system + anti-slop pass (Claude Code)

### Step 0 — Session start
- `pwd && git remote -v` → `/Users/joshlawson/Desktop/getaimayday`, origin `github.com/JoJoshJo/getaimayday` ✔
- `git pull --ff-only origin main` → already up to date at `8be62f1`.
- Re-read MASTER.md §0.

### Step 1 — Design spec (.brain/DESIGN.md), waiting for J's OK
1. **Font packages checked on npm** (`npm view <pkg> version`), all 5.3.0:
   `@fontsource-variable/archivo`, `@fontsource-variable/figtree`, `@fontsource/ibm-plex-mono`. Also `lucide-react` 1.79.0 (not installed; only if an icon is truly needed).
   - Downloaded `@fontsource-variable/archivo` with `npm pack` into the scratch dir and inspected `wdth.css`: family `'Archivo Variable'`, `font-weight: 100 900`, `font-stretch: 62% 125%`. So the "slightly expanded" display needs the `wdth.css` import (not `index.css`, which is weight only).
   - **Decision:** precache only the latin + latin-ext woff2 subsets (EN/FR need nothing else) to keep the offline cache small.
2. **Contrast computed** with a small WCAG 2.x relative-luminance script (`(L1+0.05)/(L2+0.05)`), run with node from the scratch dir. All ratios are in DESIGN.md §2. Key results:
   - `#ff4829` on paper `#fbf9f5` = 3.22:1. Passes for large text/UI (3:1), fails for small text (4.5:1).
   - Paper text on the accent = 3.22:1 (fail) → buttons on the accent use ink text (5.42:1).
   - `#ff4829` on ink `#171412` = 5.42:1. Passes at any size in dark mode.
   - Chosen status colors: ok `#2e6b3f` / `#7cc08f`, warn `#8a5a0b` / `#d9a441` (all ≥ 5.6:1). Dark muted text `#b3aaa0` (8.01:1).
3. **Wrote `.brain/DESIGN.md`:** principles, color tokens + accent rules + contrast table, type (Archivo wdth 112% / Figtree / Plex Mono) and scale, space/radius/motion, layout, components (top bar, status chip, toggle, progress, QRH step row, do-not box, footnotes, LOGGED stamp, buttons, focus/keyboard), copy voice, banned list + automated enforcement plan (`tests/design.test.ts`), the `/#/styleguide` page, open decisions.
4. **Open decisions put to J:**
   - `accent-text #c22a10` (5.50:1) for small red text in light mode only (recommended), vs. no small red text at all.
   - Do-not box label "AVOID" / "À ÉVITER" to fix "Do not: Do not…" with plan text unchanged (recommended), vs. keep "DO NOT" and reword every plan sentence.

### J's standing rule (added this session)
- J: document every step for future reference. Updated MASTER.md §0 rule 3 to say exactly that (log each step in order: commands, decisions + why, files, commit hashes, keys/IDs (never secrets), gotchas, how tested, next step; the file alone must be enough to repeat the work).

- J approved DESIGN.md ("OK, go") with both recommendations: `accent-text #c22a10`, and the do-not label "AVOID" / "À ÉVITER". DESIGN.md §10 updated to record this.

### Step 2a — Fonts + precache
- `npm i @fontsource-variable/archivo @fontsource-variable/figtree @fontsource/ibm-plex-mono` (all 5.3.0).
- Imports in `src/main.tsx`: `@fontsource-variable/archivo/wdth.css` (weight + width axes; family `"Archivo Variable"`), `@fontsource-variable/figtree` (family `"Figtree Variable"`), `@fontsource/ibm-plex-mono/400.css` (family `"IBM Plex Mono"`).
- `src/sw/pwa.config.ts`: added `globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,math,symbols}-*.woff2']`. Vite emits 10 woff2 files; 6 (latin + latin-ext of each family) are precached. `.woff` files are never matched by `globPatterns`.
- **How to check:** `npm run build` then `grep -o 'url:"[^"]*woff2"' dist/sw.js` → 6 lines. Precache went from 12 entries (250 KB) to 19 (500 KB).
- **Why only latin subsets:** EN and FR (é è ç à ô œ « ») are fully in latin + latin-ext. Skipping the other subsets halves the font cache.

### Step 2b — Tokens
- `src/ui/tokens.ts` rewritten as **pure data** (no DOM) so `src/sw/pwa.config.ts` (Node build side) and tests can import it. Contents: `color.paper` / `color.ink` (12 tokens each), `font`, `weight`, `type`, `leading`, `tracking`, `space` (4px base, 1–9), `radius` (0/2/4), `border`, `size`, `motion`.
- New `src/ui/applyTokens.ts`: converts tokens into CSS variables (camelCase → kebab: `textMuted` → `--color-text-muted`, `bg2` → `--color-bg2`) and injects one `<style id="design-tokens">`. Theme rules: `:root` = Paper; OS dark → Ink unless `data-theme="light"`; any element with `data-theme="light|dark"` forces that theme for its subtree; `prefers-reduced-motion` → motion vars 0ms.
- New `src/ui/contrast.ts`: WCAG ratio function + `CONTRAST_PAIRS` (12 pairs); used by the styleguide and asserted in tests.
- The PWA manifest `background_color` / `theme_color` now come from tokens (paper bg / ink bg).
- `public/logo.svg` recolored to the palette (placeholder mark; logo is still open).

### Step 2c — Restyle
- `src/i18n/{en,fr}.json`: new keys `status.label/offlineReady/preparing/offline`, `action.somethingWrong`, `plan.kicker`, `plan.stamp`, `plan.keys`; `plan.doNot` = "Avoid" / "À éviter"; removed `status.online`, `plan.heading`; no em dashes left.
- New `src/ui/useConnection.ts`: `offline` (navigator offline) / `offlineReady` (online + SW controls the page) / `preparing` (online, SW not in control yet). Listens to online/offline and `controllerchange`.
- New `src/ui/components.tsx`: `StatusChip`, `LangToggle`, `Wordmark`, `Progress` (one segment per step: done / current / todo), `Stamp`, `DoNot`.
- New `src/features/incident/StepRow.tsx`: QRH row: number in the margin (2-digit), meta, checkbox + title (+ stamp when done), detail, AVOID box, Why/Source in a `<dl>`.
- `src/features/incident/PlanView.tsx`: state is now `doneAt: Record<stepId, Date>` (the stamp shows the time). "Current" = the viewed step (one-step view) or the first unchecked step (all view). ←/→ keys move steps (ignored with modifiers or in text inputs); focus moves to the new step.
- `src/App.tsx`: top bar; tiny hash router (`#/styleguide` → lazy-loaded styleguide chunk, precached like all JS).
- `src/ui/styles.css` rewritten. It only references CSS variables. Rules not cards, no shadows, square checkbox (28px drawn, 44px hit area), stamp keyframes `stamp-in` (scale 1.6→0.96→1, rotate −10°→−4°, 250ms). The step grid collapses with a **container query** (`.plan` is `container-type: inline-size`, ≤40rem → one column), so it also works inside the narrow styleguide panels.

### Step 2d — Styleguide
- `src/features/styleguide/Styleguide.tsx` at `/#/styleguide`: two panels (`data-theme="light"` Paper, `data-theme="dark"` Ink), each with color swatches + hex, a live contrast table, type samples, space/radius, top bar parts (3 chip states, toggle), buttons (incl. "Something's wrong"), progress, AVOID box + stamp, and steps in done/current/todo states. A "Replay stamp" button remounts the stamps.

### Step 2e — Guard-rail tests
- New `tests/design.test.ts`, which fails if:
  - a hex/rgb/hsl/oklch color appears outside `src/ui/tokens.ts`, or a named color appears in CSS
  - `gradient(`, `backdrop-filter`, `blur(`, or a box/text/drop shadow is used
  - a banned font name appears
  - any token has a purple/violet/indigo hue (230–320°, saturation > 0.15)
  - any radius is above 4px
  - any `CONTRAST_PAIRS` pair is below its AA minimum, in either theme
  - buzzwords appear in UI copy, or em dashes, emoji or `!` appear in UI copy and plans
- **Decision:** the buzzword check runs on i18n strings only. Plan content uses "unlock files" literally (EN ransomware step 7), which is correct wording.
- New `tsconfig.test.json` (extends app config, adds `node` types, includes `tests`), referenced in `tsconfig.json`; `tsconfig.app.json` now includes only `src`. **Why:** the design test uses `node:fs`, and the browser config has no Node types, so `tsc -b` failed.

### Step 3 — Verification
- `npx oxlint` → 0 warnings. `npm test` → 49/49 (2 files). `npm run build` ✔ (precache 19 entries, 500 KB).
- Offline + fonts in real headless Chrome (scratch script with `playwright-core` driving `/Applications/Google Chrome.app`, not a project dependency), against `vite preview --port 4174`:
  1. first load → SW ready, reload → 19 cached URLs incl. 6 woff2; chip "Offline ready".
  2. `context.setOffline(true)` + reload → EN plan renders, chip "Offline", `document.fonts` loaded: Archivo Variable, Figtree Variable, IBM Plex Mono.
  3. FR toggle + reload offline → "Rançongiciel".
  4. Server killed + reload → still renders, fonts loaded; `#/styleguide` loads offline (2 panels); ArrowRight → "Étape 2 sur 15". **PASS.**
- Reduced motion (Playwright `reducedMotion`): no-preference → stamp `animation-duration: 0.25s`; reduce → `0s`, opacity 1. **PASS.**
- Screenshots (Chrome, deviceScaleFactor 2) in `.brain/screens/`: `plan-{light,dark}-{en,fr}.png` (1280×1000, all-steps view, step 1 checked: stamp + step 2 current), `plan-{light,dark}-en-mobile.png` (390 wide, full page), `styleguide.png` (1440 wide, full page).
- **Banned-list self-check** (grep over `src`, `public`, `index.html`):

  | Check | Result |
  |---|---|
  | purple/violet/indigo | clean |
  | gradients | clean |
  | glassmorphism / blur | clean |
  | glows / shadows | clean |
  | banned fonts | clean |
  | buzzwords | 1 hit, false positive: plan text "unlock files" (literal) |
  | em dashes | 4 hits, all in code comments, none in UI strings |
  | sparkle/AI icons, emoji | clean |
  | radius > 4px | 1 hit, false positive: `clip-path: inset(50%)` (visually-hidden helper) |
  | icon libraries, Tailwind/shadcn, stock images | clean |
  | hero / feature cards | 2 hits, false positive: the `src/features/` folder path |

### Gotchas
- **zsh doesn't word-split `$VAR`.** `F="src public"; grep -r x $F` searches one path called "src public" and silently finds nothing. My first self-check run reported all "clean" for that reason. Write the paths out (or use an array).
- Playwright `check()` refused the checkbox because the drawn `.check__box` span covered the invisible input. Fix: `pointer-events: none` on the box and `z-index: 1` on the input. Users weren't affected (clicks hit the label anyway), but tests were.
- Lint rule `react(purity)`: no `new Date()` during render. The styleguide uses a module-level `SAMPLE_TIME`.
- In EN the stamp time follows the locale (12-hour "03:22 PM"); FR shows "15:22".
- Fonts in the dev server come from node_modules; offline font checks are only meaningful on `build` + `preview`.

### Commits
- `7facd5a` Session 2 code + DESIGN.md + screenshots + MASTER rule 3.
- (this handoff entry is the next commit)

### How to repeat the checks
```
npm run build && npm test && npx oxlint
grep -o 'url:"[^"]*woff2"' dist/sw.js      # expect 6
npm run preview                            # open http://localhost:4173/#/styleguide
# Chrome DevTools → Network → Offline → reload: app + fonts must still render.
```

### Next step
- J: review `.brain/screens/` and `/#/styleguide`; confirm the look, the stamp, and the mobile layout.
- J: install Claude Code CLI + Firebase agent skills; Firebase project setup (MASTER §15).
- Session 3: Firebase init + App Check + Remote Config (MUST #2), then the remaining part of spike S1; then the "Something's wrong" entry flow (MUST #4) using `.btn-mayday`.

## 2026-11-24 — Session 3: Firebase + AI Logic foundation + spikes S1/S2 (Claude Code) — IN PROGRESS

### Step 0 — Session start
- `pwd && git remote -v` → correct repo. `git pull --ff-only origin main` → up to date at `1ce847e`.
- `claude` CLI still not installed → Firebase agent skills (MASTER rule 7) still NOT installed. Working from official docs + SDK type definitions instead.
- Firebase project id `getaimayday`; web appId `1:550940735818:web:b7a94b2181f8466fc769b3` (public web config, given by J). AI Logic on Gemini Developer API (free tier); AI monitoring off on purpose.

### Step 1 — Investigation (no code changes), waiting for J's OK
**How:** `npm view firebase version` → **13.4.0** (modified 2026-11-16). Dependencies: `@firebase/ai` 3.1.0, `@firebase/app-check` 0.13.2, `@firebase/remote-config` 0.10.0, `@firebase/app` 0.16.7. Downloaded those three with `npm pack` into the scratch dir and read their `.d.ts` files and the ESM source. Read the official docs via fetch: hybrid web get-started, configuration-options, hybrid overview, generate-structured-output; App Check reCAPTCHA Enterprise + debug provider; AI Logic + App Check; Remote Config web get-started; AI Logic models; Gemini models + pricing.

**Findings (verified in typings/source):**
- Imports: `firebase/app` → `initializeApp`; `firebase/app-check` → `initializeAppCheck`, `ReCaptchaEnterpriseProvider`; `firebase/remote-config` → `getRemoteConfig`, `fetchAndActivate`, `ensureInitialized`, `getString`, `isSupported`; `firebase/ai` → `getAI`, `getGenerativeModel`, `GoogleAIBackend`, `InferenceMode`, `InferenceSource`, `Schema`.
- `InferenceMode` = `PREFER_ON_DEVICE | ONLY_ON_DEVICE | PREFER_IN_CLOUD | ONLY_IN_CLOUD` (string values `prefer_on_device`…).
- `result.response.inferenceSource` ∈ `InferenceSource.ON_DEVICE` (`"on_device"`) | `InferenceSource.IN_CLOUD` (`"in_cloud"`).
- Structured output must be configured twice: on-device `onDeviceParams.promptOptions.responseConstraint` (JSON Schema / `Schema`), cloud `inCloudParams.generationConfig.{responseMimeType:'application/json', responseSchema}`.
- `model.initializeDeviceModel(onProgress)` must be called on/after a user gesture; `ONLY_ON_DEVICE` waits for that download promise, otherwise throws (`API_NOT_ENABLED` if the Prompt API is unavailable; `UNSUPPORTED` if the model is unavailable).
- `onDeviceParams.createOptions` defaults to image input + English text; set `expectedInputs`/`expectedOutputs` languages to include `fr`.
- On-device images: PNG/JPEG only, inline base64. On-device limit 9216 tokens.
- **App Check vs offline (from SDK source `callCloudOrDevice` + request builder):** the App Check token is fetched only when building the cloud HTTP request (`X-Firebase-AppCheck`). The on-device branch calls Chrome's Prompt API directly, with no token and no network. Expect on-device to work offline with App Check on; S1 must confirm.
- App Check for AI Logic was auto-enforced in all projects on 2026-11-02 (can't be unenforced after 2027-01-21). The debug provider (`self.FIREBASE_APPCHECK_DEBUG_TOKEN = true | "<token>"`, set before `initializeAppCheck`) works with enforcement on. Optional `getAI(app, { useLimitedUseAppCheckTokens: true })` = replay protection.
- Remote Config persists activated values in IndexedDB (`firebase_remote_config`); `ensureInitialized` loads them; defaults apply before the first fetch; settings `minimumFetchIntervalMillis`, `fetchTimeoutMillis`.
- `gemini-3.5-flash-lite` exists: Stable (2026-07-21), supported by AI Logic, free tier, image input + structured output; it is also the SDK's default cloud model since v13.0.0. No shutdown date.
- Docs list Chrome flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` for image input (may already be on in Chrome 158; check in S2).

**Next:** J's OK + reCAPTCHA Enterprise site key → Step 2.

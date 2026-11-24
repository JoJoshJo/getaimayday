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

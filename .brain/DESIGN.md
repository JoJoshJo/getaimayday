# AIMAYDAY · DESIGN SPEC (v2, 2026-11-26)

> Direction: **Warm and human** (chosen by J, Session 9, from three previews; see `.brain/screens/redesign/`).
> The user is a stressed small-business office manager, not an IT person. v1 ("editorial emergency manual": all caps, mono labels, ruled lines) was "too IT".
> Source of truth for visual decisions. All values live in `src/ui/tokens.ts`; nothing else hard-codes a color, font or size.

---

## 1. Principles

1. **Readable under stress.** 18px body, sentence case, one main action per screen, high contrast, nothing moving unless the user caused it.
2. **Friendly, not techy.** Soft corners, a calm colour per incident, a line icon next to words, warm neutrals.
3. **One signal.** The red-orange accent means "act now" or "danger": only "Something's wrong" and urgent "Avoid" boxes.
4. **Honest and calm.** Plain words, no hype, no decoration that doesn't carry information. The source badge always tells the truth.
5. **Works offline, looks the same offline.** Fonts are self-hosted and precached; icons are SVG, never font glyphs; no external requests.

---

## 2. Color

Two themes: **Paper** (light, default) and **Ink** (dark, follows `prefers-color-scheme`; `data-theme="light|dark"` forces it on any subtree).

| Token | Paper | Ink | Use |
|---|---|---|---|
| `bg` | `#ffffff` | `#191614` | page, step cards |
| `bg2` | `#f2eee8` | `#2c2723` | home hero, soft buttons, panels (found on screen, preview, answers) |
| `surface` | `#faf8f5` | `#221e1b` | cards on the page (log, Get ready rows, contacts, Pack) |
| `rule` | `#e6e0d7` | `#3e3732` | hairlines |
| `ruleStrong` | `#2a2420` | `#f6f1eb` | check circle ring |
| `text` | `#2a2420` | `#f6f1eb` | body, headings |
| `textMuted` | `#625952` | `#bcb2a7` | meta, hints |
| `accent` | `#ff4829` | `#ff4829` | "Something's wrong" fill, "Avoid" left bar |
| `accentText` | `#b52a10` | `#ff7a60` | the "Avoid" label |
| `onAccent` | `#2a2420` | `#2a2420` | text on the accent |
| `avoidBg` | `#fdebe5` | `#3a211b` | "Avoid" box |
| `primary` / `onPrimary` | `#2a2420` / `#ffffff` | `#f6f1eb` / `#191614` | the main button of every other screen (Next step, Confirm, Search) and selected toggles |
| `ok` / `okBg` | `#2b6b40` / `#e4f0e7` | `#86c798` / `#1e2e23` | done check, "Logged" mark, progress, status chip |
| `warn` / `warnBg` | `#80520a` / `#fcf1dc` | `#e6b765` / `#352a16` | open incident banner, "To do" pills, retry note, demo line |
| `info` / `infoBg` | `#2f5d8a` / `#e8eff6` | `#9cc0e6` / `#1d2733` | source badges |
| `focus` | `#2a2420` | `#f6f1eb` | 3px focus ring |

### Incident tints (`tokens.tint`, CSS `--tint-<id>` and `--tint-<id>-ink`)

Each incident has its own calm colour, used for its tile, the whole plan panel, and its icon. Set with `data-tone="<incident>"` (or `fixit`).

| Tone | Paper bg / icon | Ink bg / icon | Worst text ratio (paper / ink) |
|---|---|---|---|
| ransomware | `#e8ebf5` / `#34497a` (navy) | `#20263a` / `#aebde6` | 5.74 / 7.19 |
| bec | `#f8f3d6` / `#6b5a08` (gold) | `#302c14` / `#dccb73` | 6.08 / 6.73 |
| phishing | `#e1f1f7` / `#1c6079` (cyan blue) | `#162d36` / `#8ed0e6` | 5.90 / 6.88 |
| lost-device | `#e7f2e8` / `#2b6b40` | `#1d2e21` / `#8fd0a0` | 5.57 / 6.87 |
| outage | `#efede8` / `#5a534c` | `#2b2825` / `#cfc6bb` | 5.85 / 7.02 |
| fixit | `#eaf2f1` / `#2c6660` | `#1a2e2c` / `#8fcfc6` | 5.81 / 6.84 |

"Worst" = the lowest of text, muted text and icon ink on that tint. All ≥ 4.5:1, tested.

**No red or orange tint (Session 10).** Red-orange means danger here ("Something's wrong", "Avoid"). v2 first gave ransomware a coral tint that was the same colour as the "Avoid" box (ΔE 0.5) and bec an amber close to orange; they are now navy and gold, and phishing moved to cyan blue to stay apart from navy. Distance from the "Avoid" background (CIE76 ΔE, paper / ink): ransomware 11.2 / 24.1, bec 12.6 / 15.4, phishing 13.5 / 24.7, lost device 10.6 / 21.9, outage 5.9 / 12.5 (a near-neutral grey, saturation under 20%), fix-its 9.7 / 22.5. `tests/design.test.ts` fails on any tint with colour (saturation > 20%) in hue 330–45°.

### Accent rules (strict)
`#ff4829` appears only on: (1) the **"Something's wrong"** button, (2) the left bar of **"Avoid"** boxes (and the clean-device warning on Home, which is the same component), with `accentText` for the "Avoid" label. The current step is a white card, not the accent. Done = green, not the accent.

### Contrast (WCAG 2.2 AA), computed in `tests/design.test.ts`

| Pair | Paper | Ink | Min |
|---|---|---|---|
| text on bg | 15.31 | 16.04 | 4.5 |
| text on bg2 | 13.25 | 13.15 | 4.5 |
| text on surface | 14.44 | 14.73 | 4.5 |
| text on avoidBg | 13.26 | 13.23 | 4.5 |
| textMuted on bg | 6.84 | 8.63 | 4.5 |
| textMuted on bg2 | 5.92 | 7.08 | 4.5 |
| textMuted on surface | 6.45 | 7.93 | 4.5 |
| accentText on bg | 6.36 | 7.04 | 4.5 |
| accentText on avoidBg | 5.51 | 5.81 | 4.5 |
| accent on bg (marks only) | 3.38 | 5.33 | 3 |
| onAccent on accent | 4.53 | 4.53 | 4.5 |
| onPrimary on primary | 15.31 | 16.04 | 4.5 |
| ok on bg / okBg | 6.40 / 5.46 | 9.12 / 7.23 | 4.5 |
| warn on bg / warnBg | 6.71 / 5.99 | 9.71 / 7.58 | 4.5 |
| info on infoBg | 5.93 | 7.98 | 4.5 |
| ruleStrong, focus on bg | 15.31 | 16.04 | 3 |

---

## 3. Typography

Self-hosted via Fontsource (verified on npm 2026-11-26, 5.3.2, OFL), bundled by Vite, precached by the service worker.

| Role | Family (package, file) | Settings |
|---|---|---|
| **Everything** | Google Sans Flex Variable (`@fontsource-variable/google-sans-flex/rond.css`: weight 1–1000 + roundness `ROND`; latin 71 KB) | `font-variation-settings: 'ROND' 100` (fully round), 400 body, 500 labels, 600 headings and step titles, 700 wordmark and "Something's wrong" |
| **Code** | Google Sans Code Variable (`@fontsource-variable/google-sans-code/wght.css`, latin 35 KB) | only times in the log, file extensions, technical error details (`.code`, `.log__time`) |

- **Sentence case everywhere.** No uppercase labels, no letter-spacing, except the tiny EN/FR language tags.
- Fallback stacks are generic only (`sans-serif`, `monospace`).
- **Precache: latin + latin-ext only.** Every other subset is in `globIgnores` (`src/sw/pwa.config.ts`). Fonts are never inlined as `data:` (CSP `font-src 'self'`; `vite.config.ts` `assetsInlineLimit`).
- **Arrows and the external-link mark are lucide icons, not characters.** ← → ↗ live in the font's math/symbols subsets, which are not precached: as text they triggered a font download that failed offline (Session 9).

### Scale (rem, base 16px)
| Token | Size | Use |
|---|---|---|
| `displayXl` | clamp(2.25rem, 5.5vw, 3rem) / 1.1 | page titles ("What is happening?", "Ransomware") |
| `h2` / `title` | 1.375rem / 1.3 | section headings |
| step title | 1.5rem / 1.3 | the action of the current step |
| `body` | 1.125rem / 1.55 | step detail, answers |
| `small` | 1rem | buttons, hints, footnotes |
| `label` | 0.9375rem | small labels, badges, chips |
| `code` | 0.9375rem | times, file extensions |

Body never below 16px. Line length capped at ~66ch.

---

## 4. Space, shape, motion

- **Space** (4px base): 4, 8, 12, 16, 24, 32, 48, 64, 96.
- **Radius**: `sm` 12px (buttons, inputs, boxes, chips), `md` 16px (cards, panels, tiles, the plan). **Max 16px** (tested). Circles (`50%`) only for the step check and status dots.
- **Borders**: hairline 1px `rule`; inputs 1.5px `textMuted`; check ring 2px; "Avoid" bar 4px accent.
- **Shadows**: none. Depth comes from tints and `surface` vs `bg`.
- **Tap targets**: min 44px; buttons 48px; "Something's wrong" 56px.
- **Motion**: 120ms colour changes; the "Logged" mark fades and scales in (200ms). `prefers-reduced-motion` → 0ms.

---

## 5. Layout

- Max width 72rem, left aligned. 16px side gutter on phones, 32px from 640px. No horizontal scroll.
- **Home**: a soft `bg2` hero card (title, clean-device warning, description, "Something's wrong"), then incident tiles in a responsive grid (min 17rem), then the IT fix-its as small tiles (icon + title). The empty status line under the button takes no space (`position: absolute` while `:empty`), so there is no gap under "Something's wrong". Below 600px the button is full width.
- **Home from 1024px (Session 11, Nielsen #6 recognition rather than recall)**: two columns, 7fr / 5fr. Left: the hero card. Right: "Or choose what happened" + the 5 incident tiles as a compact one-column list (icon beside title, description under it) + Past incidents. The open incident banner and the fix-its span both columns. Pure CSS grid on the unchanged DOM order (description, then tiles), so keyboard and screen reader order are the same; at 1440×900 the panel and all 5 tiles are visible without scrolling. Below 1024px: stacked, as before.
- **Plan**: one panel in the incident's tint holding the header (icon, kicker, title, progress), the toolbar, and the current step as a white card. The incident log and back-online jobs follow in a `surface` card.
- **Phones (≤640px)**: top bar on two rows (wordmark, status, language / nav); tiles show the icon beside the title.

---

## 6. Components

**Top bar**: wordmark (life-buoy icon + "AIMayday"), nav **Home · Get ready · Incidents · More** (Contacts, Offline Pack, Setup in a `<details>` menu that closes on page change, Escape and outside click), status chip, EN/FR toggle. The current page has a soft `bg2` background (`aria-current="page"`).

**Status chip**: soft pill, `ok` on `okBg` (Offline ready / Offline) or `warn` on `warnBg` (Preparing, Get ready · 3/5). Links to Get ready.

**Buttons**: `.btn` soft (`bg2` fill, border on hover); `.btn--strong` primary (`primary` fill: Next step, Confirm, Search); `.btn--quiet` underlined text (it is a text link by design). **No button underlines on hover or focus** (Session 11); hover = border, focus = the 3px ring. **Disabled** ("Previous" on step 1, "Next step" on the last): same shape, no fill, no border, muted text, `cursor: not-allowed`, native `disabled`. **`.btn-mayday`** only for "Something's wrong" (accent fill, ink text, 700, 56px).

**Tiles**: tinted card, icon (36px, tone ink), title (600), description. Fix-it tiles on Home: small (icon beside title).

**Open incident card (Session 11)**: on Home, one card per open incident in **that incident's tint** (`data-tone`, same mapping as its tile and plan) with its icon; the section itself has no fill (it was one warn-coloured box, which read as the invoice fraud gold).

**Plan header**: icon (48px, tone ink), kicker ("Incident plan" / "IT fix-it", no version), title, progress. The version is a small muted line under the steps ("Version 1.1.0") and in the print view.

**Progress (Session 11)**: text "0 of 16 done" / "0 sur 16 faites", no zero padding; it is the accessible source (the bar is `role=progressbar` labelled with it; segments are not exposed). Segments: **filled only for completed steps** (green); the current step is an empty segment with a 2px outline in `text` colour, so it never looks done; todo = empty `bg`.

**Step**: white card in the tinted plan panel. "Step 2 of 16", the title (1.5rem, 600), then the **Mark done** control on its own line: a 44px soft pill with the round check (32px) and the words "Mark done" / "Marquer comme fait"; checked = green circle with check + "Done" / "Fait" on `okBg`, with the "Logged 14:02" mark beside it. Its accessible name is the visible words then the step title (WCAG 2.5.3). Then detail, "Avoid" box, step buttons (Contacts, Ask), Why / Source footnotes. The v1 giant step number is hidden (the number is in "Step n of total").

**"Avoid" box**: `avoidBg`, 4px accent left bar, "Avoid" / "À éviter" label in `accentText` 700.

**"Logged" mark**: green soft pill "Logged 14:02" next to a checked step.

**Source badge**: soft `info` pill with an icon: On-device AI (laptop), Cloud AI (cloud), Offline Pack (book), Checklist (list, muted grey). Real `inferenceSource` only.

**Found on screen · please confirm**: `bg2` panel, white inputs, one labelled row per field, the "Avoid" note, Confirm (primary) and Discard. Behaviour unchanged from v1 (spec in the v1 decisions below).

**New version ready (Session 12)**: when a new service worker is waiting, a soft `info` on `infoBg` line under the top bar: refresh icon, "New version ready" / "Nouvelle version prête", and a primary "Reload" / "Recharger" button. `role="status"` (polite). Never the accent, never automatic: the new version only takes over when the person presses Reload. Hidden on paper.

**Empty states**: a soft `bg2` line with an icon and plain words (no incidents yet, no contacts yet).

**Icons** (`src/ui/icons.ts`): lucide-react, stroke 1.75, always `aria-hidden` next to words. Incidents: ransomware Lock, invoice fraud Receipt, phishing MailWarning, lost device Smartphone, outage WifiOff. Fix-its: Wifi, Mail, Monitor, Printer, KeyRound, Zap. No icon containers, no sparkles.

**Answer contacts** (Session 10): under every Pack answer and every Ask answer (plans and fix-its, on-device or cloud), one soft button per contact the answer names, in the order it names them: "Call IT contact · 555-0142". Email only → "Email …"; not saved → quiet "Add this contact: …" link to Setup. Detection: `src/features/contacts/mentions.ts` (EN + FR, tested).

**Print**: plain ink on paper; round check boxes; the accent only on the "Avoid" bar. Contacts print as one line each, "IT contact: Riverdale IT Services, Sam · 555-0142 · help@riverdale-it.example" (notes under it); no Call, Email or Copy buttons. Links that hold a phone number print as plain text; buttons and in-app links are dropped.

---

## 7. Copy voice

Plain, short, calm, imperative, sentence case. No buzzwords, no "!", no emoji, no em dashes in UI copy.

---

## 8. Banned (AI-slop tells) and how it's enforced

**Allowed since v2:** Google Sans Flex and Google Sans Code; radius up to 16px; soft section tints.
**Still banned:** purple/violet/indigo (hue 230–320° on any token or tint); gradients; glassmorphism / `backdrop-filter` / blur; glows and shadows (`box-shadow`, `text-shadow`, `drop-shadow`); emoji as icons; 3D blobs, stock images; buzzwords; em dashes; "!"; Inter/Roboto/Poppins/Space Grotesk/system-ui as a font.

**Enforcement:** `tests/design.test.ts` scans `src/` (no color outside tokens.ts, no gradients/blur/shadows/banned fonts), checks every token and tint for purple, radius ≤ 16px, WCAG AA for every pair above and every tint, and the copy rules on all i18n, plan and fix-it strings.

---

## 9. Styleguide page

`/#/styleguide`: Paper and Ink side by side: every color token with its value and contrast, type, space and radius, top bar parts, buttons, progress, "Avoid" box and "Logged" mark, incident tints with icons, source badges, and a step in each state inside a tinted plan.

---

## 10. Decisions

- ✅ 2026-11-24 (J): `accent-text #c22a10` for small red text in Paper mode.
- ✅ 2026-11-24 (J): do-not label "AVOID" / "À ÉVITER"; plan text unchanged.
- Open: logo glyph (later). `public/logo.svg` is a placeholder in the palette.
- ✅ 2026-11-24 (architect, Session 3b): triage results are always shown as "FOUND ON SCREEN · PLEASE CONFIRM", every field editable before saving to the incident log (spec in §6; build with the incident log).
- ✅ 2026-11-24 (architect, Session 3c): optional "Double-check with cloud AI" button on the found-on-screen panel (online only, preview first, PREFER_IN_CLOUD only after a tap). Spec in §6; SHOULD.
- ✅ 2026-11-25 (Session 4, built): found-on-screen panel as specced, plus: "Type it in myself" while the AI reads (the user never waits); without on-device AI the same panel opens empty with a Checklist badge; the log shows each confirmed field with its status ("edited", "added by you", "removed by you"); after confirm, if the type maps to another plan, a "Start that plan" button (src/plans/route.ts).
- ✅ 2026-11-25 (Session 4, SHOULD #14): "Double-check with cloud AI" built as specced in §6 (online only, image preview first, PREFER_IN_CLOUD after the tap, suggestions with "Use this" only on fields the user did not edit, one calm failure line, log notes "checked with cloud AI"). An answer that did not really come from the cloud is treated as a failure.
- ✅ 2026-11-26 (J, Session 9): **direction C "Warm and human"** chosen from three previews (A calm helper, B Google-ish, C warm and human). Applied app-wide in Session 9 step 2; v1 spec replaced by this file. Previews and screenshots: `.brain/screens/redesign/`.
- ✅ 2026-11-26 (Session 9): the "Avoid" label is now sentence case ("Avoid" / "À éviter"); accent no longer marks the current step or the "Logged" stamp (now green).
- ✅ 2026-11-26 (Session 10): incident tints moved away from the danger colour: ransomware coral → navy, bec amber → gold, phishing blue → cyan blue. Test added.
- ✅ 2026-11-26 (Session 10): answers that name a contact (IT contact, bank, insurer, lawyer, police, staff lead) show that contact's call button under them; not saved → "Add this contact". On paper, contacts are one plain line each ("IT contact: name · phone · email") and buttons lose their boxes.
- ✅ 2026-11-26 (Session 11, J's live review): progress "0 of 16 done" with the current step outlined, never filled; visible "Mark done" label; disabled buttons look unavailable, not outlined; no underline on button hover; no version in the plan header; Home: no gap under "Something's wrong", full-width button on phones, two columns from 1024px; open incident card in its incident's tint. The "pink ransomware" seen live was a cached Session 9 build (see SESSION_HANDOFF Session 11), not the tokens.
- ✅ 2026-11-26 (Session 12): "New version ready" banner (prompt, never auto-reload); French plurals through `Intl.PluralRules` with a `{n|one|other}` token in messages.

# AIMAYDAY — DESIGN SPEC (v1, 2026-11-24)

> Direction: **Editorial emergency manual.** A printed field manual crossed with a pilot's Quick Reference Handbook (QRH).
> Source of truth for visual decisions. All values live in `src/ui/tokens.ts`; nothing else hard-codes a color, font or size.

---

## 1. Principles

1. **Readable under stress.** Large body text, one action per step, high contrast, nothing moving unless the user caused it.
2. **Printed, not "app".** Paper and ink, thin rules, real typography. If the screen were printed, it should look the same.
3. **One signal.** A single red-orange accent means "act here" or "danger". If everything is loud, nothing is.
4. **Honest and calm.** Plain words, no hype, no decoration that doesn't carry information.
5. **Works offline, looks the same offline.** Fonts are self-hosted and precached; no external requests.

---

## 2. Color

Two themes: **Paper** (light, default) and **Ink** (dark, follows `prefers-color-scheme`). Same single accent in both.

### Tokens

| Token | Paper (light) | Ink (dark) | Use |
|---|---|---|---|
| `bg` | `#fbf9f5` paper | `#171412` ink | page |
| `bg-2` | `#f3eee6` paper-2 | `#221e1b` ink-2 | quiet bands (do-not box, toggle off state) |
| `rule` | `#ddd5c8` | `#3d3631` | hairlines, dividers |
| `rule-strong` | `#171412` | `#fbf9f5` | checkbox border, heavy section rules |
| `text` | `#171412` | `#fbf9f5` | body, headings |
| `text-muted` | `#5b544d` | `#b3aaa0` | footnotes, meta |
| `accent` | `#ff4829` | `#ff4829` | Mayday signal (see rules below) |
| `accent-text` | `#c22a10` | `#ff4829` | accent used as **small text** (stamp, "DO NOT" label) |
| `on-accent` | `#171412` | `#171412` | text on an accent fill |
| `ok` | `#2e6b3f` deep green | `#7cc08f` | status chip only |
| `warn` | `#8a5a0b` ochre | `#d9a441` | status chip only |
| `focus` | `#171412` | `#fbf9f5` | focus ring (ink/paper, not accent, so the accent stays rare) |

### Accent rules (strict)
The accent `#ff4829` appears in exactly three places:
1. The main **"Something's wrong"** action (accent fill, ink text).
2. The **current step marker** (the left bar next to the current step + its big number).
3. **Urgent "Do not"** items (4px left border + the box's mono label).

Plus the **LOGGED stamp**, which is the "current step marker" family (it marks an action taken). Never as a background wash, gradient, hover tint or decoration.

### Contrast (WCAG 2.2 AA) — computed, not eyeballed

| Pair | Ratio | Needed | Result |
|---|---|---|---|
| Paper: text `#171412` on bg `#fbf9f5` | 17.44 | 4.5 | ✅ |
| Paper: text on bg-2 `#f3eee6` | 15.88 | 4.5 | ✅ |
| Paper: text-muted `#5b544d` on bg | 7.08 | 4.5 | ✅ |
| Paper: text-muted on bg-2 | 6.45 | 4.5 | ✅ |
| Paper: accent `#ff4829` on bg — **large text / UI marks** | 3.22 | 3.0 | ✅ |
| Paper: accent `#ff4829` on bg — **small text** | 3.22 | 4.5 | ❌ → use `accent-text` |
| Paper: accent-text `#c22a10` on bg | 5.50 | 4.5 | ✅ |
| Paper: accent-text on bg-2 | 5.01 | 4.5 | ✅ |
| Paper: on-accent `#171412` on accent (button) | 5.42 | 4.5 | ✅ |
| Paper: paper `#fbf9f5` on accent | 3.22 | 4.5 | ❌ → never use light text on the accent |
| Paper: ok `#2e6b3f` on bg | 6.07 | 4.5 | ✅ |
| Paper: warn `#8a5a0b` on bg | 5.63 | 4.5 | ✅ |
| Paper: checkbox border (rule-strong) on bg | 17.44 | 3.0 | ✅ |
| Ink: text `#fbf9f5` on bg `#171412` | 17.44 | 4.5 | ✅ |
| Ink: text on bg-2 `#221e1b` | 15.73 | 4.5 | ✅ |
| Ink: text-muted `#b3aaa0` on bg | 8.01 | 4.5 | ✅ |
| Ink: text-muted on bg-2 | 7.23 | 4.5 | ✅ |
| Ink: accent `#ff4829` on bg (any size) | 5.42 | 4.5 | ✅ |
| Ink: accent on bg-2 | 4.89 | 4.5 | ✅ |
| Ink: on-accent on accent (button) | 5.42 | 4.5 | ✅ |
| Ink: ok `#7cc08f` on bg | 8.55 | 4.5 | ✅ |
| Ink: warn `#d9a441` on bg | 8.15 | 4.5 | ✅ |
| Ink: checkbox border on bg | 17.44 | 3.0 | ✅ |

Hairline `rule` colors are decorative separators (not required for understanding), so they are exempt from 1.4.11; every interactive control has a full-contrast border.

**Decision for J:** the spec says one accent. In Paper mode `#ff4829` can't carry small text, so I added `accent-text #c22a10`: the same hue, darker, used only where the accent appears as small text. In Ink mode both are `#ff4829`. Alternative: never set the accent as small text, only as borders and marks, and keep the labels in ink. I recommend `accent-text`, because the stamp reads as a stamp only if it's red.

---

## 3. Typography

All self-hosted via Fontsource (verified on npm 2026-11-24), bundled by Vite, precached by the service worker.

| Role | Family (package) | Settings |
|---|---|---|
| **Display** | Archivo Variable (`@fontsource-variable/archivo`, `wdth.css`: weight 100–900, width 62–125%) | weight 800–900, `font-stretch: 112%`, UPPERCASE, tracking −0.01em to −0.02em |
| **Body** | Figtree Variable (`@fontsource-variable/figtree`, weight 300–900; we use 300–600) | 400 body, 600 step titles |
| **Mono** | IBM Plex Mono (`@fontsource/ibm-plex-mono`, 400 only) | UPPERCASE, tracking +0.12em, small sizes |

Fallback stacks are generic only (`sans-serif`, `monospace`) — no Inter/Roboto/system-ui as a primary.
Precache: only the **latin + latin-ext** woff2 subsets (EN + FR need nothing else). Other subsets stay out of the cache to keep the offline pack small.

### Scale (rem, base 16px)
| Token | Size | Font | Use |
|---|---|---|---|
| `step-num` | clamp(3.5rem, 9vw, 6rem) | Display 900 | huge step number in the left margin |
| `display-xl` | clamp(2.25rem, 5vw, 3.5rem) | Display 900 | plan title ("RANSOMWARE") |
| `display-md` | 1.375rem | Display 800 | wordmark, section heads |
| `title` | 1.5rem / 1.25 | Body 600 | step title (the action) |
| `body` | 1.125rem / 1.55 | Body 400 | step detail |
| `small` | 1rem / 1.5 | Body 400 | footnote text |
| `mono` | 0.8125rem / 1.4 | Mono 400, tracking .12em, uppercase | labels, timestamps, sources, chips, log |
| `mono-sm` | 0.75rem | Mono 400 | progress fraction, meta |

Body never goes below 16px. Line length for detail text capped at ~68ch.

---

## 4. Space, shape, motion

- **Space** (4px base): 4, 8, 12, 16, 24, 32, 48, 64, 96.
- **Radius**: 0 everywhere by default; `radius-sm` 2px for buttons/toggle; **max 4px**. No pills.
- **Borders**: hairline 1px `rule`; strong 2px `rule-strong` (checkbox, primary rules); accent bar 4px.
- **Shadows**: none. Elevation is shown with rules and `bg-2`, never shadows.
- **Tap targets**: min 44×44px (checkbox hit area 44px, box drawn 28px).
- **Motion**: `fast` 120ms (hover/press color only), `stamp` 250ms. Easing `cubic-bezier(.2,.8,.2,1)`; stamp uses a slight overshoot.
- **Reduced motion**: `prefers-reduced-motion: reduce` → all durations 0; the stamp just appears.

---

## 5. Layout

- **Asymmetric, left-aligned editorial grid.** Desktop: a fixed left margin column (~9rem) holds step numbers and mono meta; content column max ~44rem; generous right white space. Nothing is centered.
- **Mobile (<640px)**: margin column collapses; the step number sits above the title, still left-aligned, still large. 16px side gutter, no horizontal scroll.
- **Rules, not cards**: sections and steps are separated by hairlines. No boxed card grid.
- **Top bar**: wordmark left (Display, uppercase), then status chip (mono), EN/FR toggle right. A strong 2px rule underneath.

---

## 6. Components

**Wordmark** — "AIMAYDAY" in Display 900, stretch 112%. No logo glyph yet (logo later, MASTER §4).

**Status chip** (mono, uppercase, 1px border, square, small square indicator in `ok`/`warn`):
- `OFFLINE READY` (ok) — service worker controls the page, app is cached.
- `ONLINE · PREPARING OFFLINE` (warn) — first load, cache not ready yet.
- `OFFLINE` (ok) — no network, running from cache (it's fine; that's the point).
Status colors appear **only** here (and later on the readiness screen).

**EN/FR toggle** — two square segments, mono uppercase, 2px ink border; selected = ink fill / paper text; 44px tall.

**Plan header** — mono kicker ("INCIDENT PLAN · V1.0.0"), Display plan title, then the progress line.

**Progress** — mono "04 / 15 DONE" plus a 4px segmented bar (one segment per step; done = ink, current = accent, todo = rule). Segments make "how far" readable at a glance.

**Step (QRH style)** — one row per step separated by hairlines:
- Left margin: huge step number (Display). Current step: number in accent + 4px accent bar on the left edge. Done steps: number in `text-muted`.
- Action line: square checkbox (28px drawn, 2px ink border, ink fill + paper check when done; 44px hit area) + title in Body 600.
- Detail in Body 400.
- **Do not** box: `bg-2` band, 4px accent left border, a mono label in `accent-text` on its own line above the sentence. **Fix for "Do not: Do not…":** every `do_not` sentence already starts with "Do not…", so the label becomes **"AVOID"** (FR **"À ÉVITER"**). Plan text is unchanged.
- **Why** and **Source** as mono footnotes under a hairline: `WHY —` is plain text in muted body; `SOURCE ↗ CISA #STOPRANSOMWARE GUIDE` is a mono link.

**LOGGED stamp (signature moment, the only showy animation)** — when a step is checked, a rubber-stamp mark appears beside the title: mono uppercase "LOGGED 14:02", 2px `accent-text` border, accent-text color, rotated −4°, slightly uneven (double border inset). Animation (CSS only, 250ms): scale 1.6 → 0.96 → 1, opacity 0 → 1, rotation −10° → −4°, like a stamp pressing in. Reduced motion: no animation, stamp just shows. Time = local HH:MM when checked (kept in memory for now; the incident log will persist it).

**Buttons** — Primary (only "Something's wrong"): accent fill, ink text, Display 800 uppercase, square, 56px tall. Secondary (prev/next/show all): transparent, 2px ink border, mono uppercase. No hover color washes: hover = underline/inverted ink.

**Focus** — 3px solid `focus` outline, 3px offset, on every interactive element. Keyboard: Tab through controls; in one-step view, `←`/`→` move between steps (focus follows to the new step), and `Space` toggles a focused checkbox (native).

**Source badge** (added Session 3) — mono uppercase label with a 1px border, text color: `ON-DEVICE AI`, `CLOUD AI`, `OFFLINE PACK`; `CHECKLIST` (no AI answer) is muted with a dashed border. It shows the real source reported by the SDK, never a guess. Not the accent, not status colors.

**Found-on-screen panel** (spec added Session 3b; **build it with the incident log**, not before). Why: spike S2 showed on-device triage misreads or invents fields and still calls itself "high" confidence (SPIKES.md Results). So triage only ever *suggests*.
- **Header:** mono uppercase **"FOUND ON SCREEN · PLEASE CONFIRM"** / FR **"TROUVÉ À L’ÉCRAN · À CONFIRMER"** (a middle dot, not the em dash from the brief: §7 bans em dashes in UI copy). Beside it: the Source badge (real `inferenceSource`) and the **computed** confidence in mono (`CONFIDENCE: MEDIUM`). The model's own confidence is never shown in the product (lab/debug only).
- **One editable row per field**, in this order: incident type (a select of the 6 types, prefilled; the user's choice and the classify result win over triage), amount, currency, group name, contact method, deadline, file extension. Each row is a label in mono plus a plain text input (amount: numeric input), prefilled with the found value. A field the model didn't find (null) is **empty**, with the muted placeholder "Not found" / "Non trouvé". No field is ever prefilled with "unknown" or 0.
- **Nothing is saved until the user confirms.** Actions: Primary-style secondary button **"Confirm and add to log"** / "Confirmer et ajouter au journal" (2px ink border; NOT the accent, which stays reserved for "Something's wrong"), and **"Discard"** / "Ignorer". Discard saves nothing.
- **Edits are tracked:** the log entry stores, per field, the value saved and whether it was `found` (unchanged), `edited`, or `added` by the user, plus the source and computed confidence. This keeps the record honest about what the AI read.
- **Never shows advice.** The panel only displays the six fields; any model text outside them is rejected by the schema. Below the fields, a fixed note (plan copy, not AI): "Do not contact the attackers or pay. This is kept for your report." / "Ne contactez pas les attaquants et ne payez pas. Ces informations servent à votre signalement." The note uses the Do-not style (AVOID / À ÉVITER).
- Accessibility: every input has a visible label; the header is the panel's accessible name; focus moves to the first field when the panel opens; Escape = Discard (asks nothing, nothing saved yet).

**Icons** — none for now. Words first. If one is ever needed, `lucide-react` only, 1.5px stroke, ink.

---

## 7. Copy voice

Plain, short, calm, imperative. No buzzwords ("seamless", "unlock", "supercharge", "revolutionize", "empower", "effortless"), no exclamation marks, no emoji. Em dashes: avoid in UI copy (use a period or a colon). I'll strip the em dashes from the current UI strings (e.g. the offline status).

---

## 8. Banned (AI-slop tells) and how it's enforced

Banned: purple/violet/indigo; gradients of any kind; glassmorphism / `backdrop-filter` / blur; glows (`box-shadow`/`text-shadow` with color/blur); emoji as icons; 3D blobs, illustrations, stock imagery; centered hero + 3 feature cards; icon-in-a-circle rows; sparkle "AI" icons; buzzword copy; em-dash-heavy copy; Inter/Roboto/Poppins/Space Grotesk/system-ui as primary font.

**Enforcement:** a Vitest test (`tests/design.test.ts`) scans `src/` and fails if it finds: a hex/rgb/hsl color outside `src/ui/tokens.ts`; `gradient(`; `backdrop-filter` or `blur(`; `box-shadow`/`text-shadow`; banned font names; purple/violet/indigo hues (any token with hue 250–300°); emoji in UI strings; banned buzzwords or `—` in `src/i18n/*.json`; `border-radius` > 4px in tokens. Plus a manual self-check pasted into the handoff each session.

---

## 9. Styleguide page

`/#/styleguide` (hash route, no router library; works offline). Shows side by side **Paper | Ink** (each panel forces its theme with `data-theme`): every color token with hex and contrast ratio, the type scale, spacing/radius scale, status chips, toggle, buttons (incl. "Something's wrong"), progress, a step in each state (todo / current / done with stamp), the Do-not box, footnotes, and a "replay stamp" button.

Theme control: the app follows the OS, and `data-theme="light|dark"` on any element forces that theme for its subtree (used by the styleguide and handy for screenshots).

---

## 10. Decisions

- ✅ 2026-11-24 (J): `accent-text #c22a10` for small red text in Paper mode.
- ✅ 2026-11-24 (J): do-not label "AVOID" / "À ÉVITER"; plan text unchanged.
- Open: logo glyph (later). `public/logo.svg` is a placeholder in the palette.
- ✅ 2026-11-24 (architect, Session 3b): triage results are always shown as "FOUND ON SCREEN · PLEASE CONFIRM", every field editable before saving to the incident log (spec in §6; build with the incident log).

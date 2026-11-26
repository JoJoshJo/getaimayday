# Redesign previews · Session 9 (2026-11-26)

Three directions for J to pick from. Live at `/#/styleguide` (switcher at the top: direction, light/dark, EN/FR). Same screens and same words in all three; only the look changes. Nothing is applied to the app yet.

All three share: Google Sans Flex (self-hosted, precached, offline) for everything, Google Sans Code only for times and file extensions, sentence case everywhere, 18px body text, soft corners, a line icon per incident and per fix-it (lucide-react), a friendly empty state, a simpler top bar (Home · Get ready · Incidents, the rest under "More"), source badges with an icon and plain words. The red-orange accent `#ff4829` is used only for "Something's wrong" and the "Avoid" boxes.

| | A · Calm helper | B · Google-ish, but ours | C · Warm and human |
| --- | --- | --- | --- |
| Look | Warm off-white page, white rounded cards, grey icons. Like a calm banking or health app. | Bold headlines, a charcoal hero band on Home with three flat shapes (red-orange circle, green quarter, blue pill), coloured icons, pill buttons. | White page, each incident has its own soft colour (tiles and the plan page), big rounded headings, larger icons. |
| Friendliness | Good. Quiet and reassuring. | Good. Confident, a bit techy. | Best. Most approachable; colour helps people find "their" problem. |
| Readability under stress | Best. Least noise; one thing stands out: the red button. | Good. The dark hero makes the main question very clear; shapes are pure decoration. | Good. Tinted plan pages are softer; all text still passes WCAG AA (tested). |
| Distinctive for judges | Low to medium. Clean but familiar. | High. Feels at home in a Google hackathon; risk: may read as imitating Google. | Medium to high. Warm and human, unusual for a security tool. |
| Effort to apply app-wide | Low. Mostly tokens, radius, type, casing. | Medium. Hero band + shapes, coloured icons, dark-band contrast on Home. | Medium. One colour per incident carried through plan, log and print. |

**My recommendation: C**, because J's feedback was "not user friendly, too IT", and C moves furthest from that while staying calm. A is the safe fallback if C feels too colourful during a real incident.

## Screenshots

`<dir>-<desktop|mobile>-<light|dark>-<en|fr>-<frame>.png`, frames: `home`, `step`, and for desktop light EN also `confirm` (photo panel) and `pack` (Pack search). Desktop 1280 px, mobile 390 px (2x).

Regenerate: start `npm run dev`, then the scratch script `redesign.mjs <out dir>` (Playwright, see SESSION_HANDOFF Session 9).

# AIMayday

Calm, step-by-step help when a small business has a cyber incident or an outage, **even with no internet and no AI**.

AIMayday is an offline-first web app (PWA) built for #BuildHybridAI 2026 with **Firebase AI Logic hybrid inference**. It is made for small businesses with little or no IT support: a dental office, a shop, a cafe.

## The hybrid design: the cloud prepares, the device acts

| When | Where the AI runs | What it does |
| --- | --- | --- |
| **Calm day, online** | Cloud Gemini (Firebase AI Logic, `ONLY_IN_CLOUD`), only after you see exactly what is sent | Builds your **Offline Incident Pack**: hundreds of answers fitted to your business, in English and French, saved on the device |
| **Incident day, offline** | Gemini Nano in Chrome (Firebase AI Logic, `ONLY_ON_DEVICE`), when the device has it | Understands "what is happening", reads a photo of the ransom screen into fields you confirm, answers questions about the current step |
| **Incident day, no Nano** | No model at all | The Offline Pack answers from local text search (MiniSearch); the checklist and the printed plan always work |
| **Back online** | Cloud Gemini (`ONLY_IN_CLOUD`), after a preview. The optional "double-check with cloud AI" on a ransom photo uses `PREFER_IN_CLOUD`, also after a button | Incident report, recovery next steps, messages to staff, customers, bank and insurer |
| **Everyday IT fix-its** | Firebase AI Logic `PREFER_ON_DEVICE`: Gemini Nano when the device has it, otherwise the SDK falls back to cloud Gemini on its own | Answers a question about one fix-it step (Wi-Fi, printer...). Only here, because there is no incident or business data in it |

**The rule: automatic cloud fallback only where the content is not sensitive.** Incident-day jobs use `ONLY_ON_DEVICE`, so a description, a photo or a question about an incident never goes to the cloud on its own. The fix-it question box says that cloud AI may answer, asks you not to type personal details, and the app removes email addresses and phone numbers before sending. The mode for each feature is in `src/ai/modes.ts`.

Every answer shows its real source: **On-device AI**, **Offline Pack**, **Cloud AI** or **Checklist**. The badge comes from the SDK's `inferenceSource`, never a guess. The checklist never waits on AI.

Most office PCs cannot run on-device AI (Chrome needs about 16 GB of RAM or a GPU with more than 4 GB, and 22 GB of free disk). The Offline Pack is what makes the app useful on the 8 GB laptop a small business actually owns. On-device AI is a bonus.

## What it does

- **Something's wrong**: describe it in your own words, get the right plan (on-device AI, else keyword match, else pick a tile).
- **Plans** for ransomware, invoice or payment fraud (BEC), phishing or a stolen password, a lost or stolen device, and an internet, power or email outage, in English and French. Every step has an official source (CISA, NIST SP 800-61r3, FBI IC3, FTC; outside the US, cybermalveillance.gouv.fr and the Canadian Centre for Cyber Security). The plans never advise paying a ransom, wiping machines or contacting the attacker.
- **Incident log** on the device: timestamps, notes, photos, past incidents.
- **Found on screen · please confirm**: on-device AI reads the ransom screen; you correct and confirm every field before it is saved.
- **Emergency contacts** one tap from every plan step.
- **Ask a question** on any step: on-device AI bound to that step, else the Offline Pack, else "call your IT contact".
- **Everyday IT fix-its** (Wi-Fi, email not sending, frozen computer, printer, locked account, power outage), with sources from Microsoft, Apple, Google, CISA, FTC and Ready.gov. Ask a question works there too: on-device AI when the device has it, otherwise cloud AI through the SDK's automatic fallback when online, otherwise "call your IT contact". When a problem looks like an attack, the fix-it opens the matching plan.
- **Get ready** checklist and **printable plans**.

Everything stays on the device (IndexedDB). Nothing about your business or an incident goes to the cloud unless you tap a button and see a preview of exactly what will be sent. The one exception is a question typed on an everyday IT fix-it, on a device without on-device AI, and the question box says so.

## Run it

Requires Node 20.19 or later and Chrome.

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

For filming or a quick look, the hidden page `#/demo-setup` loads a made-up business (Sunrise Dental) in one click and can delete all local data. It is never on by default, and a "Demo data" line shows on every screen while it is loaded.

Other scripts: `npm test` (Vitest), `npm run lint` (oxlint), `npm run build` (type check, build, then a check that no App Check debug token is in `dist/`), `npm run preview`.

### App Check (needed for cloud AI)

Cloud calls go through Firebase AI Logic with **App Check enforced** (reCAPTCHA Enterprise).

- **Local dev:** `npm run dev` turns on the App Check **debug provider**. On first run, the browser console prints a debug token. Register it in Firebase console → Security → App Check → Apps → Manage debug tokens, then put it in `.env.local` as `VITE_APPCHECK_DEBUG_TOKEN`. That file is gitignored. **Never commit a debug token.** Production builds never contain the debug code (checked after every build).
- **Production:** set `VITE_RECAPTCHA_ENTERPRISE_KEY` (a public site key) in `.env.local` before `npm run build`.
- On-device AI and everything offline work without App Check.

The Firebase web config in `src/ai/firebase.ts` is public by design.

### On-device AI

Chrome's built-in Gemini Nano. No flags are needed in current Chrome on a capable desktop. The **Get ready** screen shows whether this device can run it and can start the one-time download.

## Data and free tier

- Business profile, contacts, incidents, photos and the Offline Pack are stored only in this browser (IndexedDB). Clearing site data deletes them.
- The Pack build sends your business type, country, staff count, email provider, important systems, backup facts and which contact roles you filled in. It never sends your business name, city, contact names, phone numbers, emails, incidents or photos.
- Cloud AI uses the **Gemini Developer API free tier** through Firebase AI Logic (model set in Remote Config, default `gemini-3.5-flash-lite`). Free-tier Gemini use may be used by Google to improve its products; do not put real customer data into the test app. All dev and test data in this repo is fake (for example "Sunrise Dental, Riverdale GA", 555-01xx numbers).

## Deploy (Firebase Hosting)

`firebase.json` serves `dist/` as a single-page app on site `getaimayday`, with `sw.js` never cached, hashed assets cached for a year, and a strict Content-Security-Policy plus security headers (each allowed origin is explained in `.brain/SESSION_HANDOFF.md`, Session 5). `npm run preview` serves the same headers.

```bash
npm run build
```

```bash
npx firebase-tools deploy --only hosting
```

## Project layout

- `src/ai/`: Firebase AI Logic (router, on-device jobs, cloud jobs, prompts, schemas, warm-up)
- `src/plans/`: built-in plans (JSON, EN + FR) and routing
- `src/fixits/`: everyday IT fix-its (JSON, EN + FR)
- `src/pack/`: Offline Pack schema, builder, guard, search, storage
- `src/features/`: screens (home, incident, log, triage, setup, contacts, pack, ask, online, ready, print)
- `src/storage/`: IndexedDB (Dexie)
- `.brain/`: plan, design system, spikes, Pack schema and the session log

## Disclaimer

Guidance based on CISA, NIST, FBI and FTC advice. Not a replacement for professional IT, legal or law-enforcement help.

## License

Apache-2.0. See [LICENSE](LICENSE).

# Offline Incident Pack: schema (v1)

Code: `src/pack/schema.ts` (zod, the source of truth), `src/pack/build.ts`, `src/pack/match.ts`, `src/pack/store.ts`, `src/ai/prompts/pack.ts`, `src/ai/cloud.ts`. UI: `#/pack` (`src/features/pack/`).

## Idea
"The cloud prepares, the device acts." On a calm day, online, cloud Gemini (Firebase AI Logic, `InferenceMode.ONLY_IN_CLOUD`) writes pre-answered questions fitted to the business. They are stored on the device. On incident day they are searched with MiniSearch (plain text search, **not an AI model**), so answers work on any laptop or phone with no network and no Nano. Badge: **Offline Pack**.

## Build flow
1. User taps **Build the Offline Pack** (online only; offline the button is not shown).
2. **Preview** (nothing sent yet): "Sent to: Google Gemini (cloud) via Firebase AI Logic", the exact business context block, the number of requests, what is NOT sent, and a "Show the exact text" section with every prompt. Buttons: Send to cloud AI / Cancel.
3. One request per **chunk**, sequential: each built-in plan × EN, FR, plus a glossary per language (today 2 plans → 6 requests; grows with plans). Each chunk is validated and saved as soon as it lands, so a stopped or partly failed build keeps what it made (old chunks stay until replaced). "Stop after this part" is available.

## What is sent (per chunk)
- Business context (`businessContext()`): type of business, country, number of staff, email provider, important systems, backups yes/no/not sure + where, **roles** of filled contacts.
- **Never sent:** business name, city, contact names, phones, emails, notes, incidents, photos (unit test enforces this on every prompt).
- The plan's steps in that language (id, title, detail, avoid) and fixed rules: plain words, no dashes/"!", never contradict the plan, never advise paying, wiping/reinstalling or contacting the attacker, never invent numbers/URLs/names.

## Model output (responseJsonSchema)
- Plan chunk: `{ qa: [{ question, alt_phrasings[], answer, step_ref (enum of that plan's step ids), contact_role (enum of roles | "none") }] }`, about 30 items.
- Glossary chunk: `{ terms: [{ term, plain }] }`, about 20 items.

## Checks before saving (`runPackJob`)
- `inferenceSource` must be `in_cloud` (else the chunk is rejected: we never label something we can't prove).
- zod validation (lengths, enums). Items whose `step_ref` is not a real step are dropped.
- **Sources are copied from the plan step**, never taken from the model.
- `guard.ts`: answers that tell the user to pay, wipe/reinstall or contact/reply to the attacker are dropped (sentences with "do not / never / ne ... jamais" are allowed). Dashes and "!" are normalized.
- A chunk with no usable answers fails (shown as "Not built").

## Stored (IndexedDB `kv`, key `pack`)
```
Pack {
  schema: 1, version: n (+1 per build), created_at, updated_at (ms),
  input_hash   // hash of business context + plan versions → "your setup changed, build again"
  chunks: { "<lang>:<plan_id>" | "<lang>:glossary": Chunk }
}
PlanChunk { kind:"plan", plan_id, plan_version, lang, generated_at, model, qa: PackQa[] }
PackQa    { id, question, alt_phrasings[], answer, step_ref, contact_role|null, source_name, source_url }
GlossaryChunk { kind:"glossary", lang, generated_at, model, terms:[{term, plain}] }
```
`do_not` lists from MASTER §7 are not duplicated: the built-in plans already carry them per step.

## Matching (`matchPack`)
- Index per language: fields question (boost 3), alt_phrasings (2), answer (0.5). Terms lowercased, accents stripped, EN+FR stop words removed; fuzzy 0.2, prefix for words over 3 letters. Optional filter by plan (used by "Ask a question" on a step).
- **Confident** when the top result matches at least 60% of the question's meaningful words (and at least 2 when the question has 2+) → one answer + source + one-tap call of its `contact_role`.
- Otherwise → up to 3 closest questions (expandable) + "Call IT contact" (or "Open your contacts").
- Quality test on a hand-written fixture: 20 questions EN+FR, top-1 ≥ 16 (passes 20/20 today). The real S3 spike (a cloud-built pack) is a J TODO.

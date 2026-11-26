import { describe, expect, it } from 'vitest'
import { answerQuestion } from '../src/features/ask/answer'
import { rawFixits } from '../src/fixits'
import { FIXIT_TOPICS, FixitSchema, type Fixit } from '../src/fixits/schema'
import { LANGUAGES, messages } from '../src/i18n/messages'
import { isUnsafeAdvice } from '../src/pack/guard'
import { rawPlans } from '../src/plans'

/**
 * IT fix-its (Session 5 · 3). Same rules as the plans, except:
 * - vendor help pages are allowed (Microsoft, Apple, Google), each fetched and checked
 *   in Session 5 (see SESSION_HANDOFF.md);
 * - no "outside the US" reporting step: a printer jam is not something to report.
 *   Every fix-it that can turn into an attack links to its incident plan instead.
 */
const ALLOWED = [
  'www.cisa.gov', 'www.nist.gov', 'www.ftc.gov', 'consumer.ftc.gov', 'www.ready.gov',
  'support.microsoft.com', 'support.apple.com', 'support.google.com',
]
const planIds = new Set(Object.values(rawPlans).flatMap((byId) => Object.keys(byId)))

describe('IT fix-its', () => {
  it('has every topic in every language and nothing else', () => {
    for (const lang of LANGUAGES) expect(Object.keys(rawFixits[lang] ?? {}).sort()).toEqual([...FIXIT_TOPICS].sort())
  })

  for (const id of FIXIT_TOPICS) {
    describe(id, () => {
      const parsed = LANGUAGES.map((l) => {
        const r = FixitSchema.safeParse(rawFixits[l]?.[id])
        if (!r.success) throw new Error(`${l}/${id}.json:\n${r.error.message}`)
        return r.data
      }) as Fixit[]

      it('is the same fix-it in every language (version, related, step ids, do_not)', () => {
        const shape = (f: Fixit) => ({ id: f.id, version: f.version, related: f.related, steps: f.steps.map((s) => [s.id, Boolean(s.do_not)]) })
        for (const f of parsed.slice(1)) expect(shape(f)).toEqual(shape(parsed[0]))
      })

      it('related plan exists', () => {
        if (parsed[0].related) expect(planIds.has(parsed[0].related)).toBe(true)
      })

      it('ends with "call your IT contact" (one-tap contact button)', () => {
        for (const f of parsed) expect(f.steps.at(-1)!.id).toBe('call-it-contact')
      })

      for (const f of parsed) {
        const lang = LANGUAGES[parsed.indexOf(f)]
        it(`[${lang}] sources are allowed sites, in the right language`, () => {
          for (const s of f.steps) {
            const u = new URL(s.source_url)
            expect(ALLOWED, `${s.id}: ${s.source_url}`).toContain(u.host)
            if (u.host !== 'support.google.com' && /^support\./.test(u.host)) expect(u.pathname, s.source_url).toMatch(lang === 'fr' ? /^\/fr-fr\// : /^\/en-us\//)
          }
        })
        it(`[${lang}] titles fit (≤ 80) and advice is safe`, () => {
          for (const s of f.steps) {
            expect(s.title.length, s.title).toBeLessThanOrEqual(80)
            const positive = `${s.title}. ${s.detail}`.split(/(?<=[.?])\s+/).filter((x) => !/\b(do not|don't|never)\b|\bne\b|\bn['’]/i.test(x))
            expect(positive.filter((x) => isUnsafeAdvice(x)), s.id).toEqual([])
            expect(positive.join(' ').toLowerCase()).not.toMatch(/\b(pay the ransom|wipe|reinstall|réinstallez|formatez|factory reset)\b/)
          }
        })
      }
    })
  }

  it('every topic has a name and description in EN and FR', () => {
    for (const lang of LANGUAGES)
      for (const id of FIXIT_TOPICS) {
        const m = messages[lang] as Record<string, string>
        expect(m[`fixit.topic.${id}`], `${lang} fixit.topic.${id}`).toBeTruthy()
        expect(m[`fixit.desc.${id}`], `${lang} fixit.desc.${id}`).toBeTruthy()
      }
  })
})

describe('ask a question on a fix-it', () => {
  const fixit = FixitSchema.parse(rawFixits.en.printer)
  const step = fixit.steps[0]
  const pack = async () => {
    throw new Error('Pack must not be read for a fix-it with no related plan')
  }

  it('on-device answer comes back with the On-device source', async () => {
    const a = await answerQuestion('How long should I wait?', { ...fixit, packPlan: null }, step, 'en', {
      availability: async () => 'available',
      ask: async () => ({ data: { answer: 'Wait about 30 seconds before you plug it back in.', in_plan: true }, source: 'on-device', seconds: 1 }),
      loadPack: pack,
    })
    expect(a).toEqual({ kind: 'ai', source: 'on-device', text: 'Wait about 30 seconds before you plug it back in.' })
  })

  it('no Nano and no related plan → "call your contact", Pack untouched', async () => {
    const a = await answerQuestion('How long should I wait?', { ...fixit, packPlan: null }, step, 'en', {
      availability: async () => 'unavailable',
      ask: async () => {
        throw new Error('no model')
      },
      loadPack: pack,
    })
    expect(a).toEqual({ kind: 'none', reason: 'no-answer' })
  })

  it('the prompt says it is an everyday IT problem, not an incident', async () => {
    let prompt = ''
    await answerQuestion('Which button?', { ...fixit, packPlan: null }, step, 'en', {
      availability: async () => 'available',
      ask: async (p) => {
        prompt = p
        return { data: null, source: 'checklist', seconds: 0 }
      },
      loadPack: async () => null,
    })
    expect(prompt).toMatch(/everyday IT problem \("printer"\)/)
    expect(prompt).not.toMatch(/incident/)
  })
})

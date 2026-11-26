import { describe, expect, it } from 'vitest'
import { LANGUAGES, messages } from '../src/i18n/messages'
import { rawPlans } from '../src/plans'
import { PlanSchema, type Plan } from '../src/plans/schema'

const planIds = [...new Set(Object.values(rawPlans).flatMap((byId) => Object.keys(byId)))].sort()

describe('built-in plans', () => {
  it('finds at least the ransomware plan', () => {
    expect(planIds).toContain('ransomware')
  })

  it('only has plan folders for supported languages', () => {
    for (const lang of Object.keys(rawPlans)) expect(LANGUAGES).toContain(lang)
  })

  for (const id of planIds) {
    describe(id, () => {
      for (const lang of LANGUAGES) {
        it(`[${lang}] exists and matches the plan schema`, () => {
          const raw = rawPlans[lang]?.[id]
          expect(raw, `missing src/plans/${lang}/${id}.json`).toBeDefined()
          const result = PlanSchema.safeParse(raw)
          if (!result.success) throw new Error(`${lang}/${id}.json:\n${result.error.message}`)
          expect(result.data.id).toBe(id)
        })
      }

      it('is the same plan in every language (id, incident, version, step ids and order)', () => {
        const parsed = LANGUAGES.map((l) => PlanSchema.parse(rawPlans[l]?.[id])) as Plan[]
        const shape = (p: Plan) => ({ id: p.id, incident: p.incident, version: p.version, steps: p.steps.map((s) => s.id) })
        const [first, ...rest] = parsed
        for (const p of rest) expect(shape(p)).toEqual(shape(first))
        // do_not present in one language must be present in all
        for (const p of rest)
          p.steps.forEach((s, i) => expect(Boolean(s.do_not), `${id} step ${s.id} do_not mismatch`).toBe(Boolean(first.steps[i].do_not)))
      })
    })
  }

  it('ransomware: "use a clean device" is one of the first steps', () => {
    for (const lang of LANGUAGES) {
      const plan = PlanSchema.parse(rawPlans[lang].ransomware)
      const idx = plan.steps.findIndex((s) => s.id === 'use-clean-device')
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(2)
    }
  })
})

describe('plan schema rejects bad plans', () => {
  const step = { id: 'a', title: 't', detail: 'd', why: 'w', source_name: 's', source_url: 'https://www.cisa.gov/' }
  const plan = { id: 'x', incident: 'ransomware', version: '1.0.0', steps: [step] }
  it('accepts a minimal valid plan', () => expect(PlanSchema.safeParse(plan).success).toBe(true))
  it('rejects a step with no source link', () => {
    const { source_url: _omit, ...noUrl } = step
    void _omit
    expect(PlanSchema.safeParse({ ...plan, steps: [noUrl] }).success).toBe(false)
  })
  it('rejects a non-https source link', () =>
    expect(PlanSchema.safeParse({ ...plan, steps: [{ ...step, source_url: 'http://www.cisa.gov/' }] }).success).toBe(false))
  it('rejects duplicate step ids', () => expect(PlanSchema.safeParse({ ...plan, steps: [step, step] }).success).toBe(false))
  it('rejects unknown fields', () => expect(PlanSchema.safeParse({ ...plan, extra: 1 }).success).toBe(false))
})

describe('i18n messages', () => {
  it('every language has exactly the English keys, none empty', () => {
    const keys = Object.keys(messages.en).sort()
    for (const lang of LANGUAGES) {
      expect(Object.keys(messages[lang]).sort()).toEqual(keys)
      for (const k of keys) expect(messages[lang][k as keyof typeof messages.en].trim()).not.toBe('')
    }
  })
})

describe('plan content rules (Session 4)', () => {
  // Official sources only (each URL was fetched and checked in Session 4; see SESSION_HANDOFF.md).
  const ALLOWED = ['www.cisa.gov', 'csrc.nist.gov', 'www.nist.gov', 'www.ic3.gov', 'www.ftc.gov', 'consumer.ftc.gov', 'reportfraud.ftc.gov', 'www.identitytheft.gov', 'www.cyber.gc.ca', 'www.cybermalveillance.gouv.fr', 'www.ready.gov']
  for (const id of planIds)
    for (const lang of LANGUAGES) {
      const plan = PlanSchema.parse(rawPlans[lang][id])
      it(`[${lang}/${id}] every source is an allowed official site`, () => {
        for (const s of plan.steps) expect(ALLOWED, `${s.id}: ${s.source_url}`).toContain(new URL(s.source_url).host)
      })
      it(`[${lang}/${id}] has an "outside the US" reporting step (France + Canada)`, () => {
        const s = plan.steps.find((x) => x.id === 'report-outside-us')
        expect(s).toBeDefined()
        expect(s!.detail).toMatch(/cybermalveillance\.gouv\.fr/)
        expect(s!.detail).toMatch(/cyber\.gc\.ca/)
      })
      it(`[${lang}/${id}] never tells the user to pay, wipe, or contact the attacker`, () => {
        // Sentences that say NOT to do it ("Do not contact the attackers") are fine.
        const positive = plan.steps
          .flatMap((s) => `${s.title}. ${s.detail}`.split(/(?<=[.?])\s+/))
          .filter((x) => !/\b(do not|don't|never)\b|\bne\b|\bn['’]/i.test(x))
        const text = positive.join(' ').toLowerCase()
        expect(text).not.toMatch(/\b(pay the ransom|payez la rançon|wipe|reinstall|réinstallez|formatez|contact the attackers|contactez les attaquants)\b/)
      })
    }
})

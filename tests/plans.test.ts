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

/** Back-online cloud jobs: what is sent, prompts, output checks. Cloud calls are faked. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanDoc, DOC_JOBS, docTime, incidentSummary, jobPlaceholders, jobPrompt, RULE_STEP_IDS, runDocJob, type DocGenerate } from '../src/features/online/jobs'
import { rawPlans } from '../src/plans'
import type { Plan } from '../src/plans/schema'
import type { IncidentRecord } from '../src/storage/db'

const plan = rawPlans.en.ransomware as Plan
const T0 = Date.UTC(2026, 10, 25, 9, 0)
const record: IncidentRecord = {
  id: 'i1', incident: 'ransomware', plan_id: 'ransomware', plan_version: plan.version, started_at: T0, status: 'open',
  steps: { 'use-clean-device': T0 + 60_000, 'disconnect-network': T0 + 120_000 },
  events: [
    { at: T0, kind: 'started', chosen_by: 'tile' },
    { at: T0 + 180_000, kind: 'note', text: 'Called Riverdale IT at 555-0142.' },
    { at: T0 + 200_000, kind: 'photo', photo_id: 'p1' },
    { at: T0 + 240_000, kind: 'triage', photo_id: 'p1', source: 'checklist', confidence: null,
      fields: { incident_type: 'ransomware', is_ransom_demand: true, ransom_amount: 0.35, currency: 'BTC', group_name: null, contact_method: null, deadline: null, file_extension: null },
      status: { incident_type: 'added', is_ransom_demand: 'added', ransom_amount: 'added', currency: 'added', group_name: 'empty', contact_method: 'empty', deadline: 'empty', file_extension: 'empty' } },
  ],
}

describe('incidentSummary (what is sent)', () => {
  const NY = 'America/New_York'
  const withNotes = incidentSummary(record, plan, { includeNotes: true, timeZone: NY })
  const noNotes = incidentSummary(record, plan, { includeNotes: false, timeZone: NY })
  it('has the timeline, done and open steps, confirmed screen fields', () => {
    expect(withNotes).toContain('Nov 25, 4:01 AM EST: Marked done: Use a clean device, not the infected computer')
    expect(withNotes).toMatch(/not done yet:[\s\S]*Restore/)
    expect(withNotes).toContain('ransom_amount: 0.35')
    expect(withNotes).not.toContain('group_name')
  })
  it('notes only when the user keeps them on; photos never', () => {
    expect(withNotes).toContain('555-0142')
    expect(noNotes).not.toContain('555-0142')
    expect(withNotes).not.toContain('p1')
  })
})

describe('jobPrompt', () => {
  it.each(DOC_JOBS)('%s: rules + log fenced + language', (job) => {
    const p = jobPrompt(job, 'LOG', 'fr')
    expect(p).toContain('<incident_log>\nLOG\n</incident_log>')
    expect(p).toContain('French')
    expect(p).toMatch(/Never advise paying a ransom/)
    expect(p).toMatch(/placeholders in square brackets/)
  })
})

describe('runDocJob', () => {
  const gen = (text: string, inferenceSource: string | undefined = 'in_cloud'): DocGenerate => async () => ({ text, inferenceSource, model: 'm' })
  it('cleans style but keeps lines', async () => {
    const r = await runDocJob('p', gen('## Summary\n**Files locked** — at 9:00!\n\n\n\nNext'))
    expect(r.text).toBe('Summary\nFiles locked, at 9:00.\n\nNext')
  })
  it('rejects non-cloud, empty and unsafe answers', async () => {
    await expect(runDocJob('p', gen('ok', 'on_device'))).rejects.toThrow(/cloud/)
    const none: DocGenerate = async () => ({ text: 'ok', inferenceSource: undefined, model: 'm' })
    await expect(runDocJob('p', none)).rejects.toThrow(/cloud/)
    await expect(runDocJob('p', gen('   '))).rejects.toThrow(/Empty/)
    await expect(runDocJob('p', gen('Next steps: pay the ransom to recover files.'))).rejects.toThrow(/safety/)
  })
  it('allows "do not pay" sentences', async () => {
    expect((await runDocJob('p', gen('Do not pay the ransom.'))).text).toBe('Do not pay the ransom.')
  })
  it('cleanDoc', () => expect(cleanDoc('a – b')).toBe('a, b'))
})

// ---- Session 13 ----
const NY = 'America/New_York'
const frPlan = rawPlans.fr.ransomware as Plan

describe('Session 13: the log sent to the AI', () => {
  const en = incidentSummary(record, plan, { includeNotes: true, timeZone: NY })
  const fr = incidentSummary(record, frPlan, { includeNotes: true, lang: 'fr', timeZone: NY })
  it('local time with a short zone label, never UTC (EN and FR)', () => {
    expect(en).toContain('Started: Nov 25, 2026, 4:00 AM EST')
    expect(fr).toContain('Début : 25 nov. 2026, 04:00 EST'.replace(' :', ':'))
    for (const s of [en, fr]) expect(s).not.toMatch(/UTC/)
    expect(docTime(T0, 'fr', { timeZone: 'Europe/Paris' })).toBe('25 nov., 10:00 GMT+1')
    expect(docTime(T0, 'en', { timeZone: 'UTC' })).toBe('Nov 25, 9:00 AM GMT')
  })
  it('ticked steps are listed as "Marked done: <exact title>"', () => {
    for (const s of plan.steps.filter((s) => record.steps[s.id])) expect(en).toContain(`Marked done: ${s.title}`)
    expect(fr).toContain('Cochée: Utilisez un appareil sain, pas l’ordinateur infecté')
  })
  it('notes are labelled "Note added", only when ticked', () => {
    expect(en).toContain('Nov 25, 4:03 AM EST: Note added: Called Riverdale IT at 555-0142.')
    expect(fr).toContain('Note ajoutée: Called Riverdale IT')
    expect(incidentSummary(record, plan, { includeNotes: false })).not.toContain('Note added')
  })
  it('rule steps go under Remember, not under "not done yet"', () => {
    const open = en.slice(en.indexOf('Plan steps not done yet:'), en.indexOf('Remember'))
    expect(open).not.toContain('Do not contact the attackers')
    expect(open).not.toContain('Leave affected computers as they are')
    expect(open).toContain('Restore only with your IT contact')
    expect(en).toMatch(/Remember \(rules from the plan, not tasks\):\n- Do not contact the attackers\n- Leave affected computers as they are/)
    expect(fr).toContain('À retenir')
  })
  it('every rule step id exists in a plan (renames fail here)', () => {
    const ids = new Set(Object.values(rawPlans.en).flatMap((p) => (p as Plan).steps.map((s) => s.id)))
    for (const id of RULE_STEP_IDS) expect(ids.has(id)).toBe(true)
  })
})

describe('Session 13: every document prompt has the shared rules (EN and FR)', () => {
  for (const lang of ['en', 'fr'] as const)
    it.each(DOC_JOBS)(`${lang} %s: "Marked done" rule, placeholder rule, no UTC`, (job) => {
      const p = jobPrompt(job, 'LOG', lang)
      expect(p).toContain(`Report each one as "${lang === 'fr' ? 'Cochée' : 'Marked done'}: <exact step title>"`)
      expect(p).toMatch(/Never reword a ticked step/)
      expect(p).toMatch(/never fill in real contact details/)
      for (const ph of jobPlaceholders(job, lang)) expect(p).toContain(ph)
      expect(p).toContain(lang === 'fr' ? 'Note ajoutée' : 'Note added')
    })
  it('bank and insurer get what they need to act', () => {
    expect(jobPlaceholders('draft_bank', 'en')).toEqual(['[Business name]', '[Account number]', '[Your name]', '[Phone number]'])
    expect(jobPlaceholders('draft_insurer', 'en')).toEqual(['[Business name]', '[Policy number]', '[Your name]', '[Phone number]'])
    expect(jobPlaceholders('draft_bank', 'fr')).toContain('[Numéro de compte]')
  })
  it('the report has a Remember section', () => expect(jobPrompt('report', 'LOG', 'en')).toMatch(/Remember \(only the rules/))
})

describe('Session 13: "Include my notes" is off by default', () => {
  it('BackOnline starts with includeNotes false', () => {
    const src = readFileSync(join(__dirname, '..', 'src', 'features', 'online', 'BackOnline.tsx'), 'utf8')
    expect(src).toMatch(/const \[includeNotes, setIncludeNotes\] = useState\(false\)/)
  })
})

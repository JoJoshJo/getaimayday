/** Back-online cloud jobs: what is sent, prompts, output checks. Cloud calls are faked. */
import { describe, expect, it } from 'vitest'
import { cleanDoc, DOC_JOBS, incidentSummary, jobPrompt, runDocJob, type DocGenerate } from '../src/features/online/jobs'
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
  const withNotes = incidentSummary(record, plan, { includeNotes: true })
  const noNotes = incidentSummary(record, plan, { includeNotes: false })
  it('has the timeline, done and open steps, confirmed screen fields', () => {
    expect(withNotes).toContain('2026-11-25 09:01 UTC: Use a clean device')
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
    expect(p).toMatch(/placeholder in square brackets/)
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

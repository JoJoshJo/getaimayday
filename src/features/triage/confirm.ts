/**
 * Found-on-screen panel logic (DESIGN.md §6), kept pure for tests.
 * The AI result is only a suggestion; what gets saved is what the user confirms,
 * with a per-field status saying where each value came from.
 */
import type { TriageResult, TriageType } from '../../ai/schemas'
import type { FieldStatus, TriageFieldName } from '../../storage/db'

export type FormValues = {
  incident_type: TriageType | ''
  is_ransom_demand: '' | 'yes' | 'no'
  ransom_amount: string
  currency: string
  group_name: string
  contact_method: string
  deadline: string
  file_extension: string
}

export const TEXT_FIELDS = ['ransom_amount', 'currency', 'group_name', 'contact_method', 'deadline', 'file_extension'] as const

export const EMPTY_FORM: FormValues = {
  incident_type: '',
  is_ransom_demand: '',
  ransom_amount: '',
  currency: '',
  group_name: '',
  contact_method: '',
  deadline: '',
  file_extension: '',
}

/** Prefill from the AI. null stays empty ("Not found"), never "unknown" or 0. */
export function toForm(r: TriageResult | null): FormValues {
  if (!r) return { ...EMPTY_FORM }
  return {
    incident_type: r.incident_type,
    is_ransom_demand: r.is_ransom_demand ? 'yes' : 'no',
    ransom_amount: r.ransom_amount === null ? '' : String(r.ransom_amount),
    currency: r.currency ?? '',
    group_name: r.group_name ?? '',
    contact_method: r.contact_method ?? '',
    deadline: r.deadline ?? '',
    file_extension: r.file_extension ?? '',
  }
}

export type Saved = Record<TriageFieldName, string | number | boolean | null>

/** Form → saved values (trimmed; empty → null; amount → number when it parses). */
export function fromForm(f: FormValues): Saved {
  const txt = (v: string) => (v.trim() === '' ? null : v.trim())
  const amount = f.ransom_amount.trim().replace(/[\s,]/g, '')
  return {
    incident_type: f.incident_type || null,
    is_ransom_demand: f.is_ransom_demand === '' ? null : f.is_ransom_demand === 'yes',
    ransom_amount: amount === '' ? null : Number.isFinite(Number(amount)) ? Number(amount) : f.ransom_amount.trim(),
    currency: txt(f.currency),
    group_name: txt(f.group_name),
    contact_method: txt(f.contact_method),
    deadline: txt(f.deadline),
    file_extension: txt(f.file_extension),
  }
}

/** found = AI value kept · edited = changed or cleared · added = AI had nothing, user typed it · empty. */
export function fieldStatuses(ai: TriageResult | null, saved: Saved): Record<TriageFieldName, FieldStatus> {
  const before = fromForm(toForm(ai))
  const out = {} as Record<TriageFieldName, FieldStatus>
  for (const k of Object.keys(saved) as TriageFieldName[]) {
    const a = before[k]
    const u = saved[k]
    out[k] = a === null ? (u === null ? 'empty' : 'added') : a === u ? 'found' : 'edited'
  }
  return out
}

/**
 * Cloud double-check (DESIGN.md §6): which fields get a "Use this" suggestion.
 * Only fields the user has NOT edited (current === what the panel opened with),
 * where the cloud found a value that differs. The cloud never overwrites.
 */
export function cloudSuggestions(opened: FormValues, current: FormValues, cloud: FormValues): Partial<FormValues> {
  const out: Partial<FormValues> = {}
  for (const k of Object.keys(cloud) as (keyof FormValues)[]) {
    const c = cloud[k].trim()
    if (c === '' || current[k] !== opened[k] || c === current[k].trim()) continue
    ;(out as Record<string, string>)[k] = c
  }
  return out
}

/**
 * Output schemas for AI jobs.
 *
 * One plain JSON Schema per job, used for BOTH paths:
 *   on-device → onDeviceParams.promptOptions.responseConstraint (passed as-is to Chrome's Prompt API)
 *   cloud     → inCloudParams.generationConfig.responseJsonSchema (+ responseMimeType application/json)
 * Fields that are not visible are simply omitted (not null): optional properties are
 * supported by both paths; Chrome's responseConstraint docs don't list nullable
 * types (re-checked Session 3c), and an unsupported feature throws NotSupportedError.
 * An explicit null from the model is still accepted (dropped as a non-answer).
 *
 * The model output is then validated with zod. Anything that doesn't match is an
 * error, never silently "fixed".
 */
import { z } from 'zod'

export const INCIDENT_TYPES = ['ransomware', 'phishing', 'invoice_fraud', 'lost_device', 'outage', 'unknown'] as const
export type IncidentType = (typeof INCIDENT_TYPES)[number]

// ---------- classifyIncident ----------

export const classifyJsonSchema = {
  type: 'object',
  properties: {
    incident: { type: 'string', enum: [...INCIDENT_TYPES] },
  },
  required: ['incident'],
  additionalProperties: false,
} as const

export const ClassifyResult = z.object({ incident: z.enum(INCIDENT_TYPES) }).strict()
export type ClassifyResult = z.infer<typeof ClassifyResult>

// ---------- askAboutStep (single-turn, bound to one plan step) ----------

export const askJsonSchema = {
  type: 'object',
  properties: {
    in_plan: { type: 'boolean' },
    answer: { type: 'string' },
  },
  required: ['in_plan', 'answer'],
  additionalProperties: false,
} as const

/** in_plan = false → the plan does not cover it; the app falls back to the Pack. */
export const AskResult = z.object({ in_plan: z.boolean(), answer: z.string().trim().max(1200) }).strict()
export type AskResult = z.infer<typeof AskResult>

// ---------- triageRansomScreen ----------

export const CONFIDENCE = ['low', 'medium', 'high'] as const

/**
 * Session 3c: triage has its OWN types (what a screen shows), separate from the
 * classify incident types (which plan to open). Mapping: src/plans/route.ts.
 */
export const TRIAGE_TYPES = ['ransomware', 'tech_support_scam', 'phishing_page', 'other', 'not_an_incident'] as const
export type TriageType = (typeof TRIAGE_TYPES)[number]

export const triageJsonSchema = {
  type: 'object',
  properties: {
    incident_type: { type: 'string', enum: [...TRIAGE_TYPES] },
    is_ransom_demand: { type: 'boolean', description: 'True only if the screen demands payment to unlock/recover files or stop a data leak' },
    ransom_amount: { type: 'number', description: 'Amount demanded, number only, if visible' },
    currency: { type: 'string', description: 'Currency or coin of the amount, e.g. USD, BTC, XMR, if visible' },
    group_name: { type: 'string', description: 'Name the attackers use for themselves, if visible' },
    contact_method: { type: 'string', description: 'How the note says to contact them (site, email, chat), copied as text, if visible' },
    deadline: { type: 'string', description: 'Deadline or countdown exactly as shown, if visible' },
    file_extension: { type: 'string', description: 'Extension added to encrypted files, e.g. .locked, if visible' },
    confidence: { type: 'string', enum: [...CONFIDENCE] },
  },
  required: ['incident_type', 'is_ransom_demand', 'confidence'],
  additionalProperties: false,
} as const

export type Confidence = (typeof CONFIDENCE)[number]

/** The six "found on screen" fields (everything except incident_type / confidence). */
export const TRIAGE_FIELDS = ['ransom_amount', 'currency', 'group_name', 'contact_method', 'deadline', 'file_extension'] as const

/**
 * Non-answers a small model writes instead of leaving a field out (spike S2:
 * "unknown", 0). Compared after trim + lowercase + stripping wrapping punctuation.
 */
const NON_ANSWERS = new Set([
  '', 'unknown', 'unk', 'n/a', 'na', 'none', 'null', 'nil', 'undefined', 'no', '-', '--', '?', 'tbd',
  'not visible', 'not shown', 'not found', 'not available', 'not specified', 'not provided', 'not mentioned',
  'inconnu', 'inconnue', 'aucun', 'aucune', 'non visible', 'non disponible', 'non indiqué', 'non précisé',
])

export function isNonAnswer(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'number') return !Number.isFinite(v) || v <= 0 // a ransom of 0 is not an answer
  if (typeof v === 'string') {
    const t = v.trim()
    // Session 12 (real Nano, samples 4 and 5: group_name ","): no letter or digit = no answer.
    // Unicode-aware, so French accents count as letters.
    if (!/[\p{L}\p{N}]/u.test(t)) return true
    return NON_ANSWERS.has(t.toLowerCase().replace(/^["'([{.\s]+|["')\]}.\s]+$/g, ''))
  }
  return false
}

/** (b) Drop non-answers from the optional fields BEFORE validation, so they become null, never data. */
export function dropNonAnswers(json: unknown): unknown {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return json
  const out: Record<string, unknown> = { ...(json as Record<string, unknown>) }
  for (const f of TRIAGE_FIELDS) if (f in out && isNonAnswer(out[f])) delete out[f]
  return out
}

const optText = z.string().trim().min(1).max(300).optional()

export const TriageRaw = z.preprocess(
  dropNonAnswers,
  z
    .object({
      incident_type: z.enum(TRIAGE_TYPES),
      is_ransom_demand: z.boolean(),
      ransom_amount: z.number().positive().finite().optional(),
      currency: optText,
      group_name: optText,
      contact_method: optText,
      deadline: optText,
      file_extension: optText,
      confidence: z.enum(CONFIDENCE),
    })
    .strict(),
)

/** What the app uses: every field present, null = not found on the screen. */
export type TriageResult = {
  incident_type: TriageType
  is_ransom_demand: boolean
  ransom_amount: number | null
  currency: string | null
  group_name: string | null
  contact_method: string | null
  deadline: string | null
  file_extension: string | null
  /** (a) Computed in code from what was found. This is the one the app uses. */
  confidence: Confidence
  /** The model's own claim. Debug only: in S2 it said "high" even when wrong. */
  model_confidence: Confidence
}

/**
 * (a) Confidence from evidence, not from the model:
 *   high   = incident_type known + ≥ 3 of the six fields found
 *   medium = incident_type known + 1–2 found
 *   low    = nothing found, or incident_type "other" (the model couldn't name it)
 */
export function computeConfidence(r: Pick<TriageResult, 'incident_type' | (typeof TRIAGE_FIELDS)[number]>): Confidence {
  if (r.incident_type === 'other') return 'low'
  const found = TRIAGE_FIELDS.filter((f) => r[f] !== null).length
  return found >= 3 ? 'high' : found >= 1 ? 'medium' : 'low'
}

export function normalizeTriage(raw: z.infer<typeof TriageRaw>): TriageResult {
  // Consistency guard (Session 3c, S2 #5 invented "USD"): without a ransom
  // demand there is no ransom amount or ransom currency.
  const ransom = raw.is_ransom_demand
  const fields = {
    incident_type: raw.incident_type,
    is_ransom_demand: raw.is_ransom_demand,
    ransom_amount: ransom ? (raw.ransom_amount ?? null) : null,
    currency: ransom ? (raw.currency ?? null) : null,
    group_name: raw.group_name ?? null,
    contact_method: raw.contact_method ?? null,
    deadline: raw.deadline ?? null,
    file_extension: raw.file_extension ?? null,
  }
  return { ...fields, confidence: computeConfidence(fields), model_confidence: raw.confidence }
}

/** Parse model text as JSON and validate. Throws AiOutputError with the raw text on failure. */
export class AiOutputError extends Error {
  readonly raw: string
  constructor(message: string, raw: string) {
    super(message)
    this.name = 'AiOutputError'
    this.raw = raw
  }
}

export function parseJson<T>(text: string, schema: z.ZodType<T>): T {
  let json: unknown
  try {
    // Tolerate a ```json fence some models add; nothing else is repaired.
    json = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch {
    throw new AiOutputError('Model output is not valid JSON', text)
  }
  const r = schema.safeParse(json)
  if (!r.success) throw new AiOutputError(`Model output does not match the schema: ${r.error.message}`, text)
  return r.data
}

/**
 * Session 12b: the ONE path from the model's text to what the app shows, used by the
 * real app (photo step, "Found on screen" panel) and the Lab alike, through
 * triageRansomScreen. Order: parse JSON → drop junk fields (",", "unknown", 0…) →
 * strict schema → consistency guard (no ransom, no amount or currency) → confidence
 * computed in code. There is no separate "verbatim" step in code: copying text
 * verbatim is a prompt rule (prompts/triage.ts), and the junk filter is the code check.
 */
export function triageFromModelText(text: string): TriageResult {
  return normalizeTriage(parseJson(text, TriageRaw))
}

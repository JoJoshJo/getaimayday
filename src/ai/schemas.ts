/**
 * Output schemas for AI jobs.
 *
 * One plain JSON Schema per job, used for BOTH paths:
 *   on-device → onDeviceParams.promptOptions.responseConstraint (passed as-is to Chrome's Prompt API)
 *   cloud     → inCloudParams.generationConfig.responseJsonSchema (+ responseMimeType application/json)
 * Fields that are not visible are simply omitted (not null): optional properties are
 * supported by both paths, null-unions are not guaranteed on-device.
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

// ---------- triageRansomScreen ----------

export const CONFIDENCE = ['low', 'medium', 'high'] as const

export const triageJsonSchema = {
  type: 'object',
  properties: {
    incident_type: { type: 'string', enum: [...INCIDENT_TYPES] },
    ransom_amount: { type: 'number', description: 'Amount demanded, number only, if visible' },
    currency: { type: 'string', description: 'Currency or coin of the amount, e.g. USD, BTC, XMR, if visible' },
    group_name: { type: 'string', description: 'Name the attackers use for themselves, if visible' },
    contact_method: { type: 'string', description: 'How the note says to contact them (site, email, chat), copied as text, if visible' },
    deadline: { type: 'string', description: 'Deadline or countdown exactly as shown, if visible' },
    file_extension: { type: 'string', description: 'Extension added to encrypted files, e.g. .locked, if visible' },
    confidence: { type: 'string', enum: [...CONFIDENCE] },
  },
  required: ['incident_type', 'confidence'],
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
  if (typeof v === 'string') return NON_ANSWERS.has(v.trim().toLowerCase().replace(/^["'([{.\s]+|["')\]}.\s]+$/g, ''))
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
      incident_type: z.enum(INCIDENT_TYPES),
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
  incident_type: IncidentType
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
 *   low    = nothing found, or incident_type "unknown"
 */
export function computeConfidence(r: Pick<TriageResult, 'incident_type' | (typeof TRIAGE_FIELDS)[number]>): Confidence {
  if (r.incident_type === 'unknown') return 'low'
  const found = TRIAGE_FIELDS.filter((f) => r[f] !== null).length
  return found >= 3 ? 'high' : found >= 1 ? 'medium' : 'low'
}

export function normalizeTriage(raw: z.infer<typeof TriageRaw>): TriageResult {
  const fields = {
    incident_type: raw.incident_type,
    ransom_amount: raw.ransom_amount ?? null,
    currency: raw.currency ?? null,
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

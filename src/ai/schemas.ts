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

const optText = z.string().trim().min(1).max(300).optional()

export const TriageRaw = z
  .object({
    incident_type: z.enum(INCIDENT_TYPES),
    ransom_amount: z.number().nonnegative().finite().optional(),
    currency: optText,
    group_name: optText,
    contact_method: optText,
    deadline: optText,
    file_extension: optText,
    confidence: z.enum(CONFIDENCE),
  })
  .strict()

/** What the app uses: every field present, null = not visible on the screen. */
export type TriageResult = {
  incident_type: IncidentType
  ransom_amount: number | null
  currency: string | null
  group_name: string | null
  contact_method: string | null
  deadline: string | null
  file_extension: string | null
  confidence: (typeof CONFIDENCE)[number]
}

export function normalizeTriage(raw: z.infer<typeof TriageRaw>): TriageResult {
  return {
    incident_type: raw.incident_type,
    ransom_amount: raw.ransom_amount ?? null,
    currency: raw.currency ?? null,
    group_name: raw.group_name ?? null,
    contact_method: raw.contact_method ?? null,
    deadline: raw.deadline ?? null,
    file_extension: raw.file_extension ?? null,
    confidence: raw.confidence,
  }
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

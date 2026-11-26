/**
 * Offline Incident Pack format (.brain/PACK_SCHEMA.md).
 *
 * The cloud model writes one CHUNK per (language, plan) plus one glossary chunk
 * per language. What the model returns (`ModelQaSchema`, `ModelGlossarySchema`)
 * is smaller than what we store: ids, sources and dates are added in code, and
 * sources are always copied from the built-in plan step (never from the model).
 */
import { z } from 'zod'
import { CONTACT_ROLES } from '../features/setup/model'

export const PACK_SCHEMA_VERSION = 1
export const PACK_LANGS = ['en', 'fr'] as const
export type PackLang = (typeof PACK_LANGS)[number]

const txt = (max: number) => z.string().trim().min(1).max(max)

// ---- What the model returns (validated before anything is saved) ----

export const ModelQaSchema = z.object({
  question: txt(200),
  alt_phrasings: z.array(txt(200)).max(6),
  answer: txt(900),
  step_ref: z.string().min(1),
  contact_role: z.enum([...CONTACT_ROLES, 'none']),
})
export const ModelPlanChunkSchema = z.object({ qa: z.array(ModelQaSchema).min(1).max(60) })

export const ModelGlossarySchema = z.object({
  terms: z.array(z.object({ term: txt(60), plain: txt(400) })).min(1).max(60),
})

/** JSON Schema sent as responseJsonSchema for a plan chunk (step ids are an enum, so answers point at real steps). */
export function planChunkJsonSchema(stepIds: string[]) {
  return {
    type: 'object',
    properties: {
      qa: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            alt_phrasings: { type: 'array', items: { type: 'string' } },
            answer: { type: 'string' },
            step_ref: { type: 'string', enum: stepIds },
            contact_role: { type: 'string', enum: [...CONTACT_ROLES, 'none'] },
          },
          required: ['question', 'alt_phrasings', 'answer', 'step_ref', 'contact_role'],
        },
      },
    },
    required: ['qa'],
  }
}

export const glossaryJsonSchema = {
  type: 'object',
  properties: {
    terms: {
      type: 'array',
      items: { type: 'object', properties: { term: { type: 'string' }, plain: { type: 'string' } }, required: ['term', 'plain'] },
    },
  },
  required: ['terms'],
}

// ---- What is stored on the device (kv "pack") ----

export const PackQaSchema = z.object({
  id: z.string(),
  question: txt(200),
  alt_phrasings: z.array(z.string()),
  answer: txt(900),
  step_ref: z.string(),
  contact_role: z.enum(CONTACT_ROLES).nullable(),
  source_name: z.string(),
  source_url: z.url({ protocol: /^https$/ }),
})
export type PackQa = z.infer<typeof PackQaSchema>

const chunkBase = { lang: z.enum(PACK_LANGS), generated_at: z.number(), model: z.string() }

export const PlanChunkSchema = z.object({ kind: z.literal('plan'), plan_id: z.string(), plan_version: z.string(), ...chunkBase, qa: z.array(PackQaSchema) })
export const GlossaryChunkSchema = z.object({ kind: z.literal('glossary'), ...chunkBase, terms: z.array(z.object({ term: z.string(), plain: z.string() })) })
export const ChunkSchema = z.discriminatedUnion('kind', [PlanChunkSchema, GlossaryChunkSchema])
export type PlanChunk = z.infer<typeof PlanChunkSchema>
export type GlossaryChunk = z.infer<typeof GlossaryChunkSchema>
export type Chunk = z.infer<typeof ChunkSchema>

export const PackSchema = z.object({
  schema: z.literal(PACK_SCHEMA_VERSION),
  /** Goes up by one each time the user builds the Pack. */
  version: z.number().int().min(1),
  created_at: z.number(),
  updated_at: z.number(),
  /** Hash of what was sent (profile + filled roles + plan versions). Different → "your setup changed". */
  input_hash: z.string(),
  /** Key = chunkKey(...). */
  chunks: z.record(z.string(), ChunkSchema),
})
export type Pack = z.infer<typeof PackSchema>

export const chunkKey = (lang: PackLang, part: string) => `${lang}:${part}`

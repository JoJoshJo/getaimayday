import { z } from 'zod'

/**
 * Built-in plan format (one JSON file per plan per language, in src/plans/{en,fr}/).
 * The same plan must exist in every language with the same id, incident,
 * version and step ids in the same order — only the text is translated.
 */

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase-kebab slug')
const text = z.string().trim().min(1)

export const INCIDENTS = ['ransomware', 'bec', 'phishing', 'lost-device', 'outage'] as const

export const PlanStepSchema = z
  .object({
    id: slug,
    title: text.max(80),
    detail: text,
    why: text,
    source_name: text,
    source_url: z.url({ protocol: /^https$/ }),
    do_not: text.optional(),
  })
  .strict()

export const PlanSchema = z
  .object({
    id: slug,
    incident: z.enum(INCIDENTS),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'must be semver, e.g. 1.0.0'),
    steps: z.array(PlanStepSchema).min(1),
  })
  .strict()
  .superRefine((plan, ctx) => {
    const seen = new Set<string>()
    plan.steps.forEach((s, i) => {
      if (seen.has(s.id)) ctx.addIssue({ code: 'custom', path: ['steps', i, 'id'], message: `duplicate step id "${s.id}"` })
      seen.add(s.id)
    })
  })

export type PlanStep = z.infer<typeof PlanStepSchema>
export type Plan = z.infer<typeof PlanSchema>
export type Incident = (typeof INCIDENTS)[number]

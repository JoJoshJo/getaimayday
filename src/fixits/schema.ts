import { z } from 'zod'
import { INCIDENTS, PlanStepSchema } from '../plans/schema'

/**
 * IT fix-it library (MASTER §6 NICE #18): everyday problems, same step format
 * as the incident plans (title, detail, why, source, optional "avoid"), EN + FR.
 * `related` = the incident plan to switch to when the problem looks like an attack.
 */
export const FIXIT_TOPICS = ['wifi', 'email-send', 'frozen-pc', 'printer', 'locked-account', 'power'] as const
export type FixitTopic = (typeof FIXIT_TOPICS)[number]

export const FixitSchema = z
  .object({
    id: z.enum(FIXIT_TOPICS),
    topic: z.enum(FIXIT_TOPICS),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    related: z.enum(INCIDENTS).optional(),
    steps: z.array(PlanStepSchema).min(2),
  })
  .strict()
  .superRefine((f, ctx) => {
    if (f.id !== f.topic) ctx.addIssue({ code: 'custom', path: ['topic'], message: 'id and topic must match' })
    const seen = new Set<string>()
    f.steps.forEach((s, i) => {
      if (seen.has(s.id)) ctx.addIssue({ code: 'custom', path: ['steps', i, 'id'], message: `duplicate step id "${s.id}"` })
      seen.add(s.id)
    })
  })
export type Fixit = z.infer<typeof FixitSchema>

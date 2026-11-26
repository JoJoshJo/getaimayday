/**
 * Which Firebase AI Logic InferenceMode each feature uses, in one place (Session 8).
 *
 * Rule (MASTER §5): automatic fallback only where the content is not sensitive.
 *
 *   only_on_device   incident day: plan picking, ransom-screen reading, questions on
 *                    an incident step. Works offline; never goes to the cloud on its own.
 *   prefer_on_device everyday IT fix-it questions only. No incident or business data:
 *                    Nano when Chrome has it, otherwise the SDK sends the question to
 *                    cloud Gemini by itself (a notice says so under the question box).
 *   prefer_in_cloud  "Double-check with cloud AI" on a ransom photo, after a button.
 *   only_in_cloud    Offline Pack build, report and messages, after a preview and a button.
 *
 * Plain strings (not the InferenceMode enum) so this file never pulls Firebase into
 * the main bundle. tests/modes.test.ts checks them against the real enum.
 */
import type { InferenceMode } from 'firebase/ai'
import type { AskGuide } from './prompts/ask'

export const MODES = {
  classify: 'only_on_device',
  triage: 'only_on_device',
  incidentAsk: 'only_on_device',
  fixitAsk: 'prefer_on_device',
  triageCloudCheck: 'prefer_in_cloud',
  pack: 'only_in_cloud',
  documents: 'only_in_cloud',
} as const satisfies Record<string, `${InferenceMode}`>

/**
 * Ask on a fix-it (has a topic, no incident) may fall back to the cloud. Anything
 * else, or anything unclear, stays on the device.
 */
export function askMode(guide: Pick<AskGuide, 'incident' | 'topic'>): InferenceMode {
  return (guide.topic && !guide.incident ? MODES.fixitAsk : MODES.incidentAsk) as InferenceMode
}

/** True when this mode may send the prompt to the cloud without a button. */
export const mayAutoCloud = (mode: InferenceMode): boolean => mode === MODES.fixitAsk

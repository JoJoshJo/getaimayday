/**
 * On-device AI jobs (Gemini Nano in Chrome) through Firebase AI Logic hybrid inference.
 *
 * Each job returns the validated data plus the REAL inferenceSource reported by
 * the SDK. Default mode is ONLY_ON_DEVICE (incident day: offline, no cloud);
 * the lab page can pass another InferenceMode to compare.
 *
 * API verified against firebase 13.4.0 / @firebase/ai 3.1.0 typings + source.
 */
import { getGenerativeModel, InferenceMode, type GenerativeModel, type InferenceSource } from 'firebase/ai'
import { ai } from './firebase'
import { classifyPrompt } from './prompts/classify'
import { TRIAGE_PROMPT } from './prompts/triage'
import { getCloudModel, initRemoteConfig } from './remoteConfig'
import { markOnDeviceActivity, ON_DEVICE_IO } from './warmup'
import {
  AskResult,
  askJsonSchema,
  ClassifyResult,
  classifyJsonSchema,
  normalizeTriage,
  parseJson,
  TriageRaw,
  triageJsonSchema,
  type IncidentType,
  type TriageResult,
} from './schemas'

export { InferenceMode, InferenceSource } from 'firebase/ai'
export { onDeviceAvailability } from './warmup'

export type JobResult<T> = { data: T; inferenceSource: InferenceSource | undefined }

function makeModel(mode: InferenceMode, jsonSchema: object): GenerativeModel {
  return getGenerativeModel(ai, {
    mode,
    onDeviceParams: {
      createOptions: ON_DEVICE_IO,
      promptOptions: { responseConstraint: jsonSchema },
    },
    inCloudParams: {
      model: getCloudModel(),
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema as Record<string, unknown>,
        temperature: 0,
      },
    },
  })
}

// One model per job+mode, so initializeDeviceModel's download promise is reused.
const cache = new Map<string, GenerativeModel>()
const SCHEMAS = { classify: classifyJsonSchema, triage: triageJsonSchema, ask: askJsonSchema }
function model(job: keyof typeof SCHEMAS, mode: InferenceMode): GenerativeModel {
  const key = `${job}:${mode}:${getCloudModel()}`
  let m = cache.get(key)
  if (!m) {
    m = makeModel(mode, SCHEMAS[job])
    cache.set(key, m)
  }
  return m
}

/**
 * Prepare (and if needed download) the on-device model. MUST be called from a
 * user gesture (click) before the first on-device call. Can take minutes.
 */
export async function prepareOnDevice(onProgress?: (fraction: number) => void): Promise<void> {
  await model('classify', InferenceMode.ONLY_ON_DEVICE).initializeDeviceModel(onProgress)
  await model('triage', InferenceMode.ONLY_ON_DEVICE).initializeDeviceModel()
}

/** Mark on-device activity for the warm-up scheduler (idle timer). */
function track<T>(r: JobResult<T>): JobResult<T> {
  if (r.inferenceSource === 'on_device') markOnDeviceActivity()
  return r
}

// Separate instance for warm-ups: the SDK destroys an adapter's previous session
// when it creates a new one, so sharing the classify instance could kill a real
// call that runs at the same time.
let warmModel: GenerativeModel | null = null

/**
 * (d) Tiny ONLY_ON_DEVICE classify call through AI Logic so Chrome loads Nano
 * into memory before the user needs it. Called by warmup.ts only after
 * LanguageModel.availability() === "available" (never triggers a download).
 */
export async function warmOnDevice(): Promise<void> {
  warmModel ??= makeModel(InferenceMode.ONLY_ON_DEVICE, classifyJsonSchema)
  const result = await warmModel.generateContent(classifyPrompt('warm-up'))
  if (result.response.inferenceSource !== 'on_device') throw new Error(`warm-up ran ${String(result.response.inferenceSource)}`)
  parseJson(result.response.text(), ClassifyResult)
  markOnDeviceActivity()
}

export async function classifyIncident(text: string, mode: InferenceMode = InferenceMode.ONLY_ON_DEVICE): Promise<JobResult<IncidentType>> {
  const result = await model('classify', mode).generateContent(classifyPrompt(text))
  const data = parseJson(result.response.text(), ClassifyResult)
  return track({ data: data.incident, inferenceSource: result.response.inferenceSource })
}

/**
 * "Ask a question" on a plan step: one prompt (step + short plan summary + question), one answer.
 * Fix-its pass PREFER_ON_DEVICE (src/ai/modes.ts): the SDK may then answer in the cloud,
 * so the Remote Config model name is loaded first (never throws; works offline).
 */
export async function askAboutStep(prompt: string, mode: InferenceMode = InferenceMode.ONLY_ON_DEVICE): Promise<JobResult<AskResult>> {
  if (mode !== InferenceMode.ONLY_ON_DEVICE) await initRemoteConfig()
  const result = await model('ask', mode).generateContent(prompt)
  const data = parseJson(result.response.text(), AskResult)
  return track({ data, inferenceSource: result.response.inferenceSource })
}

export const TRIAGE_MIME_TYPES = ['image/png', 'image/jpeg'] as const

export async function triageRansomScreen(
  image: { base64: string; mimeType: string },
  mode: InferenceMode = InferenceMode.ONLY_ON_DEVICE,
): Promise<JobResult<TriageResult>> {
  if (!(TRIAGE_MIME_TYPES as readonly string[]).includes(image.mimeType)) {
    throw new Error(`Only PNG or JPEG images are supported on-device (got ${image.mimeType}).`)
  }
  const result = await model('triage', mode).generateContent([
    TRIAGE_PROMPT,
    { type: 'inlineData', inlineData: { data: image.base64, mimeType: image.mimeType } },
  ])
  const raw = parseJson(result.response.text(), TriageRaw)
  return track({ data: normalizeTriage(raw), inferenceSource: result.response.inferenceSource })
}

/** Read a File/Blob as base64 (no data: prefix) for inlineData. */
export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

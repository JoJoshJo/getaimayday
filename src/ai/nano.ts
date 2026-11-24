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
import { getCloudModel } from './remoteConfig'
import {
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

export type JobResult<T> = { data: T; inferenceSource: InferenceSource | undefined }

const ON_DEVICE_IO = {
  // Default is English text + image; declare French input too (Chrome 149+ supports FR).
  expectedInputs: [
    { type: 'text' as const, languages: ['en', 'fr'] },
    { type: 'image' as const },
  ],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
}

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
function model(job: 'classify' | 'triage', mode: InferenceMode): GenerativeModel {
  const key = `${job}:${mode}:${getCloudModel()}`
  let m = cache.get(key)
  if (!m) {
    m = makeModel(mode, job === 'classify' ? classifyJsonSchema : triageJsonSchema)
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

/** Chrome Prompt API availability, if the API exists in this browser. */
export async function onDeviceAvailability(): Promise<string> {
  const LM = (globalThis as { LanguageModel?: { availability: (o?: object) => Promise<string> } }).LanguageModel
  if (!LM) return 'no-prompt-api'
  try {
    return await LM.availability(ON_DEVICE_IO)
  } catch (e) {
    return `error: ${(e as Error).message}`
  }
}

export async function classifyIncident(text: string, mode: InferenceMode = InferenceMode.ONLY_ON_DEVICE): Promise<JobResult<IncidentType>> {
  const result = await model('classify', mode).generateContent(classifyPrompt(text))
  const data = parseJson(result.response.text(), ClassifyResult)
  return { data: data.incident, inferenceSource: result.response.inferenceSource }
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
  return { data: normalizeTriage(raw), inferenceSource: result.response.inferenceSource }
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

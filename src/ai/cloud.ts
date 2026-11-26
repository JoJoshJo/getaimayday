/**
 * Cloud AI jobs (calm day / back online) through Firebase AI Logic with
 * InferenceMode.ONLY_IN_CLOUD. Only ever called after the user tapped a button
 * on a screen that showed exactly what is sent.
 *
 * Loaded with import() so the offline shell never depends on Firebase.
 * API verified against firebase 13.4.0 / @firebase/ai 3.1.0 typings.
 */
import { getGenerativeModel, InferenceMode } from 'firebase/ai'
import { ai } from './firebase'
import { getCloudModel, initRemoteConfig } from './remoteConfig'

export type CloudResult = { text: string; inferenceSource: string | undefined; model: string }

/** One structured-JSON call. Returns the raw text + the SDK's real inferenceSource. */
export async function cloudJson(prompt: string, jsonSchema: object, temperature = 0.3): Promise<CloudResult> {
  await initRemoteConfig()
  const model = getCloudModel()
  const m = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model,
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: jsonSchema as Record<string, unknown>, temperature },
    },
  })
  const r = await m.generateContent(prompt)
  return { text: r.response.text(), inferenceSource: r.response.inferenceSource, model }
}

/** One plain-text call (drafts and reports). */
export async function cloudText(prompt: string, temperature = 0.4): Promise<CloudResult> {
  await initRemoteConfig()
  const model = getCloudModel()
  const m = getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams: { model, generationConfig: { temperature } } })
  const r = await m.generateContent(prompt)
  return { text: r.response.text(), inferenceSource: r.response.inferenceSource, model }
}

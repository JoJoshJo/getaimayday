/**
 * Session 6b: every JSON schema sent to a model (cloud responseJsonSchema and
 * on-device responseConstraint) stays simple. The live API rejected
 * `minItems: 24` with HTTP 400 "too many states for serving". Limits are
 * enforced with zod after the answer, never in the schema.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { askJsonSchema, classifyJsonSchema, triageJsonSchema } from '../src/ai/schemas'
import { SAMPLE_CONTACTS, SAMPLE_PROFILE } from '../src/features/setup/model'
import { packJobs } from '../src/pack/build'

const BANNED = ['minItems', 'maxItems', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'format', 'minLength', 'maxLength', 'pattern', 'minProperties', 'maxProperties', 'uniqueItems']
const MAX_ENUM = 20

function problems(node: unknown, path = '$'): string[] {
  if (Array.isArray(node)) return node.flatMap((v, i) => problems(v, `${path}[${i}]`))
  if (!node || typeof node !== 'object') return []
  return Object.entries(node).flatMap(([k, v]) => {
    // Keys under "properties" are field names, not keywords (a field could be called "format").
    const own = path.endsWith('.properties') ? [] : [...(BANNED.includes(k) ? [`${path}.${k}`] : []), ...(k === 'enum' && Array.isArray(v) && v.length > MAX_ENUM ? [`${path}.enum has ${v.length} values`] : [])]
    return [...own, ...problems(v, `${path}.${k}`)]
  })
}

const outgoing: [string, object][] = [
  ['classify (on-device + cloud)', classifyJsonSchema],
  ['ask (on-device)', askJsonSchema],
  ['triage (on-device + cloud double-check)', triageJsonSchema],
  ...packJobs(SAMPLE_PROFILE, SAMPLE_CONTACTS).map((j) => [`pack ${j.key}`, j.jsonSchema] as [string, object]),
]

describe('outgoing model schemas stay simple', () => {
  it.each(outgoing)('%s: no min/max/format/length/pattern, short enums', (_name, schema) => expect(problems(schema)).toEqual([]))

  it('the checker itself catches the Session 6 regression', () => {
    expect(problems({ type: 'object', properties: { qa: { type: 'array', minItems: 24, items: { type: 'string', format: 'uri' } } } })).toEqual([
      '$.properties.qa.minItems',
      '$.properties.qa.items.format',
    ])
    expect(problems({ properties: { format: { type: 'string' } } })).toEqual([])
  })

  it('no schema keyword limits written anywhere in src/ai or src/pack', () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]))
    const hits = ['src/ai', 'src/pack']
      .flatMap(files)
      .filter((f) => f.endsWith('.ts'))
      .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((line, i) => [`${f}:${i + 1}`, line] as const))
      .filter(([, line]) => !/^\s*(\/\/|\*)/.test(line) && /\b(minItems|maxItems|minimum|maximum|minLength|maxLength|exclusiveM\w+|uniqueItems)\s*:/.test(line))
      .map(([where]) => where)
    expect(hits).toEqual([])
  })
})

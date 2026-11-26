/**
 * Session 7 · 2: Chrome DevTools "Issues" on the live site were form fields with
 * no id or name (FormEmptyIdAndNameAttributesForInputError) and one name that
 * is an autocomplete token (FormInputAssignedAutocompleteValueToIdOrNameAttributeError).
 * This scan keeps every <input>, <textarea> and <select> in src named, and no
 * static name/id equal to an autocomplete token.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]))
const tsx = files('src').filter((f) => f.endsWith('.tsx'))
// Element open tags; JSX attributes can hold "=>" so stop at the first ">" not part of "=>".
const tags = tsx.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<(input|textarea|select)\b((?:=>|[^>])*)>/g)].map((m) => [f, m[1], m[2]] as const))
const AUTOCOMPLETE = ['name', 'email', 'tel', 'country', 'country-name', 'address', 'username', 'password', 'organization', 'postal-code', 'street-address', 'given-name', 'family-name']

describe('form fields (DevTools Issues)', () => {
  it('finds the form fields', () => expect(tags.length).toBeGreaterThan(15))
  it('every input, textarea and select has a name or id', () => {
    expect(tags.filter(([, , attrs]) => !/\b(name|id)=/.test(attrs)).map(([f, tag]) => `${f}: <${tag}>`)).toEqual([])
  })
  it('no static name or id is an autocomplete token', () => {
    const bad = tags.filter(([, , attrs]) => [...attrs.matchAll(/\b(?:name|id)="([^"]+)"/g)].some((m) => AUTOCOMPLETE.includes(m[1])))
    expect(bad.map(([f, tag, a]) => `${f}: <${tag}${a.slice(0, 40)}`)).toEqual([])
  })
})

/**
 * Offline Pack: builder validation (cloud call faked; tests never call Gemini),
 * guard, storage, and MiniSearch matching quality on a hand-written fixture.
 * The real S3 spike (a real cloud-built pack) is a J TODO.
 */
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { SAMPLE_CONTACTS, SAMPLE_PROFILE } from '../src/features/setup/model'
import { businessContext, packInputHash, packJobs, runPackJob, type Generate } from '../src/pack/build'
import { isUnsafeAdvice, plainText } from '../src/pack/guard'
import { buildIndex, countAnswers, matchPack } from '../src/pack/match'
import { PackSchema, type Pack, type PackQa } from '../src/pack/schema'
import { beginBuild, loadPack, saveChunk } from '../src/pack/store'
import { db } from '../src/storage/db'

const fake =
  (body: unknown, inferenceSource: string | undefined = 'in_cloud'): Generate =>
  async () => ({ text: JSON.stringify(body), inferenceSource, model: 'test-model' })

describe('what is sent to the cloud', () => {
  const ctx = businessContext(SAMPLE_PROFILE, SAMPLE_CONTACTS)
  it('has the business facts the answers need', () => {
    expect(ctx).toContain('health or dental office')
    expect(ctx).toContain('Microsoft 365')
    expect(ctx).toContain('it_vendor')
  })
  it('never contains the name, city, contact names, phones or emails', () => {
    for (const secret of ['Sunrise Dental', 'Riverdale', '555-01', 'Sam', 'riverdale-it.example', 'Pat Kim', 'Policy CY'])
      expect(ctx).not.toContain(secret)
    for (const j of packJobs(SAMPLE_PROFILE, SAMPLE_CONTACTS)) for (const s of ['Sunrise Dental', '555-01', 'Riverdale']) expect(j.prompt).not.toContain(s)
  })
  it('one job per plan per language + a glossary per language', () => {
    const jobs = packJobs(SAMPLE_PROFILE, SAMPLE_CONTACTS)
    expect(jobs.map((j) => j.key)).toEqual(expect.arrayContaining(['en:ransomware', 'en:bec', 'fr:ransomware', 'fr:bec', 'en:glossary', 'fr:glossary']))
  })
  it('hash changes when the setup changes', () => {
    expect(packInputHash(SAMPLE_PROFILE, SAMPLE_CONTACTS)).not.toBe(packInputHash({ ...SAMPLE_PROFILE, backups: 'no' }, SAMPLE_CONTACTS))
  })
})

describe('runPackJob validates the model output', () => {
  const job = packJobs(SAMPLE_PROFILE, SAMPLE_CONTACTS).find((j) => j.key === 'en:ransomware')!
  const item = (over: object = {}) => ({
    question: 'Should I unplug the computer from the network?',
    alt_phrasings: ['unplug internet', 'disconnect wifi'],
    answer: 'Yes. Unplug the network cable and turn off Wi-Fi — leave it powered on!',
    step_ref: 'disconnect-network',
    contact_role: 'none',
    ...over,
  })

  it('keeps good items, copies the source from the plan step, cleans dashes and "!"', async () => {
    const { chunk } = await runPackJob(job, fake({ qa: [item({ contact_role: 'it_vendor' })] }), () => 1)
    if (chunk.kind !== 'plan') throw new Error('expected plan chunk')
    const q = chunk.qa[0]
    const step = job.kind === 'plan' ? job.plan.steps.find((s) => s.id === 'disconnect-network')! : null
    expect(q.source_url).toBe(step!.source_url)
    expect(q.answer).not.toMatch(/[—–!]/)
    expect(q.contact_role).toBe('it_vendor')
    expect(chunk.generated_at).toBe(1)
  })
  it('drops items pointing at unknown steps and unsafe advice', async () => {
    const r = await runPackJob(job, fake({ qa: [item(), item({ step_ref: 'made-up' }), item({ answer: 'You can pay the ransom to get files back.' })] }))
    expect(r.dropped).toBe(2)
    expect(r.chunk.kind === 'plan' && r.chunk.qa.length).toBe(1)
  })
  it('rejects answers that did not come from the cloud', async () => {
    await expect(runPackJob(job, fake({ qa: [item()] }, 'on_device'))).rejects.toThrow(/cloud/)
    const noSource: Generate = async () => ({ text: JSON.stringify({ qa: [item()] }), inferenceSource: undefined, model: 'm' })
    await expect(runPackJob(job, noSource)).rejects.toThrow(/cloud/)
  })
  it('rejects malformed JSON and empty results', async () => {
    await expect(runPackJob(job, fake({ answers: [] }))).rejects.toThrow()
    await expect(runPackJob(job, fake({ qa: [item({ step_ref: 'nope' })] }))).rejects.toThrow(/no usable/)
  })
})

describe('runPackJob keeps what is valid (Session 6b)', () => {
  const job = packJobs(SAMPLE_PROFILE, SAMPLE_CONTACTS).find((j) => j.key === 'en:ransomware')!
  const step = (job as { plan: { steps: { id: string }[] } }).plan.steps[0].id
  const good = (n: number) => ({ question: `Question ${n}?`, alt_phrasings: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], answer: 'Call your IT contact.', step_ref: step, contact_role: 'it_vendor' })
  it('fewer items than asked: kept, marked low, not failed', async () => {
    const r = await runPackJob(job, fake({ qa: [good(1), good(2), good(3)] }))
    expect(r.chunk.kind === 'plan' && r.chunk.qa.length).toBe(3)
    expect(r.low).toBe(true)
  })
  it('one malformed item is dropped, the rest kept', async () => {
    const r = await runPackJob(job, fake({ qa: [good(1), { question: '', answer: 5 }, good(2)] }))
    expect(r.chunk.kind === 'plan' && r.chunk.qa.length).toBe(2)
    expect(r.dropped).toBe(1)
  })
  it('extra alt phrasings are cut to 6, not rejected', async () => {
    const r = await runPackJob(job, fake({ qa: [good(1)] }))
    expect(r.chunk.kind === 'plan' && r.chunk.qa[0].alt_phrasings.length).toBe(6)
  })
  it('more than 60 items: first 60 kept', async () => {
    const r = await runPackJob(job, fake({ qa: Array.from({ length: 70 }, (_, i) => good(i)) }))
    expect(r.chunk.kind === 'plan' && r.chunk.qa.length).toBe(60)
    expect(r.low).toBe(false)
  })
})

describe('guard', () => {
  it.each(['Pay the ransom quickly.', 'Wipe the computer and start over.', 'Payez la rançon.', 'Reply to the scammer to ask for time.'])('unsafe: %s', (s) =>
    expect(isUnsafeAdvice(s)).toBe(true),
  )
  it.each(['Do not pay the ransom before you get advice.', 'Never wipe the computer.', 'Ne contactez jamais les attaquants.', 'Unplug the network cable.'])('ok: %s', (s) =>
    expect(isUnsafeAdvice(s)).toBe(false),
  )
  it('plainText', () => expect(plainText('Call now — today!')).toBe('Call now, today.'))
})

describe('storage: chunks saved one by one, version goes up', () => {
  beforeEach(async () => {
    await db.kv.clear()
  })
  it('begin → save chunk → reload; rebuild bumps the version and keeps old chunks', async () => {
    await beginBuild('h1', 10)
    await saveChunk('en:bec', { kind: 'glossary', lang: 'en', generated_at: 11, model: 'm', terms: [{ term: 'backup', plain: 'A copy.' }] }, 11)
    let p = await loadPack()
    expect(p?.version).toBe(1)
    expect(p?.updated_at).toBe(11)
    expect(Object.keys(p!.chunks)).toEqual(['en:bec'])
    await beginBuild('h2', 20)
    p = await loadPack()
    expect(p?.version).toBe(2)
    expect(p?.input_hash).toBe('h2')
    expect(Object.keys(p!.chunks)).toEqual(['en:bec'])
  })
})

// ---------- Matching quality on a hand-written fixture (fake, not AI output) ----------

const SRC = { source_name: 'CISA', source_url: 'https://www.cisa.gov/stopransomware/ransomware-guide' }
const qa = (id: string, question: string, alt: string[], answer: string, step_ref: string): PackQa => ({ id, question, alt_phrasings: alt, answer, step_ref, contact_role: null, ...SRC })

const EN_R = [
  qa('r1', 'Should I unplug the computer from the network?', ['disconnect from internet', 'unplug wifi', 'cut the network'], 'Yes. Unplug the network cable and turn off Wi-Fi. Leave it powered on.', 'disconnect-network'),
  qa('r2', 'Should I turn the computer off?', ['shut down pc', 'power off', 'switch off computer'], 'No. Leave it on so your IT contact can keep evidence. Only disconnect it from the network.', 'disconnect-network'),
  qa('r3', 'Should we pay the ransom?', ['pay them', 'send bitcoin', 'pay to unlock files'], 'Do not pay before you talk to your IT contact, insurer and the FBI.', 'do-not-contact-attackers'),
  qa('r4', 'Are my backups safe?', ['backup drive', 'protect backups', 'usb backup'], 'Unplug any backup drive now and do not connect it to the infected computer.', 'protect-backups'),
  qa('r5', 'Who do I report ransomware to?', ['report to fbi', 'where to report', 'ic3 report'], 'Report it to the FBI at ic3.gov. Your IT contact can help.', 'report-ic3'),
  qa('r6', 'What should I tell my staff?', ['tell employees', 'warn the team', 'staff message'], 'Tell staff not to use any computer until IT says it is safe.', 'tell-staff'),
  qa('r7', 'Should I take a photo of the ransom note?', ['picture of screen', 'photo of message', 'screenshot ransom'], 'Yes. Take a photo with your phone. Do not click anything on the screen.', 'photo-ransom-note'),
  qa('r8', 'Do I need to call my insurance?', ['cyber insurance', 'insurer claim', 'call insurance company'], 'Yes. Call your insurer early. Many policies need you to call before you hire help.', 'call-insurer'),
]
const EN_B = [
  qa('b1', 'I paid a fake invoice, what now?', ['wrong account payment', 'sent money to scammer', 'paid fraud invoice'], 'Call your bank fraud line now and ask them to recall the wire.', 'call-bank-now'),
  qa('b2', 'Should I reply to the email asking for payment?', ['answer the email', 'respond to supplier email', 'reply to sender'], 'No. Do not reply. Call the supplier on a number you already know.', 'do-not-reply'),
  qa('b3', 'The supplier changed their bank details, is that real?', ['new bank account details', 'change of iban', 'updated payment details'], 'Call the supplier on a number you already have, not one in the email.', 'verify-sender'),
  qa('b4', 'Someone may be reading our email, what do I do?', ['email hacked', 'mailbox compromised', 'change email password'], 'Change the email password and turn on two-step verification.', 'secure-email'),
]
const FR_R = [
  qa('fr1', 'Dois-je débrancher l’ordinateur du réseau ?', ['couper internet', 'débrancher le wifi', 'déconnecter le réseau'], 'Oui. Débranchez le câble réseau et coupez le Wi-Fi. Laissez-le allumé.', 'disconnect-network'),
  qa('fr2', 'Faut-il éteindre l’ordinateur ?', ['éteindre le pc', 'arrêter l’ordinateur'], 'Non. Laissez-le allumé et déconnectez-le seulement du réseau.', 'disconnect-network'),
  qa('fr3', 'Faut-il payer la rançon ?', ['payer les pirates', 'envoyer des bitcoins'], 'Ne payez pas avant d’avoir parlé à votre contact informatique et à votre assureur.', 'do-not-contact-attackers'),
  qa('fr4', 'Mes sauvegardes sont-elles en sécurité ?', ['disque de sauvegarde', 'protéger les sauvegardes'], 'Débranchez tout disque de sauvegarde maintenant.', 'protect-backups'),
  qa('fr5', 'À qui signaler l’attaque ?', ['porter plainte', 'signaler un rançongiciel', 'cybermalveillance'], 'En France, cybermalveillance.gouv.fr. Au Canada, le Centre canadien pour la cybersécurité.', 'report-outside-us'),
]

const fixture: Pack = PackSchema.parse({
  schema: 1,
  version: 1,
  created_at: 0,
  updated_at: 0,
  input_hash: 'x',
  chunks: {
    'en:ransomware': { kind: 'plan', plan_id: 'ransomware', plan_version: '1.1.0', lang: 'en', generated_at: 0, model: 'fixture', qa: EN_R },
    'en:bec': { kind: 'plan', plan_id: 'bec', plan_version: '1.0.0', lang: 'en', generated_at: 0, model: 'fixture', qa: EN_B },
    'fr:ransomware': { kind: 'plan', plan_id: 'ransomware', plan_version: '1.1.0', lang: 'fr', generated_at: 0, model: 'fixture', qa: FR_R },
  },
})

describe('matchPack (MiniSearch, no model)', () => {
  const en = buildIndex(fixture, 'en')
  const fr = buildIndex(fixture, 'fr')

  // 20 questions written differently from the fixture (S3-style: top-1 ≥ 16/20).
  const CASES: [typeof en, string, string][] = [
    [en, 'can I unplug the network cable', 'r1'],
    [en, 'should i shut down the computer', 'r2'],
    [en, 'do we pay the ransom', 'r3'],
    [en, 'pay bitcoin to unlock', 'r3'],
    [en, 'is my backup drive ok', 'r4'],
    [en, 'where do I report this', 'r5'],
    [en, 'what do I tell employees', 'r6'],
    [en, 'take a picture of the screen?', 'r7'],
    [en, 'call insurance company', 'r8'],
    [en, 'we paid a fake invoice', 'b1'],
    [en, 'sent money to the wrong account', 'b1'],
    [en, 'do I reply to that email', 'b2'],
    [en, 'supplier new bank details', 'b3'],
    [en, 'our email was hacked', 'b4'],
    [fr, 'débrancher le réseau', 'fr1'],
    [fr, 'je dois éteindre le pc ?', 'fr2'],
    [fr, 'faut il payer la rancon', 'fr3'],
    [fr, 'mes sauvegardes', 'fr4'],
    [fr, 'où signaler', 'fr5'],
    [fr, 'disque de sauvegarde', 'fr4'],
  ]

  it('top-1 is right for at least 16 of 20', () => {
    const misses = CASES.filter(([ix, q, want]) => matchPack(ix, q).top[0]?.id !== want).map(([, q]) => q)
    expect(misses.length, `misses: ${misses.join(' | ')}`).toBeLessThanOrEqual(4)
  })

  it('a clear question is confident and returns one answer', () => {
    const m = matchPack(en, 'Should we pay the ransom?')
    expect(m.confident).toBe(true)
    expect(m.top).toHaveLength(1)
    expect(m.top[0].id).toBe('r3')
  })

  it('an unrelated question is not confident: up to 3 closest', () => {
    const m = matchPack(en, 'the printer makes a strange noise and paper jams')
    expect(m.confident).toBe(false)
    expect(m.top.length).toBeLessThanOrEqual(3)
  })

  it('empty or stop-word-only question → nothing', () => {
    expect(matchPack(en, 'what is the')).toEqual({ confident: false, top: [] })
  })

  it('can be limited to one plan', () => {
    const m = matchPack(en, 'call', { planId: 'bec' })
    for (const h of m.top) expect(h.plan_id).toBe('bec')
  })

  it('counts answers per language', () => {
    expect(countAnswers(fixture, 'en')).toBe(12)
    expect(countAnswers(fixture, 'fr')).toBe(5)
    expect(countAnswers(null, 'en')).toBe(0)
  })
})

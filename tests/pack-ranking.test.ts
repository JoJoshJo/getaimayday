/**
 * Session 7 · 1: Pack search ranking without a plan (the #/pack search box).
 * Live bug: "should we pay the ransom" (Wi-Fi off) returned the lost-device
 * answer "Should I pay a ransom if someone contacts me about the lost device?".
 * Fix: boost answers from the plan the incident keywords point to.
 */
import { describe, expect, it } from 'vitest'
import { buildIndex, matchPack } from '../src/pack/match'
import { RANKING_CASES, rankingPack } from './fixtures/pack-ranking'

const ix = { en: buildIndex(rankingPack, 'en'), fr: buildIndex(rankingPack, 'fr') }
const misses = () => RANKING_CASES.filter(([l, q, plan]) => matchPack(ix[l], q).top[0]?.plan_id !== plan).map(([l, q, plan]) => `${l}: "${q}" → got ${matchPack(ix[l], q).top[0]?.plan_id}, want ${plan}`)

describe('Pack search ranking (no plan context)', () => {
  it('the live bug: "should we pay the ransom" → a ransomware answer', () => {
    const m = matchPack(ix.en, 'should we pay the ransom')
    expect(m.top[0].plan_id).toBe('ransomware')
    expect(m.top[0].id).toBe('en-r1')
  })
  it('top-1 plan is right for at least 19 of 20 realistic questions (EN + FR)', () => {
    const m = misses()
    console.info(`[ranking] top-1 plan accuracy: ${RANKING_CASES.length - m.length}/${RANKING_CASES.length}`, m)
    expect(m.length, m.join('\n')).toBeLessThanOrEqual(1)
  })
  it('plan-scoped search is unchanged: limited to that plan, no boost across plans', () => {
    const m = matchPack(ix.en, 'should I pay a ransom', { planId: 'lost-device' })
    expect(m.top.every((h) => h.plan_id === 'lost-device')).toBe(true)
  })
  it('a question with no incident words still searches every plan', () => {
    expect(matchPack(ix.en, 'are our backups safe').top[0].id).toBe('en-r3')
  })
})

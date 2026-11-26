/**
 * Keyword match for "Something's wrong" when on-device AI is not available.
 * Plain string matching (EN + FR), no model. Honest by design: it only picks an
 * incident when one clearly wins; a tie or no hit → null → the user picks a tile.
 */
import type { Incident } from '../../plans/schema'

/** [term, weight]. Lowercase, accents removed. Whole words/phrases; a trailing * = word stem ("chiffr*" → chiffré, chiffrement). */
const TERMS: Record<Incident, [string, number][]> = {
  ransomware: [
    ['ransom*', 3], ['encrypt*', 3], ['decrypt*', 3], ['bitcoin*', 2], ['btc', 2], ['monero', 2], ['locked', 1], ['extension*', 1],
    ['rancon*', 3], ['chiffr*', 3], ['dechiffr*', 3], ['crypte*', 2], ['verrouill*', 1],
  ],
  bec: [
    ['invoice*', 3], ['bank details', 3], ['iban', 3], ['wire', 2], ['supplier*', 2], ['vendor*', 1], ['payment*', 1], ['new account', 2],
    ['facture*', 3], ['coordonnees bancaires', 3], ['rib', 3], ['virement*', 2], ['fournisseur*', 2], ['paiement*', 1], ['nouveau compte', 2],
  ],
  phishing: [
    ['phishing', 3], ['password*', 2], ['clicked', 2], ['link*', 1], ['login', 1], ['hacked', 2], ['tech support', 3], ['support call', 3], ['fake', 1],
    ['hameconnage', 3], ['mot de passe', 2], ['clique*', 2], ['lien*', 1], ['pirat*', 2], ['faux support', 3],
  ],
  'lost-device': [
    ['lost', 2], ['stolen', 2], ['stole', 2], ['laptop*', 1], ['phone*', 1], ['usb', 1], ['missing', 2],
    ['perdu*', 2], ['vole*', 2], ['portable*', 1], ['telephone*', 1], ['cle usb', 2],
  ],
  outage: [
    ['outage*', 3], ['down', 2], ['no internet', 3], ['internet', 1], ['power', 2], ['router*', 2], ['wifi', 1], ['not working', 1],
    ['panne*', 3], ['coupure*', 3], ['electricite', 2], ['routeur*', 2], ['ne marche plus', 1],
  ],
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export type KeywordMatch = { incident: Incident; score: number } | null

export function keywordMatch(text: string, available?: Set<Incident>): KeywordMatch {
  const hay = ` ${norm(text)} `
  if (hay.trim() === '') return null
  const scores = (Object.keys(TERMS) as Incident[])
    .filter((i) => !available || available.has(i))
    .map((incident) => ({ incident, score: TERMS[incident].reduce((n, [term, w]) => (hay.includes(term.endsWith('*') ? ` ${term.slice(0, -1)}` : ` ${term} `) ? n + w : n), 0) }))
    .sort((a, b) => b.score - a.score)
  const [top, second] = scores
  if (!top || top.score === 0 || (second && second.score === top.score)) return null
  return top
}

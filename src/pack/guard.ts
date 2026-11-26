/**
 * Safety net for AI-written Pack text (the prompt already forbids this).
 * Drops any answer that tells the user to pay, wipe/reinstall, or contact the
 * attacker, unless the sentence is a "do not" sentence.
 */
const UNSAFE = /\b(pay (the )?ransom|paying (the )?ransom|payez la rançon|payer la rançon|wipe|reinstall|réinstalle[rz]?|formate[rz]|contact (the )?(attackers?|scammers?|hackers?)|reply to (the )?(attackers?|scammers?)|contacte[rz] (les? )?(attaquants?|escrocs?|pirates?)|répondez (à|aux) (l'|les? )?(attaquants?|escrocs?))\b/i
const NEGATED = /\b(do not|don't|never|avoid|not|ne |n'|jamais|évitez|sans)\b/i

export function isUnsafeAdvice(text: string): boolean {
  return text
    .split(/(?<=[.!?])\s+/)
    .some((sentence) => UNSAFE.test(sentence) && !NEGATED.test(sentence))
}

/** House style: no em/en dashes as punctuation, no "!" (DESIGN.md §7). */
export function plainText(s: string): string {
  return s
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s*!+/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

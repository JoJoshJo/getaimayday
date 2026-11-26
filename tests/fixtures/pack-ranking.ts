/**
 * Session 7 ranking fixture: a 5-plan Pack in EN + FR, hand-written in the style
 * of the live Gemini Pack, WITH the cross-plan look-alikes that caused the live
 * bug (a lost-device answer that mentions a ransom, a phishing answer that
 * mentions an invoice, an outage answer that mentions ransomware...).
 * Test data only: never shipped, never shown as AI output.
 */
import { PackSchema, type Pack, type PackQa } from '../../src/pack/schema'

const qa = (id: string, question: string, alt: string[], answer: string): PackQa => ({
  id, question, alt_phrasings: alt, answer, step_ref: 's', contact_role: null, source_name: 'CISA', source_url: 'https://www.cisa.gov/',
})
const chunk = (lang: 'en' | 'fr', plan_id: string, items: PackQa[]) => ({ kind: 'plan' as const, plan_id, plan_version: '1.0.0', lang, generated_at: 0, model: 'fixture', qa: items })

const EN = {
  ransomware: [
    qa('en-r1', 'Is paying the attackers a good idea to get the files back?', ['pay the hackers', 'send bitcoin to the criminals', 'pay to unlock the files'], 'Do not pay before you talk to your IT contact, your insurer and the FBI. Paying does not guarantee your files come back.'),
    qa('en-r5', 'What should I write down about the ransom note?', ['ransom note details', 'ransom message'], 'Take a photo of the ransom note and write down the time, the amount and any contact address.'),
    qa('en-r6', 'Should I contact the attackers about the ransom?', ['talk to the hackers', 'reply to ransom note'], 'No. Do not contact them. Leave that to your IT contact and the FBI.'),
    qa('en-r7', 'Does our insurance cover a ransom attack?', ['cyber insurance ransom', 'insurer and ransomware'], 'Call your insurer early. Many policies need you to call before you act.'),
    qa('en-r8', 'The ransom note has a countdown, what do we do?', ['deadline on ransom screen', 'timer ransom'], 'Stay calm. The deadline is meant to rush you. Follow the plan steps.'),
    qa('en-r2', 'Should I unplug the infected computer?', ['disconnect network', 'pull the cable'], 'Yes. Unplug the network cable and turn off Wi-Fi. Leave it on.'),
    qa('en-r3', 'Are our backups safe?', ['backup drive', 'usb backup'], 'Unplug any backup drive now so it does not get encrypted too.'),
    qa('en-r4', 'Who do I report the attack to?', ['report to police', 'report to FBI'], 'Report it to the FBI at ic3.gov and to CISA.'),
  ],
  'lost-device': [
    qa('en-l1', 'Should I pay a ransom if someone contacts me about the lost device?', ['pay ransom for laptop', 'should we pay', 'pay to get it back'], 'No. Do not pay. Report the theft to the police and your IT contact.'),
    qa('en-l2', 'The office laptop was stolen, what do I do first?', ['laptop stolen', 'computer taken'], 'Change the passwords used on it from another device, then call your IT contact.'),
    qa('en-l3', 'Can we wipe the lost phone remotely?', ['erase the phone', 'remote lock'], 'Ask your IT contact to lock it from your device management or account page.'),
    qa('en-l4', 'Was patient data on the lost device?', ['customer data on laptop'], 'Write down what was on it and call your lawyer or insurer.'),
  ],
  bec: [
    qa('en-b1', 'We paid a fake invoice, what now?', ['wrong bank account', 'sent money to scammer'], 'Call your bank fraud line now and ask for a recall of the payment.'),
    qa('en-b2', 'The supplier sent new bank details by email, is it real?', ['changed iban', 'new account number'], 'Call the supplier on a number you already have, not the one in the email.'),
    qa('en-b3', 'Should I reply to the email asking for payment?', ['answer the email'], 'No. Do not reply. Check by phone.'),
  ],
  phishing: [
    qa('en-p1', 'I clicked a link in an email and typed my password, what now?', ['entered my password', 'fake login page'], 'Change that password now from a clean device and turn on two-step verification.'),
    qa('en-p2', 'Someone called saying they are tech support and want access, what do I do?', ['fake support call'], 'Hang up. Do not give access. Call your IT contact.'),
    qa('en-p3', 'A fake invoice email had a link, did I get hacked?', ['clicked invoice link'], 'If you typed a password, change it. Tell your IT contact.'),
  ],
  outage: [
    qa('en-o1', 'The internet is down in the whole office, what do we do?', ['no internet', 'network down'], 'Check the router lights, restart it, then call your internet provider.'),
    qa('en-o2', 'The power is out, how do we keep working?', ['power cut', 'no electricity'], 'Unplug computers, use paper forms and phones, and tell staff the plan.'),
    qa('en-o3', 'Could the outage be ransomware?', ['is it an attack', 'files strange'], 'If files have strange names or a ransom note appears, follow the ransomware plan.'),
  ],
}
const FR = {
  ransomware: [
    qa('fr-r1', 'Faut-il payer la rançon pour récupérer nos fichiers ?', ['payer les pirates', 'envoyer des bitcoins'], 'Ne payez pas avant d’avoir parlé à votre contact informatique et à votre assureur.'),
    qa('fr-r2', 'Dois-je débrancher l’ordinateur infecté ?', ['couper le réseau'], 'Oui. Débranchez le câble réseau et coupez le Wi-Fi. Laissez-le allumé.'),
    qa('fr-r3', 'Nos sauvegardes sont-elles en sécurité ?', ['disque de sauvegarde'], 'Débranchez tout disque de sauvegarde maintenant.'),
  ],
  'lost-device': [
    qa('fr-l1', 'Dois-je payer une rançon si quelqu’un me contacte pour l’appareil perdu ?', ['payer pour récupérer le portable'], 'Non. Ne payez pas. Signalez le vol à la police.'),
    qa('fr-l2', 'Le portable du bureau a été volé, que faire en premier ?', ['ordinateur volé'], 'Changez les mots de passe depuis un autre appareil, puis appelez votre contact informatique.'),
  ],
  bec: [
    qa('fr-b1', 'Nous avons payé une fausse facture, que faire ?', ['mauvais compte bancaire'], 'Appelez tout de suite la ligne fraude de votre banque.'),
    qa('fr-b2', 'Le fournisseur a envoyé un nouveau RIB par e-mail, est-ce vrai ?', ['changement de coordonnées bancaires'], 'Appelez le fournisseur sur un numéro que vous connaissez déjà.'),
  ],
  phishing: [
    qa('fr-p1', 'J’ai cliqué sur un lien et tapé mon mot de passe, que faire ?', ['faux site de connexion'], 'Changez ce mot de passe depuis un appareil sain et activez la vérification en deux étapes.'),
    qa('fr-p2', 'Une fausse facture contenait un lien, suis-je piraté ?', ['lien dans une facture'], 'Si vous avez tapé un mot de passe, changez-le.'),
  ],
  outage: [
    qa('fr-o1', 'Internet ne marche plus dans tout le bureau, que faire ?', ['plus d’internet', 'réseau en panne'], 'Vérifiez les voyants de la box, redémarrez-la, puis appelez votre fournisseur.'),
    qa('fr-o2', 'Il y a une coupure de courant, comment continuer ?', ['plus d’électricité'], 'Débranchez les ordinateurs et passez au papier.'),
  ],
}

export const rankingPack: Pack = PackSchema.parse({
  schema: 1, version: 1, created_at: 0, updated_at: 0, input_hash: 'x',
  chunks: Object.fromEntries([
    ...Object.entries(EN).map(([p, items]) => [`en:${p}`, chunk('en', p, items)]),
    ...Object.entries(FR).map(([p, items]) => [`fr:${p}`, chunk('fr', p, items)]),
  ]),
})

/** 20 realistic questions, worded differently from the fixture, with the plan that should win. */
export const RANKING_CASES: ['en' | 'fr', string, string][] = [
  ['en', 'should we pay the ransom', 'ransomware'],
  ['en', 'do we pay them in bitcoin to unlock the files', 'ransomware'],
  ['en', 'our files are encrypted, should I unplug the computer', 'ransomware'],
  ['en', 'is the backup drive safe from the ransomware', 'ransomware'],
  ['en', 'my laptop was stolen from the car', 'lost-device'],
  ['en', 'lost my work phone, can we erase it', 'lost-device'],
  ['en', 'we paid an invoice to new bank details that were fake', 'bec'],
  ['en', 'supplier changed bank details by email', 'bec'],
  ['en', 'I clicked a link and entered my password', 'phishing'],
  ['en', 'someone on the phone says tech support wants my password', 'phishing'],
  ['en', 'the internet is down', 'outage'],
  ['en', 'power is out at the office', 'outage'],
  ['fr', 'faut il payer la rançon', 'ransomware'],
  ['fr', 'nos fichiers sont chiffrés, je débranche ?', 'ransomware'],
  ['fr', 'mon portable a été volé', 'lost-device'],
  ['fr', 'facture payée sur un faux rib', 'bec'],
  ['fr', 'le fournisseur a changé ses coordonnées bancaires', 'bec'],
  ['fr', 'j’ai cliqué sur un lien et donné mon mot de passe', 'phishing'],
  ['fr', 'panne internet au bureau', 'outage'],
  ['fr', 'coupure de courant', 'outage'],
]

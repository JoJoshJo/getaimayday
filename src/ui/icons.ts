/**
 * One line icon per incident, per IT fix-it and per answer source (DESIGN.md §6 Icons).
 * lucide-react, stroke 1.75, always aria-hidden next to words. No icon containers, no sparkles.
 */
import { BookOpen, Cloud, KeyRound, Laptop, ListChecks, Lock, Mail, MailWarning, Monitor, Printer, Receipt, Smartphone, Wifi, WifiOff, Zap, type LucideIcon } from 'lucide-react'
import type { Source } from '../ai/router'
import type { Incident } from '../plans/incidents'

export const INCIDENT_ICON: Record<Incident, LucideIcon> = {
  ransomware: Lock,
  bec: Receipt,
  phishing: MailWarning,
  'lost-device': Smartphone,
  outage: WifiOff,
}

export const FIXIT_ICON: Record<string, LucideIcon> = {
  wifi: Wifi,
  'email-send': Mail,
  'frozen-pc': Monitor,
  printer: Printer,
  'locked-account': KeyRound,
  power: Zap,
}

export const SOURCE_ICON: Record<Source, LucideIcon> = { 'on-device': Laptop, cloud: Cloud, pack: BookOpen, checklist: ListChecks }

export const ICON_STROKE = 1.75

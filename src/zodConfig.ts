/**
 * Imported first in main.tsx. zod 4 probes `new Function` once to enable its
 * JIT; under our CSP (no 'unsafe-eval') that probe is caught by zod but still
 * reported as a CSP violation. jitless skips the probe; schemas are small.
 */
import { z } from 'zod'

z.config({ jitless: true })

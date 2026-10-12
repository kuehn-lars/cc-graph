// F04-R2 / NFR-S6: the offsets in `src` where `$.session.usage` is asked for `breakdown: 'full'`. Pure, so check-calls.mjs and a test share it.
export const fullBreakdowns = src => [...src.matchAll(/breakdown\s*:\s*['"`]full['"`]/g)].map(m => m.index)

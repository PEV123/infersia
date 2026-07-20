import pricing from '../data/pricing.json'
import modelsRaw from '../data/models.json'

export type Tier = {
  id: string
  name: string
  hardware: string
  price: number
  setup: number
  gpus: number
  vramGb: number | null
  from: boolean
  poa?: boolean
  minTermMonths?: number
  madeToOrder?: boolean
  secondary?: boolean
}

export type ApiModel = { id: string; name: string; in: number; out: number; default?: boolean }

export type QuoteModel = {
  id: string
  name: string
  developer: string
  logo?: string
  paramsTotal: string
  paramsActive: string
  licence: string
  context: string
  vramGb: number | null
  gpus: number
  tierId: string
  priceLine: string
  badge: 'available' | 'limited' | 'enquire' | 'weights-pending'
  quotable: boolean
  conditionalNote?: string
  strengths: string[]
  tags: string[]
  caps: string[]
}

export const TIERS = pricing.tiers as Tier[]
export const API_MODELS = pricing.apiModels as ApiModel[]
export const MODELS = modelsRaw as QuoteModel[]
export const VERIFIED_DATE = pricing.verifiedDate
export const FX_USD_PER_AUD = pricing.fxUsdPerAud
export const DAYS_PER_MONTH = pricing.daysPerMonth
export const DEFAULT_INPUT_SHARE = pricing.defaultInputShare

export const TERM_DISCOUNT: Record<number, number> = { 12: 0, 24: 0.05, 36: 0.1 }

export const PRICE_OVERRIDES = (pricing as { priceOverrides?: Record<string, number> }).priceOverrides ?? {}

export const tierById = (id: string): Tier => TIERS.find((t) => t.id === id)!
export const apiById = (id: string): ApiModel => API_MODELS.find((a) => a.id === id) ?? API_MODELS[0]
export const modelById = (id: string | null): QuoteModel | null => MODELS.find((m) => m.id === id) ?? null

// The monthly price to quote for a model: a per-model override wins over the
// tier's list price (e.g. DeepSeek V4 Pro's lighter footprint on the frontier node).
export const effectiveMonthly = (model: QuoteModel, tier: Tier): number =>
  PRICE_OVERRIDES[model.id] ?? tier.price

export type QuoteResult = {
  monthlyTokens: number
  inTokens: number
  outTokens: number
  apiInMonthlyAud: number
  apiOutMonthlyAud: number
  apiMonthlyAud: number
  apiAnnualAud: number
  infersiaMonthly: number
  infersiaAnnual: number
  annualSaving: number
  savingPct: number
  breakevenTokensPerDay: number
}

export function computeQuote(opts: {
  tokensPerDay: number
  inputShare: number
  term: number
  tier: Tier
  api: ApiModel
  priceMonthly?: number
}): QuoteResult {
  const { tokensPerDay, inputShare, term, tier, api } = opts
  const basePrice = opts.priceMonthly ?? tier.price
  const monthlyTokens = tokensPerDay * DAYS_PER_MONTH
  const inTokens = monthlyTokens * inputShare
  const outTokens = monthlyTokens * (1 - inputShare)
  const fx = 1 / FX_USD_PER_AUD
  const apiInMonthlyAud = ((inTokens * api.in) / 1e6) * fx
  const apiOutMonthlyAud = ((outTokens * api.out) / 1e6) * fx
  const apiMonthlyAud = apiInMonthlyAud + apiOutMonthlyAud
  const apiAnnualAud = apiMonthlyAud * 12
  // Made-to-order "from" floors are flat (the min term is already baked in);
  // term discounts only apply to standard dedicated tiers.
  const discount = tier.madeToOrder ? 0 : TERM_DISCOUNT[term] ?? 0
  const infersiaMonthly = basePrice * (1 - discount)
  const infersiaAnnual = infersiaMonthly * 12 + tier.setup
  const annualSaving = apiAnnualAud - infersiaAnnual
  const savingPct = apiAnnualAud > 0 ? annualSaving / apiAnnualAud : 0

  const blendedUsdPerM = inputShare * api.in + (1 - inputShare) * api.out
  const breakevenTokensPerDay = ((infersiaMonthly * FX_USD_PER_AUD) / blendedUsdPerM) * 1e6 / DAYS_PER_MONTH

  return {
    monthlyTokens,
    inTokens,
    outTokens,
    apiInMonthlyAud,
    apiOutMonthlyAud,
    apiMonthlyAud,
    apiAnnualAud,
    infersiaMonthly,
    infersiaAnnual,
    annualSaving,
    savingPct,
    breakevenTokensPerDay,
  }
}

// API-only cost at a given volume — used for conditional models where the
// Infersia side can't be priced yet but the comparator's list price can.
export function computeApiCost(opts: { tokensPerDay: number; inputShare: number; api: ApiModel }): {
  apiMonthlyAud: number
  apiAnnualAud: number
} {
  const monthlyTokens = opts.tokensPerDay * DAYS_PER_MONTH
  const fx = 1 / FX_USD_PER_AUD
  const apiMonthlyAud =
    ((monthlyTokens * opts.inputShare * opts.api.in) / 1e6) * fx +
    ((monthlyTokens * (1 - opts.inputShare) * opts.api.out) / 1e6) * fx
  return { apiMonthlyAud, apiAnnualAud: apiMonthlyAud * 12 }
}

// Breakeven for the shared tier against an API — used by the honesty-pivot tip.
export function sharedTierBreakevenPerDay(api: ApiModel, inputShare: number): number {
  const shared = tierById('shared')
  const blendedUsdPerM = inputShare * api.in + (1 - inputShare) * api.out
  return ((shared.price * FX_USD_PER_AUD) / blendedUsdPerM) * 1e6 / DAYS_PER_MONTH
}

export const aud = (n: number): string =>
  'AU$' + Math.round(n).toLocaleString('en-AU')

export const audShort = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return 'AU$' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  return aud(n)
}

export const fmtTokens = (n: number): string => {
  if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1) + 'B'
  if (n >= 1e6) {
    const m = n / 1e6
    return (m >= 10 ? Math.round(m).toString() : m.toFixed(1).replace(/\.0$/, '')) + 'M'
  }
  return Math.round(n / 1e3) + 'K'
}

export const USAGE_PRESETS = [
  { id: 'light', label: 'Light', tokens: 1_000_000, blurb: "A small team's assistant" },
  { id: 'moderate', label: 'Moderate', tokens: 5_000_000, blurb: 'Production workflows, document processing' },
  { id: 'heavy', label: 'Heavy', tokens: 20_000_000, blurb: 'Core business automation, agents' },
  { id: 'intensive', label: 'Intensive', tokens: 50_000_000, blurb: 'AI-native product / high-volume pipeline' },
] as const

export const SLIDER_MIN = 500_000
export const SLIDER_MAX = 100_000_000

export const sliderToTokens = (t: number): number => {
  const v = Math.exp(Math.log(SLIDER_MIN) + (Math.log(SLIDER_MAX) - Math.log(SLIDER_MIN)) * t)
  // snap to a tidy grid so the number reads cleanly
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.round(v / (mag / 10)) * (mag / 10)
}

export const tokensToSlider = (tokens: number): number =>
  (Math.log(tokens) - Math.log(SLIDER_MIN)) / (Math.log(SLIDER_MAX) - Math.log(SLIDER_MIN))

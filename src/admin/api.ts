export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'quoted' | 'won' | 'lost'

export type Booking = {
  id: string
  ts: string
  leadId: string | null
  name: string
  email: string
  org: string
  phone: string
  note: string
  start: string
  end: string
  durationMin: number
  status: 'confirmed' | 'cancelled' | 'completed'
}

export type Lead = {
  id: string
  ts: string
  updatedAt: string
  name: string
  org: string
  email: string
  phone: string
  source: 'quote' | 'booking' | 'manual'
  status: LeadStatus
  context: Record<string, unknown>
  notes: { ts: string; text: string }[]
  bookings?: Booking[]
}

export type AvailBlock = {
  id: string
  ts: string
  start: string
  end: string
  reason: string
}

export type CalSettings = {
  timezone: string
  slotMinutes: number
  bufferMinutes: number
  leadTimeHours: number
  horizonDays: number
  week: Record<string, string[]>
  blackouts: string[]
}

export type Summary = {
  ok: boolean
  totals: {
    pageViews: number
    sessions: number
    quotesViewed: number
    leads: number
    bookings: number
    avgSavingViewed: number | null
  }
  models: [string, number][]
  comparators: [string, number][]
  usage: [string, number][]
  terms: [string, number][]
  recentEvents: { ts: string; sid: string; event: string; props: Record<string, unknown> }[]
}

export class AdminAuthError extends Error {}

export async function adminFetch<T>(key: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': key,
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 401) throw new AdminAuthError('unauthorised')
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return (await res.json()) as T
}

export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost']

export const fmtDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })

export const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })

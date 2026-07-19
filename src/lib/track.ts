// Lightweight first-party analytics: fire-and-forget events to our own API.
// No cookies, no PII — a per-tab session id groups a visit's events.

function sessionId(): string {
  try {
    let sid = sessionStorage.getItem('infersia_sid')
    if (!sid) {
      sid = crypto.randomUUID()
      sessionStorage.setItem('infersia_sid', sid)
    }
    return sid
  } catch {
    return 'anon'
  }
}

export type TrackEvent =
  | 'quote_page_viewed'
  | 'model_selected'
  | 'usage_changed'
  | 'comparator_changed'
  | 'quote_viewed'
  | 'quote_submitted'

export function track(event: TrackEvent, props: Record<string, unknown> = {}): void {
  try {
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, props, sid: sessionId() }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* analytics must never break the page */
  }
}

// Google Calendar sync — OAuth2 (authorization code + refresh token) and
// Calendar REST via plain fetch. Once the owner connects their Google account
// from /admin, every confirmed booking becomes a Calendar event with a Google
// Meet link, and Google emails the invite to the customer (sendUpdates=all).
// Requires env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.

import crypto from 'node:crypto'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const CAL_API = 'https://www.googleapis.com/calendar/v3'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send'
const SCOPES = `https://www.googleapis.com/auth/calendar.events ${GMAIL_SCOPE} openid email`

export function createGoogle({ loadDoc, saveDoc, site }) {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const redirectUri = `${site}/api/google/callback`

  let cfg = loadDoc('google', null) // { refreshToken, email, connectedAt }
  const pendingStates = new Map()
  let accessToken = null
  let accessExpiry = 0

  const configured = () => Boolean(clientId && clientSecret)
  const connected = () => Boolean(cfg && cfg.refreshToken)

  function authUrl() {
    const state = crypto.randomBytes(16).toString('hex')
    pendingStates.set(state, Date.now())
    for (const [s, t] of pendingStates) if (Date.now() - t > 15 * 60_000) pendingStates.delete(s)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `${AUTH_URL}?${params}`
  }

  async function handleCallback(code, state) {
    if (!pendingStates.delete(String(state))) throw new Error('bad state')
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const json = await res.json()
    if (!res.ok || !json.refresh_token) throw new Error('token exchange failed: ' + JSON.stringify(json).slice(0, 200))
    let email = null
    try {
      const payload = JSON.parse(Buffer.from(String(json.id_token).split('.')[1], 'base64url').toString())
      email = payload.email || null
    } catch {
      /* email is cosmetic */
    }
    cfg = {
      refreshToken: json.refresh_token,
      email,
      scopes: String(json.scope || ''),
      connectedAt: new Date().toISOString(),
    }
    saveDoc('google', cfg)
    accessToken = json.access_token || null
    accessExpiry = Date.now() + (json.expires_in || 3000) * 1000
  }

  async function token() {
    if (accessToken && Date.now() < accessExpiry - 60_000) return accessToken
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: cfg.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error('token refresh failed')
    accessToken = json.access_token
    accessExpiry = Date.now() + (json.expires_in || 3000) * 1000
    return accessToken
  }

  async function createEvent(booking) {
    if (!configured() || !connected()) return null
    try {
      const t = await token()
      const body = {
        summary: `Infersia call — ${booking.name}${booking.org ? ` (${booking.org})` : ''}`,
        description: [
          booking.phone ? `Phone: ${booking.phone}` : null,
          booking.email ? `Email: ${booking.email}` : null,
          booking.note ? `Note: ${booking.note}` : null,
          'Booked via infersia.com.au',
        ]
          .filter(Boolean)
          .join('\n'),
        start: { dateTime: booking.start },
        end: { dateTime: booking.end },
        attendees: booking.email ? [{ email: booking.email }] : [],
        conferenceData: {
          createRequest: { requestId: booking.id, conferenceSolutionKey: { type: 'hangoutsMeet' } },
        },
      }
      const res = await fetch(`${CAL_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('gcal create failed:', JSON.stringify(json).slice(0, 300))
        return null
      }
      return { id: json.id, meetLink: json.hangoutLink || '' }
    } catch (err) {
      console.error('gcal create error:', err.message)
      return null
    }
  }

  async function deleteEvent(eventId) {
    if (!configured() || !connected() || !eventId) return
    try {
      const t = await token()
      await fetch(`${CAL_API}/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
        signal: AbortSignal.timeout(8000),
      })
    } catch (err) {
      console.error('gcal delete error:', err.message)
    }
  }

  async function disconnect() {
    if (cfg?.refreshToken) {
      try {
        await fetch(`${REVOKE_URL}?token=${encodeURIComponent(cfg.refreshToken)}`, { method: 'POST' })
      } catch {
        /* revoke is best-effort */
      }
    }
    cfg = null
    accessToken = null
    saveDoc('google', null)
  }

  const canEmail = () => connected() && String(cfg.scopes || '').includes(GMAIL_SCOPE)

  async function sendMail({ to, subject, text }) {
    if (!configured() || !canEmail()) return false
    try {
      const t = await token()
      const raw = [
        `To: ${to}`,
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        text,
      ].join('\r\n')
      const res = await fetch(`${GMAIL_API}/users/me/messages/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url') }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        console.error('gmail send failed:', res.status, (await res.text()).slice(0, 200))
        return false
      }
      return true
    } catch (err) {
      console.error('gmail send error:', err.message)
      return false
    }
  }

  const status = () => ({
    configured: configured(),
    connected: connected(),
    email: cfg?.email ?? null,
    emailNotifications: canEmail(),
  })

  return { authUrl, handleCallback, createEvent, deleteEvent, disconnect, sendMail, status, configured, connected }
}

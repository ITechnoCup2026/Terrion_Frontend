/**
 * The one place this app talks HTTP to the Terrion backend.
 *
 * Every response is `{ data }` on success or `{ errors }` on failure, per
 * the backend's API contract. Two endpoints (blocks/:id/split, stagger) attach a
 * `data` payload of numbers alongside the error code on a 422, so `ApiError`
 * carries both rather than discarding one.
 *
 * Authenticated calls carry the backend's own session id in a `terrion_session`
 * cookie -- there is no bearer token for a human user any more. The backend
 * holds the GoTrue access/refresh pair in Redis under that id, so nothing on
 * this side ever sees a JWT.
 *
 * Server-only: takes `sessionId` as a parameter instead of reading cookies
 * itself, so it has no dependency on next/headers and stays trivially
 * testable. Callers get the id from lib/auth/session.ts.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

/** The backend's session cookie. Written by POST /api/auth/login, mirrored here. */
export const SESSION_COOKIE = 'terrion_session'

/**
 * The status this app gives a failure that never reached the backend at all --
 * DNS, a refused connection, a timeout. `fetch` rejects with a bare
 * `TypeError: fetch failed` there, which carries no status for a caller to
 * branch on, so it is given one that cannot collide with an HTTP code.
 */
export const NETWORK_ERROR = 0

/**
 * How long one attempt may take before it is abandoned.
 *
 * `fetch` bounds how long it will wait to *connect* -- undici gives up after
 * 10s -- but puts no bound at all on a connection that opens and then stalls
 * mid-read. A dropped Wi-Fi link leaves the socket waiting on the OS, which on
 * macOS surfaces as `read ETIMEDOUT` minutes later, and a server render sits on
 * it for the whole time: a page one blip away from fine takes three minutes to
 * admit it could not ask. This caps an attempt just under undici's connect
 * timeout so both failures land here instead.
 */
const ATTEMPT_TIMEOUT_MS = 8_000

/** Breather between the two attempts a GET gets, so a blip has a moment to pass. */
const RETRY_BACKOFF_MS = 250

export class ApiError extends Error {
  status: number
  code: string
  data?: unknown

  constructor(status: number, code: string, data?: unknown, options?: ErrorOptions) {
    super(code, options)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

type ApiRequestInit = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  /** Session id to forward as the `terrion_session` cookie. Omit for public endpoints. */
  sessionId?: string | null
  cache?: RequestCache
}

/**
 * The full exchange: parsed `data` plus the response itself, for the two
 * callers that need a header off it. `POST /api/auth/login` answers with a
 * `Set-Cookie` this app has to re-issue on its own domain, and there is no
 * way to read that through a return value shaped like the body alone.
 */
export async function apiExchange<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<{ data: T; response: Response }> {
  if (!BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_URL belum diatur.')
  }

  const url = new URL(path, BASE_URL)
  if (init.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const method = init.method ?? 'GET'

  // Only a GET is retried. A POST or PATCH that timed out may already have been
  // applied by the backend -- the answer was lost, not the write -- so sending
  // it again would record a second harvest or a second supply request. Those
  // get one attempt and report the failure honestly.
  const attempts = method === 'GET' ? 2 : 1

  let res: Response | undefined
  let lastCause: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(init.sessionId ? { Cookie: `${SESSION_COOKIE}=${init.sessionId}` } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        cache: init.cache ?? 'no-store',
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      })
      break
    } catch (cause) {
      lastCause = cause
      if (attempt < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_MS))
      }
    }
  }

  if (!res) {
    // The backend was never reached, so there is no status and no error code to
    // read. A caller that cannot tell this apart from a 404 will tell a visitor
    // their plot does not exist when the truth is that nothing could be asked.
    throw new ApiError(NETWORK_ERROR, 'network_unreachable', undefined, { cause: lastCause })
  }

  // 204 No Content (auth/refresh, auth/logout, PATCH /api/supply-requests/:id)
  // has no body to parse.
  if (res.status === 204) return { data: undefined as T, response: res }

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const code = typeof json?.errors === 'string' ? json.errors : `http_${res.status}`
    throw new ApiError(res.status, code, json?.data)
  }

  return { data: json.data as T, response: res }
}

export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { data } = await apiExchange<T>(path, init)
  return data
}

/**
 * The session id out of a response's `Set-Cookie`, or null if it carried none.
 *
 * The backend's cookie is scoped to the backend's own domain, which in
 * production is not this one, so it cannot simply be passed along -- the id is
 * lifted out and re-issued under this app's origin by the caller.
 */
export function sessionIdFromResponse(response: Response): string | null {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  const cookies = headers.getSetCookie?.() ?? (headers.get('set-cookie') ? [headers.get('set-cookie')!] : [])

  for (const cookie of cookies) {
    const [pair] = cookie.split(';')
    const separator = pair.indexOf('=')
    if (separator === -1) continue
    if (pair.slice(0, separator).trim() !== SESSION_COOKIE) continue
    const value = pair.slice(separator + 1).trim()
    if (value) return value
  }

  return null
}

/**
 * True only for the one failure that means "this does not exist, or is not
 * yours" -- the contract deliberately merges those two, and nothing else.
 *
 * Everything else -- a 500, a 502 from the platform's edge while the backend
 * is down, an unreachable host -- must not be turned into "not found" by a
 * caller: a visitor told their garden does not exist will stop looking for it.
 */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/**
 * True when the backend could not answer at all: unreachable, or reachable
 * only through a platform error page. Pages whose backend data is a garnish
 * rather than the point can degrade on this instead of failing.
 */
export function isBackendDown(error: unknown): boolean {
  return error instanceof ApiError
    && (error.status === NETWORK_ERROR || error.status >= 500)
}

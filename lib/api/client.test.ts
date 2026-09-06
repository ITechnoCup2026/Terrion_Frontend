import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ApiError, isBackendDown, isNotFound, NETWORK_ERROR, sessionIdFromResponse } from './client'

/**
 * The login exchange hinges on lifting one cookie out of a response whose
 * domain is not this app's. Everything else about apiFetch is a fetch call;
 * this is the part with a decision in it.
 */
describe('sessionIdFromResponse', () => {
  const withCookies = (...cookies: string[]) => {
    const headers = new Headers()
    for (const cookie of cookies) headers.append('set-cookie', cookie)
    return new Response(null, { status: 200, headers })
  }

  it('reads the session id out of the backend cookie', () => {
    const response = withCookies(
      'terrion_session=abc123; Path=/; HttpOnly; Max-Age=2592000; SameSite=None; Secure',
    )
    expect(sessionIdFromResponse(response)).toBe('abc123')
  })

  it('ignores other cookies on the same response', () => {
    const response = withCookies('other=nope; Path=/', 'terrion_session=abc123; Path=/')
    expect(sessionIdFromResponse(response)).toBe('abc123')
  })

  it('is null when no session cookie came back', () => {
    expect(sessionIdFromResponse(withCookies('other=nope; Path=/'))).toBeNull()
    expect(sessionIdFromResponse(new Response(null))).toBeNull()
  })

  // A cleared cookie -- what logout sends -- names the session with no value.
  // Treating that as an id would hand the next request an empty Cookie header
  // and read it back as a signed-in visitor.
  it('is null for a cookie that was cleared rather than set', () => {
    expect(sessionIdFromResponse(withCookies('terrion_session=; Path=/; Max-Age=0'))).toBeNull()
  })
})

/**
 * The distinction these two draw is the whole reason they exist: a 404 is the
 * contract saying "not there, or not yours", and everything else is the
 * backend failing to answer. Collapsing them is how a visitor gets told their
 * garden does not exist because a gateway was down.
 */
describe('classifying a failure', () => {
  const err = (status: number, code = 'x') => new ApiError(status, code)

  it('treats only 404 as not-found', () => {
    expect(isNotFound(err(404, 'plot not found'))).toBe(true)
    expect(isNotFound(err(500, 'internal'))).toBe(false)
    expect(isNotFound(err(502, 'http_502'))).toBe(false)
    expect(isNotFound(err(401, 'Unauthorised'))).toBe(false)
    expect(isNotFound(new Error('something else'))).toBe(false)
  })

  it('counts an unreachable host and a gateway error as the backend being down', () => {
    expect(isBackendDown(new ApiError(NETWORK_ERROR, 'network_unreachable'))).toBe(true)
    expect(isBackendDown(err(502, 'http_502'))).toBe(true)
    expect(isBackendDown(err(503, 'http_503'))).toBe(true)
    expect(isBackendDown(err(500, 'internal'))).toBe(true)
  })

  // A refusal the backend actually authored is not an outage, and a page that
  // degrades on one of these would be hiding an answer it was given.
  it('does not count a refusal as the backend being down', () => {
    expect(isBackendDown(err(401, 'Unauthorised'))).toBe(false)
    expect(isBackendDown(err(403, 'forbidden'))).toBe(false)
    expect(isBackendDown(err(404, 'plot not found'))).toBe(false)
    expect(isBackendDown(err(422, 'stagger_nothing_to_shift'))).toBe(false)
    expect(isBackendDown(new Error('something else'))).toBe(false)
  })
})

/**
 * The transport's job when the network misbehaves. A blip on the way to the
 * backend used to cost a whole server render -- ten seconds to a connect
 * timeout, or minutes to a stalled read that nothing bounded -- and the page
 * still ended up telling the visitor nothing could be asked. One repeat of a
 * safe request covers the blip; a bound on each attempt covers the stall.
 *
 * BASE_URL is read once when the module loads, so these re-import it with the
 * env var in place rather than sharing the instance the rest of the file uses.
 */
describe('apiExchange transport', () => {
  let client: typeof import('./client')
  const ok = () =>
    new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  beforeAll(async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.test')
    vi.resetModules()
    client = await import('./client')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  afterAll(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('repeats a GET that never reached the backend', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(ok())
    vi.stubGlobal('fetch', fetchMock)

    await expect(client.apiFetch('/api/me')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  // A write that timed out may have been applied already -- the answer was
  // lost, not the write. Repeating it would record a second harvest.
  it('never repeats a write', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(client.apiFetch('/api/harvests', { method: 'POST', body: {} }))
      .rejects.toMatchObject({ status: NETWORK_ERROR, code: 'network_unreachable' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('gives up as unreachable once the repeat fails too', async () => {
    const cause = new TypeError('fetch failed')
    const fetchMock = vi.fn().mockRejectedValue(cause)
    vi.stubGlobal('fetch', fetchMock)

    // The last failure is kept as the cause, so a log still names the syscall.
    await expect(client.apiFetch('/api/me')).rejects.toMatchObject({
      status: NETWORK_ERROR,
      code: 'network_unreachable',
      cause,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  // Without this a connection that opens and then stalls has nothing to stop
  // it; the render waits on the OS.
  it('bounds every attempt with an abort signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', fetchMock)

    await client.apiFetch('/api/me')
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  // A 500 is the backend answering, not the network failing, so repeating it
  // would just ask a struggling server the same question twice.
  it('does not repeat a request the backend answered', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: 'internal' }), { status: 500 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(client.apiFetch('/api/me')).rejects.toBeInstanceOf(client.ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

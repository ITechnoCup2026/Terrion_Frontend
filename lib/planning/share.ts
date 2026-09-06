import type { MemberShareResponse } from './types'

/**
 * Turning a share token into something a kader can actually send.
 *
 * The backend hands over three raw facts — a token, a phone number as it was
 * typed, and the plan's season — and deliberately builds no URL and no message
 * from them. That is the right split: `wa.me` is a display concern, the public
 * path belongs to this app's routing, and a message written in Go could not be
 * changed without a deploy of the backend.
 *
 * So it is all here, as pure functions, because every one of them is a rule
 * about a number or a sentence rather than a piece of layout: a phone number
 * typed as "0812-3456-7890" has to become "6281234567890" or the link opens a
 * chat with nobody, and that conversion is worth a test rather than an inline
 * regex in a button.
 */

/** Shortest and longest a number can be, in digits, once normalised. */
const MIN_DIGITS = 8
const MAX_DIGITS = 15

/**
 * A number in the form `wa.me` accepts: digits only, country code first, no
 * `+`, no leading zero.
 *
 * null means "not dialable from what we hold" — an empty field, a note the
 * kader typed instead of a number, a fragment too short to be a phone. Callers
 * fall back to WhatsApp's contact picker there, which is a working path and
 * not an error: the kader knows the farmer, the app does not.
 *
 * Only the Indonesian prefixes are rewritten. `08…` is the way a number is
 * written on paper in Indonesia and becomes `628…`; a bare `8…` is the same
 * number with the trunk zero dropped. Anything already carrying a country code
 * is left alone rather than guessed at — assuming +62 for a number that starts
 * `60` would silently dial Malaysia.
 */
export function whatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null

  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 0) return null

  // A leading + means the country code is already there, whatever it is.
  const international = trimmed.startsWith('+')

  let normalised = digits
  if (!international) {
    if (digits.startsWith('0')) normalised = `62${digits.slice(1)}`
    else if (digits.startsWith('8')) normalised = `62${digits}`
  }

  if (normalised.length < MIN_DIGITS || normalised.length > MAX_DIGITS) return null
  return normalised
}

/**
 * The public URL a token points at.
 *
 * `/rencana-saya/…` and not `/rencana/…`: the signed-in planner already owns
 * `/rencana/:id`, and a public page cannot share a path with a guarded one.
 * The name says whose plan it is, which is the whole difference between the
 * two screens.
 *
 * `origin` is passed in rather than read from the environment because the only
 * caller runs in the browser and `window.location.origin` is the one value
 * guaranteed to match the link the kader is looking at — a misconfigured
 * NEXT_PUBLIC_SITE_URL would send farmers to staging.
 */
export function planShareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/rencana-saya/${encodeURIComponent(token)}`
}

/**
 * The message that arrives on the farmer's phone.
 *
 * Written for someone who did not ask for it and has no account: it says who
 * it is from, what it is, and that the link is theirs. It does not carry a
 * single figure — tonnages and dates change when a plan is edited or
 * cancelled, and a number pasted into WhatsApp is frozen the moment it is
 * sent, while the link behind it stays live. That is the whole reason this
 * feature is a link and not a broadcast.
 */
export function planShareMessage(input: {
  memberName: string
  cooperativeName: string | null
  seasonLabel: string
  url: string
}): string {
  const from = input.cooperativeName ? ` dari ${input.cooperativeName}` : ''
  return [
    `Assalamualaikum, Bapak/Ibu ${input.memberName}.`,
    `Rencana tanam ${input.seasonLabel}${from} untuk lahan Bapak/Ibu sudah bisa dilihat di tautan ini:`,
    input.url,
    'Tautan ini khusus untuk Bapak/Ibu dan bisa dibuka langsung tanpa perlu masuk akun.',
  ].join('\n\n')
}

/**
 * The `wa.me` link, with the number when we have one and without when we do
 * not.
 *
 * Both forms are normal. Without a number WhatsApp opens its contact picker
 * with the message already written, which is exactly what a kader who knows
 * the farmer needs; treating a missing number as a disabled button would stop
 * them sharing a plan over a field nobody was ever required to fill in.
 */
export function whatsappShareUrl(phone: string | null | undefined, message: string): string {
  const number = whatsappNumber(phone)
  return `https://wa.me/${number ?? ''}?text=${encodeURIComponent(message)}`
}

/**
 * How far the links have got: opened, out of sent.
 *
 * Deliberately not called "diterima" or "dikonfirmasi" anywhere. `viewed` is
 * an access record — the link was opened by whoever holds it, which may be the
 * kader testing it or WhatsApp fetching a preview — and the count inherits
 * exactly that meaning, no more.
 */
export function shareTally(shares: readonly MemberShareResponse[]): {
  total: number
  opened: number
  withPhone: number
} {
  return {
    total: shares.length,
    opened: shares.filter(s => s.viewed).length,
    withPhone: shares.filter(s => whatsappNumber(s.member_phone) !== null).length,
  }
}

/**
 * Members first, alphabetically, with the unopened links at the top.
 *
 * The list is a work queue: the rows that still need a message are the ones
 * worth having at the top, and the rest are there to be checked off rather
 * than acted on.
 */
export function sortShares(shares: readonly MemberShareResponse[]): MemberShareResponse[] {
  return [...shares].sort((a, b) => {
    if (a.viewed !== b.viewed) return a.viewed ? 1 : -1
    return a.member_name.localeCompare(b.member_name, 'id')
  })
}

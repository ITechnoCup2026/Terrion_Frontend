'use client'

import { MessageCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { whatsappNumber, whatsappShareUrl } from '@/lib/planning/share'

/**
 * The one way two parties on Terrion actually talk to each other.
 *
 * Terrion carries no messaging and is not going to: the cooperative's business
 * already runs on WhatsApp, and a second inbox nobody checks is worse than no
 * inbox at all. What this product supplies is the introduction — who has what,
 * harvesting when — and then it gets out of the way.
 *
 * Without a number the button still works: `whatsappShareUrl` falls back to
 * WhatsApp's own contact picker with the message pre-written. That is why this
 * is never disabled. A pengurus who knows the buyer can pick them from their
 * own contacts, and a disabled button would punish them for a gap in our data.
 */
export function WhatsAppButton({
  phone,
  message,
  label,
  size = 'sm',
}: {
  phone: string | null
  message: string
  /** Overrides the default wording; the fallback case reads differently. */
  label?: string
  size?: 'sm' | 'lg'
}) {
  const reachable = whatsappNumber(phone) !== null

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={() => window.open(whatsappShareUrl(phone, message), '_blank', 'noopener')}
      title={reachable ? undefined : 'Nomor belum tercatat — pilih kontak sendiri di WhatsApp'}
    >
      <MessageCircle aria-hidden className="size-3.5" />
      {label ?? (reachable ? 'Chat WhatsApp' : 'Pilih kontak')}
    </Button>
  )
}

import { formatNumberId } from '@/lib/format/number'
import type { SupplyRequest } from '@/lib/supply-requests/load'

/**
 * The opening line of a WhatsApp conversation about one supply request.
 *
 * Written so the recipient can act without opening Terrion: which commodity,
 * how much, which week, and what was decided. A message that says only "halo,
 * soal permintaan Anda" makes the other party go looking, which is exactly the
 * friction the link exists to remove.
 *
 * Two directions, because the parties know different things. The cooperative
 * already knows who the buyer is and is answering them; the buyer is asking
 * about their own request and has to identify it.
 */
export function requestMessageToBuyer(request: SupplyRequest, commodity: string): string {
  return [
    `Halo ${request.buyerName}, ini dari ${request.cooperativeName || 'koperasi'}.`,
    '',
    `Mengenai permintaan pasokan Anda:`,
    `• Komoditas: ${commodity}`,
    `• Volume: ${formatNumberId(request.volumeKg / 1000, 2)} ton`,
    `• Jendela panen: ${request.windowStart} s.d. ${request.windowEnd}`,
    `• Status: ${statusWord(request.status)}`,
    '',
    'Boleh kita bicarakan detailnya?',
  ].join('\n')
}

export function requestMessageToCooperative(request: SupplyRequest, commodity: string): string {
  return [
    `Halo ${request.cooperativeName || 'koperasi'}, saya ${request.buyerName}`
      + `${request.buyerOrganisation ? ` dari ${request.buyerOrganisation}` : ''}.`,
    '',
    'Saya ingin menanyakan permintaan pasokan yang saya ajukan:',
    `• Komoditas: ${commodity}`,
    `• Volume: ${formatNumberId(request.volumeKg / 1000, 2)} ton`,
    `• Jendela panen: ${request.windowStart} s.d. ${request.windowEnd}`,
    `• Status: ${statusWord(request.status)}`,
    '',
    'Terima kasih.',
  ].join('\n')
}

/** The status in words the other party would use, not the enum. */
function statusWord(status: SupplyRequest['status']): string {
  if (status === 'accepted') return 'diterima'
  if (status === 'declined') return 'ditolak'
  if (status === 'withdrawn') return 'ditarik'
  return 'menunggu jawaban'
}

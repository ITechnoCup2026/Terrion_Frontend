import { apiFetch } from '@/lib/api/client'
import type { SupplyRequestRaw, SupplyRequestStatus } from '@/lib/api/types'
import { currentSessionId } from '@/lib/auth/session'

export type SupplyRequest = {
  id: string
  cooperativeId: string
  buyerId: string
  buyerName: string
  buyerOrganisation: string
  /** WhatsApp number, null when the account predates the field or is a demo row. */
  buyerPhone: string | null
  cooperativeName: string
  cooperativePhone: string | null
  commodityId: string
  volumeKg: number
  windowStart: string
  windowEnd: string
  status: SupplyRequestStatus
  notes: string
  createdAt: string
  respondedAt: string | null
}

function toSupplyRequest(raw: SupplyRequestRaw): SupplyRequest {
  return {
    id: raw.id,
    cooperativeId: raw.cooperative_id,
    buyerId: raw.buyer_id,
    buyerName: raw.buyer_name,
    buyerOrganisation: raw.buyer_organisation,
    buyerPhone: raw.buyer_phone ?? null,
    cooperativeName: raw.cooperative_name ?? '',
    cooperativePhone: raw.cooperative_phone ?? null,
    commodityId: raw.commodity_id,
    volumeKg: raw.volume_kg,
    windowStart: raw.window_start,
    windowEnd: raw.window_end,
    status: raw.status,
    notes: raw.notes,
    createdAt: raw.created_at,
    respondedAt: raw.responded_at,
  }
}

/**
 * GET /api/supply-requests answers a different question depending on who
 * asks: a cooperative sees requests made to it, a buyer sees their own --
 * the backend scopes this by session, there is nothing to filter here.
 */
export async function loadSupplyRequests(): Promise<SupplyRequest[]> {
  const sessionId = await currentSessionId()
  const raw = await apiFetch<SupplyRequestRaw[]>('/api/supply-requests', { sessionId })
  return raw.map(toSupplyRequest)
}

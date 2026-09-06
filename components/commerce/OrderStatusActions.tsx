'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Truck, X } from 'lucide-react'

import { updateInputOrderStatus } from '@/app/actions/input-order'
import { Button } from '@/components/ui/button'
import { ORDER_STATUS_MEANING, orderActions, type MovableStatus } from '@/lib/rdkk/status'
import type { InputOrder } from '@/lib/rdkk/load'

const ICON: Record<MovableStatus, typeof Truck> = {
  submitted: Truck,
  completed: Check,
  cancelled: X,
}

/**
 * The steps a pengurus may take on one order, and the only place its status
 * changes from.
 *
 * A Client Component so a refusal appears beside the button that caused it. A
 * bare Server Action form would throw the whole screen into the error
 * boundary, which for "this order moved while you were reading" is far more
 * alarming than the sentence itself.
 *
 * Which buttons exist is the server's answer, carried in `order.nextStatuses`
 * -- nothing here decides what may follow what.
 */
export function OrderStatusActions({ order }: { order: InputOrder }) {
  const router = useRouter()
  const [pending, setPending] = useState<MovableStatus | null>(null)
  const [confirming, setConfirming] = useState<MovableStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const actions = orderActions(order.nextStatuses)

  if (actions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{ORDER_STATUS_MEANING[order.status]}</p>
    )
  }

  const run = async (status: MovableStatus) => {
    setPending(status)
    setError(null)
    try {
      const result = await updateInputOrderStatus({ orderId: order.id, status })
      if (!result.ok) setError(result.message)
      // Nothing on the Server Component page re-fetches on its own just
      // because a Client Component beside it finished a request.
      else router.refresh()
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(null)
      setConfirming(null)
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted-foreground">{ORDER_STATUS_MEANING[order.status]}</p>

      <div className="flex flex-wrap items-center gap-2">
        {actions.map(action => {
          const Icon = ICON[action.to]
          const isPending = pending === action.to
          const awaitingConfirmation = confirming === action.to

          // Cancelling ends the order for good, so it asks once. The forward
          // steps do not: they can be followed by the next step, and a
          // confirmation on every click makes the common case tiresome.
          if (action.destructive && awaitingConfirmation) {
            return (
              <div
                key={action.to}
                className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-2.5 py-1.5"
              >
                <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                <span className="text-xs text-foreground">Batalkan pesanan ini?</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending !== null}
                  onClick={() => run(action.to)}
                  className="h-7 text-xs"
                >
                  {isPending ? 'Membatalkan…' : 'Ya, batalkan'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending !== null}
                  onClick={() => setConfirming(null)}
                  className="h-7 text-xs"
                >
                  Tidak
                </Button>
              </div>
            )
          }

          return (
            <Button
              key={action.to}
              type="button"
              size="sm"
              variant={action.destructive ? 'outline' : 'default'}
              disabled={pending !== null}
              title={action.hint}
              onClick={() => (action.destructive ? setConfirming(action.to) : run(action.to))}
              className={
                action.destructive
                  ? 'h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10'
                  : 'h-8 gap-1.5 text-xs'
              }
            >
              <Icon className="size-3.5" />
              {isPending ? 'Menyimpan…' : action.label}
            </Button>
          )
        })}
      </div>

      {/* The hint for the forward step, so the button is not the only
          explanation of what pressing it claims. */}
      {actions[0] && !actions[0].destructive && (
        <p className="text-[0.7rem] leading-relaxed text-muted-foreground">{actions[0].hint}</p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

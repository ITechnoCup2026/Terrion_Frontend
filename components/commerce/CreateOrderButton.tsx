'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createInputOrder } from '@/app/actions/input-order'
import { Button } from '@/components/ui/button'
import type { OrderLineDraft } from '@/lib/rdkk/order'

/**
 * Turns this season's aggregated requirement into a draft purchase.
 *
 * `lines` is what will actually be ordered: the RDKK's own figures when
 * nothing was adjusted, and the adjusted ones when a pengurus changed them.
 * They are sent either way, so what the screen shows and what the order holds
 * cannot come apart -- for a while this button sent no body at all, and an
 * adjustment made on screen was silently discarded while a badge assured the
 * reader it had taken effect.
 *
 * A Client Component only so the failure can be shown next to the button that
 * caused it. A bare Server Action form would throw the whole screen into the
 * error boundary, which is far more alarming than "there is nothing to order".
 */
export function CreateOrderButton({
  lines,
  disabled,
}: {
  lines: OrderLineDraft[]
  disabled?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await createInputOrder({
        lines: lines.map(line => ({ item: line.item, quantity: line.quantity })),
      })
      if (!result.ok) setError(result.message)
      // The new draft otherwise sits invisible: nothing on this Server
      // Component page re-fetches on its own just because a Client
      // Component next to it finished a request.
      else router.refresh()
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <Button type="button" onClick={submit} disabled={pending || disabled}>
        {pending ? 'Menyimpan…' : 'Buat pesanan kelompok'}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

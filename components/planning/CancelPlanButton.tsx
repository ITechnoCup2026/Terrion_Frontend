'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cancelPlan } from '@/lib/planning/actions'

/**
 * Takes a plan back and releases the blocks it wrote.
 *
 * Cancellation is part of the feature rather than a way out of it (decision
 * K3): seasons change, and a cooperative that cannot change its mind will
 * simply not use the planner. What it never removes is a kader's own record —
 * the backend refuses with `plan_partially_cancellable` when blocks have
 * already been harvested, and that refusal is a sentence worth reading, which
 * is why this is a Client Component with the message next to the button.
 *
 * The confirmation step is deliberate. This is the one control on the screen
 * that deletes rows across five other features at once.
 */
export function CancelPlanButton({ planId, blocks }: { planId: string; blocks: number }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removed, setRemoved] = useState<number | null>(null)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await cancelPlan(planId)
      if (!result.ok) { setError(result.message); return }
      setRemoved(result.data.blocks_removed)
      router.refresh()
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(false)
      setConfirming(false)
    }
  }

  if (removed !== null) {
    return (
      <p className="text-xs text-muted-foreground">
        Rencana dibatalkan. {removed} blok tanam dilepas; catatan kader tidak ikut terhapus.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            Batalkan rencana ini dan lepas {blocks} blok tanamnya?
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Tidak jadi
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={submit} disabled={pending}>
            {pending ? 'Membatalkan…' : 'Ya, batalkan'}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
          Batalkan rencana
        </Button>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

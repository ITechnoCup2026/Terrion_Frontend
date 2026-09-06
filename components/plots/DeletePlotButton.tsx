'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2 } from 'lucide-react'

import { deletePlot } from '@/app/actions/plot-edit'
import { Button } from '@/components/ui/button'

/**
 * Removes a plot registration and the blocks on it.
 *
 * For a plot registered by mistake, not for land that stopped being farmed —
 * the second is history, and history is not deleted. A plot carrying a recorded
 * harvest is refused by the server for exactly that reason: the cooperative's
 * calibration stands on those figures, and quietly removing them would change
 * every projection afterwards with nobody able to say why.
 *
 * It asks once. This is the only irreversible control on the screen, and the
 * confirmation names what goes with it.
 */
export function DeletePlotButton({
  plotId,
  plotName,
  blocks,
}: {
  plotId: string
  plotName: string
  blocks: number
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await deletePlot({ plotId })
      if (!result.ok) { setError(result.message); setConfirming(false); return }
      router.push('/plots')
      router.refresh()
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-2.5 py-2">
          <AlertTriangle aria-hidden className="size-3.5 shrink-0 text-destructive" />
          <span className="text-xs text-foreground">
            Hapus {plotName} beserta {blocks} bloknya?
          </span>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Batal
          </Button>
          <Button variant="destructive" size="sm" onClick={submit} disabled={pending}>
            {pending ? 'Menghapus…' : 'Hapus lahan'}
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden className="size-3.5" />
          Hapus lahan
        </Button>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

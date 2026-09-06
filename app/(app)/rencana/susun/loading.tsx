import { Skeleton } from '@/components/ui/Skeleton'

/**
 * `propose` takes two to four seconds by design -- Go walks hundreds of
 * plot x variety x date combinations and, when the AI service is up, waits for
 * its narrative. That is long enough that a blank screen reads as a broken
 * one, so this stands in for the shape that is coming: a title, the basis
 * note, the plan card, then the assignment table.
 *
 * One card and not three: the usual arrival is a pengurus who stated their
 * goal on the intake form and gets the single plan that answers it. A skeleton
 * of three cards would promise a layout most readers never see, and the
 * screen would jump the moment it resolved.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <span className="sr-only">Menghitung usulan rencana…</span>

      <div>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2.5 h-4 w-96 max-w-full" />
      </div>

      <Skeleton className="h-12 w-full rounded-lg" />

      <Skeleton className="h-72 w-full rounded-lg" />

      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  )
}

/**
 * The shape the page settles into: a header, then a card per plot.
 *
 * This link is opened on a village connection, so the wait is real and the
 * skeleton has to say "something is coming" rather than leave a white screen
 * that reads as a broken link to somebody who has never used this app before.
 */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:py-10"
    >
      <span className="sr-only">Memuat rencana tanam…</span>

      <div className="flex flex-col gap-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-6 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>

      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
      ))}
    </main>
  )
}

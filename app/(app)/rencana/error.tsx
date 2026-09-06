'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState retry={reset} digest={error.digest} />
}

import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { MessageCard } from '@/components/ui/Card'
import { Page } from '@/components/ui/Page'

/**
 * A token that answers nothing.
 *
 * The app's own 404 says the page "mungkin sudah dipindahkan", which is
 * written for somebody navigating a product they use. The reader here followed
 * a link out of a WhatsApp message and has no other way in, so this says the
 * two things that are actually true — the link did not work, ask the person
 * who sent it — and offers no route back into an app they have no account for.
 *
 * It stays vague about why on purpose: the backend does not distinguish a
 * token that never existed from one that no longer resolves, precisely so that
 * a stranger trying tokens learns nothing from the difference.
 */
export default function MemberPlanShareNotFound() {
  return (
    <Page className="flex flex-1 items-center justify-center">
      <MessageCard
        className="w-full"
        title="Tautan ini tidak bisa dibuka"
        action={
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Tentang Terrion
          </Link>
        }
      >
        Tautan rencana tanam ini sudah tidak berlaku atau salah ketik. Minta kader koperasi Anda
        mengirimkan tautannya sekali lagi.
      </MessageCard>
    </Page>
  )
}

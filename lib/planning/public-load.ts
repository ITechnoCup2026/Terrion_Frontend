import { apiFetch, isNotFound } from '@/lib/api/client'

import type { MemberPlanShareResponse } from './types'

/**
 * The one read behind the farmer's own page: no session, no cookie, no login.
 *
 * It lives apart from ./load.ts, the way lib/plots/public-load.ts lives apart
 * from lib/plots/load.ts, because the thing that makes it different is not the
 * shape of the response but who is allowed to ask — nothing here takes a
 * `sessionId`, and nothing here may grow one.
 *
 * **This read has a side effect**, which is unusual enough to be the first
 * thing to know about it: every call marks the token as opened on the backend
 * and stamps `first_viewed_at` the first time. So it is called exactly once,
 * from the page body, for a reader who actually landed on the page. In
 * particular it must not be called from `generateMetadata` — Next would run
 * both and one visit would record as two, and the count a pengurus reads is
 * "links opened", which is thin enough already.
 *
 * The GET retry in lib/api/client.ts is safe against this: it only fires when
 * `fetch` itself threw, and the marking is idempotent after the first hit —
 * `first_viewed_at` is written once and never moved.
 */
export async function loadMemberPlanShare(
  token: string,
): Promise<MemberPlanShareResponse | null> {
  try {
    const share = await apiFetch<MemberPlanShareResponse>(
      `/api/public/plan-share/${encodeURIComponent(token)}`,
    )
    // A plan with no fertiliser rate on file sends `fertiliser: []`, and a
    // member under the cap sends `over_subsidy_cap: null`. Both are normal
    // states rather than gaps, but an absent field would still crash the page,
    // so they are closed here as they are for the signed-in planner.
    return {
      ...share,
      items: share.items ?? [],
      fertiliser: share.fertiliser ?? [],
      over_subsidy_cap: share.over_subsidy_cap ?? null,
    }
  } catch (error) {
    // 404 is the only failure the backend distinguishes here, and it
    // deliberately says nothing about why: a wrong token and a withdrawn one
    // read identically, so a stranger cannot learn anything by trying.
    if (isNotFound(error)) return null
    throw error
  }
}

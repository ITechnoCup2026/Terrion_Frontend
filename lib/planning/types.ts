/**
 * Wire shapes for `/api/plans*` — the season planner.
 *
 * These live here rather than in lib/api/types.ts because the planner is one
 * self-contained feature with five endpoints of its own, and because the
 * backend's own converter keeps them in one file too
 * (`internal/model/planning.go`). Field names are snake_case and match Go
 * exactly; nothing outside lib/planning should reach for them.
 *
 * The one thing to keep in mind while reading these: **the frontend never
 * talks to the AI service.** Go answers every one of these calls, and answers
 * it completely, whether or not the Python planner is up. `engine` is the only
 * field that records which of the two computed the plans, and it is
 * diagnostic, not a failure state.
 */

/** The three questions a candidate plan answers. Order is fixed by the API. */
export type PlanObjective = 'aman' | 'pendapatan' | 'pasar'

/**
 * How trustworthy a simulated harvest window is. Same four values the standing
 * blocks already use (`lib/api/types.ts`), so the badge means the same thing on
 * both screens.
 */
export type PlanPlausibility = 'ok' | 'early' | 'late' | 'implausible'

export type PlanStatus = 'applied' | 'cancelled'

/** Which solver produced the plans. `fallback` is the Go solver: not an error. */
export type PlanEngine = 'ai-service' | 'fallback'

export type SeasonResponse = {
  /** "MT I 2026/2027" — echoed back verbatim when applying. */
  label: string
  start: string
  end: string
  /** Earliest planting date the planner will consider. */
  planting_from: string
  /** Latest planting date the planner will consider. */
  planting_to: string
}

/**
 * The season this one is measured against.
 *
 * null means there is no comparable season on record — which is a gap, not a
 * zero. A screen that prints "0 t" here tells a cooperative their last season
 * produced nothing.
 */
export type PreviousSeasonResponse = {
  label: string
  peak_tonnes: number
  total_tonnes: number
  blocks: number
}

export type PlanMetricsResponse = {
  /** Peak weekly harvest in an average season, tonnes. */
  peak_tonnes_expected: number
  /** Peak weekly harvest in the worst season, tonnes. NOT a percentile. */
  peak_tonnes_worst: number
  /** Gross estimate. null where no reference price covers the commodity. */
  gross_value: number | null
  /** Existing buyer demand this plan would cover, kg. */
  demand_covered_kg: number
  /** Whole-season harvest on the mid estimate, tonnes. */
  total_tonnes_mid: number
  /** Weeks over the cooperative's holding capacity. 0 means clear. */
  flagged_weeks: number
}

export type PlanAssignmentResponse = {
  plot_id: string
  plot_name: string
  member_id: string
  member_name: string
  area_ha: number
  commodity_id: string
  variety_id: string
  variety_name: string
  /** "2026-10-05" */
  planting_date: string
  harvest_start: string
  harvest_end: string
  plausibility: PlanPlausibility
  tonnes_low: number
  tonnes_mid: number
  tonnes_high: number
}

/**
 * The ceiling one commodity's weekly harvest is judged against.
 *
 * This is the answer to "menumpuk dibanding apa?", and without it
 * `flagged_weeks` is a number with no denominator. `basis` says where the
 * threshold came from — the cooperative's own holding capacity, or a default.
 */
export type CommodityThresholdResponse = {
  commodity_id: string
  tonnes_per_week: number
  basis: string
}

/** One week that goes over its commodity's threshold. Empty means none did. */
export type PlanFlaggedWeekResponse = {
  /** "2027-W03" */
  iso_week: string
  commodity_id: string
  tonnes: number
  threshold_tonnes: number
  basis: string
}

/**
 * What this plan would need in fertiliser — the RDKK figure, months before the
 * seed goes in the ground.
 */
export type FertiliserLineResponse = {
  /** "Urea" */
  input_item: string
  quantity_kg: number
  /** The commodities that contributed to this quantity. */
  sources: string[]
}

/**
 * A member whose assigned area passes the subsidised-fertiliser ceiling.
 *
 * Flagged, never truncated: the land is still planted, the excess is simply
 * not subsidised.
 */
export type OverSubsidyCapResponse = {
  member_id: string
  member_name: string
  planted_ha: number
  excess_ha: number
}

export type CandidatePlanResponse = {
  objective: PlanObjective
  /** Indonesian prose. May be empty — lay the card out so it still reads. */
  narrative: string
  metrics: PlanMetricsResponse
  assignments: PlanAssignmentResponse[]
  /** Per-commodity ceilings, flagged or not. What the peak is compared against. */
  thresholds: CommodityThresholdResponse[]
  /** One row per week over a ceiling. Empty means nothing collides. */
  flagged: PlanFlaggedWeekResponse[]
  /** Fertiliser this plan implies, by input. */
  fertiliser: FertiliserLineResponse[]
  /** Commodities with no rate on file. Print "—", never "0 kg". */
  fertiliser_unrated: string[]
  /** Members past the 2 ha subsidy cap. Flagged, not cut. */
  over_subsidy_cap: OverSubsidyCapResponse[]
}

export type SkippedPlotResponse = {
  plot_id: string
  plot_name: string
  member_name: string
  /** Already an Indonesian sentence. Print it as-is. */
  reason: string
}

/** GET /api/plans/propose?season=…&goal=… — computes, stores nothing. */
export type ProposalResponse = {
  season: SeasonResponse
  /** "climatology" for now: windows come from ten-year climate normals. */
  basis: string
  engine: PlanEngine
  /** Recorded harvests calibrating the yield model. 0 = pure model. */
  yield_observations: number
  /**
   * The one sentence of limits the backend writes for this proposal. It must
   * reach the screen verbatim: it is the planner stating what it does not
   * know, and paraphrasing it would be this app deciding how much doubt a
   * pengurus is allowed to see.
   */
  limits: string
  /** Last season, for comparison. null = no comparable season, NOT zero. */
  previous_season: PreviousSeasonResponse | null
  /** Always three, one per objective, in aman/pendapatan/pasar order. */
  plans: CandidatePlanResponse[]
  /** Plots that could not enter the plan. Must be shown, never hidden. */
  skipped: SkippedPlotResponse[]
  /** Combinations evaluated. Diagnostic; not for the reader. */
  evaluations: number
}

/**
 * POST /api/plans.
 *
 * Only three fields per assignment travel back. Every number is recomputed by
 * Go from scratch — sending the ones it already gave us would neither be used
 * nor believed.
 */
export type ApplySeasonPlanRequest = {
  /** Must equal season.label from propose. */
  season_label: string
  objective: PlanObjective
  assignments: {
    plot_id: string
    variety_id: string
    /** "2006-01-02", validated strictly by Go. */
    planting_date: string
  }[]
}

/** 201 Created. */
export type ApplySeasonPlanResponse = {
  plan_id: string
  /** How many planting blocks were written. */
  blocks: number
}

export type SeasonPlanItemResponse = {
  id: string
  plot_id: string
  plot_name: string
  member_id: string
  member_name: string
  commodity_id: string
  commodity_name: string
  variety_id: string
  variety_name: string
  area_ha: number
  planting_date: string
  harvest_start: string
  harvest_end: string
  plausibility: string
  tonnes_low: number
  tonnes_mid: number
  tonnes_high: number
  /** null once the block behind this item is gone. */
  block_id: string | null
}

export type SeasonPlanResponse = {
  id: string
  season_label: string
  season_start: string
  season_end: string
  objective: PlanObjective
  status: PlanStatus
  /** RFC3339 UTC. */
  created_at: string
  cancelled_at: string | null
  /**
   * Empty on GET /api/plans — the list carries no contents. Only
   * GET /api/plans/:id fills this, so no list screen may depend on it.
   */
  items: SeasonPlanItemResponse[]
  /**
   * One shareable link per member on this plan, filled by GET /api/plans/:id
   * alongside `items` and empty on the list endpoint for the same reason.
   *
   * A plan applied before the backend grew share tokens has none, so this is
   * normalised to `[]` at the edge (lib/planning/load.ts) rather than trusted
   * to be present.
   */
  member_shares: MemberShareResponse[]
}

export type SeasonPlanListResponse = { plans: SeasonPlanResponse[] }

export type CancelSeasonPlanResponse = { plan_id: string; blocks_removed: number }

/**
 * One member's private link to their own half of an applied plan.
 *
 * A `Member` never has a login in this product — that is a design decision,
 * not a gap — so the only way a farmer sees the plan made for their land is a
 * link somebody sends them. The backend mints one token per member per plan
 * when the plan is applied; a member holding three plots still gets exactly
 * one, and it shows all three.
 *
 * Two fields here are easy to render wrongly and both matter:
 *
 * `share_token` is a raw UUID, **not a URL**. This app decides what path it
 * hangs off (`lib/planning/share.ts`), because the backend has no business
 * knowing our routing.
 *
 * `viewed` means "this link was opened at least once", and nothing more. The
 * link travels by WhatsApp and can be opened by whoever holds it — the kader
 * testing it, a relative it was forwarded to, or WhatsApp's own preview
 * crawler. Wording it as "petani sudah menerima" on screen would turn an
 * access log into a confirmation nobody made.
 */
export type MemberShareResponse = {
  member_id: string
  member_name: string
  /** As the kader typed it, unnormalised. null when none was ever recorded. */
  member_phone: string | null
  /** Raw UUID. Build the URL with lib/planning/share.ts, never print this. */
  share_token: string
  viewed: boolean
  /** RFC3339. null while the link has never been opened. */
  first_viewed_at: string | null
}

/** One planting on the member's own page. Deliberately carries no ids. */
export type MemberPlanShareItemResponse = {
  plot_name: string
  commodity_name: string
  variety_name: string
  planting_date: string
  harvest_start: string
  harvest_end: string
  area_ha: number
  tonnes_low: number
  tonnes_mid: number
  tonnes_high: number
  plausibility: PlanPlausibility
}

/**
 * GET /api/public/plan-share/:token — the page the farmer opens, no login.
 *
 * `plan_status` is read live rather than frozen into the link, so a plan
 * cancelled after the link was shared says so the next time it is opened. The
 * items stay visible underneath, which is why the page has to be explicit that
 * they are history: a farmer who plants against a cancelled plan because the
 * page still listed the dates was failed by the screen, not the data.
 *
 * There is no `member_id`, `plot_id` or any other internal id in this payload,
 * on purpose. Nothing on the public page may become a handle for guessing at
 * another resource.
 */
export type MemberPlanShareResponse = {
  member_name: string
  cooperative_name: string
  season_label: string
  plan_status: PlanStatus
  items: MemberPlanShareItemResponse[]
  /** This member's own plots' fertiliser, not the cooperative's total. May be empty. */
  fertiliser: FertiliserLineResponse[]
  /** Only when this member's own area passes the cap. null is the normal case. */
  over_subsidy_cap: { planted_ha: number; excess_ha: number } | null
}

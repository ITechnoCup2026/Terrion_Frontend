/**
 * Raw wire shapes for the Terrion backend's API contract -- snake_case,
 * nullable where the contract says nullable. Loaders in lib/*\/load.ts map
 * these into the domain types each component already expects; nothing
 * outside lib/api and the loaders that call apiFetch() should import from
 * here directly.
 */

export type WindowBasis = 'observed' | 'forecast' | 'climatology'
export type Plausibility = 'ok' | 'early' | 'late' | 'implausible'
export type CatalogBasis = 'observed' | 'climatology'
export type ThresholdBasis = 'capacity' | 'median'
export type UserRoleRaw = 'kader' | 'pengurus' | 'buyer'
export type SupplyRequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'
export type DeliveryPreference = 'antar_ke_gudang' | 'ambil_di_koperasi' | 'belum_ditentukan'

export type HarvestWindowRaw = {
  start: string
  end: string
  confidence: number
  gdd_accumulated: number
  gdd_required: number
  stage: 0 | 1 | 2 | 3 | 4
  basis: WindowBasis
  plausibility: Plausibility
  cumulative_gdd?: { date: string; gdd: number }[]
  projected_from?: string
}

// ---- POST /api/auth/signup -------------------------------------------------

export type SignupResponseRaw = {
  outcome: 'signed_in' | 'confirm_email'
  email: string
}

// ---- POST /api/auth/login ---------------------------------------------------

/**
 * Login answers with a UserResponse -- the very shape GET /api/me returns --
 * so a successful sign-in already knows the role and cooperative, and there is
 * no follow-up call to make. The session id itself never appears in the body:
 * it arrives as the terrion_session cookie.
 */
export type LoginResponseRaw = MeResponseRaw

// ---- GET /api/health --------------------------------------------------------

export type HealthResponseRaw = {
  status: string
  service: string
}

// ---- GET /api/commodities ---------------------------------------------------

export type VarietyRaw = {
  id: string
  commodity_id: string
  name: string
  days_to_harvest_min: number
  days_to_harvest_max: number
  yield_per_ha_min: number
  yield_per_ha_max: number
}

export type CommodityRaw = {
  id: string
  slug: string
  name: string
  sprite_row: number
  varieties: VarietyRaw[]
}

// ---- GET /api/catalog, GET /api/catalog/cooperatives/:id -------------------

export type ListingRaw = {
  id: string
  cooperative_id: string
  cooperative_name: string
  province: string
  district: string
  village: string
  commodity_id: string
  commodity_name: string
  variety_name: string | null
  iso_week: string
  week_start: string
  week_end: string
  tonnes: number
  basis: CatalogBasis
}

export type CatalogResponseRaw = {
  listings: ListingRaw[]
  commodities: { id: string; name: string }[]
  provinces: string[]
}

// ---- GET /api/public/plots/:publicId ---------------------------------------

export type PublicBlockRaw = {
  id: string
  label: string
  area_ha: number
  order_index: number
  commodity_name: string
  variety_name: string
  sprite_row: number
  planting_date: string
  window: HarvestWindowRaw | null
  yield_range_tonnes: { min: number; max: number }
}

export type PublicPlotNeighbourRaw = {
  public_id: string
  name: string
  member_name: string
  area_ha: number
}

export type PublicPlotResponseRaw = {
  public_id: string
  name: string
  area_ha: number
  tile_size_m2: number
  member_name: string
  village: string
  district: string
  terrain_seed: number
  degraded: boolean
  cooperative_name: string
  blocks: PublicBlockRaw[]
  neighbours: {
    position: number
    total: number
    previous: PublicPlotNeighbourRaw | null
    next: PublicPlotNeighbourRaw | null
    others: PublicPlotNeighbourRaw[]
  }
}

// ---- GET /api/atlas/cooperatives, GET /api/atlas/farms/:id -----------------

export type AtlasCooperativeRaw = {
  id: string
  name: string
  village: string
  district: string
  province: string
  lat: number
  lng: number
  plot_count: number
  hectares: number
}

export type AtlasFarmPlotRaw = {
  public_id: string
  name: string
  member_name: string
  area_ha: number
  crops: string[]
}

export type AtlasFarmResponseRaw = {
  cooperative_id: string
  name: string
  village: string
  district: string
  province: string
  total_hectares: number
  plots: AtlasFarmPlotRaw[]
}

// ---- GET /api/me ------------------------------------------------------------

export type MeResponseRaw = {
  id: string
  role: UserRoleRaw
  cooperative_id: string | null
  full_name: string
  organisation: string | null
}

// ---- GET /api/dashboard -----------------------------------------------------

export type DashboardWeekRaw = {
  iso_week: string
  week_start: string
  expected_tonnes: number
  min_tonnes: number
  max_tonnes: number
  block_ids: string[]
}

export type DashboardFlaggedWeekRaw = {
  iso_week: string
  week_start: string
  commodity_id: string
  commodity_name: string
  tonnes: number
  threshold: number
  basis: ThresholdBasis
  plot_count: number
  block_ids: string[]
}

export type DashboardSuggestionRaw = {
  iso_week: string
  commodity_id: string
  commodity_name: string
  block_ids: string[]
  shift_days: number
  tonnes_moved: number
  resulting_tonnes: number
}

export type DashboardUpcomingRowRaw = {
  block_id: string
  plot_id: string
  plot_name: string
  member_name: string
  commodity_name: string
  tonnes: number
  start: string
  end: string
}

export type DashboardResponseRaw = {
  weeks: DashboardWeekRaw[]
  flagged: DashboardFlaggedWeekRaw[]
  lead: DashboardFlaggedWeekRaw | null
  suggestions: DashboardSuggestionRaw[]
  upcoming: { rows: DashboardUpcomingRowRaw[]; total_tonnes: number }
  impact: {
    price_vs_reference: number | null
    days_to_payment: number | null
    input_cost_saved: number | null
    tonnes_diverted: number | null
  }
  calibrations: CalibrationRaw[]
}

/**
 * What one cooperative's recorded harvests have taught the predictor about one
 * variety.
 *
 * `offset_days` is what those harvests say on their own; `applied_offset_days`
 * is what the prediction actually moves by, after the estimate is shrunk toward
 * the base model in proportion to how few harvests back it. Both cross the wire
 * because the gap between them is the honest part: two harvests do not get to
 * move a prediction as far as twenty do.
 */
export type CalibrationRaw = {
  variety_id: string
  variety_name: string
  commodity_name: string
  offset_days: number
  applied_offset_days: number
  n_observations: number
  residual_sd: number
}

// ---- PATCH /api/blocks/:id/harvest --------------------------------------------

export type RecordHarvestResponseRaw = {
  block_id: string
  plot_id: string
  /** Null when there was nothing yet to fit. */
  calibration: CalibrationRaw | null
}

// ---- GET /api/plots -----------------------------------------------------------

export type PlotListItemRaw = {
  id: string
  name: string
  public_id: string
  area_ha: number
  member_name: string
  block_count: number
  next_window: Omit<HarvestWindowRaw, 'cumulative_gdd'> | null
  expected_tonnes: number | null
  commodity_ids: string[]
  progress: number | null
}

// ---- GET /api/plots/:id --------------------------------------------------------

export type WeekPriceRaw = {
  price_per_kg: number
  week_start: string
}

export type PriceBenchmarkRaw = {
  latest: WeekPriceRaw
  /** Null when the panel published no week matching the harvest window a year
   *  back. The screen says so rather than falling back to `latest`. */
  seasonal: WeekPriceRaw | null
  source: string
}

export type PlotBlockRaw = {
  id: string
  label: string
  area_ha: number
  order_index: number
  commodity_id: string
  commodity_name: string
  sprite_row: number
  variety_id: string
  variety_name: string
  planting_date: string
  /** True when a season plan wrote this block, false when a kader recorded it. */
  from_plan: boolean
  window: HarvestWindowRaw | null
  expected_tonnes: number | null
  /** Null where no price panel covers the plot's province and commodity. */
  price: PriceBenchmarkRaw | null
}

export type PlotDetailResponseRaw = {
  id: string
  name: string
  public_id: string
  area_ha: number
  tile_size_m2: number
  member_name: string
  terrain_seed: number
  degraded: boolean
  has_harvested_blocks: boolean
  blocks: PlotBlockRaw[]
}

// ---- POST /api/plots ------------------------------------------------------------

export type CreatePlotResponseRaw = {
  plot_id: string
  public_id: string
}

// ---- POST /api/blocks/:id/split --------------------------------------------------

export type SplitBlockResponseRaw = {
  plot_id: string
  block_id: string
}

export type SplitBelowMinimumData = { min_ha: number }
export type SplitLeavesTooLittleData = { min_ha: number; block_area_ha: number; max_takeable_ha: number }

// ---- GET /api/rdkk ----------------------------------------------------------------

export type RdkkRowRaw = {
  member_id: string
  member_name: string
  planted_ha: number
  quantities_kg: (number | null)[]
  over_subsidy_cap: boolean
  excess_ha: number
}

export type RdkkResponseRaw = {
  meta: {
    cooperative_name: string
    village: string
    district: string
    province: string
    season_label: string
    season_start: string
    season_end: string
    printed_at: string
  }
  columns: string[]
  rows: RdkkRowRaw[]
  totals: number[]
  sources: string[]
  member_count: number
  total_planted_ha: number
  members_over_cap: number
  commodities_without_rates: string[]
  subsidy_cap_ha: number
}

// ---- POST /api/input-orders ---------------------------------------------------------

/** One adjusted amount. `item` must name an input this season's RDKK already
 *  asked for -- a pengurus changes how much is ordered, never what. */
export type CreateInputOrderLineRaw = {
  item: string
  quantity: number
}

export type CreateInputOrderBodyRaw = {
  lines: CreateInputOrderLineRaw[]
}

export type CreateInputOrderResponseRaw = {
  order_id: string
  lines: number
}

/** Attached to a 409 `order_season_already_open`: which order is in the way. */
export type OrderSeasonAlreadyOpenData = {
  existing_order_id: string
  existing_status: InputOrderStatusRaw
}

// ---- GET /api/input-orders -----------------------------------------------------------

/** `cancelled` is the only ending a mistaken order has that is not a deletion.
 *  Without it the sole way to correct one is to create another, which is how a
 *  season ended up holding twelve identical drafts. */
export type InputOrderStatusRaw = 'draft' | 'submitted' | 'completed' | 'cancelled'

export type InputOrderLineRaw = {
  item: string
  quantity: number
  unit: string
  /** What the RDKK worked out, present only where a pengurus adjusted this
   *  line. Null means nobody touched it -- read the absence, do not compare. */
  quantity_rdkk: number | null
}

export type InputOrderRaw = {
  id: string
  season_label: string
  status: InputOrderStatusRaw
  created_at: string
  created_by_name: string | null
  status_changed_at: string | null
  status_changed_by_name: string | null
  /** Where this order may go next, decided by the server from the one
   *  transition table there is. The buttons are rendered from this rather than
   *  from a second copy of the rules kept over here. */
  next_statuses: InputOrderStatusRaw[]
  lines: InputOrderLineRaw[]
}

// ---- PATCH /api/input-orders/:id -----------------------------------------------------

/** No `draft`: an order does not go backwards, so there is nowhere to say it. */
export type UpdateInputOrderStatusRaw = {
  status: Exclude<InputOrderStatusRaw, 'draft'>
}

// ---- GET/POST /api/supply-requests, PATCH /api/supply-requests/:id ------------------

export type SupplyRequestRaw = {
  id: string
  cooperative_id: string
  buyer_id: string
  buyer_name: string
  buyer_organisation: string
  commodity_id: string
  volume_kg: number
  window_start: string
  window_end: string
  status: SupplyRequestStatus
  notes: string
  created_at: string
  responded_at: string | null
}

// ---- POST /api/stagger --------------------------------------------------------------

export type StaggerResponseRaw = { shifted: number }

export type StaggerNothingToShiftData = { already_planted: number; would_be_in_the_past: number }

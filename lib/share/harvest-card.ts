/**
 * The shareable harvest card: what a farmer actually forwards.
 *
 * A link is the right thing to share with someone who will open it. A picture
 * is the right thing to share into a WhatsApp group, which is where a
 * cooperative's news actually travels in rural Indonesia -- it survives being
 * forwarded, it reads without a connection, and it shows up in the thread
 * rather than as a grey preview box somebody has to tap.
 *
 * Composition is split from drawing on purpose. `harvestCardContent` decides
 * what the card SAYS and is a pure function over facts, so the wording -- and
 * particularly the hedging on a projected figure -- is testable without a
 * canvas. `drawHarvestCard` only decides where those strings go.
 */

/** What the page knows, in the words it already uses on screen. */
export type HarvestCardFacts = {
  plotName: string
  memberName: string
  /** "Sukamaju, Kabupaten Subang". */
  place: string
  areaHa: number
  crops: {
    name: string
    /** The harvest window, already formatted as a range. Null when unknown. */
    window: string | null
    /** The expected yield range, already formatted. Null when the variety has none. */
    tonnes: string | null
  }[]
  /** The public garden URL this card is a picture of. */
  url: string
  /** True when the projection is running on stale or missing weather. */
  degraded: boolean
}

export type HarvestCardRow = {
  label: string
  value: string
}

export type HarvestCardContent = {
  heading: string
  subheading: string
  meta: string
  rows: HarvestCardRow[]
  /** The hedge. Never omitted -- see below. */
  footnote: string
  url: string
}

/** How many crops fit before the card starts summarising instead of listing. */
const MAX_ROWS = 4

/**
 * What the card says.
 *
 * The footnote is not optional and not configurable. Every number on this card
 * is a projection, the card will be forwarded away from the page that explains
 * that, and a tonnage in a WhatsApp group with no hedge on it is exactly how a
 * projection turns into a promise somebody trades on. The whole product is
 * careful about this on screen; a picture that leaves the room must be more
 * careful, not less.
 */
export function harvestCardContent(facts: HarvestCardFacts): HarvestCardContent {
  const rows: HarvestCardRow[] = facts.crops.slice(0, MAX_ROWS).map(crop => ({
    label: crop.name,
    value: [crop.window, crop.tonnes].filter(Boolean).join(' · ') || 'Belum ada perkiraan',
  }))

  const hidden = facts.crops.length - rows.length
  if (hidden > 0) {
    rows.push({ label: `+${hidden} komoditas lain`, value: 'Lihat halaman kebun' })
  }

  return {
    heading: facts.plotName,
    subheading: facts.memberName || 'Petani tidak tercatat',
    meta: `${formatHa(facts.areaHa)} ha · ${facts.place}`,
    rows,
    footnote: facts.degraded
      ? 'Perkiraan panen, dihitung tanpa data cuaca terbaru. Dapat berubah.'
      : 'Perkiraan panen dari cuaca yang tercatat. Rentang, bukan janji.',
    url: facts.url,
  }
}

function formatHa(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

/** Portrait, which is the shape a phone shows a chat image in without cropping. */
export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

const INK = '#10251c'
const INK_SOFT = '#4f5c50'
const GREEN = '#0f4d3c'
const PAPER = '#ffffff'
const RULE = '#dfe5e0'

/**
 * Paints the card onto a 2D context sized CARD_WIDTH x CARD_HEIGHT.
 *
 * Plain typography and no imagery, which is a decision rather than a shortcut:
 * the card has to render identically on every device with no font loading and
 * no network, and a picture of a farm here would be the generated scenery --
 * decoration the page is careful to label as illustration, which cannot carry
 * that label into a group chat.
 */
export function drawHarvestCard(
  ctx: CanvasRenderingContext2D, content: HarvestCardContent,
): void {
  const stack = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // A green band across the head, so the card is recognisable as Terrion's at
  // thumbnail size in a chat list.
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 0, CARD_WIDTH, 22)

  const margin = 88
  let y = 190

  ctx.fillStyle = GREEN
  ctx.font = `600 34px ${stack}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('TERRION', margin, 120)

  ctx.fillStyle = INK
  ctx.font = `700 76px ${stack}`
  // Two lines at most. A plot name long enough to take three would push every
  // row below it through the footer, and the name is the one thing on the card
  // the reader can already identify from a fragment.
  y = drawWrapped(ctx, content.heading, margin, y, CARD_WIDTH - margin * 2, 88, 2)

  ctx.fillStyle = INK_SOFT
  ctx.font = `400 40px ${stack}`
  y += 18
  ctx.fillText(content.subheading, margin, y)

  y += 52
  ctx.font = `400 34px ${stack}`
  ctx.fillText(content.meta, margin, y)

  y += 64
  ctx.strokeStyle = RULE
  ctx.lineWidth = 2
  line(ctx, margin, y, CARD_WIDTH - margin)

  // The footnote and the URL sit on the floor of the card rather than after the
  // last row, so a plot with one crop and a plot with four both carry the hedge
  // in the same place. Rows therefore have a hard ceiling, not a soft one.
  const floor = CARD_HEIGHT - 96
  const rowsCeiling = floor - 132 - 28

  y += 76
  const textWidth = CARD_WIDTH - margin * 2

  // Measure every row before drawing any, because how many fit depends on how
  // many lines each value wraps to -- which is only knowable from the context.
  ctx.font = `400 36px ${stack}`
  const heights = content.rows.map(row => {
    const lines = wrapLines(text => ctx.measureText(text).width, row.value, textWidth, 2)
    return 48 + (lines.length - 1) * 46 + 46
  })

  const fitted = rowsThatFit(y, rowsCeiling, heights)

  for (const row of content.rows.slice(0, fitted)) {
    ctx.fillStyle = INK
    ctx.font = `600 44px ${stack}`
    ctx.fillText(row.label, margin, y)

    ctx.fillStyle = INK_SOFT
    ctx.font = `400 36px ${stack}`
    y += 48
    y = drawWrapped(ctx, row.value, margin, y, textWidth, 46, 2)

    y += 46
  }

  // Dropped rows are named, not silently lost: a card listing two of five crops
  // with no sign of the other three misrepresents the plot.
  const dropped = content.rows.length - fitted
  if (dropped > 0) {
    ctx.fillStyle = INK_SOFT
    ctx.font = `400 36px ${stack}`
    ctx.fillText(`+${dropped} komoditas lain — lihat halaman kebun`, margin, y)
  }

  ctx.strokeStyle = RULE
  line(ctx, margin, floor - 132, CARD_WIDTH - margin)

  ctx.fillStyle = INK_SOFT
  ctx.font = `400 30px ${stack}`
  drawWrapped(ctx, content.footnote, margin, floor - 78, textWidth, 38, 2)

  ctx.fillStyle = GREEN
  ctx.font = `600 32px ${stack}`
  ctx.fillText(content.url, margin, floor)
}

function line(ctx: CanvasRenderingContext2D, from: number, y: number, to: number): void {
  ctx.beginPath()
  ctx.moveTo(from, y)
  ctx.lineTo(to, y)
  ctx.stroke()
}

/**
 * How many of `rowHeights` can be drawn from `from` without crossing `ceiling`.
 *
 * The footnote and the URL are pinned to the floor of the card so that a plot
 * with one crop and a plot with four both carry the hedge in the same place.
 * The consequence is that rows running long do not push the footer down — they
 * draw straight through it. A long plot name wrapping to a second line was
 * enough: five rows then ended at 1188 against a footer rule at 1122.
 *
 * So the rows yield, never the hedge. What does not fit is summarised instead.
 */
export function rowsThatFit(from: number, ceiling: number, rowHeights: number[]): number {
  let y = from
  let fitted = 0

  for (const height of rowHeights) {
    if (y + height > ceiling) break
    y += height
    fitted++
  }

  return fitted
}

/**
 * Draws text broken onto as many lines as it needs; returns the last baseline.
 *
 * `maxLines` caps the growth, with the last line ellipsised. Without a cap the
 * heading alone can take three lines and shove every row below it through the
 * footer.
 */
function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, maxWidth: number, lineHeight: number,
  maxLines = Number.POSITIVE_INFINITY,
): number {
  const lines = wrapLines(content => ctx.measureText(content).width, text, maxWidth, maxLines)

  let baseline = y
  for (const [index, content] of lines.entries()) {
    ctx.fillText(content, x, baseline)
    if (index < lines.length - 1) baseline += lineHeight
  }
  return baseline
}

/**
 * Breaks `text` into at most `maxLines` lines that each measure under
 * `maxWidth`. The final line is ellipsised when text had to be dropped.
 */
export function wrapLines(
  measure: (text: string) => number,
  text: string, maxWidth: number, maxLines = Number.POSITIVE_INFINITY,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measure(candidate) > maxWidth && current) {
      lines.push(current)
      if (lines.length === maxLines) return ellipsise(lines, maxWidth, measure)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)

  return lines
}

/** Marks the last kept line so a truncated card does not read as a complete one. */
function ellipsise(
  lines: string[], maxWidth: number, measure: (text: string) => number,
): string[] {
  const last = lines.length - 1
  let content = `${lines[last]}…`
  while (content.length > 1 && measure(content) > maxWidth) {
    content = `${content.slice(0, -2)}…`
  }
  lines[last] = content
  return lines
}

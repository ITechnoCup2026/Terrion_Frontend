import { normalise } from './filter'
import type { PlanObjective } from './types'

/**
 * Reading a pengurus's own sentence as one of the three objectives.
 *
 * The sentence itself is not interpreted here. It travels to the backend as
 * `GET /api/plans/propose?goal=…`, where it shifts how strongly an objective
 * is weighted — and where, per `docs/INTEGRASI_FRONTEND.md` §3.4, it never
 * becomes a number: every tonne, rupiah and date still comes from the
 * deterministic solver.
 *
 * What this reading decides is narrower and entirely local: **which of the
 * three returned plans is the one drawn up**. All three are always computed
 * and always returned; a pengurus who typed "musim depan jangan menumpuk"
 * should land on Aman rather than on whichever plan happens to come first.
 *
 * The rule it obeys is §9.4 of `docs/RENCANA_AI_FITUR_RENCANA_TANAM.md`: a
 * translated goal is itself a proposal, shown back and confirmed before the
 * search runs, never applied silently. That rule was written for the language
 * model. It binds a keyword matcher at least as tightly, because a keyword
 * matcher is more likely to be wrong and less able to say so.
 *
 * Deterministic, per principle P4: the same sentence reads the same way every
 * time, with no tie broken by iteration order.
 */

/**
 * The backend's own ceiling on `goal`, in characters — not bytes.
 *
 * Enforced in the textarea rather than discovered as a 422, because the reply
 * to going over is `plan_goal_too_long` and by then the pengurus has written
 * a paragraph and waited for a round trip to be told to shorten it.
 */
export const GOAL_MAX_CHARS = 500

/** Ordered as the API returns the plans, so a tie can never depend on a Map. */
const LEXICON: readonly { objective: PlanObjective; terms: readonly string[] }[] = [
  {
    objective: 'aman',
    terms: [
      'harga jatuh', 'harga anjlok', 'jatuh', 'anjlok', 'turun harga',
      'menumpuk', 'numpuk', 'tumpuk', 'bertabrakan', 'tabrakan', 'barengan',
      'puncak', 'gudang', 'kapasitas', 'tidak muat', 'penuh',
      'aman', 'risiko', 'hati-hati', 'busuk', 'terbuang',
    ],
  },
  {
    objective: 'pendapatan',
    terms: [
      'pendapatan', 'penghasilan', 'untung', 'keuntungan', 'laba', 'cuan',
      'nilai tertinggi', 'paling bernilai', 'hasil tertinggi', 'harga tinggi',
      'mahal', 'uang', 'omzet', 'sebanyak-banyaknya', 'maksimal',
    ],
  },
  {
    objective: 'pasar',
    terms: [
      'pembeli', 'pabrik', 'kontrak', 'permintaan', 'pesanan', 'order',
      'ditolak', 'kami tolak', 'tidak terpenuhi', 'langganan', 'pengepul',
      'tengkulak', 'off-taker', 'offtaker', 'sudah ada yang minta',
    ],
  },
]

export type GoalReading = {
  /** Null when nothing matched, or when two objectives matched equally. */
  objective: PlanObjective | null
  /** The words that produced the reading, in the order they were found. */
  matched: string[]
  /** True when a second objective matched just as strongly. */
  ambiguous: boolean
}

/**
 * Read a sentence. Never guess.
 *
 * A tie returns null rather than picking the first, and so does silence. The
 * cost of returning null is one extra tap on a preset; the cost of guessing
 * wrong is a pengurus reading the plan that answers a question they did not
 * ask, believing the system understood them. §9.1 of the AI document names
 * that exact failure — *"terjemahan tujuan yang salah tapi masuk akal"* — as
 * the likeliest way this feature misleads somebody.
 */
export function readGoal(sentence: string): GoalReading {
  const text = normalise(sentence)
  if (!text) return { objective: null, matched: [], ambiguous: false }

  const scores = LEXICON.map(({ objective, terms }) => ({
    objective,
    matched: countTerms(text, terms),
  }))

  const best = scores.reduce((a, b) => (b.matched.length > a.matched.length ? b : a))
  if (best.matched.length === 0) return { objective: null, matched: [], ambiguous: false }

  const tied = scores.filter(s => s.matched.length === best.matched.length)
  if (tied.length > 1) {
    return { objective: null, matched: tied.flatMap(t => t.matched), ambiguous: true }
  }

  return { objective: best.objective, matched: best.matched, ambiguous: false }
}

/** The three objectives are the only values the URL may carry. */
export function parseObjective(value: string | undefined): PlanObjective | null {
  return value === 'aman' || value === 'pendapatan' || value === 'pasar' ? value : null
}

/**
 * Which of an objective's terms the sentence actually contains, counted once.
 *
 * Longest first, and each match is consumed from the working copy. Without
 * that, "harga jatuh" scores twice — once whole, once for the bare "jatuh"
 * inside it — and a sentence naming one fear beats a sentence naming two.
 * That is not a tuning detail: it is the difference between a tie being
 * detected and a wrong reading being applied confidently.
 *
 * Sorted by length descending, ties keeping the lexicon's own order, so the
 * result does not depend on how the array was written (principle P4).
 */
function countTerms(text: string, terms: readonly string[]): string[] {
  const ordered = terms
    .map((term, index) => ({ term, index, needle: normalise(term) }))
    .sort((a, b) => b.needle.length - a.needle.length || a.index - b.index)

  const matched: string[] = []
  let remaining = text

  for (const { term, needle } of ordered) {
    if (!needle || !remaining.includes(needle)) continue
    matched.push(term)
    remaining = remaining.split(needle).join(' ')
  }

  return matched
}

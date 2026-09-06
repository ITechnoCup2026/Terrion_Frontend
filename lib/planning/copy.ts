import type { PlanObjective, PlanPlausibility } from './types'

/**
 * The words the planner uses on screen, in one place.
 *
 * Two rules from `docs/INTEGRASI_FRONTEND.md` §7 are enforced here rather than
 * left to whoever writes the next component:
 *
 *   - `peak_tonnes_expected` / `peak_tonnes_worst` are NOT percentiles. The
 *     words "P50", "P90" and any percentage of likelihood are forbidden; the
 *     safe phrasings are "pada musim rata-rata" and "pada musim terburuk".
 *   - `gross_value` rests on a reference-price panel that is still synthetic,
 *     so it is always introduced as an estimate and never as a settled rupiah
 *     figure.
 */

export type ObjectiveCopy = {
  /** A, B, C — the plans are compared side by side and get named to be argued about. */
  letter: string
  label: string
  /** The question this plan answers — the one line that distinguishes it. */
  question: string
  /** What the search actually optimises for. */
  detail: string
  /**
   * The two halves of the trade-off, stated as a pair.
   *
   * A planner that only prints what each plan is good at is selling three
   * plans; one that prints what each plan gives up is asking the pengurus to
   * choose. `sacrifices` is therefore not a disclaimer at the bottom of the
   * card — it sits beside `optimises`, in the same type size, because the
   * whole reason there are three cards is that none of them is free.
   */
  optimises: string
  sacrifices: string
}

/** Fixed order: the API returns the three plans in exactly this sequence. */
export const OBJECTIVES: readonly PlanObjective[] = ['aman', 'pendapatan', 'pasar']

export const OBJECTIVE_COPY: Record<PlanObjective, ObjectiveCopy> = {
  aman: {
    letter: 'A',
    label: 'Aman',
    question: 'Kalau cuaca membuat panen menumpuk, apa gudang masih muat?',
    detail: 'Menekan puncak panen mingguan serendah mungkin, walau nilainya tidak yang tertinggi.',
    optimises: 'Puncak panen mingguan serendah mungkin.',
    sacrifices: 'Nilai panen total lebih rendah.',
  },
  pendapatan: {
    letter: 'B',
    label: 'Pendapatan',
    question: 'Mana susunan tanam yang paling bernilai?',
    detail: 'Mengejar perkiraan nilai panen tertinggi dari lahan yang sama.',
    optimises: 'Perkiraan nilai panen tertinggi terhadap harga acuan musiman.',
    sacrifices: 'Puncak lebih tinggi, risiko panen bertabrakan lebih besar.',
  },
  pasar: {
    letter: 'C',
    label: 'Terikat pasar',
    question: 'Mana yang memenuhi permintaan pembeli yang sudah ada?',
    detail: 'Menutup sebanyak mungkin permintaan pasokan yang sudah masuk ke koperasi.',
    optimises: 'Menutup permintaan pembeli yang pernah masuk dan belum terpenuhi.',
    sacrifices: 'Bergantung pada pembeli itu datang kembali musim depan.',
  },
}

export type PlausibilityCopy = {
  label: string
  /** One line the reader can act on. */
  hint: string
  tone: 'neutral' | 'positive' | 'warning' | 'negative'
}

/**
 * Four values, four visual weights. `implausible` is a warning, not a
 * decoration: it means the simulated harvest window itself is doubtful, and a
 * pengurus who applies that row is scheduling against a date the model does
 * not stand behind.
 */
export const PLAUSIBILITY_COPY: Record<PlanPlausibility, PlausibilityCopy> = {
  ok: {
    label: 'Wajar',
    hint: 'Jendela panen jatuh di rentang yang lazim untuk varietas ini.',
    tone: 'positive',
  },
  early: {
    label: 'Terlalu cepat',
    hint: 'Jendela panennya lebih awal dari kebiasaan varietas ini. Periksa sebelum diterapkan.',
    tone: 'warning',
  },
  late: {
    label: 'Terlalu lambat',
    hint: 'Jendela panennya lebih lambat dari kebiasaan varietas ini. Periksa sebelum diterapkan.',
    tone: 'warning',
  },
  implausible: {
    label: 'Meragukan',
    hint: 'Jendela panen hasil simulasi tidak masuk akal untuk varietas ini. Sebaiknya diubah dulu.',
    tone: 'negative',
  },
}

export function plausibilityCopy(value: string): PlausibilityCopy {
  return PLAUSIBILITY_COPY[value as PlanPlausibility] ?? {
    label: value,
    hint: '',
    tone: 'neutral' as const,
  }
}

/**
 * The sentence that has to sit on every screen showing a projected harvest.
 *
 * Next season's weather has not happened, so every figure here descends from a
 * ten-year climate normal. Saying so on the screen — not in a footnote — is
 * the whole of principle P2.
 */
export const BASIS_NOTE =
  'Rencana ini dihitung dari normal iklim sepuluh tahun, karena cuaca musim depan belum terjadi. '
  + 'Setiap perkiraan panen adalah rentang, bukan janji.'

/** Which solver answered. Neutral on purpose: "fallback" is not a fault. */
export function engineNote(engine: string): string {
  return engine === 'ai-service'
    ? 'Disusun oleh perencana Terrion AI.'
    : 'Disusun oleh perencana bawaan Terrion.'
}

/**
 * How much recorded harvest is behind the tonnage figures.
 *
 * Zero is not an error — the yield model still answers — but a plan calibrated
 * by nothing deserves to say so, the same way the projection panel does.
 */
export function calibrationNote(observations: number): string {
  if (observations <= 0) {
    return 'Belum ada panen tercatat yang mengkalibrasi model hasil, jadi rentang tonasenya lebih longgar dari biasanya.'
  }
  return `Model hasil dikalibrasi oleh ${observations} panen tercatat koperasi ini.`
}

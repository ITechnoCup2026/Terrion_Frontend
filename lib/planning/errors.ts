import { ApiError, NETWORK_ERROR } from '@/lib/api/client'

/**
 * Every refusal `/api/plans*` can give, as a sentence a pengurus can act on.
 *
 * The codes are listed in `docs/INTEGRASI_FRONTEND.md` §4 and the backend
 * treats them as stable, so mapping them here is safe. What is *not* safe is
 * showing one raw: `plan_no_climate_normals` on screen tells a cooperative
 * board member nothing except that something broke.
 *
 * Two of them are deliberately not translated. `season is required` and
 * `http_*` mean this app sent a malformed request or hit a fault — neither is
 * the reader's doing, and neither has a remedy they can carry out — so both
 * fall through to the generic sentence and the detail goes to the log.
 */

const MESSAGES: Record<string, string> = {
  // 403 — the role guard should have hidden the control, so this is a
  // near-miss rather than something a pengurus sees in normal use.
  Forbidden:
    'Hanya pengurus koperasi yang bisa menyusun, menerapkan, atau membatalkan rencana tanam.',
  Unauthorised:
    'Sesi Anda sudah berakhir. Masuk lagi untuk melanjutkan.',
  'account is not linked to a cooperative':
    'Akun Anda belum terhubung ke koperasi mana pun, jadi belum ada lahan yang bisa direncanakan. Lengkapi profil koperasi Anda dulu.',

  // 422 — the pengurus's own sentence was too long. Their words are kept on
  // the intake screen: asking somebody to retype what they just wrote is how
  // a limit turns into an abandoned plan.
  plan_goal_too_long:
    'Tujuan yang Anda tuliskan lebih dari 500 aksara, jadi belum bisa dikirim. Persingkat kalimatnya, lalu hitung ulang.',

  plan_no_plots:
    'Koperasi ini belum punya lahan terdaftar, jadi belum ada yang bisa direncanakan. Daftarkan lahan anggota dulu.',
  plan_no_climate_normals:
    'Normal iklim untuk lokasi lahan koperasi ini belum tersedia, jadi jendela panen musim depan belum bisa disimulasikan. Coba lagi setelah data cuaca tersinkron.',
  plan_season_closed:
    'Jendela tanam musim ini sudah lewat, jadi rencananya tidak bisa disusun lagi. Pilih musim berikutnya.',
  plan_no_eligible_plots:
    'Ada lahan terdaftar, tetapi tidak satu pun layak masuk rencana musim ini. Alasannya per lahan ada di daftar "Lahan yang dilewati".',
  plan_already_applied:
    'Musim ini sudah punya rencana yang berjalan. Lihat rencana itu dulu, dan batalkan bila memang mau menyusun yang baru.',
  plan_already_cancelled:
    'Rencana ini sudah dibatalkan sebelumnya. Muat ulang daftar rencana untuk melihat keadaan terbarunya.',
  plan_assignment_rejected:
    'Satu penugasan ditolak saat divalidasi ulang — biasanya karena lahannya berubah sejak usulan dihitung. Susun ulang usulannya, lalu coba lagi.',
  plan_partially_cancellable:
    'Sebagian blok dari rencana ini sudah dipanen, jadi rencananya tidak bisa dibatalkan seluruhnya. Catatan panen tidak akan dihapus.',
  plan_not_found:
    'Rencana ini tidak ditemukan. Mungkin sudah dihapus, atau bukan milik koperasi Anda.',
}

const GENERIC =
  'Rencana tanam gagal diproses. Coba lagi, dan hubungi pengelola Terrion jika terus berulang.'

// Nothing was written and nothing is broken: the request never left. GENERIC
// would send a pengurus hunting for a fault that is not theirs.
const UNREACHABLE =
  'Server sedang tidak bisa dihubungi, jadi rencana ini belum diproses. Coba lagi beberapa saat lagi.'

/**
 * True when the failure has a sentence of its own — i.e. it is something the
 * reader did, and can undo, rather than a bug.
 *
 * Callers use this to choose between drawing an explanation inside the page
 * and letting the error boundary take the screen.
 */
export function isKnownPlanError(error: unknown): boolean {
  return error instanceof ApiError
    && (error.status === NETWORK_ERROR || error.code in MESSAGES)
}

/** The sentence to show for a failed `/api/plans*` call. */
export function planErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC
  if (error.status === NETWORK_ERROR) return UNREACHABLE
  return MESSAGES[error.code] ?? GENERIC
}

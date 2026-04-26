/**
 * WHS（ワールドハンデキャップシステム）/ JGA 計算ロジック
 */

/** ラウンド数別：使用ディファレンシャル数と調整値 */
export const WHS_TABLE = [
  { n: 1,  use: 1, adj: -2.0 },
  { n: 2,  use: 1, adj: -1.0 },
  { n: 3,  use: 1, adj:  0   },
  { n: 4,  use: 1, adj: +1.0 },
  { n: 5,  use: 1, adj: +2.0 },
  { n: 6,  use: 2, adj:  0   },
  { n: 7,  use: 2, adj:  0   },
  { n: 8,  use: 2, adj:  0   },
  { n: 9,  use: 3, adj:  0   },
  { n: 10, use: 3, adj:  0   },
  { n: 11, use: 4, adj:  0   },
  { n: 12, use: 4, adj:  0   },
  { n: 13, use: 5, adj:  0   },
  { n: 14, use: 5, adj:  0   },
  { n: 15, use: 6, adj:  0   },
  { n: 16, use: 6, adj:  0   },
  { n: 17, use: 7, adj:  0   },
  { n: 18, use: 8, adj:  0   },
  { n: 19, use: 8, adj:  0   },
  { n: 20, use: 8, adj:  0   },
]

/**
 * コースハンデキャップを計算（ESC用）
 * CH = round( HI × Slope ÷ 113 )
 * HI未確定（null）の場合はデフォルト値20を使用 → 上限8打
 */
export function calcCourseHandicap(hi, slope) {
  const h = (hi === null || hi === undefined) ? 20 : hi
  return Math.round(h * slope / 113)
}

/**
 * ESC上限（WHS方式）
 * コースハンデキャップの合計値で全ホール一律に決定。
 * ホールごとのストローク配分は行わない。
 *
 * CH  0〜 9  → ダブルボギー（par + 2）
 * CH 10〜19  → 7打
 * CH 20〜29  → 8打
 * CH 30〜39  → 9打
 * CH 40以上  → 10打
 */
export function escLimit(par, courseHandicap) {
  if (courseHandicap <=  9) return par + 2
  if (courseHandicap <= 19) return 7
  if (courseHandicap <= 29) return 8
  if (courseHandicap <= 39) return 9
  return 10
}

/**
 * ESC適用後スコア
 */
export function applyESC(score, par, courseHandicap) {
  return Math.min(score, escLimit(par, courseHandicap))
}

/**
 * スコアディファレンシャルを計算
 * Differential = (調整後総合スコア - CR) × 113 / Slope
 */
export function calcDifferential(adjustedGross, cr, slope) {
  const diff = ((adjustedGross - cr) * 113) / slope
  return Math.round(diff * 10) / 10
}

/**
 * ハンデキャップインデックスを計算（WHS方式）
 * - 直近20ラウンドから
 * - ベストN個のディファレンシャルを使用
 * - × 0.96
 * - 最大54.0
 */
export function calcHandicapIndex(differentials) {
  if (!differentials || differentials.length === 0) return null

  const recent = differentials.slice(-20)
  const n = recent.length
  const sorted = [...recent].sort((a, b) => a - b)

  const row = WHS_TABLE[n - 1]
  const bestN = sorted.slice(0, row.use)
  const avg = bestN.reduce((sum, d) => sum + d, 0) / bestN.length

  const hi = (avg + row.adj) * 0.96
  const rounded = Math.floor(hi * 10) / 10

  return Math.min(54.0, rounded)
}

/**
 * スコアのカテゴリを返す（色分け用）
 * albatross / eagle / birdie / par / bogey / double / triple
 */
export function getScoreCategory(score, par) {
  const diff = score - par
  if (diff <= -3) return 'albatross'
  if (diff === -2) return 'eagle'
  if (diff === -1) return 'birdie'
  if (diff === 0)  return 'par'
  if (diff === 1)  return 'bogey'
  if (diff === 2)  return 'double'
  return 'triple'
}

/**
 * 全ラウンドを時系列で再計算
 * 各ラウンド時点でのHIを使いESCを適用 → 順次HIを更新
 */
export function recalcAllRounds(rounds, courses) {
  if (!rounds.length) return []

  const sorted = [...rounds].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  )

  let currentHI = null
  const accDifferentials = []

  return sorted.map(round => {
    const course = courses.find(c => c.id === round.courseId)
    if (!course) return { ...round, error: 'コースデータが見つかりません' }

    // greens構造 or 旧tees構造に対応
    let tee = null
    if (course.greens && round.greenId) {
      const green = course.greens.find(g => g.id === round.greenId)
      tee = green?.tees.find(t => t.id === round.teeId) ?? null
    } else if (course.tees) {
      tee = course.tees.find(t => t.id === round.teeId) ?? null
    }

    if (!tee) {
      return { ...round, error: 'ティーデータが見つかりません' }
    }

    // ESC用コースハンデ: HI未確定時はデフォルト20を使用
    const courseHandicap = calcCourseHandicap(currentHI, tee.slope)

    let adjustedScores = []
    let adjustedGross

    if ((round.inputMode === 'hole' || round.inputMode === 'image') && round.scores?.length === 18) {
      adjustedScores = round.scores.map((score, i) => {
        const hole = course.holes[i]
        return applyESC(score, hole.par, courseHandicap)
      })
      adjustedGross = adjustedScores.reduce((sum, s) => sum + s, 0)
    } else {
      // total入力モード: ESC未適用
      adjustedGross = round.grossScore
      adjustedScores = []
    }

    const differential = calcDifferential(adjustedGross, tee.cr, tee.slope)
    accDifferentials.push(differential)

    const updatedRound = {
      ...round,
      courseHandicap,
      adjustedScores,
      adjustedGross,
      differential,
      handicapIndexAtTime: currentHI,
    }

    currentHI = calcHandicapIndex(accDifferentials)

    return updatedRound
  })
}

/**
 * パーオン（GIR）判定
 * Par-2打以内にグリーンに乗ったかどうか
 * 計算: スコア - パット数 ≤ Par - 2
 */
export function isGIR(score, putts, par) {
  if (!score || !putts || !par) return false
  return (score - putts) <= (par - 2)
}

/**
 * ラウンド全体のGIR数を計算
 */
export function calcGIRCount(scores, putts, holes) {
  if (!scores?.length === 18 || !putts?.length === 18) return 0
  let count = 0
  for (let i = 0; i < 18; i++) {
    if (isGIR(scores[i], putts[i], holes[i].par)) {
      count++
    }
  }
  return count
}

/**
 * ラウンド全体のGIR率（％）を計算
 */
export function calcGIRRate(scores, putts, holes) {
  const count = calcGIRCount(scores, putts, holes)
  return Math.round((count / 18) * 100)
}

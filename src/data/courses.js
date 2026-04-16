/**
 * 三好カントリー倶楽部 JGA公式コースレーティングデータ
 *
 * 西コース: メイングリーン / サブグリーン（2グリーン）
 * 東コース: ベントグリーン（1グリーン）
 */

export const courses = [
  {
    id: 'miyoshi-west',
    name: '三好CC 西コース',
    shortName: '西コース',
    par: 72,
    greens: [
      {
        id: 'main',
        name: 'メイングリーン',
        tees: [
          { id: 'back',    name: 'バック',    color: '#212121', textColor: '#fff', cr: 76.7, slope: 142 },
          { id: 'regular', name: 'レギュラー', color: '#e8e8e8', textColor: '#000', cr: 74.7, slope: 140 },
          { id: 'front',   name: 'フロント',   color: '#1565c0', textColor: '#fff', cr: 72.2, slope: 139 },
          { id: 'ladies',  name: 'レディース', color: '#c62828', textColor: '#fff', cr: 69.9, slope: 138 },
        ],
      },
      {
        id: 'sub',
        name: 'サブグリーン',
        tees: [
          { id: 'back',    name: 'バック',    color: '#212121', textColor: '#fff', cr: 76.6, slope: 141 },
          { id: 'regular', name: 'レギュラー', color: '#e8e8e8', textColor: '#000', cr: 74.5, slope: 141 },
          { id: 'front',   name: 'フロント',   color: '#1565c0', textColor: '#fff', cr: 72.3, slope: 138 },
          { id: 'ladies',  name: 'レディース', color: '#c62828', textColor: '#fff', cr: 70.0, slope: 138 },
        ],
      },
    ],
    holes: [
      // OUT: 4-5-4-4-3-4-5-3-4 = 36
      { number: 1,  par: 4, handicap: 9  },
      { number: 2,  par: 5, handicap: 5  },
      { number: 3,  par: 4, handicap: 17 },
      { number: 4,  par: 4, handicap: 11 },
      { number: 5,  par: 3, handicap: 1  },
      { number: 6,  par: 4, handicap: 13 },
      { number: 7,  par: 5, handicap: 15 },
      { number: 8,  par: 3, handicap: 3  },
      { number: 9,  par: 4, handicap: 7  },
      // IN: 4-4-5-3-4-5-3-4-4 = 36
      { number: 10, par: 4, handicap: 10 },
      { number: 11, par: 4, handicap: 4  },
      { number: 12, par: 5, handicap: 18 },
      { number: 13, par: 3, handicap: 12 },
      { number: 14, par: 4, handicap: 2  },
      { number: 15, par: 5, handicap: 14 },
      { number: 16, par: 3, handicap: 16 },
      { number: 17, par: 4, handicap: 6  },
      { number: 18, par: 4, handicap: 8  },
    ],
  },
  {
    id: 'miyoshi-east',
    name: '三好CC 東コース',
    shortName: '東コース',
    par: 72,
    greens: [
      {
        id: 'bent',
        name: 'ベントグリーン',
        tees: [
          { id: 'back',     name: 'バック',    color: '#212121', textColor: '#fff', cr: 72.6, slope: 140 },
          { id: 'regular',  name: 'レギュラー', color: '#e8e8e8', textColor: '#000', cr: 70.7, slope: 137 },
          { id: 'front',    name: 'フロント',   color: '#1565c0', textColor: '#fff', cr: 69.4, slope: 134 },
          { id: 'ladies',   name: 'レディース', color: '#c62828', textColor: '#fff', cr: 68.3, slope: 131 },
          { id: 'lavender', name: 'ラベンダー', color: '#7b1fa2', textColor: '#fff', cr: 67.5, slope: 129 },
        ],
      },
    ],
    holes: [
      // OUT: 4-5-4-3-5-4-3-4-4 = 36
      { number: 1,  par: 4, handicap: 7  },
      { number: 2,  par: 5, handicap: 11 },
      { number: 3,  par: 4, handicap: 17 },
      { number: 4,  par: 3, handicap: 3  },
      { number: 5,  par: 5, handicap: 13 },
      { number: 6,  par: 4, handicap: 9  },
      { number: 7,  par: 3, handicap: 15 },
      { number: 8,  par: 4, handicap: 1  },
      { number: 9,  par: 4, handicap: 5  },
      // IN: 3-5-4-4-4-4-5-3-4 = 36
      { number: 10, par: 3, handicap: 8  },
      { number: 11, par: 5, handicap: 12 },
      { number: 12, par: 4, handicap: 18 },
      { number: 13, par: 4, handicap: 4  },
      { number: 14, par: 4, handicap: 14 },
      { number: 15, par: 4, handicap: 10 },
      { number: 16, par: 5, handicap: 16 },
      { number: 17, par: 3, handicap: 2  },
      { number: 18, par: 4, handicap: 6  },
    ],
  },
]

/**
 * コース・グリーン・ティーからティーデータを取得
 */
export function findTee(course, greenId, teeId) {
  if (!course) return null
  if (course.greens && greenId) {
    const green = course.greens.find(g => g.id === greenId)
    return green?.tees.find(t => t.id === teeId) ?? null
  }
  // 旧データ形式との後方互換
  return course.tees?.find(t => t.id === teeId) ?? null
}

/**
 * コースのデフォルトグリーンを返す
 */
export function defaultGreenId(course) {
  return course?.greens?.[0]?.id ?? null
}

/**
 * コースのデフォルトティーを返す
 */
export function defaultTeeId(course, greenId) {
  if (course?.greens && greenId) {
    const green = course.greens.find(g => g.id === greenId)
    // レギュラーがあれば選択、なければ最初のティー
    return green?.tees.find(t => t.id === 'regular')?.id ?? green?.tees[0]?.id ?? null
  }
  return course?.tees?.find(t => t.id === 'regular')?.id ?? course?.tees?.[0]?.id ?? null
}

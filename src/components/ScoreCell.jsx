import React from 'react'
import { getScoreCategory } from '../utils/handicapCalc.js'

const CATEGORY_CLASS = {
  albatross: 'score-albatross',
  eagle:     'score-eagle',
  birdie:    'score-birdie',
  par:       'score-par',
  bogey:     'score-bogey',
  double:    'score-double',
  triple:    'score-triple',
}

const CATEGORY_LABEL = {
  albatross: 'アルバトロス',
  eagle:     'イーグル',
  birdie:    'バーディ',
  par:       'パー',
  bogey:     'ボギー',
  double:    'ダブルボギー',
  triple:    'トリプル以上',
}

export default function ScoreCell({ score, par, showLabel = false }) {
  if (!score || !par) return <span className="score-cell">-</span>

  const category = getScoreCategory(score, par)
  const className = `score-cell ${CATEGORY_CLASS[category]}`

  return (
    <span className={className} title={CATEGORY_LABEL[category]}>
      {score}
    </span>
  )
}

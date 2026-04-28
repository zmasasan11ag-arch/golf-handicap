import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { WHS_TABLE } from '../utils/handicapCalc.js'
import { findTee } from '../data/courses.js'

export default function Dashboard() {
  const { rounds, handicapIndex, competitionHandicapIndex, competitionRoundCount, courses } = useApp()

  const recentRounds = rounds.slice(0, 5)
  const recent20     = rounds.slice(0, 20)  // 直近20ラウンド（日付降順）
  const roundCount   = rounds.length
  const n            = Math.min(roundCount, 20)
  const usedCount    = n > 0 ? WHS_TABLE[n - 1].use : 0

  // 計算に使用したディファレンシャルのIDセットを求める
  const usedIds = new Set()
  if (n > 0) {
    const row = WHS_TABLE[n - 1]
    const sortedByDiff = [...recent20].sort((a, b) => a.differential - b.differential)
    sortedByDiff.slice(0, row.use).forEach(r => usedIds.add(r.id))
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  const hiDisplay = handicapIndex !== null ? handicapIndex.toFixed(1) : '--.-'

  const hiClass =
    handicapIndex === null ? 'hi-none' :
    handicapIndex <= 0    ? 'hi-scratch' :
    handicapIndex <= 10   ? 'hi-low' :
    handicapIndex <= 20   ? 'hi-mid' :
    handicapIndex <= 30   ? 'hi-high' :
    'hi-veryhigh'

  return (
    <div className="page">
      <header className="page-header">
        <h1>ハンデキャップ管理</h1>
        <span className="subtitle">三好CC</span>
      </header>

      {/* ── ハンデキャップインデックスカード ── */}
      <div className={`hi-card ${hiClass}`}>
        <div className="hi-label">ハンデキャップインデックス</div>
        <div className="hi-dual">
          <div className="hi-dual-item">
            <div className="hi-dual-sublabel">通常</div>
            <div className="hi-value">{hiDisplay}</div>
          </div>
          <div className="hi-dual-divider" />
          <div className="hi-dual-item">
            <div className="hi-dual-sublabel">競技</div>
            <div className="hi-value hi-comp-value">
              {competitionHandicapIndex !== null
                ? competitionHandicapIndex.toFixed(1)
                : competitionRoundCount < 3
                  ? <span className="hi-comp-insufficient">データ不足<small>({competitionRoundCount}戦)</small></span>
                  : '--.-'
              }
            </div>
          </div>
        </div>
        {handicapIndex !== null && (
          <div className="hi-meta">
            直近{n}ラウンド中 ベスト{usedCount}個から計算
          </div>
        )}
        {handicapIndex === null && (
          <div className="hi-meta">ラウンドを入力してください</div>
        )}
      </div>

      {/* ── 統計サマリー ── */}
      {roundCount > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{roundCount}</div>
            <div className="stat-label">ラウンド数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {Math.min(...rounds.map(r => r.grossScore))}
            </div>
            <div className="stat-label">ベストスコア</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {(rounds.reduce((s, r) => s + r.grossScore, 0) / rounds.length).toFixed(1)}
            </div>
            <div className="stat-label">平均スコア</div>
          </div>
        </div>
      )}

      {/* ── ディファレンシャル一覧 ── */}
      {roundCount > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>ディファレンシャル一覧</h2>
            <span className="diff-used-summary">
              {usedCount}個 使用中
            </span>
          </div>

          <div className="diff-table">
            <div className="diff-table-head">
              <span>日付・コース</span>
              <span style={{ textAlign: 'center' }}>Score</span>
              <span style={{ textAlign: 'right' }}>Diff</span>
              <span></span>
            </div>

            {recent20.map(round => {
              const isUsed = usedIds.has(round.id)
              const course = courses.find(c => c.id === round.courseId)
              const tee    = findTee(course, round.greenId, round.teeId)
              return (
                <div
                  key={round.id}
                  className={`diff-table-row ${isUsed ? 'diff-row-used' : 'diff-row-unused'}`}
                >
                  <div className="diff-col-date">
                    <div>{formatDate(round.date)}</div>
                    <div style={{ fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', marginTop: 1 }}>
                      {course?.shortName}
                      {tee && (
                        <span
                          style={{
                            background: tee.color,
                            color: tee.textColor,
                            fontSize: 10,
                            padding: '0px 5px',
                            borderRadius: 10,
                            fontWeight: 700,
                          }}
                        >
                          {tee.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="diff-col-score">{round.grossScore}</div>
                  <div className="diff-col-value">
                    {round.differential != null ? round.differential.toFixed(1) : '--'}
                  </div>
                  <div className="diff-col-check">
                    {isUsed ? '✓' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}


    </div>
  )
}

function RoundSummaryCard({ round, formatDate }) {
  const { courses } = useApp()
  const course = courses.find(c => c.id === round.courseId)
  const green  = course?.greens?.find(g => g.id === round.greenId)
  const tee    = findTee(course, round.greenId, round.teeId)

  return (
    <Link to={`/rounds/${round.id}/edit`} className="round-card">
      <div className="round-card-left">
        <div className="round-date">{formatDate(round.date)}</div>
        <div className="round-course">
          {course?.shortName}
          {green && course?.greens?.length > 1 && (
            <span className="green-badge">{green.name}</span>
          )}
          {tee && (
            <span
              className="tee-badge"
              style={{ background: tee.color, color: tee.textColor }}
            >
              {tee.name}
            </span>
          )}
        </div>
      </div>
      <div className="round-card-right">
        <div className="round-score">{round.grossScore}</div>
        <div className="diff-badge">
          <span className="diff-badge-label">Diff</span>
          <span className="diff-badge-value">
            {round.differential != null ? round.differential.toFixed(1) : '--'}
          </span>
        </div>
      </div>
    </Link>
  )
}

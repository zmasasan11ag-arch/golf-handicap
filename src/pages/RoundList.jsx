import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import ScoreCell from '../components/ScoreCell.jsx'
import { findTee } from '../data/courses.js'

export default function RoundList() {
  const { rounds, courses, deleteRound } = useApp()
  const [expandedId, setExpandedId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  const handleDelete = (id) => {
    deleteRound(id)
    setConfirmDelete(null)
    setExpandedId(null)
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>ラウンド一覧</h1>
        <Link to="/rounds/new" className="btn btn-primary btn-sm">＋ 追加</Link>
      </header>

      {rounds.length === 0 ? (
        <div className="empty-state">
          <p>ラウンドがまだ登録されていません</p>
          <Link to="/rounds/new" className="btn btn-primary">最初のラウンドを追加</Link>
        </div>
      ) : (
        <div className="round-list">
          {rounds.map((round, idx) => {
            const course = courses.find(c => c.id === round.courseId)
            const green  = course?.greens?.find(g => g.id === round.greenId)
            const tee    = findTee(course, round.greenId, round.teeId)
            const isExpanded = expandedId === round.id

            return (
              <div key={round.id} className={`round-card-detail${isExpanded ? ' expanded' : ''}`}>
                {/* ヘッダー行 */}
                <div
                  className="round-card-header"
                  onClick={() => setExpandedId(isExpanded ? null : round.id)}
                >
                  <div className="round-card-left">
                    <div className="round-top-row">
                      <span className="round-date">{formatDate(round.date)}</span>
                      <span className="round-course-name">{course?.shortName || round.courseId}</span>
                    </div>
                    <div className="round-tags">
                      {round.isCompetition && (
                        <span className="competition-badge">競技</span>
                      )}
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
                  <div className="diff-badge">
                    <span className="diff-badge-label">Diff</span>
                    <span className="diff-badge-value">
                      {round.differential != null ? round.differential.toFixed(1) : '--'}
                    </span>
                  </div>
                  <div className="round-card-right">
                    <div className="round-score">{round.grossScore}</div>
                  </div>
                  <span className={`expand-icon${isExpanded ? ' open' : ''}`}>▶</span>
                </div>

                {/* 展開: 詳細 */}
                {isExpanded && (
                  <div className="round-detail">
                    <div className="detail-row">
                      <span>コースハンデ</span>
                      <span>{round.courseHandicap ?? '--'}</span>
                    </div>
                    <div className="detail-row">
                      <span>ESC調整後スコア</span>
                      <span>{round.adjustedGross ?? round.grossScore}</span>
                    </div>
                    <div className="detail-row">
                      <span>当時のHI</span>
                      <span>
                        {round.handicapIndexAtTime != null
                          ? round.handicapIndexAtTime.toFixed(1)
                          : '未確定'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span>CR / Slope</span>
                      <span>{tee?.cr ?? '--'} / {tee?.slope ?? '--'}</span>
                    </div>
                    <div className="detail-row">
                      <span>入力方式</span>
                      <span>{round.inputMode === 'hole' ? 'ホールごと' : round.inputMode === 'image' ? '画像読み取り' : '合計スコア'}</span>
                    </div>
                    {round.memo && (
                      <div className="detail-row">
                        <span>メモ</span>
                        <span>{round.memo}</span>
                      </div>
                    )}

                    {/* ホールごとスコア */}
                    {round.scores?.length === 18 && course && (
                      <div className="scorecard-mini">
                        <ScoreGrid round={round} course={course} />
                      </div>
                    )}

                    {/* 操作ボタン */}
                    <div className="round-actions">
                      <Link
                        to={`/rounds/${round.id}/edit`}
                        className="btn btn-secondary btn-sm"
                      >
                        編集
                      </Link>
                      {confirmDelete === round.id ? (
                        <div className="confirm-delete">
                          <span>削除しますか？</span>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(round.id)}
                          >
                            削除する
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setConfirmDelete(null)}
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setConfirmDelete(round.id)}
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ScoreGrid({ round, course }) {
  const front = course.holes.slice(0, 9)
  const back = course.holes.slice(9, 18)

  const frontScores = round.scores.slice(0, 9)
  const backScores = round.scores.slice(9, 18)

  const frontPar = front.reduce((s, h) => s + h.par, 0)
  const backPar  = back.reduce((s, h) => s + h.par, 0)
  const frontTotal = frontScores.reduce((s, x) => s + (x || 0), 0)
  const backTotal  = backScores.reduce((s, x) => s + (x || 0), 0)

  return (
    <div className="scorecard">
      <div className="scorecard-section">
        <div className="scorecard-row header">
          <div className="sc-hole">H</div>
          {front.map(h => <div key={h.number} className="sc-cell">{h.number}</div>)}
          <div className="sc-total">OUT</div>
        </div>
        <div className="scorecard-row par-row">
          <div className="sc-hole">Par</div>
          {front.map(h => <div key={h.number} className="sc-cell">{h.par}</div>)}
          <div className="sc-total">{frontPar}</div>
        </div>
        <div className="scorecard-row score-row">
          <div className="sc-hole">Score</div>
          {frontScores.map((s, i) => (
            <div key={i} className="sc-cell">
              <ScoreCell score={s} par={front[i].par} />
            </div>
          ))}
          <div className="sc-total">{frontTotal}</div>
        </div>
      </div>

      <div className="scorecard-section">
        <div className="scorecard-row header">
          <div className="sc-hole">H</div>
          {back.map(h => <div key={h.number} className="sc-cell">{h.number}</div>)}
          <div className="sc-total">IN</div>
        </div>
        <div className="scorecard-row par-row">
          <div className="sc-hole">Par</div>
          {back.map(h => <div key={h.number} className="sc-cell">{h.par}</div>)}
          <div className="sc-total">{backPar}</div>
        </div>
        <div className="scorecard-row score-row">
          <div className="sc-hole">Score</div>
          {backScores.map((s, i) => (
            <div key={i} className="sc-cell">
              <ScoreCell score={s} par={back[i].par} />
            </div>
          ))}
          <div className="sc-total">{backTotal}</div>
        </div>
      </div>

      {round.adjustedScores?.length === 18 && (
        <div className="scorecard-esc-note">
          ※ ESC調整後: {round.adjustedGross}（調整前: {round.grossScore}）
        </div>
      )}
    </div>
  )
}

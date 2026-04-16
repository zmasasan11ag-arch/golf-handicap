import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getScoreCategory } from '../utils/handicapCalc.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

// スコア色（index.css の変数に合わせる）
const CATEGORY_COLORS = {
  birdie:  '#ef6c00',
  par:     '#4dd0e1',
  bogey:   '#1a237e',
  double:  '#2e7d32',
  triple:  '#212121',
}

const DIST_LABELS = [
  { key: 'birdieRate', label: 'バーディ以下', color: CATEGORY_COLORS.birdie },
  { key: 'parRate',    label: 'パー',         color: CATEGORY_COLORS.par    },
  { key: 'bogeyRate',  label: 'ボギー',       color: CATEGORY_COLORS.bogey  },
  { key: 'doubleRate', label: 'ダブルボギー', color: CATEGORY_COLORS.double },
  { key: 'tripleRate', label: 'トリプル以上', color: CATEGORY_COLORS.triple },
]

function getAvgCategory(avgDiff) {
  if (avgDiff <= -0.5)  return 'birdie'
  if (avgDiff <=  0.4)  return 'par'
  if (avgDiff <=  1.4)  return 'bogey'
  if (avgDiff <=  2.4)  return 'double'
  return 'triple'
}

const CustomAvgTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const sign = d.avgDiff >= 0 ? '+' : ''
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}番ホール (par{d.par})</div>
      <div>平均: <strong>{d.avg}</strong> ({sign}{d.avgDiff})</div>
    </div>
  )
}

const CustomDistTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}番ホール</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill }}>
          {DIST_LABELS.find(d => d.key === p.dataKey)?.label}: <strong>{p.value}%</strong>
        </div>
      ))}
    </div>
  )
}

export default function Analysis() {
  const { rounds, courses } = useApp()

  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterGreenId,  setFilterGreenId]  = useState('')
  const [filterTeeId,    setFilterTeeId]    = useState('')

  const selectedCourse = courses.find(c => c.id === filterCourseId)
  const selectedGreen  = selectedCourse?.greens?.find(g => g.id === filterGreenId)

  // ── フィルター選択肢 ──
  const availableCourses = useMemo(() => {
    const ids = new Set(rounds.map(r => r.courseId))
    return courses.filter(c => ids.has(c.id))
  }, [rounds, courses])

  const availableGreens = useMemo(() => {
    if (!filterCourseId || !selectedCourse?.greens) return []
    const ids = new Set(rounds.filter(r => r.courseId === filterCourseId).map(r => r.greenId).filter(Boolean))
    return selectedCourse.greens.filter(g => ids.has(g.id))
  }, [rounds, filterCourseId, selectedCourse])

  const availableTees = useMemo(() => {
    if (!filterCourseId) return []
    const greenObj = filterGreenId ? selectedGreen : null
    const courseRounds = rounds.filter(r =>
      r.courseId === filterCourseId && (!filterGreenId || r.greenId === filterGreenId)
    )
    const ids = new Set(courseRounds.map(r => r.teeId).filter(Boolean))
    const teeList = greenObj
      ? greenObj.tees
      : selectedCourse?.greens?.flatMap(g => g.tees) ?? []
    return teeList.filter(t => ids.has(t.id))
  }, [rounds, filterCourseId, filterGreenId, selectedCourse, selectedGreen])

  // ── フィルター適用 ──
  const filteredRounds = useMemo(() => rounds.filter(r => {
    if (filterCourseId && r.courseId !== filterCourseId) return false
    if (filterGreenId  && r.greenId  !== filterGreenId)  return false
    if (filterTeeId    && r.teeId    !== filterTeeId)    return false
    return true
  }), [rounds, filterCourseId, filterGreenId, filterTeeId])

  // ホールスコアがあるラウンドのみ
  const holeRounds = useMemo(
    () => filteredRounds.filter(r => r.scores?.length === 18),
    [filteredRounds]
  )

  // ── 全体統計 ──
  const stats = useMemo(() => {
    if (filteredRounds.length === 0) return null
    const grossList = filteredRounds.map(r => r.grossScore)
    const diffList  = filteredRounds.map(r => r.differential).filter(d => d != null)
    return {
      count:   filteredRounds.length,
      avgGross: (grossList.reduce((s, v) => s + v, 0) / grossList.length).toFixed(1),
      avgDiff:  diffList.length > 0
        ? (diffList.reduce((s, v) => s + v, 0) / diffList.length).toFixed(1)
        : null,
      best:  Math.min(...grossList),
      worst: Math.max(...grossList),
    }
  }, [filteredRounds])

  // ── ホール別統計 ──
  const holeStats = useMemo(() => {
    if (!filterCourseId || holeRounds.length < 3) return null
    const course = courses.find(c => c.id === filterCourseId)
    if (!course) return null

    return course.holes.map((hole, i) => {
      const hScores = holeRounds.map(r => r.scores[i]).filter(s => s > 0)
      if (hScores.length === 0) return null

      const avg    = hScores.reduce((s, v) => s + v, 0) / hScores.length
      const avgRnd = Math.round(avg * 10) / 10

      let birdie = 0, par = 0, bogey = 0, double_ = 0, triple = 0
      hScores.forEach(s => {
        const d = s - hole.par
        if (d <= -1)     birdie++
        else if (d === 0) par++
        else if (d === 1) bogey++
        else if (d === 2) double_++
        else              triple++
      })
      const total = hScores.length
      const pct   = v => Math.round(v / total * 100)

      return {
        hole:        hole.number,
        par:         hole.par,
        avg:         avgRnd,
        avgDiff:     Math.round((avg - hole.par) * 10) / 10,
        birdieRate:  pct(birdie),
        parRate:     pct(par),
        bogeyRate:   pct(bogey),
        doubleRate:  pct(double_),
        tripleRate:  pct(triple),
      }
    }).filter(Boolean)
  }, [filterCourseId, holeRounds, courses])

  const handleCourseChange = v => { setFilterCourseId(v); setFilterGreenId(''); setFilterTeeId('') }
  const handleGreenChange  = v => { setFilterGreenId(v);  setFilterTeeId('') }

  return (
    <div className="page">
      <header className="page-header">
        <h1>スコア分析</h1>
      </header>

      {/* ── フィルター ── */}
      <section className="form-section" style={{ marginBottom: 16 }}>
        <h2 className="form-section-title">フィルター</h2>

        <div className="form-group">
          <label>コース</label>
          <select value={filterCourseId} onChange={e => handleCourseChange(e.target.value)} className="form-input">
            <option value="">すべてのコース</option>
            {availableCourses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {availableGreens.length > 1 && (
          <div className="form-group">
            <label>グリーン</label>
            <select value={filterGreenId} onChange={e => handleGreenChange(e.target.value)} className="form-input">
              <option value="">すべてのグリーン</option>
              {availableGreens.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        {availableTees.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>ティー</label>
            <select value={filterTeeId} onChange={e => setFilterTeeId(e.target.value)} className="form-input">
              <option value="">すべてのティー</option>
              {availableTees.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* ── データ不足 ── */}
      {filteredRounds.length < 3 ? (
        <div className="empty-state">
          <p>データが不足しています</p>
          <p style={{ fontSize: 13, marginTop: 0 }}>3ラウンド以上のデータが必要です</p>
        </div>
      ) : (
        <>
          {/* ── 全体統計 ── */}
          <section className="section">
            <div className="section-header">
              <h2>全体統計</h2>
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{stats.count}ラウンド</span>
            </div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{stats.avgGross}</div>
                <div className="stat-label">平均スコア</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.avgDiff ?? '--'}</div>
                <div className="stat-label">平均Diff</div>
              </div>
            </div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#e65100' }}>{stats.best}</div>
                <div className="stat-label">ベストスコア</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#546e7a' }}>{stats.worst}</div>
                <div className="stat-label">ワーストスコア</div>
              </div>
            </div>
          </section>

          {/* ── ホール別統計 ── */}
          {!filterCourseId ? (
            <div className="info-box">
              コースを選択するとホール別統計が表示されます
            </div>
          ) : holeRounds.length < 3 ? (
            <div className="info-box warning">
              ホール別統計にはホールごと入力で3ラウンド以上必要です（現在{holeRounds.length}ラウンド）
            </div>
          ) : holeStats && (
            <>
              {/* ホール別平均スコア */}
              <section className="section">
                <div className="section-header">
                  <h2>ホール別平均スコア</h2>
                </div>
                <div className="chart-card">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={holeStats} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="hole" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                      <Tooltip content={<CustomAvgTooltip />} />
                      <Bar dataKey="avg" name="平均スコア" radius={[3, 3, 0, 0]}>
                        {holeStats.map((entry, idx) => (
                          <Cell
                            key={idx}
                            fill={CATEGORY_COLORS[getAvgCategory(entry.avgDiff)] ?? '#999'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="chart-legend">
                    {[
                      { cat: 'birdie', label: 'バーディ以下' },
                      { cat: 'par',    label: 'パー相当' },
                      { cat: 'bogey',  label: 'ボギー相当' },
                      { cat: 'double', label: 'ダブル相当' },
                      { cat: 'triple', label: 'トリプル以上' },
                    ].map(({ cat, label }) => (
                      <div key={cat} className="chart-legend-item">
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: CATEGORY_COLORS[cat], flexShrink: 0 }} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ホール別スコア分布 */}
              <section className="section">
                <div className="section-header">
                  <h2>ホール別スコア分布</h2>
                </div>
                <div className="chart-card">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={holeStats} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="hole" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                      <Tooltip content={<CustomDistTooltip />} />
                      {DIST_LABELS.map((d, idx) => (
                        <Bar
                          key={d.key}
                          dataKey={d.key}
                          stackId="dist"
                          name={d.label}
                          fill={d.color}
                          radius={idx === DIST_LABELS.length - 1 ? [3, 3, 0, 0] : undefined}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="chart-legend">
                    {DIST_LABELS.map(d => (
                      <div key={d.key} className="chart-legend-item">
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        <span>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}

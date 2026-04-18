import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

// スコア色（index.css の変数に合わせる）
const CATEGORY_COLORS = {
  eagle:   '#e53935',  // 赤（マイナス平均）
  birdie:  '#ef6c00',  // オレンジ（0〜+0.5未満）
  par:     '#4dd0e1',  // 水色（+0.5〜+1未満）
  bogey:   '#1a237e',  // 紺色（+1〜+1.5未満）
  double:  '#2e7d32',  // 緑色（+1.5〜+2未満）
  triple:  '#212121',  // 黒色（+2以上）
}

const DIST_LABELS = [
  { key: 'birdieRate', label: 'バーディ以下', color: CATEGORY_COLORS.birdie },
  { key: 'parRate',    label: 'パー',         color: CATEGORY_COLORS.par    },
  { key: 'bogeyRate',  label: 'ボギー',       color: CATEGORY_COLORS.bogey  },
  { key: 'doubleRate', label: 'ダブルボギー', color: CATEGORY_COLORS.double },
  { key: 'tripleRate', label: 'トリプル以上', color: CATEGORY_COLORS.triple },
]

function getAvgCategory(avgDiff) {
  if (avgDiff <  0)    return 'eagle'
  if (avgDiff <  0.5)  return 'birdie'
  if (avgDiff <  1)    return 'par'
  if (avgDiff <  1.5)  return 'bogey'
  if (avgDiff <  2)    return 'double'
  return 'triple'
}

/** ホール番号 + par を2段で表示するカスタムXTick */
function makeXTick(holeStats) {
  return function CustomXTick({ x, y, payload }) {
    const hole = holeStats?.find(h => h.hole === payload.value)
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={12} textAnchor="middle" fontSize={11} fill="#555">{payload.value}</text>
        <text dy={24} textAnchor="middle" fontSize={9} fill="#aaa">P{hole?.par}</text>
      </g>
    )
  }
}

const CustomAvgTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const sign   = d.avgDiff >= 0 ? '+' : ''
  const cat    = getAvgCategory(d.avgDiff)
  const catLabel = {
    eagle:  'イーグル相当', birdie: 'バーディ相当', par: 'パー相当',
    bogey:  'ボギー相当',   double: 'ダブル相当',   triple: 'トリプル以上',
  }[cat]
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}番ホール (Par{d.par})</div>
      <div>平均: <strong>{d.avg}打</strong></div>
      <div style={{ color: CATEGORY_COLORS[cat] }}>
        差分: <strong>{sign}{d.avgDiff}</strong>（{catLabel}）
      </div>
    </div>
  )
}

const CustomDistTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}番ホール</div>
      {[...payload].reverse().map(p => (
        p.value > 0 && (
          <div key={p.dataKey} style={{ color: p.fill }}>
            {DIST_LABELS.find(d => d.key === p.dataKey)?.label}: <strong>{p.value}%</strong>
          </div>
        )
      ))}
    </div>
  )
}

/** par3/4/5 別カード */
function ParCard({ data, isBest, isWorst }) {
  const sign  = data.avgDiff >= 0 ? '+' : ''
  const cat   = getAvgCategory(data.avgDiff)
  const color = CATEGORY_COLORS[cat]
  const roundsPerHole = data.holeCount > 0 ? Math.round(data.count / data.holeCount) : 0

  return (
    <div className={`par-card${isBest ? ' par-card-best' : ''}${isWorst ? ' par-card-worst' : ''}`}>
      <div className="par-card-header">
        <span className="par-card-label">Par {data.par}</span>
        <span className="par-card-holes">{data.holeCount}H</span>
        {isBest && <span className="par-badge best">得意</span>}
        {isWorst && <span className="par-badge worst">苦手</span>}
      </div>
      <div className="par-card-avg" style={{ color }}>
        {sign}{data.avgDiff.toFixed(2)}
      </div>
      <div className="par-card-meta">{roundsPerHole}ラウンド平均</div>

      {/* 分布バー */}
      <div className="par-dist-bar">
        {DIST_LABELS.map(d =>
          data[d.key] > 0 && (
            <div
              key={d.key}
              className="par-dist-segment"
              style={{ flex: data[d.key], background: d.color }}
              title={`${d.label}: ${data[d.key]}%`}
            />
          )
        )}
      </div>

      {/* 分布テキスト */}
      <div className="par-dist-detail">
        {DIST_LABELS.map(d =>
          data[d.key] > 0 && (
            <span key={d.key} style={{ color: d.color }}>
              {d.label.charAt(0) === 'バ' ? 'B' :
               d.label.charAt(0) === 'パ' ? 'P' :
               d.label.charAt(0) === 'ボ' ? '1' :
               d.label.charAt(0) === 'ダ' ? '2' : '3+'}
              {data[d.key]}%
            </span>
          )
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   メインコンポーネント
   ════════════════════════════════════════════════════ */
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
    const courseRounds = rounds.filter(r =>
      r.courseId === filterCourseId && (!filterGreenId || r.greenId === filterGreenId)
    )
    const ids     = new Set(courseRounds.map(r => r.teeId).filter(Boolean))
    const teeList = filterGreenId && selectedGreen
      ? selectedGreen.tees
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
      count:    filteredRounds.length,
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

      const avg = hScores.reduce((s, v) => s + v, 0) / hScores.length
      let birdie = 0, parCnt = 0, bogey = 0, double_ = 0, triple = 0
      hScores.forEach(s => {
        const d = s - hole.par
        if (d <= -1)      birdie++
        else if (d === 0) parCnt++
        else if (d === 1) bogey++
        else if (d === 2) double_++
        else              triple++
      })
      const total = hScores.length
      const pct   = v => Math.round(v / total * 100)

      return {
        hole:        hole.number,
        par:         hole.par,
        avg:         Math.round(avg * 10) / 10,
        avgDiff:     Math.round((avg - hole.par) * 100) / 100,
        birdieRate:  pct(birdie),
        parRate:     pct(parCnt),
        bogeyRate:   pct(bogey),
        doubleRate:  pct(double_),
        tripleRate:  pct(triple),
      }
    }).filter(Boolean)
  }, [filterCourseId, holeRounds, courses])

  // ── par別統計 ──
  const parStats = useMemo(() => {
    if (!filterCourseId || holeRounds.length < 3) return null
    const course = courses.find(c => c.id === filterCourseId)
    if (!course) return null

    const buckets = { 3: [], 4: [], 5: [] }
    course.holes.forEach((hole, i) => {
      if (!(hole.par in buckets)) return
      holeRounds.forEach(r => {
        const s = r.scores[i]
        if (s > 0) buckets[hole.par].push(s - hole.par)
      })
    })

    const result = [3, 4, 5].map(par => {
      const diffs = buckets[par]
      if (diffs.length === 0) return null
      const avgDiff = diffs.reduce((s, v) => s + v, 0) / diffs.length
      const holeCount = course.holes.filter(h => h.par === par).length

      let birdie = 0, parCnt = 0, bogey = 0, double_ = 0, triple = 0
      diffs.forEach(d => {
        if (d <= -1)      birdie++
        else if (d === 0) parCnt++
        else if (d === 1) bogey++
        else if (d === 2) double_++
        else              triple++
      })
      const total = diffs.length
      const pct   = v => Math.round(v / total * 100)

      return {
        par,
        avgDiff:    Math.round(avgDiff * 100) / 100,
        count:      total,
        holeCount,
        birdieRate: pct(birdie),
        parRate:    pct(parCnt),
        bogeyRate:  pct(bogey),
        doubleRate: pct(double_),
        tripleRate: pct(triple),
      }
    }).filter(Boolean)

    // 得意・苦手の判定
    if (result.length < 2) return result
    const sorted    = [...result].sort((a, b) => a.avgDiff - b.avgDiff)
    const bestPar   = sorted[0].par
    const worstPar  = sorted[sorted.length - 1].par
    return result.map(r => ({ ...r, isBest: r.par === bestPar, isWorst: r.par === worstPar }))
  }, [filterCourseId, holeRounds, courses])

  // Y軸domain（差分チャート用、下限は-0.25固定）
  const avgDiffDomain = useMemo(() => {
    if (!holeStats) return [-0.25, 3]
    const diffs = holeStats.map(h => h.avgDiff)
    const maxV  = Math.max(...diffs, 0)
    return [-0.25, Math.ceil(maxV + 0.3)]
  }, [holeStats])

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
            {availableCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {availableGreens.length > 1 && (
          <div className="form-group">
            <label>グリーン</label>
            <select value={filterGreenId} onChange={e => handleGreenChange(e.target.value)} className="form-input">
              <option value="">すべてのグリーン</option>
              {availableGreens.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        {availableTees.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>ティー</label>
            <select value={filterTeeId} onChange={e => setFilterTeeId(e.target.value)} className="form-input">
              <option value="">すべてのティー</option>
              {availableTees.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
      </section>

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

          {/* ── ホール別統計（コース選択が必要） ── */}
          {!filterCourseId ? (
            <div className="info-box">
              コースを選択するとホール別・par別統計が表示されます
            </div>
          ) : holeRounds.length < 3 ? (
            <div className="info-box warning">
              ホール別統計にはホールごと入力で3ラウンド以上必要です（現在{holeRounds.length}ラウンド）
            </div>
          ) : (
            <>
              {/* ── par別統計 ── */}
              {parStats && parStats.length > 0 && (
                <section className="section">
                  <div className="section-header">
                    <h2>par別統計</h2>
                    <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>平均スコア差分</span>
                  </div>
                  <div className="par-cards-row">
                    {parStats.map(d => (
                      <ParCard key={d.par} data={d} isBest={d.isBest} isWorst={d.isWorst} />
                    ))}
                  </div>
                  <div className="chart-legend" style={{ marginTop: 0 }}>
                    {[
                      { label: 'B', full: 'バーディ以下', color: CATEGORY_COLORS.birdie },
                      { label: 'P', full: 'パー',         color: CATEGORY_COLORS.par    },
                      { label: '1', full: 'ボギー',       color: CATEGORY_COLORS.bogey  },
                      { label: '2', full: 'ダブルボギー', color: CATEGORY_COLORS.double },
                      { label: '3+',full: 'トリプル以上', color: CATEGORY_COLORS.triple },
                    ].map(item => (
                      <div key={item.label} className="chart-legend-item">
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                        <span>{item.label}={item.full}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {holeStats && (
                <>
                  {/* ── ホール別平均スコア差分グラフ ── */}
                  <section className="section">
                    <div className="section-header">
                      <h2>ホール別平均スコア差分</h2>
                      <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>0=パー基準</span>
                    </div>

                    {[
                      { label: 'アウト（1〜9番）',   data: holeStats.filter(h => h.hole <= 9) },
                      { label: 'イン（10〜18番）', data: holeStats.filter(h => h.hole >= 10) },
                    ].map(({ label, data }) => data.length > 0 && (
                      <div key={label} className="chart-card" style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>{label}</div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={data}
                            margin={{ top: 10, right: 5, bottom: 28, left: -10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="hole"
                              tick={makeXTick(data)}
                              height={38}
                              interval={0}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              domain={avgDiffDomain}
                              tickFormatter={v => v >= 0 ? `+${v}` : `${v}`}
                            />
                            <ReferenceLine y={0} stroke="#888" strokeWidth={1.5} />
                            <Tooltip content={<CustomAvgTooltip />} />
                            <Bar dataKey="avgDiff" name="平均差分" radius={[3, 3, 0, 0]}>
                              {data.map((entry, idx) => (
                                <Cell
                                  key={idx}
                                  fill={CATEGORY_COLORS[getAvgCategory(entry.avgDiff)]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ))}

                    <div className="chart-legend">
                      {[
                        { cat: 'eagle',  label: 'マイナス（イーグル相当）' },
                        { cat: 'birdie', label: '+0.5未満（バーディ相当）' },
                        { cat: 'par',    label: '+0.5〜+1未満（パー相当）' },
                        { cat: 'bogey',  label: '+1〜+1.5未満（ボギー相当）' },
                        { cat: 'double', label: '+1.5〜+2未満（ダブル相当）' },
                        { cat: 'triple', label: '+2以上（トリプル以上）' },
                      ].map(({ cat, label }) => (
                        <div key={cat} className="chart-legend-item">
                          <div style={{ width: 12, height: 12, borderRadius: 2, background: CATEGORY_COLORS[cat], flexShrink: 0 }} />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* ── ホール別スコア分布 ── */}
                  <section className="section">
                    <div className="section-header">
                      <h2>ホール別スコア分布</h2>
                    </div>

                    {[
                      { label: 'アウト（1〜9番）',   data: holeStats.filter(h => h.hole <= 9) },
                      { label: 'イン（10〜18番）', data: holeStats.filter(h => h.hole >= 10) },
                    ].map(({ label, data }) => data.length > 0 && (
                      <div key={label} className="chart-card" style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>{label}</div>
                        <ResponsiveContainer width="100%" height={210}>
                          <BarChart
                            data={data}
                            margin={{ top: 5, right: 5, bottom: 28, left: -10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="hole"
                              tick={makeXTick(data)}
                              height={38}
                              interval={0}
                            />
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
                      </div>
                    ))}

                    <div className="chart-legend">
                      {DIST_LABELS.map(d => (
                        <div key={d.key} className="chart-legend-item">
                          <div style={{ width: 12, height: 12, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                          <span>{d.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

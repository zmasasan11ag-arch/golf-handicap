import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { escLimit, getScoreCategory } from '../utils/handicapCalc.js'
import { findTee, defaultGreenId, defaultTeeId } from '../data/courses.js'

const INPUT_MODES = [
  { id: 'hole',  label: 'ホールごと' },
  { id: 'total', label: '合計スコア' },
  { id: 'image', label: '画像読み取り' },
]

export default function RoundForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { courses, rounds, addRound, updateRound, handicapIndex } = useApp()
  const isEdit = Boolean(id)

  const existingRound = isEdit ? rounds.find(r => r.id === id) : null

  const initCourseId = existingRound?.courseId || courses[0]?.id || ''
  const initCourse   = courses.find(c => c.id === initCourseId)
  const initGreenId  = existingRound?.greenId  || defaultGreenId(initCourse)
  const initTeeId    = existingRound?.teeId    || defaultTeeId(initCourse, initGreenId)

  // ---- フォーム状態 ----
  const [date,        setDate]        = useState(existingRound?.date || new Date().toISOString().slice(0, 10))
  const [courseId,    setCourseId]    = useState(initCourseId)
  const [greenId,     setGreenId]     = useState(initGreenId)
  const [teeId,       setTeeId]       = useState(initTeeId)
  const [inputMode,   setInputMode]   = useState(existingRound?.inputMode  || 'hole')
  const [scores,      setScores]      = useState(existingRound?.scores     || Array(18).fill(''))
  const [grossScore,  setGrossScore]  = useState(existingRound?.grossScore?.toString() || '')
  const [memo,        setMemo]        = useState(existingRound?.memo       || '')
  const [imagePreview, setImagePreview] = useState(existingRound?.imageDataUrl || null)

  const course = courses.find(c => c.id === courseId)
  const green  = course?.greens?.find(g => g.id === greenId)
  const tee    = findTee(course, greenId, teeId)

  // コース変更時: グリーン・ティーをリセット
  useEffect(() => {
    const newGreenId = defaultGreenId(course)
    setGreenId(newGreenId)
    setTeeId(defaultTeeId(course, newGreenId))
  }, [courseId])

  // グリーン変更時: 同名ティーがあれば維持、なければリセット
  useEffect(() => {
    if (!green) return
    const sameId = green.tees.find(t => t.id === teeId)
    if (!sameId) setTeeId(defaultTeeId(course, greenId))
  }, [greenId])

  // ホールごと入力の合計
  const holeTotal = scores.reduce((s, v) => s + (parseInt(v) || 0), 0)

  // ESC用コースハンデキャップ: CH = round(HI × Slope / 113)
  // HI未確定時はデフォルト20（→上限8打）
  const courseHandicap = (() => {
    if (!tee) return 20
    const hi = handicapIndex ?? 20
    return Math.round(hi * tee.slope / 113)
  })()

  function handleScoreChange(index, value) {
    const arr = [...scores]
    if (value === '') {
      arr[index] = ''
    } else {
      const n = parseInt(value)
      arr[index] = isNaN(n) ? '' : Math.max(1, n)
    }
    setScores(arr)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function validate() {
    if (!date)     return 'プレー日を入力してください'
    if (!courseId) return 'コースを選択してください'
    if (!greenId)  return 'グリーンを選択してください'
    if (!teeId)    return 'ティーを選択してください'
    if (inputMode === 'total') {
      const g = parseInt(grossScore)
      if (!g || g < 50 || g > 200) return '合計スコアを正しく入力してください（50〜200）'
    }
    if (inputMode === 'hole' || inputMode === 'image') {
      const filled = scores.filter(s => s !== '' && parseInt(s) >= 1)
      if (filled.length !== 18) return 'すべてのホールのスコアを入力してください'
    }
    return null
  }

  function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { alert(err); return }

    const parsedScores = scores.map(s => parseInt(s) || 0)
    const total = inputMode === 'total'
      ? parseInt(grossScore)
      : parsedScores.reduce((s, v) => s + v, 0)

    const roundData = {
      date,
      courseId,
      greenId,
      teeId,
      inputMode,
      scores: (inputMode === 'hole' || inputMode === 'image') ? parsedScores : [],
      grossScore: total,
      memo,
      imageDataUrl: inputMode === 'image' ? (imagePreview || null) : null,
    }

    if (isEdit) {
      updateRound(id, roundData)
    } else {
      addRound(roundData)
    }

    navigate('/rounds')
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>←</button>
        <h1>{isEdit ? 'ラウンド編集' : 'ラウンド追加'}</h1>
      </header>

      <form onSubmit={handleSubmit} className="form">
        {/* ── 基本情報 ── */}
        <section className="form-section">
          <h2 className="form-section-title">基本情報</h2>

          <div className="form-group">
            <label>プレー日</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>コース</label>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="form-input"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* グリーン選択（複数グリーンのコースのみ表示） */}
          {course?.greens?.length > 1 && (
            <div className="form-group">
              <label>グリーン</label>
              <div className="green-selector">
                {course.greens.map(g => (
                  <button
                    type="button"
                    key={g.id}
                    className={`green-btn${greenId === g.id ? ' selected' : ''}`}
                    onClick={() => setGreenId(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ティー選択 */}
          <div className="form-group">
            <label>ティー</label>
            <div className="tee-selector">
              {green?.tees.map(t => (
                <button
                  type="button"
                  key={t.id}
                  className={`tee-btn${teeId === t.id ? ' selected' : ''}`}
                  style={teeId === t.id
                    ? { background: t.color, color: t.textColor, borderColor: t.color }
                    : {}
                  }
                  onClick={() => setTeeId(t.id)}
                >
                  {t.name}
                  <small>CR{t.cr} / S{t.slope}</small>
                </button>
              ))}
            </div>
          </div>

          {tee && (
            <div className="info-box">
              コースハンデキャップ: <strong>{courseHandicap}</strong>
              {handicapIndex !== null
                ? `（HI ${handicapIndex.toFixed(1)}）`
                : '（HI未確定・デフォルト20使用）'
              }
            </div>
          )}
        </section>

        {/* ── スコア入力方式タブ ── */}
        <section className="form-section">
          <h2 className="form-section-title">スコア入力</h2>
          <div className="mode-tabs">
            {INPUT_MODES.map(m => (
              <button
                type="button"
                key={m.id}
                className={`mode-tab${inputMode === m.id ? ' active' : ''}`}
                onClick={() => setInputMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {(inputMode === 'hole') && course && (
            <HoleByHoleInput
              holes={course.holes}
              scores={scores}
              courseHandicap={courseHandicap}
              onChange={handleScoreChange}
              total={holeTotal}
            />
          )}

          {inputMode === 'total' && (
            <TotalInput
              grossScore={grossScore}
              onChange={setGrossScore}
              par={course?.par}
            />
          )}

          {inputMode === 'image' && course && (
            <ImageInput
              imagePreview={imagePreview}
              holes={course.holes}
              scores={scores}
              courseHandicap={courseHandicap}
              onChange={handleScoreChange}
              onImageChange={handleImageChange}
              total={holeTotal}
            />
          )}
        </section>

        {/* ── メモ ── */}
        <section className="form-section">
          <div className="form-group">
            <label>メモ（任意）</label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="form-input"
              rows={2}
              placeholder="天候・コンディションなど"
            />
          </div>
        </section>

        <button type="submit" className="btn btn-primary btn-full">
          {isEdit ? '更新する' : '保存する'}
        </button>
      </form>
    </div>
  )
}

/* ──────────────────────────────────────────────
   ホールごと入力（18ホール一覧、Tab/Enterで連続移動）
   ────────────────────────────────────────────── */
function HoleByHoleInput({ holes, scores, courseHandicap, onChange, total }) {
  const inputRefs = useRef([])

  function handleKeyDown(e, index) {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const front = holes.slice(0, 9)
  const back  = holes.slice(9, 18)

  const frontPar   = front.reduce((s, h) => s + h.par, 0)
  const backPar    = back.reduce((s, h)  => s + h.par, 0)
  const frontTotal = scores.slice(0, 9).reduce((s, v) => s + (parseInt(v) || 0), 0)
  const backTotal  = scores.slice(9, 18).reduce((s, v) => s + (parseInt(v) || 0), 0)

  return (
    <div className="hole-input-container">
      <ScoreGrid
        holes={front}
        scores={scores.slice(0, 9)}
        baseIndex={0}
        courseHandicap={courseHandicap}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        inputRefs={inputRefs}
        label="OUT"
        parTotal={frontPar}
        scoreTotal={frontTotal}
      />
      <ScoreGrid
        holes={back}
        scores={scores.slice(9, 18)}
        baseIndex={9}
        courseHandicap={courseHandicap}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        inputRefs={inputRefs}
        label="IN"
        parTotal={backPar}
        scoreTotal={backTotal}
      />
      <div className="total-row">
        <span>合計</span>
        <span className="total-score">{total > 0 ? total : '--'}</span>
      </div>
    </div>
  )
}

function ScoreGrid({ holes, scores, baseIndex, courseHandicap, onChange, onKeyDown, inputRefs, label, parTotal, scoreTotal }) {
  return (
    <div className="nine-hole-grid">

      {/* ホール番号 */}
      <div className="hole-grid-header">
        <div className="hg-label">H</div>
        {holes.map(h => <div key={h.number} className="hg-cell">{h.number}</div>)}
        <div className="hg-total">{label}</div>
      </div>

      {/* パー */}
      <div className="hole-grid-par">
        <div className="hg-label">Par</div>
        {holes.map(h => <div key={h.number} className="hg-cell">{h.par}</div>)}
        <div className="hg-total">{parTotal}</div>
      </div>

      {/* ESC上限 */}
      <div className="hole-grid-esc">
        <div className="hg-label">ESC</div>
        {holes.map(h => (
          <div key={h.number} className="hg-cell esc-limit">
            {escLimit(h.par, courseHandicap)}
          </div>
        ))}
        <div className="hg-total">-</div>
      </div>

      {/* スコア入力（色即時反映） */}
      <div className="hole-grid-score">
        <div className="hg-label">Score</div>
        {holes.map((h, i) => {
          const globalIdx = baseIndex + i
          const val    = scores[i]
          const parsed = parseInt(val)
          const cat    = parsed > 0 ? getScoreCategory(parsed, h.par) : ''
          return (
            <div key={h.number} className="hg-cell">
              <input
                ref={el => { inputRefs.current[globalIdx] = el }}
                type="number"
                inputMode="numeric"
                min="1"
                max="15"
                value={val === '' ? '' : val}
                onChange={e => onChange(globalIdx, e.target.value)}
                onKeyDown={e => onKeyDown(e, globalIdx)}
                onFocus={e => e.target.select()}
                className={`score-grid-input${cat ? ` sg-${cat}` : ''}`}
                placeholder="-"
                aria-label={`${h.number}番ホール スコア`}
              />
            </div>
          )
        })}
        <div className="hg-total">{scoreTotal > 0 ? scoreTotal : '--'}</div>
      </div>

    </div>
  )
}

/* ──────────────────────────────────────────────
   合計スコア入力
   ────────────────────────────────────────────── */
function TotalInput({ grossScore, onChange, par }) {
  const g = parseInt(grossScore)
  const toPar = g && par ? g - par : null

  return (
    <div className="total-input-container">
      <div className="form-group">
        <label>グロススコア</label>
        <input
          type="number"
          inputMode="numeric"
          min="50"
          max="200"
          value={grossScore}
          onChange={e => onChange(e.target.value)}
          className="form-input score-total-input"
          placeholder={par ? String(par + 20) : '90'}
        />
        {toPar !== null && (
          <div className="to-par-display">
            {toPar > 0 ? `+${toPar}` : toPar === 0 ? 'E' : String(toPar)}　（par {par}）
          </div>
        )}
      </div>
      <div className="info-box warning">
        合計スコア入力ではESC調整が適用されません。ホールごと入力を推奨します。
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   画像読み取り入力
   ────────────────────────────────────────────── */
function ImageInput({ imagePreview, holes, scores, courseHandicap, onChange, onImageChange, total }) {
  const fileRef = useRef(null)

  return (
    <div className="image-input-container">
      <div className="image-upload-area">
        {imagePreview ? (
          <div className="image-preview-wrapper">
            <img src={imagePreview} alt="スコアカード" className="scorecard-image" />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fileRef.current?.click()}
            >
              画像を変更
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="upload-btn"
            onClick={() => fileRef.current?.click()}
          >
            <span className="upload-icon">📷</span>
            <span>スコアカード画像を選択</span>
            <small>JPG / PNG / HEIC</small>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onImageChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="info-box">
        画像を確認しながら、スコアを入力してください。
      </div>

      <HoleByHoleInput
        holes={holes}
        scores={scores}
        courseHandicap={courseHandicap}
        onChange={onChange}
        total={total}
      />
    </div>
  )
}

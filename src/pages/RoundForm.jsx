import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { escLimit, getScoreCategory } from '../utils/handicapCalc.js'
import { findTee, defaultGreenId, defaultTeeId } from '../data/courses.js'
import TapSelector from '../components/TapSelector.jsx'

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
  const [date,          setDate]          = useState(existingRound?.date || new Date().toISOString().slice(0, 10))
  const [courseId,      setCourseId]      = useState(initCourseId)
  const [greenId,       setGreenId]       = useState(initGreenId)
  const [teeId,         setTeeId]         = useState(initTeeId)
  const [inputMode,     setInputMode]     = useState(existingRound?.inputMode  || 'hole')
  const [scores,        setScores]        = useState(existingRound?.scores     || Array(18).fill(''))
  const [putts,         setPutts]         = useState(existingRound?.putts      || Array(18).fill(2))
  const [grossScore,    setGrossScore]    = useState(existingRound?.grossScore?.toString() || '')
  const [memo,          setMemo]          = useState(existingRound?.memo       || '')
  const [isCompetition, setIsCompetition] = useState(existingRound?.isCompetition || false)
  const [imagePreview,  setImagePreview]  = useState(existingRound?.imageDataUrl || null)
  const [analyzing,     setAnalyzing]     = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState(null) // null | { type: 'ok' } | { type: 'error', message: string }

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

  function handleBulkFill(startIndex, endIndex, mode) {
    if (!course) return
    setScores(prev => {
      const arr = [...prev]
      for (let i = startIndex; i < endIndex; i++) {
        const hole = course.holes[i]
        arr[i] = mode === 'par' ? hole.par : hole.par + 1
      }
      return arr
    })
  }

  function handlePuttChange(index, value) {
    const arr = [...putts]
    if (value === '') {
      arr[index] = ''
    } else {
      const n = parseInt(value)
      arr[index] = isNaN(n) ? '' : Math.max(0, Math.min(6, n))
    }
    setPutts(arr)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const originalDataUrl = ev.target.result
      setImagePreview(originalDataUrl)
      setAnalysisStatus(null)
      setAnalyzing(true)
      try {
        // 大きな画像はリサイズしてからAPIへ送信（Vercel 4.5MB制限対策）
        const resized = await resizeImageForApi(originalDataUrl)
        const res = await fetch('/api/analyze-scorecard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: resized }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'AI解析に失敗しました')
        if (json.scores?.length === 18) {
          setScores(json.scores.map(s => (s > 0 ? s : '')))
          setAnalysisStatus({ type: 'ok' })
        } else {
          throw new Error('18ホール分のスコアを読み取れませんでした')
        }
      } catch (err) {
        setAnalysisStatus({ type: 'error', message: err.message })
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  /** 画像をJPEG・最大1920pxにリサイズしてAPIサイズ制限に対応 */
  async function resizeImageForApi(dataUrl, maxDim = 1920, quality = 0.85) {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width  = Math.floor(width  * ratio)
          height = Math.floor(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve(dataUrl) // リサイズ失敗時は元データをそのまま使用
      img.src = dataUrl
    })
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
      isCompetition,
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
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isCompetition}
                onChange={e => setIsCompetition(e.target.checked)}
                className="form-checkbox"
              />
              競技成績として登録する
            </label>
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
              putts={putts}
              courseHandicap={courseHandicap}
              onChange={handleScoreChange}
              onPuttChange={handlePuttChange}
              onBulkFill={handleBulkFill}
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
              putts={putts}
              courseHandicap={courseHandicap}
              onChange={handleScoreChange}
              onPuttChange={handlePuttChange}
              onBulkFill={handleBulkFill}
              onImageChange={handleImageChange}
              total={holeTotal}
              analyzing={analyzing}
              analysisStatus={analysisStatus}
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
function HoleByHoleInput({ holes, scores, putts, courseHandicap, onChange, onPuttChange, onBulkFill, total }) {
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
        putts={putts.slice(0, 9)}
        baseIndex={0}
        courseHandicap={courseHandicap}
        onChange={onChange}
        onPuttChange={onPuttChange}
        puttBaseIndex={0}
        onBulkFill={onBulkFill ? (mode) => onBulkFill(0, 9, mode) : null}
        onKeyDown={handleKeyDown}
        inputRefs={inputRefs}
        label="OUT"
        parTotal={frontPar}
        scoreTotal={frontTotal}
      />
      <ScoreGrid
        holes={back}
        scores={scores.slice(9, 18)}
        putts={putts.slice(9, 18)}
        baseIndex={9}
        courseHandicap={courseHandicap}
        onChange={onChange}
        onPuttChange={onPuttChange}
        puttBaseIndex={9}
        onBulkFill={onBulkFill ? (mode) => onBulkFill(9, 18, mode) : null}
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

function ScoreGrid({ holes, scores, putts, baseIndex, courseHandicap, onChange, onPuttChange, onBulkFill, onKeyDown, inputRefs, label, parTotal, scoreTotal, puttBaseIndex }) {
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

      {/* スコア入力（タップ選択式） */}
      <div className="hole-grid-score">
        <div className="hg-label">Score</div>
        {holes.map((h, i) => {
          const globalIdx = baseIndex + i
          const val    = scores[i]
          const parsed = parseInt(val)
          const cat    = parsed > 0 ? getScoreCategory(parsed, h.par) : ''
          const scoreOptions = [h.par - 1, h.par, h.par + 1, h.par + 2, h.par + 3]
          return (
            <div key={h.number} className="hg-cell">
              <TapSelector
                value={val}
                options={scoreOptions}
                onSelect={v => onChange(globalIdx, v)}
                className={`score-grid-input${cat ? ` sg-${cat}` : ''}`}
                minValue={1}
                maxValue={15}
                ariaLabel={`${h.number}番ホール（Par ${h.par}）スコア`}
              />
            </div>
          )
        })}
        <div className="hg-total">{scoreTotal > 0 ? scoreTotal : '--'}</div>
      </div>

      {/* パット入力 */}
      <div className="hole-grid-putt">
        <div className="hg-label">Putt</div>
        {holes.map((h, i) => {
          const globalIdx = puttBaseIndex + i
          const val = putts[i]
          const puttOptions = [0, 1, 2, 3, 4]
          return (
            <div key={h.number} className="hg-cell">
              <TapSelector
                value={val}
                options={puttOptions}
                onSelect={v => onPuttChange(globalIdx, v)}
                className="putt-grid-input"
                minValue={0}
                maxValue={6}
                placeholder="2"
                ariaLabel={`${h.number}番ホール パット数`}
              />
            </div>
          )
        })}
        <div className="hg-total">
          {putts.reduce((s, v) => s + (parseInt(v) || 0), 0) || '--'}
        </div>
      </div>

      {/* 一括入力ボタン */}
      {onBulkFill && (
        <div className="bulk-fill-row">
          <button
            type="button"
            className="btn-bulk-fill"
            onClick={() => onBulkFill('par')}
          >
            全パー
          </button>
          <button
            type="button"
            className="btn-bulk-fill"
            onClick={() => onBulkFill('bogey')}
          >
            全ボギー
          </button>
        </div>
      )}

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
   画像読み取り入力（AI自動解析付き）
   ────────────────────────────────────────────── */
function ImageInput({ imagePreview, holes, scores, courseHandicap, onChange, onBulkFill, onImageChange, total, analyzing, analysisStatus }) {
  const cameraRef  = useRef(null)
  const libraryRef = useRef(null)

  return (
    <div className="image-input-container">
      <div className="image-upload-area">
        {imagePreview ? (
          <div className="image-preview-wrapper">
            <img src={imagePreview} alt="スコアカード" className="scorecard-image" />
            <div className="image-change-btns">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => cameraRef.current?.click()}
                disabled={analyzing}
              >
                📷 カメラで撮影
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => libraryRef.current?.click()}
                disabled={analyzing}
              >
                🖼️ ライブラリから選択
              </button>
            </div>
          </div>
        ) : (
          <div className="upload-options">
            <button
              type="button"
              className="upload-btn"
              onClick={() => cameraRef.current?.click()}
            >
              <span className="upload-icon">📷</span>
              <span>カメラで撮影</span>
            </button>
            <button
              type="button"
              className="upload-btn"
              onClick={() => libraryRef.current?.click()}
            >
              <span className="upload-icon">🖼️</span>
              <span>ライブラリから選択</span>
              <small>カメラロール・スクリーンショット</small>
            </button>
          </div>
        )}
        {/* カメラ直接撮影用 */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onImageChange}
          style={{ display: 'none' }}
        />
        {/* フォトライブラリ・ファイル選択用（capture属性なし） */}
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          onChange={onImageChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* AI解析ステータス表示 */}
      {analyzing && (
        <div className="analysis-loading">
          <span className="analysis-spinner" />
          AIがスコアカードを解析中...
        </div>
      )}
      {!analyzing && analysisStatus?.type === 'ok' && (
        <div className="analysis-status ok">
          ✓ AIが18ホールのスコアを自動読み取りしました。内容を確認し、必要であれば修正してください。
        </div>
      )}
      {!analyzing && analysisStatus?.type === 'error' && (
        <div className="analysis-status error">
          ⚠ 自動読み取り失敗: {analysisStatus.message}<br />
          <small>手動でスコアを入力してください。</small>
        </div>
      )}
      {!analyzing && !analysisStatus && imagePreview && (
        <div className="info-box">
          画像を確認しながら、スコアを入力してください。
        </div>
      )}

      {imagePreview && (
        <HoleByHoleInput
          holes={holes}
          scores={scores}
          courseHandicap={courseHandicap}
          onChange={onChange}
          onBulkFill={onBulkFill}
          total={total}
        />
      )}
    </div>
  )
}

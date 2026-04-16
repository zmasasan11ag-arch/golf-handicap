import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function Settings() {
  const { userId, changeUserId, syncStatus } = useApp()
  const [inputId, setInputId] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = userId
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleApply = () => {
    const trimmed = inputId.trim()
    // UUID形式の簡易チェック
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      setError('正しいユーザーID（UUID形式）を入力してください')
      return
    }
    if (trimmed === userId) {
      setError('現在と同じユーザーIDです')
      return
    }
    setError('')
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    changeUserId(inputId.trim())
    setInputId('')
    setShowConfirm(false)
  }

  const syncLabel = {
    idle:    '',
    syncing: '同期中...',
    ok:      '同期済み',
    error:   'オフライン（ローカルデータを使用中）',
  }[syncStatus]

  const syncColor = {
    idle:    'var(--text-sub)',
    syncing: 'var(--green-dark)',
    ok:      'var(--green-dark)',
    error:   '#e07b00',
  }[syncStatus]

  return (
    <div className="page">
      <header className="page-header">
        <h1>設定</h1>
      </header>

      <div className="settings-section">
        <h2 className="settings-title">データ共有（端末間）</h2>
        <p className="settings-desc">
          このユーザーIDを別の端末で入力すると、同じデータを共有できます。
          ログイン不要です。
        </p>

        {/* 現在のユーザーID */}
        <div className="settings-card">
          <div className="settings-label">あなたのユーザーID</div>
          <div className="uid-display">
            <code className="uid-text">{userId}</code>
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
          {syncStatus !== 'idle' && (
            <div className="sync-status" style={{ color: syncColor }}>
              {syncLabel}
            </div>
          )}
        </div>

        {/* 別端末のIDを入力 */}
        <div className="settings-card">
          <div className="settings-label">別端末のユーザーIDで同期</div>
          <p className="settings-note">
            ⚠️ 切り替えると現在のデータが新しいIDのデータで上書きされます
          </p>
          <div className="uid-input-row">
            <input
              type="text"
              className="uid-input"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={inputId}
              onChange={e => { setInputId(e.target.value); setError('') }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleApply}
              disabled={!inputId.trim()}
            >
              適用
            </button>
          </div>
          {error && <div className="settings-error">{error}</div>}
        </div>

        {/* 確認ダイアログ */}
        {showConfirm && (
          <div className="confirm-overlay">
            <div className="confirm-dialog">
              <p>以下のユーザーIDに切り替えますか？</p>
              <code className="uid-text" style={{ wordBreak: 'break-all' }}>
                {inputId.trim()}
              </code>
              <p style={{ color: '#e07b00', fontSize: 13, marginTop: 8 }}>
                現在のデータはこのIDのデータで上書きされます。
              </p>
              <div className="confirm-actions">
                <button className="btn btn-primary btn-sm" onClick={handleConfirm}>
                  切り替える
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(false)}>
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

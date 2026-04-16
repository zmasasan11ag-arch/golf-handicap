import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { courses } from '../data/courses.js'
import { recalcAllRounds, calcHandicapIndex } from '../utils/handicapCalc.js'
import { loadFromStorage, saveToStorage } from '../utils/storage.js'
import { supabase, getOrCreateUserId, setUserId, fetchRounds, saveRounds } from '../lib/supabase.js'

const AppContext = createContext(null)

const STORAGE_KEY = 'golf_handicap_rounds'

export function AppProvider({ children }) {
  const [rawRounds, setRawRounds] = useState(() => loadFromStorage(STORAGE_KEY, []))
  const [userId, setUserIdState] = useState(() => getOrCreateUserId())
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'syncing' | 'ok' | 'error'

  // 初回 & userId変更時にSupabaseからデータ取得
  useEffect(() => {
    let cancelled = false
    async function loadFromSupabase() {
      setSyncStatus('syncing')
      const rounds = await fetchRounds(userId)
      if (cancelled) return
      if (rounds === null) {
        // ネットワークエラー — localStorageのデータをそのまま使用
        setSyncStatus('error')
      } else if (rounds.length > 0) {
        // Supabaseにデータあり → 上書き
        setRawRounds(rounds)
        saveToStorage(STORAGE_KEY, rounds)
        setSyncStatus('ok')
      } else {
        // Supabaseにデータなし → localStorageのデータをSupabaseへ同期
        const local = loadFromStorage(STORAGE_KEY, [])
        if (local.length > 0) {
          await saveRounds(userId, local)
        }
        setSyncStatus('ok')
      }
    }
    loadFromSupabase()
    return () => { cancelled = true }
  }, [userId])

  // rawRounds変更時: localStorageとSupabaseへ保存
  // 初回マウント直後（Supabase取得前）の保存は skip したいので ref で制御
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    saveToStorage(STORAGE_KEY, rawRounds)
    saveRounds(userId, rawRounds)
  }, [rawRounds, userId])

  // 全ラウンドを時系列で再計算
  const processedRounds = useMemo(() => recalcAllRounds(rawRounds, courses), [rawRounds])

  // 現在のハンデキャップインデックス
  const handicapIndex = useMemo(() => {
    const differentials = processedRounds.map(r => r.differential)
    return calcHandicapIndex(differentials)
  }, [processedRounds])

  function addRound(roundData) {
    const newRound = {
      ...roundData,
      id: `round_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    }
    setRawRounds(prev => [...prev, newRound])
    return newRound.id
  }

  function updateRound(id, data) {
    setRawRounds(prev =>
      prev.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r)
    )
  }

  function deleteRound(id) {
    setRawRounds(prev => prev.filter(r => r.id !== id))
  }

  /** ユーザーIDを切り替え（別端末のデータを読み込む） */
  const changeUserId = useCallback((newId) => {
    setUserId(newId)
    setUserIdState(newId)
    setRawRounds([]) // いったんクリア → useEffectで再取得
  }, [])

  // 表示用に日付降順でソート
  const sortedRounds = useMemo(() => {
    return [...processedRounds].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [processedRounds])

  return (
    <AppContext.Provider value={{
      rounds: sortedRounds,
      handicapIndex,
      courses,
      addRound,
      updateRound,
      deleteRound,
      userId,
      changeUserId,
      syncStatus,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

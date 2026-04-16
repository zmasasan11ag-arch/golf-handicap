import React, { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { courses } from '../data/courses.js'
import { recalcAllRounds, calcHandicapIndex } from '../utils/handicapCalc.js'
import { loadFromStorage, saveToStorage } from '../utils/storage.js'

const AppContext = createContext(null)

const STORAGE_KEY = 'golf_handicap_rounds'

export function AppProvider({ children }) {
  const [rawRounds, setRawRounds] = useState(() =>
    loadFromStorage(STORAGE_KEY, [])
  )

  // rawRoundsが変わるたびにlocalStorageへ保存
  useEffect(() => {
    saveToStorage(STORAGE_KEY, rawRounds)
  }, [rawRounds])

  // 全ラウンドを時系列で再計算（自動再計算）
  const processedRounds = useMemo(() => {
    return recalcAllRounds(rawRounds, courses)
  }, [rawRounds])

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

  // 表示用に日付降順でソート
  const sortedRounds = useMemo(() => {
    return [...processedRounds].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )
  }, [processedRounds])

  return (
    <AppContext.Provider value={{
      rounds: sortedRounds,
      handicapIndex,
      courses,
      addRound,
      updateRound,
      deleteRound,
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

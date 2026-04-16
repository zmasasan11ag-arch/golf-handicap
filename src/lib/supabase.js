import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const UID_KEY = 'golf_uid'

/** ユーザーIDを取得（なければ生成して保存） */
export function getOrCreateUserId() {
  let uid = localStorage.getItem(UID_KEY)
  if (!uid) {
    uid = crypto.randomUUID()
    localStorage.setItem(UID_KEY, uid)
  }
  return uid
}

/** ユーザーIDを書き換える（端末間共有用） */
export function setUserId(uid) {
  localStorage.setItem(UID_KEY, uid.trim())
}

/** Supabase からラウンドデータを取得 */
export async function fetchRounds(userId) {
  const { data, error } = await supabase
    .from('user_data')
    .select('rounds')
    .eq('user_id', userId)
    .single()

  if (error) {
    // レコードが存在しない場合は空配列を返す
    if (error.code === 'PGRST116') return []
    console.error('fetchRounds error:', error)
    return null // エラー時はnullで区別
  }
  return data?.rounds ?? []
}

/** Supabase にラウンドデータを保存（upsert） */
export async function saveRounds(userId, rounds) {
  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: userId, rounds, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) {
    console.error('saveRounds error:', error)
  }
}

/**
 * Vercel Serverless Function
 * スコアカード画像をAnthropicのAIで解析し、18ホール分のスコアを返す
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY が設定されていません。Vercelの環境変数に追加してください。'
    })
  }

  const { imageDataUrl } = req.body || {}
  if (!imageDataUrl) {
    return res.status(400).json({ error: '画像データがありません' })
  }

  // data URL から mediaType と base64 を分離
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+\-]+);base64,(.+)$/)
  if (!match) {
    return res.status(400).json({ error: '画像フォーマットが不正です' })
  }

  let [, mediaType, base64Data] = match
  // HEICはAnthropicが未対応のためJPEGとして処理
  if (mediaType === 'image/heic' || mediaType === 'image/heif') {
    mediaType = 'image/jpeg'
  }
  // Anthropic API が受け付ける形式に限定
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(mediaType)) {
    mediaType = 'image/jpeg'
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              }
            },
            {
              type: 'text',
              text: `このゴルフのスコアカード画像を解析し、1番ホールから18番ホールまでの各ホールのスコア（打数）を読み取ってください。

以下のJSON形式だけで返してください（他の文章は不要）：
{"scores": [ホール1, ホール2, ホール3, ホール4, ホール5, ホール6, ホール7, ホール8, ホール9, ホール10, ホール11, ホール12, ホール13, ホール14, ホール15, ホール16, ホール17, ホール18]}

ルール：
- 各ホールのスコアは整数（打数）
- 読み取れないホールは 0
- 必ず18個の数値を含める
- JSON以外のテキストは絶対に含めない`
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return res.status(502).json({ error: `AI APIエラー (${response.status})` })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    // JSONを抽出（前後にテキストが含まれていても対応）
    const jsonMatch = text.match(/\{[\s\S]*?"scores"[\s\S]*?\}/)
    if (!jsonMatch) {
      console.error('JSON not found in response:', text)
      return res.status(500).json({ error: 'スコアのJSON形式が見つかりませんでした' })
    }

    const parsed = JSON.parse(jsonMatch[0])
    const scores = parsed.scores

    if (!Array.isArray(scores) || scores.length !== 18) {
      return res.status(500).json({ error: `18ホール分を読み取れませんでした（${scores?.length ?? 0}ホール検出）` })
    }

    // 各スコアを整数に強制変換
    const normalized = scores.map(s => {
      const n = parseInt(s, 10)
      return isNaN(n) || n < 0 ? 0 : n
    })

    return res.status(200).json({ scores: normalized })

  } catch (err) {
    console.error('Handler error:', err)
    return res.status(500).json({ error: err.message || '不明なエラーが発生しました' })
  }
}

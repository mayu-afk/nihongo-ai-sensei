// Vercel Serverless Function — Claude API で日本語文法解析
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `あなたは日本語文法の専門家で、中国語母語話者向けに教えています。
以下の日本語文を分析し、最も重要な文法パターンを1つ選んで詳しく説明してください。

入力文：「${text}」

以下のJSON形式のみで回答してください（説明テキスト不要）：
{
  "name": "文法名（例：〜てもいい）",
  "romaji": "ローマ字（例：～te mo ii）",
  "level": "N5・N4・N3・N2・N1のいずれか",
  "tag_zh": "中国語タグ（例：可以做～（许可））",
  "summary_zh": "中国語での一言概要（20字以内）",
  "conj_rule": "接続規則（日本語・例：動詞て形＋もいい）",
  "conj_ex": "接続例（例：食べる→食べてもいい）",
  "detail_zh": "中国語での詳しい解説（3〜5文）",
  "examples": [
    {"ja": "自然な例文1", "zh": "中国語訳1"},
    {"ja": "自然な例文2", "zh": "中国語訳2"},
    {"ja": "自然な例文3", "zh": "中国語訳3"}
  ],
  "quiz": {
    "q_ja": "穴埋めクイズ問題文（＿＿を使う）",
    "q_zh": "クイズの中国語説明",
    "opts": [
      {"id": "A", "text": "正解の選択肢", "correct": true},
      {"id": "B", "text": "間違いの選択肢1", "correct": false},
      {"id": "C", "text": "間違いの選択肢2", "correct": false}
    ],
    "ok_msg": "正解時の一言メッセージ（日本語）",
    "ng_msg": "不正解時の解説（日本語・なぜ違うか）"
  }
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Claude API error', detail: err });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || '';

    // JSON部分だけ抽出
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ error: 'JSON parse failed', raw });

    const grammar = JSON.parse(match[0]);
    grammar.id = 'ai_' + Date.now();
    grammar.pat_str = '';
    grammar.ai_generated = true;

    return res.status(200).json(grammar);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

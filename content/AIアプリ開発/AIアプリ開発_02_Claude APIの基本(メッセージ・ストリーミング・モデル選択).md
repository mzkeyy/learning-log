---
title: "AIアプリ開発 02 Claude API の基本(メッセージ・ストリーミング・モデル選択)"
modified: 2026-10-26
---

## 準備
1. Claude Console(platform.claude.com)でアカウントを作り、**API キー**を発行
2. 使用上限(月の上限額)を設定しておく
3. キーは環境変数 `ANTHROPIC_API_KEY` に入れる。コードやリポジトリに書かない → [[APIキー・シークレット管理]]

```bash
npm install @anthropic-ai/sdk
```

## 最初の呼び出し
```ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()   // ANTHROPIC_API_KEY を自動で読む

const response = await client.messages.create({
  model: 'claude-opus-5-5',
  max_tokens: 16000,
  system: 'あなたは Web 開発の先生です。初学者にわかる言葉で、短く答えてください。',
  messages: [{ role: 'user', content: 'CORS とは何ですか?' }],
})

for (const block of response.content) {
  if (block.type === 'text') console.log(block.text)
}
console.log(response.usage)   // input_tokens / output_tokens(料金の確認に使う)
```
- エンドポイントは基本 **`POST /v1/messages` の1つだけ**。ツール・構造化出力・画像入力もこのリクエストのオプション
- `response.content` は**ブロックの配列**(`text`・`thinking`・`tool_use` など)。`type` で見分けてから読む
- `system` にはルール・役割・出力の形式など、**毎回変わらない指示**を書く

## 会話を続ける(状態を持たない)
```ts
const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: '私の名前は Mizu です。' },
  { role: 'assistant', content: 'こんにちは、Mizu さん。' },
  { role: 'user', content: '私の名前は?' },
]
const res = await client.messages.create({ model: 'claude-opus-5-5', max_tokens: 16000, messages })
```
- API は前回の会話を覚えていない。**履歴を毎回全部送る**(その分、入力トークンが増える → キャッシュで安くする)
- 最初のメッセージは `user`
- 型は SDK のもの(`Anthropic.MessageParam` など)を使う。自分で同じ型を作らない

## ストリーミング
```ts
const stream = client.messages.stream({
  model: 'claude-opus-5-5',
  max_tokens: 64000,
  messages: [{ role: 'user', content: 'Hono の特徴を説明して' }],
})

stream.on('text', (delta) => process.stdout.write(delta))   // 届いた分だけ表示

const final = await stream.finalMessage()   // 最後に完成したメッセージ全体
console.log(final.usage.output_tokens)
```
- 長い出力・大きい `max_tokens` のときは**ストリーミングにする**(タイムアウトを避ける。体感も速い)
- 中身は SSE(Server-Sent Events)。`content_block_delta` などのイベントが順に届く
- 画面への流し方 → [[AIアプリ開発_06_画面との連携(AI SDK・Hono・Next.js)]]

## stop_reason(なぜ止まったか)
| 値 | 意味 | 対応 |
| --- | --- | --- |
| `end_turn` | 答え終わった | 普通に使う |
| `max_tokens` | 上限で切れた | `max_tokens` を増やす / ストリーミングにする |
| `tool_use` | ツールを呼びたい | ツールを実行して結果を返す(→ 03) |
| `pause_turn` | サーバー側ツールの途中で一時停止 | そのまま送り直して続けさせる |
| `refusal` | 安全上の理由で断った | `stop_details` を見る。ユーザーに伝える |
- **`content` を読む前に `stop_reason` を確認する**

## thinking と effort
```ts
const res = await client.messages.create({
  model: 'claude-opus-5-5',
  max_tokens: 16000,
  thinking: { type: 'adaptive', display: 'summarized' },  // 考えた内容の要約も返す
  output_config: { effort: 'high' },                       // low | medium | high | xhigh | max
  messages: [{ role: 'user', content: 'この設計の問題点を挙げて' }],
})
```
- 現行モデルは **adaptive thinking**(どれだけ考えるかをモデルが決める)。昔の `budget_tokens` 指定は使えない
- 深さとコストは **effort** で調整する。分類・雑談は `low`、難しい推論やコーディングは `high` 以上
- Opus 5.5 は thinking を切れない(effort の既定は `medium`)。速さ優先なら effort を下げる
- 考えた過程は既定では返らない(空)。画面に「考え中…」の要約を出したいなら `display: 'summarized'`
- `temperature` などのサンプリング設定は現行モデルでは使えない(送るとエラー)

## モデルと料金(2026年10月時点・100万トークンあたり)
| モデル | ID | 入力 | 出力 | 向く用途 |
| --- | --- | --- | --- | --- |
| Claude Fable 5.1 | `claude-fable-5-1` | $10 | $50 | 最も難しい推論・長時間のエージェント |
| **Claude Opus 5.5** | `claude-opus-5-5` | $4 | $20 | **既定のおすすめ**。高品質なコーディング・エージェント |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2 | $10 | 速さと品質のバランス。日常的な処理 |
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 | 大量・高速な処理(分類・抜き出し)。10万トークンを超える入力は単価が上がる |
- どれもコンテキストは 100万トークン、出力は最大 12.8万トークン(Haiku 5.5 も同じ)
- モデル ID は**表のとおりに書く**(日付を付けたりしない)。使えるモデルと上限は `client.models.list()` で確認できる
- **まず一番良いモデルで作って評価 → 品質が保てる範囲で effort やモデルを下げる**のが安全な順番
- 料金を下げる方法(キャッシュ・バッチ・effort)→ [[AIアプリ開発_07_評価・コスト・セキュリティ・運用]]

### トークン数を先に数える
```ts
const { input_tokens } = await client.messages.countTokens({
  model: 'claude-opus-5-5',
  messages,
})
```
- 他社のトークナイザー(tiktoken など)で数えない。モデルごとに数え方が違う

## 画像・PDF を渡す
```ts
messages: [{
  role: 'user',
  content: [
    { type: 'image', source: { type: 'url', url: 'https://example.com/screen.png' } },
    { type: 'text', text: 'この画面の UI の問題点を3つ挙げて' },
  ],
}]
```
- PDF は `type: 'document'`(base64 か Files API の `file_id`)。同じファイルを何度も使うなら Files API で1回アップロード
- `citations: { enabled: true }` を付けると、答えのどこが文書のどこから来たかを返してくれる(→ 04)

## エラーとリトライ
| コード | 意味 | リトライ |
| --- | --- | --- |
| 400 | リクエストの形が違う(パラメータの誤り) | しない(直す) |
| 401 / 403 | キーが無効・権限なし | しない |
| 413 | リクエストが大きすぎる | しない(分割する) |
| **429** | **レート制限** | する(`retry-after` を待つ) |
| 500 / **529** | サーバー側の問題 / 混雑 | する |
```ts
try {
  await client.messages.create({ /* ... */ })
} catch (e) {
  if (e instanceof Anthropic.RateLimitError) { /* 少し待って再試行 or ユーザーに伝える */ }
  else if (e instanceof Anthropic.BadRequestError) { /* 自分のバグ。ログに残す */ }
  else if (e instanceof Anthropic.APIError) { console.error(e.status, e.message) }
  else throw e
}
```
- SDK は 408・409・429・5xx と通信エラーを**既定で2回まで自動リトライ**する(`maxRetries` で変更)
- エラーメッセージの文字列で判定しない。**型(`instanceof`)で分ける**
- タイムアウトの既定は10分(TypeScript はミリ秒で指定)

## 他のクラウドから使う
- Claude は Amazon Bedrock・Google Cloud(Vertex AI)・Microsoft Foundry からも使える。それぞれ専用のクライアント(`@anthropic-ai/bedrock-sdk` など)を使う
- 会社の AWS で請求をまとめたい、データを特定のクラウドに置きたい、などのときに選ぶ → [[AWS SAA]]

## 関連
- 前: [[AIアプリ開発_01_全体像(LLMの仕組み・できること・構成)]] / 次: [[AIアプリ開発_03_ツール使用と構造化出力]]
- 公式: https://platform.claude.com/docs/en/build-with-claude/working-with-messages , https://platform.claude.com/docs/en/build-with-claude/streaming , https://platform.claude.com/docs/en/about-claude/models/overview , https://platform.claude.com/docs/en/about-claude/pricing , https://platform.claude.com/docs/en/api/errors

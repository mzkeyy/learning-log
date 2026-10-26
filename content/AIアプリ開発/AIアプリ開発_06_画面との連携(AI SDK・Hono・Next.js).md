---
title: "AIアプリ開発 06 画面との連携(AI SDK・Hono・Next.js)"
modified: 2026-10-26
---

## 基本の形
```
[React の画面] ──POST /api/chat(会話の履歴)──▶ [サーバー] ──▶ LLM API
       ▲                                           │
       └──────── ストリーミングで少しずつ返す ◀──────┘
```
- **API キーを持つのはサーバーだけ**。画面は自分のサーバーの `/api/chat` を呼ぶ
- サーバーで**認証・利用制限・入力チェック**をしてから LLM を呼ぶ
- 返事はストリーミング(SSE)で流し、画面は届いた分から表示する

## Vercel AI SDK(`ai`)
複数社の LLM を**同じ書き方**で呼べるライブラリ + チャット画面用の React フック。2026年10月時点で v7。
```bash
npm install ai @ai-sdk/anthropic @ai-sdk/react zod
```
| パッケージ | 役割 |
| --- | --- |
| `ai` | `streamText` / `generateText` / `tool` / `embed` など(サーバー側) |
| `@ai-sdk/anthropic` など | 各社のプロバイダー。`anthropic('claude-opus-5-5')` のようにモデルを指定 |
| `@ai-sdk/react` | `useChat` などの画面側のフック(Svelte・Vue 版もある) |
- モデルを `'anthropic/claude-opus-5.5'` のような文字列で指定すると、Vercel AI Gateway 経由になる(Vercel のキーで各社を使える)
- 公式 SDK との使い分け: **画面との連携やモデルの差し替えが楽**なのが AI SDK。Claude 固有の新機能(effort・サーバーツール・Managed Agents など)をすぐ使いたいなら公式 SDK → [[AIアプリ開発_02_Claude APIの基本(メッセージ・ストリーミング・モデル選択)]]

### Next.js の Route Handler
```ts
// app/api/chat/route.ts
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req: Request) {
  // ★ ここで認証・利用回数のチェック
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: anthropic('claude-opus-5-5'),
    system: 'あなたは料理のアシスタントです。',
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
```

### 画面(`useChat`)
```tsx
'use client'
import { useChat } from '@ai-sdk/react'
import { useState } from 'react'

export default function Chat() {
  const { messages, sendMessage, status, stop } = useChat()   // 既定で /api/chat を呼ぶ
  const [input, setInput] = useState('')

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role === 'user' ? 'あなた' : 'AI'}: </strong>
          {m.parts.map((part, i) => (part.type === 'text' ? <span key={i}>{part.text}</span> : null))}
        </div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); sendMessage({ text: input }); setInput('') }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={status !== 'ready'} />
        {status === 'streaming' && <button type="button" onClick={stop}>停止</button>}
      </form>
    </div>
  )
}
```
- メッセージは `parts`(テキスト・ツール呼び出し・推論など)の配列。種類ごとに表示を変えられる
- `status` で「送信中・受信中・完了・エラー」を出し分ける。**停止ボタン**を付ける

### ツールを使わせる
```ts
import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'

const result = streamText({
  model: anthropic('claude-opus-5-5'),
  messages: await convertToModelMessages(messages),
  tools: {
    getRecipe: tool({
      description: '料理名からレシピを DB で探す',
      inputSchema: z.object({ dish: z.string() }),
      execute: async ({ dish }) => db.findRecipe(dish),
    }),
  },
  stopWhen: stepCountIs(5),   // ツール → 回答 のループを最大5ステップで止める
})
```
- 画面ではツール呼び出しも `parts` として届くので、「レシピを検索中…」のような表示ができる
- 複数ステップのエージェントは `ToolLoopAgent` クラスでも書ける

## Hono(Cloudflare Workers・Node.js)で書く
`toUIMessageStreamResponse()` は普通の `Response` を返すので、Hono でもそのまま返せる → [[Hono]]
```ts
import { Hono } from 'hono'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'

const app = new Hono<{ Bindings: { ANTHROPIC_API_KEY: string } }>()

app.post('/api/chat', requireUser, async (c) => {
  const anthropic = createAnthropic({ apiKey: c.env.ANTHROPIC_API_KEY })   // Workers は c.env から
  const { messages } = await c.req.json<{ messages: UIMessage[] }>()
  const result = streamText({
    model: anthropic('claude-opus-5-5'),
    messages: await convertToModelMessages(messages),
  })
  return result.toUIMessageStreamResponse()
})
```

### 公式 SDK + Hono の `streamSSE`
AI SDK を使わず、自分の形式で流す場合。
```ts
import Anthropic from '@anthropic-ai/sdk'
import { streamSSE } from 'hono/streaming'

app.post('/api/ask', requireUser, async (c) => {
  const { question } = await c.req.json<{ question: string }>()
  const client = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY })

  return streamSSE(c, async (sse) => {
    const stream = client.messages.stream({
      model: 'claude-opus-5-5',
      max_tokens: 64000,
      messages: [{ role: 'user', content: question }],
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        await sse.writeSSE({ event: 'text', data: event.delta.text })
      }
    }
    const final = await stream.finalMessage()
    await sse.writeSSE({ event: 'done', data: JSON.stringify(final.usage) })
  })
})
```
- ブラウザ側は `fetch` で読み取るか、`EventSource`(GET のみ)で受け取る
- ユーザーがページを閉じたら生成を止める(`c.req.raw.signal` を SDK の `signal` に渡す)と無駄な課金を防げる

## 画面の UX
- 返事が出始めるまでの間に「考え中…」を出す。thinking の要約を見せるのも手
- **停止・再生成・コピー**ボタン
- Markdown で返ってくるので、画面で Markdown を表示する(HTML をそのまま入れない → XSS 対策 → [[Webセキュリティ対策]])
- エラー(429・混雑)のときに、何が起きたかと再試行ボタンを出す
- 会話を保存するなら DB へ。共有リンクや削除機能も考える
- 「AI の回答は間違うことがある」旨の表示、出典リンク(RAG のとき)

## 関連
- 前: [[AIアプリ開発_05_エージェント(ループ・Agent SDK・Managed Agents)]] / 次: [[AIアプリ開発_07_評価・コスト・セキュリティ・運用]]
- [[Hono]] / [[Next.js]] / [[Cloudflare]] / [[shadcn-ui]]
- 公式: https://ai-sdk.dev/docs , https://ai-sdk.dev/docs/ai-sdk-ui/chatbot , https://hono.dev/docs/helpers/streaming

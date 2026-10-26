---
title: "Hono 06 実務(構成・テスト・JSX・v5 移行・AI 開発)"
modified: 2026-10-26
---

## フォルダ構成の例
```
src/
├── index.ts            # app を組み立てて export(入口)
├── routes/
│   ├── posts.ts        # new Hono().get(...).post(...)(チェーンで書く)
│   └── users.ts
├── middleware/
│   └── auth.ts         # createMiddleware で作る
├── schemas/
│   └── post.ts         # Zod のスキーマ(フロントと共有してもよい)
├── lib/
│   └── db.ts           # DB アクセス(Drizzle・Prisma など)
└── types.ts            # Bindings / Variables の型
```
```ts
// src/index.ts
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import posts from './routes/posts'
import users from './routes/users'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()
app.use(logger(), secureHeaders())

const routes = app.route('/posts', posts).route('/users', users)

app.onError((err, c) => c.json({ error: 'Internal Server Error' }, 500))  // v5 は (c) => ...

export default app
export type AppType = typeof routes
```

### 「コントローラー」は作らない(公式のベストプラクティス)
```ts
// 🙁 Rails 風: c の型が Context になり、パスパラメータが推論されない
const getBook = (c: Context) => c.json(c.req.param('id'))
app.get('/books/:id', getBook)

// 😃 パスの直後に書く
app.get('/books/:id', (c) => c.json(c.req.param('id')))
```
- どうしても分けたいなら `hono/factory` の `createFactory().createHandlers(...)` を使うと型が保たれる
- ハンドラは薄くして、**業務ロジックは普通の関数(`lib/` や サービス層)に出す**。テストもしやすい → [[DDD_05_アーキテクチャ(レイヤード・オニオン・クリーン・CQRS)]]

## テスト
`app.request()` に URL を渡すだけで、サーバーを起動せずにテストできる(Vitest など)。
```ts
import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('posts', () => {
  it('GET /posts', async () => {
    const res = await app.request('/posts')
    expect(res.status).toBe(200)
  })

  it('POST /posts', async () => {
    const res = await app.request('/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Hello', body: '...' }),
      headers: { 'Content-Type': 'application/json' },   // ★ 無いと json の検証で {} になる
    })
    expect(res.status).toBe(201)
  })

  it('c.env を差し替える', async () => {
    const res = await app.request('/posts', {}, { API_KEY: 'test', DB: mockDb })  // 第3引数 = c.env
    expect(res.status).toBe(200)
  })
})
```
- 型付きで呼ぶなら `hono/testing` の `testClient(app)`(RPC と同じ書き方: `client.posts.$get()`)
- Workers の本物のバインディング(D1・KV)で試すなら `@cloudflare/vitest-pool-workers`(Cloudflare 推奨)
- HEAD は GET と同じヘッダーで本文なしになることも確認しておく

## JSX(サーバー側で HTML を返す)
```json
// tsconfig.json
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "hono/jsx" } }
```
```tsx
// src/index.tsx
import { Hono } from 'hono'
import type { FC } from 'hono/jsx'

const Layout: FC = (props) => (
  <html>
    <body>{props.children}</body>
  </html>
)

const app = new Hono()
app.get('/', (c) => {
  const items = ['Hono', 'JSX']
  return c.html(
    <Layout>
      <h1>Hello</h1>
      <ul>{items.map((i) => <li>{i}</li>)}</ul>
    </Layout>
  )
})
```
- React ではなく **Hono 独自の軽い JSX**。文字列は自動でエスケープされる(`dangerouslySetInnerHTML` だけ例外)
- 非同期コンポーネント・`Suspense`(実験的)・ストリーミング・`<title>` などの巻き上げに対応
- `hono/jsx-renderer` ミドルウェアで共通レイアウトを `c.render()` で使える
- ブラウザ側で動かす `hono/jsx/dom` もある(`useState` などの React 互換フック。小さい島に向く)
- 本格的な画面は React + [[Vite]]、または HonoX(Hono のメタフレームワーク)や [[TanStack Start]]・[[Next.js]] を使う

## その他よく使うヘルパー
| import | 用途 |
| --- | --- |
| `hono/streaming` | `stream()` / `streamText()` / **`streamSSE()`**(AI の回答を少しずつ返す → [[AIアプリ開発_06_画面との連携(AI SDK・Hono・Next.js)]]) |
| `hono/ssg` | アプリから静的 HTML を書き出す(`toSSG`) |
| `hono/html` | テンプレートリテラルで HTML(JSX を使わない場合) |
| `hono/proxy` | 別のサーバーへ中継(`proxy(url, c.req)`) |
| `hono/conninfo` | 接続元 IP など(ランタイムごとのアダプターから) |
| `upgradeWebSocket` | WebSocket(各ランタイムのアダプターから import) |
```ts
import { streamSSE } from 'hono/streaming'

app.get('/sse', (c) =>
  streamSSE(c, async (stream) => {
    for (const word of ['Hello', 'Hono']) {
      await stream.writeSSE({ data: word })
      await stream.sleep(500)
    }
  })
)
```

## v4 → v5 の主な変更(2026年10月時点は RC)
| 変更 | 対応 |
| --- | --- |
| **ESM のみ**(CommonJS 版なし) | Node.js は **22.12 以上**(`require('hono')` もそこなら動く) |
| **アダプターが別パッケージ** | `hono/bun` → `@hono/bun`、`hono/vercel` → `@hono/vercel` などに import を変える |
| `hono/cloudflare-pages` 廃止 | Workers + Static Assets に移る |
| `onError((err, c) => ...)` → **`onError((c) => ...)`** | エラーは `c.error` から読む。`notFound` と同じくパス指定・複数登録ができる |
| 文字列などを `throw` しても `onError` に来る | `c.error.cause` に元の値 |
| `c.req.query()`(キー指定なし)の値が `string \| undefined` | 存在チェックを書く |
| `c.req.json()` が `unknown` を返す | 型引数を付けるか、**バリデーターを使う** |
| `c.json(undefined)` が例外 | 返す値を確認 |
| ワイルドカード `*` の一致がルーター間で統一 | `/x*/y` のようなルートを確認 |
| 非推奨 API の削除 | `app.mount()` → `hono/mount`、`app.fire()` → `@hono/service-worker`、`c.req.routePath` → `hono/route` の `routePath(c)` |
- 移行手順: `npm install hono@next` → 型エラーと import エラーを順に直す → `app.request()` のテストで動作確認

## AI 開発(Claude Code など)で使うとき
- Hono は API が小さく Web 標準なので **AI が書きやすい**部類。ただし v4 / v5 の書き方が混ざりやすいので、**使っている版を CLAUDE.md / AGENTS.md に書いておく** → [[mdファイル使い分け]]
- 公式が AI 向けの資料を用意している
  - `https://hono.dev/llms.txt`(全ページの一覧)・`llms-full.txt`(全文)・`llms-small.txt`(短縮版)
  - 各ページは `Accept: text/markdown` で Markdown として取れる
  - **Hono Skills**(`npx skills add honojs/skills`): `hono`・`hono-jsx` の Agent Skills → [[09_Skills]]
  - **Hono CLI**(`npm i -D @hono/cli`): サーバーを立てずに `hono routes`(ルート一覧)・`hono request /users`(1回リクエスト)・`hono batch`・`hono snapshot`・`hono diff` を JSON で返す。AI に動作確認させやすい
- AI に任せたあとに見るところ
  - ハンドラがチェーンで書かれているか(RPC の型)、コントローラーに分けていないか
  - 入力にバリデーターが付いているか、`c.req.json()` を素で使っていないか
  - 秘密がコードに直書きされていないか(`c.env` から読む)
  - CORS の `origin` が `*` になっていないか、エラーの詳細を返していないか

## 本番前チェックリスト
- [ ] すべての入力(json・query・param・header)をバリデーション
- [ ] `onError` で 500 の中身を隠し、ログに出す。`notFound` を JSON で返す
- [ ] `secureHeaders()`・CORS の許可オリジン・CSRF(Cookie 認証なら)・`bodyLimit`
- [ ] 認証が必要なルートにミドルウェアが付いている(`/api/*` などのパス指定の漏れ)
- [ ] シークレットは `wrangler secret` / 環境変数。`.dev.vars`・`.env` は git に入れない
- [ ] `app.request()` のテストが CI で通る
- [ ] Hono のバージョンをフロントとサーバーで揃えている(RPC)
- [ ] Workers なら `observability` を有効化してログを見られる → [[Cloudflare_06_運用・制限・ベストプラクティス]]

## Hono を選ぶ?
- **選ぶ**: API サーバーを TypeScript で書きたい、Cloudflare Workers に置きたい、フロントと型を共有したい、Express から軽いものに移りたい
- **他を選ぶ**: 画面中心のアプリ → [[Next.js]] / [[TanStack Start]]、PHP で管理画面込みの業務アプリ → [[Laravel]]
- 組み合わせ: 「フロントは React + Vite、API は Hono on Workers + D1、RPC でつなぐ」は個人開発の定番構成

## 関連
- 前: [[Hono_05_ランタイム別の動かし方とデプロイ]] / 目次: [[Hono]]
- 公式: https://hono.dev/docs/guides/best-practices , https://hono.dev/docs/guides/testing , https://hono.dev/docs/helpers/testing , https://hono.dev/docs/guides/jsx , https://hono.dev/docs/helpers/streaming , https://hono.dev/docs/guides/migrating-to-v5 , https://hono.dev/docs/agents/

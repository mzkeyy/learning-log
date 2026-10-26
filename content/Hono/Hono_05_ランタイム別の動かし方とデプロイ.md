---
title: "Hono 05 ランタイム別の動かし方とデプロイ"
modified: 2026-10-26
---

## 考え方
- アプリのコード(`app.get(...)` など)は**どこでも同じ**。変わるのは**入口**と、静的ファイル・WebSocket などランタイムに依存する部分(アダプター)だけ
- v4 はアダプターが `hono/<ランタイム>` に同梱。**v5 では `@hono/<ランタイム>` の別パッケージ**になる(下の表の右列)

| ランタイム | 入口 | アダプター(v4 → v5) |
| --- | --- | --- |
| Cloudflare Workers | `export default app` | `hono/cloudflare-workers` → `@hono/cloudflare-workers` |
| Bun | `export default app`(ポート変更は `{ port, fetch: app.fetch }`) | `hono/bun` → `@hono/bun` |
| Deno | `Deno.serve(app.fetch)` | `hono/deno` → `@hono/deno` |
| Node.js | `serve(app)` | `@hono/node-server`(元から別パッケージ) |
| Vercel / Next.js | `export const GET = handle(app)` | `hono/vercel` → `@hono/vercel` |
| AWS Lambda | `export const handler = handle(app)` | `hono/aws-lambda` → `@hono/aws-lambda` |
| Cloudflare Pages | — | `hono/cloudflare-pages` は **v5 で廃止**。Workers + Static Assets へ |

## Cloudflare Workers(相性が一番よい)
```bash
npm create hono@latest my-app -- --template cloudflare-workers
npm run dev      # wrangler dev → http://localhost:8787
npm run deploy   # wrangler deploy
```
Workers の基本(wrangler・設定ファイル・ドメイン)→ [[Cloudflare_02_Workersの基本(作成・Wrangler・設定)]]

### バインディング(D1・KV・R2・環境変数)は `c.env`
```bash
npx wrangler types --env-interface CloudflareBindings   # wrangler.jsonc から型を生成
```
```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()

app.put('/upload/:key', async (c) => {
  const key = c.req.param('key')
  await c.env.MY_BUCKET.put(key, c.req.raw.body)   // R2
  return c.text(`Put ${key}`)
})

app.get('/posts', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM posts LIMIT 20').all()  // D1
  return c.json(results)
})
```
- `--env-interface` を付けるのは、Hono の `Env` 型と名前がぶつからないようにするため
- 型を**手書きしない**(設定とずれる)
- 各サービスの使い方 → [[Cloudflare_03_バインディングとデータ保存(D1・R2・KV・DO・Queues)]]

### 環境変数・シークレット
- 開発: プロジェクト直下の `.dev.vars`(または `.env`)に `KEY=value`。**git に入れない**
- 本番: `npx wrangler secret put API_KEY`
- コードでは `c.env.API_KEY`。`process.env` ではない
- ランタイムを問わず読みたいときは `hono/adapter` の `env(c)`(v5 でも `hono` に残る)
- 詳しく → [[Cloudflare_04_環境変数・シークレット・環境分離]] / [[APIキー・シークレット管理]]

### 静的ファイル・ほかのハンドラ
```jsonc
// wrangler.jsonc: ./public の中身を配信(/static/hello.txt など)
"assets": { "directory": "public" }
```
```ts
// Cron(scheduled)や Queues と一緒に使う
export default {
  fetch: app.fetch,
  scheduled: async (event, env, ctx) => { /* 定期処理 */ },
}
```
- 画面込みのアプリは `cloudflare-workers+vite` テンプレート(`@cloudflare/vite-plugin` + JSX の SSR)が公式のおすすめ → [[Cloudflare_05_フレームワーク連携とデプロイ]]

### GitHub Actions でデプロイ
```yaml
# .github/workflows/deploy.yml
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}   # 「Edit Cloudflare Workers」テンプレートで作ったトークン
```
→ [[Cicdパイプライン]]

## Node.js
```bash
npm create hono@latest my-app -- --template nodejs
```
```ts
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

const app = new Hono()
app.use('/static/*', serveStatic({ root: './' }))
app.get('/', (c) => c.text('Hello Node.js!'))

const server = serve({ fetch: app.fetch, port: 3000 })

// 終了シグナルで接続を閉じてから終わる(コンテナで大事)
process.on('SIGTERM', () => server.close(() => process.exit(0)))
```
- 環境変数は `process.env`(または `env(c)`)
- 元の Node.js の `req` / `res` は `c.env.incoming` / `c.env.outgoing`(型は `HttpBindings`)
- WebSocket は `@hono/node-server` に内蔵(`ws` を入れて `serve({ websocket: { server: wss } })`)。`@hono/node-ws` は非推奨
- v5 は **Node.js 22.12 以上**が必要
- Docker・Cloud Run・Railway・Fly.io などコンテナで動かすならこれ

## Bun / Deno
```ts
// Bun: src/index.ts
const app = new Hono()
app.get('/', (c) => c.text('Hello Bun!'))
export default { port: 3000, fetch: app.fetch }
```
```ts
// Deno: main.ts(テンプレートの deno.json が 'hono' の参照先を設定済み。JSR では @hono/hono)
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello Deno!'))
Deno.serve(app.fetch)
```
- Deno ではミドルウェアと本体の**バージョンを揃える**(違うとバグる)

## Next.js の中で使う
`app/api/[[...route]]/route.ts` に置くと、`/api/*` を全部 Hono で受けられる。
```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'     // v5 は '@hono/vercel'

const app = new Hono().basePath('/api')

app.get('/hello', (c) => c.json({ message: 'Hello Next.js!' }))

export const GET = handle(app)
export const POST = handle(app)
```
- `basePath` を**フォルダの位置と合わせる**(`/api`)
- 画面は Next.js、API は Hono(RPC でフロントから型付きで呼ぶ)という分担ができる → [[Next.js]]
- 単独で Vercel に置くなら `vercel` テンプレート

## AWS Lambda
```ts
import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'   // v5 は '@hono/aws-lambda'

const app = new Hono()
app.get('/', (c) => c.text('Hello Lambda!'))

export const handler = handle(app)
```
- API Gateway・Lambda Function URL の前に置く。CDK や SAM でデプロイ → [[AWS SAA]]

## どこに置くか
| 置き場所 | 向く場面 |
| --- | --- |
| **Cloudflare Workers** | 個人開発・API・世界中から速く。無料枠が大きい。D1・R2・KV がすぐ使える |
| Node.js(コンテナ) | 既存のサーバー・長時間の処理・Node 専用ライブラリを使う |
| Vercel / Next.js | Next.js のアプリに API を足す |
| AWS Lambda | 既に AWS で組んでいる |
| Bun / Deno | そのランタイムを使いたい |

## 関連
- 前: [[Hono_04_バリデーションとRPC(Zod・hc)]] / 次: [[Hono_06_実務(構成・テスト・JSX・v5移行・AI開発)]]
- [[Cloudflare]] / [[Next.js]] / [[Cicdパイプライン]]
- 公式: https://hono.dev/docs/getting-started/cloudflare-workers , https://hono.dev/docs/getting-started/nodejs , https://hono.dev/docs/getting-started/bun , https://hono.dev/docs/getting-started/deno , https://hono.dev/docs/getting-started/nextjs , https://hono.dev/docs/getting-started/aws-lambda

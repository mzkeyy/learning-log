---
title: "TanStack Start 04 ミドルウェア・Server Routes・環境変数"
modified: 2026-09-29
---

## ミドルウェア
Server Function やサーバーへのリクエストの**前後に処理を挟む**仕組み。用途: 認証、認可、ログ、CSP、監視、共通データ(context)の受け渡し、エラー処理。

### 2種類
| | リクエストミドルウェア | Server Function ミドルウェア |
| --- | --- | --- |
| 対象 | 全サーバーリクエスト(SSR・Server Routes・Server Functions) | Server Functions のみ |
| メソッド | `.server()` | `.client()` `.server()` `.validator()` |
| 作り方 | `createMiddleware()` | `createMiddleware({ type: 'function' })` |

### 認証ミドルウェアの例(実務の定番)
```ts
// src/middleware/auth.ts
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const session = await getSessionFromCookie(getRequestHeader('cookie'))
  if (!session) throw new Error('Unauthorized')
  return next({ context: { user: session.user } })   // ★ 後続に user を渡す
})
```
```ts
// 使う側
export const getMyOrders = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return db.orders.findMany({ where: { userId: context.user.id } })   // context.user が型付きで使える
  })
```
- `next()` を呼ばないと次へ進まない(早期リターンで打ち切り可能)
- `.middleware([a, b])` で合成・依存関係を作れる

### グローバルミドルウェア(src/start.ts)
```ts
import { createStart, createCsrfMiddleware } from '@tanstack/react-start'
export const startInstance = createStart(() => ({
  requestMiddleware: [createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' }), loggingMiddleware],
  functionMiddleware: [/* 全 Server Function 共通 */],
}))
```
- ⚠️ `src/start.ts` を作らない場合は CSRF ミドルウェアが自動で入る。**自分で作る場合は自分で入れる**

## Server Routes(API エンドポイント)
外部(Webhook、モバイルアプリ、他サービス)から呼ばれる HTTP API。`src/routes/` に普通のルートと並べて置く。
```ts
// src/routes/api/hello.ts → /api/hello
import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: async ({ request }) => new Response('Hello, World!'),
      POST: async ({ request }) => {
        const body = await request.json()
        return Response.json({ message: `Hello, ${body.name}!` })
      },
    },
  },
})
```
- 同じファイルに `component` も書ける(画面と API を同居)
- ファイル規約はルートと同じ(`users/$id.ts` → `/users/$id`、`my-script[.]js.ts` → `/my-script.js`)
- 1つのパスにハンドラーファイルは1つだけ
- ミドルウェアも適用できる

### Server Function と Server Routes の使い分け
| | Server Function | Server Route |
| --- | --- | --- |
| 呼ぶ人 | 自分のアプリ内 | 外部も |
| 型 | 入出力が自動で型付き | 自分で HTTP を扱う |
| 用途 | 画面のデータ取得・更新 | Webhook、公開API、ファイル配信 |

## 環境変数
```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb   # サーバー専用
VITE_APP_NAME=My App                                      # ブラウザにも公開(Vite の場合)
```
```ts
// サーバー:何でも読める(handler の中で読む)
const getUser = createServerFn().handler(async () => {
  const db = await connect(process.env.DATABASE_URL)
  return db.user.findFirst()
})
// ブラウザ:VITE_ 付きだけ
<h1>{import.meta.env.VITE_APP_NAME}</h1>
```
- **リクエストごとに読む。モジュールのトップで読まない**(Cloudflare Workers ではリクエスト時まで env が存在しない)
- Rsbuild の場合、公開用接頭辞は `PUBLIC_`
- 秘密に `VITE_` を付けない。本番ビルドの出力に秘密が混ざっていないかテスト用の値で検索して確認(公式チェックリスト)
- 必須の変数は起動時に検証(Zod など)して、無ければ分かりやすく失敗させる
- 型付け: `vite-env.d.ts` で `ImportMetaEnv` を拡張

## 関連
- 前: [[TanStack Start_03_実行モデルとServer Functions]] / 次: [[TanStack Start_05_レンダリング戦略・SEO・TanStack Query]]
- [[APIキー・シークレット管理]]
- 公式: https://tanstack.com/start/latest/docs/framework/react/guide/middleware , https://tanstack.com/start/latest/docs/framework/react/guide/server-routes , https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables

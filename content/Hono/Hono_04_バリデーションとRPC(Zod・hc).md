---
title: "Hono 04 バリデーションと RPC(Zod・hc)"
modified: 2026-10-26
---

## なぜバリデーションか
- `c.req.json()` や `c.req.query()` の値は**外から来た信用できない値**。型が付いていても中身は保証されない
- Hono のバリデーターは**ミドルウェア**として書き、ハンドラでは `c.req.valid('json')` で**検証済みの値**だけを使う
- 検証の型がそのままクライアント(`hc`)にも伝わる → RPC

## 検証できる場所
| ターゲット | 中身 | 注意 |
| --- | --- | --- |
| `json` | JSON 本文 | リクエストに `Content-Type: application/json` が**必要**(無いと `{}` になる) |
| `form` | フォーム(`multipart/form-data`・`urlencoded`) | 同上 |
| `query` | クエリ文字列 | 値は文字列。数値は `z.coerce.number()` で変換 |
| `param` | パスパラメータ | 同上 |
| `header` | ヘッダー | キーは**小文字**で書く(`idempotency-key`) |
| `cookie` | Cookie | |

## 手書きのバリデーター(仕組みを知る)
```ts
import { validator } from 'hono/validator'

app.post(
  '/posts',
  validator('form', (value, c) => {
    const body = value['body']
    if (!body || typeof body !== 'string') {
      return c.text('Invalid!', 400)   // Response を返すとここで終わる
    }
    return { body }                     // 返した値が c.req.valid('form') になる
  }),
  (c) => {
    const { body } = c.req.valid('form')
    return c.json({ message: 'Created!' }, 201)
  }
)
```

## Zod で書く(おすすめ)
```bash
npm i zod @hono/zod-validator
```
```ts
import * as z from 'zod'
import { zValidator } from '@hono/zod-validator'

const createPost = z.object({
  title: z.string().min(1).max(100),
  body: z.string().max(10_000),
})

app.post('/posts', zValidator('json', createPost), (c) => {
  const { title, body } = c.req.valid('json')   // 型: { title: string; body: string }
  return c.json({ ok: true, title }, 201)
})
```
- 失敗すると自動で 400 を返す。返し方を変えるなら第3引数にフックを渡す
```ts
zValidator('json', createPost, (result, c) => {
  if (!result.success) return c.json({ error: 'invalid input' }, 400)
})
```
- 1つのルートに `param`・`query`・`json` の検証を並べられる

### Standard Schema(ライブラリを選ばない)
```ts
import { sValidator } from '@hono/standard-validator'
import * as v from 'valibot'

app.post('/author', sValidator('json', v.object({ name: v.string(), age: v.number() })), (c) => {
  const data = c.req.valid('json')
  return c.json({ message: `${data.name} is ${data.age}` })
})
```
- Zod・Valibot・ArkType など **Standard Schema 対応**のライブラリならどれでも同じ書き方
- OpenAPI(Swagger)のドキュメントも出したいなら `@hono/zod-openapi` や `hono-openapi`

## RPC: サーバーの型をクライアントで使う
サーバーの `typeof app` を export して、クライアントの `hc` に渡すと、**パス・メソッド・入力・レスポンスの型**が補完される。コード生成は要らない。

### サーバー
```ts
// server.ts
const app = new Hono()
  .get('/posts/:id', zValidator('param', z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid('param')
    const post = await findPost(id)
    if (!post) return c.json({ error: 'not found' }, 404)   // ステータスを明示
    return c.json({ post }, 200)
  })
  .post('/posts', zValidator('json', createPost), async (c) => {
    const input = c.req.valid('json')
    return c.json({ ok: true, input }, 201)
  })

export default app
export type AppType = typeof app      // 型だけ export
```
> [!warning] RPC で型が取れなくなる書き方
> - `app.get(...)` を**チェーンせず**別々の文で書く → 型が積み上がらない
> - ハンドラを別ファイルの関数(コントローラー)にする → パスパラメータなどの推論が切れる
> - `c.notFound()` で 404 を返す → クライアント側で `unknown` になる。`c.json({...}, 404)` で返す
> - `.then()` チェーンで返す → `unknown`。`async` / `await` で書く

### クライアント
```ts
// client.ts(フロントエンド)
import { hc } from 'hono/client'
import type { AppType } from '../server'   // import type なのでサーバーのコードは混ざらない

const client = hc<AppType>('http://localhost:8787/')

const res = await client.posts[':id'].$get({ param: { id: '123' } })
if (res.status === 404) {
  const { error } = await res.json()   // { error: string }
} else if (res.ok) {
  const { post } = await res.json()    // { post: Post }
}

await client.posts.$post({ json: { title: 'Hello', body: '...' } })
```
- 戻り値は普通の fetch の `Response`。`res.json()` に型が付く
- パスパラメータ・クエリは**文字列で渡す**(サーバー側のバリデーターで数値に変換)
- Cookie を送る: `hc<AppType>(url, { init: { credentials: 'include' } })`
- ヘッダーは第2引数: `client.search.$get({ query }, { headers: { Authorization: 'Bearer ...' } })`
- 便利な型・関数

| 名前 | 用途 |
| --- | --- |
| `InferRequestType<typeof client.posts.$post>` | 入力の型 |
| `InferResponseType<typeof client.posts.$get, 200>` | ステータスごとのレスポンスの型 |
| `client.posts.$url()` / `$path()` | URL / パス文字列を作る |
| `parseResponse(client.x.$get())` | ok でなければ例外、ok なら型付きで中身を返す |
| `ApplyGlobalResponse<typeof app, {...}>` | `onError` が返すエラーの型を全ルートに足す |
- TanStack Query・SWR と組み合わせてもよい(`queryFn` の中で `client.xxx.$get()`)

### 大きいアプリでの RPC
```ts
// index.ts
import authors from './routes/authors'   // それぞれ new Hono().get(...).post(...) とチェーン
import books from './routes/books'

const app = new Hono()
const routes = app.route('/authors', authors).route('/books', books)

export default app
export type AppType = typeof routes
```
- **ルートが増えると IDE が重くなる**(型の計算が多い)。対策:
  - サーバーとクライアントで **Hono のバージョンを揃える**(ズレると "Type instantiation is excessively deep")
  - モノレポでは `tsconfig` の `strict: true` を両方に、必要なら project references
  - `tsc` で先にコンパイルして型を確定させる(`hcWithType` パターン)
  - クライアントをルートごとに分ける

## RPC を使う・使わないの目安
| 状況 | おすすめ |
| --- | --- |
| フロントも自分で書く(TypeScript)・同じリポジトリ | **RPC が便利** |
| 外部に公開する API・他言語のクライアント | RPC より **OpenAPI**(`@hono/zod-openapi`)で仕様を出す |
| [[Next.js]] の中で使う | Server Actions と役割が重なる。API を外にも出すなら Hono |
| GraphQL・tRPC を使いたい | `@hono/graphql-server` / `@hono/trpc-server` もある → [[GraphQL]] |

## 関連
- 前: [[Hono_03_ミドルウェア(組み込み・自作・認証)]] / 次: [[Hono_05_ランタイム別の動かし方とデプロイ]]
- [[TypeScript]] / [[静的型付言語]] / [[モノレポ]](フロントと API を1つのリポジトリで)
- 公式: https://hono.dev/docs/guides/validation , https://hono.dev/docs/guides/rpc , https://hono.dev/docs/concepts/stacks , https://hono.dev/docs/guides/best-practices

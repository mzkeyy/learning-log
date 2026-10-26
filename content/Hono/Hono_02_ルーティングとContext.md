---
title: "Hono 02 ルーティングと Context"
modified: 2026-10-26
---

## ルーティングの基本
```ts
app.get('/', (c) => c.text('GET /'))
app.post('/', (c) => c.text('POST /'))
app.put('/', (c) => c.text('PUT /'))
app.delete('/', (c) => c.text('DELETE /'))

app.all('/hello', (c) => c.text('どのメソッドでも'))
app.on('PURGE', '/cache', (c) => c.text('独自メソッド'))
app.on(['PUT', 'DELETE'], '/post', (c) => c.text('PUT か DELETE'))
app.on('GET', ['/hello', '/ja/hello'], (c) => c.text('複数パス'))

app.get('/wild/*/card', (c) => c.text('ワイルドカード'))
```

### パスパラメータ
| 書き方 | 例 | 意味 |
| --- | --- | --- |
| `:name` | `/user/:name` | 1つ取る。`c.req.param('name')` |
| `:type?` | `/api/animal/:type?` | 省略可(`/api/animal` にも一致) |
| `:date{[0-9]+}` | `/post/:date{[0-9]+}/:title{[a-z]+}` | 正規表現で制限 |
| `:filename{.+\\.png}` | `/posts/:filename{.+\\.png}` | スラッシュを含めて取る |
```ts
app.get('/posts/:id/comment/:commentId', (c) => {
  const { id, commentId } = c.req.param()   // 全部まとめて。型も付く
  return c.json({ id, commentId })
})
```

### チェーン
```ts
app
  .get('/endpoint', (c) => c.text('GET'))
  .post((c) => c.text('POST'))      // パスを省略すると直前と同じパス
  .delete((c) => c.text('DELETE'))
```
- RPC(→ [[Hono_04_バリデーションとRPC(Zod・hc)]])で型を取るにはこの**チェーンの書き方が必要**

## グループ化(`route` と `basePath`)
```ts
// books.ts
const books = new Hono()
books.get('/', (c) => c.text('一覧'))         // GET /books
books.get('/:id', (c) => c.text(c.req.param('id')))  // GET /books/:id
books.post('/', (c) => c.text('作成'))        // POST /books
export default books

// index.ts
const app = new Hono()
app.route('/books', books)

// 先頭を固定する
const api = new Hono().basePath('/api')
api.get('/book', (c) => c.text('GET /api/book'))
```
> [!warning] `route()` の順番
> `route()` は**呼んだ時点の**子のルートをコピーする。孫を子に登録する前に `app.route('/two', two)` すると、孫のルートは入らず 404 になる。**内側から順に組み立てる**。

## 優先順位: 登録した順
```ts
app.get('/book/a', (c) => c.text('a'))
app.get('/book/:slug', (c) => c.text('common'))
// GET /book/a → a、GET /book/b → common
```
- ハンドラが `Response` を返した時点で終わる。`app.get('*', ...)` を先に書くと後ろのルートは呼ばれない
- **ミドルウェアは上に、フォールバック(`*`)は下に**書く
- `strict` は既定で `true`: `/hello` と `/hello/` は別。同じに扱うなら `new Hono({ strict: false })`
- HEAD リクエストは自動で GET として処理され、本文だけ捨てられる(`app.head()` は書いても呼ばれない)

## Context(`c`)でレスポンスを作る
| メソッド | 返すもの |
| --- | --- |
| `c.text('...', status?, headers?)` | `text/plain` |
| `c.json(obj, status?, headers?)` | `application/json` |
| `c.html('<h1>..</h1>')` / `c.html(<View />)` | `text/html`(JSX も可) |
| `c.body(data, status?, headers?)` | 任意の本文 |
| `c.redirect('/', 301)` | リダイレクト(既定 302) |
| `c.notFound()` | 404(`app.notFound` で変更可) |
| `c.status(201)` / `c.header('X-A', 'b')` | ステータス・ヘッダーを先に設定 |
| `c.res` | 返す予定の `Response`(ミドルウェアで `await next()` の後に触る) |
- 結局は普通の `Response` を作っているだけ。`return new Response(...)` でもよい

### リクエストの読み方(`c.req`)
| メソッド | 用途 |
| --- | --- |
| `c.req.param('id')` / `c.req.param()` | パスパラメータ |
| `c.req.query('q')` / `c.req.queries('tags')` | クエリ(複数値は `queries`) |
| `c.req.header('User-Agent')` | ヘッダー |
| `await c.req.json()` / `text()` / `formData()` / `arrayBuffer()` / `blob()` | 本文 |
| `await c.req.parseBody()` | `multipart/form-data` と `x-www-form-urlencoded`(ファイルも) |
| `c.req.valid('json')` | **バリデーション済み**の値(→ [[Hono_04_バリデーションとRPC(Zod・hc)]]) |
| `c.req.path` / `url` / `method` / `raw` | パス・URL・メソッド・元の `Request` |
- `c.req.json()` の結果は検証されていない。**外から来た値はバリデーターを通してから使う**(v5 では型も `unknown` になる)

### 値の受け渡し(`c.set` / `c.get` / `c.var`)
```ts
type Variables = { user: { id: string } }
const app = new Hono<{ Variables: Variables }>()

app.use(async (c, next) => {
  c.set('user', { id: '123' })   // ミドルウェアで入れる
  await next()
})

app.get('/me', (c) => c.json(c.var.user))   // c.get('user') でも同じ
```
- 寿命は**そのリクエストの間だけ**。リクエストをまたいで共有はできない(状態は DB や KV に置く)
- `declare module 'hono' { interface ContextVariableMap { ... } }` で全体に型を足す方法もあるが、ミドルウェアを通っていないルートでも型が付いてしまう(実際は `undefined`)ので注意

### 環境変数・バインディング(`c.env`)
```ts
type Bindings = { DB: D1Database; API_KEY: string }
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM posts').all()
  return c.json(rows.results)
})
```
- Workers では `c.env` に vars・secret・D1・KV・R2 などが入る(→ [[Hono_05_ランタイム別の動かし方とデプロイ]])
- `c.executionCtx.waitUntil(...)`: レスポンスを返した後も処理を続ける(Workers)

## 404 とエラー処理
```ts
import { HTTPException } from 'hono/http-exception'

app.get('/admin', (c) => {
  throw new HTTPException(401, { message: 'Unauthorized' })
})

app.notFound((c) => c.json({ error: 'not found' }, 404))

// v4 の書き方(v5 は (c) => ... で c.error を読む)
app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error(err)                         // 詳細はログにだけ出す
  return c.json({ error: 'Internal Server Error' }, 500)
})
```
- `HTTPException(status, { message | res, cause })`: 想定内のエラーを投げる道具。組み込みミドルウェア(認証など)もこれを投げる
- ハンドラやミドルウェアで投げた例外は Hono が捕まえて `onError`(なければ 500)にする。**`await next()` を try/catch で囲む必要はない**
- `notFound` は v4 では**最上位の app のものだけ**が使われる
- 本番で `err.message` やスタックをそのまま返さない(内部情報の漏えい → [[Webセキュリティ対策]])

## 関連
- 前: [[Hono_01_はじめに(概要・作成・構成)]] / 次: [[Hono_03_ミドルウェア(組み込み・自作・認証)]]
- 公式: https://hono.dev/docs/api/routing , https://hono.dev/docs/api/context , https://hono.dev/docs/api/request , https://hono.dev/docs/api/exception , https://hono.dev/docs/api/hono

---
title: "Hono 03 ミドルウェア(組み込み・自作・認証)"
modified: 2026-10-26
---

## ハンドラとミドルウェア
- **ハンドラ**: `Response` を返す。1リクエストで呼ばれるのは1つだけ
- **ミドルウェア**: `await next()` で次へ進む(何も返さない)か、`Response` を返して**そこで打ち切る**(認証失敗など)
- ハンドラの前後を包む**玉ねぎ型**

```ts
app.use(logger())                       // 全メソッド・全パス
app.use('/posts/*', cors())             // パスを指定
app.post('/posts/*', basicAuth({ ... })) // メソッドとパスを指定
app.post('/posts', (c) => c.text('Created!', 201))
// POST /posts → logger → cors → basicAuth → ハンドラ
```

## 実行順
```ts
app.use(async (_, next) => { console.log('1 start'); await next(); console.log('1 end') })
app.use(async (_, next) => { console.log('2 start'); await next(); console.log('2 end') })
app.get('/', (c) => { console.log('handler'); return c.text('Hello!') })
```
```
1 start
  2 start
    handler
  2 end
1 end
```
- **登録した順に入り、逆順に出る**。`next()` の後ろはレスポンスができた後に動く
- 途中で例外が出ても Hono が捕まえて `onError` か 500 にするので、**`next()` は例外を投げない**

### 処理時間をヘッダーに付ける例
```ts
app.use(async (c, next) => {
  const start = performance.now()
  await next()
  c.res.headers.set('X-Response-Time', `${performance.now() - start}`)
})
```

## 自作ミドルウェアは `createMiddleware`
```ts
// middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

type Env = {
  Bindings: { API_TOKEN: string }
  Variables: { user: { id: string } }
}

export const requireUser = createMiddleware<Env>(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (token !== c.env.API_TOKEN) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  c.set('user', { id: 'u_1' })   // 後ろのハンドラで c.var.user として型付きで使える
  await next()
})
```
```ts
app.get('/me', requireUser, (c) => c.json(c.var.user))
```
- `app.use()` に直接書くより、**別ファイルに切り出して再利用**できる。型(`c`・`next`・`Variables`)も失われない
- `.use(a).use(b)` とチェーンすると、`a` と `b` の `Variables` の型が合わさって後ろのハンドラで使える
- `await next()` の後に `c.res = new Response(...)` でレスポンスを差し替えることもできる

### 設定値に `c.env` を使う
Workers では環境変数がリクエストごとに `c.env` で渡されるので、ミドルウェアの**中で**作る。
```ts
import { cors } from 'hono/cors'

app.use('/api/*', async (c, next) => {
  const mw = cors({ origin: c.env.CORS_ORIGIN })
  return mw(c, next)
})
```
- Basic 認証・Bearer 認証・JWT の秘密鍵も同じ書き方(ソースに秘密を直書きしない → [[APIキー・シークレット管理]])

## 主な組み込みミドルウェア
| import | 用途 |
| --- | --- |
| `hono/logger` | リクエストのログ |
| `hono/request-id` | リクエスト ID を振る(ログの追跡) |
| `hono/cors` | **CORS**。`origin` は配列・関数でも指定可 |
| `hono/secure-headers` | セキュリティヘッダー一式(Helmet 相当。CSP も設定可) |
| `hono/csrf` | **CSRF 対策**。`Origin` と `Sec-Fetch-Site` を確認 |
| `hono/body-limit` | 本文サイズの上限(大きすぎるアップロードを 413 で拒否) |
| `hono/basic-auth` / `hono/bearer-auth` | Basic 認証 / Bearer トークン認証 |
| `hono/jwt` / `hono/jwk` | JWT の検証(共通鍵 / 公開鍵 JWKS) |
| `hono/ip-restriction` | IP で許可・拒否 |
| `hono/timeout` | 時間がかかりすぎたら打ち切る |
| `hono/etag` / `hono/cache` / `hono/compress` | ETag、Cache API(Workers・Deno)、圧縮 |
| `hono/pretty-json` | `?pretty` で JSON を整形 |
| `hono/trailing-slash` | 末尾スラッシュの付け外し |
| `hono/jsx-renderer` | JSX のレイアウト(→ [[Hono_06_実務(構成・テスト・JSX・v5移行・AI開発)]]) |
| `hono/context-storage` | ハンドラの外(別モジュール)から Context を取る |
- 組み込みは外部ライブラリに依存しない。外部ライブラリを使うもの(Sentry・OpenTelemetry・Auth.js・Clerk・Zod OpenAPI・Swagger UI など)は `@hono/xxx` の**サードパーティミドルウェア**

### セキュリティまわりの基本セット
```ts
import { secureHeaders } from 'hono/secure-headers'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { bodyLimit } from 'hono/body-limit'

app.use(secureHeaders())
app.use('/api/*', cors({ origin: ['https://app.example.com'], credentials: true }))
app.use(csrf({ origin: 'https://app.example.com' }))   // Cookie 認証のフォームを守る
app.use('/upload', bodyLimit({ maxSize: 1024 * 1024 }))  // 1MB
```
- CORS の `origin: '*'` と `credentials: true` は一緒に使えない。**許可するオリジンを列挙する**
- `csrf()` が見るのは「HTML フォームから送れる Content-Type」の、GET・HEAD・OPTIONS 以外のリクエストだけ。JSON API でも Cookie 認証なら CORS 設定とセットで考える
- 詳しい考え方 → [[Webセキュリティ対策]]

## 認証
### JWT
```ts
import { jwt } from 'hono/jwt'
import type { JwtVariables } from 'hono/jwt'

const app = new Hono<{ Bindings: { JWT_SECRET: string }; Variables: JwtVariables }>()

app.use('/auth/*', (c, next) =>
  jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next)
)

app.get('/auth/me', (c) => c.json(c.get('jwtPayload')))
```
- `Authorization: Bearer <token>` を見る(`cookie` オプションで Cookie からも読める)
- **`alg` は明示する**。`verification` で `iss`・`aud` も確認できる
- 署名・検証だけなら `hono/jwt` の `sign()` / `verify()` / `decode()` ヘルパーもある

### Cookie
```ts
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

setCookie(c, 'session', id, {
  httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 7,
})
const session = getCookie(c, 'session')
```
- 署名付きは `setSignedCookie` / `getSignedCookie`
- `__Host-` / `__Secure-` プレフィックスの条件や、`maxAge` 400日超などのルール違反はエラーにしてくれる
- ログイン機能そのものは Better Auth・Auth.js(`@hono/auth-js`)・Clerk などを組み合わせる → [[認証]]

## 関連
- 前: [[Hono_02_ルーティングとContext]] / 次: [[Hono_04_バリデーションとRPC(Zod・hc)]]
- 公式: https://hono.dev/docs/guides/middleware , https://hono.dev/docs/helpers/factory , https://hono.dev/docs/middleware/builtin/jwt , https://hono.dev/docs/middleware/builtin/csrf , https://hono.dev/docs/helpers/cookie , https://hono.dev/docs/middleware/third-party

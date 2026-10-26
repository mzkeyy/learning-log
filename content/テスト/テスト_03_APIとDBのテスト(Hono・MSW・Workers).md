---
title: "テスト 03 API と DB のテスト(Hono・MSW・Workers)"
modified: 2026-10-26
---

## API のテスト: サーバーを起動しない
Web 標準の `Request` → `Response` で動くフレームワーク([[Hono]] など)は、**アプリに Request を渡すだけ**でテストできる。ポートを開く必要がなく速い。
```ts
import { describe, it, expect } from 'vitest'
import app from '../src/app'

describe('POST /posts', () => {
  it('作成すると 201 と作ったデータを返す', async () => {
    const res = await app.request('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },   // ★ 無いと JSON として読まれない
      body: JSON.stringify({ title: 'Hello', body: '...' }),
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ title: 'Hello' })
  })

  it('タイトルが空なら 400', async () => {
    const res = await app.request('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('ログインしていないと 401', async () => {
    const res = await app.request('/me')
    expect(res.status).toBe(401)
  })
})
```
- 環境変数・バインディングは第3引数で渡せる: `app.request('/posts', {}, { API_KEY: 'test', DB: testDb })`
- 型付きで呼ぶなら `hono/testing` の `testClient(app)` → [[Hono_06_実務(構成・テスト・JSX・v5移行・AI開発)]]
- Express など Node.js の `http` で動くものは `supertest` が定番

### API で確かめること
| 観点 | 例 |
| --- | --- |
| 正常系 | ステータス、返す JSON の形 |
| 入力チェック | 必須の欠け、型違い、長すぎる値 → 400 |
| 認証 | ログインなし → 401 |
| **認可** | **他人のデータ → 403 / 404**(一番事故が多い) |
| 存在しない | 404 |
| 副作用 | DB に保存された、メールが送られた(モックが呼ばれた) |

## 外部 API のモック: MSW
**MSW(Mock Service Worker)**は、`fetch` などの HTTP 通信を横取りして、決めた応答を返す。アプリのコードを書き換えずに外部 API を差し替えられる。
```bash
npm install -D msw
```
```ts
// test/setup.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { beforeAll, afterAll, afterEach } from 'vitest'

export const server = setupServer(
  http.get('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Taro' }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))  // 想定外の通信はエラーに
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```
```ts
// 特定のテストだけ失敗させる
it('外部 API が 500 なら、こちらは 502 を返す', async () => {
  server.use(http.get('https://api.example.com/users/:id', () => new HttpResponse(null, { status: 500 })))
  const res = await app.request('/profile/u_1')
  expect(res.status).toBe(502)
})
```
- Vitest の設定の `setupFiles` に `test/setup.ts` を入れる
- 同じハンドラを**ブラウザの開発中(Service Worker)**や Storybook でも使い回せる
- `onUnhandledRequest: 'error'` で、テスト中にうっかり本物の API を呼ぶのを防ぐ
- AI の API(Claude など)もテストではモックする。本物を呼ぶ確認は評価(evals)で別に行う → [[AIアプリ開発_07_評価・コスト・セキュリティ・運用]]

## DB を使うテスト
| 方法 | 長所 | 短所 |
| --- | --- | --- |
| **本物と同じ種類の DB をテスト用に用意** | 本番に近い。SQL の間違いも見つかる | 準備が必要・少し遅い |
| メモリ上の DB(SQLite など) | 速い | 本番(PostgreSQL)と挙動が違うことがある |
| リポジトリをモック | 速い | SQL の間違いは見つからない |
- **おすすめは本物と同じ種類の DB**(PostgreSQL なら PostgreSQL)。Docker や Testcontainers で、テスト用のコンテナを立てる → [[Docker]]
- テストごとにデータを片付ける方法:
  - テストごとにトランザクションを張り、最後にロールバック
  - テストの前にテーブルを空にする(`TRUNCATE`)
  - ファイル(またはワーカー)ごとに別のスキーマ・DB を使う(並列実行でぶつからない)
- テストデータは**ファクトリー関数**で作ると読みやすい
```ts
const makeUser = (over: Partial<User> = {}): User => ({
  id: crypto.randomUUID(), name: 'Taro', email: `t-${Date.now()}@example.com`, ...over,
})
```
- マイグレーションをテスト用 DB にも当ててから実行する(本番と同じスキーマで)→ [[SQL]]

## Cloudflare Workers のテスト
本番と同じランタイム(workerd)の中でテストを動かせる。D1・KV・R2 などのバインディングも、テスト用のものが自動で用意される。
```ts
// vitest.config.ts
import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
})
```
```ts
// test/index.test.ts
import { exports } from 'cloudflare:workers'
import { it, expect } from 'vitest'

it('存在しないパスは 404', async () => {
  const res = await exports.default.fetch('http://example.com/404')   // Worker 全体を呼ぶ
  expect(res.status).toBe(404)
})
```
- 以前は `@cloudflare/vitest-pool-workers` と `defineWorkersConfig` で設定していた(古い記事に注意)
- D1 のマイグレーションをテスト前に当てる仕組み(`readD1Migrations`)もある
- 速さ優先なら、Hono の `app.request()` + モックのバインディングで十分なことも多い → [[Cloudflare_06_運用・制限・ベストプラクティス]]

## 関連
- 前: [[テスト_02_Vitestの基本(書き方・マッチャー・モック)]] / 次: [[テスト_04_コンポーネントテスト(Testing Library・Browser Mode)]]
- [[Hono]] / [[Cloudflare]] / [[SQL]] / [[認証]]
- 公式: https://hono.dev/docs/guides/testing , https://mswjs.io/docs/ , https://vitest.dev/guide/mocking/requests , https://developers.cloudflare.com/workers/testing/vitest-integration/ , https://testcontainers.com/

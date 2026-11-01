---
title: "REST(RESTful API)"
modified: 2026-11-01
---

**REST(Representational State Transfer)** = Web の仕組み(URL・HTTP メソッド・ステータスコード・キャッシュ)をそのまま使って API を作る**設計のスタイル**。Roy Fielding が 2000 年の博士論文でまとめた。プロトコルや規格ではないので、「こう書かなければ動かない」という決まりはない。

- **リソース**(注文・ユーザーなど「もの」)に URL を付け、**HTTP メソッド**で操作する
- やり取りするのはリソースそのものではなく、その**表現**(JSON など)
- この考え方に沿った API を **RESTful API** と呼ぶ。実務で「REST API」と言うと、たいてい「HTTP + JSON でリソースを操作する API」くらいの意味

## REST の6つの制約
Fielding が挙げた条件。全部を厳密に守っている API は少ないが、考え方の元になっている。

| 制約 | 意味 | 実務での形 |
| --- | --- | --- |
| クライアント・サーバー | 画面とデータ・処理を分ける | フロントと API を別々に作れる |
| **ステートレス** | リクエストごとに必要な情報を全部送る。サーバーは前のやり取りを覚えない | 毎回 `Authorization` ヘッダーを付ける。サーバーを増やしやすい → [[HTTP・HTTPS・TLS]] |
| **キャッシュ可能** | レスポンスにキャッシュしてよいかを示す | `Cache-Control`・`ETag` |
| **統一インターフェース** | どのリソースも同じやり方(URL + メソッド)で扱う | `GET /orders/1` も `GET /users/1` も同じ形 |
| 階層化システム | 間に CDN・プロキシ・ゲートウェイを挟める | Cloudflare・API Gateway を前に置ける |
| コードオンデマンド(任意) | サーバーがコードを送って実行させる | JavaScript の配信。API ではほぼ使わない |

## リソースと URL
```
GET    /orders                 # 注文の一覧
GET    /orders/123             # 注文 123
POST   /orders                 # 注文を作る
PATCH  /orders/123             # 注文 123 を一部更新
DELETE /orders/123             # 注文 123 を削除
GET    /users/42/orders        # ユーザー 42 の注文(入れ子は1段くらいまで)
POST   /orders/123/cancel      # 状態を変える操作(動詞)は POST で
```
- URL は**名詞の複数形**。動詞は入れない(`/getOrders`・`/createOrder` にしない)
- 絞り込み・並び替え・ページングはクエリ文字列で(`?status=paid&sort=-createdAt&limit=20`)
- URL は小文字とハイフン(`/order-items`)、ID はなるべく推測されにくいもの(UUID など)

## HTTP メソッドと安全性・冪等性
| メソッド | 用途 | 安全(読むだけ) | 冪等(何回やっても同じ結果) |
| --- | --- | :---: | :---: |
| `GET` | 取得 | ○ | ○ |
| `HEAD` | ヘッダーだけ取得 | ○ | ○ |
| `POST` | 作成・操作 | × | × |
| `PUT` | 全体を置き換え(なければ作る) | × | ○ |
| `PATCH` | 一部を更新 | × | ×(作り方次第) |
| `DELETE` | 削除 | × | ○ |
| `OPTIONS` | 使えるメソッドを聞く(CORS の事前確認) | ○ | ○ |
- **`GET` で状態を変えない**。クローラーやプリフェッチが勝手に呼ぶと事故になる
- 冪等なら、通信が切れたときに**そのままリトライできる**。`POST` は二重実行になり得るので、決済などは `Idempotency-Key` ヘッダーで防ぐ → [[アーキテクチャ設計_04_非同期処理とイベント駆動(キュー・Pub-Sub・冪等性)]]
- `PUT` は送らなかった項目が消える(全体を置き換える)。一部だけ変えるなら `PATCH`

## ステータスコード(よく使うもの)
| コード | 意味 |
| --- | --- |
| 200 OK / 201 Created / 204 No Content | 成功 / 作成した(`Location` ヘッダーに新しい URL) / 中身なしで成功 |
| 202 Accepted | 受け付けた。処理は後で |
| 304 Not Modified | 変わっていない(キャッシュを使ってよい) |
| 400 Bad Request / 422 Unprocessable Content | 入力が不正 / 形は正しいが処理できない(業務ルール違反) |
| 401 Unauthorized / 403 Forbidden | ログインしていない / 権限がない |
| 404 Not Found / 409 Conflict | 見つからない / 衝突(重複・同時更新) |
| 412 Precondition Failed | 条件付きリクエストの条件が合わない(楽観ロックの失敗) |
| 429 Too Many Requests | 回数制限(`Retry-After` を付ける) |
| 500 / 502 / 503 | サーバーの問題 / 上流の問題 / 一時的に使えない |
- **エラーでも 200 を返して本文に `"error"` と書く**のは NG。クライアント・監視・キャッシュが正しく動かなくなる
- エラーの本文の形は **Problem Details(RFC 9457)**に揃えると扱いやすい → [[アーキテクチャ設計_03_API設計とBFF(REST・GraphQL・RPC)]]

## リクエストとレスポンスの例
```http
POST /orders HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json
Idempotency-Key: 6f1c2b7e-...

{ "productId": "p_123", "quantity": 2 }
```
```http
HTTP/1.1 201 Created
Location: /orders/o_789
Content-Type: application/json

{ "id": "o_789", "status": "pending", "quantity": 2, "createdAt": "2026-11-01T09:00:00Z" }
```
- `Content-Type`(送る形式)と `Accept`(欲しい形式)で表現の形式を伝える
- 日時は ISO 8601、項目名は camelCase か snake_case のどちらかに統一

## キャッシュと条件付きリクエスト
REST の強みの1つ。HTTP のキャッシュの仕組みがそのまま使える(GraphQL は基本 POST 1本なので効きにくい → [[GraphQL_06_実務の注意とサーバー側(N+1・キャッシュ)]])。

| ヘッダー | 役割 |
| --- | --- |
| `Cache-Control: max-age=60` | 60 秒はキャッシュをそのまま使ってよい。`private`(個人のデータ)・`no-store`(保存しない)も |
| `ETag: "v5"` | 今の版を表す値 |
| `If-None-Match: "v5"` | 「v5 から変わっていなければ中身は要らない」→ 変わっていなければ **304** |
| `If-Match: "v5"` | 「v5 のままなら更新して」→ 誰かが先に更新していたら **412**(楽観ロック) |

```
1. GET  /orders/123                 → 200, ETag: "v5"
2. PATCH /orders/123, If-Match: "v5" → 他の人が先に更新していたら 412(上書き事故を防ぐ)
```

## ページング
| 方式 | 例 | 向き |
| --- | --- | --- |
| オフセット | `?page=3&limit=20` | 簡単。後ろのページが遅い、途中で追加されるとずれる |
| **カーソル** | `?cursor=eyJpZCI6MTIzfQ&limit=20` → 本文に `nextCursor` | 大量データ・無限スクロール。API ではこちらが無難 |

## HATEOAS とリチャードソンの成熟度モデル
**HATEOAS** = レスポンスに「次にできる操作のリンク」を入れて、クライアントが URL を決め打ちしなくてよいようにする考え方。
```json
{
  "id": "o_789",
  "status": "pending",
  "_links": {
    "self":   { "href": "/orders/o_789" },
    "cancel": { "href": "/orders/o_789/cancel", "method": "POST" }
  }
}
```
REST らしさの段階を表したのが **リチャードソンの成熟度モデル**:

| レベル | 内容 | 例 |
| --- | --- | --- |
| 0 | 1つの URL に全部 POST | `POST /api` に `{"action":"getOrder"}`(昔の SOAP・RPC 風) |
| 1 | リソースごとに URL がある | `/orders/123` |
| 2 | **HTTP メソッドとステータスコードを正しく使う** | `GET`・`POST`・`DELETE`、201・404 |
| 3 | HATEOAS(リンクで次の操作を示す) | 上の `_links` |
- 実務の「REST API」は**ほぼレベル 2**。レベル 3 まで作る API は少なく、OpenAPI で仕様を共有するのが普通

## バージョン管理
- 基本は**互換性を壊さない**(項目の追加は OK、削除・名前変更・型変更は NG)
- 壊すときは新しい版を出す: URL(`/v2/orders`、いちばん分かりやすい)・ヘッダー(`Accept: application/vnd.example.v2+json`)など
- 古い版は `Deprecation`・`Sunset` ヘッダーや告知で終了日を伝えてから止める

## OpenAPI(仕様の書き方)
REST API の仕様を YAML / JSON で書く標準の形式(旧 Swagger)。
```yaml
openapi: 3.1.0
info: { title: Orders API, version: 1.0.0 }
paths:
  /orders/{id}:
    get:
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: 注文
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Order" }
        "404": { description: 見つからない }
```
- ここからドキュメント(Swagger UI・Scalar など)、クライアントの型・コード、モックサーバー、テストを作れる
- コードから生成する方法もある(Hono なら `@hono/zod-openapi`)

## Hono で書くと
```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()
const orderInput = z.object({ productId: z.string(), quantity: z.number().int().min(1) })

app.get('/orders/:id', async (c) => {
  const order = await findOrder(c.req.param('id'))
  if (!order) return c.json({ title: '注文が見つかりません', status: 404 }, 404)
  return c.json(order)
})

app.post('/orders', zValidator('json', orderInput), async (c) => {
  const order = await createOrder(c.req.valid('json'))
  return c.json(order, 201, { Location: `/orders/${order.id}` })
})

app.delete('/orders/:id', async (c) => {
  await deleteOrder(c.req.param('id'))
  return c.body(null, 204)
})
```
→ [[Hono_02_ルーティングとContext]] / [[Hono_04_バリデーションとRPC(Zod・hc)]]

## REST・GraphQL・RPC の使い分け
| | REST | GraphQL | 型付き RPC(tRPC・Hono RPC) |
| --- | --- | --- | --- |
| 取り方 | URL ごとに決まった形 | クライアントが項目を選ぶ | サーバーの関数を呼ぶ |
| キャッシュ | HTTP キャッシュが効く | クライアント側で工夫 | 工夫が要る |
| 型 | OpenAPI で別に定義 | スキーマが型 | TypeScript の型をそのまま共有 |
| 向き | **外部公開・汎用の API**、シンプルな CRUD | 画面ごとに欲しいデータが違う UI | 同じチームの TS フロント + サーバー |
→ 詳しくは [[アーキテクチャ設計_03_API設計とBFF(REST・GraphQL・RPC)]] / [[GraphQL_01_入門(RESTとの違い・スキーマ・クエリ)]]

## よくある失敗
- URL に動詞(`/getUser`・`/deleteOrder`)、全部 `POST`
- エラーなのに 200、または何でも 500
- `GET` で削除や更新をする
- 1画面に何十回も API を呼ぶ(取り足りない)→ まとめる API や BFF を用意する
- 一覧 API でページングなし(データが増えると重くなる)
- 内部のエラー(スタック・SQL)をそのまま返す、他人の ID を入れるとデータが見える(IDOR)→ [[Webセキュリティ対策]]
- 項目をいきなり消して既存のクライアントを壊す

## 関連
- [[HTTP・HTTPS・TLS]] — メソッド・ステータスコード・ステートレスの基礎
- [[アーキテクチャ設計_03_API設計とBFF(REST・GraphQL・RPC)]] — 設計の決めごと、エラー、BFF
- [[GraphQL]] / [[Hono]] / [[認証]] / [[MCP]]
- 参考: https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm , https://www.rfc-editor.org/rfc/rfc9110 , https://www.rfc-editor.org/rfc/rfc9457 , https://martinfowler.com/articles/richardsonMaturityModel.html , https://www.openapis.org/

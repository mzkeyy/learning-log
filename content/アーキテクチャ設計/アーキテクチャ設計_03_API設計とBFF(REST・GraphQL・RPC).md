---
title: "アーキテクチャ設計 03 API 設計と BFF(REST・GraphQL・RPC)"
modified: 2026-10-26
---

## API の方式の選び方
| 方式 | 特徴 | 向く場面 |
| --- | --- | --- |
| **REST**(+ OpenAPI) | HTTP のメソッドと URL でリソースを操作。どの言語・道具でも使える | **外部公開の API**、汎用的な API |
| **GraphQL** | クライアントが欲しい項目を指定して取る。1つのエンドポイント | 画面ごとに欲しいデータが違う、複数のデータをまとめて取りたい → [[GraphQL]] |
| **型付き RPC**(Hono RPC・tRPC など) | サーバーの関数を型付きで呼ぶ感覚。コード生成なし | **フロントとサーバーを同じチームで TypeScript で作る**内部の API → [[Hono_04_バリデーションとRPC(Zod・hc)]] |
| gRPC | Protocol Buffers で定義、HTTP/2 で高速 | サービス間の内部通信 |
| Server Actions / Server Functions | フレームワークの中でサーバー処理を呼ぶ | Next.js・TanStack Start のアプリの中だけ |
- 外に出すなら REST、内側は型付き RPC や Server Actions で十分、というのがよくある組み合わせ

## REST の設計
### URL とメソッド
| 操作 | メソッドと URL | 成功時 |
| --- | --- | --- |
| 一覧 | `GET /orders?status=paid&limit=20` | 200 |
| 1件 | `GET /orders/{id}` | 200 / 見つからなければ 404 |
| 作成 | `POST /orders` | **201** + `Location` ヘッダー |
| 全体の置き換え | `PUT /orders/{id}` | 200 / 204 |
| 一部の更新 | `PATCH /orders/{id}` | 200 |
| 削除 | `DELETE /orders/{id}` | 204 |
| 操作(動詞) | `POST /orders/{id}/cancel` | 200 / 202 |
- URL は**名詞の複数形**(`/orders`)、動詞を入れない(`/getOrders` にしない)。ただし状態を変える操作は `POST .../cancel` のようにしてよい
- 入れ子は浅く(`/users/{id}/orders` くらいまで)
- `GET` は副作用なし、`PUT` / `DELETE` は何度やっても同じ結果(冪等)になるように

### ステータスコード
| コード | 意味 | 使う場面 |
| --- | --- | --- |
| 200 / 201 / 204 | 成功 / 作成 / 中身なしで成功 | |
| 202 | 受け付けた(処理は後で) | 非同期の処理 → 04 |
| 400 | 入力が不正 | バリデーションエラー |
| 401 | 認証されていない | ログインが必要 |
| 403 | 権限がない | ログインしているが許可されていない |
| 404 | 見つからない | (権限のない他人のデータも 404 にして存在を隠すことがある) |
| 409 | 衝突 | 重複登録、楽観ロックの競合 |
| 422 | 形は正しいが処理できない | 業務ルール違反(在庫切れなど)。400 で統一する流派もある |
| 429 | 回数制限 | `Retry-After` ヘッダーを付ける |
| 500 / 503 | サーバーの問題 / 一時的に使えない | |
→ [[HTTP・HTTPS・TLS]]

### エラーの形を揃える
```json
{
  "type": "https://example.com/errors/out-of-stock",
  "title": "在庫が足りません",
  "status": 422,
  "detail": "商品 p_123 の在庫は残り 1 個です",
  "errors": [{ "field": "quantity", "message": "1 以下にしてください" }]
}
```
- 標準の形式 **Problem Details(RFC 9457)**に合わせると、クライアントが処理しやすい
- 内部のエラーの詳細(スタック・SQL)は返さない → [[Webセキュリティ対策]]

### ページング
| 方式 | 例 | 向き不向き |
| --- | --- | --- |
| オフセット | `?page=3&limit=20` | 簡単。件数の多いデータの後ろのページが遅い・途中で追加されるとずれる |
| **カーソル** | `?cursor=eyJpZCI6MTIzfQ&limit=20` → レスポンスに `nextCursor` | 大量データ・無限スクロール。**API ではこちらが推奨** |

### その他の決めごと
- **バージョン**: 互換性を壊す変更をしない(項目の追加は OK、削除・型変更は NG)。壊すなら `/v2` やヘッダーで新しい版を出し、古い版の終了日を知らせる
- **冪等キー**: 決済など重複すると困る POST は `Idempotency-Key` ヘッダーで二重実行を防ぐ → 04
- **フィルタ・並び替え**: `?status=paid&sort=-createdAt`
- 日時は ISO 8601(`2026-10-26T12:00:00Z`)、項目名の書き方(camelCase か snake_case)を統一
- **OpenAPI** で仕様を書く(Hono なら `@hono/zod-openapi` でコードから生成)。ドキュメント・クライアントのコード生成・テストに使える
- 認証は Bearer トークン(OAuth 2.0)、API キーは用途に応じて → [[認証]]

## BFF(Backend for Frontend)
**画面(フロントエンド)ごとに専用の API の層を置く**パターン。
```
Web 画面 ──▶ Web 用 BFF ──┐
                         ├──▶ 注文サービス
アプリ ───▶ アプリ用 BFF ─┼──▶ 在庫サービス
                         └──▶ 会員サービス / 外部 API
```
| BFF がやること | 例 |
| --- | --- |
| **複数の API をまとめる** | 画面1つ分のデータを1回のリクエストで返す(ブラウザから何回も呼ばない) |
| **画面に合わせて形を変える** | 必要な項目だけ・表示用に整形 |
| **認証の窓口** | Cookie のセッションを持ち、裏のサービスにはトークンで(ブラウザにトークンを渡さない) |
| 秘密情報を隠す | 外部 API のキーはサーバー側だけ → [[APIキー・シークレット管理]] |
| キャッシュ・レート制限 | |
- **Next.js の Route Handlers・Server Components・Server Actions は、実質的に BFF**。別にサーバーを立てなくてもよい
- [[Hono]] で BFF を書き、RPC でフロントと型を共有する構成も多い
- GraphQL を BFF として置く(フロントが必要な項目を選ぶ)方法もある
- 注意: BFF に**業務ルールを入れない**(表示のための組み立てだけ)。業務ルールは裏のサービスに。BFF が太ると、画面ごとにルールが重複する

## API Gateway との違い
| | API Gateway | BFF |
| --- | --- | --- |
| 役割 | 入口の共通処理(認証・レート制限・ルーティング・ログ) | 画面ごとのデータの組み立て |
| 中身 | 設定が中心(Amazon API Gateway、Cloudflare など) | アプリのコード |
| 数 | 1つ(共通) | 画面の種類ごと |

## 関連
- 前: [[アーキテクチャ設計_02_モノリスとマイクロサービス(モジュラーモノリス・分け方・Saga)]] / 次: [[アーキテクチャ設計_04_非同期処理とイベント駆動(キュー・Pub-Sub・冪等性)]]
- [[GraphQL]] / [[Hono]] / [[Next.js_05_データ更新(Server Actions・フォーム)]] / [[HTTP・HTTPS・TLS]]
- 参考: https://www.rfc-editor.org/rfc/rfc9457 , https://learn.microsoft.com/azure/architecture/best-practices/api-design , https://samnewman.io/patterns/architectural/bff/ , https://www.openapis.org/

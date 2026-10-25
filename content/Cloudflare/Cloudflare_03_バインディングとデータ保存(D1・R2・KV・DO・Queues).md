---
title: "Cloudflare 03 バインディングとデータ保存(D1・R2・KV・DO・Queues)"
modified: 2026-09-29
---

## バインディングとは
Worker から Cloudflare のサービスを使うための**直接の接続口**。wrangler.jsonc に書くと `env.名前` で使える。
- ネットワーク往復なし・認証不要・APIキー不要 → **REST API より速く安全**(公式ベストプラクティス: サービスは REST ではなくバインディングで使う)
- 型は `npx wrangler types` で自動生成

## どれを使う?
| データの性質 | 選ぶもの |
| --- | --- |
| ユーザー・投稿・注文などの**関係データ**(検索・結合) | **D1** |
| 画像・動画・PDF などの**ファイル** | **R2** |
| 設定値、フラグ、セッション、キャッシュ(**読み込み中心・多少の遅延OK**) | **KV** |
| チャット・共同編集・カウンターなど**強い一貫性とリアルタイム** | **Durable Objects** |
| 後でやればいい処理(メール送信、画像処理) | **Queues** |
| 複数ステップの長い処理(決済→在庫→通知) | **Workflows** |
| 既存の外部 Postgres/MySQL | **Hyperdrive** |

## D1(SQL データベース)
SQLite ベースのサーバーレス DB。
```bash
npx wrangler d1 create my-db          # 作成(設定への追記も提案してくれる)
```
```jsonc
"d1_databases": [{ "binding": "DB", "database_name": "my-db", "database_id": "<ID>" }]
```
### マイグレーション(テーブル定義の変更履歴)★ 実務では必須
```bash
npx wrangler d1 migrations create my-db create_users   # migrations/0001_create_users.sql を作成
# SQL を書く
npx wrangler d1 migrations apply my-db --local         # ローカルに適用
npx wrangler d1 migrations apply my-db --remote        # 本番に適用
```
```sql
-- migrations/0001_create_users.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```
### クエリ
```ts
// 1件
const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
// 複数
const { results } = await env.DB.prepare('SELECT * FROM users LIMIT ?').bind(20).all()
// 書き込み
await env.DB.prepare('INSERT INTO users (email, name) VALUES (?, ?)').bind(email, name).run()
// まとめて(トランザクション的に)
await env.DB.batch([stmt1, stmt2])
```
- **必ず `?` + `.bind()`**(文字列連結は SQL インジェクションの原因)
- `--local` はローカル(`.wrangler/state/`)、`--remote` は本番。コマンドで取り違えない
- ORM: Drizzle ORM が D1 対応で人気
- 一覧取得のループ内でクエリしない → [[N+1]]

## R2(ファイルストレージ)
S3 互換、**転送量(egress)無料**。
```bash
npx wrangler r2 bucket create my-bucket
```
```jsonc
"r2_buckets": [{ "binding": "BUCKET", "bucket_name": "my-bucket" }]
```
```ts
await env.BUCKET.put(`avatars/${userId}.png`, request.body, {
  httpMetadata: { contentType: 'image/png' },
})
const obj = await env.BUCKET.get(`avatars/${userId}.png`)
if (!obj) return new Response('Not Found', { status: 404 })
return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType ?? '' } })
await env.BUCKET.delete(key)
```
- 大きなファイルはブラウザから直接アップロード(署名付きURL)させると Worker の制限を気にしなくてよい
- 公開バケット + カスタムドメインで画像配信も可能

## KV(キー・バリュー)
世界中に複製される高速な読み取りストア。**書き込みの反映に最大数十秒かかる(結果整合性)**。
```bash
npx wrangler kv namespace create CONFIG
```
```ts
await env.CONFIG.put('feature:new-ui', 'on', { expirationTtl: 3600 })   // 期限付き
const flag = await env.CONFIG.get('feature:new-ui')
await env.CONFIG.delete('feature:new-ui')
```
- 向く: 設定、フラグ、キャッシュ、セッション、リダイレクト表
- 向かない: 頻繁に書き換わるカウンター、すぐに一貫性が必要なデータ(→ D1 / Durable Objects)

## Durable Objects(状態を持つ Worker)
- 世界で一意の名前を持つオブジェクトごとに、**計算と強い一貫性のストレージ(SQLite)**をセットで持つ
- 用途: チャットルーム、共同編集、マルチプレイヤーゲーム、レート制限、AIエージェントの状態
- **WebSocket を長時間保持するなら Durable Objects**(Hibernation API でアイドル時は課金されにくい)
- SQLite 版は無料プランでも利用可

## Queues(非同期処理)
```ts
// 送る側(producer)
await env.MY_QUEUE.send({ type: 'welcome-email', userId })
// 受ける側(consumer)
export default {
  async queue(batch, env) {
    for (const msg of batch.messages) { await sendEmail(msg.body); msg.ack() }
  },
}
```
- レスポンスを速く返し、重い処理は後で。失敗時の再試行、バッチ処理

## Workflows / Hyperdrive / Workers AI
- **Workflows**: 各ステップの結果を永続化し、失敗したステップだけ再試行する「耐久実行」。多段処理向け
- **Hyperdrive**: 外部 DB への接続をプールして高速化。リクエストごとに Client を作ってよい(`nodejs_compat` 必要)
- **Workers AI**: `env.AI.run('@cf/meta/llama-...', { prompt })` で推論

## Cron Triggers(定期実行)
```jsonc
"triggers": { "crons": ["0 * * * *"] }    // 毎時0分(UTC)
```
```ts
export default {
  async scheduled(controller, env, ctx) { await cleanupOldRecords(env) },
}
```
- **UTC 基準**(日本時間9時 = `0 0 * * *`)

## 関連
- 前: [[Cloudflare_02_Workersの基本(作成・Wrangler・設定)]] / 次: [[Cloudflare_04_環境変数・シークレット・環境分離]]
- [[中間テーブル]] / [[N+1]]
- 公式: https://developers.cloudflare.com/workers/runtime-apis/bindings/ , https://developers.cloudflare.com/d1/ , https://developers.cloudflare.com/r2/ , https://developers.cloudflare.com/kv/ , https://developers.cloudflare.com/durable-objects/ , https://developers.cloudflare.com/queues/

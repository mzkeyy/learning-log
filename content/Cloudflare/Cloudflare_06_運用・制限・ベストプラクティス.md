---
title: "Cloudflare 06 運用・制限・ベストプラクティス"
modified: 2026-09-29
---

## 主な制限(Workers)
| 項目 | 無料 | 有料 |
| --- | --- | --- |
| リクエスト | 1日10万 | 無制限(従量) |
| CPU 時間 / リクエスト | 10ms | 最大5分(既定30秒) |
| メモリ | 128MB | 128MB |
| サブリクエスト(外部 fetch 等) | 50 / リクエスト | 10,000 / リクエスト |
| 環境変数の数 | 64 | 128 |
| Worker のサイズ | 64MiB | 64MiB |
| 起動時間 | 1秒 | 1秒 |
| Cron Triggers | 5 / アカウント | 250 |
| リクエストボディ | 100MB(Free/Pro プラン) | プランによる |
- **CPU 時間は「待ち時間」を含まない**(fetch や DB の応答待ちはカウントされない)。純粋な計算が重い処理は注意
- 128MB を超えるデータは**ストリームで**処理

## ログと監視
```jsonc
"observability": { "enabled": true, "head_sampling_rate": 1 }   // 1 = 全件。アクセスが多いなら下げる
```
- ダッシュボードの Observability でログ検索・フィルタ
- `console.log(JSON.stringify({ event: 'order_created', orderId }))` のように**構造化ログ**
- `console.error` / `console.warn` は重要度付きで表示
- リアルタイム: `npx wrangler tail`
- 外部サービスへ: OpenTelemetry エクスポート(推奨)、Logpush

## 公式ベストプラクティス(要点)
### 設定
- [ ] `compatibility_date` を新しく保つ、`nodejs_compat` を有効化
- [ ] `wrangler types` で `Env` 型を生成(手書きしない。バインディング追加のたびに再実行)
- [ ] 秘密は `wrangler secret`。設定ファイルやコードに書かない
- [ ] 環境(本番/ステージング)を意図的に分ける
- [ ] カスタムドメイン/ルートを正しく設定

### リクエスト処理
- [ ] 大きなボディは**ストリーム**で(`TransformStream`)。読み込む場合はサイズ上限を先にチェック
- [ ] レスポンス後の処理(分析、ログ送信、キャッシュ書き込み)は `ctx.waitUntil()`(30秒以内。`ctx` を分割代入しない)

### 設計
- [ ] Cloudflare のサービスは REST API でなく**バインディング**で
- [ ] 重い・再試行が必要な処理は **Queues / Workflows**
- [ ] Worker 間の通信は **Service Bindings**
- [ ] 外部 Postgres/MySQL は **Hyperdrive**
- [ ] WebSocket は **Durable Objects**
- [ ] 新規プロジェクトは **Workers Static Assets**(Pages ではなく)

### コードの書き方
- [ ] **リクエスト固有の値をグローバル変数に入れない**(isolate は使い回されるため、他のリクエストにデータが漏れる)
```ts
// ❌ let currentUser = null;  fetch 内で currentUser = ...
// ✅ 引数で渡す
```
- [ ] Promise は必ず `await` / `return` / `ctx.waitUntil()`(放置すると処理が途中で止まる)。lint で `no-floating-promises` を有効化
- [ ] 乱数・トークンは `crypto.randomUUID()` / `crypto.getRandomValues()`(`Math.random()` は使わない)
- [ ] `passThroughOnException` をエラー処理代わりにしない

### テスト
- [ ] `@cloudflare/vitest-plugin` で **Workers ランタイムの中で**テスト(本物の D1・KV・R2 が使える)
- ⚠️ テストでは `nodejs_compat` が自動で入るので、設定ファイルにも入っているか確認

## AI エージェントで Workers を作る(公式)
- **cloudflare-docs MCP サーバー**をエージェント(Claude Code、Codex、Cursor など)に接続すると、最新の Workers 知識を参照できる
- **cloudflare-observability MCP** で本番ログを見せながらデバッグ
- 例プロンプト(公式): 「Hyperdrive で既存の Postgres に接続する方法」「Durable Objects の Hibernation API で WebSocket の pub/sub」「R2 の署名付き URL で画像アップロード」
- 各ドキュメントページは「View as Markdown」/ llms.txt があるので AI に渡しやすい

## コスト管理
- 無料プランは上限を超えるとエラーになる(課金はされない)
- 有料プランは従量課金 → **予算アラート**を設定、ログのサンプリング率を調整
- 無限ループ・大量の外部 fetch・ボットからの大量アクセスに注意(レート制限、Turnstile、WAF)

## トラブル時のチェック
| 症状 | 確認 |
| --- | --- |
| ローカルで動くのに本番で動かない | `nodejs_compat`、シークレット未登録、`--remote` の DB にマイグレーション未適用 |
| `env.X` が undefined | バインディング名の綴り、環境(`--env`)、モジュールトップで読んでいないか |
| CPU 時間超過 | 重い計算を分割・Queues へ、有料プランの上限を上げる |
| 他人のデータが見える | グローバル変数にリクエスト情報を入れていないか、キャッシュヘッダー |
| Git ビルド失敗 | Worker 名と `name` の不一致、ビルドコマンド、Node バージョン |

## 関連
- 前: [[Cloudflare_05_フレームワーク連携とデプロイ]] / 目次: [[Cloudflare]]
- 公式: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ , https://developers.cloudflare.com/workers/platform/limits/ , https://developers.cloudflare.com/workers/observability/logs/workers-logs/ , https://developers.cloudflare.com/workers/get-started/prompting/

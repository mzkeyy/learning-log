---
title: "Cloudflare 02 Workers の基本(作成・Wrangler・設定)"
modified: 2026-09-29
---

## 準備
1. Cloudflare アカウント作成(dash.cloudflare.com)
2. Node.js をインストール(nvm や Volta などのバージョン管理ツール推奨)

## 最初の Worker を作る(C3 = create-cloudflare)
```bash
npm create cloudflare@latest -- my-first-worker
# 質問: Hello World example → Worker only → TypeScript → git: Yes → deploy: No
cd my-first-worker
npx wrangler dev          # http://localhost:8787(初回はブラウザでログイン)
```
```ts
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response('Hello Worker!')
  },
} satisfies ExportedHandler<Env>
```
- `fetch` ハンドラ: HTTP リクエストが来るたびに呼ばれ、**Response を返す**
- 引数: `request`(リクエスト)、`env`(バインディング・環境変数)、`ctx`(`waitUntil` など)
- 他のハンドラ: `scheduled`(Cron)、`queue`(Queues の受信)
```bash
npx wrangler deploy       # https://my-first-worker.<あなた>.workers.dev に公開
```
- 既存の Git リポジトリのテンプレートからも作れる: `npm create cloudflare@latest -- --template user/repo`
- フレームワーク指定: `--framework=react` / `next` / `tanstack-start` など

## 簡単なルーティング(素の Worker)
```ts
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/hello' && request.method === 'GET') {
      return Response.json({ message: 'hello' })
    }
    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
```
> API を本格的に書くなら **[[Hono]]**(Workers 向けに人気の軽量フレームワーク)を使うと楽。

## Wrangler(CLI)の主なコマンド
| コマンド | 用途 |
| --- | --- |
| `wrangler dev` | ローカル開発(本番と同じランタイム workerd で動く) |
| `wrangler deploy` | 公開 |
| `wrangler login` / `whoami` | ログイン確認 |
| `wrangler types` | 設定から `Env` の型を自動生成(**手書きしない**) |
| `wrangler secret put KEY` | シークレット登録 |
| `wrangler tail` | 本番ログをリアルタイム表示 |
| `wrangler d1 ...` / `r2 ...` / `kv ...` / `queues ...` | 各サービス操作 |
| `wrangler versions` / `rollback` | バージョン管理・巻き戻し |

## 設定ファイル wrangler.jsonc
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-app",                         // Worker 名(ダッシュボードの名前と一致させる)
  "main": "src/index.ts",
  "compatibility_date": "2026-09-29",       // ★ 作成時は今日の日付。定期的に更新
  "compatibility_flags": ["nodejs_compat"], // ★ Node.js API を使う(ほぼ必須)
  "vars": { "API_BASE_URL": "https://api.example.com" },   // 秘密でない設定
  "assets": { "directory": "./dist" },      // 静的ファイル
  "d1_databases": [{ "binding": "DB", "database_name": "my-db", "database_id": "..." }],
  "observability": { "enabled": true },     // ★ ログ有効化(本番前に必ず)
  "routes": [{ "pattern": "example.com", "custom_domain": true }]
}
```
- `wrangler.toml` 形式もあるが、新規は **jsonc** が主流
- `compatibility_date`: ランタイムの挙動をその日付時点に固定する仕組み(破壊的変更から守る)

## 公開先(ルーティング)
| 方法 | 説明 |
| --- | --- |
| `*.workers.dev` | 既定のサブドメイン。すぐ使える |
| **Custom Domain**(推奨) | 自分のドメイン(`example.com`、`app.example.com`)に直結。DNS レコードと証明書を自動作成 |
| Routes | 既存サイトのパス(`example.com/api/*`)だけ Worker に通す |
- Custom Domain の条件: ドメインが Cloudflare で管理されていること(ネームサーバーを Cloudflare に向ける)。既に CNAME があるホスト名には作れない
- ドメインは Cloudflare Registrar で原価購入も可能 → [[DNS]]

## ダッシュボードでできること
- Workers & Pages 一覧、Git 連携、ログ(Observability)、メトリクス、バインディング追加、カスタムドメイン、シークレット設定

## 関連
- 前: [[Cloudflare_01_全体像とサービス地図]] / 次: [[Cloudflare_03_バインディングとデータ保存(D1・R2・KV・DO・Queues)]]
- 公式: https://developers.cloudflare.com/workers/get-started/guide/ , https://developers.cloudflare.com/workers/wrangler/configuration/ , https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

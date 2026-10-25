---
title: "Cloudflare 04 環境変数・シークレット・環境分離"
modified: 2026-09-29
---

## 3種類の値
| 種類 | 置き場所 | 暗号化 | 用途 |
| --- | --- | --- | --- |
| **vars**(環境変数) | `wrangler.jsonc` の `vars` | されない | API の URL、機能フラグなど**秘密でない**設定 |
| **secrets**(シークレット) | `wrangler secret put` / ダッシュボード | される | API キー、トークン、DB パスワード |
| **ローカル用の秘密** | `.dev.vars` または `.env`(git 除外) | - | `wrangler dev` 時だけ使う値 |

どれも Worker では `env.名前` で読む。
```ts
export default {
  async fetch(request, env) {
    const res = await fetch(`${env.API_BASE_URL}/items`, {
      headers: { Authorization: `Bearer ${env.API_KEY}` },   // API_KEY は secret
    })
    return res
  },
} satisfies ExportedHandler<Env>
```

## vars
```jsonc
"vars": {
  "API_BASE_URL": "https://api.example.com",
  "SERVICE_X_DATA": { "URL": "service-x-api.dev.example", "MY_ID": 123 }   // JSON も可
}
```
- ⚠️ **秘密をここに書かない**(設定ファイルは git に入る)

## secrets
```bash
npx wrangler secret put API_KEY          # 対話で値を入力(即デプロイされる)
echo "$TOKEN" | npx wrangler secret put API_KEY   # パイプでも可
npx wrangler secret list
npx wrangler secret delete API_KEY
```
- 段階的デプロイを使う場合は `wrangler versions secret put`
- 設定の `secrets.required` に必要なキー名を宣言しておくと、漏れに気づける

## ローカル開発の秘密(.dev.vars)
```bash
# .dev.vars(.gitignore に入れる)
API_KEY=dev-key-xxxx
DATABASE_URL=postgres://localhost/dev
```
- `.dev.vars` と `.env` は**どちらか一方**(`.dev.vars` があると `.env` は無視)
- 環境別: `.dev.vars.staging` など

## 環境分離(本番・ステージング)
```jsonc
{
  "name": "my-app",
  "vars": { "ENV": "production" },
  "env": {
    "staging": {
      "name": "my-app-staging",
      "vars": { "ENV": "staging" },
      "d1_databases": [{ "binding": "DB", "database_name": "my-db-staging", "database_id": "..." }]
    }
  }
}
```
```bash
npx wrangler deploy                 # 本番
npx wrangler deploy --env staging   # ステージング
```
- **バインディング(D1 など)は環境ごとに別リソースを指定**(ステージングで本番 DB を触らない)
- vars とバインディングは環境ごとに書き直しが必要(継承されない項目がある)→ 公式「Configure environments deliberately」

## プレビュー
- Git 連携すると、ブランチ/PR ごとにプレビュー URL が発行される([[Cloudflare_05_フレームワーク連携とデプロイ]])

## 注意(フレームワーク側)
- TanStack Start など SSR フレームワークでは、**env はリクエスト時に注入される** → モジュールのトップで `process.env.X` を読むと undefined([[TanStack Start_03_実行モデルとServer Functions]])
- vinext(Next.js)では `import { env } from 'cloudflare:workers'` でバインディングにアクセス
- クライアントに公開される値(`VITE_` / `NEXT_PUBLIC_`)に秘密を入れない

## 漏えい時
1. **まずキーを無効化・再発行** → 2. `wrangler secret put` で差し替え → 3. 原因調査([[APIキー・シークレット管理]])

## 関連
- 前: [[Cloudflare_03_バインディングとデータ保存(D1・R2・KV・DO・Queues)]] / 次: [[Cloudflare_05_フレームワーク連携とデプロイ]]
- 公式: https://developers.cloudflare.com/workers/configuration/environment-variables/ , https://developers.cloudflare.com/workers/configuration/secrets/

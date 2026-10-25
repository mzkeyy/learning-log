---
title: "Cloudflare 05 フレームワーク連携とデプロイ"
modified: 2026-09-29
---

## Static Assets(静的ファイル配信)
Worker のコードと静的ファイルを**1回のデプロイでまとめて**配信。
```jsonc
{
  "name": "my-site",
  "compatibility_date": "2026-09-29",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"   // SPA: 全パスを index.html に
  }
}
```
- 静的ファイルだけなら Worker のコードなしでも公開できる(配信は無料)
- API も欲しい → `main` に Worker を書き、`/api/*` は Worker、それ以外は静的ファイル
- 1ファイル最大 25MiB、1バージョンあたり無料 2万 / 有料 10万ファイル

## Cloudflare Vite プラグイン(`@cloudflare/vite-plugin`)
Vite の開発サーバーの中で **Workers と同じランタイム**を動かす → 開発と本番の差が小さい。
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
export default defineConfig({ plugins: [react(), cloudflare()] })
```
```json
"scripts": {
  "dev": "vite dev",
  "build": "vite build",
  "preview": "npm run build && vite preview",
  "deploy": "npm run build && wrangler deploy"
}
```

## フレームワーク別の始め方
| フレームワーク | コマンド / 方法 |
| --- | --- |
| **React + Vite(SPA + API)** | `npm create cloudflare@latest -- my-react-app --framework=react` |
| **TanStack Start** | `--framework=tanstack-start`、または Vite プラグイン設定([[TanStack Start_06_認証・DB・デプロイ・本番チェック]]) |
| **Next.js** | `--framework=next`(**vinext** 構成) |
| React Router / Astro / Vue / Nuxt / SvelteKit / Hono など | 各フレームワークガイドあり |

### Next.js on Cloudflare(2026年9月時点)
- **推奨: vinext**(Cloudflare 製。Next.js の API を Vite 上で再実装した Vite プラグイン。**ベータ**)
  - App Router、Pages Router、RSC、Server Actions、SSR ストリーミング、静的生成、ISR、middleware/proxy に対応。画像最適化は一部対応
  - 既存アプリ: `npx vinext check` で互換性チェック → 移行。AI エージェント用スキル `npx skills add cloudflare/vinext` で「migrate this project to vinext」と頼む方法も公式に案内
  - バインディングは `import { env } from 'cloudflare:workers'` で Server Components・Route Handlers・Server Actions から使う
- **OpenNext アダプタ**: vinext に移行できない既存アプリ向けに引き続き利用可能
- **静的エクスポート**の Next.js は Pages にも置ける
- ベータなので本番導入前に互換性ダッシュボードを確認すること

## デプロイ方法
### 1. CLI から
```bash
npm run build
npx wrangler deploy
```
### 2. Git 連携(Workers Builds)★ 実務の定番
1. ダッシュボード → Workers & Pages → Create application → **Import a repository**
2. GitHub / GitLab のリポジトリを選び、ビルド設定を確認して Save and Deploy
3. 以後 **push で自動ビルド・デプロイ**、ブランチごとに**プレビュー URL**
- ⚠️ ダッシュボードの Worker 名と `wrangler.jsonc` の `name` を一致させる(違うとビルド失敗)
- wrangler 設定がないリポジトリは自動検出(autoconfig)で設定が作られる
### 3. GitHub Actions
`cloudflare/wrangler-action` で CI からデプロイ(API トークンは GitHub Secrets に)→ [[Cicdパイプライン]]

## カスタムドメイン
1. ドメインを Cloudflare に追加(ネームサーバー変更)または Cloudflare Registrar で購入
2. Worker の Settings → Domains & Routes → Add → Custom Domain(または `routes` に `custom_domain: true`)
3. DNS レコードと SSL 証明書は自動

## バージョン管理とロールバック
- デプロイごとにバージョンが残る。`wrangler rollback` やダッシュボードから前のバージョンへ戻せる
- 段階的デプロイ(一部のトラフィックだけ新バージョン)も可能

## 関連
- 前: [[Cloudflare_04_環境変数・シークレット・環境分離]] / 次: [[Cloudflare_06_運用・制限・ベストプラクティス]]
- [[Vite_04_ビルドとデプロイ]] / [[Next.js_09_デプロイ・テスト・AI開発・実務チェックリスト]]
- 公式: https://developers.cloudflare.com/workers/static-assets/ , https://developers.cloudflare.com/workers/vite-plugin/ , https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ , https://developers.cloudflare.com/workers/ci-cd/builds/

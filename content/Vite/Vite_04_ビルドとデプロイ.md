---
title: "Vite 04 ビルドとデプロイ"
modified: 2026-09-29
---

## ビルド
```bash
npm run build     # dist/ に HTML・JS・CSS・画像を出力
npm run preview   # dist/ をローカルで配信して確認(http://localhost:4173)
```
- 出力は**静的ファイルだけ** → どこの静的ホスティングにも置ける
- ファイル名にハッシュ(`index-a1b2c3.js`)が付く → 長期キャッシュ可能
- 自動で: コード分割(動的 import ごと)、CSS 分割、preload タグ生成、圧縮
- ⚠️ `preview` は確認用。本番サーバーとして使わない

## base(サブディレクトリに置く時)
```ts
// https://example.com/my-app/ に置く場合
export default defineConfig({ base: '/my-app/' })
```
- アセットのパスが自動で書き換わる。コード内で URL を組み立てる時は `import.meta.env.BASE_URL`
- GitHub Pages(`https://user.github.io/repo/`)でよく必要になる

## SPA のルーティングの注意
React Router などで `/about` を直接開くと、静的サーバーには `about.html` がないので 404 になりがち → **全パスを `index.html` に返す設定**(SPA フォールバック)が必要。
- Cloudflare Workers(Static Assets): `wrangler.jsonc` で `"assets": { "not_found_handling": "single-page-application" }`
- Netlify: `_redirects` に `/* /index.html 200`
- Vercel: 多くは自動

## デプロイ先
### Cloudflare Workers(Vite プラグイン)
```bash
npm install --save-dev @cloudflare/vite-plugin
```
```ts
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'
export default defineConfig({ plugins: [react(), cloudflare()] })
```
```jsonc
// wrangler.jsonc
{ "name": "my-vite-app" }
```
```bash
npm run build && npx wrangler deploy
```
- 開発中から Workers の実行環境で動くので、同じプロジェクトに API(Worker)を足せる → [[Cloudflare_05_フレームワーク連携とデプロイ]]

### その他(公式に手順あり)
| サービス | 方法 |
| --- | --- |
| Cloudflare Pages | Git 連携してビルドコマンド `npm run build`、出力 `dist` |
| Vercel / Netlify | Git 連携(Vite を自動認識)または CLI |
| GitHub Pages | GitHub Actions で build → Pages へ(`base` に注意) |
| Firebase / Render / Azure Static Web Apps など | 各 CLI |

## ブラウザ互換
- 既定のターゲットはモダンブラウザ。古いブラウザ対応が必要なら `@vitejs/plugin-legacy`
- `build.target` で出力の JS バージョンを調整

## ライブラリとして公開する
`build.lib` で npm パッケージ向けのビルド(Library Mode)も可能。

## デプロイ前チェック
- [ ] `tsc --noEmit`(型エラー)と lint が通る
- [ ] `npm run build` → `npm run preview` で動作確認
- [ ] 本番用の `.env.production` / デプロイ先の環境変数(`VITE_` に秘密がないか)
- [ ] SPA フォールバック設定、`base` の確認
- [ ] 大きすぎるチャンクの警告が出ていないか(動的 import で分割)

## 関連
- 前: [[Vite_03_設定とプラグイン]] / 次: [[Vite_05_実務構成・テスト・性能・トラブル]]
- 公式: https://vite.dev/guide/build , https://vite.dev/guide/static-deploy

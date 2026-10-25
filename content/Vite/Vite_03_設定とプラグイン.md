---
title: "Vite 03 設定とプラグイン"
modified: 2026-09-29
---

## vite.config.ts の基本
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },   // import '@/components/...'
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // 開発中、/api へのリクエストをバックエンドへ転送(CORS 回避)
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```
- `defineConfig` で囲むとエディタの補完が効く
- エイリアスを使う時は `tsconfig.json` の `paths` も合わせる(型補完のため):
```json
{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }
```

## 条件付き設定(開発と本番で変える)
```ts
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    return { /* 開発用 */ }
  }
  return { /* ビルド用 */ }
})
```
- 設定ファイル内で `.env` を読むには `loadEnv(mode, process.cwd())`

## よく使う設定項目
| 項目 | 意味 |
| --- | --- |
| `plugins` | プラグイン一覧 |
| `base` | 公開パス(サブディレクトリに置く時 `/my-app/`) |
| `resolve.alias` | import のエイリアス |
| `server.port` / `host` / `open` | 開発サーバー |
| `server.proxy` | API への転送 |
| `server.allowedHosts` | 開発サーバーにアクセスできるホスト名(トンネル利用時など) |
| `build.outDir` / `sourcemap` / `target` | ビルド出力 |
| `envPrefix` | 公開する環境変数の接頭辞(既定 `VITE_`) |
| `css.modules` | CSS Modules の設定 |

## プラグイン
```bash
npm add -D @vitejs/plugin-react
```
代表的なもの:
| プラグイン | 用途 |
| --- | --- |
| `@vitejs/plugin-react` | React(Fast Refresh) |
| `@vitejs/plugin-react-swc` | React(SWC 版) |
| `@vitejs/plugin-rsc` | React Server Components |
| `@vitejs/plugin-vue` | Vue |
| `@tailwindcss/vite` | Tailwind CSS v4 |
| `@cloudflare/vite-plugin` | Cloudflare Workers 実行環境で開発 → [[Cloudflare_05_フレームワーク連携とデプロイ]] |
| `@tanstack/router-plugin` | TanStack Router のファイルベースルーティング |
| `vite-plugin-checker` | 型・lint エラーをブラウザに表示 |
| `vite-plugin-pwa` | PWA 化 |
- 探す: 公式の Plugins ページ、awesome-vite
- Rollup/Rolldown 用プラグインの多くもそのまま使える
- `apply: 'build'` / `'serve'` で片方だけ適用、`enforce: 'pre' | 'post'` で順序

## 開発サーバーの小技
- `vite --host` で同じWi-Fi のスマホから確認(表示される Network の URL にアクセス)
- `server.warmup` でよく使うファイルを事前変換(起動後の初回表示を速く)
- `server.forwardConsole`: ブラウザのコンソールをターミナルに転送(AI エージェントにエラーを見せたい時に便利)

## 関連
- 前: [[Vite_02_開発の基本(TS・CSS・静的ファイル・環境変数)]] / 次: [[Vite_04_ビルドとデプロイ]]
- 公式: https://vite.dev/config/ , https://vite.dev/config/server-options , https://vite.dev/guide/using-plugins

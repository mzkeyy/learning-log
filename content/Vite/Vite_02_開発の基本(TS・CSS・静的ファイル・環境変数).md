---
title: "Vite 02 開発の基本(TS・CSS・静的ファイル・環境変数)"
modified: 2026-09-29
---

## npm パッケージの import
```ts
import { format } from 'date-fns'   // ブラウザ単体では動かない書き方を Vite が解決
```
- 依存は事前バンドル(CommonJS → ESM 変換も)され、`node_modules/.vite/deps/` にキャッシュ
- 依存を更新したのに反映されない → `vite --force`(キャッシュ再作成)

## TypeScript
- `.ts` `.tsx` をそのまま import できる(Oxc で超高速に変換)
- ⚠️ **Vite は型チェックをしない**(変換だけ)。型エラーがあってもビルドは通る
  - エディタで確認 + ビルド時に `tsc --noEmit`(テンプレートの build スクリプトは `tsc -b && vite build`)
  - 開発中も見たいなら別ターミナルで `tsc --noEmit --watch`、または `vite-plugin-checker`
- `tsconfig.json` で `"isolatedModules": true` を必ず
- 型だけの import は `import type { User } from './types'`
- `vite/client` の型: 画像 import、`import.meta.env`、`import.meta.hot` の型を提供
- tsconfig の `paths` を使いたい → 設定で `resolve.tsconfigPaths: true`(または `resolve.alias`)

## CSS
```ts
import './styles.css'                 // ページに注入(HMR 対応)
import styles from './Button.module.css'   // CSS Modules(クラス名が衝突しない)
<button className={styles.primary} />
```
- PostCSS 設定があれば自動適用(Tailwind v4 は `@tailwindcss/vite` プラグインが定番)
- Sass/Less: `npm add -D sass-embedded` を入れるだけで `.scss` が使える
- `?inline` を付けると注入せず文字列として取得
- 本番の CSS 圧縮は Lightning CSS

## 静的ファイル(画像など)
### import して使う(推奨)
```ts
import logoUrl from './assets/logo.png'   // ビルド時にハッシュ付きファイル名になる
<img src={logoUrl} alt="logo" />
```
- 小さいファイルは自動で base64 インライン化
- `?url`(URL として)、`?raw`(文字列として)、`?inline`、`?worker`(Web Worker として)
### `public/` に置く
- import せずに `/favicon.ico` のようにルートパスで参照。そのまま `dist/` にコピー(名前変更なし)
- 用途: `robots.txt`、favicon、ファイル名を変えてはいけないもの

## 環境変数とモード
```bash
# .env
VITE_API_URL=https://api.example.com   # ← ブラウザのコードから読める
DB_PASSWORD=foobar                      # ← 読めない(undefined)
```
```ts
console.log(import.meta.env.VITE_API_URL)
if (import.meta.env.DEV) { console.log('開発中だけ') }   // 本番ビルドでは消える
```
- **`VITE_` 付きの値はビルド時に JS に埋め込まれ、誰でも見られる → API キーなどの秘密は入れない**(秘密が必要な処理はサーバー側で)
- 値は常に**文字列**(数値・真偽値は自分で変換)
- 組み込み: `import.meta.env.MODE` `BASE_URL` `PROD` `DEV` `SSR`

### .env ファイルの読み込み順
```text
.env                # 常に
.env.local          # 常に・git 除外
.env.[mode]         # そのモードだけ(例 .env.production)
.env.[mode].local   # そのモードだけ・git 除外
```
- モード別 > 共通。実行時にシェルで渡した変数が最優先
- `.env` を変えたら**開発サーバーを再起動**
- `*.local` を `.gitignore` に
- モード: `vite` は development、`vite build` は production、`vite build --mode staging` で任意
- 型を付ける: `src/vite-env.d.ts` で `interface ImportMetaEnv { readonly VITE_API_URL: string }`

## その他の便利機能
- **glob import**: `import.meta.glob('./posts/*.md')` でフォルダ内のファイルをまとめて読み込む
- **動的 import**: `const mod = await import('./heavy')` → 自動でコード分割
- **JSON import**: `import data from './data.json'`
- **Web Workers**: `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`
- **WebAssembly**: `import init from './x.wasm?init'`

## 関連
- 前: [[Vite_01_はじめに(仕組み・作成・構成)]] / 次: [[Vite_03_設定とプラグイン]]
- [[APIキー・シークレット管理]]
- 公式: https://vite.dev/guide/features , https://vite.dev/guide/assets , https://vite.dev/guide/env-and-mode

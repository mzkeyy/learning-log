---
title: "shadcn/ui 02 導入と CLI"
modified: 2026-09-29
---

## 導入方法は3通り
### 1. shadcn/create(見た目を選んでから作る)
https://ui.shadcn.com/create で**スタイル・色・フォント・アイコン・角丸**を画面で選ぶ → 生成されたコマンドをコピー:
```bash
npx shadcn@latest init --preset [CODE] --template next
```

### 2. CLI で新規プロジェクト
```bash
npx shadcn@latest init -t next          # Next.js
npx shadcn@latest init -t vite          # Vite + React
npx shadcn@latest init -t start         # TanStack Start
npx shadcn@latest init -t next --monorepo
```
テンプレート: `next` `vite` `start` `react-router` `laravel` `astro`

### 3. 既存プロジェクトに追加
前提: **Tailwind CSS 導入済み**、`tsconfig.json` に `@/*` エイリアス
```bash
npx create-next-app@latest               # 既定設定なら Tailwind・@/* 済み
npx shadcn@latest init                   # 設定・依存・cn()・CSS 変数を追加
npx shadcn@latest add button
```
```tsx
import { Button } from '@/components/ui/button'
export default function Home() {
  return <Button>Click me</Button>
}
```
- Vite の場合は `@tailwindcss/vite` と `vite.config.ts` / `tsconfig.json` のエイリアス設定が必要(公式手順あり)

## init の主なオプション
| オプション | 意味 |
| --- | --- |
| `-t, --template` | next / vite / start / react-router / laravel / astro |
| `-b, --base` | 土台ライブラリ: `base`(Base UI) / `radix` / `aria` |
| `-p, --preset` | プリセット(create で作ったもの) |
| `-d, --defaults` | 既定(`--template=next --preset=nova`) |
| `--monorepo` | モノレポ構成 |
| `--rtl` | 右から左の言語対応 |
| `--no-css-variables` | CSS 変数を使わない(非推奨) |
`create` は `init` の別名。

## CLI コマンド一覧
| コマンド | 用途 |
| --- | --- |
| `init` / `create` | 初期化・新規作成 |
| `add [部品...]` | 部品を追加(`add button card dialog`、`add @acme/hero` など他レジストリも) |
| `view [部品...]` | 追加せずにコードを見る |
| `search` / `list` | レジストリ内を検索(`search @shadcn -q "button"`) |
| `apply [preset]` | プリセットを適用(`--only theme` でテーマだけ) |
| `preset decode/info/url/open` | プリセットの中身確認 |
| `diff` | 手元の部品と最新版の差分(スキルの説明より) |
| `docs` | ドキュメント参照 |
| `info` | プロジェクト設定の表示(`--json` で AI 向け) |
| `build` | 自作レジストリをビルド |
| `migrate` | 移行作業(アイコンライブラリ変更など) |
| `eject` | 設定の切り離し |
| `mcp init --client claude` | MCP サーバー設定([[shadcn-ui_06_レジストリ・MCP・AI開発・実務の注意]]) |
- モノレポでは `-c apps/web` で対象ワークスペースを指定

## components.json(設定ファイル)
```json
{
  "style": "base-nova",
  "rsc": true,                        // React Server Components 対応('use client' を付けるか)
  "tsx": true,
  "tailwind": {
    "config": "",                     // Tailwind v4 は空
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "utils": "@/lib/utils",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": { "@acme": "https://acme.com/r/{name}.json" }
}
```
- `init` 時に決めた `style`・`baseColor` は後から変えにくい → 最初に create で見た目を決めておくと楽

## 関連
- 前: [[shadcn-ui_01_考え方と仕組み]] / 次: [[shadcn-ui_03_テーマ・デザイントークン・ダークモード]]
- 公式: https://ui.shadcn.com/docs/installation/next , https://ui.shadcn.com/docs/cli , https://ui.shadcn.com/docs/components-json

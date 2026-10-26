---
title: "Next.js 01 はじめに(React 基礎・インストール・構成)"
modified: 2026-09-29
---

## 0. 前提:React の最低限
Next.js は React の上に乗っている。まずこれだけ押さえる。

### コンポーネント = 画面の部品を返す関数
```tsx
function Greeting({ name }: { name: string }) {   // props(引数)を受け取る
  return <p>こんにちは、{name}さん</p>          // JSX(HTMLに似た記法)を返す
}

export default function Page() {
  return (
    <main>
      <Greeting name="山田" />   {/* 部品を組み合わせる */}
    </main>
  )
}
```
- **JSX**: JS の中に HTML 風に書ける。`class` ではなく `className`、`{}` の中に JS の式
- **props**: 親から子へ渡すデータ(読み取り専用)
- **state**: 部品が持つ「変わる値」。`useState` で作る(ブラウザで動く部品でのみ使える)
```tsx
'use client'
import { useState } from 'react'
export function Counter() {
  const [count, setCount] = useState(0)          // [今の値, 更新関数]
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```
- **hooks**: `use` で始まる関数(`useState`, `useEffect` など)。部品の中のトップレベルでだけ呼ぶ
- **リスト表示**: `items.map(item => <li key={item.id}>{item.name}</li>)`(`key` 必須)
- **条件表示**: `{isLoggedIn ? <A/> : <B/>}`、`{error && <p>{error}</p>}`

## 1. 動作環境
- Node.js **20.9 以上**、macOS / Windows(WSL含む) / Linux
- TypeScript を使う場合 v5.1 以上(TS推奨)

## 2. プロジェクト作成
```bash
npx create-next-app@latest my-app --yes   # おすすめ設定で一発作成
cd my-app
npm run dev                               # http://localhost:3000
```
`--yes` の既定: **TypeScript / Tailwind CSS / ESLint / App Router / Turbopack**、import エイリアス `@/*`、**AGENTS.md と CLAUDE.md**(AIエージェントに最新の Next.js の書き方を教えるファイル)まで生成される。

対話式で選ぶ場合の質問: TypeScript? / Linter(ESLint or Biome)? / React Compiler? / Tailwind? / `src/` を使う? / App Router?(推奨) / import エイリアス / AGENTS.md?

### package.json のスクリプト
| コマンド | 意味 |
| --- | --- |
| `npm run dev` | 開発サーバー(Turbopack、保存で即反映) |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番サーバー起動(build 後) |
| `npm run lint` | ESLint(※ v16 から build 時に自動で lint されない) |

## 3. フォルダ構成
### トップレベル
| 名前 | 役割 |
| --- | --- |
| `app/` | **App Router**(ページ・レイアウト・API)。これを使う |
| `pages/` | 旧方式の Pages Router(新規では使わない) |
| `public/` | 画像などの静的ファイル。`public/logo.png` → `/logo.png` |
| `src/` | 任意。`src/app/` のようにコードを設定ファイルと分けたい時 |
| `next.config.ts` | Next.js の設定 |
| `proxy.ts` | リクエスト前の処理(旧 middleware.ts) |
| `.env` / `.env.local` など | 環境変数(**git に入れない**) |
| `tsconfig.json` | TypeScript 設定 |
| `instrumentation.ts` | 監視(OpenTelemetry)用 |

### app/ の中の特別なファイル
| ファイル | 役割 |
| --- | --- |
| `layout.tsx` | 共通の枠(ヘッダー・ナビ)。**ルートの layout は必須で `<html><body>` を含む** |
| `page.tsx` | そのURLのページ。これがあると公開される |
| `loading.tsx` | 読み込み中の表示(スケルトン) |
| `error.tsx` | エラー時の表示 |
| `not-found.tsx` | 404 表示 |
| `route.ts` | API エンドポイント |
| `template.tsx` / `default.tsx` | 再描画されるレイアウト / パラレルルートの予備 |

### 実務でよくある構成例
```text
my-app/
├── app/
│   ├── layout.tsx            # 全体の枠
│   ├── page.tsx              # トップ /
│   ├── (marketing)/about/page.tsx   # () はURLに出ないグループ → /about
│   ├── blog/
│   │   ├── page.tsx          # /blog
│   │   └── [slug]/page.tsx   # /blog/記事名
│   ├── dashboard/
│   │   ├── layout.tsx        # ダッシュボード専用の枠
│   │   └── page.tsx
│   └── api/posts/route.ts    # /api/posts
├── components/               # 汎用UI(shadcn の components/ui もここ)
├── lib/                      # DBアクセス、ユーティリティ、認証
├── public/
└── next.config.ts
```
- `_folder`(アンダースコア)= ルーティング対象外のプライベートフォルダ
- `(group)` = URLに影響しないグループ化(レイアウトを分けたい時に便利)

## 4. 最初に設定しておくと良いこと
- **import エイリアス**: `import { Button } from '@/components/button'`(`../../../` を避ける)
- **VS Code**: 同名ファイル(page.tsx だらけ)を区別するため `workbench.editor.customLabels.patterns` を設定(公式に設定例あり)
- **TypeScript プラグイン**: VS Code で「TypeScript: Select TypeScript Version → Use Workspace Version」
- **アップグレード**: `npx next upgrade`(セキュリティ修正が頻繁なので定期的に)

## 関連
- [[Next.js]] / 次: [[Next.js_02_ルーティング]]
- [[React]] … React そのもの(フック・React 19・状態管理)を詳しく
- 公式: https://nextjs.org/docs/app/getting-started/installation , https://nextjs.org/docs/app/getting-started/project-structure

---
title: "TanStack Start 01 はじめに(概要・作成・構成)"
modified: 2026-09-29
---

## TanStack とは
Tanner Linsley らが作る、オープンソースのライブラリ群。
- **TanStack Query**(旧 React Query): サーバーデータの取得・キャッシュ
- **TanStack Router**: 型安全なルーター
- **TanStack Table / Form / Virtual** など
- **TanStack Start**: Router を中心にした**フルスタック**フレームワーク

## Start か Router 単体か
公式: 「フレームワークの9割はルーター」。Start は Router に以下を足したもの:
SSR、ストリーミング、Server Routes(API)、Server Functions、ミドルウェア、サーバー込みのビルド、各種デプロイ対応。
→ **これらが確実に要らない**(社内ツールの SPA など)なら **TanStack Router + Vite** だけで十分。

## プロジェクト作成
### 方法1: TanStack Builder(公式推奨・AI 対応の作成画面)
https://tanstack.com/builder

### 方法2: CLI
```bash
npx @tanstack/cli@latest create
# パッケージマネージャ、Tailwind CSS、ESLint などを選択
```

### 方法3: 公式サンプルから
```bash
npx gitpick TanStack/router/tree/main/examples/react/start-basic start-basic
cd start-basic
npm install
npm run dev
```
サンプル: `start-basic` / `start-basic-auth` / `start-basic-react-query` / `start-clerk-basic` / `start-supabase-basic` / `start-workos` / `start-convex-trellaux` / `start-basic-cloudflare` など

## フォルダ構成
```text
my-app/
├── src/
│   ├── routes/                 ★ ファイル = ルート
│   │   ├── __root.tsx          ルート(<html> の枠。必須)
│   │   ├── index.tsx           /
│   │   ├── about.tsx           /about
│   │   ├── posts.tsx           /posts のレイアウト
│   │   ├── posts/index.tsx     /posts
│   │   ├── posts/$postId.tsx   /posts/:postId
│   │   └── api/users.ts        API(server ハンドラ)
│   ├── router.tsx              ルーター設定(getRouter を export)
│   ├── routeTree.gen.ts        自動生成(触らない)
│   ├── start.ts                任意:グローバルミドルウェア等
│   └── utils/
│       ├── users.functions.ts  Server Functions
│       ├── users.server.ts     サーバー専用処理(DB)
│       └── schemas.ts          共有の検証スキーマ
├── vite.config.ts
└── package.json
```

### router.tsx
```tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
export function getRouter() {           // ★ 毎回新しいルーターを返す(SSR でリクエストごとに作るため)
  return createRouter({ routeTree, scrollRestoration: true })
}
```

### __root.tsx(HTML の枠)
```tsx
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  component: () => (
    <html lang="ja">
      <head><HeadContent /></head>   {/* title・meta を出力 */}
      <body>
        <Outlet />                   {/* 子ルートが入る場所 */}
        <Scripts />                  {/* クライアントJS。必須 */}
      </body>
    </html>
  ),
})
```

### vite.config.ts
```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [tanstackStart(), viteReact()],
})
```

## よく使う import 元
| パッケージ | 主なもの |
| --- | --- |
| `@tanstack/react-router` | `createFileRoute` `Link` `Outlet` `redirect` `notFound` `useNavigate` `ClientOnly` |
| `@tanstack/react-start` | `createServerFn` `createMiddleware` `createServerOnlyFn` `createIsomorphicFn` `useServerFn` |
| `@tanstack/react-start/server` | `getRequest` `getRequestHeader` `setResponseHeaders` `setResponseStatus` |

## 関連
- 次: [[TanStack Start_02_ルーティングとデータ読み込み]]
- 公式: https://tanstack.com/start/latest/docs/framework/react/getting-started

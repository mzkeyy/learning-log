---
title: "React Router 01 はじめに(3つのモード・作成・構成)"
modified: 2026-11-01
---

## React Router とは
- React で **URL に合わせて表示する画面を切り替える**ライブラリ。2014年からある定番
- 歴史: v6 まではルーター専用 → **v7(2024年)で Remix と合体**し、SSR などのフレームワーク機能が入った → **v8(2026年6月)**
- Remix の考え方(**Web 標準**の `Request` / `Response` / `FormData`、`<form>` を中心にした作り)をそのまま引き継いでいる

## モードの選び方
| | Framework | Data | Declarative |
| --- | --- | --- | --- |
| 始め方 | `npx create-react-router@latest` | `createBrowserRouter` を自分で置く | `<BrowserRouter>` で囲む |
| ルート定義 | `app/routes.ts`(またはファイル名) | ルートオブジェクトの配列 | JSX の `<Route>` |
| データ読み込み・更新 | `loader` / `action`(サーバーでもブラウザでも) | `loader` / `action`(ブラウザ) | なし(自分で用意) |
| SSR・プリレンダー | ◎ 設定1つ | 自分で組む | 自分で組む |
| 型の自動生成 | ◎ `+types` | 手で書く | 手で書く |
| 自動のコード分割 | ◎ | `lazy` で手動 | 手動 |
- **迷ったら Framework**。あとから SSR をやめる・付けるのも設定1行で変えられる
- Data / Declarative は「既存の SPA にルーターだけ入れたい」「ビルドやサーバーは自分で決めたい」とき → [[React Router_06_実務(Zod検証・テスト・デプロイ・v8移行・AI開発)]]

## 作成(Framework モード)
```sh
npx create-react-router@latest my-app
cd my-app
npm i
npm run dev        # http://localhost:5173
```
- テンプレートを選べる: `--template remix-run/react-router-templates/<名前>`

| テンプレート | 中身 |
| --- | --- |
| `default` | SSR + Tailwind CSS + Dockerfile(Node で動かす) |
| `node-custom-server` | Express の自作サーバー |
| `node-postgres` | + PostgreSQL と Drizzle → [[PostgreSQLとDrizzle]] |
| `unstable_rsc-framework-mode` | React Server Components(実験的) |
- Cloudflare Workers・Vercel・Netlify は各社がテンプレートを用意 → 06

### package.json のスクリプト
```json
{
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "react-router-serve ./build/server/index.js",
    "typecheck": "react-router typegen && tsc"
  }
}
```

## フォルダ構成
```
my-app/
├── app/
│   ├── root.tsx            # 一番外側のルート(<html> を描く)。必須
│   ├── routes.ts           # URL とファイルの対応表。必須
│   ├── routes/
│   │   └── home.tsx        # ルートモジュール(1画面 = 1ファイル)
│   ├── app.css
│   ├── entry.client.tsx    # 任意。ブラウザ側の入口(ハイドレーション)
│   └── entry.server.tsx    # 任意。サーバー側の入口(HTML の生成)
├── public/                 # そのまま配る静的ファイル
├── react-router.config.ts  # SSR の有無・プリレンダーなどの設定
├── vite.config.ts          # Vite の設定(reactRouter() プラグイン)
├── .react-router/types/    # 自動生成される型(git に入れない)
└── .agents/skills/react-router/   # AI エージェント向けの説明(Agent Skill)
```
- `entry.client.tsx` / `entry.server.tsx` は**ないときは既定のものが使われる**。中身を見たり変えたりしたいときは `npx react-router reveal`
- 名前に `.server` が付くファイル(`db.server.ts` など)は**ブラウザ用のコードに入らない**。入りそうになるとビルドがエラーになる。`.client` はその逆

### 設定ファイル
```ts
// react-router.config.ts
import type { Config } from "@react-router/dev/config";
export default {
  ssr: true,                   // false にすると SPA モード → 05
  // prerender: ["/", "/about"], // ビルド時に HTML を作るページ
} satisfies Config;
```
```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: { tsconfigPaths: true },  // "~/..." の import を使えるように
});
```

## root.tsx
すべてのページを包む**一番外側のルート**。`<html>` から書く。
```tsx
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

// HTML の骨組み。通常の画面でもエラー画面でもこれで包まれる
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />       {/* 各ルートの meta */}
        <Links />      {/* 各ルートの links(CSS など) */}
      </head>
      <body>
        {children}
        <ScrollRestoration />  {/* 戻る・進むでスクロール位置を戻す */}
        <Scripts />            {/* ハイドレーション用の JS */}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;   // ここに子ルートの画面が入る
}

// どこかで投げられたエラーで、子ルートに ErrorBoundary がなければここが出る
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return <h1>{error.status === 404 ? "ページが見つかりません" : "エラー"}</h1>;
  }
  return <h1>予期しないエラーが起きました</h1>;
}
```

## 1画面の流れ(SSR のとき)
```
初回アクセス(GET /products/1)
  サーバー: middleware → loader → コンポーネントを HTML に → 返す
  ブラウザ: HTML を表示 → JS を読み込み → ハイドレーション(ボタンが動くようになる)

画面内のリンクで移動(クライアント遷移)
  ブラウザ: 次のルートの loader だけサーバーに fetch(/products/2.data) → 画面を差し替え
```
- 2回目以降の移動は **HTML ではなくデータだけ**を取りに行く(SPA と同じ速さ)
- 仕組みの詳細 → [[SSR]]

## 関連
- 次: [[React Router_02_ルーティング(routes.ts・入れ子・Link)]]
- [[React Router]] / [[Vite]] / [[React]]
- 公式: https://reactrouter.com/start/modes , https://reactrouter.com/start/framework/installation , https://github.com/remix-run/react-router-templates

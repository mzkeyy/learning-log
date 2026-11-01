---
title: "React Router"
modified: 2026-11-01
---

**React の画面遷移(ルーティング)を受け持つ定番ライブラリ**。v7 で **Remix と1つになり**、ルーターとしても、SSR まで面倒を見るフルスタックのフレームワークとしても使える。作っているのは Shopify の Remix チーム。

公式ドキュメント(reactrouter.com、npm パッケージ同梱の docs、**2026年11月時点。React Router 8.5**)を読み、実際にアプリを作って動かして整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[React Router_01_はじめに(3つのモード・作成・構成)]] | 何者か、3つのモードの選び方、作成方法、フォルダ構成 |
| 02 | [[React Router_02_ルーティング(routes.ts・入れ子・Link)]] | `routes.ts`、入れ子とレイアウト、動的セグメント、`Link`・`NavLink`、検索パラメータ |
| 03 | [[React Router_03_データの読み込みと更新(loader・action・Form・fetcher)]] | `loader`・`action`、`Form`・`useFetcher`、送信中の表示、楽観的更新、エラー |
| 04 | [[React Router_04_ミドルウェア・認証・型安全]] | `middleware` と `context`、セッションと Cookie、ログイン、型の自動生成 |
| 05 | [[React Router_05_レンダリング戦略(SSR・SPA・プリレンダー・ストリーミング)]] | `ssr` の設定、SPA モード、プリレンダー、Suspense でのストリーミング、`clientLoader` |
| 06 | [[React Router_06_実務(Zod検証・テスト・デプロイ・v8移行・AI開発)]] | Zod でのフォーム検証、リソースルート、テスト、デプロイ、Data / Declarative モード、v8 への移行 |

## 3つのモード
| モード | 入口 | できること | 向く場面 |
| --- | --- | --- | --- |
| **Framework** | Vite プラグイン + `app/routes.ts` | Data の全部 + **SSR・型の自動生成・コード分割・プリレンダー** | **新しく作るならこれ**(迷ったらこれ) |
| Data | `createBrowserRouter` + `<RouterProvider>` | `loader`・`action`・送信中の状態・`useFetcher` | ビルドやサーバーは自分で決めたい SPA |
| Declarative | `<BrowserRouter>` + `<Routes>` | URL と画面を結ぶだけ(`Link`・`useParams` など) | 既存アプリ、データ取得は TanStack Query などに任せる |
- 機能は**足し算**: Declarative ⊂ Data ⊂ Framework
- 公式の目安: 「意見がないほど新しいなら Framework」「Next.js から移るなら Framework」

## 最小の例(Framework モード)
```ts
// app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";
export default [
  index("routes/home.tsx"),
  route("products/:id", "routes/product.tsx"),
] satisfies RouteConfig;
```
```tsx
// app/routes/product.tsx
import type { Route } from "./+types/product";   // 自動生成される型

export async function loader({ params }: Route.LoaderArgs) {
  return { product: await getProduct(params.id) }; // サーバーで動く(ブラウザのコードには入らない)
}

export default function Product({ loaderData }: Route.ComponentProps) {
  return <h1>{loaderData.product.name}</h1>;      // loaderData に型が付く
}
```

## Next.js・TanStack Start との違い
| | React Router(Framework) | [[Next.js]] | [[TanStack Start]] |
| --- | --- | --- | --- |
| 既定の描画 | SSR + ハイドレーション(普通の React) | Server Components が既定 | SSR + ハイドレーション |
| データ | ルートごとの `loader` / `action`(Web 標準の `Request`・`Response`・`FormData`) | Server Components で直接、Server Actions | `loader` + Server Functions |
| フォーム | `<Form>` が JS なしでも動く(段階的な強化) | Server Actions | Server Functions |
| ルート定義 | `routes.ts`(設定)またはファイル名 | フォルダ名 | ファイル名 |
| 型 | `+types` を自動生成 | `typedRoutes` | 型推論(URL・検索条件まで強い) |
| RSC | 実験的 | 標準 | 実験的 |
| ビルド | Vite | Turbopack | Vite |
| デプロイ先 | Node・Cloudflare・Vercel・Netlify など | Vercel が一番楽、ほかも可 | どこでも |
- **Web 標準に寄せている**のが一番の特徴。`loader` は `Request` を受け取り、`Response` やただのオブジェクトを返す
- **ルーターだけ**欲しい場合にも使える(Data・Declarative モード)のは React Router だけ

## 押さえどころ(2026年11月時点)
- 最新は **v8**(2026年6月)。中身は v7 の「future フラグ」を既定にした小さな変更。**ミドルウェアは常に有効**、`react-router-dom` パッケージは廃止(`react-router` と `react-router/dom` から import)
- 動かすのに **Node 22.22 以上、React 19.2.7 以上、Vite 7 以上**が必要。パッケージは ESM のみ
- 年に1回メジャー版を出す方針。v6 と Remix v2 はサポート終了
- 認証は**親の loader では守れない**(loader は並列に動く)。`middleware` か、各 loader / action で確認する → 04
- `<meta>`・`<title>` は React 19 の組み込みの書き方が推奨になった(`meta` エクスポートも使える)
- 新しいテンプレートには AI 向けの **Agent Skill**(`.agents/skills/react-router`)が入る → 06

## 関連
- [[React]] / [[Vite]] / [[Next.js]] / [[TanStack Start]] / [[Zod]] / [[SSR]]
- [[Hono]] / [[Cloudflare]] / [[認証]] / [[REST]]
- 公式: https://reactrouter.com/home , https://reactrouter.com/start/modes , https://remix.run/blog/react-router-v8

---
title: "TanStack Start"
modified: 2026-10-18
---

**TanStack Router(型安全なルーター)を土台にしたフルスタック React フレームワーク**。TanStack Query(旧 React Query)を作っているチームが開発。[[Next.js]] の対抗馬として注目されている。ビルドは [[Vite]](または Rsbuild)。

公式ドキュメント(tanstack.com/start、**2026年9月時点。公式表記はまだ Release Candidate = 機能・API は安定、v1 直前**)を読んで整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[TanStack Start_01_はじめに(概要・作成・構成)]] | 何者か、作成方法、フォルダ構成 |
| 02 | [[TanStack Start_02_ルーティングとデータ読み込み]] | ファイルルート、params、search params、loader、beforeLoad |
| 03 | [[TanStack Start_03_実行モデルとServer Functions]] | どこでコードが動くか、サーバー関数 |
| 04 | [[TanStack Start_04_ミドルウェア・Server Routes・環境変数]] | 認証ミドルウェア、API、秘密情報 |
| 05 | [[TanStack Start_05_レンダリング戦略・SEO・TanStack Query]] | SSR / SPA / プリレンダー、head、Query 連携 |
| 06 | [[TanStack Start_06_認証・DB・デプロイ・本番チェック]] | 認証、DB、Cloudflare 等、本番前確認、Next.js との選択 |

## 特徴(公式)
- フルドキュメント SSR・ストリーミング
- **Server Functions**: クライアントから型付きで呼べるサーバー処理(RPC)。ネットワークをまたぐので入力検証とセットで
- **Server Routes**: 同じ `routes/` に API エンドポイント
- **ミドルウェアとコンテキスト**(認証・ログ・CSP)
- **エンドツーエンドの型安全**(URL・パラメータ・検索条件・データまで型が通る → [[静的型付言語]])
- どこにでもデプロイ(Cloudflare・Netlify・Railway・Vercel・Node・Bun など)
- React だけでなく Solid にも対応
- React Server Components は**実験的**
- SSR やサーバー関数が要らないなら **TanStack Router 単体**で十分(公式の目安)

## Next.js との違い
| | TanStack Start | Next.js |
| --- | --- | --- |
| 既定の描画 | 全部 SSR + ハイドレーション(普通の React) | Server Components が既定、`"use client"` で境界 |
| コードの実行場所 | **既定で両方(isomorphic)**。サーバー専用は明示 | 既定でサーバー |
| ルーティング | TanStack Router(URL・検索条件まで強い型) | App Router(`typedRoutes` で型チェック可) |
| サーバー処理 | `createServerFn`(GET/POST、検証、ミドルウェア) | Server Actions(フォームと統合) |
| キャッシュ | Router の loader キャッシュ / TanStack Query | `use cache` / cacheLife / タグ |
| ビルド | Vite / Rsbuild | Turbopack |
| 情報量・AI の得意度 | 増えているがまだ少なめ | 非常に多い |
| 強み | 型安全な URL 状態、明示的な loader、どこでもデプロイ | RSC、next/image・font・metadata、情報量 |

## 初学者はどちらを選ぶ?
- **まずは [[Next.js]]**(情報量が多く、AI も正確なコードを書きやすい)
- 型安全さや構造の明示性を重視したくなったら TanStack Start。使う時は AI に最新ドキュメント(llms.txt や MCP)を参照させると精度が上がる
- 詳しい判断基準 → [[TanStack Start_06_認証・DB・デプロイ・本番チェック]]

## 出典
- 公式: https://tanstack.com/start/latest/docs/framework/react/overview
- [TanStack Start v1 Release Candidate (公式ブログ)](https://tanstack.com/blog/announcing-tanstack-start-v1)
- [Server Functions (公式)](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Start: A New Meta Framework (InfoQ)](https://www.infoq.com/news/2025/11/tanstack-start-v1/)

## 関連
- [[Next.js]] / [[Vite]] / [[Cloudflare]]

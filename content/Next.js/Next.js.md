---
title: "Next.js"
modified: 2026-10-18
---

**React(画面の部品を作るライブラリ)で「Webサイト全体」を作るためのフレームワーク**。ルーティング・サーバー処理・データ取得・キャッシュ・画像最適化・ビルドまで面倒を見てくれる。Vercel 社が開発。現在もっとも普及している React フレームワークで、迷ったらこれ。

公式ドキュメント(nextjs.org/docs、**v16.3 系 / 2026年9月時点**)の App Router 部分を読んで整理したノート群の入口。

## 学ぶ順番
| # | ノート | 学ぶこと |
| --- | --- | --- |
| 01 | [[Next.js_01_はじめに(React基礎・インストール・構成)]] | React の最低限、プロジェクト作成、フォルダ構成 |
| 02 | [[Next.js_02_ルーティング]] | page / layout / 動的ルート / Link / loading / not-found / API / proxy |
| 03 | [[Next.js_03_Server ComponentsとClient Components]] | 最重要概念。"use client" の境界 |
| 04 | [[Next.js_04_データ取得とストリーミング]] | fetch・DB、Suspense、並列取得 |
| 05 | [[Next.js_05_データ更新(Server Actions・フォーム)]] | フォーム送信、バリデーション、エラー処理 |
| 06 | [[Next.js_06_キャッシュと再検証]] | use cache、cacheLife、revalidateTag |
| 07 | [[Next.js_07_スタイル・画像・フォント・SEO]] | Tailwind、next/image、next/font、metadata |
| 08 | [[Next.js_08_認証とセキュリティ]] | 環境変数、DAL、認証、監査チェックリスト |
| 09 | [[Next.js_09_デプロイ・テスト・AI開発・実務チェックリスト]] | 本番化、テスト、AIエージェント連携 |

## 全体像(リクエストの流れ)
```
ブラウザ ──リクエスト──▶ proxy.ts(任意:リダイレクト等)
                        │
                        ▼
                app/ のフォルダ構成で URL が決まる
                ├─ layout.tsx(共通の枠)
                ├─ page.tsx(Server Component:サーバーでデータ取得して HTML 化)
                │    └─ "use client" の部品(ブラウザで動くボタン等)
                └─ route.ts(API:JSON を返す)
                        │
       フォーム送信 ──▶ Server Actions("use server" の関数でDB更新)
```

## 3行で覚える核心
1. **フォルダ = URL**(`app/blog/[slug]/page.tsx` → `/blog/xxx`)
2. **基本はサーバーで動く**。クリックや入力など動きが必要な部品だけ `"use client"`
3. **データ取得はコンポーネントの中で `await`**、更新は **Server Actions**、速さは **キャッシュ + Suspense**

## 用語: どこで HTML を作るか(レンダリング方式)
一般的な呼び方。Next.js 16 では「静的に作れる部分は作り、動的な部分だけリクエスト時に流す」組み合わせが基本([[Next.js_06_キャッシュと再検証]])。
| 方式 | 意味 | 向いているページ |
| --- | --- | --- |
| SSG(静的生成) | ビルド時に HTML を作っておく | 会社概要・ブログ |
| SSR(サーバーレンダリング) | アクセスのたびにサーバーで作る | ログイン後の画面 |
| CSR(クライアントレンダリング) | ブラウザ側で作る | 操作の多い画面 |

## 生成AIと開発するときの注意
- AI が古い書き方(Pages Router、`middleware.ts`、旧キャッシュ方式)を混ぜることがある → 「App Router・Next.js 16 で」と明示し、同梱ドキュメントを読ませる([[Next.js_09_デプロイ・テスト・AI開発・実務チェックリスト]])
- `"use client"` の付け忘れ/付けすぎがよくあるエラー原因([[Next.js_03_Server ComponentsとClient Components]])
- 秘密の値を Client Component で使うとブラウザに漏れる → [[APIキー・シークレット管理]]

## 最新動向(2026年9月時点)
- **最新は Next.js 16.3**(2026年8月)。16系は2025年10月に登場
- **Turbopack がデフォルト**。16.2 で開発サーバー起動が約400%高速化、16.3 で開発時メモリ最大90%削減
- **Cache Components / `"use cache"`** でキャッシュを部品単位で明示。16.3 で **Instant Navigations**(クリック直後に骨組みを表示し残りをストリーミング)が本格導入
- 16 で `middleware.ts` → **`proxy.ts`** に名称変更
- **React Compiler が安定版**: `useMemo` などの手動最適化をコンパイラが自動で行う
- **AI 向け機能**: バージョンに合ったドキュメントの同梱と AGENTS.md、公式 MCP サーバー、エラー画面の修正プロンプト、エージェント用 Skills
- **セキュリティ**: 2026年7〜9月に重大な脆弱性修正が複数。月次のセキュリティリリース体制 → **こまめに更新**(`npx next upgrade`)
- デプロイ: Vercel(開発元、最も簡単)/ [[Cloudflare]](推奨は vinext〈ベータ〉、既存アプリは OpenNext)/ Node.js・Docker

## 出典
- 公式: https://nextjs.org/docs , [Next.js Blog](https://nextjs.org/blog)
- [Next.js 16.3 aims to reduce FATAL ERROR messages (The Register)](https://www.theregister.com/devops/2026/08/04/nextjs-163-aims-to-reduce-dreaded-fatal-error-messages/5283036)
- [Next.js 16.2 Tutorial (Tech Insider)](https://tech-insider.org/nextjs-tutorial-full-stack-app-2026/)

## 関連
- [[TanStack Start]] / [[Vite]] … 比較対象
- [[shadcn-ui]] / [[Tailwind CSS]] … UI
- [[Cloudflare]] … デプロイ先

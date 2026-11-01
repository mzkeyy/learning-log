---
title: "SSR 06 静的生成とフレームワーク(prerender・React Router・Next.js・RSC)"
modified: 2026-11-01
---

## 静的生成(SSG)を自作する
`react-dom/static` の `prerender` は、**Suspense の中も全部待ってから** HTML を返す。ビルド時に HTML ファイルを書き出せば SSG になる。
```tsx
// scripts/ssg.tsx — npx tsx scripts/ssg.tsx
import { mkdir, writeFile } from "node:fs/promises";
import { prerender } from "react-dom/static";
import { PostPage } from "../src/PostPage";

const posts = await getAllPosts();   // CMS・Markdown・DB から

for (const post of posts) {
  const { prelude } = await prerender(<PostPage post={post} />, {
    bootstrapModules: ["/client.js"],             // ハイドレーションしたいなら
  });
  const html = await new Response(prelude).text();  // ReadableStream → 文字列
  await mkdir(`dist/blog/${post.slug}`, { recursive: true });
  await writeFile(`dist/blog/${post.slug}/index.html`, html);
}
```
出力(Suspense の中身まで入っている):
```html
<!DOCTYPE html><html lang="ja"><head><meta charSet="utf-8"/><title>SSR の話</title></head>
<body><h1>SSR の話</h1><!--$--><p>SSR の話 の本文</p><!--/$--></body></html>
```
| API | 待つもの | 用途 |
| --- | --- | --- |
| `renderToString` | 何も待たない(Suspense は fallback) | 古い・単純な SSR |
| `renderToReadableStream` / `renderToPipeableStream` | シェルだけ待って、残りは流す | **SSR** |
| `prerender` / `prerenderToNodeStream` | **全部待つ** | **SSG**・ボット向け |
| `prerender` + `resume` | 途中まで静的に作り、残りをリクエスト時に | 部分的なプリレンダー(上級。Next.js の PPR の土台) |
- `dist/` を CDN や静的ホスティングにそのまま置ける。ブラウザでの JS が要らないページなら `bootstrapModules` も不要(ただの HTML)

## 自作で足りないもの(= フレームワークがやっていること)
| 必要なもの | 自作だと | フレームワーク |
| --- | --- | --- |
| ルーティング | URL ごとに分岐を書く | ファイル / `routes.ts` から自動 |
| データの受け渡し | 手で埋め込む・取り直す | `loader` の結果を自動で送り、ブラウザで同じ値に |
| ページ遷移 | 毎回 HTML を取り直すか、自分で SPA にする | 2回目からはデータだけ取得(クライアント遷移) |
| コード分割 | 全部1つの JS | ページごとに分けて、必要な分だけ |
| CSS・`<head>` | manifest を読んで自分で `<link>` | 自動 |
| フォーム送信 | API を作って fetch | `action` / Server Actions |
| エラー画面・404 | 自分で | `ErrorBoundary`・`notFound` |
| 開発サーバー・ビルド・デプロイ | Vite の設定を自分で | コマンド1つ・各社のアダプター |
- 自作は**学習用か、とても小さいページ**向け。アプリは**フレームワークを使う**

## フレームワークでの SSR
### React Router(Framework モード)
```tsx
// これだけで SSR + ハイドレーション + データの受け渡しが動く
export async function loader({ params }: Route.LoaderArgs) {
  return { product: await getProduct(params.id), reviews: getReviews(params.id) };  // reviews は Promise のまま → ストリーミング
}
export default function Product({ loaderData }: Route.ComponentProps) { /* ... */ }
```
- 裏で動いているのは 03・04 と同じもの(`entry.server.tsx` の `renderToPipeableStream`、`entry.client.tsx` の `hydrateRoot`)
- `ssr: false` で SPA、`prerender` で SSG に切り替え → [[React Router_05_レンダリング戦略(SSR・SPA・プリレンダー・ストリーミング)]]

### Next.js(App Router)
- 既定が **React Server Components**。サーバーで描いて、操作が要る部品(`"use client"`)だけハイドレーション
- `loading.tsx` / `<Suspense>` でストリーミング、`use cache` などでキャッシュ → [[Next.js_03_Server ComponentsとClient Components]] / [[Next.js_04_データ取得とストリーミング]]

### TanStack Start
- 既定は全部 SSR + ハイドレーション。ルートごとに `ssr: false` / `"data-only"` → [[TanStack Start_05_レンダリング戦略・SEO・TanStack Query]]

## SSR と Server Components の違い
| | SSR | React Server Components(RSC) |
| --- | --- | --- |
| 何をする | コンポーネントを**HTML に**する | コンポーネントを**サーバーだけで動かす** |
| ブラウザに送る JS | 全部のコンポーネント(ハイドレーションに要る) | **Client Components の分だけ** |
| ブラウザで動くか | 動く(ハイドレーション後) | Server Components は動かない(結果だけ届く) |
| データ | loader などで取って props で渡す | コンポーネントの中で直接 `await db...` |
| 組み合わせ | RSC の結果も最初は SSR で HTML にして送る | |
```
RSC あり: Server Components を実行 → 結果(RSC Payload)→ SSR で HTML に → ブラウザ: Client Components だけハイドレーション
RSC なし: 全コンポーネントを SSR で HTML に → ブラウザ: 全部ハイドレーション
```
- RSC を使えるのは、今は事実上 **Next.js**(React Router・TanStack Start は実験的)
- RSC がなくても SSR だけで十分なアプリは多い。「JS を減らしたい」「サーバーのデータをコンポーネントで直接読みたい」ときに効く

## まとめ: 何を選ぶか
| やりたいこと | 選ぶもの |
| --- | --- |
| 仕組みを理解したい | 自作(02〜04) |
| ブログ・ドキュメント | SSG(Astro・Next.js・React Router の `prerender`)。このサイト自体も Next.js の静的出力 |
| ログイン後のアプリ + 一部公開ページ | React Router / Next.js / TanStack Start の SSR |
| API は別にあり、画面だけ | Vite + React の SPA(+ 必要なページだけプリレンダー) |
| JS をできるだけ減らしたい | Next.js(RSC)、Astro(必要な所だけ React) |

## 関連
- 前: [[SSR_05_ハイドレーションエラーと注意点(XSS・キャッシュ・状態)]]
- [[SSR]] / [[React Router]] / [[Next.js]] / [[TanStack Start]] / [[Vite]]
- 公式: https://react.dev/reference/react-dom/static/prerender , https://react.dev/reference/rsc/server-components , https://react.dev/reference/react-dom/server/resume

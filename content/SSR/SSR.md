---
title: "SSR(サーバーサイドレンダリング)"
modified: 2026-11-01
---

**SSR = React の画面をサーバーで HTML にしてから送り、ブラウザで JS をつないで動くようにする(ハイドレーション)仕組み**。Next.js・React Router・TanStack Start が裏でやっていることを、React の API だけで自作して確かめたノート群の入口。

React の公式ドキュメント(react.dev、**2026年11月時点。React 19.3**)と、実際に Hono・Express・Vite で SSR を組んで動かした結果をもとに整理。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[SSR_01_考え方(CSR・SSR・SSG・ハイドレーション)]] | CSR・SSR・SSG・ストリーミングの違い、ハイドレーションとは、選び方 |
| 02 | [[SSR_02_最小のSSRを自作する(renderToString・hydrateRoot)]] | Hono + `renderToString` + `hydrateRoot` で最小の SSR、データの渡し方 |
| 03 | [[SSR_03_ストリーミングSSR(renderToPipeableStream・Suspense)]] | Suspense で先に送る、`renderToReadableStream` / `renderToPipeableStream`、ボット対策 |
| 04 | [[SSR_04_ViteでSSR(開発サーバー・ビルド・本番)]] | Vite のミドルウェアモード、`ssrLoadModule`、クライアントとサーバーのビルド |
| 05 | [[SSR_05_ハイドレーションエラーと注意点(XSS・キャッシュ・状態)]] | 不一致エラーの原因と直し方、データ埋め込みの XSS、リクエストごとの状態 |
| 06 | [[SSR_06_静的生成とフレームワーク(prerender・React Router・Next.js・RSC)]] | `prerender` で SSG、フレームワークが足してくれるもの、Server Components |

## ひと目で
```
CSR(SPA):  サーバー → 空の HTML + JS ──▶ ブラウザで JS 実行 → データ取得 → やっと表示
SSR:       サーバーでデータ取得 → HTML を作る ──▶ すぐ表示 → JS を読んでハイドレーション → 操作できる
SSG:       ビルド時に HTML を作っておく ──▶ CDN から即表示 → ハイドレーション
ストリーミング SSR: 準備できた部分から HTML を送る ──▶ 遅い部分は後から差し込まれる
```

## React の SSR の API
| API | どこから | 用途 |
| --- | --- | --- |
| `renderToString(<App />)` | `react-dom/server` | HTML を一度に文字列で。**Suspense を待たない**(古い・単純) |
| `renderToReadableStream` | `react-dom/server` | **Web Streams** でストリーミング(Hono・Cloudflare Workers・Deno・Bun・Node 18+) |
| `renderToPipeableStream` | `react-dom/server`(Node) | **Node のストリーム**でストリーミング(Express など) |
| `prerender` / `prerenderToNodeStream` | `react-dom/static` | **全部待ってから** HTML を作る(SSG・ビルド時) |
| `resume` / `resumeAndPrerender` | `react-dom/server` / `static` | 途中まで作った HTML の続きを作る(部分的なプリレンダー、上級) |
| `hydrateRoot(要素, <App />)` | `react-dom/client` | **サーバーの HTML に JS をつなぐ**(ブラウザ側) |
| `createRoot(要素).render(<App />)` | `react-dom/client` | 何もない所に描く(CSR。SSR では使わない) |

## 押さえどころ(2026年11月時点)
- 自作できるが、**実務ではフレームワーク**(ルーティング・データの受け渡し・コード分割・ビルドを全部やってくれる)→ 06
- 仕組みを知っておくと、ハイドレーションエラー・遅い初回表示・「サーバーでは動くのにブラウザで壊れる」の原因が分かる
- 新しく書くなら `renderToString` より**ストリーミングの API**(Suspense が使える)
- **サーバーとブラウザで同じ HTML になる**ことが絶対条件(違うとハイドレーションエラー)→ 05
- データを HTML に埋め込むときは **`</script>` で抜けられないようにエスケープ**(XSS)→ 02 / 05

## 関連
- [[React]] / [[React Router_05_レンダリング戦略(SSR・SPA・プリレンダー・ストリーミング)]] / [[Next.js_04_データ取得とストリーミング]] / [[TanStack Start_05_レンダリング戦略・SEO・TanStack Query]]
- [[Vite]] / [[Hono]] / [[Webパフォーマンスとアクセシビリティ]] / [[HTTP・HTTPS・TLS]]
- 公式: https://react.dev/reference/react-dom/server , https://react.dev/reference/react-dom/static , https://react.dev/reference/react-dom/client/hydrateRoot , https://vite.dev/guide/ssr

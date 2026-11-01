---
title: "SSR 03 ストリーミング SSR(renderToPipeableStream・Suspense)"
modified: 2026-11-01
---

## 何がうれしいか
1.5 秒かかるデータがあるページで、実際に測った結果:
| 方式 | 最初の1バイトが届くまで | 全部届くまで |
| --- | --- | --- |
| 全部待ってから送る | 1.50 秒 | 1.50 秒 |
| **ストリーミング** | **0.015 秒** | 1.51 秒 |
- 枠と見出しはすぐ表示され、遅い部分だけ「読み込み中…」から差し替わる
- 1つの HTTP レスポンスの中で、**HTML を少しずつ送り続ける**(新しい通信はしない)

## Web Streams 版(Hono・Cloudflare Workers・Deno・Bun)
```tsx
import { Hono } from "hono";
import { Suspense, use } from "react";
import { renderToReadableStream } from "react-dom/server";

function Reviews({ promise }: { promise: Promise<string[]> }) {
  const reviews = use(promise);            // 終わるまで一番近い Suspense の fallback を出す
  return <ul>{reviews.map((r) => <li key={r}>{r}</li>)}</ul>;
}

function Page({ reviews }: { reviews: Promise<string[]> }) {
  return (
    <html lang="ja">
      <head><meta charSet="utf-8" /><title>商品</title></head>
      <body>
        <h1>商品ページ</h1>                {/* すぐ送られる */}
        <Suspense fallback={<p>レビューを読み込み中…</p>}>
          <Reviews promise={reviews} />    {/* 後から送られる */}
        </Suspense>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  );
}

const app = new Hono();
app.get("/", async (c) => {
  const reviews = getReviews();           // await しない(Promise のまま渡す)
  const stream = await renderToReadableStream(<Page reviews={reviews} />, {
    onError(error) { console.error(error); },
  });
  if (isBot(c.req.header("user-agent"))) await stream.allReady;   // ボットには全部そろってから
  return c.body(stream, 200, { "Content-Type": "text/html; charset=utf-8" });
});
```
- `await renderToReadableStream(...)` は**シェル(Suspense の外側)ができた時点**で返る。シェルでエラーなら、ここで例外になる
- `stream.allReady` は全部終わったら解決する Promise
- **`<html>` から React で書く**ことも、HTML のテンプレートに差し込むこともできる(Vite では後者 → 04)

## Node ストリーム版(Express など)
```tsx
import { renderToPipeableStream } from "react-dom/server";

app.get("/", (req, res) => {
  let didError = false;
  const { pipe, abort } = renderToPipeableStream(<Page reviews={getReviews()} />, {
    bootstrapModules: ["/client.js"],   // ハイドレーション用の <script type="module"> を足してくれる
    onShellReady() {
      // シェルができた: ここで送り始める
      res.statusCode = didError ? 500 : 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      pipe(res);
    },
    onShellError(error) {
      // シェルすら作れなかった: エラーページを返す
      res.statusCode = 500;
      res.send("<h1>エラーが起きました</h1>");
    },
    onAllReady() {
      // 全部できた(ボット向けにはこちらで pipe する)
    },
    onError(error) {
      didError = true;
      console.error(error);
    },
  });
  setTimeout(() => abort(), 10_000);   // 遅すぎる部分は打ち切って、ブラウザ側の描画に任せる
});
```
| コールバック | いつ | 使い方 |
| --- | --- | --- |
| `onShellReady` | Suspense の外側ができた | **人間向け**: ここで `pipe` |
| `onAllReady` | 全部できた | **ボット・SSG 向け**: ここで `pipe` |
| `onShellError` | シェルでエラー | 500 のページを返す |
| `onError` | どこかでエラー(Suspense の中も) | ログ。Suspense の中のエラーは、その部分だけブラウザで描き直される |
- `bootstrapModules` を渡すと、`<head>` に `<link rel="modulepreload">`、本文の最後に `<script type="module" async>` を自動で入れてくれる
- **ステータスコードは送り始める前にしか決められない**。送り始めた後に起きたエラーは、もう 200 のまま
- `abort()` すると、終わっていない Suspense は fallback のまま送り、ブラウザで続きを描く

## 実際に送られる HTML
```html
<h1>商品ページ</h1>
<!--$?--><template id="B:0"></template><p>レビューを読み込み中…</p><!--/$-->
                                       ↑ まず fallback を送る

… 1.5 秒後、同じレスポンスの続きとして …

<div hidden id="S:0"><ul><li>よかった</li><li>また買う</li></ul></div>
<script>$RC("B:0","S:0")</script>
                ↑ 隠しておいた本物を、fallback と入れ替える小さなスクリプト
```
- `<!--$?-->`(待ち中)→ `<!--$-->`(完了)の目印で、ハイドレーション時にどこが Suspense か分かる
- JS(React 本体)がまだ届いていなくても、この小さなスクリプトだけで中身が見える

## ボット(検索エンジン)への対応
- クローラーは途中まで受け取って止まることがあるので、**全部そろってから返す**(`onAllReady` / `stream.allReady`)
- User-Agent での判定には `isbot` パッケージがよく使われる(React Router の既定の `entry.server.tsx` もこれ)
```ts
import { isbot } from "isbot";
const ready = isbot(userAgent) ? "onAllReady" : "onShellReady";
```

## 何を Suspense で包むか
| 包む(後回し) | 包まない(待つ) |
| --- | --- |
| レビュー・おすすめ・コメント | 見出し・本文・価格(SEO と最初の印象に要る) |
| 遅い外部 API | ページのタイトル・`<meta>` |
| ログインユーザーごとの小さな部品 | エラー時に 404 / 500 を返したいもの(送り始めると変えられない) |
- **Suspense の境界ごとに、fallback と本物の高さを揃える**と画面がガタつかない(CLS)→ [[Webパフォーマンスとアクセシビリティ]]

## ブラウザ側でのデータ
ブラウザでハイドレーションするとき、`use(promise)` の Promise も必要になる。自作だと:
- サーバーで解決したデータを `<script>` で埋め込んで、ブラウザではそれを使う(02 と同じ)
- または、ブラウザで同じデータを取り直す(その間は**サーバーの HTML がそのまま表示される**ので見た目は崩れない)
- フレームワークはこれを自動でやる(React Router は loader の Promise を HTML に流し込み、ブラウザで同じ値として受け取れる)→ [[React Router_05_レンダリング戦略(SSR・SPA・プリレンダー・ストリーミング)]]

## 関連
- 前: [[SSR_02_最小のSSRを自作する(renderToString・hydrateRoot)]] / 次: [[SSR_04_ViteでSSR(開発サーバー・ビルド・本番)]]
- [[React_03_React 19の機能(Actions・use・Activity・Compiler)]] / [[Next.js_04_データ取得とストリーミング]]
- 公式: https://react.dev/reference/react-dom/server/renderToReadableStream , https://react.dev/reference/react-dom/server/renderToPipeableStream , https://react.dev/reference/react/Suspense

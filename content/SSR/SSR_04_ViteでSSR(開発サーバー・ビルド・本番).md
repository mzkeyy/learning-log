---
title: "SSR 04 Vite で SSR(開発サーバー・ビルド・本番)"
modified: 2026-11-01
---

02 では esbuild で手作業でまとめた。実際には **[[Vite]] に TypeScript の変換・HMR・ビルドを任せる**のがふつう。React Router(Framework モード)や TanStack Start も中身はこの形。Vite 8 + React 19.3 + Express 5 で動かして確認したコード。

## 構成
```
ssr-vite/
├── index.html              # HTML のテンプレート(差し込む目印を入れる)
├── server.js               # Express のサーバー(開発と本番の両方)
├── vite.config.ts
└── src/
    ├── App.tsx             # 共通のコンポーネント
    ├── data.ts
    ├── entry-client.tsx    # ブラウザの入口: hydrateRoot
    └── entry-server.tsx    # サーバーの入口: renderToPipeableStream
```
```sh
npm i react react-dom express
npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/express @types/node
```
```json
// package.json
{
  "type": "module",
  "scripts": {
    "dev": "node server.js",
    "build": "vite build --outDir dist/client && vite build --ssr src/entry-server.tsx --outDir dist/server",
    "start": "NODE_ENV=production node server.js"
  }
}
```

## テンプレートと2つの入口
```html
<!-- index.html -->
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>Vite SSR</title>
    <!--app-head-->
  </head>
  <body>
    <div id="root"><!--app-html--></div>    <!-- ここに React の HTML を差し込む -->
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>
</html>
```
```tsx
// src/entry-client.tsx — ブラウザ
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { App } from "./App";

hydrateRoot(document.getElementById("root")!, <StrictMode><App /></StrictMode>);
```
```tsx
// src/entry-server.tsx — サーバー(server.js から呼ばれる)
import { StrictMode } from "react";
import { renderToPipeableStream, type RenderToPipeableStreamOptions } from "react-dom/server";
import { App } from "./App";

export function render(options: RenderToPipeableStreamOptions) {
  return renderToPipeableStream(<StrictMode><App /></StrictMode>, options);
}
```
```tsx
// src/App.tsx — Suspense でストリーミングする部分を持つ
import { Suspense, use, useState } from "react";
import { getComments } from "./data";

function Comments() {
  const comments = use(getComments());
  return <ul>{comments.map((c) => <li key={c}>{c}</li>)}</ul>;
}

export function App() {
  const [count, setCount] = useState(0);
  return (
    <main>
      <h1>記事</h1>
      <button onClick={() => setCount(count + 1)}>いいね {count}</button>
      <Suspense fallback={<p>コメントを読み込み中…</p>}>
        <Comments />
      </Suspense>
    </main>
  );
}
```

## サーバー(開発と本番を1つで)
```js
// server.js
import fs from "node:fs/promises";
import { Transform } from "node:stream";
import express from "express";

const isProd = process.env.NODE_ENV === "production";
const app = express();

let vite;
if (!isProd) {
  // 開発: Vite をミドルウェアとして組み込む(TS の変換・HMR をしてもらう)
  const { createServer } = await import("vite");
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  app.use(vite.middlewares);
} else {
  // 本番: ビルド済みの JS / CSS を配る
  app.use("/assets", express.static("dist/client/assets"));
}

app.use("*all", async (req, res) => {
  try {
    const url = req.originalUrl;
    let template, render;
    if (!isProd) {
      template = await fs.readFile("index.html", "utf-8");
      template = await vite.transformIndexHtml(url, template);           // HMR 用のスクリプトなどを入れる
      render = (await vite.ssrLoadModule("/src/entry-server.tsx")).render; // 毎回最新のコードを読む
    } else {
      template = await fs.readFile("dist/client/index.html", "utf-8");  // ビルド済みの JS が入った HTML
      render = (await import("./dist/server/entry-server.js")).render;
    }

    const [head, tail] = template.replace("<!--app-head-->", "").split("<!--app-html-->");
    let didError = false;

    const { pipe, abort } = render({
      onShellReady() {
        res.status(didError ? 500 : 200).set({ "Content-Type": "text/html" });
        res.write(head);                                   // テンプレートの前半
        const body = new Transform({
          transform(chunk, _enc, cb) { cb(null, chunk); },
          flush(cb) { this.push(tail); cb(); },            // React が終わったら後半
        });
        body.pipe(res);
        pipe(body);                                        // React の HTML を流す
      },
      onShellError(err) {
        res.status(500).set({ "Content-Type": "text/html" }).send("<h1>Something went wrong</h1>");
        console.error(err);
      },
      onError(err) { didError = true; console.error(err); },
    });
    setTimeout(() => abort(), 10_000);
  } catch (e) {
    vite?.ssrFixStacktrace(e);    // エラーの行番号を元の TS に合わせる
    console.error(e);
    res.status(500).end(e.stack);
  }
});

app.listen(5173);
```
- `appType: "custom"` は「HTML は自分で返す」という指定(Vite に `index.html` を返させない)
- `ssrLoadModule` は TS / JSX をその場で変換して読み込む。**ファイルを保存すれば次のリクエストから新しいコード**
- Express 5 では全部のパスは `"*all"`(v4 の `"*"` は使えない)

## ビルドと本番
```sh
npm run build
#  dist/client/index.html                 ← <script src="/assets/index-xxxx.js"> に書き換わった HTML
#  dist/client/assets/index-xxxx.js       ← ブラウザ用(ハッシュ付き、長くキャッシュできる)
#  dist/server/entry-server.js            ← サーバー用(react などは node_modules から読む)
npm start
```
| | 開発 | 本番 |
| --- | --- | --- |
| HTML のテンプレート | `index.html` + `transformIndexHtml` | `dist/client/index.html` |
| サーバーのコード | `vite.ssrLoadModule()`(その場で変換) | `import("./dist/server/entry-server.js")` |
| ブラウザの JS | Vite が配る(HMR あり) | `express.static("dist/client/assets")` |
- ブラウザ用とサーバー用で**ビルドが2回**(`--ssr` を付けるとサーバー向けに Node で動く形になる)
- CSS を import しているなら、ビルドの manifest(`build.manifest: true`)から `<link>` を作って `<!--app-head-->` に入れる(フレームワークはこれも自動)

## 実際に動かすと
- 最初の HTML には `<!--$?-->` と「コメントを読み込み中…」が入り、1.5 秒後に同じレスポンスの続きでコメントが差し込まれる → [[SSR_03_ストリーミングSSR(renderToPipeableStream・Suspense)]]
- ブラウザでボタンを押すと数が増える(ハイドレーションできている)
- **2回目のアクセスはすぐコメントまで出た**。`data.ts` のキャッシュがモジュールの変数(サーバーのプロセス全体で1つ)だったため → 全ユーザーで共有されてしまう問題。次のノートで扱う

## Cloudflare Workers などで動かすなら
- Node のストリームではなく `renderToReadableStream` を使い、`fetch(request)` で `Response` を返す形にする → 03
- Vite の **Environment API**(`@cloudflare/vite-plugin` など)を使うと、開発中も本番と同じランタイム(workerd)で SSR を動かせる → [[Cloudflare_05_フレームワーク連携とデプロイ]]

## 関連
- 前: [[SSR_03_ストリーミングSSR(renderToPipeableStream・Suspense)]] / 次: [[SSR_05_ハイドレーションエラーと注意点(XSS・キャッシュ・状態)]]
- [[Vite_03_設定とプラグイン]] / [[Vite_04_ビルドとデプロイ]]
- 公式: https://vite.dev/guide/ssr , https://vite.dev/guide/api-environment , https://github.com/bluwy/create-vite-extra/tree/master/template-ssr-react-streaming-ts

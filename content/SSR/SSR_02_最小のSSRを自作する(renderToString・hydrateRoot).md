---
title: "SSR 02 最小の SSR を自作する(renderToString・hydrateRoot)"
modified: 2026-11-01
---

フレームワークなしで、**サーバーで HTML を作る → ブラウザでハイドレーション**までを作る。サーバーは [[Hono]]、ブラウザ用の JS は esbuild でまとめる(実際に動かして確認したコード)。

## 構成
```
ssr-min/
├── src/
│   ├── App.tsx        # サーバーとブラウザで共通のコンポーネント
│   ├── server.tsx     # サーバー: HTML を作って返す
│   └── client.tsx     # ブラウザ: ハイドレーション
├── public/client.js   # client.tsx をまとめたもの(ビルドで作る)
├── tsconfig.json
└── package.json
```
```sh
npm i react react-dom hono @hono/node-server
npm i -D esbuild tsx typescript @types/react @types/react-dom
```
```json
// package.json
{
  "type": "module",
  "scripts": {
    "build:client": "esbuild src/client.tsx --bundle --minify --outfile=public/client.js --jsx=automatic",
    "start": "tsx src/server.tsx"
  }
}
```
```json
// tsconfig.json — "jsx": "react-jsx" がないとサーバーで「React is not defined」
{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
    "jsx": "react-jsx", "strict": true, "skipLibCheck": true } }
```

## 共通のコンポーネント
```tsx
// src/App.tsx
import { useState } from "react";

export type Todo = { id: number; title: string };

export function App({ todos }: { todos: Todo[] }) {
  const [count, setCount] = useState(0);
  return (
    <main>
      <h1>TODO({todos.length} 件)</h1>
      <ul>{todos.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
      <button onClick={() => setCount(count + 1)}>{count} 回クリック</button>
    </main>
  );
}
```
- **サーバーでもブラウザでも動く**ように書く(`window` などに直接触らない)

## サーバー: HTML を作る
```tsx
// src/server.tsx
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { renderToString } from "react-dom/server";
import { App, type Todo } from "./App";

const app = new Hono();
app.use("/client.js", serveStatic({ root: "./public" }));

app.get("/", async (c) => {
  const todos: Todo[] = await db.listTodos();          // サーバーでデータを取る
  const html = renderToString(<App todos={todos} />);  // React → HTML の文字列

  // ブラウザでも同じ todos を使うために HTML に埋め込む。< をエスケープ(XSS 対策、下で説明)
  const json = JSON.stringify(todos).replace(/</g, "\\u003c");

  return c.html(`<!doctype html>
<html lang="ja">
  <head><meta charset="utf-8" /><title>SSR</title></head>
  <body>
    <div id="root">${html}</div>
    <script>window.__INITIAL_DATA__ = ${json}</script>
    <script type="module" src="/client.js"></script>
  </body>
</html>`);
});

serve({ fetch: app.fetch, port: 3000 });
```
返ってくる HTML:
```html
<div id="root"><main><h1>TODO(<!-- -->2<!-- --> 件)</h1><ul><li>牛乳を買う</li>...</ul><button>0<!-- --> 回クリック</button></main></div>
<script>window.__INITIAL_DATA__ = [{"id":1,"title":"牛乳を買う"}, ...]</script>
```
- `<!-- -->` は React が入れる目印。隣り合うテキスト(`{count}` と ` 回クリック`)の境目を、ハイドレーションで見分けるため
- この時点では**ボタンを押しても何も起きない**(イベントがない)

## ブラウザ: ハイドレーション
```tsx
// src/client.tsx
import { hydrateRoot } from "react-dom/client";
import { App, type Todo } from "./App";

declare global {
  interface Window { __INITIAL_DATA__: Todo[] }
}

// サーバーと「同じコンポーネント・同じ props」で呼ぶ
hydrateRoot(document.getElementById("root")!, <App todos={window.__INITIAL_DATA__} />);
```
```sh
npm run build:client && npm start   # http://localhost:3000
```
- `createRoot().render()` ではなく **`hydrateRoot`**。既にある DOM を作り直さずに使う
- props が違うと HTML が一致せず、ハイドレーションエラーになる。**サーバーで使ったデータをそのまま渡す**のが要点

## データの埋め込みと XSS
`JSON.stringify` の結果をそのまま `<script>` に入れると危ない。
```js
// todos の中に、ユーザーが入力したこんなタイトルがあったら…
{ title: "</script><script>alert(1)</script>" }

// そのまま埋め込むと、ブラウザは最初の </script> でスクリプトが終わったと解釈し、
// 次の <script>alert(1)</script> を実行してしまう
```
| 対策 | 内容 |
| --- | --- |
| `<` を `<` に置き換える | JSON としては同じ値のまま、HTML のタグにならない(上のコード) |
| `serialize-javascript` などのライブラリ | `<`・`>`・`/`・` ` などをまとめてエスケープ |
| `<script type="application/json" id="data">` に入れて `JSON.parse(el.textContent)` | 実行されない場所に置く(それでも `</script>` のエスケープは要る) |
- 実際に試すと、置き換えありなら `alert` は動かず、画面には文字として `</script><script>alert(1)</script>` と出る(React が JSX の中の文字を自動でエスケープするため)
- **HTML の文字列を自分で組み立てる所**が SSR の危ない場所。React の JSX の中は安全、テンプレート文字列の中は自分で守る → [[Webセキュリティ対策]]

## renderToString の限界
| 問題 | 内容 |
| --- | --- |
| **全部待つ** | 一番遅いデータの取得が終わるまで、何も送れない |
| Suspense を待たない | `<Suspense>` の中で待っているものは、`fallback` の HTML のまま送られる |
| 同期的 | 大きなページでは、作っている間サーバーが止まる |
| データの受け渡しは手作業 | どのデータを埋め込むか自分で管理する |
→ ストリーミングの API で解決する → [[SSR_03_ストリーミングSSR(renderToPipeableStream・Suspense)]]

## ここまでで分かること
- SSR は「**同じコンポーネントを2回動かす**」(サーバーで HTML に、ブラウザでハイドレーション)
- そのために、**データ・コンポーネント・ブラウザ用の JS** の3つをサーバーから渡す必要がある
- フレームワークは、この3つ(とルーティング・コード分割)を自動でやってくれている → [[SSR_06_静的生成とフレームワーク(prerender・React Router・Next.js・RSC)]]

## 関連
- 前: [[SSR_01_考え方(CSR・SSR・SSG・ハイドレーション)]] / 次: [[SSR_03_ストリーミングSSR(renderToPipeableStream・Suspense)]]
- [[Hono_06_実務(構成・テスト・JSX・v5移行・AI開発)]](Hono 自身の JSX でも SSR できる)/ [[Webセキュリティ対策]]
- 公式: https://react.dev/reference/react-dom/server/renderToString , https://react.dev/reference/react-dom/client/hydrateRoot

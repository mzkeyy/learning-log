---
title: "React Router 06 実務(Zod 検証・テスト・デプロイ・v8 移行・AI 開発)"
modified: 2026-11-01
---

## Zod でフォームを検証する
React Router 自体に検証の仕組みはない。**action の中で Zod を使う**のが定番。
```tsx
// app/routes/todos.tsx
import { data, Form } from "react-router";
import * as z from "zod";
import type { Route } from "./+types/todos";

const NewTodo = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください").max(50, "50 文字以内にしてください"),
});

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const result = NewTodo.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    // 400 で返すとページの loader は再実行されない(入力内容もそのまま残る)
    return data({ errors: z.flattenError(result.error).fieldErrors }, { status: 400 });
  }
  await addTodo(result.data.title);   // result.data は { title: string } と型が付く
  return { ok: true };
}

export default function Todos({ actionData }: Route.ComponentProps) {
  return (
    <Form method="post">
      <input name="title" aria-invalid={!!actionData?.errors} aria-describedby="title-error" />
      {actionData && "errors" in actionData && (
        <p id="title-error" role="alert">{actionData.errors.title?.[0]}</p>
      )}
      <button>追加</button>
    </Form>
  );
}
```
- `Object.fromEntries(formData)` は同じ名前が複数ある値(チェックボックスの複数選択)を1つにしてしまう。複数なら `formData.getAll("tags")` を別に渡す
- フォームの値は**全部文字列**。数値は `z.coerce.number()`、チェックボックスは `z.stringbool()` → [[Zod_03_変換と検証のカスタマイズ(refine・transform・coerce・codec)]]
- **ブラウザ側の検証(`required` など)は親切のため、本当の検証はサーバー(action)で**
- 大きなフォームは Conform(`@conform-to/zod`)など、Zod のスキーマをそのまま使えるフォームライブラリも選択肢 → [[shadcn-ui_05_フォーム(Field・React Hook Form・Zod)]]

### URL のパラメータ・検索パラメータも検証する
```tsx
const Params = z.object({ id: z.uuid() });
const Search = z.object({
  page: z.coerce.number().int().min(1).catch(1),        // 変な値なら 1
  sort: z.enum(["new", "old"]).catch("new"),
});

export async function loader({ params, request }: Route.LoaderArgs) {
  const p = Params.safeParse(params);
  if (!p.success) throw data("見つかりません", { status: 404 });
  const search = Search.parse(Object.fromEntries(new URL(request.url).searchParams));
  return { items: await listItems(p.data.id, search) };
}
```

### 環境変数
```ts
// app/env.server.ts — 起動時に1回だけ検証して、足りなければすぐ落とす
import * as z from "zod";
export const env = z.object({
  DATABASE_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
}).parse(process.env);
```
→ [[Zod_05_実務(フォーム・API・環境変数・JSON Schema・AI)]] / [[APIキー・シークレット管理]]

## リソースルート(画面のない API)
**`default` エクスポートがないルート**は、HTML ではなく好きな `Response` を返す。
```ts
// app/routes/api.todos.ts   — routes.ts に route("api/todos", "routes/api.todos.ts")
import type { Route } from "./+types/api.todos";

export async function loader({ request }: Route.LoaderArgs) {   // GET
  return Response.json(await listTodos());
}

export async function action({ request }: Route.ActionArgs) {   // POST / PUT / PATCH / DELETE
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const body = NewTodo.safeParse(await request.json());
  if (!body.success) return Response.json({ errors: z.flattenError(body.error) }, { status: 400 });
  return Response.json(await addTodo(body.data.title), { status: 201 });
}
```
- 使い道: JSON API、Webhook の受け口、PDF・画像・CSV・sitemap.xml・RSS の生成
- リンクするときは `<a href>` か `<Link reloadDocument>`(ふつうの `<Link>` だと画面遷移しようとする)
- 外部に公開する本格的な API なら [[Hono]] などで別に作る、または React Router の中に Hono を載せる構成もある → [[REST]]

## テスト
| 何を | 道具 |
| --- | --- |
| loader / action の中身 | 関数として直接呼ぶ(`new Request(...)` を渡す)、または中のロジックを別関数にしてテスト |
| ルートの画面 | `createRoutesStub` + Testing Library + Vitest |
| 画面の流れ全体 | Playwright(実際にビルドして起動) |
```tsx
import { createRoutesStub } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

test("エラーを表示する", async () => {
  const Stub = createRoutesStub([
    {
      path: "/login",
      Component: LoginForm,
      action: () => ({ errors: { email: "メールアドレスを入力してください" } }),
    },
  ]);
  render(<Stub initialEntries={["/login"]} />);
  await userEvent.click(screen.getByRole("button", { name: "ログイン" }));
  expect(await screen.findByText("メールアドレスを入力してください")).toBeInTheDocument();
});
```
```ts
// vitest.config.ts — vite.config.ts をそのまま使うと
// 「React Router Vite plugin can't detect preamble」で落ちるので、テスト用を別に作る
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { environment: "jsdom" },
});
```
```ts
// loader を直接呼ぶ
test("一覧を返す", async () => {
  const res = await loader({ request: new Request("http://test/todos?q=牛乳"), params: {}, context } as any);
  expect(res.todos).toHaveLength(1);
});
```
→ [[テスト_04_コンポーネントテスト(Testing Library・Browser Mode)]] / [[テスト]]

## デプロイ
| 先 | 方法 |
| --- | --- |
| Node(Docker) | 既定テンプレートの `Dockerfile` のまま。`npm run build` → `npm start`(`react-router-serve`)。Cloud Run・Fly.io・ECS など → [[Docker]] |
| Node(自作サーバー) | `node-custom-server` テンプレート(Express に `createRequestHandler`) |
| Cloudflare Workers | Cloudflare のテンプレート(`@cloudflare/vite-plugin`)。D1・KV などはバインディングで → [[Cloudflare_05_フレームワーク連携とデプロイ]] |
| Vercel / Netlify | 各社のテンプレート・プリセット(`presets` 設定) |
| 静的ホスティング | `ssr: false`(SPA)かプリレンダーだけなら `build/client/` を置くだけ |
- 本番前に: `SESSION_SECRET` などの秘密を本番用に、`NODE_ENV=production`、エラー画面に詳細を出さない、`Cache-Control` の確認

## Data モードと Declarative モード
Vite で作った SPA に、ルーターだけ入れたいときなど。
```tsx
// Data モード: ルートを React の外で定義し、loader / action も使える
import { createBrowserRouter, redirect } from "react-router";
import { RouterProvider } from "react-router/dom";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    ErrorBoundary: RootError,
    children: [
      { index: true, Component: Home },
      {
        path: "todos/:id",
        loader: async ({ params }) => ({ todo: await fetchTodo(params.id!) }), // ブラウザで動く
        Component: Todo,
      },
      { path: "admin", lazy: () => import("./routes/admin") },             // コード分割
    ],
  },
]);

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);

function Todo() {
  const { todo } = useLoaderData() as { todo: Todo };   // 型は自分で付ける
  return <h1>{todo.title}</h1>;
}
```
```tsx
// Declarative モード: URL と画面を結ぶだけ(データ取得は TanStack Query などで)
import { BrowserRouter, Route, Routes } from "react-router";

createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="todos/:id" element={<Todo />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </BrowserRouter>,
);
```
- Data モードの `loader` は**ブラウザで**動く(サーバーではない)。秘密の API キーは使えない
- 型安全なルーターを SPA で使いたいなら TanStack Router も候補 → [[Vite_05_実務構成・テスト・性能・トラブル]]

## v7 から v8 への移行
v8 の変更は「v7 の future フラグを既定にした」もの。**v7 のうちに全部準備できる**。
| やること | 内容 |
| --- | --- |
| 動作環境を上げる | Node 22.22+、React 19.2.7+、Vite 7+ |
| `react-router-dom` をやめる | `RouterProvider` / `HydratedRouter` は `react-router/dom`、ほかは全部 `react-router` から |
| ミドルウェアが常に有効 | `future.v8_middleware` を消す。自作サーバーの `getLoadContext` は `RouterContextProvider` を返す |
| `meta` の引数 | `data` → `loaderData` |
| `splitRouteModules` | future フラグからふつうの設定へ(既定で有効) |
| ESM のみ | CommonJS の `require("react-router")` は不可 |
- v6 / Remix v2 からならまず v7 へ(公式の移行ガイドあり)

## AI と開発するとき
- テンプレートに **Agent Skill**(`.agents/skills/react-router/`)が入っている。モード(Framework / Data / Declarative)を見分けてから、そのモードの書き方を使うよう指示されている
- **公式ドキュメントが npm パッケージに入っている**(`node_modules/react-router/docs/`)。インストールした版の docs を読ませると、古い書き方(v6 の `react-router-dom`・`json()`・`defer()`)を防げる
- AI がよく間違えるところ: `react-router-dom` から import する / `json()` を使う(今はオブジェクトをそのまま返すか `data()`)/ `useLoaderData` に手で型を付ける(props の `loaderData` を使う)/ Framework なのに `createBrowserRouter` を書く
- `npm run typecheck`(typegen + tsc)を毎回走らせると、ルートと型のずれに気づける → [[AIエンジニアリング]]

## 本番前チェックリスト
- [ ] 保護したいルートは `middleware` で守っている(親の loader だけに頼らない)
- [ ] loader / action で**持ち主の確認**をしている
- [ ] action の入力を Zod で検証し、エラーは 400 で返している
- [ ] セッションの Cookie は `httpOnly`・`secure`・`sameSite`、秘密は本番用
- [ ] 想定外のエラーの詳細を画面に出していない
- [ ] ユーザーごとのページを CDN にキャッシュしていない(`private`)
- [ ] 送信中の表示があり、二度押しできない
- [ ] `npm run typecheck` と `npm run build` が通る

## 関連
- 前: [[React Router_05_レンダリング戦略(SSR・SPA・プリレンダー・ストリーミング)]]
- [[Zod]] / [[SSR]] / [[テスト]] / [[Cloudflare]] / [[Docker]] / [[Webセキュリティ対策]]
- 公式: https://reactrouter.com/how-to/form-validation , https://reactrouter.com/how-to/resource-routes , https://reactrouter.com/start/framework/testing , https://reactrouter.com/start/framework/deploying , https://reactrouter.com/upgrading/v7

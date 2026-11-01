---
title: "React Router 04 ミドルウェア・認証・型安全"
modified: 2026-11-01
---

## ミドルウェア
**ルートの loader / action の前後に挟まる処理**。認証・ログ・共通ヘッダーなどを1か所に書ける。v8 からは設定なしで常に使える。
```
GET /dashboard/settings のとき
root の middleware(前)
  └ dashboard の middleware(前)
      └ settings の middleware(前)
          └ loader を実行して HTML(または データ)を作る
      └ settings の middleware(後)
  └ dashboard の middleware(後)
root の middleware(後)
```
```tsx
// app/root.tsx — 全リクエストのログ
export const middleware: Route.MiddlewareFunction[] = [
  async ({ request }, next) => {
    const start = performance.now();
    const response = await next();             // ここで子の middleware と loader が動く
    console.log(request.method, new URL(request.url).pathname, response.status,
      `${Math.round(performance.now() - start)}ms`);
    return response;                           // サーバーでは Response を返す
  },
];
```
- `next()` は1回だけ呼べる。後の処理がいらなければ呼ばなくてよい(自動で呼ばれる)
- middleware の中で `throw redirect(...)` すれば、その先には進まない
- `clientMiddleware` はブラウザでの移動のたびに動く版(Response は返さない)

### いつ動くか(大事)
| リクエスト | サーバーの middleware |
| --- | --- |
| 初回アクセス(HTML) | **loader がなくても動く** |
| 画面内の移動(`.data` の取得) | **サーバーに取りに行くときだけ動く**(loader / action があるルートだけ) |
- loader のないページへの移動では、サーバーの middleware は動かない。確実に毎回チェックしたいルートには空の `loader`(`return null`)を置く

## context で値を渡す
middleware で用意したもの(ログイン中のユーザー・DB など)を loader に渡す。**型付き**で、名前がぶつからない。
```ts
// app/context.ts
import { createContext } from "react-router";
export type User = { id: string; name: string };
export const userContext = createContext<User | null>(null);
```
```tsx
// middleware で入れて
context.set(userContext, user);
// loader / action で取り出す
const user = context.get(userContext);   // User | null と型が付く
```
- 自作サーバー(Express など)から渡したいものは `getLoadContext` で `new RouterContextProvider()` を作って入れる(v8 からはただのオブジェクトは不可)

## セッションと Cookie
```ts
// app/sessions.server.ts
import { createCookieSessionStorage } from "react-router";

type SessionData = { userId: string };
type SessionFlashData = { error: string };   // 1回読んだら消える値(エラーの一言など)

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,                        // JS から読めない
      sameSite: "lax",                       // 他サイトからの POST に Cookie を付けない
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,              // 7 日
      secrets: [process.env.SESSION_SECRET!], // 署名の鍵。新しい鍵を先頭に足すと入れ替えられる
    },
  });
```
| 保存先 | 関数 | 特徴 |
| --- | --- | --- |
| Cookie そのもの | `createCookieSessionStorage` | サーバーに何も置かない。中身は**署名だけで暗号化はされない**(秘密は入れない)。4KB まで |
| メモリ | `createMemorySessionStorage` | 開発・テスト用(再起動で消える) |
| 自分で用意(DB・Redis・KV) | `createSessionStorage` | Cookie には ID だけ。サーバーで無効化しやすい |
- 変えたら必ず `commitSession()` して、返った値を `Set-Cookie` ヘッダーに付ける(忘れると保存されない)

## ログインと保護されたページ
```tsx
// app/routes/login.tsx
export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const form = await request.formData();
  const userId = await verifyPassword(form.get("email"), form.get("password"));
  if (!userId) {
    session.flash("error", "メールアドレスかパスワードが違います");
    return redirect("/login", { headers: { "Set-Cookie": await commitSession(session) } });
  }
  session.set("userId", userId);
  return redirect("/todos", { headers: { "Set-Cookie": await commitSession(session) } });
}
```
```tsx
// app/routes/_auth.tsx — routes.ts で layout("routes/_auth.tsx", [...]) にしたルート
import { Outlet, redirect } from "react-router";
import { userContext } from "~/context";
import { getSession } from "~/sessions.server";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request, context }) => {
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");
    if (!userId) throw redirect("/login");                 // 未ログインなら入れない
    context.set(userContext, await getUserById(userId));
  },
];

export default function AuthLayout() {
  return <Outlet />;
}
```
```tsx
// 子ルート: middleware が入れたユーザーを使う
export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  return { todos: await listTodos(user.id) };   // 自分のデータだけ取る
}
```
```tsx
// ログアウト(POST で)
export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/", { headers: { "Set-Cookie": await destroySession(session) } });
}
```

### 認証の注意
- **親の loader でチェックしても子は守れない**。loader は並列に動き、fetcher などから単独でも呼ばれるため。守るなら `middleware`(親に置けば子全部に効く)か、各 loader / action で確認する
- 「ログインしているか」と「**そのデータを触ってよいか**」は別。他人の ID を URL に入れられても見えないように、loader / action の中で持ち主を確認する(IDOR)→ [[Webセキュリティ対策]]
- ログアウトや削除は **GET にしない**(`<Form method="post">`)
- 外部のサイトから UI ルートの action への送信は既定で拒否される(CSRF 対策)。許可したい送信元は `react-router.config.ts` の `allowedActionOrigins`
- 自前で作らず、認証ライブラリ(Better Auth など)を使うのも定番 → [[認証]]

## 型安全(自動生成される型)
`routes.ts` を読んで、ルートごとに型を作る。
```tsx
import type { Route } from "./+types/product";   // ← .react-router/types/ に自動生成

export async function loader({ params }: Route.LoaderArgs) {
  //                           ^? { id: string }  (routes.ts の "products/:id" から)
  return { product: await getProduct(params.id) };
}

export default function Product({ loaderData, actionData, params, matches }: Route.ComponentProps) {
  loaderData.product;   // loader の戻り値の型
}
```
| 型 | 使う場所 |
| --- | --- |
| `Route.LoaderArgs` / `Route.ActionArgs` | loader / action の引数 |
| `Route.ClientLoaderArgs` / `Route.ClientActionArgs` | clientLoader / clientAction |
| `Route.ComponentProps` | 画面の props(`loaderData`・`actionData`・`params`・`matches`) |
| `Route.ErrorBoundaryProps` | ErrorBoundary の props(`error`) |
| `Route.MiddlewareFunction` | middleware |
| `Route.MetaArgs` | meta(`loaderData` などを受け取る) |
- `npm run dev` 中は自動で作り直される。CI では `react-router typegen && tsc`
- tsconfig に `"rootDirs": [".", "./.react-router/types"]` が要る(テンプレートには入っている)。`.react-router/` は `.gitignore` へ
- `useLoaderData<typeof loader>()` でも型は付くが、**props で受け取る方が楽で確実**
- URL も型付きにできる: `href("/products/:id", { id })` → 02
- 型があっても**外から来た値(フォーム・検索パラメータ)は実行時に検証する** → [[Zod]]

## 関連
- 前: [[React Router_03_データの読み込みと更新(loader・action・Form・fetcher)]] / 次: [[React Router_05_レンダリング戦略(SSR・SPA・プリレンダー・ストリーミング)]]
- [[認証]] / [[Webセキュリティ対策]] / [[APIキー・シークレット管理]] / [[TypeScript]] / [[Hono_03_ミドルウェア(組み込み・自作・認証)]]
- 公式: https://reactrouter.com/how-to/middleware , https://reactrouter.com/explanation/sessions-and-cookies , https://reactrouter.com/explanation/type-safety

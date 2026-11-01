---
title: "React Router 03 データの読み込みと更新(loader・action・Form・fetcher)"
modified: 2026-11-01
---

## 全体の流れ
```
画面を開く     → loader(読む)  → コンポーネントに loaderData
フォーム送信   → action(書く)  → 終わったら、そのページの loader が全部自動で再実行
                                     → 画面が最新になる(手で再取得しなくてよい)
```
- `loader` と `action` は**ルートモジュールの中に並べて書く**。1画面の読み書きが1ファイルにまとまる
- 受け取るのは Web 標準の `Request`、返すのはオブジェクトか `Response`

| 関数 | どこで動く | 用途 |
| --- | --- | --- |
| `loader` | **サーバー**(SSR 時・クライアント遷移時は fetch で呼ばれる)。プリレンダー時はビルド中 | DB や秘密の API キーを使う読み込み |
| `clientLoader` | ブラウザだけ | ブラウザから直接 API を呼ぶ、キャッシュ → 05 |
| `action` | **サーバー** | 作成・更新・削除 |
| `clientAction` | ブラウザだけ | ブラウザ側の処理(両方あるとこちらが優先) |
- `loader` / `action` は**ブラウザ用のコードから取り除かれる**。DB のクライアントを import しても漏れない(ただし `.server.ts` に分けておくと確実)

## loader(読む)
```tsx
// app/routes/todos.tsx
import type { Route } from "./+types/todos";
import { listTodos } from "~/db.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return { q, todos: await listTodos(q) };   // そのまま返せばよい(JSON にしなくてよい)
}

export default function Todos({ loaderData }: Route.ComponentProps) {
  // loaderData は { q: string; todos: Todo[] } と型が付く
  return <ul>{loaderData.todos.map((t) => <li key={t.id}>{t.title}</li>)}</ul>;
}
```
- `Date`・`Map`・`Set`・`Promise`・`BigInt` なども返せる(自動で送り、受け取り側で元に戻る)
- **画面はすべての loader が終わってから**描かれる。遅いデータは Promise のまま返してストリーミングにできる → 05
- ステータスやヘッダーを付けたいときは `data()`:
```tsx
import { data } from "react-router";
return data({ todos }, { headers: { "Cache-Control": "max-age=60" } });
```

### 見つからないとき・エラー
```tsx
import { data, isRouteErrorResponse } from "react-router";

export async function loader({ params }: Route.LoaderArgs) {
  const todo = await getTodo(params.id);
  if (!todo) throw data("見つかりません", { status: 404 });   // 投げると ErrorBoundary へ
  return { todo };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return <p>{error.status}: {error.data}</p>;   // 404: 見つかりません
  }
  return <p>エラーが起きました</p>;               // 想定外の例外
}
```
- `ErrorBoundary` は**そのルートの場所だけ**差し替わる。親の枠(ナビなど)は残る
- そのルートに `ErrorBoundary` がなければ、一番近い親(最後は `root.tsx`)のものが使われる
- 本番では想定外のエラーの中身(スタック)を画面に出さない(テンプレートは `import.meta.env.DEV` のときだけ出す)

## action(書く)と Form
```tsx
import { Form, redirect } from "react-router";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "");
  const todo = await addTodo(title);
  return redirect(`/todos/${todo.id}`);   // 作ったら詳細へ
}

export default function NewTodo() {
  return (
    <Form method="post">            {/* action を省くと、このルートの action に送る */}
      <input name="title" />
      <button type="submit">追加</button>
    </Form>
  );
}
```
- `<Form>` は**ふつうの `<form>` と同じ形**。JS が読み込まれる前でも送信できる(段階的な強化 = Progressive Enhancement)
- JS があれば、ページを再読み込みせずに送って、loader を再実行して画面を更新する
- `action` が返した値は props の `actionData`(エラー表示などに使う)
- 入力の検証は Zod で → [[React Router_06_実務(Zod検証・テスト・デプロイ・v8移行・AI開発)]]

### 1つの action で複数の操作(intent)
```tsx
<Form method="post">
  <button name="intent" value="archive">アーカイブ</button>
  <button name="intent" value="delete">削除</button>
</Form>
```
```tsx
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  switch (formData.get("intent")) {
    case "archive": return archive(formData);
    case "delete":  return remove(formData);
    default: throw data("不正な操作", { status: 400 });
  }
}
```

## Form と useFetcher の使い分け
| | `<Form>` | `useFetcher()` |
| --- | --- | --- |
| 送信後 | **移動する**(履歴に残る、URL が変わることも) | **移動しない**(今の画面のまま) |
| 状態 | `useNavigation()`(ページ全体で1つ) | fetcher ごとに独立(同時にいくつも) |
| 向く場面 | 作成して詳細へ、検索、ログイン | いいね、チェックボックス、一覧の行ごとの操作、ポップアップ |
```tsx
import { useFetcher } from "react-router";

function TodoItem({ todo }: { todo: Todo }) {
  const fetcher = useFetcher();
  // 送信中は送った内容で先に表示を変える(楽観的更新)。失敗すれば再取得で元に戻る
  const done = fetcher.formData ? !todo.done : todo.done;
  return (
    <li>
      <fetcher.Form method="post">
        <input type="hidden" name="id" value={todo.id} />
        <button name="intent" value="toggle">{done ? "✅" : "⬜"}</button>
      </fetcher.Form>
      {todo.title}
    </li>
  );
}
```
- fetcher でも送信後に loader は再実行される(一覧が最新になる)
- データを読むだけにも使える: `fetcher.load("/api/search?q=...")`(候補の表示など)
- `fetcher.state`(`idle` / `submitting` / `loading`)、`fetcher.data`(action の戻り値)
- コードから送る: `fetcher.submit({ id }, { method: "post" })`、移動ありなら `useSubmit()`

## 送信中・読み込み中の表示
```tsx
import { useNavigation } from "react-router";

// ページ全体: 移動中ならバーを出す
const navigation = useNavigation();
const isNavigating = navigation.state !== "idle";

// このフォームの送信中だけ
const isSubmitting = navigation.state === "submitting"
  && navigation.formAction === "/todos/new";
<button disabled={isSubmitting}>{isSubmitting ? "追加中…" : "追加"}</button>
```
| `navigation.state` | 意味 |
| --- | --- |
| `idle` | 何もしていない |
| `submitting` | action を実行中 |
| `loading` | 次のページ(または再実行)の loader を実行中 |
- **押したらすぐ反応する**こと。数百 ms でも何も変わらないと二度押しされる → [[UXデザイン]]

## 再実行(リバリデーション)の決まり
- **2xx を返した action のあと**、表示中のルートの loader が全部再実行される
- **4xx / 5xx を返したときは再実行しない**(検証エラーで 400 を返すのはこのため)
- 移動のたびにも、そのルートの loader は動く(Framework の SSR では親も含めて既定で全部)
- 重い loader を毎回動かしたくなければ `shouldRevalidate` で止められる
```tsx
export function shouldRevalidate({ formAction, defaultShouldRevalidate }: Route.ShouldRevalidateFunctionArgs) {
  if (formAction?.startsWith("/analytics")) return false;  // 計測の送信では再取得しない
  return defaultShouldRevalidate;                          // それ以外はいつも通り
}
```
- 呼び出す側で1回だけ止める: `<Form defaultShouldRevalidate={false}>`
- 手で再取得: `const { revalidate } = useRevalidator()`(ウィンドウに戻ったときなど)

## ルートモジュールが書けるもの(まとめ)
| エクスポート | 役割 |
| --- | --- |
| `default` | 画面 |
| `loader` / `clientLoader` | 読み込み |
| `action` / `clientAction` | 更新 |
| `middleware` / `clientMiddleware` | 前後の共通処理(認証・ログ)→ 04 |
| `ErrorBoundary` | エラー時の画面 |
| `HydrateFallback` | `clientLoader` が終わるまでの画面 → 05 |
| `meta` / `links` | `<head>` の中身(React 19 の `<title>`・`<meta>` を画面に直接書いてもよい) |
| `headers` | HTTP ヘッダー(キャッシュなど) |
| `handle` | 自由に使える値(パンくずの名前など。`useMatches()` で読む) |
| `shouldRevalidate` | 再実行するかどうか |

## 関連
- 前: [[React Router_02_ルーティング(routes.ts・入れ子・Link)]] / 次: [[React Router_04_ミドルウェア・認証・型安全]]
- [[React_03_React 19の機能(Actions・use・Activity・Compiler)]] / [[Next.js_05_データ更新(Server Actions・フォーム)]] / [[REST]]
- 公式: https://reactrouter.com/start/framework/data-loading , https://reactrouter.com/start/framework/actions , https://reactrouter.com/start/framework/pending-ui , https://reactrouter.com/how-to/fetchers

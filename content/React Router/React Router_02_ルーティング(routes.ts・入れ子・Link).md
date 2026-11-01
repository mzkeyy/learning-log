---
title: "React Router 02 ルーティング(routes.ts・入れ子・Link)"
modified: 2026-11-01
---

## routes.ts で URL とファイルを結ぶ
```ts
// app/routes.ts
import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),                     // /
  route("about", "routes/about.tsx"),           // /about
  route("login", "routes/login.tsx"),

  layout("routes/_auth.tsx", [                  // URL は増やさず、画面の枠(と認証)だけ共有
    ...prefix("todos", [                        // 子の URL の頭に todos/ を付ける
      index("routes/todos.tsx"),                //   /todos
      route(":id", "routes/todo.tsx"),          //   /todos/123
    ]),
  ]),

  route("dashboard", "routes/dashboard.tsx", [  // 親ルート(子を <Outlet /> に描く)
    index("routes/dashboard-home.tsx"),         //   /dashboard
    route("settings", "routes/settings.tsx"),   //   /dashboard/settings
  ]),

  route("api/todos", "routes/api.todos.ts"),    // 画面のない API(リソースルート)→ 06
  route("*", "routes/not-found.tsx"),           // どれにも当たらない URL
] satisfies RouteConfig;
```
| 関数 | 意味 |
| --- | --- |
| `route(パス, ファイル, [子])` | URL のパターンとルートモジュールを結ぶ |
| `index(ファイル)` | 親の URL そのものに出る子(既定の子)。子は持てない |
| `layout(ファイル, [子])` | **URL を増やさず**に子を包む枠を作る(共通ヘッダー・認証など) |
| `prefix(パス, [子])` | 子の URL の頭に付けるだけ(ルートは増えない) |
- ファイルの場所は `app/` からの相対パス
- 1つのファイル(ルートモジュール)が、**画面・データ読み込み・更新・エラー表示**をまとめて持つ → 03

## URL のパターン
| 書き方 | 例 | `params` |
| --- | --- | --- |
| 固定 | `about` | なし |
| **動的セグメント** | `teams/:teamId` | `{ teamId: string }` |
| 複数 | `c/:categoryId/p/:productId` | `{ categoryId, productId }` |
| 省略できる | `:lang?/categories` / `users/:id/edit?` | `{ lang?: string }` |
| **スプラット**(残り全部) | `files/*` | `{ "*": "a/b/c.png" }` |
```tsx
import type { Route } from "./+types/team";

export async function loader({ params }: Route.LoaderArgs) {
  params.teamId;   // string と型が付く(routes.ts から自動生成)
}
```
- 同じ URL に複数のパターンが当たるときは、**より具体的なもの**が勝つ(`/concerts/trending` は `/concerts/:city` より優先)。定義の順番は関係ない

## 入れ子と Outlet
```tsx
// routes/dashboard.tsx
import { NavLink, Outlet } from "react-router";

export default function Dashboard() {
  return (
    <div className="flex">
      <nav>
        <NavLink to="/dashboard" end>ホーム</NavLink>
        <NavLink to="/dashboard/settings">設定</NavLink>
      </nav>
      <main>
        <Outlet />   {/* /dashboard なら dashboard-home、/dashboard/settings なら settings */}
      </main>
    </div>
  );
}
```
```
URL: /dashboard/settings
root.tsx
 └─ dashboard.tsx      ← 枠(ナビ)はそのまま
     └─ settings.tsx   ← ここだけ入れ替わる
```
- 親と子の `loader` は**並列に**動く(親を待ってから子、ではない)→ 認証の注意は 04
- 親に渡したいものがあれば `<Outlet context={値} />` → 子で `useOutletContext()`

## ファイル名でルートを決める(任意)
`routes.ts` を書く代わりに、ファイル名の決まりで作ることもできる(Remix と同じ書き方)。
```ts
// app/routes.ts
import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";
export default flatRoutes() satisfies RouteConfig;
```
| ファイル名(`app/routes/`) | URL |
| --- | --- |
| `_index.tsx` | `/` |
| `about.tsx` | `/about` |
| `concerts.tsx` + `concerts._index.tsx` | `/concerts`(`concerts.tsx` が枠) |
| `concerts.$city.tsx` | `/concerts/:city` |
| `concerts_.mine.tsx` | `/concerts/mine`(`_` で親の枠に入れない) |
| `_auth.tsx` + `_auth.login.tsx` | `/login`(`_auth` は URL にならない枠) |
| `($lang).about.tsx` | `/about` と `/ja/about` |
| `files.$.tsx` | `/files/*` |
- `.`(ドット)が URL の `/` になる。混ぜて使うこともできる(`[...await flatRoutes(), route(...)]`)
- どちらでもよいが、**`routes.ts` に書く方が一覧しやすく、AI にも分かりやすい**

## リンクと移動
| 道具 | 使う場面 |
| --- | --- |
| `<Link to="/about">` | ふつうのリンク |
| `<NavLink to="/about">` | 今いるページなら印を付けたいリンク(メニュー) |
| `<Form action="/search">` | フォームの送信で移動(`GET` なら `?q=...` 付きの URL へ) |
| `redirect("/login")` | `loader` / `action` の中から移動させる |
| `useNavigate()` | ユーザーの操作なしに移動(一定時間でログアウトなど)。**なるべく使わない** |

```tsx
import { Link, NavLink } from "react-router";

<Link to="/todos/1">詳細</Link>
<Link to=".." relative="path">一つ上へ</Link>
<Link to="/report.pdf" reloadDocument>PDF</Link>   {/* ふつうのページ遷移にする */}
<Link to="/todos" prefetch="intent">TODO</Link>    {/* ホバーで次のデータを先読み(Framework) */}

<NavLink to="/todos" className={({ isActive, isPending }) =>
  isActive ? "font-bold" : isPending ? "opacity-50" : ""}>
  TODO
</NavLink>
```
- `NavLink` は今のページなら `active`、移動中なら `pending` という class が自動で付く。`end` を付けると完全一致のときだけ active
- ボタンで移動したいときも、なるべく `<Link>` か `<Form>` にする(右クリックで新しいタブ・JS なしでも動く)

### 型付きの URL(href)
```tsx
import { href } from "react-router";

<Link to={href("/todos/:id", { id: todo.id })}>詳細</Link>
// 存在しないパス・足りないパラメータは型エラーになる(Framework モード)
```

## 検索パラメータ(?q=...)
**検索条件・絞り込み・ページ番号は URL に入れる**と、リロードしても共有しても同じ画面になる。
```tsx
// loader で読む(サーバーでもブラウザでも同じ書き方)
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = Number(url.searchParams.get("page") ?? "1");
  return { q, items: await search(q, page) };
}

// 画面: GET のフォームを送ると ?q=... の URL に移動し、loader がもう一度動く
export default function Search({ loaderData }: Route.ComponentProps) {
  return (
    <Form method="get">
      <input name="q" defaultValue={loaderData.q} />
      <button>検索</button>
    </Form>
  );
}
```
```tsx
// コンポーネントから読み書きする
import { useSearchParams } from "react-router";

const [searchParams, setSearchParams] = useSearchParams();
const sort = searchParams.get("sort") ?? "new";
setSearchParams((prev) => { prev.set("sort", "old"); return prev; });
```
- 値は文字列なので、数値や選択肢は **Zod で検証して型にする**と安全 → [[React Router_06_実務(Zod検証・テスト・デプロイ・v8移行・AI開発)]]
- 検索パラメータが変わると、そのページの `loader` は自動で再実行される

## よく使うフック
| フック | 返すもの |
| --- | --- |
| `useParams()` | `{ id: "123" }`(ルートモジュールなら props の `params` の方が型が付く) |
| `useLocation()` | 今の `pathname`・`search`・`hash`・`state` |
| `useSearchParams()` | 検索パラメータの読み書き |
| `useNavigation()` | 移動中・送信中か(`idle` / `loading` / `submitting`)→ 03 |
| `useMatches()` | 今当たっているルートの一覧(パンくずリストに使う、`handle` と組み合わせ) |
| `useRouteLoaderData("root")` | 別のルート(親など)の loader のデータ |

## 関連
- 前: [[React Router_01_はじめに(3つのモード・作成・構成)]] / 次: [[React Router_03_データの読み込みと更新(loader・action・Form・fetcher)]]
- [[Next.js_02_ルーティング]] / [[TanStack Start_02_ルーティングとデータ読み込み]](同じ考え方の比較に)
- 公式: https://reactrouter.com/start/framework/routing , https://reactrouter.com/start/framework/navigating , https://reactrouter.com/how-to/file-route-conventions

---
title: "TanStack Start 02 ルーティングとデータ読み込み"
modified: 2026-09-29
---

ルーティングは 100% **TanStack Router**。ここを理解することが Start の理解の9割。

## ファイル名とURL
| URL | ファイル | 種類 |
| --- | --- | --- |
| `/` | `index.tsx` | インデックス |
| `/about` | `about.tsx` | 静的 |
| (レイアウト) | `posts.tsx` | `/posts/*` を包む |
| `/posts/` | `posts/index.tsx` | インデックス |
| `/posts/:postId` | `posts/$postId.tsx`(= `posts.$postId.tsx`) | **動的**(`$` で始まる) |
| `/rest/*` | `rest/$.tsx` | ワイルドカード |
| (URLに出ない枠) | `_authenticated.tsx` | **パスなしレイアウト**(`_` 始まり)。ログイン必須エリアなど |
| (整理用) | `(group)/...` | グループ(URLに影響なし) |
- `.` と `/` は同じ意味(`posts.$postId.tsx` でも `posts/$postId.tsx` でも可)
- `routeTree.gen.ts` は開発サーバーが自動生成。`createFileRoute('/posts/$postId')` のパス文字列も自動で書き換わる

## ルートの定義
```tsx
// src/routes/posts/$postId.tsx
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getPost } from '~/utils/posts.functions'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {              // ページ表示前にデータ取得
    const post = await getPost({ data: { id: params.postId } })
    if (!post) throw notFound()
    return post
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.title }] }),
  component: PostPage,
  pendingComponent: () => <p>Loading...</p>,
  errorComponent: ({ error }) => <p>エラー: {error.message}</p>,
  notFoundComponent: () => <p>記事が見つかりません</p>,
})

function PostPage() {
  const post = Route.useLoaderData()           // ★ 型付きで取得
  const { postId } = Route.useParams()
  return <article><h1>{post.title}</h1></article>
}
```

### ⚠️ loader は「サーバーとブラウザ両方」で動く
- 初回アクセス(SSR)はサーバー、ページ遷移時はブラウザで実行される
- **loader に秘密情報(DBの接続情報、APIキー)を書かない** → Server Function を呼ぶ([[TanStack Start_03_実行モデルとServer Functions]])

## リンクと遷移(型安全)
```tsx
import { Link, useNavigate } from '@tanstack/react-router'

<Link to="/posts/$postId" params={{ postId: '123' }}>記事</Link>
<Link to="/about" activeProps={{ className: 'font-bold' }}>About</Link>

const navigate = useNavigate()
navigate({ to: '/posts', search: { page: 2 } })
```
- 存在しないパスや足りない params は**コンパイルエラー**になる(これが最大の売り)
- 既定でホバー時などにプリロード(設定で調整)

## Search Params(URL のクエリを「型付きの状態」として使う)
一覧のページ番号・絞り込み・並び順などを URL に持たせる → 共有・リロード・戻るボタンで状態が保たれる。
```tsx
// src/routes/shop/products.tsx
import { z } from 'zod'
const productSearchSchema = z.object({
  page: z.number().catch(1),
  filter: z.string().catch(''),
  sort: z.enum(['newest', 'oldest', 'price']).catch('newest'),
})
export const Route = createFileRoute('/shop/products')({
  validateSearch: productSearchSchema,                     // 検証+型付け
  loaderDeps: ({ search }) => ({ page: search.page }),     // search を loader で使う時
  loader: ({ deps }) => fetchProducts({ data: deps }),
  component: ProductList,
})
function ProductList() {
  const { page, sort } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return <button onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })}>次へ</button>
}
```
- `.catch()` で不正な値は既定値に(ユーザーにエラーを見せない)

## beforeLoad(ルートのガード・コンテキスト)
子ルートより先に実行される「ルート用ミドルウェア」。ログイン必須エリアに使う。
```tsx
// src/routes/_authenticated.tsx(この下のルートは全部ログイン必須)
import { createFileRoute, redirect } from '@tanstack/react-router'
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { user }   // 子ルートの context で使える
  },
})
```
- ⚠️ 公式注意: **ルートのガードは「データの認可」ではない**。非公開データを返す Server Function / Server Route 側でも必ず認証・認可する
- 実行順: params 解析 → validateSearch → beforeLoad(親→子) → loader(並列)

## loader のキャッシュ
- Router が loader の結果をキャッシュ(`staleTime`、`gcTime` で調整)
- 更新後に取り直す: `router.invalidate()`
- 複雑なキャッシュ・楽観的更新が必要なら TanStack Query と連携([[TanStack Start_05_レンダリング戦略・SEO・TanStack Query]])

## エラー・404
- `throw notFound()` → `notFoundComponent`
- `throw redirect({ to })` → 遷移
- 例外 → `errorComponent`(ルートごと / ルーター全体の既定)

## 関連
- 前: [[TanStack Start_01_はじめに(概要・作成・構成)]] / 次: [[TanStack Start_03_実行モデルとServer Functions]]
- 公式: https://tanstack.com/start/latest/docs/framework/react/guide/routing , https://tanstack.com/router/latest/docs/framework/react/guide/search-params , https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes

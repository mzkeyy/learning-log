---
title: "Next.js 04 データ取得とストリーミング"
modified: 2026-09-29
---

## Server Component で取得する(基本)
コンポーネントを `async` にして `await` するだけ。
```tsx
// fetch API で
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog')
  const posts = await res.json()
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}
```
```tsx
// ORM / DB で(認証情報はブラウザに送られないので安全)
import { db, posts } from '@/lib/db'
export default async function Page() {
  const allPosts = await db.select().from(posts)
  return <ul>{allPosts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}
```
ポイント:
- 同じ `fetch` は1回のリクエスト内で自動的にまとめられる(メモ化)→ **必要な部品の中で直接取得してよい**(props のバケツリレー不要)
- `fetch` は**既定でキャッシュされない**。キャッシュしたいなら `'use cache'`([[Next.js_06_キャッシュと再検証]])
- DB など fetch 以外は `React.cache` で包むと同じリクエスト内で共有できる
- 認証・認可のチェックは必ず行う([[Next.js_08_認証とセキュリティ]])

## ストリーミング(遅いデータで画面全体を止めない)
遅いデータを待つとページ全体が表示されない → **準備できた部分から順に送る**。

### 方法1: `loading.tsx`(ページ全体)
```tsx
// app/blog/loading.tsx
export default function Loading() { return <div>Loading...</div> }
```
→ レイアウトとローディング表示が即座に出て、ページが準備できたら差し替わる

### 方法2: `<Suspense>`(部分ごと。推奨)
```tsx
import { Suspense } from 'react'
export default function BlogPage() {
  return (
    <div>
      <header><h1>Blog</h1></header>       {/* すぐ表示 */}
      <Suspense fallback={<BlogListSkeleton />}>
        <BlogList />                       {/* データが来たら表示 */}
      </Suspense>
    </div>
  )
}
```
- 意味のあるローディング表示(スケルトン、タイトルやカバー画像だけ先に)にすると体感が良い
- 検索エンジンのクローラーには完成したページを返してくれる

## Client Component で取得する
1. **Server で Promise を作り、Client で `use()` で読む**(ストリーミング)
```tsx
// page.tsx(Server)
export default function Page() {
  const posts = getPosts()            // ★ await しない
  return (<Suspense fallback={<p>Loading...</p>}><Posts posts={posts} /></Suspense>)
}
// posts.tsx(Client)
'use client'
import { use } from 'react'
export default function Posts({ posts }: { posts: Promise<Post[]> }) {
  const all = use(posts)
  return <ul>{all.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}
```
2. **SWR / TanStack Query** などのライブラリ(ユーザー操作で何度も取り直す画面向け)
```tsx
'use client'
import useSWR from 'swr'
const fetcher = (url: string) => fetch(url).then((r) => r.json())
export default function BlogPage() {
  const { data, error, isLoading } = useSWR('/api/posts', fetcher)
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error</div>
  return <ul>{data.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}
```

## 取得のパターン
### 直列(前の結果が次に必要)
```tsx
const artist = await getArtist(username)
// Playlists は artist.id が必要 → Suspense で包んで後から流す
<Suspense fallback={<p>Loading...</p>}><Playlists artistID={artist.id} /></Suspense>
```
### 並列(独立したものは同時に始める)★ よくある性能改善ポイント
```tsx
// ✗ 直列になってしまう
const artist = await getArtist(username)
const albums = await getAlbums(username)

// ○ 同時に開始して待つ
const [artist, albums] = await Promise.all([getArtist(username), getAlbums(username)])
```
- 1つ失敗すると全体が失敗 → 失敗を許容するなら `Promise.allSettled`

### 共有(React.cache)
```ts
import { cache } from 'react'
export const getUser = cache(async (id: string) => db.query.users.findFirst({ where: eq(users.id, id) }))
```
→ 複数の部品が `getUser('1')` を呼んでも1リクエスト内では1回だけ実行

### 先読み(preload)
待ち時間のある処理の前に `void getItem(id)` で取得を開始しておき、後で同じ関数を呼ぶ。

## 実務のコツ
- **「データを使う部品の中で取得」+「Suspense で包む」**が基本形
- ウォーターフォール(直列の待ち)が性能問題の最大原因。独立した取得は `Promise.all`
- 開発中は `next.config.ts` の `logging` で fetch をログ出力できる

## 関連
- 前: [[Next.js_03_Server ComponentsとClient Components]] / 次: [[Next.js_05_データ更新(Server Actions・フォーム)]]
- [[N+1]] … DB 取得でよくある性能問題
- 公式: https://nextjs.org/docs/app/getting-started/fetching-data

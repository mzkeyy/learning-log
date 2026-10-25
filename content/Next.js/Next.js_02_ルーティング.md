---
title: "Next.js 02 ルーティング"
modified: 2026-09-29
---

**フォルダ = URL の区切り、ファイル = その URL で表示する UI**。

## ページを作る
```tsx
// app/page.tsx → "/"
export default function Page() {
  return <h1>Hello Next.js!</h1>
}
```
```tsx
// app/blog/page.tsx → "/blog"
import { getPosts } from '@/lib/posts'
export default async function Page() {
  const posts = await getPosts()
  return <ul>{posts.map((p) => <li key={p.slug}>{p.title}</li>)}</ul>
}
```

## レイアウト(共通の枠)
- 複数ページで共有する UI。**ページ遷移しても再描画されず、状態が保たれる**
- 入れ子になる: `app/layout.tsx` が `app/blog/layout.tsx` を包み、それが `app/blog/page.tsx` を包む
```tsx
// app/layout.tsx(ルートレイアウト:必須)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header>My Site</header>
        {children}
      </body>
    </html>
  )
}
```

## 動的ルート(URL の一部が変わる)
フォルダ名を `[ ]` で囲む。
```tsx
// app/blog/[slug]/page.tsx → /blog/hello, /blog/world ...
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params          // ★ params は Promise(await が必要)
  const post = await getPost(slug)
  return <article>{post.title}</article>
}

// ビルド時に作っておくページを指定(任意)
export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((p) => ({ slug: p.slug }))
}
```
| 書き方 | 例 | マッチ |
| --- | --- | --- |
| `[slug]` | `/blog/a` | 1階層 |
| `[...slug]` | `/shop/a/b/c` | 複数階層(必須) |
| `[[...slug]]` | `/shop` も含む | 複数階層(任意) |
- クエリ文字列(`?page=2`)は page の `searchParams`(これも Promise)で受け取る

## リンクと画面遷移
```tsx
import Link from 'next/link'
<Link href="/blog">ブログ</Link>
<Link href={`/blog/${post.slug}`}>{post.title}</Link>
```
- `<a>` ではなく **`<Link>`** を使う:
  - **プリフェッチ**: 画面に入ったリンク先を裏で先読み → 押した瞬間に表示
  - **クライアント側遷移**: ページ全体を再読み込みせず、共通レイアウトを残して中身だけ差し替え
- プログラムで遷移: クライアント部品で `useRouter()` の `router.push('/x')`、サーバー側は `redirect('/x')`
- 現在のパス: `usePathname()`(ナビのアクティブ表示など)

## 読み込み中・エラー・404
```tsx
// app/blog/loading.tsx  → データ取得中に自動表示(Suspense で包まれる)
export default function Loading() { return <p>読み込み中...</p> }
```
```tsx
// app/blog/error.tsx  → 予期しないエラー時(Client Component 必須)
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (<div><p>問題が発生しました</p><button onClick={() => reset()}>再試行</button></div>)
}
```
```tsx
// 404: 見つからない時に notFound() を呼ぶ → not-found.tsx が表示
import { notFound } from 'next/navigation'
if (!post) notFound()
```
- `global-error.tsx`: ルートレイアウト自体のエラー用

## API を作る(Route Handlers)
```ts
// app/api/posts/route.ts → GET/POST /api/posts
export async function GET() {
  const posts = await getPosts()
  return Response.json(posts)
}
export async function POST(request: Request) {
  const body = await request.json()
  // 認証チェック・バリデーション → 保存
  return Response.json({ ok: true }, { status: 201 })
}
```
- 対応メソッド: GET POST PUT PATCH DELETE HEAD OPTIONS
- **同じフォルダに page.tsx と route.ts は置けない**
- 画面からの更新なら Route Handler より **Server Actions**([[Next.js_05_データ更新(Server Actions・フォーム)]])が簡単。Route Handler は外部サービス(Webhook、モバイルアプリ)向け
- `sitemap.ts` `robots.ts` `opengraph-image.tsx` などの特別なファイルもある

## Proxy(旧 Middleware)
リクエストが処理される**前**に動く。v16 で `middleware.ts` → **`proxy.ts`** に名称変更。
```ts
// proxy.ts(プロジェクト直下 or src/ 直下)
import { NextResponse, type NextRequest } from 'next/server'
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has('session')
  if (!hasSession) return NextResponse.redirect(new URL('/login', request.url))
}
export const config = { matcher: ['/dashboard/:path*'] }
```
- 用途: ヘッダー追加、A/Bテストの振り分け、ログイン状態による**楽観的な**リダイレクト
- **重いデータ取得や本格的な認可には使わない**(本当のチェックはデータアクセス層で → [[Next.js_08_認証とセキュリティ]])
- 単純なリダイレクトは `next.config.ts` の `redirects` で十分

## 高度なルーティング(存在だけ知っておく)
- **パラレルルート** `@slot`: 1画面に複数ページを同時表示(ダッシュボード)
- **インターセプトルート** `(.)photo`: 一覧からモーダルで詳細を開き、URL直打ちでは全画面表示

## 関連
- 前: [[Next.js_01_はじめに(React基礎・インストール・構成)]] / 次: [[Next.js_03_Server ComponentsとClient Components]]
- 公式: https://nextjs.org/docs/app/getting-started/layouts-and-pages , https://nextjs.org/docs/app/getting-started/linking-and-navigating , https://nextjs.org/docs/app/getting-started/route-handlers , https://nextjs.org/docs/app/getting-started/proxy

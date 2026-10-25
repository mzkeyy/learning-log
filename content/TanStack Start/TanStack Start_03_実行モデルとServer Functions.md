---
title: "TanStack Start 03 実行モデルと Server Functions"
modified: 2026-09-29
---

## 大原則: 既定で「両方で動く」(isomorphic)
TanStack Start のコードは、明示しない限り**サーバーとブラウザ両方のバンドルに入り、両方で動く**。
- route の `loader` も両方で動く(初回はサーバー、遷移時はブラウザ)
- Next.js(既定でサーバー)とは逆の発想なので注意

## 実行場所をコントロールする API
| API | 動く場所 | 反対側で呼ぶと |
| --- | --- | --- |
| `createServerFn()` | サーバー | ブラウザからはネットワーク経由で呼ばれる(RPC) |
| `createServerOnlyFn(fn)` | サーバーのみ | エラー |
| `createClientOnlyFn(fn)` | ブラウザのみ | エラー |
| `<ClientOnly fallback>` | ハイドレーション後のブラウザ | サーバーでは fallback を表示 |
| `useHydrated()` | - | ハイドレーション済みかの真偽値 |
| `createIsomorphicFn().server().client()` | 両方(実装を分ける) | - |

ファイル単位の指定:
- ファイル名を `*.server.ts` / `*.client.ts` にする
- またはファイル先頭で `import '@tanstack/react-start/server-only'`(`client-only`)

## Server Functions(サーバー関数)
**どこからでも呼べる、サーバーで動く型付き関数**。DB・環境変数・ファイルにアクセスできる。
```tsx
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// GET(既定)
export const getServerTime = createServerFn().handler(async () => {
  return new Date().toISOString()
})

// POST + 入力検証
export const createUser = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().min(1), age: z.number().min(0) }))
  .handler(async ({ data }) => {
    // data は検証済み・型付き
    return db.users.create(data)
  })

// 呼び出し(引数は data で渡す)
await createUser({ data: { name: '山田', age: 30 } })
```

### 呼べる場所
- **route の loader**(データ取得の定番)
- コンポーネント(`useServerFn()` + TanStack Query の `useQuery` / `useMutation`)
- イベントハンドラ(ボタン、フォーム)
- 他の Server Function
```tsx
export const Route = createFileRoute('/posts')({
  loader: () => getPosts(),
})
function PostList() {
  const fetchPosts = useServerFn(getPosts)
  const { data } = useQuery({ queryKey: ['posts'], queryFn: () => fetchPosts() })
}
```

### 推奨ファイル構成
```text
src/utils/
├── users.functions.ts   # createServerFn のラッパー(どこから import してもOK)
├── users.server.ts      # DB クエリなどサーバー専用(handler の中でだけ使う)
└── schemas.ts           # 検証スキーマ・型(クライアントでも安全)
```
- Server Function は Client から**静的 import してOK**(ビルド時にクライアント側は RPC 呼び出しに置き換わる)
- ⚠️ 動的 import(`await import(...)`)はしない

### エラー・リダイレクト・404
```tsx
import { redirect, notFound } from '@tanstack/react-router'
export const requireAuth = createServerFn().handler(async () => {
  const user = await getCurrentUser()
  if (!user) throw redirect({ to: '/login' })
  return user
})
export const getPost = createServerFn()
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const post = await db.findPost(data.id)
    if (!post) throw notFound()
    return post
  })
```

### リクエスト・レスポンスの操作
```tsx
import { getRequestHeader, setResponseHeaders, setResponseStatus } from '@tanstack/react-start/server'
```
- ⚠️ `Cache-Control: public` は**全員に同じ内容の時だけ**。ログインユーザー依存なら `private` + `Vary: Cookie`、機密なら `no-store`

### セキュリティ
- Server Function は**独立した API エンドポイント**。どの画面から呼ばれるかに関係なく、**関数の中(またはミドルウェア)で認証・認可**
- 入力は `.validator()` で必ず検証(TypeScript の型は実行時の検証ではない)
- 同一オリジンからの呼び出しを前提に **CSRF ミドルウェア**が自動で入る(`src/start.ts` を自分で書く場合は `createCsrfMiddleware()` を自分で登録)
- 外部から呼ばれる API は Server Function ではなく **Server Routes** で作る

## よくある間違い(公式 Anti-Patterns)
```tsx
// ❌ モジュールのトップで process.env を読む
const apiKey = process.env.SECRET_KEY
//   → クライアントに埋め込まれる危険 + Cloudflare Workers ではリクエスト時まで env がなく undefined

// ✅ サーバー専用関数か handler の中で読む
const getKey = createServerOnlyFn(() => process.env.SECRET_KEY)
```
```tsx
// ❌ loader はサーバー専用だと思い込む(ブラウザでも動く)
loader: () => fetch(`/api/users?key=${process.env.SECRET}`)
// ✅ Server Function 経由
loader: () => getUsersSecurely()
```
```tsx
// ❌ サーバーとブラウザで結果が変わる描画 → ハイドレーションエラー
<div>{new Date().toLocaleString()}</div>
// ✅ useEffect でブラウザ側だけ、または useHydrated / ClientOnly
```

## 判断基準
- **サーバー専用**: 秘密情報、ファイル操作、DB、外部 API キー
- **ブラウザ専用**: DOM 操作、localStorage、位置情報、アナリティクス
- **両方**: 整形処理、ビジネスロジック、共有ユーティリティ、loader

## 関連
- 前: [[TanStack Start_02_ルーティングとデータ読み込み]] / 次: [[TanStack Start_04_ミドルウェア・Server Routes・環境変数]]
- 公式: https://tanstack.com/start/latest/docs/framework/react/guide/execution-model , https://tanstack.com/start/latest/docs/framework/react/guide/server-functions

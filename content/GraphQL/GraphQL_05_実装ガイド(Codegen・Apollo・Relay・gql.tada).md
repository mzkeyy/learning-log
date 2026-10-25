---
title: "GraphQL 05 実装ガイド(Codegen・Apollo・Relay・gql.tada)"
modified: 2026-09-29
---

## ツールの選び方
| 構成 | 向いている |
| --- | --- |
| **Apollo Client + GraphQL Code Generator(client preset)** | 最も情報が多い定番。まずはこれ |
| **urql / TanStack Query + Codegen** | 軽量にしたい |
| **gql.tada + 任意のクライアント** | コード生成のビルドステップなしで型推論したい |
| **Relay** | 大規模・パフォーマンス重視。規約が厳しく学習コスト高 |

## 定番構成: Codegen(client preset)
### インストール
```bash
npm install graphql @graphql-typed-document-node/core
npm install -D typescript @graphql-codegen/cli @parcel/watcher
```
### codegen.ts
```ts
import type { CodegenConfig } from '@graphql-codegen/cli'
const config: CodegenConfig = {
  schema: 'https://api.example.com/graphql',   // またはローカルの schema.graphql
  documents: ['src/**/*.tsx'],                   // フラグメント・クエリを書くファイル
  ignoreNoDocuments: true,
  generates: {
    './src/gql/': { preset: 'client' },          // graphql() と型が生成される
  },
}
export default config
```
```json
// package.json
"scripts": { "codegen": "graphql-codegen", "codegen:watch": "graphql-codegen --watch" }
```
- 開発中は watch モードで動かしっぱなし(フラグメントを書くと即座に型が更新)

### 部品を書く流れ
```tsx
// src/components/PostCard.tsx
import { graphql, useFragment, type FragmentType } from '@/gql'

export const PostCard_post = graphql(`
  fragment PostCard_post on Post {
    title
    excerpt
    author { ...AuthorBadge_user }
  }
`)

export function PostCard(props: { post: FragmentType<typeof PostCard_post> }) {
  const post = useFragment(PostCard_post, props.post)
  return (
    <article>
      <h2>{post.title}</h2>
      <p>{post.excerpt}</p>
      <AuthorBadge user={post.author} />
    </article>
  )
}
```
```tsx
// src/app/posts/page.tsx(Apollo Client の例)
import { useQuery } from '@apollo/client'
import { graphql } from '@/gql'
const PostListQuery = graphql(`
  query PostList { posts(first: 20) { id ...PostCard_post } }
`)
export default function PostListPage() {
  const { data, loading, error } = useQuery(PostListQuery)
  if (loading) return <p>Loading...</p>
  if (error) return <p>Error</p>
  return data?.posts.map((p) => <PostCard key={p.id} post={p} />)
}
```

## Apollo Client のポイント
- `new ApolloClient({ uri, cache: new InMemoryCache(), dataMasking: true })`
- `useFragment` でキャッシュからライブに読む(更新が自動反映)、Suspense 版 `useSuspenseFragment`
- union / interface のフラグメント → `InMemoryCache({ possibleTypes })`(Codegen の `fragment-matcher` プラグインで生成可)
- Fragment Registry(名前でフラグメントを登録)は、**Codegen の client preset を使う場合は非推奨**(生成物にフラグメント定義が含まれるため)
- 正規化キャッシュのため、**各オブジェクトで `id` と `__typename` を取る**

## Relay のポイント
- Relay コンパイラがフラグメントを1つのクエリに合成、型(`$key`)も生成
- `useFragment(Fragment, ref)`、ページネーション `usePaginationFragment`、再取得 `useRefetchableFragment`
- `@argumentDefinitions` / `@arguments` でフラグメントに引数

## gql.tada のポイント
- スキーマから TypeScript の型を**エディタ上で推論**(生成ファイル不要)
- 子フラグメントは `graphql(文字列, [子フラグメント])` の第2引数で渡す
- `readFragment` で開封、`FragmentOf<typeof X>` で props の型

## 開発を快適にする道具
- **GraphQLSP**: TypeScript の LSP プラグイン。スキーマに基づく補完・検証
- **graphql-eslint**: GraphQL のベストプラクティスを lint(未使用フラグメント、命名など)
- スキーマの変更検知・破壊的変更チェックを CI に

## Next.js(App Router)で使う時
- Server Component では `fetch` やサーバー用クライアントで直接クエリを実行し、結果を props で渡す構成が簡単
- クライアントでキャッシュ・更新を扱うなら Apollo の Next.js 連携パッケージ、または TanStack Query
- Server / Client の境界をまたぐ props はシリアライズ可能であること([[Next.js_03_Server ComponentsとClient Components]])

## 関連
- 前: [[GraphQL_04_Fragment Masking(データマスキング)]] / 次: [[GraphQL_06_実務の注意とサーバー側(N+1・キャッシュ)]]
- 公式: https://the-guild.dev/graphql/codegen/docs/guides/react-vue , https://www.apollographql.com/docs/react/data/fragments , https://relay.dev/docs/ , https://gql-tada.0no.co/

---
title: "GraphQL 01 入門(REST との違い・スキーマ・クエリ)"
modified: 2026-09-29
---

## GraphQL とは
Meta(旧 Facebook)が作った **API のための問い合わせ言語**。クライアントが「欲しいデータの形」を書いて送ると、サーバーがその形のまま返す。

## REST との違い
| | REST | GraphQL |
| --- | --- | --- |
| エンドポイント | リソースごとに複数(`/users/1`、`/users/1/posts`) | 基本 **1つ**(`/graphql`) |
| 返るデータ | サーバーが決める | **クライアントが必要な項目を指定** |
| 取りすぎ(over-fetching) | 起きやすい | 起きにくい |
| 取り足りない(under-fetching)→ 何度も呼ぶ | 起きやすい | 1回で関連データまで取れる |
| 型 | OpenAPI などで別途定義 | **スキーマが型そのもの**(必須) |
| キャッシュ | HTTP キャッシュが効きやすい | クライアント側のキャッシュライブラリが担う |
| 向き | シンプルな CRUD、公開 API | 画面ごとに必要データが違う複雑な UI、モバイル |

## スキーマ(型の定義)
```graphql
type User {
  id: ID!            # ! = 必須(null にならない)
  name: String!
  avatarUrl: String
  posts: [Post!]!    # Post の配列
}

type Post {
  id: ID!
  title: String!
  body: String!
  author: User!
}

type Query {         # 読み取りの入口
  post(id: ID!): Post
  posts(first: Int = 10): [Post!]!
}

type Mutation {      # 書き込みの入口
  createPost(input: CreatePostInput!): Post!
}

input CreatePostInput { title: String!  body: String! }
```
基本の型: `Int` `Float` `String` `Boolean` `ID`、他に `enum`、`interface`、`union`

## 3種類の操作
### Query(読み取り)
```graphql
query PostDetail($id: ID!) {       # $id は変数
  post(id: $id) {
    title
    author { name avatarUrl }      # 関連データも1回で
  }
}
```
変数は JSON で別に渡す: `{ "id": "123" }`(文字列に直接埋め込まない)

### Mutation(書き込み)
```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) { id title }   # 更新後のデータを返してもらう
}
```

### Subscription(リアルタイム)
サーバーからの更新を受け取り続ける(WebSocket など)。

## 便利な書き方
- **エイリアス**: 同じフィールドを別名で2回取る `small: avatar(size: 32)  large: avatar(size: 128)`
- **ディレクティブ**: `@include(if: $showBody)` `@skip(if: ...)`
- **__typename**: そのオブジェクトの型名(キャッシュや union の判定に使う)
- **フラグメント**: 項目のセットを名前付きで再利用 → [[GraphQL_02_Fragmentの基礎]]

## サーバー側の仕組み(ざっくり)
- スキーマ + **リゾルバ**(各フィールドの値を取ってくる関数)
- 実装: Apollo Server、GraphQL Yoga、Pothos(TypeScript でスキーマを書く)、Hasura / PostGraphile(DB から自動生成)など
- 注意: フィールドごとにリゾルバが動くので **N+1 問題**が起きやすい → DataLoader でまとめる([[GraphQL_06_実務の注意とサーバー側(N+1・キャッシュ)]])

## クライアント側のライブラリ
| ライブラリ | 特徴 |
| --- | --- |
| **Apollo Client** | 最も普及。正規化キャッシュ、useFragment、データマスキング |
| **Relay** | Meta 製。Fragment Colocation とマスキングの元祖。規約が厳しいが大規模向け |
| **urql** | 軽量・シンプル |
| **graphql-request + TanStack Query** | 最小構成 |
| **GraphQL Code Generator / gql.tada** | 型を自動生成・推論(どのクライアントとも組み合わせ可) |

## 関連
- 次: [[GraphQL_02_Fragmentの基礎]]
- 公式: https://graphql.org/learn/

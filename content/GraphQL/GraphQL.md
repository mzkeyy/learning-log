---
title: "GraphQL / Fragment Colocation"
modified: 2026-10-18
---

**GraphQL** = クライアントが「欲しいデータの形」を書いて送ると、その形のまま返ってくる API の問い合わせ言語(REST との違い → 01)。
**Fragment Colocation** = 「コンポーネントが必要とするデータの定義(フラグメント)を、そのコンポーネントと同じファイルに書く」設計手法(Colocation = 同じ場所に置く)。親は子のフラグメントを組み合わせるだけなので、変更が局所化し、取りすぎ・取り忘れが減る。

graphql.org、Apollo Client、Relay、GraphQL Code Generator、gql.tada の公式ドキュメント(**2026年9月時点**)と国内事例を読んで整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[GraphQL_01_入門(RESTとの違い・スキーマ・クエリ)]] | GraphQL 自体の基礎 |
| 02 | [[GraphQL_02_Fragmentの基礎]] | フラグメントとは、書き方、型条件 |
| 03 | [[GraphQL_03_Fragment Colocation(設計パターン)]] | 本題。なぜ・どう配置するか、命名、マネーフォワードの事例 |
| 04 | [[GraphQL_04_Fragment Masking(データマスキング)]] | 部品同士を独立させる仕組み |
| 05 | [[GraphQL_05_実装ガイド(Codegen・Apollo・Relay・gql.tada)]] | ツール別の具体的な書き方 |
| 06 | [[GraphQL_06_実務の注意とサーバー側(N+1・キャッシュ)]] | 運用・性能・AI 開発 |

## 全体像
```
PostListPage.tsx(クエリを実行)
  query PostList { posts { id ...PostCard_post } }
        │ 子のフラグメントを「...」で展開するだけ
        ▼
PostCard.tsx(フラグメントを定義・使用)
  fragment PostCard_post on Post { title excerpt author { ...AuthorBadge_user } }
        │
        ▼
AuthorBadge.tsx
  fragment AuthorBadge_user on User { name avatarUrl }

→ ビルド時/実行時に1つのクエリに合成され、サーバーへのリクエストは1回
```

## 考え方の応用
「関係するものは近くに置く」はコード設計全般の原則。[[デザインの4原則]] の「近接」のコード版とも言える。AI に「この部品を直して」と頼む時も、必要な情報が1ファイルにまとまっているので正確に直せる。

## 出典
- 公式: https://graphql.org/learn/ , https://www.apollographql.com/docs/react/data/fragments , https://relay.dev/docs/tutorial/fragments-1/ , https://the-guild.dev/graphql/codegen/docs/guides/react-vue , https://gql-tada.0no.co/guides/fragment-colocation
- 事例・解説: [マネーフォワード (Zenn)](https://zenn.dev/moneyforward/articles/20221211-fragment-colocation) / [ドワンゴ教育サービス](https://blog.nnn.dev/entry/2023/07/03/144639) / [Qiita](https://qiita.com/terakura-aina/items/9a05f35e9af46a6f09ec) / [Speaker Deck](https://speakerdeck.com/chloe463/graphql-fragment-colocation-nohua)

## 関連
- [[N+1]] / [[Next.js]] / [[MCP]]

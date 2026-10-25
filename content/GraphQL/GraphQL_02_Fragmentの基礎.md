---
title: "GraphQL 02 Fragment の基礎"
modified: 2026-09-29
---

## フラグメントとは
**複数のクエリ・ミューテーションで再利用できる「フィールドのセット」に名前を付けたもの**。`...名前`(スプレッド)で展開する。
```graphql
fragment NameParts on Person {   # "on Person" = Person 型に対するフラグメント(型条件)
  firstName
  lastName
}

query GetPerson {
  people(id: "7") {
    ...NameParts                  # ここに firstName lastName が展開される
    avatar(size: LARGE)
  }
}
```
- フラグメントを変更すると、**使っている全ての操作に反映**される
- フラグメントの中で別のフラグメントを展開できる(入れ子)
- フラグメント名は**アプリ全体で一意**にする

## 型条件(on 型名)
フラグメントは「どの型のフィールドか」を必ず指定する。interface / union では型ごとに分岐できる。
```graphql
query Search($q: String!) {
  search(q: $q) {            # SearchResult = union User | Post
    __typename
    ... on User { name }     # インラインフラグメント(名前なし)
    ... on Post { title }
  }
}
```
- Apollo Client で union/interface のフラグメントを使う時は、キャッシュに `possibleTypes` を教える必要がある(自動生成可能)

## フラグメントの2つの使い方
| 使い方 | 目的 | 評価 |
| --- | --- | --- |
| **再利用目的**(共通の項目セットを DRY に) | 「User の基本情報」を色々なクエリで使い回す | △ どの画面が何を使っているか分かりにくくなりがち |
| **コンポーネント単位**(Colocation) | 「この部品が表示するのに必要な項目」を宣言 | ◎ 公式(Apollo・Relay)が推奨する使い方 |
→ 次のノート [[GraphQL_03_Fragment Colocation(設計パターン)]] が本題。

## 関連
- 前: [[GraphQL_01_入門(RESTとの違い・スキーマ・クエリ)]]
- 公式: https://graphql.org/learn/queries/#fragments , https://www.apollographql.com/docs/react/data/fragments

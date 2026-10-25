---
title: "GraphQL 03 Fragment Colocation(設計パターン)"
modified: 2026-09-29
---

## 解決したい問題
よくある最初の設計: `src/graphql/queries.ts` にクエリを集め、ページで大きなクエリを実行し、子へ props でバケツリレーする。
```
PostListPage ─ 大きなクエリ(title, excerpt, author.name, author.avatarUrl, likeCount ...)
   └ PostCard(title, excerpt を使う)
        ├ AuthorBadge(author.name, avatarUrl を使う)
        └ LikeButton(likeCount を使う)
```
問題:
- 子(`LikeButton`)に項目を足したい → **遠く離れたページのクエリも修正**が必要
- 子で使わなくなった項目がクエリに**残り続ける**(取りすぎ)。消していいか分からない
- どの部品がどのデータに依存しているか**見えない**
- 同じ部品を別ページで使うと、そのページのクエリにも同じ項目を書く必要がある

マネーフォワードの事例でも「コンポーネントが必要とするデータと Query/Mutation の対応が見づらい」が導入の動機だった。

## 解決: データ要件を部品と同じ場所に
```tsx
// AuthorBadge.tsx
export const AuthorBadge_user = graphql(`
  fragment AuthorBadge_user on User {
    name
    avatarUrl
  }
`)
```
```tsx
// PostCard.tsx
export const PostCard_post = graphql(`
  fragment PostCard_post on Post {
    title
    excerpt
    author { ...AuthorBadge_user }    # 子のフラグメントを展開するだけ
    ...LikeButton_post
  }
`)
```
```tsx
// PostListPage.tsx(クエリを実行する部品)
const PostListQuery = graphql(`
  query PostList {
    posts(first: 20) {
      id
      ...PostCard_post
    }
  }
`)
```
→ ツール(Relay コンパイラ、Codegen、Apollo)が**1つのクエリに合成**し、サーバーへのリクエストは1回。

## 原則
1. **フラグメントは、それを使う部品のファイルに書く**
2. **親は「直接描画する子」のフラグメントだけ展開する**(孫のことは知らない)→ 深い部品との結合を避ける(Apollo 公式)
3. **クエリは「データ取得の起点」になる部品(ページ・ルート)にだけ書く**
4. **Mutation も使う部品の近くに**
5. 部品が表示に使う項目だけを書く(「ついでに」足さない)

## 命名規則
| 流儀 | 例 | 出典 |
| --- | --- | --- |
| `<部品名>_<props名>` | `PostCard_post`、`AuthorBadge_user` | Relay の規約(マネーフォワード事例もこれ) |
| `<部品名>Fragment` | `VoteButtonsFragment`、`CommentFragment` | Apollo の例 |
→ どちらでもよいが、**部品名を含める**(どの部品のものか分かる、一意になる)ことが大事。チームで統一。

## 導入後に得られること(公式・事例より)
- 部品を見れば**そのデータ要件が全部わかる**
- 項目の追加・削除が**そのファイル内で完結**(Query を直接触らない)
- 取りすぎ・取り忘れが減る
- フラグメントから**部品の props の型を自動生成**できる
- 部品の再利用が楽(別のページでも `...PostCard_post` を足すだけ)
- AI に「この部品を直して」と頼む時、**必要な情報が1ファイルにまとまっている**ので正確

## よくある誤解・注意
- 「フラグメント = 共通化のための仕組み」ではない。**部品ごとに作る**(似ていても共有しない方が独立性が保たれる)
- 親が子のフラグメントの中身を勝手に使うと、子の変更で親が壊れる → **Fragment Masking** で防ぐ([[GraphQL_04_Fragment Masking(データマスキング)]])
- フラグメントを増やしても**リクエスト数は増えない**(合成されるため)

## ディレクトリ構成例
```text
src/
├── app/posts/page.tsx          # query PostList { posts { ...PostCard_post } }
├── components/
│   ├── PostCard.tsx            # fragment PostCard_post
│   ├── AuthorBadge.tsx         # fragment AuthorBadge_user
│   └── LikeButton.tsx          # fragment LikeButton_post + mutation LikePost
└── gql/                        # Codegen の自動生成物(編集しない)
```

## 関連
- 前: [[GraphQL_02_Fragmentの基礎]] / 次: [[GraphQL_04_Fragment Masking(データマスキング)]]
- [[デザインの4原則]](「近接」のコード版)
- 参考: https://zenn.dev/moneyforward/articles/20221211-fragment-colocation

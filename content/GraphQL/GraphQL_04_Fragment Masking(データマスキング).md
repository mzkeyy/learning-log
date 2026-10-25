---
title: "GraphQL 04 Fragment Masking(データマスキング)"
modified: 2026-09-29
---

## 何を防ぐのか
Colocation しても、親が「子のフラグメントに入っている項目」を勝手に読むことはできてしまう。
```tsx
// PostCard のフラグメントに title があるので、親でも post.title が読めてしまう
function PostListPage() {
  const { data } = useQuery(PostListQuery)
  return data.posts.map((post) => <h2>{post.title}</h2>)   // ← 暗黙の依存
}
```
→ PostCard から `title` を消した瞬間に、関係ないはずの親が壊れる(**暗黙的な依存関係**)。

**Fragment Masking(Relay では Data Masking)**: 「**その部品が自分で宣言した項目しか見えない**」ようにする仕組み。親には子の項目が隠され、子は受け取った参照を「開封」して初めて中身を読める。

## 仕組み(共通の考え方)
1. 親はクエリを実行し、子に**不透明な参照**(フラグメントキー)を渡す
2. 子は `useFragment` / `readFragment` などで参照を開封して、自分の項目だけを型付きで読む
3. 親の型には子の項目が含まれない → 誤って使うと**型エラー**

## ツール別の書き方
### Relay(元祖)
```tsx
function Story({ story }: { story: StoryFragment$key }) {   // 型は自動生成(fragment key)
  const data = useFragment(StoryFragment, story)
  return <h2>{data.title}</h2>
}
```
- 親でフラグメントを展開した場所(`...StoryFragment`)が「キー」になる
- マスキングは常に有効

### Apollo Client
```ts
const client = new ApolloClient({ dataMasking: true, /* ... */ })   // 有効化
```
```tsx
function PostDetails({ post }: { post: FragmentType<PostDetailsFragment> }) {
  const { data, complete } = useFragment({ fragment: POST_DETAILS_FRAGMENT, from: post })
  if (!complete) return null
  return <h1>{data.title}</h1>
}
```
- 有効にすると、親のクエリ結果には明示的に要求した項目(と `__typename` `id` など)しか入らない
- `useFragment` は**キャッシュへのライブな接続**: 他の場所でデータが更新されると自動で最新に
- **既存アプリへの段階的導入**(公式手順):
  1. 全てのフラグメント展開に `@unmask` を付ける(codemod あり)
  2. `dataMasking: true` を有効化
  3. TypeScript なら Codegen の設定を更新
  4. `@unmask(mode: "migrate")` の開発時警告を見ながら `useFragment` に書き換え
  5. `@unmask` を順に外す
- 新規アプリは**最初から有効化**が推奨

### GraphQL Code Generator(client preset)
```tsx
import { graphql, useFragment, type FragmentType } from '@/gql'
export const FilmFragment = graphql(`
  fragment FilmItem on Film { id title releaseDate }
`)
function Film(props: { film: FragmentType<typeof FilmFragment> }) {
  const film = useFragment(FilmFragment, props.film)   // フックではない(名前だけ)
  return <div>{film.title}</div>
}
```
- どの GraphQL クライアントとも組み合わせ可(Apollo、urql、graphql-request、TanStack Query など)

### gql.tada(ビルド不要で型推論)
```ts
import { graphql, readFragment, type FragmentOf } from 'gql.tada'
export const PokemonTypes = graphql(`fragment PokemonTypes on Pokemon { types }`)
export const Pokemon = graphql(`
  fragment Pokemon on Pokemon { id name ...PokemonTypes }
`, [PokemonTypes])                                   // ★ 子フラグメントを第2引数の配列で渡す

function Types({ data }: { data: FragmentOf<typeof PokemonTypes> }) {
  const pokemon = readFragment(PokemonTypes, data)
  return <p>{pokemon.types.join(', ')}</p>
}
```
- マスキングは既定で有効。外すなら `@_unmask`
- 推奨: `shouldCheckForColocatedFragments` を有効にして未使用フラグメントを検出

## いつマスキングを外す?
- 親もその項目を本当に使う時 → **親のクエリ/フラグメントにも明示的に書く**のが正しい(重複して見えても OK)
- 移行途中の一時的措置としてだけ `@unmask` / `@_unmask`

## 関連
- 前: [[GraphQL_03_Fragment Colocation(設計パターン)]] / 次: [[GraphQL_05_実装ガイド(Codegen・Apollo・Relay・gql.tada)]]
- 公式: https://relay.dev/docs/tutorial/fragments-1/ , https://www.apollographql.com/docs/react/data/fragments , https://the-guild.dev/graphql/codegen/docs/guides/react-vue , https://gql-tada.0no.co/guides/fragment-colocation

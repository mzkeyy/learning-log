---
title: "GraphQL 06 実務の注意とサーバー側(N+1・キャッシュ)"
modified: 2026-09-29
---

## クライアント側の注意
### キャッシュ
- Apollo / Relay は**正規化キャッシュ**(`__typename` + `id` でオブジェクトを1か所に保存)
  - → 一覧で取った Post と詳細で取った Post が同じものとして更新される
  - → **`id` を必ず取る**(取り忘れると更新が反映されない)
- Mutation の後は、返り値に更新後の項目を含める(キャッシュが自動更新)か、関連クエリを再取得

### パフォーマンス
- フラグメントを細かく分けても**リクエスト数は増えない**(合成される)
- ただしクエリ全体が巨大になりすぎないよう、ページ単位で分割・遅延読み込み(`@defer` 対応サーバーなら段階的に受け取れる)
- ページネーションは Connection 形式(`edges` / `pageInfo`)が定番

### よくある失敗
| 失敗 | 対策 |
| --- | --- |
| 共通化したくて巨大な「UserFields」フラグメントを全画面で使う | 部品ごとにフラグメントを作る(Colocation の原則) |
| 親が子のフラグメントの項目を直接使う | Fragment Masking を有効化 |
| フラグメント名の重複 | `<部品名>_<props名>` で一意に |
| 生成された型ファイルを手で編集 | 生成物はコミットしても編集しない。codegen を再実行 |
| スキーマ変更でクライアントが壊れる | CI でスキーマの破壊的変更をチェック |

## サーバー側の注意
### N+1 問題(→ [[N+1]])
```graphql
query { posts(first: 20) { title author { name } } }
```
素朴なリゾルバだと「posts を1回 + author を20回」DB に問い合わせる。
**対策: DataLoader**(同じリクエスト内の個別取得をまとめて1回の `WHERE id IN (...)` にする)
```ts
const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await db.users.findMany({ where: { id: { in: [...ids] } } })
  return ids.map((id) => users.find((u) => u.id === id))
})
// リゾルバ
Post: { author: (post) => userLoader.load(post.authorId) }
```
- DataLoader は**リクエストごとに作る**(他ユーザーのデータが混ざらないように)

### セキュリティ
- **クエリの深さ・複雑さの制限**(悪意ある深いネストで負荷をかけられる)
- 本番では**イントロスペクション(スキーマ公開)を無効化**する選択肢
- 永続化クエリ(Persisted Queries / 許可リスト): 事前登録したクエリだけ受け付ける
- 認可は**フィールド/リゾルバ単位**で(画面で隠しても API からは取れる)
- レート制限

## GraphQL を採用するか?(判断)
| GraphQL が向く | REST(や tRPC・Server Functions)で十分 |
| --- | --- |
| 画面ごとに必要データが大きく違う、関係が深いデータ | 単純な CRUD |
| 複数クライアント(Web・iOS・Android)が同じ API を使う | 自分の Web アプリだけ |
| 複数のバックエンドを1つの API にまとめたい | フロントとバックが同じリポジトリ・同じ言語 |
> 小規模な個人開発で Next.js / TanStack Start を使うなら、まず Server Actions / Server Functions で十分なことが多い。GraphQL を使う場合、または既存の GraphQL API に繋ぐ場合は **Fragment Colocation + Masking を最初から**採用する。

## 生成 AI と開発する時
- AGENTS.md / CLAUDE.md に書く例:
  ```markdown
  ## GraphQL
  - フラグメントは使う部品のファイルに書く(Fragment Colocation)。名前は <部品名>_<props名>
  - 親は直接描画する子のフラグメントだけを展開する
  - 部品では useFragment でフラグメントを開封して読む(親から子の項目を読まない)
  - src/gql/ は自動生成物。編集せず `npm run codegen` を実行
  ```
- 部品単位でデータ要件が完結しているので、「この部品に◯◯を表示して」と頼むと**フラグメントと表示を同じファイルで直してくれる**(Colocation の大きな利点)

## 関連
- 前: [[GraphQL_05_実装ガイド(Codegen・Apollo・Relay・gql.tada)]] / 目次: [[GraphQL]]
- [[N+1]] / [[APIキー・シークレット管理]]

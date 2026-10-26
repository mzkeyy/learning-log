---
title: "PostgreSQLとDrizzle 04 実務(トランザクション・インデックス・接続・性能)"
modified: 2026-10-26
---

## トランザクション
「全部成功するか、全部なかったことにするか」をまとめる。
```ts
await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values({ userId, total }).returning()
  await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: order.id })))
  await tx.update(stocks)
    .set({ quantity: sql`${stocks.quantity} - 1` })
    .where(eq(stocks.productId, productId))
  // 途中で throw すると全部ロールバック
})
```
- 中では必ず `tx` を使う(`db` を使うとトランザクションの外になる)
- **トランザクションの中で外部 API を呼ばない**(遅い・失敗しても DB は戻せても API は戻せない)。外部への処理は確定後に、またはキュー経由で
- 在庫の減算のような「読んで計算して書く」処理は、**SQL の中で計算**(`quantity - 1`)するか、`SELECT ... FOR UPDATE` で行をロックする。アプリ側で読んで引いて書くと、同時アクセスで数がずれる
- 一意制約違反(同時登録)などは**エラーを捕まえて**「すでに登録されています」に変える

## インデックス
```ts
(t) => [
  index('posts_author_id_idx').on(t.authorId),
  index('posts_published_created_idx').on(t.published, t.createdAt),   // 複合インデックス
  uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`),     // 式インデックス
]
```
| どこに付けるか | 理由 |
| --- | --- |
| WHERE でよく絞る列 | 全件を読まずに済む |
| **外部キーの列** | JOIN と親の削除が速くなる(PostgreSQL は自動で付けない) |
| ORDER BY + LIMIT でよく使う列 | 並べ替えを省ける |
| UNIQUE にしたい列 | 制約と兼ねる |
- 付けすぎると**書き込みが遅くなり、容量も増える**。遅いクエリを見つけてから付ける
- 複合インデックスは**列の順番**が大事(よく `=` で絞る列を先に)
- 基本は SQL のノート → [[SQL_06_実務の注意(インデックス・トランザクション・SQLi・AI開発)]]

### 遅いクエリを調べる
```sql
EXPLAIN ANALYZE SELECT * FROM posts WHERE author_id = 1 ORDER BY created_at DESC LIMIT 20;
```
- `Seq Scan`(全件読み)が大きなテーブルに出ていたら、インデックスを検討
- 本番では **`pg_stat_statements`** 拡張で「合計時間が長いクエリ」を見つける。マネージド DB の性能分析機能(RDS Performance Insights など)も使える → [[オブザーバビリティ]]

## N+1 を避ける
```ts
// ❌ 投稿20件 → 著者を20回取得(1 + 20 回のクエリ)
const list = await db.select().from(posts).limit(20)
for (const p of list) {
  p.author = await db.query.users.findFirst({ where: eq(users.id, p.authorId) })
}

// ✅ JOIN か リレーショナルクエリで1回に
const list = await db.query.posts.findMany({ limit: 20, with: { author: true } })
```
→ [[N+1]]

## ページング
| 方式 | 書き方 | 向き不向き |
| --- | --- | --- |
| OFFSET | `.limit(20).offset(page * 20)` | 簡単。ページ番号が要る画面。後ろのページほど遅い |
| **カーソル**(キーセット) | `.where(lt(posts.id, lastId)).orderBy(desc(posts.id)).limit(20)` | 無限スクロール・API。件数が多くても速い |

## 接続とプール
- DB への接続は**作るのが重い**ので、**コネクションプール**で使い回す(`pg` の `Pool`)
- PostgreSQL は同時接続数に上限がある(小さいプランだと数十〜百程度)
| 環境 | 注意 | 対策 |
| --- | --- | --- |
| 常駐サーバー(Node.js) | プールのサイズ × サーバー台数 が上限を超えない | プールのサイズを調整 |
| **サーバーレス**(Lambda・Vercel) | 実行環境ごとに接続ができて、すぐ上限に | **接続プーラー**(RDS Proxy、Supabase / Neon のプーラー、PgBouncer) |
| エッジ(Cloudflare Workers) | TCP 接続の確立が遠くて遅い | **Hyperdrive**(接続プール + キャッシュ)、Neon の HTTP ドライバー |
- 接続文字列にプーラーの URL を使うか、直接接続の URL を使うかを確認する(マイグレーションは直接接続が必要なことがある)

## リポジトリ層を作るか
```ts
// src/repositories/posts.ts
export const postRepository = {
  findPublished: (limit: number) =>
    db.query.posts.findMany({ where: eq(posts.published, true), limit, with: { author: true } }),
  create: (input: NewPost) => db.insert(posts).values(input).returning(),
}
```
- 小さなアプリなら、ハンドラから Drizzle を直接呼んでもよい
- 業務ルールが増えたら、DB アクセスを関数にまとめると**テストと差し替えがしやすい** → [[DDD_04_戦術的設計②(集約・リポジトリ・ドメインイベント)]] / [[テスト_03_APIとDBのテスト(Hono・MSW・Workers)]]

## 運用
| 項目 | やること |
| --- | --- |
| バックアップ | 自動バックアップ + **復元の練習**(戻せないバックアップは意味がない) |
| 権限 | アプリ用ユーザーは必要な権限だけ。本番 DB に手で入る人を絞る |
| 秘密情報 | 接続文字列は環境変数・シークレット管理 → [[APIキー・シークレット管理]] |
| 個人情報 | 必要な列だけ持つ、ログに出さない、削除の手順 |
| 監視 | 接続数・CPU・遅いクエリ・容量・レプリケーションの遅れ |
| バージョン | メジャーバージョンのサポート期限を確認して計画的に上げる |

## ベクトル検索(pgvector)
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
- PostgreSQL に埋め込みベクトルの列と近いもの検索を足せる。Drizzle も `vector` 型と `cosineDistance` などに対応
- 普段の DB にそのまま RAG の検索を足せる → [[AIアプリ開発_04_RAG(埋め込み・ベクトル検索・引用)]]

## AI に DB まわりを書かせるとき
- スキーマのファイルを読ませ、「マイグレーションは generate で作り、SQL を見せて」と頼む
- **`push` や本番 DB への直接の操作をさせない**。接続情報を渡さない
- 生成された SQL のロック・データ消失(列の削除・名前変更)を人が確認する
- 権限チェック(他人のデータを取れないか)を WHERE に入れているか確認する

## 関連
- 前: [[PostgreSQLとDrizzle_03_マイグレーション(drizzle-kit・安全な変更)]] / 目次: [[PostgreSQLとDrizzle]]
- [[SQL]] / [[N+1]] / [[オブザーバビリティ]] / [[Cloudflare]]
- 公式: https://orm.drizzle.team/docs/transactions , https://orm.drizzle.team/docs/indexes-constraints , https://www.postgresql.org/docs/current/using-explain.html , https://developers.cloudflare.com/hyperdrive/

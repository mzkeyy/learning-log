---
title: "PostgreSQLとDrizzle 02 Drizzle の基本(スキーマ・クエリ・リレーション)"
modified: 2026-10-26
---

## 導入
```bash
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
```
| ドライバー | import | 向く場面 |
| --- | --- | --- |
| `pg`(node-postgres) | `drizzle-orm/node-postgres` | Node.js の定番 |
| `postgres`(postgres.js) | `drizzle-orm/postgres-js` | 軽量・速い |
| `@neondatabase/serverless` | `drizzle-orm/neon-http` など | Neon・サーバーレス・エッジ |
| D1 | `drizzle-orm/d1` | Cloudflare Workers(SQLite) |

## スキーマを書く
```ts
// src/db/schema.ts
import { pgTable, integer, text, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text().notNull().unique(),
  name: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const posts = pgTable('posts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  published: boolean().notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('posts_author_id_idx').on(t.authorId),   // 外部キーの列にはインデックス
])

// 型を取り出す
export type User = typeof users.$inferSelect      // SELECT の結果の型
export type NewUser = typeof users.$inferInsert   // INSERT に渡す型(id などは省略可)
```
- 列名は第1引数で DB 上の名前を指定できる(`created_at`)。`drizzle({ casing: 'snake_case' })` にすると TS の camelCase を自動で snake_case に変換してくれる
- **スキーマが型の正本**になる。API の入力チェックには `drizzle-zod` でスキーマから Zod の型を作ることもできる

## 接続
```ts
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

## クエリ
### SELECT
```ts
import { eq, and, desc, like, inArray, count } from 'drizzle-orm'

// 1件
const [user] = await db.select().from(users).where(eq(users.id, 1))

// 条件・並び順・件数
const recent = await db
  .select({ id: posts.id, title: posts.title })   // 必要な列だけ
  .from(posts)
  .where(and(eq(posts.published, true), like(posts.title, '%Hono%')))
  .orderBy(desc(posts.createdAt))
  .limit(20)
  .offset(0)

// 集計
const [{ total }] = await db.select({ total: count() }).from(posts).where(eq(posts.authorId, 1))
```
| 演算子 | SQL |
| --- | --- |
| `eq` / `ne` | `=` / `<>` |
| `gt` / `gte` / `lt` / `lte` | `>` / `>=` / `<` / `<=` |
| `and` / `or` / `not` | |
| `like` / `ilike` | 部分一致(`ilike` は大文字小文字を区別しない) |
| `inArray` / `isNull` / `between` | `IN` / `IS NULL` / `BETWEEN` |

### INSERT / UPDATE / DELETE
```ts
const [created] = await db.insert(users).values({ email: 'taro@example.com', name: 'Taro' }).returning()

await db.update(posts).set({ published: true }).where(eq(posts.id, 10))

await db.delete(posts).where(eq(posts.id, 10))

// あれば更新、なければ作成(UPSERT)
await db.insert(users)
  .values({ email: 'taro@example.com', name: 'Taro' })
  .onConflictDoUpdate({ target: users.email, set: { name: 'Taro' } })
```
- **`where` を付け忘れた UPDATE / DELETE は全件が対象**。レビューで必ず見る
- `returning()` で作った・変えた行を受け取れる(PostgreSQL の機能)

### JOIN
```ts
const rows = await db
  .select({ postId: posts.id, title: posts.title, author: users.name })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.published, true))
```
- 結果の型は選んだ列から自動で決まる
- `leftJoin` の相手側の列は `null` になりうる型になる

### リレーショナルクエリ(入れ子で取る)
```ts
// schema.ts にリレーションを定義(0.45 の書き方)
import { relations } from 'drizzle-orm'

export const usersRelations = relations(users, ({ many }) => ({ posts: many(posts) }))
export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}))
```
```ts
const result = await db.query.users.findMany({
  columns: { id: true, name: true },
  with: { posts: { where: (p, { eq }) => eq(p.published, true), limit: 5 } },
})
// [{ id: 1, name: 'Taro', posts: [{ ... }, ...] }, ...]
```
- 「ユーザーとその投稿」を**1回のクエリで**入れ子の形で取れる(N+1 にならない)
- **v1 ではリレーションの定義が `defineRelations` に変わる**(リレーショナルクエリ v2)。新しく始めるなら公式の最新の書き方を確認する

### 生の SQL
```ts
import { sql } from 'drizzle-orm'

const rows = await db.execute(sql`SELECT * FROM users WHERE email = ${email}`)   // ${} はプレースホルダになる
```
- 複雑な集計・PostgreSQL 固有の機能は `sql` タグで書ける。`${}` で埋め込んだ値は**安全にエスケープされる**
- `sql.raw()` はエスケープされないので、ユーザー入力を入れない

## Drizzle Studio
```bash
npx drizzle-kit studio   # ブラウザで DB の中身を見る・編集する
```

## 関連
- 前: [[PostgreSQLとDrizzle_01_PostgreSQLの基本(型・制約・どこで動かすか)]] / 次: [[PostgreSQLとDrizzle_03_マイグレーション(drizzle-kit・安全な変更)]]
- [[SQL_04_結合とサブクエリ(JOIN・サブクエリ・WITH)]] / [[TypeScript]] / [[N+1]]
- 公式: https://orm.drizzle.team/docs/get-started/postgresql-new , https://orm.drizzle.team/docs/sql-schema-declaration , https://orm.drizzle.team/docs/select , https://orm.drizzle.team/docs/rqb

---
title: "PostgreSQLとDrizzle"
modified: 2026-10-26
---

**PostgreSQL(定番のリレーショナル DB)を、TypeScript から型安全に扱う**ためのノート群。ORM には Drizzle ORM を使う。SQL の文法そのものは [[SQL]] で学んだ前提で、「アプリから DB を使うときの実務」をまとめる。

PostgreSQL・Drizzle ORM の公式ドキュメント(**2026年10月時点。Drizzle は安定版 0.45、v1 は RC**)を読んで整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[PostgreSQLとDrizzle_01_PostgreSQLの基本(型・制約・どこで動かすか)]] | なぜ PostgreSQL か、型と制約、ローカルとクラウド |
| 02 | [[PostgreSQLとDrizzle_02_Drizzleの基本(スキーマ・クエリ・リレーション)]] | テーブル定義、SELECT / INSERT、JOIN、型推論 |
| 03 | [[PostgreSQLとDrizzle_03_マイグレーション(drizzle-kit・安全な変更)]] | generate / migrate / push、本番で壊さない変更の手順 |
| 04 | [[PostgreSQLとDrizzle_04_実務(トランザクション・インデックス・接続・性能)]] | トランザクション、インデックス、接続プール、N+1、サーバーレス |

## ORM とは
```
TypeScript のコード ──(ORM)──▶ SQL ──▶ DB
db.select().from(users).where(eq(users.id, 1))
          ↓
SELECT * FROM users WHERE id = 1
```
- テーブルを TypeScript で定義すると、**クエリの結果に型が付く**(列名の打ち間違いがコンパイル時にわかる)
- SQL インジェクションを防ぐプレースホルダが自動で使われる → [[Webセキュリティ対策]]
- テーブル定義の変更から**マイグレーション(DB の変更手順)を自動で作れる**

## Drizzle と他の選択肢
| | **Drizzle ORM** | Prisma | Kysely | 生 SQL(postgres.js など) |
| --- | --- | --- | --- | --- |
| 書き方 | **SQL に近い** TypeScript | 独自のスキーマ言語 + 独自 API | SQL に近いクエリビルダー | SQL そのもの |
| スキーマ | TypeScript | `schema.prisma` | 型を自分で書く / 生成 | なし |
| マイグレーション | drizzle-kit | Prisma Migrate | 別途 | 別途 |
| 軽さ・エッジ対応 | 軽い。Workers・サーバーレスで使いやすい | v7 から軽くなった | 軽い | 軽い |
| 向く人 | SQL も理解したい、型も欲しい | SQL をあまり書きたくない | ORM は要らない | 細かく制御したい |
- このノート群は Drizzle で書く。SQL の知識がそのまま活きる

## 押さえどころ(2026年10月時点)
- 新規なら **PostgreSQL**(機能が多く、クラウドの選択肢も多い)。Cloudflare なら D1(SQLite)も候補 → [[Cloudflare_03_バインディングとデータ保存(D1・R2・KV・DO・Queues)]]
- 制約(NOT NULL・UNIQUE・外部キー・CHECK)で**DB にもルールを持たせる**。アプリのバグからデータを守る
- スキーマの変更は**マイグレーションファイル**で管理し、git に入れる
- 本番での列の削除・名前変更は**段階を踏む**(いきなり消さない)
- 一覧画面でループの中からクエリを出さない(N+1 → [[N+1]])
- サーバーレスでは**接続数**に注意(プーラーを使う)
- Drizzle は v1 に向けて大きな変更(リレーションの定義方法など)が進行中。古い記事・新しい記事で書き方が違うことがある

## 関連
- [[SQL]] / [[中間テーブル]] / [[N+1]] / [[DDD_04_戦術的設計②(集約・リポジトリ・ドメインイベント)]]
- [[Hono]] / [[Next.js]] / [[Cloudflare]] / [[AIアプリ開発_04_RAG(埋め込み・ベクトル検索・引用)]]
- 公式: https://www.postgresql.org/docs/current/ , https://orm.drizzle.team/docs/overview

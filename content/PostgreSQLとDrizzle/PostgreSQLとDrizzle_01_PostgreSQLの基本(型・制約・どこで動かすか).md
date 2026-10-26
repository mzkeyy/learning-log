---
title: "PostgreSQLとDrizzle 01 PostgreSQL の基本(型・制約・どこで動かすか)"
modified: 2026-10-26
---

## なぜ PostgreSQL か
- オープンソースで歴史が長く、**標準 SQL への準拠度が高い**
- JSON(`jsonb`)、配列、全文検索、地理情報(PostGIS)、ベクトル検索(pgvector)など**拡張機能が豊富**
- AWS(RDS・Aurora)、Google Cloud、Supabase、Neon など**どこでも使える**
- MySQL も定番だが、新規の TypeScript のプロジェクトでは PostgreSQL が選ばれることが多い

## よく使う型
| 用途 | 型 | メモ |
| --- | --- | --- |
| ID(連番) | `integer` / `bigint` + **identity** | `serial` は古い書き方。`GENERATED ALWAYS AS IDENTITY` が推奨 |
| ID(推測されにくい) | `uuid` | `gen_random_uuid()`。URL に出す ID 向け。UUID v7 は時系列順に並ぶ |
| 文字列 | `text` | 長さ制限は CHECK か アプリ側で。`varchar(n)` と性能差はない |
| 整数 / 小数 | `integer` / `bigint` / `numeric(p, s)` | **お金は `numeric` か 整数(円・セント単位)**。`real` / `double` は誤差が出る |
| 真偽値 | `boolean` | |
| 日時 | **`timestamptz`** | タイムゾーン付き。`timestamp`(タイムゾーンなし)は事故のもと |
| 日付だけ | `date` | 誕生日など |
| JSON | **`jsonb`** | 検索・インデックスできる。`json` より `jsonb` |
| 列挙 | `text` + CHECK、または `enum` 型 | enum は値の追加はできるが削除が面倒 |
| 配列 | `text[]` など | タグ程度なら便利。検索が多いなら別テーブル |
- 日時は **DB には UTC(timestamptz)で保存して、表示のときに日本時間に**変換する

## 制約: DB でデータを守る
```sql
CREATE TABLE users (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id  bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  status     text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```
| 制約 | 守ること |
| --- | --- |
| `NOT NULL` | 必ず値がある |
| `UNIQUE` | 重複しない(同じメールで2回登録できない) |
| `PRIMARY KEY` | 行を一意に特定 |
| `REFERENCES`(外部キー) | 存在しない相手を参照しない。削除時の動き(`CASCADE` / `RESTRICT` / `SET NULL`)も決める |
| `CHECK` | 値の範囲・形 |
- アプリの入力チェックだけに頼ると、**別の経路(バッチ・手作業・バグ)**から壊れたデータが入る。DB の制約は最後の砦
- 多対多は中間テーブル → [[中間テーブル]]

## スキーマ(名前空間)と権限
- PostgreSQL は DB の中に**スキーマ**(`public` など)があり、その中にテーブルがある
- アプリ用のユーザーには**必要な権限だけ**渡す(マイグレーション用とアプリ実行用を分けるとより安全)
- Supabase などでは **RLS(行レベルセキュリティ)**で「自分の行だけ見られる」を DB 側で強制できる → [[認証]]

## どこで動かすか
| 場所 | 方法 | メモ |
| --- | --- | --- |
| 手元 | **Docker** で `postgres` イメージを起動(→ [[Docker_03_Docker Compose(開発環境・DB・watch)]]) | バージョンを本番と揃えられる。テストにも使える |
| マネージド(AWS) | RDS for PostgreSQL / Aurora PostgreSQL | バックアップ・冗長化・パッチを任せられる → [[SAA_06_データベース(RDS・Aurora・DynamoDB・ElastiCache)]] |
| サーバーレス Postgres | **Neon**、Aurora Serverless | 使っていないときは止まる・ブランチ機能(DB のコピーをすぐ作れる) |
| BaaS | **Supabase** | Postgres + 認証 + ストレージ + 自動の API |
| Cloudflare から | Hyperdrive 経由で外部の Postgres へ / D1(SQLite) | Workers から速くつなぐ |

### 手元で起動する
```bash
docker run --name pg -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=app -p 5432:5432 -d postgres:18
# 接続文字列
# postgres://postgres:pass@localhost:5432/app
```
- 接続文字列は環境変数 `DATABASE_URL` に。**本番の接続文字列をコードや git に入れない** → [[APIキー・シークレット管理]]
- GUI で中を見るなら Drizzle Studio、TablePlus、DBeaver など

## psql の基本
| コマンド | 意味 |
| --- | --- |
| `psql $DATABASE_URL` | 接続 |
| `\dt` | テーブル一覧 |
| `\d users` | テーブルの定義 |
| `\x` | 縦に見やすく表示 |
| `EXPLAIN ANALYZE SELECT ...` | クエリの実行計画(遅い原因の調査)→ 04 |

## 関連
- 次: [[PostgreSQLとDrizzle_02_Drizzleの基本(スキーマ・クエリ・リレーション)]]
- [[SQL]] / [[中間テーブル]] / [[AWS SAA]]
- 公式: https://www.postgresql.org/docs/current/datatype.html , https://www.postgresql.org/docs/current/ddl-constraints.html , https://wiki.postgresql.org/wiki/Don't_Do_This

---
title: "PostgreSQLとDrizzle 03 マイグレーション(drizzle-kit・安全な変更)"
modified: 2026-10-26
---

## マイグレーションとは
**DB のテーブル構造の変更を、順番付きの SQL ファイルとして記録して適用する仕組み**。
- 「誰の DB がどこまで変更済みか」を DB 自身が覚えている(履歴テーブル)
- 開発・ステージング・本番に**同じ手順で同じ変更**を当てられる
- ファイルを git に入れるので、変更のレビューができる

## drizzle-kit の設定
```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',                       // マイグレーションファイルの置き場
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

## コマンド
| コマンド | 何をする | 使う場面 |
| --- | --- | --- |
| `drizzle-kit generate` | スキーマの変更から **SQL ファイルを作る** | スキーマを変えたら毎回 |
| `drizzle-kit migrate` | まだ当てていない SQL を DB に**適用** | 開発・CI・本番のデプロイ |
| `drizzle-kit push` | スキーマを DB に**直接反映**(ファイルを作らない) | 手元の試作だけ |
| `drizzle-kit pull` | 既存の DB からスキーマのコードを作る | 既存 DB を取り込むとき |
| `drizzle-kit check` | マイグレーションファイルの矛盾を確認 | CI |
| `drizzle-kit studio` | DB を見る GUI | いつでも |

### 普段の流れ
```
1. schema.ts を変更
2. npx drizzle-kit generate   → drizzle/0003_xxx.sql ができる
3. SQL ファイルの中身を読んで確認(★ 自動生成を信じきらない)
4. npx drizzle-kit migrate    → 手元の DB に適用、動作確認
5. schema.ts と SQL ファイルを一緒にコミット → PR
6. デプロイ時に本番へ migrate
```
- `push` は手軽だが履歴が残らず、**本番では使わない**
- 列の**名前変更**は「削除 + 追加」と区別がつかないので、generate のときに聞かれる。間違えるとデータが消える

## 本番で壊さないスキーマ変更
アプリの新旧のバージョンが**同時に動く時間**(デプロイ中)があるので、変更は「古いコードでも新しいコードでも動く」段階を踏む(expand → contract)。

### 列の名前を変える(例: `name` → `display_name`)
```
1. 追加:   display_name 列を NULL 可で追加                       ← マイグレーション
2. 両方に書く: アプリが name と display_name の両方に書き込む       ← デプロイ
3. 移す:   既存の行の name を display_name にコピー(少しずつ)
4. 読み替え: アプリが display_name を読むように                     ← デプロイ
5. 制約:   display_name を NOT NULL に
6. 削除:   name を書かなくなったのを確認してから name 列を削除       ← マイグレーション
```
| 変更 | 危険なやり方 | 安全なやり方 |
| --- | --- | --- |
| 列の追加 | NOT NULL・デフォルトなしで追加 | NULL 可で追加 → 値を埋める → NOT NULL に |
| 列の削除 | コードより先に削除 | コードから使わなくなってから削除 |
| 名前変更 | いきなり RENAME | 上の手順(新しい列を作って移す) |
| 型の変更 | 大きなテーブルで ALTER TYPE(長時間ロック) | 新しい列を作って移す |
| インデックス追加 | 普通の `CREATE INDEX`(書き込みが止まる) | **`CREATE INDEX CONCURRENTLY`** |
| 外部キー・CHECK の追加 | そのまま追加(全行を検査してロック) | `NOT VALID` で追加 → 後で `VALIDATE` |
- 大きなテーブルを変えるときは、**ロックの時間**に注意。`lock_timeout` を設定しておくと、待ちが長いときに失敗させられる
- 自動生成された SQL で足りないときは、マイグレーションファイルを手で書き足す(`drizzle-kit generate --custom` で空のファイルを作れる)

## デプロイのどこで migrate するか
| 方法 | 内容 |
| --- | --- |
| デプロイの前の手順で実行 | CI / CD のジョブで `drizzle-kit migrate` → 成功したらアプリをデプロイ → [[Cicdパイプライン]] |
| アプリの起動時に実行 | 簡単だが、複数台が同時に起動すると競合する |
| 手作業 | 小規模なら。手順書と記録を残す |
- **マイグレーションの前にバックアップ**(マネージド DB ならスナップショット)
- ロールバック用の SQL も考えておく(drizzle-kit は自動で「戻す SQL」を作らない)

## データの初期投入(シード)
- 開発用のサンプルデータはスクリプトで入れる(`tsx scripts/seed.ts`)。`drizzle-seed` で大量のダミーデータも作れる
- マスターデータ(都道府県・カテゴリなど)はマイグレーションに含めるか、シードにするかを決めておく

## D1(Cloudflare)の場合
- `dialect: 'sqlite'`、`driver: 'd1-http'` で drizzle-kit から D1 を扱える
- 生成した SQL は `wrangler d1 migrations apply` で適用する方法もある → [[Cloudflare_03_バインディングとデータ保存(D1・R2・KV・DO・Queues)]]

## 関連
- 前: [[PostgreSQLとDrizzle_02_Drizzleの基本(スキーマ・クエリ・リレーション)]] / 次: [[PostgreSQLとDrizzle_04_実務(トランザクション・インデックス・接続・性能)]]
- [[SQL_05_データ操作と設計(INSERT・UPDATE・DELETE・CREATE)]] / [[Cicdパイプライン]]
- 公式: https://orm.drizzle.team/docs/kit-overview , https://orm.drizzle.team/docs/migrations , https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY

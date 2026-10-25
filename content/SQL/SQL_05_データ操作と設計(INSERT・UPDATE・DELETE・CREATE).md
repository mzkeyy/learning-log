---
title: "SQL 05 データ操作と設計(INSERT・UPDATE・DELETE・CREATE)"
modified: 2026-10-05
---

← [[SQL_04_結合とサブクエリ(JOIN・サブクエリ・WITH)]] / 次 → [[SQL_06_実務の注意(インデックス・トランザクション・SQLi・AI開発)]]

## 追加(INSERT)
```sql
INSERT INTO users (name, email) VALUES ('田中', 'a@example.com');

-- 複数行まとめて(1行ずつより圧倒的に速い)
INSERT INTO users (name, email) VALUES
  ('佐藤', 'b@example.com'),
  ('鈴木', 'c@example.com');

-- 追加した行を返す(PostgreSQL / SQLite 3.35+)
INSERT INTO users (name, email) VALUES ('高橋', 'd@example.com') RETURNING id;
```
### あれば更新・なければ追加(UPSERT)
```sql
-- PostgreSQL / SQLite
INSERT INTO users (email, name) VALUES ('a@example.com', '田中')
ON CONFLICT (email) DO UPDATE SET name = excluded.name;
-- MySQL は ON DUPLICATE KEY UPDATE
```

## 更新(UPDATE)
```sql
UPDATE users SET name = '佐藤', age = 30 WHERE id = 1;
UPDATE products SET stock = stock - 1 WHERE id = 5 AND stock > 0;  -- 今の値を使って更新
```

## 削除(DELETE)
```sql
DELETE FROM users WHERE id = 1;
```

### ⚠️ UPDATE / DELETE の鉄則
1. **WHERE を書いたか確認**(ないと全行が対象。`DELETE FROM users;` で全員消える)
2. **先に同じ WHERE で SELECT して件数を確認** してから実行
   ```sql
   SELECT COUNT(*) FROM users WHERE last_login < '2024-01-01';  -- まず確認
   DELETE FROM users WHERE last_login < '2024-01-01';           -- 件数が想定通りなら
   ```
3. 本番では **トランザクション** の中で実行し、結果を見てから `COMMIT`(→ 06 章)
4. 消したデータは [[Git]] では戻らない。**バックアップ**(D1 なら Time Travel)を確認しておく

### 論理削除(ソフトデリート)
本当に消さず `deleted_at` に日時を入れて「消えたこと」にする方法。
```sql
UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1;
SELECT * FROM users WHERE deleted_at IS NULL;   -- 以降の SELECT すべてに条件が必要
```
復元できる代わりに、条件の付け忘れで「消したはずのデータが見える」事故が起きやすい。

## テーブルを作る(CREATE TABLE)
```sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY,               -- 主キー(SQLite は自動採番)
  email      TEXT    NOT NULL UNIQUE,           -- 必須・重複禁止
  name       TEXT    NOT NULL,
  age        INTEGER CHECK (age >= 0),          -- 値のルール
  created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 外部キー
  amount  INTEGER NOT NULL
);
```
| 制約 | 意味 |
| --- | --- |
| `PRIMARY KEY` | 主キー(一意・NULL 不可) |
| `NOT NULL` | 空を許さない |
| `UNIQUE` | 重複を許さない |
| `DEFAULT` | 省略時の値 |
| `CHECK` | 条件を満たす値だけ許す |
| `REFERENCES`(外部キー) | 存在しない相手を指すのを防ぐ。`ON DELETE CASCADE` で親と一緒に消える |

**制約は「アプリのバグからデータを守る最後の砦」**。アプリ側でチェックしていても DB にも書く。
(SQLite は外部キーチェックが既定で無効。`PRAGMA foreign_keys = ON;` が必要。D1 は既定で有効)

### 主な型
| 用途 | PostgreSQL | MySQL | SQLite |
| --- | --- | --- | --- |
| 整数 | `INTEGER` `BIGINT` | `INT` `BIGINT` | `INTEGER` |
| 文字列 | `TEXT` `VARCHAR(n)` | `VARCHAR(n)` `TEXT` | `TEXT` |
| 小数(お金) | `NUMERIC(10,2)` | `DECIMAL(10,2)` | 整数(円・セント単位)で持つ |
| 真偽 | `BOOLEAN` | `TINYINT(1)` | `INTEGER`(0/1) |
| 日時 | `TIMESTAMPTZ` | `DATETIME` | `TEXT`(ISO 8601)か `INTEGER`(UNIX秒) |

お金を `FLOAT` / `REAL` で持たない(0.1 + 0.2 ≠ 0.3 の誤差が出る)。

## テーブルを変える・消す
```sql
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users RENAME COLUMN bio TO profile;
DROP TABLE users;              -- ⚠️ テーブルごと全データが消える
```
本番の構造変更は手で打たず **マイグレーションファイル** で管理する(Prisma / Drizzle / `wrangler d1 migrations` など)。どの環境に何が適用済みかが記録され、[[Git]] でレビューできる。

## 正規化(テーブル設計の基本)
「同じ情報を2か所に書かない」ように表を分けること。
```
✗ orders(id, user_name, user_email, amount)
   → 田中さんがメールを変えたら全注文を直す必要がある/直し漏れで矛盾する

○ users(id, name, email)  +  orders(id, user_id, amount)
```
| 段階 | ざっくり言うと |
| --- | --- |
| 第1正規形 | 1つのマスに1つの値(`tags = 'a,b,c'` のようにカンマで詰めない) |
| 第2・第3正規形 | ある列が「主キー以外の列」に依存しているなら別テーブルへ |

例外として、表示速度のためにあえて重複させる(非正規化)こともあるが、まずは正規化してから考える。

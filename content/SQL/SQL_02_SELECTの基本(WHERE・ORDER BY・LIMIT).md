---
title: "SQL 02 SELECTの基本(WHERE・ORDER BY・LIMIT)"
modified: 2026-10-05
---

← [[SQL_01_考え方(RDB・テーブル・SQLの種類)]] / 次 → [[SQL_03_集計とグループ化(COUNT・GROUP BY・HAVING)]]

例で使うテーブル:`users(id, name, email, age, created_at)`

## 列を選ぶ
```sql
SELECT * FROM users;                 -- 全列(確認用。本番コードでは列を指定する)
SELECT name, email FROM users;       -- 必要な列だけ
SELECT name AS 名前 FROM users;      -- 別名(AS)をつける
SELECT DISTINCT age FROM users;      -- 重複を除く
SELECT name, age + 1 AS 来年の年齢 FROM users;  -- 計算もできる
```
`SELECT *` を避ける理由:不要なデータまで転送して遅い/列が増えたとき壊れやすい/パスワードハッシュなど出したくない列まで出る。

## 行を絞る(WHERE)
```sql
SELECT * FROM users WHERE age >= 20;
SELECT * FROM users WHERE age >= 20 AND age < 30;
SELECT * FROM users WHERE age BETWEEN 20 AND 29;      -- 両端を含む
SELECT * FROM users WHERE name IN ('田中', '佐藤');
SELECT * FROM users WHERE email LIKE '%@gmail.com';   -- % = 0文字以上, _ = 1文字
SELECT * FROM users WHERE name <> '田中';             -- 等しくない(!= も可)
```

| 演算子 | 意味 |
| --- | --- |
| `=` `<>` `<` `>` `<=` `>=` | 比較(等しいは `==` ではなく `=`) |
| `AND` / `OR` / `NOT` | 組み合わせ。混ぜるときは `( )` で囲む |
| `IN (…)` | いずれかに一致 |
| `BETWEEN a AND b` | 範囲 |
| `LIKE` | パターン一致 |
| `IS NULL` / `IS NOT NULL` | NULL かどうか |

### NULL の落とし穴
```sql
SELECT * FROM users WHERE email = NULL;   -- ✗ 1件も返らない
SELECT * FROM users WHERE email IS NULL;  -- ○
```
NULL は「不明」なので、`NULL = NULL` も「不明」扱い → 一致しない。必ず `IS NULL`。
表示時に置き換えたいときは `COALESCE(email, '未登録')`。

## 並べる(ORDER BY)
```sql
SELECT * FROM users ORDER BY created_at DESC;          -- 新しい順(DESC=降順, ASC=昇順・省略時)
SELECT * FROM users ORDER BY age DESC, name ASC;       -- 年齢が同じなら名前順
```
**ORDER BY を書かないと順番は保証されない**(たまたま id 順に見えても、いつ変わってもおかしくない)。

## 件数を絞る(LIMIT / OFFSET)
```sql
SELECT * FROM users ORDER BY id LIMIT 10;              -- 先頭10件
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20;    -- 21〜30件目(3ページ目)
```
- ページングに使う。ただし OFFSET が大きいと遅くなる(飛ばす行も読むため)
- 大量データでは「前ページ最後の id より大きいもの」で取る **カーソル方式** が速い
  ```sql
  SELECT * FROM users WHERE id > 1234 ORDER BY id LIMIT 10;
  ```
- SQL Server は `TOP 10` / `OFFSET … FETCH` と書く(方言)

## 条件で値を変える(CASE)
```sql
SELECT name,
  CASE
    WHEN age < 20 THEN '未成年'
    WHEN age < 65 THEN '成人'
    ELSE 'シニア'
  END AS 区分
FROM users;
```

## よく使う関数(製品で名前が少し違う)
| 用途 | 例 |
| --- | --- |
| 文字列 | `LENGTH(name)` `UPPER(email)` `name \|\| 'さん'`(連結。MySQL は `CONCAT`) |
| 数値 | `ROUND(x, 1)` `ABS(x)` |
| 日付 | 現在時刻 `CURRENT_TIMESTAMP`、PostgreSQL `NOW()`、SQLite `datetime('now')` |
| NULL 対策 | `COALESCE(a, b)`(a が NULL なら b) |

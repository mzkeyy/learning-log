---
title: "SQL 03 集計とグループ化(COUNT・GROUP BY・HAVING)"
modified: 2026-10-05
---

← [[SQL_02_SELECTの基本(WHERE・ORDER BY・LIMIT)]] / 次 → [[SQL_04_結合とサブクエリ(JOIN・サブクエリ・WITH)]]

例で使うテーブル:`orders(id, user_id, amount, status, created_at)`

## 集計関数
```sql
SELECT COUNT(*)       FROM orders;   -- 行数
SELECT COUNT(email)   FROM users;    -- email が NULL でない行数
SELECT SUM(amount)    FROM orders;   -- 合計
SELECT AVG(amount)    FROM orders;   -- 平均
SELECT MAX(amount), MIN(amount) FROM orders;
SELECT COUNT(DISTINCT user_id) FROM orders;  -- 注文したことのある人数
```
- 集計関数は **NULL を無視** する(`COUNT(*)` だけは行そのものを数える)
- 該当行が0件のとき `SUM` は 0 ではなく **NULL** → `COALESCE(SUM(amount), 0)`

## グループごとに集計(GROUP BY)
```sql
SELECT user_id, COUNT(*) AS 注文数, SUM(amount) AS 合計
FROM orders
GROUP BY user_id;
```
```
orders                          結果
user_id amount                  user_id 注文数 合計
1       3000  ┐                 1       2      4500
1       1500  ┘ → まとめる →    2       1       800
2        800  ─
```
**ルール:GROUP BY したら、SELECT に書けるのは「GROUP BY の列」か「集計関数」だけ。**
```sql
SELECT user_id, amount, COUNT(*) FROM orders GROUP BY user_id;  -- ✗ amount はどの行の値?
```
(SQLite・古い MySQL はエラーにならず「どれか1行の値」を返してしまうので特に注意)

## グループを絞る(HAVING)
```sql
SELECT user_id, SUM(amount) AS 合計
FROM orders
WHERE status = 'paid'          -- ① 先に「行」を絞る
GROUP BY user_id
HAVING SUM(amount) >= 10000    -- ② 集計した「グループ」を絞る
ORDER BY 合計 DESC;
```
| | WHERE | HAVING |
| --- | --- | --- |
| いつ効く | グループ化の **前** | グループ化の **後** |
| 対象 | 1行ずつ | グループ(集計結果) |
| 集計関数 | 使えない | 使える |

迷ったら「集計結果で絞りたい → HAVING、それ以外 → WHERE」。WHERE で減らせるものは WHERE で減らす方が速い。

## 日付ごとの集計(よくある形)
```sql
-- PostgreSQL
SELECT DATE_TRUNC('month', created_at) AS 月, SUM(amount)
FROM orders GROUP BY 1 ORDER BY 1;

-- SQLite / D1
SELECT strftime('%Y-%m', created_at) AS 月, SUM(amount)
FROM orders GROUP BY 月 ORDER BY 月;
```
日付関数は製品差が最も大きいところ。AI に頼むときは「PostgreSQL で」「D1(SQLite)で」と明記する。

## ウィンドウ関数(一歩先)
GROUP BY は行がまとまって減るが、**行を残したまま** 集計値を横につけたいときに使う。
```sql
SELECT user_id, amount,
  SUM(amount) OVER (PARTITION BY user_id)                       AS ユーザー合計,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)  AS 何回目の注文
FROM orders;
```
「ユーザーごとの最新1件」「ランキング」「累計」などで登場する。主要製品(SQLite 3.25+ 含む)で使える。

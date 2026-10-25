---
title: "SQL 04 結合とサブクエリ(JOIN・サブクエリ・WITH)"
modified: 2026-10-05
---

← [[SQL_03_集計とグループ化(COUNT・GROUP BY・HAVING)]] / 次 → [[SQL_05_データ操作と設計(INSERT・UPDATE・DELETE・CREATE)]]

## JOIN = テーブルを横につなげる
```sql
SELECT u.name, o.amount
FROM orders AS o
JOIN users  AS u ON o.user_id = u.id;   -- ON に「どの列同士が対応するか」
```
- `AS o` はテーブルの別名(`AS` は省略可)。列名が重なるときは `u.id` のように **テーブル名.列名**
- `ON` の条件を忘れる/間違えると、全組み合わせ(行数 × 行数)が出て爆発する

## JOIN の種類
```
users            orders
id name          user_id amount
1  田中          1       3000
2  佐藤          1       1500
3  鈴木          9       500 (存在しないユーザー)
```
| 種類 | 残る行 | 結果のイメージ |
| --- | --- | --- |
| **INNER JOIN**(`JOIN`) | 両方に対応がある行だけ | 田中×2 |
| **LEFT JOIN** | 左は全部+右は対応があれば | 田中×2、佐藤・鈴木(amount = NULL) |
| **RIGHT JOIN** | 右は全部 | LEFT の左右逆。普通は LEFT で書き直す |
| **FULL OUTER JOIN** | 両方全部 | SQLite は 3.39 以降で対応 |
| **CROSS JOIN** | 全組み合わせ | 意図して使うことはまれ |

実務では **INNER と LEFT でほぼ全部**。

### 「〜していない人」を探す(LEFT JOIN + IS NULL)
```sql
SELECT u.name
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;          -- 注文が1件もないユーザー
```

### LEFT JOIN の落とし穴
```sql
-- ✗ WHERE で右テーブルを絞ると、注文なしユーザーが消えて INNER JOIN と同じになる
SELECT u.name, o.amount FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';

-- ○ 右テーブルの条件は ON に書く
SELECT u.name, o.amount FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid';
```

## 3つ以上つなぐ(多対多)
記事とタグを [[中間テーブル]] `article_tags(article_id, tag_id)` でつなぐ例:
```sql
SELECT a.title, t.name AS tag
FROM articles a
JOIN article_tags at ON at.article_id = a.id
JOIN tags t          ON t.id = at.tag_id
WHERE a.id = 42;
```

## サブクエリ = SQL の中の SQL
```sql
-- 平均より高い注文
SELECT * FROM orders WHERE amount > (SELECT AVG(amount) FROM orders);

-- 注文したことがあるユーザー
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);

-- 同じ意味を EXISTS で(大量データで速いことが多い)
SELECT * FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```
注意:`NOT IN (サブクエリ)` はサブクエリに NULL が1つでも混ざると **0件になる**。否定は `NOT EXISTS` が安全。

## WITH(CTE)= サブクエリに名前をつける
長い SQL を「部品に分けて上から読める」ようにする書き方。AI が書く SQL によく出てくる。
```sql
WITH user_totals AS (
  SELECT user_id, SUM(amount) AS total
  FROM orders
  GROUP BY user_id
)
SELECT u.name, t.total
FROM user_totals t
JOIN users u ON u.id = t.user_id
WHERE t.total >= 10000
ORDER BY t.total DESC;
```

## 縦につなげる(UNION)
```sql
SELECT email FROM users
UNION              -- 重複を除く(UNION ALL は重複も残す・速い)
SELECT email FROM newsletter_subscribers;
```
列の数と型をそろえる必要がある。

## JOIN と [[N+1]]
アプリ側で「ユーザー一覧を取る → 1人ずつ注文を取る」と、クエリが 1 + N 回飛んで遅くなる。
**JOIN で1回にまとめる** か `WHERE user_id IN (…)` でまとめて取るのが基本の対策。

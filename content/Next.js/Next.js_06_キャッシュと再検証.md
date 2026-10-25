---
title: "Next.js 06 キャッシュと再検証"
modified: 2026-09-29
---

キャッシュ = 取得や計算の結果を保存し、次回から同じ作業をせずに速く返すこと。
Next.js 16 では **Cache Components** という新しい方式が推奨(明示的にキャッシュを指定する)。

## 有効化
```ts
// next.config.ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = { cacheComponents: true }
export default nextConfig
```
> 旧方式(fetch の `next: { revalidate }` オプションや `export const dynamic`)の解説は公式「Caching (Previous Model)」。古い記事やAIの出力はこちらで書かれていることが多いので注意。

## 3種類のコンテンツを組み合わせる
| 種類 | 書き方 | いつ作られる |
| --- | --- | --- |
| **静的** | 普通に書く | ビルド時(プリレンダリング) |
| **キャッシュされた動的データ** | `'use cache'` + `cacheLife` | 初回に作って一定時間保存 |
| **毎回変わる動的データ** | `<Suspense>` で包む | リクエストごと(ストリーミング) |

```tsx
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { cacheLife, cacheTag } from 'next/cache'

export default function BlogPage() {
  return (
    <>
      <header><h1>Our Blog</h1></header>          {/* 静的 */}
      <BlogPosts />                                 {/* キャッシュ(1時間) */}
      <Suspense fallback={<p>Loading...</p>}>
        <UserPreferences />                         {/* 毎回(Cookie依存) */}
      </Suspense>
    </>
  )
}

async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')
  const posts = await fetch('https://api.vercel.app/blog').then((r) => r.json())
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}

async function UserPreferences() {
  const theme = (await cookies()).get('theme')?.value ?? 'light'
  return <p>テーマ: {theme}</p>
}
```
→ 静的部分とキャッシュ部分が「静的シェル」として即座に返り、Cookie 依存部分だけ後から流れてくる(Partial Prerendering)。

## `'use cache'` の使い方
- **データ単位**: 関数の先頭に書く
```ts
export async function getUsers() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM users')
}
```
- **UI 単位**: コンポーネント・ページの先頭に書く
- ファイル先頭に書くとそのファイルの全 export がキャッシュ
- **引数が自動でキャッシュキー**になる(引数が違えば別エントリ)
- 公式推奨: 必ず `cacheLife` をセットで指定

## cacheLife のプロファイル
| 名前 | stale(古くても返す) | revalidate(裏で更新) | expire(破棄) |
| --- | --- | --- | --- |
| default | 5分 | 15分 | なし |
| seconds | 30秒 | 1秒 | 60秒 |
| minutes | 5分 | 1分 | 1時間 |
| hours | 5分 | 1時間 | 1日 |
| days | 5分 | 1日 | 1週 |
| weeks | 5分 | 1週 | 30日 |
| max | 5分 | 30日 | 1年 |
細かく指定: `cacheLife({ stale: 3600, revalidate: 7200, expire: 86400 })`

## ランタイムAPI(リクエストごとの情報)
`cookies()` `headers()` `searchParams` `params` は**リクエスト時にしか分からない** → 使う部品は `<Suspense>` で包む。
- 包み忘れると開発中のオーバーレイに「blocking-route」と修正案が出る
- Cookie の値でキャッシュしたい → 値を取り出して引数でキャッシュ関数に渡す、または `'use cache: private'`
- `Math.random()` `Date.now()` なども明示が必要: 毎回変えたいなら `await connection()` + Suspense

## 再検証(キャッシュの更新)
### 時間ベース
`cacheLife` で指定した時間が過ぎたら裏で更新。

### オンデマンド(更新したらすぐ反映)
```ts
// 取得側
export async function getProducts() {
  'use cache'
  cacheTag('products')
  return db.query('SELECT * FROM products')
}
// 更新側(Server Action)
import { revalidateTag, updateTag, revalidatePath } from 'next/cache'
revalidateTag('products', 'max')   // 古いものを返しつつ裏で更新(多少遅れてOKな内容向け)
updateTag('products')              // 即失効。投稿直後に自分の変更を見せたい時(Server Action のみ)
revalidatePath('/products')        // パス単位
```
| | updateTag | revalidateTag |
| --- | --- | --- |
| 使える場所 | Server Actions のみ | Server Actions と Route Handlers |
| 動き | 即時失効 | stale-while-revalidate |

## 判断フロー(実務)
1. 全員に同じ・めったに変わらない → そのまま(静的)
2. 全員に同じ・時々変わる(記事一覧、商品) → `'use cache'` + `cacheLife` + `cacheTag`、更新時に `updateTag`/`revalidateTag`
3. ユーザーごと・毎回変わる(カート、ログイン情報) → `<Suspense>` でストリーミング
4. 分からなければキャッシュしない(正しさ優先)→ 遅いと分かってから足す

## 関連
- 前: [[Next.js_05_データ更新(Server Actions・フォーム)]] / 次: [[Next.js_07_スタイル・画像・フォント・SEO]]
- 公式: https://nextjs.org/docs/app/getting-started/caching , https://nextjs.org/docs/app/getting-started/revalidating

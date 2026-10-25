---
title: "Next.js 03 Server Components と Client Components"
modified: 2026-09-29
---

App Router で**一番大事な概念**。これを理解すればエラーの半分は防げる。

## 基本ルール
- **layout と page は既定で Server Component**(サーバーで動く)
- ファイル先頭に **`'use client'`** と書くと Client Component(ブラウザでも動く)

## どちらを使う?
| Client Component を使う | Server Component を使う |
| --- | --- |
| state・イベント(`onClick`, `onChange`) | DB や API からのデータ取得 |
| `useEffect` などのライフサイクル | API キーなど**秘密情報**を使う処理 |
| ブラウザ専用 API(`localStorage`, `window`) | ブラウザに送る JS を減らしたい |
| カスタム hooks | 最初の表示(FCP)を速くしたい |

**方針: 基本は Server、動きが必要な"葉っぱ"の部品だけ Client。**

```tsx
// app/[id]/page.tsx(Server:データ取得)
import LikeButton from '@/app/ui/like-button'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)
  return (<main><h1>{post.title}</h1><LikeButton likes={post.likes} /></main>)
}
```
```tsx
// app/ui/like-button.tsx(Client:クリック処理)
'use client'
import { useState } from 'react'
export default function LikeButton({ likes }: { likes: number }) {
  const [count, setCount] = useState(likes)
  return <button onClick={() => setCount(count + 1)}>♥ {count}</button>
}
```

## 仕組み(ざっくり)
1. サーバーで Server Component を描画 → **RSC Payload**(描画結果+Client部品の置き場所+渡すprops)を作る
2. それと Client Component から **HTML を事前生成** → ブラウザにすぐ表示(まだ動かない)
3. JS が届くと **ハイドレーション**(HTML にイベントをくっつけて動くようにする)
4. 2回目以降の遷移は RSC Payload を先読み・キャッシュして高速表示

## `'use client'` は「境界」
- `'use client'` を書いたファイルが**インポートするもの・直接描画する部品は全部クライアント側**に入る → 全部に書く必要はない
- **大きな範囲に付けない**: レイアウト全体でなく、検索バーなど動く部分だけ
```tsx
// app/layout.tsx(Server のまま)
import Search from './search'   // ← 'use client' の部品
import Logo from './logo'       // ← Server のまま
export default function Layout({ children }) {
  return (<><nav><Logo /><Search /></nav><main>{children}</main></>)
}
```

## よく使うパターン
### Server → Client にデータを渡す
- props で渡す。ただし **シリアライズ可能な値だけ**(文字列・数値・配列・プレーンなオブジェクト。関数やクラスは不可 ※Server Action は可)

### Client の中に Server を入れる(children スロット)
```tsx
// Modal は Client、Cart は Server
<Modal>
  <Cart />
</Modal>
```
Client Component が Server Component を import することはできないが、**children として受け取る**のはOK。

### Context(テーマ・ログイン情報の共有)
Context は Server で使えない → Provider を Client Component にして、layout で包む。
```tsx
'use client'
import { createContext } from 'react'
export const ThemeContext = createContext('light')
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
}
```
→ Provider は**なるべく深い位置**で包む(`<html>` 全体ではなく `{children}` だけ)

### 'use client' が付いていない外部ライブラリ
`useState` を使うのに `'use client'` がない部品を Server で使うとエラー → 自分で包む:
```tsx
'use client'
import { Carousel } from 'acme-carousel'
export default Carousel
```

## 事故防止:サーバー専用コードの流出を防ぐ
```ts
// lib/data.ts
import 'server-only'   // ← Client から import されたらビルドエラーにしてくれる
export async function getData() {
  const res = await fetch('https://api.example.com', {
    headers: { authorization: process.env.API_KEY! },
  })
  return res.json()
}
```
- 環境変数は **`NEXT_PUBLIC_` が付いたものだけ**ブラウザに渡る。付いていないものはクライアントでは空文字になる
- 逆にブラウザ専用のコードには `import 'client-only'`

## よくあるエラーと対処
| エラー・症状 | 原因 | 対処 |
| --- | --- | --- |
| `useState` / `onClick` が使えない | Server Component で使った | その部品を `'use client'` にする |
| `async` の Client Component | Client は async にできない | データ取得は Server で行い props で渡す、または `use()` |
| 関数を props で渡せない | シリアライズ不可 | Server Action にする / Client 内で定義 |
| ハイドレーションエラー | サーバーとブラウザで描画結果が違う(`Date.now()`、`window` 判定、ランダム値) | `useEffect` 内で処理、値を固定 |
| 秘密情報が漏れる不安 | Client で import | `server-only` を付ける |

## 関連
- 前: [[Next.js_02_ルーティング]] / 次: [[Next.js_04_データ取得とストリーミング]]
- 公式: https://nextjs.org/docs/app/getting-started/server-and-client-components

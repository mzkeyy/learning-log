---
title: "React"
modified: 2026-10-26
---

**画面を「コンポーネント(部品)」の組み合わせで作る、UI のための JavaScript ライブラリ**。データ(状態)が変わると、それに合わせて画面を自動で描き直す。[[Next.js]] や [[TanStack Start]] はこの React の上に作られたフレームワーク。

React の公式ドキュメント(react.dev、**2026年10月時点。React 19.3、React Compiler 1.0**)を読んで整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[React_01_基本(コンポーネント・JSX・props・state)]] | 部品の作り方、データの流れ、リストと条件 |
| 02 | [[React_02_フック(useState・useEffect・カスタムフック)]] | フックのルール、Effect が要らない場面、自作フック |
| 03 | [[React_03_React 19の機能(Actions・use・Activity・Compiler)]] | フォームと Actions、楽観的更新、Compiler |
| 04 | [[React_04_状態管理とデータ取得(Context・Zustand・TanStack Query)]] | 状態の置き場所、サーバーのデータ、フォーム |
| 05 | [[React_05_実務(構成・性能・型・AI開発)]] | フォルダ構成、性能、TypeScript、チェックリスト |

## React の考え方
```
状態(データ) ──▶ コンポーネント(関数) ──▶ 画面
     ▲                                        │
     └──────── ユーザーの操作で状態を更新 ◀────┘
```
- **画面 = 関数(状態)**。「どう変えるか」ではなく「この状態ならこう見える」を書く(宣言的)
- データは**親から子へ一方向**に流れる(props)
- 画面の変化は**状態を変える**ことで起こす。DOM を直接いじらない

## 最小の例
```tsx
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(count + 1)}>
      {count} 回クリック
    </button>
  )
}
```

## どこで使うか
| 形 | 道具 | 向く場面 |
| --- | --- | --- |
| 画面だけ(SPA) | **[[Vite]]** + React | 管理画面・ログイン後のアプリ。API は別に([[Hono]] など) |
| フルスタック | **[[Next.js]]** / [[TanStack Start]] / React Router | SEO が要るサイト、サーバー処理も一緒に |
| モバイル | React Native(Expo) | iOS・Android アプリ |
- 新しく始めるなら**フレームワーク(Next.js など)か Vite**。Create React App は終了している

## 押さえどころ(2026年10月時点)
- コンポーネントは**関数**で書く(クラスは古い書き方)
- **useEffect は外部とのつなぎ(同期)用**。計算やイベント処理に使わない
- フォームは React 19 の **Actions**(`<form action>`・`useActionState`)で書ける
- **React Compiler 1.0** が安定版になり、`useMemo` / `useCallback` / `memo` を手で書く場面が大きく減った
- サーバーのデータは**TanStack Query**(または フレームワークの仕組み)で。`useEffect` + `fetch` を手で書かない
- 部品は [[shadcn-ui]] のようなコピーして使う UI 部品集が主流 → [[デザインシステム]]

## 関連
- [[Next.js]] / [[Next.js_01_はじめに(React基礎・インストール・構成)]] / [[TanStack Start]] / [[Vite]]
- [[TypeScript]] / [[shadcn-ui]] / [[Tailwind CSS]] / [[テスト_04_コンポーネントテスト(Testing Library・Browser Mode)]] / [[コンポーネント設計]]
- 公式: https://react.dev/learn , https://react.dev/reference/react

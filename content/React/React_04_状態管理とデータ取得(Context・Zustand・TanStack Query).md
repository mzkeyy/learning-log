---
title: "React 04 状態管理とデータ取得(Context・Zustand・TanStack Query)"
modified: 2026-10-26
---

## 状態の種類で置き場所を決める
| 状態の種類 | 例 | 置き場所 |
| --- | --- | --- |
| **サーバーのデータ** | 投稿一覧、ユーザー情報 | **TanStack Query** / フレームワークの loader・Server Components |
| **URL の状態** | 検索条件、ページ番号、タブ | **URL(クエリ文字列)**。共有・戻るボタンで再現できる |
| フォームの入力中の値 | 入力欄 | フォームの中(`useState`・React Hook Form・`<form action>`) |
| 画面の一部の状態 | モーダルの開閉、アコーディオン | そのコンポーネントの `useState` |
| アプリ全体の UI 状態 | テーマ、ログイン中のユーザー、サイドバーの開閉 | Context / Zustand |
- 「全部グローバルな store に入れる」は昔のやり方。**サーバーのデータとそれ以外を分ける**のが今の基本
- 迷ったら、**使う場所に一番近いところ**に置く

## Context(遠くの子に値を渡す)
```tsx
import { createContext, use, useState } from 'react'

type Theme = 'light' | 'dark'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  return <ThemeContext value={{ theme, toggle }}>{children}</ThemeContext>   // React 19 は .Provider 不要
}

export function useTheme() {
  const ctx = use(ThemeContext)
  if (!ctx) throw new Error('ThemeProvider の中で使ってください')
  return ctx
}
```
- props を何段も受け渡す(props のバケツリレー)を避けられる
- 値が変わると**使っている全コンポーネントが再レンダリング**される。頻繁に変わる値には向かない
- テーマ・ログインユーザー・言語など**あまり変わらないもの**に使う

## Zustand(小さな グローバル store)
```ts
import { create } from 'zustand'

type CartState = {
  items: { id: string; qty: number }[]
  add: (id: string) => void
  clear: () => void
}

export const useCart = create<CartState>((set) => ({
  items: [],
  add: (id) => set((s) => ({ items: [...s.items, { id, qty: 1 }] })),
  clear: () => set({ items: [] }),
}))
```
```tsx
const count = useCart((s) => s.items.length)   // ★ 必要な部分だけ選ぶと、その値が変わったときだけ再描画
const add = useCart((s) => s.add)
```
- Provider が要らず、書く量が少ない。Redux より軽い定番
- サーバーのデータを入れない(それは TanStack Query の役目)

## TanStack Query(サーバーのデータ)
取得・キャッシュ・再取得・ローディング・エラー・重複リクエストの排除をまとめて面倒を見てくれる。
```tsx
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
// <QueryClientProvider client={queryClient}><App /></QueryClientProvider>

function Posts() {
  const { data, isPending, error } = useQuery({
    queryKey: ['posts'],                                     // キャッシュの名前
    queryFn: () => fetch('/api/posts').then((r) => r.json()),
  })
  if (isPending) return <p>読み込み中…</p>
  if (error) return <p>エラー: {error.message}</p>
  return <ul>{data.map((p: Post) => <li key={p.id}>{p.title}</li>)}</ul>
}

function NewPost() {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (title: string) => fetch('/api/posts', { method: 'POST', body: JSON.stringify({ title }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),   // 一覧を取り直す
  })
  return <button onClick={() => mutation.mutate('新しい投稿')} disabled={mutation.isPending}>投稿</button>
}
```
- `queryKey` に条件を含める(`['posts', { page, q }]`)と、条件ごとにキャッシュされる
- 画面に戻ったとき・ウィンドウに戻ったときに自動で新しくする(設定で変更可)
- [[Hono]] の RPC(`hc`)と組み合わせると、API の型もそろう → [[Hono_04_バリデーションとRPC(Zod・hc)]]
- Next.js の Server Components で取れるなら、そちらを優先してもよい

## URL を状態として使う
```tsx
const [params, setParams] = useSearchParams()   // React Router・Next.js などのフック
const q = params.get('q') ?? ''
// 検索条件を変えたら URL を更新 → 共有・ブックマーク・戻るボタンが効く
```
- 型安全に扱いたいなら nuqs(Next.js など)や [[TanStack Start]] の search params

## フォームのライブラリ
| 方法 | 向く場面 |
| --- | --- |
| `<form action>` + `useActionState` | シンプルなフォーム、Server Actions → [[React_03_React 19の機能(Actions・use・Activity・Compiler)]] |
| **React Hook Form** + Zod | 項目が多い・入力中のチェック・動的な項目 |
| TanStack Form | 型安全さ重視 |
- 入力チェックのルール(Zod のスキーマ)は**サーバーと共有**すると二重管理を防げる

## 関連
- 前: [[React_03_React 19の機能(Actions・use・Activity・Compiler)]] / 次: [[React_05_実務(構成・性能・型・AI開発)]]
- [[TanStack Start]] / [[Next.js_04_データ取得とストリーミング]] / [[Hono]]
- 公式: https://react.dev/learn/passing-data-deeply-with-context , https://tanstack.com/query/latest/docs/framework/react/overview , https://zustand.docs.pmnd.rs/ , https://react-hook-form.com/

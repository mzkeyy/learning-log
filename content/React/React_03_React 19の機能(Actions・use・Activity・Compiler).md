---
title: "React 03 React 19 の機能(Actions・use・Activity・Compiler)"
modified: 2026-10-26
---

## React 19 で何が変わったか
| 機能 | ひとこと |
| --- | --- |
| **Actions** | 非同期の処理(送信など)を `startTransition` / `<form action>` に渡すと、送信中の状態・エラー・順番を React が管理 |
| `useActionState` | フォームの送信結果(エラー・成功メッセージ)と送信中かどうか |
| `useFormStatus` | 子のボタンから、親のフォームが送信中か知る |
| `useOptimistic` | 送信完了を待たずに画面を先に変える(楽観的更新) |
| `use` | Promise や Context を読む(条件分岐の中でも使える) |
| `ref` を props で | `forwardRef` が不要に |
| `<title>`・`<meta>` | コンポーネントの中に書くと `<head>` に入る |
| `<Activity>`(19.2) | 画面を消さずに隠す(state を保ったまま) |
| `useEffectEvent`(19.2) | Effect の中から最新の props・state を読む |
| **React Compiler 1.0** | メモ化を自動でしてくれるビルド時のツール |

## Actions とフォーム
```tsx
import { useActionState } from 'react'

type State = { error?: string; ok?: boolean }

async function subscribe(prev: State, formData: FormData): Promise<State> {
  const email = formData.get('email')
  if (typeof email !== 'string' || !email.includes('@')) return { error: 'メールアドレスを確認してください' }
  const res = await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) })
  return res.ok ? { ok: true } : { error: '登録に失敗しました' }
}

export function SubscribeForm() {
  const [state, formAction, isPending] = useActionState(subscribe, {})
  return (
    <form action={formAction}>
      <label>メール <input name="email" type="email" required /></label>
      <button disabled={isPending}>{isPending ? '送信中…' : '登録'}</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.ok && <p>登録しました</p>}
    </form>
  )
}
```
- `value` と `onChange` を1つずつ書かなくても、`FormData` で値を受け取れる
- 送信中の状態(`isPending`)を自分で管理しなくてよい
- 送信が成功するとフォームは自動でリセットされる
- [[Next.js]] では action にサーバーの関数(Server Actions)を渡せる → [[Next.js_05_データ更新(Server Actions・フォーム)]]
- 入力チェックはサーバー側でも必ず行う(ブラウザ側のチェックは回避できる)

### useFormStatus
```tsx
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()   // 親の <form> の状態
  return <button disabled={pending}>{pending ? '保存中…' : '保存'}</button>
}
```

## useOptimistic(楽観的更新)
```tsx
function Likes({ count, onLike }: { count: number; onLike: () => Promise<void> }) {
  const [optimisticCount, addOptimistic] = useOptimistic(count, (c, n: number) => c + n)

  return (
    <form action={async () => {
      addOptimistic(1)        // すぐ画面に反映
      await onLike()          // 失敗したら元の count に戻る
    }}>
      <button>♥ {optimisticCount}</button>
    </form>
  )
}
```
- いいね・チェックボックス・チャットの送信など、**ほぼ成功する操作**の体感を速くする

## use
```tsx
import { use, Suspense } from 'react'

function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise)    // 解決するまで Suspense のフォールバックを表示
  return <ul>{comments.map((c) => <li key={c.id}>{c.text}</li>)}</ul>
}

<Suspense fallback={<p>読み込み中…</p>}>
  <Comments commentsPromise={commentsPromise} />
</Suspense>
```
- サーバー(Server Components)で始めた取得を、クライアントで待つ形に向く
- **描画のたびに新しい Promise を作って渡さない**(無限に読み込み直す)。Promise はフレームワークや TanStack Query などで作ったものを使う
- `use(SomeContext)` は `useContext` と同じだが、if の中でも呼べる

## ref が普通の props に
```tsx
// React 19: forwardRef が不要
function TextInput({ ref, ...props }: React.ComponentProps<'input'>) {
  return <input ref={ref} {...props} />
}
```

## Activity(画面を隠しても state を保つ)
```tsx
import { Activity } from 'react'

<Activity mode={tab === 'settings' ? 'visible' : 'hidden'}>
  <SettingsPanel />
</Activity>
```
- タブを切り替えても、入力途中の内容やスクロール位置が残る
- 隠れている間は Effect が止まり、更新は後回しになる。次に開きそうな画面を先に準備しておくのにも使える

## useEffectEvent
```tsx
function ChatRoom({ roomId, theme }: { roomId: string; theme: string }) {
  const onConnected = useEffectEvent(() => {
    showToast('接続しました', theme)   // 最新の theme を読む
  })

  useEffect(() => {
    const conn = connect(roomId)
    conn.on('connected', () => onConnected())
    return () => conn.disconnect()
  }, [roomId])                         // theme が変わってもつなぎ直さない
}
```
- 「Effect の中で使いたいが、それが変わっても Effect をやり直したくない値」を扱う

## React Compiler
- ビルド時にコンポーネントを解析して、**`useMemo`・`useCallback`・`memo` 相当の最適化を自動で入れる**
- 2025年10月に 1.0(安定版)。Vite(Babel プラグイン)・Next.js(`reactCompiler: true`)・Expo で使える
```bash
npm install -D babel-plugin-react-compiler
```
- 新しく書くコードでは、**基本的に手で `useMemo` / `useCallback` を書かなくてよい**。まずは素直に書く
- フックのルールを守っていないコンポーネントは最適化されない(lint の `eslint-plugin-react-hooks` が Compiler 用のルールも含む)

## View Transitions
- `<ViewTransition>` で、ブラウザの View Transitions API を使った画面切り替えのアニメーションを付けられる(新しい機能。フレームワークの対応状況を確認して使う)

## Server Components
- サーバーだけで動くコンポーネント。データを直接取得でき、JavaScript をブラウザに送らない
- React 単体ではなく **Next.js などのフレームワーク**の機能として使う → [[Next.js_03_Server ComponentsとClient Components]]

## 関連
- 前: [[React_02_フック(useState・useEffect・カスタムフック)]] / 次: [[React_04_状態管理とデータ取得(Context・Zustand・TanStack Query)]]
- [[Next.js]] / [[TanStack Start]]
- 公式: https://react.dev/blog/2024/12/05/react-19 , https://react.dev/reference/react/useActionState , https://react.dev/reference/react/useOptimistic , https://react.dev/reference/react/use , https://react.dev/reference/react/Activity , https://react.dev/reference/react/useEffectEvent , https://react.dev/learn/react-compiler

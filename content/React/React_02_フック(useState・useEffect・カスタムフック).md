---
title: "React 02 フック(useState・useEffect・カスタムフック)"
modified: 2026-10-26
---

## フックのルール
- 名前は `use` で始まる
- **コンポーネント(またはカスタムフック)の一番上で呼ぶ**。if・ループ・早期 return の後で呼ばない(呼ぶ順番で state を区別しているため)
- ESLint の `eslint-plugin-react-hooks` を入れると、ルール違反や依存配列の漏れを教えてくれる

## 主なフック
| フック | 用途 |
| --- | --- |
| `useState` | 状態 |
| `useReducer` | 状態の更新が複雑なとき(アクションで更新) |
| `useContext` | 遠くの親から値を受け取る → 04 |
| `useRef` | 再レンダリングしない値の保持、DOM 要素への参照 |
| `useEffect` | **外部とのつなぎ**(購読・タイマー・DOM の外の API) |
| `useMemo` / `useCallback` | 計算結果・関数の使い回し(Compiler があれば多くは不要) |
| `useId` | label と input を結ぶ一意な ID |
| `useTransition` / `useDeferredValue` | 重い更新を後回しにして操作を軽く |
| `useActionState` / `useOptimistic` / `use` | React 19 → 03 |
| `useEffectEvent` | Effect の中から最新の値を読むイベント関数 → 03 |

## useRef
```tsx
function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>入力欄へ</button>
    </>
  )
}
```
- `ref.current` を変えても**再レンダリングされない**(タイマーの ID などの保持にも)
- 描画中に `ref.current` を読み書きしない

## useEffect: 外部と同期するためのもの
```tsx
useEffect(() => {
  const conn = createConnection(roomId)   // 外部につなぐ
  conn.connect()
  return () => conn.disconnect()          // ★ 後片付け(次の実行前・消える時)
}, [roomId])                              // roomId が変わったらつなぎ直す
```
- 依存配列には**中で使っている props・state を全部**入れる(lint が教えてくれる)
- 開発モード(StrictMode)ではマウント時に「実行 → 片付け → 実行」される。片付けが正しいかの確認

### Effect が要らない場面(よくある間違い)
| やりたいこと | ❌ Effect で | ✅ こうする |
| --- | --- | --- |
| 他の state から値を計算 | Effect で計算して set | **描画中に計算**(重ければ useMemo) |
| props が変わったら state をリセット | Effect で set | 親で `key` を変える |
| ボタンを押したら API を送る | state を変えて Effect で送る | **イベント処理の中で**送る |
| 画面表示時にデータ取得 | Effect + fetch + state | **TanStack Query** / フレームワークの loader / Server Components |
| 親に変化を知らせる | Effect で onChange を呼ぶ | イベント処理の中で両方更新 |
- 「この処理は**表示されたから**必要? **ユーザーが操作したから**必要?」 → 操作が理由ならイベント処理に書く
- Effect でデータ取得すると、競合(古い応答が後から来る)・キャッシュなし・ローディング管理などを自分で書くことになる → [[React_04_状態管理とデータ取得(Context・Zustand・TanStack Query)]]

## カスタムフック
同じロジック(state + Effect の組み合わせ)を部品として切り出す。
```tsx
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function StatusBar() {
  const online = useOnlineStatus()
  return <p>{online ? 'オンライン' : 'オフライン'}</p>
}
```
- 共有されるのは**ロジック**で、state そのものはコンポーネントごとに別
- 名前は `use` で始める。中でフックを使わないなら普通の関数でよい
- ブラウザの API の購読には `useSyncExternalStore` という専用のフックもある

## useReducer
```tsx
type Action = { type: 'add'; text: string } | { type: 'toggle'; id: string }

function reducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case 'add': return [...state, { id: crypto.randomUUID(), text: action.text, done: false }]
    case 'toggle': return state.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t))
  }
}

const [todos, dispatch] = useReducer(reducer, [])
dispatch({ type: 'add', text: '牛乳を買う' })
```
- 更新の種類が多いとき、**何が起きたか(アクション)**と**どう変わるか(reducer)**を分けて整理できる
- reducer は純粋な関数なので、単体テストしやすい → [[テスト]]

## 関連
- 前: [[React_01_基本(コンポーネント・JSX・props・state)]] / 次: [[React_03_React 19の機能(Actions・use・Activity・Compiler)]]
- 公式: https://react.dev/reference/react/hooks , https://react.dev/learn/you-might-not-need-an-effect , https://react.dev/learn/reusing-logic-with-custom-hooks

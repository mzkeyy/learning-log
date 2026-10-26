---
title: "React 01 基本(コンポーネント・JSX・props・state)"
modified: 2026-10-26
---

## コンポーネント
**JSX を返す関数**。名前は大文字で始める。
```tsx
type ProfileProps = { name: string; role?: string }

export function Profile({ name, role = 'メンバー' }: ProfileProps) {
  return (
    <section className="profile">
      <h2>{name}</h2>
      <p>{role}</p>
    </section>
  )
}

// 使う側
<Profile name="Taro" role="管理者" />
```
- 1つのコンポーネントは**1つの要素**を返す。複数を並べたいなら `<>...</>`(Fragment)で囲む
- 小さく分ける目安: 「名前を付けられるまとまり」「繰り返し出てくるもの」

## JSX のルール
| ルール | 例 |
| --- | --- |
| `{}` の中に JavaScript の式 | `<p>{user.name}</p>`、`<img src={url} />` |
| `class` ではなく `className` | `<div className="card">` |
| タグは必ず閉じる | `<img />`、`<br />` |
| イベントは camelCase | `onClick`、`onChange`、`onSubmit` |
| style はオブジェクト | `style={{ color: 'red', fontSize: 14 }}` |
- `{}` の中の文字列は**自動でエスケープ**される(XSS 対策)。`dangerouslySetInnerHTML` は使わない → [[Webセキュリティ対策]]

## props(親 → 子)
- 親から子へ渡す**読み取り専用**の値。子の中で書き換えない
- `children` で中身を受け取れる
```tsx
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card"><h3>{title}</h3>{children}</div>
}

<Card title="お知らせ"><p>明日はメンテナンスです</p></Card>
```
- 子から親へ伝えたいときは、**関数を props で渡す**(`onSelect={(id) => ...}`)

## state(状態)
```tsx
const [text, setText] = useState('')
const [items, setItems] = useState<string[]>([])

function add() {
  setItems([...items, text])   // ★ 新しい配列を作る(push しない)
  setText('')
}
```
- state を変えると、そのコンポーネントが**もう一度実行されて**画面が更新される(再レンダリング)
- **直接書き換えない**(`items.push()`・`user.name = ...` はダメ)。新しいオブジェクト・配列を作って set する
- 前の値をもとに更新するなら関数で: `setCount((c) => c + 1)`
- set した直後の変数はまだ古い値(次のレンダリングで新しくなる)

### 何を state にするか
- **他の値から計算できるものは state にしない**
```tsx
// ❌ 2つの state を同期させる必要がある
const [items, setItems] = useState<Item[]>([])
const [total, setTotal] = useState(0)

// ✅ 計算で出す
const [items, setItems] = useState<Item[]>([])
const total = items.reduce((sum, i) => sum + i.price, 0)
```
- 同じデータを2か所に持たない。**一番近い共通の親**に state を置いて props で配る(state の持ち上げ)

## 条件で出し分ける
```tsx
{isLoading && <Spinner />}
{error ? <ErrorMessage error={error} /> : <List items={items} />}
{items.length === 0 && <p>まだありません</p>}    // ★ items.length && ... だと 0 が表示される
```

## リスト
```tsx
<ul>
  {todos.map((todo) => (
    <li key={todo.id}>{todo.title}</li>   // ★ key は一意で変わらない値(ID)
  ))}
</ul>
```
- `key` で React が「どの要素がどれか」を見分ける。**配列の添字(index)は使わない**(並べ替え・削除でずれる)

## イベントとフォーム
```tsx
function SearchBox({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(q) }}>
      <label>
        キーワード
        <input value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <button type="submit">検索</button>
    </form>
  )
}
```
- `value` + `onChange` で入力を state と結ぶ(制御コンポーネント)
- React 19 では `<form action={関数}>` でも書ける → [[React_03_React 19の機能(Actions・use・Activity・Compiler)]]
- 入力欄には必ず `<label>` を付ける(アクセシビリティ・テストのしやすさ)

## レンダリングは「純粋」に
- コンポーネントの関数は、**同じ props・state なら同じ JSX を返す**ようにする
- 描画中に外のものを書き換えない(グローバル変数の変更、API 呼び出し)。それはイベント処理か Effect で
- 開発モードの StrictMode では、わざと2回実行して純粋でない書き方を見つける

## 関連
- 次: [[React_02_フック(useState・useEffect・カスタムフック)]]
- [[React]] / [[Next.js_01_はじめに(React基礎・インストール・構成)]] / [[TypeScript]]
- 公式: https://react.dev/learn/describing-the-ui , https://react.dev/learn/adding-interactivity , https://react.dev/learn/managing-state

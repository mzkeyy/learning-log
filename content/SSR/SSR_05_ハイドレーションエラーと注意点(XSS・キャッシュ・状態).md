---
title: "SSR 05 ハイドレーションエラーと注意点(XSS・キャッシュ・状態)"
modified: 2026-11-01
---

## ハイドレーションエラー
サーバーの HTML とブラウザで最初に描いた結果が違うと起きる。実際に出るエラー:
```
Hydration failed because the server rendered text didn't match the client.
As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:
- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.
```
- React はその部分を**ブラウザで描き直して**続ける(画面は壊れないが、SSR の意味が薄れ、ちらつく)
- 開発中はコンソールにエラー。`hydrateRoot(..., { onRecoverableError })` で受け取ってログに送れる

### よくある原因と直し方
| 原因 | 例 | 直し方 |
| --- | --- | --- |
| サーバーとブラウザで分岐 | `typeof window === "undefined" ? ... : ...` | `useEffect` の中で切り替える(下の例) |
| 毎回変わる値 | `Date.now()`・`Math.random()`・`new Date()` | サーバーで決めた値を props で渡す。ID は `useId()` |
| 地域・言語で変わる表示 | `date.toLocaleString()` | タイムゾーンとロケールを固定(`Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo" })`) |
| ブラウザにしかない値 | `localStorage`・`window.innerWidth`・Cookie を JS で読む | `useEffect` で読んでから表示、またはサーバーで Cookie を読んで HTML に入れる |
| 正しくない HTML の入れ子 | `<p>` の中に `<div>`、`<a>` の中に `<a>`、`<table>` 直下に `<tr>` | ブラウザが HTML を勝手に直すので一致しなくなる。正しい入れ子にする |
| ブラウザ拡張機能 | 翻訳・パスワード管理がDOMを書き換える | 自分のコードの問題ではない。`<html>`・`<body>` の属性なら `suppressHydrationWarning` |
| データが違う | サーバーとブラウザで別々に API を呼んだ | サーバーで使ったデータを HTML に埋め込んで渡す → [[SSR_02_最小のSSRを自作する(renderToString・hydrateRoot)]] |

```tsx
// ❌ サーバーとブラウザで結果が違う
function Greeting() {
  return <p>{typeof window === "undefined" ? "読み込み中" : `こんにちは ${localStorage.name}`}</p>;
}

// ✅ 最初はサーバーと同じものを描き、ハイドレーションの後で変える
function Greeting() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => { setName(localStorage.getItem("name")); }, []);  // ブラウザだけで動く
  return <p>{name ? `こんにちは ${name}` : "こんにちは"}</p>;
}
```
```tsx
// どうしても違ってよい1か所だけ(時刻の表示など)
<time suppressHydrationWarning>{new Date().toLocaleTimeString()}</time>
```
- `suppressHydrationWarning` は**その要素の直下のテキストだけ**に効く。乱用しない
- ブラウザでしか描けない部品(地図・グラフ・エディタ)は、ハイドレーション後に出す `ClientOnly` 部品や、フレームワークの仕組み(React Router の `clientLoader` + `HydrateFallback`)を使う

## データを埋め込むときの XSS
```ts
// ❌ ユーザーの入力に </script> が入っていると、スクリプトを実行される
`<script>window.__DATA__ = ${JSON.stringify(data)}</script>`

// ✅ < をエスケープ(JSON としての値は変わらない)
`<script>window.__DATA__ = ${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`
```
- React の JSX の中に書いた文字は自動でエスケープされる。**危ないのは HTML を文字列で組み立てる所**(テンプレートへの差し込み、`dangerouslySetInnerHTML`)
- CSP(`Content-Security-Policy`)を使うなら、インラインの `<script>` には nonce が要る(`renderToPipeableStream` の `nonce` オプション)→ [[Webセキュリティ対策]]
- **サーバーだけのデータ(パスワードのハッシュ・内部 ID・ほかの人の情報)を埋め込まない**。埋め込んだものは誰でも「ページのソース」で見られる

## リクエストごとの状態(サーバーで共有してはいけないもの)
サーバーは**1つのプロセスで全員のリクエストを処理**する。モジュールの変数に入れたものは全員で共有される。
```ts
// ❌ モジュールの変数にキャッシュ → 最初のユーザーのデータが、次のユーザーにも見える
let cache: Promise<User> | undefined;
export function getCurrentUser() {
  cache ??= fetchUser();
  return cache;
}
```
| 共有してよい | リクエストごとに作る |
| --- | --- |
| 設定、DB の接続プール、全員に同じデータのキャッシュ | ログイン中のユーザー、セッション、ユーザーごとのデータ |
| 純粋な関数・定数 | 状態管理のストア(Redux・Zustand)、TanStack Query の `QueryClient` |
- 状態管理のストアや `QueryClient` は**リクエストのたびに新しく作って**、Context で渡す
- React の `cache()`(Server Components 用)や、フレームワークの `context`(React Router の middleware → loader)は、リクエストごとに分かれる仕組み → [[React Router_04_ミドルウェア・認証・型安全]]
- 試したところ: 自作の Vite SSR でモジュール変数にキャッシュすると、2回目のアクセスは最初のデータがそのまま返った → [[SSR_04_ViteでSSR(開発サーバー・ビルド・本番)]]

## サーバーで動かないコード
| 書き方 | サーバーで起きること | 対策 |
| --- | --- | --- |
| コンポーネントの本体で `window.addEventListener` | `ReferenceError: window is not defined` | `useEffect` の中へ |
| import した瞬間に `document` を触るライブラリ | 起動時にエラー | ブラウザだけで `import()` する、`ClientOnly` で包む |
| `useLayoutEffect` | サーバーでは動かない(警告は React 19 で出なくなった) | 見た目の調整なら `useEffect` で足りることが多い |
- 「ブラウザでは動くのに SSR で落ちる」は、ほぼこのどれか

## キャッシュと性能
- SSR はリクエストのたびにサーバーで描くので、**全員に同じページは CDN にキャッシュ**させる(`Cache-Control: public, s-maxage=...`)
- **ログインユーザーごとのページはキャッシュさせない**(`private` か `no-store`)。間違えると他人のページが見える → [[REST]]
- 遅いのは描画よりデータ取得のことが多い。並列にする・ストリーミングにする・N+1 をなくす → [[N+1]] / [[オブザーバビリティ]]
- HTML が大きいとハイドレーションも遅い。一覧は件数を絞る、ページングする

## チェックリスト
- [ ] コンソールにハイドレーションエラーが出ていない(開発中に毎回見る)
- [ ] 日付・時刻はタイムゾーンとロケールを固定して表示
- [ ] `window` / `localStorage` は `useEffect` の中だけ
- [ ] 埋め込むデータは `<` をエスケープし、秘密を入れていない
- [ ] ユーザーごとの状態をモジュールの変数に置いていない
- [ ] ユーザーごとのページを CDN にキャッシュしていない

## 関連
- 前: [[SSR_04_ViteでSSR(開発サーバー・ビルド・本番)]] / 次: [[SSR_06_静的生成とフレームワーク(prerender・React Router・Next.js・RSC)]]
- [[Webセキュリティ対策]] / [[React_02_フック(useState・useEffect・カスタムフック)]] / [[TanStack Start_03_実行モデルとServer Functions]]
- 公式: https://react.dev/reference/react-dom/client/hydrateRoot#handling-different-client-and-server-content , https://react.dev/link/hydration-mismatch

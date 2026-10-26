---
title: "ソフトウェア設計 04 関数型の考え方(純粋関数・不変性・Result型)"
modified: 2026-10-26
---

## 関数型プログラミングの考え方
「関数型言語を使う」ことではなく、**副作用を減らし、データの変換としてプログラムを書く**考え方。TypeScript でも取り入れやすく、テストしやすいコードになる。React も「画面 = 関数(状態)」という関数型の発想 → [[React]]

## 純粋関数
**同じ入力なら必ず同じ出力を返し、外の世界を変えない**関数。
```ts
// ✅ 純粋: 入力だけで結果が決まる
const withTax = (price: number, rate: number) => Math.round(price * (1 + rate))

// ❌ 純粋でない: 外の状態を読む・変える
let total = 0
const addToTotal = (price: number) => { total += price }           // 外を変える
const isExpired = (date: Date) => date < new Date()                // 現在時刻で結果が変わる
```
| 副作用の例 | |
| --- | --- |
| DB・ファイル・ネットワークへの読み書き | |
| 現在時刻・乱数 | |
| グローバル変数・引数のオブジェクトの書き換え | |
| ログ出力・画面の更新 | |
- 副作用はプログラムに必要。**なくすのではなく、端に寄せる**

### 関数型の中心、命令型の殻(Functional Core, Imperative Shell)
```
[殻] HTTP を受ける → DB から読む → [中心: 純粋な計算] → DB に書く → レスポンス
```
```ts
// 中心(純粋): 業務ルール。テストが簡単
export const applyCoupon = (cart: Cart, coupon: Coupon, now: Date): Result<Cart, CouponError> => { /* ... */ }

// 殻(副作用): 読み書きだけ
app.post('/cart/coupon', async (c) => {
  const cart = await carts.find(userId)
  const coupon = await coupons.findByCode(code)
  const result = applyCoupon(cart, coupon, new Date())
  if (!result.ok) return c.json({ error: result.error }, 400)
  await carts.save(result.value)
  return c.json(result.value)
})
```
- 業務ルールの大部分を、DB もモックもなしにテストできる → [[テスト_01_考え方(種類・何をテストするか)]]

## 不変性(イミュータブル)
**データを書き換えず、変更した新しいデータを作る**。
```ts
// ❌ 書き換え: 同じオブジェクトを持っている別の場所まで変わる
cart.items.push(item)
user.name = 'Jiro'

// ✅ 新しく作る
const newCart = { ...cart, items: [...cart.items, item] }
const renamed = { ...user, name: 'Jiro' }

// 配列の「新しく作る」版のメソッド(ES2023)
const sorted = items.toSorted((a, b) => a.price - b.price)   // sort は元を書き換える
const removed = items.toSpliced(index, 1)
const replaced = items.with(index, newItem)
```
- 「いつ・どこで変わったか」を追わなくてよくなる。React の state 更新もこのルール → [[React_01_基本(コンポーネント・JSX・props・state)]]
- 型で書き換えを防ぐ: `readonly`、`ReadonlyArray<T>`、`as const` → [[TypeScript_07_ユーティリティ型]]
- 大きなデータを何度もコピーすると遅いことがある。ホットな処理では計測して判断

## 小さな関数を組み合わせる
```ts
const activeUsers = users
  .filter((u) => u.status === 'active')
  .map((u) => ({ id: u.id, name: u.name }))
  .toSorted((a, b) => a.name.localeCompare(b.name, 'ja'))
```
- `for` 文で状態を変えながら作るより、**変換の連なり**として読める
- 高階関数(関数を受け取る・返す関数)で、共通の処理を部品にできる(Decorator → [[ソフトウェア設計_03_デザインパターン(今でも使うもの)]])

## エラーを値で返す(Result 型)
例外は「どこで投げられ、どこで捕まるか」が型に現れない。**失敗する可能性を戻り値の型で表す**と、呼ぶ側が処理を忘れない。
```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

type SignupError = 'email_taken' | 'weak_password'

const validatePassword = (pw: string): Result<string, SignupError> =>
  pw.length >= 12 ? { ok: true, value: pw } : { ok: false, error: 'weak_password' }

const result = validatePassword(input)
if (!result.ok) {
  // result.error は 'email_taken' | 'weak_password' と型でわかる
  return c.json({ error: result.error }, 400)
}
use(result.value)
```
| 使い分け | 方法 |
| --- | --- |
| **想定内の失敗**(入力エラー・在庫切れ・重複) | **Result 型**で返す。呼ぶ側に処理を強制 |
| 想定外の失敗(バグ・DB 停止・ネットワーク) | 例外を投げ、上の層でまとめて処理(ログ・500) |
- ライブラリ: neverthrow(Result 型と連結)、Effect(型付きのエラー・依存・並行処理をまとめて扱う本格派)
- Zod の `safeParse` も Result 型と同じ形

## 型で不正な状態を作れなくする
```ts
// ❌ ありえない組み合わせを作れてしまう(loading なのに error もある)
type State = { loading: boolean; data?: User; error?: string }

// ✅ 状態ごとに型を分ける
type State =
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string }
```
- 「Make illegal states unrepresentable」。if のチェックが減り、バグが型エラーになる
- ID の取り違えを防ぐブランド型(`UserId` と `OrderId` を別の型に)も同じ発想 → [[TypeScript_06_型の操作(keyof・条件型・Mapped Types)]]

## オブジェクト指向との使い分け
| オブジェクト指向が向く | 関数型が向く |
| --- | --- |
| 状態とルールをまとめて守る(集約・エンティティ) | データの変換・計算・検証 |
| 実装の差し替え(インターフェース) | パイプライン(入力 → 加工 → 出力) |
| フレームワークがクラス前提 | React・Hono のハンドラ・ユーティリティ |
- TypeScript では**両方を混ぜて使う**のが普通。「状態を持つものは小さなクラス、残りは純粋な関数」くらいがちょうどいい

## 関連
- 前: [[ソフトウェア設計_03_デザインパターン(今でも使うもの)]] / 目次: [[ソフトウェア設計]]
- [[TypeScript]] / [[React]] / [[DDD_06_実務の注意(やりすぎ・TypeScript・AI開発)]]
- 参考: https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell , https://github.com/supermacro/neverthrow , https://effect.website/

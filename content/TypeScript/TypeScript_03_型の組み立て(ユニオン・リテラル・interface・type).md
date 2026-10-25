---
title: "TypeScript 03 型の組み立て(ユニオン・リテラル・interface・type)"
modified: 2026-09-29
---

## ユニオン型 `A | B`(どちらか)
```ts
let id: string | number
id = 'abc'   // OK
id = 123     // OK
```
- 使えるのは**全員に共通する操作だけ**。個別の操作は絞り込み後([[TypeScript_04_型の絞り込み(Narrowing)]])
- 「値があるか無いか」も `User | null` で表す

## リテラル型(特定の値そのもの)
```ts
type Status = 'draft' | 'published' | 'archived'
let s: Status = 'draft'
s = 'deleted'   // ❌ エラー(選択肢にない)

type Dice = 1 | 2 | 3 | 4 | 5 | 6
```
- **文字列リテラルのユニオン**は「選択肢」を表す定番。enum の代わりに使う
- `const` で宣言した値はリテラル型に推論される(`const a = 'x'` → 型は `'x'`)。`let` だと `string` に広がる

## インターセクション型 `A & B`(両方)
```ts
type Timestamps = { createdAt: Date; updatedAt: Date }
type Post = { title: string } & Timestamps   // title・createdAt・updatedAt を全部持つ
```

## 型エイリアス `type` とインターフェース `interface`
```ts
type User = {
  id: string
  name: string
}
interface User2 {
  id: string
  name: string
}
interface Admin extends User2 {   // 継承
  permissions: string[]
}
type Admin2 = User & { permissions: string[] }   // type ではインターセクションで拡張
```
| | `type` | `interface` |
| --- | --- | --- |
| 何に名前を付けられるか | **何でも**(ユニオン、タプル、関数、条件型…) | オブジェクトの形だけ |
| 拡張 | `&` | `extends` |
| 同名の再宣言 | 不可 | **マージされる**(宣言マージ。ライブラリの型拡張に使う) |
| エラー表示・性能 | ほぼ同じ | 大きな継承階層ではやや有利 |
→ **実務の目安**: チームで統一すればどちらでも可。ユニオンなどが必要な場面が多いので `type` 中心、ライブラリ拡張やクラスの契約に `interface`、という使い分けがよくある。

## タプル(長さと位置ごとの型が決まった配列)
```ts
const point: [number, number] = [10, 20]
const entry: [key: string, value: number] = ['age', 20]   // ラベル付き
const opt: [string, number?] = ['a']                       // 省略可能要素
const rest: [string, ...number[]] = ['sum', 1, 2, 3]       // 可変長
// React の useState の返り値もタプル: [値, 更新関数]
```

## enum の代わり
`enum` は TypeScript 独自で JS の構文ではない(実行時のオブジェクトを生成する)。最近は**避ける**傾向(Node の型除去実行でも使えない)。
```ts
// ✅ 推奨: 文字列リテラルのユニオン
type Role = 'admin' | 'member' | 'guest'

// ✅ 値の一覧も必要なら as const オブジェクト
const ROLE = { Admin: 'admin', Member: 'member', Guest: 'guest' } as const
type Role2 = (typeof ROLE)[keyof typeof ROLE]   // 'admin' | 'member' | 'guest'
```
(`as const` と `keyof typeof` の意味 → [[TypeScript_06_型の操作(keyof・条件型・Mapped Types)]])

## 関数の型・メソッド
```ts
type Fetcher = (url: string) => Promise<Response>
type Api = {
  get(path: string): Promise<unknown>        // メソッド記法
  post: (path: string, body: unknown) => Promise<unknown>   // プロパティ記法
}
```

## 関連
- 前: [[TypeScript_02_基本の型]] / 次: [[TypeScript_04_型の絞り込み(Narrowing)]]
- 出典: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html , https://www.typescriptlang.org/docs/handbook/2/objects.html

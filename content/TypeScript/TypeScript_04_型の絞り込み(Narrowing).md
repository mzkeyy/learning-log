---
title: "TypeScript 04 型の絞り込み(Narrowing)"
modified: 2026-10-04
---

`string | number` のようなユニオン型は、そのままだと共通の操作しかできない。**if や switch で条件分岐すると、その中では型が狭まる**。これを絞り込み(narrowing)と呼ぶ。TypeScript はコードの流れ(制御フロー)を追って型を自動で狭めてくれる。

## 基本の絞り込み
```ts
function format(value: string | number | null) {
  if (value === null) return '(なし)'           // === で null を除外
  if (typeof value === 'string') return value.trim()   // ここでは string
  return value.toFixed(2)                        // 残りは number
}
```

| 方法              | 例                        | 判定できるもの                                                                     |
| --------------- | ------------------------ | --------------------------------------------------------------------------- |
| `typeof`        | `typeof x === 'string'`  | string / number / boolean / bigint / symbol / undefined / function / object |
| 真偽値チェック         | `if (x)`                 | null / undefined / 空文字 / 0 を除外(**0 と '' も落ちる点に注意**)                         |
| 等価              | `x === 'a'`, `x != null` | リテラル、null と undefined(`!= null` で両方除外)                                      |
| `in`            | `'swim' in animal`       | そのプロパティを持つ型                                                                 |
| `instanceof`    | `e instanceof Error`     | クラスのインスタンス                                                                  |
| `Array.isArray` | `Array.isArray(x)`       | 配列                                                                          |

⚠️ `typeof null === 'object'`(JS の歴史的な仕様)。`typeof x === 'object'` だけでは null を除外できない。

## 早期 return で読みやすく
```ts
function getName(user: User | undefined) {
  if (!user) throw new Error('user がありません')
  return user.name   // 以降 user は User
}
```

## 判別可能ユニオン(Discriminated Union)★最重要パターン
共通のプロパティ(タグ)にリテラル型を持たせ、それで分岐する。
```ts
type Result =
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; message: string }

function render(r: Result) {
  switch (r.status) {
    case 'loading': return '読み込み中…'
    case 'success': return `${r.data.length}件`      // data にアクセスできる
    case 'error':   return `エラー: ${r.message}`    // message にアクセスできる
  }
}
```
- 「ありえない組み合わせ(success なのに message がある等)」を型で排除できる
- API レスポンス、画面の状態、アクション(Redux / useReducer)など至る所で使う

## 網羅チェック(exhaustiveness check)
選択肢を追加した時に**処理漏れをコンパイルエラーで教えてもらう**。
```ts
function assertNever(x: never): never {
  throw new Error(`想定外の値: ${JSON.stringify(x)}`)
}
function render(r: Result) {
  switch (r.status) {
    case 'loading': return '…'
    case 'success': return '…'
    case 'error':   return '…'
    default:        return assertNever(r)   // 全部処理済みなら r は never
  }
}
// Result に { status: 'empty' } を足すと、default で「'empty' は never に代入できない」エラー
```
- 返り値の型を明示し、`noImplicitReturns` を有効にしても漏れを検出できる

## ユーザー定義の型ガード(型述語 `x is T`)
```ts
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof value.id === 'string'
}
if (isUser(data)) data.id   // data は User
```
- `value is User` = 「true を返したら value は User だ」と TypeScript に教える
- ⚠️ 中身の判定が間違っていても TypeScript は信じる(嘘をつける)。複雑な検証は Zod に任せる
- TS 5.5 以降、`filter` などに渡す単純な関数は型述語が**自動推論**される:
```ts
const list = [1, null, 2].filter((x) => x !== null)   // number[](以前は (number | null)[])
```

## アサーション関数(`asserts x is T`)
```ts
function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error('string ではありません')
}
assertIsString(input)
input.toUpperCase()   // 以降 string
```

## 絞り込みが効かない・消える場面
- コールバックの中: 外で絞り込んだ `let` 変数は、関数の中では元の型に戻ることがある(後で書き換わる可能性があるため)。`const` に入れ直すと安定
- オブジェクトのプロパティ `obj.a` の絞り込みは、間に関数呼び出しを挟むと無効になる場合がある
- `catch (e)` の `e` は `unknown`(`useUnknownInCatchVariables`、strict に含まれる)→ `if (e instanceof Error) e.message`

## 関連
- 前: [[TypeScript_03_型の組み立て(ユニオン・リテラル・interface・type)]] / 次: [[TypeScript_05_ジェネリクス]]
- 出典: https://www.typescriptlang.org/docs/handbook/2/narrowing.html

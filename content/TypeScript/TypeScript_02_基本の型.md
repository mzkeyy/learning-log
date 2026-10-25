---
title: "TypeScript 02 基本の型"
modified: 2026-09-29
---

## プリミティブ型
```ts
const s: string = 'hello'
const n: number = 42          // 整数も小数も number
const b: boolean = true
const big: bigint = 100n      // 巨大な整数
const sym: symbol = Symbol('id')
const u: undefined = undefined
const nl: null = null
```
- 大文字の `String` `Number` `Boolean` は使わない(ラッパーオブジェクトの型)。常に小文字

## 配列
```ts
const nums: number[] = [1, 2, 3]
const names: Array<string> = ['a', 'b']   // 同じ意味(ジェネリクス記法)
const matrix: number[][] = [[1, 2], [3, 4]]
const ro: readonly string[] = ['x']        // 変更不可の配列
```
- 要素数と位置ごとの型が決まっているなら**タプル**([[TypeScript_03_型の組み立て(ユニオン・リテラル・interface・type)]])

## オブジェクト
```ts
const user: { id: number; name: string; email?: string } = { id: 1, name: '山田' }
//                                        ↑ ? = 省略可能(string | undefined)
```
- `readonly id: number` で書き換え禁止
- 余分なプロパティ: オブジェクトリテラルを**直接**代入すると余計なプロパティはエラー(過剰プロパティチェック)。変数を経由すると通る([[TypeScript_09_型システムの性質(構造的型付け・推論・satisfies)]])
- キーが決まっていない辞書: `Record<string, number>` や `{ [key: string]: number }`(インデックスシグネチャ)

## 関数
```ts
function greet(name: string, greeting = 'こんにちは'): string {
  return `${greeting}、${name}`
}
const add = (a: number, b: number): number => a + b

// 省略可能な引数・残余引数
function log(message: string, level?: 'info' | 'error') {}
function sum(...nums: number[]) { return nums.reduce((a, b) => a + b, 0) }

// 関数の型
type Handler = (event: MouseEvent) => void
// 非同期関数は Promise を返す
async function fetchUser(id: string): Promise<User> { /* ... */ }
```
- 引数には型注釈が必要(推論できないため)。ただしコールバックは文脈から推論される:
```ts
[1, 2, 3].map((n) => n * 2)   // n は number と推論(文脈的型付け)
```
- **オーバーロード**: 引数のパターンごとに返り値の型を変えたい時(多用しない。ユニオンやジェネリクスで済むことが多い)

## 特別な型
| 型 | 意味 | 使い所 |
| --- | --- | --- |
| `any` | 型チェックを**やめる**。何でも代入でき、何でもできる | **使わない**(移行中の一時しのぎのみ)。`noImplicitAny` で暗黙の any を禁止 |
| `unknown` | 何でも入るが、**絞り込むまで使えない** | 外部データ、`catch (e)` の e、型が分からない値 |
| `never` | 決して起こらない | 網羅チェック、常に throw する関数の返り値 |
| `void` | 返り値を使わない | 返り値のない関数 |
| `object` | プリミティブ以外 | ほぼ使わない |
| `{}` | null / undefined 以外の何でも | 使わない(紛らわしい) |

```ts
function parse(input: unknown) {
  // input.toUpperCase()          ❌ unknown のままでは使えない
  if (typeof input === 'string') {
    return input.toUpperCase()     // ✅ string に絞り込んだ後はOK
  }
}
```

## null と undefined
- `strictNullChecks`(strict に含まれる)が有効だと、`string` に `null` は入らない。入りうるなら `string | null` と明示
- 安全に扱う演算子:
```ts
user?.profile?.name          // オプショナルチェーン: 途中が null/undefined なら undefined
const n = input ?? 'default' // Null 合体: null/undefined の時だけ右側
user!.name                   // 非 null アサーション: 「絶対 null じゃない」と宣言(嘘だと実行時エラー。なるべく使わない)
```

## 関連
- 前: [[TypeScript_01_はじめに(なぜ型・導入・tscの流れ)]] / 次: [[TypeScript_03_型の組み立て(ユニオン・リテラル・interface・type)]]
- 出典: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html , https://www.typescriptlang.org/docs/handbook/2/functions.html

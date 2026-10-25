---
title: "TypeScript 05 ジェネリクス"
modified: 2026-09-29
---

**型を引数として受け取る仕組み**。「中身の型は使う時に決める」汎用的な関数・型を書ける。`Array<string>` や `Promise<User>` の `<>` がそれ。

## なぜ必要か
```ts
function first(arr: any[]): any { return arr[0] }         // ❌ 型情報が失われる
function first<T>(arr: T[]): T | undefined { return arr[0] }   // ✅
const a = first([1, 2, 3])        // number | undefined(T = number と推論)
const b = first(['x', 'y'])       // string | undefined
```
- `T` は「型の変数」。呼び出し時に**引数から自動推論**される(明示も可: `first<number>([...])`)
- 名前は慣習で `T`(Type)、`K`(Key)、`V`(Value)、`E`(Element)。意味のある名前 `TUser` でもよい

## ジェネリックな型
```ts
type ApiResponse<T> = { data: T; fetchedAt: Date }
type UserResponse = ApiResponse<User>

type Result<T, E = Error> =            // E に既定値
  | { ok: true; value: T }
  | { ok: false; error: E }

interface Box<T> { value: T }
```

## 制約(`extends`)
「T は何でもよいが、最低限これを持っていること」を指定。
```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b
}
longest('abc', 'de')        // OK(string は length を持つ)
longest([1, 2], [3])        // OK
longest(10, 20)             // ❌ number は length を持たない
```

## keyof と組み合わせる(定番)
```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
const user = { id: 1, name: '山田' }
getProp(user, 'name')    // string
getProp(user, 'age')     // ❌ 'age' は keyof user にない
```
(`keyof` と `T[K]` → [[TypeScript_06_型の操作(keyof・条件型・Mapped Types)]])

## 実務でよく見る形
```ts
// 非同期データ取得
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json() as Promise<T>   // ⚠️ 実行時の中身は保証されない → Zod で検証が安全
}
// React
const [user, setUser] = useState<User | null>(null)
const ref = useRef<HTMLInputElement>(null)
// 汎用コンポーネントの props
type ListProps<T> = { items: T[]; renderItem: (item: T) => React.ReactNode }
```

## 推論を調整する道具
- **const 型パラメータ**(TS 5.0): `function f<const T>(x: T)` で引数をリテラル型のまま推論(`as const` を呼び出し側に書かなくてよい)
```ts
function routes<const T extends readonly string[]>(paths: T) { return paths }
routes(['/', '/about'])   // readonly ['/', '/about']
```
- **`NoInfer<T>`**(TS 5.4): その引数からは T を推論させない
```ts
function createLight<C extends string>(colors: C[], defaultColor?: NoInfer<C>) {}
createLight(['red', 'green'], 'blue')   // ❌ 'blue' は候補にない
```

## 使いすぎない
- 型引数が1箇所でしか使われないなら不要なことが多い(`function f<T>(x: T): void` → `x: unknown` で十分)
- 読めないほど複雑なジェネリクスは、具体的な型を書いた方が保守しやすい
- 公式ハンドブックの指針: **型パラメータはできるだけ少なく、制約はできるだけ具体的でないもの(推論に任せる)に**

## 関連
- 前: [[TypeScript_04_型の絞り込み(Narrowing)]] / 次: [[TypeScript_06_型の操作(keyof・条件型・Mapped Types)]]
- 出典: https://www.typescriptlang.org/docs/handbook/2/generics.html , https://www.typescriptlang.org/docs/handbook/2/functions.html#guidelines-for-writing-good-generic-functions

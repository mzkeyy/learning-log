---
title: "TypeScript 06 型の操作(keyof・条件型・Mapped Types)"
modified: 2026-09-29
---

既存の型から新しい型を**計算して作る**機能群。自分で複雑に書く機会は多くないが、**ライブラリの型やエラーメッセージを読むために必要**。ユーティリティ型([[TypeScript_07_ユーティリティ型]])はすべてこれらで作られている。

## `typeof`(値から型を取り出す)
```ts
const config = { port: 3000, host: 'localhost' }
type Config = typeof config    // { port: number; host: string }

function createUser() { return { id: '1', name: '山田' } }
type User = ReturnType<typeof createUser>
```
- 型の世界の `typeof` は JS の `typeof`(実行時の文字列)とは別物。型の位置で使うと型を返す

## `keyof`(キーのユニオン)
```ts
type User = { id: string; name: string; age: number }
type UserKey = keyof User      // 'id' | 'name' | 'age'
```

## インデックスアクセス型 `T[K]`
```ts
type Name = User['name']                 // string
type IdOrAge = User['id' | 'age']        // string | number
type Item = Product[]['number']          // 配列の要素の型(Product)
type Values = User[keyof User]           // string | number(全値のユニオン)
```

## `as const`(リテラルのまま・readonly に固定)
```ts
const COLORS = ['red', 'green', 'blue'] as const
type Color = (typeof COLORS)[number]    // 'red' | 'green' | 'blue'

const ROLE = { Admin: 'admin', Member: 'member' } as const
type Role = (typeof ROLE)[keyof typeof ROLE]   // 'admin' | 'member'
```
→ **値の一覧(実行時に使う)と型を1箇所で定義**できる定番テク。

## 条件型(Conditional Types)`T extends U ? X : Y`
型レベルの三項演算子。
```ts
type IsString<T> = T extends string ? true : false
type A = IsString<'a'>   // true
type B = IsString<1>     // false
```
- **分配**: `T` がユニオンの時、各メンバーに個別に適用される
```ts
type ToArray<T> = T extends unknown ? T[] : never
type C = ToArray<string | number>   // string[] | number[]
type NonNull<T> = T extends null | undefined ? never : T   // = NonNullable
```
(分配させたくない時は `[T] extends [U]` と囲む)

## `infer`(条件型の中で型を取り出す)
```ts
type ElementOf<T> = T extends (infer E)[] ? E : never
type D = ElementOf<string[]>              // string

type Unwrap<T> = T extends Promise<infer V> ? V : T
type E = Unwrap<Promise<User>>            // User
// 組み込みの ReturnType / Parameters / Awaited もこの仕組み
```

## Mapped Types(キーを走査して型を作る)
```ts
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
type Flags<T> = { [K in keyof T]: boolean }

// 修飾子の除去: -? / -readonly
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type Concrete<T> = { [K in keyof T]-?: T[K] }

// キーの付け替え(as)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
type G = Getters<{ name: string }>   // { getName: () => string }
```

## テンプレートリテラル型
```ts
type Size = 'sm' | 'md' | 'lg'
type Color = 'primary' | 'danger'
type ButtonClass = `btn-${Color}-${Size}`   // 'btn-primary-sm' | ... 全6通り
type EventName = `on${Capitalize<'click' | 'focus'>}`   // 'onClick' | 'onFocus'
```
- 組み込みの文字列操作型: `Uppercase` / `Lowercase` / `Capitalize` / `Uncapitalize`
- ルーティングのパス(`/users/${string}`)、CSS クラス、イベント名などに使われる

## 読み方のコツ
- 複雑な型は**エディタでホバー**して展開結果を見る。見にくい時は `type Debug<T> = { [K in keyof T]: T[K] } & {}`(Prettify)で展開表示
- `type X = ...` を作って Playground で試す
- 自作するのは「繰り返しを減らせる・間違いを防げる」時だけ。型パズルに時間を使いすぎない

## 関連
- 前: [[TypeScript_05_ジェネリクス]] / 次: [[TypeScript_07_ユーティリティ型]]
- 出典: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html (keyof / typeof / Indexed Access / Conditional / Mapped / Template Literal Types)

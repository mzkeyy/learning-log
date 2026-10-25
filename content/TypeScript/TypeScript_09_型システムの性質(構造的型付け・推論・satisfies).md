---
title: "TypeScript 09 型システムの性質(構造的型付け・推論・satisfies)"
modified: 2026-09-29
---

「TypeScript の型がどう判定されるか」の考え方。ここを理解すると、エラーの理由が分かるようになる。

## 1. 構造的型付け(Structural Typing)
**名前ではなく、形(持っているプロパティ)で互換性を判断する**。
```ts
type Point = { x: number; y: number }
function draw(p: Point) {}

const pos = { x: 1, y: 2, label: 'A' }
draw(pos)            // ✅ x と y を持っているので OK(余分な label は問題ない)
```
- Java などの「名前的型付け」とは違い、`implements` を書かなくても形が合えば通る
- 名前で区別したい時(UserId と OrderId を混同させない)は**ブランド型**を使う([[TypeScript_11_実務パターン・よくあるエラー・AI開発]])

### 過剰プロパティチェック(例外)
オブジェクトリテラルを**直接**渡した時だけ、余計なプロパティをエラーにする(綴りミス検出のため)。
```ts
draw({ x: 1, y: 2, label: 'A' })   // ❌ 'label' は Point に存在しない
```

## 2. 代入可能性(部分型)
「A は B に代入できるか」= A が B の条件をすべて満たすか。
- `'hello'`(リテラル)→ `string` ✅、`string` → `'hello'` ❌
- `{ x, y, z }` → `{ x, y }` ✅(多い方が少ない方に入る)
- `never` はどこにでも入る、どんな型も `unknown` に入る
- `any` はチェックを無効にする(どこにでも入り、何でも入る)

## 3. 型推論
TypeScript は多くの型を自動で決める。
```ts
let a = 1            // number(let は「広がる」)
const b = 1          // 1(const はリテラルのまま)
const arr = [1, 'a'] // (string | number)[]
const obj = { kind: 'circle' }   // { kind: string }(プロパティは書き換え可能なので広がる)
```
- **広がり(widening)を防ぐ**: `as const` → `{ readonly kind: 'circle' }`
- **文脈的型付け**: コールバック引数やイベントハンドラは、渡す先の型から推論される
- 返り値の型は推論されるが、公開 API や複雑な関数では**明示すると**実装ミスがその場で分かる

## 4. 型を「決める」3つの書き方の違い ★
```ts
type Theme = Record<string, string>

const a: Theme = { primary: '#000' }             // 型注釈: Theme として扱う(a.primary は string、a.foo も通ってしまう)
const b = { primary: '#000' } as Theme           // 型アサーション: 「Theme だと信じて」(チェックが緩い・危険)
const c = { primary: '#000' } satisfies Theme    // satisfies: Theme を満たすか検査しつつ、推論された具体的な型を保つ
c.primary   // ✅ string
c.foo       // ❌ 存在しない(具体的な型が残っている)
```

| 書き方 | 検査 | 結果の型 | 使い所 |
| --- | --- | --- | --- |
| `: T`(注釈) | する | T に置き換わる | 普段使い |
| `satisfies T`(TS 4.9) | する | 推論された具体的な型のまま | 設定オブジェクト、定数表、ルート定義 |
| `as T`(アサーション) | ほぼしない | T | DOM 要素など TS より自分が確実に知っている時だけ |
| `as const` | — | リテラル+readonly | 定数の一覧 |

- `as` の乱用は型安全を壊す。`x as unknown as T`(二重アサーション)は危険信号
- 定番の組み合わせ: `const ROUTES = {...} as const satisfies Record<string, string>`

## 5. readonly と不変性
```ts
type Config = { readonly apiUrl: string }
function sum(nums: readonly number[]) {}       // 配列を変更しないと宣言(呼び出し側も安心)
type Frozen = Readonly<Config>
```
- readonly は**型チェック時だけ**。実行時に凍結したいなら `Object.freeze`
- 浅い(ネストした中身までは readonly にならない)

## 6. 健全性(soundness)の穴を知る
TypeScript は実用性を優先し、完全に安全ではない。代表的な穴:
- `any` / `as` / `!`(非 null アサーション)
- 配列・辞書のインデックスアクセス `arr[10]` は既定で `undefined` を含まない → **`noUncheckedIndexedAccess: true`** で `T | undefined` に
- `JSON.parse` / `res.json()` の返り値は `any`(実行時の検証が必要)
- 型ガード関数の中身が間違っていても信じる
- メソッド引数の双変性(`strictFunctionTypes` でも、メソッド記法の引数はゆるく判定される)

## 7. 型エラーを抑制するコメント
```ts
// @ts-expect-error  次の行がエラーになるはず(ならなければそれ自体がエラー)← テストや既知の問題に
// @ts-ignore        次の行のエラーを無視(理由が消えても気づけない)← 使わない
```

## 関連
- 前: [[TypeScript_08_クラス・モジュール・型定義ファイル]] / 次: [[TypeScript_10_tsconfig・strict・実行環境・バージョン]]
- 出典: https://www.typescriptlang.org/docs/handbook/type-compatibility.html , https://www.typescriptlang.org/docs/handbook/type-inference.html , https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html

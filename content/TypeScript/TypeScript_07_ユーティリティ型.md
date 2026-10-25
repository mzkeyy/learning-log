---
title: "TypeScript 07 ユーティリティ型"
modified: 2026-09-29
---

TypeScript に最初から入っている「型を変形する道具」。import 不要でどこでも使える。

例に使う型:
```ts
type User = { id: string; name: string; email?: string; age: number }
```

## オブジェクトを変形する
| 型 | 効果 | 例・使い所 |
| --- | --- | --- |
| `Partial<T>` | 全部を省略可能に | 更新処理の入力 `update(id, patch: Partial<User>)` |
| `Required<T>` | 全部を必須に | 既定値を埋めた後の設定 |
| `Readonly<T>` | 全部を読み取り専用に | 変更させたくない state・設定 |
| `Pick<T, K>` | 指定したキーだけ残す | `Pick<User, 'id' \| 'name'>` 一覧表示用 |
| `Omit<T, K>` | 指定したキーを除く | `Omit<User, 'id'>` 新規作成の入力(id はサーバーが付ける) |
| `Record<K, V>` | キー K・値 V のオブジェクト | `Record<Status, string>` ステータスごとのラベル |

```ts
type Status = 'draft' | 'published'
const LABEL: Record<Status, string> = { draft: '下書き', published: '公開' }
// Status に 'archived' を足すと、LABEL に書き漏れがあるとエラー → 網羅性が保てる
```
⚠️ `Omit` は存在しないキーを指定してもエラーにならない(綴り間違いに注意)。

## ユニオンを変形する
| 型 | 効果 | 例 |
| --- | --- | --- |
| `Exclude<U, X>` | U から X に当てはまるものを除く | `Exclude<'a' \| 'b' \| 'c', 'a'>` → `'b' \| 'c'` |
| `Extract<U, X>` | U から X に当てはまるものだけ | `Extract<Result, { status: 'error' }>` |
| `NonNullable<T>` | null と undefined を除く | `NonNullable<string \| null>` → `string` |

## 関数から取り出す
| 型 | 効果 |
| --- | --- |
| `ReturnType<F>` | 関数の返り値の型 |
| `Parameters<F>` | 引数の型(タプル) |
| `ConstructorParameters<C>` / `InstanceType<C>` | クラスのコンストラクタ引数 / インスタンスの型 |
| `Awaited<T>` | Promise を剥がした中身(入れ子も) |
| `ThisParameterType` / `OmitThisParameter` / `ThisType` | `this` 関連(使用頻度は低い) |

```ts
async function getUser() { return { id: '1', name: '山田' } }
type U = Awaited<ReturnType<typeof getUser>>   // { id: string; name: string }
type Args = Parameters<typeof setTimeout>      // setTimeout の引数タプル
```

## その他
| 型 | 効果 |
| --- | --- |
| `NoInfer<T>` | その位置から型推論させない(TS 5.4) |
| `Uppercase` / `Lowercase` / `Capitalize` / `Uncapitalize` | 文字列リテラル型の変換 |

## 組み合わせの実例
```ts
// 新規作成フォーム: id を除き、email 以外は必須
type CreateUserInput = Omit<User, 'id'>
// 更新: id は必須、他は任意
type UpdateUserInput = Pick<User, 'id'> & Partial<Omit<User, 'id'>>
// コンポーネントの props を他から流用
type ButtonProps = React.ComponentProps<'button'> & { variant?: 'primary' | 'ghost' }
```

## 型をどこから作るか(信頼できる情報源を1つに)
- DB スキーマ(Drizzle / Prisma)や Zod スキーマ、GraphQL Codegen から**型を生成・導出**し、手書きの重複を減らす
- 例: `type User = z.infer<typeof UserSchema>` / `typeof users.$inferSelect`(Drizzle)
- 関連: [[GraphQL_05_実装ガイド(Codegen・Apollo・Relay・gql.tada)]](Codegen で型を生成)

## 関連
- 前: [[TypeScript_06_型の操作(keyof・条件型・Mapped Types)]] / 次: [[TypeScript_08_クラス・モジュール・型定義ファイル]]
- 出典: https://www.typescriptlang.org/docs/handbook/utility-types.html

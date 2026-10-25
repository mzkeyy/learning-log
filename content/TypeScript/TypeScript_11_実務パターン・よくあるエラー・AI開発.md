---
title: "TypeScript 11 実務パターン・よくあるエラー・AI 開発"
modified: 2026-09-29
---

## 1. 外部データは実行時に検証する(Zod)
型は実行時に消えるので、API レスポンス・フォーム入力・環境変数・JSON は**実行時に中身を確かめる**。スキーマ1つから「検証」と「型」の両方を得る。
```ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.email().optional(),
})
type User = z.infer<typeof UserSchema>     // 型はスキーマから導出(二重管理しない)

const res = await fetch('/api/user')
const parsed = UserSchema.safeParse(await res.json())
if (!parsed.success) throw new Error('不正なレスポンス')
parsed.data.name   // 型安全
```
- フォーム: React Hook Form + Zod([[shadcn-ui]] の Field)
- サーバー関数の入力: TanStack Start の `.validator()`、Next.js の Server Actions でも必ず検証([[Next.js]])
- 環境変数: 起動時に Zod で検証すると設定漏れにすぐ気づける

## 2. ブランド型(同じ string でも混同させない)
```ts
type UserId = string & { readonly __brand: 'UserId' }
type OrderId = string & { readonly __brand: 'OrderId' }
const toUserId = (s: string) => s as UserId   // 検証した場所でだけ作る

function getOrder(id: OrderId) {}
getOrder(toUserId('u1'))   // ❌ UserId は OrderId に入らない
```
- Zod なら `z.string().brand<'UserId'>()`

## 3. エラーを値として返す(`T | Error` / Result 型)
throw は型に現れないので、呼び出し側が処理を忘れやすい。**失敗の可能性を返り値の型に出す**。
```ts
async function findUser(id: UserId): Promise<User | Error> {
  const row = await db.find(id)
  if (!row) return new Error('ユーザーが見つかりません')
  return row
}
const user = await findUser(id)
if (user instanceof Error) return showError(user.message)   // 処理しないと User として使えない
user.name
```
- 判別可能ユニオン版: `{ ok: true; value: T } | { ok: false; error: E }`

## 4. 状態は判別可能ユニオンで
```ts
type State =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; data: User }
  | { type: 'error'; error: string }
// ❌ { isLoading: boolean; data?: User; error?: string } は「loading かつ error」のような矛盾を許す
```

## 5. React / Next.js でよく使う型
```tsx
type Props = { title: string; children: React.ReactNode; onClick?: () => void }
export function Card({ title, children }: Props) { /* ... */ }

// HTML 要素の props を継承
type ButtonProps = React.ComponentProps<'button'> & { variant?: 'primary' | 'ghost' }

// イベント
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)
const onSubmit = (e: React.FormEvent<HTMLFormElement>) => e.preventDefault()

// Next.js App Router(16 系): params / searchParams は Promise
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```
- Next.js は `PageProps<'/users/[id]'>` などルートから生成される型ヘルパーも提供
- TanStack Router / Start はルートやパラメータの型が**自動で推論**される([[TanStack Start]])

## 6. よくあるエラーの読み方
| エラー(英語の要旨) | 意味 | 典型的な直し方 |
| --- | --- | --- |
| Type 'X' is not assignable to type 'Y' | X を Y の場所に入れられない | エラーの**最後の行**(一番深い理由)を読む。型定義か値を修正 |
| Property 'x' does not exist on type 'Y' | そのプロパティは無い | 綴り確認 / ユニオンなら絞り込み / 型定義に追加 |
| Object is possibly 'undefined' / 'null' | null の可能性を処理していない | `if` で除外、`?.`、`??` |
| Argument of type 'X' is not assignable to parameter of type 'Y' | 引数の型違い | 渡す値か関数の型を確認 |
| Parameter 'x' implicitly has an 'any' type | 引数に型が無い | 型注釈を付ける |
| Cannot find module 'x' or its corresponding type declarations | 型定義が見つからない | `npm i -D @types/x`、tsconfig の `types` / `paths` を確認 |
| Cannot find name 'process' / 'describe' | グローバル型が無い | `@types/node` 等を入れ `"types": [...]` に追加(TS 6 以降特に多い) |
| Type instantiation is excessively deep | 型が複雑すぎる | ジェネリクスを単純化、明示的な型注釈で推論を止める |
| Not all code paths return a value | 返さない分岐がある | 全分岐で return / 網羅チェック |

- エラーの**エラーコード(TS2322 など)**で検索すると解説が見つかりやすい
- エディタでホバー → 期待された型と実際の型を比べる

## 7. AI(Claude Code / Codex)で開発する時のコツ
- **型チェックを「完了条件」にする**: 「`npx tsc --noEmit` とテストが通るまで直して」と頼む。CLAUDE.md / AGENTS.md にコマンドを書いておく([[Claude Code]] / [[Codex]])
- **AI がやりがちな型のごまかしを見張る**: `any`、`as`、`as unknown as`、`!`、`@ts-ignore`、`eslint-disable`。レビューで検索し、あれば理由を聞く。ESLint(typescript-eslint)の `no-explicit-any` などで機械的に禁止するのが確実
- **型を先に決めてから実装させる**: 「まず型(データの形)を提案して」→ 合意 → 実装。型は設計図なので、AI への指示としても伝わりやすい
- **型を生成できるものは生成**: DB(Drizzle / Prisma)、Zod、GraphQL Codegen、`wrangler types`。手書きの型は AI も人も間違える
- **型が通っても動作は別**: 実行時検証とテストを併用する

## 8. 学び方のロードマップ
1. 基本の型・ユニオン・絞り込み(01〜04)で日常のコードは書ける
2. ジェネリクスとユーティリティ型(05・07)でライブラリの型が読める
3. 型の操作(06)は「読める」を目標に、必要になったら書く
4. strict + `noUncheckedIndexedAccess` の環境でエラーを1つずつ直すのが最良の練習
- 練習: TS Playground、公式 Handbook、type-challenges(型パズル。やりすぎ注意)

## 関連
- 前: [[TypeScript_10_tsconfig・strict・実行環境・バージョン]] / 目次: [[TypeScript]]
- 出典: https://zod.dev , https://www.typescriptlang.org/docs/handbook/2/narrowing.html , https://nextjs.org/docs/app/api-reference/config/typescript

---
title: "Zod 01 基本(スキーマ・parse・型推論)"
modified: 2026-11-01
---

## インストール
```sh
npm i zod
```
```ts
import * as z from "zod";   // v4 の推奨の書き方
```
- 依存なし。Node・ブラウザ・Cloudflare Workers・Bun・Deno のどこでも動く
- `tsconfig.json` は `"strict": true` が前提(ないと型推論が正しくならない)

## スキーマ = データの形の定義
```ts
const Player = z.object({
  username: z.string(),
  xp: z.number(),
});
```
- スキーマは**イミュータブル**。`.min(1)` などは元を変えず、新しいスキーマを返す
- アプリで共通に使う形は1か所(`schemas/user.ts` など)に置いて import する

## parse と safeParse
| メソッド | 成功 | 失敗 | 使う場面 |
| --- | --- | --- | --- |
| `.parse(値)` | データを返す | **`ZodError` を投げる** | 失敗したら止めてよい(設定の読み込み、想定外の API レスポンス) |
| `.safeParse(値)` | `{ success: true, data }` | `{ success: false, error }` | **失敗をふつうに扱う**(フォームの入力、API のリクエスト) |
| `.parseAsync` / `.safeParseAsync` | 同上 | 同上 | 非同期の `refine` / `transform` があるとき(なしで呼ぶとエラー) |
```ts
Player.parse({ username: "billie", xp: 100 });  // → { username: "billie", xp: 100 }
Player.parse({ username: 42 });                 // → ZodError を投げる

const result = Player.safeParse(input);
if (!result.success) {
  result.error.issues;   // 何がどう違ったかの一覧 → 04
  return;
}
result.data.xp;          // ここでは number と分かっている
```
- 戻り値は**入力のコピー**(確かめた結果)。入力そのものではない
- `z.object` は**定義にない項目を取り除いて**返す(エラーにはしない)→ 02

## 型を取り出す(z.infer)
```ts
const User = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["admin", "member"]),
  bio: z.string().optional(),
});

type User = z.infer<typeof User>;
// { id: string; name: string; role: "admin" | "member"; bio?: string | undefined }
```
- **スキーマを正本にして、型はそこから作る**(型とスキーマを両方手で書くと、ずれる)
- スキーマと型を同じ名前にしてよい(値と型は別の名前空間)

### 入力と出力で型が違うとき
変換(`transform`)や既定値(`default`)があると、受け取る前と後で型が変わる。
```ts
const Schema = z.object({
  count: z.string().transform((s) => s.length),   // 文字列を受け取り、数値にして返す
  tags: z.array(z.string()).default([]),
});

type In = z.input<typeof Schema>;    // { count: string; tags?: string[] | undefined }
type Out = z.output<typeof Schema>;  // { count: number; tags: string[] }(= z.infer)
```
- フォームの初期値の型には `z.input`、検証後のデータには `z.infer` を使う

## よくある使い方の形
```ts
// 1. API のレスポンスを確かめる
const Todo = z.object({ id: z.number(), title: z.string(), completed: z.boolean() });

async function getTodo(id: number) {
  const res = await fetch(`https://api.example.com/todos/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Todo.parse(await res.json());   // 形が変わったらここで気づける
}

// 2. 関数の入口で確かめる
const CreateUserInput = z.object({ name: z.string().min(1), email: z.email() });

export async function createUser(input: unknown) {     // 外からの値は unknown で受ける
  const data = CreateUserInput.parse(input);
  return db.insert(users).values(data);
}

// 3. 型を守る関数(type guard)として使う
function isTodo(v: unknown): v is z.infer<typeof Todo> {
  return Todo.safeParse(v).success;
}
```

## v3 から変わったところ(よく見かける古い書き方)
| v3 | v4 |
| --- | --- |
| `import { z } from "zod"` | `import * as z from "zod"`(前の書き方も動く) |
| `z.string().email()` / `.url()` / `.uuid()` | **`z.email()`** / `z.url()` / `z.uuid()`(前の書き方は非推奨) |
| `{ message: "..." }` | **`{ error: "..." }`**(`message` も動くが非推奨) |
| `error.flatten()` / `error.format()` | **`z.flattenError(error)`** / `z.treeifyError(error)` |
| `errorMap` | `error` に関数を渡す |
| `.strict()` / `.passthrough()` | `z.strictObject()` / `z.looseObject()` |
| `.merge(other)` | `.extend(other.shape)` |
| `z.nativeEnum(Enum)` | `z.enum(Enum)` |
- v3 も `import * as z from "zod/v3"` で使える(古いライブラリとの共存用)

## 関連
- 次: [[Zod_02_スキーマの種類(文字列・数値・オブジェクト・配列・union)]]
- [[Zod]] / [[TypeScript_11_実務パターン・よくあるエラー・AI開発]]
- 公式: https://zod.dev/basics , https://zod.dev/v4/changelog

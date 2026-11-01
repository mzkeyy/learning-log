---
title: "Zod 05 実務(フォーム・API・環境変数・JSON Schema・AI)"
modified: 2026-11-01
---

## スキーマの置き場所
```
src/schemas/
├── user.ts       # User と、そこから作った CreateUser / UpdateUser
├── todo.ts
└── env.ts        # 環境変数
```
- **フロントとサーバーで同じスキーマを使う**(ブラウザでは親切のための即時チェック、サーバーで本当の検証)
- サーバー専用の検証(DB で重複確認など)は、共有スキーマに `.refine()` を足してサーバー側だけで使う

## フォーム
### サーバーで検証する(React Router・Next.js の Server Actions)
```ts
const result = CreateUser.safeParse(Object.fromEntries(formData));
if (!result.success) {
  return { errors: z.flattenError(result.error).fieldErrors };   // 欄ごとのエラー
}
await createUser(result.data);
```
- フォームの値は**全部文字列**: 数値は `z.coerce.number()`、チェックボックスは `z.stringbool()`、空欄の扱いに注意 → [[Zod_03_変換と検証のカスタマイズ(refine・transform・coerce・codec)]]
- 同じ名前の値が複数ある(複数選択)なら `formData.getAll("tags")`
- 例 → [[React Router_06_実務(Zod検証・テスト・デプロイ・v8移行・AI開発)]] / [[Next.js_05_データ更新(Server Actions・フォーム)]]

### ブラウザで検証する(React Hook Form)
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm<z.input<typeof CreateUser>, unknown, z.output<typeof CreateUser>>({
  resolver: zodResolver(CreateUser),
  defaultValues: { name: "", email: "" },
});
```
→ [[shadcn-ui_05_フォーム(Field・React Hook Form・Zod)]]

## API
### サーバー(リクエストを確かめる)
```ts
// Hono: 確かめた値だけが c.req.valid() から取れる
import { zValidator } from "@hono/zod-validator";

app.post("/todos", zValidator("json", CreateTodo), async (c) => {
  const body = c.req.valid("json");   // 型付き・検証済み
  return c.json(await addTodo(body), 201);
});
```
→ [[Hono_04_バリデーションとRPC(Zod・hc)]] / [[REST]]

### クライアント(レスポンスを確かめる)
```ts
const Weather = z.object({ temp: z.number(), city: z.string() });

export async function getWeather(city: string) {
  const res = await fetch(`https://api.example.com/weather?city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const result = Weather.safeParse(await res.json());
  if (!result.success) {
    console.error("API の形が変わった", z.prettifyError(result.error));   // 早く気づける
    throw new Error("Unexpected response");
  }
  return result.data;
}
```
- 外部 API は**使う項目だけ**スキーマに書く(`z.object` は知らない項目を捨てるので、増えても壊れない)

## 環境変数
```ts
// src/env.ts — 起動時に1回だけ検証し、足りなければすぐ落とす
import * as z from "zod";

export const env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
  ENABLE_SIGNUP: z.stringbool().default(false),   // "true" / "false"
}).parse(process.env);

// 使う側: process.env ではなく env を import(型が付き、存在も保証される)
```
- 本番で「環境変数を入れ忘れて、夜中に初めて落ちる」を防ぐ → [[APIキー・シークレット管理]]
- ブラウザに出す値(`VITE_` / `NEXT_PUBLIC_`)とサーバーだけの値は**スキーマを分ける**

## JSON Schema との変換
```ts
const SearchArgs = z.object({
  query: z.string().meta({ description: "検索するキーワード" }),
  limit: z.int().min(1).max(50).default(10),
});

z.toJSONSchema(SearchArgs);
// { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object",
//   "properties": { "query": { "type": "string", "description": "検索するキーワード" }, ... },
//   "required": ["query"], "additionalProperties": false }

z.fromJSONSchema({ type: "object", properties: { n: { type: "number" } }, required: ["n"] });  // 逆向き(4.6)
```
- 使い道: OpenAPI の仕様書、AI のツール定義・構造化出力、設定ファイルのエディタ補完
- `.meta({ description, title, examples })` で説明を付けると JSON Schema にも出る
- `transform` など JSON Schema で表せないものは変換できない(エラー、または入力側の形を出す設定)

## AI と使う
```ts
// ツールの引数・構造化出力の形を Zod で書き、モデルの出力を確かめる
const Extract = z.object({
  name: z.string().meta({ description: "人の名前" }),
  date: z.iso.date().meta({ description: "YYYY-MM-DD" }),
  amount: z.number(),
});
const parsed = Extract.safeParse(JSON.parse(modelOutput));   // AI の出力も「外から来たデータ」
```
- Claude の SDK(`betaZodTool`)・AI SDK・MCP の TypeScript SDK は Zod のスキーマをそのまま受け取れる → [[AIアプリ開発_03_ツール使用と構造化出力]] / [[AIアプリ開発_08_MCPサーバーを作る(TypeScript SDK・stdio・HTTP)]]
- `description` は**モデルへの説明書**。何を入れるか具体的に書くほど精度が上がる

## Standard Schema(ライブラリをまたぐ共通の形)
- Zod・Valibot・ArkType などが共通で持つ `~standard` という口。受け取る側(Hono・TanStack Form・tRPC・TanStack Router など)は**どのライブラリのスキーマでも同じように扱える**
- 自分でライブラリを作るなら、Zod 専用にせず Standard Schema で受け取ると使う人が選べる

## 性能とサイズ
| 方法 | 内容 |
| --- | --- |
| `z.compile(schema)`(4.6) | 事前にコンパイルして**検証を速く**(公式のベンチマークで中央値 2.4 倍、大きな配列・オブジェクトで約 9 倍)。速くしたい箇所だけに |
| `import "zod/compile"` | 以降に作るスキーマを全部コンパイル |
| `zod/mini` | 関数を組み合わせる書き方で**ブラウザ用のサイズを小さく**(`z.string().check(z.minLength(1))`) |
- `z.compile` は内部で `new Function` を使う。CSP で禁止されている環境では `z.config({ jitless: true })`(自動で無効になる)
- スキーマは**関数の外で1回だけ作る**(リクエストのたびに `z.object(...)` を作らない)

## よくある落とし穴
| 落とし穴 | 対策 |
| --- | --- |
| `z.coerce.number()` が空欄を 0 にする | `preprocess` で `""` → `undefined`、または `z.string().min(1).pipe(z.coerce.number())` |
| `z.coerce.boolean()` が `"false"` を true にする | `z.stringbool()` |
| `z.url()` が `javascript:alert(1)` を通す | リンクに使うなら `z.httpUrl()` → [[Webセキュリティ対策]] |
| 余計な項目が黙って消える(打ち間違いに気づかない) | 受け取る側を厳しくしたいなら `z.strictObject` |
| `z.record(z.enum([...]), ...)` で全部のキーが必須 | 一部だけなら `z.partialRecord` |
| `parse` を非同期の refine に使ってエラー | `parseAsync` / `safeParseAsync` |
| 型とスキーマを別々に書いて、ずれる | 型は `z.infer` で作る |
| AI が v3 の書き方(`z.string().email()`・`message`・`.flatten()`)を書く | 版を伝え、型チェックで気づく |
- 検証は**信頼できない境界**(ユーザー入力・外部 API・ファイル・AI の出力・環境変数)でだけ行う。アプリの内側で何度も確かめなくてよい

## 関連
- 前: [[Zod_04_エラー処理(メッセージ・日本語化・flatten・treeify)]]
- [[Zod]] / [[React Router]] / [[Hono]] / [[AIアプリ開発]] / [[TypeScript_11_実務パターン・よくあるエラー・AI開発]]
- 公式: https://zod.dev/json-schema , https://zod.dev/metadata , https://zod.dev/compile , https://zod.dev/packages/mini , https://standardschema.dev/

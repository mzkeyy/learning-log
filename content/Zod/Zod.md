---
title: "Zod"
modified: 2026-11-01
---

**「データの形(スキーマ)」を1回書くと、実行時の検証と TypeScript の型の両方が手に入る**ライブラリ。フォームの入力・API のリクエスト・環境変数・AI の出力など、**外から来るデータ**を安全に扱うために使う。

公式ドキュメント(zod.dev、**2026年11月時点。Zod 4.6**)を読み、実際にコードを動かして確かめて整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[Zod_01_基本(スキーマ・parse・型推論)]] | なぜ要るか、`parse` と `safeParse`、`z.infer`、インストール |
| 02 | [[Zod_02_スキーマの種類(文字列・数値・オブジェクト・配列・union)]] | よく使う型、オブジェクトの組み立て(`pick`・`extend` など)、union |
| 03 | [[Zod_03_変換と検証のカスタマイズ(refine・transform・coerce・codec)]] | 独自ルール、値の変換、文字列からの変換、既定値 |
| 04 | [[Zod_04_エラー処理(メッセージ・日本語化・flatten・treeify)]] | エラーの中身、メッセージの変え方、日本語化、フォーム向けの形 |
| 05 | [[Zod_05_実務(フォーム・API・環境変数・JSON Schema・AI)]] | 使う場所ごとの書き方、JSON Schema、Standard Schema、性能、AI |

## なぜ要るか
```
TypeScript の型 … コンパイル時だけ。実行時には消える(外から来た値は確かめられない)
Zod のスキーマ … 実行時に確かめる + そこから型も作れる
```
```ts
// 型だけだと、API が違う形を返しても気づけない
const user = (await res.json()) as User;   // 「User のはず」と言っているだけ

// Zod なら実際に確かめる。違えばここで止まる
const user = User.parse(await res.json()); // User 型が付き、中身も保証される
```
→ [[TypeScript_11_実務パターン・よくあるエラー・AI開発]] / [[静的型付言語]]

## 最小の例
```ts
import * as z from "zod";

const User = z.object({
  name: z.string().min(1),
  email: z.email(),
  age: z.number().int().min(0).optional(),
});

type User = z.infer<typeof User>;
// { name: string; email: string; age?: number | undefined }

const result = User.safeParse({ name: "太郎", email: "taro@example.com" });
if (result.success) {
  result.data.name;   // 型が付いた、確かめ済みのデータ
} else {
  console.log(z.prettifyError(result.error));
}
```

## どこで使うか
| 場所 | 何を確かめる | 例 |
| --- | --- | --- |
| フォーム | 入力値 | React Router の action、Server Actions、React Hook Form → [[React Router_06_実務(Zod検証・テスト・デプロイ・v8移行・AI開発)]] |
| API サーバー | リクエストの本文・クエリ | Hono の `zValidator` → [[Hono_04_バリデーションとRPC(Zod・hc)]] |
| API クライアント | 外部 API のレスポンス | `Schema.parse(await res.json())` |
| 設定 | 環境変数 | 起動時に `process.env` を検証 |
| AI | 構造化出力・ツールの引数 | AI SDK・MCP の `inputSchema` → [[AIアプリ開発_03_ツール使用と構造化出力]] |
| DB | 入出力の形 | Drizzle の `drizzle-zod` / `createInsertSchema` → [[PostgreSQLとDrizzle]] |

## 似た道具
| | Zod | Valibot | ArkType |
| --- | --- | --- | --- |
| 書き方 | メソッドをつなぐ(`z.string().min(1)`) | 関数を組み合わせる(`v.pipe(v.string(), v.minLength(1))`) | TS の型のような文字列(`"string > 0"`) |
| サイズ | 普通(小さい版 `zod/mini` もある) | とても小さい | 普通 |
| 情報量・対応ライブラリ | **一番多い** | 多い | 少なめ |
- 3つとも **Standard Schema** に対応しているので、受け取る側(Hono・TanStack Form・tRPC など)はどれでも使える → 05
- 迷ったら **Zod**(資料が多く、AI も正確に書ける)

## 押さえどころ(2026年11月時点)
- 最新は **Zod 4**(2025年7月に v4、今は 4.6)。v3 から書き方が一部変わった: `z.string().email()` → **`z.email()`**、`message` → **`error`**、`.flatten()` → **`z.flattenError()`**
- import は `import * as z from "zod"`(v3 は `import { z } from "zod"` が多かった)
- **`z.object` は知らない項目を黙って捨てる**(エラーにしない)。エラーにしたいなら `z.strictObject`
- `z.coerce.number()` は**空文字を 0 にする**、`z.url()` は `javascript:` も通す → 03 / 05
- 4.6 で `z.compile()`(事前コンパイルで検証を数倍速く)が入った → 05
- AI に書かせると v3 の書き方が混ざりやすい。`package.json` の版を伝える

## 関連
- [[TypeScript]] / [[React Router]] / [[Hono]] / [[shadcn-ui_05_フォーム(Field・React Hook Form・Zod)]] / [[AIアプリ開発]]
- 公式: https://zod.dev/ , https://zod.dev/api , https://zod.dev/v4/changelog

---
title: "Zod 04 エラー処理(メッセージ・日本語化・flatten・treeify)"
modified: 2026-11-01
---

## エラーの中身(issues)
```ts
const User = z.object({
  name: z.string().min(1, { error: "名前は必須です" }),
  email: z.email(),
  age: z.coerce.number().int().min(0).optional(),
});

const r = User.safeParse({ name: "", email: "x", age: "abc" });
r.error.issues;
// [
//   { code: "too_small",      path: ["name"],  message: "名前は必須です", ... },
//   { code: "invalid_format", path: ["email"], message: "Invalid email address", ... },
//   { code: "invalid_type",   path: ["age"],   message: "Invalid input: expected number, received NaN", ... },
// ]
```
| 項目 | 意味 |
| --- | --- |
| `code` | 種類(`invalid_type`・`too_small`・`too_big`・`invalid_format`・`unrecognized_keys`・`custom` など) |
| `path` | どこの値か(`["items", 0, "price"]` のように入れ子も) |
| `message` | 表示用の文 |
| `input` | 実際の値(**ログに出すとき、パスワードなどに注意**) |
- **最初の1つで止まらず、全部のエラーを集めて**返す(フォームで全部の欄に一度に出せる)

## メッセージを変える
```ts
z.string().min(1, "必須です")                       // 文字列で
z.string().min(1, { error: "必須です" })            // オブジェクトで(v4 の基本)
z.email({ error: "メールアドレスの形が違います" })

// 状況で変える(関数)
z.string({
  error: (issue) => issue.input === undefined ? "必須です" : "文字列にしてください",
});
```
| 優先順位 | 設定する場所 |
| --- | --- |
| 1 | スキーマごとの `error` |
| 2 | `parse(値, { error: ... })` で渡したもの |
| 3 | `z.config({ customError: ... })`(アプリ全体) |
| 4 | ロケール(言語設定)の既定のメッセージ |

## 日本語にする
```ts
import * as z from "zod";
z.config(z.locales.ja());   // アプリの起動時に1回

z.email().safeParse("x").error.issues[0].message;   // "無効なメールアドレス"
```
- 60 以上の言語が入っている。既定は英語(`z.locales.en()`)
- 既定の文は「無効な〜」のように機械的なので、**ユーザーに見せる文は項目ごとに `error` で書く**のがおすすめ(「メールアドレスを入力してください」など)

## 形を変えて使う
| 関数 | 形 | 向く場面 |
| --- | --- | --- |
| `z.flattenError(err)` | `{ formErrors: [], fieldErrors: { name: ["..."] } }` | **平らなフォーム**(1段のオブジェクト) |
| `z.treeifyError(err)` | `{ errors: [], properties: { name: { errors: [...] } } }` | 入れ子のオブジェクト・配列 |
| `z.prettifyError(err)` | 読みやすい文字列 | ログ・CLI・開発中の確認 |
```ts
z.flattenError(r.error);
// {
//   formErrors: [],                         // 特定の項目に属さないエラー(refine で path なし)
//   fieldErrors: {
//     name:  ["名前は必須です"],
//     email: ["Invalid email address"],
//     age:   ["Invalid input: expected number, received NaN"],
//   }
// }

console.log(z.prettifyError(r.error));
// ✖ 名前は必須です
//   → at name
// ✖ Invalid email address
//   → at email
// ...
```

## フォームでの表示の例
```tsx
// サーバー(action)
const result = Schema.safeParse(Object.fromEntries(formData));
if (!result.success) {
  return data({ errors: z.flattenError(result.error).fieldErrors }, { status: 400 });
}

// 画面
<input name="email" aria-invalid={!!errors?.email} aria-describedby="email-error" />
{errors?.email && <p id="email-error" role="alert">{errors.email[0]}</p>}
```
- 欄ごとに最初の1つだけ出すのがふつう(`[0]`)
- `aria-invalid` と `aria-describedby` を付けると、スクリーンリーダーでもエラーが分かる → [[Webパフォーマンスとアクセシビリティ]]
- React Router の例 → [[React Router_06_実務(Zod検証・テスト・デプロイ・v8移行・AI開発)]]

## API でのエラーレスポンス
```ts
// Hono の例: 400 と、項目ごとのエラーを返す
const result = Body.safeParse(await c.req.json());
if (!result.success) {
  return c.json({
    title: "入力が正しくありません",
    status: 400,
    errors: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
  }, 400);
}
```
- 形を揃えると(Problem Details など)クライアントが扱いやすい → [[REST]]
- `input`(送られた値)をそのまま返したりログに出したりしない(パスワード・個人情報)

## parse で投げられたエラーを受ける
```ts
try {
  Config.parse(raw);
} catch (e) {
  if (e instanceof z.ZodError) {
    console.error(z.prettifyError(e));
    process.exit(1);
  }
  throw e;   // Zod 以外のエラーはそのまま
}
```

## 関連
- 前: [[Zod_03_変換と検証のカスタマイズ(refine・transform・coerce・codec)]] / 次: [[Zod_05_実務(フォーム・API・環境変数・JSON Schema・AI)]]
- 公式: https://zod.dev/error-customization , https://zod.dev/error-formatting

---
title: "Zod 03 変換と検証のカスタマイズ(refine・transform・coerce・codec)"
modified: 2026-11-01
---

## 独自のルール(refine)
```ts
const Password = z.string().min(8).refine((v) => /[0-9]/.test(v), {
  error: "数字を1文字以上入れてください",
});

// 複数の項目にまたがるルールはオブジェクトに付ける。path でエラーの場所を指定
const SignUp = z.object({
  password: z.string().min(8),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, {
  error: "パスワードが一致しません",
  path: ["confirm"],            // confirm の欄にエラーを出す
});
```
- `refine` は、**型さえ合っていれば前の検証(`min` など)が失敗していても動く**(エラーが全部まとめて出る)。型が違う(`password` が数値など)ときは動かない
- 前の検証が全部通ったときだけ動かしたいなら `when`、失敗したらそこで止めたいなら `abort: true`
```ts
.refine((v) => v.password === v.confirm, {
  error: "パスワードが一致しません",
  path: ["confirm"],
  when: (payload) => payload.issues.length === 0,   // ほかにエラーがなければ確かめる
})
z.string().min(8, { abort: true }).refine(...)      // 8 文字未満ならここで止める
```
- 非同期(DB で重複を確認など)もできる → `parseAsync` / `safeParseAsync` で呼ぶ
```ts
const Email = z.email().refine(async (v) => !(await existsUser(v)), { error: "登録済みです" });
await Email.safeParseAsync(input);
```

### 複数のエラーを出す(superRefine / check)
```ts
const Range = z.object({ start: z.iso.date(), end: z.iso.date() }).check((ctx) => {
  if (ctx.value.start > ctx.value.end) {
    ctx.issues.push({ code: "custom", message: "終了日は開始日より後にしてください", path: ["end"], input: ctx.value });
  }
});
```
- v3 の `superRefine` も使える。v4 では `.check()` が基本の形

## 値を変える(transform・pipe)
```ts
const Tags = z.string().transform((s) => s.split(",").map((t) => t.trim()).filter(Boolean));
Tags.parse("react, zod , ");   // ["react", "zod"]

// 変換した後でさらに検証する: pipe
const Age = z.string().transform((s) => Number(s)).pipe(z.int().min(0));
```
- `transform` の中で失敗させたいときは `ctx.issues.push(...)` して `return z.NEVER`
- 変換すると**入力と出力の型が変わる**(`z.input` / `z.output`)→ 01
- 文字列を整えるだけなら専用のものがある: `.trim()`・`.toLowerCase()`・`.normalize()`

## 文字列から変換する(coerce)
フォームや URL の値は**全部文字列**。数値や日付として扱うには変換が要る。
```ts
z.coerce.number()    // Number(値) してから number として確かめる
z.coerce.date()      // new Date(値)
z.coerce.bigint()
z.coerce.boolean()   // Boolean(値) ← "false" も true になる!
```
| 入力 | `z.coerce.number()` | 注意 |
| --- | --- | --- |
| `"12"` | 12 | |
| `"abc"` | エラー(NaN) | |
| **`""`(空欄)** | **0** | 未入力が 0 になってしまう |
| `"1e3"` | 1000 | |
```ts
// 空欄は「未入力」として扱いたいとき
const OptionalNumber = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.coerce.number().optional(),
);
```

### 真偽値は stringbool
```ts
z.stringbool().parse("true");   // true
z.stringbool().parse("on");     // true(チェックボックスの既定値)
z.stringbool().parse("1");      // true
z.stringbool().parse("false");  // false("0" / "off" / "no" も)
z.stringbool().parse("abc");    // エラー
```
- `z.coerce.boolean()` は `"false"` を `true` にする(空でない文字列は全部 true)。**フォームと環境変数には `z.stringbool()`**
- チェックが外れたチェックボックスは**値自体が送られない**ので `.default(false)` か `.optional()` と組み合わせる

## 双方向の変換(codec)
送るときと受け取るときで形が違うデータ(JSON の日付など)を、1つのスキーマで両方向に。
```ts
const DateFromISO = z.codec(z.iso.datetime(), z.date(), {
  decode: (s) => new Date(s),        // 受け取り: 文字列 → Date
  encode: (d) => d.toISOString(),    // 送るとき: Date → 文字列
});

DateFromISO.decode("2026-11-01T00:00:00Z");      // Date
DateFromISO.encode(new Date("2026-11-01"));      // "2026-11-01T00:00:00.000Z"
```
- `z.stringbool()` も codec(`"true"` ⇄ `true`)
- API の入口(decode)と出口(encode)で同じ定義を使える

## 既定値と失敗時の値
| 書き方 | 動き |
| --- | --- |
| `.default(値)` | 入力が `undefined` なら**出力に**その値を入れる(検証・変換はしない) |
| `.prefault(値)` | 入力が `undefined` なら**入力として**その値を使い、検証・変換を通す |
| `.catch(値)` | **検証に失敗したら**その値にする(エラーにしない) |
```ts
const Page = z.coerce.number().int().min(1).catch(1);
Page.parse("abc");   // 1(URL の ?page= が変でも画面を壊さない)
Page.parse("3");     // 3

z.string().transform((s) => s.length).default(5).parse(undefined);     // 5
z.string().transform((s) => s.length).prefault("abc").parse(undefined); // 3
```
- `.catch()` は**検索パラメータなど「壊れていても困らない」値**に。フォームの必須項目に使うと、誤りに気づけなくなる

## 前処理(preprocess)
```ts
// 1つでも配列でも受け取って、いつも配列にする
const Ids = z.preprocess((v) => (Array.isArray(v) ? v : [v]), z.array(z.string()));
```
- 使いすぎると何をしているか分かりにくくなる。`transform` / `pipe` / `coerce` で足りるならそちらで

## 関連
- 前: [[Zod_02_スキーマの種類(文字列・数値・オブジェクト・配列・union)]] / 次: [[Zod_04_エラー処理(メッセージ・日本語化・flatten・treeify)]]
- 公式: https://zod.dev/api#refinements , https://zod.dev/api#transforms , https://zod.dev/codecs

---
title: "TypeScript"
modified: 2026-10-18
---

**JavaScript に「型」を足した言語**。Microsoft が開発。書いたコードを実行する前に、型の食い違い(数値のはずが文字列、存在しないプロパティ、null の考慮漏れ)をエディタとコンパイラが見つけてくれる。最終的には型を取り除いた JavaScript として動く。→ [[静的型付言語]]

公式ハンドブック(typescriptlang.org/docs)と公式ブログを元に整理したノート群の入口。**2026年9月時点: 最新は TypeScript 7(Go 製の新コンパイラ、約10倍高速)**。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[TypeScript_01_はじめに(なぜ型・導入・tscの流れ)]] | なぜ型か、インストール、コンパイルの流れ、型は実行時に消える |
| 02 | [[TypeScript_02_基本の型]] | プリミティブ、配列、オブジェクト、関数、any / unknown / never / void |
| 03 | [[TypeScript_03_型の組み立て(ユニオン・リテラル・interface・type)]] | ユニオン、インターセクション、リテラル型、タプル、type と interface、enum の代わり |
| 04 | [[TypeScript_04_型の絞り込み(Narrowing)]] | typeof / in / instanceof、型ガード、判別可能ユニオン、網羅チェック |
| 05 | [[TypeScript_05_ジェネリクス]] | 型の引数、制約、既定値、推論のされ方 |
| 06 | [[TypeScript_06_型の操作(keyof・条件型・Mapped Types)]] | keyof / typeof / インデックスアクセス / 条件型 / infer / Mapped / Template Literal |
| 07 | [[TypeScript_07_ユーティリティ型]] | Partial / Pick / Omit / Record / ReturnType / Awaited など |
| 08 | [[TypeScript_08_クラス・モジュール・型定義ファイル]] | class の型、import type、.d.ts、@types |
| 09 | [[TypeScript_09_型システムの性質(構造的型付け・推論・satisfies)]] | 構造的型付け、型推論、健全性の穴、as / as const / satisfies / readonly |
| 10 | [[TypeScript_10_tsconfig・strict・実行環境・バージョン]] | tsconfig の主要項目、strict の中身、Node で直接実行、TS 6 / 7 の変更 |
| 11 | [[TypeScript_11_実務パターン・よくあるエラー・AI開発]] | 実行時検証(Zod)、ブランド型、`T \| Error`、React の型、エラーの読み方 |

## 型システムの全体地図
```
[値の型]     string number boolean bigint symbol null undefined / 配列 / オブジェクト / 関数
[特別な型]   any(何でも・危険) unknown(何でも・安全) never(ありえない) void(返り値なし)
[組み立て]   ユニオン A | B / インターセクション A & B / リテラル "ok" / タプル [string, number]
[名前付け]   type Alias = ... / interface Shape { ... }
[絞り込み]   typeof / in / instanceof / ===  / 型ガード関数 / 判別可能ユニオン
[汎用化]     ジェネリクス <T>、制約 <T extends X>
[型の計算]   keyof / typeof / T["key"] / 条件型 T extends U ? X : Y / infer / Mapped { [K in ...] } / `${...}`
[道具箱]     Partial Required Readonly Pick Omit Record Exclude Extract NonNullable ReturnType Parameters Awaited
[性質]       構造的型付け(形が合えばOK)/ 型推論 / 型は実行時に消える(実行時の検証は別途)
```

## 3行で覚える核心
1. **型は「形」で判定される**(構造的型付け)。名前ではなく、必要なプロパティを持っていれば同じ型として扱える
2. **型は実行時に消える**。外から来るデータ(API・フォーム・JSON)は Zod などで実行時にも検証する
3. **ユニオン+絞り込み**が日常の9割。`any` は使わず、分からない値は `unknown` にして絞り込む

## 出典
- 公式: https://www.typescriptlang.org/docs/ (Handbook)、https://www.typescriptlang.org/tsconfig/
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) / [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [TypeScript 7.0 with a Native Go Compiler (InfoQ)](https://www.infoq.com/news/2026/08/typescript-7-released/)

## 関連
- [[静的型付言語]] / [[Next.js]] / [[TanStack Start]] / [[Vite]]

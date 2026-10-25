---
title: "TypeScript 10 tsconfig・strict・実行環境・バージョン"
modified: 2026-09-29
---

## tsconfig.json とは
プロジェクトの TypeScript 設定。どのファイルを対象にし、どれだけ厳しくチェックし、どう出力するかを決める。`npx tsc --init` で作成。フレームワークのテンプレートでは作成済み。

## 実務の推奨設定(フレームワーク利用・バンドラーあり)
```jsonc
{
  "compilerOptions": {
    // 出力・モジュール
    "target": "es2025",
    "module": "esnext",
    "moduleResolution": "bundler",     // Vite / Next.js / TanStack Start 向け
    "lib": ["es2025", "dom"],
    "jsx": "react-jsx",
    "noEmit": true,                    // 変換はバンドラーがする。tsc は型チェックだけ
    "verbatimModuleSyntax": true,      // 型の import に `import type` を強制
    "isolatedModules": true,           // ファイル単位変換ツールとの互換
    "resolveJsonModule": true,
    "skipLibCheck": true,              // node_modules 内の .d.ts のチェックを省略(高速化)

    // 厳しさ
    "strict": true,
    "noUncheckedIndexedAccess": true,  // arr[i] を T | undefined に
    "exactOptionalPropertyTypes": true,// a?: string に undefined を明示代入させない(厳しめ・任意)
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,

    // 型定義・パス
    "types": ["node"],                 // TS 6 から既定は []。必要なものを明示
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```
Node.js 向け(バンドラーなし)なら `"module": "nodenext"`(`moduleResolution` も自動で nodenext)。

## strict に含まれるもの
`"strict": true` は以下をまとめて有効にする(TS 6 から**既定で true**)。

| オプション | 内容 |
| --- | --- |
| `noImplicitAny` | 推論できず暗黙に any になる箇所をエラーに |
| `strictNullChecks` | null / undefined を他の型に入れさせない(**最重要**) |
| `strictFunctionTypes` | 関数引数の型を厳密に比較 |
| `strictBindCallApply` | bind / call / apply の引数をチェック |
| `strictPropertyInitialization` | クラスのプロパティの初期化漏れを検出 |
| `noImplicitThis` | 型が不明な `this` をエラーに |
| `useUnknownInCatchVariables` | `catch (e)` の e を unknown に |
| `alwaysStrict` | 出力に `"use strict"` |
| `strictBuiltinIteratorReturn` | 組み込みイテレータの戻り値を厳密に |
→ **新規プロジェクトは必ず strict**。既存 JS の移行時だけ段階的に。

## 主要オプション早見表
| 分類  | オプション                                              | 意味                                                      |
| --- | -------------------------------------------------- | ------------------------------------------------------- |
| 対象  | `include` / `exclude` / `files`                    | チェック対象のファイル                                             |
|     | `extends`                                          | 別の tsconfig を継承(`@tsconfig/strictest` など共有設定)           |
|     | `references` / `composite`                         | モノレポのプロジェクト参照                                           |
| 出力  | `target`                                           | 出力する JS の世代                                             |
|     | `module` / `moduleResolution`                      | import の書き方と解決方法                                        |
|     | `outDir` / `rootDir` / `declaration` / `sourceMap` | 出力先 / 入力ルート / .d.ts 生成 / ソースマップ                         |
|     | `noEmit` / `noEmitOnError`                         | 出力しない / エラー時に出力しない                                      |
| 環境  | `lib`                                              | 使える組み込み API(`dom` を入れるとブラウザ API)                        |
|     | `types`                                            | 自動で読む @types                                            |
|     | `jsx`                                              | JSX の変換方式                                               |
| 構文  | `erasableSyntaxOnly`                               | enum / namespace / パラメータプロパティなど「型を消すだけでは JS にならない構文」を禁止 |
|     | `allowJs` / `checkJs`                              | JS ファイルの取り込み / チェック                                     |
| 品質  | `noUnusedLocals` / `noUnusedParameters`            | 未使用の変数・引数(Lint に任せることも)                                 |
|     | `noImplicitReturns`                                | 返さない分岐を検出                                               |

リファレンス: https://www.typescriptlang.org/tsconfig/

## 実行環境の選び方
| やりたいこと | 方法 |
| --- | --- |
| Web アプリ | Next.js / Vite / TanStack Start(変換はフレームワーク、型チェックは `tsc --noEmit`) |
| スクリプトを手早く実行 | `node file.ts`(Node の型除去機能)、`tsx`、Bun、Deno |
| ライブラリを配布 | `tsc` で .js と .d.ts を出力(または tsdown などのツール) |
| CI | `tsc --noEmit` を必須チェックに |

## バージョンの歴史と現在(2026年9月時点)
| バージョン | 時期 | 主な内容 |
| --- | --- | --- |
| 4.9 | 2022/11 | `satisfies` |
| 5.0 | 2023/3 | 標準デコレーター、const 型パラメータ、`moduleResolution: bundler` |
| 5.2 | 2023/8 | `using`(明示的なリソース解放) |
| 5.4 | 2024/3 | `NoInfer`、クロージャ内の絞り込み改善 |
| 5.5 | 2024/6 | 型述語の自動推論 |
| 5.8 | 2025/2 | `erasableSyntaxOnly` |
| **6.0** | 2026/3/23 | **JS 製の最後のバージョン**。既定値の刷新と古い機能の非推奨化(7 への橋渡し) |
| **7.0** | 2026/7/8 | **Go で書き直したネイティブコンパイラ**。約10倍高速 |

### TS 6.0 の変更(7.0 も同じ既定値)
- **新しい既定値**: `strict: true` / `module: esnext` / `target: es2025` / `types: []` / `rootDir` は tsconfig のあるフォルダ
- **非推奨(7 で削除)**: `target: es5`、`moduleResolution: node`(node10)、AMD / UMD / SystemJS、`baseUrl`、`outFile`
- 移行の一時しのぎ: `"ignoreDeprecations": "6.0"`
- 新機能: `#/` で始まるサブパス import、Temporal の型、`Map.getOrInsert`、`RegExp.escape`、`dom` lib に iterable 系を統合
- よくある移行作業: `types` に `["node"]` などを追加 / `baseUrl` をやめて `paths` を相対指定に / `moduleResolution` を `bundler` か `nodenext` へ

### TS 7.0(Go 製ネイティブ版)
- 大規模プロジェクトの型チェックが約10倍高速(例: VS Code のコードベース 125.7秒 → 10.6秒)、メモリも削減
- 入れ方は従来通り `npm install -D typescript` → `npx tsc`
- エディタ: VS Code は専用拡張で新しい言語サービスを使う
- ⚠️ まだ安定したプログラム API(TS をライブラリとして呼ぶ機能)が無く、Vue / Svelte / Astro など一部ツールは対応待ち(7.1 で対応予定)。困ったら 6.0 を併用
- 6.0 で非推奨の警告が出ない状態にしておけば、7.0 への移行はスムーズ

## 関連
- 前: [[TypeScript_09_型システムの性質(構造的型付け・推論・satisfies)]] / 次: [[TypeScript_11_実務パターン・よくあるエラー・AI開発]]
- 出典: https://www.typescriptlang.org/tsconfig/ , https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ , https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/

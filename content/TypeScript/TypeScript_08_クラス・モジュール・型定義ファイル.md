---
title: "TypeScript 08 クラス・モジュール・型定義ファイル"
modified: 2026-09-29
---

## クラス
```ts
class Counter {
  #count = 0                         // JS 標準のプライベート(実行時も隠れる)
  private step: number               // TS の private(型チェック時だけ。実行時は見える)
  readonly name: string

  constructor(name: string, step = 1) {
    this.name = name
    this.step = step
  }
  increment(): number { return (this.#count += this.step) }
}

interface Repository<T> { find(id: string): Promise<T | null> }
class UserRepository implements Repository<User> {     // 契約を満たすか検査
  async find(id: string) { return null }
}
abstract class Shape { abstract area(): number }       // 継承専用
```
- 修飾子: `public`(既定)/ `protected`(サブクラスから)/ `private` / `readonly` / `static`
- **パラメータプロパティ** `constructor(private repo: Repo) {}` は短く書けるが、JS に変換が必要な構文なので `erasableSyntaxOnly` 環境では使えない
- 実務の React / Next.js ではクラスより**関数とオブジェクト**が中心。クラスはエラー型(`class NotFoundError extends Error`)やSDKで見かける程度

## モジュール(import / export)
```ts
// user.ts
export type User = { id: string; name: string }
export function createUser(name: string): User { /* ... */ }
export default function main() {}

// app.ts
import main, { createUser, type User } from './user'
import type { Config } from './config'     // 型だけの import(実行時に消える)
```
- **`import type`** を使うと「型のためだけの import」が明確になり、ビルドツールが安全に削除できる。`verbatimModuleSyntax: true` にすると型 import に `type` を付けることが必須になる(推奨)
- ファイルに import / export が1つもないと「スクリプト」扱いで、変数がグローバルになる
- パスの別名: `#/components/...`(package.json の `imports`、TS 6 で `#/` 形式に対応)や tsconfig の `paths`(`@/*` など)

## 型定義ファイル(.d.ts)
**型の情報だけ**を書いたファイル。JS で書かれたライブラリに型を付けるために使う。
```ts
// types/global.d.ts
declare global {
  interface Window { dataLayer: unknown[] }
}
export {}
```
- ライブラリの型の入手先:
  1. パッケージ自身が同梱(最近はほとんどこれ。`package.json` の `types` / `exports`)
  2. **DefinitelyTyped**: `npm i -D @types/パッケージ名`(例: `@types/node`、`@types/react`)
  3. どちらも無い → `declare module 'lib-name'` で自作(最低限 `any` 相当になる)
- ⚠️ TS 6 から `types` の既定値が `[]` に。`@types/node` などを自動で読み込まなくなったため、必要なものは tsconfig の `"types": ["node"]` に明示する([[TypeScript_10_tsconfig・strict・実行環境・バージョン]])

## 宣言のマージ・モジュール拡張
ライブラリの型に項目を足したい時(例: 環境変数、認証ライブラリのセッション型)。
```ts
// env.d.ts(Vite の環境変数に型を付ける)
interface ImportMetaEnv { readonly VITE_API_URL: string }
interface ImportMeta { readonly env: ImportMetaEnv }

// Node の process.env
declare namespace NodeJS {
  interface ProcessEnv { DATABASE_URL: string }
}
```
- 関連: [[Vite_02_開発の基本(TS・CSS・静的ファイル・環境変数)]]、Cloudflare は `wrangler types` で `Env` の型を生成([[Cloudflare]])

## JS ファイルを型チェックする
- `allowJs` + `checkJs`、または JS ファイル先頭に `// @ts-check`
- JSDoc で型を書ける: `/** @param {string} name */`
- 段階的な移行: `allowJs` で混在させ、1ファイルずつ `.ts` へ

## 関連
- 前: [[TypeScript_07_ユーティリティ型]] / 次: [[TypeScript_09_型システムの性質(構造的型付け・推論・satisfies)]]
- 出典: https://www.typescriptlang.org/docs/handbook/2/classes.html , https://www.typescriptlang.org/docs/handbook/2/modules.html , https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html

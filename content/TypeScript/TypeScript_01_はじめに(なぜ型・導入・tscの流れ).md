---
title: "TypeScript 01 はじめに(なぜ型・導入・tsc の流れ)"
modified: 2026-09-29
---

## なぜ型が必要か
JavaScript は実行してみるまで間違いに気づけない。
```js
const user = { name: '山田' }
user.nmae.toUpperCase()   // 実行時に TypeError(綴り間違い)
```
TypeScript なら**書いた瞬間にエディタが赤線**を引く。
```ts
const user = { name: '山田' }
user.nmae   // エラー: プロパティ 'nmae' は存在しません。'name' ですか?
```
得られるもの:
- **バグの早期発見**: 綴り、null の考慮漏れ、引数の渡し間違い
- **補完**: `user.` と打つと候補が出る(ドキュメント代わり)
- **安全なリファクタリング**: 名前を変えると影響箇所が全部分かる
- **AI 開発との相性**: AI が書いたコードの間違いを型チェックで機械的に検出できる(「型チェックが通るまで直して」と頼める)

## 仕組み: 型は実行時に消える
```
 .ts(型付き)──tsc/ビルドツール──▶ .js(型を取り除いたもの)──▶ ブラウザ / Node.js で実行
               └ 型チェック(間違いを報告)
```
- 型は**開発中だけ**の情報。実行時には一切残らない
- だから「型が合っている」≠「実行時のデータが正しい」。**外部から来るデータは実行時に検証が必要**([[TypeScript_11_実務パターン・よくあるエラー・AI開発]])
- **型チェック**と**JavaScript への変換**は別の仕事。Vite・Next.js などは変換だけ高速に行い、型チェックは `tsc --noEmit` やエディタに任せる([[Vite_02_開発の基本(TS・CSS・静的ファイル・環境変数)]])

## 導入
```bash
npm install -D typescript        # TypeScript 7(Go 製の新コンパイラ)
npx tsc --init                   # tsconfig.json を作成
npx tsc                          # 型チェック + .js 出力
npx tsc --noEmit                 # 型チェックだけ(フレームワーク利用時の定番)
npx tsc --noEmit --watch         # 保存のたびにチェック
```
- Next.js・Vite・TanStack Start のテンプレートは最初から TypeScript 設定済み
- ブラウザで試す: https://www.typescriptlang.org/play (TS Playground)

## Node.js で直接実行する
最近の Node.js(22.18+ / 23.6+ 以降)は `.ts` ファイルを**型を取り除いてそのまま実行**できる(型チェックはしない)。
```bash
node script.ts
```
- 対象は「消すだけで JS になる書き方」に限られる(`enum` や `namespace` など、JS に変換が必要な構文は使えない)→ tsconfig の `erasableSyntaxOnly` でそういう構文を禁止できる
- 他の手段: `tsx`、Bun、Deno(TypeScript をそのまま実行)

## 型注釈と型推論
```ts
let age: number = 20          // 型注釈(明示)
let name = '山田'             // 型推論(string と推論される)
function add(a: number, b: number) {   // 引数は注釈が必要
  return a + b                          // 返り値は number と推論
}
```
方針: **引数と公開する関数の返り値には書く、ローカル変数は推論に任せる**。

## エラーが出ても JS は出力される
`tsc` は型エラーがあっても既定では .js を出力する(`noEmitOnError` で止められる)。CI では `tsc --noEmit` の終了コードでチェックする。

## 関連
- 目次: [[TypeScript]] / 次: [[TypeScript_02_基本の型]]
- 出典: https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html , https://www.typescriptlang.org/docs/handbook/2/basic-types.html

---
title: "Vite 01 はじめに(仕組み・作成・構成)"
modified: 2026-09-29
---

## Vite とは
フランス語で「速い」(発音は「ヴィート」)。2つの部品でできている。
1. **開発サーバー**: ブラウザ標準の ES Modules を活かし、起動が一瞬、保存すると**瞬時に画面へ反映(HMR)**
2. **ビルドコマンド**: 本番用に **Rolldown**(Rust製)でコードをまとめて最適化した静的ファイルを出力

## なぜ速いのか(Why Vite)
従来のツール(webpack 等)は、開発サーバー起動時に**アプリ全体を先にまとめて(バンドルして)**から配信していた → 大規模だと起動に数十秒〜数分。
Vite は:
- **依存ライブラリ**(node_modules):ほとんど変わらないので、最初に一度だけ高速に事前バンドルしてキャッシュ
- **自分のソースコード**:まとめずに、ブラウザが要求したファイルだけその場で変換して返す(ネイティブ ESM)
- **HMR**:変更したモジュールだけを差し替え。アプリの状態(入力中のフォームなど)も保ったまま、更新は 50ms 未満
- 本番ビルドは別途しっかりまとめる(ネットワーク往復を減らすため)

## 動作環境
- Node.js **20.19+ または 22.12+**
- 開発中は最新ブラウザ前提。本番ビルドは既定で「Baseline Widely Available」(2023年中頃のブラウザ)向けに出力

## プロジェクト作成
```bash
npm create vite@latest                                  # 対話式
npm create vite@latest my-app -- --template react-ts    # テンプレート指定(npm は -- が必要)
cd my-app
npm install
npm run dev                                             # http://localhost:5173
```
テンプレート: `vanilla` `vue` `react` `react-compiler` `preact` `lit` `svelte` `solid` `qwik`(それぞれ `-ts` 版あり)
- ブラウザだけで試す: https://vite.new/react-ts (StackBlitz)

## package.json のスクリプト
| コマンド | 意味 |
| --- | --- |
| `npm run dev`(`vite`) | 開発サーバー |
| `npm run build`(`vite build`) | 本番ビルド(`dist/` に出力) |
| `npm run preview`(`vite preview`) | ビルド結果をローカルで確認 |
オプション例: `vite --port 3000 --open`、`vite --host`(スマホなど同じネットワークからアクセス)

## プロジェクト構成(react-ts テンプレート)
```text
my-app/
├── index.html          ★ エントリーポイント(public/ ではなくルートにある)
├── public/             そのままコピーされる静的ファイル(favicon 等)
├── src/
│   ├── main.tsx        React を index.html の #root に描画
│   ├── App.tsx
│   └── assets/         import して使う画像など
├── vite.config.ts      Vite の設定
├── tsconfig.json
└── package.json
```
- **`index.html` がソースコードの一部**: `<script type="module" src="/src/main.tsx">` から依存を辿っていく
- 複数の HTML を置けばマルチページアプリも可能
```html
<!-- index.html -->
<!doctype html>
<html lang="ja">
  <head><meta charset="UTF-8" /><title>My App</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Vite を使う代表的なもの
- **フルスタックFW**: [[TanStack Start]]、React Router(旧 Remix)、SvelteKit、Nuxt、SolidStart、Astro
- **テスト**: Vitest(Vite の設定をそのまま使える)
- **公式 React プラグイン**: `@vitejs/plugin-react`(RSC 用 `@vitejs/plugin-rsc` もある)

## Next.js とどちらを使う?
| | Vite(+React) | Next.js |
| --- | --- | --- |
| 種類 | ビルドツール | フルスタックFW |
| サーバー処理(SSR・API) | 自分で用意 or TanStack Start 等 | 最初から入っている |
| 向き | 管理画面・社内ツールなど SEO 不要の SPA、学習 | 公開Webサイト、SEO、サーバー処理が必要 |
| 自由度 | 高い(ルーター等を自分で選ぶ) | 規約が多い(迷わない) |

## 関連
- 次: [[Vite_02_開発の基本(TS・CSS・静的ファイル・環境変数)]]
- 公式: https://vite.dev/guide/ , https://vite.dev/guide/why

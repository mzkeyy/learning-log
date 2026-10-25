---
title: "Vite 05 実務構成・テスト・性能・トラブル"
modified: 2026-09-29
---

## React SPA の定番構成(2026年)
Vite 単体はルーターもデータ取得も持たないので、自分で組み合わせる。
| 役割 | 定番 |
| --- | --- |
| ビルド | Vite + `@vitejs/plugin-react` |
| ルーティング | TanStack Router(型安全)/ React Router |
| サーバーデータ取得・キャッシュ | TanStack Query |
| フォーム | React Hook Form + Zod |
| スタイル・UI | Tailwind CSS(`@tailwindcss/vite`)+ [[shadcn-ui]] |
| テスト | Vitest + Testing Library、E2E は Playwright |
| API/サーバー | Cloudflare Workers / Hono など別途 |
> SSR や SEO、サーバー処理まで欲しくなったら [[TanStack Start]](Vite ベース)や [[Next.js]] を検討。

### セットアップ例
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install tailwindcss @tailwindcss/vite
npm install @tanstack/react-router @tanstack/react-query
npm install -D @tanstack/router-plugin vitest @testing-library/react jsdom
npx shadcn@latest init      # shadcn/ui(Vite にも対応)
```

## テスト(Vitest)
Vite の設定・プラグイン・エイリアスをそのまま使えるテストランナー。Jest とほぼ同じ書き方。
```ts
// vite.config.ts に追記
/// <reference types="vitest/config" />
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
})
```
```ts
// src/sum.test.ts
import { describe, it, expect } from 'vitest'
import { sum } from './sum'
describe('sum', () => {
  it('足し算できる', () => { expect(sum(1, 2)).toBe(3) })
})
```
```bash
npx vitest        # ウォッチモード
npx vitest run    # 1回(CI 用)
```

## 性能改善(公式 Performance より)
開発サーバーが遅い時:
1. **ブラウザ拡張を切る**(広告ブロッカー等が遅くする)。DevTools の「キャッシュ無効化」をオフ
2. **プラグインを見直す**: 重い処理をするプラグインがないか
3. **import の拡張子を省略しすぎない**: 解決処理が増える
4. **バレルファイルを避ける**: `utils/index.ts` で全部 re-export すると、1つ使うだけで全部読み込まれる → `import { slash } from './utils/slash'` のように直接
5. **よく使うファイルを warmup**
6. より速いツールを使う(Rolldown・Oxc・Lightning CSS は既に標準)

ビルドが大きい時: 動的 import でページごとに分割、不要な依存を削除、`rollup-plugin-visualizer` などで中身を確認。

## よくあるトラブル(公式 Troubleshooting より)
| 症状 | 対処 |
| --- | --- |
| ファイル変更を検知しない(WSL・Docker・ネットワークドライブ) | `server.watch.usePolling: true`、WSL ならプロジェクトを Linux 側に置く |
| HMR ではなく全体リロードになる | そのファイルが HMR の境界外(React なら部品以外も export しているファイル)。部品ファイルは部品だけ export |
| 依存を変えたのに反映されない | `vite --force` / `node_modules/.vite` 削除 |
| `This package is ESM only` | 設定ファイルを `.mts` にする or `"type": "module"` |
| ビルド後に開くと CORS エラー | `file://` で直接開いている → `vite preview` かサーバー経由で |
| `Failed to fetch dynamically imported module` | デプロイで古いチャンクが消えた → エラー時にリロードする処理(`vite:preloadError` イベント) |
| 大文字小文字の違いでビルド失敗 | macOS は区別しないが Linux(CI)は区別する。import の綴りを合わせる |
| `ENOSPC`(Linux) | ファイル監視数の上限を上げる |
| 型エラーなのにビルドが通る | 仕様(Vite は型チェックしない)。`tsc --noEmit` を CI に |

## 生成AIで Vite プロジェクトを作る時のコツ
- AI に「Vite 8、React、TypeScript、Tailwind v4(@tailwindcss/vite)」とバージョンと構成を明示
- 古い記事の `vite.config.js` の書き方(esbuild オプション等)が混ざることがある → 公式の llms.txt(https://vite.dev/llms.txt)を渡すと正確になる
- 型チェックとテストのコマンドを CLAUDE.md / AGENTS.md に書いておく

## 関連
- 前: [[Vite_04_ビルドとデプロイ]] / 目次: [[Vite]]
- 公式: https://vite.dev/guide/performance , https://vite.dev/guide/troubleshooting , https://vitest.dev

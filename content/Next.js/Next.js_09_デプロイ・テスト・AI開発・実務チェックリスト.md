---
title: "Next.js 09 デプロイ・テスト・AI開発・実務チェックリスト"
modified: 2026-09-29
---

## デプロイ方法
| 方法 | 機能サポート | 例 |
| --- | --- | --- |
| **Node.js サーバー** | 全機能 | `npm run build` → `npm run start`。Railway、Render など |
| **Docker** | 全機能 | `output: "standalone"` で最小イメージ。Cloud Run、Fly.io など |
| **静的エクスポート** | 限定的(サーバー機能不可) | `output: "export"` → S3、GitHub Pages、Nginx |
| **アダプター** | プラットフォーム次第 | Vercel(公式・最も簡単)、Bun。Cloudflare・Netlify は独自統合 |

### Vercel(開発元)
GitHub リポジトリを連携するだけ。push で自動デプロイ、PR ごとにプレビューURL。

### Cloudflare
2026年9月時点で Cloudflare が推奨するのは **vinext**(Next.js の API を Vite 上で再実装したプラグイン。**ベータ**)。既存の OpenNext(`@opennextjs/cloudflare`)は、vinext に移行できない既存アプリ向けの選択肢として残っている。詳しくは [[Cloudflare_05_フレームワーク連携とデプロイ]]。
```bash
npm create cloudflare@latest -- my-next-app --framework=next   # vinext 構成で作成
npx vinext check                                               # 既存アプリの互換性チェック
```

### 静的エクスポートでできないこと
Server Actions、Cookie/ヘッダーを使う動的レンダリング、ISR、画像最適化(既定ローダー)、proxy など。

## ビルドの確認
```bash
npm run build   # 各ルートが静的(○)か動的(ƒ)かが表示される
npm run start   # 本番モードで動作確認
```
- 開発(dev)と本番(build)で挙動が違うことがあるので、**デプロイ前に必ず build して確認**

## テスト
| 種類 | ツール | 何を確かめる |
| --- | --- | --- |
| 単体テスト | **Vitest**(または Jest) | 関数・部品単体 |
| E2E テスト | **Playwright**(または Cypress) | ブラウザで実際に操作して画面全体 |
- async な Server Component は単体テストツールの対応が不十分 → **E2E でカバー**するのが公式の推奨
```bash
npm init playwright@latest
npx playwright test
```

## AI コーディングエージェントとの開発(公式ガイド)
1. **同梱ドキュメントを参照させる**: `node_modules/next/dist/docs/` にインストール中のバージョンのドキュメントが入っている。`create-next-app` が生成する `AGENTS.md` に「これはあなたの知っている Next.js ではない。同梱ドキュメントを読め」と書かれている → AI が古い書き方をするのを防ぐ
   - 既存プロジェクトでも v16.3 以降は `next dev` 時に AI エージェントを検出すると自動生成
2. **実行時の情報を見せる**: Next.js MCP サーバー、ブラウザ操作ツール
3. **エラーから直させる**: 開発オーバーレイのエラーに修正用プロンプトが付く
4. **Skills**: `next-dev-loop`(確認→編集→検証の繰り返し)、Cache Components 導入支援など
- アップグレード後に「Next.js の知識を更新して、新機能を要約して」と頼むのも公式のおすすめ

## 本番前チェックリスト(公式 Production checklist の要点)
### 性能
- [ ] Server Component を基本に、`'use client'` は最小範囲
- [ ] 独立したデータ取得は並列、遅い部分は Suspense
- [ ] キャッシュ戦略を決めた(何を・何分)
- [ ] next/image(サイズ指定・priority)、next/font
- [ ] `<Link>` で遷移、不要な JS ライブラリを入れていない
- [ ] バンドルサイズを確認(Bundle Analyzer)

### セキュリティ
- [ ] 秘密の環境変数に `NEXT_PUBLIC_` を付けていない、`.env*` を git に入れていない
- [ ] Server Actions・Route Handlers で認証・認可・入力検証
- [ ] DAL と `server-only`
- [ ] CSP ヘッダー
- [ ] Next.js を最新に

### 品質・運用
- [ ] `error.tsx` `not-found.tsx` `global-error.tsx` を用意
- [ ] metadata(title・description・OG画像)、`sitemap.ts` `robots.ts`
- [ ] アクセシビリティ(alt、ラベル、キーボード操作)
- [ ] Lint・型チェック・テストが CI で通る → [[Cicdパイプライン]]
- [ ] 監視・ログ(`instrumentation.ts`、分析ツール)
- [ ] Core Web Vitals を計測

## 学習の次の一歩
- 公式の無料コース「Learn Next.js」(ダッシュボードアプリを作りながら学べる)
- 小さなブログ(一覧・詳細・投稿フォーム・ログイン)を最後まで作ってデプロイする

## 関連
- 前: [[Next.js_08_認証とセキュリティ]] / 目次: [[Next.js]]
- [[Claude Code]] … AI 開発全般
- 公式: https://nextjs.org/docs/app/getting-started/deploying , https://nextjs.org/docs/app/guides/testing , https://nextjs.org/docs/app/guides/ai-agents , https://nextjs.org/docs/app/guides/production-checklist

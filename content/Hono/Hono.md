---
title: "Hono"
modified: 2026-10-26
---

**Web 標準(Request / Response / fetch)だけで作られた、小さくて速い Web フレームワーク**。名前は日本語の「炎🔥」。作者は日本の和田裕介(yusukebe)さん。Express のような「サーバー側だけ」のフレームワークで、[[Cloudflare]] Workers・Deno・Bun・Node.js・AWS Lambda・Vercel など**どのランタイムでも同じコードが動く**。

公式ドキュメント(hono.dev、**2026年10月時点。安定版は v4.13、v5 は Release Candidate**)を読んで整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[Hono_01_はじめに(概要・作成・構成)]] | 何者か、Express との違い、作成方法、ルーターとプリセット、バージョン |
| 02 | [[Hono_02_ルーティングとContext]] | パス・パラメータ・グループ化、`c.json` など、リクエストの読み方、エラー処理 |
| 03 | [[Hono_03_ミドルウェア(組み込み・自作・認証)]] | 実行順、`createMiddleware`、CORS・JWT・CSRF・セキュリティヘッダー |
| 04 | [[Hono_04_バリデーションとRPC(Zod・hc)]] | `zValidator`、Standard Schema、型付きクライアント `hc` |
| 05 | [[Hono_05_ランタイム別の動かし方とデプロイ]] | Workers・Node.js・Bun・Next.js・Vercel・Lambda、環境変数 |
| 06 | [[Hono_06_実務(構成・テスト・JSX・v5移行・AI開発)]] | ファイル分割、テスト、JSX、v5 の変更点、選び方 |

## 特徴(公式)
- **速い**: RegExpRouter が全ルートを「1つの大きな正規表現」にして一度で照合する
- **軽い**: 依存ゼロ。`hono/tiny` プリセットは 14KB 未満(Express は 572KB)
- **マルチランタイム**: Web 標準 API しか使わないので、入口(`export default app` など)を変えるだけで移せる
- **全部入り**: 認証・CORS・ログ・ETag・圧縮などの組み込みミドルウェアと、Cookie・ストリーミング・SSG・JSX などのヘルパー
- **型が強い**: パスパラメータがリテラル型になる。Validator + `hc` で **API の型をクライアントと共有(RPC)** できる → [[TypeScript]]

## 最小のコード
```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))
app.get('/api/posts/:id', (c) => c.json({ id: c.req.param('id') }))

export default app   // Cloudflare Workers / Bun / Deno はこれだけで動く
```

## 押さえどころ(2026年10月時点)
- 作成は `npm create hono@latest my-app` → テンプレート(`cloudflare-workers`・`nodejs`・`bun`・`nextjs` など)を選ぶ
- ハンドラは**パスの直後に書く**(別ファイルの「コントローラー」にすると型推論が切れる)。分割は `app.route()`
- RPC を使うなら**メソッドをチェーンして** `typeof app` を export する
- 入力は必ずバリデーション(`@hono/zod-validator` か `@hono/standard-validator`)
- v5 では **ESM のみ・Node.js 22.12 以上・ランタイム用アダプターが別パッケージ(`@hono/bun` など)・`onError` の書き方が変わる** → [[Hono_06_実務(構成・テスト・JSX・v5移行・AI開発)]]

## 他の選択肢との違い
| | Hono | Express | [[Next.js]] の Route Handler | [[TanStack Start]] |
| --- | --- | --- | --- | --- |
| 立ち位置 | API・エッジ向けの軽量フレームワーク | Node.js の定番サーバー | フルスタック React の API 部分 | フルスタック React |
| 動く場所 | どこでも(Web 標準) | Node.js | Next.js の中 | Vite で各所へ |
| 型安全 | 強い(RPC で型共有) | 弱い(後付け) | 普通 | 強い(Server Functions) |
| 画面 | 基本なし(JSX で SSR は可) | なし | React | React |
| 向く用途 | API サーバー、Workers、BFF、プロキシ | 既存の Node.js 資産 | Next.js アプリ内の API | 画面込みのアプリ |

- Next.js の中に Hono を入れて API 部分だけ Hono で書く構成も公式に用意されている(→ [[Hono_05_ランタイム別の動かし方とデプロイ]])

## 出典
- 公式: https://hono.dev/docs/
- [Getting Started (公式)](https://hono.dev/docs/getting-started/basic)
- [Best Practices (公式)](https://hono.dev/docs/guides/best-practices)
- [Migrating to v5 (公式)](https://hono.dev/docs/guides/migrating-to-v5)
- [honojs/hono (GitHub)](https://github.com/honojs/hono)

## 関連
- [[Cloudflare]] / [[TypeScript]] / [[Next.js]] / [[TanStack Start]] / [[Vite]]
- [[認証]] / [[Webセキュリティ対策]] / [[HTTP・HTTPS・TLS]]

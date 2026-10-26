---
title: "Hono 01 はじめに(概要・作成・構成)"
modified: 2026-10-26
---

## Hono とは
- **サーバー側の Web フレームワーク**(画面のフレームワークではない)。Express と同じ立ち位置
- **Web 標準の API だけ**で作られている: `Request`・`Response`・`URL`・`Headers`・`fetch` など
- Web 標準に沿ったランタイムならどこでも動く

| ランタイム | 動かし方 |
| --- | --- |
| Cloudflare Workers | `export default app` |
| Deno / Bun | `export default app`(Deno は `Deno.serve(app.fetch)` も可) |
| Node.js | `@hono/node-server` の `serve(app)` |
| AWS Lambda / Lambda@Edge | 専用アダプターの `handle(app)` |
| Vercel / Next.js | `handle(app)` を Route Handler から export |
| Fastly Compute・Netlify・Service Worker・WASI など | 公式ガイドあり |

### 「Web 標準だけ」とは
```ts
// 素の Cloudflare Workers / Bun のサーバー
export default {
  async fetch(request: Request) {
    return new Response('Hello World')
  },
}
```
- Hono はこの `fetch(request) → Response` の上に**ルーティング・ミドルウェア・便利関数**を載せたもの
- だから `app.fetch` をランタイムに渡すだけで動く。テストも `Request` を作って渡すだけ

## 何に使うか(公式の用途例)
- Web API(REST / JSON)
- バックエンドの前に置くプロキシ、CDN の前段
- エッジアプリケーション([[Cloudflare]] Workers が代表)
- フルスタック(JSX で SSR + Vite でクライアント)
- 実例: cdnjs、Cloudflare D1・KV の内部 API、Clerk、Unkey、PostHog の MCP サーバーなど

## Express との違い
| | Hono | Express |
| --- | --- | --- |
| 土台 | Web 標準(`Request` / `Response`) | Node.js の `http`(`req` / `res`) |
| 返し方 | **`Response` を return する**(`c.json()` など) | `res.send()` を呼ぶ |
| 動く場所 | エッジ・サーバーレス・Node.js どこでも | Node.js |
| 型 | TypeScript 製。パスや入力の型が推論される | `@types/express` で後付け |
| サイズ | 依存ゼロ・14KB〜 | 大きい |
| ミドルウェア | `await next()` の前後に処理(玉ねぎ型) | `next()` を呼ぶ |

## プロジェクトを作る
```bash
npm create hono@latest my-app
# ? Which template do you want to use? → cloudflare-workers / nodejs / bun / nextjs / vercel / aws-lambda ...
cd my-app
npm i
npm run dev        # Workers なら http://localhost:8787 、Node.js なら :3000
```
- 質問を飛ばす: `npm create hono@latest my-app -- --template cloudflare-workers --pm npm --install`(npm は `--` の後ろに引数を書く)
- Cloudflare で画面込みのアプリを作るなら `cloudflare-workers+vite` テンプレートが公式のおすすめ(Vite の開発サーバー + JSX の SSR)

### できるもの(cloudflare-workers テンプレートの例)
```
my-app/
├── src/
│   └── index.ts        # アプリ本体
├── package.json        # dev = wrangler dev、deploy = wrangler deploy
├── tsconfig.json
└── wrangler.jsonc      # Workers の設定 → [[Cloudflare_02_Workersの基本(作成・Wrangler・設定)]]
```

## Hello World
```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

app.get('/api/hello', (c) =>
  c.json({ ok: true, message: 'Hello Hono!' })
)

app.get('/posts/:id', (c) => {
  const id = c.req.param('id')          // パスパラメータ
  const page = c.req.query('page')      // ?page=2
  c.header('X-Message', 'Hi!')          // レスポンスヘッダー
  return c.text(`post ${id}, page ${page}`)
})

app.post('/posts', (c) => c.text('Created!', 201))

export default app
```
- `c` は **Context**。リクエストの読み取りとレスポンスの作成をまとめたもの(→ [[Hono_02_ルーティングとContext]])
- ハンドラは必ず `Response` を返す。`new Response(...)` をそのまま返してもよい

## ルーター(内部の仕組み)
| ルーター | 特徴 |
| --- | --- |
| **RegExpRouter** | 全ルートを1つの正規表現にまとめ、1回の照合で決める。最速。ただし一部のパターンは扱えない |
| **TrieRouter** | 木構造(Trie)。全パターン対応。Express のルーターよりずっと速い |
| **SmartRouter** | 登録されたルートを見て、上の2つから速い方を自動で選ぶ(**既定**) |
| LinearRouter | ルート登録が速い。リクエストのたびに初期化される環境向け |
| PatternRouter | 最小サイズ。リソースが限られた環境向け |

### プリセット(import 先を変えるだけ)
| import | ルーター | 向く環境 |
| --- | --- | --- |
| `hono` | Smart(RegExp + Trie) | **ほぼすべて**。Node.js・Bun・Deno・Workers(isolate がしばらく生きるので問題なし) |
| `hono/quick` | Smart(Linear + Trie) | リクエストごとにアプリを初期化する環境 |
| `hono/tiny` | Pattern | サイズ制限が厳しい環境 |
- 迷ったら `hono` のままでよい

## バージョン(2026年10月時点)
| 版 | 状態 | ポイント |
| --- | --- | --- |
| **v4.13** | 安定版(`npm i hono`) | このノート群の基準。`hono/cloudflare-workers` などアダプターも同梱 |
| v5.0 RC | `npm i hono@next` | ESM のみ、Node.js 22.12+、アダプターが `@hono/bun` などの別パッケージに、`onError` の引数が変わる |
- v5 の変更点 → [[Hono_06_実務(構成・テスト・JSX・v5移行・AI開発)]]
- 公式サイトのドキュメントはすでに v5 寄りの書き方(`@hono/vercel` など)が混ざっているので、**自分の入れた版と照らし合わせて読む**

## 関連
- 次: [[Hono_02_ルーティングとContext]]
- [[Hono]] / [[Cloudflare]] / [[HTTP・HTTPS・TLS]]
- 公式: https://hono.dev/docs/getting-started/basic , https://hono.dev/docs/concepts/web-standard , https://hono.dev/docs/concepts/routers , https://hono.dev/docs/api/presets , https://hono.dev/docs/guides/create-hono

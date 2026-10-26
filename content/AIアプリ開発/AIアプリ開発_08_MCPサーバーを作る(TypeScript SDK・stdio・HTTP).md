---
title: "AIアプリ開発 08 MCP サーバーを作る(TypeScript SDK・stdio・HTTP)"
modified: 2026-10-26
---

MCP の仕組み(Host・Client・Server、Tools・Resources・Prompts)は [[MCP]] にまとめてある。この章は**自分で MCP サーバーを作って、Claude Code などから使えるようにする**までの手順。

## いつ MCP サーバーを作るか
| 状況 | 作り方 |
| --- | --- |
| 自分のアプリの中だけで AI にツールを使わせる | MCP は不要。API のツール使用で十分 → [[AIアプリ開発_03_ツール使用と構造化出力]] |
| **同じツールを Claude Code・Claude Desktop・Cursor・自作エージェントなど複数で使いたい** | **MCP サーバーにする** |
| 社内のシステム・DB・ドキュメントを AI から安全に触らせたい | MCP サーバーにして、権限を絞る |
| 自分のサービスを外部の AI から使えるようにしたい | リモートの MCP サーバー(HTTP + OAuth)を公開 |

## SDK のバージョン(2026年10月時点)
| 版 | パッケージ | 対応する仕様 |
| --- | --- | --- |
| **v2(現行の安定版)** | **`@modelcontextprotocol/server`** / `@modelcontextprotocol/client` | 2026-07-28 版 |
| v1(保守のみ) | `@modelcontextprotocol/sdk` | 2025-11-25 版まで |
- 古い記事の `new StdioServerTransport()` + `server.connect()`、`server.tool(...)` は v1 の書き方。v2 は下のとおり(移行用の codemod がある)
- Python なら公式 SDK(FastMCP を含む)、ほかに Go・Java・C# などの SDK もある

## 1. 最小のサーバー(stdio)
手元の PC で、Host(Claude Code など)が**子プロセスとして起動**する形。
```bash
mkdir notes-mcp && cd notes-mcp
npm init -y && npm pkg set type=module     # ESM のみ
npm install @modelcontextprotocol/server zod tsx
```
```ts
// src/index.ts
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'

function createServer(): McpServer {
  const server = new McpServer({ name: 'notes', version: '1.0.0' })

  server.registerTool(
    'search-notes',
    {
      title: 'ノートを検索',
      description: '学習ノートをキーワードで検索し、タイトルとパスを最大10件返す。内容の要約が必要なら、このあと read-note を使う。',
      inputSchema: z.object({
        query: z.string().min(1).describe('検索するキーワード(例: Hono)'),
      }),
      annotations: { readOnlyHint: true },     // 読み取りだけのツール
    },
    async ({ query }) => {
      const hits = await searchNotes(query)    // 自分の処理
      if (hits.length === 0) {
        return { content: [{ type: 'text', text: `「${query}」に一致するノートはありません` }] }
      }
      return { content: [{ type: 'text', text: hits.map((h) => `${h.title} (${h.path})`).join('\n') }] }
    },
  )

  return server
}

void serveStdio(createServer)
console.error('notes MCP server running on stdio')   // ★ ログは stderr へ
```
- `inputSchema` に **Zod のスキーマ**を1つ書けば、モデルに見せる JSON Schema の生成・引数の検証・型の推論を SDK がやってくれる。形が合わない引数はハンドラに届く前に弾かれる
- 失敗は `isError: true` を付けた結果で返す(モデルが読んで別の手を考えられる)。例外を投げっぱなしにしない
- **stdout は通信に使われている**。`console.log` を1つ書くだけで壊れるので、ログは `console.error`

## 2. 動かして確かめる
```bash
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```
- **MCP Inspector**: ブラウザでツールの一覧を見たり、引数を入れて呼んだりできる。Host につなぐ前にここで確認する

## 3. Claude Code などから使う
```bash
claude mcp add notes -- npx tsx /path/to/notes-mcp/src/index.ts       # stdio
claude mcp add --transport http notes https://notes.example.com/mcp   # リモート(HTTP)
claude mcp list
```
```jsonc
// プロジェクトで共有するなら .mcp.json(Claude Code)/ .vscode/mcp.json(VS Code)/ .cursor/mcp.json
{
  "mcpServers": {
    "notes": { "command": "npx", "args": ["tsx", "src/index.ts"] }
  }
}
```
→ [[12_MCP(Claude Codeでの使い方)]] / [[Codex_05_拡張(MCP・Skills・Plugins・Hooks・Subagents)]]

## 4. Tools 以外も公開する
### Resources(読み取り用のデータ)
```ts
import { ResourceTemplate } from '@modelcontextprotocol/server'

server.registerResource(
  'note',
  new ResourceTemplate('notes://{slug}', { list: undefined }),
  { title: 'ノート本文', mimeType: 'text/markdown' },
  async (uri, { slug }) => ({
    contents: [{ uri: uri.href, text: await readNote(String(slug)) }],
  }),
)
```
### Prompts(定型のプロンプト)
- `server.registerPrompt(...)` で「このノートの復習問題を作る」のようなテンプレートを登録できる。Host 側ではスラッシュコマンドなどとして見える

### 構造化された結果
```ts
server.registerTool('get-stats', {
  description: 'ノートの件数を分野ごとに返す',
  outputSchema: z.object({ total: z.number(), byTopic: z.record(z.string(), z.number()) }),
}, async () => {
  const stats = await getStats()
  return { content: [{ type: 'text', text: JSON.stringify(stats) }], structuredContent: stats }
})
```
- `outputSchema` を書くと、`structuredContent` がスキーマどおりか SDK が確かめてから返す

## 5. リモートで公開する(Streamable HTTP)
多くの人・複数のクライアントから1つのエンドポイントにつなぐ形。[[Hono]] で書くと Cloudflare Workers・Node.js・Bun のどれでも動く。
```bash
npm install @modelcontextprotocol/server @modelcontextprotocol/hono hono
```
```ts
import { createMcpHonoApp } from '@modelcontextprotocol/hono'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import type { Context } from 'hono'

const handler = createMcpHandler(() => createServer())   // リクエストごとに新しいサーバーを作る

const app = createMcpHonoApp()                           // JSON の解析 + DNS リバインディング対策つき
app.all('/mcp', async (c: Context) => {
  const authInfo = await verifyToken(c.req.raw)          // ★ 認証(自分で実装)
  return handler.fetch(c.req.raw, { authInfo, parsedBody: c.get('parsedBody') })
})

export default app
```
- **ファクトリはリクエストごとに呼ばれる**(状態を持たないので横に増やせる)。DB の接続プールなどはファクトリの外で1回だけ作る
- `0.0.0.0` で公開するときは `allowedHosts` で受け付けるホスト名を指定する
- Express・Fastify・Node.js 用のアダプターもある
- 古いクライアント向けの HTTP + SSE 方式は互換のためだけ

### 認証
- リモートの MCP サーバーの認可は **OAuth 2.1** が標準(MCP サーバーはリソースサーバーとして、アクセストークンを検証する)
- 社内用なら、既存の IdP(Auth0・Entra ID・Cognito など)と組み合わせる → [[認証]]
- トークンを検証せずに公開しない。**誰が何をしたか**をログに残す → [[オブザーバビリティ]]

## 6. テスト
- v2 は `@modelcontextprotocol/client` の `Client` で、**ハンドラをプロセス内で直接呼んで**テストできる(ポート不要)。`InMemoryTransport.createLinkedPair()` でつなぐ方法もある
- ツールの中身(検索・DB アクセス)は普通の関数に分けて、Vitest で単体テスト → [[テスト]]

## 7. 安全な作り方
| リスク | 対策 |
| --- | --- |
| 強すぎる権限 | **ツールは目的ごとに小さく**。読み取りだけで済むなら書き込みを作らない。`annotations` で読み取り専用・破壊的かを示す |
| 引数を使った攻撃 | Zod で検証。パスは許可したフォルダの中だけ、SQL はプレースホルダ → [[Webセキュリティ対策]] |
| プロンプトインジェクション | ツールの結果に入る外部の文章(Web ページ・メール・Issue)に指示が混ざる前提で。秘密を扱うツールと外部へ送るツールを同じサーバーに混ぜない → [[AIアプリ開発_07_評価・コスト・セキュリティ・運用]] |
| 秘密情報 | API キーはサーバーの環境変数に。ツールの結果やログに出さない → [[APIキー・シークレット管理]] |
| ツールの説明の改ざん(tool poisoning) | 信頼できる配布元のサーバーだけ使う。説明文に隠れた指示がないか確認 |
| 取り消せない操作 | 削除・送金・送信は人の確認(elicitation で確認を求める、Host の承認設定) |

## 8. ツールの説明の書き方
- **いつ使うか・いつ使わないか・何を返すか**を書く(モデルはこれだけを見て選ぶ)
- 引数には `.describe()` で例を付ける
- 似たツールを並べない。名前は動詞 + 対象(`search-notes`・`create-issue`)
- 結果は**モデルが次に何をすればいいかわかる**形に(件数・続きの取り方・エラーの理由)
- 大量のデータを一度に返さない(件数の上限・ページング)

## 9. 公開・配布
- npm に公開して `npx パッケージ名` で起動できるようにする(stdio)
- **MCP Registry**(registry.modelcontextprotocol.io)に登録すると、対応するクライアントから探してもらえる
- Claude Code のプラグインや Skills と一緒に配る方法もある → [[13_プラグイン]] / [[09_Skills]]

## 関連
- 前: [[AIアプリ開発_07_評価・コスト・セキュリティ・運用]] / 目次: [[AIアプリ開発]]
- [[MCP]] / [[12_MCP(Claude Codeでの使い方)]] / [[Hono]] / [[Cloudflare]]
- 公式: https://ts.sdk.modelcontextprotocol.io/v2/ , https://modelcontextprotocol.io/specification/2026-07-28 , https://modelcontextprotocol.io/docs/tools/inspector , https://github.com/modelcontextprotocol/typescript-sdk

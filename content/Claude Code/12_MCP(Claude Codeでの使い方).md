---
title: "12 MCP(Claude Code での使い方)"
modified: 2026-10-25
---

MCP(Model Context Protocol)の一般的な説明は [[MCP]] を参照。ここでは Claude Code での接続・管理方法をまとめる。

## MCP でできること(例)
- 課題管理ツールの issue から機能を実装(「JIRA ENG-4521 の機能を実装して PR を作って」)
- 監視データの分析(Sentry など)
- データベースへの問い合わせ(「ENG-4521 の機能を使ったユーザー10人のメールを探して」)
- Figma のデザインを反映、Slack で通知、Gmail の下書き作成
- ブラウザ操作

## サーバーの追加
### リモート HTTP サーバー(推奨)
```bash
claude mcp add --transport http <名前> <URL>
claude mcp add --transport http notion https://mcp.notion.com/mcp
# トークン付き
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```
- SSE 方式は非推奨(同じコマンドで自動フォールバック)
- OAuth が必要なサーバーは `/mcp` からブラウザ認証(または `claude mcp login <名前>`)

### ローカル stdio サーバー(PC上のプロセス)
```bash
claude mcp add [オプション] <名前> -- <コマンド> [引数...]
claude mcp add --env AIRTABLE_API_KEY=YOUR_KEY --transport stdio airtable \
  -- npx -y airtable-mcp-server
```
- **`--` の後ろ**がサーバーの起動コマンド(Claude 側のオプションと区別するため)

### JSON から追加 / 他ツールから取り込み
```bash
claude mcp add-json <名前> '{"type":"http","url":"https://..."}'
claude mcp add-from-claude-desktop    # Claude Desktop の設定を取り込む
```
- claude.ai で設定したコネクタも(同じアカウントなら)Claude Code で使える

## 管理
```bash
claude mcp list            # 一覧
claude mcp get notion      # 詳細
claude mcp remove notion   # 削除
```
- セッション内: `/mcp` で状態確認・再接続・有効/無効切替(`/mcp disable <名前>`、全部つなぎ直す `/mcp reconnect all`)
- シェルから認証: `claude mcp login <名前>` / `claude mcp logout <名前>`
- `/context all` で各 MCP ツールのトークン消費を確認

## スコープ(保存場所)
| スコープ | 有効範囲 | チーム共有 | 保存先 |
| --- | --- | --- | --- |
| **local**(既定) | このプロジェクトだけ | しない | `~/.claude.json` |
| **project** | このプロジェクト | **する**(git) | プロジェクト直下の `.mcp.json` |
| **user** | 自分の全プロジェクト | しない | `~/.claude.json` |
```bash
claude mcp add --transport http shared-server --scope project https://example.com/mcp
claude mcp add --transport http hubspot --scope user https://mcp.hubspot.com/anthropic
```
- 同名なら local > project > user > プラグイン > claude.ai コネクタ
- `.mcp.json` のサーバーは初回に承認を求められる(リセット: `claude mcp reset-project-choices`)
- `.mcp.json` では環境変数展開が使える: `${API_KEY}`、`${VAR:-default}` → **秘密情報を直書きしない**

`.mcp.json` の例:
```json
{
  "mcpServers": {
    "shared-server": { "type": "http", "url": "https://example.com/mcp" }
  }
}
```

## コンテキストへの影響
- 既定で **Tool search** が有効: 起動時はツール名だけ読み込み、使う時に詳細スキーマを読む → つないでいるだけならほぼコストなし(v2.1.304 からカスタム `ANTHROPIC_BASE_URL` 経由でも既定ON)
- サーバー設定の `alwaysLoad: false` で、そのサーバーのツールを全部 tool search の後ろに回せる
- ツール説明とサーバー指示は 4,096 文字までで切られる(`CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` で変更)
- それでも使わないサーバーは切っておくと良い

## その他の機能
- **MCP プロンプト**がスラッシュコマンドとして使える(`/mcp__サーバー名__プロンプト名`)
- **リソース**を `@` で参照できる
- 長時間のツール呼び出しは自動でバックグラウンド化
- **Channels**: MCP サーバーから実行中セッションにイベントを押し込む(CI 失敗通知、Telegram/Discord からのメッセージなど。研究プレビュー)
- サブエージェントごとに MCP を限定できる(`mcpServers` フロントマター)

## セキュリティ
- 信頼できるサーバーだけを使う。Anthropic は第三者サーバーの安全性を保証しない
- 外部コンテンツを取得するサーバーはプロンプトインジェクションの経路になりうる
- 権限ルールで MCP を許可する時は `mcp__<サーバー名>__*` とサーバーの正式名で書く → [[05_権限とセキュリティ]]
- 補足: 2026年10月時点、Claude Code は MCP プロトコル版 `2026-07-28` で接続するのが既定(古いサーバーで問題があれば `MCP_PROTOCOL_NEGOTIATION=legacy`)

## 関連
- [[MCP]] … MCP 自体の説明
- [[08_拡張機能の全体像]]
- [[13_プラグイン]] … MCP サーバーを含むプラグイン
- 公式: https://code.claude.com/docs/en/mcp , https://code.claude.com/docs/en/mcp-quickstart

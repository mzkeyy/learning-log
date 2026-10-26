---
title: "AIアプリ開発"
modified: 2026-10-26
---

**LLM(大規模言語モデル)を自分のアプリに組み込んで、文章の生成・要約・分類・検索・エージェント的な作業をさせる開発**。[[Claude Code]] や [[Codex]] は「AI を**使って**開発する」道具、このノート群は「AI を**組み込んだ**アプリを作る」側の話。

Claude API の公式ドキュメントと Vercel AI SDK(**2026年10月時点**)を読んで、TypeScript で書く前提で整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[AIアプリ開発_01_全体像(LLMの仕組み・できること・構成)]] | トークン・コンテキスト、得意不得意、アプリの構成 |
| 02 | [[AIアプリ開発_02_Claude APIの基本(メッセージ・ストリーミング・モデル選択)]] | SDK、会話、ストリーミング、thinking と effort、モデルと料金 |
| 03 | [[AIアプリ開発_03_ツール使用と構造化出力]] | Function Calling、Tool Runner、JSON で受け取る |
| 04 | [[AIアプリ開発_04_RAG(埋め込み・ベクトル検索・引用)]] | 自分のデータで答えさせる、長いコンテキストとの使い分け |
| 05 | [[AIアプリ開発_05_エージェント(ループ・Agent SDK・Managed Agents)]] | いつエージェントにするか、4つの作り方、MCP |
| 06 | [[AIアプリ開発_06_画面との連携(AI SDK・Hono・Next.js)]] | チャット画面、ストリーミング表示、サーバー経由の呼び出し |
| 07 | [[AIアプリ開発_07_評価・コスト・セキュリティ・運用]] | evals、コスト削減、プロンプトインジェクション、監視 |
| 08 | [[AIアプリ開発_08_MCPサーバーを作る(TypeScript SDK・stdio・HTTP)]] | 自作の MCP サーバー、Claude Code からの利用、リモート公開と認証 |

## 全体の構成イメージ
```
ブラウザ(React / Next.js)
   │  ユーザーの入力       ▲ 少しずつ表示(ストリーミング)
   ▼                      │
自分のサーバー(Hono / Next.js の Route Handler)──── API キーはここだけ
   │ ├─ 認証・レート制限・入力チェック
   │ ├─ 検索(RAG): ベクトル DB / 全文検索
   │ └─ ツール実行: 自分の DB・外部 API
   ▼
LLM の API(Claude API / OpenAI API など)
```

## 押さえどころ(2026年10月時点)
- **API キーはサーバーにだけ置く**。ブラウザから直接 LLM の API を呼ばない → [[APIキー・シークレット管理]]
- API は**状態を持たない**。会話の続きは毎回、履歴を全部送る
- 長い出力は**ストリーミング**で返す(待ち時間の体感が全然違う)
- 「AI に JSON を返させる」は**構造化出力**で。文字列を正規表現で切り出さない
- まずは**1回の呼び出し**で済ませる。ワークフロー → エージェントの順に、必要なときだけ複雑にする(公式の方針)
- 作ったら**評価(evals)**で良し悪しを測る。プロンプトを変えるたびに感覚で判断しない
- 外から入ってきた文章(Web ページ・メール・ツールの結果)は**データとして扱う**(プロンプトインジェクション対策)

## 使う道具の早見表
| 道具 | 何か | いつ使う |
| --- | --- | --- |
| **Anthropic SDK**(`@anthropic-ai/sdk`) | Claude API の公式クライアント | Claude の機能を全部使いたい(このノート群の基本) |
| **Vercel AI SDK**(`ai`) | 複数社の LLM を同じ書き方で呼べる + React のフック | チャット画面を素早く作る、モデルを差し替えたい |
| **Claude Agent SDK** | Claude Code をライブラリにしたもの | ファイル操作やコマンド実行をするエージェント |
| **Managed Agents** | エージェントの実行環境ごと Anthropic が用意 | 長時間動くエージェント、定期実行 |
| **MCP** | AI とツールをつなぐ共通規格 | ツールを複数の AI アプリで使い回す → [[MCP]] |

## 出典
- [Claude API ドキュメント (公式)](https://platform.claude.com/docs/)
- [Building effective agents (Anthropic)](https://www.anthropic.com/engineering/building-effective-agents)
- [AI SDK ドキュメント (公式)](https://ai-sdk.dev/docs)
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/)

## 関連
- [[Claude Code]] / [[Codex]] / [[MCP]] / [[OpenAI]] / [[AIエンジニアリング]](コンテキスト・ハーネス・評価の設計)
- [[Hono]] / [[Next.js]] / [[Cloudflare]] / [[TypeScript]]
- [[オブザーバビリティ]] / [[Webセキュリティ対策]] / [[APIキー・シークレット管理]]

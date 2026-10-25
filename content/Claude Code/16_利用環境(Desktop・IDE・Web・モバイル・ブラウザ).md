---
title: "16 利用環境(ターミナル以外の使い方)"
modified: 2026-10-25
---

エンジンはどこでも同じ。違うのは「コードがどこで動くか」と「どう操作するか」。

## どこで使う?
| 場所 | 向いている | 特徴 |
| --- | --- | --- |
| **CLI** | ターミナル作業、スクリプト、リモートサーバー | 全機能。Agent SDK、macOS の computer use(Pro/Max) |
| **デスクトップ** | 見た目で差分確認、並列セッション | 差分ビューア、アプリのプレビュー、computer use、Dispatch |
| **VS Code / Cursor** | エディタから離れずに | インライン差分、@メンション、プランのレビュー |
| **JetBrains** | IntelliJ / PyCharm / WebStorm など | 差分ビューア、選択範囲の共有 |
| **Web(クラウド)** | あまり操作しない長時間タスク、オフライン中も継続 | Anthropic 管理のクラウドで動く |
| **モバイル** | 外出中に開始・監視 | クラウドセッション、Remote Control、Dispatch |

## デスクトップアプリ(Claude アプリの「Code」タブ)
Claude アプリには Chat / Cowork / **Code** の3タブがあり、Code タブが Claude Code。CLI のインストールは不要(有料プラン)。macOS / Windows に加え、Linux(Ubuntu・Debian)は β、Windows では WSL のセッションも扱える。
主な機能:
- **並列セッション**(それぞれ git worktree で隔離可能)、ペインのドラッグ配置・別ウィンドウ化
- **差分ビュー**で変更をレビュー、コメントして修正依頼
- **アプリのプレビュー**(開発サーバーを内蔵ブラウザで表示)、**内蔵ブラウザ**で外部サイトも閲覧
- 統合ターミナル、ファイルエディタ
- **PR の監視**(CI の状態確認・自動修正)
- **computer use**(Claude が画面を見てアプリを操作。Pro/Max)
- **Dispatch**: スマホの Claude アプリからタスクを送ると、デスクトップで実行
- **定期タスク**、クラウドセッションの起動、SSH セッション
- iOS シミュレーターでアプリを動かして確認(β)
- CLI のセッションを `/resume` で引き継げる。CLI からは `/desktop`(別名 `/app`)、シェルからは `claude --desktop` で移動
- 使用上限に達しても「Auto-continue when limits reset」にチェックすると、リセット後に自動で再開
- 設定ファイル(`~/.claude/settings.json`、CLAUDE.md、MCP など)は CLI と共通

## VS Code 拡張
- 拡張機能で「Claude Code」を検索してインストール(Cursor も可)。コマンドパレット →「Claude Code: Open in New Tab」
- プランを確認・編集してから承認、編集の自動承認、選択範囲を行番号付きで @メンション、会話履歴、複数タブ
- 権限モードは入力欄下のインジケーターで切替
- メッセージにタイムスタンプが表示される(設定 Claude Code: Show Message Timestamps で OFF)。エディタの選択範囲を勝手に添付させたくなければ `claudeCode.attachSelection` を OFF
- Chrome 連携でブラウザ操作も可能

## JetBrains
- JetBrains Marketplace の「Claude Code」プラグイン + CLI が必要
- IDE のターミナルで CLI が動き、差分を IDE で表示

## クラウドセッション(Web: claude.ai/code)
- Anthropic 管理のクラウド(または自社のセルフホスト環境)で動く。**PC を閉じても続く**
- 手元にないリポジトリでも作業可能。複数タスクを並列に
- GitHub 連携が必要(`/web-setup` でローカルの `gh` 認証を使う)
- 移動: ターミナル → クラウド `claude --cloud "タスク"`、クラウド → ターミナル `/teleport`(`claude --teleport`)
- 環境設定(`/remote-env`)でセットアップスクリプトやネットワーク制限を指定
- 注意: ローカルの `~/.claude` の Skills・プラグインは読まれない(リポジトリにコミットしたものは読まれる)

## Projects(Pro/Max 公開β)
claude.ai/code の1つの会話で、Claude が関連タスクごとに「スレッド」(主にクラウドセッション)を並列に起動・管理。数日〜数週間の一連の仕事向け。

## Remote Control(手元のセッションを外から操作)
```bash
claude remote-control     # サーバーモード
/remote-control           # 今のセッションを公開(/rc)
```
- claude.ai/code やスマホアプリから、**自分のPCで動いているセッション**を操作(ファイル・MCP・ツールは手元のまま)
- 端末・ブラウザ・スマホのどこからでも同じ会話に書き込める。写真やファイルも送れる
- claude.ai アカウントでのログインが必要(API キー不可)

## モバイル(iOS / Android の Claude アプリ)
- 専用アプリはなく、Claude アプリの Code タブから: クラウドセッション、Remote Control、Dispatch
- 権限確認への応答もスマホから

## Chrome 連携(Claude in Chrome)
- Chrome 拡張と連携して、**ログイン済みのブラウザ**を操作: Webアプリのテスト、コンソールログでデバッグ、フォーム入力、データ抽出
- `claude --chrome` または `/chrome`、ユーザー設定で ON(v2.1.290 からプロジェクトの設定ファイルでは有効にできない = 他人のリポジトリに勝手に ON にされない)
- ログイン画面や CAPTCHA では止まって人間に任せる

## computer use(CLI、macOS、Pro/Max、研究プレビュー)
- Claude がアプリを開いてクリック・入力・画面確認。ネイティブアプリの動作確認や GUI しかないツールの操作に

## Slack と Claude Tag
- **Claude Tag**(Team / Enterprise、公開β): Slack のチャンネルで `@Claude` にタグ付けして仕事を頼むと、使い捨てのサンドボックスで作業し、進捗をチェックリストでスレッドに返す。バグ再現→PR、議論→ドキュメント、監視アラートの調査など
  - チャンネルの全員が使え、1人ずつの Claude シートは不要(組織の利用残高から従量課金、上限は Owner が設定)
  - 何にアクセスできるか(リポジトリ・チケット・DB など)は管理者がチャンネル単位で接続する。`@Claude what can you access from this channel?` で確認できる
  - セットアップは Owner が claude.ai/admin-settings/claude-tag から(Slack で `@Claude connect` してペアリング)
- 個人プラン(Pro/Max)では従来の「Claude Code in Slack」(`/install-slack-app`)を使う
- 使い分け: チームで共有するチャンネルの仕事は Claude Tag、自分のファイルでの作業は Claude Code / Cowork

## アーティファクト(Artifacts)
- Claude Code の成果を **claude.ai 上のインタラクティブな Web ページ**として公開(非公開 → 組織共有 → 公開リンク)
- 例: 調査に合わせて更新されるタイムライン、ダッシュボード、図解。MCP コネクタでライブデータも取得可能
- `/artifacts` で一覧(All / Mine / Shared タブ)、`/design` で UI モックのアートボード
- 単体の Claude Design は 2026年12月14日で終了予定(`/design-sync` `/design-login` に案内あり)

## 関連
- [[01_概要とインストール]]
- [[14_並列作業(Worktree・Agent View・Workflows)]]
- 公式: https://code.claude.com/docs/en/platforms , https://code.claude.com/docs/en/desktop , https://code.claude.com/docs/en/vs-code , https://code.claude.com/docs/en/claude-code-on-the-web , https://code.claude.com/docs/en/remote-control , https://code.claude.com/docs/en/chrome , https://code.claude.com/docs/en/artifacts , https://claude.com/docs/claude-tag

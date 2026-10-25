---
title: "04 CLAUDE.md とメモリ"
modified: 2026-10-25
---

セッションは毎回まっさらなコンテキストで始まる。セッションをまたいで知識を持ち越す仕組みは2つ。

| | CLAUDE.md | 自動メモリ(Auto memory) |
| --- | --- | --- |
| 書く人 | **あなた** | **Claude** |
| 中身 | 指示・ルール | 学び・パターン(あなたの好み、訂正内容) |
| 範囲 | プロジェクト / ユーザー / 組織 | リポジトリ単位(worktree間で共有) |
| 読み込み | 毎セッション全文 | 毎セッション(MEMORY.md 先頭200行 or 25KB) |

**注意**: どちらも「強制力のある設定」ではなく「文脈」。絶対に守らせたいこと(例: .env を触らせない)は **Hook** で強制する → [[11_Hooks]]

## CLAUDE.md
### いつ追記するか
- Claude が**同じミスを2回**した
- コードレビューで「これは知っておくべきだった」という指摘が出た
- 前回と同じ訂正をチャットで打った
- 新メンバーにも同じ説明が必要

### 置き場所(読み込み順: 広い → 狭い)
| 範囲 | 場所 | 共有 |
| --- | --- | --- |
| 組織(管理ポリシー) | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md` など | 組織全員 |
| ユーザー | `~/.claude/CLAUDE.md` | 自分(全プロジェクト) |
| プロジェクト | `./CLAUDE.md` または `./.claude/CLAUDE.md` | チーム(gitで共有) |
| ローカル | `./CLAUDE.local.md`(.gitignore に入れる) | 自分(このプロジェクトだけ) |

- 起動ディレクトリとその**親すべて**の CLAUDE.md を読み込む(上書きではなく**連結**)
- サブフォルダの CLAUDE.md は、Claude がそこのファイルを読んだ時に読み込まれる
- `<!-- コメント -->` は Claude に渡されない(人間向けメモに使える)

### 良い書き方(公式)
- **200行以下**が目安。長いと守られなくなる
- 見出しと箇条書きで構造化
- **具体的に・検証可能に**
  - ✗「きれいに整形して」→ ○「インデントはスペース2つ」
  - ✗「テストして」→ ○「コミット前に `npm test` を実行」
  - ✗「整理して」→ ○「APIハンドラは `src/api/handlers/` に置く」
- 矛盾するルールを作らない(どちらかが適当に選ばれる)
- どうしても守らせたい1行だけ「IMPORTANT」を付ける(全部に付けると効かない)

| ✅ 書くべき | ❌ 書かなくていい |
| --- | --- |
| 推測できない bash コマンド | コードを読めば分かること |
| デフォルトと違うコードスタイル | 言語の一般的な慣習 |
| テスト方法・使うテストランナー | 詳細なAPIドキュメント(リンクで十分) |
| ブランチ命名・PRの慣習 | 頻繁に変わる情報 |
| プロジェクト固有の設計判断 | 長い説明・チュートリアル |
| 必要な環境変数など環境のクセ | ファイルごとの説明 |
| ハマりどころ | 「きれいなコードを書く」のような自明なこと |

各行について「**これを消したら Claude はミスするか?**」と自問し、No なら削る。

### 便利機能
- `/init` で雛形生成(`CLAUDE_CODE_NEW_INIT=1` で Skills や Hooks まで対話的に作る)
- `@path/to/file` で他ファイルを取り込む(最大4段、相対パスはそのファイル基準)
  ```text
  See @README for project overview and @package.json for npm commands.
  - git workflow @docs/git-instructions.md
  ```
  ※ 取り込んだファイルも起動時に全部読まれる = 節約にはならない
- `/doctor prompt-audit` … CLAUDE.md・Skills・サブエージェント・コマンドに「古いモデル向けの書き方」(過剰な強調など)が残っていないか監査(v2.1.283〜)
- `/doctor` … コードから推測できる内容を削る提案
- `/context` の「Memory files」で読み込まれたか確認

### .claude/rules/(ルールの分割)
大きなプロジェクトではトピック別ファイルに分けられる。
```text
.claude/
├── CLAUDE.md
└── rules/
    ├── code-style.md
    ├── testing.md
    └── security.md
```
`paths` を付けると**該当ファイルを触った時だけ**読み込まれる(コンテキスト節約):
```markdown
---
paths:
  - "src/api/**/*.ts"
---
# API Development Rules
- 全エンドポイントに入力バリデーション
```
- 個人用ルールは `~/.claude/rules/`(全プロジェクト共通)

### AGENTS.md との関係
- AGENTS.md は他のAIツール([[Codex]] など)と共通の指示ファイル
- **CLAUDE.md が無ければ AGENTS.md を自動で読む**(v2.1.277以降)。CLAUDE.md があれば CLAUDE.md だけ
- この読み込みは組み込みの Mod `cc-plugin-agents-md` が担当している(`/plugin` の Installed → Built-in で確認できる)
- 両方読ませたい → `/config` の Project instructions を `claude-md-and-agents-md` に
- 1つのファイルを共有するおすすめ構成:
  ```markdown
  # CLAUDE.md
  @AGENTS.md
  ## Claude Code
  src/billing/ の変更はプランモードで。
  ```
- `/init` は `.cursorrules` や Copilot の指示ファイルも取り込んでくれる

## 自動メモリ(Auto memory)
- Claude が作業中に「今後役立つ」と判断したことを自分でメモする(既定ON)
- 4種類: `user`(あなたの役割・好み) / `feedback`(訂正・承認されたやり方) / `project`(進行中の仕事・期限・決定) / `reference`(外部情報の場所)
- コードから分かること、CLAUDE.md に既にあることは保存しない
- 保存先: `~/.claude/projects/<project>/memory/`(`MEMORY.md` が索引、トピック別ファイル)
- マシンローカル(他PCやクラウドとは共有されない)
- 「pnpm を使ってと覚えて」と言うと自動メモリへ。CLAUDE.md に書かせたいなら「CLAUDE.md に追加して」
- 確認・編集: `/memory`、無効化: `autoMemoryEnabled: false`

## うまく効かないとき
- `/context` で読み込まれているか確認
- 置き場所が正しいか、指示が具体的か、他のファイルと矛盾していないか
- `/compact` 後に消えた → 会話だけで伝えた指示は消える。CLAUDE.md に書く(ルートの CLAUDE.md は要約後に再読み込みされる)
- 必ず特定のタイミングで実行させたい → Hook へ

## 関連
- [[mdファイル使い分け]]
- [[09_Skills]] … 「たまに必要な知識・手順」はこちら
- [[08_拡張機能の全体像]]
- 公式: https://code.claude.com/docs/en/memory

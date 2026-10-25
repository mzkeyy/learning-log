---
title: "11 Hooks(フック)"
modified: 2026-10-25
---

Claude Code のライフサイクルの決まったタイミングで**自動実行される処理**(主にシェルコマンド)。
CLAUDE.md の指示は「お願い」だが、Hook は**必ず実行される**(決定的)。ルールの強制・繰り返し作業の自動化・既存ツールとの連携に使う。

## 最初の Hook(Claude が入力待ちになったらmacOS通知)
`~/.claude/settings.json`:
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```
- `/hooks` で確認(閲覧専用。編集は JSON を直接か、Claude に頼む)
- 通知が出ない場合: システム設定 > 通知 で「スクリプトエディタ」を許可
- **Claude に書かせられる**: 「ファイル編集のたびに eslint を実行する Hook を書いて」「migrations フォルダへの書き込みをブロックする Hook を書いて」

## 代表的な使い方
### 編集後に自動フォーマット
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write" }]
      }
    ]
  }
}
```
### 危険なコマンドをブロック(PreToolUse)
```bash
#!/bin/bash
INPUT=$(cat)                                        # stdin に JSON が来る
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
if echo "$COMMAND" | grep -q "drop table"; then
  echo "Blocked: dropping tables is not allowed" >&2  # stderr が Claude へのフィードバックになる
  exit 2                                               # 2 = ブロック
fi
exit 0                                                 # 0 = 異議なし(通常の権限フローへ)
```
### その他
- 保護ファイル(`.env`, `package-lock.json` など)の編集を禁止
- コンパクション後に重要な文脈を再注入(SessionStart の `compact`)
- 設定変更の監査ログ
- ディレクトリ移動時に環境を再読込(direnv 連携)
- 特定の権限確認を自動承認

## 主なイベント
| イベント | タイミング |
| --- | --- |
| `SessionStart` / `SessionEnd` | セッション開始・再開 / 終了 |
| `UserPromptSubmit` | プロンプト送信時(Claude が処理する前)。v2.1.299 からスキルやカスタムコマンドが展開される**前**に動く(ブロックすると埋め込みのシェルコマンドも止まる) |
| `PreToolUse` | ツール実行前(**ブロック可能**) |
| `PermissionRequest` / `PermissionDenied` | 権限確認が必要な時 / Auto モードで拒否された時 |
| `PostToolUse` / `PostToolUseFailure` | ツール成功後 / 失敗後 |
| `Notification` | 通知時(入力待ちなど) |
| `Stop` / `StopFailure` | Claude の応答終了時 / APIエラーで終了時 |
| `SubagentStart` / `SubagentStop` | サブエージェント開始 / 終了 |
| `PreCompact` / `PostCompact` | コンパクション前後 |
| `InstructionsLoaded` | CLAUDE.md や rules が読み込まれた時(デバッグに便利) |
| `ConfigChange` / `CwdChanged` / `FileChanged` | 設定変更 / ディレクトリ移動 / 監視ファイル変更 |
| `WorktreeCreate` / `WorktreeRemove` | worktree 作成・削除 |
| ほか | `Setup` `UserPromptExpansion` `PostToolBatch` `TaskCreated` `TaskCompleted` `PreModelSwitch` `Elicitation` など |

## Hook の種類(type)
- `command` … シェルコマンド(一番よく使う)
- `http` … URL にイベントを POST
- `mcp_tool` … MCP サーバーのツールを呼ぶ
- `prompt` … LLM に1回判定させる(判断が必要な条件)
- `agent` … ツールを使える多段の検証(実験的)。※ `PermissionRequest` では動かない(v2.1.280〜。許可/拒否を返せないため)
- 同じイベントの `prompt` / `agent` Hook は同時に最大12個まで実行

> Mod の中の「hook」(JavaScript の関数)とは別物。公式ドキュメントでは区別のため、こちらを **settings hook** と呼ぶ → [[13_プラグイン]]

## 入出力の仕組み
- **入力**: stdin に JSON(`session_id`, `cwd`, `hook_event_name`, `tool_name`, `tool_input` など)
- **終了コード**:
  - `0` … 異議なし。PreToolUse では「許可」ではなく通常の権限フローへ。UserPromptSubmit/SessionStart では stdout が Claude の文脈に追加される
  - `2` … **ブロック**。stderr の理由が Claude(またはユーザー)に伝わる
  - その他 … 多くの場合、非ブロッキングのエラー扱い
- **JSON 出力**(exit 0 で stdout に JSON)で細かい制御:
  ```json
  {"hookSpecificOutput": {"hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "grep ではなく rg を使って"}}
  ```
  `allow`(確認をスキップ。ただし deny ルールは有効) / `deny` / `ask`
- 同じイベントに複数 Hook → 並列実行、最も厳しい判断(deny > defer > ask > allow)が採用される
- **失敗したらブロック**: `command` / `http` Hook に `"onFailure": "block"` を付けると、起動失敗・タイムアウト・異常終了の時も操作を止める(ガードレール用途で「Hook が壊れていたら素通り」を防ぐ。v2.1.295〜)
- PreToolUse などで返す `updatedInput` は Claude 自身の入力と同じように検証され、知らないキーは捨てられる

## matcher(絞り込み)
- ツール名で絞る: `"Edit|Write"`、`"Bash"`、`"mcp__github__.*"`
- `if` フィールドでツール名+引数まで絞れる

## 置き場所
| 場所 | 範囲 |
| --- | --- |
| `~/.claude/settings.json` | 自分の全プロジェクト |
| `.claude/settings.json` | プロジェクト(コミット可) |
| `.claude/settings.local.json` | プロジェクト(自分だけ) |
| 管理ポリシー | 組織 |
| プラグインの `hooks/hooks.json` | プラグイン有効時 |
| Skill / サブエージェントのフロントマター | そのスキル起動後 / そのエージェント実行中 |
- 全停止: `"disableAllHooks": true`
- スクリプトのパスは `"$CLAUDE_PROJECT_DIR"/.claude/hooks/xxx.sh` のように書く

## 注意
- Hook はあなたの権限でシェルを実行する → 他人のリポジトリやプラグインの Hook は中身を確認
- Stop Hook で「テストが通るまで終わらせない」ことができるが、連続ブロック回数には上限がある
- デバッグ: `claude --debug`、`Ctrl+O` でトランスクリプト表示

## 関連
- [[08_拡張機能の全体像]]
- [[05_権限とセキュリティ]]
- 公式: https://code.claude.com/docs/en/hooks-guide , https://code.claude.com/docs/en/hooks

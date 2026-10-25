---
title: "Codex 07 プロンプトとベストプラクティス・Claude Code との比較"
modified: 2026-10-25
---

## 良いプロンプトの4要素(公式)
| 要素 | 内容 |
| --- | --- |
| **Goal(目的)** | 何をしてほしいか。手順より**結果**を書く |
| **Context(文脈)** | 関係するファイル・再現手順・資料(必要なものだけ) |
| **Output(成果物)** | 形式・長さ・詳しさ |
| **Boundaries(境界)** | 変えてはいけないもの、避けること、実行前に確認すべきこと |
短い指示で十分な時も多い。大事な作業ほど4要素を足す。

**Codex 向けに特に**: 望む挙動 + 関係コード/再現手順 + 守る制約 + **検証方法**。

## ワークフロー例(公式の型に沿った例文)
### コードベースを理解する(IDE が速い)
```text
選択したコードでリクエストがどう流れるか説明して。
- 関わる各モジュールの責務の短い要約
- どのデータがどこで検証されるか
- 変更する時の「落とし穴」を1〜2個
```
検証: 「リクエストの流れを番号付きで。最後に関係ファイル一覧」

### バグを直す(CLI でループ)
```text
@src/cart.ts @src/cart.test.ts
カートに同じ商品を2回追加すると数量が1のままになる。
再現する失敗テストを書き、原因を直し、テストを全部実行して結果を見せて。
公開 API のシグネチャは変えないこと。
```

### テストを書く / スクリーンショットから試作 / UI をライブで調整
- 画像を添付し「このデザインを実装して。変更したらブラウザで確認して差分を列挙」
- UI は開発サーバーを動かしながら少しずつ

## ベストプラクティス
- **タスクの前後に Git コミット**
- 大きな作業は `/plan` → 合意 → 実装、または `/goal`
- AGENTS.md に「コマンド」「規約」「完了の定義」を書き、**小さく保つ**
- 資料・MCP は必要なものだけ(精度と利用枠の両方に効く)
- 最初の結果を見てフォローアップで調整(作業中の割り込み・キューも可)
- 出力は必ず自分で確認(テスト結果・差分・動作)

## Claude Code との比較
| 観点 | Codex | Claude Code |
| --- | --- | --- |
| 提供元 | OpenAI(ChatGPT の一部) | Anthropic |
| 指示ファイル | **AGENTS.md**(`AGENTS.override.md`) | **CLAUDE.md**(AGENTS.md も読める) |
| 設定 | `~/.codex/config.toml`(TOML) | `~/.claude/settings.json`(JSON) |
| 安全 | sandbox_mode × approval_policy、Rules | 権限モード(Auto 等)× allow/deny ルール、サンドボックス |
| Skills の場所 | `.agents/skills/` | `.claude/skills/` |
| サブエージェント | `.codex/agents/*.toml` | `.claude/agents/*.md` |
| 長時間作業 | `/goal`、Ultra | `/goal`、動的ワークフロー、`/loop` |
| クラウド | Codex cloud | クラウドセッション(claude.ai/code)/ Scheduled tasks(旧 routines) |
| 移行 | `/import` で Claude Code・Cursor の設定を取り込み | `/import codex` で Codex の設定を取り込み |

### 併用のコツ
- **AGENTS.md を共通の正本**にし、CLAUDE.md には `@AGENTS.md` + Claude 固有の追記だけ
- 片方で実装、もう片方でレビュー(書いた本人のバイアスを避ける = Writer/Reviewer パターン)
- どちらもモデル・機能の更新が速い → 公式の What's new を定期的に確認

## 関連
- 前: [[Codex_06_クラウド・コードレビュー・自動化]] / 目次: [[Codex]]
- [[07_ベストプラクティス]](Claude Code 版)
- 公式: https://learn.chatgpt.com/docs/prompting

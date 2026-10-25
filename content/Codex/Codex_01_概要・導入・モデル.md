---
title: "Codex 01 概要・導入・モデル"
modified: 2026-09-29
---

## Codex でできること
- コードベースの説明(オンボーディング)
- 機能追加・バグ修正・テスト作成(計画 → 編集 → テスト実行 → 検証)
- コードレビュー(未コミットの変更、ブランチ差分、PR)
- スクリーンショットからの UI 試作、ライブ更新しながらの UI 調整
- CI・スクリプトからの自動実行、クラウドでの並列タスク

## プランと利用枠
- ChatGPT のプラン(Free / Go / Plus / Pro / Business / Enterprise / Edu)に含まれる。**ChatGPT Work と Codex は利用枠を共有**
- API キーでも使えるが、一部機能は使えない
- 利用枠を長持ちさせるコツ(公式): プロンプトを必要十分に、資料を絞る、出力の形式・長さを指定、**AGENTS.md を小さく**(ネストで分割)、**使わない MCP サーバーは無効化**
- 残量: `/status` `/usage`

## インストール(CLI)
```bash
# macOS / Linux
curl -fsSL https://chatgpt.com/codex/install.sh | sh
# npm
npm install -g @openai/codex
# Homebrew
brew install --cask codex
```
```powershell
# Windows
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```
更新は同じコマンド、または `codex update`。

## 起動とログイン
```bash
cd my-project
codex                     # 初回は「Sign in with ChatGPT」
```
最初の一言: `Tell me about this project`(このプロジェクトについて教えて)
> 公式の推奨: **タスクの前後で Git のチェックポイント(コミット)を作る**。いつでも戻せるように。

## デスクトップアプリで使う
1. ChatGPT デスクトップアプリをインストールしてサインイン
2. フォルダを開く(またはプロジェクトを作る)
3. ドロップダウンで **Codex** を選ぶ(調査・資料作成は Work、雑談は Chat)
4. 例: 「このアプリを調べて、効果の大きいユーザビリティ改善を1つ実装し、テストを更新して、モバイルとデスクトップで確認して」

## モデル(2026年9月時点)
| モデル | 位置づけ |
| --- | --- |
| **GPT-6 Sol**(`gpt-6-sol`) | Plus / Pro / Business / Enterprise / Edu の主力(GPT-5.5 の後継) |
| **GPT-6 Luna**(`gpt-6-luna`) | Free / Go 向け(デスクトップアプリ) |
| GPT-6 Astra | 安全監視(タスク中の危険な挙動を検知して一時停止) |
- ⚠️ **GPT-5.5 は 2026年10月14日に ChatGPT・Codex から引退**(API は対象外)→ 設定・スクリプト・カスタムエージェントの `gpt-5.5` を置き換える
- **推論の深さ(reasoning effort)**: 既定から始め、難しい計画・分析の時だけ上げる(遅く・トークンを多く使う)
- **Ultra モード**: サブエージェントを使って大きな作業を分割・並列化
- **Fast**: 対応モデルで高速な提供枠(`/fast`)
- 切替: `/model`(推論の深さも一緒に選べる)、デスクトップアプリは入力欄下の選択、設定 `model = "gpt-6-sol"`

## 関連
- 次: [[Codex_02_基本操作(CLI・スラッシュコマンド・exec)]]
- 公式: https://learn.chatgpt.com/docs/codex/cli , https://learn.chatgpt.com/docs/quickstart , https://learn.chatgpt.com/docs/models , https://learn.chatgpt.com/docs/pricing

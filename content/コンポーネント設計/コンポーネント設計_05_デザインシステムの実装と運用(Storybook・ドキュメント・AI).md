---
title: "コンポーネント設計 05 デザインシステムの実装と運用(Storybook・ドキュメント・AI)"
modified: 2026-10-27
---

## 層の構成
| 層 | 中身 | 道具 |
| --- | --- | --- |
| 1. トークン | 色・余白・文字・角丸・影・動き | CSS 変数、Tailwind のテーマ、Style Dictionary → [[デザイントークン]] |
| 2. プリミティブ | 振る舞い・アクセシビリティ | Radix・Base UI・React Aria |
| 3. 共通コンポーネント | Button・Input・Dialog… | shadcn/ui を土台に自分たちの見た目へ → [[shadcn-ui]] |
| 4. パターン | よく使う組み合わせ・画面の型 | EmptyState・DataTable・フォームの型・ページヘッダー |
| 5. ガイドライン | いつ・どう使うか、使ってはいけない場面 | DESIGN.md、ドキュメントサイト → [[デザインシステム]] |
- **小さく始める**: よく使う 10〜20 個(ボタン・入力・選択・チェック・ダイアログ・トースト・カード・タブ・表・バッジ)から
- 自前で全部作るより、**既存の部品集を土台にして自分たちのトークンとルールを乗せる**のが現実的

## Storybook
**部品をアプリから切り離して、1つずつ表示・操作・確認する**ためのツール。CBD の中心的な道具。2026年10月時点で 10 系。
```bash
npx storybook@latest init
```
```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'

const meta = {
  component: Button,
  args: { children: '保存' },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
export const Danger: Story = { args: { variant: 'danger', children: '削除' } }
export const Disabled: Story = { args: { disabled: true } }
export const LongText: Story = { args: { children: 'とても長いラベルのボタンが折り返したときの表示' } }
```
| 機能 | 使い方 |
| --- | --- |
| Stories | 状態ごとの見本(通常・無効・読み込み中・エラー・長い文字・空) |
| Controls | props を画面で変えて試す |
| Docs | Stories と型からドキュメントを自動生成 |
| **Interaction tests** | Story の中で操作して確かめる(`play` 関数)。Vitest で実行できる |
| **a11y アドオン** | axe でアクセシビリティを自動チェック |
| ビジュアルテスト | 見た目の変化をスクリーンショットで比較(Chromatic など) |
- Story は**テストのケースでもあり、ドキュメントの例でもあり、AI への見本でもある**
→ [[テスト_04_コンポーネントテスト(Testing Library・Browser Mode)]]

## テスト
| 何を | どう |
| --- | --- |
| 振る舞い | Testing Library / Vitest Browser Mode / Storybook の interaction tests |
| アクセシビリティ | axe(Storybook の a11y アドオン・Playwright) |
| **見た目** | スクリーンショットの比較(Storybook + Chromatic、Vitest の `toMatchScreenshot`、Playwright) |
| 型 | props の使い方の間違い |
- 共通の部品は多くの画面に影響するので、**見た目の比較テスト**の効果が大きい

## デザインとの連携
- **Figma の部品と、コードの部品を1対1で対応**させる(名前・props・バリエーション)
- トークンは Figma の Variables とコードで同じ名前に。書き出し・同期の仕組み(Tokens Studio、Style Dictionary)→ [[デザイントークン_03_W3C標準形式(DTCG)]]
- Figma の **Code Connect** や **Dev Mode MCP** で、デザインからコードの部品を参照できる
- デザイナーとエンジニアが**同じ部品の名前**で話せる状態にする

## ドキュメント
各部品に書くこと:
- 何のための部品か、**いつ使う / 使わない**か(例: 「1画面に主要ボタンは1つ」)
- バリエーションと状態
- props の説明(型から自動生成)
- アクセシビリティの注意(必要な `aria-label` など)
- 良い例・悪い例
→ 置き場所: Storybook の Docs、ドキュメントサイト、リポジトリの DESIGN.md

## 配布と運用
| 形 | 向く場面 |
| --- | --- |
| アプリの中に置く(`components/ui`) | 1つのプロダクト。shadcn/ui の考え方 |
| モノレポの共通パッケージ(`packages/ui`) | 複数のアプリで共有 → [[モノレポ]] |
| npm に公開 | 社内の多くのプロダクト・外部公開。バージョン管理(Changesets)が必要 |
| shadcn のレジストリ形式 | コマンドで部品を取り込める形で配布 → [[shadcn-ui_06_レジストリ・MCP・AI開発・実務の注意]] |
- 変更の影響が大きいので、**変更履歴・移行ガイド**を用意し、破壊的な変更はまとめて計画的に
- 「部品にない UI を各チームが勝手に作る」を減らすため、**新しい部品の追加の流れ**(提案 → レビュー → 追加)を決める
- 利用状況を見て、使われていない部品・似た部品を整理する

## AI と デザインシステム
- AI は放っておくと、**画面ごとにバラバラな見た目**(色を直接書く・似た部品を新しく作る)を生みがち
- 対策:
  - **部品の一覧と使い方のルール**を DESIGN.md / CLAUDE.md に書き、「新しい部品を作る前に既存の部品を探す」と指示 → [[04_CLAUDE.mdとメモリ]]
  - 色・余白は**トークンだけ**使うよう lint で強制(任意の色の禁止など)→ [[AIエンジニアリング_04_コーディングエージェントのハーネス(実践)]]
  - デザインシステムを **MCP サーバー・レジストリ**で AI から検索・追加できるようにする → [[デザインシステム]]
  - Storybook とスクリーンショットで、AI が作った画面の見た目を確かめる
- AI に新しい部品を作らせるときは、**既存の部品の Story と実装を見本に**渡す

## チェックリスト
- [ ] トークンが定義され、部品は色・余白を直接書いていない
- [ ] 複雑な部品はアクセシブルなプリミティブを土台にしている
- [ ] 共通の部品は業務を知らず、外側の余白を持たない
- [ ] 部品ごとに状態の揃った Story がある
- [ ] 振る舞い・アクセシビリティ・見た目のテストがある
- [ ] いつ使う / 使わないのドキュメントがある
- [ ] Figma とコードで部品とトークンの名前が揃っている
- [ ] 変更履歴と、新しい部品を追加する流れがある
- [ ] AI に部品の一覧とルールを渡している

## 関連
- 前: [[コンポーネント設計_04_APIの設計(props・variants・合成・アクセシビリティ)]] / 目次: [[コンポーネント設計]]
- [[デザインシステム]] / [[デザイントークン]] / [[shadcn-ui]] / [[テスト]]
- 参考: https://storybook.js.org/docs , https://storybook.js.org/docs/writing-tests , https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect , https://design.digital.go.jp/

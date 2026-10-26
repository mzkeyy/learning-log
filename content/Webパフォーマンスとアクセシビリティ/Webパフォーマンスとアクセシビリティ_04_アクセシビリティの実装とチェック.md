---
title: "Webパフォーマンスとアクセシビリティ 04 アクセシビリティの実装とチェック"
modified: 2026-10-26
---

## まず正しい HTML の要素を使う
| やりたいこと | ✅ 使う | ❌ 避ける |
| --- | --- | --- |
| 操作(送信・開閉) | `<button>` | `<div onClick>` |
| ページの移動 | `<a href>` | `<span onClick>` |
| 入力欄の説明 | `<label for>` | プレースホルダーだけ |
| 見出し | `<h1>`〜`<h6>`(順番どおり) | 太字の `<div>` |
| まとまり | `<header>` `<nav>` `<main>` `<footer>` `<section>` | `<div>` だけ |
| 一覧 | `<ul>` / `<ol>` | `<div>` の並び |
| 表 | `<table>` + `<th scope>` | `<div>` で組んだ表 |
- 正しい要素なら、**キーボード操作・読み上げ・役割の伝達が最初から付いてくる**
- `<div onClick>` をボタンにするには、`role="button"`・`tabIndex={0}`・Enter と Space の処理…と全部自分で書く必要がある

## ARIA は最後の手段
> ARIA を使わずに済むなら使わない(ARIA の第一のルール)
| 属性 | 用途 | 例 |
| --- | --- | --- |
| `aria-label` | 見た目の文字がない要素に名前 | アイコンだけのボタン `<button aria-label="閉じる">×</button>` |
| `aria-labelledby` / `aria-describedby` | 他の要素を名前・説明として結ぶ | 入力欄のヒント・エラーメッセージ |
| `aria-expanded` | 開いているか | メニュー・アコーディオンのボタン |
| `aria-current="page"` | 今のページ | ナビゲーション |
| `aria-live="polite"` / `role="status"` | 変化を読み上げる | 「保存しました」「3件見つかりました」 |
| `role="alert"` | すぐ読み上げる重要な通知 | エラー |
| `aria-hidden="true"` | 読み上げから隠す | 飾りのアイコン |
- 間違った ARIA は**ないより悪い**(読み上げが嘘をつく)
- モーダル・タブ・コンボボックスなど複雑な部品は、**作り方の手本(WAI-ARIA APG)**に従うか、対応済みの部品(Radix・React Aria、それを使う shadcn/ui)を使う → [[shadcn-ui]]

## キーボード操作
| キー | 動き |
| --- | --- |
| Tab / Shift+Tab | 次 / 前の操作できる要素へ |
| Enter | リンク・ボタンを実行 |
| Space | ボタン・チェックボックス |
| 矢印キー | ラジオボタン・タブ・メニューの中の移動 |
| Esc | モーダル・メニューを閉じる |
- **フォーカスの順番が見た目の順番どおり**か(`tabIndex` に正の数を使わない)
- **フォーカスの枠を消さない**(`outline: none` だけにしない)。`:focus-visible` で見た目を整える
- モーダルを開いたら中にフォーカスを移し、閉じたら元のボタンに戻す。開いている間は外にフォーカスが出ない(`<dialog>` 要素の `showModal()` はこれをやってくれる)
- 長いナビゲーションを飛ばす「本文へスキップ」リンク

## フォーム
```html
<label for="email">メールアドレス(必須)</label>
<input id="email" name="email" type="email" autocomplete="email" required
       aria-invalid="true" aria-describedby="email-error">
<p id="email-error" role="alert">メールアドレスの形式が正しくありません(例: taro@example.com)</p>
```
- すべての入力欄に**見えるラベル**(プレースホルダーは入力すると消えるので代わりにならない)
- 必須は文字でも示す、エラーは**何が・どう間違っていて・どう直すか**
- `autocomplete` で入力の手間を減らす(住所・メール・パスワード)
- 送信後のエラーは、最初のエラーの欄にフォーカスを移すか、エラーの一覧を出す

## 画像・動画・色
- 画像の `alt` は「その画像が伝えたいこと」。飾りは `alt=""`
- グラフ・図は、内容を文章や表でも提供する
- 動画には字幕、音声だけのものには書き起こし
- 色の違いだけで情報を伝えない(必須項目を赤だけで示さない、グラフに模様やラベル)
- **ダークモード・拡大・`prefers-reduced-motion`**(動きを減らす設定)に対応する

## チェックの方法
| 方法 | 見つかるもの |
| --- | --- |
| **自動チェック**(axe DevTools、Lighthouse、eslint-plugin-jsx-a11y) | コントラスト不足、alt・ラベルの漏れ、ARIA の間違い。**全体の3〜4割程度** |
| **キーボードだけで操作** | 操作できない・順番がおかしい・フォーカスが見えない |
| **スクリーンリーダー**(VoiceOver・NVDA・TalkBack) | 名前・役割・状態が正しく伝わるか、読み上げの順番 |
| 拡大・文字サイズ変更 | 200% で崩れないか |
| 実際の利用者のテスト | 本当に使えるか |
- 自動チェックを CI に入れる: Playwright + `@axe-core/playwright` → [[テスト_05_E2Eテスト(Playwright)]]
- コンポーネントのテストで `getByRole` を使うと、自然にアクセシビリティも確かめられる → [[テスト_04_コンポーネントテスト(Testing Library・Browser Mode)]]

### VoiceOver(Mac)の最低限
| 操作 | キー |
| --- | --- |
| 起動・終了 | Cmd + F5 |
| 次の項目へ | Ctrl + Option + → |
| 見出しの一覧(ローター) | Ctrl + Option + U |
| 実行 | Ctrl + Option + Space |

## チェックリスト
- [ ] `<html lang="ja">` とページごとの `<title>`
- [ ] 見出しが h1 から順番どおり
- [ ] 画像に適切な `alt`
- [ ] 文字のコントラスト 4.5:1 以上(大きな文字は 3:1)
- [ ] キーボードだけで全部操作でき、フォーカスが見える
- [ ] ボタンは `<button>`、リンクは `<a>`
- [ ] 入力欄に見えるラベル、エラーは文章で説明
- [ ] アイコンだけのボタンに名前(`aria-label`)
- [ ] モーダルのフォーカス管理と Esc で閉じる
- [ ] 200% に拡大・スマホ幅で使える
- [ ] 動きを減らす設定に対応
- [ ] axe などの自動チェックで重大な問題がない
- [ ] スクリーンリーダーで主要な流れを確認した

## 関連
- 前: [[Webパフォーマンスとアクセシビリティ_03_アクセシビリティの基本(WCAG・法律・設計)]] / 目次: [[Webパフォーマンスとアクセシビリティ]]
- [[React_05_実務(構成・性能・型・AI開発)]] / [[shadcn-ui]] / [[テスト]]
- 参考: https://www.w3.org/WAI/ARIA/apg/ , https://developer.mozilla.org/ja/docs/Web/Accessibility , https://www.deque.com/axe/ , https://www.w3.org/WAI/test-evaluate/

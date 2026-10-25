---
title: "デザイントークン 03 W3C 標準形式(DTCG)"
modified: 2026-09-29
---

## 背景
- デザイナー・開発者・ツール企業が集まる **W3C Design Tokens Community Group(DTCG)** が形式を標準化
- **2025年10月28日に初の安定版「Design Tokens Format Module 2025.10」**
- 対応ツール: Figma、Style Dictionary、Tokens Studio、Terrazzo、Penpot、Sketch、Framer、Knapsack など
- 1つのファイルから Web / iOS / Android / Flutter 用のコードを生成できる

## ファイル
- 拡張子: `.tokens` または `.tokens.json`
- 中身は JSON(人が手で編集できる)

## トークンの書き方
```json
{
  "brand-primary": {
    "$type": "color",
    "$value": { "colorSpace": "srgb", "components": [0, 0.4, 0.8], "hex": "#0066cc" },
    "$description": "主要アクションの色",
    "$deprecated": false,
    "$extensions": { "com.example.tool": {} }
  }
}
```
| プロパティ | 必須 | 意味 |
| --- | --- | --- |
| `$value` | ○ | 値 |
| `$type` | - | 型(グループから継承も可) |
| `$description` | - | 説明 |
| `$deprecated` | - | 廃止予定(true / 理由の文字列) |
| `$extensions` | - | ツール固有の追加情報 |
- `$` で始まるのは予約語。トークン名に `{` `}` `.` は使えない

## グループ(整理と型の継承)
`$value` を持たないオブジェクトがグループ。グループの `$type` は子に継承される。
```json
{
  "color": {
    "$type": "color",
    "blue": {
      "500": { "$value": { "colorSpace": "srgb", "components": [0.145, 0.388, 0.922] } }
    }
  },
  "space": {
    "$type": "dimension",
    "4": { "$value": { "value": 16, "unit": "px" } }
  }
}
```
- `$root`: グループ自体の既定トークン(`color.accent` と `color.accent.light` を両立)
- `$extends`: 他のグループを継承して一部だけ上書き(ボタンの派生など)

## 参照(エイリアス)= 3層構造を表現する仕組み
```json
{
  "semantic": {
    "primary": { "$type": "color", "$value": "{color.blue.500}" }
  },
  "component": {
    "button-bg": { "$type": "color", "$value": "{semantic.primary}" }
  }
}
```
- `{グループ.トークン}` 形式(推奨)。トークン全体を参照
- JSON Pointer 形式 `{ "$ref": "#/color/blue/500/$value/components/0" }` で値の一部も参照可能

## 型一覧
### 単純な型
| `$type` | `$value` の例 |
| --- | --- |
| `color` | `{ "colorSpace": "srgb", "components": [0, 0.4, 0.8], "alpha": 1 }`(Display P3・OKLCH など CSS Color 4 の色空間に対応) |
| `dimension` | `{ "value": 16, "unit": "px" }`(px / rem) |
| `fontFamily` | `["Noto Sans JP", "sans-serif"]` |
| `fontWeight` | `700` または `"bold"` |
| `duration` | `{ "value": 200, "unit": "ms" }` |
| `cubicBezier` | `[0.42, 0, 1, 1]` |
| `number` | `1.5`(行間など) |

### 複合型
| `$type` | 中身 |
| --- | --- |
| `strokeStyle` | `"solid"` や破線の詳細 |
| `border` | color / width / style |
| `transition` | duration / delay / timingFunction |
| `shadow` | color / offsetX / offsetY / blur / spread(配列で重ねがけ) |
| `gradient` | 停止点の配列 |
| `typography` | fontFamily / fontSize / fontWeight / lineHeight など |

```json
{
  "shadow-card": {
    "$type": "shadow",
    "$value": {
      "color": { "colorSpace": "srgb", "components": [0, 0, 0], "alpha": 0.1 },
      "offsetX": { "value": 0, "unit": "px" },
      "offsetY": { "value": 4, "unit": "px" },
      "blur": { "value": 8, "unit": "px" },
      "spread": { "value": 0, "unit": "px" }
    }
  }
}
```

## テーマ(ライト/ダーク・複数ブランド)
- W3C の安定版発表では「複数ブランド・ライト/ダーク・アクセシビリティ用の派生を扱えること」が特徴として挙げられている。ただしフォーマット本体の文書(Format Module)にはテーマの書き方は載っておらず、別の仕組み・ツール側で扱う
- 実務では「モードごとにセマンティック層の参照先を変える」構成が一般的

## 関連
- 前: [[デザイントークン_02_設計と命名(カテゴリ別)]] / 次: [[デザイントークン_04_実装(CSS変数・Tailwind・shadcn・Style Dictionary)]]
- 公式: https://www.designtokens.org/tr/drafts/format/ , https://www.w3.org/community/design-tokens/

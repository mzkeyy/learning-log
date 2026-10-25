---
title: "Laravel 01 考え方(MVC・リクエストの流れ・フォルダ構成)"
modified: 2026-10-18
---

← [[Laravel]] / 次 → [[Laravel_02_ルーティング・コントローラ・Blade]]

## フレームワークとは
「よくある作業はもう用意してあるので、作りたい部分だけ書けばいい」という**土台**。PHP だけで書くと、URL の振り分け・DB 接続・ログイン・入力チェックなどを毎回自分で作ることになる。Laravel はそれらを決まった書き方で提供してくれる。

| PHP だけで書く | Laravel で書く |
| --- | --- |
| 1ページ1ファイル。処理と HTML が混ざりがち | 役割ごとにファイルを分ける(MVC) |
| SQL を文字列で組み立てる → SQLi の危険 | Eloquent / クエリビルダが安全に組み立てる |
| ログイン・CSRF 対策を自作 | 標準機能+スターターキット |
| 人によって書き方がバラバラ | 「Laravel の流儀」で揃う。AI も書きやすい |

## MVC = 役割分担
| 役割 | 担当 | 置き場所 | たとえ |
| --- | --- | --- | --- |
| **Model** | データ(DB の読み書き、データのルール) | `app/Models/` | 食材と冷蔵庫 |
| **View** | 見た目(HTML) | `resources/views/` | 盛り付け |
| **Controller** | 司令塔(モデルにデータを頼み、ビューに渡す) | `app/Http/Controllers/` | シェフ |

ポイントは **コントローラを太らせない** こと。データのルールはモデル(や専用のクラス)へ、見た目はビューへ。

## リクエストの流れ(8ステップ)
| # | どこで | 何をする |
| --- | --- | --- |
| 1 | ブラウザ | `GET /posts` を送る |
| 2 | `public/index.php` | すべてのアクセスの入口。Laravel を起動する |
| 3 | `routes/web.php` | URL に合うルートを探す |
| 4 | ミドルウェア | ログイン済みか・偽装送信でないか(CSRF)などをチェック |
| 5 | コントローラ | 処理の本体 |
| 6 | モデル ⇄ DB | データを取ってくる |
| 7 | ビュー(Blade) | データを HTML に埋め込む |
| 8 | レスポンス | HTML(API なら JSON)をブラウザに返す |

この流れ全体を裏で取り仕切っているのが **HTTP Kernel**(→ [[Laravel_05_裏側の仕組み(Kernel・サービスコンテナ・キュー・スケジューラ)]])。

## フォルダ構成(Laravel 11〜13)
```
myapp/
├─ app/
│  ├─ Http/Controllers/   コントローラ           ★よく触る
│  ├─ Models/             モデル                 ★よく触る
│  ├─ Jobs/               キューで動かすジョブ(make:job で作られる)
│  └─ Providers/          サービスプロバイダ(AppServiceProvider)
├─ bootstrap/app.php      ミドルウェア・例外処理などアプリの組み立て設定
├─ config/                アプリ全体の設定(.env の値を読む)
├─ database/
│  ├─ migrations/         テーブル設計図                ★よく触る
│  ├─ factories/          テスト用データの作り方
│  └─ seeders/            初期データ投入
├─ public/                公開フォルダ(index.php・画像・ビルド済みCSS/JS)
├─ resources/
│  ├─ views/              Blade テンプレート            ★よく触る
│  └─ css/ js/            フロントのソース(Vite でビルド)
├─ routes/
│  ├─ web.php             画面の URL                    ★よく触る
│  └─ console.php         自作コマンドと定期実行
├─ storage/               ログ・キャッシュ・アップロード(自動生成)
├─ tests/                 自動テスト
├─ vendor/                外部ライブラリ(Composer が管理。触らない・Git に入れない)
├─ .env                   DB 接続先・パスワードなど(Git に入れない)
├─ artisan                php artisan で使うコマンドの本体
└─ composer.json          使うパッケージの一覧
```

### 古い記事との違いに注意
Laravel 11 で構成が大きくスリムになった。ネットや AI の回答には古い構成がまだ多い。

| 古い(Laravel 10 以前) | 今(Laravel 11〜13) |
| --- | --- |
| `app/Http/Kernel.php` にミドルウェア一覧 | `bootstrap/app.php` の `withMiddleware()` |
| `app/Console/Kernel.php` にスケジュール | `routes/console.php` に `Schedule::...` |
| `routes/api.php` が最初からある | 必要なときに `php artisan install:api` で追加 |
| `app/Http/Middleware/` に多数のファイル | フレームワーク内部に移動。自作するときだけ作る |
| 初期 DB は MySQL | 初期 DB は SQLite(ファイル1つですぐ動く) |

## 開発の始め方
```bash
laravel new myapp        # 対話形式でスターターキットやテストツールを選べる
cd myapp
php artisan dev          # サーバー・キュー・ログ・Vite をまとめて起動(Node 22.13 以上)
# → http://localhost:8000
```
- PHP 8.3 以上と Composer が必要。Mac なら **Laravel Herd** を入れると PHP・Composer・インストーラがまとめて揃う
- `.env.example` をコピーして `.env` を作るのが基本(インストーラは自動でやってくれる)

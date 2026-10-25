---
title: "Laravel(ララベル)"
modified: 2026-10-18
---

**PHP で Web アプリを作るためのフレームワーク**。ルーティング・DB 操作・画面テンプレート・ログイン・メール・キュー・定期実行・テストまで、Web アプリでよく使う機能が最初から揃っている「道具箱つきの設計図」。役割ごとにファイルの置き場所が決まっているので、どこに何を書けばいいか迷いにくい。

このノート群は **Laravel 13(2026年3月リリース・PHP 8.3 以上)** を前提に、「生成AIが書いた Laravel のコードを読めて、古い書き方や危ない書き方に気づける」ことを目標に整理した入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[Laravel_01_考え方(MVC・リクエストの流れ・フォルダ構成)]] | MVC、URL を開いてから画面が返るまで、どのフォルダに何を書くか |
| 02 | [[Laravel_02_ルーティング・コントローラ・Blade]] | URL と処理の対応、コントローラの書き方、画面テンプレート |
| 03 | [[Laravel_03_データベース(マイグレーション・Eloquent・クエリビルダ)]] | テーブルの作り方、モデルでの読み書き、リレーション、N+1 |
| 04 | [[Laravel_04_よく使う機能(バリデーション・認証・メール・テスト・Tinker)]] | 入力チェック、ログイン、メール通知、自動テスト、対話モード |
| 05 | [[Laravel_05_裏側の仕組み(Kernel・サービスコンテナ・キュー・スケジューラ)]] | リクエストの進行役、部品の受け渡し、非同期処理、定期実行 |
| 06 | [[Laravel_06_Laravel 13と実務の注意(新機能・セキュリティ・AI開発)]] | 13 の変更点、本番前チェック、AI に書かせるときのコツ |

## まず一言で
> **URL → ルート → コントローラ → モデル(データ)→ ビュー(見た目)。**
> この順番を覚えれば、Laravel のコードはだいたい読める。

## 全体像(レストランのたとえ)
```
[ブラウザ]  GET /posts                          … お客さんが来店
    │
    ▼
public/index.php                               … 店の玄関(すべてのアクセスの入口)
    │
    ▼
routes/web.php       ルーティング               … 席へ案内する係
    │
    ▼
ミドルウェア         ログイン確認・CSRF対策など  … 入口の警備員
    │
    ▼
app/Http/Controllers コントローラ               … シェフ(司令塔)
    │      ▲
    ▼      │
app/Models           モデル(Eloquent)⇄ DB    … 食材と冷蔵庫
    │
    ▼
resources/views      ビュー(Blade)            … 盛り付け
    │
    ▼
[ブラウザに HTML が返る]                         … 料理をお客さんへ
```

## 用語の地図
| 用語 | 一言 |
| --- | --- |
| **MVC** | Model(データ)・View(見た目)・Controller(司令塔)に役割を分ける考え方 |
| **ルート(Route)** | 「この URL ならこの処理」という対応表。`routes/web.php` |
| **ミドルウェア** | コントローラに届く前後に挟むチェック(ログイン済みか、など) |
| **Eloquent** | Laravel の ORM。DB の1行を PHP のオブジェクトとして扱う |
| **クエリビルダ** | SQL をメソッドをつなげて組み立てる道具。Eloquent の土台 |
| **マイグレーション** | テーブルの作成・変更をコードで書いて履歴管理する仕組み |
| **Blade** | HTML にデータや条件分岐を埋め込むテンプレート |
| **Artisan** | Laravel 専用のコマンドラインツール(`php artisan ...`) |
| **Tinker** | アプリの中身をターミナルで1行ずつ試せる対話モード |
| **サービスコンテナ** | 部品を保管し、必要な場所へ自動で渡す仕組み |
| **ファサード** | `DB::` `Cache::` のように静的メソッド風に部品を呼ぶ書き方 |
| **キュー / ジョブ** | 重い処理を「あとでやる仕事」として裏で実行する仕組み |
| **スケジューラ** | 決まった時刻に処理を自動実行する仕組み。cron は1行だけ |
| **Composer** | PHP のパッケージ管理ツール(npm の PHP 版) |

## よく使うコマンド 早見表
```bash
laravel new myapp                     # 新規プロジェクト(Laravel インストーラ)
composer create-project laravel/laravel myapp  # インストーラが無い場合
php artisan serve                     # 開発サーバー(http://localhost:8000)
php artisan dev                       # サーバー・キュー・ログ・Vite をまとめて起動
php artisan make:model Post -mc       # モデル+マイグレーション+コントローラ
php artisan migrate                   # テーブルを作る
php artisan route:list                # 登録済み URL 一覧
php artisan tinker                    # 対話モード
php artisan queue:work                # キューのワーカー起動
php artisan schedule:work             # cron なしでスケジューラを動かす(開発用)
php artisan test                      # 自動テスト
```

## 他のフレームワークとの位置づけ
| | Laravel | Next.js | Cloudflare Workers |
| --- | --- | --- | --- |
| 言語 | PHP | TypeScript / JavaScript | TypeScript / JavaScript |
| 得意 | DB を使う業務アプリ・管理画面・API を1つで | React の画面中心のサイト | 世界中で速く動く軽いサーバー処理 |
| 揃っているもの | ORM・認証・キュー・メール・定期実行まで全部入り | 画面とルーティング中心。DB や認証は別ライブラリ | 実行環境と D1/R2/KV などのサービス |
| 例えると | 厨房設備まで揃った居抜き物件 | おしゃれな店構え(厨房は自分で揃える) | 世界中にある屋台の場所貸し |

## 関連ノート
- [[SQL]] ― Eloquent やクエリビルダが裏で発行している SQL
- [[N+1]] ― Eloquent で起きやすい。`with()` で防ぐ(03章)
- [[中間テーブル]] ― `belongsToMany` で使う多対多のテーブル
- [[Webセキュリティ対策]] ― XSS・CSRF・SQLi。Laravel が標準で防いでくれる部分と自分で守る部分(06章)
- [[認証]] ― ログインの考え方
- [[APIキー・シークレット管理]] ― `.env` の扱い
- [[DDD]] ― Laravel で複雑な業務を書くときの設計
- [[Claude Code]] ― Laravel Boost(MCP)と組み合わせて使う

## 出典・参考
- https://laravel.com/docs/13.x/releases (Laravel 13 リリースノート)
- https://laravel.com/docs/13.x/upgrade (12 → 13 アップグレードガイド)
- https://laravel.com/docs/13.x/queues / https://laravel.com/docs/13.x/scheduling / https://laravel.com/docs/13.x/artisan / https://laravel.com/docs/13.x/eloquent
- 内容は 2026年10月時点の公式ドキュメントに基づく

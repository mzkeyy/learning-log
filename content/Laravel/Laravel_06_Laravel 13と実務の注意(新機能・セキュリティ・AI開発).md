---
title: "Laravel 06 Laravel 13と実務の注意(新機能・セキュリティ・AI開発)"
modified: 2026-10-18
---

← [[Laravel_05_裏側の仕組み(Kernel・サービスコンテナ・キュー・スケジューラ)]] / 入口 → [[Laravel]]

## 1. バージョンとサポート期間
Laravel は毎年1回(Q1ごろ)メジャー版が出る。バグ修正は 18 か月、セキュリティ修正は 2 年。
| バージョン | PHP | リリース | バグ修正まで | セキュリティ修正まで |
| --- | --- | --- | --- | --- |
| 11 | 8.2〜8.4 | 2024年3月 | 2025年9月 | 2026年3月(終了) |
| 12 | 8.2〜8.5 | 2025年2月 | 2026年8月 | 2027年2月 |
| **13** | **8.3〜8.5** | **2026年3月17日** | 2027年Q3 | 2028年3月 |

## 2. Laravel 13 で変わったこと
方針は「壊れる変更を最小限に」。12 からのアップグレードは公式の目安で 10 分程度。
| 変更 | 内容 |
| --- | --- |
| **PHP 8.3 以上が必須** | `php -v` で確認 |
| **PHP 属性が増えた** | `#[Middleware]` `#[Authorize]`(コントローラ)、`#[Tries]` `#[Backoff]` `#[Timeout]` `#[FailOnTimeout]`(ジョブ)、`#[Table]` `#[Fillable]` `#[Connection]`(モデル)、`#[Signature]` `#[Description]`(コマンド)など。従来のプロパティでの書き方も使える |
| **Laravel AI SDK** | 文章生成・ツールを使うエージェント・画像・音声・埋め込みを、AI の提供元に依存しない共通 API で扱う公式パッケージ |
| **ベクトル検索** | PostgreSQL + pgvector で `whereVectorSimilarTo()`。`Str::of('...')->toEmbeddings()` で埋め込みを作れる |
| **JSON:API リソース** | API のレスポンスを JSON:API 仕様の形で返す仕組みが公式に |
| **CSRF 対策の強化** | ミドルウェア名が `VerifyCsrfToken` → **`PreventRequestForgery`**。`Sec-Fetch-Site` ヘッダーで送信元も確認。旧名は非推奨の別名として残る |
| **キューの振り分け** | `Queue::route(Job::class, connection: ..., queue: ...)` |
| **キャッシュ延長** | `Cache::touch()` で値を取り直さずに有効期限だけ延ばす |
| **安全寄りの初期設定** | 新規アプリはセッションの保存形式が `json`、キャッシュの `serializable_classes` が `false`(PHP オブジェクトの復元を禁止) |

### 12 → 13 で気をつけること(抜粋)
- `composer.json`:`laravel/framework ^13.0`、`laravel/tinker ^3.0`、`phpunit/phpunit ^12.0`、`pestphp/pest ^4.0`
- テストで `withoutMiddleware([VerifyCsrfToken::class])` と書いていたら `PreventRequestForgery::class` へ
- キャッシュに PHP オブジェクトを入れている場合は `serializable_classes` に許可するクラスを列挙
- セッションを `php` → `json` に変えると、**ログイン中の全ユーザーがログアウトされる**。移行時は値をそのままにするか、影響を承知で切り替える
- `CACHE_PREFIX` `REDIS_PREFIX` `SESSION_COOKIE` を `.env` で明示していないと、キー名やクッキー名が変わることがある
- 自動化するなら **Laravel Boost**(公式の MCP サーバー)の `/upgrade-laravel-v13` か、有料サービスの **Shift**

## 3. セキュリティ:Laravel が守ってくれる所・自分で守る所
→ 全体像は [[Webセキュリティ対策]]
| 攻撃 | Laravel が標準でやること | 自分で気をつけること |
| --- | --- | --- |
| XSS | `{{ }}` が自動エスケープ | `{!! !!}` にユーザー入力を入れない |
| CSRF | `PreventRequestForgery` ミドルウェア | フォームに `@csrf` を書く。安易に除外リストへ入れない |
| SQL インジェクション | Eloquent・クエリビルダは値をバインド | `DB::raw()` / `whereRaw()` / `DB::select()` に文字列連結しない。値は `?` で |
| 一括代入 | `#[Fillable]` / `$fillable` で許可した列だけ | `$guarded = []` で全開放しない。保存は `validated()` |
| 認可漏れ | Policy・Gate の仕組み | **すべての更新・削除で「本人のものか」を確認**。テストで「他人は 403」を書く |
| パスワード | `Hash::make`(bcrypt / argon2) | 平文やログに出さない |

### 本番に出す前のチェックリスト
- [ ] `.env` を Git に入れていない(`.gitignore` 済み)。値は [[APIキー・シークレット管理]] の方法で管理
- [ ] `APP_ENV=production`、**`APP_DEBUG=false`**(true のままだとエラー画面に設定値やコードが丸見え)
- [ ] `APP_KEY` が設定済み・漏れていない(漏れると暗号化データやセッションが危険)
- [ ] `php artisan config:cache` `route:cache` `view:cache`(または `php artisan optimize`)で高速化
- [ ] `php artisan migrate --force` の前にバックアップ
- [ ] キューのワーカーを常駐(Supervisor など)+デプロイ時に `queue:restart`
- [ ] スケジューラ用の cron 1行を登録
- [ ] `storage/` と `bootstrap/cache/` に書き込み権限
- [ ] 公開ディレクトリは `public/` だけ(プロジェクトのルートを公開しない)

## 4. 生成AIに Laravel を書かせるときのコツ
### よくある「古い書き方」
AI の学習データには Laravel 10 以前のコードが大量にあるため、次のような書き方が混ざりやすい。動くこともあるが、今の構成とずれる。
| AI が書きがち | 今の書き方 |
| --- | --- |
| `app/Http/Kernel.php` にミドルウェアを追加 | `bootstrap/app.php` の `withMiddleware()` |
| `app/Console/Kernel.php` の `schedule()` | `routes/console.php` の `Schedule::` |
| `VerifyCsrfToken` | `PreventRequestForgery` |
| `protected $fillable` / `public $tries` | どちらも有効。13 では `#[Fillable]` / `#[Tries]` も選べる → **チームでどちらかに統一** |
| `$request->all()` をそのまま `create()` | `$request->validated()` |
| ループ内で `$post->user` | `with('user')`(N+1) |

### CLAUDE.md に書いておくと良いこと
```markdown
## Laravel
- Laravel 13 / PHP 8.3。Laravel 10 以前の構成(Kernel.php 等)で書かない
- ミドルウェア・例外設定は bootstrap/app.php、定期実行は routes/console.php
- モデル・ジョブの設定は PHP 属性(#[Fillable] #[Tries] など)で書く
- 入力は FormRequest で検証し、保存には validated() を使う
- 更新・削除には必ず Policy で認可。テストに「他人は 403」を含める
- 一覧取得は with() で Eager Loading。開発環境は preventLazyLoading 有効
- テストは Pest。php artisan test が通るまで完了としない
```
→ 置き場所の考え方は [[mdファイル使い分け]] / [[Claude Code]]

### Laravel Boost
Laravel 公式の **MCP サーバー**([[MCP]])。AI エージェント(Claude Code・Cursor・OpenCode・Gemini・VS Code など)に、プロジェクトの Laravel バージョンに合ったドキュメントやガイドラインを渡し、古い書き方を減らす。アップグレード用のスラッシュコマンドも入っている。

### AI が書いたコードを確認する順番
1. `php artisan route:list` ― 意図しない URL が増えていないか、`auth` が付いているか
2. マイグレーション ― 既存のマイグレーションを書き換えていないか、外部キー・インデックスがあるか
3. コントローラ ― `validated()` を使っているか、認可しているか
4. Blade ― `{!! !!}` を使っていないか、フォームに `@csrf` があるか
5. `php artisan test` ― 正常系だけでなく「他人は 403」「入力エラーは 422」のテストがあるか

## 5. まとめ
- Laravel は **全部入りの PHP フレームワーク**。決まった場所に決まった書き方をすれば、安全な機能が手に入る
- 読むときは **ルート → コントローラ → モデル → ビュー** の順
- 裏方の **キュー(jobs テーブル+ワーカー)** と **スケジューラ(cron 1行)** を知ると、重い処理や定期処理も Laravel だけで完結できる
- AI と書くときは **バージョン(13)を明示**し、**認可・`validated()`・N+1** の3点を必ず確認する

---
title: "Laravel 05 裏側の仕組み(Kernel・サービスコンテナ・キュー・スケジューラ)"
modified: 2026-10-18
---

← [[Laravel_04_よく使う機能(バリデーション・認証・メール・テスト・Tinker)]] / 次 → [[Laravel_06_Laravel 13と実務の注意(新機能・セキュリティ・AI開発)]]

## 1. Kernel ― リクエストの進行役
Kernel は「受け取ってから返すまで」を取り仕切る店長役。2種類ある。
| 種類 | 担当 |
| --- | --- |
| **HTTP Kernel** | ブラウザ・API からのリクエスト |
| **Console Kernel** | `php artisan` のコマンドとスケジューラ |

### HTTP Kernel の仕事
```
1. 起動準備    .env・config/ を読む、サービスプロバイダを登録
      ↓
2. グローバルミドルウェア  全リクエスト共通(メンテナンス中か、など)
      ↓
3. ルーター    ルートを探し、web / api グループ・ルート個別のミドルウェアを通す
      ↓
4. コントローラ  レスポンスを作る
      ↓
5. 送信と後片付け  レスポンスを返し、terminate で後処理
```

### 設定はどこに書く?(Laravel 11〜13)
`app/Http/Kernel.php` は無くなり、`bootstrap/app.php` に集約された。仕組みはフレームワーク内部に残っている。
```php
// bootstrap/app.php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [\App\Http\Middleware\SetLocale::class]);
        $middleware->alias(['admin' => \App\Http\Middleware\EnsureAdmin::class]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // 例外の報告・表示のカスタマイズ
    })->create();
```
自作ミドルウェアは `php artisan make:middleware EnsureAdmin` で `app/Http/Middleware/` に作られる。

## 2. サービスコンテナ・サービスプロバイダ・ファサード
| 仕組み | 一言 | たとえ |
| --- | --- | --- |
| **サービスコンテナ** | 部品(DB 接続・メール送信など)を保管し、必要な場所へ自動で渡す | 部品倉庫 |
| **サービスプロバイダ** | 起動時に「この部品はこう作る」とコンテナに登録する | 倉庫の入荷係 |
| **依存性の注入(DI)** | 引数に型を書くだけで、コンテナが中身を入れてくれる | 注文すれば届く |
| **ファサード** | `Cache::get()` のように短く呼べる窓口。中身はコンテナの部品 | 受付窓口 |

```php
// 型を書くだけで Request や自作クラスが届く(DI)
public function store(Request $request, PaymentService $payment) { ... }

// app/Providers/AppServiceProvider.php
public function register(): void
{
    $this->app->singleton(PaymentService::class, fn () => new PaymentService(config('services.pay.key')));
}
public function boot(): void
{
    Model::preventLazyLoading(! app()->isProduction()); // N+1 検出(03章)
}
```
`register()` は「登録だけ」、`boot()` は「全部登録された後に動かしたい初期設定」。

## 3. キュー ― 重い処理を裏で
「あとでやる仕事(ジョブ)」を保存しておき、**ワーカー**という別プロセスが順に取り出して実行する。メール送信・画像加工・CSV 取り込み・外部 API 呼び出しなど、ユーザーを待たせたくない処理に使う。

### ジョブを作って投げる
```bash
php artisan make:job SendWelcomeMail   # app/Jobs/SendWelcomeMail.php
```
```php
use Illuminate\Queue\Attributes\{Tries, Backoff, Timeout};

#[Tries(3)]       // 最大3回まで挑戦
#[Backoff(60)]    // 失敗したら60秒後に再挑戦([1, 5, 10] のように段階も指定可)
#[Timeout(120)]   // 120秒で打ち切り
class SendWelcomeMail implements ShouldQueue
{
    use Queueable;

    public function __construct(public User $user) {}

    public function handle(): void
    {
        Mail::to($this->user)->send(new Welcome());
    }
}

// 投げる側(コントローラなど)。画面はすぐ返る
SendWelcomeMail::dispatch($user);
SendWelcomeMail::dispatch($user)->delay(now()->addMinutes(10));
```
属性(`#[Tries]` など)は Laravel 13 の書き方。従来の `public $tries = 3;` も使える。

### 保存先(ドライバ)
| ドライバ | 特徴 |
| --- | --- |
| `database` | **新規アプリの初期値**(`QUEUE_CONNECTION=database`)。DB の `jobs` テーブルに保存。追加の準備不要 |
| `redis` | 速い。アクセスが多いサイト向け。Horizon で監視画面が使える |
| `sqs` | AWS のキューサービス |
| `sync` | キューを使わずその場で実行。開発・テスト用 |

### jobs テーブルと関連テーブル
新規アプリでは `database/migrations/0001_01_01_000002_create_jobs_table.php` で最初から作られる(無ければ `php artisan make:queue-table`)。
| テーブル | 役割 | 主な列 |
| --- | --- | --- |
| `jobs` | 実行待ちの待合室 | `queue`(キュー名)、`payload`(ジョブの中身の JSON)、`attempts`(試行回数)、`reserved_at`(実行中の印)、`available_at`(いつから実行できるか) |
| `failed_jobs` | 上限まで失敗したジョブの記録 | `uuid`、`payload`、`exception`(エラー内容)、`failed_at` |
| `job_batches` | 複数ジョブをまとめた進捗管理 | `total_jobs`、`pending_jobs`、`failed_jobs` |

### 処理の流れ
```
dispatch() ──▶ jobs に INSERT ──▶ ワーカー(queue:work)が予約して handle() 実行
                                        │
                     ┌──────────────────┴──────────────────┐
                   成功                                    失敗
              jobs から削除                attempts+1 → backoff 後に再挑戦
                                           上限超え → failed_jobs へ移動
```

### コマンド
```bash
php artisan queue:work            # ワーカー起動
php artisan queue:work --queue=high,default   # 優先順位つき
php artisan queue:failed          # 失敗一覧
php artisan queue:retry all       # 失敗分を再実行
php artisan queue:flush           # 失敗記録を全削除
php artisan queue:restart         # コード変更後、ワーカーに再起動を指示
```

### つまずきポイント
- **ワーカーを起動していないと、ジョブは jobs テーブルにたまるだけ**。「メールが届かない」はまずここ
- **ワーカーは起動時のコードを覚えている**。デプロイ後は `queue:restart`。本番は Supervisor などで常駐させ、落ちても自動で立ち上げる
- 開発中は `php artisan dev` がワーカーも一緒に起動してくれる
- Laravel 13 では、ジョブごとの接続先・キュー名を `AppServiceProvider` の `boot()` で一括指定できる
```php
Queue::route(ProcessPodcast::class, connection: 'redis', queue: 'podcasts');
```

## 4. スケジューラ ― cron の代わりに定期実行
バッチごとに cron を書き並べず、**Laravel のコードで「いつ・何を」を管理**する。Git で管理でき、チームで共有できる。
```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('report:daily')->dailyAt('09:00')->withoutOverlapping();
Schedule::job(new CleanupOldPosts)->hourly();            // ジョブをキューに投げる
Schedule::call(fn () => DB::table('logs')->where('created_at', '<', now()->subMonth())->delete())
    ->weekly()->name('prune-logs')->onOneServer();
Schedule::exec('node /home/forge/script.js')->daily();   // OS のコマンド
```

### 動かし方
| 環境 | 方法 |
| --- | --- |
| 本番 | サーバーの cron に **この1行だけ** 登録。毎分呼ばれ、実行すべきものを Laravel が判断する |
| 開発 | `php artisan schedule:work`(前で動き続け、毎分チェック。cron 不要) |
| Laravel Cloud / Forge | サービス側で設定できる |
```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

### よく使うオプション
| 書き方 | 意味 |
| --- | --- |
| `everyMinute()` `everyFiveMinutes()` `hourly()` `daily()` `dailyAt('13:00')` | 頻度 |
| `weeklyOn(1, '8:00')` `monthlyOn(4, '15:00')` `cron('* * * * *')` | 曜日・日付・cron 式 |
| `everySecond()` 〜 `everyThirtySeconds()` | 1分未満の間隔(重い処理はジョブに任せる) |
| `weekdays()` `between('8:00', '17:00')` `environments(['production'])` | 実行条件 |
| `withoutOverlapping()` | 前回が終わっていなければ次を始めない |
| `onOneServer()` | 複数台構成でも1台だけで実行(キャッシュに database/redis などが必要) |
| `runInBackground()` | 同時刻の処理を並行実行 |
| `timezone('Asia/Tokyo')` | タイムゾーン(夏時間のある地域は二重実行・欠落に注意) |
| `onFailure(fn () => ...)` `emailOutputOnFailure('...')` | 失敗時の通知 |

```bash
php artisan schedule:list      # 登録内容と次回実行時刻
php artisan schedule:test      # 選んだ処理を今すぐ1回試す
php artisan schedule:pause     # 一時停止(schedule:continue で再開)
```

### キューとスケジューラの関係
重いバッチは `Schedule::job(...)` で登録すると、**決まった時刻にジョブが jobs テーブルに入るだけ**でスケジューラはすぐ終わる。実際の処理はワーカーが行うので、他の定期処理が遅れない。

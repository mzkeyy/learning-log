---
title: "Laravel 04 よく使う機能(バリデーション・認証・メール・テスト・Tinker)"
modified: 2026-10-18
---

← [[Laravel_03_データベース(マイグレーション・Eloquent・クエリビルダ)]] / 次 → [[Laravel_05_裏側の仕組み(Kernel・サービスコンテナ・キュー・スケジューラ)]]

## 1. バリデーション ― 入力チェック
### コントローラで直接
```php
$data = $request->validate([
    'title' => ['required', 'string', 'max:255'],
    'email' => ['required', 'email', 'unique:users,email'],
    'age'   => ['nullable', 'integer', 'between:0,150'],
]);
// ここに来た時点で $data はチェック済みの値だけ。
// 失敗したら自動で元の画面に戻り、Blade の @error / old() で表示できる(API なら 422 の JSON)
```

### フォームリクエスト ― チェックを別クラスに
```bash
php artisan make:request StorePostRequest
```
```php
class StorePostRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; } // 権限チェックも書ける
    public function rules(): array
    {
        return ['title' => ['required', 'max:255'], 'body' => ['required']];
    }
}
// コントローラ:public function store(StorePostRequest $request) → $request->validated()
```

| よく使うルール | 意味 |
| --- | --- |
| `required` / `nullable` | 必須 / 空でもよい |
| `string` `integer` `boolean` `array` `date` | 型 |
| `max:255` `min:8` `between:1,10` | 長さ・範囲 |
| `email` `url` `uuid` | 形式 |
| `unique:users,email` / `exists:categories,id` | DB に同じ値が無いこと / ある値であること |
| `confirmed` | `password_confirmation` と一致 |
| `in:draft,published` | 決まった値のどれか |
| `image` `mimes:jpg,png` `max:2048` | アップロードファイル(KB) |

**`$request->all()` ではなく `validated()` を保存に使う**のが鉄則。

## 2. 認証(ログイン)と認可(権限)
| | 意味 | Laravel の道具 |
| --- | --- | --- |
| **認証** | あなたは誰? | スターターキット、`auth` ミドルウェア、`Auth::` |
| **認可** | それをしていい? | Gate・Policy、`#[Authorize]`(13)、`can()` |

→ 考え方は [[認証]]

### 認証
- `laravel new` のときに **スターターキット** を選ぶと、ログイン・会員登録・パスワード再設定・メール確認の画面と処理が一式入る
- パスワードは自動でハッシュ化して保存(`Hash::make`)。平文で保存しない
```php
Route::middleware('auth')->group(function () { /* ログイン必須のページ */ });
auth()->user();        // ログイン中のユーザー
auth()->check();       // ログインしているか
```
- API(スマホアプリや別ドメインの SPA)向けには **Sanctum**(`php artisan install:api` で入る)

### 認可:Policy ― 「自分の記事だけ編集できる」
```bash
php artisan make:policy PostPolicy --model=Post
```
```php
class PostPolicy
{
    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }
}

// 使う側
Gate::authorize('update', $post);        // コントローラ(ダメなら 403)
@can('update', $post) <a>編集</a> @endcan // Blade
```
**認可漏れは AI が書いたコードで特に多い**。「ログインしていれば他人の記事も更新できる」状態になっていないか必ず確認する([[Webセキュリティ対策]])。

## 3. メール・通知
```bash
php artisan make:mail OrderShipped --markdown=mail.orders.shipped
php artisan make:notification InvoicePaid
```
```php
Mail::to($user)->send(new OrderShipped($order));   // メール
Mail::to($user)->queue(new OrderShipped($order));  // キューで送る(画面を待たせない)
$user->notify(new InvoicePaid($invoice));          // 通知(メール・Slack・DB などをまとめて)
```
- 開発中は `.env` で `MAIL_MAILER=log` にすると、実際には送らず `storage/logs/laravel.log` に中身が出る
- 本文は Blade(Markdown メールも可)で書ける

## 4. テスト
```bash
php artisan make:test PostTest   # tests/Feature/PostTest.php
php artisan test                 # 全部実行
```
```php
// Pest の例(PHPUnit でも書ける)
use App\Models\{Post, User};

test('自分の記事は更新できる', function () {
    $user = User::factory()->create();
    $post = Post::factory()->for($user)->create();

    $this->actingAs($user)
         ->put("/posts/{$post->id}", ['title' => '新', 'body' => '本文'])
         ->assertRedirect();

    expect($post->fresh()->title)->toBe('新');
});

test('他人の記事は更新できない', function () {
    $post = Post::factory()->create();
    $this->actingAs(User::factory()->create())
         ->put("/posts/{$post->id}", ['title' => '乗っ取り', 'body' => 'x'])
         ->assertForbidden();
});
```
| 便利な道具 | 用途 |
| --- | --- |
| `RefreshDatabase`(Pest は `uses(RefreshDatabase::class)`) | テストごとに DB をきれいにする |
| `actingAs($user)` | ログインした状態にする |
| `Mail::fake()` / `Queue::fake()` / `Notification::fake()` | 実際には送らず「送ろうとしたか」を確認 |
| `assertStatus` `assertSee` `assertRedirect` `assertForbidden` `assertJson` | 結果の確認 |

## 5. Tinker ― 対話モードで試す
アプリの中身をターミナルから1行ずつ動かせる **REPL**(PsySH ベース)。最初から入っている(Laravel 13 では `laravel/tinker` 3.x)。
```text
$ php artisan tinker
> User::count()
= 12
> $post = Post::with('user')->latest()->first()
> $post->user->name
= "田中"
> User::factory()->create(['email' => 'test@example.com'])
> config('app.timezone')
= "UTC"
> exit
```
| 使いどころ | 例 |
| --- | --- |
| Eloquent の書き方を試す | 条件・並べ替えが思った通りか |
| リレーションの確認 | `$user->posts` が取れるか |
| 開発用データを数件作る | `Post::factory(5)->create()` |
| 設定値の確認 | `config('mail.default')` `env('APP_ENV')` |

注意:
- **本物の DB を操作する**。`.env` が本番を向いているサーバーで `delete()` などを打つと本当に消える
- Tinker の中でジョブを投げるときは `dispatch()` ではなく **`Bus::dispatch(...)` か `Queue::push(...)`**(公式の推奨。`dispatch()` はガベージコレクションに頼るため Tinker では確実に投入されない)
- Tinker 内で使える Artisan コマンドは `migrate` など一部だけ(`config/tinker.php` の `commands` で追加)
- 複数行の編集や補完が欲しければ有料の GUI 版 **Tinkerwell** もある

## 6. その他よく使うもの
| 機能 | 一言 | 例 |
| --- | --- | --- |
| ファイル保存 | ローカル・S3 などを同じ書き方で | `$request->file('avatar')->store('avatars', 'public')` |
| キャッシュ | 重い結果を一時保存 | `Cache::remember('stats', 600, fn () => ...)` |
| HTTP クライアント | 外部 API を呼ぶ | `Http::timeout(5)->get('https://...')->json()` |
| イベント / リスナー | 「登録したら〇〇する」を疎結合に | `event(new UserRegistered($user))` |
| ログ | `storage/logs/laravel.log` | `Log::info('...', ['id' => $id])` / `php artisan pail` で流れを見る |
| API リソース | モデル → JSON の形を整える | `PostResource::collection($posts)`(13 では JSON:API 形式も公式対応) |

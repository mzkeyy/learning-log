---
title: "Laravel 02 ルーティング・コントローラ・Blade"
modified: 2026-10-18
---

← [[Laravel_01_考え方(MVC・リクエストの流れ・フォルダ構成)]] / 次 → [[Laravel_03_データベース(マイグレーション・Eloquent・クエリビルダ)]]

## 1. ルーティング ― URL と処理の対応表
```php
// routes/web.php
use App\Http\Controllers\PostController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('welcome'));             // その場で画面を返す
Route::get('/posts', [PostController::class, 'index']); // コントローラへ
Route::get('/posts/{post}', [PostController::class, 'show'])->name('posts.show');
Route::post('/posts', [PostController::class, 'store'])->middleware('auth');
```

| 書き方 | 意味 |
| --- | --- |
| `Route::get / post / put / patch / delete` | HTTP メソッドごとに登録 |
| `{post}` | URL の一部を変数として受け取る(ルートパラメータ) |
| `->name('posts.show')` | ルートに名前を付ける。`route('posts.show', $post)` で URL を作れる |
| `->middleware('auth')` | ログインしている人だけ通す |
| `Route::middleware('auth')->group(fn () => ...)` | まとめて設定 |

### リソースルート ― CRUD 7つを1行で
```php
Route::resource('posts', PostController::class);
```
| メソッド | URL | アクション | 用途 |
| --- | --- | --- | --- |
| GET | `/posts` | index | 一覧 |
| GET | `/posts/create` | create | 作成フォーム |
| POST | `/posts` | store | 保存 |
| GET | `/posts/{post}` | show | 詳細 |
| GET | `/posts/{post}/edit` | edit | 編集フォーム |
| PUT/PATCH | `/posts/{post}` | update | 更新 |
| DELETE | `/posts/{post}` | destroy | 削除 |

`php artisan make:controller PostController --resource` で、この7メソッドの空の雛形ができる。確認は `php artisan route:list`。

## 2. コントローラ ― 処理の司令塔
```php
// app/Http/Controllers/PostController.php
class PostController extends Controller
{
    public function index()
    {
        $posts = Post::with('user')->latest()->paginate(20); // モデルで取得
        return view('posts.index', compact('posts'));      // ビューへ渡す
    }

    public function show(Post $post) // ← ルートモデルバインディング
    {
        return view('posts.show', ['post' => $post]);
    }

    public function store(StorePostRequest $request) // ← 入力チェック済み(04章)
    {
        $post = $request->user()->posts()->create($request->validated());
        return redirect()->route('posts.show', $post);
    }
}
```

### ルートモデルバインディング
URL の `{post}` と引数の `Post $post` の名前を揃えると、Laravel が `/posts/5` の `5` で自動的に `Post::findOrFail(5)` してくれる。見つからなければ自動で 404。

### Laravel 13:属性でミドルウェア・認可を書ける
```php
use Illuminate\Routing\Attributes\Controllers\Middleware;
use Illuminate\Routing\Attributes\Controllers\Authorize;

#[Middleware('auth')]
class CommentController
{
    #[Authorize('create', [Comment::class, 'post'])]
    public function store(Post $post) { /* ... */ }
}
```
ルート側で `->middleware('auth')` と書く方法も引き続き使える。どちらかに揃えるとチームで読みやすい。

### よく返すもの
| 書き方 | 返すもの |
| --- | --- |
| `return view('posts.index', [...])` | HTML 画面 |
| `return redirect()->route('posts.index')` | 別ページへ移動 |
| `return back()->with('status', '保存しました')` | 元の画面へ戻り、一度だけ表示するメッセージ |
| `return response()->json([...])` / `return $post` | JSON(モデルや配列をそのまま返しても JSON になる) |
| `abort(403)` | エラーで止める |

## 3. Blade ― 画面テンプレート
ファイル名は `resources/views/posts/index.blade.php`。`view('posts.index')` のようにドット区切りで呼ぶ。

```blade
{{-- resources/views/posts/index.blade.php --}}
<x-layouts.app title="記事一覧">
  @if (session('status'))
    <p class="notice">{{ session('status') }}</p>
  @endif

  <ul>
    @forelse ($posts as $post)
      <li><a href="{{ route('posts.show', $post) }}">{{ $post->title }}</a>({{ $post->user->name }})</li>
    @empty
      <li>記事はまだありません</li>
    @endforelse
  </ul>

  {{ $posts->links() }} {{-- ページ送り --}}

  @auth
    <form method="POST" action="{{ route('posts.store') }}">
      @csrf {{-- 必須:CSRF トークン --}}
      <input name="title" value="{{ old('title') }}">
      @error('title') <p class="error">{{ $message }}</p> @enderror
      <button>投稿</button>
    </form>
  @endauth
</x-layouts.app>
```

| 構文 | 意味 |
| --- | --- |
| `{{ $x }}` | 出力(**自動でエスケープ** → XSS を防ぐ) |
| `{!! $x !!}` | エスケープせずに出力。**ユーザー入力には使わない** |
| `@if` `@foreach` `@forelse` | 条件分岐・繰り返し |
| `@auth` / `@guest` | ログイン中だけ / 未ログインだけ表示 |
| `@csrf` | フォームに CSRF トークンを入れる。POST フォームには必ず書く |
| `@method('PUT')` | HTML フォームで PUT / DELETE を送るときの指定 |
| `old('title')` | 入力エラーで戻ったとき、前回の入力値を表示 |
| `@error('title')` | その項目のエラーメッセージを表示 |
| `<x-layouts.app>` | コンポーネント(部品)。`resources/views/components/` に置く |
| `@extends` / `@section` / `@yield` | 昔からあるレイアウト継承。今もコンポーネントと並んで使える |

### 画面を React / Vue で作りたいとき
- **スターターキット**(`laravel new` 時に選択)で React / Vue / Livewire などの構成を最初から用意できる
- **Inertia**:ルーティングとコントローラは Laravel のまま、画面だけ React / Vue で書く仕組み。API を別に作らなくていい
- **Livewire**:PHP と Blade だけで、動きのある画面(リアルタイム検索など)を作る仕組み
- 画面を完全に別アプリ(例: [[Next.js]])にするなら、Laravel は API として使う(`php artisan install:api` → Sanctum で認証)

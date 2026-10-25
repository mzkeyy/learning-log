---
title: "Laravel 03 データベース(マイグレーション・Eloquent・クエリビルダ)"
modified: 2026-10-18
---

← [[Laravel_02_ルーティング・コントローラ・Blade]] / 次 → [[Laravel_04_よく使う機能(バリデーション・認証・メール・テスト・Tinker)]]

## 3つの層
```
Eloquent(モデル)  Post::where('published', true)->get()     ← 普段はここ
      │ 内部で使っている
クエリビルダ        DB::table('posts')->where(...)->get()      ← 集計・大量データ
      │ SQL を組み立てる
生 SQL             select * from posts where published = ?    ← 実際に DB に届くもの
```
**Eloquent = クエリビルダ + モデルの便利機能**。どれを使っても最終的には SQL になる([[SQL]])。

## 1. 接続設定
`.env` で接続先を決める。新規アプリの初期値は SQLite(`database/database.sqlite`)。
```dotenv
DB_CONNECTION=mysql   # sqlite / mysql / mariadb / pgsql など
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=myapp
DB_USERNAME=root
DB_PASSWORD=secret
```

## 2. マイグレーション ― テーブルの設計図と変更履歴
```bash
php artisan make:migration create_posts_table   # 単体で作る
php artisan make:model Post -m                  # モデルと一緒に作る(普通はこちら)
```
```php
// database/migrations/2026_10_18_000000_create_posts_table.php
public function up(): void
{
    Schema::create('posts', function (Blueprint $table) {
        $table->id();                                         // 主キー
        $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // 外部キー
        $table->string('title');
        $table->text('body');
        $table->boolean('published')->default(false);
        $table->timestamps();                                 // created_at / updated_at
        $table->softDeletes();                                // deleted_at(論理削除)
    });
}

public function down(): void
{
    Schema::dropIfExists('posts');
}
```

| コマンド | 意味 |
| --- | --- |
| `php artisan migrate` | まだ実行していないマイグレーションを実行 |
| `php artisan migrate:status` | どこまで実行済みか確認 |
| `php artisan migrate:rollback` | 直前の1回分を戻す(`down()` が動く) |
| `php artisan migrate:fresh --seed` | **全テーブルを消して**作り直し+初期データ投入(開発用。本番で打たない) |

ルール:**一度共有した(本番に出した)マイグレーションは書き換えない**。列を足したいときは新しいマイグレーションを作る。
```bash
php artisan make:migration add_slug_to_posts_table
```

## 3. Eloquent ― モデルで読み書き
```php
// app/Models/Post.php(Laravel 13 の書き方)
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['title', 'body', 'published'])]
class Post extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return ['published' => 'boolean'];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function comments(): HasMany { return $this->hasMany(Comment::class); }
    public function tags(): BelongsToMany { return $this->belongsToMany(Tag::class); }
}
```
- 名前の決まり:モデル `Post` ↔ テーブル `posts`、外部キーは `user_id`。違う名前にしたいときは `#[Table('my_posts')]`(13)または `protected $table`
- `#[Fillable]`(従来は `protected $fillable = [...]`)は **一括代入してよい列の許可リスト**。`create($request->all())` で `is_admin` などを勝手に書き換えられるのを防ぐ

### 基本操作
```php
Post::all();                                    // 全件
Post::find(1);                                  // id で1件(なければ null)
Post::findOrFail(1);                            // なければ 404
Post::where('published', true)->latest()->get();
Post::where('title', 'like', '%Laravel%')->count();

$post = Post::create(['title' => '...', 'body' => '...']);   // 追加
$post->update(['title' => '新タイトル']);                      // 更新
$post->delete();                                             // 削除(SoftDeletes なら論理削除)
Post::updateOrCreate(['slug' => 'hello'], ['title' => 'Hello']); // あれば更新・なければ追加
```

### リレーション
| 関係 | 書き方 | 例 |
| --- | --- | --- |
| 1対1 | `hasOne` / `belongsTo` | User → Profile |
| 1対多 | `hasMany` / `belongsTo` | User → Posts |
| 多対多 | `belongsToMany`([[中間テーブル]] `post_tag`) | Post ⇄ Tag |
| 経由 | `hasManyThrough` | Country → Users → Posts |
| ポリモーフィック | `morphMany` / `morphTo` | Post と Video の両方に Comment |

```php
$user->posts;                      // 関連を取得(プロパティとして呼ぶ)
$user->posts()->where(...)->get(); // 条件を足すならメソッドとして呼ぶ
$post->tags()->attach([1, 2]);     // 多対多の紐付け
$post->tags()->sync([1, 3]);       // 指定したものだけにそろえる
```

### N+1 問題と `with()`
```php
// ✗ 記事100件なら SQL が 101 回
$posts = Post::all();
foreach ($posts as $post) { echo $post->user->name; }

// ○ 2 回で済む(Eager Loading)
$posts = Post::with('user')->get();
```
開発中に気づけるよう、`AppServiceProvider` の `boot()` に `Model::preventLazyLoading(! app()->isProduction());` を書いておくと、N+1 が起きたときにエラーで教えてくれる。→ [[N+1]]

## 4. クエリビルダ
```php
$rows = DB::table('orders')
    ->join('users', 'orders.user_id', '=', 'users.id')
    ->select('users.name', DB::raw('SUM(orders.amount) as total'))
    ->where('orders.created_at', '>=', now()->subMonth())
    ->groupBy('users.name')
    ->orderByDesc('total')
    ->get();               // 戻り値はモデルではなく普通のオブジェクトの集まり
```
| やりたいこと | 書き方 |
| --- | --- |
| 条件 | `where('price', '>', 1000)` `orWhere` `whereIn` `whereNull` `whereBetween` |
| 並べ替え・件数 | `orderBy('id')` `limit(10)` `paginate(20)` |
| 1件・1値 | `first()` `value('title')` `pluck('title')` |
| 集計 | `count()` `sum()` `avg()` `max()` + `groupBy` |
| 大量データを少しずつ | `chunk(1000, fn ($rows) => ...)` / `lazy()` |
| SQL 確認 | `toSql()` / `toRawSql()` / `dd()` |
| ベクトル検索(13・PostgreSQL+pgvector) | `whereVectorSimilarTo('embedding', '検索文')` |

### 使い分け
| | Eloquent | クエリビルダ | 生 SQL(`DB::select`) |
| --- | --- | --- | --- |
| 戻り値 | モデル(リレーション・キャストが使える) | ただのデータ | ただのデータ |
| 向いている場面 | 普段の CRUD | 集計・結合・大量データ | ビルダで書けない特殊な SQL |
| 注意 | N+1 | `update` / `delete` の `where` 忘れで全件 | **値は必ず `?` で渡す**(文字列連結は SQLi) |

## 5. トランザクション
「全部成功するか、全部なかったことにするか」。お金・在庫など途中で止まると困る処理は必ず囲む。
```php
DB::transaction(function () use ($order) {
    $order->update(['status' => 'paid']);
    $order->product->decrement('stock');
});  // 途中で例外が起きたら両方とも元に戻る
```

## 6. テスト用データ:ファクトリとシーダー
```php
// database/factories/PostFactory.php
public function definition(): array
{
    return ['title' => fake()->sentence(), 'body' => fake()->paragraphs(3, true)];
}

// 使う
Post::factory()->count(10)->for(User::factory())->create();
```
```bash
php artisan db:seed          # database/seeders/DatabaseSeeder.php を実行
```

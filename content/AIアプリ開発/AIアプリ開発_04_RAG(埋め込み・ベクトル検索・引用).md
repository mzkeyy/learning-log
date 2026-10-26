---
title: "AIアプリ開発 04 RAG(埋め込み・ベクトル検索・引用)"
modified: 2026-10-26
---

## RAG とは
**Retrieval-Augmented Generation = 検索してから答えさせる**。モデルが知らない自分たちのデータ(社内文書・商品情報・ノート)について答えさせる定番の方法。
```
[準備(インデックス作成)]
文書 ──分割(チャンク)──▶ 埋め込み(ベクトル化) ──▶ ベクトル DB に保存

[質問のたび]
質問 ──埋め込み──▶ ベクトル DB で似ているチャンクを検索(上位5〜20件)
     ──▶ 「この資料だけを根拠に答えて」+ 資料 + 質問 を LLM に送る ──▶ 答え(+ 出典)
```
- モデルを作り直す(ファインチューニング)より**安く・早く・更新しやすい**
- 答えに**出典を付けられる**ので、ユーザーが確認できる

## そもそも RAG が要るか
| 状況 | おすすめ |
| --- | --- |
| 資料が少ない(数十万トークン以内) | **全部プロンプトに入れて、プロンプトキャッシュ**を使う。検索の仕組みが要らず、精度も高い |
| 資料が多い・頻繁に増える | RAG |
| 資料の場所が決まっている(DB・API) | ツール使用で検索させる(→ 03) |
| 最新の Web 情報 | Web 検索ツール |
- 現行の Claude は 100万トークンまで読めるので、**まず「全部入れる」で足りるか試す**のが近道
- キャッシュすると、2回目以降の同じ部分の入力は約1/10の料金になる(→ 07)

## 埋め込み(Embedding)
- 文章を数百〜数千個の数字の並び(ベクトル)にしたもの。**意味が近い文章ほどベクトルも近い**
- 「近さ」はコサイン類似度などで測る
- 埋め込みは LLM とは**別のモデル**で作る。Anthropic は埋め込みモデルを出しておらず、Voyage AI を推奨している。ほかに OpenAI、Google、Cloudflare Workers AI なども提供
- **日本語に対応したモデル**を選ぶ。インデックス作成と質問で**同じモデル**を使う(違うと比べられない)

## チャンク分割のコツ
- 1チャンクは数百〜1000トークン程度。**見出し・段落の区切り**で切る(文の途中で切らない)
- 前後を少し重ねる(オーバーラップ)と、境目の情報が消えにくい
- 各チャンクに**メタデータ**(文書名・見出し・URL・更新日・閲覧権限)を付けて保存する
- チャンク単体だと文脈がわからないことがある → 「どの文書のどの章の話か」を短く書き足してから埋め込むと精度が上がる(Anthropic の Contextual Retrieval)

## ベクトル DB の選択肢
| 選択肢 | 特徴 |
| --- | --- |
| **PostgreSQL + pgvector** | 普段の DB にベクトル列を足すだけ。権限やメタデータの絞り込みを SQL で書ける → [[SQL]] |
| **Cloudflare Vectorize** | Workers から使える。Workers AI の埋め込みと組み合わせやすい → [[Cloudflare]] |
| 専用サービス(Pinecone など) | 大規模・高機能 |
| SQLite の拡張・メモリ上 | 試作・小規模 |

### Cloudflare(Workers AI + Vectorize)の例
```bash
npx wrangler vectorize create notes-index --dimensions=1024 --metric=cosine   # 次元数は後から変えられない
```
```ts
// 登録
const { data } = await env.AI.run('@cf/baai/bge-m3', { text: chunks.map((c) => c.text) })  // 多言語対応の埋め込み
await env.VECTORIZE.upsert(
  chunks.map((c, i) => ({ id: c.id, values: data[i], metadata: { title: c.title, url: c.url } })),
)

// 検索
const q = await env.AI.run('@cf/baai/bge-m3', { text: [question] })
const { matches } = await env.VECTORIZE.query(q.data[0], { topK: 8, returnMetadata: 'all' })
```

## 検索の精度を上げる
| 手法 | 内容 |
| --- | --- |
| **ハイブリッド検索** | ベクトル検索(意味)+ 全文検索(BM25・キーワード)を組み合わせる。型番・固有名詞に強くなる |
| **リランク** | 多めに取ってきた候補(50件など)を、専用モデルで並べ直して上位だけ使う |
| メタデータで絞る | 「この製品の」「2026年以降の」「この人が見てよい」文書だけ |
| 質問の書き換え | 会話の流れを踏まえて、検索用の質問文を LLM に作らせる |
| エージェント的検索 | 検索をツールにして、足りなければモデルに何度も検索させる |

## 答えを作る(プロンプトと引用)
```ts
const res = await client.messages.create({
  model: 'claude-opus-5-5',
  max_tokens: 16000,
  system: '社内ドキュメントの質問に答えるアシスタントです。渡された資料に書かれていることだけを根拠に答え、資料にない場合は「資料に記載がありません」と答えてください。',
  messages: [{
    role: 'user',
    content: [
      ...matches.map((m) => ({
        type: 'document' as const,
        source: { type: 'text' as const, media_type: 'text/plain' as const, data: m.metadata.text },
        title: m.metadata.title,
        citations: { enabled: true },   // ★ どこを根拠にしたかを返す
      })),
      { type: 'text', text: question },
    ],
  }],
})
```
- 資料は**質問より前**に置く
- 「資料にないことは答えない」と明記する(ハルシネーション対策)
- **citations** を有効にすると、答えの文ごとに引用元(文書・位置・引用文)が付く。画面に出典リンクを出せる
- 取ってきた資料も**外部からの文章**。資料の中の指示には従わせない(プロンプトインジェクション → 07)

## よくある失敗
- 見つからない → チャンクが大きすぎる・小さすぎる、日本語に弱い埋め込みモデル、キーワード検索なし
- 関係ない資料ばかり → 件数が多すぎる、メタデータで絞っていない、リランクなし
- **権限のない文書が答えに混ざる** → 検索の段階でユーザーの権限で絞る(LLM に任せない)→ [[認証]]
- 古い情報で答える → 更新・削除の同期の仕組みを作る(更新日をメタデータに)
- 評価していない → 「質問と、答えに使われるべき文書」のセットを作って、検索の当たり率を測る(→ 07)

## 関連
- 前: [[AIアプリ開発_03_ツール使用と構造化出力]] / 次: [[AIアプリ開発_05_エージェント(ループ・Agent SDK・Managed Agents)]]
- [[SQL]] / [[Cloudflare]] / [[認証]]
- 公式: https://platform.claude.com/docs/en/build-with-claude/embeddings , https://platform.claude.com/docs/en/build-with-claude/citations , https://www.anthropic.com/news/contextual-retrieval , https://developers.cloudflare.com/vectorize/

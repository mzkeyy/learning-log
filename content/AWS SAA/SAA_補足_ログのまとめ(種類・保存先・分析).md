---
title: "SAA 補足 ログのまとめ(種類・保存先・分析)"
modified: 2026-10-25
---

← [[AWS SAA]] / 関連 → [[SAA_補足_監視と監査(CloudTrail・CloudWatch・Config)]]

## まず一言で
> **ログは「何の記録か」で選ぶ。** 操作なら CloudTrail、通信なら VPC フローログ、リクエストなら ELB・CloudFront・S3 のアクセスログ、攻撃なら WAF のログ。
> **保存は S3、すぐ見る・通知するなら CloudWatch Logs、分析は Athena** が基本の組み合わせ。

## ログの種類の早見表
| 知りたいこと | 使うログ | 送れる先 | 既定で有効 |
| --- | --- | --- | --- |
| **誰が** AWS を操作したか(API 呼び出し) | **CloudTrail** | S3、CloudWatch Logs、EventBridge | 直近90日の管理イベントのみ |
| どの IP からどの IP へ通信したか、**許可・拒否** されたか | **VPC フローログ** | CloudWatch Logs、S3、Firehose | ✕ |
| ALB へのリクエスト(URL・ステータス・処理時間) | **ELB アクセスログ** | **S3 のみ** | ✕ |
| CloudFront へのリクエスト | **CloudFront 標準ログ** | S3、CloudWatch Logs、Firehose | ✕ |
| CloudFront へのリクエストを **数秒で** 見たい | **CloudFront リアルタイムログ** | Kinesis Data Streams | ✕ |
| S3 バケットへのリクエスト | **S3 サーバーアクセスログ** または CloudTrail データイベント | S3 | ✕ |
| WAF がどのリクエストを止めたか | **WAF ログ** | CloudWatch Logs、S3、Firehose | ✕ |
| VPC 内からの DNS 問い合わせ | **Route 53 Resolver クエリログ** | CloudWatch Logs、S3、Firehose | ✕ |
| アプリ・OS のログ(EC2) | **CloudWatch エージェント** | CloudWatch Logs | ✕(エージェントを入れる) |
| Lambda の出力 | 自動で CloudWatch Logs | CloudWatch Logs | **○** |
| RDS のエラーログ・スロークエリログ | RDS のログのエクスポート | CloudWatch Logs | ✕ |
| サーバーで打ったコマンド | **Session Manager** のセッションログ | S3、CloudWatch Logs | ✕ |
| リソースの設定の変更履歴 | **Config** | S3(設定のスナップショット・履歴) | ✕ |

→ ほとんどのログは **自分で有効にしないと残らない**。「ログが無くて原因がわからない」という問題文なら、まず有効化が答え。

## よく出るログの中身
### VPC フローログ
- **VPC・サブネット・ネットワークインターフェイス(ENI)** の単位で作れる
- 1行に **送信元 / 送信先の IP・ポート、プロトコル、バイト数、ACCEPT / REJECT** が入る
- **パケットの中身は記録しない**(中身まで見たいなら **トラフィックミラーリング**)
- 記録されない通信もある:Amazon の DNS サーバーへの問い合わせ、インスタンスメタデータ(169.254.169.254)、DHCP、ARP など
- 通信の速度には影響しない。作った後に設定は変えられない(作り直す)

→ 「**セキュリティグループや NACL で拒否された通信を調べたい**」なら VPC フローログ(REJECT の行を見る)。

### ELB のログ
- **アクセスログ**:リクエストごとの時刻、クライアント IP、URL、ステータスコード、処理時間。**S3 にだけ** 保存できる
- ALB には **接続ログ**(TLS の情報、クライアント証明書)と **ヘルスチェックログ** もある(どれも S3)
- ALB の後ろの EC2 から見ると送信元 IP は ALB になる。**元のクライアント IP は `X-Forwarded-For` ヘッダー** か ALB のアクセスログで確認する

### S3 のアクセス記録は2通り
| | S3 サーバーアクセスログ | CloudTrail データイベント |
| --- | --- | --- |
| 料金 | ログを置く S3 の保管料だけ | データイベントの料金がかかる |
| 届き方 | ベストエフォート(遅れる・抜けることがある) | 確実、数分で届く |
| 向いている用途 | アクセス傾向の分析、安く残したい | セキュリティ監査、EventBridge で即時に反応 |

### CloudFront のログ
- **標準ログ**:数分おきにまとめて届く。v2 では S3 に加えて CloudWatch Logs・Firehose にも送れ、Parquet 形式も選べる
- **リアルタイムログ**:Kinesis Data Streams に数秒で届く。追加料金がかかる

## ログの集め方・保存のしかた
### CloudWatch Logs
- **ロググループ**(保存期間やアクセス権をまとめる単位)の中に、**ログストリーム**(送り元ごとの流れ)がある
- **保存期間は既定で「無期限」**。放っておくと料金が増え続けるので、ロググループごとに期間を決める ← コスト最適化で出る
- ログクラスは **標準** と、安いかわりに機能が少ない **低頻度アクセス(Infrequent Access)** の2つ
- **メトリクスフィルター**:「ERROR という文字が5分で10回」のように数を数えてメトリクスにし、アラームにつなぐ
- **サブスクリプションフィルター**:届いたログをすぐに Lambda・Kinesis Data Streams・Firehose へ流す
- **S3 へのエクスポート**:長期保存は S3 に移すと安い
- ロググループの削除防止の設定もある

### 長期保存は S3
```
各種ログ ─▶ S3(ログ専用バケット)
              ├ ライフサイクルで Glacier 系へ移す → 安く長く残す
              ├ Object Lock(WORM)→ 消せない・書き換えられない(監査・法令対応)
              └ 別のログ専用アカウントに置く(Organizations)→ 本番アカウントが乗っ取られても残る
```

### たくさんのアカウントのログを1か所に
- **CloudTrail の組織の証跡**:全アカウントの操作ログを1つのバケットへ
- **Amazon Security Lake**:CloudTrail・VPC フローログ・Route 53 のログなどのセキュリティ関連ログを、共通の形式(OCSF)に変えて、組織全体から1か所の S3 に集める
- **Firehose**:ログを受け取って S3・OpenSearch・Redshift などへ自動で届ける(届ける前に形式も変えられる)

## ログを分析する
| 道具 | 向いている使い方 | 試験でのキーワード |
| --- | --- | --- |
| **CloudWatch Logs Insights** | CloudWatch Logs のログをその場で検索・集計 | 「CloudWatch Logs のログをすぐに調べたい」 |
| **Athena** | **S3 のログに SQL** をかける。サーバー不要、読んだ量だけ課金 | 「S3 のログを **運用負荷少なく** 分析」← 定番 |
| **OpenSearch Service** | 全文検索とダッシュボード。ほぼリアルタイム | 「ログを可視化・全文検索」 |
| **GuardDuty** | CloudTrail・VPC フローログ・DNS ログを **自動で分析して脅威を検知** | 「不審な通信・操作を自動で見つける」(自分でログを有効にしなくてよい) |

## 定番パターン
| やりたいこと | 答え |
| --- | --- |
| 誰が EC2 を削除したか調べたい | CloudTrail |
| 90日より前の操作を調べたい | CloudTrail の証跡を S3 に保存しておき、Athena で検索 |
| SG で拒否された通信を調べたい | VPC フローログ(REJECT) |
| ALB のログを安く長期保存して、たまに分析 | ALB アクセスログ → S3 → Athena |
| アプリのエラーが増えたら通知 | CloudWatch Logs のメトリクスフィルター → アラーム → SNS |
| ログを改ざんできないように残したい | S3 Object Lock、CloudTrail のログファイルの整合性検証 |
| 全アカウントのログを1か所に | 組織の証跡、Security Lake、ログ専用アカウントの S3 |
| ログをリアルタイムで別システムに流したい | サブスクリプションフィルター → Kinesis / Firehose |
| CloudWatch Logs の料金が増え続けている | 保存期間を設定する、古いログは S3 へ |

## 確認ポイント
- [ ] 「操作」「通信」「リクエスト」「攻撃」のログがそれぞれ何か言える
- [ ] VPC フローログはパケットの中身を記録しないと言える
- [ ] ELB のアクセスログの保存先は S3 だけと言える
- [ ] S3 サーバーアクセスログと CloudTrail データイベントの違いを説明できる
- [ ] CloudWatch Logs の保存期間は既定で無期限と言える
- [ ] S3 のログを分析するなら Athena、とすぐ判断できる

## 関連ノート
- [[SAA_補足_監視と監査(CloudTrail・CloudWatch・Config)]] ― CloudTrail・CloudWatch・Config の違い
- [[SAA_補足_Systems Manager(Session Manager・Parameter Store・Patch Manager)]] ― Session Manager のセッションログ
- [[SAA_03_ネットワーク(VPC・ELB・Route 53・CloudFront)]] ― VPC・ELB・CloudFront
- [[SAA_05_ストレージ(S3・EBS・EFS・FSx)]] ― S3 のライフサイクル・Object Lock
- [[SAA_07_疎結合と分析(SQS・SNS・EventBridge・Kinesis・Athena)]] ― Kinesis・Athena
- [[オブザーバビリティ_06_AWSのログ設計(アカウント構成・保存期間・コスト)]] ― 実際のシステムでログをどう設計するか(アカウント構成・保存期間・費用)

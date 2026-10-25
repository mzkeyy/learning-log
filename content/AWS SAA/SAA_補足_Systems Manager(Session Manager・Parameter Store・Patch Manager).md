---
title: "SAA 補足 Systems Manager(Session Manager・Parameter Store・Patch Manager)"
modified: 2026-10-25
---

← [[AWS SAA]] / 関連 → [[SAA_01_AWSの基本(リージョン・AZ・責任共有モデル・Well-Architected)]]

## Systems Manager とは
**EC2 やオンプレミスのサーバーを、ログインせずにまとめて管理するための道具箱**。昔は「SSM(Simple Systems Manager)」という名前だったので、エージェント名・API・ポリシー名などに今も `ssm` が残っている(`aws ssm ...`、`AmazonSSMManagedInstanceCore`)。

Well-Architected の「運用上の優秀性」で答えになりやすいサービス。試験では **「SSH・踏み台なしで」「パッチ当てを自動化」「設定値・秘密情報を安全に保存」** と出たら Systems Manager を思い出す。

### 管理するための前提(マネージドノード)
Systems Manager で操作できるサーバーを **マネージドノード** と呼ぶ。そうなる条件は次の3つ。

```
① SSM Agent が入っている        ← Amazon Linux・Windows の AWS 公式 AMI には最初から入っている
② Systems Manager と通信できる   ← サーバーから外向き HTTPS(443)で ssm / ssmmessages / ec2messages へ
③ 権限がある                    ← EC2 に IAM ロール(AmazonSSMManagedInstanceCore)を付ける
```
- **プライベートサブネットで NAT もない** 場合は、上の3つのエンドポイント用に **VPC エンドポイント(インターフェイス型)** を作る ← 試験の定番
- ③は、インスタンスごとにロールを付ける代わりに **Default Host Management Configuration(DHMC)** でアカウント全体に一括設定することもできる(IMDSv2 が必要)
- オンプレミスや他クラウドのサーバーは **ハイブリッドアクティベーション** で登録する
- 「マネージドノードにならない」原因を調べる診断用ランブックもある(2024年11月に統合コンソールとして追加)

## 主な機能
数が多いので、**試験に出るものを先に** 覚える。

| 機能 | 何をする | 試験でのキーワード |
| --- | --- | --- |
| **Session Manager** | ブラウザや CLI からサーバーのシェルに入る | 「SSH ポートを開けずに」「踏み台サーバーなしで」「操作ログを残す」 |
| **Run Command** | 多数のサーバーに同じコマンドを一斉実行 | 「数百台に一度にスクリプトを実行」 |
| **Patch Manager** | OS・ソフトのパッチを自動で当てる | 「パッチ適用を自動化」「パッチの適用状況を確認」 |
| **Maintenance Windows** | 作業してよい時間帯を決めて定期実行 | 「業務時間外にパッチを当てる」 |
| **State Manager** | サーバーをあるべき状態に保ち続ける | 「起動時に必ずこのソフトを入れる」 |
| **Automation** | 決まった手順(ランブック)を自動実行 | 「AMI 作成を自動化」「Config 違反を自動修復」 |
| **Parameter Store** | 設定値・秘密情報を保存する | 「DB の接続先をコードに書かない」 |
| **Inventory** | 入っているソフト・設定の一覧を集める | 「インストール済みソフトの把握」 |
| **Fleet Manager** | サーバー群の状態をコンソールで一覧・操作 | — |
| **OpsCenter / Explorer** | 運用上の問題(OpsItem)を集めて対応 | — |
| **AppConfig** | 設定値・機能フラグを安全に段階デプロイ | 「設定変更を段階的に反映、問題があればロールバック」 |

> Change Manager は 2025年11月7日から新規利用の受付を終了した(既存の利用者はそのまま使える)。

## Session Manager
### 何がうれしいか
```
従来:  PC ──SSH(22番)──▶ 踏み台 EC2(パブリック)──SSH──▶ EC2(プライベート)
         鍵の配布・管理、22番ポートの開放、踏み台のパッチ当てが必要

Session Manager:
       PC ──HTTPS──▶ Systems Manager ◀──HTTPS(外向き)── SSM Agent(EC2)
         インバウンドのポートは 0 個でよい。鍵も踏み台もいらない
```
- **セキュリティグループのインバウンドを全部閉じたまま** 入れる(通信はエージェント側からの外向き)
- **誰が入れるかは IAM で制御**(`ssm:StartSession` を許可するか、タグで対象を絞る)
- **操作ログを残せる**:セッションの入出力を **S3 / CloudWatch Logs** に保存、セッションの開始・終了は **CloudTrail** に残る([[SAA_補足_監視と監査(CloudTrail・CloudWatch・Config)|CloudTrail の補足ノート]])
- セッションの通信を **KMS キーで暗号化** できる
- **ポートフォワーディング**:手元の PC から、EC2 経由でプライベートな RDS などにつなげる(`AWS-StartPortForwardingSessionToRemoteHost`)
- 普段の `ssh` / `scp` コマンドを Session Manager 経由で使うこともできる(この場合も 22 番を開ける必要はない)
- セッションは既定で `ssm-user`(管理者権限あり)で動く。必要ならこの権限は外せる

### 使うまでの手順
1. EC2 に **`AmazonSSMManagedInstanceCore` を含む IAM ロール** を付ける(または DHMC を設定)
2. EC2 から ssm / ssmmessages / ec2messages に 443 で出られるようにする(NAT か VPC エンドポイント)
3. コンソールの「接続」→「Session Manager」、または CLI(Session Manager プラグインが必要)
   ```bash
   aws ssm start-session --target i-0123456789abcdef0
   ```
4. 必要ならセッション設定で、ログの保存先(S3 / CloudWatch Logs)と KMS 暗号化を有効にする

### うまくつながらないとき
| 症状 | よくある原因 |
| --- | --- |
| 対象のインスタンスが一覧に出ない | IAM ロールが付いていない、SSM Agent が動いていない |
| プライベートサブネットのインスタンスだけ出ない | NAT も VPC エンドポイントもない(3つのエンドポイントが必要) |
| CLI で開始できない | 手元に Session Manager プラグインが入っていない |

### 似たものとの違い
| 方法 | インバウンド | 鍵の管理 | 向いている場面 |
| --- | --- | --- | --- |
| SSH + 踏み台 | 22番が必要 | 必要 | 昔ながらの構成 |
| **EC2 Instance Connect** | 22番が必要(Endpoint を使えばプライベートも可) | 一時的な鍵を自動で送る | SSH をそのまま使いたい |
| **Session Manager** | **不要** | **不要** | 監査ログを残したい、ポートを一切開けたくない |

→ 試験で「**最もセキュア**」「**運用負荷が最も少ない**」とあれば Session Manager が答えになりやすい。

## Parameter Store
設定値(DB の接続先、機能のオン・オフなど)や秘密情報を、`/myapp/prod/db-host` のような **階層の名前** で保存する。アプリは IAM ロールの権限で読み出すので、コードや環境変数に値を書かなくてよい。

- 型は `String`・`StringList`・**`SecureString`(KMS で暗号化)** の3つ
- 値を変えると **バージョン** が残る
- CloudFormation・Lambda・ECS のタスク定義から参照できる

| 項目 | 標準 | アドバンスト |
| --- | --- | --- |
| 料金 | 追加料金なし | かかる |
| 上限(アカウント・リージョンごと) | 10,000個 | 100,000個 |
| 値の最大サイズ | 4 KB | 8 KB |
| パラメータポリシー(有効期限など) | なし | あり |
| 他アカウントへの共有 | できない | できる |

標準からアドバンストへは変えられるが、**逆はできない**(消して作り直す)。

### Secrets Manager との使い分け(頻出)
| | Parameter Store | Secrets Manager |
| --- | --- | --- |
| 得意なもの | 設定値全般、低リスクの秘密情報 | DB のパスワード・API キーなどの秘密情報 |
| **自動ローテーション** | **なし** | **あり**(RDS などと連携) |
| 料金 | 標準なら無料 | 1シークレットごとに課金 |

→ 「**パスワードを定期的に自動で変えたい**」なら Secrets Manager、「**設定値を安く安全に保存**」なら Parameter Store。

## Patch Manager と Maintenance Windows
- **パッチベースライン**:どのパッチを当てるかのルール(例:「重要度 Critical のセキュリティ更新を、公開から7日後に自動承認」)
- **パッチグループ / タグ** で「本番」「検証」など対象を分ける
- **Maintenance Windows** で「毎週日曜 3:00〜5:00」のように実行時間を決める
- 結果は **Compliance** で「どのサーバーがパッチ未適用か」を一覧できる

→ 責任共有モデルで **EC2 の OS パッチはお客様の責任**。それを自動化する手段が Patch Manager。

## 確認ポイント
- [ ] マネージドノードになる3つの条件(SSM Agent・通信・IAM ロール)を言える
- [ ] プライベートサブネットで Session Manager を使うには VPC エンドポイントが必要と言える
- [ ] Session Manager が SSH・踏み台より安全な理由(インバウンド不要、鍵不要、IAM で制御、ログが残る)を説明できる
- [ ] Parameter Store と Secrets Manager の違い(自動ローテーション)を説明できる
- [ ] 「業務時間外に自動でパッチ」→ Patch Manager + Maintenance Windows とすぐ判断できる

## 関連ノート
- [[SAA_01_AWSの基本(リージョン・AZ・責任共有モデル・Well-Architected)]] ― 責任共有モデル、運用上の優秀性
- [[SAA_02_IAMとセキュリティ(IAM・KMS・Organizations・WAF)]] ― IAM ロール、KMS
- [[SAA_03_ネットワーク(VPC・ELB・Route 53・CloudFront)]] ― VPC エンドポイント
- [[SAA_補足_監視と監査(CloudTrail・CloudWatch・Config)]] ― CloudTrail による操作の記録、Config ルールの自動修復
- [[APIキー・シークレット管理]]

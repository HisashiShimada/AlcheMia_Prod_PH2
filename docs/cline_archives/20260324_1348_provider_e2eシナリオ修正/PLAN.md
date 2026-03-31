# タスク計画書: プロバイダー E2Eシナリオテスト一覧の修正・拡充

## メタデータ
- **作成日時**: 2026-03-24 13:48
- **タスクID**: provider_e2e_scenario_update
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`tests/e2e/test-scenarios/1_provider.md` を `4_experiment_admin.md` のフォーマットに合わせて修正・拡充する。

現状は業務内容一覧（9項目）のみ記載されており、テストグループのスコープ定義・詳細シナリオ・前提条件・後処理・テスト環境情報・要件書照合結果・参照ドキュメントが欠如している。

## 目的と期待される成果

- [ ] `4_experiment_admin.md` と同等のフォーマットに統一する
- [ ] 各シナリオに種別（正常系/異常系/表示確認）・根拠・対応APIを明記する
- [ ] 前提条件・後処理・ビジネスルールを各グループに追加する
- [ ] テスト実行に必要な前提情報（環境・ユーザー・テストデータ）を整理する
- [ ] 要件書記載業務とUI/API設計書の照合結果を表形式で追加する
- [ ] 参照ドキュメント一覧を追加する

## 修正方針

### 現状の問題点

| 問題 | 詳細 |
|------|------|
| 情報不足 | 業務内容一覧（9項目）しか記載されておらず、テスト実行に必要な情報が欠如 |
| フォーマット不統一 | `4_experiment_admin.md` と構造が異なり、テスト管理の一貫性がない |
| シナリオ詳細なし | シナリオID・種別・根拠・対応APIが未記載 |
| 前提条件なし | テストデータや事前状態の定義がない |
| 照合結果なし | 要件書と設計書の対応関係が不明 |

### 追加・修正するセクション構成

```
1. テスト対象スコープ（スコープ内/スコープ外）
2. シナリオ詳細一覧（各グループ）
   - シナリオ表（ID・名・種別・根拠・対応API）
   - 前提条件
   - ビジネスルール/CSVフォーマット等
   - 後処理
3. テスト実行に必要な前提情報
   - テスト環境
   - テストユーザー
   - 常設テストデータ
4. 要件書記載業務とUI/API設計書の照合結果
5. 参照ドキュメント
```

### テストグループとシナリオ数

| テストグループID | テストグループ名 | シナリオ数 | テスト方法 |
|----------------|----------------|-----------|-----------|
| 1-1 | 会社の作成 | 7件 | Playwright自動 |
| 1-2 | 会社の編集 | 6件 | Playwright自動 |
| 1-3 | 会社のアクティブ/非アクティブ化 | 5件 | Playwright自動 |
| 1-4 | 会社のCSVダウンロード・アップロード | 4件 | Playwright自動 |
| 1-5 | 組織の作成 | 7件 | Playwright自動 |
| 1-6 | 組織の編集 | 8件 | Playwright自動 |
| 1-7 | 組織のアクティブ/非アクティブ化 | 5件 | Playwright自動 |
| 1-8 | 組織のCSVダウンロード・アップロード | 4件 | Playwright自動 |
| 1-9 | 全組織の課金情報CSVダウンロード | 2件 | Playwright自動 |
| **合計** | - | **48件** | - |

### スコープ外とした項目

| 除外対象 | 除外理由 |
|---------|---------|
| ユーザーID/PWの発行・登録 | システム管理者ロールの業務範囲（2_system_management）でカバー |
| 部門／グループの作成・設定 | システム管理者ロールの業務範囲（2_system_management）でカバー |
| アクセス権限（パーミッション）の管理 | システム管理者ロールの業務範囲（2_system_management）でカバー |
| システムダウン時の詳細通知受信 | 設計書に実装なし |
| メンテナンス通知の発信 | 設計書に実装なし |
| システム稼働状況の管理・最適化 | 設計書に実装なし |

### 対応APIの整理

| 機能 | 対応API |
|------|---------|
| 会社一覧取得 | GET `/api/v1/provider/corporation` |
| 会社作成 | POST `/api/v1/provider/corporation` |
| 会社更新 | PUT `/api/v1/provider/corporation/:corporationId` |
| 会社ステータス変更（個別） | PATCH `/api/v1/provider/corporation/:corporationId/status` |
| 会社ステータス変更（一括） | PATCH `/api/v1/provider/corporation/bulk-status` |
| 会社CSVダウンロード | GET `/api/v1/provider/corporation/download-csv` |
| 会社CSVアップロード | POST `/api/v1/provider/corporation/upload-csv` |
| 組織一覧取得 | GET `/api/v1/provider/organization` |
| 組織作成 | POST `/api/v1/provider/organization` |
| 組織更新 | PUT `/api/v1/provider/organization/:organizationId` |
| 組織ステータス変更（個別） | PATCH `/api/v1/provider/organization/:organizationId/status` |
| 組織ステータス変更（一括） | PATCH `/api/v1/provider/organization/bulk-status` |
| 組織CSVダウンロード | GET `/api/v1/provider/organization/download-csv` |
| 組織CSVアップロード | POST `/api/v1/provider/organization/upload-csv` |
| 全組織課金情報CSVダウンロード | GET `/api/v1/provider/organization/download-information-csv` |

## 実装ステップ

- [x] `4_experiment_admin.md` のフォーマットを参照して修正方針を策定
- [x] `1_provider.md` を全面的に書き換え（write_file）

## 変更ファイル

1. `tests/e2e/test-scenarios/1_provider.md` - フォーマット統一・情報拡充（修正済み）
2. `docs/20260324_1348_provider_e2eシナリオ修正/PLAN.md` - 本タスク計画書（新規作成）

## 参照ドキュメント

- [参考フォーマット](../../tests/e2e/test-scenarios/4_experiment_admin.md)
- [修正対象ファイル](../../tests/e2e/test-scenarios/1_provider.md)
- [ロール別業務内容一覧](../20260310_0940_ロール別業務内容一覧.md)

## リスク

| リスク | 対策 |
|--------|------|
| 設計書が参照できない場合、APIパスや設計書セクション番号が不正確になる可能性 | 既存の `.feature` ファイルと `4_experiment_admin.md` の記述パターンを参考に推定値を記載。実際のE2Eテスト実装時に照合・修正すること |
| 常設テストデータの具体的な組織CDや会社名が実際のテストと一致しない可能性 | 既存の `.feature` ファイルで使用されている実データを基に記載。差異があれば実装時に修正すること |

## 承認記録

- **計画書提示日時**: 2026-03-24 13:51
- **承認日時**: 2026-03-24 13:51
- **承認者コメント**: 修正方針をタスク計画書として出力するよう依頼

## 実施記録

### 実施日時
開始: 2026-03-24 13:48  
完了: 2026-03-24 13:53

### 最終的な成果物
- [x] `tests/e2e/test-scenarios/1_provider.md` の修正完了（業務内容一覧9項目 → 48シナリオ・5セクション構成に拡充）
- [x] `docs/20260324_1348_provider_e2eシナリオ修正/PLAN.md` の作成完了

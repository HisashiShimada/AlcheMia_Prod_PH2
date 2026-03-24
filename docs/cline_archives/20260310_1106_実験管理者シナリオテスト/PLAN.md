# タスク計画書: 実験管理者ロール シナリオテスト作成

## メタデータ
- **作成日時**: 2026-03-10 11:06
- **タスクID**: experiment_admin_scenario_test
- **優先度**: 高
- **推定工数**: 8時間

## タスク概要

要求仕様書から抽出したロール別業務一覧（`docs/20260310_0940_ロール別業務内容一覧.md`）をベースに、
UI設計書・API設計書を照合して実験管理者を対象としたシナリオテストを作成する。

要件書の内容に加え、設計書に存在する追加機能（要件書未記載）もテスト対象に含める。

## 目的と期待される成果
- [ ] 実験管理者の業務フローを網羅したシナリオテスト一覧を作成する
- [ ] 要件書記載の業務と設計書の実装内容の対応関係を明確化する
- [ ] 要件書に未記載だが設計書に存在する追加機能を特定・文書化する
- [ ] Playwright BDD（Gherkin記法）によるfeatureファイルを作成する
- [ ] 各featureに対応するstep定義ファイル（TypeScript）を作成する

## 実装ステップ

### Phase 1: 調査・分析（完了）
- [x] UI設計書の調査（実験管理者関連全ディレクトリ）
- [x] API設計書の調査（api_project_management.md）
- [x] 既存テストパターン（providerロール）の調査
- [x] 要件書記載業務とUI/API設計書の照合
- [x] 要件書未記載の追加機能の特定

### Phase 2: ドキュメント作成（進行中）
- [x] テスト対象業務・機能一覧ファイルの作成
- [ ] テストシナリオ詳細（featureファイル群）の作成
  - [ ] `4-1_project_create.feature` - プロジェクト作成
  - [ ] `4-2_project_checkout.feature` - チェックアウト/チェックイン
  - [ ] `4-3_task_registration.feature` - タスク登録
  - [ ] `4-4_instruction_send.feature` - 指示登録・送信
  - [ ] `4-5_progress_monitoring.feature` - 進捗確認
  - [ ] `4-6_project_filter_search.feature` - フィルタ・検索

### Phase 3: ステップ定義作成
- [ ] `4-1_project_create.ts` - プロジェクト作成ステップ定義
- [ ] `4-2_project_checkout.ts` - チェックアウト/チェックインステップ定義
- [ ] `4-3_task_registration.ts` - タスク登録ステップ定義
- [ ] `4-4_instruction_send.ts` - 指示登録・送信ステップ定義
- [ ] `4-5_progress_monitoring.ts` - 進捗確認ステップ定義
- [ ] `4-6_project_filter_search.ts` - フィルタ・検索ステップ定義

## 変更ファイル

### 新規作成
1. `docs/20260310_1106_実験管理者シナリオテスト/PLAN.md` - このファイル
2. `tests/e2e/test-scenarios/4_experiment_admin.md` - テスト対象一覧
3. `tests/e2e/features/experiment_admin/4-1_project_create.feature`
4. `tests/e2e/features/experiment_admin/4-2_project_checkout.feature`
5. `tests/e2e/features/experiment_admin/4-3_task_registration.feature`
6. `tests/e2e/features/experiment_admin/4-4_instruction_send.feature`
7. `tests/e2e/features/experiment_admin/4-5_progress_monitoring.feature`
8. `tests/e2e/features/experiment_admin/4-6_project_filter_search.feature`
9. `tests/e2e/steps/experiment_admin/4-1_project_create.ts`
10. `tests/e2e/steps/experiment_admin/4-2_project_checkout.ts`
11. `tests/e2e/steps/experiment_admin/4-3_task_registration.ts`
12. `tests/e2e/steps/experiment_admin/4-4_instruction_send.ts`
13. `tests/e2e/steps/experiment_admin/4-5_progress_monitoring.ts`
14. `tests/e2e/steps/experiment_admin/4-6_project_filter_search.ts`

## 技術的詳細

### テストフレームワーク
- **Playwright BDD** (`playwright-bdd`)
- **Gherkin記法**（日本語: `# language: ja`）
- **TypeScript** によるステップ定義

### テスト対象環境
- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:3001
- データベース: PostgreSQL（直接接続でDB検証）

### テストユーザー
- **ロール**: experiment_admin（実験管理者）
- **ユーザーID**: 要確認
- **パスワード**: 要確認
- **組織ID（orgId）**: 要確認

### 既存テストパターンの踏襲
プロバイダーの既存実装（`tests/e2e/features/provider/1-1_corporation_create.feature`）と同じパターンで実装する：
- 日本語Gherkin記法（`# language: ja`）
- DataTable形式での入力値指定
- `page.waitForResponse()` でAPI完了を待機
- Afterフックでテストデータをクリーンアップ（DBから削除）
- `playwright-bdd` の `createBdd()` を使用

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 実験管理者ユーザー情報未確定 | 高 | 中 | ユーザーに確認する |
| 一部APIが未実装（指示送信等） | 中 | 低 | 設計書の未実装APIはモック対応かスキップ |
| タスク登録がMAIML依存 | 中 | 中 | 事前にMAIML登録済みのテストプロジェクトを準備 |

## 承認記録
- **計画書提示日時**: 2026-03-10 11:06
- **承認日時**: 2026-03-10 11:06
- **承認者コメント**: ここまでの調査結果をまとめてファイルに出力する

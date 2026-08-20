# タスク計画書: experiment_evaluation 削除と評価テーブル再実装

## メタデータ

- **作成日時**: 2026-08-17 17:00
- **タスクID**: 20260817_1700
- **優先度**: 高
- **推定工数**: 1〜2日
- **関連タスク**:
  - [20260817_0900 品質管理機能実装](../20260817_0900_品質管理機能_要約と実装計画/implementation_plan.md)
  - [20260817_1500 品質評価MaiMLEventLog書き込み実装](../20260817_1500_品質評価MaiMLEventLog書き込み実装/PLAN.md)

---

## タスク概要

設計段階の古いテーブル `experiment_evaluation` に依存した実装を一括削除し、
本来の設計書（`Alchemia品質管理機能_基本設計書.md §7`）が想定する
**`aggregation_rules` + `project_overall_evaluations` の2テーブル構成**に統一する。

あわせて両テーブルのDDLを正規の場所（`docs/design/db/ddl/`）に追加する
（現時点では `backend/src/sql/ddl/` にのみ存在し、設計書フォルダに未配置）。

下位評価（メソッド別・タスク別・トランジション別）の保存先は
`project_overall_evaluations` の `evaluation_scope` カラムに
`METHOD` / `TASK` / `TRANSITION_METHOD` / `TRANSITION_TASK` の値を持たせ、
`method_id` / `task_no` / `transition_id` カラムを追加して対応する。

---

## 目的と期待される成果

- [ ] `experiment_evaluation` テーブル依存コードをすべて削除
- [ ] `docs/design/db/ddl/` に `aggregation_rules.sql` / `project_overall_evaluations.sql` を追加
- [ ] `project_overall_evaluations` テーブルの DDL を下位評価対応に拡張
- [ ] `aggregationCalculatorService` / `maimlQualityWriter` の型参照を新しい型に切替
- [ ] フロントエンドの評価入力保存先を `project-overall-evaluations/sub-evaluations` API に切替
- [ ] TypeScript コンパイルエラーがゼロになる

---

## 影響範囲の分析

### 削除対象ファイル（7件）

| ファイル | 理由 |
|---|---|
| `backend/src/repositories/experimentEvaluationRepository.ts` | `experiment_evaluation` テーブル専用 |
| `backend/src/services/experimentEvaluationService.ts` | 同上 |
| `backend/src/controllers/experimentEvaluationController.ts` | 同上 |
| `backend/src/routes/experimentEvaluationRoutes.ts` | 同上 |
| `backend/src/sql/queries/experiment_evaluation/findByProject.sql` | 同上 |
| `backend/src/sql/queries/experiment_evaluation/upsert.sql` | 同上 |
| `frontend/src/services/experimentEvaluationApiService.ts` | バックエンドAPI呼び出し |

### 新規作成ファイル

| ファイル | 内容 |
|---|---|
| `docs/design/db/ddl/aggregation_rules.sql` | DDL正規配置（既存 backend/src/sql/ddl/ から転写・整形） |
| `docs/design/db/ddl/project_overall_evaluations.sql` | DDL正規配置（下位評価対応カラム追加版） |
| `docs/design/db/ddl/migrations/20260817_extend_project_overall_evaluations.sql` | 本番DB適用用 ALTER TABLE マイグレーション |
| `backend/src/sql/queries/project_overall_evaluations/findSubEvaluationsByProject.sql` | 下位評価一覧取得 SQL |
| `backend/src/sql/queries/project_overall_evaluations/upsertSubEvaluation.sql` | 下位評価 UPSERT SQL |

### 修正対象ファイル（バックエンド）

| ファイル | 変更内容 |
|---|---|
| `docs/design/db/db_table_list.md` | aggregation_rules・project_overall_evaluations エントリ追加 |
| `backend/src/sql/ddl/project_overall_evaluations.sql` | 下位評価対応カラム追加・制約緩和 |
| `backend/src/types/projectOverallEvaluation.ts` | `SubEvaluationRow` / `SubEvaluationInput` / `SaveSubEvaluationsInput` 型追加 |
| `backend/src/repositories/projectOverallEvaluationRepository.ts` | `findSubEvaluationsByProject()` / `insertSubEvaluation()` / `updateSubEvaluation()` 追加 |
| `backend/src/services/projectOverallEvaluationService.ts` | `saveSubEvaluations()` / `getSubEvaluationsByProject()` 追加、`experimentEvaluationRepository` 参照削除 |
| `backend/src/services/aggregationCalculatorService.ts` | `ExperimentEvaluationRow` 型参照を `SubEvaluationRow` に変更 |
| `backend/src/types/aggregationRule.ts` | `sourceEvaluations` コメント修正 |
| `backend/src/utils/maimlQualityWriter.ts` | `ExperimentEvaluation` 型参照を `SubEvaluationRow` に変更 |
| `backend/src/services/qualityEvaluationMaimlService.ts` | `experimentEvaluationRepository` 参照を `findSubEvaluationsByProject()` に変更 |
| `backend/src/controllers/projectOverallEvaluationController.ts` | `saveSubEvaluations` / `getSubEvaluations` ハンドラ追加 |
| `backend/src/routes/projectOverallEvaluationRoutes.ts` | 上記2ルート追加 |
| `backend/src/server.ts` | `experimentEvaluationRoutes` の import・登録を削除 |
| `backend/tests/services/aggregationCalculatorService.test.ts` | 型参照を `SubEvaluationRow` に変更（ロジック変更なし） |
| `backend/tests/utils/maimlQualityWriter.test.ts` | 型参照を `SubEvaluationRow` に変更 |

### 修正対象ファイル（フロントエンド）

| ファイル | 変更内容 |
|---|---|
| `frontend/src/types/projectOverallEvaluation.ts` | `SubEvaluationRow` / `SubEvaluationInput` / `SaveSubEvaluationsRequest` 型追加 |
| `frontend/src/services/projectOverallEvaluationApiService.ts` | `getSubEvaluationsByProject()` / `saveSubEvaluations()` 追加 |
| `frontend/src/components/project/EvaluationRegistrationTab.tsx` | `experimentEvaluationApiService` → `projectOverallEvaluationApiService` 切替 |
| `frontend/src/components/project/EvaluationDialog.tsx` | 同上 |
| `frontend/src/components/project/ProjectCompletionDialog.tsx` | `saveEvaluations` → `saveSubEvaluations` 切替 |
| `frontend/src/locales/ja.json` | `experimentEvaluationService` キー削除 |
| `frontend/src/locales/en.json` | `experimentEvaluationService` キー削除 |

---

## 実装ステップ（チェックリスト）

### Phase 1: DDL整備

- [ ] `docs/design/db/ddl/aggregation_rules.sql` 作成
  - `backend/src/sql/ddl/aggregation_rules.sql` の内容をコメント整備して配置
- [ ] `docs/design/db/ddl/project_overall_evaluations.sql` 作成
  - 既存DDL + `method_id` / `task_no` / `transition_id` カラム追加
  - `applied_rule_id` / `applied_rule_version` / `applied_rule_snapshot` / `aggregation_snapshot` を nullable 化
  - `evaluation_scope` に CHECK 制約追加
    `CHECK (evaluation_scope IN ('MAIML_PROJECT','METHOD','TASK','TRANSITION_METHOD','TRANSITION_TASK'))`
- [ ] `docs/design/db/ddl/migrations/20260817_extend_project_overall_evaluations.sql` 作成
  - ALTER TABLE でカラム追加・制約変更（本番DB適用用）
- [ ] `backend/src/sql/ddl/project_overall_evaluations.sql` を同内容に更新
- [ ] `docs/design/db/db_table_list.md` に aggregation_rules・project_overall_evaluations エントリ追加

### Phase 2: バックエンド型定義・SQL・Repository・Service

- [ ] `backend/src/types/projectOverallEvaluation.ts` に以下を追加
  - `SubEvaluationRow` / `SubEvaluationInput` / `SaveSubEvaluationsInput` インターフェース
- [ ] `backend/src/sql/queries/project_overall_evaluations/findSubEvaluationsByProject.sql` 作成
  - `evaluation_scope != 'MAIML_PROJECT'` でフィルタ
- [ ] `backend/src/sql/queries/project_overall_evaluations/upsertSubEvaluation.sql` 作成
  - `(organization_id, project_id, evaluation_scope, method_id, task_no, transition_id)` をキーにした UPSERT
- [ ] `backend/src/repositories/projectOverallEvaluationRepository.ts` に追加
  - `findSubEvaluationsByProject` / `insertSubEvaluation` / `updateSubEvaluation`
- [ ] `backend/src/services/projectOverallEvaluationService.ts` に追加・修正
  - `getSubEvaluationsByProject` / `saveSubEvaluations` 追加
  - `getSummaryPreview` / `createOverallEvaluation` の `experimentEvaluationRepository` 参照を削除

### Phase 3: aggregationCalculatorService・maimlQualityWriter 型切替

- [ ] `aggregationCalculatorService.ts` — `ExperimentEvaluationRow[]` → `SubEvaluationRow[]`
- [ ] `aggregationRule.ts` — `sourceEvaluations` コメント修正
- [ ] `maimlQualityWriter.ts` — `ExperimentEvaluation` → `SubEvaluationRow`
- [ ] `qualityEvaluationMaimlService.ts` — `experimentEvaluationRepository` 参照を削除

### Phase 4: Controller・Routes・server.ts

- [ ] `projectOverallEvaluationController.ts` — `getSubEvaluations` / `saveSubEvaluations` ハンドラ追加
- [ ] `projectOverallEvaluationRoutes.ts` — 上記2ルート追加
- [ ] `server.ts` — `experimentEvaluationRoutes` の import・登録を削除

### Phase 5: experiment_evaluation 関連ファイル削除（6件）

- [ ] `experimentEvaluationRepository.ts` 削除
- [ ] `experimentEvaluationService.ts` 削除
- [ ] `experimentEvaluationController.ts` 削除
- [ ] `experimentEvaluationRoutes.ts` 削除
- [ ] `sql/queries/experiment_evaluation/findByProject.sql` 削除
- [ ] `sql/queries/experiment_evaluation/upsert.sql` 削除

### Phase 6: フロントエンド型定義・API サービス

- [ ] `frontend/src/types/projectOverallEvaluation.ts` — `SubEvaluationRow` / `SubEvaluationInput` / `SaveSubEvaluationsRequest` 追加
- [ ] `frontend/src/services/projectOverallEvaluationApiService.ts` — `getSubEvaluationsByProject` / `saveSubEvaluations` 追加

### Phase 7: フロントエンド コンポーネント修正

- [ ] `EvaluationRegistrationTab.tsx` — `experimentEvaluationApiService` → `projectOverallEvaluationApiService` 切替
- [ ] `EvaluationDialog.tsx` — 同上
- [ ] `ProjectCompletionDialog.tsx` — `saveEvaluations` → `saveSubEvaluations` 切替

### Phase 8: i18n キー削除・ファイル削除

- [ ] `frontend/src/locales/ja.json` — `experimentEvaluationService` キー削除
- [ ] `frontend/src/locales/en.json` — `experimentEvaluationService` キー削除
- [ ] `frontend/src/services/experimentEvaluationApiService.ts` 削除

### Phase 9: テスト修正・ビルド確認

- [ ] `aggregationCalculatorService.test.ts` — 型参照を `SubEvaluationRow` に変更
- [ ] `maimlQualityWriter.test.ts` — 型参照を `SubEvaluationRow` に変更
- [ ] `cd backend && npx tsc --noEmit` — エラーゼロ確認
- [ ] `cd frontend && npx tsc --noEmit` — エラーゼロ確認
- [ ] `cd backend && npx jest tests/services/aggregationCalculatorService.test.ts` — 全 PASS 確認

---

## 設計詳細

### SubEvaluationRow の設計方針

`project_overall_evaluations` テーブルの下位評価レコードは以下のカラム構成を持つ。

| カラム | MAIML_PROJECT | METHOD / TASK / TRANSITION_* |
|---|---|---|
| `evaluation_scope` | `'MAIML_PROJECT'` | `'METHOD'` / `'TASK'` / `'TRANSITION_METHOD'` / `'TRANSITION_TASK'` |
| `method_id` | NULL | 設定あり |
| `task_no` | NULL | TASK/TRANSITION_TASK のみ設定あり |
| `transition_id` | NULL | TRANSITION_* のみ設定あり |
| `overall_digital` | 設定あり | 設定あり（評価値） |
| `overall_analog` | 設定あり | 設定あり（コメント） |
| `applied_rule_id` | NOT NULL | NULL |
| `applied_rule_snapshot` | NOT NULL（JSONB） | NULL |
| `aggregation_snapshot` | NOT NULL（JSONB） | NULL |

**upsert キー（下位評価）:**
`(organization_id, project_id, evaluation_scope, COALESCE(method_id,''), COALESCE(task_no::TEXT,''), COALESCE(transition_id,''))`

### aggregationCalculatorService の型変更方針

`SubEvaluationRow` には `aggregationCalculatorService` が参照するフィールドを
`ExperimentEvaluationRow` と同名で定義する。

| aggregationCalculatorService が参照するフィールド | SubEvaluationRow での定義 |
|---|---|
| `evaluation_unit` | `evaluation_scope` の値（METHOD → method 等） |
| `method_id` | そのまま `method_id` |
| `task_no` | そのまま `task_no` |
| `transition_id` | そのまま `transition_id` |
| `evaluation_value` | `overall_digital` の値を `evaluation_value` として公開 |
| `comment` | `overall_analog` の値を `comment` として公開 |

> `evaluation_unit` / `evaluation_value` / `comment` は `SubEvaluationRow` に
> `evaluation_scope` / `overall_digital` / `overall_analog` のエイリアスとして含める。
> `aggregationCalculatorService` のロジック変更は不要。

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| `project_overall_evaluations.insert.sql` が NOT NULL を前提にしており、下位評価 INSERT でエラー | 高 | 高 | 下位評価専用 `upsertSubEvaluation.sql` を作成し全体評価 INSERT と分離 |
| DDL 変更（nullable 化・カラム追加）が既存の全体評価レコードに影響 | 低 | 低 | ADD COLUMN はデフォルト NULL のため互換。DROP NOT NULL は既存レコードに影響なし |
| `aggregationCalculatorService` の型変更でテストが壊れる | 中 | 低 | `SubEvaluationRow` が同フィールド構成のためロジック変更なし |
| `maimlQualityWriter.ts` の型変更でコンパイルエラーが出る | 中 | 中 | `SubEvaluationRow` に旧 `ExperimentEvaluation` の全フィールドを含めることで対応 |

---

## テスト計画

### ユニットテスト（自動）

- [ ] `aggregationCalculatorService.test.ts` — 型変更後も17件全 PASS
- [ ] `maimlQualityWriter.test.ts` — 型変更後も14件全 PASS

### ビルドチェック

- [ ] `cd backend && npx tsc --noEmit` — エラーゼロ
- [ ] `cd frontend && npx tsc --noEmit` — エラーゼロ

### 手動確認

- [ ] 評価登録確認タブで「✏️ 評価を入力」ボタンから評価値を保存できること
- [ ] 評価一覧が取得できること（`GET /api/v1/project-overall-evaluations/:projectId/sub-evaluations`）
- [ ] 階層別サマリー（`getSummaryPreview`）が返ってくること
- [ ] プロジェクト完了ダイアログから評価値が保存できること

---

## ロールバック計画

- git で変更を revert することで即座に元の状態に戻せる
- DB は ALTER TABLE を別マイグレーションファイルで管理しているため、未適用なら影響なし
- 既適用の場合は逆マイグレーション（DROP COLUMN / ALTER COLUMN SET NOT NULL）で復元可能

---

## 関連ドキュメント

- [品質管理機能基本設計書](../../design/Alchemia品質管理機能_基本設計書.md)
- [品質管理機能実装計画（Phase 1〜3）](../20260817_0900_品質管理機能_要約と実装計画/implementation_plan.md)
- [品質評価MaiMLEventLog書き込み実装](../20260817_1500_品質評価MaiMLEventLog書き込み実装/PLAN.md)
- [DB操作規約](./../../../.clinerules/development/database.md)
- [TypeScript型定義規約](./../../../.clinerules/development/typescript.md)

---

## 承認記録

- **計画書提示日時**: 2026-08-17 17:00
- **承認日時**: 2026-08-17 17:00
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時

開始: 2026-08-18  
完了: 2026-08-18

### 計画からの変更点

- `aggregationRuleService.ts` にも `experimentEvaluationRepository` 参照があったため Phase 3 で同時修正。
- `maimlQualityWriter.ts` の `uncertainty_key` 参照（`SubEvaluationRow` に存在しない）を `evaluation_scope` で代替するよう修正。
- `EvaluationDialog.tsx` / `EvaluationRegistrationTab.tsx` の MOCK データを `SubEvaluationRow` 型に合わせて全面書き換え。
- `SubEvaluationScope` が大文字（`'METHOD'` 等）のため、コンポーネント内の `evalUnit` 初期値・switch case・比較値をすべて大文字に修正。
- `EvaluationRegistrationTab.tsx` の「基準名」列と `EvaluationDialog.tsx` の同列を `evaluation_scope` 表示に変更（`uncertainty_key` が型に存在しないため）。
- `ProjectCompletionDialog.tsx` の保存ステップを整理：`experiment_evaluation` への保存を廃止し、全体評価登録 (`createOverallEvaluation`) に `overallDigital` / `overallAnalog` を直接渡す形に変更。

### 発生した問題と解決方法

- `projectOverallEvaluationService.ts` の editor 編集で旧コードが重複残存 → 重複部分を手動削除。
- `EvaluationDialog.tsx` の `</Radio>` タグが重複挿入されて JSX エラー → 重複タグを削除。
- `SubEvaluationScope` が大文字ユニオン型のため小文字スコープ比較の型エラーが多数 → sed で一括置換 + `t()` 呼び出しには `.toLowerCase()` を追加。

### 最終的な成果物

- [x] DDL整備完了（`docs/design/db/ddl/aggregation_rules.sql`・`project_overall_evaluations.sql`・マイグレーション、`backend/src/sql/ddl/project_overall_evaluations.sql` 更新、`db_table_list.md` 追記）
- [x] バックエンド型定義・Repository・Service 修正完了（`SubEvaluationRow` / `SubEvaluationInput` / `SaveSubEvaluationsInput` 追加、`findSubEvaluationsByProject` / `insertSubEvaluation` / `updateSubEvaluation` 追加）
- [x] experiment_evaluation 関連ファイル7件削除完了（Repository・Service・Controller・Routes・SQL×2・フロントエンドApiService）
- [x] フロントエンドコンポーネント修正完了（`EvaluationRegistrationTab.tsx`・`EvaluationDialog.tsx`・`ProjectCompletionDialog.tsx`）
- [x] `aggregationCalculatorService.test.ts` — 17件全 PASS
- [x] `maimlQualityWriter.test.ts` — 14件全 PASS
- [x] `cd backend && npx tsc --noEmit` — 今回変更ファイルに起因するエラーゼロ（既存 `organizationService.ts` のエラーは今回対象外）
- [x] `cd frontend && npx tsc --noEmit` — 今回変更ファイルに起因するエラーゼロ（既存 `EncryptionManagement.tsx`・`DetailModal.tsx`・`LanguageContext.tsx` のエラーは今回対象外）

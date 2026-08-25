# 実装ロードマップ

> 作成日: 2026-06-18

---

## フェーズ別実装順序

```
Phase 1: DBマイグレーション（0.5日）
  ↓
Phase 2: 実験計画API実装（3日）
  ↓
Phase 3: 実験指示API実装（2日）
  ↓（並行可）
Phase 4: チェックアウト処理拡張（1.5日）
  ↓（Phase 2,3,4 完了後）
Phase 5: フロントエンドAPI接続（4日）
  ↓
Phase 6: テスト・調整（3日）
```

---

## Phase 1: DBマイグレーション（0.5日）

| # | 作業 | ファイル |
|---|------|---------|
| 1 | experiment_plan テーブル作成 | `migrations/20260618_003_add_experiment_plan.sql` |
| 2 | project_task_detail 拡張 | `migrations/20260618_004_add_review_result_to_task_detail.sql` |
| 3 | code_master TaskStatus 06 追加 | `migrations/20260618_005_add_task_status_ng.sql` |
| 4 | マイグレーション適用・確認 | — |

**完了基準**: `psql` でテーブル/カラム/データが正しく存在することを確認

---

## Phase 2: 実験計画API実装（3日）

| # | 作業 | ファイル | 日数 |
|---|------|---------|------|
| 1 | ExperimentPlanRow 型定義追加 | `src/types/database.ts` | 0.1 |
| 2 | SQLファイル3本作成 | `src/sql/queries/experimentPlan/*.sql` | 0.3 |
| 3 | Repository 実装 | `src/repositories/experimentPlanRepository.ts` | 0.5 |
| 4 | Service 実装 | `src/services/experimentPlanService.ts` | 0.7 |
| 5 | Controller 実装 | `src/controllers/experimentPlanController.ts` | 0.7 |
| 6 | Route 定義・server.ts 登録 | `src/routes/experimentPlanRoutes.ts` | 0.3 |
| 7 | 単体テスト | `tests/repositories/`, `tests/services/` | 0.4 |

**完了基準**: 全エンドポイントに対し curl で期待するレスポンスが返ること

---

## Phase 3: 実験指示API実装（2日）

| # | 作業 | ファイル | 日数 |
|---|------|---------|------|
| 1 | templateDataRepository 拡張 | `src/repositories/templateDataRepository.ts` | 0.3 |
| 2 | projectTaskDetailRepository 拡張 | `src/repositories/projectTaskDetailRepository.ts` | 0.3 |
| 3 | experimentInstructionService 新規作成 | `src/services/experimentInstructionService.ts` | 0.8 |
| 4 | experimentInstructionController モック差し替え | `src/controllers/experimentInstructionController.ts` | 0.4 |
| 5 | 単体テスト | `tests/services/experimentInstructionService.test.ts` | 0.2 |

**完了基準**: 承認・NG API が DB を正しく更新すること

---

## Phase 4: チェックアウト処理拡張（1.5日）

| # | 作業 | ファイル | 日数 |
|---|------|---------|------|
| 1 | checkout() に experiment_plan 取得処理追加 | `src/services/projectService.ts` | 0.5 |
| 2 | MAIML 書き込みロジック実装 | `src/services/projectService.ts` | 0.7 |
| 3 | 書き込み失敗時のエラーハンドリング | `src/services/projectService.ts` | 0.3 |

**完了基準**:
- チェックアウト後に MAIML 内に `mgr-instruction:` プロパティが追加されていること
- experiment_plan が未登録でもチェックアウトが正常完了すること

---

## Phase 5: フロントエンドAPI接続（4日）

| # | 作業 | ファイル | 日数 |
|---|------|---------|------|
| 1 | experimentPlanApiService 実API化 | `services/experimentPlanApiService.ts` | 0.3 |
| 2 | ExperimentPlanDialog データ復元処理 | `ExperimentPlanDialog.tsx` | 0.8 |
| 3 | ExperimentPlanDialog 継承ロジック | `ExperimentPlanDialog.tsx` | 0.7 |
| 4 | ExperimentPlanDialog 保存処理 | `ExperimentPlanDialog.tsx` | 0.4 |
| 5 | experimentInstructionApiService 実API化 | `services/experimentInstructionApiService.ts` | 0.3 |
| 6 | ExperimentInstructionTab API接続 | `ExperimentInstructionTab.tsx` | 0.5 |
| 7 | WorkRecordPanel DataRecordDialog 統合 | `WorkRecordPanel.tsx` | 0.5 |
| 8 | WorkRecordPanel API接続 | `WorkRecordPanel.tsx` | 0.3 |
| 9 | ProgressOverviewTab API接続 | `ProgressOverviewTab.tsx` | 0.2 |

**完了基準**: 全コンポーネントでモックデータを使わずに実APIが動作すること

---

## Phase 6: テスト・調整（3日）

| # | テスト内容 | 日数 |
|---|-----------|------|
| 1 | E2E: 実験計画登録 → チェックアウト → MAIML確認 | 0.5 |
| 2 | E2E: 実験実施 → 実績値記録 → レビュー → 承認/NG | 0.5 |
| 3 | 想定値 vs 実績値 対比表示テスト | 0.3 |
| 4 | トランジションスキップ機能・依存関係テスト | 0.3 |
| 5 | 全体継承ロジックテスト（全体タブ→タスクN） | 0.3 |
| 6 | プロジェクト削除時のデータ連動削除テスト | 0.2 |
| 7 | 回帰テスト（既存チェックアウト・プロジェクト指示機能） | 0.4 |
| 8 | バグ修正・UI微調整 | 0.5 |

**完了基準**: 全テストシナリオが合格すること

---

## 並行作業可能なタスク

```
Phase 2 ──────────────┐
Phase 3 ──────────────┤→ Phase 5 → Phase 6
Phase 4 ──────────────┘
```

Phase 2, 3, 4 は独立して並行実施可能。

---

## 合計推定工数

| フェーズ | 推定日数 |
|--------|---------|
| Phase 1 | 0.5日 |
| Phase 2 | 3.0日 |
| Phase 3 | 2.0日 |
| Phase 4 | 1.5日 |
| Phase 5 | 4.0日 |
| Phase 6 | 3.0日 |
| **合計** | **14日** |

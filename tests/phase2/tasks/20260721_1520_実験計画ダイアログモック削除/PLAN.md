# タスク計画書: 実験計画詳細指示ダイアログのモック削除・実API接続

## メタデータ
- **作成日時**: 2026-07-21 15:20
- **タスクID**: remove-experiment-plan-dialog-mock
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`experimentPlanApiService.ts` に残存するモックデータ・モック関数を削除し、
`getPlanDialogData()` をバックエンドAPIのみに接続する。

バックエンドの `GET /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data` は
既に完全実装済みのため、フロントエンドのモックフォールバックを除去するのみ。

## 変更ファイル

1. `frontend/src/services/experimentPlanApiService.ts`
   - `MOCK_PLAN_DIALOG_DATA` 定数を削除
   - `getPlanDialogData()` のcatch節をモックフォールバックから `throw` に変更
   - 未使用のモック関数4つを削除:
     - `saveExperimentPlan()` (@deprecated)
     - `getCreatorRefs()` (モック)
     - `getInstrumentRefs()` (モック)
     - `getOwnerRefs()` (モック)

## 承認記録
- **承認日時**: 2026-07-21 15:20

# タスク計画書: antd Warning修正 & getSubEvaluationsByProject 404修正

## メタデータ
- **作成日時**: 2026-08-28 11:00
- **タスクID**: 20260828_1100
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

以下の3つの問題を修正する：

1. **全体評価タブ**: `Warning: [antd: Statistic] valueStyle is deprecated. Please use styles.content instead.`
   - 発生箇所: `OverallEvaluationTab.tsx` line 153
   - 修正: `valueStyle={{ ... }}` → `styles={{ content: { ... } }}`

2. **評価登録タブ**: `Warning: [antd: Spin] tip only work in nest or fullscreen pattern.`
   - 発生箇所: `EvaluationRegistrationTab.tsx` line 540 と `EvaluationDialog.tsx` line 515
   - 修正: `<Spin tip={...} />` → `<Spin><span>{tip}</span></Spin>` または子要素でラップ

3. **getSubEvaluationsByProject 404**:
   - `projectOverallEvaluationApiService.ts` の `GET /api/v1/project-overall-evaluations/:projectId/sub-evaluations` が404
   - バックエンドルートは正しく定義されているが、`/:projectId` が `/:projectId/sub-evaluations` より前に定義されているためマッチ順序の問題の可能性
   - → 実際はExpressはより具体的なパターンを優先するが、`/summary`や`/sub-evaluations`が後に来てもルートパラメータより先にマッチされる
   - **実際の問題**: `/:projectId` の後に `/:projectId/sub-evaluations` が来ているが、Expressでは具体パスが優先されるため問題なし
   - **真の原因調査が必要**: テナント分離ミドルウェア（`tenantIsolation`）がリクエストを弾いている可能性、またはルートの登録順の問題

## 調査結果

- `projectOverallEvaluationRoutes.ts`のルート定義順:
  1. `GET /:projectId` (line 24)
  2. `GET /:projectId/summary` (line 39)
  3. `POST /` (line 54)
  4. `POST /:projectId/export-to-maiml` (line 72)
  5. `GET /:projectId/sub-evaluations` (line 87)  ← ここが問題かも
  6. `POST /:projectId/sub-evaluations` (line 102)

→ Expressでは `GET /:projectId` に `sub-evaluations` が来た場合、`:projectId` に `sub-evaluations` がマッチして `getByProject` ハンドラが呼ばれる可能性がある（パスが完全一致しないためNext.jsのrewriteが問題かも）

→ **正しくはExpressは完全パスマッチ**: `GET /:projectId` は `/abc123` にマッチし `/abc123/sub-evaluations` にはマッチしない。したがってルート順序は問題なし。

→ **別の原因**: `server.ts` に `projectOverallEvaluationRoutes` が正しく登録されていることは確認済み（line 172）

→ **SQLファイルの問題の可能性**: `findSubEvaluationsByProject.sql` は `backend/src/sql/queries/project_overall_evaluations/` に存在する（確認済み）

→ **DBテーブルが存在しない可能性**: `project_overall_evaluations` テーブル自体が存在しない、または `evaluation_scope` カラムが未作成

## 実装ステップ

- [x] 問題の調査・確認
- [x] `OverallEvaluationTab.tsx`: `valueStyle` → `styles.content` 修正
- [x] `ProgressOverviewTab.tsx`: `valueStyle` → `styles.content` 修正（×5箇所）
- [x] `EvaluationRegistrationTab.tsx`: `<Spin tip={...} />` をネストパターンに修正
- [x] `EvaluationDialog.tsx`: `<Spin tip={...} />` をネストパターンに修正
- [x] `projectOverallEvaluationRoutes.ts`: ルート登録順を具体パス優先に変更（Express 5 対応）

## 変更ファイル
1. `frontend/src/components/project/OverallEvaluationTab.tsx` - valueStyle修正
2. `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` - valueStyle修正
3. `frontend/src/components/project/EvaluationRegistrationTab.tsx` - Spin tip修正
4. `frontend/src/components/project/EvaluationDialog.tsx` - Spin tip修正
5. バックエンド（404の原因によって対応）

## 承認記録
- **計画書提示日時**: 2026-08-28 11:00

# タスク計画書: 不確かさ基準画面 scaleFactor追加と基本情報UI修正

## メタデータ
- **作成日時**: 2026-07-29 16:35
- **タスクID**: uncertainty-scalefactor-ui-fix
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要
不確かさ基準管理画面に以下の2件の修正を実施する。
① 定量評価にscaleFactorフィールドを追加（DB: scale_factorカラムから取得/保存）
② 新規作成・編集ダイアログの基本情報を並び替え、Key選択時にnamespace_termのdisplay_name/descriptionを表示専用で表示する

## 変更ファイル
1. `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` - scale_factor・namespace_term JOINカラム追加
2. `backend/src/sql/queries/uncertainty_criteria/findByKey.sql` - scale_factorカラム追加
3. `backend/src/sql/queries/uncertainty_criteria/insertNewVersion.sql` - scale_factorパラメータ追加
4. `backend/src/repositories/uncertaintyCriteriaRepository.ts` - 型・関数修正
5. `backend/src/controllers/uncertaintyCriteriaController.ts` - scaleFactor受け取り追加
6. `frontend/src/services/uncertaintyCriteriaApiService.ts` - 型・関数修正
7. `frontend/src/components/uncertainty/UncertaintyListTable.tsx` - UncertaintyTemplate型修正
8. `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` - UI修正
9. `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` - UI修正
10. `frontend/src/locales/ja.json` - キー追加
11. `frontend/src/locales/en.json` - キー追加

# タスク計画書: 不確かさ基準編集保存DB実装

## メタデータ
- **作成日時**: 2026-07-09 14:56
- **タスクID**: 不確かさ基準編集保存DB実装
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

不確かさ基準管理画面の編集ダイアログにて、「差分プレビュー内の保存」「編集ダイアログ内の保存」を押下した際に、最新バージョン+1として DBに新規レコードをINSERTする実装を行う。

現状は `handleSave` がデモスタブ（`message.success('...（デモ）')`）のみで、APIコールが行われていない。

## 目的と期待される成果

- [ ] 保存ボタン押下時に `POST /api/v1/uncertainty-criteria` が呼ばれる
- [ ] バックエンドが `version + 1` で `uncertainty_criteria` に新規INSERTする
- [ ] 定性評価の場合は `intuition_selector` にも新規INSERTする
- [ ] 保存成功後、一覧画面が最新データに更新される

## 実装ステップ

### Phase 1: バックエンド
- [ ] `insertNewVersion.sql` 作成
- [ ] `insertIntuitionSelector.sql` 作成
- [ ] リポジトリに `insertNewVersion` 関数追加
- [ ] コントローラーに `createNewVersion` 関数追加
- [ ] ルートに `POST /` エンドポイント追加

### Phase 2: フロントエンド
- [ ] APIサービスに `saveUncertaintyCriteriaNewVersion` 関数追加
- [ ] `UncertaintyDetailModal` の `handleSave` を実API呼び出しに置換
- [ ] `UncertaintyDetailModal` に `onSaved` Props 追加
- [ ] `UncertaintyManagement` に `onSaved` コールバック追加（一覧再取得）

## 変更ファイル

1. `backend/src/sql/queries/uncertainty_criteria/insertNewVersion.sql` - 新規作成
2. `backend/src/sql/queries/uncertainty_criteria/insertIntuitionSelector.sql` - 新規作成
3. `backend/src/repositories/uncertaintyCriteriaRepository.ts` - insertNewVersion 関数追加
4. `backend/src/controllers/uncertaintyCriteriaController.ts` - createNewVersion 関数追加
5. `backend/src/routes/uncertaintyCriteriaRoutes.ts` - POST / ルート追加
6. `frontend/src/services/uncertaintyCriteriaApiService.ts` - 保存関数追加
7. `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` - handleSave 実装置換
8. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - onSaved コールバック追加

## 承認記録
- **承認日時**: 2026-07-09 14:56

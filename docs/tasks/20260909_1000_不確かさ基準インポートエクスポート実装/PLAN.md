# タスク計画書: 不確かさ基準一覧 インポート/エクスポート実装

## メタデータ
- **作成日時**: 2026-09-09 15:54
- **タスクID**: 20260909_1000
- **優先度**: 高
- **推定工数**: 4時間

## タスク概要

「不確かさ基準一覧」画面でインポート/エクスポートボタンを押すと「デモを開始」とメッセージが表示されて実際の処理が行われない問題を修正する。

### 根本原因
- `UncertaintyExportModal.tsx` の `handleExport` がダミーの `message.success(t('uncertaintyExport.startDemo'))` のみ実行
- `UncertaintyImportModal.tsx` の `handleImport` が同様にダミー実装
- バックエンドにエクスポート/インポートAPIが存在しない

## 目的と期待される成果
- [ ] エクスポートボタン → 選択テンプレートを XML / JSON でダウンロード
- [ ] インポートボタン → CSV/JSON ファイルを選択してDBにインポート

## 実装ステップ
- [ ] SQLファイル作成: findByUncertaintyKeys.sql
- [ ] Repository追加: findByUncertaintyKeysWithDetails / bulkInsertCriteria
- [ ] Service追加: exportCriteria / importCriteria
- [ ] Controller追加: exportCriteria / importCriteria
- [ ] Routes追加: GET /export, POST /import (multer)
- [ ] APIサービス追加: exportUncertaintyCriteria / importUncertaintyCriteria
- [ ] UncertaintyExportModal.tsx 実装置き換え
- [ ] UncertaintyImportModal.tsx 実装置き換え
- [ ] UncertaintyManagement.tsx props修正
- [ ] ja.json / en.json startDemo→successKey置き換え
- [ ] テストファイル作成

## 変更ファイル
1. `backend/src/sql/queries/uncertainty_criteria/findByUncertaintyKeys.sql` - 新規
2. `backend/src/repositories/uncertaintyCriteriaRepository.ts` - 追記
3. `backend/src/services/uncertaintyCriteriaService.ts` - 追記
4. `backend/src/controllers/uncertaintyCriteriaController.ts` - 追記
5. `backend/src/routes/uncertaintyCriteriaRoutes.ts` - 追記
6. `frontend/src/services/uncertaintyCriteriaApiService.ts` - 追記
7. `frontend/src/components/uncertainty/UncertaintyExportModal.tsx` - 修正
8. `frontend/src/components/uncertainty/UncertaintyImportModal.tsx` - 修正
9. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - 修正
10. `frontend/src/locales/ja.json` - 修正
11. `frontend/src/locales/en.json` - 修正
12. `backend/tests/phase2/routes/uncertaintyCriteriaRoutes.phase2.test.ts` - 追記

## 承認記録
- **承認日時**: 2026-09-09 15:54
- **承認者コメント**: ユーザー承認済み（act mode切替）

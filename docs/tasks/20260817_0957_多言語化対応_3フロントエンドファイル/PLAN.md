# タスク計画書: 多言語化対応（3フロントエンドファイル＋バックエンド）

## メタデータ
- **作成日時**: 2026-08-17 09:57
- **タスクID**: i18n-3frontend-files
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要
以下6ファイルの日本語ハードコーディング箇所を多言語化（t()関数使用）する。

## 対象ファイルと主な対応箇所

### フロントエンド（翻訳キー追加 + t()置換）
1. `UncertaintyCriteriaSelectorPanel.tsx` - Modal title/okText/cancelText等
2. `ExperimentPlanDialog.tsx` - title, label, tab, message等
3. `DataRecordDialog.tsx` - title, label, placeholder, message等

### バックエンド（日本語メッセージ確認のみ・変更なし）
4. `projectService.ts` - エラーメッセージは英語化対象外（内部ログ）
5. `projectRoutes.ts` - バリデーションメッセージ（内部）
6. `projectController.ts` - エラーレスポンスメッセージ（内部）

## 実装ステップ
- [ ] ja.json / en.json に不足キーを追加
- [ ] UncertaintyCriteriaSelectorPanel.tsx 修正
- [ ] ExperimentPlanDialog.tsx 修正
- [ ] DataRecordDialog.tsx 修正

## 変更ファイル
1. `frontend/src/locales/ja.json` - 翻訳キー追加
2. `frontend/src/locales/en.json` - 翻訳キー追加
3. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx`
4. `frontend/src/components/project/ExperimentPlanDialog.tsx`
5. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

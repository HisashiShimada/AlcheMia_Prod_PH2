# タスク計画書: 多言語化対応 3ファイル修正

## メタデータ
- **作成日時**: 2026-08-17 12:10
- **タスクID**: 20260817_0957
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要
以下3ファイルの日本語ハードコーディング箇所を t() による多言語対応に置き換える。

## 変更ファイル
1. `frontend/src/locales/ja.json` - 不足キーを追加
2. `frontend/src/locales/en.json` - 不足キーを追加
3. `frontend/src/components/project/ExperimentPlanDialog.tsx` - 行784/789/993
4. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - 多数行
5. `backend/src/routes/projectRoutes.ts` - 行775（英語メッセージ→日本語統一）

## 実装ステップ
- [x] 既存キーを調査
- [ ] ja.json / en.json に不足キーを追加
- [ ] ExperimentPlanDialog.tsx を修正
- [ ] DataRecordDialog.tsx を修正
- [ ] projectRoutes.ts を修正

## 承認記録
- **承認日時**: 2026-08-17 12:10（即時実施）

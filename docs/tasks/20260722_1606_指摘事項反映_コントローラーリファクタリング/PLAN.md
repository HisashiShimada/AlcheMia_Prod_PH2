# タスク計画書: 指摘事項反映 コントローラーリファクタリング

## メタデータ
- **作成日時**: 2026-07-22 16:06
- **タスクID**: 20260722_1606_指摘事項反映
- **優先度**: 高
- **推定工数**: 1.5時間

## タスク概要

experimentEvaluationController.ts と uncertaintyCriteriaController.ts に対するコードレビュー指摘事項を修正する。

## 目的と期待される成果
- [ ] バリデーションをミドルウェア（express-validator）に移行
- [ ] コントローラーのロジックをサービス層に移動
- [ ] MAIMLファイルの特定方式をproject_uuid経由に変更
- [ ] 引数のインラインオブジェクトを型定義変数化

## 実装ステップ

### Phase 1: uncertaintyCriteriaRepository.ts 型定義確認・export
- [ ] InsertNewVersionInput 型が export されているか確認・修正

### Phase 2: experimentEvaluationService.ts 新規作成
- [ ] saveEvaluations ロジック移動
- [ ] exportToMaiml ロジック移動（project_uuid経由のMAIML特定に変更）
- [ ] escapeXml ヘルパー移動

### Phase 3: experimentEvaluationController.ts 修正
- [ ] バリデーション削除
- [ ] サービス呼び出しに置換

### Phase 4: experimentEvaluationRoutes.ts 修正
- [ ] express-validator + handleValidationErrors 追加

### Phase 5: uncertaintyCriteriaRoutes.ts 修正
- [ ] express-validator + handleValidationErrors 追加

### Phase 6: uncertaintyCriteriaController.ts 修正
- [ ] バリデーション削除
- [ ] InsertNewVersionInput 型変数化

## 変更ファイル
1. `backend/src/repositories/uncertaintyCriteriaRepository.ts` - InsertNewVersionInput 型export確認
2. `backend/src/services/experimentEvaluationService.ts` - 新規作成
3. `backend/src/controllers/experimentEvaluationController.ts` - バリデーション削除・サービス呼び出し化
4. `backend/src/routes/experimentEvaluationRoutes.ts` - バリデーション追加
5. `backend/src/routes/uncertaintyCriteriaRoutes.ts` - バリデーション追加
6. `backend/src/controllers/uncertaintyCriteriaController.ts` - バリデーション削除・型定義変数化

# タスク計画書: 不確かさ基準管理画面の不確かさ基準名をDBから取得

## メタデータ
- **作成日時**: 2026-07-08 16:44
- **タスクID**: 不確かさ基準名DBカラム取得
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
不確かさ基準管理画面の「不確かさ基準名」列が現在空白になっている。
`uncertainty_criteria` テーブルの `uncertainty_name` カラムから値を取得し、画面に表示するよう修正する。

## 目的と期待される成果
- [ ] 不確かさ基準管理画面の「不確かさ基準名」列に `uncertainty_name` の値が表示される
- [ ] 不確かさ選択モーダルの名前表示にも `uncertainty_name` が使用される

## 実装ステップ
- [ ] findAllByOrganization.sql に `uncertainty_name` を追加
- [ ] findByKey.sql に `uncertainty_name` を追加
- [ ] findForSelector.sql に `uncertainty_name` を追加
- [ ] uncertaintyCriteriaRepository.ts の型定義・組み立て処理に `uncertaintyName` を追加
- [ ] uncertaintyCriteriaApiService.ts の型定義・変換処理を修正

## 変更ファイル
1. `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` - uncertainty_name をSELECTに追加
2. `backend/src/sql/queries/uncertainty_criteria/findByKey.sql` - uncertainty_name をSELECTに追加
3. `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` - uncertainty_name をSELECTに追加
4. `backend/src/repositories/uncertaintyCriteriaRepository.ts` - 型定義・組み立てに uncertaintyName 追加
5. `frontend/src/services/uncertaintyCriteriaApiService.ts` - 型定義・変換処理を修正

## 承認記録
- **承認日時**: 2026-07-08 16:44

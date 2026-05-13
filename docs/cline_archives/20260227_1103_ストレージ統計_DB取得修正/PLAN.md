# タスク計画書: ストレージ統計のDB取得修正

## メタデータ
- **作成日時**: 2026-02-27 11:03
- **タスクID**: storage-stats-db-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

システム概要画面のストレージ統計（総ファイル数・使用容量）の取得元を、Swift/S3 API から `file_metadata` テーブル（DB）に切り替える。

## 目的と期待される成果
- [x] ログインユーザーの `organization_id` に紐づく `file_metadata` テーブルを正確に参照する
- [x] 1000件制限を撤廃し、全ファイルを正確に集計する
- [x] S3/Swift API へのネットワーク依存を排除し、安定性を向上する

## 実装ステップ
- [ ] getStorageStats.sql の新規作成
- [ ] systemOverviewRepository.ts に getStorageStats() を追加
- [ ] systemOverviewService.ts の getStorageStats() を DB 使用に修正
- [ ] docs/design/api/api_system_overview.md のデータ取得元記載を更新

## 変更ファイル
1. `backend/src/sql/queries/system_overview/getStorageStats.sql` - 新規作成
2. `backend/src/repositories/systemOverviewRepository.ts` - getStorageStats() メソッド追加
3. `backend/src/services/systemOverviewService.ts` - getStorageStats() をDB使用に変更
4. `docs/design/api/api_system_overview.md` - データ取得元の記載更新

## 承認記録
- **承認日時**: 2026-02-27 11:03

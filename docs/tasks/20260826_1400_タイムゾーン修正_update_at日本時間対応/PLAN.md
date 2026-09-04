# タスク計画書: update_at / create_at 日本時間対応（c:\Git\mmdpf への適用）

## メタデータ
- **作成日時**: 2026-08-26 14:00
- **タスクID**: 20260826_1400_タイムゾーン修正_update_at日本時間対応
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

前回 `c:\Git\test` に誤って適用した修正を、実際に動いている `c:\Git\mmdpf` に正しく適用する。
前回の修正内容・アルゴリズムは正しいことが確認済み。

## 実装ステップ
- [x] 1. `backend/src/utils/dateUtils.ts` 新規作成
- [x] 2. `backend/src/services/corporationService.ts` 修正
- [x] 3. `backend/src/services/organizationService.ts` 修正
- [x] 4. `backend/src/services/masterService.ts` 修正
- [x] 5. `backend/src/repositories/roleRepository.ts` 修正
- [x] 6. `backend/src/controllers/masterController.ts` 修正
- [x] 7. `backend/src/controllers/roleController.ts` 修正
- [x] 8. コンパイル確認（変更ファイルにエラーなし）

## 承認記録
- **承認日時**: 2026-08-26 14:00
- **承認者コメント**: 実装をお願いいたします。

# タスク計画書: 組織作成時のcode_master初期データからinstruction_targetレコードを削除

## メタデータ
- **作成日時**: 2026-05-27 14:08
- **タスクID**: remove_instruction_target_from_code_master
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

組織作成時に実行される `code_master` 初期データ登録SQLから、`instruction_target`（指示対象）の3レコードを削除する。

## 目的と期待される成果

- [ ] 組織作成時に `instruction_target` の code_master レコードが追加されなくなる

## 実装ステップ

- [ ] `backend/src/sql/queries/codeMaster/insertInitialData.sql` から `instruction_target` の3行を削除する

## 変更ファイル

1. `backend/src/sql/queries/codeMaster/insertInitialData.sql` - instruction_target 3行を削除

## 影響範囲

- 既存組織のデータには影響なし（このSQLは新規組織作成時のみ実行）
- `eventLogRepository.ts` が `instruction_target` を code_master から取得しているが、既存データが存在する組織では影響なし

## 承認記録
- **計画書提示日時**: 2026-05-27 14:08
- **承認日時**: 2026-05-27 14:08

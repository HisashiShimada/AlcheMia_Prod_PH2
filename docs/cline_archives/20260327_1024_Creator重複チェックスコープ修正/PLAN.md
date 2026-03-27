# タスク計画書: Creator重複チェックスコープ修正

## メタデータ
- **作成日時**: 2026-03-27 10:24
- **タスクID**: creator-existsbyid-scope-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`creatorRepository.ts` の `existsById()` メソッドが `organization_id` のみでフィルタリングしているため、
法人（corporation）配下の複数組織がある場合に重複チェックのスコープが他のメソッドと不整合になっている。
`corporationId` パラメータを追加し、法人スコープでの重複チェックに統一する。

## 目的と期待される成果
- [x] `existsById` のスコープを `findById` と統一する
- [x] ダイアログ登録・CSVアップロード両方の重複チェックを修正する

## 実装ステップ
- [ ] `creatorRepository.ts` の `existsById` に `corporationId` パラメータを追加
- [ ] `masterService.ts` の `createCreatorMaster` で `corporationId` を渡すよう修正
- [ ] `masterService.ts` の `uploadCreatorsCsv` で `corporationId` を渡すよう修正

## 変更ファイル
1. `backend/src/repositories/creatorRepository.ts` - `existsById` に `corporationId` 追加
2. `backend/src/services/masterService.ts` - `existsById` 呼び出し箇所を修正

## 承認記録
- **承認日時**: 2026-03-27 10:24

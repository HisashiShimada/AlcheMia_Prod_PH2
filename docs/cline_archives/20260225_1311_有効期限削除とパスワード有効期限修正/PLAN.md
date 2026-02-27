# タスク計画書: 有効期限削除とパスワード有効期限修正

## メタデータ
- **作成日時**: 2026-02-25 13:11
- **タスクID**: 有効期限削除とパスワード有効期限修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要
組織管理画面の組織追加・CSVアップロードと、ユーザー管理画面のユーザー追加・CSVアップロード処理について、以下2点を修正する。

1. organization_user テーブルの有効期限（locked_until）をDBに登録する処理を削除
2. user_authentication テーブルの password_expires_at に、保存/CSVアップロード時のタイムスタンプ（現在日時）を設定する

## 変更ファイル
1. `backend/src/repositories/organizationManagementRepository.ts` - createOrganizationUser() から locked_until 削除
2. `backend/src/services/organizationService.ts` - createOrganization() から lockedUntil 計算・渡し削除、password_expires_at を現在タイムスタンプに変更
3. `backend/src/repositories/userRepository.ts` - create() から lockedUntil 計算・INSERT削除、password_expires_at を現在タイムスタンプに変更

## 実装ステップ
- [x] タスク計画書を作成
- [ ] organizationManagementRepository.ts の createOrganizationUser() から locked_until を削除
- [ ] organizationService.ts の createOrganization() から lockedUntil 計算・渡しを削除、password_expires_at を現在タイムスタンプに変更
- [ ] userRepository.ts の create() から lockedUntil 計算・INSERT削除、password_expires_at を現在タイムスタンプに変更

## 承認記録
- **承認日時**: 2026-02-25 13:11

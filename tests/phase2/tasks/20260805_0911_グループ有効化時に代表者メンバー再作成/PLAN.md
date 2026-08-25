# タスク計画書: グループ有効化時に代表者メンバー再作成

## メタデータ
- **作成日時**: 2026-08-05 09:11
- **タスクID**: group-reactivate-chief-member
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

チーム管理で非アクティブ化を実施した際に `organization_group_user` を連動して物理削除する仕様が実装済みだが、非アクティブ → アクティブに戻した際に代表者（`chief_user_id`）のレコードを `organization_group_user` に再作成するようにする。

## 目的と期待される成果
- [ ] 非アクティブ化時に削除されたメンバー情報のうち、代表者分は有効化時に自動復元される
- [ ] 有効化後すぐにグループが正常に機能する（代表者がメンバーとして存在する）

## 実装ステップ

### Phase 1: Repository層への insertMember 追加
- [ ] `organizationGroupRepository.ts` に `PoolClient` を受け取れる `insertMember` 関数を追加
  - 既存の `organization_groups/insertMember.sql`（`ON CONFLICT DO NOTHING`）を再利用
  - `setMembers` と同パターンで `client` 引数対応

### Phase 2: Service層の修正
- [ ] `organizationGroupService.ts` の `updateOrganizationGroupActiveStatus` を修正
  - 存在確認を `existsById` → `findById` に変更（`chief_user_id` を取得するため）
  - `isActive = true`（有効化）分岐をトランザクション化
  - トランザクション内で代表者を `organization_group_user` に INSERT してから `is_active` を更新
  - `isActive = false`（非アクティブ化）の既存ロジックは変更なし
  - JSDoc コメントの `@remarks` を更新

## 変更ファイル
1. `backend/src/repositories/organizationGroupRepository.ts` - `insertMember` 関数追加
2. `backend/src/services/organizationGroupService.ts` - `updateOrganizationGroupActiveStatus` 修正

## テスト計画
- [ ] アクティブ化時に `organization_group_user` に代表者レコードが追加されること
- [ ] 代表者が既にメンバーとして存在している場合でも重複エラーにならないこと（ON CONFLICT DO NOTHING）
- [ ] 非アクティブ化時の既存動作が変わらないこと

## 承認記録
- **計画書提示日時**: 2026-08-05 09:11

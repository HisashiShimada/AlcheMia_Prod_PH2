# タスク計画書: グループメンバー用ユーザー一覧API実装

## メタデータ
- **作成日時**: 2026-07-31 15:19
- **タスクID**: org-group-users-api
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`TeamAddDialog` / `TeamEditDialog` のメンバー追加プルダウンに何も表示されない問題を修正する。

フロントエンドは `GET /api/v1/organization-groups/users` を呼び出してユーザー一覧を取得しようとしているが、バックエンドにこのエンドポイントが存在しないため 404 となり、エラーが握り潰されて空配列が返されていた。

## 目的と期待される成果

- [x] 原因特定（GET /organization-groups/users が未実装）
- [ ] バックエンドに `GET /api/v1/organization-groups/users` を実装
- [ ] TeamAddDialog / TeamEditDialog のメンバー追加プルダウンにユーザー一覧が表示されるようになる

## 実装ステップ

### Phase 1: SQLファイル追加
- [ ] `backend/src/sql/queries/organization_groups/findAllOrgUsers.sql` を新規作成
  - `organization_user` テーブルから `is_active = TRUE` のユーザーを取得
  - 返却カラム: `user_id`, `user_name`, `mail_address AS email`

### Phase 2: Repository層
- [ ] `backend/src/repositories/organizationGroupRepository.ts` に `findAllOrgUsers()` を追加

### Phase 3: Service層
- [ ] `backend/src/services/organizationGroupService.ts` に `getOrgUsersForGroups()` を追加

### Phase 4: Controller層
- [ ] `backend/src/controllers/organizationGroupController.ts` に `getOrgUsers` を追加

### Phase 5: ルート追加
- [ ] `backend/src/routes/organizationGroupRoutes.ts` に `GET /users` を追加
  - **必ず `/:groupCd` より前に定義する**（ルーティング競合回避）

## 変更ファイル

### 新規作成
1. `backend/src/sql/queries/organization_groups/findAllOrgUsers.sql` - ユーザー一覧取得SQL

### 修正
1. `backend/src/repositories/organizationGroupRepository.ts` - `findAllOrgUsers()` 追加
2. `backend/src/services/organizationGroupService.ts` - `getOrgUsersForGroups()` 追加
3. `backend/src/controllers/organizationGroupController.ts` - `getOrgUsers` コントローラー追加
4. `backend/src/routes/organizationGroupRoutes.ts` - `GET /users` ルート追加

### 変更なし
- `frontend/` 配下は一切変更不要（フロントエンドは既に正しく実装済み）

## 技術的詳細

### APIレスポンス形式（フロントエンドが期待する形式）

```json
{
  "success": true,
  "data": [
    { "user_id": "user001", "user_name": "山田 太郎", "email": "yamada@example.com" },
    { "user_id": "user002", "user_name": "鈴木 花子", "email": "suzuki@example.com" }
  ]
}
```

### ルーティング競合について

Express はルートを定義順に評価するため、`GET /users` を `GET /:groupCd` より**後**に定義すると `users` が `groupCd` パラメーターとして解釈されてしまう。必ず先に定義する。

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ルーティング競合 | 高 | 中 | `/users` を `/:groupCd` より前に定義する |
| organization_user に email カラムが存在しない | 高 | 低 | DDL確認済み（`mail_address` カラムをエイリアスで `email` として返す） |

## 承認記録
- **計画書提示日時**: 2026-07-31 15:19
- **承認日時**: 
- **承認者コメント**: 

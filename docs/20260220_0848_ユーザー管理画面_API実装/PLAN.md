# タスク計画書: ユーザー管理画面 API実装

## メタデータ
- **作成日時**: 2026-02-20 08:48
- **タスクID**: user_management_api
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

ユーザー管理画面について、現在モックデータ（`users-management.json`）から一覧を取得している実装を、APIを使用してDBから取得する方式に変更します。

## 2. 目的と期待される成果

### 目的
- モックデータから実データベースへの移行
- ClineRulesとAPIポリシーに準拠した実装
- 既存の部署管理・ロール管理と同じパターンでの実装

### 期待される成果
- [ ] ユーザー管理API（7エンドポイント）の実装
- [ ] フロントエンドのAPI連携
- [ ] マルチテナント分離の維持
- [ ] CSV アップロード/ダウンロード機能

## 3. 実装ステップ

### Phase 1: API設計書作成
- [ ] API設計書作成（`docs/design/api/api_user_management.md`）
- [ ] 7エンドポイントの仕様定義

### Phase 2: バックエンド実装
- [ ] SQLファイル作成（`backend/src/sql/queries/users/findAll.sql`）
- [ ] Repository層実装（`backend/src/repositories/userRepository.ts`）
- [ ] Service層実装（`backend/src/services/userService.ts`）
- [ ] Controller層実装（`backend/src/controllers/userController.ts`）
- [ ] Routes層実装（`backend/src/routes/userRoutes.ts`）
- [ ] server.tsへのルート登録
- [ ] api_list.mdへのAPI登録

### Phase 3: フロントエンド実装
- [ ] API Service作成（`frontend/src/services/userApiService.ts`）
- [ ] UserManagement.tsxのAPI連携修正

### Phase 4: 動作確認
- [ ] APIの動作確認
- [ ] マルチテナント分離の確認
- [ ] CSV機能の確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/SystemManagement/UserManagement.tsx` - API連携に変更
2. `backend/src/server.ts` - ルート追加

### 新規作成するファイル
1. `docs/design/api/api_user_management.md` - API設計書
2. `backend/src/sql/queries/users/findAll.sql` - SQLファイル
3. `backend/src/repositories/userRepository.ts` - Repository層
4. `backend/src/services/userService.ts` - Service層
5. `backend/src/controllers/userController.ts` - Controller層
6. `backend/src/routes/userRoutes.ts` - Routes層
7. `frontend/src/services/userApiService.ts` - フロントエンドAPI Service

### 影響を受ける機能
- システム管理 > ユーザー管理画面

## 5. 技術的詳細

### 使用する技術・ライブラリ
- pg-promise（バックエンドDB操作）
- Express.js（バックエンドルーティング）
- Ant Design（フロントエンドUI）

### データベーステーブル
- `organization_user`（組織利用者）
- `user_authentication`（利用者認証）
- `department`（部署）
- `role`（ロール）

### セキュリティ考慮事項
- [x] マルチテナント分離（organization_id必須）
- [x] System Admin権限のみアクセス可能
- [x] パスワード情報は返却しない

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存organizationUserRepositoryとの競合 | 中 | 低 | 別名で作成（userRepository.ts） |
| SQLクエリの複雑さ | 低 | 低 | 4テーブルJOINのテスト実施 |

## 7. テスト計画

### ユニットテスト
- [ ] Repository層のメソッドテスト
- [ ] Service層のバリデーションテスト

### 統合テスト
- [ ] API エンドポイントのテスト
- [ ] マルチテナント分離のテスト

### 手動テスト
- [ ] フロントエンド画面での一覧表示確認
- [ ] CSV アップロード/ダウンロード確認

## 8. 承認記録

- **計画書提示日時**: 2026-02-20 08:48
- **承認日時**: 2026-02-20 08:48
- **承認者コメント**: 承認済み

## 9. 実施記録

### 実施日時
開始: 2026-02-20 08:48
完了: （作業中）

### 計画からの変更点
（作業中に追記）

### 発生した問題と解決方法
（作業中に追記）

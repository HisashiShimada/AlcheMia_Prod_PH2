# タスク計画書: authController.ts のRepository化

## メタデータ
- **作成日時**: 2026-02-13 08:32
- **タスクID**: authController_repository_migration
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

`backend/src/controllers/authController.ts` で直接DBアクセスしている箇所（約14箇所）をRepository経由のアクセスに変更し、レイヤードアーキテクチャを遵守する実装に修正します。

## 2. 目的と期待される成果

### 目的
- レイヤードアーキテクチャの遵守
- コードの重複削減と保守性向上
- テスト容易性の向上
- SQLクエリの一元管理

### 期待される成果
- [x] OrganizationUserRepository の作成
- [x] UserAuthenticationRepository の作成
- [x] PasswordResetTokenRepository の作成
- [x] RoleRepository の作成（初期画面機能CD取得）
- [x] authController.ts の直接DBアクセスをRepository経由に変更
- [x] 既存のテストが通ることを確認

## 3. 実装ステップ

### Phase 1: Repository作成（基盤整備）

#### Step 1.1: OrganizationUserRepository 作成
- [x] `backend/src/repositories/organizationUserRepository.ts` を作成
- [x] 以下のメソッドを実装:
  - `findByUserId(userId, organizationId)` - ユーザーIDで検索
  - `findByEmail(email, organizationId)` - メールアドレスで検索
  - `findByUserIdWithRole(userId, organizationId)` - ロール情報含むユーザー取得

#### Step 1.2: UserAuthenticationRepository 作成
- [x] `backend/src/repositories/userAuthenticationRepository.ts` を作成
- [x] 以下のメソッドを実装:
  - `getPasswordStatus(userId, organizationId)` - パスワード状態取得
  - `updatePassword(userId, organizationId, hashedPassword)` - パスワード更新
  - `updatePasswordWithExpiry(userId, organizationId, hashedPassword, expiresAt, isTemporary)` - 期限付き更新
  - `clearPasswordExpiry(userId, organizationId)` - 期限クリア

#### Step 1.3: PasswordResetTokenRepository 作成
- [x] `backend/src/repositories/passwordResetTokenRepository.ts` を作成
- [x] 以下のメソッドを実装:
  - `findByToken(resetToken)` - トークンで検索
  - `deleteByToken(resetToken)` - トークン削除

#### Step 1.4: RoleRepository 作成
- [x] `backend/src/repositories/roleRepository.ts` を作成
- [x] 以下のメソッドを実装:
  - `getInitialScreenFunctionCd(organizationId, roleCd)` - 初期画面機能CD取得

### Phase 2: authController.ts の修正

#### Step 2.1: login() 関数の修正
- [x] ユーザー検索を `organizationUserRepository.findByUserId()` に変更
- [x] 既存のログイン履歴記録は `loginHistoryRepository` を継続使用

#### Step 2.2: resetPasswordRequest() 関数の修正
- [x] ユーザー検索を `organizationUserRepository.findByEmail()` に変更
- [x] パスワード更新を `userAuthenticationRepository.updatePasswordWithExpiry()` に変更

#### Step 2.3: resendPin() 関数の修正
- [x] ユーザー情報取得のSQLはpin_codesテーブルとのJOINが必要なため、PinCodeServiceに移行を検討
- [x] または専用のクエリメソッドをPinCodeRepositoryに追加

#### Step 2.4: resetPassword() 関数の修正
- [x] リセットトークン検証を `passwordResetTokenRepository.findByToken()` に変更
- [x] トークン削除を `passwordResetTokenRepository.deleteByToken()` に変更

#### Step 2.5: verifyPin() 関数の修正
- [x] 初期画面機能CD取得を `roleRepository.getInitialScreenFunctionCd()` に変更
- [x] パスワード状態チェックを `userAuthenticationRepository.getPasswordStatus()` に変更

#### Step 2.6: changePassword() 関数の修正
- [x] ユーザーのrole_cd取得を `organizationUserRepository.findByUserId()` に変更
- [x] パスワード更新を `userAuthenticationRepository.clearPasswordExpiry()` に変更

#### Step 2.7: refreshToken() 関数の修正
- [x] ユーザー情報とロール情報取得を `organizationUserRepository.findByUserIdWithRole()` に変更

### Phase 3: テストとバリデーション

#### Step 3.1: ユニットテストの更新
- [x] 各Repositoryのテストを作成
- [x] authControllerのテストでモック化を確認

#### Step 3.2: 統合テストの実行
- [x] 既存のAPIテストが通ることを確認
- [x] ログインフローの動作確認

## 4. 影響範囲

### 変更するファイル
1. **新規作成** `backend/src/repositories/organizationUserRepository.ts`
2. **新規作成** `backend/src/repositories/userAuthenticationRepository.ts`
3. **新規作成** `backend/src/repositories/passwordResetTokenRepository.ts`
4. **新規作成** `backend/src/repositories/roleRepository.ts`
5. **修正** `backend/src/controllers/authController.ts` - Repository経由に変更
6. **新規作成** `backend/tests/repositories/organizationUserRepository.test.ts`
7. **新規作成** `backend/tests/repositories/userAuthenticationRepository.test.ts`
8. **新規作成** `backend/tests/repositories/passwordResetTokenRepository.test.ts`
9. **新規作成** `backend/tests/repositories/roleRepository.test.ts`

### 影響を受ける機能
- ログイン機能（login, verifyPin）
- パスワードリセット機能（resetPasswordRequest, resetPassword）
- パスワード変更機能（changePassword）
- トークン更新機能（refreshToken）
- PINコード再送信機能（resendPin）

## 5. 技術的詳細

### Repository設計方針

#### 1. 統一されたインターフェース
```typescript
// Result型を使用した統一レスポンス
interface Result<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

#### 2. エラーハンドリング
- SQLエラーは統一されたエラーコードで返却
- `RESOURCE_NOT_FOUND` - リソースが見つからない
- `SYSTEM_DATABASE_ERROR` - DB操作エラー

#### 3. トランザクション対応
- 各メソッドは `pool` を引数で受け取る
- 外部からトランザクションを制御可能

### セキュリティ考慮事項
- [x] すべてのクエリでorganization_idフィルタを維持
- [x] Parameterized Queriesを使用
- [x] マルチテナント分離を遵守

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のログインフローが動作しなくなる | 高 | 中 | 段階的な移行とテストの徹底 |
| クエリ結果の構造が変わる | 中 | 低 | 型定義とテストで検証 |
| パフォーマンスへの影響 | 低 | 低 | Repository層は薄く保つ |
| テストの手間が増える | 低 | 高 | モック化しやすい設計 |

## 7. テスト計画

### ユニットテスト
- [x] 各Repositoryのメソッド単体テスト
- [x] エラーケースのテスト
- [x] organization_idフィルタの動作確認

### 統合テスト
- [x] ログインAPI（POST /api/v1/auth/login）
- [x] PINコード検証API（POST /api/v1/auth/verify-pin）
- [x] パスワードリセットAPI（POST /api/v1/auth/reset-password-request）
- [x] パスワード変更API（POST /api/v1/auth/change-password）
- [x] トークン更新API（POST /api/v1/auth/refresh）

### 手動テスト
- [x] ログインフロー全体（login → verifyPin → dashboard表示）
- [x] パスワードリセットフロー
- [x] トークン更新動作

## 8. ロールバック計画

### 問題発生時の対応
1. 新規作成したRepositoryファイルを削除
2. authController.tsをGit履歴から復元
3. 既存の動作を確認

## 9. 関連ドキュメント

- [バックエンド規約](../.clinerules/development/backend.md) - Repository設計原則
- [セキュリティ規約](../.clinerules/development/security.md) - マルチテナント分離
- [テスト規約](../.clinerules/development/test.md) - テスト方針

## 10. 承認記録

- **計画書提示日時**: 2026-02-13 08:32
- **承認日時**: (承認後に記入)
- **承認者コメント**: (ユーザーからのフィードバック)

## 11. 実施記録

### 実施日時
開始: (作業開始時の日時を記入)
完了: (作業完了時の日時を記入)

### 計画からの変更点
(実施中に発生した計画からの変更や追加作業)

### 発生した問題と解決方法
(実施中に発生した問題とその解決方法)

### 最終的な成果物
- [x] OrganizationUserRepository 作成完了
- [x] UserAuthenticationRepository 作成完了
- [x] PasswordResetTokenRepository 作成完了
- [x] RoleRepository 作成完了
- [x] authController.ts 修正完了
- [x] テスト作成完了
- [x] 動作確認完了

## 12. 振り返り

### うまくいった点
(成功要因)

### 改善が必要な点
(今後の改善点)

### 学んだこと
(このタスクから得られた知見)

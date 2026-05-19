# パスワード変更後有効期限設定漏れ修正

## 現象

仮パスワードから本パスワードへ変更すると、利用者認証テーブル（`user_authentication`）の `password_expires_at` が NULL で登録される。
その結果、次回ログイン時に有効期限チェックをすり抜けてしまう。

## 要因

| # | 要因 | 箇所 |
|---|---|---|
| 1 | `updatePasswordAfterChange()` のSQLが `password_expires_at = NULL` をセットしていた | `userAuthenticationRepository.ts` |
| 2 | 自動ログイン（リフレッシュトークン）時にパスワード有効期限チェックが未実装だった | `authService.ts` |
| 3 | 有効期限チェックが `expiresAt && now > expiresAt` のため NULL をスキップしていた | `authService.ts` |
| 4 | 自動ログイン時のレスポンスに `passwordChangeRequired` が含まれておらず、`false` 固定になっていた | `authController.ts` / `frontend/src/app/page.tsx` |

## 対策

| # | 対策 | 変更ファイル |
|---|---|---|
| 1 | `password_expires_at = NOW() + PASSWORD_EXPIRY_DAYS日` を設定するよう修正 | `backend/src/repositories/userAuthenticationRepository.ts` |
| 2 | 有効期限日数を環境変数 `PASSWORD_EXPIRY_DAYS`（デフォルト30日）で制御可能にした | `backend/src/repositories/userAuthenticationRepository.ts` |
| 3 | `processRefreshToken()` にパスワード有効期限チェックを追加 | `backend/src/services/authService.ts` |
| 4 | 有効期限チェック条件を `!expiresAt \|\| now > expiresAt` に変更（NULL も変更要求対象） | `backend/src/services/authService.ts` |
| 5 | `refreshToken()` レスポンスに `passwordChangeRequired` を追加 | `backend/src/controllers/authController.ts` |
| 6 | 自動ログイン処理を `refreshToken()`（パスワード有効期限含む）に切り替え | `frontend/src/app/page.tsx` |
| 7 | `ChangePasswordModal` に `reason` プロップ追加（仮パスワード / 有効期限切れで表示メッセージを切り替え）| `frontend/src/components/ChangePasswordModal.tsx`, `frontend/src/locales/ja.json`, `frontend/src/locales/en.json`, `frontend/src/app/page.tsx` |
| 8 | `clearPasswordExpiry` → `updatePasswordAfterChange` にリネーム（処理内容を正確に反映）| `backend/src/repositories/userAuthenticationRepository.ts`, `backend/src/services/authService.ts` |

## 仮パスワード有効期限の廃止（2026-05-20）

仮パスワードに有効期限（`password_expires_at`）を設定する仕様を廃止した。
仮パスワード判断は `is_temporary_flg` のみで行う。

### 変更内容

| # | 変更内容 | 対象ファイル |
|---|---|---|
| 1 | `password_expires_at` カラムを `user_authentication` テーブルから削除するマイグレーションSQLを追加 | `backend/migrations/20260520_drop_password_expires_at.sql` |
| 2 | DDLから `password_expires_at` カラムおよびその COMMENT 行を削除 | `docs/design/db/ddl/user_authentication.sql` |
| 3 | 統合マイグレーションDDLから `password_expires_at` カラムおよびその COMMENT 行を削除 | `docs/design/db/ddl/migrations/create_all_tables.sql` |
| 4 | INSERT SQLから `password_expires_at` カラムと対応する `$5` プレースホルダーを削除（$7→$6に変更） | `backend/src/sql/queries/organizations/createUserAuthentication.sql` |
| 5 | `PasswordStatus` インターフェースから `password_expires_at` を削除。`getPasswordStatus()` のSELECT句から `password_expires_at` を削除。`updateAsTemporary()` から `password_expires_at = NOW() + INTERVAL '24 hours'` を削除。`clearPasswordExpiry()` から `password_expires_at = NULL` を削除 | `backend/src/repositories/userAuthenticationRepository.ts` |
| 6 | `updatePasswordWithExpiry()` メソッドを削除（`password_expires_at` を引数とするメソッドは不要） | `backend/src/repositories/userAuthenticationRepository.ts` |
| 7 | `passwordExpiresAt` 変数の宣言・設定を削除。`user_authentication` INSERT時の引数から `passwordExpiresAt` を削除（`$5`→`$5`、引数6個→6個に整理） | `backend/src/services/organizationService.ts` |
| 8 | `processVerifyPin()` 内の有効期限チェックロジック（`password_expires_at` 参照・`isPasswordExpired` 変数）を削除 | `backend/src/services/authService.ts` |
| 9 | `issueSessionTokens()` 内の有効期限チェックロジック（`password_expires_at` 参照・`isPasswordExpired` 変数）を削除。レスポンスから `isPasswordExpired` を削除 | `backend/src/controllers/authHelpers.ts` |

---

## 変更の取り消し（2026-05-18）

上記の対策（#1〜#8）はいったん実装されたが、2026-05-18 にすべての変更を元の状態に戻した。

| # | 取り消し内容 | 対象ファイル |
|---|---|---|
| 1 | `updatePasswordAfterChange()` を `clearPasswordExpiry` にリネームし、SQLを `password_expires_at = NULL` のみ更新する元の実装に戻した | `backend/src/repositories/userAuthenticationRepository.ts` |
| 2 | `processRefreshToken()` のパスワード有効期限チェックブロックおよび `passwordChangeRequired` 返却を削除した | `backend/src/services/authService.ts` |
| 3 | 有効期限チェック条件を元の `expiresAt && now > expiresAt` に戻した | `backend/src/services/authService.ts` |
| 4 | `refreshToken()` レスポンスから `passwordChangeRequired` を削除した | `backend/src/controllers/authController.ts` |
| 5 | `changePasswordReason` state および `ChangePasswordModal` への `reason` プロップを削除した | `frontend/src/app/page.tsx` |
| 6 | `ChangePasswordModal` の `reason` プロップを削除し、メッセージを仮パスワード固定に戻した | `frontend/src/components/ChangePasswordModal.tsx` |
| 7 | `expiredAlertTitle`・`expiredAlertDescription` キーを削除した | `frontend/src/locales/ja.json`, `frontend/src/locales/en.json` |
| 8 | `refreshToken()` 型定義・実装から `passwordChangeRequired` を削除した | `frontend/src/services/authService.ts` |
| 9 | `PASSWORD_EXPIRY_DAYS` 環境変数エントリを削除した | `aws/ecs-task-definition-alchemia-backend.json` |

## 仮パスワード有効期限の廃止（2026-05-20）

### 背景

仮パスワードに有効期限を設ける要件が不要となったため、`password_expires_at` カラム自体を廃止する。
仮パスワードかどうかの判断は `is_temporary_flg` のみで行う。

### 対策

| # | 対策 | 変更ファイル |
|---|---|---|
| 1 | `password_expires_at` カラムを `user_authentication` テーブルから削除するマイグレーションを作成 | `backend/migrations/20260520_drop_password_expires_at.sql` |
| 2 | DDLファイルから `password_expires_at` 行を削除 | `docs/design/db/ddl/user_authentication.sql`, `docs/design/db/ddl/migrations/create_all_tables.sql` |
| 3 | SQLクエリファイルの INSERT文から `password_expires_at` カラム・パラメータを削除 | `backend/src/sql/queries/users/createUserAuth.sql`, `backend/src/sql/queries/organizations/createUserAuthentication.sql` |
| 4 | `PasswordStatus` 型から `password_expires_at` を削除し、`getPasswordStatus()` の SELECT・各 UPDATE メソッドから `password_expires_at` 関連処理を削除。`updatePasswordWithExpiry()` メソッドを削除 | `backend/src/repositories/userAuthenticationRepository.ts` |
| 5 | ユーザー新規作成時の `passwordExpiresAt` 変数および `authValues` から `password_expires_at` を削除 | `backend/src/repositories/userRepository.ts` |
| 6 | 組織新規作成時の `passwordExpiresAt` 変数および `authValues` から `password_expires_at` を削除 | `backend/src/services/organizationService.ts` |
| 7 | `processVerifyPin()` 内のパスワード有効期限チェック処理（`expiresAt` 算出・`isPasswordExpired` 設定）を削除し、`is_temporary_flg` のみで `passwordChangeRequired` を判断するよう変更 | `backend/src/services/authService.ts` |
| 8 | 有効期限チェック処理（`expiresAt` 算出・`isPasswordExpired` 設定）を削除し、`is_temporary_flg` のみで `passwordChangeRequired` を判断するよう変更 | `backend/src/controllers/authHelpers.ts` |

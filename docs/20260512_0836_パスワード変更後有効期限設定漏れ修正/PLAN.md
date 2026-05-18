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

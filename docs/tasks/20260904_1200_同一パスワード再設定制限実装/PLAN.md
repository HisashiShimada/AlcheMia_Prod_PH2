# タスク計画書: 同一パスワード再設定制限実装

## メタデータ
- **作成日時**: 2026-09-04 12:00
- **タスクID**: 20260904_1200
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

パスワードリセット（`/reset-password`）およびパスワード変更（`/change-password`）において、
現在のパスワードと同一のパスワードへの変更を禁止する制限を実装する。

パスワード履歴テーブルは存在しないため、**直前（現在）のパスワードとの一致チェックのみ**を行う。

## 目的と期待される成果

- [ ] パスワードリセット時：現在のパスワードと同一の場合はエラーを返す
- [ ] パスワード変更時：現在のパスワードと同一の場合はエラーを返す
- [ ] フロントエンドでも即時バリデーションエラーを表示する（UX向上）
- [ ] ja/en 両方の翻訳キーを追加する

## 実装ステップ

### バックエンド

- [ ] **1. `authService.ts` `processResetPassword()`** に同一パスワードチェックを追加
  - トークンからユーザーIDと組織IDを取得済みの後、DB から現在のパスワードハッシュを取得
  - `bcrypt.compare(newPassword, currentHash)` で一致チェック
  - 一致する場合は `AUTH_SAME_PASSWORD` エラーを返す

- [ ] **2. `authService.ts` `processChangePassword()`** に同一パスワードチェックを追加
  - 既に `verifyResult` で現パスワード検証済みのため、`currentPassword === newPassword` の平文比較で対応
  - 一致する場合は `AUTH_SAME_PASSWORD` エラーを返す

### フロントエンド

- [ ] **3. 翻訳キー追加** (`ja.json` / `en.json`)
  - `auth.passwordReset.samePasswordError`（パスワードリセット画面用）
  - `auth.changePassword.samePasswordError`（パスワード変更モーダル用）

- [ ] **4. `PasswordResetExecute.tsx`** (`frontend/src/components/PasswordResetExecute.tsx`) にクライアントサイドの同一パスワードチェックは不要（リセット時は現在のパスワードを入力フィールドに持たないため、サーバーサイドのみ）

- [ ] **5. `ChangePasswordModal.tsx`** に同一パスワードチェックを追加
  - `currentPassword === newPassword` の場合、フォームバリデーションエラーとして表示

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/services/authService.ts` | `processResetPassword()` に同一パスワードチェック追加 |
| 2 | `backend/src/services/authService.ts` | `processChangePassword()` に同一パスワードチェック追加 |
| 3 | `frontend/src/locales/ja.json` | 翻訳キー追加 |
| 4 | `frontend/src/locales/en.json` | 翻訳キー追加 |
| 5 | `frontend/src/components/ChangePasswordModal.tsx` | フロントエンドバリデーション追加 |

## リスク

| リスク | 対策 |
|--------|------|
| `processResetPassword` でのDB参照追加によるパフォーマンス影響 | `passwordService.verify` を再利用してクエリを最小化 |
| `processChangePassword` での平文比較漏れ | 現パスワード検証直後に比較ロジックを追加 |

## テスト計画

- [ ] `processResetPassword`: 同一パスワードでエラーが返ること
- [ ] `processResetPassword`: 異なるパスワードで成功すること
- [ ] `processChangePassword`: 同一パスワードでエラーが返ること
- [ ] `processChangePassword`: 異なるパスワードで成功すること
- [ ] `ChangePasswordModal`: 同一パスワード入力時にバリデーションエラーが表示されること

## 承認記録
- **計画書提示日時**: 2026-09-04 12:00
- **承認日時**: 2026-09-04（act モード移行により承認済み）
- **承認者コメント**: 直前のパスワードとの一致チェックのみ実装する

# タスク計画書: パスワード変更後の有効期限設定漏れ修正

## メタデータ
- **作成日時**: 2026-05-12 08:36
- **タスクID**: password-expires-at-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

仮パスワードから本パスワードへ変更した際、`user_authentication` テーブルの `password_expires_at` が `NULL` になっているバグを修正する。

## 目的と期待される成果

- [ ] パスワード変更後に `password_expires_at = NOW() + 30日` が設定される
- [ ] `is_temporary_flg = false` に更新される（現状通り）

## 原因

`backend/src/repositories/userAuthenticationRepository.ts` の `clearPasswordExpiry()` メソッドのSQLで、`password_expires_at = NULL` と設定していた。

## 実装ステップ

- [x] `backend/src/repositories/userAuthenticationRepository.ts` の `clearPasswordExpiry()` のSQLを修正

## 変更ファイル

1. `backend/src/repositories/userAuthenticationRepository.ts` - SQLの `password_expires_at = NULL` を `NOW() + INTERVAL '30 days'` に変更

## 技術的詳細

### 修正前（問題のあるSQL）

```sql
UPDATE user_authentication
SET password = $1,
    password_expires_at = NULL,
    is_temporary_flg = false,
    update_at = NOW()
WHERE user_id = $2 AND organization_id = $3
```

### 修正後

```sql
UPDATE user_authentication
SET password = $1,
    password_expires_at = NOW() + INTERVAL '30 days',
    is_temporary_flg = false,
    update_at = NOW()
WHERE user_id = $2 AND organization_id = $3
```

### 他のシーンとの整合性

| シーン | `password_expires_at` | `is_temporary_flg` |
|---|---|---|
| ユーザー新規作成 | `new Date()`（即時期限切れ） | `true` |
| 仮パスワード再発行 | `NOW() + INTERVAL '24 hours'` | `true` |
| **パスワード変更後（修正対象）** | `NOW() + INTERVAL '30 days'`（修正後） | `false` |

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存ユーザーへの影響 | なし | なし | 更新はパスワード変更実行時のみ |

## テスト計画

- [ ] 仮パスワードでログイン → パスワード変更 → DBで `password_expires_at` が現在日時から30日後になっていることを確認
- [ ] `is_temporary_flg = false` になっていることを確認

## 承認記録

- **計画書提示日時**: 2026-05-12 08:36
- **承認日時**: 2026-05-12 08:43

## 実施記録

### 実施日時
開始: 2026-05-12 08:43
完了: （作業完了後に記入）

### 最終的な成果物
- [ ] `backend/src/repositories/userAuthenticationRepository.ts` 修正完了

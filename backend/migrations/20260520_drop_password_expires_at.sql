-- マイグレーション: password_expires_at カラムを user_authentication テーブルから削除
-- 実施日: 2026-05-20
-- 理由: 仮パスワード有効期限の概念を廃止。仮パスワード判断は is_temporary_flg のみで行う。

ALTER TABLE user_authentication DROP COLUMN IF EXISTS password_expires_at;

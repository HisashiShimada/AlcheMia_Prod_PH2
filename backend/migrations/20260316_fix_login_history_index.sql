-- ===================================================================
-- マイグレーション: login_history インデックス修正
-- 作成日: 2026-03-16
-- 内容: idx_login_history_query の user_name を user_id に修正
-- ===================================================================

-- 既存インデックスを削除
DROP INDEX IF EXISTS idx_login_history_query;

-- 正しいカラム（user_id）でインデックスを再作成
CREATE INDEX idx_login_history_query ON login_history(organization_id, user_id, entry_execute_flg);

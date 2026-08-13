-- ============================================================
-- organization_group テストデータ ユーザーパスワード修正SQL
--
-- 対象組織: AIML研究所（organization_id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385）
-- 作成日: 2026-08-06
--
-- 問題:
--   test_data_organization_group_access.sql で登録した user_authentication の
--   パスワードハッシュが "test123"（7文字）に対応するものだったため、
--   パスワードポリシー（8文字以上）によりログイン画面でエラーが発生していた。
--
-- 対応:
--   パスワードを "test1234"（8文字）に変更し、正しい bcrypt ハッシュに更新する。
--
-- 新パスワード: test1234
-- 新ハッシュ  : $2b$12$iE8tYCF.3RYeQGrav9jvJ.LqfYsbVHhBmv0h4YoAvSOHMgVLnenLO
--   生成コマンド: node -e "const b=require('bcrypt'); b.hash('test1234',12).then(h=>console.log(h))"
--
-- 対象ユーザー（6名）:
--   hq_user@example.com
--   dev_user@example.com
--   dev_a_user@example.com
--   sales_user@example.com
--   multi_user@example.com
--   no_group_user@example.com
-- ============================================================

UPDATE user_authentication
SET
    password     = '$2b$12$iE8tYCF.3RYeQGrav9jvJ.LqfYsbVHhBmv0h4YoAvSOHMgVLnenLO',
    update_at    = CURRENT_TIMESTAMP
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND user_id IN (
      'hq_user@example.com',
      'dev_user@example.com',
      'dev_a_user@example.com',
      'sales_user@example.com',
      'multi_user@example.com',
      'no_group_user@example.com'
  );

-- ============================================================
-- ✅ 更新確認クエリ（6件が更新されていることを確認）
-- ============================================================
SELECT
    user_id,
    LEFT(password, 20) || '...' AS password_hash_prefix,
    update_at
FROM user_authentication
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND user_id IN (
      'hq_user@example.com',
      'dev_user@example.com',
      'dev_a_user@example.com',
      'sales_user@example.com',
      'multi_user@example.com',
      'no_group_user@example.com'
  )
ORDER BY user_id;

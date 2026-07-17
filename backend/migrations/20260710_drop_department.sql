-- ============================================================
-- 1. organization_user.department_cd カラムの削除
--    （Step1で残置した互換カラム。Step3〜4の移行完了後に削除可能）
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_user' AND column_name = 'department_cd'
  ) THEN
    ALTER TABLE organization_user DROP COLUMN department_cd;
  END IF;
END$$;

-- ============================================================
-- 2. department テーブルの削除
-- ============================================================
DROP TABLE IF EXISTS department CASCADE;

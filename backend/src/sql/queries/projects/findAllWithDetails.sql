-- プロジェクト一覧取得（ユーザー名・部署名・タスク数・ファイル数含む）
-- 使用箇所:
--   - projectRepository.ts - findAllWithDetails()
-- パラメータ: $1=organizationId, $2=includeCompleted(boolean)
-- ORDER BY はRepository層で動的付加（SQLインジェクション対策のためSQLファイルには含めない）

SELECT
  p.organization_id,
  p.project_id,
  p.project_name,
  p.description,
  p.department_cd,
  d.department_name,
  p.owner_user_id,
  ou.user_name AS owner_user_name,
  ou.mail_address AS owner_email,
  p.project_status,
  ps.code_name AS project_status_name,
  p.project_maiml_flg,
  p.checkout_status,
  p.create_at,
  p.update_at,
  checkout_user.user_id AS checkout_user_id,
  COUNT(DISTINCT CASE
    WHEN ptd.method_id IS NOT NULL AND ptd.task_no IS NOT NULL
    THEN ptd.method_id || '_' || ptd.task_no::TEXT
    ELSE NULL
  END) AS task_count,
  COUNT(DISTINCT CASE
    WHEN ptd.task_status = 4
    THEN ptd.method_id || '_' || ptd.task_no::TEXT
    ELSE NULL
  END) AS completed_task_count,
  (
    SELECT COUNT(*)
    FROM file_metadata fm
    WHERE fm.organization_id = p.organization_id
      AND fm.file_key LIKE CAST(p.organization_id AS TEXT) || '/projects/' || p.project_name || '/%'
      AND fm.file_key NOT LIKE '%/.keep'
  ) AS file_count,
  p.project_uuid,
  (
    SELECT fm2.file_key
    FROM file_metadata fm2
    WHERE fm2.project_uuid = p.project_uuid
      AND fm2.file_key LIKE '%.maiml'
      AND fm2.file_key NOT LIKE '%/archive/%'
    ORDER BY fm2.created_at DESC
    LIMIT 1
  ) AS maiml_file_key
FROM project p
LEFT JOIN project_task_detail ptd
  ON ptd.project_id = p.project_id
  AND ptd.organization_id = p.organization_id
LEFT JOIN organization_user ou
  ON ou.user_id = p.owner_user_id
  AND ou.organization_id = p.organization_id
LEFT JOIN department d
  ON d.department_cd = p.department_cd
  AND d.organization_id = p.organization_id
LEFT JOIN code_master ps
  ON ps.code_division = 'project_status'
  AND ps.code_value = CAST(p.project_status AS VARCHAR)
  AND ps.organization_id = p.organization_id
LEFT JOIN organization_user checkout_user
  ON checkout_user.user_id = p.owner_user_id
  AND checkout_user.organization_id = p.organization_id
  AND p.checkout_status = 1
WHERE p.organization_id = $1
  AND ($2::boolean IS NULL OR
       ($2 = true OR p.project_status != 4))
GROUP BY
  p.organization_id,
  p.project_id,
  p.project_name,
  p.description,
  p.department_cd,
  d.department_name,
  p.owner_user_id,
  ou.user_name,
  ou.mail_address,
  p.project_status,
  ps.code_name,
  p.project_maiml_flg,
  p.checkout_status,
  p.create_at,
  p.update_at,
  checkout_user.user_id,
  p.project_uuid

-- =====================================================================
-- マイグレーション: code_master に project_status = 6（レビュー差戻）を追加
-- 対象バージョン: 2026-09-18 以降
-- 実行順序: このファイルを1回だけ実行する（ON CONFLICT DO NOTHING で冪等性確保）
-- =====================================================================

-- project_status = 6（REVIEW_REJECTED: レビュー差戻）を全組織のコードマスターに追加
-- NGタスクのみ残り・追加タスクなしでチェックアウトした際に遷移するステータス
INSERT INTO code_master (
  organization_id,
  code_division,
  code_value,
  code_name,
  code_description,
  code_remark,
  create_user_id,
  update_user_id,
  create_at,
  update_at
)
SELECT
  o.organization_id,
  'project_status',
  '6',
  'reviewRejected',
  'プロジェクトの進捗ステータス',
  'レビュー差戻',
  o.organization_id,
  o.organization_id,
  NOW(),
  NOW()
FROM organization o
ON CONFLICT (organization_id, code_division, code_value) DO NOTHING;

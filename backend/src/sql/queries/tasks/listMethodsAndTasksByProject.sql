-- タスク一覧取得クエリ
-- プロジェクト内の全タスクをメソッド単位でグループ化して取得
-- 
-- パラメータ:
--   $1: project_id (UUID)
--   $2: organization_id (UUID)
--   動的フィルタ用プレースホルダー（$3以降はアプリケーション側で動的に追加）
--
-- 要件:
--   - project_taskとproject_task_detailをLEFT JOIN
--   - transition_dataをLEFT JOINして進捗率を計算
--   - organization_userとuser_authenticationをLEFT JOINして担当者名を取得
--   - 全JOINでorganization_idフィルタを適用（マルチテナント分離）
--   - AVG集約関数を使用するためGROUP BY句で全非集約カラムを指定
--   - COALESCEでprogress_rateがnullの場合0を返す

SELECT 
  -- メソッド情報（project_task）
  pt.method_id,
  pt.method_id AS method_name,
  pt.experiment_order,
  
  -- タスク詳細情報（project_task_detail）
  ptd.task_no AS task_detail_id,
  ptd.task_no AS task_detail_no,
  ptd.task_status,
  ptd.experiment_user_id AS assign_user_id,
  ptd.create_at AS created_at,
  ptd.update_at AS updated_at,
  
  -- 進捗率（transition_dataテーブルから平均値を計算）
  COALESCE(AVG(td.progress_rate), 0) AS progress_rate,
  
  -- 担当者名（organization_user + user_authentication）
  ou.user_name AS assign_user_name

FROM project_task pt

-- タスク詳細を取得（LEFT JOIN: タスク詳細がないメソッドも含める）
LEFT JOIN project_task_detail ptd
  ON pt.method_id = ptd.method_id
  AND pt.project_id = ptd.project_id
  AND pt.organization_id = ptd.organization_id  -- マルチテナント分離

-- 進捗データを取得（LEFT JOIN: 進捗データがないタスクも含める）
LEFT JOIN transition_data td
  ON ptd.task_no = td.task_no
  AND ptd.method_id = td.method_id
  AND ptd.project_id = td.project_id
  AND ptd.organization_id = td.organization_id  -- マルチテナント分離

-- 担当者の組織ユーザー情報を取得（LEFT JOIN: 担当者未割り当てのタスクも含める）
LEFT JOIN organization_user ou 
  ON ptd.experiment_user_id = ou.user_id 
  AND ptd.organization_id = ou.organization_id  -- マルチテナント分離

-- 担当者の認証情報（ユーザー名）を取得（LEFT JOIN）
LEFT JOIN user_authentication ua 
  ON ou.user_id = ua.user_id
  AND ou.organization_id = ua.organization_id  -- マルチテナント分離

WHERE pt.project_id = $1
  AND pt.organization_id = $2  -- マルチテナント分離（必須）
  -- 動的フィルタ条件（methodId, status, assignUserId）はアプリケーション側で追加

GROUP BY 
  -- メソッド情報
  pt.method_id,
  pt.experiment_order,
  -- タスク詳細情報
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_user_id,
  ptd.create_at,
  ptd.update_at,
  -- 担当者名
  ou.user_name

ORDER BY 
  pt.experiment_order ASC,  -- メソッドの実験順序（必須）
  -- 動的ソート条件（sortBy, order）はアプリケーション側で追加
  ptd.task_no ASC  -- デフォルト: タスク詳細番号昇順
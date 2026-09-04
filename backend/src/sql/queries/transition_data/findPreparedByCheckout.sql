-- チェックアウト時にステータスが PREPARING(2) に更新されたトランジション一覧取得
-- updateStatusForCheckout.sql での一括更新直後に呼び出し、
-- イベントログ記録対象のトランジション情報を返す。
--
-- Parameters:
--   $1: organization_id (UUID)
--   $2: project_id (UUID)

SELECT
  method_id,
  task_no,
  transition_id
FROM transition_data
WHERE organization_id             = $1
  AND project_id                  = $2
  AND status                      = 2     -- 2: 準備状態（PREPARING）
  AND prerequisite_transition_ids = '{}'  -- 前提トランジションなし（チェックアウト対象）
ORDER BY method_id, task_no, transition_id

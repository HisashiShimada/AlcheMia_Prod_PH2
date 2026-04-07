-- code_master 初期データ一括INSERT
-- $1: organization_id
-- $2: create_user_id / update_user_id
-- ON CONFLICT DO NOTHING でべき等な処理を保証
INSERT INTO code_master (organization_id, code_division, code_value, code_name, code_description, create_user_id, update_user_id, create_at, update_at)
VALUES
  ($1, 'checkout_status', '0', 'チェックイン中', 'プロジェクトのチェックアウト状態', $2, $2, NOW(), NOW()),
  ($1, 'checkout_status', '1', 'チェックアウト済', 'プロジェクトのチェックアウト状態', $2, $2, NOW(), NOW()),
  ($1, 'experiment_condition', '0', '全て同一条件で実行', '繰り返し実験時の条件指定', $2, $2, NOW(), NOW()),
  ($1, 'experiment_condition', '1', '実験条件', '繰り返し実験時の条件指定', $2, $2, NOW(), NOW()),
  ($1, 'instruction_priority', '0', '低', '実験指示の優先度', $2, $2, NOW(), NOW()),
  ($1, 'instruction_priority', '1', '通常', '実験指示の優先度', $2, $2, NOW(), NOW()),
  ($1, 'instruction_priority', '2', '中', '実験指示の優先度', $2, $2, NOW(), NOW()),
  ($1, 'instruction_priority', '3', '高', '実験指示の優先度', $2, $2, NOW(), NOW()),
  ($1, 'instruction_status', '0', '未送信', '指示送信ステータス', $2, $2, NOW(), NOW()),
  ($1, 'instruction_status', '1', '送信済', '指示送信ステータス', $2, $2, NOW(), NOW()),
  ($1, 'instruction_target', '0', 'ファイル全体', '指示送信時の指示範囲', $2, $2, NOW(), NOW()),
  ($1, 'instruction_target', '1', '特定タスク', '指示送信時の指示範囲', $2, $2, NOW(), NOW()),
  ($1, 'instruction_target', '2', '特定トランジション', '指示送信時の指示範囲', $2, $2, NOW(), NOW()),
  ($1, 'instruction_type', '0', '一般', '実験指示のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'instruction_type', '1', 'セットアップ', '実験指示のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'instruction_type', '2', '測定', '実験指示のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'instruction_type', '3', '安全', '実験指示のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'instruction_type', '4', '清掃', '実験指示のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'issue_type', '0', '材料不足2', '問題のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'issue_type', '1', '機器故障', '問題のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'issue_type', '2', '手順不明確', '問題のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'issue_type', '3', '安全性の懸念', '問題のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'issue_type', '4', '品質問題', '問題のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'issue_type', '5', '時間制約', '問題のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'issue_type', '6', 'その他', '問題のタイプ', $2, $2, NOW(), NOW()),
  ($1, 'project_status', '0', 'プロジェクト計画中', 'プロジェクトの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'project_status', '1', 'タスク実行待ち', 'プロジェクトの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'project_status', '2', 'タスク実行中', 'プロジェクトの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'project_status', '3', 'タスク結果レビュー待ち', 'プロジェクトの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'project_status', '4', 'プロジェクト完了', 'プロジェクトの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'project_status', '5', 'タスク異常終了', 'プロジェクトの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'task_status', '0', '実行待ち', 'タスクの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'task_status', '1', '実行中', 'タスクの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'task_status', '2', 'レビュー待ち', 'タスクの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'task_status', '3', '完了', 'タスクの進捗ステータス', $2, $2, NOW(), NOW()),
  ($1, 'task_status', '4', '異常終了', 'タスクの進捗ステータス', $2, $2, NOW(), NOW())
ON CONFLICT (organization_id, code_division, code_value) DO NOTHING;

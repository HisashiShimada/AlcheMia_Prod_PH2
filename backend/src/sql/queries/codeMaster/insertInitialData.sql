-- code_master 初期データ一括INSERT
-- $1: organization_id
-- $2: create_user_id / update_user_id
-- ON CONFLICT DO NOTHING でべき等な処理を保証
--
-- code_name: i18nキーのキー部分（例: 'materialShortage'）
-- 完全なi18nキーはバックエンドで組み立て: codeMaster.{code_division}.{code_name}
-- code_description: カテゴリ説明（例: 'プロジェクトのチェックアウト状態'）
-- code_remark: 日本語コード名称（バックエンドでの表示用）
INSERT INTO code_master (organization_id, code_division, code_value, code_name, code_description, code_remark, create_user_id, update_user_id, create_at, update_at)
VALUES
  ($1, 'checkout_status',      '0', 'checkedIn',           'プロジェクトのチェックアウト状態',      'チェックイン中',             $2, $2, NOW(), NOW()),
  ($1, 'checkout_status',      '1', 'checkedOut',          'プロジェクトのチェックアウト状態',      'チェックアウト済',            $2, $2, NOW(), NOW()),
  ($1, 'experiment_condition', '0', 'allSameCondition',    '繰り返し実験時の条件指定',              '全て同一条件で実行',          $2, $2, NOW(), NOW()),
  ($1, 'experiment_condition', '1', 'individualCondition', '繰り返し実験時の条件指定',              '実験ごとに条件を変更',        $2, $2, NOW(), NOW()),
  ($1, 'instruction_priority', '0', 'low',                 '実験指示の優先度',                      '低',                         $2, $2, NOW(), NOW()),
  ($1, 'instruction_priority', '1', 'normal',              '実験指示の優先度',                      '通常',                       $2, $2, NOW(), NOW()),
  ($1, 'instruction_priority', '2', 'medium',              '実験指示の優先度',                      '中',                         $2, $2, NOW(), NOW()),
  ($1, 'instruction_priority', '3', 'high',                '実験指示の優先度',                      '高',                         $2, $2, NOW(), NOW()),
  ($1, 'instruction_status',   '0', 'unsent',              '指示送信ステータス',                    '未送信',                     $2, $2, NOW(), NOW()),
  ($1, 'instruction_status',   '1', 'sent',                '指示送信ステータス',                    '送信済',                     $2, $2, NOW(), NOW()),
  ($1, 'instruction_target',   '0', 'entireFile',          '指示送信時の指示範囲',                  'ファイル全体',               $2, $2, NOW(), NOW()),
  ($1, 'instruction_target',   '1', 'specificTask',        '指示送信時の指示範囲',                  '特定タスク',                 $2, $2, NOW(), NOW()),
  ($1, 'instruction_target',   '2', 'specificTransition',  '指示送信時の指示範囲',                  '特定トランジション',         $2, $2, NOW(), NOW()),
  ($1, 'instruction_type',     '0', 'general',             '実験指示のタイプ',                      '一般',                       $2, $2, NOW(), NOW()),
  ($1, 'instruction_type',     '1', 'setup',               '実験指示のタイプ',                      'セットアップ',               $2, $2, NOW(), NOW()),
  ($1, 'instruction_type',     '2', 'measurement',         '実験指示のタイプ',                      '測定',                       $2, $2, NOW(), NOW()),
  ($1, 'instruction_type',     '3', 'safety',              '実験指示のタイプ',                      '安全',                       $2, $2, NOW(), NOW()),
  ($1, 'instruction_type',     '4', 'cleaning',            '実験指示のタイプ',                      '清掃',                       $2, $2, NOW(), NOW()),
  ($1, 'issue_type',           '0', 'materialShortage',    '問題のタイプ',                          '材料不足',                   $2, $2, NOW(), NOW()),
  ($1, 'issue_type',           '1', 'equipmentFailure',    '問題のタイプ',                          '機器故障',                   $2, $2, NOW(), NOW()),
  ($1, 'issue_type',           '2', 'unclearProcedure',    '問題のタイプ',                          '手順不明確',                 $2, $2, NOW(), NOW()),
  ($1, 'issue_type',           '3', 'safetyConcern',       '問題のタイプ',                          '安全性の懸念',               $2, $2, NOW(), NOW()),
  ($1, 'issue_type',           '4', 'qualityIssue',        '問題のタイプ',                          '品質問題',                   $2, $2, NOW(), NOW()),
  ($1, 'issue_type',           '5', 'timeConstraint',      '問題のタイプ',                          '時間制約',                   $2, $2, NOW(), NOW()),
  ($1, 'issue_type',           '6', 'other',               '問題のタイプ',                          'その他',                     $2, $2, NOW(), NOW()),
  ($1, 'project_status',       '0', 'planning',            'プロジェクトの進捗ステータス',          'プロジェクト計画中',         $2, $2, NOW(), NOW()),
  ($1, 'project_status',       '1', 'taskPending',         'プロジェクトの進捗ステータス',          'タスク実行待ち',             $2, $2, NOW(), NOW()),
  ($1, 'project_status',       '2', 'taskInProgress',      'プロジェクトの進捗ステータス',          'タスク実行中',               $2, $2, NOW(), NOW()),
  ($1, 'project_status',       '3', 'reviewPending',       'プロジェクトの進捗ステータス',          'タスク結果レビュー待ち',     $2, $2, NOW(), NOW()),
  ($1, 'project_status',       '4', 'completed',           'プロジェクトの進捗ステータス',          'プロジェクト完了',           $2, $2, NOW(), NOW()),
  ($1, 'project_status',       '5', 'taskFailed',          'プロジェクトの進捗ステータス',          'タスク異常終了',             $2, $2, NOW(), NOW()),
  ($1, 'task_status',          '0', 'pending',             'タスクの進捗ステータス',                '実行待ち',                   $2, $2, NOW(), NOW()),
  ($1, 'task_status',          '1', 'inProgress',          'タスクの進捗ステータス',                '実行中',                     $2, $2, NOW(), NOW()),
  ($1, 'task_status',          '2', 'reviewPending',       'タスクの進捗ステータス',                'レビュー待ち',               $2, $2, NOW(), NOW()),
  ($1, 'task_status',          '3', 'completed',           'タスクの進捗ステータス',                '完了',                       $2, $2, NOW(), NOW()),
  ($1, 'task_status',          '4', 'failed',              'タスクの進捗ステータス',                '異常終了',                   $2, $2, NOW(), NOW())
ON CONFLICT (organization_id, code_division, code_value) DO NOTHING;

-- プロジェクト指示テーブルに送信ステータスカラムを追加
-- 作成日: 2026-02-24
-- 目的: 指示の保存と送信を分離するため、ステータス管理カラムを追加

-- instruction_statusカラム追加
ALTER TABLE project_instruction
ADD COLUMN instruction_status numeric(1,0) DEFAULT 0 NOT NULL;

-- カラムコメント追加
COMMENT ON COLUMN project_instruction.instruction_status IS '指示送信ステータス:0:未送信、1:送信済';

-- インデックス追加（送信済/未送信での検索を高速化）
CREATE INDEX idx_project_instruction_status 
ON project_instruction (organization_id, project_id, instruction_status);

-- 既存データの初期化（既存データは送信済として扱う）
UPDATE project_instruction
SET instruction_status = 1
WHERE instruction_status IS NULL;

-- ===================================================================
-- コードマスタ: 指示送信ステータス
-- ===================================================================

-- コード区分: instruction_status
-- 既存のコードマスタと同じorganization_idを使用

INSERT INTO code_master (
  organization_id,
  code_division,
  code_value,
  code_description,
  code_name,
  code_remark
) VALUES
  -- 未送信
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    'instruction_status',
    '0',
    '指示送信ステータス',
    '未送信',
    NULL
  ),
  -- 送信済
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    'instruction_status',
    '1',
    '指示送信ステータス',
    '送信済',
    NULL
  )
ON CONFLICT (organization_id, code_division, code_value) DO NOTHING;

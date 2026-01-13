-- ===================================================================
-- テーブル名: role_permission (ロール権限)
-- 説明: ロールと機能の権限マッピングテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS role_permission CASCADE;

CREATE TABLE role_permission (
    -- 複合主キー
    role VARCHAR(30) NOT NULL,
    function_id VARCHAR(30) NOT NULL,
    
    -- 権限情報
    permission VARCHAR(30) NOT NULL,
    
    -- 制約
    CONSTRAINT role_permission_pkey PRIMARY KEY (role, function_id),
    CONSTRAINT role_permission_function_fkey 
        FOREIGN KEY (function_id) 
        REFERENCES function(function_id)
);

-- インデックス
CREATE INDEX idx_role_permission_role ON role_permission(role);
CREATE INDEX idx_role_permission_function ON role_permission(function_id);

-- コメント
COMMENT ON TABLE role_permission IS 'ロールと機能の権限マッピングテーブル';
COMMENT ON COLUMN role_permission.role IS 'ロール（ユーザのロールと同一）';
COMMENT ON COLUMN role_permission.function_id IS '機能ID（画面単位の機能ID）';
COMMENT ON COLUMN role_permission.permission IS '権限（CRUDの権限）';

-- MaiML Draftsテーブル
CREATE TABLE IF NOT EXISTS maiml_drafts (
    id SERIAL PRIMARY KEY,
    draft_key VARCHAR(255) UNIQUE NOT NULL CHECK (draft_key ~ '^draft_[a-zA-Z0-9_-]+$'),
    user_id VARCHAR(100) NOT NULL DEFAULT 'default-user',
    draft_name VARCHAR(255) NOT NULL CHECK (char_length(draft_name) >= 1 AND char_length(draft_name) <= 255),
    original_file_key VARCHAR(500),
    nodes JSONB NOT NULL DEFAULT '[]',
    arcs JSONB NOT NULL DEFAULT '[]',
    templates JSONB NOT NULL DEFAULT '{"resultTemplates": {}, "materialTemplates": {}, "conditionTemplates": {}}',
    document_data JSONB NOT NULL DEFAULT '{"id": "documentID", "date": "", "name": "document", "uuid": ""}',
    node_count INTEGER DEFAULT 0,
    arc_count INTEGER DEFAULT 0,
    template_count INTEGER DEFAULT 0,
    auto_save_enabled BOOLEAN DEFAULT TRUE,
    auto_save_interval INTEGER DEFAULT 300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_auto_saved_at TIMESTAMP WITH TIME ZONE,
    organization_id VARCHAR(100),
    project_id VARCHAR(255)  -- プロジェクトID（プロジェクト管理画面からのDraft特定用）
);

CREATE INDEX IF NOT EXISTS idx_maiml_drafts_user_id ON maiml_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_maiml_drafts_organization_id ON maiml_drafts(organization_id);
CREATE INDEX IF NOT EXISTS idx_maiml_drafts_org_user ON maiml_drafts(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_maiml_drafts_last_saved ON maiml_drafts(user_id, last_saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_maiml_drafts_original_file ON maiml_drafts(original_file_key) WHERE original_file_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maiml_drafts_project_id ON maiml_drafts(project_id);
CREATE INDEX IF NOT EXISTS idx_maiml_drafts_org_project ON maiml_drafts(organization_id, project_id);

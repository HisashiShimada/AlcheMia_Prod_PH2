-- Migration: Add performance indexes for issue list retrieval
-- Date: 2026-02-05
-- Purpose: Optimize query performance for issue list retrieval API
-- Related Task: 3.3 Performance optimization

-- Index for issue list retrieval (organization_id + project_id + status)
-- This composite index supports the most common query pattern
CREATE INDEX IF NOT EXISTS idx_issue_org_project_status 
ON issue (organization_id, project_id, status);

-- Index for issue list retrieval with created_at for sorting
-- This supports ORDER BY created_at DESC efficiently
CREATE INDEX IF NOT EXISTS idx_issue_org_project_created 
ON issue (organization_id, project_id, created_at DESC);

-- Index for issue_comment retrieval by issue_id
-- This supports efficient comment lookup for multiple issues
CREATE INDEX IF NOT EXISTS idx_issue_comment_issue_id 
ON issue_comment (issue_id, sequence_no);

-- Index for issue_comment organization filter
-- This ensures multi-tenant isolation is efficient
CREATE INDEX IF NOT EXISTS idx_issue_comment_org_issue 
ON issue_comment (organization_id, issue_id);

-- Index for task-level issue filtering
-- Supports issue_target = 'task' queries efficiently
CREATE INDEX IF NOT EXISTS idx_issue_org_method_task 
ON issue (organization_id, method_id, task_no) 
WHERE issue_target = 'task';

-- Index for transition-level issue filtering
-- Supports issue_target = 'transition' queries efficiently
CREATE INDEX IF NOT EXISTS idx_issue_org_transition 
ON issue (organization_id, transition_id) 
WHERE issue_target = 'transition';

-- Analyze tables to update statistics for query planner
ANALYZE issue;
ANALYZE issue_comment;

-- Verification queries
-- These queries can be used to verify index usage with EXPLAIN ANALYZE

-- Example 1: Verify project-level query uses indexes
-- EXPLAIN ANALYZE
-- SELECT i.*, p.project_name, u.user_name as reporter_user_name
-- FROM issue i
-- JOIN projects p ON i.project_id = p.id AND i.organization_id = p.organization_id
-- LEFT JOIN organization_user u ON i.reporter_user_id = u.user_id AND i.organization_id = u.organization_id
-- WHERE i.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
--   AND i.project_id = 'proj-123'
--   AND i.issue_target = 'project'
-- ORDER BY i.created_at DESC;

-- Example 2: Verify task-level query uses indexes
-- EXPLAIN ANALYZE
-- SELECT i.*, p.project_name, u.user_name as reporter_user_name
-- FROM issue i
-- JOIN projects p ON i.project_id = p.id AND i.organization_id = p.organization_id
-- LEFT JOIN organization_user u ON i.reporter_user_id = u.user_id AND i.organization_id = u.organization_id
-- WHERE i.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
--   AND i.project_id = 'proj-123'
--   AND i.method_id = 'method-001'
--   AND i.task_no = 1
--   AND i.issue_target = 'task'
-- ORDER BY i.created_at DESC;

-- Example 3: Verify comment retrieval uses indexes
-- EXPLAIN ANALYZE
-- SELECT ic.*, u.user_name as commenter_user_name
-- FROM issue_comment ic
-- LEFT JOIN organization_user u ON ic.commenter_user_id = u.user_id AND ic.organization_id = u.organization_id
-- WHERE ic.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
--   AND ic.issue_id = ANY(ARRAY['issue-1', 'issue-2', 'issue-3'])
-- ORDER BY ic.issue_id, ic.sequence_no;
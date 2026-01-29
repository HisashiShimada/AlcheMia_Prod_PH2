-- Migration: Add indexes for Worker Project List API performance
-- Task 1.1: 既存インデックスの確認と最適化
-- Created: 2026-01-27
-- Description: Optimize queries for experiment worker accessible project list

-- ===================================================================
-- Index 1: project table - organization_id + project_status filtering
-- ===================================================================
-- Purpose: Fast filtering by organization and project status
-- Used in: WHERE organization_id = ? AND project_status IN (0, 1, 2)
-- Benefit: Eliminates full table scan when filtering by status
CREATE INDEX IF NOT EXISTS idx_project_org_status 
ON project(organization_id, project_status);

COMMENT ON INDEX idx_project_org_status IS 
'Index for filtering projects by organization and status (worker project list API)';

-- ===================================================================
-- Index 2: project table - create_at for sorting
-- ===================================================================
-- Purpose: Fast sorting by creation date
-- Used in: ORDER BY create_at DESC
-- Benefit: Eliminates sort operation in query plan
CREATE INDEX IF NOT EXISTS idx_project_create_at 
ON project(create_at DESC);

COMMENT ON INDEX idx_project_create_at IS 
'Index for sorting projects by creation date descending (worker project list API)';

-- ===================================================================
-- Index 3: project_task_detail - experiment_user_id for worker filtering
-- ===================================================================
-- Purpose: Fast lookup of tasks assigned to specific worker
-- Used in: WHERE experiment_user_id = ? (experiment_worker role only)
-- Benefit: Quickly find all tasks assigned to a worker
CREATE INDEX IF NOT EXISTS idx_project_task_detail_exp_user 
ON project_task_detail(experiment_user_id);

COMMENT ON INDEX idx_project_task_detail_exp_user IS 
'Index for filtering tasks by assigned experiment worker (worker project list API)';

-- ===================================================================
-- Index 4: project_task_detail - organization_id + experiment_user_id
-- ===================================================================
-- Purpose: Multi-tenant safe worker task lookup
-- Used in: WHERE organization_id = ? AND experiment_user_id = ?
-- Benefit: Combines tenant isolation with worker filtering in single index
CREATE INDEX IF NOT EXISTS idx_project_task_detail_org_user 
ON project_task_detail(organization_id, experiment_user_id);

COMMENT ON INDEX idx_project_task_detail_org_user IS 
'Composite index for multi-tenant worker task filtering (worker project list API)';

-- ===================================================================
-- Composite index for optimal query performance
-- ===================================================================
-- Purpose: Cover the most common query pattern (org + status + sort)
-- Used in: SELECT with WHERE org + status and ORDER BY create_at
-- Benefit: Index-only scan possible for entire query
CREATE INDEX IF NOT EXISTS idx_project_org_status_created 
ON project(organization_id, project_status, create_at DESC);

COMMENT ON INDEX idx_project_org_status_created IS 
'Composite index covering organization, status filter, and creation date sort (worker project list API)';

-- ===================================================================
-- Verification queries (run after migration)
-- ===================================================================

-- Verify indexes were created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('project', 'project_task_detail')
-- AND indexname LIKE 'idx_project%'
-- ORDER BY tablename, indexname;

-- Check index usage statistics after production deployment
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE indexname LIKE 'idx_project%'
-- ORDER BY idx_scan DESC;

-- Analyze query performance with EXPLAIN ANALYZE
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT DISTINCT p.*
-- FROM project p
-- INNER JOIN project_task pt ON p.project_id = pt.project_id 
--   AND p.organization_id = pt.organization_id
-- INNER JOIN project_task_detail ptd ON pt.project_id = ptd.project_id 
--   AND pt.method_id = ptd.method_id
--   AND pt.organization_id = ptd.organization_id
-- WHERE p.organization_id = 'test-org-id'
--   AND ptd.experiment_user_id = 'test-user-id'
--   AND p.project_status IN (0, 1, 2)
-- ORDER BY p.create_at DESC
-- LIMIT 20;
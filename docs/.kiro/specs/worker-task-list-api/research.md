# Research & Design Decisions

**Feature**: worker-task-list-api  
**Discovery Level**: Light  
**Date**: 2026-01-29

## Summary

1. 既存パターン活用: 進捗確認APIの実装パターンを踏襲
2. 外部SQLファイル使用: backend.md規約に準拠
3. キャッシング戦略: MAIML解析の最適化

## Research Log

### API Endpoint
- エンドポイント: `GET /api/v1/tasks`
- RESTful原則準拠

### Database Query
- 外部SQLファイル使用（JOINのため必須）
- パス: `backend/src/sql/queries/tasks/listByProject.sql`

### Method Grouping
- アプリケーション層でグループ化

### Performance
- MAIML Cache (TTL 5分)
- DB Index確認

### Multi-tenant
- 全テーブルに`organization_id`フィルタ必須

## Architecture

Layered Architecture:
- Route: taskRoutes.ts
- Controller: taskController.ts
- Service: taskService.ts
- Repository: taskRepository.ts

## Risks & Mitigations

- N+1クエリ問題 → 適切なJOIN使用
- クロステナントアクセス → organization_idフィルタ徹底
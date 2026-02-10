# Research & Design Decisions

---
**Purpose**: 問題報告APIのバックエンド機能に関する調査結果と設計判断の記録

**Usage**: 既存の実装済みAPIを参照し、設計書作成に必要な情報を整理
---

## Summary
- **Feature**: `issue-report`
- **Discovery Scope**: Extension（既存システムへの統合）
- **Key Findings**:
  - 問題報告API（POST /api/v1/issues）は既に完全実装済み（テスト103件PASS）
  - 既存のController-Service-Repositoryパターンに準拠
  - マルチテナント分離、JWT認証、RBACが実装済み
  - データベーステーブル（issues、issue_comments）が定義済み

## Research Log

### Topic 1: 既存実装状況の確認

**Context**: requirements.mdで「バックエンド機能を実装する」とあるが、既存実装との関係を調査

**Sources Consulted**:
- `docs/design/api/api_issue_management.md` - API設計書
- `backend/src/controllers/projectController.ts` - 既存Controllerパターン
- `backend/src/services/projectService.ts` - 既存Serviceパターン
- `backend/src/middleware/*` - 認証・認可ミドルウェア

**Findings**:
- 問題報告API（5エンドポイント）は2026-01-27に実装完了
- テストカバレッジ: 103件すべてPASS
- 実装済みAPI:
  1. POST /api/v1/issues - 問題報告
  2. POST /api/v1/issues/:issueId/comments - コメント投稿
  3. GET /api/v1/issues - 問題一覧取得
  4. GET /api/v1/issues/:issueId - 問題詳細取得
  5. PATCH /api/v1/issues/:issueId/status - ステータス変更

**Implications**: 
- 新規実装ではなく、既存実装の設計書を後付けで作成するタスク
- 実装ファイル: `backend/src/routes/issueRoutes.ts`, `backend/src/controllers/issueController.ts`, `backend/src/services/issueService.ts`
- テストファイル: `backend/tests/routes/issueRoutes.test.ts` 他

### Topic 2: アーキテクチャパターンの確認

**Context**: プロジェクトの標準的なアーキテクチャパターンを理解

**Sources Consulted**:
- 既存Controller実装（projectController.ts）
- 既存Service実装（projectService.ts）
- 既存Repository実装（projectRepository.ts）

**Findings**:
- **レイヤードアーキテクチャ**を採用:
  ```
  Routes → Middleware Chain → Controller → Service → Repository → Database
  ```
- **ミドルウェアチェーン**の標準順序:
  1. `auth` - JWT認証
  2. `tenantIsolation` - マルチテナント分離
  3. `permissionCheck(['role'])` - 権限チェック
  4. Controller handler

- **統一レスポンス形式**:
  ```typescript
  {
    success: boolean;
    data?: T;
    error?: { code: string; message: string; details?: any[] };
    meta: { timestamp: string; requestId: string };
    pagination?: { ... }
  }
  ```

**Implications**: 問題報告APIも同じパターンに準拠して実装されている

### Topic 3: セキュリティ要件の確認

**Context**: マルチテナント分離、認証・認可の実装パターン

**Sources Consulted**:
- `backend/src/middleware/auth.ts` - JWT認証
- `backend/src/middleware/tenantIsolation.ts` - テナント分離
- `backend/src/middleware/permissionCheck.ts` - 権限チェック

**Findings**:
- **JWT + Session Hybrid認証**: 
  - トークン形式: `maiml_session-{id}_{timestamp}`
  - HTTPOnly Cookie使用
  - ロール別有効期限（Admin: 48h、Manager: 24h、Worker: 12h）

- **マルチテナント分離**:
  - すべてのDBクエリに`organization_id`フィルタ必須
  - req.organizationIdをミドルウェアで設定
  - クロステナントアクセス防止（404エラー）

- **RBAC**:
  - 3レベル: Admin（全権限）、Manager（組織内管理）、Worker（タスク実行）
  - permissionCheck(['worker', 'manager', 'admin'])で制御

**Implications**: 問題報告APIは Worker以上の権限が必要

### Topic 4: データベーススキーマの確認

**Context**: issuesテーブルの構造とリレーションシップ

**Sources Consulted**:
- `docs/design/api/api_issue_management.md` - SQL例
- `docs/design/db/db_table_list.md` - テーブル一覧

**Findings**:
- **issuesテーブル** (主要カラム):
  - id (UUID, PK)
  - organization_id (UUID, FK) - マルチテナント分離キー
  - project_id (UUID, FK)
  - method_id (string)
  - task_no (integer)
  - transition_id (string, nullable)
  - issue_type (enum: material_shortage, equipment_failure, etc.)
  - target_type (enum: project, task, transition)
  - title (varchar 200)
  - description (varchar 2000)
  - status (enum: unresolved, resolved)
  - reported_by (UUID, FK)
  - reported_at (timestamp)

- **issue_commentsテーブル**:
  - id (UUID, PK)
  - issue_id (UUID, FK)
  - comment (varchar 2000)
  - user_id (UUID, FK)
  - created_at (timestamp)

- **インデックス**:
  - (organization_id, project_id, status) - 複合インデックス
  - (organization_id, created_at)
  - (issue_id, created_at) on issue_comments

**Implications**: 
- 3レベルの問題対象（プロジェクト、タスク、トランジション）をサポート
- 問題種別は9種類をサポート

### Topic 5: バリデーションルールの確認

**Context**: 入力値検証の実装パターン

**Findings**:
- **必須フィールドバリデーション**:
  - projectId: UUID形式必須
  - issueType: 9種類の許可値（material_shortage等）
  - targetType: project/task/transition
  - title: 1-200文字
  - description: 1-2000文字

- **条件付き必須**:
  - targetType='task' → methodId, taskNo必須
  - targetType='transition' → methodId, taskNo, transitionId必須

- **データ整合性チェック**:
  - projectIdの存在確認（organization_idフィルタ付き）
  - methodIdの存在確認（project_task_detailテーブル）
  - taskNoの存在確認

**Implications**: 複雑なバリデーションロジックがService層に実装済み

## Architecture Pattern Evaluation

既存実装は以下のパターンを採用しており、変更は不要：

| Pattern | Description | Suitability | Notes |
|---------|-------------|-------------|-------|
| Layered Architecture | Routes → Middleware → Controller → Service → Repository | ✅ 最適 | 既存プロジェクト標準に準拠 |
| Repository Pattern | データアクセス抽象化 | ✅ 最適 | トランザクション管理が容易 |
| Service Layer | ビジネスロジック集約 | ✅ 最適 | テスト容易性が高い |
| Middleware Chain | 横断的関心事の分離 | ✅ 最適 | 認証・認可・テナント分離を明確に分離 |

## Design Decisions

### Decision 1: Controller-Service-Repository パターンの踏襲

**Context**: 既存プロジェクトのアーキテクチャパターンを調査

**Alternatives Considered**:
1. 新規パターンの導入 - 既存コードとの一貫性が損なわれる
2. 既存パターンの踏襲 - 学習コスト低、保守性高

**Selected Approach**: 既存パターンを完全に踏襲

**Rationale**: 
- プロジェクト全体の一貫性を保つ
- 開発者の学習コストを最小化
- テスト・デバッグパターンが確立済み

**Trade-offs**:
- 利点: 一貫性、保守性、拡張性
- 欠点: 特になし（パターンは十分に検証済み）

### Decision 2: マルチテナント分離の徹底

**Context**: すべてのDBクエリでorganization_idフィルタが必須

**Selected Approach**: 
- Controllerレベルでreq.organizationIdを取得
- Serviceレベルですべてのクエリにorganization_idを渡す
- Repository/直接クエリでParameterized Queryを使用

**Rationale**:
- データ漏洩リスクの完全排除
- セキュリティ要件への準拠
- 監査証跡の明確化

**Trade-offs**:
- 利点: セキュリティ、コンプライアンス
- 欠点: 若干のパフォーマンスオーバーヘッド（許容範囲）

### Decision 3: 統一レスポンス形式の維持

**Context**: APIレスポンス形式の標準化

**Selected Approach**: 
```typescript
{
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: any[] };
  meta: { timestamp: string; requestId: string };
}
```

**Rationale**:
- フロントエンド開発の一貫性
- エラーハンドリングの統一
- デバッグ・監査の容易性

**Trade-offs**:
- 利点: 一貫性、保守性、デバッグ容易性
- 欠点: レスポンスサイズがやや大きい（許容範囲）

## Risks & Mitigations

- **Risk 1**: 既存実装との整合性 - **Mitigation**: 実装ファイルを参照して正確性を確保
- **Risk 2**: テーブルスキーマの変更 - **Mitigation**: DDLファイルで最新スキーマを確認
- **Risk 3**: 権限設計の齟齬 - **Mitigation**: permissionCheckミドルウェアの実装を確認

## References

### Official Documentation
- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一ルール
- [バックエンド規約](../../.clinerules/development/backend.md) - 実装規約
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティ要件

### Existing Implementation
- [問題管理API設計書](../../design/api/api_issue_management.md) - 既存API仕様
- `backend/src/routes/issueRoutes.ts` - ルート定義
- `backend/src/controllers/issueController.ts` - コントローラー実装
- `backend/src/services/issueService.ts` - サービス層実装
- `backend/tests/routes/issueRoutes.test.ts` - テストコード

### Database Schema
- [データベース構造](../../.clinerules/references/db_structure.md) - DB設計
- [テーブル一覧](../../design/db/db_table_list.md) - 全テーブル定義
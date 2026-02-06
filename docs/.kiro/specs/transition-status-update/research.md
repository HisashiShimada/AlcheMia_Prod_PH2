# Research Log: トランジション状態更新機能

## メタデータ
- **作成日時**: 2026-02-03 14:22
- **仕様ID**: transition-status-update
- **言語**: ja
- **Discovery Type**: Light (Extension of existing system)

## Summary

本仕様は既存の実験記録システムに対するステータス管理機能の拡張である。現在のシステムでは、トランジションの実行記録は保存されるが、ステータスフィールドが存在せず、作業者が作業の進行状況を明確に表現できない問題がある。

### Discovery Scope
- **分類**: Extension（既存システムの拡張）
- **複雑度**: Medium（データモデル拡張 + API修正 + UI更新）
- **発見プロセス**: Light Discovery（既存パターン分析と統合ポイント確認）

### Key Findings
1. **既存のステータス管理パターン**: プロジェクトとタスクに既存のステータス列があり、同様のパターンを適用可能
2. **履歴管理の要件**: ステータス変更履歴をトラッキングする必要性を確認
3. **UI統合ポイント**: 実験データ記録モーダルとの統合が必要

---

## Research Log

### 1. Existing Status Management Patterns

**Investigation Date**: 2026-02-03

**Context**: 既存システムでのステータス管理パターンの調査

**Findings**:

#### Database Schema Analysis
```sql
-- projects テーブル
status VARCHAR(20) DEFAULT 'draft'
CHECK (status IN ('draft', 'active', 'completed', 'archived'))

-- project_tasks テーブル  
status VARCHAR(20) DEFAULT 'pending'
CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold'))
```

#### Status Transition Patterns
- **プロジェクト**: draft → active → completed → archived
- **タスク**: pending → in_progress → completed（または on_hold）
- **共通特性**: VARCHAR(20)型、CHECK制約による値の制限

**Sources**:
- `backend/src/database/schema.sql`
- `backend/src/services/projectService.ts`

**Implications**:
- トランジションにも同様のステータス列を追加すべき
- CHECK制約でステータス値を制限
- 既存パターンに従うことで実装コストを削減

---

### 2. Transition Data Model Investigation

**Investigation Date**: 2026-02-03

**Context**: experiment_recordテーブルとtransition_execution_recordテーブルの現状分析

**Findings**:

#### Current Schema
```sql
CREATE TABLE experiment_record (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    experiment_name VARCHAR(255),
    method_id VARCHAR(50),
    transition_id VARCHAR(50),
    -- ステータス列は存在しない
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_by INTEGER REFERENCES organization_user(id)
);
```

#### Missing Elements
1. **Status Column**: 作業状況を表す列がない
2. **Status History**: ステータス変更履歴の記録機能がない
3. **Acknowledgment Tracking**: 指示確認の記録が別テーブル（instruction_acknowledged_history）に分離

**Sources**:
- `backend/migrations/20260131_create_instruction_acknowledged_history.sql`
- 既存のデータベーススキーマ

**Implications**:
- experiment_recordテーブルにstatus列の追加が必要
- マイグレーションスクリプトの作成が必要
- 既存データの互換性を考慮（DEFAULT値の設定）

---

### 3. API Integration Points

**Investigation Date**: 2026-02-03

**Context**: 実験記録APIの現状と統合ポイントの確認

**Findings**:

#### Current API Endpoints
```typescript
// projectRoutes.ts
router.post('/projects/:projectId/experiments/records',
  auth,
  tenantIsolation,
  permissionCheck(['experiment_worker']),
  projectController.createExperimentRecord
);

router.get('/projects/:projectId/experiments/records',
  auth,
  tenantIsolation,
  permissionCheck(['experiment_worker', 'experiment_admin']),
  projectController.listExperimentRecords
);
```

#### Required Changes
1. **POST endpoint**: リクエストボディにstatusフィールドを追加
2. **PATCH endpoint**: 新規作成（ステータス更新専用）
3. **バリデーション**: ステータス値の検証ロジック追加

**Sources**:
- `backend/src/routes/projectRoutes.ts`
- `backend/src/services/projectService.ts`

**Implications**:
- 既存APIの後方互換性を維持
- 新しいPATCHエンドポイントの追加
- バリデーションミドルウェアの実装

---

### 4. UI Component Integration

**Investigation Date**: 2026-02-03

**Context**: フロントエンドの実験データ記録モーダルとの統合

**Findings**:

#### Current Component Structure
```typescript
// DataRecordDialog.tsx
interface DataRecordDialogProps {
  visible: boolean;
  projectId: string;
  methodId: string;
  transitionId: string;
  onClose: () => void;
  onSave: (data: ExperimentRecordData) => void;
}
```

#### Required UI Changes
1. **ステータス選択フィールド**: Radio/Select コンポーネント
2. **状態表示**: Badge/Tag コンポーネント
3. **状態遷移の可視化**: 進捗バーまたはステップ表示

**Ant Design Components**:
- `Radio.Group` または `Select`: ステータス選択UI
- `Badge`: ステータス表示
- `Steps`: ステータス遷移の可視化（オプション）

**Sources**:
- `frontend/src/components/experiment_worker/DataRecordDialog.tsx`
- `.clinerules/references/ui_policy.md`

**Implications**:
- Ant Design v6のコンポーネントを活用
- 既存のモーダルUIに統合
- デザイントークンを使用した一貫性のあるUI

---

## Architecture Pattern Evaluation

### Pattern: RESTful API with Status State Machine

**Pros**:
- ✅ 既存のAPI設計と一貫性がある
- ✅ ステータス遷移ロジックをバックエンドで制御可能
- ✅ 監査ログとの統合が容易

**Cons**:
- ⚠️ 複雑なステータス遷移ルールの実装が必要
- ⚠️ フロントエンドでのステータス同期が必要

**Decision**: 採用 - RESTful APIパターンは既存システムと一貫性があり、拡張性が高い

---

## Design Decisions

### 1. Status Values

**Decision**: 以下の7つのステータスを定義
- `initial`: 初期状態
- `preparing`: 準備状態
- `ready`: 準備完了状態
- `running`: 動作状態
- `paused`: 休止状態
- `completed`: 終状態
- `error`: 異常終了状態

**Rationale**:
- API仕様書（api_experiment_data.md）で定義されたステータスと一致
- 実験ワークフローの詳細な状態を表現
- 正常終了と異常終了を明確に区別
- 準備段階から実行段階までの段階的な状態遷移をサポート

### 2. Status Transition Rules

**Decision**: 以下の状態遷移を許可
- initial → preparing, completed, error
- preparing → ready, completed, error
- ready → ready, running, completed, error
- running → paused, completed, error
- paused → running, completed, error
- completed → （変更不可）
- error → （変更不可）

**Rationale**:
- 論理的な実験ワークフローを反映
- completed, errorステータスは最終状態として扱う
- ready状態の自己遷移は準備完了状態の維持を許可
- 各状態からcompletedまたはerrorへのスキップ遷移を許可（柔軟性確保）
- 誤操作を防ぐための制約

### 3. Database Migration Strategy

**Decision**: ALTER TABLEで既存テーブルに列を追加
- DEFAULT値を'initial'に設定
- CHECK制約でステータス値を制限（7つのステータス値）
- 既存レコードでexecuted_atが設定されているものは'completed'に更新
- 新規レコードは自動的にinitialに設定

**Rationale**:
- 既存データへの影響を最小化
- ダウンタイムなしでのデプロイが可能
- ロールバックが容易
- API仕様書で定義されたステータス体系と整合性を保つ

---

## Risks & Mitigation

### Risk 1: データ整合性の問題

**Risk**: 既存レコードのステータスがnot_startedになり、実際の状態と矛盾する可能性

**Mitigation**:
- マイグレーション後にデータクレンジングスクリプトを実行
- 既存レコードで`executed_at`が設定されているものは`completed`に更新
- データ検証レポートを生成

### Risk 2: APIの後方互換性

**Risk**: ステータスフィールドの追加により既存クライアントが影響を受ける可能性

**Mitigation**:
- statusフィールドをオプショナルに設定
- 未指定の場合はデフォルト値('not_started')を使用
- APIバージョニングは不要（破壊的変更ではない）

### Risk 3: UIの複雑化

**Risk**: ステータス選択UIの追加により既存モーダルが複雑になる可能性

**Mitigation**:
- シンプルなRadio.Group UIを使用
- デフォルト値('in_progress')を設定して入力負荷を軽減
- ステータス変更は別途編集機能として提供

---

## Technology Alignment

### Backend
- **ORM/Query Builder**: Kysely（既存パターンを踏襲）
- **Validation**: express-validator
- **Type Safety**: TypeScript strict mode

### Frontend
- **UI Components**: Ant Design v6
- **State Management**: React Hooks (useState, useEffect)
- **API Client**: Axios（既存のapiService.ts）

### Database
- **RDBMS**: PostgreSQL 18+
- **Migration Tool**: Raw SQL scripts
- **Schema Validation**: CHECK constraints

---

## Parallelization Opportunities

### Independent Tasks
1. **Backend Implementation**: API + Service + Repository layers
2. **Frontend Implementation**: UI components + API integration
3. **Database Migration**: Schema changes + data migration script
4. **Documentation**: API docs + User guide

### Dependencies
- Database migration must complete before backend testing
- Backend API must be stable before frontend integration
- All components must be complete before E2E testing

### Recommended Approach
- **Phase 1**: Database migration + Backend API (parallel)
- **Phase 2**: Frontend UI (depends on Phase 1)
- **Phase 3**: Integration testing + Documentation (depends on Phase 2)

---

## Open Questions

### Q1: ステータス変更履歴の記録
**Question**: ステータス変更の履歴を別テーブルで管理すべきか？

**Status**: Deferred（将来機能として検討）

**Rationale**: 初期実装では現在のステータスのみを記録し、履歴管理は監査ログで代替可能

### Q2: バルク更新機能
**Question**: 複数トランジションのステータスを一括更新する機能は必要か？

**Status**: Out of Scope（現時点では不要）

**Rationale**: 要件書に記載がなく、初期実装では個別更新のみをサポート

---

## References

### Internal Documentation
- `.clinerules/development/backend.md` - Backend coding standards
- `.clinerules/development/frontend.md` - Frontend coding standards
- `.clinerules/development/security.md` - Security guidelines
- `docs/design/api/api_experiment_data.md` - Experiment data API specification

### External Resources
- [PostgreSQL CHECK Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Ant Design Radio Component](https://ant.design/components/radio/)
- [Express Validator](https://express-validator.github.io/docs/)

---

## Conclusion

本調査により、トランジション状態更新機能の実装に必要な技術的詳細が明確になった。既存のステータス管理パターンを踏襲することで、実装コストを最小化しつつ、作業者の要求を満たす機能を提供できる。

主要な設計判断:
1. ✅ RESTful APIパターンの採用
2. ✅ 4つのステータス値の定義
3. ✅ ALTER TABLEによるスキーマ拡張
4. ✅ Ant Design v6コンポーネントの活用

次のステップ: design.mdでの詳細設計へ進む
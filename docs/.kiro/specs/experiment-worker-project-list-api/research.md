# Research & Design Decisions

---
**Feature**: `experiment-worker-project-list-api`
**Discovery Scope**: Extension
**Created**: 2026-01-27T20:20:55+09:00
---

## Summary

### Discovery Scope
**Extension** - 既存のプロジェクト管理APIシステムに新しいエンドポイントを追加

### Key Findings
1. 既存のプロジェクト一覧API（GET /api/v1/projects）のパターンを踏襲
2. ステータスフィルタを `pending`, `in_progress`, `review_waiting` の3つに限定
3. タスク進捗情報・指示情報は不要（シンプル化）
4. マルチテナント分離とRBACは既存ミドルウェアチェーンで実現

## Research Log

### 既存API構造の分析

**Context**: 実験作業者用プロジェクト一覧APIの実装方式を決定するため、既存のプロジェクト管理API構造を調査

**Sources Consulted**:
- `docs/design/api/api_project_management.md` - プロジェクト管理API仕様書 (Section 2.1, 2.16)
- `backend/src/routes/projectRoutes.ts` - 既存ルート定義
- `backend/src/controllers/projectController.ts` - 既存コントローラー実装
- `backend/src/services/projectService.ts` - 既存サービス層実装

**Findings**:
- 既存のGET /api/v1/projectsエンドポイントは実験管理者向け
- ミドルウェアチェーン: `auth → permissionCheck(['experiment_admin', 'system_admin'])`
- レスポンス形式は統一APIレスポンス構造に準拠
- ページネーション、ソート、フィルタリング機能を標準装備
- マルチテナント分離: すべてのクエリに `organization_id` フィルタ必須

**Implications**:
- 新APIは既存パターンを踏襲し、権限チェックのロールのみ変更
- コントローラー・サービス層のロジックを再利用可能
- 同じレスポンス形式により、フロントエンド実装が統一される

### ロール別アクセス制御の要件

**Context**: 実験作業者、実験管理者、システム管理者のアクセス権限を明確化

**Sources Consulted**:
- `.clinerules/development/security.md` - セキュリティ規約
- `docs/design/api/api_project_management.md` - 既存API権限要件

**Findings**:
- `experiment_worker`: 自分に割り当てられたタスクがあるプロジェクトのみ閲覧可能
- `experiment_admin`: 所属組織内の全プロジェクト閲覧可能
- `system_admin`: 全組織のプロジェクト閲覧可能（ただし現在の組織コンテキストに限定）

**Implications**:
- permissionCheckミドルウェアで3ロールすべてを許可
- サービス層でロール別のフィルタリングロジックを実装
- セキュリティ: experiment_workerは必ずproject_taskテーブルとJOINして自分のタスクに限定

### プロジェクトステータス制限

**Context**: フィードバックにより、ステータスを `pending`, `in_progress`, `review_waiting` に限定

**Sources Consulted**:
- `docs/design/db/db_table_list.md` - プロジェクトテーブル定義
- 要件フィードバック (2026-01-27)

**Findings**:
- 対象ステータス: `pending` (開始前), `in_progress` (進行中), `review_waiting` (レビュー待ち)
- 除外ステータス: `draft` (下書き), `completed` (完了), `archived` (アーカイブ)
- デフォルト動作: statusパラメータ未指定時は3つのステータスすべてを返却

**Implications**:
- WHERE句に `project_status IN ('pending', 'in_progress', 'review_waiting')` を追加
- フィルタリング機能でも同じ3つのステータスのみサポート
- バリデーションで無効なステータス値をエラー化

### データ簡素化の決定

**Context**: 初期要件にあったタスク進捗情報と指示・問題情報が不要と判明

**Sources Consulted**:
- 要件フィードバック (2026-01-27)
- `requirements.md` - Requirement 2, 3削除

**Findings**:
- 削除された情報:
  - my_task_count（自分のタスク総数）
  - completed_task_count（完了済みタスク数）
  - pending_instruction_count（未確認指示数）
  - has_unresolved_issues（未解決問題の有無）
- 保持する情報:
  - 基本情報（project_id, project_name, description, project_status）
  - 日時情報（created_at, updated_at）

**Implications**:
- クエリが大幅に簡素化される（集計サブクエリ不要）
- パフォーマンスが向上（JOINとCOUNTが削減）
- レスポンスサイズが小さくなる

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン踏襲 | GET /api/v1/projectsと同じ構造を使用 | 実装コスト低、保守性高、一貫性 | なし | 推奨 ✅ |
| 独自エンドポイント設計 | 完全に新規の構造で実装 | 柔軟性 | 実装コスト高、一貫性損失 | 非推奨 ❌ |

**選択**: 既存パターン踏襲

## Design Decisions

### Decision: ロール別フィルタリングロジックの配置

**Context**: experiment_workerは自分のタスクがあるプロジェクトのみ、その他は全プロジェクトを返却する必要がある

**Alternatives Considered**:
1. **サービス層で分岐** - サービスメソッド内でロール判定してクエリを構築
2. **ミドルウェアで前処理** - 専用ミドルウェアでアクセス可能なproject_idリストを計算
3. **複数メソッド** - ロール別に異なるサービスメソッドを用意

**Selected Approach**: サービス層で分岐

**Rationale**:
- 既存のプロジェクト管理APIと同じパターン
- ロジックが1箇所に集約されて保守性が高い
- ミドルウェアは認証・認可に専念できる

**Trade-offs**:
- Benefits: シンプルな実装、既存パターンとの一貫性
- Compromises: サービス層の責務がやや増える（許容範囲）

**Follow-up**: 実装時にパフォーマンステスト（特にexperiment_workerでのJOIN）

### Decision: ステータスフィルタのデフォルト動作

**Context**: statusパラメータ未指定時の挙動を決定

**Alternatives Considered**:
1. **全ステータスを返す** - フィルタなしで全プロジェクトを返却
2. **3つのステータスのみ返す** - `pending`, `in_progress`, `review_waiting`をデフォルトとする

**Selected Approach**: 3つのステータスのみ返す（Option 2）

**Rationale**:
- 要件で「デフォルトで `pending`, `in_progress`, `review_waiting` のプロジェクトを返却する」と明記
- 実験作業が実施できるプロジェクトに限定する意図を反映
- ユーザーが誤って完了/アーカイブプロジェクトを選択するリスクを回避

**Trade-offs**:
- Benefits: ユーザビリティ向上、誤操作防止
- Compromises: すべてのプロジェクトを見るにはstatusパラメータが必要（実験作業者には不要な操作）

**Follow-up**: フロントエンドでstatusフィルタUIを実装する際は3つの選択肢のみ表示

### Decision: ページネーションのデフォルト値

**Context**: 既存APIと統一するか、独自の値を設定するか

**Alternatives Considered**:
1. **既存と同じ** - page=1, limit=20
2. **独自設定** - limit=50など大きめの値

**Selected Approach**: 既存と同じ（page=1, limit=20）

**Rationale**:
- API全体で統一されたUXを提供
- コンボボックス用途では20件で十分（通常は数件〜十数件程度）
- パフォーマンス最適化

**Trade-offs**:
- Benefits: 一貫性、パフォーマンス
- Compromises: なし

**Follow-up**: なし

## Risks & Mitigations

**Risk 1**: experiment_workerロールでのパフォーマンス低下（project_taskテーブルとのJOIN）
- **Mitigation**: project_taskテーブルの `assign_user_id` と `project_id` に複合インデックスを確認
- **Mitigation**: 必要に応じてEXPLAIN ANALYZEでクエリプラン最適化

**Risk 2**: ロール判定ロジックのバグによるデータ漏洩
- **Mitigation**: 単体テストでロール別のアクセス制御を網羅的にテスト
- **Mitigation**: 統合テストでクロステナントアクセスをチェック

**Risk 3**: 既存APIとの命名・動作の不整合
- **Mitigation**: レビュー時に既存API（GET /api/v1/projects）との差異を明確化
- **Mitigation**: OpenAPI仕様書で両APIの違いを文書化

## References

- [プロジェクト管理API仕様書](../../design/api/api_project_management.md) - 既存API構造とパターン
- [バックエンド規約](../../.clinerules/development/backend.md) - 実装規約
- [セキュリティ規約](../../.clinerules/development/security.md) - マルチテナント分離とRBAC
- [API設計ポリシー](../../.clinerules/development/api.md) - RESTful設計原則
- [データベース構造](../../.clinerules/references/db_structure.md) - テーブル定義
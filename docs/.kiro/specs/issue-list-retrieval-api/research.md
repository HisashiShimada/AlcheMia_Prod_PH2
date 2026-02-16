# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.
---

## Summary
- **Feature**: issue-list-retrieval-api
- **Discovery Scope**: Extension
- **Key Findings**:
  - 既存の問題管理システムの拡張（GET /api/v1/issues エンドポイントの実装）
  - 既存のissueRoutes.ts、issueController.ts、issueService.ts に機能を追加
  - 複雑なフィルタリングロジック（issue_targetに基づく条件分岐）が必要
  - パフォーマンス最適化のため、JOINクエリとN+1問題の回避が重要

## Research Log

### 既存システムとの統合ポイント

**Context**: 問題管理APIの一覧取得機能を既存システムに追加する必要がある

**Sources Consulted**:
- `docs/design/api/api_issue_management.md` - Section 3（問題一覧取得API仕様）
- `backend/src/routes/issueRoutes.ts` - 既存ルート定義
- `backend/src/controllers/issueController.ts` - 既存コントローラーパターン
- `backend/src/services/issueService.ts` - 既存サービス層パターン

**Findings**:
- 問題管理APIは既に5エンドポイント中4エンドポイントが実装済み（テスト103件PASS）
- 認証・認可ミドルウェアチェーン（auth → tenantIsolation → permissionCheck）が確立
- レスポンス形式は統一されたAPIResponse<T>型を使用
- Parameterized Queriesによる安全なDB操作が標準

**Implications**:
- 既存の実装パターンに従うことで一貫性を保てる
- ミドルウェアチェーンを再利用することでセキュリティを確保
- 既存のエラーハンドリングパターンを踏襲

### 複雑なフィルタリングロジックの実装方針

**Context**: issue_target（問題対象種別）に基づく動的フィルタリングが必要

**Sources Consulted**:
- `docs/design/api/api_issue_management.md` - Section 3のSQL例
- PostgreSQL公式ドキュメント - 条件分岐クエリ

**Findings**:
- issue_targetの値（'project', 'task', 'transition'）によってフィルタリング条件が変わる
  - 'project': project_idのみで一致判定
  - 'task': project_id + method_id + task_noで一致判定
  - 'transition': project_id + method_id + transition_idで一致判定
- OR条件を使用した効率的なクエリ構造が推奨される
- すべてのパラメータ（project_id, method_id, task_no, transition_id）は必須

**Implications**:
- 単一のSQLクエリで3パターンのフィルタリングを実現可能
- Parameterized Queriesでセキュリティを維持
- インデックス（organization_id, project_id, status）を活用した高速化

### コメント取得の親子関係実装

**Context**: 各問題に紐づくコメントを効率的に取得し、親子関係として構築する必要がある

**Sources Consulted**:
- `docs/design/api/api_issue_management.md` - コメント取得のSQL例
- N+1問題に関するベストプラクティス

**Findings**:
- 問題一覧を取得後、別クエリでコメントをまとめて取得する2段階アプローチ
- issue_id IN (...)を使用してバッチ取得することでN+1問題を回避
- コメントはsequence_no昇順でソート
- メモリ上で問題IDをキーにコメントをグループ化

**Implications**:
- データベースアクセスは2回のみ（問題一覧 + コメント一括取得）
- アプリケーション層でのデータ結合処理が必要
- パフォーマンス最適化とコードの可読性のバランスが取れる

### JOINによるユーザー名取得の最適化

**Context**: 報告者名、コメント投稿者名を効率的に取得する必要がある

**Sources Consulted**:
- 既存の実装パターン（issueService.ts）
- PostgreSQL JOIN性能ベストプラクティス

**Findings**:
- organization_userテーブルとのJOINで一度にユーザー名を取得
- マルチテナント分離のため、JOINにもorganization_idフィルタが必要
- projectsテーブルとのJOINでプロジェクト名も同時取得

**Implications**:
- 追加のクエリなしでユーザー名・プロジェクト名を取得可能
- organization_idによる適切なインデックス利用

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン踏襲 | issueService.tsに新メソッドlist()を追加 | 一貫性、保守性、既存テストとの統合容易 | なし | 推奨：既存の4エンドポイントと同様の構造 |
| 新サービス作成 | IssueListService.tsを別途作成 | 責任分離 | 過剰設計、不要な複雑化 | 非推奨：単純なCRUD操作に不適切 |

## Design Decisions

### Decision: 2段階クエリアプローチによるコメント取得

**Context**: 各問題に紐づくコメントを親子関係として取得する必要がある

**Alternatives Considered**:
1. **LEFT JOINで一括取得** - 問題とコメントをJOINして1クエリで取得
2. **2段階クエリ** - 問題一覧取得後、コメントを別クエリで一括取得

**Selected Approach**: 2段階クエリ

**Rationale**:
- LEFT JOINでは問題1件にコメントN件ある場合、N行返却されデータ重複が発生
- アプリケーション層でのグループ化が複雑になる
- 2段階クエリではデータ重複なし、処理が明確
- IN句によるバッチ取得でN+1問題を回避

**Trade-offs**:
- **Benefits**: データ重複なし、コードの可読性高、デバッグ容易
- **Compromises**: クエリ2回実行（ただし、適切なインデックスで性能問題なし）

**Follow-up**: 問題件数が100件を超える場合、ページネーション実装を検討

### Decision: すべてのクエリパラメータを必須化

**Context**: フィルタリングの柔軟性とデータベース負荷のバランス

**Alternatives Considered**:
1. **project_idのみ必須** - 他はオプショナル
2. **すべて必須** - project_id, method_id, task_no, transition_idすべて必須

**Selected Approach**: すべて必須

**Rationale**:
- API仕様書（api_issue_management.md Section 3）で明確に必須と定義
- フロントエンドは実験作業者画面で必ず特定のタスク/トランジションを選択済み
- 必須化することでデータベースクエリを最適化可能
- インデックス活用による高速化

**Trade-offs**:
- **Benefits**: クエリ性能向上、明確なAPI仕様、誤用防止
- **Compromises**: 呼び出し側で常にすべてのパラメータを指定する必要がある

**Follow-up**: なし（要件に合致）

### Decision: ステータスとissue_typeのフィルタはオプショナル

**Context**: 追加フィルタリング条件の扱い

**Alternatives Considered**:
1. **必須化** - すべてのフィルタを必須にする
2. **オプショナル** - statusとissue_typeはオプショナル

**Selected Approach**: オプショナル

**Rationale**:
- 要件では明示的にオプショナルと定義
- ユーザーがすべての問題を表示したい場合もある
- SQLのIS NULL チェックで柔軟に対応可能

**Trade-offs**:
- **Benefits**: 柔軟なフィルタリング、ユーザビリティ向上
- **Compromises**: クエリが若干複雑化（ただし、影響は軽微）

**Follow-up**: なし

## Risks & Mitigations

### Risk 1: N+1問題によるパフォーマンス劣化
**Mitigation**: 
- 問題一覧とコメントを2段階クエリで取得し、IN句でバッチ取得
- 適切なインデックス（issue_comment.issue_id）を使用

### Risk 2: 大量データによるメモリ不足
**Mitigation**:
- 現時点ではページネーション未実装だが、100件以下の問題では問題なし
- 将来的にページネーション実装を検討（要件外）

### Risk 3: issue_targetに基づくフィルタリングロジックの複雑性
**Mitigation**:
- OR条件による明確な分岐ロジック
- 十分なユニットテストでカバー（要件7の各ケースをテスト）

### Risk 4: マルチテナント分離の実装漏れ
**Mitigation**:
- すべてのJOINにorganization_idフィルタを適用
- tenantIsolationミドルウェアによる二重チェック
- テストで他組織データへのアクセスを検証

## References

- [API設計書 - 問題管理API](../../design/api/api_issue_management.md) - Section 3: 問題一覧取得API仕様
- [API設計ポリシー](../../.clinerules/development/api.md) - RESTful API設計原則
- [バックエンド規約](../../.clinerules/development/backend.md) - SQL管理、エラーハンドリング
- [セキュリティ規約](../../.clinerules/development/security.md) - マルチテナント分離、認証・認可
- [データベース構造](../../.clinerules/references/db_structure.md) - issueテーブル、issue_commentテーブル
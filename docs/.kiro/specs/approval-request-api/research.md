# Research & Design Decisions: 承認依頼API

---
**Purpose**: 承認依頼API実装のための調査結果と設計判断を記録

**Usage**: 技術設計（design.md）の根拠となる調査結果を文書化
---

## Summary
- **Feature**: approval-request-api
- **Discovery Scope**: Extension / Simple Addition
- **Key Findings**:
  - 既存のapi_project_management.mdに詳細仕様が定義済み
  - 類似機能（task-instruction-api）の設計パターンを適用可能
  - 既存のミドルウェアチェーン、認証・認可パターンを踏襲

## Research Log

### 既存API仕様の確認
- **Context**: api_project_management.mdに承認依頼APIの仕様が既に記載されているか確認
- **Sources Consulted**: 
  - `docs/design/api/api_project_management.md`（セクション13: 承認依頼）
- **Findings**:
  - エンドポイント: `POST /api/v1/projects/:projectId/approval-request`
  - 詳細なリクエスト/レスポンス仕様が定義済み
  - ビジネスロジック（前提条件チェック）も明記済み
  - 未実装（優先度: 高）
- **Implications**: 
  - 新規設計ではなく、既存仕様の実装設計を作成
  - API契約は確定済みのため、内部実装に集中できる

### 類似機能の設計パターン分析
- **Context**: 同様のプロジェクト管理APIの実装パターンを参照
- **Sources Consulted**: 
  - `docs/.kiro/specs/task-instruction-api/design.md`
  - `docs/design/api/api_project_management.md`（チェックイン/チェックアウトAPI）
- **Findings**:
  - Layered Architecture (Routes → Controller → Service → Repository)
  - ミドルウェアチェーン: auth → tenantIsolation → permissionCheck
  - Kysely Query Builderによる型安全なDB操作
  - トランザクション管理パターン（複数テーブル更新時）
  - 統一されたレスポンス形式
- **Implications**: 
  - 同じアーキテクチャパターンを適用
  - 既存のミドルウェア、リポジトリパターンを再利用
  - コード一貫性の維持

### 既存実装パターンの確認
- **Context**: 実装時に参照する既存コンポーネント
- **Sources Consulted**: 
  - `backend/src/middleware/` ディレクトリ
  - `backend/src/routes/projectRoutes.ts` （推定）
  - `backend/src/services/projectService.ts` （推定）
- **Findings**:
  - authMiddleware.ts: JWT認証とセッション検証
  - errorHandlerMiddleware.ts: 統一エラーハンドリング
  - rateLimitMiddleware.ts: レート制限
  - プロジェクト管理機能が既に実装済み（8/14 API）
- **Implications**: 
  - 既存のミドルウェアをそのまま使用可能
  - ProjectServiceへのメソッド追加で実装
  - 既存のエラーハンドリングパターンを踏襲

### ビジネスロジックの検証ルール
- **Context**: 承認依頼前の前提条件チェック
- **Sources Consulted**: 
  - `docs/design/api/api_project_management.md`（セクション13のビジネスロジック）
- **Findings**:
  - プロジェクトステータスが `active` であることを確認
  - 確認失敗時は適切なエラーコード（409）を返却
- **Implications**: 
  - Service層でステータスチェック処理を実装
  - 明確なエラーメッセージを提供
  - トランザクション開始前に検証（早期失敗）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Layered Architecture | Routes → Controller → Service → Repository | 既存パターンと一致、責任分離明確 | なし | 既存プロジェクト管理APIと同じパターン |
| Transaction-per-Request | 単一リクエストでプロジェクトステータスを更新 | データ一貫性保証、ロールバック容易 | なし | シンプルなトランザクション |
| Service層での検証 | ビジネスルール検証をService層に集約 | コントローラーをシンプルに保つ、テストしやすい | なし | 既存パターンを踏襲 |

## Design Decisions

### Decision: プロジェクトステータス遷移
- **Context**: 承認依頼後のプロジェクトステータスをどう管理するか
- **Alternatives Considered**:
  1. `active` → `waiting_approval`（現在のステータスを更新）
  2. 新規フラグ `is_approval_requested` を追加
- **Selected Approach**: 
  - プロジェクトステータスを `waiting_approval` に更新
  - 既存の project_status カラムを使用
- **Rationale**: 
  - ステータス遷移が明確（active → waiting_approval → approved）
  - 追加カラム不要、既存スキーマを維持
  - フロントエンドでステータスベースのUI制御が容易
- **Trade-offs**: 
  - 利点: スキーマ変更不要、ステータス管理が統一的
  - 欠点: ステータス値の追加が必要（DBスキーマ確認必要）
- **Follow-up**: 
  - project_status の enum 値に `waiting_approval` が含まれているか確認
  - 含まれていない場合はマイグレーションが必要

### Decision: エラーハンドリング戦略
- **Context**: 複数の前提条件チェックで異なるエラーを返す
- **Alternatives Considered**:
  1. すべて400 Bad Requestで統一
  2. エラーの性質に応じて400/409を使い分け
- **Selected Approach**: 
  - バリデーションエラー（未完了タスク存在）: 400 Bad Request
  - ビジネスルール違反（ステータス不正、未解決問題）: 409 Conflict
- **Rationale**: 
  - HTTPステータスコードの意味論的な使い分け
  - クライアント側でエラーの種類を区別しやすい
  - 既存のAPI設計ポリシーに準拠
- **Trade-offs**: 
  - 利点: エラーの意味が明確、クライアント実装が容易
  - 欠点: エラーコード体系が若干複雑
- **Follow-up**: なし

## Risks & Mitigations

- **Risk 1**: project_status に `waiting_approval` 値が未定義
  - **Mitigation**: 実装前にDBスキーマを確認、必要であればマイグレーション実施

- **Risk 2**: プロジェクトステータス更新失敗時のロールバック
  - **Mitigation**: トランザクション内で実行、失敗時は全体ロールバック

## References

- [既存API仕様 - プロジェクト管理API](../../design/api/api_project_management.md)
- [類似機能設計 - タスク指示API](../task-instruction-api/design.md)
- [バックエンド規約](../../../.clinerules/development/backend.md)
- [API設計ポリシー](../../../.clinerules/development/api.md)
- [セキュリティ規約](../../../.clinerules/development/security.md)
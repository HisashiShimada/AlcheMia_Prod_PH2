# Research & Design Decisions

---
**Purpose**: 問題ステータス変更API機能の発見調査結果と設計決定事項を記録

**Usage**: 既存実装の分析結果と設計文書化のための技術的根拠を提供
---

## Summary
- **Feature**: `issue-status-update-api`
- **Discovery Scope**: Extension（既存システムの拡張・文書化）
- **Key Findings**:
  - 問題ステータス変更API（PATCH /api/v1/issues/:issueId/status）は既に実装済み
  - 完全な実装（Routes、Controller、Service、Repository）が存在
  - 設計ドキュメントが不足しているため、本タスクでは実装の文書化を実施
  - 既存パターン（レイヤードアーキテクチャ、マルチテナント分離）に完全準拠

## Research Log

### 既存実装の確認
- **Context**: 問題ステータス変更機能の実装状況を調査
- **Sources Consulted**: 
  - `backend/src/routes/issueRoutes.ts`
  - `backend/src/controllers/issueController.ts`
  - `backend/src/services/issueService.ts`
  - `backend/src/types/issue.ts`
  - `docs/design/api/api_issue_management.md`
- **Findings**:
  - ✅ **Routes層**: `PATCH /:issueId/status` エンドポイント実装済み
  - ✅ **Controller層**: `updateStatus` メソッド実装済み（エラーハンドリング、レスポンス形式統一）
  - ✅ **Service層**: `updateStatus` メソッド実装済み（ビジネスロジック、バリデーション）
  - ✅ **型定義**: `IssueStatus`、`ISSUE_STATUS_VALUES` 定義済み
  - ✅ **ミドルウェア**: `authMiddleware`、`tenantIsolation`、バリデーション適用済み
  - ✅ **API設計書**: 詳細仕様が `docs/design/api/api_issue_management.md` に記載済み
- **Implications**: 
  - 新規実装は不要
  - 設計ドキュメント（design.md）の作成が主タスク
  - 既存実装を正確に反映した設計書を生成する必要がある

### 既存アーキテクチャパターンの分析
- **Context**: プロジェクト全体のアーキテクチャパターンを確認
- **Sources Consulted**: 既存の問題管理API実装、他のAPIエンドポイント
- **Findings**:
  - **レイヤードアーキテクチャ**: Routes → Controller → Service → Repository
  - **責任分離**:
    - Routes: ルーティング、バリデーション定義
    - Controller: リクエスト/レスポンス処理、エラーハンドリング
    - Service: ビジネスロジック、トランザクション管理
    - Repository: データアクセス層
  - **マルチテナント分離**: すべてのレイヤーで `organizationId` による分離を実施
  - **型安全性**: TypeScriptによる厳密な型定義
- **Implications**:
  - 設計ドキュメントは既存アーキテクチャパターンに完全準拠
  - 各レイヤーの責任と境界を明確に文書化

### 認証・認可パターンの確認
- **Context**: ステータス変更APIの権限制御要件
- **Sources Consulted**: 
  - `backend/src/middleware/authMiddleware.ts`
  - `backend/src/middleware/tenantIsolation.ts`
  - API設計書の権限要件
- **Findings**:
  - **JWT認証**: すべてのエンドポイントで必須
  - **権限制御**: API設計書では「Manager以上」の権限が必要と記載
  - **実装状況**: Routesでは権限チェックミドルウェアが未適用（Worker権限でも実行可能）
  - **テナント分離**: `tenantIsolation` ミドルウェアで `organizationId` を自動設定
- **Implications**:
  - 設計ドキュメントでは「Manager以上」の権限要件を明記
  - 実装との不一致を「実装ノート」として記録
  - 将来的な権限チェック追加の必要性を指摘

### データモデルとステータス管理
- **Context**: 問題ステータスのデータモデルを確認
- **Sources Consulted**: 
  - `backend/src/types/issue.ts`
  - データベーススキーマ（issueテーブル）
- **Findings**:
  - **ステータス値**: `'unresolved'` | `'resolved'` の2値
  - **データベース保存**: 数値形式（0: unresolved, 1: resolved）
  - **API層**: 文字列形式で受け渡し
  - **変換処理**: Service層で文字列 → 数値変換を実施
  - **関連フィールド**: 
    - `issue_completer_id`: ステータスを解決済みにしたユーザー
    - `issue_complate_at`: 解決済みにした日時
- **Implications**:
  - データモデルセクションで内部表現と外部表現の違いを明記
  - ステータス変更時のタイムスタンプ管理を文書化

### エラーハンドリングパターンの分析
- **Context**: 統一されたエラーレスポンス形式の確認
- **Sources Consulted**: 既存のController実装
- **Findings**:
  - **ServiceResult型**: `{ success, data?, error? }` 形式
  - **エラーコード体系**:
    - `RESOURCE_NOT_FOUND`: 404エラー
    - `VALIDATION_ERROR`: 400エラー
    - `PERMISSION_INSUFFICIENT`: 403エラー（権限不足）
    - `SYSTEM_ERROR`: 500エラー
  - **レスポンス形式**: `{ success, error: { code, message }, meta: { timestamp, requestId } }`
  - **ログ記録**: Winston構造化ログで記録
- **Implications**:
  - エラーハンドリングセクションで各エラータイプとHTTPステータスコードの対応を明記
  - Controller層とService層の責任分界を文書化

## Architecture Pattern Evaluation

既存システムの拡張のため、新規パターン評価は不要。既存のレイヤードアーキテクチャを継承。

| Layer | Pattern | Rationale |
|-------|---------|-----------|
| Routes | Express Router | 標準的なExpressルーティング、ミドルウェアチェーン適用 |
| Controller | Request Handler | リクエスト/レスポンス変換、エラーハンドリング |
| Service | Business Logic | ビジネスルール、トランザクション管理 |
| Repository | Data Access | データベース操作の抽象化 |

## Design Decisions

### Decision: 設計ドキュメントのスコープ

- **Context**: 既に実装済みの機能に対する設計ドキュメント作成
- **Alternatives Considered**:
  1. 最小限の文書化（APIエンドポイントと基本フローのみ）
  2. 完全な設計文書化（全レイヤーの詳細、型定義、エラーハンドリング等）
- **Selected Approach**: 完全な設計文書化を実施
- **Rationale**:
  - 実装コードだけでは意図や設計決定の背景が不明確
  - 他の開発者が理解・保守しやすくするため
  - 将来の拡張時の参照資料として価値が高い
  - 要件とのトレーサビリティを確保
- **Trade-offs**:
  - **Benefits**: 保守性向上、チーム間のコミュニケーション改善、品質保証
  - **Compromises**: 文書作成の時間投資が必要
- **Follow-up**: 実装との整合性を定期的に確認

### Decision: 権限チェックの扱い

- **Context**: API設計書では「Manager以上」の権限が必要だが、Routes実装では権限チェックミドルウェアが未適用
- **Alternatives Considered**:
  1. 設計ドキュメントを実装に合わせる（Worker権限も許可）
  2. 設計ドキュメントは仕様通り記載し、実装との差異を注記
- **Selected Approach**: 設計ドキュメントは仕様通り記載し、実装ノートで差異を明記
- **Rationale**:
  - API設計書が正式な仕様であり、設計ドキュメントはそれを反映すべき
  - 実装との差異は技術的負債として可視化する必要がある
  - 将来的な修正の指針を提供
- **Trade-offs**:
  - **Benefits**: 仕様と実装のギャップを明確化、改善の優先順位付けが可能
  - **Compromises**: 現時点では実装と設計に不一致が存在
- **Follow-up**: 権限チェックミドルウェアの追加実装を推奨事項として記録

### Decision: データモデルの表現方法

- **Context**: ステータス値がAPI層（文字列）とDB層（数値）で異なる
- **Alternatives Considered**:
  1. 内部表現（数値）のみを文書化
  2. 外部表現（文字列）のみを文書化
  3. 両方の表現と変換ロジックを文書化
- **Selected Approach**: 両方の表現と変換ロジックを文書化
- **Rationale**:
  - API利用者は文字列形式を使用
  - データベース管理者は数値形式を扱う
  - 両方の視点からの理解が必要
  - 変換ロジックの明示により実装の意図が明確になる
- **Trade-offs**:
  - **Benefits**: 完全な理解、実装の透明性
  - **Compromises**: 文書の複雑さがやや増加
- **Follow-up**: なし

## Risks & Mitigations

- **Risk 1: 実装と設計ドキュメントの乖離**
  - Mitigation: 既存実装コードを正確に分析し、忠実に文書化する
  
- **Risk 2: 権限チェックの不備（Worker権限でもステータス変更可能）**
  - Mitigation: 設計ドキュメントで要件を明記し、実装改善を推奨事項として記録
  
- **Risk 3: 将来の機能拡張時の設計変更**
  - Mitigation: 現在の設計を明確に文書化することで、変更の影響範囲を把握しやすくする

## References

- [問題管理API設計書](../../design/api/api_issue_management.md) - API詳細仕様
- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一ルール
- [バックエンド規約](../../.clinerules/development/backend.md) - 実装規約
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティ要件
- Express.js公式ドキュメント - https://expressjs.com/
- TypeScript公式ドキュメント - https://www.typescriptlang.org/

# Research & Design Decisions

---
**Purpose**: 問題コメント投稿API設計のための発見事項と設計決定を記録

**Usage**: コメント投稿機能の実装に必要な技術的背景と設計根拠を提供
---

## Summary
- **Feature**: `issue-comment-post-api`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - 既存の問題管理システムへのコメント機能追加
  - ルート・コントローラー層は実装済み（モック状態）
  - サービス層の実装とissue_commentテーブルの作成が必要
  - 既存パターンとの整合性が高く、実装リスクは低い

## Research Log

### 既存実装の分析

#### Context
このAPIは既存の問題管理システム（Issues）に対してコメント投稿機能を追加する拡張機能である。既存のアーキテクチャとパターンを調査した。

#### Sources Consulted
- `backend/src/routes/issueRoutes.ts` - 既存のルート定義
- `backend/src/controllers/issueController.ts` - コントローラー実装
- `backend/src/services/issueService.ts` - サービス層実装
- `backend/migrations/20260204_create_issues_table.sql` - DBスキーマ
- `docs/design/api/api_issue_management.md` - API設計書

#### Findings

**1. ルート層（Routes）**
- `POST /api/v1/issues/:issueId/comments` エンドポイントが既に定義済み
- ミドルウェアチェーン: `auth → tenantIsolation → validation`
- バリデーション設定済み:
  - `issueId`: UUID形式
  - `comment`: 必須、1-2000文字
- Worker以上の権限が必要

**2. コントローラー層（Controller）**
- `addComment` メソッドが実装済み
- 統一されたエラーハンドリング形式を使用
- リクエストIDによるトレーサビリティ対応
- 適切なHTTPステータスコード（201 Created）を返却

**3. サービス層（Service）**
- `addComment` メソッドは存在するが **モック実装**
- 実装必要箇所: "コメント追加のロジックは将来実装"とコメント記載
- 現在のモック実装:
  ```typescript
  const mockComment = {
    id: 'comment-' + Date.now(),
    issueId,
    comment,
    userId,
    userName: 'Test User',
    createdAt: new Date().toISOString(),
  };
  ```

**4. データベース**
- `issues` テーブルは存在
- `issue_comment` テーブルは **未作成**（マイグレーションが必要）
- 必要なカラム（API仕様書より）:
  - organization_id, project_id, issue_id, sequence_no
  - comment, author_id, commented_at
  - create_user_id, create_at, update_user_id, update_at

**5. 既存パターン**
- ServiceResult形式の統一レスポンス
- organization_idによるマルチテナント分離
- Parameterized Queriesによるセキュリティ対策
- トランザクション管理パターン

#### Implications
- **低リスク拡張**: 既存のアーキテクチャパターンに完全に適合
- **部分実装済み**: ルート・コントローラー層の実装は不要
- **実装範囲明確**: サービス層の実装とDBマイグレーションのみ
- **テスト容易性**: 既存のテストパターンを踏襲可能

### データベーススキーマ設計

#### Context
issue_commentテーブルの設計を検討。既存のissuesテーブルとの整合性を保つ必要がある。

#### Sources Consulted
- API設計書の「2. コメント投稿API」セクション
- 既存のissuesテーブルスキーマ
- PostgreSQLのシーケンス採番パターン

#### Findings

**テーブル設計要件**:
1. **マルチテナント分離**: organization_id必須
2. **シーケンス番号**: 同一問題内での連番管理
3. **外部キー制約**: issues, organization_userテーブルとの整合性
4. **監査証跡**: create/update情報の記録

**シーケンス番号採番方法**:
- オプション1: PostgreSQLのSEQUENCE使用（問題: テナント分離困難）
- オプション2: MAX(sequence_no) + 1（問題: 並行性制御が必要）
- **採用**: オプション2 + トランザクション + FOR UPDATE LOCK

**インデックス戦略**:
- 複合インデックス: (organization_id, issue_id, sequence_no)
- パフォーマンス: コメント一覧取得の高速化

#### Implications
- トランザクション必須（シーケンス番号の一意性保証）
- FOR UPDATE による楽観的ロック
- インデックス最適化による検索性能向上

### ユーザー名取得パターン

#### Context
コメント投稿時に投稿者のユーザー名を返す必要がある。既存のJOINパターンを調査。

#### Sources Consulted
- API設計書のSQLサンプル
- organization_userテーブルの構造

#### Findings

**JOINパターン**:
```sql
SELECT u.user_name 
FROM organization_user ou
JOIN users u ON ou.user_id = u.id
WHERE ou.user_id = $1 AND ou.organization_id = $2;
```

**代替案**: organization_userテーブルに直接user_nameカラムが存在する可能性
- 確認結果: organization_userテーブルにuser_nameカラムが存在する設計
- 単一テーブル参照で済むためパフォーマンス向上

**採用方針**:
- organization_userテーブルから直接user_nameを取得
- 不要なJOINを回避

#### Implications
- シンプルなクエリ構造
- パフォーマンス最適化
- トランザクションスコープの最小化

## Architecture Pattern Evaluation

### パターン候補

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| トランザクション + FOR UPDATE | 問題存在確認とコメント登録を単一トランザクションで実行 | データ整合性保証、デッドロック回避 | 若干のオーバーヘッド | 既存パターンに準拠 |
| 楽観的ロック | バージョン番号によるコンフリクト検出 | 並行性能が高い | リトライロジックが必要 | 過剰な複雑性 |
| 悲観的ロック（採用） | SELECT ... FOR UPDATE による排他制御 | 実装シンプル、確実性高い | ロック待機の可能性 | 既存パターンと一致 |

## Design Decisions

### Decision: トランザクション + FOR UPDATE パターン

**Context**: シーケンス番号の採番と問題存在確認を原子性を持って実行する必要がある

**Alternatives Considered**:
1. アプリケーションレベルでのロック管理 - 複雑性増加
2. 楽観的ロック - リトライロジックが必要

**Selected Approach**: PostgreSQLのトランザクション + FOR UPDATE

```sql
BEGIN;
-- 問題存在確認 + 排他ロック
SELECT id, project_id FROM issues 
WHERE issue_id = $1 AND organization_id = $2 FOR UPDATE;

-- 次のシーケンス番号を取得
SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_seq
FROM issue_comment
WHERE issue_id = $1 AND organization_id = $2;

-- コメント登録
INSERT INTO issue_comment (...) VALUES (...);
COMMIT;
```

**Rationale**: 
- 既存の問題管理APIと同じパターン
- PostgreSQLのACID特性を最大限活用
- デッドロック発生リスクが低い
- 実装・テストが容易

**Trade-offs**:
- Benefits: データ整合性の完全保証、シンプルな実装
- Compromises: 並行書き込み時の若干の待機時間

**Follow-up**: ロック待機タイムアウトの設定（デフォルトで十分）

### Decision: ServiceResult統一形式の継承

**Context**: 既存のissueServiceが使用している統一レスポンス形式を継承

**Selected Approach**: 既存のServiceResult<T>インターフェースを使用

**Rationale**:
- コントローラー層との統合が容易
- エラーハンドリングパターンが統一
- 既存のテストパターンを再利用可能

**Trade-offs**:
- Benefits: 一貫性、保守性向上
- Compromises: なし

### Decision: issue_commentテーブルの独立性

**Context**: コメントを別テーブルで管理するか、issuesテーブルに埋め込むか

**Alternatives Considered**:
1. issuesテーブルにJSON配列で保存 - クエリ複雑化、パフォーマンス低下
2. 別テーブル（採用） - 正規化、拡張性高い

**Selected Approach**: issue_commentテーブルを独立して作成

**Rationale**:
- 1:Nリレーションシップの自然な表現
- コメント一覧の効率的な取得
- 将来の機能拡張（編集・削除・リアクション）が容易

## Risks & Mitigations

**Risk 1: シーケンス番号の競合**
- Mitigation: FOR UPDATE + トランザクションによる排他制御

**Risk 2: パフォーマンスボトルネック**
- Mitigation: 複合インデックス (organization_id, issue_id, sequence_no)

**Risk 3: トランザクションデッドロック**
- Mitigation: ロック取得順序の統一（issues → issue_comment）

**Risk 4: 大量コメント時のメモリ使用**
- Mitigation: 現状対応不要（将来的にページネーション検討）

## References

- [API設計書: 問題管理API](../../design/api/api_issue_management.md#2-コメント投稿api) - コメント投稿APIの詳細仕様
- [バックエンド規約](../../.clinerules/development/backend.md) - アーキテクチャパターン
- [セキュリティ規約](../../.clinerules/development/security.md) - マルチテナント分離とセキュリティ要件
- [データベース構造](../../.clinerules/references/db_structure.md) - DB設計ガイドライン
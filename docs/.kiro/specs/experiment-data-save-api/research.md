# Research & Design Decisions

## Summary
- **Feature**: `experiment-data-save-api`
- **Discovery Scope**: Extension (既存システムへの機能追加)
- **Key Findings**:
  - トランジションステータス更新APIは既に実装済み（experimentRoutes.ts, experimentController.ts, experimentDataService.ts）
  - 実験データ一括保存APIは新規実装が必要
  - Controller → Service → Repository パターンが確立されている
  - Parameterized Queries とトランザクション管理のベストプラクティスが存在

## Research Log

### 既存アーキテクチャの分析

**Context**: 実験データ保存APIを既存システムに統合するため、現在の実装パターンを調査

**Sources Consulted**:
- `backend/src/routes/experimentRoutes.ts` - 既存ルート定義
- `backend/src/controllers/experimentController.ts` - コントローラー実装
- `backend/src/services/experimentDataService.ts` - サービス層実装
- `backend/src/repositories/transitionDataRepository.ts` - リポジトリ実装
- `backend/src/types/transitionData.ts` - 型定義

**Findings**:
- **ミドルウェアチェーン**: `authMiddleware → tenantIsolation → express-validator → controller`
- **3層アーキテクチャ**: Controller（リクエスト処理） → Service（ビジネスロジック） → Repository（データアクセス）
- **トランザクション管理**: Pool.connect() → BEGIN → 処理 → COMMIT/ROLLBACK パターン
- **型安全性**: TypeScript interfaceで厳密な型定義（Status型、TransitionData型など）
- **エラーハンドリング**: カスタムエラークラス（InvalidStatusTransitionError, TransitionNotFoundError）
- **バリデーション**: express-validatorのチェーンとhandleValidationErrors ミドルウェア

**Implications**:
- 新規APIも同じアーキテクチャパターンに従うべき
- template_dataテーブル用の新しいRepositoryが必要
- UPSERTロジックはService層で実装
- 既存のexperimentRoutes.tsに新しいエンドポイントを追加

### トランジションステータス更新APIの実装状況

**Context**: REQ-3のトランジションステータス更新機能の実装確認

**Sources Consulted**:
- `backend/src/routes/experimentRoutes.ts` - ルート定義
- `backend/src/controllers/experimentController.ts` - updateTransitionStatus関数
- `backend/src/services/experimentDataService.ts` - updateStatus関数
- `backend/src/repositories/transitionDataRepository.ts` - updateStatus関数

**Findings**:
- **実装済み**: エンドポイント、コントローラー、サービス、リポジトリがすべて実装済み
- **エンドポイント**: `PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status`
- **ステータス遷移ルール**: ALLOWED_TRANSITIONSマトリクスで定義済み
- **進捗率自動設定**: status='completed'時にprogress_rate=100に自動設定
- **タスク進捗率再計算**: トランジション更新後に自動再計算
- **未実装機能**: maiml_event_logへのイベント記録（TODOコメントあり）

**Implications**:
- トランジションステータス更新APIは既に動作している
- 設計書では既存実装を正確に反映する
- maiml_event_log記録機能は今回のスコープに含める必要がある

### データベーステーブル構造の確認

**Context**: template_dataテーブルとtransition_dataテーブルの構造確認

**Sources Consulted**:
- `docs/design/api/api_experiment_data.md` - テーブル定義
- 既存のRepository実装パターン

**Findings**:
- **template_data テーブル**:
  - 一意キー: (organization_id, project_id, method_id, task_no, place_id)
  - UPSERT対応が必要（ON CONFLICT ... DO UPDATE）
  - dataカラムはJSONB型（GINインデックス使用）
- **transition_data テーブル**:
  - 複合主キー: (organization_id, project_id, method_id, task_no, transition_id)
  - status, progress_rate, updated_by, updated_at などのカラム
- **maiml_event_log テーブル**:
  - sequence_noは(organization_id, project_id)単位で自動採番
  - logカラムはJSONB型

**Implications**:
- TemplateDataRepository（新規）でUPSERTロジックを実装
- BatchInsert/Updateは個別のINSERT/UPDATEをトランザクション内で実行
- JSONB型の適切な型定義が必要

### マルチテナント分離の実装パターン

**Context**: セキュリティ要件REQ-4のマルチテナント分離実装方法の確認

**Sources Consulted**:
- `.clinerules/development/security.md` - セキュリティ規約
- `backend/src/repositories/transitionDataRepository.ts` - 実装例

**Findings**:
- **必須事項**:
  - すべてのDBクエリのWHERE句に`organization_id`フィルタを含める
  - Parameterized Queries（$1, $2, ...）を使用してSQLインジェクション対策
  - JOINクエリでもすべてのテーブルで`organization_id`を検証
- **ミドルウェア**: tenantIsolationミドルウェアが`req.organizationId`に組織IDを設定
- **エラーハンドリング**: organization_idが一致しない場合は404エラー

**Implications**:
- 新規実装でも必ず`organization_id`フィルタを含める
- リポジトリメソッドの第一引数は`organizationId`とする
- プロジェクトステータス確認、タスク存在確認でも`organization_id`を検証

### バリデーション実装パターン

**Context**: REQ-5の入力バリデーション実装方法の確認

**Sources Consulted**:
- `backend/src/routes/experimentRoutes.ts` - express-validator使用例
- `docs/design/api/api_experiment_data.md` - バリデーション要件

**Findings**:
- **express-validator**のチェーン形式でバリデーション定義
- **バリデーション項目**:
  - パスパラメータ: `.isUUID()`, `.notEmpty()`, `.isLength()`
  - ボディパラメータ: `.isIn([...])`, `.isInt({ min, max })`, `.optional()`
- **handleValidationErrors ミドルウェア**: バリデーションエラーを統一形式でレスポンス
- **カスタムバリデーション**: `.custom()` メソッドで複雑なロジックを実装可能

**Implications**:
- records配列の各要素もバリデーション必要（カスタムバリデータ実装）
- placeId, templateType, templateId, dataの必須チェック
- records配列が空でないことを検証（`.isArray({ min: 1 })`）

### トランザクション管理パターン

**Context**: REQ-2のAll or Nothing保証の実装方法確認

**Sources Consulted**:
- `backend/src/services/experimentDataService.ts` - トランザクション実装例

**Findings**:
- **パターン**:
  ```typescript
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ... 複数の操作
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  ```
- **重要**: connection poolからclientを取得し、同一クライアントで全操作を実行
- **エラー時**: 必ずROLLBACKしてからエラーをスロー
- **finally**: 必ずclient.release()してコネクションを返却

**Implications**:
- 実験データ一括保存も同じパターンでトランザクション管理
- records配列のループ内で1件でも失敗したら全体をロールバック
- プロジェクトステータス確認もトランザクション内で実行

## Architecture Pattern Evaluation

このAPIは既存システムの拡張であるため、新しいアーキテクチャパターンの評価は不要。既存の3層アーキテクチャ（Controller → Service → Repository）を踏襲する。

## Design Decisions

### Decision: 実験データ一括保存のUPSERT実装方法

**Context**: records配列の各要素を既存レコードがあれば更新、なければ新規作成する

**Alternatives Considered**:
1. **PostgreSQL UPSERT（ON CONFLICT ... DO UPDATE）** - 各レコードごとにUPSERTクエリを実行
2. **事前SELECT + INSERT/UPDATE分岐** - まず全レコードの存在確認、その後INSERT/UPDATEを分けて実行
3. **Batch UPSERT** - 全レコードを1つのクエリでUPSERT

**Selected Approach**: Option 1 - PostgreSQL UPSERT（ON CONFLICT ... DO UPDATE）

**Rationale**:
- PostgreSQLのネイティブ機能で原子性が保証される
- コードがシンプルで可読性が高い
- records配列のサイズが通常10件以下のため、パフォーマンス問題なし
- 一意キー制約を活用できる

**Trade-offs**:
- **Benefits**: 実装がシンプル、トランザクション内で安全、既存パターンと一貫性
- **Compromises**: 大量レコード（100件以上）の場合はBatch UPSERTの方が高速だが、現状の要件では不要

**Follow-up**: パフォーマンス測定を実施し、records配列が50件を超える場合は最適化を検討

### Decision: maiml_event_log記録のタイミング

**Context**: トランジションステータス更新時のイベントログ記録が未実装（TODOコメント）

**Alternatives Considered**:
1. **トランザクション内で記録** - ステータス更新と同じトランザクションで記録
2. **トランザクション外で記録** - コミット後に非同期で記録
3. **今回は実装しない** - 既存のTODOを維持

**Selected Approach**: Option 1 - トランザクション内で記録

**Rationale**:
- 要件REQ-10で監査ログ記録が明示されている
- トランザクション内で記録すれば、ステータス更新とログの整合性が保証される
- sequence_noの自動採番がトランザクション内で必要

**Trade-offs**:
- **Benefits**: データ整合性、原子性保証、監査要件を満たす
- **Compromises**: トランザクションが若干長くなるが、影響は軽微

**Follow-up**: ログ記録失敗時のエラーハンドリング（ロールバックするか）を明確化

### Decision: TemplateDataRepositoryの新規作成

**Context**: template_dataテーブル用のRepositoryが存在しない

**Alternatives Considered**:
1. **新規Repository作成** - TemplateDataRepositoryを作成
2. **既存Repositoryに追加** - TransitionDataRepositoryに機能追加
3. **Service層で直接SQLクエリ** - Repositoryを作らずにServiceで直接実装

**Selected Approach**: Option 1 - 新規Repository作成

**Rationale**:
- 単一責任の原則（SRP）に従う
- template_dataテーブルとtransition_dataテーブルは異なるドメイン
- 将来的な拡張性（他の機能でもtemplate_dataを使用する可能性）
- 既存のアーキテクチャパターンと一貫性

**Trade-offs**:
- **Benefits**: 保守性、テスタビリティ、再利用性
- **Compromises**: ファイル数が増える

**Follow-up**: なし（標準的なアプローチ）

### Decision: プロジェクトステータスチェックの実装場所

**Context**: プロジェクトがarchived/completedの場合は編集不可

**Alternatives Considered**:
1. **Service層で実装** - ExperimentDataServiceでチェック
2. **Repository層で実装** - ProjectRepositoryでチェック
3. **Middleware層で実装** - 専用ミドルウェアを作成

**Selected Approach**: Option 1 - Service層で実装

**Rationale**:
- ビジネスルールはService層の責務
- 複数のAPIで同じチェックが必要な場合、Service層で共通化できる
- 既存のexperimentDataService.tsのupdateStatus()でも同様のチェックを実装

**Trade-offs**:
- **Benefits**: ビジネスロジックの集約、テストのしやすさ
- **Compromises**: Service層が若干複雑になる

**Follow-up**: プロジェクトステータスチェックを共通メソッド化（validateProjectEditable()）

## Risks & Mitigations

### Risk 1: records配列が大量（100件以上）の場合のパフォーマンス低下

**Mitigation**:
- 現在のUI設計（データ記録ダイアログ）では一度に10件程度を想定
- バリデーションでrecords配列の最大件数を制限（例: 50件）
- 必要に応じてBatch UPSERTに変更可能な設計にする

### Risk 2: トランザクション実行中の長時間ロック

**Mitigation**:
- トランザクション内の処理を最小限にする
- デッドロック検出とリトライ機能を実装
- タイムアウト設定（2秒）

### Risk 3: JSONB型のdataカラムのバリデーション不足

**Mitigation**:
- JSON.parse()で構文エラーをチェック
- 必要に応じてJSON Schemaバリデーションを実装
- dataカラムの最大サイズ制限（例: 1MB）

## References

### Official Documentation
- [PostgreSQL UPSERT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT) - ON CONFLICT構文の公式ドキュメント
- [express-validator](https://express-validator.github.io/docs/) - バリデーションライブラリ
- [Node.js PostgreSQL Best Practices](https://node-postgres.com/features/transactions) - トランザクション管理

### Internal Guidelines
- `.clinerules/development/security.md` - セキュリティ規約
- `.clinerules/development/config.md` - コーディング規約
- `docs/design/api/api_common.md` - API共通仕様
- `docs/design/api/api_experiment_data.md` - 実験データ記録API仕様書（v2.1.0）

# Research & Design Decisions

---
**Feature**: project-create-api  
**Discovery Scope**: Extension（既存システムへの機能追加）  
**Discovery Type**: Light（軽量ディスカバリー）
---

## Summary

### 機能概要
プロジェクト管理画面のプロジェクト作成API（POST /api/v1/projects）をバックエンドに実装。既存のGET /api/v1/projectsに対応する作成機能を追加。

### 発見事項
1. **既存パターンの確認**: Controller-Service-Routerの3層アーキテクチャが確立されている
2. **Storage統合**: storageService.tsによるマルチテナント対応S3/Swift抽象化が実装済み
3. **トランザクション管理**: PostgreSQL接続プールとPromise.allによる並列処理パターンを確認
4. **エラーハンドリング**: 統一されたServiceResult<T>型とレスポンス形式が定義済み

---

## Research Log

### 既存実装パターンの分析

#### Context
プロジェクト一覧取得API（GET /api/v1/projects）の実装パターンを分析し、作成API実装の設計指針を確立する必要があった。

#### Sources Consulted
- `backend/src/controllers/projectController.ts` - Controller層の実装パターン
- `backend/src/services/projectService.ts` - Service層のビジネスロジックとDB操作
- `backend/src/routes/projectRoutes.ts` - ルーティングとミドルウェア構成
- `backend/src/services/storageService.ts` - S3/Swift統合とマルチテナント分離

#### Findings

**Controller層パターン**:
- uuid v4によるrequestId生成
- req.userからorganizationId、userId取得
- 詳細なバリデーション（page、limit、sort_by、order）
- 統一されたエラーレスポンス形式：`{ success, error: { code, message, details }, meta: { timestamp, requestId } }`
- 成功時のレスポンス形式：`{ success, data, pagination, meta }`
- try-catchによるエラーハンドリングとログ記録

**Service層パターン**:
- クラスベース設計（ProjectService）
- ServiceResult<T>型：`{ success: boolean, data?: T, error?: { code, message, originalError } }`
- データベースクエリにParameterized Queries使用
- スネークケース→キャメルケースの変換
- Promise.allによる並列クエリ実行（プロジェクト一覧とカウント）

**Router層パターン**:
- authMiddleware適用（JWT認証）
- express-validatorによる入力バリデーション
- Controller関数への委譲

**Storage Service**:
- マルチテナント対応：`org_{organizationId}/{filePath}` 形式
- buildKeyメソッドでプレフィックス自動付与
- uploadFile、deleteFile、fileExists等のメソッド提供
- S3/Swift両対応（環境変数で切り替え）

#### Implications
- 既存パターンに従うことで、コードの一貫性を維持できる
- storageService.uploadFileでフォルダ作成（空ファイル配置）が必要
- トランザクション管理にはPostgreSQLのBEGIN/COMMIT/ROLLBACKを使用
- S3エラー時のロールバック処理を実装する必要がある

---

### S3フォルダ作成戦略

#### Context
要件8により、プロジェクト作成時にS3上に`org_{organization_prefix}/projects/{project_name}/`フォルダを作成する必要がある。

#### Sources Consulted
- `backend/src/services/storageService.ts` - uploadFileメソッドの実装
- 要件書 Requirement 8: S3統合

#### Findings
- S3はフォルダ概念を持たないため、マーカーファイル（.keepまたは空ファイル）を配置してフォルダの存在を保証する
- storageService.uploadFileメソッドを使用して、`projects/{project_name}/.keep`ファイルをアップロード
- organization_prefixは`organization`テーブルの`organization_name`から取得し、スペースをアンダースコアに変換
- buildKeyメソッドが自動的に`org_{organizationId}`プレフィックスを付与する

#### Implications
- S3フォルダ作成は`storageService.uploadFile(organizationId, 'projects/{project_name}/.keep', '')`で実現
- organization_prefixの取得にはorganizationテーブルへの追加クエリが必要
- S3エラー時はデータベーストランザクションをロールバックする必要がある

---

### トランザクション管理戦略

#### Context
要件5により、データベース登録とS3フォルダ作成の一貫性を保証する必要がある。

#### Findings
- PostgreSQLの接続プール（getPool()）を使用
- トランザクション管理：BEGIN → INSERT → S3操作 → COMMIT/ROLLBACK
- S3操作失敗時はデータベースをロールバック
- 既存のProjectServiceにはトランザクション管理が未実装（単一クエリのため不要）

#### Implications
- createメソッドでは明示的なトランザクション制御が必要
- 処理フロー：
  1. BEGIN TRANSACTION
  2. INSERT INTO project
  3. S3フォルダ作成（storageService.uploadFile）
  4. S3成功 → COMMIT、S3失敗 → ROLLBACK + 500エラー

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | 選択理由 |
|--------|-------------|-----------|---------------------|---------|
| Controller-Service-Router（既存） | 3層アーキテクチャ | 既存パターンとの一貫性、保守性 | なし | 既存実装との統一性を維持 |
| Saga Pattern | 分散トランザクション管理 | スケーラビリティ | 実装複雑度が高い、現時点では過剰 | 不採用：単一データベース+S3の単純なケース |
| Event Sourcing | イベントベースのデータ管理 | 監査ログ、時系列追跡 | 実装コスト大、既存システムと不整合 | 不採用：既存アーキテクチャと乖離 |

**選択**: Controller-Service-Router（既存パターン）

---

## Design Decisions

### Decision 1: トランザクション管理手法

**Context**:
データベース登録とS3フォルダ作成の一貫性を保証する必要がある（要件5）。

**Alternatives Considered**:
1. **2-Phase Commit（2PC）**: 分散トランザクションプロトコル
2. **Saga Pattern**: 補償トランザクションによる整合性保証
3. **Best-Effort with Rollback**: データベーストランザクション + S3失敗時のロールバック

**Selected Approach**:
Best-Effort with Rollback方式を採用。

**実装詳細**:
```
BEGIN TRANSACTION
  ↓
INSERT INTO project (新規レコード作成)
  ↓
S3 uploadFile (フォルダ作成)
  ↓
成功 → COMMIT
失敗 → ROLLBACK + 500エラー
```

**Rationale**:
- 単一データベース + 外部ストレージの単純なケースであり、2PCやSagaは過剰
- S3操作は比較的高速（<500ms）で、トランザクション保持時間への影響が小さい
- 既存システムと整合性がある実装方法
- PostgreSQLのACID特性により、ロールバック時のデータ整合性が保証される

**Trade-offs**:
- **メリット**: 実装がシンプル、既存パターンとの一貫性、十分な信頼性
- **デメリット**: S3が一時的に利用不可の場合、プロジェクト作成が完全にブロックされる

**Follow-up**:
- S3エラー発生頻度を監視し、リトライロジック追加の必要性を評価
- 将来的にメッセージキューを用いた非同期フォルダ作成の検討

---

### Decision 2: プロジェクト名重複チェックのタイミング

**Context**:
同一組織内でプロジェクト名の重複を防ぐ必要がある（要件2.5）。

**Alternatives Considered**:
1. **トランザクション開始前**: 重複チェック → BEGIN → INSERT
2. **トランザクション内**: BEGIN → 重複チェック → INSERT
3. **UNIQUE制約のみ**: データベースのUNIQUE制約に依存

**Selected Approach**:
トランザクション内での重複チェック（Option 2）+ UNIQUE制約の併用。

**実装詳細**:
```sql
BEGIN TRANSACTION;
SELECT COUNT(*) FROM project 
WHERE organization_id = $1 AND project_name = $2;
-- COUNT > 0 の場合は409エラー + ROLLBACK
INSERT INTO project ...;
COMMIT;
```

**Rationale**:
- トランザクション内でチェックすることで、並行リクエスト時のレースコンディションを防止
- UNIQUE制約（organization_id, project_name）を併用することで、二重防御を実現
- ユーザーフレンドリーなエラーメッセージ（409 Conflict）を返却可能

**Trade-offs**:
- **メリット**: レースコンディション対策、明示的なエラーハンドリング
- **デメリット**: 追加のSELECTクエリが必要（パフォーマンスへの影響は軽微）

**Follow-up**:
- 並行リクエストのストレステストで動作確認

---

### Decision 3: organization_prefixの取得方法

**Context**:
S3パスに`org_{organization_prefix}`を含める必要があり（要件8）、organization_prefixは`organization.organization_name`から生成する。

**Alternatives Considered**:
1. **毎回クエリで取得**: リクエストごとにorganizationテーブルをクエリ
2. **キャッシュ**: organization情報をメモリキャッシュ
3. **セッション情報に含める**: JWT/セッションにorganization_nameを含める

**Selected Approach**:
毎回クエリで取得（Option 1）。

**実装詳細**:
```sql
SELECT organization_name FROM organization 
WHERE organization_id = $1;
```

organization_nameのスペースをアンダースコアに変換：
```typescript
const organizationPrefix = organizationName.replace(/\s+/g, '_');
```

**Rationale**:
- 実装がシンプルで、データの整合性が保証される
- organization情報は頻繁に変更されないが、キャッシュ無効化の複雑さを避ける
- クエリコストは軽微（主キー検索）で、パフォーマンスへの影響は小さい
- セッション情報への追加は既存の認証システムへの変更が必要で、影響範囲が大きい

**Trade-offs**:
- **メリット**: 実装が単純、データの一貫性が高い、既存システムへの影響なし
- **デメリット**: 追加のクエリが発生（パフォーマンスへの影響は軽微）

**Follow-up**:
- パフォーマンステストで目標300ms以内を確認
- 将来的に組織情報のキャッシング戦略を検討（Redis等）

---

### Decision 4: デフォルト値の設定方法

**Context**:
project_status（0）、checkout_status（0）、project_maiml_flg（false）等のデフォルト値を設定する必要がある（要件6）。

**Alternatives Considered**:
1. **アプリケーション層で設定**: Service層で明示的に値を設定
2. **データベーススキーマで設定**: CREATE TABLEのDEFAULT句を使用
3. **混合アプローチ**: 重要な値はアプリケーション層、その他はスキーマ

**Selected Approach**:
アプリケーション層で明示的に設定（Option 1）。

**実装詳細**:
```typescript
const newProject = {
  project_id: uuidv4(),
  organization_id: organizationId,
  project_name: projectName,
  description: description || null,
  owner_user_id: userId,
  department_id: departmentId || null,
  project_status: 0,  // プロジェクト計画中
  checkout_status: 0,  // チェックイン中
  project_maiml_flg: false,
  create_at: new Date().toISOString()
};
```

**Rationale**:
- ビジネスルールがコードで明示的に表現され、可読性が高い
- テストが容易（モックデータの作成が簡単）
- データベーススキーマに依存せず、移植性が高い
- ビジネスロジックの変更時にコード変更のみで対応可能

**Trade-offs**:
- **メリット**: 明示的、テスト容易、可読性高い
- **デメリット**: コード量が若干増加（影響は軽微）

**Follow-up**:
- 定数定義（PROJECT_STATUS_PLANNING = 0等）の追加を検討

---

## Risks & Mitigations

### Risk 1: S3の一時的な利用不可によるプロジェクト作成失敗
**影響度**: 中  
**発生確率**: 低  
**Mitigation**:
- S3操作にリトライロジックを実装（3回まで、exponential backoff）
- 詳細なエラーログ記録（requestId、organizationId、projectName、エラー詳細）
- 監視アラート設定（S3エラー率 > 1%）

### Risk 2: 並行リクエストによるプロジェクト名重複
**影響度**: 中  
**発生確率**: 低  
**Mitigation**:
- UNIQUE制約（organization_id, project_name）をデータベースに設定
- トランザクション内での重複チェック
- 並行リクエストのストレステスト実施

### Risk 3: トランザクション保持時間の長期化
**影響度**: 低  
**発生確率**: 低  
**Mitigation**:
- S3操作のタイムアウト設定（3秒）
- トランザクション保持時間の監視（目標: 5秒以内）
- パフォーマンステストで検証

### Risk 4: organization_name変更時のS3パス不整合
**影響度**: 低  
**発生確率**: 極低  
**Mitigation**:
- organization_name変更はシステム管理者のみ実施可能
- 変更時のS3パスマイグレーション手順を別途策定
- 本実装では現行仕様に従う（プレフィックス変更不可）

---

## References

### 内部ドキュメント
- [API仕様書](../../../design/api/api_project_management.md) - セクション2.3: プロジェクト作成API
- [バックエンド規約](../../../../.clinerules/development/backend.md) - レイヤードアーキテクチャ
- [セキュリティ規約](../../../../.clinerules/development/security.md) - マルチテナント分離

### 実装参照
- `backend/src/controllers/projectController.ts` - Controller層パターン
- `backend/src/services/projectService.ts` - Service層パターン
- `backend/src/services/storageService.ts` - S3/Swift統合

### 技術資料
- [PostgreSQL Documentation - Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [AWS SDK for JavaScript v3 - S3Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Express.js - Error Handling](https://expressjs.com/en/guide/error-handling.html)

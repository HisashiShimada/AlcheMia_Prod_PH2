# Research & Design Decisions

---
**Feature**: project-reload-api  
**Discovery Scope**: Extension（既存システムへの機能追加）  
**Discovery Type**: Light（軽量ディスカバリー）
---

## Summary

### 機能概要
プロジェクト管理APIにプロジェクトリロード機能を追加。S3ストレージ上のファイルリストとfile_metadataテーブルを同期し、キャッシュをクリアすることで、外部変更を反映する。

### 発見事項
1. **既存パターンの確認**: GET /api/v1/projects/:idと同様のController-Service-Repository構造が確立
2. **Storage統合**: storageService.listFilesメソッドが既に実装済み（Section 2.2で使用）
3. **キャッシュ管理**: プロジェクト詳細、ファイル、タスクのキャッシュキーパターンを確認
4. **トランザクション管理**: file_metadata更新にはPostgreSQLトランザクションを使用
5. **並行処理パターン**: Promise.allによるファイル同期とタスク更新の並列実行が可能

---

## Research Log

### 既存実装パターンの分析

#### Context
プロジェクト詳細取得API（GET /api/v1/projects/:id、Section 2.2）の実装パターンを分析し、リロードAPI実装の設計指針を確立する必要があった。

#### Sources Consulted
- `docs/design/api/api_project_management.md` - API仕様書、Section 2.2, 2.9
- `backend/src/controllers/projectController.ts` - Controller層の実装パターン
- `backend/src/services/projectService.ts` - Service層のビジネスロジック
- `backend/src/services/storageService.ts` - S3/Swift統合
- `backend/src/repositories/projectRepository.ts` - データアクセス層

#### Findings

**Controller層パターン**:
- ミドルウェアチェーン: auth → tenantIsolation → permissionCheck
- req.organizationIdからorganization ID取得（tenantIsolationで設定）
- req.user.idからuser ID取得（authで設定）
- 統一されたレスポンス形式：`{ success, data, meta: { timestamp, requestId } }`
- try-catchによるエラーハンドリングとnext()への委譲

**Service層パターン**:
- 非同期メソッド（async/await）
- organization_id必須フィルタ（全クエリ）
- Parameterized Queries（SQLインジェクション対策）
- ServiceResult型は使用せず、直接値を返却またはthrow
- Promise.allによる並列処理（プロジェクト情報とファイルリスト取得）

**Repository層パターン**:
- Kysely query builderを使用
- organization_idフィルタを全クエリで強制
- トランザクション管理（db.transaction().execute()）

**Storage Service**:
- listFilesメソッド: `storageService.listFiles(organizationId, 'projects/{projectName}/')`
- 返却値: `{ key, size, lastModified, contentType }`の配列
- マルチテナント対応：自動的に`org_{organizationId}`プレフィックス付与

#### Implications
- 既存パターンに従うことで、コードの一貫性を維持できる
- storageService.listFilesを使用して現在のファイルリストを取得
- file_metadataテーブルとの差分を計算し、INSERT/UPDATE/DELETEを実行
- トランザクション管理にはKyselyのtransaction APIを使用

---

### ファイル同期戦略

#### Context
S3上のファイルリストとfile_metadataテーブルの内容を同期する必要がある。新規ファイル、更新ファイル、削除ファイルを検出し、適切に処理する。

#### Sources Consulted
- `backend/src/services/storageService.ts` - listFilesメソッドの実装
- `docs/design/db/ddl/11_file_metadata.sql` - file_metadataテーブル構造
- `.clinerules/references/s3_structure.md` - S3フォルダ構成定義

#### Findings
- file_metadataテーブルには`deleted_at`カラムがあり、論理削除をサポート
- S3のファイルメタデータ：key, size, lastModified, contentType
- 同期アルゴリズム：Three-way merge（現在のDB、S3状態、更新結果）
- 差分検出：
  - 新規: S3に存在、DBに存在しない → INSERT
  - 更新: 両方に存在、sizeまたはlastModifiedが異なる → UPDATE
  - 削除: DBに存在、S3に存在しない → 論理削除（deleted_at設定）

#### Implications
- バッチ処理でINSERT/UPDATE/DELETEを実行（効率化）
- トランザクション内で全操作を実行（データ整合性）
- 既存のdeleted_atカラムを活用（スキーマ変更不要）

---

### キャッシュクリア戦略

#### Context
プロジェクトデータのキャッシュをクリアし、次回アクセス時に最新データを取得させる必要がある。

#### Sources Consulted
- Section 2.2（プロジェクト詳細取得）のキャッシュキー命名規則
- バックエンド実装のキャッシュ使用パターン

#### Findings
- キャッシュキーパターン：
  - `project:{orgId}:{projectId}:detail`
  - `project:{orgId}:{projectId}:files`
  - `project:{orgId}:{projectId}:tasks`
- 組織レベルのキャッシュ（`project:{orgId}:list`）は保持（影響範囲を最小化）
- キャッシュサービスのclearメソッドでパターンマッチングクリア

#### Implications
- リロード前にキャッシュをクリア（古いデータの読み取り防止）
- プロジェクトレベルのキャッシュのみクリア（組織レベルは次回リクエスト時に自然更新）

---

### 並行実行戦略

#### Context
ファイル同期とタスク更新を効率的に実行する必要がある。

#### Findings
- Promise.allによる並列実行パターンが既存コードで使用されている
- ファイル同期とタスク更新は独立（相互依存なし）
- 並列実行により、レスポンスタイムを短縮可能

#### Implications
- Promise.allでファイル同期とタスク更新を並列実行
- タイムアウト設定（30秒）で長時間実行を防止
- エラー時は両方ロールバック（トランザクション管理）

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | 選択理由 |
|--------|-------------|-----------|---------------------|---------|
| Controller-Service-Repository（既存） | 3層アーキテクチャ | 既存パターンとの一貫性、保守性 | なし | 既存実装との統一性を維持 |
| イベント駆動（WebSocket通知） | リロード完了をクライアントに通知 | リアルタイム性 | 実装複雑度が高い、現時点では過剰 | 不採用：v1では同期応答で十分 |
| 非同期ジョブ処理（Queue） | バックグラウンドでリロード処理 | 大規模プロジェクト対応 | 実装コスト大、ステータス確認API必要 | 不採用：v1では同期処理で十分 |

**選択**: Controller-Service-Repository（既存パターン）

---

## Design Decisions

### Decision 1: 同期処理 vs 非同期処理

**Context**:
大規模プロジェクト（1000+ファイル）のリロードには5〜10秒かかる可能性がある。

**Alternatives Considered**:
1. **同期処理**: リクエスト-レスポンスで完結、タイムアウト30秒
2. **非同期処理**: ジョブキューに投入、ステータス確認APIで進捗確認
3. **ハイブリッド**: 小規模は同期、大規模は非同期

**Selected Approach**:
同期処理（Option 1）。

**実装詳細**:
```
POST /api/v1/projects/:id/reload
  ↓
ファイル同期 + タスク更新（並列）
  ↓
タイムアウト: 30秒
  ↓
200 OK + サマリー返却
```

**Rationale**:
- ほとんどのプロジェクトは100ファイル以下（レスポンスタイム<3秒）
- 実装がシンプル（ジョブキュー、ステータスAPI不要）
- ユーザー体験が直感的（即座に結果確認）
- タイムアウト設定で最悪ケースに対応

**Trade-offs**:
- **メリット**: 実装シンプル、ユーザー体験良好
- **デメリット**: 1000+ファイルのプロジェクトではタイムアウトの可能性

**Follow-up**:
- パフォーマンステストで1000ファイルのリロード時間を測定
- タイムアウト発生率が5%を超える場合、非同期処理を検討

---

### Decision 2: ファイルメタデータ同期アルゴリズム

**Context**:
S3上のファイルとfile_metadataテーブルを正確に同期する必要がある。

**Alternatives Considered**:
1. **全削除・全挿入**: 既存レコード全削除 → S3リストから全挿入
2. **Three-way merge**: 現在のDB、S3、更新結果の3つを比較して差分のみ更新
3. **タイムスタンプベース**: lastModifiedのみで更新判定

**Selected Approach**:
Three-way merge（Option 2）。

**実装詳細**:
```typescript
// 1. 現在のDBレコード取得
const existingFiles = await fileMetadataRepository.getByProject(projectId, orgId);

// 2. S3ファイルリスト取得
const s3Files = await storageService.listFiles(orgId, `projects/${projectName}/`);

// 3. 差分計算
const operations = calculateDiff(existingFiles, s3Files);
// - INSERT: S3にあり、DBにない
// - UPDATE: 両方にあり、size/lastModifiedが異なる
// - DELETE: DBにあり、S3にない

// 4. バッチ実行（トランザクション内）
await fileMetadataRepository.executeBatch(operations);
```

**Rationale**:
- 監査証跡を保持（deleted_atで論理削除）
- 効率的（変更されたレコードのみ更新）
- データ整合性が高い（トランザクション管理）
- 既存のdeleted_atカラムを活用（スキーマ変更不要）

**Trade-offs**:
- **メリット**: データ保全、効率的、監査対応
- **デメリット**: アルゴリズムが若干複雑（影響は軽微）

**Follow-up**:
- 差分計算のユニットテストで精度を保証

---

### Decision 3: キャッシュクリアのタイミング

**Context**:
キャッシュクリアのタイミングによって、古いデータが返却される可能性がある。

**Alternatives Considered**:
1. **リロード前にクリア**: データ更新前にキャッシュ削除
2. **リロード後にクリア**: データ更新後にキャッシュ削除
3. **クリアしない**: キャッシュTTL任せ

**Selected Approach**:
リロード前にクリア（Option 1）。

**実装詳細**:
```
1. キャッシュクリア（project:{orgId}:{projectId}:*）
2. ファイル同期実行
3. タスク更新実行
4. サマリー返却
```

**Rationale**:
- 古いキャッシュデータの読み取りを確実に防止
- リロード中に他のリクエストが来ても、DBから最新データを取得
- 実装がシンプル

**Trade-offs**:
- **メリット**: データ一貫性が高い、実装シンプル
- **デメリット**: リロード中のリクエストはキャッシュミスヒット（パフォーマンスへの影響は軽微）

**Follow-up**:
- キャッシュヒット率の監視（リロード後の低下を確認）

---

### Decision 4: 並行リロードリクエストの制御

**Context**:
同じプロジェクトに対して複数のリロードリクエストが同時に来る可能性がある。

**Alternatives Considered**:
1. **ロックなし**: 並行実行を許可、最後のリクエストが勝つ
2. **インメモリロック**: Map<projectId, Promise>でロック管理
3. **Redisロック**: 分散ロック（Redis SETNX）
4. **DBロック**: SELECT FOR UPDATE

**Selected Approach**:
インメモリロック（Option 2）。

**実装詳細**:
```typescript
const reloadLocks = new Map<string, Promise<any>>();

async function reloadProject(projectId: string) {
  const lockKey = `reload:${projectId}`;
  
  if (reloadLocks.has(lockKey)) {
    throw new Error('BUSINESS_RELOAD_IN_PROGRESS', 409);
  }
  
  const promise = performReload(projectId);
  reloadLocks.set(lockKey, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    reloadLocks.delete(lockKey);
  }
}
```

**Rationale**:
- 単一ECSインスタンス内での競合を防止
- 実装がシンプル（外部依存なし）
- リクエスト頻度が低い（並行リクエストは稀）
- 複数インスタンス間の競合は許容（影響は軽微）

**Trade-offs**:
- **メリット**: 実装シンプル、パフォーマンス影響なし
- **デメリット**: 複数ECSインスタンス間の競合は防げない（将来Redis検討）

**Follow-up**:
- 並行リクエスト発生頻度を監視
- 頻度が高い場合、Redisロックを検討

---

## Risks & Mitigations

### Risk 1: 大規模プロジェクト（1000+ファイル）でのタイムアウト
**影響度**: 中  
**発生確率**: 低（大規模プロジェクトは稀）  
**Mitigation**:
- タイムアウト設定（30秒）で無限待機を防止
- バッチ処理で効率化（UNNEST使用）
- パフォーマンステストで1000ファイルの処理時間を測定
- v2で非同期処理を検討

### Risk 2: S3の一時的な利用不可によるリロード失敗
**影響度**: 中  
**発生確率**: 低  
**Mitigation**:
- S3操作にリトライロジックを実装（3回まで、exponential backoff）
- 詳細なエラーログ記録（requestId、projectId、エラー詳細）
- 監視アラート設定（S3エラー率 > 1%）
- 503エラーを返却し、ユーザーに再試行を促す

### Risk 3: file_metadataテーブルの不整合
**影響度**: 低  
**発生確率**: 極低  
**Mitigation**:
- トランザクション管理で原子性を保証
- バッチ操作のユニットテスト
- 定期的なデータ整合性チェック（将来実装）

### Risk 4: 並行リロードリクエストによるリソース競合
**影響度**: 低  
**発生確率**: 低  
**Mitigation**:
- インメモリロックで同一インスタンス内の競合を防止
- 409 Conflictエラーを返却し、ユーザーに待機を促す
- 複数インスタンス間の競合は許容（影響軽微）

---

## References

### 内部ドキュメント
- [API仕様書](../../../design/api/api_project_management.md) - セクション2.9: プロジェクトリロードAPI
- [バックエンド規約](../../../../.clinerules/development/backend.md) - レイヤードアーキテクチャ、SQL管理
- [セキュリティ規約](../../../../.clinerules/development/security.md) - マルチテナント分離
- [S3構造定義](../../../../.clinerules/references/s3_structure.md) - フォルダ構成

### 実装参照
- `backend/src/controllers/projectController.ts` - Controller層パターン
- `backend/src/services/projectService.ts` - Service層パターン
- `backend/src/services/storageService.ts` - S3/Swift統合
- `backend/src/repositories/projectRepository.ts` - Repository層パターン

### 技術資料
- [PostgreSQL Documentation - Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [AWS SDK for JavaScript v3 - S3 ListObjects](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/listobjectsv2command.html)
- [Kysely Documentation - Transactions](https://kysely.dev/docs/examples/transactions)

# タスク計画書: SQLクエリのER図仕様準拠修正

## メタデータ
- **作成日時**: 2026-02-24 19:12
- **タスクID**: instruction_sql_er_alignment
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

`project_instruction`テーブルと`instruction_acknowledged_history`テーブルのSQLクエリをER図の仕様に合わせて修正します。現在のSQLクエリには以下の問題があります：

1. **存在しないカラム参照**: `history_id`カラムが存在しない
2. **不足しているフィルタ**: `project_id`によるフィルタが欠けている
3. **カラム名の不一致**: `instruction_id` vs `experiment_instruction_id`、`acknowledged_user_id` vs `experiment_user_id`

## 2. 目的と期待される成果

### 目的
ER図で定義されたテーブル構造に準拠した正しいSQLクエリと、それを使用するバックエンドコードの実装により、データベースアクセスの整合性を確保する。

### 期待される成果
- [x] ER図とSQLクエリの差分分析完了
- [ ] checkAcknowledged.sql修正完了
- [ ] findById.sql修正完了
- [ ] insertAcknowledged.sql修正完了
- [ ] checkWorkerAssignment.sql修正完了
- [ ] instructionRepository.ts型定義修正完了
- [ ] instructionRepository.ts関数修正完了
- [ ] projectService.ts修正完了
- [ ] projectController.ts修正完了
- [ ] 動作確認完了

## 3. 実装ステップ

### Phase 1: SQLクエリの修正（4ファイル）

#### Step 1-1: checkAcknowledged.sqlの修正
- [ ] `history_id`カラムをSELECTから削除
- [ ] `project_id`フィルタをWHERE句に追加
- [ ] パラメータを`$1=instructionId, $2=projectId, $3=organizationId`に変更
- [ ] コメント更新

**変更内容:**
```sql
-- 修正前
SELECT history_id, acknowledged_at
FROM instruction_acknowledged_history
WHERE experiment_instruction_id = $1 
  AND organization_id = $2

-- 修正後
SELECT acknowledged_at
FROM instruction_acknowledged_history
WHERE experiment_instruction_id = $1 
  AND project_id = $2
  AND organization_id = $3
ORDER BY acknowledged_at DESC
LIMIT 1
```

#### Step 1-2: findById.sqlの修正
- [ ] `project_id`をSELECTに追加
- [ ] `project_id`フィルタをWHERE句に追加
- [ ] パラメータを`$1=instructionId, $2=projectId, $3=organizationId`に変更
- [ ] コメント更新

**変更内容:**
```sql
-- 修正前
SELECT experiment_instruction_id as instruction_id, organization_id
FROM project_instruction
WHERE experiment_instruction_id = $1 
  AND organization_id = $2

-- 修正後
SELECT experiment_instruction_id as instruction_id, project_id, organization_id
FROM project_instruction
WHERE experiment_instruction_id = $1 
  AND project_id = $2
  AND organization_id = $3
```

#### Step 1-3: insertAcknowledged.sqlの修正
- [ ] カラム名を`instruction_id`→`experiment_instruction_id`に修正
- [ ] カラム名を`acknowledged_user_id`→`experiment_user_id`に修正
- [ ] `project_id`カラムを追加
- [ ] RETURNINGから`history_id`を削除
- [ ] パラメータを`$1=instructionId, $2=projectId, $3=userId, $4=organizationId`に変更
- [ ] コメント更新

**変更内容:**
```sql
-- 修正前
INSERT INTO instruction_acknowledged_history (
  instruction_id,
  acknowledged_user_id,
  acknowledged_at,
  organization_id
) VALUES ($1, $2, NOW(), $3)
RETURNING history_id, acknowledged_at

-- 修正後
INSERT INTO instruction_acknowledged_history (
  experiment_instruction_id,
  project_id,
  experiment_user_id,
  organization_id,
  acknowledged_at
) VALUES ($1, $2, $3, $4, NOW())
RETURNING acknowledged_at
```

#### Step 1-4: checkWorkerAssignment.sqlの修正
- [ ] カラム名を`instruction_id`→`experiment_instruction_id`に修正
- [ ] `project_id`フィルタを追加
- [ ] パラメータを`$1=instructionId, $2=projectId, $3=userId, $4=organizationId`に変更
- [ ] コメント更新

**変更内容:**
```sql
-- 修正前
WHERE pi.instruction_id = $1
  AND pt.worker_user_id = $2
  AND pt.organization_id = $3
  AND pi.organization_id = $3

-- 修正後
WHERE pi.experiment_instruction_id = $1
  AND pi.project_id = $2
  AND pt.worker_user_id = $3
  AND pt.organization_id = $4
  AND pi.organization_id = $4
```

### Phase 2: TypeScript型定義の修正

#### Step 2-1: instructionRepository.ts型定義の修正
- [ ] `AcknowledgedHistoryRow`から`history_id`を削除
- [ ] `InstructionRow`に`project_id`を追加

**変更内容:**
```typescript
// 修正前
export interface AcknowledgedHistoryRow {
  history_id: string;
  acknowledged_at: Date;
}

export interface InstructionRow {
  instruction_id: string;
  organization_id: string;
}

// 修正後
export interface AcknowledgedHistoryRow {
  acknowledged_at: Date;
}

export interface InstructionRow {
  instruction_id: string;
  project_id: string;
  organization_id: string;
}
```

### Phase 3: Repository関数の修正

#### Step 3-1: findById()関数の修正
- [ ] パラメータに`projectId`を追加（第2引数）
- [ ] SQLクエリのパラメータ配列に`projectId`を追加

**変更内容:**
```typescript
// 修正前
export async function findById(
  instructionId: string,
  organizationId: string
): Promise<InstructionRow | null> {
  // ...
  const result = await pgp.oneOrNone<InstructionRow>(
    sqlQuery,
    [instructionId, organizationId]
  );
  // ...
}

// 修正後
export async function findById(
  instructionId: string,
  projectId: string,
  organizationId: string
): Promise<InstructionRow | null> {
  // ...
  const result = await pgp.oneOrNone<InstructionRow>(
    sqlQuery,
    [instructionId, projectId, organizationId]
  );
  // ...
}
```

#### Step 3-2: checkAcknowledged()関数の修正
- [ ] パラメータに`projectId`を追加（第2引数）
- [ ] SQLクエリのパラメータ配列に`projectId`を追加

**変更内容:**
```typescript
// 修正前
export async function checkAcknowledged(
  instructionId: string,
  organizationId: string
): Promise<AcknowledgedHistoryRow | null> {
  // ...
  const result = await pgp.oneOrNone<AcknowledgedHistoryRow>(
    sqlQuery,
    [instructionId, organizationId]
  );
  // ...
}

// 修正後
export async function checkAcknowledged(
  instructionId: string,
  projectId: string,
  organizationId: string
): Promise<AcknowledgedHistoryRow | null> {
  // ...
  const result = await pgp.oneOrNone<AcknowledgedHistoryRow>(
    sqlQuery,
    [instructionId, projectId, organizationId]
  );
  // ...
}
```

#### Step 3-3: checkWorkerAssignment()関数の修正
- [ ] パラメータに`projectId`を追加（第2引数）
- [ ] SQLクエリのパラメータ配列に`projectId`を追加

**変更内容:**
```typescript
// 修正前
export async function checkWorkerAssignment(
  instructionId: string,
  userId: string,
  organizationId: string
): Promise<TaskAssignmentRow[]> {
  // ...
  const result = await pgp.any<TaskAssignmentRow>(
    sqlQuery,
    [instructionId, userId, organizationId]
  );
  // ...
}

// 修正後
export async function checkWorkerAssignment(
  instructionId: string,
  projectId: string,
  userId: string,
  organizationId: string
): Promise<TaskAssignmentRow[]> {
  // ...
  const result = await pgp.any<TaskAssignmentRow>(
    sqlQuery,
    [instructionId, projectId, userId, organizationId]
  );
  // ...
}
```

#### Step 3-4: insertAcknowledged()関数の修正
- [ ] パラメータに`projectId`を追加（第2引数）
- [ ] SQLクエリのパラメータ配列に`projectId`を追加

**変更内容:**
```typescript
// 修正前
export async function insertAcknowledged(
  instructionId: string,
  userId: string,
  organizationId: string
): Promise<AcknowledgedHistoryRow> {
  // ...
  const result = await pgp.one<AcknowledgedHistoryRow>(
    sqlQuery,
    [instructionId, userId, organizationId]
  );
  // ...
}

// 修正後
export async function insertAcknowledged(
  instructionId: string,
  projectId: string,
  userId: string,
  organizationId: string
): Promise<AcknowledgedHistoryRow> {
  // ...
  const result = await pgp.one<AcknowledgedHistoryRow>(
    sqlQuery,
    [instructionId, projectId, userId, organizationId]
  );
  // ...
}
```

### Phase 4: Service層の修正

#### Step 4-1: projectService.confirmInstruction()の修正
- [ ] 関数シグネチャに`projectId`パラメータを追加（第2引数）
- [ ] 4つのRepository呼び出しに`projectId`を追加

**変更内容:**
```typescript
// 修正前
async confirmInstruction(
  instructionId: string,
  userId: string,
  organizationId: string,
  role: string
): Promise<ServiceResult<InstructionConfirmationData>> {
  // ...
  const instruction = await instructionRepository.findById(instructionId, organizationId);
  const acknowledgedHistory = await instructionRepository.checkAcknowledged(instructionId, organizationId);
  const taskAssignments = await instructionRepository.checkWorkerAssignment(instructionId, userId, organizationId);
  const insertedHistory = await instructionRepository.insertAcknowledged(instructionId, userId, organizationId);
  // ...
}

// 修正後
async confirmInstruction(
  instructionId: string,
  projectId: string,
  userId: string,
  organizationId: string,
  role: string
): Promise<ServiceResult<InstructionConfirmationData>> {
  // ...
  const instruction = await instructionRepository.findById(instructionId, projectId, organizationId);
  const acknowledgedHistory = await instructionRepository.checkAcknowledged(instructionId, projectId, organizationId);
  const taskAssignments = await instructionRepository.checkWorkerAssignment(instructionId, projectId, userId, organizationId);
  const insertedHistory = await instructionRepository.insertAcknowledged(instructionId, projectId, userId, organizationId);
  // ...
}
```

### Phase 5: Controller層の修正

#### Step 5-1: projectController.confirmInstruction()の修正
- [ ] `projectName`パラメータを取得
- [ ] `projectName`から`projectId`を取得（既存パターン踏襲）
- [ ] Service層呼び出しに`projectId`を追加

**変更内容:**
```typescript
// 修正前
export async function confirmInstruction(req: Request, res: Response): Promise<void> {
  // ...
  const { organizationId, userId, role } = req.user as any;
  const { instructionId } = req.params;

  const result = await projectService.confirmInstruction(
    instructionId,
    userId,
    organizationId,
    role
  );
  // ...
}

// 修正後
export async function confirmInstruction(req: Request, res: Response): Promise<void> {
  // ...
  const { organizationId, userId, role } = req.user as any;
  const { projectName, instructionId } = req.params;

  // projectNameからprojectIdを取得
  const { getPool } = require('../database/db');
  const pool = getPool();
  const projectQuery = 'SELECT project_id FROM project WHERE organization_id = $1 AND project_name = $2';
  const projectResult = await pool.query(projectQuery, [organizationId, projectName]);
  
  if (projectResult.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'RESOURCE_NOT_FOUND', message: 'プロジェクトが見つかりません' },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
    return;
  }
  
  const projectId = projectResult.rows[0].project_id;

  const result = await projectService.confirmInstruction(
    instructionId,
    projectId,
    userId,
    organizationId,
    role
  );
  // ...
}
```

## 4. 影響範囲

### 変更するファイル
1. `backend/src/sql/queries/instructions/checkAcknowledged.sql` - SQLクエリ修正
2. `backend/src/sql/queries/instructions/findById.sql` - SQLクエリ修正
3. `backend/src/sql/queries/instructions/insertAcknowledged.sql` - SQLクエリ修正
4. `backend/src/sql/queries/instructions/checkWorkerAssignment.sql` - SQLクエリ修正
5. `backend/src/repositories/instructionRepository.ts` - 型定義・関数修正
6. `backend/src/services/projectService.ts` - 関数シグネチャ・呼び出し修正
7. `backend/src/controllers/projectController.ts` - projectId取得ロジック追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- **指示確認機能**: `PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm`
  - APIインターフェースは変更なし（内部実装のみ修正）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- **PostgreSQL**: データベース
- **pg-promise**: SQLクエリ実行
- **TypeScript**: 型安全性の確保

### アーキテクチャ上の考慮事項
- **マルチテナント分離**: `organization_id`と`project_id`の両方でフィルタリング
- **データ整合性**: ER図で定義された主キー・外部キーに準拠
- **既存パターンの踏襲**: `projectName` → `projectId`変換は他のエンドポイントと同じパターン

### セキュリティ考慮事項
- [x] マルチテナント分離（`organization_id`と`project_id`フィルタ）
- [x] Parameterized Queries使用（SQLインジェクション対策）
- [x] 権限チェック（`checkPermission`ミドルウェア適用済み）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| パラメータ順序の誤り | 高 | 中 | 各ファイル修正後に順序を確認 |
| 既存データとの不整合 | 高 | 低 | テーブル構造がER図と一致していることを前提とする |
| 型定義の不一致 | 中 | 低 | TypeScriptコンパイルエラーで検出 |
| 他の呼び出し箇所の見落とし | 中 | 低 | grep検索で全呼び出し箇所を確認済み |

## 7. テスト計画

### ユニットテスト
- [ ] instructionRepository.findById()のテスト
- [ ] instructionRepository.checkAcknowledged()のテスト
- [ ] instructionRepository.checkWorkerAssignment()のテスト
- [ ] instructionRepository.insertAcknowledged()のテスト

### 統合テスト
- [ ] 指示確認APIのエンドツーエンドテスト
- [ ] project_idによるフィルタリングの動作確認
- [ ] マルチテナント分離の動作確認

### 手動テスト
- [ ] Postmanで指示確認APIを実行
- [ ] データベースに正しくレコードが挿入されることを確認
- [ ] 404エラー（プロジェクト不在）の動作確認
- [ ] 400エラー（既確認）の動作確認

## 8. ロールバック計画

修正前のファイルはGitで管理されているため、問題が発生した場合は以下のコマンドでロールバック可能：

```bash
git checkout HEAD -- backend/src/sql/queries/instructions/
git checkout HEAD -- backend/src/repositories/instructionRepository.ts
git checkout HEAD -- backend/src/services/projectService.ts
git checkout HEAD -- backend/src/controllers/projectController.ts
```

## 9. 関連ドキュメント

- ER図: `docs/design/db/er_diagram.a5er`
- API仕様: `docs/design/api/api_project_management.md`
- データベース規約: `.clinerules/development/database.md`
- TypeScript規約: `.clinerules/development/typescript.md`

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 19:12
- **承認日時**: 2026-02-24 19:12（Act Modeで承認済み）
- **承認者コメント**: タスク計画書を作成し、作業を細かく分けて実行する

## 11. 実施記録

### 実施日時
開始: 2026-02-24 19:12
完了: （作業中）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] checkAcknowledged.sql修正完了
- [ ] findById.sql修正完了
- [ ] insertAcknowledged.sql修正完了
- [ ] checkWorkerAssignment.sql修正完了
- [ ] instructionRepository.ts修正完了
- [ ] projectService.ts修正完了
- [ ] projectController.ts修正完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）

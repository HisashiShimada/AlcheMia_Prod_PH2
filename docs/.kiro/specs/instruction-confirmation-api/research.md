# 調査ログ: instruction-confirmation-api

## サマリー

**機能分類**: 既存システム拡張 (Extension)  
**発見手法**: 軽量発見プロセス (Light Discovery)  
**調査日**: 2026-01-30

本機能は、既存のプロジェクト管理APIに新しいエンドポイント（指示確認完了API）を追加する拡張機能です。既存のアーキテクチャパターン、認証・認可メカニズム、データベース構造を踏襲し、新たな履歴管理テーブル（`instruction_acknowledged_history`）を導入します。

### 主要な発見事項

1. **既存パターンの再利用**: JWT + Session Hybrid認証、Kyselyクエリビルダー、Express.jsミドルウェアチェーン
2. **新規テーブル要件**: `instruction_acknowledged_history` テーブルの追加（確認履歴の記録）
3. **統合ポイント**: `backend/src/routes/projectRoutes.ts` への新規ルート追加
4. **既存テーブル依存**: `project_instruction`, `project_task`, `user_authentication` テーブルとの連携

---

## 調査トピック

### 1. 既存システム統合分析

#### 既存APIパターンの確認

**参照元**: `docs/design/api/api_project_management.md`

既存のプロジェクト管理APIは以下のパターンを確立：
- **認証方式**: JWT + Session Hybrid（`maiml_session-{sessionId}_{timestamp}`形式）
- **ミドルウェアチェーン**: `authMiddleware` → `permissionCheck` → コントローラー
- **レスポンス形式**: 統一レスポンス形式（`success`, `data`, `error`, `meta`）
- **マルチテナント分離**: すべてのクエリに`organization_id`フィルタ必須

**影響**: 新規APIも同じパターンを踏襲することで、実装の一貫性を確保。

#### 既存ルートファイル構造

**参照元**: `.clinerules/development/backend.md`

```
backend/src/routes/projectRoutes.ts
├── GET /api/v1/projects (一覧取得)
├── POST /api/v1/projects (作成)
├── GET /api/v1/projects/:projectName/files (ファイル一覧)
├── GET /api/v1/projects/:projectName/tasks (タスク一覧)
└── (新規追加) PUT /api/v1/instructions/:instructionId/confirm
```

**統合方針**: `projectRoutes.ts`に新規ルートを追加し、既存コントローラー・サービス層の構造を踏襲。

---

### 2. データベース設計分析

#### 既存テーブル構造

**参照元**: `docs/design/api/api_project_management.md` (Section 12)

既存の関連テーブル：
1. **project_instruction**: 指示の基本情報を格納
   - `instruction_id` (PK, UUID)
   - `project_id` (FK)
   - `instruction_content` (指示内容)
   - `is_acknowledged` (確認フラグ) ← 更新不要（履歴管理に移行）
   - `organization_id` (マルチテナント分離)

2. **project_task**: タスク情報
   - `task_id` (PK)
   - `instruction_id` (FK) ← 指示とタスクの紐付け
   - `assign_user_id` (担当者ID)
   - `organization_id`

3. **user_authentication**: ユーザー情報
   - `user_id` (PK)
   - `user_name` (表示名)

#### 新規テーブル要件

**テーブル名**: `instruction_acknowledged_history`

**目的**: 指示確認の履歴を記録（監査証跡）

**スキーマ設計**:
```sql
CREATE TABLE instruction_acknowledged_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id UUID NOT NULL REFERENCES project_instruction(instruction_id),
  acknowledged_user_id UUID NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  organization_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_instruction 
    FOREIGN KEY (instruction_id) 
    REFERENCES project_instruction(instruction_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_organization 
    FOREIGN KEY (organization_id) 
    REFERENCES organization(organization_id) 
    ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_instruction_ack_history_instruction 
  ON instruction_acknowledged_history(instruction_id);
CREATE INDEX idx_instruction_ack_history_org 
  ON instruction_acknowledged_history(organization_id);
CREATE INDEX idx_instruction_ack_history_user 
  ON instruction_acknowledged_history(acknowledged_user_id);
```

**設計判断**:
- 履歴テーブルとして分離（`project_instruction`は更新しない）
- `CASCADE DELETE`で親指示削除時に履歴も削除
- 監査証跡のため`created_at`も記録

---

### 3. 技術スタック整合性

#### 使用技術の確認

**参照元**: `.clinerules/development/backend.md`

| レイヤー | 技術 | バージョン | 役割 |
|---------|------|-----------|------|
| Backend | Express.js | 4.18+ | ルーティング、ミドルウェア |
| 言語 | TypeScript | 5.x | 型安全性 |
| DB | PostgreSQL | 13+ | データ永続化 |
| Query Builder | Kysely | 最新 | 型安全なクエリ構築 |
| 認証 | jsonwebtoken | 最新 | JWT検証 |

**統合性評価**: ✅ すべて既存スタックと互換性あり。新規ライブラリの追加不要。

#### Kyselyクエリパターン

**単一テーブル操作（推奨）**:
```typescript
// 履歴レコード追加
await db
  .insertInto('instruction_acknowledged_history')
  .values({
    instruction_id: instructionId,
    acknowledged_user_id: userId,
    acknowledged_at: new Date().toISOString(),
    organization_id: organizationId
  })
  .returningAll()
  .executeTakeFirstOrThrow();
```

**JOINクエリ（外部SQLファイル使用）**:
- ユーザー名取得時に`user_authentication`テーブルとJOIN
- `backend/src/sql/queries/instructions/getAcknowledgedInstruction.sql`に配置

---

### 4. セキュリティ考慮事項

#### マルチテナント分離の実装

**必須チェック**:
1. すべてのDBクエリに`organization_id`フィルタ
2. `authMiddleware`で`req.user.organizationId`を取得
3. クロステナントアクセスの防止

**実装例**:
```typescript
// ✅ 良い例: organization_idフィルタ必須
const instruction = await db
  .selectFrom('project_instruction')
  .where('instruction_id', '=', instructionId)
  .where('organization_id', '=', req.user.organizationId)
  .selectAll()
  .executeTakeFirstOrThrow();
```

#### 権限チェック

**ロール別アクセス制御**:
- `experiment_worker`: 自分に割り当てられた指示のみ確認可能
- `experiment_admin`, `system_admin`: 所属組織内のすべての指示を確認可能

**実装戦略**:
```typescript
// ミドルウェアチェーン
router.put(
  '/instructions/:instructionId/confirm',
  authMiddleware,  // JWT認証、req.userに格納
  // permissionCheckは不要（全ロールアクセス可、ビジネスロジックで制御）
  instructionController.confirmInstruction
);

// コントローラー内でロール別チェック
if (req.user.role === 'experiment_worker') {
  // 自分のタスクに紐づく指示かチェック
  const task = await db
    .selectFrom('project_task')
    .where('instruction_id', '=', instructionId)
    .where('assign_user_id', '=', req.user.userId)
    .where('organization_id', '=', req.user.organizationId)
    .executeTakeFirst();
  
  if (!task) {
    throw new ForbiddenError('自分に割り当てられていない指示は確認できません');
  }
}
```

---

### 5. エラーハンドリング戦略

#### エラーケース分類

**4xx エラー (クライアントエラー)**:
1. **400 Bad Request**:
   - 指示が既に確認済み → `BUSINESS_ALREADY_ACKNOWLEDGED`
   - バリデーションエラー → `VALIDATION_ERROR`

2. **401 Unauthorized**:
   - JWT無効 → `AUTH_TOKEN_INVALID`

3. **403 Forbidden**:
   - 権限不足（他人の指示を確認しようとした） → `PERMISSION_INSUFFICIENT`

4. **404 Not Found**:
   - 指示が存在しない → `RESOURCE_NOT_FOUND`

**5xx エラー (サーバーエラー)**:
1. **500 Internal Server Error**:
   - データベースエラー → `SYSTEM_DATABASE_ERROR`
   - システムエラー → `SYSTEM_ERROR`

#### エラーレスポンス統一

**参照元**: `.clinerules/development/api.md`

```typescript
// エラーハンドリングミドルウェアで統一処理
{
  "success": false,
  "error": {
    "code": "BUSINESS_ALREADY_ACKNOWLEDGED",
    "message": "この指示は既に確認済みです",
    "details": []
  },
  "meta": {
    "timestamp": "2026-01-30T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 6. パフォーマンス最適化

#### クエリ効率化

**N+1問題の回避**:
- ユーザー名取得時にJOINを使用（別クエリ実行を避ける）
- 外部SQLファイルで最適化されたJOINクエリを定義

**インデックス活用**:
```sql
-- instruction_acknowledged_history テーブル
CREATE INDEX idx_instruction_ack_history_instruction 
  ON instruction_acknowledged_history(instruction_id);  -- WHERE句で使用
CREATE INDEX idx_instruction_ack_history_org 
  ON instruction_acknowledged_history(organization_id);  -- マルチテナント分離
```

**レスポンス時間目標**: 500ms以内（requirements.md Requirement 9）

#### トランザクション不要

**判断根拠**:
- 単一テーブル（`instruction_acknowledged_history`）への挿入のみ
- `project_instruction`テーブルは更新しない（履歴管理のみ）
- トランザクション不要、シンプルなINSERT操作で完結

---

### 7. テスト戦略

#### ユニットテスト対象

1. **サービス層**:
   - `instructionService.confirmInstruction()` メソッド
   - ビジネスロジック（既確認チェック、権限チェック）
   - DBクエリのモック

2. **コントローラー層**:
   - リクエストパラメータの抽出
   - レスポンス形成
   - エラーハンドリング

#### 統合テスト対象

1. **APIエンドポイント**:
   - 正常系: 指示確認成功
   - 異常系: 既確認エラー、権限エラー、リソース不在

2. **認証・認可**:
   - JWTトークン検証
   - ロール別アクセス制御

#### テストカバレッジ目標

**参照元**: `requirements.md` (Success Metrics)

- コードカバレッジ: 80%以上
- ブランチカバレッジ: 70%以上

---

## アーキテクチャパターン評価

### 選択パターン: レイヤードアーキテクチャ（既存踏襲）

**理由**:
1. 既存システムと一貫性を保つ
2. 単一責任の原則（SRP）を維持
3. テスト容易性の確保

**レイヤー構成**:
```
Routes (projectRoutes.ts)
  ↓
Controller (projectController.confirmInstruction)
  ↓
Service (instructionService.confirmInstruction)
  ↓
Database (Kysely Query Builder)
```

---

## 技術的決定事項

### 決定1: 履歴テーブルの導入

**判断**: `instruction_acknowledged_history`テーブルを新規作成

**根拠**:
- 監査証跡の要件（Requirement 8）
- 複数回の確認履歴を記録可能
- `project_instruction`テーブルの肥大化を防止

**代替案**: `project_instruction`テーブルに`acknowledged_at`カラムを追加
- ❌ 却下理由: 履歴管理ができない、監査証跡として不十分

---

### 決定2: Kyselyクエリビルダーの使用

**判断**: 単一テーブル操作はKysely、JOINは外部SQLファイル

**根拠**:
- 既存パターンとの一貫性（`.clinerules/development/backend.md`）
- 型安全性の確保
- SQLインジェクション対策（Parameterized Query自動生成）

---

### 決定3: トランザクション不使用

**判断**: トランザクション不要

**根拠**:
- 単一テーブルへの挿入のみ
- `project_instruction`テーブルは更新しない
- 複雑性を避け、シンプルに保つ

---

## リスクと緩和策

### リスク1: 同時実行競合（重複確認）

**影響度**: 中  
**発生確率**: 低

**シナリオ**: 同一ユーザーが同じ指示を短時間に複数回確認しようとする

**緩和策**:
1. ビジネスロジックで既確認チェック（`instruction_acknowledged_history`テーブルを検索）
2. 既に確認済みの場合は400エラーを返却

**実装**:
```typescript
// 既確認チェック
const existingHistory = await db
  .selectFrom('instruction_acknowledged_history')
  .where('instruction_id', '=', instructionId)
  .where('acknowledged_user_id', '=', req.user.userId)
  .where('organization_id', '=', req.user.organizationId)
  .executeTakeFirst();

if (existingHistory) {
  throw new BadRequestError('この指示は既に確認済みです');
}
```

---

### リスク2: パフォーマンス劣化

**影響度**: 中  
**発生確率**: 低

**シナリオ**: 大量の指示確認操作により`instruction_acknowledged_history`テーブルが肥大化

**緩和策**:
1. インデックスの適切な設計（`instruction_id`, `organization_id`, `acknowledged_user_id`）
2. 定期的なテーブルメンテナンス（VACUUM、ANALYZE）
3. 古い履歴データのアーカイブ化（将来的な拡張）

---

### リスク3: マルチテナント分離不備

**影響度**: 致命的  
**発生確率**: 低（既存パターン踏襲により）

**シナリオ**: `organization_id`フィルタ漏れによるクロステナントアクセス

**緩和策**:
1. すべてのDBクエリに`organization_id`フィルタを必須化
2. コードレビューでの厳密なチェック
3. 統合テストでの検証

---

## 統合ポイント詳細

### 1. ルート層統合

**ファイル**: `backend/src/routes/projectRoutes.ts`

**追加内容**:
```typescript
router.put(
  '/instructions/:instructionId/confirm',
  authMiddleware,
  instructionController.confirmInstruction
);
```

**既存ルートとの関係**: プロジェクト管理APIの一部として追加

---

### 2. コントローラー層統合

**ファイル**: `backend/src/controllers/projectController.ts`

**新規メソッド**: `confirmInstruction`

**責務**:
- リクエストパラメータの抽出（`instructionId`）
- サービス層の呼び出し
- レスポンス形成（統一形式）
- エラーハンドリング

---

### 3. サービス層統合

**ファイル**: `backend/src/services/projectService.ts`

**新規メソッド**: `confirmInstruction`

**責務**:
- ビジネスロジックの実装
- 指示存在確認
- 既確認チェック
- 権限チェック（ロール別）
- 履歴レコード挿入
- ユーザー名取得

---

### 4. 型定義統合

**ファイル**: `backend/src/types/instruction.ts`（新規作成）

**型定義**:
```typescript
export interface InstructionAcknowledgement {
  instruction_id: string;
  is_acknowledged: boolean;
  acknowledged_at: string;
  acknowledged_user_id: string;
  acknowledged_user_name: string;
}

export interface AcknowledgementHistory {
  history_id: string;
  instruction_id: string;
  acknowledged_user_id: string;
  acknowledged_at: string;
  organization_id: string;
  created_at: string;
}
```

---

## 実装優先順位

### Phase 1: 基盤準備（優先度: 高）
1. データベーススキーマ追加（`instruction_acknowledged_history`テーブル）
2. 型定義作成（`backend/src/types/instruction.ts`）

### Phase 2: コア実装（優先度: 高）
1. サービス層実装（`instructionService.confirmInstruction`）
2. コントローラー層実装（`instructionController.confirmInstruction`）
3. ルート追加（`projectRoutes.ts`）

### Phase 3: テスト実装（優先度: 中）
1. ユニットテスト（サービス、コントローラー）
2. 統合テスト（APIエンドポイント）

### Phase 4: ドキュメント更新（優先度: 中）
1. API仕様書更新（`api_project_management.md`）
2. README更新

---

## 参照資料

### 内部ドキュメント
- `docs/design/api/api_project_management.md` - API仕様書（Section 12: 指示確認完了API）
- `.clinerules/development/backend.md` - バックエンド規約
- `.clinerules/development/api.md` - API設計ポリシー
- `.clinerules/development/security.md` - セキュリティ規約

### 外部参照
- [Kysely Documentation](https://kysely.dev/) - TypeScript Query Builder
- [Express.js Guide](https://expressjs.com/) - ルーティング、ミドルウェア
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - データベース

---

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-30 | 初版作成（軽量発見プロセス実施） | Cline |

---

**調査完了日**: 2026-01-30  
**次のステップ**: design.md の生成
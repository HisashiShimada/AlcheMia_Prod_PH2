# タスク計画書: 指示送信タブバックエンド実装とフロントエンド接続

## メタデータ
- **作成日時**: 2026-02-24 08:20
- **タスクID**: instruction-send-backend-implementation
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

プロジェクト管理画面の「指示登録」タブで、**指示の保存と送信を分離**する機能を実装する。

### 背景
- フロントエンドのInstructionRegistrationTab.tsxは実装済みだが、API呼び出し部分がモック
- 既存のバックエンド実装は画面変更により仕様が合わない
- **新仕様**: 指示の保存（未送信）と送信（送信済）を分離

### 機能要件
1. **指示の保存（個別）**: 指示編集ダイアログで保存 → project_instructionに未送信(0)で保存
2. **指示の一括送信**: 一括送信ボタン押下 → 未送信指示をすべて送信済(1)に更新 + タスク作成

### アプローチ
**DB変更（マイグレーション） → 既存コード削除 → 新規実装 → フロントエンド接続**

## 2. 目的と期待される成果

### 目的
指示の保存と送信を分離し、実験管理者が指示を段階的に登録・送信できる機能を実現する

### 期待される成果
- [x] 現状分析完了
- [x] マイグレーションファイル作成
- [ ] マイグレーション実行
- [ ] 既存コード削除
- [ ] 新規コントローラー・サービス層実装（保存・編集・送信）
- [ ] リポジトリ層の実装
- [ ] バックエンドAPIルート追加（3エンドポイント）
- [ ] フロントエンドAPI接続
- [ ] 動作確認完了

## 3. 実装ステップ

### Phase 0: DBマイグレーション
- [x] マイグレーションファイル作成（`20260224_add_instruction_status.sql`）
- [x] マイグレーション実行（instruction_statusカラム追加）

### Phase 1: 既存コード削除
- [x] `backend/src/controllers/instructionController.ts` 削除（ファイルは存在せず）
- [x] `backend/src/services/instructionService.ts` 削除（ファイルは存在せず）
- [x] **`backend/src/repositories/taskRepository.ts` 削除**（ファイルは存在せず）

### Phase 2: リポジトリ層のリファクタリング（テーブル単位化）
- [x] `projectTaskRepository.ts` 新規作成（project_taskテーブル専用）
- [x] `projectTaskDetailRepository.ts` 新規作成（project_task_detailテーブル専用）
- [x] `projectInstructionRepository.ts` 新規作成（project_instructionテーブル専用）
  - `insert()` - 指示を保存（未送信: status=0）
  - `update()` - 指示を更新（未送信のみ）
  - `bulkUpdateStatus()` - 未送信指示を一括で送信済に更新
  - `findByProject()` - プロジェクト内の指示一覧取得
  - `deleteById()` - 指示を削除（未送信のみ）

### Phase 3: バックエンド新規実装（コントローラー・サービス層）
- [x] `projectInstructionController.ts` 新規作成
  - `getTaskRegistrationStatus()` - タスク登録状況取得（ボタン活性制御用）
  - `saveInstruction()` - 指示を保存（未送信）
  - `updateInstruction()` - 指示を更新（未送信）
  - `deleteInstruction()` - 指示を削除（未送信）
  - `sendInstructions()` - 未送信指示を一括送信
- [x] `projectInstructionService.ts` 新規作成
  - タスク登録状況の確認ロジック
  - トランザクション処理（送信時: 指示ステータス更新 + タスク作成 + プロジェクトステータス更新）

### Phase 4: ルート定義（5エンドポイント）
- [x] `GET /api/v1/projects/:projectName/instructions/status` - タスク登録状況取得（ボタン活性制御用）
- [x] `POST /api/v1/projects/:projectName/instructions` - 指示を保存（未送信）
- [x] `PUT /api/v1/projects/:projectName/instructions/:instructionId` - 指示を更新（未送信）
- [x] `DELETE /api/v1/projects/:projectName/instructions/:instructionId` - 指示を削除（未送信）
- [x] `POST /api/v1/projects/:projectName/instructions/send` - 未送信指示を一括送信

### Phase 5: フロントエンド接続
- [x] `projectApiService.ts`にAPI関数追加
  - `getTaskRegistrationStatus()` - タスク登録状況取得
  - `saveInstruction()` - 指示保存
  - `updateInstruction()` - 指示更新
  - `deleteInstruction()` - 指示削除
  - `sendInstructions()` - 一括送信
- [x] `frontend/src/types/api.ts`に型定義追加（バックエンド型定義と同期）
- [ ] `InstructionRegistrationTab.tsx`のAPI呼び出し実装
  - 初期表示時に`getTaskRegistrationStatus()`を呼び出し
  - タスク登録状況に応じてボタンの活性/非活性を制御
- [ ] `InstructionEditDialog.tsx`のAPI呼び出し実装

### Phase 6: テスト・検証
- [ ] 正常系テスト（保存・更新・削除・送信）
- [ ] 異常系テスト
- [ ] マルチテナント分離確認
- [ ] 権限チェック確認

## 4. 影響範囲

### 削除するファイル
1. `backend/src/controllers/instructionController.ts` - 既存実装削除
2. `backend/src/services/instructionService.ts` - 既存実装削除
3. `backend/src/repositories/taskRepository.ts` - テーブル単位に分割するため削除

### 新規作成するファイル
1. `backend/migrations/20260224_add_instruction_status.sql` - マイグレーションファイル（作成済み）
2. `backend/src/controllers/projectInstructionController.ts` - 指示CRUD+送信コントローラー
3. `backend/src/services/projectInstructionService.ts` - 指示CRUD+送信サービス
4. `backend/src/repositories/projectTaskRepository.ts` - project_taskテーブル専用Repository
5. `backend/src/repositories/projectTaskDetailRepository.ts` - project_task_detailテーブル専用Repository
6. `backend/src/repositories/projectInstructionRepository.ts` - project_instructionテーブル専用Repository

### 変更するファイル
1. `backend/src/routes/projectRoutes.ts` - 5エンドポイント追加
2. `backend/src/controllers/taskRegistrationController.ts` - 新Repositoryに置き換え
3. `backend/src/services/taskRegistrationService.ts` - 新Repositoryに置き換え
4. **その他taskRepository.ts使用箇所** - 新Repositoryに置き換え
5. `frontend/src/services/projectApiService.ts` - API関数追加（5つ）
6. `frontend/src/components/project/InstructionRegistrationTab.tsx` - API接続
7. `frontend/src/components/project/InstructionEditDialog.tsx` - API接続

### 影響を受ける機能
- プロジェクト管理画面 > 指示登録タブ（保存・編集・削除・送信）
- 実験作業者 > 指示確認タブ（送信済指示のみ表示）
- プロジェクトステータス管理（送信時に 0 → 1への遷移）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- Express.js: ルーティング、ミドルウェア
- express-validator: バリデーション
- pg: PostgreSQLクライアント
- axios: HTTPクライアント（フロントエンド）

### API仕様（5エンドポイント）

#### 1. タスク登録状況取得（初期表示・ボタン活性制御用）

**エンドポイント**: `GET /api/v1/projects/:projectName/task-registration-status`

**レスポンス（成功時）**:
```json
{
  "success": true,
  "data": {
    "hasRegisteredTasks": true,
    "taskCount": 3,
    "projectStatus": 0,
    "canSendInstructions": true
  },
  "meta": {
    "timestamp": "2026-02-24T08:20:00Z",
    "requestId": "req_abc123"
  }
}
```

**データ説明**:
- `hasRegisteredTasks`: タスクが登録されているか（true/false）
- `taskCount`: 登録されているタスク数
- `projectStatus`: プロジェクトステータス（0=計画中）
- `canSendInstructions`: 指示送信可能か（タスク登録済 && projectStatus=0）

**フロントエンドでの利用**:
- `hasRegisteredTasks=false` → 「指示登録」ボタン非活性
- `canSendInstructions=false` → 「指示送信」ボタン非活性
- `projectStatus≠0` → タスク登録不可メッセージ表示

#### 2. 指示を保存（未送信）

**エンドポイント**: `POST /api/v1/projects/:projectName/instructions`

**リクエストボディ**:
```typescript
{
  "methodId": "method_001",
  "transitionId": "transition_001" | null,
  "taskNumber": 1 | null,
  "priority": 2,  // 0:低, 1:通常, 2:中, 3:高
  "type": 0,      // 0:一般, 1:セットアップ, 2:測定, 3:安全, 4:清掃
  "content": "指示内容"
}
```

**レスポンス（成功時）**:
```json
{
  "success": true,
  "data": {
    "instructionId": "uuid-generated",
    "instruction_status": 0
  },
  "meta": {
    "timestamp": "2026-02-24T08:20:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 3. 指示を更新（未送信のみ）

**エンドポイント**: `PUT /api/v1/projects/:projectName/instructions/:instructionId`

**リクエストボディ**: 指示保存と同じ

**レスポンス（成功時）**:
```json
{
  "success": true,
  "data": {
    "instructionId": "uuid",
    "updated": true
  }
}
```

#### 4. 指示を削除（未送信のみ）

**エンドポイント**: `DELETE /api/v1/projects/:projectName/instructions/:instructionId`

**レスポンス（成功時）**:
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

#### 5. 未送信指示を一括送信

**エンドポイント**: `POST /api/v1/projects/:projectName/instructions/send`

**リクエストボディ**:
```typescript
{
  "tasks": TaskInput[]  // タスク登録タブで使用中の型を再利用
}
```

**レスポンス（成功時）**:
```json
{
  "success": true,
  "data": {
    "sentInstructionsCount": 5,
    "createdTasksCount": 3
  },
  "meta": {
    "timestamp": "2026-02-24T08:20:00Z",
    "requestId": "req_abc123"
  }
}
```

**処理フロー**:
1. プロジェクト内の未送信指示（instruction_status=0）をすべて取得
2. トランザクション開始
3. すべての指示のステータスを送信済（1）に更新
4. タスク（project_task）をUPSERT
5. タスク詳細（project_task_detail）を作成
6. プロジェクトステータスを0→1に更新
7. トランザクションコミット

### DBスキーマ変更

**新規カラム**: `project_instruction.instruction_status`
- 型: `numeric(1,0)`
- デフォルト: `0`
- 値: `0`=未送信, `1`=送信済
- インデックス: `(organization_id, project_id, instruction_status)`

### セキュリティ考慮事項
- [ ] organization_idフィルタ必須（マルチテナント分離）
- [ ] 権限チェック（experiment_admin, 書込可: 機能CD 040000）
- [ ] プロジェクトステータス検証（送信時のみ project_status = 0チェック）
- [ ] 未送信指示のみ更新・削除可能（instruction_status = 0）
- [ ] バリデーション（必須項目、型、範囲）
- [ ] トランザクション処理（送信時: 指示ステータス更新 + タスクUPSERT + プロジェクトステータス更新）
- [ ] ロールバック対応（エラー時は全処理を取り消し）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Repository分割による既存機能への影響 | 高 | 高 | 全taskRepository使用箇所を特定し、動作確認 |
| トランザクション失敗 | 高 | 中 | ロールバック実装、エラーログ記録 |
| バリデーション不足 | 中 | 中 | express-validatorで厳密に検証 |
| 権限チェック漏れ | 高 | 低 | checkPermissionミドルウェア使用 |
| フロントエンドエラー表示 | 低 | 中 | エラーメッセージの日本語化 |

## 7. テスト計画

### リファクタリングテスト（優先）
- [ ] タスク登録タブの動作確認（projectTaskRepository使用）
- [ ] その他taskRepository使用機能の動作確認
- [ ] 既存機能が正常に動作することを確認

### 正常系テスト
- [ ] 指示送信成功（タスク作成、プロジェクトステータス更新）
- [ ] 複数指示の一括送信
- [ ] 送信後のフロントエンド状態更新

### 異常系テスト
- [ ] プロジェクトが存在しない
- [ ] プロジェクトステータスが不正（0以外）
- [ ] バリデーションエラー（必須項目未入力）
- [ ] 権限不足（experiment_worker）
- [ ] トランザクション失敗時のロールバック

### セキュリティテスト
- [ ] クロステナントアクセス防止
- [ ] 権限チェック正常動作

## 8. ロールバック計画

問題発生時は以下の手順でロールバック:
1. 新規作成したコントローラー・サービスファイルを削除
2. ルート定義をコメントアウト
3. フロントエンドをモックAPI呼び出しに戻す
4. 削除した既存ファイルは復元しない（仕様が合わないため）
5. 必要に応じてコミットをrevert

## 9. 関連ドキュメント

- [指示登録タブUI仕様](../../design/ui/experiment_admin/01_project_management/ui_instruction_registration_tab.md)
- [プロジェクト管理API仕様](../../design/api/api_project_management.md)
- [project_instructionテーブルDDL](../../design/db/ddl/project_instruction.sql)
- [バックエンド規約](../../.clinerules/development/backend.md)
- [セキュリティ規約](../../.clinerules/development/security.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 08:20
- **承認日時**: 2026-02-24 08:25
- **承認者コメント**: 承認。実装を開始してください。

## 11. DB操作規約違反の原因分析

### 発生した問題
Repository層で`upsert()`メソッドを使用し、カラムを明示的に列挙する実装を行った（`.clinerules/development/database.md`の規約違反）

### 規約の内容
1. **insertメソッドとupdateメソッドを1つずつ用意**
2. **テーブル型Objectを引数として受け取り、`Object.keys()`で動的にSQLクエリを構築**
3. **upsertロジックはService層で実装**（既存レコード確認 → insert/update分岐）

### 原因
1. **規約の理解不足**: `database.md`を読んだが「insert/updateメソッドを1つずつ」という基本原則を見落とした
2. **実装前の規約再確認を省略**: `workflow.md`の「4.5. 実装開始前の規約確認（必須）」ステップを実施しなかった
3. **効率優先の判断ミス**: upsert処理を1メソッドで実装する方が効率的と判断したが、規約では明確にService層での実装を要求していた

### 対策
**即時対策（実施済み）:**
- 3つのRepositoryファイルを規約準拠に修正（insert/updateメソッドに分離、動的SQL構築）
- Service層にupsertロジックを実装（既存レコード確認 → insert/update分岐）

**恒久対策（今後のタスク）:**
1. 実装前に必ず該当規約を熟読（特にDB操作を含むタスクでは`database.md`）
2. 実装中のPhase完了ごとに規約準拠を確認
3. 完了報告前に規約チェックリストで最終確認

### 教訓
**「規約は実装前・実装中・実装後の3回確認する」** - 今回は「実装中」「実装後」の確認を省略したことが原因

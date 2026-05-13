# タスク計画書: タスク登録タブの完全化

## メタデータ
- **作成日時**: 2026-02-20 08:19
- **タスクID**: task-registration-tab-completion
- **優先度**: 高
- **推定工数**: 9.5時間

## 1. タスク概要

プロジェクト管理画面のタスク登録タブについて、レイアウト修正とバックエンドAPI実装を行い、完全に動作可能な状態にします。現在はモックデータを使用していますが、実際のMAIMLファイルとデータベースとの連携を実装します。

## 2. 目的と期待される成果

### 目的
- タスク登録機能を完全に実装し、実験管理者がタスクを登録・管理できるようにする
- MAIMLファイルからメソッド情報を自動取得し、タスク作成を効率化する
- データベースへの永続化により、タスク情報を適切に管理する

### 期待される成果
- [x] 仕様の調査完了
- [ ] レイアウト修正完了（メソッドID表示、実験条件マスタ連携）
- [ ] 初期表示処理の実装（DB取得 → MAIML解析のフォールバック）
- [ ] 保存処理の実装（project_task + project_task_detail への登録）
- [ ] チェックアウト状態での編集制御
- [ ] APIエンドポイントの実装
- [ ] 動作確認完了

## 3. 仕様詳細

### 3.1 レイアウト修正

**変更内容:**
1. **メソッド表示**: メソッド名 → メソッドID に変更
   - 理由: MAIMLファイルにメソッド名を設定する処理がないため
   - 表示形式: メソッドID（例: `method_001`）

2. **実験条件ドロップダウン**: code_masterテーブルから取得
   - code_division: `experiment_condition`
   - 現在: 固定値（0: 全て同一条件, 1: 実験ごとに条件変更）
   - 変更後: code_masterから動的に取得

3. **編集制御**: チェックアウト済みプロジェクトは更新不可
   - project.checkout_status を確認
   - checkout_status = 1（チェックアウト済み）の場合、保存ボタンを無効化
   - ユーザーへのメッセージ表示

4. **MAIMLファイル未登録時の制御**: MAIMLファイルが未登録の場合、保存不可
   - project.project_maiml_flg を確認
   - project_maiml_flg = false（MAIMLファイルなし）の場合、保存ボタンを無効化
   - エラーメッセージ表示: 「MAIMLファイルが未登録のため、タスクを登録できません」

### 3.2 初期表示処理

**フローチャート:**
```
1. プロジェクトIDを受け取る
   ↓
2. project_taskテーブルを検索
   ↓
3. 登録あり？
   ├─ YES → project_taskから取得して表示
   └─ NO  → 4へ
   ↓
4. S3から最新MAIMLファイルを取得
   ↓
5. MAIMLファイルを解析してメソッドIDを抽出
   ↓
6. メソッドID一覧を表示（初期値: 実験条件=0, 試行回数=1）
```

**API設計:**
- **エンドポイント**: `GET /api/v1/projects/:projectName/task-registration`
- **レスポンス**:
```typescript
{
  tasks: [
    {
      methodId: string;
      experimentCondition: number;
      trialCount: number;
      experimentOrder: number;
    }
  ];
  isCheckoutLocked: boolean;
  experimentConditionOptions: [
    { value: number; label: string; }
  ];
}
```

### 3.3 保存処理

**処理内容:**
1. バリデーション
   - すべてのメソッドが設定されているか
   - 試行回数が1〜999の範囲内か
   - プロジェクトがチェックアウトされていないか

2. トランザクション開始

3. project_taskテーブルへのUPSERT
   - organization_id, project_id, method_id が主キー
   - experiment_order（作業順序）
   - experiment_condition（実験条件）
   - attempts_count（試行回数）
   - create_user_id, update_user_id（ログインユーザ）

4. project_task_detailテーブルへのINSERT
   - 既存レコードを削除してから新規作成
   - 試行回数分のレコードを生成
   - task_no: 1から連番
   - task_status: 0（初期状態）

5. トランザクションコミット

**API設計:**
- **エンドポイント**: `POST /api/v1/projects/:projectName/task-registration`
- **リクエストボディ**:
```typescript
{
  tasks: [
    {
      methodId: string;
      experimentCondition: number;
      trialCount: number;
    }
  ]
}
```

## 4. 実装ステップ

### Phase 1: バックエンドAPI実装（5時間）

#### Step 1.1: XSD準拠型の移植（1時間）
- [ ] `backend/src/types/maiml-unified.ts` 作成
  - [ ] フロントエンドの型定義を移植
  - [ ] MaimlRoot, Protocol, Method等の型定義
- [ ] `backend/src/types/xml-js-types.ts` 作成
  - [ ] xml-js形式の型定義
  - [ ] ヘルパー関数（normalizeXmlJsArray等）
- [ ] `backend/src/utils/maimlTypeConverter.ts` 作成
  - [ ] xml-js形式からXSD準拠型への変換ロジック
  - [ ] convertXmlJsToMaimlRoot関数等
- [ ] `backend/src/utils/maimlParserTyped.ts` 作成
  - [ ] MaimlParserTypedクラスの実装
  - [ ] getMethods()等のメソッド

#### Step 1.2: code_masterリポジトリ作成
- [ ] `backend/src/repositories/codeMasterRepository.ts` 作成
- [ ] `findByDivision(organizationId, codeDivision)` メソッド実装
- [ ] `experiment_condition` のコード値取得

#### Step 1.3: タスク登録取得API実装
- [ ] `backend/src/controllers/taskRegistrationController.ts` 作成
- [ ] `getTaskRegistration` メソッド実装
  - [ ] project_taskテーブルから取得
  - [ ] データがない場合、MAIMLファイルから解析
  - [ ] code_masterから実験条件オプション取得
  - [ ] checkout_status確認
- [ ] `backend/src/services/taskRegistrationService.ts` 作成
- [ ] ビジネスロジック実装

#### Step 1.4: タスク登録保存API実装
- [ ] `saveTaskRegistration` メソッド実装
  - [ ] バリデーション
  - [ ] トランザクション制御
  - [ ] project_task UPSERT
  - [ ] project_task_detail 削除＋INSERT
- [ ] エラーハンドリング

#### Step 1.5: ルート追加
- [ ] `backend/src/routes/taskRegistrationRoutes.ts` 作成
- [ ] `GET /api/v1/projects/:projectName/task-registration`
- [ ] `POST /api/v1/projects/:projectName/task-registration`
- [ ] バリデーションミドルウェア設定
- [ ] `backend/src/server.ts` にルート登録

#### Step 1.6: 型定義追加
- [ ] `backend/src/types/taskRegistration.ts` 作成
- [ ] リクエスト・レスポンスの型定義
- [ ] code_master の型定義追加

### Phase 2: フロントエンド修正（3時間）

#### Step 2.1: レイアウト修正
- [ ] `frontend/src/components/project/TaskRegistrationTab.tsx` 修正
- [ ] メソッド名 → メソッドID表示に変更
- [ ] 実験条件ドロップダウンを動的生成に変更
- [ ] チェックアウト状態での編集制御UI追加
- [ ] MAIMLファイル未登録時の保存ボタン非活性制御追加
- [ ] エラーメッセージ表示機能追加

#### Step 2.2: API連携実装
- [ ] 初期表示時のAPIコール実装
- [ ] `GET /api/v1/projects/:projectName/task-registration`
- [ ] レスポンスデータの状態反映

#### Step 2.3: 保存処理実装
- [ ] 保存ボタンクリック時のAPIコール実装
- [ ] `POST /api/v1/projects/:projectName/task-registration`
- [ ] エラーハンドリング
- [ ] 成功時のメッセージ表示

#### Step 2.4: 型定義更新
- [ ] `frontend/src/types/taskRegistration.ts` 更新
- [ ] API型定義と同期

### Phase 3: ドキュメント更新（30分）

#### Step 3.1: UI仕様書の更新
- [ ] `docs/design/ui/` 配下のUI仕様書を更新
- [ ] タスク登録タブの画面仕様を追加
- [ ] 画面レイアウト図の更新
- [ ] 制御仕様（チェックアウト、MAIML未登録）の追記

#### Step 3.2: API仕様書の更新
- [ ] `docs/design/api/` 配下のAPI仕様書を更新
- [ ] `GET /api/v1/projects/:projectName/task-registration` の仕様追加
- [ ] `POST /api/v1/projects/:projectName/task-registration` の仕様追加
- [ ] リクエスト・レスポンスの詳細を記載
- [ ] エラーコード一覧を更新

### Phase 4: テストと動作確認（1時間）

#### Step 4.1: バックエンドテスト
- [ ] code_masterリポジトリのユニットテスト
- [ ] taskRegistrationコントローラのテスト
- [ ] APIエンドポイントの統合テスト

#### Step 4.2: フロントエンドテスト
- [ ] 初期表示のテスト（DBデータあり・なし）
- [ ] 保存処理のテスト
- [ ] チェックアウト状態での制御テスト
- [ ] エラーケースのテスト

#### Step 4.3: E2Eテスト
- [ ] プロジェクト管理画面からタスク登録タブを開く
- [ ] MAIMLファイルからメソッドが取得されることを確認
- [ ] タスク情報を編集して保存
- [ ] DBに正しく保存されることを確認
- [ ] 再度開いた際にDBから取得されることを確認

## 5. 変更ファイル

### 新規作成
1. `backend/src/types/maiml-unified.ts` - XSD準拠型定義（フロントエンドから移植）
2. `backend/src/types/xml-js-types.ts` - xml-js形式の型定義
3. `backend/src/utils/maimlTypeConverter.ts` - 型変換ユーティリティ
4. `backend/src/utils/maimlParserTyped.ts` - 型安全なMAIMLパーサー
5. `backend/src/repositories/codeMasterRepository.ts` - code_masterテーブル操作
6. `backend/src/controllers/taskRegistrationController.ts` - タスク登録API
7. `backend/src/services/taskRegistrationService.ts` - ビジネスロジック
8. `backend/src/routes/taskRegistrationRoutes.ts` - ルート定義
9. `backend/src/types/taskRegistration.ts` - バックエンド型定義

### 修正
1. `frontend/src/components/project/TaskRegistrationTab.tsx` - UI修正・API連携
2. `frontend/src/types/taskRegistration.ts` - フロントエンド型定義更新
3. `backend/src/server.ts` - ルート登録
4. `backend/src/repositories/taskRepository.ts` - 必要に応じてメソッド追加

## 6. 技術的詳細

### 6.1 データベーステーブル構造

#### project_task テーブル
```sql
CREATE TABLE project_task (
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  method_id character varying NOT NULL,
  task_name character varying,
  experiment_order numeric(2,0),        -- 作業順序
  experiment_condition numeric(2,0),    -- 実験条件
  attempts_count numeric(3,0),          -- 試行回数
  create_user_id VARCHAR(50),
  create_at timestamp,
  update_user_id VARCHAR(50),
  update_at timestamp,
  CONSTRAINT project_task_PKC PRIMARY KEY (organization_id, project_id, method_id)
);
```

#### project_task_detail テーブル
```sql
CREATE TABLE project_task_detail (
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  method_id character varying NOT NULL,
  task_no numeric(3,0) NOT NULL,        -- タスク連番
  task_status numeric(2,0),             -- タスクステータス
  experiment_start_at timestamp,
  experiment_end_at timestamp,
  experiment_user_id VARCHAR(50),
  reviewed_at timestamp,
  review_user_id VARCHAR(50),
  create_user_id VARCHAR(50),
  create_at timestamp,
  update_user_id VARCHAR(50),
  update_at timestamp,
  CONSTRAINT project_task_detail_PKC PRIMARY KEY (organization_id, project_id, method_id, task_no)
);
```

#### code_master テーブル
```sql
CREATE TABLE code_master (
  organization_id UUID NOT NULL,
  code_division CHARACTER VARYING(30) NOT NULL,  -- 'experiment_condition'
  code_value CHARACTER VARYING(30) NOT NULL,      -- '0', '1'
  code_description TEXT,
  code_name CHARACTER VARYING(30) NOT NULL,       -- '全て同一条件', '実験ごとに条件変更'
  code_remark TEXT,
  create_user_id VARCHAR(50),
  update_user_id VARCHAR(50),
  create_at TIMESTAMP,
  update_at TIMESTAMP,
  CONSTRAINT code_master_PKC PRIMARY KEY (organization_id, code_division, code_value)
);
```

### 6.2 MAIMLファイル解析（XSD準拠型に統一）

**重要な変更**: 既存の `maimlService.parsePetriNetStructure()` ではなく、フロントエンドと同じXSD準拠型のパーサーを使用します。

**実装方針**:
1. `frontend/src/utils/maimlParserTyped.ts` をバックエンドに移植
2. `frontend/src/utils/maimlTypeConverter.ts` をバックエンドに移植
3. XSD準拠型定義（`maiml-unified`, `xml-js-types`）をバックエンドに追加
4. Node.js環境に対応（パッケージインポート調整）

**使用例**:
```typescript
import { MaimlParserTyped } from '../utils/maimlParserTyped';

// MAIMLファイルを解析
const parser = new MaimlParserTyped(maimlContent);

// メソッド一覧を取得
const methods = parser.getMethods();
const methodIds = methods.map(method => method.id);

// 例: ['method_001', 'method_002', 'method_003']
```

**移植時の注意点**:
- フロントエンドの `@/types/...` を `../types/...` に変更
- `xml-js` パッケージがバックエンドにインストールされていることを確認
- TypeScriptのコンパイル設定に合わせた調整

### 6.3 トランザクション処理

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // 1. project_task UPSERT
  await taskRepository.upsertTasks(tasks, projectId, organizationId, client);
  
  // 2. project_task_detail 削除
  await deleteExistingTaskDetails(projectId, organizationId, client);
  
  // 3. project_task_detail 挿入
  await taskRepository.createTaskDetails(tasks, projectId, organizationId, client);
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## 7. セキュリティ考慮事項

- [ ] すべてのDBクエリにorganization_idフィルタを含める（マルチテナント分離）
- [ ] Parameterized Queriesを使用（SQLインジェクション対策）
- [ ] 認証ミドルウェア適用（authMiddleware）
- [ ] 権限チェック実装（実験管理者のみアクセス可能）
- [ ] プロジェクトアクセス権限確認（所属組織のプロジェクトのみ）
- [ ] チェックアウト状態の確認（排他制御）

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MAIMLファイルが存在しない | 中 | 低 | エラーメッセージを表示し、手動入力を促す |
| MAIMLファイルの解析失敗 | 中 | 中 | エラーログ記録、フォールバック処理実装 |
| トランザクション失敗 | 高 | 低 | ロールバック処理、エラーメッセージ表示 |
| チェックアウト競合 | 中 | 中 | checkout_status確認、楽観的ロック実装検討 |
| code_masterデータ未登録 | 中 | 中 | デフォルト値を使用、マイグレーションで初期データ投入 |

## 9. テスト計画

### 9.1 ユニットテスト
- [ ] codeMasterRepository.findByDivision のテスト
- [ ] taskRegistrationService のロジックテスト
- [ ] taskRepository の UPSERT/INSERT テスト

### 9.2 統合テスト
- [ ] GET /api/v1/projects/:projectName/task-registration のテスト
  - [ ] DBデータあり
  - [ ] DBデータなし（MAIML解析）
  - [ ] MAIMLファイルなし（エラー）
- [ ] POST /api/v1/projects/:projectName/task-registration のテスト
  - [ ] 正常系
  - [ ] バリデーションエラー
  - [ ] チェックアウト済みエラー

### 9.3 手動テスト
- [ ] ブラウザでプロジェクト管理画面を開く
- [ ] タスク登録タブをクリック
- [ ] メソッド一覧が表示されることを確認
- [ ] 実験条件・試行回数を変更
- [ ] ドラッグ&ドロップで順序変更
- [ ] 保存ボタンをクリック
- [ ] 成功メッセージが表示されることを確認
- [ ] タブを再読み込みして、保存内容が反映されていることを確認

## 10. ロールバック計画

問題が発生した場合の対処手順:
1. 新規追加したAPIルートをコメントアウト
2. フロントエンドをモックデータ使用に戻す
3. データベースの変更（project_task, project_task_detail）をロールバック
4. Gitで当該コミットを revert

## 11. 関連ドキュメント

- [仕様書](../design/タスク登録_仕様.txt)
- [データベース設計](../design/db/ddl/project_task.sql)
- [データベース設計](../design/db/ddl/project_task_detail.sql)
- [データベース設計](../design/db/ddl/code_master.sql)
- [コーディング規約](../../.clinerules/development/config.md)
- [データベース操作規約](../../.clinerules/development/database.md)
- [セキュリティ規約](../../.clinerules/development/security.md)

## 12. 承認記録

- **計画書提示日時**: 2026-02-20 08:19
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 13. 実施記録

### 実施日時
開始: 2026-02-20 08:18
完了: 2026-02-20 09:10

### 計画からの変更点
- 型定義の規約違反を修正（インラインObjectをインターフェースに変更）
- リクエストパラメータ取得方法を修正（req.organizationId → req.user.organizationId）
- database.tsにProjectTask型定義を追加
- taskRepository.tsにfindByProjectメソッドを追加
- projectRoutes.tsにタスク登録ルートを統合（taskRegistrationRoutes.tsは作成せず）

### 発生した問題と解決方法
**問題1**: 型定義でインラインObjectを使用していた
- **解決**: .clinerules/development/typescript.mdに従い、database.tsにProjectTask型を定義

**問題2**: コントローラーでreq.organizationId, req.userIdを使用していた
- **解決**: 既存コード（projectController.ts）を参考にreq.user.organizationId, req.user.userIdに修正

**問題3**: バリデーションをコントローラー内で実装していた
- **解決**: バリデーションはミドルウェアで処理する方針に変更し、projectRoutes.tsでバリデーション定義

### 最終的な成果物
- [x] バックエンドAPI実装完了
  - [x] XSD準拠型の移植
  - [x] code_masterリポジトリ作成
  - [x] タスク登録取得/保存API実装
  - [x] ルート追加
- [x] フロントエンド修正完了
  - [x] 型定義更新
  - [x] API呼び出しロジック実装
  - [x] コンポーネント修正（実際のAPI呼び出し）
- [ ] ドキュメント更新（実施中）
- [ ] テストと動作確認（未実施）

## 14. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）

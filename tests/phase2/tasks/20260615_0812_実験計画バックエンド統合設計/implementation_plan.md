# 実装計画（フェーズ別）

> 作成日: 2026-06-15
> ステータス: **設計確定**

---

## 全体フェーズ概要

| フェーズ | 内容 | 優先度 | 概算工数 |
|--------|------|-------|---------|
| Phase 1 | データベース — マイグレーション | 🔴 最高 | 0.5日 |
| Phase 2 | バックエンド — 実験計画API | 🔴 最高 | 2日 |
| Phase 3 | バックエンド — 実験指示API | 🟡 高 | 1.5日 |
| Phase 4 | バックエンド — チェックアウト拡張 | 🟡 高 | 1日 |
| Phase 5 | フロントエンド — API接続 | 🟢 中 | 2日 |

---

## Phase 1: データベース（マイグレーション）

### 作成ファイル

| ファイル | 内容 |
|---------|------|
| `backend/migrations/20260615_001_create_experiment_plan.sql` | `experiment_plan` テーブル新規作成 |
| `backend/migrations/20260615_002_add_review_result_to_task_detail.sql` | `review_result` カラム追加 |
| `backend/migrations/20260615_003_add_task_status_ng_to_code_master.sql` | タスクステータス NG 追加 |

### タスクチェックリスト

- [ ] `20260615_001_create_experiment_plan.sql` の作成
  - `experiment_plan` テーブル DDL（`database_design.md` §2-1 参照）
  - 更新日時トリガー
  - インデックス（project, method）
  - FK制約（`project` テーブルへ ON DELETE CASCADE）
- [ ] `20260615_002_add_review_result_to_task_detail.sql` の作成
  - `ALTER TABLE project_task_detail ADD COLUMN review_result TEXT`
  - カラムコメント
- [ ] `20260615_003_add_task_status_ng_to_code_master.sql` の作成
  - `code_master` へ `task_status:06:NG` 追加
  - 重複INSERT防止の `WHERE NOT EXISTS` 付き
- [ ] `docs/design/db/ddl/experiment_plan.sql` に正式DDL格納
- [ ] `docs/design/db/db_table_list.md` にテーブル追記

---

## Phase 2: バックエンド — 実験計画API

### 作成・修正ファイル

| 種別 | ファイル | 内容 |
|------|---------|------|
| 型定義（新規） | `backend/src/types/experimentPlan.ts` | DBテーブル型・APIリクエスト/レスポンス型 |
| Repository（新規） | `backend/src/repositories/experimentPlanRepository.ts` | CRUD操作 |
| Service（新規） | `backend/src/services/experimentPlanService.ts` | ビジネスロジック |
| Controller（新規） | `backend/src/controllers/experimentPlanController.ts` | HTTPハンドラ |
| Route（新規） | `backend/src/routes/experimentPlanRoutes.ts` | ルーティング |
| サーバー登録（修正） | `backend/src/server.ts` | ルーター追加 |
| SQLファイル（新規） | `backend/src/sql/queries/experimentPlan/findByProject.sql` | 一覧取得SQL |
| SQLファイル（新規） | `backend/src/sql/queries/experimentPlan/upsert.sql` | UPSERT SQL |

### 2-1. 型定義: `backend/src/types/experimentPlan.ts`

```typescript
// --- Ref情報・注意事項のキー定数 ---
export const MGR_INSTRUCTION_KEYS = {
  CREATOR_UUID:         'mgr-instruction:requiredCreatorUUID',
  INSTRUMENT_UUID:      'mgr-instruction:requiredInstrumentUUID',
  OWNER_UUID:           'mgr-instruction:requiredOwnerUUID',
  CAUTION:              'mgr-instruction:caution',
  OPERATION_NOTE:       'mgr-instruction:operationNote',
  CHECK_ITEM:           'mgr-instruction:checkItem',
  PROHIBITED_ACTION:    'mgr-instruction:prohibitedAction',
  OTHER_NOTES:          'mgr-instruction:OtherNotes',
} as const;

// --- Transition単位の設定値型 ---
export interface TransitionPlanValues {
  // Ref情報（配列）
  'mgr-instruction:requiredCreatorUUID'?:    string[];
  'mgr-instruction:requiredInstrumentUUID'?: string[];
  'mgr-instruction:requiredOwnerUUID'?:      string[];
  // 注意事項（文字列）
  'mgr-instruction:caution'?:               string;
  'mgr-instruction:operationNote'?:         string;
  'mgr-instruction:checkItem'?:             string;
  'mgr-instruction:prohibitedAction'?:      string;
  'mgr-instruction:OtherNotes'?:            string;
  // テンプレート想定値（templateId → fieldKey → 文字列値）
  [templateId: string]: { [fieldKey: string]: string } | string[] | string | undefined;
}

// --- planned_values 全体型（TransitionID をトップレベルキーとする） ---
export interface ExperimentPlanPlannedValues {
  [transitionId: string]: TransitionPlanValues;
}

// --- DBテーブル行の型 ---
export interface ExperimentPlanRow {
  organization_id:  string;
  project_id:       string;
  method_id:        string;
  task_number:      number;
  planned_values:  ExperimentPlanPlannedValues;
  create_user_id:   string | null;
  create_at:        Date;
  update_user_id:   string | null;
  update_at:        Date;
}

// --- APIリクエスト型 ---
export interface UpsertExperimentPlanRequest {
  plannedValues: ExperimentPlanPlannedValues;
}

// --- APIレスポンス型（単一タブ） ---
export interface ExperimentPlanResponse {
  taskNumber:    number;
  plannedValues: ExperimentPlanPlannedValues;
  createdAt:      string;
  updatedAt:      string;
}
```

### 2-2. Repository: `experimentPlanRepository.ts`

```typescript
// 主要メソッド

/**
 * 指定project+methodの全タブデータを取得（task_number 昇順）
 */
findByProjectAndMethod(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<ExperimentPlanRow[]>

/**
 * 1タブ分を UPSERT（存在すれば UPDATE、なければ INSERT）
 */
upsert(
  data: ExperimentPlanRow
): Promise<ExperimentPlanRow>

/**
 * 指定 method の全タブを削除
 */
deleteByMethod(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<number>  // 削除件数

/**
 * 指定 project の全メソッド・全タブデータを取得（チェックアウト用）
 */
findAllByProject(
  organizationId: string,
  projectId: string
): Promise<ExperimentPlanRow[]>
```

### 2-3. Service: `experimentPlanService.ts`

```typescript
// 主要メソッド

/**
 * ダイアログ初期データ一括取得
 * - MAIMLからMethodInfo・Transitions・Templates取得
 * - DB（user, instrument テーブル）からAvailableRefs取得
 * - experimentPlanRepositoryから既存計画取得
 */
getPlanDialogData(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<PlanDialogData>

/**
 * 実験計画一括取得
 */
getExperimentPlans(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<ExperimentPlanTabData[]>

/**
 * 実験計画 UPSERT
 * - チェックアウト済みの場合はエラー（E7005）
 */
upsertExperimentPlan(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNumber: number,
  data: UpsertExperimentPlanRequest,
  userId: string
): Promise<{ savedAt: Date }>

/**
 * 実験計画削除
 * - MAIMLへの書き込み済みの場合はエラー（E7005）
 */
deleteExperimentPlans(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<{ deletedCount: number }>
```

### 2-4. タスクチェックリスト

- [ ] `backend/src/types/experimentPlan.ts` 作成
- [ ] `backend/src/sql/queries/experimentPlan/` ディレクトリ作成
  - [ ] `findByProject.sql` — 一覧取得SQL
  - [ ] `upsert.sql` — UPSERT SQL（`INSERT ... ON CONFLICT DO UPDATE`）
- [ ] `backend/src/repositories/experimentPlanRepository.ts` 作成
  - [ ] `findByProjectAndMethod()` 実装
  - [ ] `upsert()` 実装
  - [ ] `deleteByMethod()` 実装
  - [ ] `findAllByProject()` 実装（チェックアウト拡張用）
- [ ] `backend/src/services/experimentPlanService.ts` 作成
  - [ ] `getPlanDialogData()` 実装
  - [ ] `getExperimentPlans()` 実装
  - [ ] `upsertExperimentPlan()` 実装（チェックアウト済みチェック含む）
  - [ ] `deleteExperimentPlans()` 実装
- [ ] `backend/src/controllers/experimentPlanController.ts` 作成
  - [ ] `getPlanDialogData()` ハンドラ
  - [ ] `getExperimentPlans()` ハンドラ
  - [ ] `upsertExperimentPlan()` ハンドラ（入力バリデーション含む）
  - [ ] `deleteExperimentPlans()` ハンドラ
- [ ] `backend/src/routes/experimentPlanRoutes.ts` 作成
- [ ] `backend/src/server.ts` にルーター登録

---

## Phase 3: バックエンド — 実験指示API

### 作成・修正ファイル

| 種別 | ファイル | 内容 |
|------|---------|------|
| 型定義（新規） | `backend/src/types/experimentInstruction.ts` | APIレスポンス型 |
| Repository（修正） | `backend/src/repositories/templateDataRepository.ts` | 実験指示一覧用クエリ追加 |
| Repository（修正） | `backend/src/repositories/projectTaskDetailRepository.ts` | 承認/NG更新メソッド追加 |
| Service（新規） | `backend/src/services/experimentInstructionService.ts` | モック→実実装に差し替え |
| Controller（修正） | `backend/src/controllers/experimentInstructionController.ts` | モック削除・実Service呼び出し |
| SQLファイル（新規） | `backend/src/sql/queries/experimentInstruction/listWithValues.sql` | 想定値+実績値結合クエリ |
| Route（修正） | `backend/src/routes/experimentInstructionRoutes.ts` | 既存ルートを確認・整備 |

### 3-1. 実験指示一覧の結合クエリ設計

```sql
-- backend/src/sql/queries/experimentInstruction/listWithValues.sql
-- experiment_plan（想定値） と template_data（実績値）を結合

SELECT
  ep.method_id,
  ep.task_number,
  ep.planned_values,
  ep.notes             AS planned_notes,
  td.template_id,
  td.property_set      AS actual_values,
  ptd.task_status,
  ptd.review_result
FROM experiment_plan ep
LEFT JOIN template_data td
  ON  td.organization_id = ep.organization_id
  AND td.project_id      = ep.project_id
  AND td.method_id       = ep.method_id
  AND td.task_number     = ep.task_number
LEFT JOIN project_task_detail ptd
  ON  ptd.organization_id = ep.organization_id
  AND ptd.project_id      = ep.project_id
  AND ptd.method_id       = ep.method_id
  AND ptd.task_number     = ep.task_number
WHERE ep.organization_id = $1
  AND ep.project_id      = $2
  AND ep.task_number     > 0
ORDER BY ep.method_id, ep.task_number
```

### 3-2. `projectTaskDetailRepository.ts` 追加メソッド

```typescript
/**
 * タスク承認（task_status を '05' に更新）
 */
approveTask(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNumber: number
): Promise<void>

/**
 * タスクNG記録（task_status を '06' に、review_result を保存）
 */
recordTaskNg(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNumber: number,
  reviewResult: string
): Promise<void>
```

### 3-3. タスクチェックリスト

- [ ] `backend/src/types/experimentInstruction.ts` 作成
- [ ] `backend/src/sql/queries/experimentInstruction/` ディレクトリ作成
  - [ ] `listWithValues.sql` — 想定値+実績値結合クエリ
  - [ ] `getMethods.sql` — MAIMLからMethod一覧取得クエリ
- [ ] `backend/src/repositories/templateDataRepository.ts` 修正
  - [ ] `listForInstruction()` — 実験指示一覧用クエリ追加
- [ ] `backend/src/repositories/projectTaskDetailRepository.ts` 修正
  - [ ] `approveTask()` 追加
  - [ ] `recordTaskNg()` 追加
- [ ] `backend/src/services/experimentInstructionService.ts` 作成
  - [ ] `getExperimentInstructions()` 実装（想定値+実績値+差分計算）
  - [ ] `getMethods()` 実装
  - [ ] `approveTask()` 実装（ステータス検証含む）
  - [ ] `recordTaskNg()` 実装（reviewResult バリデーション含む）
- [ ] `backend/src/controllers/experimentInstructionController.ts` 修正
  - [ ] モックデータを削除
  - [ ] Service メソッドを呼び出す実装に差し替え
- [ ] ルーティング確認・整備

---

## Phase 4: バックエンド — チェックアウト処理拡張

### 修正ファイル

| 種別 | ファイル | 内容 |
|------|---------|------|
| Service（修正） | `backend/src/services/projectService.ts` | チェックアウト時 experiment_plan → MAIML 書き込みを追加 |
| Service（新規） | `backend/src/services/experimentPlanMaimlWriter.ts` | MAIML書き込みロジック（単一責任で分離） |

### 4-1. チェックアウト処理への追加ステップ

既存の `checkoutProject()` 関数に以下を追加:

```typescript
// projectService.ts の checkoutProject() 内
// （既存処理の後、MAIML保存の前に追加）

// 1. experiment_plan テーブルから全計画取得
const plans = await experimentPlanRepository.findAllByProject(
  organizationId, projectId
);

// 2. plans が存在する場合のみ MAIML に書き込み
if (plans.length > 0) {
  await experimentPlanMaimlWriter.writeToMaiml(
    organizationId, projectId, maimlContent, plans
  );
}
```

### 4-2. `experimentPlanMaimlWriter.ts` の責務

```typescript
/**
 * experiment_plan の planned_values を MAIML の property に書き込む
 *
 * 書き込み形式:
 *   <property key="mgr-instruction:{fieldKey}">
 *     <content xsi:type="stringType">{value}</content>
 *   </property>
 *
 * 適用ルール:
 *   - task_number=0（全体タブ）→ 全タスクに適用
 *   - task_number=N（タスクNタブ）→ タスクN専用ノードに適用
 *   - 既存の mgr-instruction: キーは上書き
 */
writeToMaiml(
  organizationId: string,
  projectId: string,
  maimlContent: string,
  plans: ExperimentPlanRow[]
): Promise<string>  // 更新後のMAIML XML文字列を返す
```

### 4-3. タスクチェックリスト

- [ ] `backend/src/services/experimentPlanMaimlWriter.ts` 新規作成
  - [ ] `writeToMaiml()` 実装
  - [ ] 全体タブ（task_number=0）の適用ロジック
  - [ ] タスクNタブの適用ロジック
  - [ ] 既存 `mgr-instruction:` キーの上書きロジック
  - [ ] notes の JSONB→文字列変換ロジック
- [ ] `backend/src/services/projectService.ts` 修正
  - [ ] `checkoutProject()` に experiment_plan 書き込みステップを追加
  - [ ] エラー時のロールバック処理

---

## Phase 5: フロントエンド — API接続

### 修正ファイル

| ファイル | 内容 |
|---------|------|
| `frontend/src/services/experimentPlanApiService.ts` | モック → 実API呼び出しに差し替え |
| `frontend/src/services/experimentInstructionApiService.ts` | モック → 実API呼び出しに差し替え |
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | API接続・ローディング・エラーハンドリング |
| `frontend/src/components/project/ExperimentInstructionTab.tsx` | API接続・ローディング・エラーハンドリング |
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | DataRecordDialogロジック統合 |
| `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | 実API接続 |

### 5-1. タスクチェックリスト

- [ ] `experimentPlanApiService.ts` 実API接続
  - [ ] `getPlanDialogData()` — GET plan-dialog-data
  - [ ] `getExperimentPlans()` — GET experiment-plans
  - [ ] `upsertExperimentPlan()` — PUT experiment-plans/:methodId/:taskNumber
  - [ ] `deleteExperimentPlans()` — DELETE experiment-plans/:methodId
- [ ] `experimentInstructionApiService.ts` 実API接続
  - [ ] `getExperimentInstructions()` — GET experiment-instructions
  - [ ] `getMethods()` — GET methods
  - [ ] `approveTask()` — PUT tasks/:methodId/:taskNumber/approve
  - [ ] `recordTaskNg()` — PUT tasks/:methodId/:taskNumber/ng
- [ ] `ExperimentPlanDialog.tsx` 修正
  - [ ] 初期データをAPIから取得（getPlanDialogData）
  - [ ] 保存をAPIに接続（upsertExperimentPlan）
  - [ ] ローディング・エラー表示
  - [ ] チェックアウト済み状態での編集禁止（読み取り専用モード）
- [ ] `ExperimentInstructionTab.tsx` 修正
  - [ ] データをAPIから取得（getExperimentInstructions）
  - [ ] 承認・NGをAPIに接続
  - [ ] ローディング・エラー表示
- [ ] `WorkRecordPanel.tsx` 修正
  - [ ] 既存 DataRecordDialog のロジック統合
  - [ ] 想定値表示（MAIML `mgr-instruction:` プロパティ参照）
- [ ] `ProgressOverviewTab.tsx` 修正
  - [ ] 実API接続

---

## 既存テーブルの実際の構造確認（実装前に必須）

以下のファイルを実装開始前に必ず確認すること:

| 確認項目 | 参照先 |
|---------|-------|
| `project_task_detail` の実カラム名 | `docs/design/db/ddl/project_task_detail.sql` |
| `template_data` の実カラム名 | `docs/design/db/ddl/template_data.sql` |
| `code_master` の実カラム名・挿入形式 | `docs/design/db/ddl/code_master.sql` |
| `project` テーブルの主キー形式 | `docs/design/db/ddl/project.sql` |
| チェックアウト処理の現行実装 | `backend/src/services/projectService.ts` |
| 既存の experimentInstruction モック | `backend/src/controllers/experimentInstructionController.ts` |
| フロントの型定義（確定済み） | `frontend/src/types/experimentPlan.ts` |
| フロントの型定義（確定済み） | `frontend/src/types/experimentInstruction.ts` |

---

## 注意事項・留意点

### DB設計上の注意
- `project_id` は `varchar(20)` であることに注意（`project_name` と同値）
- `method_id` はMAIMLのMethodUUIDで、長さが可変（`varchar` で対応）
- `experiment_plan` の FK は `project` テーブルの `(organization_id, project_id)` への複合FK

### API実装上の注意
- `taskNumber` はURLパスパラメータとして受け取り、`parseInt()` で変換
- JSONB型カラム（`planned_values`）はそのままJSONとして返却
- `text[]` 型カラム（配列）はそのまま配列として返却

### セキュリティ注意
- すべてのクエリに `organization_id` フィルタを含める
- `project_id` はURLパラメータとして受け取るが、DB上は `organization_id + project_id` で一意性を確認
- Worker ロールは実験計画API・実験指示APIへのアクセス不可（`experiment_admin` のみ）

### チェックアウト拡張の注意
- MAIML書き込みはトランザクション外の処理のため、失敗時はチェックアウト全体をロールバック
- `mgr-instruction:` プレフィックスはMAIML仕様上の予約済みプレフィックスとして扱う
- チェックアウト後は `experiment_plan` の変更を禁止する（E7005 を返す）

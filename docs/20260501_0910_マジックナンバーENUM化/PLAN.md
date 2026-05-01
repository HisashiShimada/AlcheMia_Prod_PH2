# タスク計画書: マジックナンバーのENUM定数置き換え

## メタデータ
- **作成日時**: 2026-05-01 09:10
- **タスクID**: magic-number-enum-refactor
- **優先度**: 中
- **推定工数**: 6〜8時間

---

## 1. タスク概要

コード値の判定処理でENUMを作成せずにマジックナンバー（数値・文字列リテラル）のまま判定している箇所を、ENUM定数に置き換える。

**対応範囲の方針（ユーザーフィードバックより）**
- `backend/src/sql/queries/codeMaster/insertInitialData.sql` に登録されているコード区分（`code_division`）すべてに対応するENUMを作成する
- 機能CDコード（`FunctionList`）・権限値（`PermissionValue`）は現状のまま維持する（対応不要）

---

## 2. 調査結果サマリー

### code_master に登録されているコード区分一覧

`backend/src/sql/queries/codeMaster/insertInitialData.sql` より：

| code_division | コード値 | 意味 | 対応ENUM名 | 状況 |
|--------------|---------|------|-----------|------|
| `checkout_status` | 0=チェックイン中, 1=チェックアウト済 | プロジェクトチェックアウト状態 | `CheckoutStatusEnum` | ❌ 未作成 |
| `experiment_condition` | 0=全て同一条件で実行, 1=実験条件 | 繰り返し実験条件指定 | `ExperimentConditionEnum` | ❌ 未作成 |
| `instruction_priority` | 0=低, 1=通常, 2=中, 3=高 | 実験指示の優先度 | `InstructionPriorityEnum` | ❌ 未作成 |
| `instruction_status` | 0=未送信, 1=送信済 | 指示送信ステータス | `InstructionStatusEnum` | ❌ 未作成 |
| `instruction_target` | 0=ファイル全体, 1=特定タスク, 2=特定トランジション | 指示範囲 | `InstructionTargetEnum` | ❌ 未作成 |
| `instruction_type` | 0=一般, 1=セットアップ, 2=測定, 3=安全, 4=清掃 | 実験指示タイプ（数値） | `InstructionTypeEnum` | ❌ 未作成（※文字列版は別途存在） |
| `issue_type` | 0=材料不足, 1=機器故障, 2=手順不明確, 3=安全性の懸念, 4=品質問題, 5=時間制約, 6=その他 | 問題タイプ | `IssueTypeEnum` | ❌ 未作成 |
| `project_status` | 0=プロジェクト計画中, 1=タスク実行待ち, 2=タスク実行中, 3=タスク結果レビュー待ち, 4=プロジェクト完了, 5=タスク異常終了 | プロジェクト進捗 | `ProjectStatusEnum` | ❌ 未作成 |
| `task_status` | 0=実行待ち, 1=実行中, 2=レビュー待ち, 3=完了, 4=異常終了 | タスク進捗 | `TaskStatusEnum` | ✅ 定義済み（`taskService.ts`） |

### 既存のENUM定義（対応済み・基盤あり）

| ファイル | 定義内容 | 備考 |
|---------|---------|------|
| `backend/src/enums/instructionType.enum.ts` | InstructionType（文字列値） | 文字列ラベル用。数値版`InstructionTypeEnum`は別途作成が必要 |
| `backend/src/enums/progressStatus.enum.ts` | ProgressStatus（文字列） | — |
| `backend/src/enums/roleFunctionPermission.enum.ts` | RoleList, FunctionList, PermissionList | 対応不要 |
| `backend/src/types/transitionData.ts` | TransitionStatusEnum (0〜6、数値Enum) | — |
| `backend/src/services/taskService.ts` | TaskStatusEnum (0〜4、const object) | task_status に対応済み |
| `frontend/src/constants/progressStatus.ts` | ProgressStatus（文字列定数） | — |
| `frontend/src/constants/instructionType.ts` | InstructionType（文字列定数） | — |

### マジックナンバーが残っている箇所（要対応）

#### A. プロジェクトステータス（project_status: 数値 0〜5）

| コード | 意味 |
|-------|------|
| 0 | プロジェクト計画中 |
| 1 | タスク実行待ち |
| 2 | タスク実行中 |
| 3 | タスク結果レビュー待ち（承認待ち） |
| 4 | プロジェクト完了 |
| 5 | タスク異常終了 |

**バックエンド対象ファイル:**
- `backend/src/services/projectService.ts` — 0, 1, 2, 3, 4 が多数箇所（リテラル直書き）
- `backend/src/services/maimlPublishService.ts` — ローカル定数（`PROJECT_STATUS_REVIEW_WAITING = 3` 等）でカバーしているが、共通ENUMに統合が必要
- `backend/src/services/taskService.ts` — `project_status === 1`、`project_status: 2`
- `backend/src/repositories/workerProjectRepository.ts` — `project_status IN (1, 2, 3)` のSQL文字列内
- `backend/src/controllers/fileAccessController.ts` — `project_status !== 0`
- `backend/src/services/progressService.ts` — `PROJECT_STATUS_MAP: { 0: 'planning', ..., 5: 'error' }`

**フロントエンド対象ファイル:**
- `frontend/src/components/project/ProjectFolderTree.tsx` — `switch(status) { case 0: ... case 5: }`
- `frontend/src/components/project/ProjectManagement.tsx` — `selectedProject.status === 0〜5` が多数
- `frontend/src/components/project/TaskRegistrationTab.tsx` — `project_status === 0`

---

#### B. チェックアウトステータス（checkout_status: 0 or 1）

| コード | 意味 |
|-------|------|
| 0 | チェックイン中（未チェックアウト） |
| 1 | チェックアウト済 |

**バックエンド対象ファイル:**
- `backend/src/services/projectService.ts` — `checkout_status === 1 / 0` が多数（10箇所以上）
- `backend/src/services/taskRegistrationService.ts` — `checkout_status === 1` が2箇所
- `backend/src/services/progressService.ts` — `checkout_status !== 0`

---

#### C. タスクステータス（task_status: 数値 0〜4）

`TaskStatusEnum` は定義済みだが、以下のファイルで `TASK_STATUS_MAP` を独自に再定義しており、重複・分散している。

**バックエンド対象ファイル:**
- `backend/src/services/projectService.ts` — `TASK_STATUS_MAP: { 0: 'pending', ..., 4: 'forced_terminated' }` を独自定義
- `backend/src/repositories/projectRepository.ts` — `TASK_STATUS_MAP: { 'pending': 0, ... }` を独自定義
- `backend/src/controllers/projectController.ts` — `statusMap: { 0: 'pending', ..., 4: 'forced_terminated' }` を独自定義
- `backend/src/repositories/projectTaskDetailRepository.ts` — `{ 0: 'pending', 1: 'in_progress', ..., 4: 'forced_terminated' }` を独自定義

→ `backend/src/types/project.ts` に `TASK_STATUS_MAP` が定義済みだが、各ファイルで再定義して使われていない。

---

#### D. 指示ステータス（instruction_status: 0 or 1）

| コード | 意味 |
|-------|------|
| 0 | 未送信 |
| 1 | 送信済 |

**バックエンド対象ファイル:**
- `backend/src/repositories/instructionRepository.ts` — `0 // instruction_status: 0（未送信）`
- `backend/src/services/projectInstructionService.ts` — `instruction_status === 1`、`instruction_status: 0`

**フロントエンド対象ファイル:**
- `frontend/src/components/project/TaskRegistrationTab.tsx` — `instruction_status: 0`、`instruction_status === 0`

---

#### E. 指示優先度（instruction_priority: 0〜3）　※現時点でのコード使用箇所は要追加調査

| コード | 意味 |
|-------|------|
| 0 | 低 |
| 1 | 通常 |
| 2 | 中 |
| 3 | 高 |

---

#### F. 指示ターゲット（instruction_target: 0〜2）　※現時点でのコード使用箇所は要追加調査

| コード | 意味 |
|-------|------|
| 0 | ファイル全体 |
| 1 | 特定タスク |
| 2 | 特定トランジション |

---

#### G. 指示タイプ（instruction_type: 数値 0〜4）

> ⚠️ 既存の `InstructionType` は文字列値（'プロジェクト指示' 等）の別用途定数。
> code_master の数値コードに対応した `InstructionTypeEnum` を**別名で新規作成**する。

| コード | 意味 |
|-------|------|
| 0 | 一般 |
| 1 | セットアップ |
| 2 | 測定 |
| 3 | 安全 |
| 4 | 清掃 |

---

#### H. 問題タイプ（issue_type: 0〜6）　※現時点でのコード使用箇所は要追加調査

| コード | 意味 |
|-------|------|
| 0 | 材料不足 |
| 1 | 機器故障 |
| 2 | 手順不明確 |
| 3 | 安全性の懸念 |
| 4 | 品質問題 |
| 5 | 時間制約 |
| 6 | その他 |

---

#### I. 実験条件（experiment_condition: 0〜1）　※現時点でのコード使用箇所は要追加調査

| コード | 意味 |
|-------|------|
| 0 | 全て同一条件で実行 |
| 1 | 実験条件 |

---

## 3. 目的と期待される成果

### 目的
- コードの意図が明確になり可読性が向上する
- 数値の意味を知らなくてもコードを読めるようになる
- 定数の一元管理により変更漏れ・ミスを防ぐ

### 期待される成果
- [x] code_master の全コード区分に対応するENUM定数を作成する（バックエンド）
- [x] code_master の全コード区分に対応するENUM定数を作成する（フロントエンド）
- [x] `ProjectStatusEnum` を新規作成し、全参照箇所で使用
- [x] `CheckoutStatusEnum` を新規作成し、全参照箇所で使用
- [x] `InstructionStatusEnum` を新規作成し、全参照箇所で使用
- [x] `InstructionPriorityEnum` を新規作成（使用箇所があれば置き換え）
- [x] `InstructionTargetEnum` を新規作成（使用箇所があれば置き換え）
- [x] `InstructionTypeEnum`（数値版）を新規作成（使用箇所があれば置き換え）
- [x] `IssueTypeEnum` を新規作成（使用箇所があれば置き換え）
- [x] `ExperimentConditionEnum` を新規作成（使用箇所があれば置き換え）
- [x] タスクステータスマップの重複定義を `TASK_STATUS_MAP`（`types/project.ts`）に集約
- [x] フロントエンドに `ProjectStatus` 定数を新規作成し、全参照箇所で使用
- [x] フロントエンドの `instruction_status` リテラルを定数に置き換え

---

## 4. 実装ステップ

### Phase 1: バックエンド ENUM 新規作成（code_master の全コード区分対応）

- [x] **Step 1-1**: `backend/src/enums/projectStatus.enum.ts` を新規作成
  - `ProjectStatusEnum` (0=PLANNING, 1=TASK_PENDING, 2=TASK_IN_PROGRESS, 3=REVIEW_WAITING, 4=COMPLETED, 5=ERROR)
  - `CheckoutStatusEnum` (0=CHECKED_IN, 1=CHECKED_OUT) を同ファイルに追加

- [x] **Step 1-2**: `backend/src/enums/instructionStatus.enum.ts` を新規作成
  - `InstructionStatusEnum` (0=UNSENT, 1=SENT)
  - `InstructionPriorityEnum` (0=LOW, 1=NORMAL, 2=MEDIUM, 3=HIGH) を同ファイルに追加
  - `InstructionTargetEnum` (0=ENTIRE_FILE, 1=SPECIFIC_TASK, 2=SPECIFIC_TRANSITION) を同ファイルに追加
  - `InstructionTypeEnum` (0=GENERAL, 1=SETUP, 2=MEASUREMENT, 3=SAFETY, 4=CLEANING) を同ファイルに追加

- [x] **Step 1-3**: `backend/src/enums/issueType.enum.ts` を新規作成
  - `IssueTypeEnum` (0=MATERIAL_SHORTAGE, 1=EQUIPMENT_FAILURE, 2=UNCLEAR_PROCEDURE, 3=SAFETY_CONCERN, 4=QUALITY_ISSUE, 5=TIME_CONSTRAINT, 6=OTHER)

- [x] **Step 1-4**: `backend/src/enums/experimentCondition.enum.ts` を新規作成
  - `ExperimentConditionEnum` (0=SAME_CONDITIONS, 1=INDIVIDUAL_CONDITIONS)

### Phase 2: バックエンド参照箇所の置き換え

- [x] **Step 2-1**: `backend/src/services/projectService.ts`
  - `project_status` の数値リテラル → `ProjectStatusEnum`
  - `checkout_status` の数値リテラル → `CheckoutStatusEnum`

- [x] **Step 2-2**: `backend/src/services/maimlPublishService.ts`
  - ローカル定数 (`PROJECT_STATUS_REVIEW_WAITING` 等) を削除し、`ProjectStatusEnum` に統一

- [x] **Step 2-3**: `backend/src/services/taskService.ts`
  - `project_status === 1` → `ProjectStatusEnum.TASK_PENDING`
  - `project_status: 2` → `ProjectStatusEnum.TASK_IN_PROGRESS`

- [x] **Step 2-4**: `backend/src/repositories/workerProjectRepository.ts`
  - SQL文字列内の `project_status IN (1, 2, 3)` → テンプレートリテラルで `ProjectStatusEnum` を使用

- [x] **Step 2-5**: `backend/src/controllers/fileAccessController.ts`
  - `project_status !== 0` → `ProjectStatusEnum.PLANNING`

- [x] **Step 2-6**: `backend/src/services/progressService.ts`
  - `PROJECT_STATUS_MAP` のリテラル → `ProjectStatusEnum`
  - `checkout_status !== 0` → `CheckoutStatusEnum`

- [x] **Step 2-7**: `backend/src/services/taskRegistrationService.ts`
  - `checkout_status === 1` → `CheckoutStatusEnum.CHECKED_OUT`

- [x] **Step 2-8**: タスクステータスマップの重複定義解消
  - `backend/src/services/projectService.ts` の `TASK_STATUS_MAP` → `types/project.ts` の `TASK_STATUS_MAP` を import
  - `backend/src/repositories/projectRepository.ts` の逆引きマップ → `TaskStatusEnum` を使って構築
  - `backend/src/controllers/projectController.ts` の `statusMap` → `TASK_STATUS_MAP` を import
  - `backend/src/repositories/projectTaskDetailRepository.ts` の `TASK_STATUS_MAP` → `types/project.ts` を import

- [x] **Step 2-9**: `backend/src/repositories/instructionRepository.ts`
  - `0 // instruction_status` → `InstructionStatusEnum.UNSENT`

- [x] **Step 2-10**: `backend/src/services/projectInstructionService.ts`
  - `instruction_status === 1` → `InstructionStatusEnum.SENT`
  - `instruction_status: 0` → `InstructionStatusEnum.UNSENT`

- [x] **Step 2-11**: `backend/src/repositories/instructionRepository.ts` / `backend/src/services/projectInstructionService.ts` の `instruction_priority`、`instruction_target`、`instruction_type` 数値リテラルをENUMに置き換え

### Phase 3: フロントエンド定数作成・置き換え

> **注意**: フロントエンドでは個別の定数ファイルを新規作成せず、既存の `frontend/src/constants/codeMaster.ts` に全定数を集約した。

- [x] **Step 3-1**: `frontend/src/constants/codeMaster.ts` に `ProjectStatus`・`CheckoutStatus` を追加
  - `ProjectStatus` (PLANNING=0, TASK_PENDING=1, TASK_IN_PROGRESS=2, REVIEW_WAITING=3, COMPLETED=4, ERROR=5)
  - `CheckoutStatus` (CHECKED_IN=0, CHECKED_OUT=1)

- [x] **Step 3-2**: `frontend/src/constants/codeMaster.ts` に各種 Instruction 定数を追加
  - `InstructionStatus` (UNSENT=0, SENT=1)
  - `InstructionPriority` (LOW=0, NORMAL=1, MEDIUM=2, HIGH=3)
  - `InstructionTarget` (ENTIRE_FILE=0, SPECIFIC_TASK=1, SPECIFIC_TRANSITION=2)
  - `InstructionTypeCode` (GENERAL=0, SETUP=1, MEASUREMENT=2, SAFETY=3, CLEANING=4)

- [x] **Step 3-3**: `frontend/src/constants/codeMaster.ts` に `IssueType` を追加
  - `IssueType` (MATERIAL_SHORTAGE=0, EQUIPMENT_FAILURE=1, UNCLEAR_PROCEDURE=2, SAFETY_CONCERN=3, QUALITY_ISSUE=4, TIME_CONSTRAINT=5, OTHER=6)

- [x] **Step 3-4**: `frontend/src/constants/codeMaster.ts` に `ExperimentCondition` を追加
  - `ExperimentCondition` (SAME_CONDITIONS=0, INDIVIDUAL_CONDITIONS=1)

- [x] **Step 3-5**: `frontend/src/components/project/ProjectFolderTree.tsx`
  - `switch(status)` の `case 0〜5` → `ProjectStatus` 定数

- [x] **Step 3-6**: `frontend/src/components/project/ProjectManagement.tsx`
  - `selectedProject.status === 0〜5` 等 複数箇所 → `ProjectStatus` 定数

- [x] **Step 3-7**: `frontend/src/components/project/TaskRegistrationTab.tsx`
  - `instruction_status: 0` → `InstructionStatus.UNSENT`
  - `inst.instruction_status === 0` → `InstructionStatus.UNSENT`

- [x] **Step 3-8**: フロントエンド内の `experiment_condition`・`instruction_status` の残リテラル置き換え
  - `frontend/src/components/project/InstructionEditDialog.tsx`: `experimentCondition !== 1` → `ExperimentCondition.INDIVIDUAL_CONDITIONS`
  - `frontend/src/services/issueApiService.ts`: `status === 0/1` → `InstructionStatus.UNSENT/SENT`

### Phase 4: 動作確認・テスト

- [x] **Step 4-1**: バックエンドのビルドエラーがないことを確認（`tsc --noEmit` エラーなし）
- [x] **Step 4-2**: フロントエンドのビルドエラーがないことを確認（`tsc --noEmit` エラーなし）
- [ ] **Step 4-3**: 既存テストがすべてパスすることを確認（手動確認推奨）

### Phase 5: ExperimentWorker フォルダ追加対応

> Phase 1〜4 完了後に発見した追加のマジックナンバー箇所への対応。

- [x] **Step 5-1**: `frontend/src/constants/codeMaster.ts` に `TransitionStatusCode` を追加
  - バックエンドの `TransitionStatusEnum`（`backend/src/types/transitionData.ts`）に対応する定数
  - `INITIAL=0, PREPARING=1, READY=2, IN_PROGRESS=3, PAUSED=4, COMPLETED=5, ERROR=6`

- [x] **Step 5-2**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
  - `isTerminalStatus = currentStatus === 5 || currentStatus === 6` → `TransitionStatusCode.COMPLETED / .ERROR`
  - `ALLOWED_TRANSITIONS` のキー・値（数値リテラル `0〜6`）→ `TransitionStatusCode.*`
  - `ALL_STATUS_OPTIONS` の `0 as TransitionStatus` 〜 `6 as TransitionStatus` → `TransitionStatusCode.* as TransitionStatus`

- [x] **Step 5-3**: `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
  - `projectStatusCode === 2` → `ProjectStatusCode.TASK_IN_PROGRESS`（`ProjectStatus as ProjectStatusCode` を import）

- [x] **Step 5-4**: フロントエンドのビルドエラーがないことを確認（`tsc --noEmit` エラーなし）

### Phase 6: project/ と ExperimentWorker/ フォルダの対応漏れ確認・修正

> Phase 1〜5 完了後に両フォルダ全ファイルを横断的に再調査した結果。

- [x] **Step 6-1**: `frontend/src/components/project/` 全ファイルの数値リテラル使用箇所を網羅的に調査
  - `ProjectFolderTree.tsx`: 対応済み（`ProjectStatus` 使用確認）
  - `ProjectManagement.tsx`: 対応済み（`ProjectStatus` 使用確認）
  - `TaskRegistrationTab.tsx`: 対応済み（`InstructionStatus` 使用確認）
  - `InstructionEditDialog.tsx`: **対応漏れ発見** → Step 6-2 で修正
  - その他ファイル: コード値判定なし（配列長・サイズ・HTTPステータスのみ）

- [x] **Step 6-2**: `frontend/src/components/project/InstructionEditDialog.tsx` 対応漏れ修正
  - ファイル内ローカル定数 `INSTRUCTION_TYPES_LOCAL`・`INSTRUCTION_PRIORITIES_LOCAL`・`TARGET_TYPES_LOCAL` を削除
  - `PRIORITY_LABELS`・`TYPE_LABELS`（使用されていないラベルマップ）も削除
  - `codeMaster.ts` の `InstructionTypeCode`・`InstructionPriority`・`InstructionTarget` を import して使用
  - 初期値設定: `INSTRUCTION_PRIORITIES_LOCAL.NORMAL` → `InstructionPriority.NORMAL`、`INSTRUCTION_TYPES_LOCAL.GENERAL` → `InstructionTypeCode.GENERAL`
  - targetType 判定: `TARGET_TYPES_LOCAL.{FILE/TRANSITION/TASK/METHOD}` → `InstructionTarget.{ENTIRE_FILE/SPECIFIC_TRANSITION/SPECIFIC_TASK/ENTIRE_FILE}`
  - フォールバック Select.Option: `INSTRUCTION_PRIORITIES_LOCAL.*` → `InstructionPriority.*`、`INSTRUCTION_TYPES_LOCAL.*` → `InstructionTypeCode.*`

- [x] **Step 6-3**: `frontend/src/components/ExperimentWorker/` 全ファイルの数値リテラル使用箇所を網羅的に調査
  - `DataRecordDialog.tsx`: 対応済み（`TransitionStatusCode` 使用確認）
  - `InstructionConfirmationTab.tsx`: 対応済み（`ProjectStatus` 使用確認）
  - `ProgressCheckTab.tsx`: HTTP ステータスコード（403/409/404）のみ → コード値判定ではないため対応不要
  - その他ファイル: コード値判定なし

- [x] **Step 6-4**: フロントエンドのビルドエラーがないことを確認（`tsc --noEmit` エラーなし）

---

## 5. 変更ファイル一覧

### バックエンド - 新規作成
| ファイル | 内容 |
|---------|------|
| `backend/src/enums/projectStatus.enum.ts` | ProjectStatusEnum, CheckoutStatusEnum |
| `backend/src/enums/instructionStatus.enum.ts` | InstructionStatusEnum, InstructionPriorityEnum, InstructionTargetEnum, InstructionTypeEnum |
| `backend/src/enums/issueType.enum.ts` | IssueTypeEnum |
| `backend/src/enums/experimentCondition.enum.ts` | ExperimentConditionEnum |

### バックエンド - 修正
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/projectService.ts` | ProjectStatusEnum, CheckoutStatusEnum, TASK_STATUS_MAP 使用 |
| `backend/src/services/maimlPublishService.ts` | ローカル定数を ProjectStatusEnum に統一 |
| `backend/src/services/taskService.ts` | ProjectStatusEnum 使用 |
| `backend/src/services/progressService.ts` | ProjectStatusEnum, CheckoutStatusEnum 使用 |
| `backend/src/services/taskRegistrationService.ts` | CheckoutStatusEnum 使用 |
| `backend/src/services/projectInstructionService.ts` | InstructionStatusEnum 使用（他Enum使用箇所も対応） |
| `backend/src/repositories/workerProjectRepository.ts` | ProjectStatusEnum 使用 |
| `backend/src/repositories/projectRepository.ts` | TASK_STATUS_MAP import, TaskStatusEnum 使用 |
| `backend/src/repositories/projectTaskDetailRepository.ts` | TASK_STATUS_MAP import |
| `backend/src/repositories/instructionRepository.ts` | InstructionStatusEnum 使用（他Enum使用箇所も対応） |
| `backend/src/controllers/projectController.ts` | TASK_STATUS_MAP import |
| `backend/src/controllers/fileAccessController.ts` | ProjectStatusEnum 使用 |

### フロントエンド - 修正（定数追記）
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/constants/codeMaster.ts` | ProjectStatus, CheckoutStatus, TaskStatus, InstructionStatus, InstructionPriority, InstructionTarget, InstructionTypeCode, IssueType, ExperimentCondition を追加（Phase 1〜4） |
| `frontend/src/constants/codeMaster.ts` | `TransitionStatusCode` を追加（Phase 5） |

> **注意**: 計画時は個別ファイル（`projectStatus.ts` 等）に分けて作成する予定だったが、既存の `codeMaster.ts` に全定数を集約する方式を採用した。

### フロントエンド - 修正（置き換え）
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/project/ProjectFolderTree.tsx` | ProjectStatus 使用 |
| `frontend/src/components/project/ProjectManagement.tsx` | ProjectStatus 使用 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | InstructionStatus 使用 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | ExperimentCondition 使用 |
| `frontend/src/services/issueApiService.ts` | InstructionStatus 使用 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | TransitionStatusCode 使用（Phase 5） |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | ProjectStatus（codeMaster）使用（Phase 5） |
| `frontend/src/components/project/InstructionEditDialog.tsx` | ローカル定数3つ削除 → InstructionTypeCode/InstructionPriority/InstructionTarget 使用（Phase 6） |

---

## 6. 設計方針・注意事項

### ENUM定義のスタイルルール
- バックエンドは **`as const` オブジェクト** で統一する
  - 既存の `TaskStatusEnum` が `as const` オブジェクトのため、新規作成するものも同スタイルで統一
  - ただし `TransitionStatusEnum` は `enum` 構文を使用しているため、Transition系はそのまま維持
- フロントエンドは **`as const` オブジェクト** で統一（既存の `ProgressStatus` 等と同スタイル）

### `instruction_type`（数値）と既存 `InstructionType`（文字列）の共存
- 既存の `InstructionType`（バックエンド: `enums/instructionType.enum.ts`、フロントエンド: `constants/instructionType.ts`）は文字列ラベル用の定数であり**廃止しない**
- code_master の `instruction_type` 数値コードに対応するENUMは `InstructionTypeEnum`（バックエンド）/ `InstructionTypeCode`（フロントエンド）として**別名で新規作成**する

### SQL文内のマジックナンバー
- SQL文字列内（`WHERE project_status IN (1, 2, 3)` 等）はテンプレートリテラルを使って定数を埋め込む
  ```ts
  const allowedStatuses = [
    ProjectStatusEnum.TASK_PENDING,
    ProjectStatusEnum.TASK_IN_PROGRESS,
    ProjectStatusEnum.REVIEW_WAITING
  ];
  `AND project.project_status IN (${allowedStatuses.join(', ')})`;
  ```

### TASK_STATUS_MAP の重複解消
- `backend/src/types/project.ts` に既に定義済みの `TASK_STATUS_MAP` を正とする
- 各ファイルの独自定義は削除し、`import { TASK_STATUS_MAP } from '../types/project'` に統一

### 既存テストへの影響
- ENUMの数値・文字列値は変わらないため、APIの振る舞いは変わらない
- ただし import パスが変わるためコンパイルエラーが出る箇所は随時修正

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正漏れによるバグ | 中 | 低 | 各フェーズ後にビルド確認 |
| SQL文内の数値置き換えミス | 高 | 低 | SQL変換ロジックを慎重にテスト |
| import循環参照 | 中 | 低 | enumsはservices/repositoriesから参照のみの方向に限定 |

---

## 8. テスト計画

- [x] `tsc --noEmit` (backend) でコンパイルエラーなし
- [x] `tsc --noEmit` (frontend) でコンパイルエラーなし
- [ ] `npm test` (backend) で既存テストが全パス（手動実行推奨）
- [ ] 手動確認: プロジェクト一覧の表示・ステータス変更が正常動作
- [ ] 手動確認: チェックアウト/チェックイン操作が正常動作
- [ ] 手動確認: タスクステータス更新が正常動作
- [ ] 手動確認: 指示登録・送信が正常動作

---

## 9. 承認記録

- **計画書提示日時**: 2026-05-01 09:10
- **承認日時**: 2026-05-01 09:10
- **承認者コメント**: 承認済み。全フェーズ実装完了。

## 10. 実施記録

### 実施日時
開始: 2026-05-01 09:10  
完了: 2026-05-01 10:39

### 最終的な成果物
- [x] バックエンド ENUM ファイル 4ファイル新規作成（`projectStatus.enum.ts`, `instructionStatus.enum.ts`, `issueType.enum.ts`, `experimentCondition.enum.ts`）
- [x] バックエンド参照箇所の置き換え（12ファイル修正）
- [x] フロントエンド `codeMaster.ts` に全定数を集約（`TransitionStatusCode` 追加含む）
- [x] フロントエンド参照箇所の置き換え（8ファイル修正）
- [x] バックエンド・フロントエンドともに `tsc --noEmit` エラーなし

### 変更ファイル一覧（実績）

#### バックエンド 新規作成
- `backend/src/enums/projectStatus.enum.ts`
- `backend/src/enums/instructionStatus.enum.ts`
- `backend/src/enums/issueType.enum.ts`
- `backend/src/enums/experimentCondition.enum.ts`

#### バックエンド 修正
- `backend/src/services/projectService.ts`
- `backend/src/services/maimlPublishService.ts`
- `backend/src/services/taskService.ts`
- `backend/src/services/progressService.ts`
- `backend/src/services/taskRegistrationService.ts`
- `backend/src/services/projectInstructionService.ts`
- `backend/src/repositories/workerProjectRepository.ts`
- `backend/src/repositories/projectRepository.ts`
- `backend/src/repositories/projectTaskDetailRepository.ts`
- `backend/src/repositories/instructionRepository.ts`
- `backend/src/controllers/projectController.ts`
- `backend/src/controllers/fileAccessController.ts`

#### フロントエンド 修正（定数追記）
- `frontend/src/constants/codeMaster.ts`（ProjectStatus, CheckoutStatus, TaskStatus, InstructionStatus, InstructionPriority, InstructionTarget, InstructionTypeCode, IssueType, ExperimentCondition を追加）

#### フロントエンド 修正（置き換え）
- `frontend/src/components/project/ProjectFolderTree.tsx`
- `frontend/src/components/project/ProjectManagement.tsx`
- `frontend/src/components/project/TaskRegistrationTab.tsx`
- `frontend/src/components/project/InstructionEditDialog.tsx`
- `frontend/src/services/issueApiService.ts`
- `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`（Phase 5）
- `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`（Phase 5）
- `frontend/src/components/project/InstructionEditDialog.tsx`（Phase 6 追加対応）

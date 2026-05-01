# マジックナンバー使用箇所 調査レポート

> **作成日時**: 2026-05-01 09:21  
> **完了日時**: 2026-05-01 10:54  
> **ステータス**: ✅ 全フェーズ完了（HTTPステータスコード対応含む）  
> **対象**: バックエンド (`backend/src/`) + フロントエンド (`frontend/src/`)  
> **分類**: code_master コード値 ／ その他の意味ある数値

---

## 凡例

| 記号 | 意味 |
|------|------|
| 🔴 要対応 | ENUM定数化が必要 |
| 🟡 検討 | 置き換えを検討（HTTPステータス等は状況次第） |
| ✅ 対応済み | 既にENUM/定数を使用 |

---

## 1. code_master コード値の使用箇所

---

### 1-1. `project_status`（0〜5）

#### バックエンド

| ファイル | 行の内容 | 置き換え先 |
|---------|---------|-----------|
| `backend/src/services/projectService.ts` | `0, // project_status: 0 (プロジェクト計画中)` | `ProjectStatusEnum.PLANNING` |
| `backend/src/services/projectService.ts` | `project_status = 1` (チェックアウト時) | `ProjectStatusEnum.TASK_PENDING` |
| `backend/src/services/projectService.ts` | `project.project_status !== 2` | `ProjectStatusEnum.TASK_IN_PROGRESS` |
| `backend/src/services/projectService.ts` | `project.project_status === 3` | `ProjectStatusEnum.REVIEW_WAITING` |
| `backend/src/services/projectService.ts` | `p.project_status != 4` / `project_status != 4` | `ProjectStatusEnum.COMPLETED` |
| `backend/src/services/projectService.ts` | `allowedStatuses = [0, 3, 5]` | `ProjectStatusEnum` 各値 |
| `backend/src/services/maimlPublishService.ts` | `PROJECT_STATUS_REVIEW_WAITING = 3` (ローカル定数) | `ProjectStatusEnum.REVIEW_WAITING` |
| `backend/src/services/maimlPublishService.ts` | `PROJECT_STATUS_COMPLETED = 4` (ローカル定数) | `ProjectStatusEnum.COMPLETED` |
| `backend/src/services/taskService.ts` | `currentProject.project_status === 1` | `ProjectStatusEnum.TASK_PENDING` |
| `backend/src/services/taskService.ts` | `project_status: 2 // タスク実行中` | `ProjectStatusEnum.TASK_IN_PROGRESS` |
| `backend/src/services/progressService.ts` | `PROJECT_STATUS_MAP: { 0: 'planning', 1: 'pending', ..., 5: 'error' }` | `ProjectStatusEnum` 各値 |
| `backend/src/repositories/workerProjectRepository.ts` | `project_status IN (1, 2, 3)` (SQL文字列内) | テンプレートリテラルで `ProjectStatusEnum` 使用 |
| `backend/src/repositories/workerProjectRepository.ts` | `project_status = ${parseInt(filters.status, 10)}` | `ProjectStatusEnum` 使用 |
| `backend/src/controllers/fileAccessController.ts` | `projectInfo.project_status !== 0` | `ProjectStatusEnum.PLANNING` |

#### フロントエンド

| ファイル | 行の内容 | 置き換え先 | 対応状況 |
|---------|---------|-----------|---------|
| `frontend/src/components/project/ProjectFolderTree.tsx` | `case 0: return 'default'` 〜 `case 5: return 'error'` | `ProjectStatus.*` | ✅ 完了 |
| `frontend/src/components/project/ProjectFolderTree.tsx` | `case 0: return t(...)` 〜 `case 5: return t(...)` | `ProjectStatus.*` | ✅ 完了 |
| `frontend/src/components/project/ProjectManagement.tsx` | `selectedProject.status === 0` 〜 `=== 5` (複数箇所) | `ProjectStatus.*` | ✅ 完了 |
| `frontend/src/components/project/ProjectManagement.tsx` | `selectedProject?.status === 4` (disabled判定) | `ProjectStatus.COMPLETED` | ✅ 完了 |
| `frontend/src/components/project/ProjectManagement.tsx` | `selectedProject?.status === 3 \|\| selectedProject?.status === 4` | `ProjectStatus.*` | ✅ 完了 |
| `frontend/src/components/project/ProjectManagement.tsx` | `viewMode={selectedProject.status === 4}` | `ProjectStatus.COMPLETED` | ✅ 完了 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `instruction_status: 0` (未送信) | `InstructionStatus.UNSENT` | ✅ 完了 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | `experimentCondition !== 1` | `ExperimentCondition.INDIVIDUAL_CONDITIONS` | ✅ 完了 |
| `frontend/src/services/issueApiService.ts` | `status === 0` / `status === 1` | `InstructionStatus.UNSENT/SENT` | ✅ 完了 |

---

### 1-2. `checkout_status`（0〜1）

#### バックエンド

| ファイル | 行の内容 | 置き換え先 |
|---------|---------|-----------|
| `backend/src/services/projectService.ts` | `0, // checkout_status: 0 (チェックイン中)` | `CheckoutStatusEnum.CHECKED_IN` |
| `backend/src/services/projectService.ts` | `insertResult.rows[0].checkout_status === 1` | `CheckoutStatusEnum.CHECKED_OUT` |
| `backend/src/services/projectService.ts` | `checkout_status = 1` (SQL UPDATE) | `CheckoutStatusEnum.CHECKED_OUT` |
| `backend/src/services/projectService.ts` | `checkout_status = 0` (SQL UPDATE) | `CheckoutStatusEnum.CHECKED_IN` |
| `backend/src/services/projectService.ts` | `AND p.checkout_status = 1` (SQL WHERE) | テンプレートリテラルで `CheckoutStatusEnum` 使用 |
| `backend/src/services/projectService.ts` | `row.checkout_status === 1` (複数箇所) | `CheckoutStatusEnum.CHECKED_OUT` |
| `backend/src/services/projectService.ts` | `project.checkout_status === 1 / 0` | `CheckoutStatusEnum.*` |
| `backend/src/services/taskRegistrationService.ts` | `project.checkout_status === 1` (2箇所) | `CheckoutStatusEnum.CHECKED_OUT` |
| `backend/src/services/progressService.ts` | `proj.checkout_status !== null && proj.checkout_status !== 0` | `CheckoutStatusEnum.CHECKED_IN` |

---

### 1-3. `task_status`（0〜4）— TASK_STATUS_MAP 重複解消

`TaskStatusEnum` (`taskService.ts`) と `TASK_STATUS_MAP` (`types/project.ts`) は定義済みだが、以下のファイルで**独自に再定義**されている。

| ファイル | 問題 | 対応 |
|---------|------|------|
| `backend/src/services/projectService.ts` | `TASK_STATUS_MAP: { 0: 'pending', ..., 4: 'forced_terminated' }` を独自定義 | `types/project.ts` から import |
| `backend/src/repositories/projectRepository.ts` | 逆引き `{ 'pending': 0, ..., 'forced_terminated': 4 }` を独自定義 | `TaskStatusEnum` を使って構築 |
| `backend/src/controllers/projectController.ts` | `statusMap: { 0: 'pending', ..., 4: 'forced_terminated' }` を独自定義 | `types/project.ts` から import |
| `backend/src/repositories/projectTaskDetailRepository.ts` | `{ 0: 'pending', 1: 'in_progress', ... }` を独自定義 | `types/project.ts` から import |

---

### 1-4. `instruction_status`（0〜1）

#### バックエンド

| ファイル | 行の内容 | 置き換え先 | 対応状況 |
|---------|---------|-----------|---------|
| `backend/src/repositories/instructionRepository.ts` | `0, // instruction_status: 0（未送信）` | `InstructionStatusEnum.UNSENT` | ✅ 完了 |
| `backend/src/services/projectInstructionService.ts` | `isSent: inst.instruction_status === 1` | `InstructionStatusEnum.SENT` | ✅ 完了 |
| `backend/src/services/projectInstructionService.ts` | `instruction_status: inst.instruction_status ?? 0` | `InstructionStatusEnum.UNSENT` | ✅ 完了 |
| `backend/src/services/projectInstructionService.ts` | `instruction_status: 0, // 未送信` | `InstructionStatusEnum.UNSENT` | ✅ 完了 |

#### フロントエンド

| ファイル | 行の内容 | 置き換え先 | 対応状況 |
|---------|---------|-----------|---------|
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `instruction_status: 0` | `InstructionStatus.UNSENT` | ✅ 完了 |
| `frontend/src/services/issueApiService.ts` | `status === 0/1` | `InstructionStatus.UNSENT/SENT` | ✅ 完了 |

---

### 1-5. `instruction_priority` / `instruction_target` / `instruction_type`（数値）

> 現時点でのソースコード内マジックナンバー使用箇所は軽微だが、ENUM作成後に検索して対応する。

**調査メモ:** `instruction_priority`・`instruction_target`・`instruction_type` の数値リテラルは検索した限りソースコード内での直接比較はほぼ見当たらない。ただし DB への insert 時に数値を渡している箇所が存在する可能性があるため、実装時に改めて全文検索を行う。

---

### 1-6. `issue_type`（0〜6）

> 現時点でのソースコード内マジックナンバー使用箇所は軽微。ENUM作成後に検索して対応する。

---

### 1-7. `experiment_condition`（0〜1）

> 現時点でのソースコード内マジックナンバー使用箇所は軽微。ENUM作成後に検索して対応する。

---

## 2. その他の「意味のある数値」の使用箇所

---

### 2-1. HTTPステータスコード

HTTPステータスコードはすでに標準的な意味を持つため、**置き換えは任意**とする。  
ただし、フロントエンドで同一コード（409、404等）が多数の箇所にハードコードされている場合は `HTTP_STATUS` 定数にまとめることで変更に強くなる。

#### バックエンド（`backend/src/`）

| ファイル | 使用箇所 | 種別 | 判断 |
|---------|---------|------|------|
| `backend/src/middleware/errorHandlerMiddleware.ts` | `statusCode === 500` | 内部エラー判定 | 🟡 検討 |
| `backend/src/controllers/masterController.ts` | `error.statusCode === 409` | 競合エラー判定 | 🟡 検討 |
| `backend/src/services/storageService.ts` | `httpStatusCode === 404` | ストレージ404判定 | 🟡 検討 |
| `backend/src/services/transitionSetQueryDecomposerService.ts` | `status >= 400 && status < 500 && status !== 429` | HTTP 4xx 範囲判定 | 🟡 検討 |
| `backend/src/services/transitionSetEmbeddingService.ts` | `response.status === 200` | 成功判定 | 🟡 検討 |

#### フロントエンド（`frontend/src/`）

| ファイル | 使用箇所 | 種別 | 判断 |
|---------|---------|------|------|
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | `response?.status === 403` (2箇所) | 権限エラー判定 | 🟡 検討 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | `response?.status === 409` (2箇所) | 競合エラー判定 | 🟡 検討 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | `response?.status === 404` (2箇所) | 未存在判定 | 🟡 検討 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `response?.status === 409` | 競合エラー判定 | 🟡 検討 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `response?.status === 404` | 未存在判定 | 🟡 検討 |
| `frontend/src/components/SystemManagement/DepartmentManagement.tsx` | `response?.status === 409` | 競合エラー判定 | 🟡 検討 |
| `frontend/src/components/SystemManagement/RoleManagement.tsx` | `response?.status === 409` | 競合エラー判定 | 🟡 検討 |
| `frontend/src/components/DataManagement/MasterManagement.tsx` | `response.status === 409` (4箇所) | 競合エラー判定 | 🟡 検討 |
| `frontend/src/components/Provider/OrganizationManagement.tsx` | `response?.status === 409` | 競合エラー判定 | 🟡 検討 |
| `frontend/src/utils/authUtils.ts` | `error.response?.status === 401` (3箇所) | 認証切れ判定 | 🟡 検討 |
| `frontend/src/services/authService.ts` | `error.response?.status === 401` | 認証切れ判定 | 🟡 検討 |
| `frontend/src/services/corporationApiService.ts` | `response?.status === 409` | 競合エラー判定 | 🟡 検討 |
| `frontend/src/services/masterApiService.ts` | `response?.status === 409` | 競合エラー判定 | 🟡 検討 |

> **対応方針案**: フロントエンドに `frontend/src/constants/httpStatus.ts` を作成し、`HTTP_STATUS = { OK: 200, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, TOO_MANY_REQUESTS: 429, INTERNAL_SERVER_ERROR: 500 }` として定義する。バックエンドは `backend/src/constants/httpStatus.ts` に同様に定義する。

---

### 2-2. ページネーション・制限値

> ページネーションのデフォルト値（例: `page: 1, limit: 20` 等）も意味のある数値だが、今回の対応範囲外とする。

---

---

## 2-追加. 実装後の追加対応（フロントエンド）

フロントエンドの全体検索で追加で発見・対応した箇所：

| ファイル | 修正内容 | 対応状況 |
|---------|---------|---------|
| `frontend/src/components/project/InstructionEditDialog.tsx` | `experimentCondition !== 1` → `ExperimentCondition.INDIVIDUAL_CONDITIONS` | ✅ 完了 |
| `frontend/src/services/issueApiService.ts` | `status === 0` → `InstructionStatus.UNSENT`、`status === 1` → `InstructionStatus.SENT` | ✅ 完了 |
| `frontend/src/services/issueApiService.ts` | `statusInt = params.status === 'resolved' ? 1 : 0` → `InstructionStatus.SENT/UNSENT` | ✅ 完了 |

---

## 3. 対応優先度まとめ

| 優先度 | カテゴリ | 対象ファイル数 | 備考 |
|--------|---------|--------------|------|
| 🔴 高 | project_status（0〜5） | 7 BE + 3 FE | 使用頻度高・バグリスク高 |
| 🔴 高 | checkout_status（0〜1） | 3 BE | 使用頻度高・バグリスク高 |
| 🔴 高 | TASK_STATUS_MAP 重複解消 | 4 BE | DRY原則違反・保守性低下 |
| 🔴 高 | instruction_status（0〜1） | 2 BE + 2 FE | ✅ 完了 |
| 🟡 中 | HTTPステータスコード | 5 BE + 14 FE | 今回スコープ外（標準値のため許容可能） |
| 🟡 低 | instruction_priority / target / type | TBD | ENUM作成のみ実施。直接比較箇所なし |
| 🟡 低 | issue_type / experiment_condition | TBD | ✅ ExperimentCondition 1箇所完了。IssueType は直接比較箇所なし |

---

## 4. 実装結果サマリー

| フェーズ | 内容 | 結果 |
|---------|------|------|
| Phase 1 | バックエンド ENUM 4ファイル新規作成 | ✅ 完了 |
| Phase 2 | バックエンド参照箇所置き換え（12ファイル） | ✅ 完了 |
| Phase 3 | フロントエンド定数追加・置き換え（6ファイル） | ✅ 完了 |
| Phase 4 | ビルド確認（tsc --noEmit） | ✅ バックエンド・フロントエンドともにエラーなし |
| Phase 5 | ExperimentWorker フォルダ追加対応（2ファイル） | ✅ 完了 |
| Phase 6 | project/ + ExperimentWorker/ 全ファイル再調査・対応漏れ修正 | ✅ 完了 |
| Phase 7 | `progressController.ts` 追加対応 | ✅ 完了 |

---

## 5. Phase 5 追加対応詳細（ExperimentWorker）

### 5-1. `codeMaster.ts` への `TransitionStatusCode` 追加

バックエンドの `TransitionStatusEnum`（`backend/src/types/transitionData.ts`）に対応するフロントエンド定数が未定義だったため追加。

```typescript
// frontend/src/constants/codeMaster.ts に追記
export const TransitionStatusCode = {
  INITIAL:     0,  // 初期状態（未開始）
  PREPARING:   1,  // 準備状態
  READY:       2,  // 準備完了状態
  IN_PROGRESS: 3,  // 動作状態（実行中）
  PAUSED:      4,  // 休止状態（一時停止）
  COMPLETED:   5,  // 終状態（完了）
  ERROR:       6,  // 異常終了状態
} as const;
```

### 5-2. `DataRecordDialog.tsx` の置き換え

| 箇所 | 変更前 | 変更後 |
|------|--------|--------|
| `isTerminalStatus` 判定 | `currentStatus === 5 \|\| currentStatus === 6` | `TransitionStatusCode.COMPLETED \|\| TransitionStatusCode.ERROR` |
| `ALLOWED_TRANSITIONS` キー・値 | 数値リテラル `0〜6` | `TransitionStatusCode.*` |
| `ALL_STATUS_OPTIONS` | `0 as TransitionStatus` 〜 `6 as TransitionStatus` | `TransitionStatusCode.* as TransitionStatus` |

### 5-3. `InstructionConfirmationTab.tsx` の置き換え

| 箇所 | 変更前 | 変更後 |
|------|--------|--------|
| `isTaskExecuting` 判定 | `projectStatusCode === 2` | `projectStatusCode === ProjectStatusCode.TASK_IN_PROGRESS` |

**import 追加**: `import { ProjectStatus as ProjectStatusCode } from '@/constants/codeMaster';`

---

### フロントエンド定数の集約先
計画では個別の定数ファイル（`projectStatus.ts`, `instructionStatus.ts` 等）を新規作成する予定だったが、  
既存の `frontend/src/constants/codeMaster.ts` に全定数を集約する方式を採用した。  
（全 code_master コード区分が1ファイルで一元管理され、可読性・保守性が向上）

---

## 6. Phase 6 追加対応詳細（全ファイル再調査）

### 調査対象フォルダ
- `frontend/src/components/project/`（24ファイル）
- `frontend/src/components/ExperimentWorker/`（27ファイル）

### 調査結果

| ファイル | 状態 | 詳細 |
|---------|------|------|
| `project/ProjectFolderTree.tsx` | ✅ 対応済み | `ProjectStatus` 使用確認済み |
| `project/ProjectManagement.tsx` | ✅ 対応済み | `ProjectStatus` 全箇所使用確認済み |
| `project/TaskRegistrationTab.tsx` | ✅ 対応済み | `InstructionStatus` 使用確認済み |
| `project/InstructionEditDialog.tsx` | 🔴 **対応漏れ** → 修正済み | 下記 6-1 参照 |
| `project/` その他20ファイル | ✅ 対応不要 | コード値判定なし（配列長・サイズ・HTTPステータスのみ） |
| `ExperimentWorker/DataRecordDialog.tsx` | ✅ 対応済み | `TransitionStatusCode` 使用確認済み |
| `ExperimentWorker/InstructionConfirmationTab.tsx` | ✅ 対応済み | `ProjectStatus` 使用確認済み |
| `ExperimentWorker/ProgressCheckTab.tsx` | ✅ 完了 | HTTP ステータスコード → `HTTP_STATUS` 定数に置き換え |
| `ExperimentWorker/` その他24ファイル | ✅ 対応不要 | コード値判定なし |

### 6-1. `InstructionEditDialog.tsx` 対応漏れ修正内容

**削除したローカル定数（3つ）：**

```typescript
// ❌ 削除
const INSTRUCTION_TYPES_LOCAL = { GENERAL: 0, SETUP: 1, MEASUREMENT: 2, SAFETY: 3, CLEANUP: 4 } as const;
const INSTRUCTION_PRIORITIES_LOCAL = { LOW: 0, NORMAL: 1, MEDIUM: 2, HIGH: 3 } as const;
const TARGET_TYPES_LOCAL = { FILE: 0, METHOD: 1, TRANSITION: 2, TASK: 3 } as const;
```

**削除した未使用ラベルマップ（2つ）：**

```typescript
// ❌ 削除（コード内で未使用だった）
const PRIORITY_LABELS: Record<number, string> = { 0: '低', 1: '通常', 2: '中', 3: '高' };
const TYPE_LABELS: Record<number, string> = { 0: '一般', 1: 'セットアップ', 2: '測定', 3: '安全', 4: '清掃' };
```

**置き換え先（`codeMaster.ts` の定数）：**

| 変更前 | 変更後 |
|--------|--------|
| `INSTRUCTION_PRIORITIES_LOCAL.NORMAL` | `InstructionPriority.NORMAL` |
| `INSTRUCTION_TYPES_LOCAL.GENERAL` | `InstructionTypeCode.GENERAL` |
| `TARGET_TYPES_LOCAL.FILE` | `InstructionTarget.ENTIRE_FILE` |
| `TARGET_TYPES_LOCAL.TRANSITION` | `InstructionTarget.SPECIFIC_TRANSITION` |
| `TARGET_TYPES_LOCAL.TASK` | `InstructionTarget.SPECIFIC_TASK` |
| `TARGET_TYPES_LOCAL.METHOD` | `InstructionTarget.ENTIRE_FILE`（バックエンドと一致） |
| フォールバック `INSTRUCTION_PRIORITIES_LOCAL.*` | `InstructionPriority.*` |
| フォールバック `INSTRUCTION_TYPES_LOCAL.*` | `InstructionTypeCode.*` |

---

## 7. HTTPステータスコード対応（フェーズ3追加対応）

HTTPステータスコードのマジックナンバー（`200`, `401`, `403`, `404`, `409`, `429`, `500`など）を
`HTTP_STATUS` 定数に置き換えました。

### 7-1. バックエンド

| ファイル | 置き換え内容 |
|---------|-------------|
| `backend/src/middleware/errorHandlerMiddleware.ts` | `res.status(400)` 等 → `HTTP_STATUS.*` |
| `backend/src/controllers/progressController.ts` | `res.status(200/404/409/500)` 等 → `HTTP_STATUS.*` |
| `backend/src/services/storageService.ts` | `httpStatusCode === 404` → `HTTP_STATUS.NOT_FOUND` |
| `backend/src/services/transitionSetQueryDecomposerService.ts` | `status >= 400 && status < 500 && status !== 429` → `HTTP_STATUS.*` |
| `backend/src/services/transitionSetEmbeddingService.ts` | `response.status === 200` → `HTTP_STATUS.OK` |

### 7-2. フロントエンド

| ファイル | 置き換え内容 |
|---------|-------------|
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | `403/409/404` → `HTTP_STATUS.*` |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `409/404` → `HTTP_STATUS.*` |
| `frontend/src/utils/authUtils.ts` | `401` (3箇所) → `HTTP_STATUS.UNAUTHORIZED` |
| `frontend/src/services/authService.ts` | `401/403/404/500+` → `HTTP_STATUS.*` |
| `frontend/src/services/corporationApiService.ts` | `409` → `HTTP_STATUS.CONFLICT` |
| `frontend/src/services/masterApiService.ts` | `409` → `HTTP_STATUS.CONFLICT` |

### 7-3. ビルド確認結果

| 対象 | 結果 |
|------|------|
| `backend/` | ✅ `tsc --noEmit` エラーなし |
| `frontend/` | ✅ `tsc --noEmit` エラーなし |

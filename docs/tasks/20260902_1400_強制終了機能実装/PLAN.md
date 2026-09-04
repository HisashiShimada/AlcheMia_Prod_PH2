# タスク計画書: 強制終了機能実装

## メタデータ

- **作成日時**: 2026-09-02 14:00
- **タスクID**: 20260902_1400_強制終了機能実装
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## タスク概要

ProjectManagement（実験管理者画面）と WorkRecordPanel（作業者画面）に強制終了ボタンを追加し、プロジェクト全体を強制終了する処理を実装する。

強制終了の内容：
1. 現在作業中のタスク・トランジションに強制終了の EventLog を記録
2. タスクステータスを一括更新（未完了 → FORCED_TERMINATED）
3. トランジションステータスを一括更新（未完了 → ERROR）
4. プロジェクトステータスを ERROR に更新
5. MAIMLファイルに途中まで記録された実績データ（data 層）＋ EventLog（eventLog 層）を両方書き出し

---

## 現状調査結果

### 既存の実装（部分的に存在）

| 要素 | 状況 | 内容 |
|---|---|---|
| `POST /force-terminate` エンドポイント | ✅ 実装済み | プロジェクトステータスを ERROR(5) に更新するのみ |
| `projectService.forceTerminate()` | ✅ 実装済み（要拡充） | project_status 更新のみ。タスク/トランジション/EventLog は未対応 |
| `forceTerminateProject` サービス関数（フロント） | ✅ 実装済み | API を呼ぶだけ |
| `WorkRecordPanel` の「異常終了」ボタンUI | ✅ UI実装済み | `onForceEnd` を呼ぶのみ |
| `ExperimentWorkerMenu` の `onForceEnd` | ✅ 部分実装 | 単一トランジションを ERROR 更新するだけ |
| `ProjectManagementInner` の強制終了ボタン | ❌ **未実装** | i18n キーだけ存在、ボタン自体なし |
| i18n `projectManagement.forceTerminate.*` | ✅ 定義済み | ja/en 両方にキーあり |

### 不足している機能

#### バックエンド
- タスクステータスの一括更新なし
- トランジションステータスの一括更新なし（`TransitionDataRepository` に新規メソッド追加必要）
- EventLog の記録なし（`EventLogRepository.insertLifecycleTransitionEventLog()` を `lifecycleValue: 'ate_abort'` で呼び出す形に拡充が必要）
- MAIMLファイルへの書き出しなし
- `userId` がコントローラーから `forceTerminate()` に渡されていない（修正必要）

#### フロントエンド
- `ProjectManagementInner`: 強制終了ボタンが未配置
- `ExperimentWorkerMenu`: `onForceEnd` がプロジェクト全体強制終了に非対応

---

## 目的と期待される成果

- [ ] バックエンド `forceTerminate()` が完全な強制終了処理（EventLog+タスク/トランジション一括更新+MAIML書き出し）を実行できる
- [ ] ProjectManagement 画面に強制終了ボタンが表示され、確認ダイアログ経由で実行できる
- [ ] WorkRecordPanel の「異常終了」ボタンがプロジェクト全体強制終了に連動する

---

## 実装ステップ

### Step 1: バックエンド — SQL 新規作成
- [ ] `backend/src/sql/queries/transition_data/bulkUpdateStatusByProject.sql`
  - プロジェクト配下の未完了トランジションを一括 ERROR に更新する SQL
- [ ] `backend/src/sql/queries/transition_data/findActiveByProject.sql`
  - プロジェクト配下の未完了トランジション一覧を取得する SQL（EventLog 記録用）

### Step 2: バックエンド — リポジトリ層修正
- [ ] `backend/src/repositories/transitionDataRepository.ts`
  - `bulkUpdateStatusByProject()` / `findActiveByProject()` メソッド追加
- [ ] `backend/src/repositories/eventLogRepository.ts`
  - `insertLifecycleTransitionEventLog()` を汎用化
  - `lifecycleValue?: string`（省略時: `'schedule'`）と `phaseIdentifier?: string`（省略時: `'PreparationEvent'`）引数を追加
  - 省略時は既存動作を完全維持（後方互換あり）

### Step 3: バックエンド — コントローラー・サービス層修正
- [ ] `backend/src/controllers/projectController.ts`
  - `forceTerminate()` で `userId` を取得し `projectService.forceTerminate()` に渡す
- [ ] `backend/src/services/projectService.ts`
  - `forceTerminate(organizationId, projectId, userId)` を拡充
  - **前提条件チェック**: プロジェクトステータスが TASK_PENDING(1) / TASK_IN_PROGRESS(2) / REVIEW_WAITING(3) / REVIEW_REJECTED(6) のいずれかであること（PLANNING / COMPLETED / ERROR は拒否）
  - トランザクション内: 未完了情報取得 → EventLog記録 → タスク一括更新 → トランジション一括更新 → プロジェクト更新
  - COMMIT後: `maimlWriterService.writeDataAndEventLog()` で実績データ＋EventLog を書き出し（失敗は警告扱い）

### Step 4: フロントエンド — ProjectManagementInner に強制終了ボタン追加
- [ ] `frontend/src/components/project/ProjectManagementInner.tsx`
  - アクションボタンエリアに強制終了ボタン（`danger` スタイル）を追加
  - 表示条件: `selectedProject.status` が TASK_PENDING(1) / TASK_IN_PROGRESS(2) / REVIEW_WAITING(3) / REVIEW_REJECTED(6) のいずれか
  - 非表示条件: PLANNING(0) / COMPLETED(4) / ERROR(5)（プロジェクト計画中・完了済み・既にエラー終了は除外）
  - 無効化条件: `isProjectCheckedOut === true`
  - クリック時: `Modal.confirm` → `forceTerminateProject` → `refetchProjects()`

### Step 5: フロントエンド — ExperimentWorkerMenu の onForceEnd 変更
- [ ] `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
  - `onForceEnd` を `Modal.confirm` 確認後に `forceTerminateProject(selectedProject)` 呼び出しに変更

---

## 変更ファイル一覧

### 新規作成

| # | ファイルパス | 内容 |
|---|---|---|
| 1 | `backend/src/sql/queries/transition_data/bulkUpdateStatusByProject.sql` | 未完了トランジション一括 ERROR 更新SQL |
| 2 | `backend/src/sql/queries/transition_data/findActiveByProject.sql` | 未完了トランジション一覧取得SQL |

### 変更

| # | ファイルパス | 変更内容 |
|---|---|---|
| 3 | `backend/src/repositories/transitionDataRepository.ts` | `bulkUpdateStatusByProject()` / `findActiveByProject()` 追加 |
| 4 | `backend/src/repositories/eventLogRepository.ts` | `insertLifecycleTransitionEventLog()` に `lifecycleValue?` / `phaseIdentifier?` 引数追加（汎用化） |
| 5 | `backend/src/controllers/projectController.ts` | `userId` を取得してサービスに渡す |
| 6 | `backend/src/services/projectService.ts` | `forceTerminate()` 拡充（EventLog・一括更新・MAIML書き出し） |
| 7 | `frontend/src/components/project/ProjectManagementInner.tsx` | 強制終了ボタン追加 |
| 8 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `onForceEnd` をプロジェクト全体強制終了に変更 |

| 9 | `.clinerules/references/eventlog_structure.md` | 強制終了フェーズ（`ForceTerminate_ate_abort`）をフェーズ名一覧・遷移値一覧に追記 |

### 変更不要

| ファイルパス | 理由 |
|---|---|
| `backend/src/routes/projectRoutes.ts` | エンドポイントは変更なし |
| `frontend/src/services/projectApiService.ts` | `forceTerminateProject` はそのまま使用可 |
| `frontend/src/locales/ja.json` / `en.json` | `projectManagement.forceTerminate.*` キーは既に定義済み |

---

## 処理フロー詳細（バックエンド拡充後）

```
POST /api/v1/projects/:projectId/force-terminate
  ↓
projectController.forceTerminate()
  ↓
projectService.forceTerminate(organizationId, projectId, userId)
  ↓
  [BEGIN トランザクション]
  ① プロジェクト情報取得 + 前提条件チェック
     — status が TASK_PENDING(1) / TASK_IN_PROGRESS(2) / REVIEW_WAITING(3) / REVIEW_REJECTED(6) 以外は即エラー返却
  ② findActiveByProject() — 未完了トランジション情報を取得（EventLog 記録のため）
  ② insertLifecycleTransitionEventLog() × 未完了トランジション件数分
     — 各トランジションに lifecycle:transition='ate_abort' を記録
  ③ bulkUpdateTaskStatusByProject() — タスク一括更新
     PENDING(0) / IN_PROGRESS(1) / REVIEW_WAITING(2) → FORCED_TERMINATED(4)
  ④ bulkUpdateStatusByProject() — トランジション一括更新
     INITIAL(0) / PREPARING(1) / READY(2) / IN_PROGRESS(3) / PAUSED(4) → ERROR(6)
  ⑤ project.project_status = ERROR(5) に更新
  [COMMIT]
  ⑥ maimlWriterService.writeDataAndEventLog() — 実績データ（data層）＋ EventLog（eventLog層）を書き出し（失敗は警告扱い）
```

---

## EventLog の正しい構造と方針

### 前提：強制終了は「トランジション遷移（lifecycle:transition）の一環」

強制終了の EventLog は `lifecycle:transition` を記録する処理であり、**`insertLifecycleTransitionEventLog`（`schedule` で使用されている構造）と同一の event 構造**を踏襲する。

`insertTransitionProgressLog`（`report_type: 'transition_progress'`）とは**別物**。

### 記録するイベント構造

```
eventLog
  └── log[@ref=methodId, name='Alchemia:{フェーズ識別名}', description='{projectName} {フェーズ識別名}(ate_abort)']
        └── trace[@ref=programId, name, description]
              └── event[@ref=transitionId, name, description]
                    └── property:
                          time:timestamp       (dateTimeType, ISO8601)
                          lifecycle:transition (stringType,  'ate_abort')  ← 強制終了の遷移値
```

### 新フェーズの定義

`eventlog_structure.md` の遷移値一覧・フェーズ名一覧に **強制終了フェーズを追記する**：

| フェーズ | フェーズ名 | フェーズ識別名 | lifecycle:transition 値 |
|---|---|---|---|
| 指示送信（Preparation） | `Preparation_schedule` | `PreparationEvent` | `schedule` |
| **強制終了（ForceTerminate）** | **`ForceTerminate_ate_abort`** | **`ForceTerminateEvent`** | **`ate_abort`** |

### ID 命名規則（強制終了フェーズ）

| タグ | ID 形式 |
|---|---|
| `log @id` | `log_{projectName}ForceTerminate_ate_abort_{seq}` |
| `trace @id` | `trace_{projectName}ForceTerminate_ate_abort_{seq}` |
| `event @id` | `event_{projectName}ForceTerminate_ate_abort_{seq}` |
| `ownerRef @id`（issuer） | `ownerRef_{projectName}ForceTerminate_ate_abort_{seq}_issuer` |

### 実装方針

`insertLifecycleTransitionEventLog` は現在 `lifecycle:transition` 値と name/description を `schedule`/`PreparationEvent` で固定している。

**方針: `insertLifecycleTransitionEventLog` に `lifecycleValue` と `phaseIdentifier` 引数を追加して汎用化する。**
- 省略時は既存の `'schedule'`/`'PreparationEvent'` を維持（後方互換あり）
- 強制終了時は `lifecycleValue: 'ate_abort'`、`phaseIdentifier: 'ForceTerminateEvent'` を渡す

これにより変更ファイルが以下に変わる：
- `eventLogRepository.ts` への **`insertForceTerminateLog` 等の新規メソッド追加は不要**
- 代わりに `insertLifecycleTransitionEventLog` を汎用化（`lifecycleValue?` / `phaseIdentifier?` 引数追加）
- `.clinerules/references/eventlog_structure.md` に強制終了フェーズを追記

---

## フロントエンド UI 仕様

### ProjectManagementInner — 強制終了ボタン

- **配置**: アクションボタンエリア内、「プロジェクト完了処理」ボタンの左側
- **スタイル**: `type="default"` + `danger` 属性（赤色）
- **ラベル**: `t('projectManagement.forceTerminate.buttonLabel')` → 「強制終了」
- **表示条件**: `selectedProject.status` が TASK_PENDING(1) / TASK_IN_PROGRESS(2) / REVIEW_WAITING(3) / REVIEW_REJECTED(6) のいずれか（PLANNING(0) / COMPLETED(4) / ERROR(5) は除外）
- **無効化条件**: `isProjectCheckedOut === true`（チェックアウト中は操作不可）
- **クリック時**: `Modal.confirm` → `forceTerminateProject` → `refetchProjects()`
- 成功: `message.success(t('projectManagement.forceTerminate.successMessage', { name: ... }))`
- 失敗: `message.error(t('projectManagement.forceTerminate.errorMessage'))`

### ExperimentWorkerMenu — onForceEnd 変更

- **現在**: `updateTransitionStatus(ERROR)` で単一トランジションを更新
- **変更後**: `Modal.confirm` で確認 → `forceTerminateProject(selectedProject)` でプロジェクト全体を強制終了
- 成功時: `reloadProgressRows(selectedProject)` で進捗データ再取得

---

## 影響範囲と注意点

- `ProgressCheckTab` のタスク単体強制終了は**変更しない**（独立した機能のため）
- `WorkRecordPanel` コンポーネント本体は変更なし（`onForceEnd` の呼び出し先で対応）
- バックエンドの API I/F（エンドポイント・リクエスト形式）は変更なし

---

## リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| MAIMLファイル書き出し失敗 | 低 | 既存の `checkout` 処理と同様に警告扱い（DB更新は確定） |
| `onForceEnd` 動作変更による既存挙動への影響 | 中 | `ProgressCheckTab` の独立処理は変更しないため範囲を限定 |
| `userId` 未渡しによる記録漏れ | 中 | コントローラーで `req.user!.userId` を取得して渡す |

---

## テスト計画

- [ ] 強制終了 API 実行後:
  - プロジェクトステータスが `5 (ERROR)` になること
  - 未完了タスクが `4 (FORCED_TERMINATED)` になること
  - 未完了トランジションが `6 (ERROR)` になること
  - `maiml_event_log` に強制終了ログが記録されること
- [ ] ProjectManagementInner: ボタンが正しい条件で表示/非表示になること
- [ ] WorkRecordPanel: 「異常終了」ボタン押下で確認ダイアログが表示されること
- [ ] 強制終了後にプロジェクト一覧・進捗データが更新されること

---

## 承認記録

- **計画書提示日時**: 2026-09-02 14:00
- **承認日時**: 2026-09-02
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-09-02  
完了: 2026-09-02

### 最終的な成果物

- [x] `backend/src/sql/queries/transition_data/bulkUpdateStatusByProject.sql` — 新規作成
- [x] `backend/src/sql/queries/transition_data/findActiveByProject.sql` — 新規作成
- [x] `backend/src/repositories/transitionDataRepository.ts` — `findActiveByProject()` / `bulkUpdateStatusByProject()` 追加
- [x] `backend/src/repositories/eventLogRepository.ts` — `insertLifecycleTransitionEventLog()` を `lifecycleValue` / `phaseIdentifier` 引数で汎用化
- [x] `backend/src/controllers/projectController.ts` — `userId` 取得・サービスへ渡す対応
- [x] `backend/src/services/projectService.ts` — `forceTerminate()` 全面拡充（前提条件チェック・EventLog・タスク/トランジション一括更新・MAIML書き出し）
- [x] `frontend/src/components/project/ProjectManagementInner.tsx` — 強制終了ボタン追加
- [x] `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — `onForceEnd` をプロジェクト全体強制終了に変更
- [x] `.clinerules/references/eventlog_structure.md` — `ForceTerminate_ate_abort` フェーズ追記

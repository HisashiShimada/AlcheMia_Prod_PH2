# 実験計画・実験指示機能 バックエンド統合設計 — 全体概要

> 作成日: 2026-06-15
> ステータス: **設計確定**
> 参照元: 20260608〜20260611 の設計・モック作成ドキュメント群

---

## 1. 機能全体像

本ドキュメントが対象とする機能は、MAIMLベースの実験管理システムにおける「実験計画から実験実施・レビューまでのサイクル」を担う以下3機能です。

```
┌─────────────────────────────────────────────────────────────┐
│                   実験管理サイクル                           │
│                                                             │
│  ① 実験計画指示記入     ② 実験実施           ③ 指示レビュー │
│  (Manager)             (Worker)             (Manager)      │
│                                                             │
│  ExperimentPlanDialog  WorkRecordPanel      ExperimentInstr-│
│  想定値を設定          実績値を記録          uctionTab       │
│  ↓ save                ↓ save              想定値 vs 実績値 │
│  experiment_plan TB    template_data TB     対比・承認/NG   │
│  ↓ チェックアウト時                                         │
│  MAIMLに書き込み                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 各機能の詳細

### 2-1. 実験計画指示記入（ExperimentPlanDialog）

| 項目 | 内容 |
|------|------|
| 操作者 | Manager |
| 呼び出し元 | TaskRegistrationTab（タスク登録タブ）/ ExperimentInstructionTab（指示管理タブ） |
| 目的 | 実験計画段階で想定値・注意事項・担当者情報を構造化して設定する |
| 保存先 | `experiment_plan` テーブル（新規追加） |
| MAIML連携 | チェックアウト時に `mgr-instruction:` 接頭句でMAIMLのData層に書き込み |
| フロントエンド | `frontend/src/components/project/ExperimentPlanDialog.tsx`（モック実装済み） |

**想定値の書き込み形式（MAIMLへの反映）:**
```xml
<!-- Workerが実験して記録した実測値（通常プロパティ） -->
<property key="temperature">
  <content xsi:type="floatType" units="°C">実測値</content>
</property>

<!-- Managerが事前設定した想定値（mgr-instruction: 接頭句） -->
<property key="mgr-instruction:temperature">
  <content xsi:type="floatType" units="°C">25</content>
</property>
```

### 2-2. 実験実施・作業記録（WorkRecordPanel）

| 項目 | 内容 |
|------|------|
| 操作者 | Worker |
| 目的 | MAIMLの想定値を参照しながら実験を実施し、実績値を記録する |
| 保存先 | `template_data` テーブル（既存） |
| 画面構成 | 左: テンプレート選択サイドバー / 右: 想定値・実績値の横並び入力フォーム |
| フロントエンド | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`（モック実装済み） |

### 2-3. 実験指示一覧・レビュー（ExperimentInstructionTab）

| 項目 | 内容 |
|------|------|
| 操作者 | Manager |
| 目的 | 各タスクのプロパティ単位で想定値と実績値を対比確認し、承認またはNG記録する |
| データ取得元 | `template_data` テーブル（実績値） + MAIML（想定値） |
| タスク承認 | `project_task_detail.task_status` を `05`（完了）に更新 |
| タスクNG | `project_task_detail.task_status` を `06`（NG）に更新、NG理由を `review_result` に保存 |
| フロントエンド | `frontend/src/components/project/ExperimentInstructionTab.tsx`（モック実装済み） |

---

## 3. 既存機能との関係

| 機能 | 概要 | 関係 |
|------|------|------|
| `InstructionRegistrationTab` | 既存の自由テキスト作業指示 | 独立維持。実験計画とは別ロール（プロジェクト指示 vs 実験計画指示） |
| `DataRecordDialog` | 既存の実験データ記録ダイアログ | WorkRecordPanel に吸収・インライン化（ロジックは流用） |
| `ProgressCheckTab` | 既存の進捗確認タブ | ProgressOverviewTab に置き換え（削除） |
| チェックアウト処理 | 既存: `projectService.ts` | 拡張: `experiment_plan` → MAIML書き込み処理を追加 |

---

## 4. データベース変更サマリー

| 変更種別 | テーブル | 内容 |
|---------|---------|------|
| **新規作成** | `experiment_plan` | 実験計画の想定値・注意事項・Ref情報を管理 |
| **カラム追加** | `project_task_detail` | `review_result TEXT` — NG理由記録用 |
| **マスター追加** | `code_master` | TaskStatus `06`（NG）を追加 |

詳細は [`database_design.md`](./database_design.md) を参照。

---

## 5. APIサマリー

### 実験計画API（新規）
| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/v1/projects/:projectId/experiment-plans?methodId=xxx` | 実験計画一括取得 |
| PUT | `/api/v1/projects/:projectId/experiment-plans/:methodId/:taskNumber` | 実験計画保存（UPSERT） |
| DELETE | `/api/v1/projects/:projectId/experiment-plans/:methodId` | 実験計画削除 |
| GET | `/api/v1/projects/:projectId/methods/:methodId/plan-dialog-data` | ダイアログ初期データ取得 |

### 実験指示API（新規）
| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/v1/projects/:projectId/experiment-instructions` | 実験指示一覧取得 |
| GET | `/api/v1/projects/:projectId/methods` | メソッド一覧取得 |
| PUT | `/api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve` | タスク承認 |
| PUT | `/api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng` | タスクNG記録 |

詳細は [`api_design.md`](./api_design.md) を参照。

---

## 6. 実装フェーズ一覧

| フェーズ | 内容 | 優先度 |
|--------|------|-------|
| **Phase 1** | データベース（マイグレーション） | 🔴 高 |
| **Phase 2** | 実験計画API — Repository / Service / Controller | 🔴 高 |
| **Phase 3** | 実験指示API — モック→実装差し替え | 🟡 中 |
| **Phase 4** | チェックアウト拡張（MAIML書き込み） | 🟡 中 |
| **Phase 5** | フロントエンド API接続 | 🟡 中 |

詳細は [`implementation_plan.md`](./implementation_plan.md) を参照。

---

## 7. フロントエンド実装状況

| コンポーネント | ファイル | 状態 | 残タスク |
|--------------|---------|------|---------|
| 実験計画ダイアログ | `ExperimentPlanDialog.tsx` | ✅ モック完成 | 実API接続・継承ロジック実装 |
| 実験指示一覧 | `ExperimentInstructionTab.tsx` | ✅ モック完成 | 実API接続 |
| 実験計画APIサービス | `experimentPlanApiService.ts` | ⚠️ モック | 実API接続 |
| 実験指示APIサービス | `experimentInstructionApiService.ts` | ⚠️ モック | 実API接続 |
| 作業記録パネル | `WorkRecordPanel.tsx` | ✅ モック完成 | DataRecordDialogロジック統合 |
| 全体進捗タブ | `ProgressOverviewTab.tsx` | ✅ モック完成 | 実API接続 |
| 実験計画型定義 | `types/experimentPlan.ts` | ✅ 確定 | そのまま使用可 |
| 実験指示型定義 | `types/experimentInstruction.ts` | ✅ 確定 | そのまま使用可 |

---

## 8. 確定済み設計方針

| # | 項目 | 方針 |
|---|------|------|
| 1 | MAIMLへの書き込みタイミング | **チェックアウト時に一括反映** |
| 2 | 想定値のマスターデータ | **書き込み前: experiment_plan / 書き込み後: MAIML（変更不可）** |
| 3 | 実装優先度 | **実験計画 → 実験指示 → 作業者画面** |
| 4 | notesの保存形式 | **JSONB 1カラム（NoteItem[]）** |
| 5 | template_valuesの保存形式 | **ネスト形式 JSONB `{templateId: {fieldKey: value}}`** |
| 6 | 全体タブ→タスクNへの継承 | **フロントのstateで overrideFlags を管理** |
| 7 | 保存粒度 | **1レコード = org + project + method + task_number** |
| 8 | project_instructionとの関係 | **完全独立（役割が異なる）** |

---

## 参照ファイル一覧

### 設計ドキュメント（本ディレクトリ）
- [`database_design.md`](./database_design.md) — テーブル設計詳細
- [`api_design.md`](./api_design.md) — APIエンドポイント仕様
- [`implementation_plan.md`](./implementation_plan.md) — 実装計画
- [`data_flow.md`](./data_flow.md) — データフロー

### フロントエンドソース
- `frontend/src/types/experimentPlan.ts` — 型定義（確定済み）
- `frontend/src/types/experimentInstruction.ts` — 型定義（確定済み）
- `frontend/src/components/project/ExperimentPlanDialog.tsx`
- `frontend/src/components/project/ExperimentInstructionTab.tsx`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`

### バックエンドソース（既存）
- `backend/src/repositories/templateDataRepository.ts` — 既存実績値Repository
- `backend/src/services/experimentDataService.ts` — 既存実験データService
- `backend/src/controllers/experimentInstructionController.ts` — モック実装中
- `backend/src/services/projectService.ts` — チェックアウト処理（拡張対象）

### DDL（既存）
- `docs/design/db/ddl/template_data.sql`
- `docs/design/db/ddl/project_task_detail.sql`

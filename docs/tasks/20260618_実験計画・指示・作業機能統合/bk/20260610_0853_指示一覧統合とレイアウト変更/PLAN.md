# タスク計画書: ProjectManagement 指示一覧統合とレイアウト変更

## メタデータ
- **作成日時**: 2026-06-10 08:53
- **タスクID**: instruction-integration
- **優先度**: 高
- **推定工数**: 3〜4日

---

## 1. タスク概要

ProjectManagement画面の「指示一覧」タブと「進捗確認」タブを再編成し、以下の変更を行う。

- 「指示一覧」タブの中に **プロジェクト指示** サブタブと **実験指示** サブタブを設ける
- プロジェクト指示タブ：既存の `InstructionRegistrationTab`（自由テキスト作業指示）を流用
- 実験指示タブ：`ExperimentPlanDialog` で設定した `mgr-instruction` プロパティを **プロパティ単位で1行** として一覧化し、想定値と実績値を対比表示、タスク単位で承認／NG記録ができる画面を新規作成
- 「進捗確認」タブ（Tab 4）は **完全削除**（統計カード・作業確認ボタン・TaskResultsTable をすべて削除）

---

## 2. 目的と期待される成果

### 目的
- 自由テキスト指示と構造化実験計画指示を一画面で一元管理する
- Manager が設定した想定値（`mgr-instruction`）と Worker が記録した実績値を並べて確認できるようにする
- 想定値と実績値の対比に基づいてタスク結果を承認・NG記録できるワークフローを提供する

### 期待される成果
- [ ] 指示一覧タブが「プロジェクト指示」「実験指示」の2つのサブタブを持つ
- [ ] 実験指示タブにプロパティ単位（1プロパティ=1行）の一覧テーブルが表示される
- [ ] 各行に想定値・実績値・差異が表示される
- [ ] レビュー待ちタスクに承認ボタン・NGボタンが表示され操作できる
- [ ] 進捗確認タブが削除されている

---

## 3. 実装ステップ

> **実装方針（2026-06-10 更新）:**
>
> - **全体設計はフルスタックで計画する**（DB設計・バックエンド・フロントエンドをすべて設計する）
> - **今回の実装範囲はフロントエンドのみ**
>   - バックエンドはControllerのみ作成し、モックデータを返却する（DB/Repository/Service層の実装は後日）
>   - フロントエンドは本番コンポーネントとして実装する（APIと接続した動作を確認可能にする）
> - **後日のDB連携**で、ControllerをRepository/Service層と接続する

---

### ✅ 今回実施する範囲

#### Phase A: バックエンド — APIエンドポイント（モックデータ返却）

> Controller内でモックデータを直接返す。DB接続・Repository/Service実装は不要。

- [ ] `backend/src/controllers/experimentInstructionController.ts` 新規作成
  - `getExperimentInstructions()` — モックデータを直接返却（template_data の想定構造で返す）
  - `getProjectMethods()` — プロジェクトのメソッドID一覧をモックで返却
  - `approveTask()` — 成功レスポンスのみ返却（DB更新なし）
  - `recordNg()` — 成功レスポンスのみ返却（DB更新なし）
- [ ] `backend/src/routes/experimentInstructionRoutes.ts` 新規作成
  - `GET  /api/v1/projects/:projectId/experiment-instructions`
  - `GET  /api/v1/projects/:projectId/methods`
  - `PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve`
  - `PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng`
- [ ] `backend/src/server.ts` にルート登録

#### Phase B: ExperimentPlanDialog 拡張（メソッドID選択機能追加）

- [ ] `frontend/src/types/experimentPlan.ts` 拡張
  - `ExperimentPlanDialogProps` に以下を追加:
    - `allowMethodSelection?: boolean` — メソッドID選択UIの表示制御
    - `methodOptions?: Array<{ id: string; name: string }>` — 選択肢
- [ ] `frontend/src/components/project/ExperimentPlanDialog.tsx` 修正
  - `allowMethodSelection=true` の場合、ダイアログ内最上部（タブより上）にメソッドID選択ドロップダウンを表示
  - メソッドID変更時、確認後に該当メソッドの `experiment_plan` を再取得・タブ切り替え
  - `allowMethodSelection=false`（デフォルト）は従来通り動作（タスク登録からの呼び出し）

#### Phase C: フロントエンド — 型定義・定数・サービス

- [ ] `frontend/src/constants/codeMaster.ts` に `TaskStatus.NG = '06'` 追加
- [ ] `frontend/src/types/experimentInstruction.ts` 新規作成
  - `PropertyItem` — プロパティ1件（key, label, xsiType, expected, actual, unit）
  - `ExperimentInstructionItem` — APIレスポンス1件（methodId, methodName, taskNumber, taskStatus, transitionId, transitionName, templateName, properties）
  - `ApproveTaskRequest` / `NgTaskRequest`
- [ ] `frontend/src/services/experimentInstructionService.ts` 新規作成
  - `getExperimentInstructions(projectId): Promise<ExperimentInstructionItem[]>`
  - `getProjectMethods(projectId): Promise<Array<{id: string; name: string}>>`
  - `approveTask(projectId, methodId, taskNumber): Promise<void>`
  - `recordNg(projectId, methodId, taskNumber, ngReason): Promise<void>`

#### Phase D: フロントエンド — コンポーネント実装

- [ ] `frontend/src/components/project/ExperimentInstructionTable.tsx` 新規作成
  - `ExperimentInstructionItem[]` を受け取り、プロパティ単位（1プロパティ=1行）でフラット表示
  - フィルタバー（タスクNo・メソッドID・トランジション・テンプレート名・Key）
  - 差異計算ロジック（FloatValue/IntegerValue のみ）
  - 承認ボタン・NGボタン（taskStatus=`04` レビュー待ちタスクのみ表示）
- [ ] `frontend/src/components/project/TaskApproveModal.tsx` 新規作成
  - 対象タスク情報表示 + 承認確認
- [ ] `frontend/src/components/project/TaskNgModal.tsx` 新規作成
  - NG理由テキストエリア（必須・最大500文字）
- [ ] `frontend/src/components/project/ExperimentInstructionTab.tsx` 新規作成（コンテナ）
  - マウント時に `getExperimentInstructions(projectId)` を呼び出し
  - 「実験計画を編集」ボタン配置 → `getProjectMethods(projectId)` 取得後 `ExperimentPlanDialog` を `allowMethodSelection=true` で開く
  - 承認・NG記録後にデータ再取得

#### Phase E: ProjectManagement 統合

- [ ] `frontend/src/components/project/ProjectManagement.tsx` 修正
  - Tab 3「指示一覧」→「指示管理」にリネームし、内部を Tabs でネスト化
    - Sub-Tab 3-1: プロジェクト指示（`InstructionRegistrationTab` そのまま）
    - Sub-Tab 3-2: 実験指示（`ExperimentInstructionTab` 新規）
  - Tab 4「進捗確認」を完全削除（TaskResultsTable・統計カード・作業確認ボタン削除）
  - タブキー・タブ切り替えロジック調整
- [ ] `frontend/src/components/project/TaskResultsTable.tsx` 参照有無確認のうえ整理

#### Phase F: 動作確認

- [ ] 実験指示タブが表示され、APIモックデータが取得できる
- [ ] 「実験計画を編集」ボタン → メソッドID選択ドロップダウン → ExperimentPlanDialog が開く
- [ ] タスク登録タブからの ExperimentPlanDialog は従来通り動作する（メソッドID固定）
- [ ] 承認・NG記録操作がモックAPIに通信して成功する
- [ ] 進捗確認タブが表示されない

---

### 📋 後日実施する範囲（DB連携）

#### Phase 1（後日）: データベース準備
- [ ] マイグレーションファイル作成
  - `backend/migrations/20260610_add_review_result_and_ng_status.sql`
  - `project_task_detail` テーブルに `review_result TEXT` カラム追加
  - `code_master` テーブルに TaskStatus NG（`06`）追加
- [ ] マイグレーション動作確認

#### Phase 2（後日）: バックエンド — Repository層
- [ ] `backend/src/types/database.ts` に `TemplateDataRow` 型定義を追加
- [ ] `backend/src/repositories/templateDataRepository.ts` 新規作成
  - `findByProject(organizationId, projectId)`
  - `findByTask(organizationId, projectId, methodId, taskNo)`
- [ ] `backend/src/repositories/projectTaskDetailRepository.ts` 拡張
  - `approveTask()` メソッド追加（task_status='05', reviewed_at, review_user_id 更新）
  - `recordNg()` メソッド追加（task_status='06', review_result, reviewed_at, review_user_id 更新）

#### Phase 3（後日）: バックエンド — Service層
- [ ] `backend/src/services/experimentInstructionService.ts` 新規作成
  - `getExperimentInstructions(organizationId, projectId)` — template_data を取得・展開
  - `approveTask(organizationId, projectId, methodId, taskNumber, reviewUserId)`
  - `recordNg(organizationId, projectId, methodId, taskNumber, ngReason, reviewUserId)`
  - `getProjectMethods(organizationId, projectId)` — メソッドID一覧取得
- [ ] `experimentInstructionController.ts` をService層呼び出しに差し替え

#### Phase 4（後日）: チェックアウト処理拡張
- [ ] チェックアウト時に `experiment_plan` データを `template_data` テーブルへ投入する処理を追加
  - 対象ファイル: `backend/src/services/projectService.ts`（チェックアウト処理内）

#### Phase 5（後日）: テスト・調整
- [ ] プロパティ単位表示・差異計算のテスト
- [ ] 承認・NG記録機能のエンドツーエンドテスト（DB連携後）
- [ ] チェックアウト処理拡張後の回帰テスト

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/ProjectManagement.tsx` — タブ構成変更・進捗確認タブ削除
2. `frontend/src/constants/codeMaster.ts` — TaskStatus.NG 追加
3. `backend/src/server.ts` — ルート登録

### 新規作成するファイル
1. `backend/migrations/20260610_add_review_result_and_ng_status.sql`
2. `backend/src/repositories/templateDataRepository.ts`
3. `backend/src/services/experimentInstructionService.ts`
4. `backend/src/controllers/experimentInstructionController.ts`
5. `backend/src/routes/experimentInstructionRoutes.ts`
6. `frontend/src/types/experimentInstruction.ts`
7. `frontend/src/services/experimentInstructionService.ts`
8. `frontend/src/components/project/ExperimentInstructionTable.tsx`
9. `frontend/src/components/project/ExperimentInstructionTab.tsx`
10. `frontend/src/components/project/TaskApproveModal.tsx`
11. `frontend/src/components/project/TaskNgModal.tsx`

### 拡張するファイル
1. `backend/src/types/database.ts` — `TemplateDataRow` 型追加
2. `backend/src/repositories/projectTaskDetailRepository.ts` — `approveTask()` / `recordNg()` 追加

### 削除・整理するファイル
1. `frontend/src/components/project/TaskResultsTable.tsx` — 進捗確認タブ廃止に伴い削除（他に参照箇所がないか確認要）

### 影響を受ける機能
- プロジェクト管理画面全体のタブ構成
- タスク結果のレビューフロー（TaskStatus に NG が追加）
- チェックアウト処理（template_data 投入が追加される）

---

## 5. データ設計

### 5-1. template_dataテーブル（既存）

```sql
CREATE TABLE template_data (
    organization_id UUID NOT NULL,
    project_id VARCHAR(20) NOT NULL,
    method_id VARCHAR NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    place_id VARCHAR NOT NULL,
    
    -- 想定値・実績値を含むプロパティセット（JSONB）
    property_set JSONB,
    
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    PRIMARY KEY (organization_id, project_id, method_id, task_no, place_id)
);
```

**property_set JSONB 構造（想定）:**
```json
{
  "temperature": {
    "label": "温度",
    "expected": 25.0,
    "actual": 24.8,
    "unit": "℃",
    "type": "number"
  },
  "pressure": {
    "label": "圧力",
    "expected": 1.0,
    "actual": 1.02,
    "unit": "atm",
    "type": "number"
  }
}
```

### 5-2. project_task_detailテーブル（拡張）

```sql
-- 追加するカラム
ALTER TABLE project_task_detail
ADD COLUMN review_result TEXT;

COMMENT ON COLUMN project_task_detail.review_result IS 'レビュー結果（NG理由）';
```

### 5-3. TaskStatus 拡張

| コード | 値 | 説明 |
|-------|-----|------|
| PENDING | 1 | 実行待ち |
| IN_PROGRESS | 2 | 実行中 |
| FORCED_TERMINATED | 3 | 異常終了 |
| REVIEW_WAITING | 4 | レビュー待ち |
| COMPLETED | 5 | 完了 |
| **NG** | **6** | **NG（新規追加）** |

---

## 6. API設計

### 6-1. 実験指示一覧取得

| 項目 | 内容 |
|------|------|
| メソッド | GET |
| URL | `/api/v1/projects/:projectId/experiment-instructions` |
| 認可 | Experiment Admin |
| 処理 | template_dataテーブルからプロパティ単位で展開して返却 |

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "methodId": "method-001",
      "methodName": "合成",
      "taskNumber": 1,
      "transitionId": "t1",
      "transitionName": "混合",
      "placeId": "cond-place-001",
      "placeCategory": "condition",
      "properties": [
        {
          "key": "temperature",
          "label": "温度",
          "expected": 25.0,
          "actual": 24.8,
          "unit": "℃",
          "type": "number",
          "difference": -0.2
        }
      ],
      "taskStatus": 4
    }
  ]
}
```

### 6-2. タスク承認

| 項目 | 内容 |
|------|------|
| メソッド | PUT |
| URL | `/api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve` |
| 認可 | Experiment Admin |
| 処理 | task_status=5 (COMPLETED), reviewed_at=NOW(), review_user_id=currentUser |

### 6-3. タスク NG 記録

| 項目 | 内容 |
|------|------|
| メソッド | PUT |
| URL | `/api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng` |
| 認可 | Experiment Admin |
| リクエスト | `{ "ngReason": "..." }` |
| 処理 | task_status=6 (NG), review_result=ngReason, reviewed_at=NOW(), review_user_id=currentUser |

---

## 7. UI設計

### 7-1. 新しいタブ構成

```
ProjectManagement
├── Tab 1: ファイル管理
├── Tab 2: タスク登録
├── Tab 3: 指示管理 ★変更
│   ├── Sub-Tab 3-1: プロジェクト指示（InstructionRegistrationTab そのまま）
│   └── Sub-Tab 3-2: 実験指示（ExperimentInstructionTab 新規）
└── Tab 4: 進捗確認 ★削除
```

### 7-2. 実験指示タブのテーブルレイアウト

**カラム構成:**

| カラム | 幅 | 説明 |
|-------|-----|------|
| メソッド名 | 12% | rowSpanでグルーピング |
| タスク番号 | 8% | rowSpanでグルーピング |
| トランジション | 12% | rowSpanでグルーピング |
| Place | 12% | rowSpanでグルーピング |
| 項目名 | 14% | プロパティのラベル |
| 想定値 | 12% | mgr-instruction値 + 単位 |
| 実績値 | 12% | Worker記録値 + 単位（未記録は「未記録」表示） |
| 差異 | 8% | 数値型のみ計算表示（色分け） |
| ステータス | 10% | タスクステータスタグ（rowSpanでグルーピング） |
| 操作 | - | 承認/NGボタン（タスク先頭行のみ・レビュー待ち時のみ活性） |

**差異の色分け:**
- 0.0 → グレー
- プラス → 赤
- マイナス → 青（または警告オレンジ）

### 7-3. 承認ダイアログ

```
┌─────────────────────────────────────┐
│ タスク結果承認                       │
├─────────────────────────────────────┤
│ 以下のタスクを承認しますか？          │
│                                     │
│ メソッド: {methodName}               │
│ タスク番号: {taskNumber}             │
│                                     │
│ ※承認後、ステータスが「完了」に     │
│   更新されます。                     │
│                                     │
│           [キャンセル] [承認]        │
└─────────────────────────────────────┘
```

### 7-4. NG記録ダイアログ

```
┌─────────────────────────────────────┐
│ タスク結果NG記録                     │
├─────────────────────────────────────┤
│ メソッド: {methodName}               │
│ タスク番号: {taskNumber}             │
│                                     │
│ NG理由（必須）:                      │
│ ┌─────────────────────────────────┐  │
│ │                                 │  │
│ └─────────────────────────────────┘  │
│                      最大 500 文字  │
│                                     │
│ ※NG記録後、再度指示出しが必要です  │
│                                     │
│           [キャンセル] [記録]        │
└─────────────────────────────────────┘
```

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| template_dataのproperty_set構造が想定と異なる | 高 | 中 | 実装前にDBを確認し、実際の格納形式を把握する |
| rowSpanによるグルーピングでレンダリングが崩れる | 中 | 中 | Ant Design Tableのrowspan仕様を先に検証する |
| 進捗確認タブ削除によるTaskResultsTableへの参照残り | 中 | 低 | search_filesで参照箇所を事前に全検索する |
| チェックアウト処理への追加でパフォーマンス低下 | 中 | 低 | 処理を非同期で実行し、チェックアウト応答をブロックしない |

---

## 9. テスト計画

### 手動テスト
- [ ] 実験指示タブが正しく表示される（データあり・なし両方）
- [ ] プロパティ単位でグルーピング表示される
- [ ] 想定値・実績値・差異が正しく計算・表示される
- [ ] レビュー待ちタスクのみ承認・NGボタンが表示される
- [ ] 承認操作でステータスが「完了」になる
- [ ] NG操作でステータスが「NG」になり、NG理由が保存される
- [ ] プロジェクト指示タブが引き続き正常に動作する
- [ ] 進捗確認タブが表示されない

### 回帰テスト
- [ ] チェックアウト・チェックイン処理が正常に動作する（template_data投入追加後）
- [ ] 既存の指示一覧（プロジェクト指示）の送信・編集・削除が正常に動作する

---

## 10. 承認記録

- **計画書提示日時**: 2026-06-10 08:53
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

---

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
（完了時に記入）

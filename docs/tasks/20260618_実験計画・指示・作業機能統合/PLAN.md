# 実験計画・指示・作業機能 統合実装計画書

## メタデータ

- **作成日時**: 2026-06-18 14:52
- **最終更新**: 2026-06-22 09:20
- **タスクID**: experiment-feature-integration
- **対象期間**: 2026-06-08 〜 現在
- **統合タスク数**: 9件
- **優先度**: 最高
- **推定工数**: 15〜20日（残タスク）
- **統合元ドキュメント**: `docs/bk/` 配下の9タスクフォルダ参照

---

## 1. タスク概要

MAIMLベースの実験管理システムにおける「**実験計画 → 実験実施 → レビュー**」の一連のワークフローを実装する。

### 3つの主要機能

| 機能 | 操作者 | 概要 |
|------|--------|------|
| ① 実験計画指示記入 | Manager | 想定値・注意事項・担当者情報を構造化して設定 |
| ② 実験実施・作業記録 | Worker | 想定値を参照しながら実験実施・実績値を記録 |
| ③ 実験指示レビュー | Manager | 想定値 vs 実績値の対比確認・タスク承認/NG記録 |

---

## 2. 実装状況サマリー

### フロントエンド

| コンポーネント | ファイル | 状態 | 残タスク |
|--------------|---------|------|---------|
| 実験計画ダイアログ | `ExperimentPlanDialog.tsx` | ✅ モック完成 | 継承ロジック実装・API接続 |
| 実験指示タブ | `ExperimentInstructionTab.tsx` | ✅ API接続完了 | — |
| 実験指示テーブル | `ExperimentInstructionTable.tsx` | ✅ モック完成 | API接続 |
| 作業記録パネル | `WorkRecordPanel.tsx` | ✅ モック完成 | DataRecordDialogロジック統合・API接続 |
| 全体進捗タブ | `ProgressOverviewTab.tsx` | ✅ モック完成 | API接続 |
| コメントダイアログ | `ExperimentCommentDialog.tsx` | ✅ モック完成 | — |
| 型定義 | `types/experimentPlan.ts` | ✅ 確定 | そのまま使用可 |
| 型定義 | `types/experimentInstruction.ts` | ✅ ネスト形式に更新済 | — |
| APIサービス | `experimentPlanApiService.ts` | ⚠️ モック | 実API接続 |
| APIサービス | `experimentInstructionApiService.ts` | ✅ 実API接続完了（ネスト形式） | — |

### バックエンド

| ファイル | 状態 | 残タスク |
|---------|------|---------|
| `experimentInstructionController.ts` | ✅ Service層接続完了 | — |
| `experimentInstructionService.ts` | ✅ 新規実装完了 | — |
| `experimentPlanController.ts` | ✅ 実装済 | — |
| `experimentPlanRepository.ts` | ✅ 実装済 | — |
| `experimentPlanService.ts` | ✅ 実装済 | — |
| `experimentInstructionRoutes.ts` | ✅ 更新済 | — |
| `templateDataRepository.ts` | ✅ findByProject() 追加済 | — |
| `projectTaskDetailRepository.ts` | ✅ approveTask() / recordNg() 追加済 | — |
| チェックアウト処理（`projectService.ts`） | ⚠️ 要拡張 | MAIML書き込み処理追加（Phase 4） |

### データベース

| 変更内容 | 状態 |
|---------|------|
| `transition_data.prerequisite_transition_ids` 追加 | ✅ SQLファイル作成済（`20260618_002_...sql`）／**DB適用要確認** |
| `experiment_plan` テーブル作成 | ✅ SQLファイル作成済（`20260618_004_...sql`）／**DB適用要確認** |
| `project_task_detail.review_result` カラム追加 | ✅ SQLファイル作成済（`20260618_005_...sql`）／**DB適用要確認** |
| `transition_data.work_order` カラム追加 | ❌ 未作成（`20260618_003_...sql`） |
| `code_master` TaskStatus 06（NG）追加 | ❌ 未作成（`20260618_006_...sql`） |

---

## 3. 実装フェーズ

> **⚠️ 実装ルール**
> 各 Phase の実装前に必ず「仕様確認」ステップを実施すること。
> Cline が作成予定の仕様・ファイル構成・インターフェースをユーザーに提示し、
> **ユーザーの確認・承認を得てから実装を開始する**。
> 指摘があれば仕様を修正し、再確認を取ること。

---

### Phase 1: データベースマイグレーション（優先度: 最高）

#### 🔍 仕様確認（実装前に提示する内容）
- 作成予定の4本のSQLファイル内容（`database_design.md` の最新内容）
- 各マイグレーションの適用順序と依存関係
- ロールバック手順
- 既存テーブルへの影響確認

**対象ファイル（適用順）**:
1. `backend/migrations/20260618_003_add_order_and_prerequisite_to_transition_data.sql`
   - `transition_data` に `work_order`（作業順序）、`prerequisite_transition_ids`（前提依存配列）追加
2. `backend/migrations/20260618_004_add_experiment_plan.sql`
   - `experiment_plan` テーブル新規作成
3. `backend/migrations/20260618_005_add_review_result_to_task_detail.sql`
   - `project_task_detail` に `review_result` カラム追加（`reviewed_at`/`review_user_id` は既存）
4. `backend/migrations/20260618_006_add_task_status_ng.sql`
   - `code_master` に TaskStatus `06`（NG）追加

**内容**:
- [ ] `transition_data.work_order` / `prerequisite_transition_ids` カラム追加
- [ ] `experiment_plan` テーブル新規作成
- [ ] `project_task_detail.review_result` カラム追加
- [ ] `code_master` に TaskStatus `06`（NG）追加
- [ ] マイグレーション動作確認

詳細SQLは [database_design.md](./database_design.md) を参照。

---

### Phase 2: バックエンド実装 — 実験計画API（優先度: 最高）

#### 🔍 仕様確認（実装前に提示する内容）
- 各エンドポイントのパス・メソッド・リクエスト/レスポンス仕様
- Repository層のメソッドシグネチャ（引数・戻り値の型）
- Service層のビジネスロジック（認可チェック・UPSERT条件等）
- SQLクエリの構造（特に ON CONFLICT の扱い）
- `database.ts` に追加する `ExperimentPlanRow` 型定義

**新規作成ファイル**:
- `backend/src/sql/queries/experimentPlan/findByMethod.sql`
- `backend/src/sql/queries/experimentPlan/upsert.sql`
- `backend/src/sql/queries/experimentPlan/deleteByMethod.sql`
- `backend/src/repositories/experimentPlanRepository.ts`
- `backend/src/services/experimentPlanService.ts`
- `backend/src/controllers/experimentPlanController.ts`
- `backend/src/routes/experimentPlanRoutes.ts`

**修正ファイル**:
- `backend/src/types/database.ts`（`ExperimentPlanRow` 型追加）
- `backend/src/server.ts`（ルート登録）

**実装内容**:
- [x] `ExperimentPlanRow` 型定義を `database.ts` に追加
- [x] `findByMethod.sql` — メソッド全タブ一括取得
- [x] `upsert.sql` — 1タブ分のデータ保存（ON CONFLICT）
- [x] `deleteByMethod.sql` — メソッドの全タブ削除
- [x] `experimentPlanRepository.ts` — Repository層実装
  - `findByMethod(organizationId, projectId, methodId)`
  - `upsert(organizationId, projectId, data)`
  - `deleteByMethod(organizationId, projectId, methodId)`
- [x] `experimentPlanService.ts` — Service層実装
  - `getExperimentPlans(...)` — 認可チェック含む
  - `saveExperimentPlan(...)` — UPSERT
  - `deleteExperimentPlans(...)` — 削除
  - `getPlanDialogData(...)` — ダイアログ初期データ取得（暫定モック）
- [x] `experimentPlanController.ts` — Controller層実装
  - `getExperimentPlans()` — GET handler
  - `saveExperimentPlan()` — PUT handler
  - `deleteExperimentPlans()` — DELETE handler
  - `getPlanDialogData()` — GET handler（暫定モック）
- [x] `experimentPlanRoutes.ts` — ルーティング定義（`experimentInstructionRoutes.ts` に統合）
  - `GET /projects/:projectId/experiment-plans`
  - `PUT /projects/:projectId/experiment-plans/:methodId/:taskNumber`
  - `DELETE /projects/:projectId/experiment-plans/:methodId`
  - `GET /projects/:projectId/methods/:methodId/plan-dialog-data`
- [ ] `server.ts` にルート登録（要確認）

詳細API仕様は [api_design.md](./api_design.md) を参照。

---

### Phase 3: バックエンド実装 — 実験指示API（優先度: 高）

#### 🔍 仕様確認（実装前に提示する内容）
- `experimentInstructionController.ts` の現状モック実装の確認
- 差し替え後のエンドポイント仕様（変更点の洗い出し）
- `templateDataRepository.ts` に追加する `findByProject()` の SQL・戻り値型
- `projectTaskDetailRepository.ts` の `approveTask()` / `recordNg()` の更新対象カラムと遷移条件
- `experimentInstructionService.ts` で行う task_status 遷移ルール（05/06）

**修正ファイル**:
- `backend/src/repositories/templateDataRepository.ts`
- `backend/src/repositories/projectTaskDetailRepository.ts`
- `backend/src/controllers/experimentInstructionController.ts`

**新規作成ファイル**:
- `backend/src/services/experimentInstructionService.ts`

**実装内容**:
- [x] `templateDataRepository.ts` に `findByProject()` メソッド追加（`findByProject.sql` も作成済み）
- [x] `projectTaskDetailRepository.ts` に以下を追加
  - `approveTask(organizationId, projectId, methodId, taskNumber, reviewUserId)`
  - `recordNg(organizationId, projectId, methodId, taskNumber, ngReason, reviewUserId)`
- [x] `experimentInstructionService.ts` 新規作成
  - `getExperimentInstructions(organizationId, projectId)` — template_dataを展開（ネスト形式）
  - `approveTask(...)` — task_status=05に更新
  - `recordNg(...)` — task_status=06・review_result更新
  - `getProjectMethods(organizationId, projectId)` — メソッドID一覧
- [x] `experimentInstructionController.ts` を暫定モック→Service層呼び出しに差し替え
  - 暫定 `toFlatInstructions()` 関数を削除し、ネスト形式をそのまま返すよう変更
  - フロントエンド型定義（`experimentInstruction.ts`）もネスト形式に更新済み
  - APIサービス（`experimentInstructionApiService.ts`）も実API接続に更新済み

---

### Phase 4: チェックアウト処理拡張（優先度: 高）

#### 🔍 仕様確認（実装前に提示する内容）
- `projectService.ts` の checkout() 処理の現状確認
- MAIMLへの書き込み箇所（Dataタグ内のどの階層か）
- `mgr-instruction:` プレフィックスの書き込み方式（既存 property への追加 vs 新規追加）
- 書き込み失敗時の挙動（ブロックしない・警告ログのみ）
- experiment_plan が未登録の場合の挙動（スキップ）

**修正ファイル**:
- `backend/src/services/projectService.ts`

**実装内容**:
- [ ] チェックアウト処理 (`checkout()`) に以下を追加:
  1. `experiment_plan` テーブルからプロジェクトの実験計画データを取得
  2. MAIMLのData層に `mgr-instruction:` プレフィックスでプロパティを書き込み
     - `material.properties` への書き込み
     - `condition.properties` への書き込み
     - `result.properties` への書き込み
  3. 書き込みエラーは警告ログに記録（チェックアウト処理はブロックしない）

**MAIMLへの書き込み仕様**:
```xml
<!-- 元のプロパティ（通常値） -->
<property key="temperature">
  <content xsi:type="floatType" units="°C">実測値</content>
</property>

<!-- 想定値プロパティ（mgr-instruction: 接頭句） -->
<property key="mgr-instruction:temperature">
  <content xsi:type="floatType" units="°C">25</content>
</property>
```

---

### Phase 5: フロントエンド API接続（優先度: 中）

#### 🔍 仕様確認（実装前に提示する内容）
- 各コンポーネントの現状実装（モック箇所）の確認
- API接続先エンドポイントの対応表
- ExperimentPlanDialog の継承ロジック（overrideFlags）の具体的な動作
- WorkRecordPanel への DataRecordDialog 統合方針（移植範囲）
- ProgressOverviewTab のデータ取得元と表示項目の確認

#### 5-1: ExperimentPlanDialog

**修正ファイル**:
- `frontend/src/services/experimentPlanApiService.ts`
- `frontend/src/components/project/ExperimentPlanDialog.tsx`

**実装内容**:
- [ ] `experimentPlanApiService.ts` を実APIに切り替え
  - `getExperimentPlans(projectId, methodId)` — GET API呼び出し
  - `saveExperimentPlan(projectId, methodId, taskNumber, data)` — PUT API呼び出し
  - `getPlanDialogData(projectId, methodId)` — ダイアログ初期データ取得
- [ ] ダイアログオープン時のデータ復元処理実装
  - GET APIで既存データを取得
  - 各タブのstateに復元
- [ ] 継承ロジック実装（`overrideFlags`構造）
  - 全体タブ変更時の各タスクNへの反映
  - 個別上書きフラグ管理
- [ ] 保存処理を全タブ一括保存に変更
- [ ] 比較用レイアウト（案1/2/3 RadioGroup）を削除し案3固定

#### 5-2: ExperimentInstructionTab

**修正ファイル**:
- `frontend/src/services/experimentInstructionApiService.ts`
- `frontend/src/components/project/ExperimentInstructionTab.tsx`

**実装内容**:
- [ ] `experimentInstructionApiService.ts` を実APIに切り替え
- [ ] 承認・NG処理の実API呼び出し実装
- [ ] 保存成功時のデータ再取得実装
- [ ] エラーハンドリング改善

#### 5-3: WorkRecordPanel

**修正ファイル**:
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`（参照用）

**実装内容**:
- [ ] `DataRecordDialog` の保存ロジック・フォーム管理をインライン化
- [ ] 想定値フィールドの取得実装（`transition.templates[n].properties[m].expectedValue`）
- [ ] ステータス更新セクション統合
- [ ] API接続（`saveTransitionData`）

#### 5-4: ProgressOverviewTab

**修正ファイル**:
- `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`

**実装内容**:
- [ ] `getWorkerTasks` API接続
- [ ] `prerequisite_transition_ids` データを API から取得
- [ ] 「作業へ」ボタンでの作業記録タブへの遷移連携

---

### Phase 6: テスト・調整（優先度: 通常）

#### 🔍 仕様確認（実装前に提示する内容）
- テストシナリオ一覧と優先順位
- 手動テスト手順書の確認
- 回帰テスト対象機能の確認


- [ ] エンドツーエンドテスト
  - 実験計画登録 → チェックアウト → MAIML確認
  - 実験実施 → 実績値記録 → レビュー → 承認/NG
- [ ] 想定値 vs 実績値の対比表示テスト
- [ ] トランジションスキップ機能テスト（依存関係チェック含む）
- [ ] 全体継承（全体タブ→タスクN）テスト
- [ ] プロジェクト削除時のデータ連動削除テスト
- [ ] 既存機能の回帰テスト（チェックアウト処理・プロジェクト指示）

---

## 4. 技術的決定事項

| # | 項目 | 決定内容 |
|---|------|---------|
| 1 | MAIMLへの書き込みタイミング | **チェックアウト時に一括反映** |
| 2 | 想定値プレフィックス | **`mgr-instruction:`** |
| 3 | 依存関係の表現 | **`prerequisite_transition_ids`（直接依存先のみ格納）** |
| 4 | 全体→タスクN継承 | **フロントの `overrideFlags` stateで管理** |
| 5 | 保存粒度 | **1レコード = org + project + method + task_number** |
| 6 | notes保存形式 | **JSONB 1カラム（NoteItem[]）** |
| 7 | template_values保存形式 | **ネスト形式JSONB `{templateId: {fieldKey: value}}`** |
| 8 | project_instructionとの関係 | **完全独立（役割が異なる）** |
| 9 | MAIMLビューア | **ViewRendererDialog（フローティング表示）** |
| 10 | ExperimentPlanDialogレイアウト | **案3（内部タブ切替: 基本情報/テンプレート入力）** |

---

## 5. 影響を受ける既存機能

| 機能 | 影響内容 |
|------|---------|
| チェックアウト処理 | `experiment_plan` データのMAIML書き込みを追加 |
| TaskRegistrationTab | 実験条件列削除済み（UIのみ） |
| ProjectManagement タブ | Tab3「指示一覧」→「指示管理」（サブタブ追加） / Tab4「進捗確認」削除 |
| 進捗確認タブ | `ProgressCheckTab` / `ProgressCheckTable` → `ProgressOverviewTab` に置き換え |
| DataRecordDialog | `WorkRecordPanel` に吸収・インライン化 |

---

## 6. リスク管理

| リスク | 影響度 | 対策 |
|--------|--------|------|
| MAIMLへの書き込み失敗 | 高 | チェックアウト処理をブロックせずエラーログ記録 |
| DataRecordDialog（2810行）のインライン化 | 中 | 内部ロジックを変えずJSX部分のみ抽出 |
| template_data の property_set 構造が想定と異なる | 高 | 実装前にDBの実際のデータを確認 |
| 全体→タスクN継承の複雑さ | 中 | overrideFlags でフィールド単位管理 |
| project_task_detail の review_result 追加による影響 | 低 | マイグレーション前に参照箇所を確認 |

---

## 7. 参照ドキュメント

### 統合計画書（本ディレクトリ）
- [SUMMARY.md](./SUMMARY.md) — エグゼクティブサマリー
- [database_design.md](./database_design.md) — データベース設計詳細
- [api_design.md](./api_design.md) — API設計詳細
- [frontend_design.md](./frontend_design.md) — フロントエンド設計詳細
- [implementation_roadmap.md](./implementation_roadmap.md) — 実装ロードマップ
- [data_flow.md](./data_flow.md) — データフロー図

### バックアップ（元タスクドキュメント）
- `docs/bk/20260608_1500_実験計画ダイアログモック作成/` — ExperimentPlanDialogモック設計
- `docs/bk/20260609_1051_実験計画指示記入_設計資料/` — 詳細仕様（design.md: 確認事項一覧含む）
- `docs/bk/20260610_0853_指示一覧統合とレイアウト変更/` — 指示管理タブ設計
- `docs/bk/20260611_0953_実験作業者画面UIリデザイン/` — 作業者画面モック設計
- `docs/bk/20260611_1700_実験作業者画面リデザイン実装/` — 実装計画（フェーズA/B）
- `docs/bk/20260615_0812_実験計画バックエンド統合設計/` — バックエンド設計（api_design.md等）
- `docs/bk/20260616_1507_ProjectManagement画面改善/` — ペトリネットビューア等3機能
- `docs/bk/20260616_1619_WorkRecordPanelコメント機能追加/` — コメント機能
- `docs/bk/20260618_0858_トランジションスキップ機能設計/` — スキップ機能・依存関係設計

### 設計ドキュメント（既存）
- `docs/design/db/ddl/template_data.sql`
- `docs/design/db/ddl/project_task_detail.sql`

### フロントエンドソース
- `frontend/src/types/experimentPlan.ts`
- `frontend/src/types/experimentInstruction.ts`
- `frontend/src/components/project/ExperimentPlanDialog.tsx`
- `frontend/src/components/project/ExperimentInstructionTab.tsx`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`

### バックエンドソース
- `backend/src/repositories/templateDataRepository.ts`
- `backend/src/services/experimentDataService.ts`
- `backend/src/controllers/experimentInstructionController.ts`
- `backend/src/services/projectService.ts`

---

## 8. 承認記録

- **計画書作成日時**: 2026-06-18 14:52
- **承認日時**: —
- **承認者コメント**: —

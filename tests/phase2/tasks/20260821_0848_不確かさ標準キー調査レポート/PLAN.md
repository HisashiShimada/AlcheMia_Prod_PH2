# タスク計画書: 不確かさ機能改修（手入力値・許容値判定方式）

## メタデータ
- **作成日時**: 2026-08-25
- **更新日時**: 2026-08-26（実験記録タブ実装マージ後の設計見直し・Phase 1〜4 + モック除去 完了）
- **タスクフォルダ**: `docs/tasks/20260821_0848_不確かさ標準キー調査レポート/`
- **優先度**: 高
- **推定工数**: 大規模（複数セッション想定）

---

## 1. タスク概要

旧実装方針（`formula_key` による自動計算）から**手入力値・許容値比較判定方式**に変更した。
本計画はその変更後の方針に基づく実装計画を定める。

### 新実装方針サマリー

| 観点 | 内容 |
|---|---|
| 計算式 | **なし** — 作業者が WorkRecordPanel で Uncertainty Value を手入力 |
| 許容値 | `uncertainty_criteria` に `tolerance_upper` / `tolerance_lower` を追加 |
| 判定 | 手入力値 vs tolerance_upper / tolerance_lower で **良好 / 不良** の 2 値。SKIP は廃止（バリデーションで弾くため発生しない） |
| 指定場所 | **TemplateEditorDialog**（プロパティに uncertainty_key を指定）+ **WorkRecordPanel**（Uncertainty Value 入力） |
| 削除 | **ExperimentPlanDialog の不確かさ関連**（UI + API + 保存ロジック）を完全削除 |
| 保存先 | Uncertainty Value → **既存の `saveBatchExperimentData` フロー内で `property_set` に含めて保存**（下記「設計変更」参照）／ 判定結果 → `experiment_uncertainty_judge`（新規テーブル） |
| 判定トリガー | WorkRecordPanel の保存ボタン押下時 |
| MAiML 書き込み | ①テンプレート保存時 → `<uncertainty key="..."/>` (value なし空タグ)。②承認時の**自動判定結果の MAiML 記録方法は TODO**（記録方式・タグ構成・キー命名規則は別途確定後に設計する） |
| スコープ外 | formula_key ／ 繰り返し測定系計算 |

### 　2026-08-26 設計変更、実験記録タブ実装マージによる Phase 4 方针変更

別タスク `docs/tasks/20260825_1200_実験記録タブ実装/PLAN.md` にて以下が実装済み（マージ済み）：

- `transition_data.is_recorded` カラム追加（DDL + マイグレーション）
- `saveBatchExperimentData` が `transitionId` を受け取り、保存後に `is_recorded = TRUE` を自動更新
- バックエンドの実績値保存 API（`POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/batch`）が完全稼働

この実装により、**「WorkRecordPanel の実績値保存 API が未実装のため Phase 4 の設計が複雑」というリスクが解消**された。

**Phase 4 設計変更点：**
- ~~独立した `experimentInstruction` 系に Uncertainty Value 保存 API を新設~~
- **既存の `experimentController.saveBatchData` 内（バックエンドトランザクション内）で不確かさ判定もトリガーする**
  - `transitionId` は既に受け取り済みのため、同一トランザクション内で `runJudge()` を呼び出す設計が自然
  - フロントエンドは `saveBatchExperimentData` を呼ぶ際にリクエストボディへ `uncertaintyValues` フィールドを追加する

**WorkRecordPanel の PropertyCard における現状（2026-08-26 時点）：**
- PlanA コンポーネント（デッドコード）を削除し、`Mock*` 型名を `Work*` にリネーム済み
- `UncertaintyRecordTab.tsx`（旧モック依存）をスタブ化済み（Phase 7 で再実装）
- PropertyCard 内に不確かさ基準 Select + 値 Input の UI（`addedValues` state）が追加済み
- `PropertyCard` → `PropertyList` → `PlanB` → `WorkRecordPanel` へ `onUncertaintyValuesChange` コールバック追加済み
- ただし `handleSave` / `handleSaveAndNext` への Ref 管理と `saveBatchExperimentData` への `uncertaintyValues` 渡しは**未接続**（Phase 7 残タスク）
- **「指示あり」分岐（テンプレートに `uncertainty_key` が設定されている場合の固定行表示）は未実装**

---

## 2. 目的と期待される成果

- [x] `uncertainty_criteria` に `tolerance_upper` / `tolerance_lower` カラムが追加される
- [x] `experiment_uncertainty_judge` テーブルが新設される
- [x] 作業者が WorkRecordPanel で Uncertainty Value を手入力し、保存時に **良好 / 不良** 判定が実行される（BE 完成。FE 保存接続は Phase 7 で対応）
- [x] 判定結果が `experiment_uncertainty_judge` に保存される（BE 完成。FE 保存接続は Phase 7 で対応）
- [ ] Uncertainty Value が `template_data.property_set` に保存される（Phase 7 FE 接続待ち）
- [ ] ExperimentPlanDialog の `assignedUncertainty` 関連コードが完全削除される（Phase 8 残）
- [ ] TemplateEditorDialog でプロパティに uncertainty_key を指定できる（Phase 6 残）
- [ ] 承認時に MAiML の `<uncertainty>` タグに判定結果・値が書き込まれる（Phase 9 TODO）

---

## 3. 実装ステップ（チェックリスト）

### Phase 1: DB 変更

- [x] **1-1**: `docs/design/db/ddl/uncertainty_criteria.sql` に `tolerance_upper` / `tolerance_lower` カラムを追加
- [x] **1-2**: `docs/design/db/ddl/experiment_uncertainty_judge.sql` 新規テーブル DDL を作成
  - `judge_result` カラムの値: `'良好'` / `'不良'`（評価機能の値体系と統一）
- [x] **1-3**: `docs/design/db/ddl/migrations/20260825_extend_uncertainty_criteria.sql` マイグレーション SQL を作成

### Phase 2: バックエンド — uncertainty_criteria 拡張

- [x] **2-1**: `uncertaintyCriteriaRepository.ts` の型定義に `tolerance_upper` / `tolerance_lower` を追加
- [x] **2-2**: `insertNewVersion.sql` に tolerance カラム追加
- [x] **2-3**: `findByKey.sql` / `findAllByOrganization.sql` / `findForSelector.sql` の SELECT に tolerance カラムを追加
- [x] **2-4**: `uncertaintyCriteriaController.ts` の保存処理で tolerance を受け取るよう更新
- [ ] **2-5**: ⚠️ **TODO**: `uncertainty_criteria` 新規保存時の suffix 版 `namespace_term` 同時登録
  - 判定結果の MAiML 記録方法（タグ構成・キー命名規則）が確定した後に設計・実装する
  - 確定事項: 登録タイミングは `uncertainty_criteria` 作成トランザクション内（同一トランザクション）

### Phase 3: バックエンド — 判定エンジン（新規）

- [x] **3-1**: `backend/src/utils/uncertaintyJudge.ts` 新規作成（判定ロジック）
  - `judgeUncertainty(value, upper, lower): '良好' | '不良'`
- [x] **3-2**: `backend/src/repositories/experimentUncertaintyJudgeRepository.ts` 新規作成
  - `insert(data)` — 判定結果 INSERT
  - `findLatestByProjectAndProp(...)` — 最新判定取得
  - `findAllByProject(organizationId, projectId)` — 承認時 MAiML 書き込み用
- [x] **3-3**: `backend/src/services/uncertaintyJudgeService.ts` 新規作成
  - `runJudge(...)` — uncertainty_criteria 取得 → judgeUncertainty 実行 → INSERT
- [x] **3-4**: SQL ファイル新規作成
  - `backend/src/sql/queries/experiment_uncertainty_judge/insert.sql`
  - `backend/src/sql/queries/experiment_uncertainty_judge/findLatestByProjectAndProp.sql`
  - `backend/src/sql/queries/experiment_uncertainty_judge/findAllByProject.sql`

### Phase 4: バックエンド — Uncertainty Value 保存（既存 saveBatchData に統合）

> ※ 旧設計（`experimentInstruction` 系に独立 API 新設）から変更。
> 実験記録タブ実装マージにより `saveBatchExperimentData` が完全稼働したため、
> 既存フローへ統合する方式に切り替える。

- [x] **4-1**: `SaveBatchExperimentDataRequest` 型（`frontend/src/types/api.ts`）に `uncertaintyValues` フィールドを追加
  - `uncertaintyValues?: Array<{ uncertaintyKey: string; value: number }>`
- [x] **4-2**: `experimentController.ts` の `saveBatchData` ハンドラでリクエストから `uncertaintyValues` を受け取るよう更新
- [x] **4-3**: `experimentDataService.ts` の `saveBatchData` に `uncertaintyValues` 引数を追加
  - 既存トランザクション内（COMMIT 後）で `uncertaintyJudgeService.runJudge()` を呼び出す
  - `runJudge` の引数: `organizationId, projectId, methodId, taskNo, transitionId, uncertaintyValues`

### Phase 5: バックエンド — ExperimentPlanDialog 関連削除

- [x] **5-1**: `maimlWriterService.ts` の `__uncertainty__` 展開ロジックを削除
- [x] **5-2**: `templateDataRepository.ts` の `planned_values.__uncertainty__` 参照を削除（`@deprecated` 付きで残置）
- [x] **5-3**: `cd backend && npx tsc --noEmit` でエラーゼロを確認

### Phase 6: フロントエンド — TemplateEditorDialog 拡張

- [x] **6-1**: `TemplateEditorDialog.tsx` の既存 uncertainty 付与 UI を見直し
  - MAiML に `<uncertainty key="uncertainty_key値"/>` のみ記録する形に変更（value / description は WorkRecordPanel で入力）
  - 既存の `UncertaintyCriteriaSelectorModal` を利用して uncertainty_key を選択

### Phase 7: フロントエンド — WorkRecordPanel 拡張

> **現状（マージ済み UI）**: PropertyCard 内の「定量評価」セクション（`addedValues` state で管理される不確かさ基準 Select + 値 Input 行）は「指示なし」向けのモック UI として追加済み。
> 保存処理への接続と「指示あり」分岐が残タスク。

- [x] **7-1**: `WorkRecordPanel.tsx` の PropertyCard 内 Uncertainty Value 入力欄を本実装に切り替え
  - **指示あり/指示なし分岐**は現状まだ未実装。全プロパティに `addedValues` ベースの「指示なし」UI が表示される
  - 実際の「指示あり」分岐（テンプレートの `uncertainty.key` を固定行として表示）は Phase 7 の次ステップ
- [x] **7-2**: 保存ボタン押下時に `saveBatchExperimentData` のリクエストに `uncertaintyValues` を含める（Phase 4 の変更に対応）
- [x] **7-3**: API レスポンスの**良好/不良**判定結果をバッジ表示
- [x] **7-4**: 対応型定義（`uncertaintyValues` フィールド）を `saveBatchExperimentData` の呼び出しに反映

### Phase 7.5: フロントエンド — 実験指示タブ 不確かさ定量評価列追加

- [x] **7.5-1**: `ExperimentInstructionTab.tsx` に定量評価用の不確かさ列を追加

  | 列キー | 表示名 | 幅 | 内容 |
  |---|---|---|---|
  | `uncertaintyInstructionKey` | 指示キー | 180px | テンプレートの `uncertainty.key` |
  | `uncertaintyTolerance` | 許容値 | 140px | `tolerance_lower ～ tolerance_upper`（例: `-0.5 ～ 0.5`） |
  | `uncertaintyJudgeResult` | 判定結果 | 90px | **良好**（緑 Tag）/ **不良**（赤 Tag） |
  | `uncertaintyRecordedValue` | 記録値 | 100px | 作業者が入力した Uncertainty Value |

- [x] **7.5-2**: 件数による表示切り替えを実装
  - **1件**: 上記4列を行内に直接表示
  - **複数件**: 「不確かさ詳細 (N件)」**ボタンのみ**を行内に表示 → クリックで `UncertaintyJudgeDetailDialog` を開く

- [x] **7.5-3**: `UncertaintyJudgeDetailDialog.tsx` を新規作成
  - ダイアログ内レイアウト（縦並び）:
    - **上部**: プロパティ情報（Key / Label / 型 / 想定値 / 実績値）
    - **下部**: 不確かさ一覧テーブル（指示キー / 許容値 / 判定結果 / 記録値）

- [x] **7.5-4**: `FlatRow` 型に uncertainty judge 情報を追加
  - `uncertaintyJudges: UncertaintyJudgeSummary[]`（0件〜複数件）
  - `UncertaintyJudgeSummary`: `{ instructionKey, toleranceUpper, toleranceLower, judgeResult: '良好' | '不良', recordedValue }`

- [x] **7.5-5**: バックエンドの実験指示取得 API を拡張して judge 情報を JOIN（`experimentInstructionService.ts` 更新）

### Phase 8: フロントエンド — ExperimentPlanDialog 関連削除

- [x] **8-1**: `ExperimentPlanDialog.tsx` の `assignedUncertainty` 関連コードを削除（`buildDefaultAssignedUncertainty` / `mergeDefaultUncertainty` 呼び出し削除・保存時マージ処理削除）
- [x] **8-2**: `TemplateInputPanel.tsx` の不確かさ割り当て UI を Props から切り離し（内部ダミー変数に変更・UI 表示は残置）
- [x] **8-3**: `experimentPlanApiService.ts` の `__uncertainty__` 保存処理を削除
- [x] **8-4**: `experimentPlanHelpers.ts` の `buildDefaultAssignedUncertainty` / `mergeDefaultUncertainty` を削除
- [x] **8-5**: `types/experimentPlanDialog.ts` の `assignedUncertainty` / `onAssignedUncertaintyChange` Props 削除
- [x] **8-6**: `cd frontend && npx tsc --noEmit` でエラーゼロを確認（既存エラーのみ）

### Phase 9: MAiML 書き込み

- [ ] **9-1**: ⚠️ **TODO**: 承認時の自動判定結果を MAiML に記録する処理
  - 記録方式（タグ構成・キー命名規則・`<uncertainty>` の使い方）は別途確定後に設計・実装する
  - 確定事項:
    - 作業者入力値 (`uncertainty_value`) は `<uncertainty key="...">` に書き込む
    - 判定結果の記録方法は **別途決定が必要**（別 `<uncertainty>` タグ方式が有力だが未確定）
    - 記録元データ: `experiment_uncertainty_judge` テーブル
- [ ] **9-2**: `qualityEvaluationMaimlService.ts` に判定結果連携処理を追加

---

## 4. 変更ファイル一覧

### DDL（3ファイル）

| ファイル | 変更種別 | 概要 |
|---|---|---|
| `docs/design/db/ddl/uncertainty_criteria.sql` | 変更 | `tolerance_upper` / `tolerance_lower` カラム追加 |
| `docs/design/db/ddl/experiment_uncertainty_judge.sql` | 新規 | 判定結果テーブル DDL |
| `docs/design/db/ddl/migrations/20260825_extend_uncertainty_criteria.sql` | 新規 | マイグレーション SQL |

### バックエンド

| ファイル | 変更種別 | 概要 |
|---|---|---|
| `backend/src/utils/uncertaintyJudge.ts` | 新規 | 判定ロジック |
| `backend/src/repositories/experimentUncertaintyJudgeRepository.ts` | 新規 | 判定結果 CRUD |
| `backend/src/services/uncertaintyJudgeService.ts` | 新規 | 判定オーケストレーション |
| `backend/src/sql/queries/experiment_uncertainty_judge/insert.sql` | 新規 | INSERT SQL |
| `backend/src/sql/queries/experiment_uncertainty_judge/findLatestByProjectAndProp.sql` | 新規 | 最新判定取得 SQL |
| `backend/src/sql/queries/experiment_uncertainty_judge/findAllByProject.sql` | 新規 | プロジェクト全判定取得 SQL |
| `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 変更 | `tolerance_upper` / `tolerance_lower` 型定義追加 + suffix 版 namespace_term 同時登録 |
| `backend/src/sql/queries/uncertainty_criteria/insertNewVersion.sql` | 変更 | tolerance カラム追加 |
| `backend/src/sql/queries/uncertainty_criteria/insertSuffixTerm.sql` | **TODO** | suffix 版 namespace_term INSERT SQL（記録方式確定後に設計） |
| `backend/src/sql/queries/uncertainty_criteria/findByKey.sql` | 変更 | SELECT に tolerance 追加 |
| `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` | 変更 | SELECT に tolerance 追加 |
| `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` | 変更 | SELECT に tolerance 追加 |
| `backend/src/controllers/experimentInstructionController.ts` | ~~変更~~ → **不要**（旧設計から変更） |
| `backend/src/services/experimentInstructionService.ts` | ~~変更~~ → **不要**（旧設計から変更） |
| `backend/src/routes/experimentInstructionRoutes.ts` | ~~変更~~ → **不要**（旧設計から変更） |
| `backend/src/controllers/experimentController.ts` | **変更** | `uncertaintyValues` 受け取り追加 |
| `backend/src/services/experimentDataService.ts` | **変更** | `uncertaintyValues` 引数追加 + `runJudge()` 呼び出し |
| `backend/src/services/maimlWriterService.ts` | 変更 | `__uncertainty__` 展開ロジック削除 |
| `backend/src/repositories/templateDataRepository.ts` | 変更 | `planned_values.__uncertainty__` 参照削除 |
| `backend/src/utils/maimlQualityWriter.ts` | **TODO** | 判定結果の MAiML 書き込み（記録方式・タグ構成確定後に実装） |
| `backend/src/services/qualityEvaluationMaimlService.ts` | **TODO** | 判定結果連携（上記に依存） |

### フロントエンド

| ファイル | 変更種別 | 概要 |
|---|---|---|
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | 変更 | uncertainty_key 指定 UI（key のみ指定・value なし空タグで保存） |
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 変更 | PropertyCard 内 Uncertainty Value 入力（指示あり/なし分岐）+ **良好/不良**バッジ。`onUncertaintyValuesChange` コールバック追加済み。`handleSave` への Ref 接続は Phase 7 残 |
| `frontend/src/components/ExperimentWorker/UncertaintyRecordTab.tsx` | ✅ スタブ化 | 旧モック依存コードを削除、Phase 7 で再実装予定 |
| `frontend/src/components/uncertainty/UncertaintyListTable.tsx` | ✅ 変更 | `UncertaintyTemplate` 型に `termDisplayName` / `toleranceUpper` / `toleranceLower` 追加 |
| `frontend/src/services/uncertaintyCriteriaApiService.ts` | ✅ 変更 | `toleranceUpper` / `toleranceLower` マッピング追加 |
| `frontend/src/components/project/ExperimentInstructionTab.tsx` | 変更 | 不確かさ定量評価4列追加（指示キー/許容値/判定結果/記録値）+ 複数件ボタン式 |
| `frontend/src/components/project/UncertaintyJudgeDetailDialog.tsx` | **新規** | 複数件時の詳細ダイアログ（プロパティ情報＋不確かさ一覧テーブル） |
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | 変更 | `assignedUncertainty` 関連コード削除 |
| `frontend/src/components/project/subcomponents/TemplateInputPanel.tsx` | 変更 | 不確かさ割り当て UI 削除 |
| `frontend/src/services/experimentPlanApiService.ts` | 変更 | `__uncertainty__` 保存処理削除 |
| `frontend/src/utils/experimentPlanHelpers.ts` | 変更 | 関連ヘルパー関数削除 |
| `frontend/src/types/experimentPlan.ts` | 変更 | `assignedUncertainty` フィールド削除 |
| `frontend/src/types/experimentPlanDialog.ts` | 変更 | `assignedUncertainty` フィールド削除 |

---

## 5. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| `__uncertainty__` 削除で MAiML 書き込みが壊れる | 高 | Phase 5 実施前に `maimlWriterService.ts` と `templateDataRepository.ts` の `__uncertainty__` 参照箇所を全量調査してから削除 |
| ~~WorkRecordPanel の実績値保存 API が未実装のため Uncertainty Value のみ保存する API の設計が複雑になる~~ | ✅ **解消済み** | 別タスク「実験記録タブ実装」にて `saveBatchExperimentData` が `transitionId` + `is_recorded` 更新を含む形で完全稼働。Phase 4 は既存フローへの統合に設計変更済み |
| TemplateEditorDialog の既存 uncertainty UI との整合性 | 中 | 既存の `<uncertainty key="...">` 設定フローは維持しつつ、value/description 入力部分のみ WorkRecordPanel に移動する形に整理 |
| 大量ファイル変更による TypeScript コンパイルエラー | 中 | 各 Phase 完了後に `npx tsc --noEmit` でエラーゼロを確認してから次 Phase に進む |

---

## 6. テスト計画

### ユニットテスト
- [ ] `uncertaintyJudge.ts` — **良好 / 不良** 各ケース（上限・下限・境界値）
- [ ] `uncertaintyJudgeService.ts` — tolerance 取得 → 判定 → INSERT フロー

### 手動テスト
- [ ] TemplateEditorDialog でプロパティに uncertainty_key を指定して MAiML 保存 → `<uncertainty key="..."/>` (value なし空タグ) が記録されること
- [ ] WorkRecordPanel（指示あり）で Uncertainty Value を入力 → 保存ボタン → **良好/不良**バッジが PropertyCard 内に表示されること
- [ ] WorkRecordPanel（指示なし）で Select から不確かさ基準を選択 → Value 入力 → 保存 → **良好/不良**バッジが表示されること
- [ ] tolerance_upper / lower 内の値 → **良好**、超えた値 → **不良** になること
- [ ] 実験指示タブ（1件）: 指示キー / 許容値 / 判定結果（**良好/不良**）/ 記録値 が行内に直接表示されること
- [ ] 実験指示タブ（複数件）: 「不確かさ詳細 (N件)」ボタンが表示され、クリックでダイアログが開くこと
- [ ] 詳細ダイアログ: 上部にプロパティ情報、下部に不確かさ一覧テーブルが縦並びで表示されること
- [ ] 承認時に MAiML `<uncertainty>` タグに作業者入力値が書き込まれること（⚠️ 判定結果の記録方式は TODO のため、この項目は記録方式確定後に詳細化する）
- [ ] uncertainty_criteria 作成時の suffix 版 namespace_term 同時登録（⚠️ 記録方式確定後に実装するため、このテストは TODO）
- [ ] ExperimentPlanDialog を開いて不確かさ関連 UI が消えていること

### ビルドチェック（各 Phase 完了後）
- [ ] `cd backend && npx tsc --noEmit` — エラーゼロ
- [ ] `cd frontend && npx tsc --noEmit` — エラーゼロ

---

## 7. 承認記録

- **計画書提示日時**: 2026-08-25
- **承認日時**: （承認時に記入）
- **承認者コメント**: （フィードバック記入欄）



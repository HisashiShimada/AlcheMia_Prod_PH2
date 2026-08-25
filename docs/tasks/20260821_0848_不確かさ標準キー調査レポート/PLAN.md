# タスク計画書: 不確かさ機能改修（手入力値・許容値判定方式）

## メタデータ
- **作成日時**: 2026-08-25
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
| 判定 | 手入力値 vs tolerance_upper / tolerance_lower で OK / NG / SKIP |
| 指定場所 | **TemplateEditorDialog**（プロパティに uncertainty_key を指定）+ **WorkRecordPanel**（Uncertainty Value 入力） |
| 削除 | **ExperimentPlanDialog の不確かさ関連**（UI + API + 保存ロジック）を完全削除 |
| 保存先 | Uncertainty Value → `template_data.property_set` JSONB ／ 判定結果 → `experiment_uncertainty_judge`（新規テーブル） |
| 判定トリガー | WorkRecordPanel の保存ボタン押下時 |
| MAiML 書き込み | 実験管理者画面での承認時に `<uncertainty key="..."><value>` タグに書き込む |
| スコープ外 | WorkRecordPanel の実績値保存 API（別タスク） ／ formula_key ／ 繰り返し測定系計算 |

---

## 2. 目的と期待される成果

- [ ] `uncertainty_criteria` に `tolerance_upper` / `tolerance_lower` カラムが追加される
- [ ] `experiment_uncertainty_judge` テーブルが新設される
- [ ] 作業者が WorkRecordPanel で Uncertainty Value を手入力し、保存時に OK/NG 判定が実行される
- [ ] 判定結果が `experiment_uncertainty_judge` に保存される
- [ ] Uncertainty Value が `template_data.property_set` に保存される
- [ ] ExperimentPlanDialog の `assignedUncertainty` 関連コードが完全削除される
- [ ] TemplateEditorDialog でプロパティに uncertainty_key を指定できる（MAiML に `<uncertainty key="...">` として記録）
- [ ] 承認時に MAiML の `<uncertainty>` タグに判定結果・値が書き込まれる

---

## 3. 実装ステップ（チェックリスト）

### Phase 1: DB 変更

- [ ] **1-1**: `docs/design/db/ddl/uncertainty_criteria.sql` に `tolerance_upper` / `tolerance_lower` カラムを追加
- [ ] **1-2**: `docs/design/db/ddl/experiment_uncertainty_judge.sql` 新規テーブル DDL を作成
- [ ] **1-3**: `docs/design/db/ddl/migrations/20260825_extend_uncertainty_criteria.sql` マイグレーション SQL を作成

### Phase 2: バックエンド — uncertainty_criteria 拡張

- [ ] **2-1**: `uncertaintyCriteriaRepository.ts` の型定義に `tolerance_upper` / `tolerance_lower` を追加
- [ ] **2-2**: `insertNewVersion.sql` に tolerance カラム追加
- [ ] **2-3**: `findByKey.sql` / `findAllByOrganization.sql` / `findForSelector.sql` の SELECT に tolerance カラムを追加
- [ ] **2-4**: `uncertaintyCriteriaController.ts` の保存処理で tolerance を受け取るよう更新

### Phase 3: バックエンド — 判定エンジン（新規）

- [ ] **3-1**: `backend/src/utils/uncertaintyJudge.ts` 新規作成（判定ロジック）
  - `judgeUncertainty(value, upper, lower): 'OK' | 'NG' | 'SKIP'`
- [ ] **3-2**: `backend/src/repositories/experimentUncertaintyJudgeRepository.ts` 新規作成
  - `insert(data)` — 判定結果 INSERT
  - `findLatestByProjectAndProp(...)` — 最新判定取得
  - `findAllByProject(organizationId, projectId)` — 承認時 MAiML 書き込み用
- [ ] **3-3**: `backend/src/services/uncertaintyJudgeService.ts` 新規作成
  - `runJudge(...)` — uncertainty_criteria 取得 → judgeUncertainty 実行 → INSERT
- [ ] **3-4**: SQL ファイル新規作成
  - `backend/src/sql/queries/experiment_uncertainty_judge/insert.sql`
  - `backend/src/sql/queries/experiment_uncertainty_judge/findLatestByProjectAndProp.sql`
  - `backend/src/sql/queries/experiment_uncertainty_judge/findAllByProject.sql`

### Phase 4: バックエンド — Uncertainty Value 保存 API

- [ ] **4-1**: `experimentInstructionService.ts` に `saveUncertaintyValue()` 追加
  - `template_data.property_set` の uncertainty 情報として保存（`__uncertainty_value__` キー）
  - 保存後に `uncertaintyJudgeService.runJudge()` を呼び出す
- [ ] **4-2**: `experimentInstructionController.ts` に対応ハンドラ追加
  - `PUT /api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/uncertainty-value`
- [ ] **4-3**: `experimentInstructionRoutes.ts` にルート追加

### Phase 5: バックエンド — ExperimentPlanDialog 関連削除

- [ ] **5-1**: `maimlWriterService.ts` の `__uncertainty__` 展開ロジックを削除
- [ ] **5-2**: `templateDataRepository.ts` の `planned_values.__uncertainty__` 参照を削除
- [ ] **5-3**: `cd backend && npx tsc --noEmit` でエラーゼロを確認

### Phase 6: フロントエンド — TemplateEditorDialog 拡張

- [ ] **6-1**: `TemplateEditorDialog.tsx` の既存 uncertainty 付与 UI を見直し
  - MAiML に `<uncertainty key="uncertainty_key値">` のみ記録する形に変更
  - 既存の `UncertaintyCriteriaSelectorModal` を利用して uncertainty_key を選択

### Phase 7: フロントエンド — WorkRecordPanel 拡張

- [ ] **7-1**: `WorkRecordPanel.tsx` に Uncertainty Value 入力フィールドを追加
  - template で uncertainty_key が設定されているプロパティ行に対して表示
  - `uncertainty_key` / `tolerance_upper` / `tolerance_lower` を参照用に表示
- [ ] **7-2**: 保存ボタン押下時に Uncertainty Value 保存 API 呼び出し（Phase 4 の API）
- [ ] **7-3**: API レスポンスの OK/NG 結果をバッジ表示
- [ ] **7-4**: 対応 API サービス関数を `frontend/src/services/` に追加

### Phase 8: フロントエンド — ExperimentPlanDialog 関連削除

- [ ] **8-1**: `ExperimentPlanDialog.tsx` の `assignedUncertainty` 関連コードを削除
- [ ] **8-2**: `TemplateInputPanel.tsx` の不確かさ割り当て UI を削除
- [ ] **8-3**: `experimentPlanApiService.ts` の `__uncertainty__` 保存処理を削除
- [ ] **8-4**: `experimentPlanHelpers.ts` の `buildDefaultAssignedUncertainty` / `mergeDefaultUncertainty` を削除
- [ ] **8-5**: `types/experimentPlan.ts` / `types/experimentPlanDialog.ts` の `assignedUncertainty` フィールドを削除
- [ ] **8-6**: `cd frontend && npx tsc --noEmit` でエラーゼロを確認

### Phase 9: MAiML 書き込み

- [ ] **9-1**: `maimlQualityWriter.ts` に判定結果を `<uncertainty>` タグへ書き込む処理を追加
  - `experiment_uncertainty_judge` から最新判定を取得
  - `<uncertainty key="..."><value>xxx</value><description>OK: 0.3 ≤ 0.5</description></uncertainty>` 形式
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
| `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 変更 | `tolerance_upper` / `tolerance_lower` 型定義追加 |
| `backend/src/sql/queries/uncertainty_criteria/insertNewVersion.sql` | 変更 | tolerance カラム追加 |
| `backend/src/sql/queries/uncertainty_criteria/findByKey.sql` | 変更 | SELECT に tolerance 追加 |
| `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` | 変更 | SELECT に tolerance 追加 |
| `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` | 変更 | SELECT に tolerance 追加 |
| `backend/src/controllers/experimentInstructionController.ts` | 変更 | Uncertainty Value 保存ハンドラ追加 |
| `backend/src/services/experimentInstructionService.ts` | 変更 | `saveUncertaintyValue()` 追加 |
| `backend/src/routes/experimentInstructionRoutes.ts` | 変更 | 新規ルート追加 |
| `backend/src/services/maimlWriterService.ts` | 変更 | `__uncertainty__` 展開ロジック削除 |
| `backend/src/repositories/templateDataRepository.ts` | 変更 | `planned_values.__uncertainty__` 参照削除 |
| `backend/src/utils/maimlQualityWriter.ts` | 変更 | 判定結果 `<uncertainty>` 書き込み追加 |
| `backend/src/services/qualityEvaluationMaimlService.ts` | 変更 | 判定結果連携 |

### フロントエンド

| ファイル | 変更種別 | 概要 |
|---|---|---|
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | 変更 | uncertainty_key 指定 UI（key のみ指定に整理） |
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 変更 | Uncertainty Value 入力 + 保存 + OK/NG 表示 |
| `frontend/src/services/` (新規 or 既存) | 変更/新規 | Uncertainty Value 保存 API 呼び出し |
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
| WorkRecordPanel の実績値保存 API が未実装のため Uncertainty Value のみ保存する API の設計が複雑になる | 中 | Phase 4 では `template_data` への uncertainty_value 書き込みのみに限定し、実績値との同時保存は別タスクに委ねる |
| TemplateEditorDialog の既存 uncertainty UI との整合性 | 中 | 既存の `<uncertainty key="...">` 設定フローは維持しつつ、value/description 入力部分のみ WorkRecordPanel に移動する形に整理 |
| 大量ファイル変更による TypeScript コンパイルエラー | 中 | 各 Phase 完了後に `npx tsc --noEmit` でエラーゼロを確認してから次 Phase に進む |

---

## 6. テスト計画

### ユニットテスト
- [ ] `uncertaintyJudge.ts` — OK / NG / SKIP 各ケース
- [ ] `uncertaintyJudgeService.ts` — tolerance 取得 → 判定 → INSERT フロー

### 手動テスト
- [ ] TemplateEditorDialog でプロパティに uncertainty_key を指定して MAiML 保存 → `<uncertainty key="...">` が記録されること
- [ ] WorkRecordPanel で Uncertainty Value を入力 → 保存ボタン → OK/NG バッジが表示されること
- [ ] tolerance_upper / lower 内の値 → OK、超えた値 → NG になること
- [ ] 承認時に MAiML `<uncertainty>` タグに値・判定結果が書き込まれること
- [ ] ExperimentPlanDialog を開いて不確かさ関連 UI が消えていること

### ビルドチェック（各 Phase 完了後）
- [ ] `cd backend && npx tsc --noEmit` — エラーゼロ
- [ ] `cd frontend && npx tsc --noEmit` — エラーゼロ

---

## 7. 承認記録

- **計画書提示日時**: 2026-08-25
- **承認日時**: （承認時に記入）
- **承認者コメント**: （フィードバック記入欄）



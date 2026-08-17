# タスク計画書: 品質評価 MaiML EventLog 書き込み実装

## メタデータ

- **作成日時**: 2026-08-17 15:00
- **タスクID**: 20260817_1500
- **優先度**: 高
- **推定工数**: 2〜3日
- **関連タスク**: [20260817_0900 品質管理機能実装](../20260817_0900_品質管理機能_要約と実装計画/implementation_plan.md)

---

## タスク概要

品質管理機能（Phase 4）として、プロジェクト全体評価および階層別品質評価データを MaiML ファイルの `<eventLog>` セクションに書き込む機能を実装する。

既存の `<eventLog>` は作業進捗ログで使用されており、本タスクでは品質評価ログをその `<eventLog>` に統合して書き込む。

また、`<Uncertainties>` ラッパータグ（非公式タグ）を廃止し、`<Uncertainty>` を MaiML 直下に直接配置する修正も同時に行う。

---

## 背景・前提

### 既実装の状況

| 実装済み | 内容 |
|---|---|
| `project_overall_evaluations` テーブル | DDL・Repository・Service・Controller・Routes 実装済み |
| `aggregationCalculatorService.ts` | 階層別サマリー算出ロジック実装済み・テスト 17件 PASS |
| `experimentEvaluationService.exportToMaiml()` | `<Uncertainties>` ラッパー付きで書き込み（修正対象） |
| `maimlWriterService.ts` | `writeEventLogOnly()` / `writeDataAndEventLog()` 実装済み |
| `buildEventLogXML()` | 既存作業ログ JSON → `<eventLog>` XML 変換実装済み |
| `replaceEventLogInMaiml()` | 既存 `<eventLog>` タグ置き換え実装済み |

### MaiML XSD 上の確定制約

- `<eventLog>` は MaiML 文書内に **1件のみ**（既存作業ログへの統合必須）
- `<eventLog>` 直下に `<property>` を配置可能（`globalObjectContentGroup` に含まれる）
- `<log>` / `<trace>` / `<event>` はそれぞれ `id` と `ref` 属性が必須
- `<event>` 直下に `<resultsRef ref="..."/>` を配置可能（任意）
- `<Uncertainties>` は JIS K 0200 の公式タグではない（廃止対象）
- `<Uncertainty>` は JIS K 0200 の公式タグ（維持）

---

## 実装ステップ（チェックリスト）

### Step 1: ユーティリティ関数実装

- [ ] `backend/src/utils/maimlQualityWriter.ts` を新規作成
  - [ ] `resolveTransitionToInstructionMap(maimlXml: string): Map<string, string>`
    - MAiML XML をパースして `transition_id → instruction_id` マッピングを生成
  - [ ] `resolveInstructionToResultsMap(maimlXml: string): Map<string, string>`
    - `instruction_id → results_id` マッピングを生成（`resultsRef` 解決用）
  - [ ] `buildQualityEvalLogEntries(evaluations, overallEval, transToInstMap, instToResultsMap): EventLogJsonRecord[]`
    - 品質評価データを `buildEventLogXML()` が受け取れる `EventLogJsonRecord[]` 形式に変換
  - [ ] `removeUncertaintiesWrapper(maimlXml: string): string`
    - `<Uncertainties>...</Uncertainties>` ラッパーを除去し `<Uncertainty>` を直置きする

### Step 2: MaiML 書き込みサービス実装

- [ ] `backend/src/services/qualityEvaluationMaimlService.ts` を新規作成
  - [ ] `exportQualityEvaluationToMaiml(organizationId, projectId): Promise<ExportResult>`
    1. MAiML ファイルをダウンロード（`resolveMaimlFilePath` + `storageService.downloadFile`）
    2. `removeUncertaintiesWrapper()` で `<Uncertainties>` ラッパー除去
    3. `resolveTransitionToInstructionMap()` / `resolveInstructionToResultsMap()` で ref 解決
    4. DB から評価データを取得（`findByProject` 両 repository）
    5. `buildQualityEvalLogEntries()` で品質評価 JSON 生成
    6. 既存 `maiml_event_log` エントリと品質評価エントリをマージ
    7. `buildEventLogXML()` で EventLog XML 生成
    8. `replaceEventLogInMaiml()` で既存 EventLog を置き換え
    9. アーカイブ + `storageService.uploadFile()` で保存

### Step 3: 既存 `experimentEvaluationService.exportToMaiml()` 修正

- [ ] `backend/src/services/experimentEvaluationService.ts` の `exportToMaiml()` 修正
  - [ ] `<Uncertainties>...</Uncertainties>` ブロック生成を `<Uncertainty>` 直接配置に変更
  - [ ] 既存 `<Uncertainties>` 正規表現ロジックを削除・`<Uncertainty>` 直置きロジックに置換

### Step 4: Controller / Routes 追加

- [ ] `backend/src/controllers/projectOverallEvaluationController.ts` に追加
  - [ ] `exportToMaiml` 関数（`POST /:projectId/export-to-maiml`）
- [ ] `backend/src/routes/projectOverallEvaluationRoutes.ts` に追加
  - [ ] `POST /:projectId/export-to-maiml` ルート

### Step 5: フロントエンド修正

- [ ] `frontend/src/services/projectOverallEvaluationApiService.ts` に追加
  - [ ] `exportToMaiml(projectId: string): Promise<ExportToMaimlResult>`
- [ ] `frontend/src/components/project/ProjectCompletionDialog.tsx` 修正
  - [ ] `handleComplete` に ② `createOverallEvaluation()`（全体評価 DB 凍結）を追加
  - [ ] `handleComplete` に ④ `exportOverallEvaluationToMaiml()`（EventLog 書き込み）を追加

### Step 6: 型定義追加

- [ ] `backend/src/types/projectOverallEvaluation.ts` に `ExportToMaimlResult` 型を追加

### Step 7: ユニットテスト

- [ ] `backend/tests/utils/maimlQualityWriter.test.ts` を新規作成
  - [ ] `resolveTransitionToInstructionMap()` — サンプル XML で正しいマッピングが返ること
  - [ ] `buildQualityEvalLogEntries()` — 評価データ → EventLog JSON 変換の確認
  - [ ] `removeUncertaintiesWrapper()` — ラッパー除去後に `<Uncertainty>` が直置きされること

---

## 変更ファイル一覧

### 新規作成（3件）

| ファイル | 内容 |
|---|---|
| `backend/src/utils/maimlQualityWriter.ts` | XML パース・JSON 変換ユーティリティ |
| `backend/src/services/qualityEvaluationMaimlService.ts` | MaiML 書き込みオーケストレーション |
| `backend/tests/utils/maimlQualityWriter.test.ts` | ユニットテスト |

### 変更（6件）

| ファイル | 変更内容 |
|---|---|
| `backend/src/services/experimentEvaluationService.ts` | `<Uncertainties>` ラッパー廃止 |
| `backend/src/controllers/projectOverallEvaluationController.ts` | `exportToMaiml` 追加 |
| `backend/src/routes/projectOverallEvaluationRoutes.ts` | `POST /:projectId/export-to-maiml` 追加 |
| `backend/src/types/projectOverallEvaluation.ts` | `ExportToMaimlResult` 型追加 |
| `frontend/src/services/projectOverallEvaluationApiService.ts` | `exportToMaiml()` 追加 |
| `frontend/src/components/project/ProjectCompletionDialog.tsx` | `handleComplete` 修正 |

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|------|
| `transition→instruction` ref チェーンが解決できない | 高 | 中 | ユニットテストで実 MAiML サンプル使用。失敗時は `transitionId` を ref の代替値として使用 |
| 既存 EventLog との統合でデータ重複 | 中 | 中 | 品質評価専用 id プレフィックス `quality_` で識別・冪等化 |
| `<Uncertainties>` 廃止による読み取り側の互換性 | 中 | 低 | maiml_publish_worker 等での読み取り処理に `<Uncertainties>` 依存がないか事前確認 |
| XSD バリデーション失敗（id/ref 不備） | 高 | 低 | `log`/`trace`/`event` の `id`・`ref` 必須属性を確実に設定。XML 構造をテストで検証 |
| MAiML ファイル未存在プロジェクトでのエラー | 中 | 中 | ファイル未存在時はスキップ（warning ログ）して完了処理を継続 |

---

## テスト計画

### ユニットテスト（自動）

- [ ] `resolveTransitionToInstructionMap()` — サンプル MAiML XML で正しいマッピングが返ること
- [ ] `buildQualityEvalLogEntries()` — 評価 7 件 → EventLog JSON 変換の確認
- [ ] `removeUncertaintiesWrapper()` — `<Uncertainties>` 除去・`<Uncertainty>` 直置き確認

### 統合テスト（手動）

- [ ] プロジェクト完了処理後に `<eventLog>` に品質評価が書き込まれること
- [ ] `<property key="quality:overallEvaluation">` が `<eventLog>` 直下にあること
- [ ] `<Uncertainties>` タグが消えて `<Uncertainty>` が直置きされること
- [ ] 既存の作業進捗ログ（`<log>` タグ群）が消えていないこと
- [ ] MAiML のアーカイブファイルが作成されること

---

## 関連ドキュメント

| ドキュメント | パス |
|---|---|
| 品質管理機能実装計画（Phase 1〜3） | `docs/tasks/20260817_0900_品質管理機能_要約と実装計画/implementation_plan.md` |
| 品質管理機能基本設計書 | `docs/design/Alchemia品質管理機能_基本設計書.md` |
| MaiML eventLog XSD | `docs/design/maiml/maiml-eventLog.xsd` |
| MaiML property XSD | `docs/design/maiml/maiml-property.xsd` |
| maimlWriterService（既存） | `backend/src/services/maimlWriterService.ts` |
| maimlDataWriter（既存） | `backend/src/utils/maimlDataWriter.ts` |
| experimentEvaluationService（修正対象） | `backend/src/services/experimentEvaluationService.ts` |

---

## 承認記録

- **計画書提示日時**: 2026-08-17 15:00
- **承認日時**: —
- **承認者コメント**: —

---

## 実施記録

### 実施日時

開始: —  
完了: —

### 計画からの変更点

—

### 発生した問題と解決方法

—


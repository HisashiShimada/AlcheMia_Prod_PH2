# タスク計画書: 実験指示タブ 不確かさ列修正

## メタデータ
- **作成日時**: 2026-08-27 10:00
- **タスクID**: 20260827_1000_実験指示タブ不確かさ列修正
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

コミット `b3f476dc`（不確かさ基準の修正）で、実験指示タブのテーブル列が誤って統合された。

### 変更前（正しい状態）
不確かさ関連の列が5列あった（モックデータ使用）：
- 不確かさ基準名（`uncertaintyCriteriaName`）
- 不確かさ付与値（`uncertaintyAssignedValue`）
- 付与者（`uncertaintyAssignedBy`）
- 付与日時（`uncertaintyAssignedAt`）
- コメント（`uncertaintyComment`）

### 変更後（現在の誤った状態）
1列 `uncertaintyJudge` に統合されてしまっている。

### 本来あるべき設計
定性評価・定量評価を**別列**として表示し、定量評価が**複数件**ある場合のみダイアログ表示する。

---

## 目的と期待される成果

- [x] 定性評価の列（基準名・付与値）を独立した列として表示する
- [x] 定量評価の列（基準名・許容値・付与値・判定結果）を独立した列として表示する
- [x] 実験記録者・実験終了日時を1列として表示する
- [x] 定量評価が複数件ある場合のみダイアログで詳細表示する（1件はインライン）

---

## テーブル列の最終構成（7列追加・1列削除）

| グループ | 列キー | 表示内容 | データソース |
|---------|--------|----------|-------------|
| 定性評価 | `qualitativeCriteriaName` | 定性：基準名 | `experiment_instruction_detail.uncertainty_key` → `uncertainty_criteria.uncertainty_name` |
| 定性評価 | `qualitativeAssignedValue` | 定性：付与値（確か/曖昧/不確か等） | `experiment_instruction_detail.uncertainty_assigned_value` |
| 定量評価 | `quantitativeCriteriaName` | 定量：基準名（1件：インライン / **複数件：ボタン→ダイアログ**） | `experiment_uncertainty_judge` |
| 定量評価 | `quantitativeTolerance` | 定量：許容値（lower〜upper）**1件のみ**インライン | `experiment_uncertainty_judge` |
| 定量評価 | `quantitativeRecordedValue` | 定量：付与値（記録値）**1件のみ**インライン | `experiment_uncertainty_judge` |
| 定量評価 | `quantitativeJudgeResult` | 定量：判定結果（良好/不良）**1件のみ**インライン | `experiment_uncertainty_judge` |
| 共通 | `experimentUser` | 実験記録者（ユーザID）+ 実験終了日時（2行表示） | `project_task_detail.experiment_user_id / experiment_end_at` |

→ 既存の `uncertaintyJudge` 1列 を上記7列に置換する


---

## 実装ステップ

### STEP 1: バックエンド型定義の更新
- [x] `backend/src/types/api.ts`
  - `InstructionField` に `qualitativeCriteriaName?: string | null` / `qualitativeAssignedValue?: string | null` を追加
  - `InstructionTask` に `experimentUserId: string | null` / `experimentEndAt: string | null` を追加

### STEP 2: バックエンド Repository の更新
- [x] `backend/src/repositories/experimentInstructionDetailRepository.ts`
  - `findByProject(organizationId, projectId)` メソッドを追加（全 task の全 field の定性評価情報を一括取得）

### STEP 3: SQL ファイル新規作成
- [x] `backend/src/sql/queries/experiment_instruction_details/findByProject.sql` を新規作成

### STEP 4: バックエンド Service の更新
- [x] `backend/src/services/experimentInstructionService.ts`
  - `getExperimentInstructions` の並行取得に `instructionDetails`（`findByProject`）を追加
  - `instructionDetailMap`（`methodId__taskNo__templateName__propKey` → 定性評価情報）を構築
  - 定性評価の `uncertaintyKey` も `criteriaNameMap` 解決対象に追加
  - `InstructionField` に `qualitativeCriteriaName / qualitativeAssignedValue` をマッピング
  - `InstructionTask` に `experimentUserId / experimentEndAt` をマッピング

### STEP 5: フロントエンド型定義の更新
- [x] `frontend/src/types/experimentInstruction.ts`
  - `InstructionFieldResponse` に `qualitativeCriteriaName / qualitativeAssignedValue` を追加
  - `InstructionTaskResponse` に `experimentUserId / experimentEndAt` を追加

### STEP 6: フロントエンド ExperimentInstructionTab の更新
- [x] `frontend/src/components/project/ExperimentInstructionTab.tsx`
  - `FlatRow` 型に `qualitativeCriteriaName / qualitativeAssignedValue / experimentUserId / experimentEndAt` を追加
  - `TOGGLEABLE_COLUMN_KEYS_AND_WIDTHS` の `uncertaintyJudge` 1列を7列に置換
  - `flattenInstructions()` 関数を更新（新フィールドをマッピング）
  - 7列それぞれの `render` 実装（定量複数件 → ダイアログ）

### STEP 7: i18n キーの追加
- [x] `frontend/src/locales/ja.json` に7列分の新規列ラベルキーを追加
- [x] `frontend/src/locales/en.json` に7列分の新規列ラベルキーを追加

### STEP 8: ビルド確認
- [x] バックエンド `npx tsc --noEmit` → エラーなし
- [x] フロントエンド `npx tsc --noEmit` → 今回変更箇所に関連するエラーなし

---

## 変更ファイル一覧

| No | ファイル | 変更内容 | 状態 |
|----|----------|----------|------|
| 1 | `backend/src/types/api.ts` | `InstructionField` / `InstructionTask` に型フィールド追加 | ✅完了 |
| 2 | `backend/src/repositories/experimentInstructionDetailRepository.ts` | `findByProject` メソッド追加 | ✅完了 |
| 3 | `backend/src/sql/queries/experiment_instruction_details/findByProject.sql` | 新規作成 | ✅完了 |
| 4 | `backend/src/services/experimentInstructionService.ts` | 定性評価情報・実験記録者情報をマッピング | ✅完了 |
| 5 | `frontend/src/types/experimentInstruction.ts` | 対応する型フィールド追加 | ✅完了 |
| 6 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | 列定義・FlatRow・render 実装を修正 | ✅完了 |
| 7 | `frontend/src/locales/ja.json` | 新規 i18n キー7件追加 | ✅完了 |
| 8 | `frontend/src/locales/en.json` | 新規 i18n キー7件追加 | ✅完了 |

---

## 影響範囲

- 実験指示タブのテーブル表示のみ
- バックエンド API レスポンス構造の変更あり（`InstructionField` / `InstructionTask` のフィールド追加のみ、既存フィールドの削除なし）
- 既存の承認・NG 機能・フィルタ・列選択機能への影響なし

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `experiment_instruction_detail` の一括取得で N+1 クエリが発生 | 中 | 中 | プロジェクト単位で一括取得する `findByProject` を実装し、Map でキーアクセス → **対応済み** |
| 定性評価データが存在しない field では null を許容する必要がある | 低 | 高 | Optional フィールドとして定義し、null/undefined 時は `—` 表示 → **対応済み** |
| `TOGGLEABLE_COLUMN_KEYS_AND_WIDTHS` の変更で列選択の default 表示が崩れる | 低 | 低 | `ALL_COLUMN_KEYS` は `TOGGLEABLE_COLUMN_KEYS_AND_WIDTHS` から自動生成されるため影響なし → **問題なし** |

---

## テスト計画

### 手動テスト
- [ ] 定性評価データあり → 基準名・付与値がインライン表示されること
- [ ] 定性評価データなし → `—` が表示されること
- [ ] 定量評価が0件 → `—` が表示されること
- [ ] 定量評価が1件 → 基準名・許容値・付与値・判定結果がインライン表示されること
- [ ] 定量評価が複数件 → 基準名列に「不確かさ詳細（N件）」ボタンが表示され、クリックでダイアログが開くこと
- [ ] 実験記録者・実験終了日時が表示されること
- [ ] 列選択でオン/オフができること

---

## 承認記録
- **計画書提示日時**: 2026-08-27 10:00
- **承認日時**: 2026-08-27 10:00（Act モードで即時承認・実装）
- **承認者コメント**: 計画書を確認して実装に進むよう指示

---

## 実施記録

### 実施日時
開始: 2026-08-27 10:00
完了: 2026-08-27 10:30

### 計画からの変更点
- STEP 2〜4 の順序を「Repository → SQL → Service」の順に入れ替えて実装（依存関係の整理）
- `backend/src/sql/queries/experiment_instruction_details/findByProject.sql` の新規作成を STEP 3 として明示追加

### 発生した問題と解決方法
- 特になし

### ビルド結果
- バックエンド: `npx tsc --noEmit` → **エラーなし（exit: 0）**
- フロントエンド: `npx tsc --noEmit` → 今回変更箇所に関連するエラーなし（既存エラー4件は本タスクと無関係）

### 最終的な成果物
- [x] バックエンド型定義更新（`InstructionField` / `InstructionTask`）
- [x] Repository `findByProject` 追加
- [x] SQL `findByProject.sql` 新規作成
- [x] Service 定性評価・実験記録者マッピング実装
- [x] フロントエンド型定義更新
- [x] テーブル列 1列 → 7列に置換（`FlatRow` / `TOGGLEABLE_COLUMN_KEYS_AND_WIDTHS` / `flattenInstructions` / render）
- [x] i18n キー追加（ja.json / en.json）


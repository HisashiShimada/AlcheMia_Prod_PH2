# リリースノート

**リリース日**: 2026-06-09
**対象ブランチ**: main
**前回リリースコミット**: `78ced1fc`
**今回リリースコミット**: `7ddb59f6`

---

## 新機能・改善

### 1. XMLエディタでの編集内容の反映（Issue #39）

- `TemplateEditorDialog.tsx` を修正し、XMLエディタで編集した内容が正しく保存・反映されるよう対応
- `templateToXML.ts` のXML変換ロジックを改善し、エディタの編集結果が正確にXML構造へ変換されるよう修正

---

## バグ修正

### 1. MAIMLファイル判定ミスによるXMLテンプレートへの誤バリデーション修正

- MAIMLファイルの判定処理の不具合により、XMLテンプレートファイルに対してMAIMLバリデーションが誤って実行されていた問題を修正
- `maimlAnalyzer.ts` を削除し、ファイル種別の判定ロジックを整理

### 2. タスク指示のトランジションID必須要件の修正

- タスク指示においてトランジションIDが必須となっていた不具合を修正
- トランジションIDはオプションとして扱うよう変更

### 3. メッセージ不足の修正

- フロントエンドの翻訳ファイル（`ja.json` / `en.json`）に不足していたi18nキーを追加

---

## リファクタリング・内部改善

### 1. `instruction_target` カラム削除対応

- DBの `instruction_target` カラム廃止に伴い、バックエンド・フロントエンド全体にわたって参照箇所を削除・修正
- **バックエンド変更ファイル**:
  - `backend/src/types/instruction.ts`（instruction_target 型定義を削除）
  - `backend/src/types/database.ts`（DB型定義から削除）
  - `backend/src/types/taskService.types.ts`
  - `backend/src/repositories/instructionRepository.ts`（SQLクエリから instruction_target を除去）
  - `backend/src/services/projectInstructionService.ts`
  - `backend/src/services/fileAccessService.ts`
  - `backend/src/sql/queries/instructions/batchInsert.sql`
  - `backend/src/sql/queries/instructions/findById.sql`
  - `backend/src/sql/queries/instructions/findByProject.sql`
  - `backend/src/sql/queries/instructions/findWorkerInstructions.sql`
- **フロントエンド変更ファイル**:
  - `frontend/src/types/project.ts`
  - `frontend/src/types/experimentWorker.ts`
  - `frontend/src/types/progress.ts`
  - `frontend/src/components/project/InstructionEditDialog.tsx`
  - `frontend/src/components/project/ProjectManagement.tsx`
  - `frontend/src/components/project/TaskResultsTable.tsx`
  - `frontend/src/components/ExperimentWorker/` 配下の各コンポーネント
  - `frontend/src/hooks/useInstructions.ts`
  - `frontend/src/services/projectApiService.ts`
  - `frontend/src/services/issueApiService.ts`
  - `frontend/src/constants/codeMaster.ts`

### 2. `code_master` の DB および enum 統一対応（AISOLMAIML-244）

- `code_master` テーブルの定義とアプリケーション内 enum の不整合を解消
- `backend/src/enums/codeMaster.enum.ts` を修正し、DBデータとの整合性を確保
- `backend/src/sql/queries/codeMaster/insertInitialData.sql` を更新
- `frontend/src/constants/codeMaster.ts` を対応する enum 定義に統一

---

## DBマイグレーション

なし（今回リリースに新規マイグレーションファイルはありません）

---

## インフラ・ドキュメント変更

| 変更内容 | 詳細 |
|---------|------|
| システム構成図の名称変更 | インフラ構成図ファイルの名称を更新 |
| デプロイ手順書の更新 | `docs/deploy-guide/saas-staging/staging-deploy-checklist.md` を修正 |
| スクリプト整理 | 未使用スクリプトの退避・削除、オンプレ版スクリプトの移動 |

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/enums/codeMaster.enum.ts` | code_master enum をDB定義と統一 |
| `backend/src/repositories/instructionRepository.ts` | instruction_target カラム削除対応 |
| `backend/src/services/projectInstructionService.ts` | instruction_target 削除対応 |
| `backend/src/services/fileAccessService.ts` | instruction_target 削除対応 |
| `backend/src/sql/queries/codeMaster/insertInitialData.sql` | 初期データ更新 |
| `backend/src/sql/queries/instructions/*.sql` | instruction_target 削除対応 |
| `backend/src/types/instruction.ts` | instruction_target 型定義削除 |
| `backend/src/types/database.ts` | DB型定義から instruction_target 削除 |
| `backend/src/utils/maimlAnalyzer.ts`（削除） | 不要ファイル削除 |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | XMLエディタ編集内容の反映修正（Issue #39） |
| `frontend/src/utils/templateToXML.ts` | XML変換ロジック改善 |
| `frontend/src/constants/codeMaster.ts` | code_master enum 統一 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | instruction_target 削除対応 |
| `frontend/src/components/ExperimentWorker/` 各ファイル | instruction_target 削除対応 |
| `frontend/src/locales/ja.json` | 不足i18nキーを追加 |
| `frontend/src/locales/en.json` | 不足i18nキーを追加 |
| `frontend/src/hooks/useInstructions.ts` | instruction_target 削除対応 |
| `frontend/src/types/project.ts` | instruction_target 型定義削除 |

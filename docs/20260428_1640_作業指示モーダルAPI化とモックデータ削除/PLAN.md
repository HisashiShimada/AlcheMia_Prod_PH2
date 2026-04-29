# タスク計画書: 作業指示モーダルAPI化とモックデータ削除

## メタデータ
- **作成日時**: 2026-04-28 16:40
- **タスクID**: 20260428_1640_作業指示モーダルAPI化とモックデータ削除
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験データ記録ダイアログ内の「作業指示」ボタン押下後に表示される作業指示ダイアログが、
`frontend/src/data/projectsData.ts` のモックデータを参照しているため、
メソッド/トランジションに紐づく指示が正しく表示されない問題を修正する。

また、`frontend/src/data/` フォルダ全体を削除し、モックデータを参照している全ファイルを修正する。

## 目的と期待される成果

- [ ] `InstructionConfirmationModal` がAPIから作業指示を取得して表示する
- [ ] `frontend/src/data/` フォルダが完全に削除される
- [ ] モックデータを参照していた5ファイルがprops/API経由に変更される

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] 関連ファイルの調査
- [x] 修正方針の策定
- [x] タスク計画書の作成

### Phase 2: メイン修正（InstructionConfirmationModal）
- [ ] `InstructionConfirmationModal.tsx` の修正
  - `projectsData` importを削除
  - `getWorkerInstructions` / `convertApiToInstruction` をimport
  - `open` が `true` になったタイミングでAPIから指示データ取得
  - `WorkerInstruction[]` → `Instruction[]` 変換
  - `targetType`, `transitionId`, `methodId` でフィルタリング

### Phase 3: モックデータ参照ファイルの修正
- [ ] `ProjectSelector.tsx` の修正
  - `projectsData` 参照を削除
  - Props に `projectName?: string`, `fileName?: string`, `methodCount?: number` を追加
  - 呼び出し元は既存コードで `selectedProjectName` を持っているためprops渡しで対応
- [ ] `MethodSelectionModal.tsx` の修正
  - `projectsData` 参照を削除
  - Props に `methods: Method[]` を追加して呼び出し元から渡す
- [ ] `TaskSelectionDialog.tsx` の修正
  - `projectsData` 参照を削除
  - Props に `methods: Method[]` を追加して呼び出し元から渡す
- [ ] `UnifiedSelectionDialog.tsx` の修正
  - `projectsData` 参照を削除
  - Props に `projects: ProjectSummary[]`, `methods: Method[]` を追加

### Phase 4: モックデータ削除
- [ ] `frontend/src/data/projectsData.ts` を削除
- [ ] `frontend/src/data/` フォルダを削除（空になったら）

## 変更ファイル一覧

### 修正
1. `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx` - APIデータ取得に変更
2. `frontend/src/components/ExperimentWorker/ProjectSelector.tsx` - propsからデータ受け取りに変更
3. `frontend/src/components/ExperimentWorker/MethodSelectionModal.tsx` - propsからメソッド受け取りに変更
4. `frontend/src/components/ExperimentWorker/TaskSelectionDialog.tsx` - propsからタスク受け取りに変更
5. `frontend/src/components/ExperimentWorker/UnifiedSelectionDialog.tsx` - propsからデータ受け取りに変更

### 削除
6. `frontend/src/data/projectsData.ts`
7. `frontend/src/data/` フォルダ

## 影響範囲

### `InstructionConfirmationModal` の呼び出し元
- `TransitionList.tsx` - `projectId`, `methodId` 既に渡している ✅
- `DataRecordDialog.tsx` - `projectId`, `methodId` 既に渡している ✅

### `ProjectSelector` の呼び出し元
- 実際には `ExperimentRecordTab` が `ProjectSelector` を使用しているか確認が必要
  - 現在の調査では `ExperimentRecordTab` に `MethodTaskSelector` が使われている

### `MethodSelectionModal` / `TaskSelectionDialog` / `UnifiedSelectionDialog` の呼び出し元
- これらのコンポーネントが実際に呼び出されている箇所を調査してpropsを追加

## テスト計画
- [ ] 作業指示ダイアログを開いてトランジション指示が表示されることを確認
- [ ] プロジェクト指示（file）・メソッド指示（method）・トランジション指示（transition）が正しく分類されることを確認
- [ ] モックデータ参照のビルドエラーがないことを確認

## 承認記録
- **計画書提示日時**: 2026-04-28 16:40
- **承認日時**: 2026-04-28 16:40

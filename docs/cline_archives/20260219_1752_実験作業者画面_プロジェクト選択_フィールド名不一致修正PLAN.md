# タスク計画書: 実験作業者画面_プロジェクト選択_フィールド名不一致修正

## メタデータ
- **作成日時**: 2026-02-19 17:52
- **タスクID**: 実験作業者画面_プロジェクト選択_フィールド名不一致修正
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

実験作業者メイン画面のプロジェクト選択コンボボックスにプロジェクト一覧が表示されない不具合を修正します。

**根本原因**: 
- APIレスポンスは**キャメルケース**（`projectId`, `projectName`）
- フロントエンドの型定義は**スネークケース**（`project_id`, `project_name`）
- 命名規則の不一致により、マッピング時に `undefined` となり表示されない

## 2. 目的と期待される成果

### 目的
APIレスポンスとフロントエンドコードの命名規則を統一し、プロジェクト選択機能を正常に動作させる

### 期待される成果
- [x] 調査完了: APIレスポンスとフロントエンドコードの不一致を特定
- [ ] プロジェクト選択コンボボックスに正しくプロジェクト一覧が表示される
- [ ] プロジェクト選択モーダルが正常に動作する
- [ ] 承認依頼機能が正常に動作する
- [ ] TypeScriptの型エラーがない
- [ ] UI設計書のAPIレスポンス例が実際のレスポンスと一致する

## 3. 実装ステップ

### Phase 1: 型定義の修正
- [ ] `frontend/src/api/projectApiService.ts` の `WorkerProject` 型定義をキャメルケースに変更
  - `project_id` → `projectId`
  - `project_name` → `projectName`
  - `project_cd` → `projectCd`
  - `create_at` → `createdAt`
  - `update_at` → `updatedAt`
  - `projectStatus` フィールド追加（APIレスポンスに合わせる）
  - `description` フィールド追加（APIレスポンスに合わせる）

### Phase 2: ExperimentWorkerMenuの修正
- [ ] `frontend/src/components/menus/ExperimentWorkerMenu.tsx` のプロジェクトマッピング処理を修正
  - Select options のマッピング（`project.project_id` → `project.projectId`）
  - Select options のラベル生成（`project.project_name` → `project.projectName`）
  - ステータス判定を `projectStatus` に変更
- [ ] 承認依頼処理の修正
  - `projects.find(p => p.project_id === selectedProject)` → `projects.find(p => p.projectId === selectedProject)`
  - `selectedProjectData.project_name` → `selectedProjectData.projectName`

### Phase 3: ProjectSelectionModalの修正
- [ ] `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx` の `ProjectTableData` 型定義をキャメルケースに変更
- [ ] テーブルデータ作成処理の修正
  - `project.project_id` → `project.projectId`
  - `project.project_name` → `project.projectName`
  - `project.project_cd` → `project.projectCd`

### Phase 4: UI設計書の修正
- [ ] `docs/design/ui/ui_experiment_worker_main.md` のセクション15.1を修正
  - APIレスポンス例をキャメルケースに更新
  - 実際のAPIレスポンスフィールドに合わせる（`projectStatus`, `description`, `createdAt`, `updatedAt`）

### Phase 5: テストと動作確認
- [ ] TypeScriptコンパイルエラーの確認
- [ ] プロジェクト一覧の表示確認
- [ ] プロジェクト選択コンボボックスの動作確認
- [ ] プロジェクト選択モーダルの動作確認
- [ ] 承認依頼ボタンの動作確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/api/projectApiService.ts` - WorkerProject型定義の修正
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - プロジェクトマッピング処理の修正
3. `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx` - テーブルデータマッピングの修正
4. `docs/design/ui/ui_experiment_worker_main.md` - APIレスポンス例の更新

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 実験作業者メニュー: プロジェクト選択機能
- 実験作業者メニュー: プロジェクト選択モーダル
- 実験作業者メニュー: 承認依頼機能

## 5. 技術的詳細

### 使用する技術・ライブラリ
- TypeScript: 型定義の修正
- React: コンポーネントの修正
- Ant Design: UIコンポーネント（変更なし）

### 型定義の変更内容

**修正前（スネークケース）:**
```typescript
export interface WorkerProject {
  project_id: string;
  project_name: string;
  project_cd: string;
  status: 1 | 2 | 3;
  create_at: string;
  update_at: string;
}
```

**修正後（キャメルケース）:**
```typescript
export interface WorkerProject {
  projectId: string;         // API: projectId
  projectName: string;       // API: projectName
  projectCd: string;         // API: projectCd (存在しない場合は削除検討)
  projectStatus: string;     // API: projectStatus ("in_progress", "review_waiting", 等)
  description: string;       // API: description
  createdAt: string;         // API: createdAt
  updatedAt: string;         // API: updatedAt
}
```

### APIレスポンス例（実際のレスポンス）

```json
{
  "success": true,
  "data": [
    {
      "projectId": "435b0667-af37-49e9-bc21-58f748587e49",
      "projectName": "GrapheneComposite",
      "description": "グラフェン複合材料の合成と物性評価",
      "projectStatus": "in_progress",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "totalItems": 4,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### セキュリティ考慮事項
- [ ] マルチテナント分離: 変更なし（APIレスポンスの構造変更のみ）
- [ ] 認証・認可: 変更なし

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| WorkerProject型を使用している他コンポーネントへの影響 | 中 | 低 | 全ファイル検索で影響箇所を特定済み（3ファイルのみ） |
| projectStatusとstatusの使い分け | 低 | 中 | projectStatusをメインに使用、statusは削除または変換用に使用 |
| projectCdフィールドがAPIレスポンスに存在しない | 中 | 高 | 実際のAPIレスポンスを確認し、存在しない場合は削除または空文字列対応 |
| 既存データとの互換性 | 低 | 低 | APIレスポンスのみを参照するため影響なし |

## 7. テスト計画

### ユニットテスト
- [ ] WorkerProject型のフィールドアクセステスト（TypeScriptコンパイル確認）

### 統合テスト
なし（型定義とマッピング処理の修正のみ）

### 手動テスト
- [ ] 実験作業者メニューにログイン
- [ ] プロジェクト選択コンボボックスをクリック
- [ ] プロジェクト一覧が表示されることを確認
  - 期待値: `GrapheneComposite - 作業中`
  - 期待値: `HighTempSuperconductor - 承認待ち`
  - 期待値: `PerovskiteSolarCell - 作業中`
  - 期待値: `QuantumDotLED - 作業中`
- [ ] プロジェクトを選択し、「選択」ボタンをクリック
- [ ] プロジェクト選択モーダルが開くことを確認
- [ ] モーダル内のテーブルにプロジェクト一覧が表示されることを確認
- [ ] プロジェクトを選択し、「決定」ボタンをクリック
- [ ] 選択したプロジェクトがコンボボックスに反映されることを確認
- [ ] 進捗確認タブで「承認依頼」ボタンをクリック
- [ ] 承認依頼が正常に送信されることを確認

## 8. ロールバック計画

型定義とマッピング処理の修正のみのため、コード変更をrevertすることで即座にロールバック可能。

**ロールバック手順:**
1. Git revert でコミットを取り消し
2. 必要に応じてTypeScriptを再コンパイル
3. 動作確認

## 9. 関連ドキュメント

- [UI設計書: 実験作業者メイン画面](../design/ui/ui_experiment_worker_main.md)
- [TypeScript型定義規約](.clinerules/development/typescript.md)
- [コーディング規約](.clinerules/development/config.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-19 17:52
- **承認日時**: 2026-02-19 17:52
- **承認者コメント**: タスク計画書承認済み、実装開始

## 11. 実施記録

### 実施日時
開始: 2026-02-19 17:52
完了: 2026-02-19 17:57

### 計画からの変更点
なし。すべて計画通りに実施しました。

### 発生した問題と解決方法

#### 問題1: ProjectSelectionModal.tsxのTypeScriptエラー
**症状**: テーブルデータ作成時に型エラーが発生
- `project.project_id` が存在しない
- `project.project_name` が存在しない
- `projectCd` が `undefined` の可能性がある

**原因**: WorkerProject型の変更後、ProjectSelectionModal.tsxのマッピング処理が古いフィールド名を参照していた

**解決方法**:
1. テーブルデータ作成処理のフィールド名を修正（`project_id` → `projectId` 等）
2. フィルター処理で `projectCd` の `undefined` チェックを追加
3. ステータス表示を `projectStatus` に変更し、文字列比較に修正

### 最終的な成果物
- [x] WorkerProject型定義の修正完了
- [x] ExperimentWorkerMenu.tsxの修正完了
- [x] ProjectSelectionModal.tsxの修正完了
- [x] UI設計書の修正完了
- [ ] 動作確認完了（ユーザーによる実機確認が必要）

### 修正内容のサマリー

#### 1. frontend/src/api/projectApiService.ts
- `WorkerProject` インターフェースをキャメルケースに変更
- フィールド追加: `projectStatus`, `description`
- フィールド削除: `status`（`projectStatus` に統一）

#### 2. frontend/src/components/menus/ExperimentWorkerMenu.tsx
- プロジェクト選択コンボボックスのマッピング: `project.projectId`, `project.projectName`, `project.projectStatus`
- 承認依頼処理: `selectedProjectData.projectId`, `selectedProjectData.projectName`
- ステータス判定: `projectStatus === 'in_progress'` 等

#### 3. frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx
- `ProjectTableData` 型定義を更新
- テーブルデータ作成: すべてのフィールドをキャメルケースに変更
- フィルター処理: `projectCd` の `undefined` チェック追加
- ステータス表示カラム: `dataIndex` を `projectStatus` に変更、文字列判定に修正

#### 4. docs/design/ui/ui_experiment_worker_main.md
- セクション15.1のAPIレスポンス例を実際のレスポンスに合わせて更新
- エンドポイントを `/api/v1/projects/worker-accessible` に修正
- レスポンス例を追加（実際のAPIレスポンス）

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）

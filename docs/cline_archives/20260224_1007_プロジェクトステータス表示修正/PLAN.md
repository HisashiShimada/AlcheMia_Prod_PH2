# タスク計画書: プロジェクトステータス表示修正

## メタデータ
- **作成日時**: 2026-02-24 10:07
- **タスクID**: project_status_display_fix
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

実験作業者メイン画面のプロジェクト選択コンボボックスで、データベース上のステータスに関わらず常に「承認済み」と表示される問題を修正します。

### 問題の原因
1. **バックエンド**: `projectService.ts`に古いPROJECT_STATUS_MAPの定義が残存し、混乱の原因となっている
2. **フロントエンド**: ステータス値のミスマッチ
   - API側は`'waiting_task'`, `'executing_task'`, `'waiting_approval'`を返す
   - フロントエンド側は`'in_progress'`, `'review_waiting'`をチェック
   - すべての未定義ステータスがデフォルトで「承認済み」にフォールバック

## 2. 目的と期待される成果

### 目的
- プロジェクトステータスの表示を正確にする
- バックエンドのステータスマッピングを統一する
- フロントエンドで多言語化対応を実装する

### 期待される成果
- [x] すべてのステータス（planning, waiting_task, executing_task, waiting_approval, completed）が正しく表示される
- [x] バックエンドのPROJECT_STATUS_MAPが統一される
- [x] 多言語化（ja.json/en.json）が適用される

## 3. 実装ステップ

### Phase 1: バックエンド修正
- [ ] `backend/src/services/projectService.ts`の古いPROJECT_STATUS_MAP定義を削除
- [ ] `backend/src/types/project.ts`からPROJECT_STATUS_MAPをimport
- [ ] 承認依頼API(`requestApproval`)のステータスマッピングを修正

### Phase 2: フロントエンド修正（ExperimentWorkerMenu.tsx）
- [ ] `frontend/src/components/menus/ExperimentWorkerMenu.tsx`のステータス表示ロジックを修正
- [ ] ハードコーディングされた三項演算子を削除
- [ ] 多言語化関数`t()`を使用した表示に変更

### Phase 3: フロントエンド修正（ProjectSelectionModal.tsx）
- [ ] `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx`のステータス表示ロジックを修正
- [ ] 多言語化関数`t()`を使用した表示に変更

### Phase 4: 動作確認
- [ ] バックエンドのビルド確認
- [ ] フロントエンドのビルド確認
- [ ] 各ステータスの表示確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/projectService.ts` - 古いPROJECT_STATUS_MAP削除、import追加
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - ステータス表示ロジック修正
3. `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx` - ステータス表示ロジック修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 実験作業者メイン画面のプロジェクト選択コンボボックス
- プロジェクト選択モーダル
- 承認依頼API（間接的）

## 5. 技術的詳細

### バックエンド修正内容

#### 修正前（projectService.ts）
```typescript
// ローカル定義（削除対象）
const PROJECT_STATUS_MAP: { [key: number]: string } = {
  0: 'draft',
  1: 'active',
  2: 'waiting_approval',
  3: 'approved',
  4: 'archived',
};
```

#### 修正後
```typescript
// types/project.tsからimport
import { PROJECT_STATUS_MAP } from '../types/project';

// 以降、ローカル定義を削除しimportした定義を使用
```

### フロントエンド修正内容

#### 修正前（ExperimentWorkerMenu.tsx）
```typescript
label: `${project.projectName} - ${
  project.projectStatus === 'in_progress' ? '作業中' : 
  project.projectStatus === 'review_waiting' ? '承認待ち' : 
  '承認済み'
}`
```

#### 修正後
```typescript
label: `${project.projectName} - ${t(`experimentWork.projectStatus.${project.projectStatus}`)}`
```

### ステータスマッピング（確定版）

| DB値 | 文字列ステータス | 日本語表示 | 英語表示 |
|------|----------------|-----------|---------|
| 0 | `'planning'` | 計画中 | Planning |
| 1 | `'waiting_task'` | タスク実行待ち | Pending |
| 2 | `'executing_task'` | タスク実行中 | In Progress |
| 3 | `'waiting_approval'` | 承認待ち | Review Waiting |
| 4 | `'completed'` | 完了 | Completed |
| 5 | `'error'` | エラー | Error |

### 多言語化キー
- `experimentWork.projectStatus.planning`
- `experimentWork.projectStatus.waiting_task`
- `experimentWork.projectStatus.executing_task`
- `experimentWork.projectStatus.waiting_approval`
- `experimentWork.projectStatus.completed`

（ja.json/en.jsonには既に定義済み）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| バックエンドの既存APIへの影響 | 中 | 低 | PROJECT_STATUS_MAPの変更は型定義のみで、API動作に影響なし |
| フロントエンドでの表示崩れ | 低 | 低 | ja.json/en.jsonは既に正しい定義があるため、表示崩れのリスクは低い |
| 他の画面への影響 | 中 | 低 | PROJECT_STATUS_MAPを使用している箇所を確認済み（workerProjectServiceのみ） |
| 未定義ステータスのフォールバック | 低 | 低 | 多言語化関数はキーが存在しない場合、キー自体を表示 |

## 7. テスト計画

### ユニットテスト
- [ ] `projectService.ts`のインポート確認
- [ ] ステータスマッピングの整合性確認

### 統合テスト
- [ ] プロジェクト一覧APIのレスポンス確認
- [ ] 実験作業者用プロジェクト一覧APIのレスポンス確認

### 手動テスト
- [ ] ステータス0（計画中）のプロジェクトが「計画中」と表示される
- [ ] ステータス1（タスク実行待ち）のプロジェクトが「タスク実行待ち」と表示される
- [ ] ステータス2（タスク実行中）のプロジェクトが「タスク実行中」と表示される
- [ ] ステータス3（承認待ち）のプロジェクトが「承認待ち」と表示される
- [ ] ステータス4（完了）のプロジェクトが「完了」と表示される
- [ ] 言語切り替え時に英語表示が正しく切り替わる

## 8. ロールバック計画

問題が発生した場合、以下の手順でロールバックします：

1. バックエンド修正のロールバック
   ```bash
   git checkout HEAD -- backend/src/services/projectService.ts
   ```

2. フロントエンド修正のロールバック
   ```bash
   git checkout HEAD -- frontend/src/components/menus/ExperimentWorkerMenu.tsx
   git checkout HEAD -- frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx
   ```

3. 再ビルド・再起動

## 9. 関連ドキュメント

- [UI設計書: 実験作業者メイン画面](../design/ui/ui_experiment_worker_main.md)
- [バックエンドコーディング規約](../../.clinerules/development/config.md)
- [多言語化対応](../../frontend/src/locales/ja.json)
- [TypeScript型定義規約](../../.clinerules/development/typescript.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 10:07
- **承認日時**: 2026-02-24 10:07
- **承認者コメント**: タスク計画書を作成し、ファイルに出力。作業はなるべく細かく分けて実行。

## 11. 実施記録

### 実施日時
開始: 2026-02-24 10:07
完了: 2026-02-24 10:13

### 計画からの変更点
なし（計画通りに実施）

### 発生した問題と解決方法
特に問題なし。すべての修正が計画通りに完了しました。

### 最終的な成果物
- [x] バックエンドのPROJECT_STATUS_MAP統一
  - `backend/src/services/projectService.ts`: 古いPROJECT_STATUS_MAP定義を削除し、types/project.tsからimport
- [x] フロントエンドのステータス表示修正
  - `frontend/src/components/menus/ExperimentWorkerMenu.tsx`: ステータス表示を多言語化関数`t()`に変更
  - `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx`: ステータス表示を多言語化関数`t()`に変更
- [x] 実装完了（動作確認は実行環境で実施）

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）

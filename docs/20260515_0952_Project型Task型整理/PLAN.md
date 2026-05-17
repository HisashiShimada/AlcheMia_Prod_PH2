# タスク計画書: Project型・Task型の未使用プロパティ整理

## メタデータ
- **作成日時**: 2026-05-15 09:52
- **タスクID**: Project型Task型整理
- **優先度**: 中
- **推定工数**: 3〜4時間

---

## 1. タスク概要

`frontend/src/types/project.ts` および `backend/src/types/project.ts` に定義されている `Project` 型・`Task` 型の中で、実際に使用されていないプロパティを特定し削除する。

初期設計段階で将来実装を見越して定義したが、バックエンドと実画面をつなげるフェーズで実際には使われなかったプロパティが多数存在しており、型定義の可読性・保守性が低下している状態を改善する。

---

## 2. 目的と期待される成果

### 目的
- 型定義ファイルのスリム化
- 未使用プロパティに起因した誤認・混乱の排除
- バックエンドの Project オブジェクト生成箇所（projectService.ts 等）の不要なプロパティ埋め込みを削除

### 期待される成果
- [x] `Project` 型から使用されていないプロパティが削除されている
- [x] `Task` 型からエイリアスプロパティの整理が完了している
- [x] バックエンド・フロントエンド共にビルドエラーなし（型整合性が保たれている）
- [ ] 既存の動作に影響がないことを確認済み（手動確認は未実施）

---

## 3. 調査結果

### 3-1. Project 型プロパティ使用状況

| プロパティ | Backend | Frontend | 判定 |
|-----------|---------|----------|------|
| `id` | ✅ | ✅ | **保持** |
| `name` | ✅ | ✅ | **保持** |
| `description` | ✅ | ✅ | **保持** |
| `status` | ✅ | ✅ | **保持** |
| `statusName` | ✅ | ✅ | **保持** |
| `owner` | ✅ | ✅ | **保持** |
| `ownerName` | ✅ | ✅ | **保持** |
| `ownerEmail` | ✅ | ✅ | **保持** |
| `department` | ✅ | ✅ | **保持** |
| `departmentName` | ✅ | ✅ | **保持** |
| `isCheckedOut` | ✅ | ✅ | **保持** |
| `checkedOutBy` | ✅ | ✅ | **保持** |
| `checkedOutAt` | ✅ | ✅ | **保持** |
| `createdAt` | ✅ | ✅ | **保持** |
| `updatedAt` | ✅ | ✅ | **保持** |
| `project_uuid` | ✅（MAIML処理） | ⚠️ | **保持（MAIML必須）** |
| `maimlFileKey` | ⚠️ | ⚠️ | **Phase1で最終確認** |
| `fileCount` | 生成時のみ | 1箇所のみ(ProjectFolderTree) | **Phase1で最終確認** |
| `folderName` | 生成時のみセット・参照なし | ❌ 未使用 | **🗑️ 削除候補** |
| `members` | 常に空配列 | ❌ 未使用 | **🗑️ 削除候補** |
| `tags` | 常に空配列 | ❌ 未使用 | **🗑️ 削除候補** |
| `totalSize` | 常に 0 | ❌ 未使用 | **🗑️ 削除候補** |
| `completedTasks` | 常に 0 | ❌ 未使用 | **🗑️ 削除候補** |
| `totalTasks` | 常に 0 | ❌ 未使用 | **🗑️ 削除候補** |
| `tasks` | ❌ 未使用 | ❌ 未使用 | **🗑️ 削除候補** |

### 3-2. Task 型プロパティ使用状況

**基本プロパティ（使用中・保持）:**

| プロパティ | 使用箇所 |
|-----------|---------|
| `taskId` | projectApiService.ts など |
| `workerId` | projectApiService.ts など |
| `workerName` | projectApiService.ts など |
| `transitionId` | projectApiService.ts など |
| `transitionName` | projectApiService.ts など |
| `workStatus` | projectApiService.ts など |
| `assignedAt` | projectApiService.ts など |
| `startedAt` | projectApiService.ts など |
| `completedAt` | projectApiService.ts など |
| `progress` | projectApiService.ts など |
| `errorMessage` | projectApiService.ts など |

**エイリアスプロパティ（使用状況確認済）:**

| プロパティ | 使用箇所 | 判定 |
|-----------|---------|------|
| `taskName` | MethodTaskSelector.tsx, UnifiedSelectionDialog.tsx, TaskSelectionDialog.tsx | **保持** |
| `workId` | ❌ 直接参照なし | **🗑️ 削除候補** |
| `methodName` | ❌ 直接参照なし | **🗑️ 削除候補** |
| `assignedWorker` | ❌ 直接参照なし | **🗑️ 削除候補** |
| `progressPercentage` | ❌ 直接参照なし | **🗑️ 削除候補** |
| `workCompletedAt` | ❌ 直接参照なし | **🗑️ 削除候補** |
| `reviewCompletedAt` | ❌ 直接参照なし | **🗑️ 削除候補** |

> ⚠️ `taskName` は ExperimentWorker系コンポーネントで使用されているが、これは `types/project.ts` の Task 型ではなく `types/experimentWorker.ts` の Task 型の可能性がある。Phase1で再確認する。

---

## 4. 実装ステップ

### Phase 1: 削除候補の最終確認（調査）
- [x] `fileCount` の全使用箇所を確認 → ProjectManagement.tsx 等で使用中 → **保持**
- [x] `maimlFileKey` の全使用箇所を確認 → MAIML登録確認ロジックで使用中 → **保持**
- [x] `taskName` が `types/project.ts` の Task 型を参照しているか確認 → TaskResultsTable.tsx で `types/project.ts` の Task 型を使用 → **保持**
- [x] Task型エイリアス（`workId`, `methodName`, `assignedWorker`, `progressPercentage`, `workCompletedAt`, `reviewCompletedAt`）の全使用箇所を確認 → TaskResultsTable.tsx で `workId`, `methodName`, `workCompletedAt`, `reviewCompletedAt` を使用中
- [x] 削除安全リスト確定：`members`, `tags`, `totalSize`, `assignedWorker`, `progressPercentage` を削除

### Phase 2: バックエンド型定義の整理
- [x] `backend/src/types/project.ts` を編集
  - Project 型から `members`, `tags`, `totalSize` を削除
  - Task 型はバックエンドには存在しないため変更なし

### Phase 3: フロントエンド型定義の整理
- [x] `frontend/src/types/project.ts` を編集
  - Project 型から `members`, `tags`, `totalSize` を削除
  - Task 型から `assignedWorker`, `progressPercentage` を削除

### Phase 4: 影響範囲の修正
- [x] `backend/src/services/projectService.ts` の修正
  - create メソッド・list メソッドのマッピングから `members`, `tags`, `totalSize`, `completedTasks`, `totalTasks` の代入を除去

### Phase 5: ビルドテストと動作確認
- [x] バックエンドのビルド確認 → エラー 0 件
- [x] フロントエンドのビルド確認 → エラー 0 件
- [ ] 手動動作確認
  - [ ] プロジェクト一覧表示
  - [ ] プロジェクト作成
  - [ ] ProjectFolderTree（fileCount 使用箇所）
  - [ ] ExperimentWorker 画面（Task 型関連）

---

## 5. 影響範囲

### 変更するファイル（確定）
1. `backend/src/types/project.ts` - Project型・Task型プロパティ削除
2. `frontend/src/types/project.ts` - Project型・Task型プロパティ削除
3. `backend/src/services/projectService.ts` - 生成オブジェクトから削除プロパティへの代入を除去

### 変更する可能性があるファイル（Phase1調査後に確定）
- `frontend/src/components/project/ProjectFolderTree.tsx` - fileCount を削除する場合
- その他 TypeScript コンパイルエラーが出た箇所

### 削除しないファイル
- なし

---

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `fileCount` を削除した場合に ProjectFolderTree の表示が崩れる | 中 | 高 | Phase1で使用箇所を全確認し、削除する場合は表示ロジックも修正 |
| `maimlFileKey` が実際に使われていてMAIML機能が壊れる | 高 | 低 | Phase1で全使用箇所を検索し、削除前に使用確認 |
| `taskName` が types/project.ts の Task を参照していた場合にExperimentWorkerが壊れる | 高 | 低 | Phase1で参照元の型定義ファイルを確認 |
| バックエンドのオブジェクト生成箇所に修正漏れが生じる | 中 | 中 | tsc --noEmit で型チェックを実施 |

---

## 7. 承認記録

- **計画書提示日時**: 2026-05-15 09:52
- **承認日時**: （承認時に記入）
- **承認者コメント**: （コメントを記入）

---

## 8. 実施記録

### 実施日時
- 開始: 2026-05-15 09:52
- 完了: 2026-05-15 10:08

### 計画からの変更点
- 計画時に `folderName`, `completedTasks`, `totalTasks` を削除候補としていたが、実調査の結果 **保持に変更**
  - `folderName` → `ProjectManagement.tsx` の BulkUploadDialog で使用中
  - `completedTasks` / `totalTasks` → `ProgressMonitoring.tsx` で画面表示に使用中
- Task型の `workId`, `methodName`, `workCompletedAt`, `reviewCompletedAt` を削除候補としていたが、`TaskResultsTable.tsx` で使用中のため **保持に変更**

### 発生した問題と解決方法
- 一度削除後に tsc エラーが発生 → 使用確認不足が判明 → 型定義に再追加して対応
- `Project | Project` というエラーメッセージが出たが、これは 2 つの `Project` 型のユニオン（import 先が複数ある可能性）を示していた

### 最終的な成果物

#### 削除したプロパティ
| ファイル | 削除プロパティ |
|---------|-------------|
| `frontend/src/types/project.ts` (Project型) | `members`, `tags`, `totalSize` |
| `backend/src/types/project.ts` (Project型) | `members`, `tags`, `totalSize` |
| `frontend/src/types/project.ts` (Task型) | `assignedWorker`, `progressPercentage` |
| `backend/src/services/projectService.ts` | `members`, `tags`, `totalSize`, `completedTasks`, `totalTasks` の代入箇所 |

#### ビルド結果
- `backend`: tsc エラー 0 件 ✅
- `frontend`: tsc エラー 0 件 ✅

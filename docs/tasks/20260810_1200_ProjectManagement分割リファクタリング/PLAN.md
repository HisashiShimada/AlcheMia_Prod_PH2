# タスク計画書: ProjectManagement.tsx 分割リファクタリング

## メタデータ
- **作成日時**: 2026-08-10 12:00
- **タスクID**: 20260810_1200_ProjectManagement分割リファクタリング
- **優先度**: 中
- **推定工数**: 4〜6時間

---

## タスク概要

`frontend/src/components/project/ProjectManagement.tsx` は現在 **2,577行** に膨れ上がっており、可読性・保守性の観点から分割が必要。

各タブのJSXを専用コンポーネントへ切り出し、ロジック（ステート・ハンドラ・副作用）を Custom Hooks へ分離することで、ファイルごとの責務を明確化する。

---

## 目的と期待される成果

- [ ] `ProjectManagement.tsx` を 300行以下に削減する
- [ ] 各タブのコンテンツを独立したコンポーネントとして管理できる
- [ ] ロジック（state/handler/effect）を hooks に集約し再利用性を高める
- [ ] 既存の動作を一切変えずにリファクタリングを完了する

---

## 現在のファイル構造分析

### ファイルサイズ
- **合計**: 2,577行 / 約111KB

### 主要セクション
| 行範囲 | 内容 |
|--------|------|
| 1〜95 | imports |
| 97〜108 | `ProjectManagementInnerProps` 型定義 |
| 110〜310 | state 定義（useState ~20個、useRef ~3個） |
| 311〜400 | useMemo（フィルタ・ソート関連） |
| 401〜1200 | useCallback ハンドラ群（~30個） |
| 1185〜1827 | useEffect、残りのロジック |
| 1828〜2386 | JSX（ツールバー・一覧・詳細・タブ） |
| 2389〜2552 | モーダル/ダイアログ群 |
| 2554〜2577 | `ProjectManagement`（Provider wrap） |

### タブ一覧
| タブキー | 使用コンポーネント |
|----------|-------------------|
| `file_management` | `ProjectFolderTree`, `FileListTable` |
| `task_registration` | `TaskRegistrationTab`, `TaskResultsTable` |
| `project_instruction` | `InstructionRegistrationTab` |
| `experiment_instruction` | `ExperimentInstructionTab` |
| `evaluation_registration` | `EvaluationRegistrationTab` |

---

## 分割後のファイル構造

```
frontend/src/components/project/
├── ProjectManagement.tsx                        # エントリーポイント（Provider wrap のみ）~30行
├── ProjectManagementInner.tsx                   # 組み立てコンポーネント（JSX骨格）~300行
├── hooks/
│   ├── useProjectList.ts                        # プロジェクト一覧・フィルタ・ソート ~200行
│   ├── useProjectSelection.ts                   # プロジェクト選択・MAIML・タブ切り替え ~200行
│   ├── useProjectActions.ts                     # チェックイン/アウト・完了・削除等の操作 ~250行
│   ├── useProjectFiles.ts                       # ファイル管理関連（アップロード・削除・DL） ~200行
│   ├── useProjectMaimlEditor.ts                 # 編集・Draft復元・バリデーション ~200行
│   └── useProjectDialogs.ts                     # モーダル/ダイアログのopen/close状態 ~150行
├── components/
│   ├── ProjectToolbar.tsx                       # 検索・フィルタ・ソートUI ~200行
│   ├── ProjectListPanel.tsx                     # 左ペインのプロジェクト一覧 ~200行
│   ├── ProjectActionButtons.tsx                 # 詳細エリア上部のアクションボタン群 ~200行
│   ├── ProjectModals.tsx                        # 全モーダル/ダイアログのまとめ ~200行
│   └── tabs/
│       ├── FileManagementTabContent.tsx         # ファイル管理タブ本体 ~150行
│       ├── TaskRegistrationTabContent.tsx       # タスク登録タブ本体 ~100行
│       ├── ProjectInstructionTabContent.tsx     # 指示登録タブ本体 ~80行
│       ├── ExperimentInstructionTabContent.tsx  # 実験指示タブ本体 ~80行
│       └── EvaluationRegistrationTabContent.tsx # 評価登録タブ本体 ~80行

---

## 実装ステップ（チェックリスト）

### Phase 1: hooks の作成（ロジックの切り出し）

- [ ] **Step 1-1**: `hooks/useProjectDialogs.ts` 作成
  - モーダル/ダイアログの open/close state 一式を管理

- [ ] **Step 1-2**: `hooks/useProjectList.ts` 作成
  - `projects`, `visibleGroups`, `refetchProjects` 等を管理
  - フィルタ/ソート state と `filteredProjects`, `sortedProjects` の useMemo
  - `handleSortChange` handler

- [ ] **Step 1-3**: `hooks/useProjectSelection.ts` 作成
  - `selectedProjectId`, `selectedProject`, `currentTab` 等の管理
  - sessionStorage への保存 effect
  - `handleProjectSelect`, `handleRefresh`, `handleTabChange` handler

- [ ] **Step 1-4**: `hooks/useProjectFiles.ts` 作成
  - `projectFilesData`, `currentFolder`, `expandedFolders` 等の管理
  - アップロード・削除・ダウンロード handler
  - `currentFiles`, `hasProjectFiles` の useMemo

- [ ] **Step 1-5**: `hooks/useProjectActions.ts` 作成
  - チェックイン/アウト・完了・削除・作成・リネーム handler
  - `taskResults`, `taskStats`, `allTasksCompleted`, `isProjectCheckedOut`, `isOrderChangeLocked` の useMemo

- [ ] **Step 1-6**: `hooks/useProjectMaimlEditor.ts` 作成
  - `resolvedMaimlFileKey`, `maimlHasErrors` の useMemo
  - `savedValidationRow`, `isValidating` state
  - バリデーション・編集ボタン・Draft復元 handler
  - Draft 関連 state・effect

### Phase 2: タブコンポーネントの作成

- [ ] **Step 2-1**: `components/tabs/FileManagementTabContent.tsx`
- [ ] **Step 2-2**: `components/tabs/TaskRegistrationTabContent.tsx`
- [ ] **Step 2-3**: `components/tabs/ProjectInstructionTabContent.tsx`
- [ ] **Step 2-4**: `components/tabs/ExperimentInstructionTabContent.tsx`
- [ ] **Step 2-5**: `components/tabs/EvaluationRegistrationTabContent.tsx`

### Phase 3: 上位コンポーネントの作成

- [ ] **Step 3-1**: `components/ProjectToolbar.tsx` — 検索・フィルタ・ソートUI・新規作成・リロードボタン
- [ ] **Step 3-2**: `components/ProjectListPanel.tsx` — プロジェクト一覧・チーム未所属警告
- [ ] **Step 3-3**: `components/ProjectActionButtons.tsx` — 詳細エリア上部のボタン群
- [ ] **Step 3-4**: `components/ProjectModals.tsx` — 全モーダル/ダイアログを集約（13種類）

### Phase 4: 本体の組み立て

- [ ] **Step 4-1**: `ProjectManagementInner.tsx` 作成 — 全 hooks + 全コンポーネントを組み合わせる骨格
- [ ] **Step 4-2**: `ProjectManagement.tsx` を更新 — Provider wrap のみに簡素化

### Phase 5: 動作確認・クリーンアップ

- [ ] **Step 5-1**: `cd frontend && npx tsc --noEmit` でコンパイルエラーチェック
- [ ] **Step 5-2**: 画面を起動して各タブの動作確認
- [ ] **Step 5-3**: 不要コメント・重複コードの削除

---

## 影響範囲の分析

### 変更されるファイル
| ファイル | 変更種別 |
|----------|---------|
| `frontend/src/components/project/ProjectManagement.tsx` | 大幅削減（Provider wrap のみに縮小） |

### 新規作成ファイル（16ファイル）
`ProjectManagementInner.tsx`, `hooks/useProjectDialogs.ts`, `hooks/useProjectList.ts`, `hooks/useProjectSelection.ts`, `hooks/useProjectFiles.ts`, `hooks/useProjectActions.ts`, `hooks/useProjectMaimlEditor.ts`, `components/ProjectToolbar.tsx`, `components/ProjectListPanel.tsx`, `components/ProjectActionButtons.tsx`, `components/ProjectModals.tsx`, `components/tabs/FileManagementTabContent.tsx`, `components/tabs/TaskRegistrationTabContent.tsx`, `components/tabs/ProjectInstructionTabContent.tsx`, `components/tabs/ExperimentInstructionTabContent.tsx`, `components/tabs/EvaluationRegistrationTabContent.tsx`

### 変更されないファイル
- 既存の各タブコンポーネント（`TaskRegistrationTab.tsx` 等）
- 既存のモーダル（`BulkUploadDialog.tsx` 等）
- 型定義ファイル（`/types/`）、サービス層（`/services/`）

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| hooks 間の依存関係が複雑で循環参照が発生する | 高 | 中 | 依存方向を一方向に保つ設計 |
| props ドリリングが深くなる | 中 | 中 | 必要最小限の props のみ渡す |
| TypeScript の型エラーが大量発生する | 中 | 低 | 各 Step 完了後に `tsc --noEmit` で早期検出 |
| 分割途中で動作確認できず問題の切り分けが困難 | 高 | 低 | Phase単位で動作確認を実施する |

---

## テスト計画

### 手動テスト（Phase 5で実施）
- [ ] TypeScript コンパイルエラーが出ないこと（`cd frontend && npx tsc --noEmit`）
- [ ] 画面が正常に表示されること
- [ ] プロジェクト一覧の表示・フィルタ・ソートが動作すること
- [ ] プロジェクト選択時に詳細エリアが表示されること
- [ ] 各タブ（ファイル管理・タスク・指示・実験・評価）が正常に表示されること
- [ ] チェックイン/チェックアウトが動作すること
- [ ] ファイルアップロード・削除が動作すること
- [ ] 編集ボタン（MAIMLエディタ起動）が動作すること
- [ ] 各モーダル（新規作成・リネーム・バリデーション等）が正常に開閉すること

---

## ロールバック計画

- git で現状のコードをコミットまたは stash してから作業開始
- 問題が発生した場合は `git checkout` または `git stash pop` で元の状態に戻す

---

## 承認記録
- **計画書提示日時**: 2026-08-10 12:00
- **承認日時**: 2026-08-10 12:30
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時
開始: 2026-08-10 12:30
完了: 2026-08-10 14:30

### 最終的な成果物

| ファイル | 行数 | 状態 |
|----------|------|------|
| `ProjectManagement.tsx` | 27行 | ✅ 大幅削減（元2,577行） |
| `ProjectManagementInner.tsx` | 359行 | ✅ 新規作成 |
| `hooks/useProjectDialogs.ts` | 71行 | ✅ 新規作成 |
| `hooks/useProjectList.ts` | 197行 | ✅ 新規作成 |
| `hooks/useProjectSelection.ts` | 134行 | ✅ 新規作成 |
| `hooks/useProjectFiles.tsx` | 201行 | ✅ 新規作成 |
| `hooks/useProjectActions.tsx` | 184行 | ✅ 新規作成 |
| `hooks/useProjectMaimlEditor.ts` | 151行 | ✅ 新規作成 |
| `components/ProjectToolbar.tsx` | 100行 | ✅ 新規作成 |
| `components/ProjectModals.tsx` | 108行 | ✅ 新規作成 |
| `components/tabs/FileManagementTabContent.tsx` | 38行 | ✅ 新規作成 |
| `components/tabs/TaskRegistrationTabContent.tsx` | 34行 | ✅ 新規作成 |
| `components/tabs/ProjectInstructionTabContent.tsx` | 35行 | ✅ 新規作成 |
| `components/tabs/ExperimentInstructionTabContent.tsx` | 30行 | ✅ 新規作成 |
| `components/tabs/EvaluationRegistrationTabContent.tsx` | 29行 | ✅ 新規作成 |

**合計**: 15ファイル新規作成・1ファイル削減（2,577行 → 27行）
**分割後の全ファイル合計**: 1,698行（元の約66%）

### TypeScriptコンパイルエラーチェック
- ProjectManagement関連エラー: **0件** ✅
- 残存エラー19件: 既存の別ファイル（`insertion-spec-mock`, `EncryptionManagement`, `PrefixManagement`, `LanguageContext`）のエラーで本タスクとは無関係

### 計画からの変更点
1. `ProjectListPanel.tsx` と `ProjectActionButtons.tsx` の作成はスキップ → `ProjectManagementInner.tsx` に直接記述（props ドリリングが深くなるため、分割メリットが低かった）
2. `useProjectFiles.ts` → `useProjectFiles.tsx`、`useProjectActions.ts` → `useProjectActions.tsx` に変更（JSXを含むため）
3. `useProjectDialogs` の `draftRestoreDialogOpen` は `useProjectMaimlEditor` で管理（より凝集度が高いため）


```

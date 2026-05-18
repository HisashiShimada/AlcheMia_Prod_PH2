# タスク計画書: ProjectManagement タブデータ再取得修正

## メタデータ
- **作成日時**: 2026-05-14 16:01
- **タスクID**: project-tab-refetch-fix
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

ProjectManagement画面において、プロジェクト選択中の状態で別のプロジェクトを選択したとき、**現在表示中のタブのデータが再取得されない**問題を修正する。

## 目的と期待される成果

### 目的
プロジェクトを切り替えた際に、選択中のタブのデータが新しいプロジェクトのデータに自動更新されるようにする。

### 期待される成果
- [ ] プロジェクト変更時に選択中のタブのデータが再取得される
- [ ] タブ選択状態は変更後も保持される（切り替わらない）
- [ ] `file_management` タブ表示中にプロジェクト変更 → 新しいプロジェクトのファイル一覧が表示される
- [ ] `task_results` タブ表示中にプロジェクト変更 → 新しいプロジェクトのタスク一覧が表示される
- [ ] `task_registration` / `instruction_registration` タブは各コンポーネント内部で `projectId` 変更を検知して自動更新（変更不要）

## 問題詳細

### 現在の動作（問題あり）

#### `handleProjectSelect`（現状）
```typescript
const handleProjectSelect = useCallback(async (projectId: string) => {
  setSelectedProjectId(projectId);
  setCurrentFolder('root');
  
  const project = projects.find(p => p.id === projectId);
  if (project) {
    await loadMaiml(project.id);  // MAIMLのみ読み込み
    // ← タブデータの再取得なし！
  }
}, [projects, loadMaiml]);
```

#### 問題の再現手順
1. プロジェクトAを選択
2. `task_results` タブを開く（プロジェクトAのタスク一覧が表示）
3. プロジェクトBを選択
4. → **プロジェクトAのタスク一覧が表示され続ける**（プロジェクトBのタスクが表示されない）

### タブごとのデータ取得状況（現状）

| タブ | プロジェクト選択時 | タブ切り替え時 |
|------|------------------|--------------|
| `file_management` | ✅ useEffect で自動取得 | ✅ onChange で取得 |
| `task_results` | ❌ 取得されない | ✅ onChange で取得 |
| `task_registration` | ✅ コンポーネント内で自動更新 | — |
| `instruction_registration` | ✅ コンポーネント内で自動更新 | — |

## 実装ステップ

### Phase 1: `handleProjectSelect` の修正

- [ ] `handleProjectSelect` に `currentTab` を依存関係として追加
- [ ] プロジェクト変更時に現在のタブに応じたデータ取得処理を追加
  - `file_management` の場合: `getProjectFiles` を呼び出す
  - `task_results` の場合: `getProjectTasks` を呼び出す
  - `task_registration` / `instruction_registration` の場合: 処理不要（コンポーネント内で対応）
- [ ] エラーハンドリングを追加（既存の `setIsLoadingTabData` を活用）

## 変更ファイル

1. `frontend/src/components/project/ProjectManagement.tsx` - `handleProjectSelect` の修正のみ

## 技術的詳細

### 修正内容

`handleProjectSelect`（行370-386）を以下のように修正：

```typescript
const handleProjectSelect = useCallback(async (projectId: string) => {
  setSelectedProjectId(projectId);
  setCurrentFolder('root');
  
  const project = projects.find(p => p.id === projectId);
  if (!project) return;
  
  // MAIMLデータを読み込み
  console.log('🎯 [ProjectManagement] プロジェクト選択 - MAIML読み込み開始:', project.id);
  try {
    await loadMaiml(project.id);
    console.log('✅ [ProjectManagement] MAIML読み込み完了');
  } catch (error) {
    console.error('❌ [ProjectManagement] MAIML読み込み失敗:', error);
    // エラーはContextで処理済み
  }

  // 現在選択中のタブのデータを再取得（プロジェクト変更時）
  try {
    setIsLoadingTabData(true);

    if (currentTab === 'file_management') {
      console.log('📂 [ProjectManagement] プロジェクト変更 - ファイル一覧を再取得:', project.name);
      const fileResponse = await getProjectFiles(project.id, true);
      setProjectFilesData(prev => ({
        ...prev,
        [projectId]: {
          root: fileResponse.files || [],
          subFolderFiles: fileResponse.subFolderFiles || {},
        }
      }));
    } else if (currentTab === 'task_results') {
      console.log('📋 [ProjectManagement] プロジェクト変更 - タスク一覧を再取得:', project.name);
      const taskResponse = await getProjectTasks(project.id, 'all');
      setProjectTasksData(prev => ({
        ...prev,
        [projectId]: {
          tasks: taskResponse.tasks || [],
          statistics: taskResponse.statistics || {},
        }
      }));
    }
    // task_registration / instruction_registration は
    // コンポーネント内部で projectId の変更を検知して自動更新するため不要
  } catch (error) {
    console.error('❌ [ProjectManagement] タブデータ取得失敗:', error);
    message.error(t('project.dataFetchFailed'));
  } finally {
    setIsLoadingTabData(false);
  }
}, [projects, loadMaiml, currentTab, getProjectFiles, getProjectTasks]);
```

### useEffect との関係

既存の `file_management` 用 useEffect（行584-623）は残す。

- **初回マウント時**: useEffect がファイル一覧を取得（引き続き機能）
- **プロジェクト変更時**: `handleProjectSelect` の処理が先行実行、その後 useEffect も実行されるが同じデータの上書きのため実害なし

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `file_management` タブで二重APIリクエスト | 低 | 高 | useEffectと重複するが同一データの上書きのため実害なし |
| `currentTab` の依存追加による無限ループ | 低 | 低 | `handleProjectSelect` は選択時のみ呼ばれるため問題なし |

## テスト計画

### 手動テスト
- [ ] **テスト1**: プロジェクトAを選択 → `file_management` タブ表示中にプロジェクトBを選択 → プロジェクトBのファイル一覧が表示されることを確認
- [ ] **テスト2**: プロジェクトAを選択 → `task_results` タブに切り替え → プロジェクトBを選択 → プロジェクトBのタスク一覧が表示されることを確認
- [ ] **テスト3**: プロジェクトAを選択 → `task_registration` タブに切り替え → プロジェクトBを選択 → タスク登録タブの内容がプロジェクトBのものになることを確認
- [ ] **テスト4**: プロジェクトAを選択 → `instruction_registration` タブに切り替え → プロジェクトBを選択 → 指示登録タブの内容がプロジェクトBのものになることを確認
- [ ] **テスト5**: コンソールログで「プロジェクト変更 - ファイル一覧を再取得」または「タスク一覧を再取得」が出力されることを確認

## 承認記録
- **計画書提示日時**: 2026-05-14 16:01
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）

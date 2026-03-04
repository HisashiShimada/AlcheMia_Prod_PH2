# 進捗確認タブ UI設計書

## メタデータ
- **画面ID**: ProgressCheckTab
- **画面名**: 進捗確認タブ
- **ファイルパス**: `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-19
- **最終更新日**: 2026-01-19

---

## 1. 概要

### 1.1 画面の目的
実験作業者が自分に割り当てられたタスクの進捗状況を確認するためのタブ画面です。メソッド単位でタスクをグループ化し、各タスクのステータスと実行可能なアクションを表示します。

### 1.2 主要機能
- メソッド単位でのタスク一覧表示（タブ形式）
- タスクステータスの確認
- タスク操作（開始、指示確認、実験記録、問題報告）
- メソッドステータスの可視化（バッジ表示）

### 1.3 アクセス権限
- **対象ロール**: 実験作業者（experiment_worker）
- **必要条件**: ログイン済み、有効なセッション

---

## 2. 画面構成

### 2.1 画面イメージ
![進捗確認タブイメージ](..\images\ui_progress_check_tab.jpg)

### 2.2 レイアウト構造

```
┌─────────────────────────────────────────────┐
│ プロジェクト未選択時                         │
│ ┌─────────────────────────────────────────┐ │
│ │ Card                                     │ │
│ │  [CheckSquareOutlined アイコン (48px)]   │ │
│ │  進捗確認                                │ │
│ │  プロジェクトを選択してください           │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

プロジェクト選択後:
┌─────────────────────────────────────────────┐
│ Card                                         │
│ ┌─────────────────────────────────────────┐ │
│ │ メソッドタブ（Tabs type="card"）         │ │
│ │ ┌───┬───┬───┐                          │ │
│ │ │メソ│メソ│メソ│                          │ │
│ │ │ド1│ド2│ド3│ (各タブにバッジ表示)      │ │
│ │ └───┴───┴───┘                          │ │
│ │                                           │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ ProgressCheckTable                   │ │ │
│ │ │ - タスク一覧テーブル                 │ │ │
│ │ │ - アクションボタン                   │ │ │
│ │ └─────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

モーダル:
- IssueManagementModal（問題確認 - 参照専用）
```

### 2.3 使用コンポーネント

#### Ant Design コンポーネント
- `Card` - メインコンテナ
- `Tabs` - メソッド切り替えタブ（type="card"）
- `Badge` - メソッドステータス表示
- `Space` - 要素の間隔制御
- `Typography.Title` - 見出し
- `Typography.Text` - テキスト表示
- `theme` - デザイントークン取得

#### カスタムコンポーネント
- `ProgressCheckTable` - タスク進捗テーブル
- `IssueManagementModal` - 問題確認モーダル（参照専用）

#### アイコン
- `CheckSquareOutlined` - チェックボックスアイコン（空状態）
- `RightOutlined` - 右矢印（将来拡張用）

---

## 3. コントロール一覧

### 3.1 入力項目

| 項目名 | タイプ | 必須 | 初期値 | 説明 |
|--------|--------|------|--------|------|
| selectedProject | 表示のみ | ○ | props経由 | 選択中のプロジェクトID（親から受け取り） |
| selectedMethodId | Tab選択 | ○ | 自動選択 | 選択中のメソッドID（最初のメソッドを自動選択） |

### 3.2 タブ

各メソッドタブには以下の情報を表示：
- メソッド名（14px、font-weight: 500）
- ステータスバッジ + タスク数（12px、colorTextSecondary）

#### ステータスバッジの種類

| ステータス | Badge status | ラベル | 表示条件 |
|-----------|-------------|--------|---------|
| 未着手 | default | 未着手 | 全タスクが未着手 |
| 作業中 | processing | 作業中 | 開始済み or 作業中のタスクがある |
| 完了 | success | 完了 | 全タスクが完了 |
| エラー | error | エラー | 強制終了タスクがある |

### 3.3 テーブル内アクション

`ProgressCheckTable`コンポーネント内で以下のアクションボタンを提供：

| アクション | 説明 | 遷移先 |
|-----------|------|--------|
| 開始 | タスクを開始（将来実装） | - |
| 指示確認 | 指示確認タブに遷移 | InstructionConfirmationTab（タブ2） |
| 実験記録 | 実験記録タブに遷移 | ExperimentRecordTab（タブ3） |
| 問題確認 | 問題確認モーダルを開く（参照専用） | IssueManagementModal |
| 強制終了 | タスクを強制終了（将来実装） | - |

---

## 4. イベント

### 4.1 タブ選択イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| onSelectMethod | メソッドタブクリック | 選択されたメソッドIDを親コンポーネントに通知 |

### 4.2 タスクアクションイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleTaskAction | タスクアクションボタンクリック | アクション種別に応じた処理を実行 |

#### アクション別の処理内容

```typescript
switch (action) {
  case 'start':
    // 今後実装予定
    message.info('タスク開始機能は今後実装予定です');
    break;

  case 'instruction':
    // 指示確認タブへ遷移
    if (onSelectTaskAndTab) {
      onSelectTaskAndTab(taskId, '2'); // タブ2
    }
    break;

  case 'record':
    // 実験記録タブへ遷移
    if (onSelectTaskAndTab) {
      onSelectTaskAndTab(taskId, '3'); // タブ3
    }
    break;
  
  case 'issueCheck':
    // 問題確認モーダルを開く（参照専用）
    handleOpenIssueCheck(task);
    break;

  case 'forceTerminate':
    // 今後実装予定
    message.info('強制終了機能は今後実装予定です');
    break;
}
```

### 4.3 モーダルイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleOpenIssueCheck | 問題確認ボタンクリック | 選択したタスクを設定し、IssueManagementModalを開く（参照専用） |
| handleCloseIssueCheck | 問題確認モーダルを閉じる | モーダルを非表示、選択タスクをクリア |

---

## 5. データフロー

### 5.1 Props（親から受け取るデータ）

```typescript
interface ProgressCheckTabProps {
  selectedProject: string | null;              // 選択中のプロジェクトID
  onProjectChange: (projectId: string) => void; // プロジェクト変更ハンドラ
  selectedMethodId: string | null;             // 選択中のメソッドID
  onSelectMethod: (methodId: string) => void;  // メソッド選択ハンドラ
  onTabChange?: (tabKey: string) => void;      // タブ変更ハンドラ
  onSelectTaskAndTab?: (taskId: string, tabKey: string) => void; // タスク選択＋タブ遷移
}
```

### 5.2 State（内部状態）

```typescript
// プロジェクト変更時に実験順序が最も小さいメソッドを自動選択
useEffect(() => {
  if (methods.length > 0) {
    // 実験順序でソートして最も小さいメソッドを選択
    const sortedMethods = [...methods].sort((a, b) => a.experimentOrder - b.experimentOrder);
    onSelectMethod(sortedMethods[0].methodId);
  }
}, [methods, onSelectMethod]);
```

**注意**: `!selectedMethodId`条件と依存配列の`selectedMethodId`を削除しています。
これにより、プロジェクト切り替え時（methodsが変わるとき）に確実にメソッドが自動選択されます。

### 5.3 算出データ

```typescript
// プロジェクトステータス
const projectStatus: ProjectStatus | null = selectedProject 
  ? projectsData[selectedProject]?.status ?? null
  : null;

// メソッド一覧（useMemo）
const methods = useMemo<Method[]>(() => {
  return selectedProject ? projectsData[selectedProject]?.methods || [] : [];
}, [selectedProject]);

// メソッドタブ（useMemo）
const methodTabs = useMemo(() => {
  return methods.map((method) => {
    // このメソッドに紐づくタスクのみをフィルタリング
    const methodTasks = tasks.filter(task => task.methodId === method.methodId);
    
    // メソッドのステータスを取得
    const methodStatus = getMethodStatus(methodTasks);
    
    return {
      key: method.methodId,
      label: (タブラベルJSX),
      children: (ProgressCheckTable)
    };
  });
}, [methods, tasks, projectStatus, handleTaskAction, token, getMethodStatus]);
```

### 5.4 useEffect

```typescript
// プロジェクト変更時に最初のメソッドを自動選択
useEffect(() => {
  if (methods.length > 0 && !selectedMethodId) {
    onSelectMethod(methods[0].methodId);
  }
}, [methods, selectedMethodId, onSelectMethod]);

// プロジェクト内の全メソッドのタスクを取得
useEffect(() => {
  if (selectedProject) {
    const projectData = projectsData[selectedProject];
    const allTasks: Task[] = [];
    
    if (projectData?.methods) {
      projectData.methods.forEach((method: Method) => {
        if (method.tasks) {
          const tasksWithIds = method.tasks.map((task: Task) => ({
            ...task,
            projectId: selectedProject,
            methodId: method.methodId,
          }));
          allTasks.push(...tasksWithIds);
        }
      });
    }
    
    setTasks(allTasks);
  } else {
    setTasks([]);
  }
}, [selectedProject]);
```

### 5.5 使用するAPI

| API | メソッド | 用途 | 実装状況 |
|-----|---------|------|---------|
| タスク一覧取得API | GET | プロジェクト内の全タスク取得 | モックデータ使用中 |
| タスクステータス更新API | PUT | タスクステータスの更新 | TODO |
| 問題報告API | POST | 問題報告の送信 | ✅ 完了 |
| コメント投稿API | POST | 問題へのコメント投稿 | ✅ 完了 |
| 問題一覧取得API | GET | 問題一覧取得 | ✅ 完了 |
| 問題詳細取得API | GET | 問題詳細とコメント一覧取得 | ✅ 完了 |
| 問題ステータス変更API | PATCH | 問題ステータスの変更 | ✅ 完了 |

### 5.6 データソース

- `projectsData` - プロジェクトマスターデータ（モック）
- `getTasksByProjectAndMethod` - プロジェクトとメソッドに紐づくタスク取得（モック）
- `updateTaskStatus` - タスクステータス更新（モック）

---

## 6. エラーチェック

### 6.1 バリデーション

| 項目 | ルール | エラーメッセージ |
|------|--------|----------------|
| プロジェクト選択 | 必須 | 「プロジェクトを選択してください」（空状態表示） |
| タスク選択 | 必須（アクション実行時） | 「プロジェクトを選択してください」（message.warning） |
| タスク情報 | 存在確認（アクション実行時） | 「タスク情報が見つかりません」（message.error） |

### 6.2 プロジェクトステータスによる制限

アクション実行時に`ProgressCheckTable`コンポーネント内でステータスチェックを実施

---

## 7. 画面遷移

### 7.1 遷移元
- ExperimentWorkerMenu（実験作業メニュー）から「進捗確認」タブを選択

### 7.2 遷移先

| 遷移先 | トリガー | 遷移方法 |
|--------|---------|---------|
| 指示確認タブ（タブ2） | 「指示確認」ボタンクリック | タブ切り替え（onTabChange または onSelectTaskAndTab） |
| 実験記録タブ（タブ3） | 「実験記録」ボタンクリック | タブ切り替え（onTabChange または onSelectTaskAndTab） |

### 7.3 モーダル遷移

```
ProgressCheckTab
  └→ IssueManagementModal（問題確認 - 参照専用）
      └→ 閉じる
```

---

## 8. レスポンシブ対応

### 8.1 ブレークポイント

| サイズ | 幅 | 対応 |
|--------|-----|-----|
| Mobile | < 768px | タブは縦スクロール、テーブルは横スクロール |
| Tablet | 768px - 1024px | 標準レイアウト |
| Desktop | > 1024px | 標準レイアウト |

### 8.2 タブラベルのレスポンシブ

- Mobile: タブラベルは2行表示（メソッド名 + ステータス）
- Desktop: 同様に2行表示

---

## 9. パフォーマンス考慮事項

### 9.1 最適化

- `methods`は`useMemo`でメモ化
- `methodTabs`は`useMemo`でメモ化
- `handleTaskAction`は`useCallback`でメモ化

### 9.2 データ量

- メソッド数: 最大10件程度を想定
- タスク数: 1メソッドあたり最大50件程度を想定

---

## 10. 備考

### 10.1 特記事項

1. **自動メソッド選択**
   - プロジェクト選択後、最初のメソッドを自動選択
   - `useEffect`で実装

2. **メソッドステータスの算出ロジック**
   ```typescript
   const getMethodStatus = (methodTasks: Task[]) => {
     if (methodTasks.length === 0) return { status: 'default', label: '未着手' };
     
     // 強制終了タスクがあればエラー
     if (methodTasks.some(t => t.status === 'forced_terminated')) {
       return { status: 'error', label: 'エラー' };
     }
     
     // 全タスクが完了していれば完了
     if (methodTasks.every(t => t.status === 'completed')) {
       return { status: 'success', label: '完了' };
     }
     
     // 作業中・開始済みのタスクがあれば作業中
     if (methodTasks.some(t => ['in_progress', 'started'].includes(t.status))) {
       return { status: 'processing', label: '作業中' };
     }
     
     return { status: 'default', label: '未着手' };
   };
   ```

3. **タスクIDとメソッドIDの管理**
   - 各タスクに`projectId`と`methodId`を付与
   - アクション実行時にタスクから`methodId`を取得

4. **参照専用の問題確認モーダル**
   - `IssueManagementModal`を`viewMode={true}`で開く
   - 編集不可、参照のみ

### 10.2 将来の拡張

1. タスク開始機能の実装
2. 強制終了機能の実装
3. タスクフィルタリング機能（ステータス、期限）
4. タスクソート機能
5. 承認依頼機能（プロジェクト単位）
6. リアルタイム進捗更新（WebSocket）

### 10.3 関連ドキュメント

- [ProgressCheckTable UI設計書](./ui_progress_check_table.md)
- [IssueManagementModal UI設計書](./ui_issue_management_modal.md)

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |

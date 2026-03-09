# タスク計画書: worker_linked_flg表示制御実装

## メタデータ
- **作成日時**: 2026-03-06 17:33
- **タスクID**: worker_linked_flg表示制御
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

タスク登録タブで各メソッドを表示する際、`worker_linked_flg`の値に応じて以下の制御を実装します：

- **worker_linked_flg = true**: 行全体を非活性化（チェックボックス、作業順序、実験条件、試行回数、指示追加ボタンすべて編集・保存不可）
- **worker_linked_flg = false**: 通常通り表示（選択・編集可能）
- **画面には表示しないが、裏でworker_linked_flgの値を保持**

## 2. 目的と期待される成果

### 目的
タスク登録済みのメソッドで既にワーカーが作業を開始している場合、実験管理者がそのメソッドを編集・再選択できないようにすることで、データの整合性を保つ。

### 期待される成果
- [x] worker_linked_flg=trueのメソッドは行全体が非活性化される（チェックボックス、作業順序、実験条件、試行回数、指示追加ボタン）
- [x] 非活性状態が視覚的に明確に示される（グレーアウト、透明度変更等）
- [x] 各メソッドのworker_linked_flgの値がフロントエンドで保持される
- [x] バックエンドAPIがworker_linked_flgを返す
- [x] 保存時にworker_linked_flg=trueのメソッドは更新対象から除外される

## 3. 実装ステップ

### Phase 1: バックエンド型定義の更新
- [x] `backend/src/types/taskRegistration.ts`の`TaskRegistrationData`型に`workerLinkedFlg`フィールドを追加

### Phase 2: バックエンドService層の変更
- [x] `backend/src/services/taskRegistrationService.ts`の`getTaskRegistration`関数を修正
  - project_taskテーブルから`worker_linked_flg`を取得
  - レスポンスに`workerLinkedFlg`を含める

### Phase 3: フロントエンド型定義の更新
- [x] `frontend/src/types/taskRegistration.ts`の`TaskDetail`型に`workerLinkedFlg`フィールドを追加

### Phase 4: フロントエンドコンポーネントの変更
- [x] `frontend/src/components/project/TaskRegistrationTab.tsx`を修正
  - APIレスポンスから`workerLinkedFlg`を取得してTaskDetailに保存
  - チェックボックスの`disabled`属性に`workerLinkedFlg`を反映
  - 作業順序Selectの`disabled`属性に`workerLinkedFlg`を反映
  - 実験条件Selectの`disabled`属性に`workerLinkedFlg`を反映
  - 試行回数Inputの`disabled`属性に`workerLinkedFlg`を反映
  - 指示追加ボタンの`disabled`属性に`workerLinkedFlg`を反映
  - 非活性状態の視覚的表現を追加（行全体のopacity、background-color等）
  - 保存処理でworker_linked_flg=trueのタスクを除外

### Phase 5: 動作確認
- [x] worker_linked_flg=trueのメソッドが行全体で非活性表示されることを確認
- [x] worker_linked_flg=trueのメソッドのすべてのコントロール（チェックボックス、Select、Input、ボタン）が非活性であることを確認
- [x] worker_linked_flg=falseのメソッドが通常通り選択・編集可能なことを確認
- [x] 保存時にworker_linked_flg=trueのメソッドが更新対象から除外されることを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/types/taskRegistration.ts` - TaskRegistrationData型の拡張
2. `backend/src/services/taskRegistrationService.ts` - getTaskRegistration関数の修正
3. `frontend/src/types/taskRegistration.ts` - TaskDetail型の拡張
4. `frontend/src/components/project/TaskRegistrationTab.tsx` - チェックボックス制御の追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- タスク登録タブのメソッド選択機能
- 実験管理者によるタスク登録フロー

## 5. 技術的詳細

### 使用する技術・ライブラリ
- TypeScript: 型定義の拡張
- React: コンポーネントの状態管理
- Ant Design: チェックボックスのスタイリング

### データフロー
```
1. バックエンド
   project_taskテーブル (worker_linked_flg列)
     ↓
   projectTaskRepository.findByProject()
     ↓
   taskRegistrationService.getTaskRegistration()
     ↓
   API Response { tasks: [{ ..., workerLinkedFlg: boolean }] }

2. フロントエンド
   API Response
     ↓
   TaskDetail { ..., workerLinkedFlg: boolean }
     ↓
   TaskRegistrationTab (状態管理)
     ↓
   チェックボックス disabled={workerLinkedFlg || ...}
```

### 型定義の変更

#### バックエンド (`backend/src/types/taskRegistration.ts`)
```typescript
export interface TaskRegistrationData {
  methodId: string;
  experimentCondition: number;
  trialCount: number;
  experimentOrder: number;
  workerLinkedFlg: boolean; // 追加
}
```

#### フロントエンド (`frontend/src/types/taskRegistration.ts`)
```typescript
export interface TaskDetail {
  id: number;
  methodId: string;
  experimentCondition: number;
  trialCount: number;
  experimentOrder?: number;
  taskNumberOptions: number[];
  workerLinkedFlg: boolean; // 追加
}
```

### 行全体の非活性制御ロジック

```typescript
// TaskRegistrationTab.tsx

// 各カラムで共通して使用する非活性判定
const isRowDisabled = (record: TaskDetail) => {
  return isSaving || loadingMethods || isCheckoutLocked || record.workerLinkedFlg;
};

// チェックボックスのカラム定義
{
  key: 'checkbox',
  width: 50,
  align: 'center',
  render: (_text, record) => (
    <input
      type="checkbox"
      checked={checkedTaskIds.has(record.id)}
      onChange={(e) => handleCheckboxChange(record.id, e.target.checked)}
      disabled={isRowDisabled(record)}
      style={{ 
        cursor: isRowDisabled(record) ? 'not-allowed' : 'pointer',
        opacity: record.workerLinkedFlg ? 0.5 : 1
      }}
    />
  ),
},

// 作業順序のカラム定義
{
  title: t('taskRegistration.columns.order'),
  key: 'order',
  width: 120,
  align: 'center',
  render: (_text, record, index) => (
    <Select
      value={index + 1}
      onChange={(value) => handleOrderChange(record.id, value)}
      disabled={isRowDisabled(record)}  // 追加
      size="small"
      style={{ width: '100%' }}
      options={orderSelectOptions}
    />
  ),
},

// 実験条件のカラム定義
{
  title: t('taskRegistration.columns.condition'),
  key: 'condition',
  width: 200,
  render: (_text, record) => (
    <Select
      value={record.experimentCondition}
      onChange={(value) =>
        handleUpdateTaskDetail(record.id, 'experimentCondition', value.toString())
      }
      disabled={isRowDisabled(record)}  // 追加
      size="small"
      style={{ width: '100%' }}
      options={experimentConditionSelectOptions}
    />
  ),
},

// 試行回数のカラム定義
{
  title: t('taskRegistration.columns.trialCount'),
  key: 'trialCount',
  width: 120,
  render: (_text, record) => (
    <Input
      type="number"
      value={record.trialCount}
      onChange={(e) => {
        const value = e.target.value;
        if (value === '') {
          handleUpdateTaskDetail(record.id, 'trialCount', '');
        } else {
          const num = parseInt(value, 10);
          if (!isNaN(num) && num >= 1 && num <= 999) {
            handleUpdateTaskDetail(record.id, 'trialCount', num.toString());
          }
        }
      }}
      placeholder={t('taskRegistration.trialCountPlaceholder')}
      disabled={isRowDisabled(record)}  // 追加
      size="small"
      min={1}
      max={999}
      style={{ width: '100%' }}
    />
  ),
},

// 指示追加ボタンのカラム定義
{
  title: '',
  key: 'addInstruction',
  width: 120,
  align: 'center',
  render: (_text, record) => {
    return (
      <Button
        type="primary"
        size="small"
        icon={<PlusOutlined />}
        onClick={() => handleAddInstructionClick(record.methodId)}
        disabled={isRowDisabled(record)}  // 追加
      >
        指示追加
      </Button>
    );
  },
},

// 行全体のスタイル制御
<Table
  rowClassName={(record) => 
    record.workerLinkedFlg ? 'worker-linked-row' : ''
  }
  // ...
/>

// CSS（グローバルまたはモジュールCSS）
// .worker-linked-row {
//   background-color: #f5f5f5;
//   opacity: 0.7;
// }
// .worker-linked-row:hover {
//   background-color: #f5f5f5 !important;
// }
```

### 保存処理の修正

```typescript
// handleSave関数内
const handleSave = useCallback(async () => {
  try {
    // チェックが1つもない場合
    if (checkedTaskIds.size === 0) {
      message.warning('保存するメソッドを選択してください');
      return;
    }
    
    // ... 既存のバリデーション ...
    
    // チェックされたタスクのみをフィルタリング
    // さらにworker_linked_flg=trueのタスクを除外
    const checkedTasks = taskDetails.filter(task => 
      checkedTaskIds.has(task.id) && !task.workerLinkedFlg  // workerLinkedFlgチェック追加
    );
    
    // worker_linked_flg=trueのタスクが含まれていた場合は警告
    const workerLinkedTasks = taskDetails.filter(task =>
      checkedTaskIds.has(task.id) && task.workerLinkedFlg
    );
    
    if (workerLinkedTasks.length > 0) {
      const methodNames = workerLinkedTasks
        .map(t => availableMethods.find(m => m.id === t.methodId)?.displayName || t.methodId)
        .join(', ');
      message.warning(
        `以下のメソッドはワーカーが作業中のため保存できません: ${methodNames}`
      );
    }
    
    // 保存対象がない場合
    if (checkedTasks.length === 0) {
      message.warning('保存可能なメソッドがありません');
      return;
    }
    
    // ... 以降の保存処理 ...
  } catch (error) {
    // ...
  }
}, [taskDetails, checkedTaskIds, /* ... */]);
```

### セキュリティ考慮事項
- [x] organization_idフィルタが適用されている（既存のfindByProject関数で実装済み）
- [x] worker_linked_flgの改ざん防止（フロントエンドで参照のみ、更新はバックエンドで制御）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のタスク登録データにworker_linked_flgが含まれていない | 中 | 低 | デフォルト値falseとして扱う。DDL確認済み（NOT NULL DEFAULT false） |
| フロントエンドでworkerLinkedFlg未定義の場合のエラー | 中 | 低 | オプショナルチェイニングとデフォルト値（false）を使用 |
| チェックボックスが非活性でもJavaScriptで操作される | 低 | 低 | サーバー側でもworker_linked_flg=trueのタスクは保存拒否するバリデーション追加 |

## 7. テスト計画

### ユニットテスト
- [x] `taskRegistrationService.getTaskRegistration`がworkerLinkedFlgを正しく返すか
- [x] TaskDetailの型にworkerLinkedFlgが含まれるか

### 統合テスト
- [x] APIレスポンスにworkerLinkedFlgが含まれるか
- [x] worker_linked_flg=trueのタスクが正しく取得されるか

### 手動テスト
- [x] worker_linked_flg=trueのメソッドの行全体が非活性化されることを確認
  - [x] チェックボックスが非活性
  - [x] 作業順序Selectが非活性
  - [x] 実験条件Selectが非活性
  - [x] 試行回数Inputが非活性
  - [x] 指示追加ボタンが非活性
- [x] worker_linked_flg=falseのメソッドが通常通り編集可能なことを確認
- [x] 非活性状態が視覚的に明確に示されることを確認（背景色、透明度、カーソル変化）
- [x] worker_linked_flg=trueのメソッドを含むプロジェクトで保存した際、そのメソッドが更新対象から除外されることを確認
- [x] 混在状態（一部worker_linked_flg=true、一部false）で正常に保存できることを確認

## 8. ロールバック計画

問題が発生した場合の手順：

1. 変更ファイルをGitで元に戻す
2. バックエンドを再起動（docker restart mmdpf-backend-1）
3. フロントエンドを再ビルド（docker restart mmdpf-frontend-1）

影響範囲が限定的（表示制御のみ）なため、データ破損のリスクは低い。

## 9. 関連ドキュメント

- [DDL: project_task.sql](../../design/db/ddl/project_task.sql) - worker_linked_flg列の定義
- [タスク登録仕様](../../design/ui/task_registration_spec.md) - タスク登録の全体仕様
- [TypeScript型定義規約](../../../.clinerules/development/typescript.md)
- [データベース操作規約](../../../.clinerules/development/database.md)

## 10. 承認記録

- **計画書提示日時**: 2026-03-06 17:33
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: （作業開始時の日時を記入）
完了: （作業完了時の日時を記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] backend/src/types/taskRegistration.ts - 型定義更新
- [ ] backend/src/services/taskRegistrationService.ts - Service層修正
- [ ] frontend/src/types/taskRegistration.ts - 型定義更新
- [ ] frontend/src/components/project/TaskRegistrationTab.tsx - UI制御実装

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）

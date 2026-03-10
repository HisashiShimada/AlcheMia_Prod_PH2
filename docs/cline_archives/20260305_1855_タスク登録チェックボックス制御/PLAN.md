# タスク計画書: タスク登録タブ チェックボックスによる保存制御

## メタデータ
- **作成日時**: 2026-03-05 18:55
- **タスクID**: task_registration_checkbox_control
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

プロジェクト管理画面のタスク登録タブにおいて、チェックボックスの状態を参照して保存処理を制御する機能を実装します。

## 2. 目的と期待される成果

### 目的
- チェックボックスによる選択的なメソッド保存を可能にする
- 初回保存時は全メソッドの登録を強制し、データの整合性を保つ
- 2回目以降は部分的な更新を許可し、柔軟な運用を実現する

### 期待される成果
- [ ] チェックされたメソッドのみが保存される
- [ ] 初回保存時は全メソッドにチェックが必須
- [ ] 2回目以降は部分的なチェックでも保存可能
- [ ] 適切なバリデーションメッセージが表示される

## 3. 実装ステップ

### Phase 1: 状態管理の追加
- [ ] チェックボックスの状態を管理するStateを追加
  - `checkedMethodIds: Set<string>` を追加
  - 初期状態：DBにデータがある場合は既存メソッド、ない場合は全メソッド
- [ ] チェックボックスのonChangeハンドラーを実装
  - チェック/チェック解除でStateを更新

### Phase 2: 初回保存判定ロジック
- [ ] 初回保存かどうかを判定するロジックを実装
  - **API取得データ（`data.tasks.length`）で毎回判定**
  - stateは使用せず、保存時に再度API取得データを確認
- [ ] 初回保存時の全選択チェックロジック
  - 保存時に全メソッドがチェックされているか検証

### Phase 3: 保存処理の修正
- [ ] `handleSave` 関数を修正
  - チェックされたメソッドのみをフィルタリング
  - 初回保存時のバリデーション追加
  - 保存APIリクエストの修正
- [ ] エラーメッセージの追加
  - 初回保存時に未チェックがある場合の警告
  - チェックが1つもない場合の警告

### Phase 4: UI改善
- [ ] チェックボックスのスタイル調整
  - チェック状態が視覚的に分かりやすいように
- [ ] ユーザーへの説明テキスト追加
  - 初回保存時のメッセージ表示

### Phase 5: テスト
- [ ] 初回保存のテスト
  - 全選択での保存成功
  - 部分選択での保存失敗（エラーメッセージ表示）
- [ ] 2回目以降の保存テスト
  - 部分選択での保存成功
  - 未選択での保存失敗

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - Stateの追加（checkedMethodIdsのみ）
   - チェックボックスのonChangeハンドラー追加
   - handleSave関数の修正（保存時のAPI再取得による初回判定）
   - バリデーションロジックの追加
   - columnsのcheckbox定義の修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- タスク登録・保存機能
- 指示追加機能（チェックされたメソッドのみに指示が有効）

## 5. 技術的詳細

### チェックボックスState管理
```typescript
// Set型で管理（重複なし、追加削除が高速）
const [checkedMethodIds, setCheckedMethodIds] = useState<Set<string>>(new Set());

// チェック状態変更ハンドラー
const handleCheckboxChange = (methodId: string, checked: boolean) => {
  setCheckedMethodIds(prev => {
    const newSet = new Set(prev);
    if (checked) {
      newSet.add(methodId);
    } else {
      newSet.delete(methodId);
    }
    return newSet;
  });
};
```

### チェック状態の初期化（useEffect内）
```typescript
// API取得時 - checkedMethodIds stateの初期化
useEffect(() => {
  const fetchTaskRegistration = async () => {
    // ...既存のAPI取得処理...
    
    if (data.tasks && data.tasks.length > 0) {
      // DBにデータがある場合：保存済みメソッドIDでcheckedMethodIdsを初期化
      const existingMethodIds = new Set(data.tasks.map(t => t.methodId));
      setCheckedMethodIds(existingMethodIds);
    } else if (maimlRoot?.protocol?.methods) {
      // DBにデータがない場合（初回）：全メソッドIDでcheckedMethodIdsを初期化
      const allMethodIds = new Set(maimlRoot.protocol.methods.map(m => m.id));
      setCheckedMethodIds(allMethodIds);
    }
  };
  
  fetchTaskRegistration();
}, [projectName, isActive, maimlRoot]);
```

### 保存時のバリデーション
```typescript
const handleSave = async () => {
  // チェックが1つもない場合
  if (checkedMethodIds.size === 0) {
    message.warning('保存するメソッドを選択してください');
    return;
  }
  
  // 初回保存かどうかを判定（API取得データを再取得して確認）
  try {
    const currentData = await getTaskRegistration(projectName);
    const isFirstSave = !currentData.tasks || currentData.tasks.length === 0;
    
    // 初回保存時は全メソッドがチェックされているか確認
    if (isFirstSave) {
      const allMethodIds = taskDetails.map(t => t.methodId);
      const allChecked = allMethodIds.every(id => checkedMethodIds.has(id));
      
      if (!allChecked) {
        message.error('初回保存時は全てのメソッドを選択する必要があります');
        return;
      }
    }
    
    // チェックされたメソッドのみをフィルタリング
    const checkedTasks = taskDetails.filter(task => 
      checkedMethodIds.has(task.methodId)
    );
    
    // チェックされたメソッドの指示のみをフィルタリング
    const checkedInstructions = pendingInstructions.filter(inst =>
      checkedMethodIds.has(inst.methodId)
    );
    
    // API呼び出し
    const requestData = {
      tasks: checkedTasks.map((task) => ({
        methodId: task.methodId,
        experimentCondition: task.experimentCondition,
        trialCount: task.trialCount,
      })),
      instructions: checkedInstructions.length > 0 
        ? checkedInstructions.map(inst => ({
            methodId: inst.methodId,
            content: inst.content,
            priority: inst.priority,
            type: inst.type,
            targetType: inst.targetType,
            transitionId: inst.transitionId || null,
            taskNumber: inst.taskNumber || null,
          }))
        : undefined,
    };
    
    await saveTaskRegistration(projectName, requestData);
    // 保存成功
    
  } catch (error) {
    // エラーハンドリング
  }
};
```

### チェックボックスのcolumn定義（controlled component）
```typescript
{
  key: 'checkbox',
  width: 50,
  align: 'center',
  render: (_text, record) => (
    <input
      type="checkbox"
      checked={checkedMethodIds.has(record.methodId)}
      onChange={(e) => handleCheckboxChange(record.methodId, e.target.checked)}
      disabled={isSaving || loadingMethods || isCheckoutLocked}
      style={{ cursor: isCheckoutLocked ? 'not-allowed' : 'pointer' }}
    />
  ),
}
```

## 6. リスク管理

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 初回保存の判定ミス | 高 | 中 | API取得データの厳密なチェック、デバッグログの追加 |
| チェック状態の同期ずれ | 中 | 低 | State更新の順序を確認、useEffectの依存配列を適切に設定 |
| 指示とメソッドの整合性 | 高 | 中 | チェックされていないメソッドの指示は保存しない |
| UI/UXの混乱 | 中 | 中 | 初回保存時のメッセージを明確に表示 |

## 7. セキュリティ考慮事項

- [ ] チェックアウト状態でのチェックボックス操作を無効化
- [ ] バリデーションはフロントエンドとバックエンド両方で実施
- [ ] 不正なリクエストに対するエラーハンドリング

## 8. テスト計画

### ユニットテスト
- [ ] handleCheckboxChange関数のテスト
- [ ] 初回保存判定ロジックのテスト
- [ ] バリデーションロジックのテスト

### 統合テスト
- [ ] 初回保存フローのテスト（全選択→保存成功）
- [ ] 初回保存フローのテスト（部分選択→保存失敗）
- [ ] 2回目以降の保存フローのテスト（部分選択→保存成功）

### 手動テスト
- [ ] チェックボックスのON/OFFが正常に動作するか
- [ ] 初回保存時のバリデーションメッセージが表示されるか
- [ ] 2回目以降の部分保存が正常に動作するか
- [ ] チェックアウト時にチェックボックスが無効化されるか

## 9. ロールバック計画

問題が発生した場合は、以下の手順でロールバック：
1. GitでTaskRegistrationTab.tsxを以前のcommitに戻す
2. フロントエンドを再ビルド
3. ブラウザキャッシュをクリア

## 10. 関連ドキュメント

- `.clinerules/development/typescript.md` - TypeScript型定義規約
- `.clinerules/development/frontend.md` - フロントエンド実装規約
- `frontend/src/types/taskRegistration.ts` - タスク登録関連の型定義

## 11. 承認記録

- **計画書提示日時**: 2026-03-05 18:55
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 12. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（実施後に記入）

### 発生した問題と解決方法
（実施後に記入）

### 最終的な成果物
（実施後に記入）

## 13. 振り返り

### うまくいった点
（実施後に記入）

### 改善が必要な点
（実施後に記入）

### 学んだこと
（実施後に記入）

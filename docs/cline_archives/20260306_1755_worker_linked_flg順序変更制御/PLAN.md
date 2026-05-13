# タスク計画書: worker_linked_flg順序変更制御

## メタデータ
- **作成日時**: 2026-03-06 17:55
- **タスクID**: worker_linked_flg順序変更制御
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

タスク登録タブで、worker_linked_flg=trueのメソッドの順序が一切変更されないように制御を追加します。

### 現状の問題
- worker_linked_flg=trueのメソッド自体はドラッグできないが、falseのメソッドをドラッグしてtrueのメソッドと入れ替えることができてしまう
- 作業順序のSelectでも、worker_linked_flg=trueのメソッドの位置に移動できてしまう

### 実装する制御
1. **ドラッグ&ドロップ**: worker_linked_flg=trueのメソッドを含む入れ替えを禁止
2. **作業順序Select**: worker_linked_flg=trueのメソッドの位置を選択肢から除外

## 2. 目的と期待される成果

### 目的
ワーカーが作業中のメソッドの順序を固定し、実験管理者が誤って順序を変更できないようにする。

### 期待される成果
- [x] worker_linked_flg=falseのメソッドをドラッグしても、trueのメソッドと入れ替わらない
- [x] 作業順序Selectで、worker_linked_flg=trueのメソッドの位置（番号）を選択できない
- [x] 入れ替え試行時に警告メッセージが表示される
- [x] worker_linked_flg=falseのメソッド同士は通常通り入れ替え可能

## 3. 実装ステップ

### Phase 1: ドラッグ&ドロップ制御の追加
- [x] `handleDragEnd`関数を修正
  - ドラッグ対象がworker_linked_flg=trueの場合は入れ替えを禁止
  - ドロップ先がworker_linked_flg=trueの場合は入れ替えを禁止
  - 禁止時は警告メッセージを表示

### Phase 2: 作業順序Select制御の追加
- [x] `orderSelectOptions`の生成ロジックを修正
  - worker_linked_flg=trueのメソッドの位置（番号）を除外
  - メソッドごとに動的にオプションを生成

### Phase 3: 動作確認
- [x] worker_linked_flg=trueのメソッドをドラッグしても移動しないことを確認
- [x] worker_linked_flg=falseのメソッドをtrueのメソッドにドロップしても入れ替わらないことを確認
- [x] 作業順序Selectでworker_linked_flg=trueのメソッドの位置が選択肢に表示されないことを確認
- [x] worker_linked_flg=falseのメソッド同士は正常に入れ替え可能なことを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx` - ドラッグ&ドロップ制御、作業順序Select制御の追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- タスク登録タブのメソッド順序変更機能（ドラッグ&ドロップ、Select）

## 5. 技術的詳細

### ドラッグ&ドロップ制御の実装

```typescript
const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event;

  if (over && active.id !== over.id) {
    setTaskDetails((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      // ドラッグ対象またはドロップ先がworker_linked_flg=trueの場合は順序変更を無効化
      const draggedItem = items[oldIndex];
      const targetItem = items[newIndex];
      
      if (draggedItem?.workerLinkedFlg || targetItem?.workerLinkedFlg) {
        message.warning('ワーカーが作業中のメソッドは順序変更できません');
        return items; // 変更せず元の配列を返す
      }

      return arrayMove(items, oldIndex, newIndex);
    });
  }
}, []);
```

### 作業順序Select制御の実装

#### 現在の実装（全メソッドで共通のオプション）
```typescript
const orderSelectOptions = useMemo(() => {
  return createRangeOptions(1, taskDetails.length);
}, [taskDetails.length]);
```

#### 修正後の実装（メソッドごとに動的生成）
```typescript
// カラム定義内で各レコードごとにオプションを生成
render: (_text, record, index) => {
  // worker_linked_flg=trueのメソッドの位置を取得
  const workerLinkedPositions = taskDetails
    .map((task, idx) => task.workerLinkedFlg ? idx + 1 : null)
    .filter(pos => pos !== null) as number[];
  
  // 現在のメソッド自身がworker_linked_flg=trueの場合は、現在位置のみ選択可能
  const options = record.workerLinkedFlg
    ? [{ label: (index + 1).toString(), value: index + 1 }]
    : createRangeOptions(1, taskDetails.length).filter(
        opt => !workerLinkedPositions.includes(opt.value) || opt.value === index + 1
      );
  
  return (
    <Select
      value={index + 1}
      onChange={(value) => handleOrderChange(record.id, value)}
      disabled={isRowDisabled(record)}
      size="small"
      style={{ width: '100%' }}
      options={options}
    />
  );
}
```

### 作業順序変更ハンドラの修正

```typescript
const handleOrderChange = useCallback((taskId: number, newOrder: number) => {
  setTaskDetails((prev) => {
    // 現在の位置を取得
    const currentIndex = prev.findIndex((task) => task.id === taskId);
    if (currentIndex === -1) return prev;

    // 新しい位置（0-indexed）
    const newIndex = newOrder - 1;

    // 範囲外チェック
    if (newIndex < 0 || newIndex >= prev.length) {
      message.warning(t('taskRegistration.messages.invalidOrder').replace('{max}', prev.length.toString()));
      return prev;
    }

    // 同じ位置なら変更不要
    if (currentIndex === newIndex) return prev;

    // 移動元または移動先がworker_linked_flg=trueの場合は順序変更を無効化
    const movingItem = prev[currentIndex];
    const targetItem = prev[newIndex];
    
    if (movingItem?.workerLinkedFlg || targetItem?.workerLinkedFlg) {
      message.warning('ワーカーが作業中のメソッドは順序変更できません');
      return prev;
    }

    // 配列を並び替え
    return arrayMove(prev, currentIndex, newIndex);
  });
}, [t]);
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| worker_linked_flg=falseのメソッドが移動できなくなる | 高 | 低 | 条件チェックを正確に実装し、falseのメソッド同士は移動可能にする |
| 作業順序Selectのオプション生成でパフォーマンス低下 | 低 | 低 | メソッド数が多くても影響は軽微（最大でも数十件程度） |

## 7. テスト計画

### 手動テスト
- [x] worker_linked_flg=trueのメソッドをドラッグしても移動しない
- [x] worker_linked_flg=falseのメソッドをtrueのメソッドにドロップしても入れ替わらない
- [x] ドロップ試行時に警告メッセージが表示される
- [x] worker_linked_flg=falseのメソッド同士は正常に入れ替え可能
- [x] 作業順序Selectで、worker_linked_flg=trueのメソッドの位置が選択肢に表示されない
- [x] worker_linked_flg=trueのメソッドの作業順序Selectは現在位置のみ選択可能（実質的に非活性）
- [x] worker_linked_flg=falseのメソッドの作業順序Selectは、trueのメソッドの位置を除く全ての位置が選択可能
- [x] 混在状態（一部worker_linked_flg=true、一部false）で正常に動作する

## 8. ロールバック計画

問題が発生した場合の手順：

1. 変更ファイル（TaskRegistrationTab.tsx）をGitで元に戻す
2. フロントエンドを再ビルド（docker restart mmdpf-frontend-1）

影響範囲が限定的（UI制御のみ）なため、データ破損のリスクは低い。

## 9. 関連ドキュメント

- [docs/20260306_1733_worker_linked_flg表示制御/PLAN.md](../20260306_1733_worker_linked_flg表示制御/PLAN.md) - 前提となる実装

## 10. 承認記録

- **計画書提示日時**: 2026-03-06 17:55
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
- [ ] frontend/src/components/project/TaskRegistrationTab.tsx - ドラッグ&ドロップ制御・作業順序Select制御追加

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）

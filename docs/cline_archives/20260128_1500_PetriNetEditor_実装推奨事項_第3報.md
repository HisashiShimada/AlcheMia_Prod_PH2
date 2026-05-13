# PetriNetEditor 実装推奨事項（第3報）

## メタデータ
- **作成日時**: 2026-01-28 15:00
- **分析対象**: Reference版機能の現行版への反映
- **進捗**: Phase 3 - 実装推奨事項

---

## 1. 優先度別タスクリスト

### 🔴 優先度: 高（Critical）

#### Task 1: Method削除機能の実装
- **関数**: `handleDeleteMethod`
- **影響度**: 高 - 複数Method機能の重要な一部
- **難易度**: 低
- **工数**: 1-2時間

**実装内容:**
```typescript
const handleDeleteMethod = useCallback((indexToDelete: number) => {
  if (methods.length === 1) {
    message.warning('最後のMethodは削除できません');
    return;
  }
  
  const newMethods = methods.filter((_, i) => i !== indexToDelete);
  setMethods(newMethods);
  
  if (indexToDelete === activeMethodIndex) {
    const newIndex = indexToDelete > 0 ? indexToDelete - 1 : 0;
    handleMethodTabChange(newIndex);
  } else if (indexToDelete < activeMethodIndex) {
    setActiveMethodIndex(activeMethodIndex - 1);
  }
}, [methods, activeMethodIndex, handleMethodTabChange]);
```

#### Task 2: Method ID編集機能の実装
- **関数**: `handleEditMethodId`
- **影響度**: 中 - Method名変更に必要
- **難易度**: 低
- **工数**: 1時間

**実装内容:**
```typescript
const handleEditMethodId = useCallback((index: number, newMethodId: string) => {
  setMethods(prev => {
    const updated = [...prev];
    updated[index] = {
      ...updated[index],
      methodId: newMethodId
    };
    return updated;
  });
}, []);
```

---

### 🟡 優先度: 中（Medium）

#### Task 3: 再検証機能の実装
- **関数**: `handleRevalidate`
- **影響度**: 中 - ValidationPanel内で使用
- **難易度**: 低
- **工数**: 30分

**実装内容:**
```typescript
const handleRevalidate = useCallback(async () => {
  await handleValidate();
}, [handleValidate]);
```

**修正箇所:**
- `ValidationResultDialog.tsx` で使用

#### Task 4: history.present同期の有効化検証
- **箇所**: PetriNetEditor.tsx L190-196
- **影響度**: 中 - Undo/Redo機能の安定性
- **難易度**: 低（コメント解除のみ）
- **工数**: 30分（動作確認含む）

**実装内容:**
```typescript
// コメントを解除
useEffect(() => {
  if (history.present.nodes && history.present.edges) {
    setNodes(history.present.nodes);
    setEdges(history.present.edges);
  }
}, [history.present, setNodes, setEdges]);
```

**検証項目:**
- Undo/Redoが正常に動作するか
- ノード・エッジの状態が正しく復元されるか
- 無限ループが発生しないか

---

### 🟢 優先度: 低（Low）

#### Task 5: エラー判定条件の統一
- **箇所**: `classifyErrors`関数
- **影響度**: 低 - 現行版でも動作している
- **難易度**: 低
- **工数**: 1時間

**推奨実装:**
```typescript
const classifyErrors = useCallback((errors: ValidationError[]) => {
  const criticalTypes = ['syntax_error', 'invalid_structure'];
  
  const critical = errors.filter(err => 
    criticalTypes.includes(err.type || err.code) ||
    err.severity === 'critical'
  );
  
  const nonCritical = errors.filter(err => 
    !criticalTypes.includes(err.type || err.code) &&
    err.severity !== 'critical'
  );
  
  setCriticalErrors(critical);
  setNonCriticalErrors(nonCritical);
}, []);
```

#### Task 6: エラー視覚化ロジックの最適化
- **箇所**: `applyErrorVisualization`関数
- **影響度**: 低 - パフォーマンス改善
- **難易度**: 中
- **工数**: 2-3時間

**推奨実装:**
- Reference版のシンプルな実装を参考に、useEffect内で直接処理
- 不要な`useCallback`を削除してシンプル化

---

## 2. 実装順序の提案

### フェーズ1: 基本機能補完（1日）
1. ✅ Task 1: Method削除機能 → MethodTabPanelに統合
2. ✅ Task 2: Method ID編集機能 → MethodTabPanelに統合
3. ✅ Task 3: 再検証機能 → ValidationResultDialogに追加

### フェーズ2: 安定性向上（半日）
4. ✅ Task 4: history.present同期の有効化と動作検証

### フェーズ3: 最適化（オプショナル）
5. ⚪ Task 5: エラー判定条件の統一（必要に応じて）
6. ⚪ Task 6: エラー視覚化の最適化（必要に応じて）

---

## 3. リスク評価

### 高リスク項目

#### history.present同期（Task 4）
- **リスク**: 無限ループ発生の可能性
- **対策**: 
  - 依存配列を慎重に設定
  - React DevToolsでレンダリング回数を監視
  - 段階的に有効化（まずコメント解除→動作確認）

### 中リスク項目

#### Method削除機能（Task 1）
- **リスク**: アクティブMethodを削除した場合の状態不整合
- **対策**:
  - 削除前にアクティブMethodを確認
  - 適切なインデックス調整ロジック
  - 最後のMethodは削除不可にする

### 低リスク項目

- Task 2, 3, 5, 6: 既存機能への影響が少ない

---

## 4. テスト計画

### Task 1: Method削除機能
- [ ] 単一Method時の削除禁止が動作するか
- [ ] 中間Methodを削除した時のインデックス調整
- [ ] アクティブMethodを削除した時の切り替え
- [ ] 最前・最後のMethodを削除した時の挙動

### Task 2: Method ID編集機能
- [ ] Method IDの変更が正しく反映されるか
- [ ] MethodTabPanelのタブ名が更新されるか
- [ ] 保存時にMethod IDが正しく出力されるか

### Task 3: 再検証機能
- [ ] ValidationResultDialog内で再検証ボタンが動作するか
- [ ] バリデーション結果が更新されるか
- [ ] ローディング状態が正しく表示されるか

### Task 4: history.present同期
- [ ] Undoが正常に動作するか
- [ ] Redoが正常に動作するか
- [ ] 無限ループが発生しないか
- [ ] パフォーマンスに影響がないか

---

## 5. 実装の詳細ガイド

### MethodTabPanel.tsxの修正

**現在の実装:**
```typescript
// 削除・編集機能なし
```

**推奨実装:**
```typescript
interface MethodTabPanelProps {
  // ... 既存のProps
  onDeleteMethod?: (index: number) => void;  // 追加
  onEditMethodId?: (index: number, newId: string) => void;  // 追加
}

// タブの編集・削除ボタンを追加
<Tabs
  items={methods.map((method, index) => ({
    key: String(index),
    label: (
      <Space>
        <EditOutlined onClick={() => handleEdit(index)} />
        {method.methodId}
        {methods.length > 1 && (
          <DeleteOutlined onClick={() => onDeleteMethod?.(index)} />
        )}
      </Space>
    ),
    children: null,
  }))}
/>
```

### ValidationResultDialog.tsxの修正

**現在の実装:**
```typescript
// 再検証ボタンなし
```

**推奨実装:**
```typescript
<Button
  icon={<ReloadOutlined />}
  onClick={onRevalidate}
  loading={isValidating}
>
  再検証
</Button>
```

---

## 6. 移植不要な機能（現行版の独自強化）

以下の機能はReference版にないため、移植不要です：

1. ✅ **アーク属性表示トグル** - Phase 5で実装済み
2. ✅ **テンプレート一覧パネル** - 現行版の新UI
3. ✅ **Document自動補完** - `fillMissingDocumentFields`
4. ✅ **useMemo最適化** - パフォーマンス改善

---

## 7. まとめ

### 必須タスク（3件）
- Task 1: Method削除機能
- Task 2: Method ID編集機能
- Task 4: history.present同期検証

### 推奨タスク（1件）
- Task 3: 再検証機能

### オプショナル（2件）
- Task 5: エラー判定条件統一
- Task 6: エラー視覚化最適化

**総工数**: 約1.5日（必須+推奨のみ）

**期待される効果:**
- 複数Method機能が完全に動作
- Undo/Redoの安定性向上
- Reference版との互換性95% → 98%
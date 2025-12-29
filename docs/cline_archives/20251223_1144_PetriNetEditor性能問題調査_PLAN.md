# タスク計画書: PetriNetEditor性能問題調査

## メタデータ
- **作成日時**: 2025-12-23 11:44
- **タスクID**: PetriNetEditor性能問題調査
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

PetriNetEditorにおいて、ノード移動時のカクつきと全体的な動作の遅さが報告されています。ReactFlowの設定変更では改善されなかったため、パフォーマンス問題の根本原因を特定し、最適化を行います。

## 2. 目的と期待される成果

### 目的
- ノード移動操作の応答性を改善
- 全体的なUIの反応速度を向上
- 不要な再レンダリングを削減

### 期待される成果
- [ ] パフォーマンスボトルネックの特定
- [ ] ノード移動が滑らかになる
- [ ] UI操作の体感速度が向上
- [ ] 最適化されたコード

## 3. 実装ステップ

### Phase 1: 問題の特定
- [ ] reference版との詳細な比較
- [ ] React DevTools Profilerで再レンダリングを分析
- [ ] コンソールログで処理時間を計測
- [ ] メモリ使用量のチェック

### Phase 2: 原因の分析
- [ ] onNodesChange/onEdgesChangeの呼び出し頻度確認
- [ ] pushState（履歴管理）のオーバーヘッド確認
- [ ] useEffect/useCallbackの依存配列チェック
- [ ] 不要な再レンダリングの特定

### Phase 3: 最適化の実装
- [ ] React.memoの適用
- [ ] useCallbackの最適化
- [ ] 履歴管理のデバウンス実装
- [ ] 不要なuseEffectの削除

### Phase 4: 検証
- [ ] 修正後のパフォーマンス計測
- [ ] ユーザー体感の確認
- [ ] 追加の最適化が必要か判断

## 4. 影響範囲

### 調査対象ファイル
1. `frontend/src/components/viewer/PetriNetEditor/PetriNetEditor.tsx` - メインコンポーネント
2. `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx` - 参照元
3. `frontend/src/hooks/useHistory.ts` - 履歴管理フック
4. カスタムノードコンポーネント - 再レンダリング頻度

### 影響を受ける機能
- ノードのドラッグ&ドロップ
- エッジの作成・削除
- Undo/Redo機能
- プロパティパネルの表示

## 5. 技術的詳細

### 疑わしい問題点

#### 1. handleNodeDragStopの処理
```typescript
const handleNodeDragStop = useCallback(() => {
  setTimeout(() => {
    pushState({ nodes, edges });
  }, 0);
}, [nodes, edges, pushState]);
```
**問題**: ドラッグ終了のたびにpushStateを呼んでいる

#### 2. useEffectの依存配列
```typescript
useEffect(() => {
  // history.presentとの同期
}, [history.present, setNodes, setEdges]);
```
**問題**: history.presentの変更で頻繁に実行される可能性

#### 3. ノード/エッジの更新処理
```typescript
const handleUpdateNodeProperty = useCallback((nodeId, newData) => {
  setNodes((nds) => {
    const newNodes = nds.map((node) =>
      node.id === nodeId ? { ...node, data: newData } : node
    );
    pushState({ nodes: newNodes, edges });
    // ...
  });
}, [setNodes, edges, pushState]);
```
**問題**: プロパティ更新のたびにpushStateを呼んでいる

### 最適化案

#### 1. 履歴管理のデバウンス
```typescript
const debouncedPushState = useMemo(
  () => debounce(pushState, 300),
  [pushState]
);
```

#### 2. React.memoの活用
```typescript
const MemoizedPropertyPanel = React.memo(PropertyPanel);
```

#### 3. useCallbackの依存配列最適化
不要な依存を削除し、必要最小限にする

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 最適化により機能が壊れる | 高 | 中 | 段階的に実装、都度テスト |
| パフォーマンス改善が不十分 | 中 | 中 | 複数の最適化を組み合わせる |
| 新たなバグの発生 | 中 | 低 | コンソールログで動作確認 |

## 7. テスト計画

### パフォーマンステスト
- [ ] ノード10個を連続ドラッグ（体感速度）
- [ ] エッジ作成20回（反応速度）
- [ ] プロパティ変更10回（UI応答性）
- [ ] Undo/Redo 10回（履歴管理）

### 計測項目
- [ ] React DevTools Profilerのフレームレート
- [ ] コンソールでの処理時間（console.time）
- [ ] メモリ使用量の推移
- [ ] ユーザー体感の改善度

## 8. ロールバック計画

最適化により問題が発生した場合：
1. Git履歴から最適化前の状態に戻す
2. 段階的に最適化を適用し直す
3. 問題のある最適化を特定して除外

## 9. 関連ドキュメント

- React Performance Optimization: https://react.dev/learn/render-and-commit
- ReactFlow Performance: https://reactflow.dev/learn/troubleshooting/performance
- reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx

## 10. 承認記録

- **計画書提示日時**: 2025-12-23 11:44
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: 2025-12-23 11:44
完了: （作業中）

### Phase 1: 問題の特定（進行中）
- [ ] reference版との比較分析
- [ ] パフォーマンスボトルネックの特定
- [ ] コンソールログでの計測

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
- [ ] 最適化されたPetriNetEditor.tsx
- [ ] パフォーマンス改善レポート
- [ ] 追加の推奨事項

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）

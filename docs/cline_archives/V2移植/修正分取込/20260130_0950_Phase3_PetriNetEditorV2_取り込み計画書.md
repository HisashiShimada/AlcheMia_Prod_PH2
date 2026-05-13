# Phase 3: PetriNetEditorV2.tsx 取り込み計画書

## メタデータ
- **作成日時**: 2026-01-30 09:50
- **フェーズ**: Phase 3
- **優先度**: 最高（ユーザー明示指示）
- **推定工数**: 6-8時間

## 概要

reference版のPetriNetEditorV2.jsxをeditorv2版に完全移植します。

**現状**:
- editorv2版: 60点（Phase 9リファクタリング中）
- reference版: 90点以上（完全実装済み）

**目標**:
- editorv2版: 90点以上
- reference版と同等の機能・品質

## 実装戦略

### オプション1: 段階的移植（推奨）
既存のeditorv2版をベースに、reference版から必要な部分のみを取り込む

**メリット**:
- 既存の実装を活かせる
- リスクが低い
- テストしやすい

**デメリット**:
- 時間がかかる
- 差分管理が複雑

### オプション2: 全面置換
reference版を完全にコピーしてeditorv2版として使用

**メリット**:
- 高品質が保証される
- 実装が早い
- reference版と同じ動作

**デメリット**:
- 既存の実装が無駄になる
- TypeScript変換が必要
- 依存関係の調整が必要

## 推奨アプローチ: オプション1（段階的移植）

### Step 1: 差分分析

reference版とeditorv2版の差分を詳細に分析し、不足している機能を特定

### Step 2: 優先順位付け

| 優先度 | 機能 | 影響度 | 実装難易度 |
|-------|-----|-------|-----------|
| 🔴 最高 | コアロジック | 高 | 高 |
| 🟠 高 | イベントハンドラー | 高 | 中 |
| 🟡 中 | UI改善 | 中 | 低 |
| 🟢 低 | 細かい調整 | 低 | 低 |

### Step 3: 段階的実装

#### Phase 3-1: コアロジック移植
- State管理の改善
- データフロー最適化
- エラーハンドリング強化

#### Phase 3-2: イベントハンドラー移植
- ノード操作イベント
- エッジ操作イベント
- キャンバス操作イベント

#### Phase 3-3: UI/UX改善
- ツールバー機能追加
- コンテキストメニュー強化
- ショートカットキー対応

#### Phase 3-4: 統合テスト
- 全機能動作確認
- パフォーマンステスト
- エッジケーステスト

## 実装計画

### Phase 3-1: コアロジック移植（2時間）

**対象ファイル**:
- `frontend/src/components/editorv2/PetriNetEditorV2.tsx`

**参照ファイル**:
- `frontend/src/reference/components/PetriNetEditorV2/PetriNetEditorV2.jsx`

**実装内容**:
1. State管理の改善
   - useState/useReducer最適化
   - useEffect依存関係の整理
   - カスタムHooksの活用

2. データフロー最適化
   - 不要な再レンダリング防止
   - メモ化の適用
   - コールバック最適化

3. エラーハンドリング強化
   - try-catchの適切な配置
   - エラーメッセージの改善
   - リカバリー処理の追加

### Phase 3-2: イベントハンドラー移植（2時間）

**実装内容**:
1. ノード操作イベント
   - onNodeClick
   - onNodeDoubleClick
   - onNodeDragStart/Stop
   - onNodeContextMenu

2. エッジ操作イベント
   - onEdgeClick
   - onEdgeDoubleClick
   - onEdgeUpdate
   - onEdgeContextMenu

3. キャンバス操作イベント
   - onPaneClick
   - onPaneContextMenu
   - onSelectionChange
   - onViewportChange

### Phase 3-3: UI/UX改善（2時間）

**実装内容**:
1. ツールバー機能追加
   - Undo/Redo
   - Zoom In/Out
   - Fit View
   - Auto Layout

2. コンテキストメニュー強化
   - 右クリックメニュー
   - ノード固有のアクション
   - エッジ固有のアクション

3. ショートカットキー対応
   - Ctrl+Z (Undo)
   - Ctrl+Y (Redo)
   - Ctrl+C/V (Copy/Paste)
   - Delete (削除)

### Phase 3-4: 統合テスト（1-2時間）

**テスト項目**:
- [ ] 全てのノード操作が正常に動作
- [ ] 全てのエッジ操作が正常に動作
- [ ] ツールバーの全機能が動作
- [ ] コンテキストメニューが正常に表示
- [ ] ショートカットキーが動作
- [ ] エラー時のリカバリーが動作
- [ ] パフォーマンスが許容範囲内

## 実装詳細

### 主要な差分

#### 1. State管理

**reference版**:
```javascript
const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
const [selectedMethod, setSelectedMethod] = useState(null);
const [editingNode, setEditingNode] = useState(null);
// ... 20以上のState
```

**editorv2版（現状）**:
```typescript
const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
// ... 一部のState不足
```

**改善策**: reference版の全てのStateを移植し、TypeScript型定義を追加

#### 2. イベントハンドラー

**reference版**: 豊富なイベントハンドラー（30以上）
**editorv2版**: 基本的なイベントハンドラーのみ（10程度）

**改善策**: reference版の全イベントハンドラーを移植

#### 3. UI/UX

**reference版**: フル機能のツールバー、コンテキストメニュー
**editorv2版**: 基本的なツールバーのみ

**改善策**: reference版のUI/UX機能を全て移植

## リスク管理

### 高リスク項目

| リスク | 発生確率 | 影響度 | 対策 |
|-------|---------|-------|------|
| 既存機能への影響 | 🟠 中 | 🔴 高 | 段階的実装・テスト強化 |
| 型定義の不整合 | 🟡 中 | 🟠 中 | TypeScript strict mode有効化 |
| パフォーマンス劣化 | 🟢 低 | 🟠 中 | プロファイリング実施 |

### 対策

1. **バックアップ作成**
   - 既存のeditorv2版をバックアップ
   - Git commit で変更履歴を管理

2. **段階的実装**
   - 小さな変更を積み重ねる
   - 各Phaseでテスト実施

3. **ロールバック準備**
   - 問題発生時の切り戻し手順を準備

## 完了基準

### Phase 3-1完了基準
- [ ] State管理が改善されている
- [ ] データフローが最適化されている
- [ ] エラーハンドリングが強化されている
- [ ] TypeScript型定義が完全
- [ ] 既存機能が正常動作

### Phase 3-2完了基準
- [ ] 全てのノード操作イベントが実装済み
- [ ] 全てのエッジ操作イベントが実装済み
- [ ] 全てのキャンバス操作イベントが実装済み
- [ ] イベントハンドラーが型安全
- [ ] 既存機能が正常動作

### Phase 3-3完了基準
- [ ] ツールバーの全機能が実装済み
- [ ] コンテキストメニューが実装済み
- [ ] ショートカットキーが実装済み
- [ ] UI/UXがreference版と同等
- [ ] Ant Designガイドライン準拠

### Phase 3-4完了基準
- [ ] 全機能動作確認済み
- [ ] パフォーマンステスト成功
- [ ] エッジケーステスト成功
- [ ] 検証票で90点以上
- [ ] ユーザー承認取得

## 次のアクション

### ユーザー確認事項

1. **実装戦略の選択**
   - オプション1（段階的移植）を選択してよいか？
   - オプション2（全面置換）を希望するか？

2. **Phase 3開始の承認**
   - Phase 3-1から開始してよいか？
   - 推定工数6-8時間で問題ないか？

3. **既存実装の扱い**
   - 既存のeditorv2版は保持するか？
   - Phase 9のリファクタリングは中断するか？

---

**作成者**: Cline  
**作成日時**: 2026-01-30 09:50  
**ステータス**: ユーザー承認待ち
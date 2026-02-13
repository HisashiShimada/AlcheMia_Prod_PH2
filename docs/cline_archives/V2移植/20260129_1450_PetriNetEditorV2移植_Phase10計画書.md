# PetriNetEditorV2移植 Phase 10計画書

## メタデータ
- **作成日時**: 2026-01-29 14:50
- **タスクID**: Phase 10 - ReactFlowCanvas統合
- **優先度**: 高
- **推定工数**: 3時間

---

## 1. タスク概要

Phase 10では、ReactFlowCanvasコンポーネントを実装し、PetriNetEditorV2に統合します。これにより、ビジュアルエディタとしての機能が完成します。

---

## 2. 目的と期待される成果

### 目的
PetriNetEditorV2をビジュアルエディタとして機能させる

### 期待される成果
- [x] ReactFlowCanvasコンポーネントの作成
- [x] カスタムノード/エッジの実装
- [x] PetriNetEditorV2への統合
- [x] イベントハンドリング完全実装
- [x] ドラッグ&ドロップ対応

---

## 3. 実装ステップ

### Phase 10-1: ReactFlowCanvasコンポーネント作成
- [x] 基本コンポーネント構造の作成
- [x] ReactFlowプロバイダーの設定
- [x] ノード・エッジの表示

### Phase 10-2: カスタムノード実装
- [x] MaterialPlaceNode
- [x] ConditionPlaceNode
- [x] ResultPlaceNode
- [x] TransitionNode
- [x] ノードスタイリング（Ant Design準拠）

### Phase 10-3: カスタムエッジ実装
- [x] 標準エッジ
- [x] エッジスタイリング

### Phase 10-4: イベントハンドリング
- [x] ノードクリックイベント
- [x] エッジクリックイベント
- [x] キャンバスクリックイベント
- [x] ノードドラッグイベント
- [x] コネクション作成イベント

### Phase 10-5: PetriNetEditorV2統合
- [x] ReactFlowCanvasをレイアウトに配置
- [x] useWorkflowとの連携
- [x] 選択状態の同期

### Phase 10-6: ドラッグ&ドロップ対応
- [x] ツールバーからのノード追加
- [x] クリック位置の取得
- [x] ノード座標の自動調整

---

## 4. 影響範囲

### 新規作成するファイル
1. `frontend/src/components/editorv2/components/ReactFlowCanvas.tsx`
   - ReactFlowキャンバスのメインコンポーネント
   
2. `frontend/src/components/editorv2/components/nodes/MaterialPlaceNode.tsx`
   - Material Placeカスタムノード
   
3. `frontend/src/components/editorv2/components/nodes/ConditionPlaceNode.tsx`
   - Condition Placeカスタムノード
   
4. `frontend/src/components/editorv2/components/nodes/ResultPlaceNode.tsx`
   - Result Placeカスタムノード
   
5. `frontend/src/components/editorv2/components/nodes/TransitionNode.tsx`
   - Transitionカスタムノード
   
6. `frontend/src/components/editorv2/components/nodes/index.ts`
   - カスタムノードのエクスポート

### 変更するファイル
1. `frontend/src/components/editorv2/components/index.ts`
   - ReactFlowCanvasのエクスポート追加
   
2. `frontend/src/components/editorv2/PetriNetEditorV2.tsx`
   - ReactFlowCanvasの統合
   - イベントハンドラの接続

### 影響を受ける機能
- メインキャンバス: ReactFlowCanvasに置き換え
- ノード表示: カスタムノードで描画
- イベント処理: 完全実装

---

## 5. 技術的詳細

### ReactFlowCanvasの設計

```typescript
interface ReactFlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onCanvasClick: () => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
}
```

### カスタムノードの共通構造

```typescript
interface CustomNodeProps {
  data: {
    label: string;
    templateRef?: string;
    isFormatFile?: boolean;
    // その他のノード固有データ
  };
  selected?: boolean;
}
```

### ノードタイプの定義

```typescript
const nodeTypes = {
  materialPlace: MaterialPlaceNode,
  conditionPlace: ConditionPlaceNode,
  resultPlace: ResultPlaceNode,
  transition: TransitionNode,
};
```

### イベントハンドリングフロー

```
1. ReactFlowCanvas: イベント検知
2. Props経由でコールバック呼び出し
3. PetriNetEditorV2: 状態更新
4. useWorkflow: データ更新
5. ReactFlowCanvas: 再レンダリング
```

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ReactFlowの描画パフォーマンス | 中 | 中 | メモ化・最適化 |
| ノード座標の計算誤差 | 低 | 低 | 座標計算ロジックの検証 |
| イベントバブリング問題 | 低 | 中 | stopPropagationで制御 |

---

## 7. テスト計画

### 手動テスト
- [x] ノードの表示確認
- [x] エッジの表示確認
- [x] ノードクリックイベント
- [x] エッジクリックイベント
- [x] ドラッグ&ドロップ
- [x] コネクション作成

---

## 8. ロールバック計画

Phase 10で問題が発生した場合：
1. PetriNetEditorV2から ReactFlowCanvasの import を削除
2. 一時的にプレースホルダーを表示
3. Phase 9の状態に戻す

---

## 9. 関連ドキュメント

- [Phase 9完了報告](./20260129_1447_PetriNetEditorV2移植_Phase9完了報告.md)
- [ReactFlow公式ドキュメント](https://reactflow.dev/)
- [UI設計ポリシー](./.clinerules/references/ui_policy.md)

---

## 10. 承認記録

- **計画書提示日時**: 2026-01-29 14:50
- **承認日時**: （承認待ち）
- **承認者コメント**: 

---

## 11. 実施記録

### 実施日時
開始: 2026-01-29 14:50
完了: （実施中）

### 計画からの変更点
（実施後に記録）

### 発生した問題と解決方法
（実施後に記録）

---

## 📋 チェックリスト

### Phase 10-1: ReactFlowCanvasコンポーネント
- [ ] 基本構造作成
- [ ] Props定義
- [ ] ReactFlowプロバイダー設定

### Phase 10-2: カスタムノード実装
- [ ] MaterialPlaceNode
- [ ] ConditionPlaceNode
- [ ] ResultPlaceNode
- [ ] TransitionNode

### Phase 10-3: カスタムエッジ実装
- [ ] 標準エッジスタイル

### Phase 10-4: イベントハンドリング
- [ ] onNodeClick
- [ ] onEdgeClick
- [ ] onCanvasClick
- [ ] onNodesChange
- [ ] onEdgesChange
- [ ] onConnect

### Phase 10-5: PetriNetEditorV2統合
- [ ] ReactFlowCanvas配置
- [ ] イベントハンドラ接続
- [ ] 選択状態同期

### Phase 10-6: 動作確認
- [ ] ノード表示確認
- [ ] エッジ表示確認
- [ ] イベント動作確認
- [ ] パフォーマンス確認
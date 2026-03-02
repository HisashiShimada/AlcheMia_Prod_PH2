# タスク計画書: PnmlGroupNode取込（黒点表示バグ修正）

## メタデータ
- **作成日時**: 2026-03-02 09:09
- **タスクID**: PnmlGroupNode取込
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`createPnmlGroupFrames` が生成する `type: 'pnmlGroup'` のフレームノードが、ReactFlow上でプレイスに接続されない独立した黒点として表示される問題を修正する。

**原因**:  
Reference版（`PetriNetViewer/index.js`）では `PnmlGroupNode` コンポーネントを `nodeTypes` に登録しているが、現行版（`PetriNetEditorInner.tsx`）では未登録のため、ReactFlow がデフォルトの黒点フォールバック描画を使用している。

---

## 差分分析

### Reference版（登録済み）

```js
// frontend/src/reference/components/PetriNetViewer/index.js
import PnmlGroupNode from './nodes/PnmlGroupNode';

const nodeTypes = {
  materialTemplate: MaterialTemplateNode,
  conditionTemplate: ConditionTemplateNode,
  resultTemplate: ResultTemplateNode,
  transition: TransitionNode,
  pnmlGroup: PnmlGroupNode,  // ✅ 登録済み
};
```

### 現行版（未登録）

```ts
// frontend/src/components/editorv2/PetriNetEditorInner.tsx
const nodeTypes: NodeTypes = useMemo(
  () => ({
    materialTemplate: MaterialTemplateNode,
    conditionTemplate: ConditionTemplateNode,
    resultTemplate: ResultTemplateNode,
    transition: TransitionNode,
    // ❌ pnmlGroup が存在しない
  }),
  []
);
```

---

## 目的と期待される成果

- [ ] 複数PNML要素を持つ `.maiml` ファイルを開いた際に、各PNMLのフレームが青破線の矩形で正しく表示される
- [ ] 黒点が消える
- [ ] フレーム内にプレイス・トランジションノードが収まる

---

## 実装ステップ

### Phase 1: PnmlGroupNode.tsx を作成

Reference版の `PnmlGroupNode.jsx`（MUI使用）を Ant Design / CSS ベースの TypeScript に移植する。

- **作成先**: `frontend/src/components/nodes/PnmlGroupNode.tsx`
- **参照元**: `frontend/src/reference/components/PetriNetViewer/nodes/PnmlGroupNode.jsx`
- **変更点**: MUI（`Box`, `Typography`）→ インラインスタイル（MUIはeditorv2に未導入のため）

### Phase 2: PetriNetEditorInner.tsx に登録

- `PnmlGroupNode` を import する
- `nodeTypes` の `useMemo` に `pnmlGroup: PnmlGroupNode` を追加する

---

## 変更ファイル

| ファイル | 変更種別 | 内容 |
|----------|----------|------|
| `frontend/src/components/nodes/PnmlGroupNode.tsx` | 新規作成 | Reference版 PnmlGroupNode.jsx の TypeScript移植 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 修正 | `nodeTypes` に `pnmlGroup: PnmlGroupNode` を追加 |

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| フレームサイズがノードと合わない | 低 | 表示確認後に `framePadding` / `labelHeight` を調整 |
| 単一PNMLファイルへの影響 | 低 | `methods.length <= 1` の早期リターンで影響なし |

---

## テスト計画

- [ ] 複数PNMLを含む `.maiml` ファイルを開いてフレームが青破線で表示されることを確認
- [ ] 単一PNMLの `.maiml` ファイルを開いてフレームが表示されないことを確認（既存動作に影響なし）
- [ ] フレーム内ノードがエッジで正しく接続されていることを確認

---

## 承認記録

- **計画書提示日時**: 2026-03-02 09:09
- **承認日時**: 
- **承認者コメント**: 

# タスク計画書: PetriNetEditor ノード削除バグ修正

## メタデータ
- **作成日時**: 2026-04-13 10:31
- **更新日時**: 2026-04-13 10:59（テンプレート方針変更を反映）
- **タスクID**: petri-node-delete-bugfix
- **優先度**: 中
- **推定工数**: 2時間

---

## 1. タスク概要

`frontend/src/components/editorv2/PetriNetEditorInner.tsx` のノード削除処理に以下の2つの問題がある。

1. **PropertyPanel 経由の削除でエッジが残存する**（`handleDeleteNode`）
2. **ノード削除時にテンプレートとノードの紐づきが解除されない**（`handleNodesDelete` / `handleDeleteNode`）

> **方針（2026-04-13 確認済み）**：  
> ノードを削除したときにテンプレート自体は削除しない。  
> テンプレートに対してノードとの紐づけ（placeRef）のみを解除する。

reference 実装（`frontend/src/reference/components/PetriNetEditorV2/PetriNetEditorInner.jsx`）も同様の問題を持つが、現行実装（TypeScript版）を優先して修正し、reference は踏襲しない。

---

## 2. 現状の問題詳細

### 問題①：PropertyPanel からのノード削除でエッジが残存

**該当箇所**：`PetriNetEditorInner.tsx` 行 1094〜1107

```ts
const handleDeleteNode = useCallback((nodeId: string) => {
  setNodes((nds) => {
    const newNodes = nds.filter(n => n.id !== nodeId);
    pushState({ nodes: newNodes, edges }); // ← エッジはそのまま
    return newNodes;
  });
  setSelectedNode(null);
}, [setNodes, edges, pushState, onContentChange]);
```

**問題**：ノードは削除されるが、そのノードを `source` または `target` に持つエッジが削除されない。  
**結果**：孤立エッジ（source/target が存在しないエッジ）が残存し、保存時の MAIML 変換で不正な arc が生成される可能性がある。

---

### 問題②：ノード削除時にテンプレートの placeRef 紐づきが解除されない

**該当箇所**：`handleNodesDelete`（行 1063）・`handleDeleteNode`（行 1094）の両方

**問題**：ノード（place）は削除されるが、そのノードに紐づく `materialTemplate` / `conditionTemplate` / `resultTemplate` の `placeRef` が TemplateContext 上で残り続ける。  
**結果**：テンプレートが削除済みノードの placeRef を持ち続けるため、MAIML 変換時に不正な参照が生成される可能性がある。

**確認済み方針**：テンプレート自体は削除せず、対象ノードとの placeRef 紐づきのみ解除する。

---

## 3. 修正方針

### 修正①：`handleDeleteNode` にエッジ削除を追加

`handleNodesDelete` と同様のロジックで、対象ノードに接続されたエッジを特定して削除する。

**修正イメージ**：

```ts
const handleDeleteNode = useCallback((nodeId: string) => {
  // 接続エッジを特定
  const affectedEdges = edges.filter(e =>
    e.source === nodeId || e.target === nodeId
  );

  // エッジを削除
  setEdges(eds => eds.filter(e => !affectedEdges.some(ae => ae.id === e.id)));

  // ノードを削除 + 履歴追加
  setNodes(nds => {
    const newNodes = nds.filter(n => n.id !== nodeId);
    const newEdges = edges.filter(e => !affectedEdges.some(ae => ae.id === e.id));
    pushState({ nodes: newNodes, edges: newEdges });
    return newNodes;
  });

  onContentChange?.();
  setSelectedNode(null);
}, [edges, setEdges, setNodes, pushState, onContentChange]);
```

---

### 修正②：ノード削除時にテンプレートの placeRef 紐づきを解除

ノード削除時に、削除ノードの nodeId を含む placeRef をテンプレートから除去する。  
テンプレート自体（`TemplateContext` 上のエントリ）は削除しない。

**対象テンプレートの特定方法**：
- `node.data.templateRef?.id` または `node.data.template?.id` でテンプレート ID を取得
- `window.clineUpdateTemplate(templateId, updatedTemplate)` を呼び出して placeRef を除去

**修正イメージ**（`handleNodesDelete` / `handleDeleteNode` 共通ヘルパーとして整理）：

```ts
const unlinkTemplateFromNode = useCallback((targetNodes: Node<NodeData>[]) => {
  targetNodes.forEach(node => {
    // transition はテンプレートなし
    if (node.data.nodeType === 'transition') return;

    const templateId = node.data.template?.id ?? node.data.templateRef?.id;
    if (!templateId) return;

    // TemplateContext から現在のテンプレートを取得
    const currentTemplate = allTemplates?.find(t => t.id === templateId);
    if (!currentTemplate) return;

    // placeRef から削除ノードの ID を除去
    const updatedTemplate = {
      ...currentTemplate,
      placeRef: (currentTemplate.placeRef ?? []).filter(
        (ref: XsdPlaceRef) => ref.idref !== node.id
      ),
    };

    if (window.clineUpdateTemplate) {
      window.clineUpdateTemplate(templateId, updatedTemplate);
      console.log('🔗 [unlinkTemplateFromNode] placeRef解除:', templateId, node.id);
    }
  });
}, [allTemplates]);
```

このヘルパーを `handleNodesDelete` と `handleDeleteNode` の両方から呼び出す。

---

## 4. 影響範囲

### 変更するファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | `handleDeleteNode` にエッジ削除ロジックを追加、`unlinkTemplateFromNode` ヘルパー追加、`handleNodesDelete` / `handleDeleteNode` から呼び出し追加 |

### 影響を受ける機能

- PropertyPanel のノード削除ボタン → 接続エッジも削除されるようになる
- Delete キーによるノード削除 → テンプレートの placeRef 紐づきが解除されるようになる
- PropertyPanel のノード削除ボタン → テンプレートの placeRef 紐づきが解除されるようになる
- Undo/Redo（履歴管理） → エッジ削除が正しく履歴に記録されるようになる

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| `allTemplates` が空の場合に処理スキップされる | 低 | 低 | null チェックを追加してスキップ |
| Undo 時に placeRef が戻らない | 中 | 高 | 今回は placeRef Undo は対象外とし TODO コメントを残す |
| `window.clineUpdateTemplate` が未初期化の場合 | 低 | 低 | null チェック済み（既存ロジックを踏襲） |
| Undo 時にエッジが戻らない | 低 | 低 | `pushState` で履歴に記録するため問題なし |

> **注意**: placeRef 解除の Undo 対応は TemplateContext の履歴管理が必要なため、今回は対象外とする。TODO として残す。

---

## 6. テスト計画

### 手動テスト（修正後に確認）

| No | テストシナリオ | 期待結果 |
|---|---|---|
| 1 | PropertyPanel の削除ボタンでノードを削除（エッジあり） | ノードと接続エッジが両方削除される |
| 2 | PropertyPanel の削除ボタンでノードを削除（エッジなし） | ノードのみ削除される |
| 3 | Delete キーでノードを削除（エッジあり） | 接続エッジも削除される（既存動作に変化なし） |
| 4 | Material/Condition/Result ノードを削除後、TemplateList を確認 | テンプレート自体は残存し、placeRef から削除ノードの idref が除去されている |
| 5 | Transition ノードを削除 | 接続エッジのみ削除される（テンプレート処理はスキップ） |
| 6 | ノード削除後 Ctrl+Z（Undo） | ノードとエッジが戻る（placeRef は戻らない） |
| 7 | エッジのみを Delete キーで削除 | エッジのみ削除される（ノード・テンプレートは残る） |

---

## 7. 実装ステップ

- [ ] `unlinkTemplateFromNode` ヘルパー関数を追加（transition 除外・placeRef 更新ロジック含む）
- [ ] `handleNodesDelete` に `unlinkTemplateFromNode` 呼び出しを追加
- [ ] `handleDeleteNode` にエッジ削除ロジックを追加
- [ ] `handleDeleteNode` に `unlinkTemplateFromNode` 呼び出しを追加
- [ ] placeRef Undo が対象外である旨を TODO コメントとして記載

---

## 8. 承認記録

- **計画書提示日時**: 2026-04-13 10:59
- **承認日時**: 
- **承認者コメント**: 

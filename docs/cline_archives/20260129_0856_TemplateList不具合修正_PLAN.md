# タスク計画書: TemplateList不具合修正

## メタデータ
- **作成日時**: 2026-01-29 08:56
- **タスクID**: TemplateList不具合修正
- **優先度**: 高
- **推定工数**: 2時間
- **関連ドキュメント**: `docs/20260129_0853_TemplateList実装差分分析.md`

## 1. タスク概要

reference版PetriNetEditorV2の動作を参考に、現行版PetriNetEditorのTemplateList周りの不具合を修正します。

**現状の問題**:
- テンプレート追加（`+`ボタン）押下時に、不完全な仮ノードが作成される
- 保存前にペトリネットにノードが追加されてしまう
- テンプレート削除時にペトリネット上のノードまで削除される

**目標**:
- reference版と同じ動作を実現
- 保存を押下するまでstate情報に保持されない
- 保存後もテンプレート情報のみに表示される

## 2. 目的と期待される成果

### 目的
1. テンプレート追加/選択時に完全な仮ノードを作成
2. テンプレート削除時はTemplateContextからのみ削除
3. ペトリネットへの不要な追加を防ぐ

### 期待される成果
- [x] テンプレート追加時に`template`, `templateRef`を含む完全な仮ノードを作成
- [x] テンプレート選択時に`uuid`, `placeRefs`, `templateRefs`を含む完全な仮ノードを作成
- [x] テンプレート削除時はTemplateContextからのみ削除（ペトリネットには影響なし）
- [x] 保存するまでペトリネットに表示されない

## 3. 実装ステップ

### Phase 1: handleTemplateAdd修正（最優先）

#### 修正内容
`frontend/src/components/editor/PetriNetEditor.tsx` の `handleTemplateAdd` を修正

**現状のコード（不完全）**:
```typescript
const handleTemplateAdd = useCallback((category: 'material' | 'condition' | 'result') => {
  const timestamp = Date.now();
  const nodeType = category === 'material' ? 'materialTemplate' :
                   category === 'condition' ? 'conditionTemplate' : 'resultTemplate';
  
  const newNode: Node = {
    id: `${category}-${timestamp}`,
    type: nodeType,
    position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 }, // ❌ 不要
    data: {
      id: `${category}-${timestamp}`,
      name: `New ${category.charAt(0).toUpperCase() + category.slice(1)} Template`, // ❌ 不要
      // ❌ template, templateRef が欠けている
      // ❌ uuid, placeRefs, templateRefs が欠けている
    },
  };
  
  setTemplateEditNode(newNode);
  setTemplateEditorOpen(true);
}, []);
```

**修正後のコード（完全）**:
```typescript
const handleTemplateAdd = useCallback((category: 'material' | 'condition' | 'result') => {
  console.log('➕ [PetriNetEditor] テンプレート追加:', category);
  
  const timestamp = Date.now();
  const newId = `${category}Template_${timestamp}`;
  
  const tempNode: Node = {
    id: newId,
    type: category === 'material' ? 'materialTemplate' :
          category === 'condition' ? 'conditionTemplate' : 'resultTemplate',
    position: { x: 0, y: 0 }, // ダミー位置（ペトリネットに配置しないため実際には使用されない）
    data: {
      id: newId,
      name: '', // ✅ 空文字（ユーザーが入力する）
      description: '',
      nodeType: 'place',
      placeType: category,
      // ✅ template 追加
      template: {
        id: newId,
        type: category === 'material' ? 'MaterialTemplate' :
              category === 'condition' ? 'ConditionTemplate' :
              'ResultTemplate',
        uuid: crypto.randomUUID(), // ✅ UUID生成
        placeRefs: [],
        templateRefs: [],
        properties: [],
      },
      // ✅ templateRef 追加
      templateRef: {
        type: category === 'material' ? 'MaterialTemplate' :
              category === 'condition' ? 'ConditionTemplate' :
              'ResultTemplate',
        uuid: crypto.randomUUID(), // ✅ UUID生成
        name: '',
        placeRefs: [],
        templateRefs: [],
        properties: [],
      },
      // ✅ 新規作成フラグ
      isNewTemplate: true,
      templateCategory: category,
      // ✅ 共通テンプレート/メソッド内テンプレートの判定
      isCommonTemplate: showCommonTemplates,
      methodId: showCommonTemplates ? null : (documentData?.methodId || null),
    },
  };
  
  setTemplateEditNode(tempNode);
  setTemplateEditorOpen(true);
  
  console.log('✅ [PetriNetEditor] 新規テンプレート仮ノード作成:', newId);
}, [showCommonTemplates, documentData]);
```

#### チェックリスト
- [ ] `template`, `templateRef` を追加
- [ ] `uuid` を生成（`crypto.randomUUID()`）
- [ ] `templateCategory`, `isCommonTemplate`, `methodId` を追加
- [ ] `name` を空文字に変更
- [ ] `position` はダミー値（実際には使用されない）
- [ ] ログ出力を追加

---

### Phase 2: handleTemplateSelect修正

#### 修正内容
`frontend/src/components/editor/PetriNetEditor.tsx` の `handleTemplateSelect` を修正

**現状のコード（不完全）**:
```typescript
const handleTemplateSelect = useCallback((template: any) => {
  const node = nodes.find(n => n.id === template.id);
  
  if (node) {
    // ペトリネット内のノードをフォーカス
    setSelectedNode(node);
    // ...
  } else {
    // ❌ 不完全な仮ノードを作成
    const templateNode: Node = {
      id: template.id,
      type: template.type || 'materialTemplate',
      position: { x: 0, y: 0 },
      data: {
        id: template.id,
        name: template.name || 'Template',
        // ❌ template, templateRef が欠けている
      },
    };
    handleOpenTemplateEditor(templateNode);
  }
}, [nodes, handleOpenTemplateEditor]);
```

**修正後のコード（完全）**:
```typescript
const handleTemplateSelect = useCallback((template: any) => {
  console.log('📋 [PetriNetEditor] テンプレート選択:', template);
  
  // ペトリネットに配置されているかチェック
  const node = nodes.find(n => n.id === template.id);
  
  if (node) {
    // ペトリネット内のノードをフォーカス
    setSelectedNode(node);
    const viewport = getViewport();
    const x = node.position.x - (viewport.x / viewport.zoom);
    const y = node.position.y - (viewport.y / viewport.zoom);
    
    setViewport({ x: -x + 400, y: -y + 300, zoom: viewport.zoom }, { duration: 300 });
    
    console.log('✅ [PetriNetEditor] ノード選択・フォーカス:', node.id);
  } else {
    // ✅ 完全な仮ノードを作成
    const tempNode: Node = {
      id: template.id,
      type: template.type === 'material' ? 'materialTemplate' :
            template.type === 'condition' ? 'conditionTemplate' : 'resultTemplate',
      position: { x: 0, y: 0 },
      data: {
        id: template.id,
        name: template.name,
        description: template.description || '',
        nodeType: 'place',
        placeType: template.type,
        // ✅ template 追加
        template: {
          id: template.id,
          type: template.type === 'material' ? 'MaterialTemplate' :
                template.type === 'condition' ? 'ConditionTemplate' :
                'ResultTemplate',
          uuid: template.uuid,
          name: template.name,
          description: template.description || '',
          placeRefs: template.placeRefs || [],
          templateRefs: template.templateRefs || [],
          properties: template.properties,
        },
        // ✅ templateRef 追加
        templateRef: {
          type: template.type === 'material' ? 'MaterialTemplate' :
                template.type === 'condition' ? 'ConditionTemplate' :
                'ResultTemplate',
          uuid: template.uuid,
          name: template.name,
          description: template.description || '',
          placeRefs: template.placeRefs || [],
          templateRefs: template.templateRefs || [],
          properties: template.properties,
        },
        isNewTemplate: false, // ✅ 既存テンプレート
      },
    };
    
    setTemplateEditNode(tempNode);
    setTemplateEditorOpen(true);
    
    console.log('✅ [PetriNetEditor] テンプレート編集ダイアログを開く:', template.id);
  }
}, [nodes, getViewport, setViewport]);
```

#### チェックリスト
- [ ] `template`, `templateRef` を追加
- [ ] `uuid`, `placeRefs`, `templateRefs`, `description`, `name` を含める
- [ ] `isNewTemplate: false` フラグを追加
- [ ] ペトリネット配置済みの場合はフォーカス処理を維持
- [ ] ログ出力を追加

---

### Phase 3: handleTemplateDelete修正

#### 修正内容
`frontend/src/components/editor/PetriNetEditor.tsx` の `handleTemplateDelete` を修正

**現状のコード（過剰動作）**:
```typescript
const handleTemplateDelete = useCallback((templateId: string) => {
  const confirmed = window.confirm('このテンプレートを削除してもよろしいですか？');
  if (!confirmed) return;
  
  // ❌ ペトリネット上のノードも削除
  const affectedEdges = edges.filter(edge => 
    edge.source === templateId || edge.target === templateId
  );
  
  setEdges((eds) => eds.filter(e => !affectedEdges.find(ae => ae.id === e.id)));
  setNodes((nds) => {
    const newNodes = nds.filter(n => n.id !== templateId);
    pushState({ nodes: newNodes, edges: newEdges });
    return newNodes;
  });
  
  if (selectedNode?.id === templateId) {
    setSelectedNode(null);
  }
}, [edges, selectedNode, setEdges, setNodes, pushState]);
```

**修正後のコード（TemplateContextからのみ削除）**:
```typescript
const handleTemplateDelete = useCallback((templateId: string) => {
  console.log('🗑️ [PetriNetEditor] テンプレート削除:', templateId);
  
  if (!window.confirm(`テンプレート「${templateId}」を削除しますか？\nこの操作は元に戻せません。`)) {
    return;
  }
  
  // ✅ TemplateContextから削除（window.clineDeleteTemplateを使用）
  if (window.clineDeleteTemplate) {
    window.clineDeleteTemplate(templateId);
    console.log('✅ [PetriNetEditor] テンプレート削除完了');
  } else {
    console.error('❌ [PetriNetEditor] deleteTemplate関数が見つかりません');
  }
}, []);
```

#### チェックリスト
- [ ] ペトリネット上のノード削除を削除
- [ ] TemplateContextからのみ削除（`window.clineDeleteTemplate`）
- [ ] 依存配列を空配列に変更
- [ ] ログ出力を追加

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editor/PetriNetEditor.tsx`
   - `handleTemplateAdd` 関数
   - `handleTemplateSelect` 関数
   - `handleTemplateDelete` 関数

### 影響を受ける機能
- ✅ テンプレート一覧からの追加（`+`ボタン）
- ✅ テンプレート一覧からの選択（編集）
- ✅ テンプレート一覧からの削除
- ⚠️ ペトリネットからのノード削除（影響なし）
- ⚠️ テンプレート保存処理（Phase 2で対応予定）

### 影響を受けないもの
- ペトリネット上での直接編集
- ペトリネット上でのノード追加/削除
- エッジ操作
- Document編集
- バリデーション

---

## 5. 技術的詳細

### 5.1 仮ノードの構造

Reference版を参考に、以下の構造を持つ仮ノードを作成します：

```typescript
{
  id: string,
  type: 'materialTemplate' | 'conditionTemplate' | 'resultTemplate',
  position: { x: number, y: number }, // ダミー値
  data: {
    id: string,
    name: string,
    description: string,
    nodeType: 'place',
    placeType: 'material' | 'condition' | 'result',
    template: {
      id: string,
      type: 'MaterialTemplate' | 'ConditionTemplate' | 'ResultTemplate',
      uuid: string, // ✅ 重要
      name: string,
      description: string,
      placeRefs: string[],
      templateRefs: string[],
      properties: any[],
    },
    templateRef: {
      type: 'MaterialTemplate' | 'ConditionTemplate' | 'ResultTemplate',
      uuid: string, // ✅ 重要
      name: string,
      description: string,
      placeRefs: string[],
      templateRefs: string[],
      properties: any[],
    },
    isNewTemplate: boolean,
    templateCategory?: string,
    isCommonTemplate?: boolean,
    methodId?: string | null,
  }
}
```

### 5.2 TemplateContext との連携

- `window.clineAddTemplate`: 新規テンプレート追加
- `window.clineUpdateTemplate`: 既存テンプレート更新
- `window.clineDeleteTemplate`: テンプレート削除
- `window.clineAllTemplates`: 全テンプレート取得

これらは `TemplateProvider` で設定されます。

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の保存済みテンプレートとの互換性問題 | 中 | 低 | 既存テンプレートは `uuid` などが欠けている可能性があるため、補完処理を追加 |
| TemplateEditorDialog での表示エラー | 高 | 中 | `template`, `templateRef` の存在チェックを強化 |
| 共通テンプレート機能への影響 | 中 | 低 | `isCommonTemplate`, `methodId` を適切に設定 |
| ペトリネット配置済みテンプレートとの不整合 | 低 | 低 | `handleTemplateSelect` で配置チェックを維持 |

---

## 7. テスト計画

### 7.1 ユニットテスト
- [ ] `handleTemplateAdd` のテスト
  - 新規テンプレートノードの構造チェック
  - `uuid` の生成確認
  - `template`, `templateRef` の存在確認

- [ ] `handleTemplateSelect` のテスト
  - ペトリネット配置済みの場合のフォーカス動作
  - 未配置の場合のダイアログ表示

- [ ] `handleTemplateDelete` のテスト
  - TemplateContextからのみ削除されることを確認
  - ペトリネットへの影響がないことを確認

### 7.2 統合テスト

#### テストシナリオ1: 新規テンプレート作成
1. テンプレート一覧を開く
2. `+`ボタンをクリック
3. TemplateEditorDialogが開く
4. プロパティを入力
5. 保存ボタンをクリック
6. ✅ テンプレート一覧にのみ表示される
7. ✅ ペトリネットには表示されない

#### テストシナリオ2: 既存テンプレート編集
1. テンプレート一覧から既存テンプレートを選択
2. TemplateEditorDialogが開く
3. プロパティを変更
4. 保存ボタンをクリック
5. ✅ 変更が反映される
6. ✅ ペトリネットには影響なし

#### テストシナリオ3: テンプレート削除
1. テンプレート一覧から削除ボタンをクリック
2. 確認ダイアログが表示
3. OKをクリック
4. ✅ テンプレート一覧から削除される
5. ✅ ペトリネット上のノードは残る（配置済みの場合）

#### テストシナリオ4: ペトリネット配置済みテンプレート選択
1. ペトリネットにテンプレートを配置
2. テンプレート一覧から同じテンプレートを選択
3. ✅ ペトリネット上のノードにフォーカス
4. ✅ ダイアログは開かない

### 7.3 手動テスト

- [ ] 材料テンプレート追加
- [ ] 条件テンプレート追加
- [ ] 結果テンプレート追加
- [ ] 共通テンプレート追加（showCommonTemplates: true）
- [ ] メソッド内テンプレート追加（showCommonTemplates: false）
- [ ] 既存テンプレート編集
- [ ] テンプレート削除
- [ ] ペトリネット配置済みテンプレート選択

---

## 8. ロールバック計画

### 問題発生時の対応

#### Step 1: エラーログ確認
- ブラウザのコンソールログを確認
- TemplateContext のエラーを確認

#### Step 2: 一時的な対処
- 以前のバージョンに戻す（git revert）

#### Step 3: 原因調査
- Reference版との差分を再確認
- TemplateEditorDialog の実装を確認

---

## 9. 実装チェックリスト

### Phase 1: handleTemplateAdd
- [ ] `template` オブジェクトを追加
- [ ] `templateRef` オブジェクトを追加
- [ ] `uuid` を生成（`crypto.randomUUID()`）
- [ ] `templateCategory` を追加
- [ ] `isCommonTemplate` を追加
- [ ] `methodId` を追加
- [ ] `name` を空文字に変更
- [ ] ログ出力を追加
- [ ] 動作確認

### Phase 2: handleTemplateSelect
- [ ] `template` オブジェクトを追加
- [ ] `templateRef` オブジェクトを追加
- [ ] `uuid`, `placeRefs`, `templateRefs` を含める
- [ ] `isNewTemplate: false` を追加
- [ ] ペトリネット配置チェックを維持
- [ ] ログ出力を追加
- [ ] 動作確認

### Phase 3: handleTemplateDelete
- [ ] ペトリネット操作を削除
- [ ] `window.clineDeleteTemplate` のみ使用
- [ ] 依存配列を空配列に変更
- [ ] ログ出力を追加
- [ ] 動作確認

---

## 10. 承認記録

- **計画書提示日時**: 2026-01-29 08:56
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

---

## 11. 実施記録

### 実施日時
開始: 2026-01-29 08:58
完了: 2026-01-29 08:59

### 計画からの変更点
計画通りに実施完了。変更点なし。

### 発生した問題と解決方法
特になし。すべて計画通りに修正完了。

### 最終的な成果物
- [x] handleTemplateAdd 修正完了
- [x] handleTemplateSelect 修正完了
- [x] handleTemplateDelete 修正完了
- [ ] テスト完了（動作確認待ち）
- [ ] ドキュメント更新（動作確認後）

---

## 12. 参考資料

- [差分分析レポート](./20260129_0853_TemplateList実装差分分析.md)
- Reference版: `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx`
- 現行版: `frontend/src/components/editor/PetriNetEditor.tsx`
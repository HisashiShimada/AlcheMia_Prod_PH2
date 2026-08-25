# 調査レポート: TemplateEditorDialog Insertion情報 再表示失敗

## メタデータ
- **作成日時**: 2026-07-28 17:07
- **タスクID**: TemplateEditorDialog_Insertion保存修正
- **優先度**: 高
- **ステータス**: ✅ 修正完了・動作確認済み（2026-07-29）

---

## 1. 問題概要

`TemplateEditorDialog` にてInsertionのファイル添付をした後に保存して、再度同じテンプレートを開いた場合、**Insertion情報欄が空で表示される**。

ユーザーの仮説：
- windowのTemplateの更新は正常
- `TemplateEditorDialog` の初期表示（state設定）が正常にできていない可能性

---

## 2. 調査済み内容

### 2-1. Insertionの初期化箇所（確認済み）

**ファイル**: `frontend/src/components/editorv2/TemplateEditorDialog.tsx`

```typescript
// 行 126: insertion state 定義
const [insertion, setInsertion] = useState<Insertion>({ uri: '', hash: { method: '', value: ''}, format: '' });

// 行 305-313: ダイアログを開いた時の初期化
useEffect(() => {
  if (open && node && mergedTemplate) {
    setTemplateId(mergedTemplate.id || '');
    // ...
    setInsertion(mergedTemplate.insertion || { uri: '', hash: {method : '', value: ''}, format: '' });
    // ...
  }
}, [open, node, mergedTemplate]);
```

**ポイント**: `setInsertion` は `mergedTemplate.insertion` から値を取得する。`mergedTemplate.insertion` が `undefined` の場合、空のオブジェクトにフォールバックされる。

---

### 2-2. mergedTemplate の計算箇所（確認済み）

**ファイル**: `frontend/src/components/editorv2/TemplateEditorDialog.tsx` (行 239-257)

```typescript
const mergedTemplate: Template | null = useMemo((): Template | null => {
  if (!node) return null;
  
  const template = (node.data.template || {}) as Partial<Template>;
  const templateRef = (node.data.templateRef || {}) as Partial<Template>;
  
  return {
    id: template.id || templateRef.id || '',
    // ...
    insertion: template.insertion || templateRef.insertion,  // ← ここが空になっている可能性
    // ...
  };
}, [node]);
```

**ポイント**: `mergedTemplate.insertion` は `node.data.template.insertion` または `node.data.templateRef.insertion` から取得される。

---

### 2-3. TemplateEditorDialogへ渡す node（確認済み）

**ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

ダイアログを開く際に `handleOpenTemplateEditor` が呼ばれ、`setTemplateEditNode(nodeWithMethodId)` でダイアログに渡すnodeをセットする。

```typescript
// 行 1657-1684
const handleOpenTemplateEditor = useCallback((node: Node<NodeData>) => {
  // methodId補完
  const nodeWithMethodId: Node<NodeData> = {
    ...node,
    data: {
      ...node.data,
      methodId: isCommon ? null : (node.data.methodId ?? currentMethodId ?? null),
    },
  };

  setTemplateEditNode(nodeWithMethodId);  // ← ここでセット
  setTemplateEditorOpen(true);
}, [methods, activeMethodIndex]);
```

**ポイント**: `node.data.template` および `node.data.templateRef` はスプレッド演算子でそのまま引き継がれる。

---

### 2-4. handleSaveTemplate での Node 更新（部分確認）

**ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx` (行 1880前後)

保存時に `setNodes` でノードのデータを更新している。更新内容（`newTemplateForContext`）に `insertion` が含まれているかどうかが問題の核心だが、**この部分は時間内に完全な確認ができなかった**。

確認した箇所:
```typescript
// 行 1880-1888: ノード更新
return {
  ...node,
  data: {
    ...node.data,
    template: newTemplateForContext,
    templateRef: newTemplateForContext,
    isCommonTemplate: isCommonTemplate,
    commonTemplateRef: isCommonTemplate ? templateId : node.data.commonTemplateRef,
  },
};
```

**`newTemplateForContext` の構築箇所**（未確認 → 要調査）

---

### 2-5. TemplateContext の updateTemplate（確認済み）

**ファイル**: `frontend/src/contexts/TemplateContext.tsx` (行 257-279)

```typescript
const updateTemplate = useCallback((templateId: string, updatedTemplate: Template) => {
  setTemplates((prevTemplates) => {
    const updated = { ...prevTemplates };
    (['material', 'condition', 'result'] as const).forEach((category) => {
      const index = updated[category].findIndex((t) => t.id === templateId);
      if (index !== -1) {
        updated[category][index] = updatedTemplate;
      }
    });
    return updated;
  });
}, []);
```

**ポイント**: TemplateContext の更新ロジック自体は問題なさそう（`updatedTemplate` をそのままセットしている）。

---

### 2-6. TemplateContext の初期化（潜在的問題）

**ファイル**: `frontend/src/contexts/TemplateContext.tsx` (行 64-93)

```typescript
// テンプレート抽出（maimlData変更時）
useEffect(() => {
  if (maimlData) {
    const parser = new MaimlParserTyped(maimlData);
    const extracted = parser.getTemplates();
    setTemplates(extracted);  // ← maimlDataが変わるたびにリセットされる
  }
}, [maimlData]);
```

**ポイント**: `maimlData` が変わると `setTemplates` でContextのテンプレートがXMLから再パースされてリセットされる。もし保存後に `maimlData` が更新されると、`updateTemplate` で更新したContextの内容が上書きされる可能性がある。

---

## 3. 原因の仮説

### 仮説A（最有力）: `newTemplateForContext` に `insertion` が含まれていない

`handleSaveTemplate` で `newTemplateForContext` を構築する際に、`insertion` フィールドが含まれていない場合、保存後に同テンプレートを開くと `node.data.template.insertion` が `undefined` になり、Insertionが空で表示される。

### 仮説B: `maimlData` 更新による TemplateContext リセット

保存後に `maimlData` が更新される場合、TemplateContext の `useEffect` が発火してXMLから再パースされる。もしXMLへのserialize（`reactFlowToMaiml.ts` や `multiMethodConverter.ts`）時に `insertion` が正しく出力されていない場合、TemplateContextのデータが上書きされてinsertionが消える。

### 仮説C: `window.clineAllTemplates` vs TemplateContext の不整合

`TemplateEditorDialog.tsx` の `inheritedTemplate` 計算では `window.clineAllTemplates` を参照しているが、テンプレートの実際の表示は `node.data.template` を参照している。更新タイミングのズレがある可能性。

---

## 4. 未調査の重要箇所（続き調査が必要）

### 4-1. `newTemplateForContext` の構築箇所（最重要）

`PetriNetEditorInner.tsx` の `handleSaveTemplate` 内で `newTemplateForContext` がどのように構築されているかを確認する。具体的には `insertion` フィールドが引き継がれているか。

**調査箇所**: `PetriNetEditorInner.tsx` 行 1692〜1880 あたり

```
// 特に以下のような箇所を探す
const newTemplateForContext: Template = {
  id: ...,
  insertion: ...,  // ← ここに insertion があるか
  ...
};
```

### 4-2. `handleSaveTemplate` の呼び出し引数

`TemplateEditorDialog.tsx` の `onSave` コールバックで `insertion` が正しく `templateRef` に含まれて渡されているか確認。

**調査箇所**: `TemplateEditorDialog.tsx` 行 1000〜1260（handleSave 内）

確認済みの関連コード:
```typescript
// 行 1016
insertion: insertion,  // ← handleSave の return object に含まれている

// 行 1171-1173
if (insertion.uri || insertion.hash || insertion.format)
  templateRefFromXml.insertion = insertion;

// 行 1253-1254
if (insertion.uri || insertion.hash || insertion.format)
  templateRef.insertion = insertion;
```

**注意**: 行 1171と1253 の条件 `insertion.uri || insertion.hash || insertion.format` が `false` の場合（例: uri='', hash={}, format='' のデフォルト値）、`insertion` が templateRef にセットされない可能性がある。しかし、ファイル添付後はuriが入るはずなので通常は問題ないはず。

### 4-3. `window.clineAllTemplates` へのセット

`PetriNetEditorInner.tsx` で `window.clineAllTemplates = allTemplates` とセットされている。この `allTemplates` は `TemplateContext` の `allTemplates`（`filteredTemplates` でなく全テンプレート）。更新が正しく伝播しているか確認が必要。

### 4-4. MAIMLのXML serialize での insertion 出力

保存→再読み込み時に、XML中に `<insertion>` 要素が正しく含まれているか確認。

**調査箇所**:
- `frontend/src/utils/reactFlowToMaiml.ts` (確認済みで insertion 出力あり)
- `frontend/src/utils/multiMethodConverter.ts` (確認済みで insertion 出力あり)
- ただし `template.insertion.hash?.value` の参照で `hash` が `{}` の場合に空文字が出力されるか確認

---

## 5. 推奨調査手順（次のセッション）

### Step 1: `newTemplateForContext` の確認（最優先）

```
grep -n "newTemplateForContext" frontend/src/components/editorv2/PetriNetEditorInner.tsx
```

→ `insertion` が含まれているか確認

### Step 2: `handleSave` の全体フロー確認

`TemplateEditorDialog.tsx` の `handleSave` 関数（行1000前後）を全体的に読み、`insertion` を含む `templateRef` オブジェクトが正しく `onSave` に渡されているか確認。

### Step 3: デバッグログ追加（確認できない場合）

以下の箇所にログを追加して動作確認:

```typescript
// TemplateEditorDialog.tsx - useEffect内
console.log('🔍 [TemplateEditorDialog] insertion初期化:', {
  'node.data.template.insertion': node.data.template?.insertion,
  'node.data.templateRef.insertion': node.data.templateRef?.insertion,
  'mergedTemplate.insertion': mergedTemplate.insertion,
});

// PetriNetEditorInner.tsx - handleSaveTemplate内
console.log('🔍 [handleSaveTemplate] newTemplateForContext.insertion:', newTemplateForContext.insertion);
```

---

## 6. 関連ファイル一覧

| ファイル | 役割 | 状態 |
|---------|------|------|
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | ダイアログ本体・insertion state管理 | 調査済み |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | handleSaveTemplate・node更新 | 部分調査 |
| `frontend/src/contexts/TemplateContext.tsx` | Template状態管理・updateTemplate | 調査済み |
| `frontend/src/utils/petriNetExtractor.ts` | buildTemplateMap・insertion コピー | 調査済み |
| `frontend/src/utils/maimlParserTyped.ts` | getTemplates・XML解析 | 部分調査 |
| `frontend/src/utils/reactFlowToMaiml.ts` | XML serialize（insertion出力あり） | 調査済み |
| `frontend/src/utils/multiMethodConverter.ts` | マルチメソッドXML serialize | 調査済み |
| `frontend/src/components/common/InsertionEditorForm.tsx` | Insertion UI コンポーネント | 調査済み |

---

## 7. 補足メモ

- `petriNetExtractor.ts` には過去に「insertionコピー漏れ」の修正が入っている（`// ✅ Fix: insertionコピー漏れを修正` コメントあり）。これは `buildTemplateMap` 内の問題であり、今回の問題（ダイアログ再オープン時）とは別の可能性が高い。
- TemplateEditorDialogの `useEffect` の依存配列が `[open, node, mergedTemplate]` のため、`open=true` かつ `node` が変わらない場合（同じテンプレートを再オープン）でも `open` がtrue→false→trueと変化する場合は再実行される。問題が起きているのはこのタイミングで `mergedTemplate.insertion` が空になっているケースと推測。

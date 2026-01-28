# 現行 PetriNetEditor 分析レポート

## メタデータ
- **作成日時**: 2026-01-28 14:05
- **対象ファイル**: `frontend/src/components/editor/PetriNetEditor.tsx`
- **バージョン**: 3.0.0
- **作成日**: 2025-12-23
- **言語**: TypeScript (TSX)
- **UIライブラリ**: Ant Design v6

---

## 1. ファイル構成

### 1.1. エントリーポイント
**コンポーネント**: `PetriNetEditor`
- ReactFlowProviderでラップ
- TemplateProviderでもラップ（2重構造）
- propsをPetriNetEditorInnerに渡す

### 1.2. メインロジック
**コンポーネント**: `PetriNetEditorInner`
- 約1,400行（reference版の半分）
- TypeScript化により型安全性を確保

---

## 2. コンポーネント構造

### 2.1. Props定義（TypeScript）
```typescript
interface PetriNetEditorProps {
  maimlData?: string;           // MAIMLコンテンツ
  onError?: (error: Error) => void;
  editingFileName?: string;     // 編集中のファイル名
  editMode?: 'normal' | 'draft';
  originalFileName?: string;    // 元のファイル名
  sourceS3Key?: string;         // S3キー
  // Phase 6追加
  initialContent?: string;      // maimlDataのエイリアス
  projectId?: string;           // プロジェクトID
  projectName?: string;         // プロジェクト名
  onSave?: (content: string) => Promise<void>;
  onContentChange?: () => void;
  // フォーマット管理統合用
  sourceContext?: 'project' | 'format'; // デフォルト: 'project'
}
```

### 2.2. State管理（主要なもの）

#### エディタ状態
- `nodes`, `edges`: React Flow状態（useNodesState, useEdgesState使用）
- `isLoading`, `error`: ローディング・エラー状態
- `selectedTool`: 'select' | 'workflow'
- `selectedNode`, `selectedEdge`, `selectedNodes`: 選択状態
- `clipboard`: コピー&ペースト用
- `pressedKeys`: キーボード状態（Set<string>型）

#### ビューモード（reference版と異なる）
- `editorMode`: **'petri-net' | 'template'**（reference版はviewMode）
  - 注意: propsの`editMode`（'normal' | 'draft'）とは別変数
- `showTemplateList`: テンプレート一覧表示フラグ
- `showCommonTemplates`: 共通テンプレート表示フラグ
- `categorizedTemplates`: カテゴリ別テンプレートデータ
- `commonTemplatesData`: 共通テンプレートデータ

#### Phase 5追加
- `showArcLabels`: アーク属性表示トグル

#### ダイアログ状態（reference版と同じ）
- `saveConfirmDialogOpen`: 保存確認ダイアログ
- `validationPanelOpen`: バリデーションパネル
- `templateEditorOpen`: テンプレート編集
- `documentDialogOpen`: ドキュメント編集
- `workflowDialogOpen`: ワークフロー選択
- `draftManagerOpen`: Draft管理

#### バリデーション/保存
- `validationResult`: バリデーション結果
- `isValidating`, `isCorrecting`, `isSaving`: 処理中フラグ
- **注意**: reference版の`criticalErrors`, `nonCriticalErrors`は未実装

#### 複数Method管理
- `methods`: MethodData[]（型定義あり）
- `activeMethodIndex`: アクティブなMethodインデックス
- `multiMethodMode`: 複数Methodモードフラグ

#### Document/Draft
- `documentData`: DocumentData型（import経由）
- `availableFiles`: 利用可能ファイル一覧
- `pendingClickPosition`: クリック位置保持
- `draftModeHandled`: Draft処理済みフラグ

### 2.3. テンプレート一覧表示用State（現行版独自）
```typescript
const [categorizedTemplates, setCategorizedTemplates] = useState<CategorizedTemplates>({
  material: [],
  condition: [],
  result: []
});
const [commonTemplatesData, setCommonTemplatesData] = useState<CategorizedTemplates>({
  material: [],
  condition: [],
  result: []
});
const [templateErrors, setTemplateErrors] = useState<Record<string, TemplateError[]>>({});
```

---

## 3. 主要機能

### 3.1. データ読み込み（useEffect）

#### 新規作成モード
```typescript
if (!effectiveMaimlData) {
  // sourceContextに応じてベース名を決定
  const baseName = sourceContext === 'format' && editingFileName 
    ? editingFileName.replace(/\.maiml$/, '') 
    : projectName;
  
  // 空のDocumentDataを作成
  // sourceContext === 'project' の場合のみfillMissingDocumentFieldsで補完
  const initialDocumentData = sourceContext === 'project'
    ? fillMissingDocumentFields(emptyDocumentData, baseName)
    : emptyDocumentData;
}
```

#### 既存ファイル読み込み（reference版と異なる）
1. **新API使用**: `/api/v1/maiml/parse-petri-net-structure`
   - 認証トークン必須（`Authorization: Bearer ${token}`）
   - レスポンス形式変更: `{ success, data: { success, isMultiMethod, methods, ... } }`

2. **フォールバック処理**
   - reference版の複数Method APIは使用しない
   - 直接 `parseMaimlToPetriNet()` でパース

3. **データ変換**
   - `parseMaimlToPetriNet()`: 直接MAIMLパース
   - `convertToReactFlow()`: React Flow形式に変換
   - reference版の`buildTemplateMap()`は使用しない

4. **自動バリデーション**
   - **未実装**（reference版では500ms後に実行）

#### sourceContext対応（現行版独自）
- `sourceContext='project'`: Document補完あり
- `sourceContext='format'`: Document補完なし（空のまま）

### 3.2. ノード操作（reference版とほぼ同じ）

#### ノード追加（3通りの方法）
1. **ツールバーボタン**: `handleAddNode(nodeType)`
2. **キーボードショートカット**: M/C/R/Tキー押下中にクリック
3. **キャンバスクリック**: `handlePaneClick()`

#### ノード削除
- `handleNodesDelete()`: 複数ノード削除対応
- `handleDeleteNode()`: PropertyPanelから単一削除
- 関連エッジも自動削除

#### ノードプロパティ更新
- `handleUpdateNodeProperty()`: データ更新
- **注意**: `handleUpdateNodeId()`は未実装（reference版にはある）

### 3.3. エッジ操作（reference版とほぼ同じ）

#### エッジ接続
- `handleConnect()`: addEdge()でエッジ追加
- MarkerType.ArrowClosed使用（reference版も同様）

#### エッジ削除
- `handleEdgesDelete()`: 複数エッジ削除
- `handleDeleteEdge()`: PropertyPanelから単一削除

#### エッジプロパティ更新
- `handleUpdateEdgeProperty()`: ID変更のみ対応

### 3.4. Undo/Redo機能（reference版と同じ）

**カスタムフック**: `useHistory`（同じパスからimport）

#### 履歴保存タイミング
- ノード追加/削除/移動後
- エッジ追加/削除後
- プロパティ更新後

#### 履歴との同期（重要な違い）
```typescript
// Reference版: history.presentと同期（コメントアウト）
// useEffect(() => {
//   if (history.present.nodes && history.present.edges) {
//     setNodes(history.present.nodes);
//     setEdges(history.present.edges);
//   }
// }, [history.present, setNodes, setEdges]);

// 現行版: このuseEffectが一時的にコメントアウトされている
```

#### ドラッグ終了後の履歴保存
```typescript
// Reference版と同じ実装
const handleNodeDragStop = useCallback((event, node) => {
  setTimeout(() => {
    pushState({ nodes, edges });
  }, 0);
}, [nodes, edges, pushState]);
```

### 3.5. コピー&ペースト（reference版と同じ）

#### コピー（Ctrl+C）
- 単一ノード/複数ノード対応
- clipboardに保存

#### ペースト（Ctrl+V）
- 位置を50px右下にずらして貼り付け
- 新しいIDを自動生成
- 名前に "(Copy)" を追加

### 3.6. テンプレート管理（一部異なる）

#### テンプレート編集ダイアログ
- `handleOpenTemplateEditor()`: ダイアログを開く
  - **重要**: 履歴に保存（`pushState({ nodes, edges })`）
- `handleSaveTemplate()`: テンプレート保存
  - **簡略化**: 単に`handleUpdateNodeProperty()`を呼ぶのみ
  - reference版のような複雑な処理なし

#### Properties形式変換
- `convertNestedPropertiesToArray()`: reference版と同じ実装

#### TemplateContext連携
- **未実装**: グローバル関数（window.cline*）は使用しない
- TemplateProviderでラップしているが、連携コードなし

### 3.7. Document管理（reference版と類似）

#### Document編集
- `handleOpenDocumentEditor()`: ダイアログを開く
- `handleSaveDocument()`: Document情報を保存

#### Document自動初期化（sourceContext対応）
- `sourceContext='project'`: `fillMissingDocumentFields()`で補完
- `sourceContext='format'`: 補完なし

### 3.8. バリデーション機能（簡略化）

#### エラー分類
- **未実装**: reference版の`criticalErrors`, `nonCriticalErrors`分類なし

#### エラー視覚化
- **未実装**: reference版の`extractAffectedElements()`なし

#### バリデーション実行
- 手動実行のみ（`handleValidate()`）
- **注意**: ファイル読み込み後の自動実行なし
- モックAPI使用: `validateMaimlContent()`

### 3.9. 保存機能（簡略化）

#### 保存確認ダイアログ（SaveConfirmDialog）
- reference版より簡略化
- バリデーション結果表示なし（ダイアログ内で実行）

#### 保存処理
```typescript
const handleSave = useCallback(async (targetS3Key: string) => {
  // reference版: onSaveCallbackの考慮なし
  // `/api/worker/save-maiml-file` API使用
}, [nodes, edges, documentData, ...]);
```

### 3.10. Draft機能（reference版と同じ）

#### 自動保存
- `useDraftManager` フック使用
- 30秒間隔で自動保存

#### Draft読み込み
- `handleLoadDraft()`: Draftからノード/エッジを復元

### 3.11. ワークフロー追加（簡略化）

#### ワークフロー追加実行
```typescript
const handleConfirmWorkflowSelection = useCallback(async (selectedFile) => {
  // `/api/worker/load-maiml-file` API
  // Base64デコード: atob()
  await addWorkflow(maimlContent, pendingClickPosition || { x: 100, y: 100 });
}, [addWorkflow, pendingClickPosition]);
```

### 3.12. 複数Method管理（reference版と同じ）

#### Method構造（型定義）
```typescript
interface MethodData {
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}
```

#### Method切り替え
- `handleMethodTabChange()`: reference版と同じロジック

### 3.13. ビューモード切替（実装が異なる）

#### 現行版の実装
- `editorMode`: 'petri-net' | 'template'
- メインコンテンツエリアで切り替え
  - `editorMode === 'petri-net'`: ReactFlowを表示
  - `editorMode === 'template'`: TemplateListを表示

#### Reference版との違い
- Reference版: `viewMode` + `savedPetriNetViewport`
- 現行版: `editorMode`のみ、ビューポート保存なし

#### 追加機能: showTemplateList
- 右サイドパネルとしてTemplateList表示
- `handleToggleTemplateList()`で開閉

### 3.14. テンプレート一覧表示（現行版独自）

#### ノードからテンプレートデータを抽出（useEffect）
```typescript
useEffect(() => {
  const materialTemplates = nodes
    .filter(n => n.type === 'materialTemplate')
    .map(convertNodeToTemplateData);
  // ... condition, result も同様
  
  setCategorizedTemplates({ material, condition, result });
}, [nodes, convertNodeToTemplateData]);
```

#### 共通テンプレートの抽出（useEffect）
```typescript
useEffect(() => {
  // typeプロパティがnullまたはundefinedのテンプレート
  const commonMaterial = nodes
    .filter(n => n.type === 'materialTemplate' && !n.data.type)
    .map(convertNodeToTemplateData);
  // ... condition, result も同様
  
  setCommonTemplatesData({ material, condition, result });
}, [nodes, convertNodeToTemplateData]);
```

#### テンプレート選択
```typescript
const handleTemplateSelect = useCallback((template) => {
  // 対応するノードを見つけて選択
  const node = nodes.find(n => n.id === template.id);
  if (node) {
    setSelectedNode(node);
    // ノードを画面中央に表示
    setViewport({ x: -x + 400, y: -y + 300, zoom: viewport.zoom });
  }
}, [nodes, getViewport, setViewport]);
```

### 3.15. Phase 5: アーク属性表示トグル（現行版独自）

```typescript
// useEffect: showArcLabelsが変更されたらエッジにラベルを追加/削除
useEffect(() => {
  setEdges((eds) => 
    eds.map((edge) => ({
      ...edge,
      label: showArcLabels ? (edge.data?.id || edge.id) : undefined,
      labelStyle: showArcLabels ? { 
        fill: '#333',
        fontSize: 12,
        fontWeight: 500,
      } : undefined,
      labelBgStyle: showArcLabels ? { 
        fill: '#fff',
        fillOpacity: 0.8,
      } : undefined,
    }))
  );
}, [showArcLabels, setEdges]);
```

### 3.16. Phase 6: テンプレート追加/削除（現行版独自）

#### テンプレート追加
```typescript
const handleTemplateAdd = useCallback((category: 'material' | 'condition' | 'result') => {
  // 新規テンプレートノードを作成
  const newNode: Node = { /* ... */ };
  
  // ノードを追加
  setNodes((nds) => {
    const newNodes = [...nds, newNode];
    pushState({ nodes: newNodes, edges });
    return newNodes;
  });
  
  // テンプレート編集ダイアログを開く
  setTemplateEditNode(newNode);
  setTemplateEditorOpen(true);
}, [edges, pushState, setNodes]);
```

#### テンプレート削除
```typescript
const handleTemplateDelete = useCallback((templateId: string) => {
  // 確認ダイアログ
  const confirmed = window.confirm('このテンプレートを削除してもよろしいですか？');
  
  if (!confirmed) return;
  
  // 関連エッジを削除
  // ノードを削除
  // 履歴に保存
}, [edges, selectedNode, setEdges, setNodes, pushState]);
```

---

## 4. キーボードショートカット（reference版と同じ）

### 4.1. 編集操作
- `Ctrl+Z`: Undo
- `Ctrl+Shift+Z`, `Ctrl+Y`: Redo
- `Ctrl+C`: Copy（テキストBOX以外）
- `Ctrl+V`: Paste（テキストBOX以外）
- `Ctrl+S`: 保存ダイアログ表示
- `Delete`: ノード/エッジ削除

### 4.2. ノード追加（キー押下中）
- `M`: Material Template
- `C`: Condition Template
- `R`: Result Template
- `T`: Transition

---

## 5. カスタムフック

### 5.1. useHistory（reference版と同じ）
- Undo/Redo履歴管理
- パスが異なる: `../../hooks/useHistory`

### 5.2. useWorkflow（reference版と同じ）
- ワークフロー追加機能
- パスが異なる: `../../hooks/useWorkflow`

### 5.3. useDraftManager（reference版と同じ）
- Draft自動保存/読み込み
- パスが異なる: `../../hooks/useDraftManager`

---

## 6. 外部依存

### 6.1. ライブラリ
- `reactflow`: ペトリネット描画（reference版と同じ）
- `antd`: UI コンポーネント（**reference版はMUI**）

### 6.2. ユーティリティ（パスが異なる）
- `../../utils/converters/reactFlowToMaiml`: MaiML変換
- `../../utils/converters/multiMethodConverter`: 複数Method変換
- `../../utils/documentParser`: Document情報抽出（`fillMissingDocumentFields`追加）
- `../../utils/apiClient`: API呼び出し（`validateMaimlContent`, `autoCorrectMaiml`）
- `../../utils/maimlParser`: `parseMaimlToPetriNet`（現行版独自）
- `../../utils/reactFlowConverter`: `convertToReactFlow`（現行版独自）

### 6.3. コンポーネント（パスが異なる）
- Viewer用ノード: `../nodes/*`（reference版は`../PetriNetViewer/nodes/*`）
- サブコンポーネント: `./EditorToolbar`, `./MethodTabPanel`等（同じディレクトリ）

### 6.4. Context
- `@/contexts/TemplateContext`: TemplateProvider（現行版独自）

---

## 7. 特徴的な実装

### 7.1. TypeScript化
- 全ての型定義が明示的
- Props, State, 関数の戻り値等
- エラー型も厳密に定義

### 7.2. Ant Design使用
- Material-UIではなくAnt Design
- `theme.useToken()`でトークン取得
- Flexコンポーネント使用

### 7.3. editorMode実装（reference版のviewModeと異なる）
- メインコンテンツエリア全体を切り替え
- ビューポート保存/復元なし

### 7.4. sourceContext対応
- `project`: Document補完あり
- `format`: Document補完なし
- フォーマット管理画面との統合を想定

### 7.5. 新API使用
- `/api/v1/maiml/parse-petri-net-structure`
- 認証トークン必須
- レスポンス形式変更

### 7.6. アーク属性表示トグル（Phase 5）
- `showArcLabels`でエッジラベル表示/非表示
- EditorToolbarにトグルボタン

### 7.7. テンプレート追加/削除（Phase 6）
- TemplateList経由でテンプレート追加
- 確認ダイアログ付き削除機能

---

## 8. パフォーマンス最適化

### 8.1. useMemo使用
- `nodeTypes`: カスタムノード型定義
- `currentEditState`: Draft管理用の現在状態

### 8.2. useCallback使用
- ほぼ全てのイベントハンドラー
- 依存配列を適切に設定

### 8.3. 重複実行防止
- `hasLoadedRef`, `maimlDataRef`: 既読み込みチェック
- **注意**: reference版の`isLoadingRef`は未実装

---

## 9. セキュリティ/エラーハンドリング

### 9.1. 認証
- localStorage から userId, token 取得
- 新APIは`Authorization: Bearer ${token}`必須

### 9.2. エラーハンドリング
- try-catch で例外をキャッチ
- エラー状態をvalidationResultに変換（reference版と同じ）

### 9.3. バリデーション
- 手動実行のみ（自動バリデーションなし）

---

## 10. Reference版との主な違い

### 10.1. 実装済み機能
✅ TypeScript化
✅ Ant Design使用
✅ sourceContext対応
✅ 新API使用
✅ アーク属性表示トグル（Phase 5）
✅ テンプレート追加/削除（Phase 6）
✅ TemplateProvider統合

### 10.2. 未実装機能
❌ 自動バリデーション（ファイル読み込み後）
❌ エラー分類（致命的/非致命的）
❌ エラー視覚化（赤枠表示）
❌ ビューポート保存/復元（ビューモード切替時）
❌ ノードID変更（handleUpdateNodeId）
❌ 複雑なテンプレート保存ロジック
❌ TemplateContext連携（window.cline*関数）
❌ 共通テンプレート検出（commonTemplateRefMap）

### 10.3. 簡略化された機能
⚠️ バリデーション（モックAPI使用）
⚠️ 保存機能（自動補正オプションなし）
⚠️ テンプレート編集（単純なプロパティ更新のみ）

---

## 11. コード品質

### 11.1. 強み
- ✅ TypeScript化により型安全性が向上
- ✅ コード量が約半分（1,400行 vs 2,800行）
- ✅ Ant Design統一でプロジェクト一貫性
- ✅ sourceContext対応で柔軟性向上
- ✅ 明確な型定義

### 11.2. 弱み
- ❌ 一部機能が未実装（エラー視覚化等）
- ❌ 自動バリデーションなし
- ❌ TemplateContext連携が不完全
- ❌ テストコード不足（reference版と同様）

### 11.3. 改善の余地
- 未実装機能の追加（エラー視覚化、自動バリデーション）
- TemplateContext連携の完全実装
- ユニットテスト/統合テストの追加
- JSDocコメントの追加

---

## 12. まとめ

### 12.1. 総評
現行版はreference版の主要機能を**TypeScript + Ant Design**で実装し直したもの。
コード量は約半分に削減され、型安全性が向上している。

一方で、エラー視覚化や自動バリデーションなどの高度な機能は未実装。
機能的には8割程度の実装率と推定される。

### 12.2. 推奨アクション
1. **未実装機能の追加**
   - 自動バリデーション
   - エラー分類と視覚化
   - ビューポート保存/復元

2. **TemplateContext連携の完全実装**
   - グローバル関数の実装
   - テンプレート保存ロジックの強化

3. **テストコードの追加**
   - ユニットテスト
   - 統合テスト

4. **ドキュメントの充実**
   - JSDocコメント
   - 型定義の説明
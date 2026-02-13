# Reference PetriNetEditorV2 分析レポート

## メタデータ
- **作成日時**: 2026-01-28 14:04
- **対象ファイル**: `reference/frontend/src/components/PetriNetEditorV2/`
- **バージョン**: 2.0.0-beta
- **作成日**: 2025-10-30
- **言語**: JavaScript (JSX)
- **UIライブラリ**: Material-UI (@mui/material)

---

## 1. ファイル構成

### 1.1. エントリーポイント
**ファイル**: `index.jsx`
- ReactFlowProviderでラップするシンプルな構造
- propsをPetriNetEditorInnerに渡す
- `initialEditMode` → `editMode` への変換を行う

### 1.2. メインロジック
**ファイル**: `PetriNetEditorInner.jsx`
- 約2,800行の大規模コンポーネント
- 全ての状態管理とビジネスロジックを含む

---

## 2. コンポーネント構造

### 2.1. Props定義
```javascript
{
  maimlData,              // MAIMLコンテンツ
  editingFileName,        // 編集中のファイル名
  originalFileName,       // 元のファイル名
  sourceS3Key,            // S3キー
  editMode,               // 'normal' | 'draft'
  onError,                // エラーコールバック
}
```

### 2.2. State管理（主要なもの）

#### エディタ状態
- `nodes`, `edges`: React Flow状態（useNodesState, useEdgesState使用）
- `isLoading`, `error`: ローディング・エラー状態
- `selectedTool`: 'select' | 'workflow'
- `selectedNode`, `selectedEdge`, `selectedNodes`: 選択状態
- `clipboard`: コピー&ペースト用
- `pressedKeys`: キーボード状態（Set型）

#### ビューモード
- `viewMode`: 'petriNet' | 'templates'
- `showCommonTemplates`: 共通テンプレート表示フラグ
- `savedPetriNetViewport`: ビューポート保存用

#### ダイアログ状態
- `saveDialogOpen`, `saveConfirmDialogOpen`: 保存ダイアログ
- `validationPanelOpen`: バリデーションパネル
- `templateEditorOpen`: テンプレート編集
- `documentDialogOpen`: ドキュメント編集
- `workflowDialogOpen`: ワークフロー選択
- `draftManagerOpen`: Draft管理

#### バリデーション/保存
- `validationResult`: バリデーション結果
- `criticalErrors`, `nonCriticalErrors`: エラー分類
- `isValidating`, `isCorrecting`, `isSaving`: 処理中フラグ

#### 複数Method管理
- `methods`: MethodData[]
- `activeMethodIndex`: アクティブなMethodインデックス
- `multiMethodMode`: 複数Methodモードフラグ

#### Document/Draft
- `documentData`: DocumentData型
- `availableFiles`: 利用可能ファイル一覧
- `pendingClickPosition`: クリック位置保持

---

## 3. 主要機能

### 3.1. データ読み込み（useEffect）

#### 新規作成モード
```javascript
if (!maimlData) {
  // 空のDocumentDataを初期化
  // 空のMethod配列を作成
  // 履歴をリセット
}
```

#### 既存ファイル読み込み
1. **複数Method対応API呼び出し**
   - `/api/worker/multiple-methods-structure-from-content`
   - 成功時: 各Methodを個別に変換
   - 失敗時: フォールバック

2. **フォールバック: 単一Method API**
   - `/api/worker/petri-net-structure-from-content`
   - 従来の単一Method処理

3. **データ変換**
   - `buildTemplateMap()`: テンプレートマップ構築
   - `convertToReactFlowFormat()`: React Flow形式に変換
   - エッジスタイリング（矢印マーカー追加）

4. **自動バリデーション**
   - ファイル読み込み後500ms後に実行
   - `/api/s3/validate-maiml-content` API呼び出し

#### 共通テンプレート検出
- 複数placeRefを持つテンプレートを特定
- `commonTemplateRefMap` で参照関係を管理
- `isCommonTemplate` フラグを設定

### 3.2. ノード操作

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
- `handleUpdateNodeId()`: ID変更（エッジも連動）
- 履歴に自動保存（pushState）

### 3.3. エッジ操作

#### エッジ接続
- `handleConnect()`: addEdge()でエッジ追加
- 自動でスタイルとマーカー設定

#### エッジ削除
- `handleEdgesDelete()`: 複数エッジ削除
- `handleDeleteEdge()`: PropertyPanelから単一削除

#### エッジプロパティ更新
- `handleUpdateEdgeProperty()`: ID変更のみ対応

### 3.4. Undo/Redo機能

**カスタムフック**: `useHistory`
```javascript
const { history, undo, redo, canUndo, canRedo, pushState, reset } = useHistory({
  nodes: [],
  edges: [],
});
```

#### 履歴保存タイミング
- ノード追加/削除/移動後
- エッジ追加/削除後
- プロパティ更新後
- `pushState({ nodes, edges })` で保存

#### キーボードショートカット
- `Ctrl+Z`: Undo
- `Ctrl+Shift+Z`, `Ctrl+Y`: Redo

### 3.5. コピー&ペースト

#### コピー（Ctrl+C）
- 単一ノード: ノードデータをclipboardに保存
- 複数ノード: `{ multiple: true, nodes: [...] }` 形式で保存

#### ペースト（Ctrl+V）
- 位置を50px右下にずらして貼り付け
- 新しいIDを自動生成
- 名前に "(Copy)" を追加

### 3.6. テンプレート管理

#### テンプレート編集ダイアログ
- `handleOpenTemplateEditor()`: ダイアログを開く
- `handleSaveTemplate()`: テンプレート保存
  - 新規作成: TemplateContextに追加
  - 既存更新: TemplateContextを更新
  - placeRefsに含まれる全ノードに設定

#### Properties形式変換
- `convertNestedPropertiesToArray()`: NestedPropertyEditor形式 → MaiMLParser配列形式
- 再帰的に子要素も変換
- xsiType, units, formatString等を保持

#### TemplateContext連携
- `window.clineAddTemplate`: テンプレート追加
- `window.clineUpdateTemplate`: テンプレート更新
- `window.clineDeleteTemplate`: テンプレート削除
- `window.clineAllTemplates`: 全テンプレート取得

### 3.7. Document管理

#### Document編集
- `handleOpenDocumentEditor()`: ダイアログを開く
- `handleSaveDocument()`: Document情報を保存
- `extractDocumentFromMaiML()`: MAIMLからDocument抽出

#### Document自動初期化
- 新規作成時: editingFileNameからID自動生成
- 固定的なID（Date.nowを使わず、ファイル名ベース）

### 3.8. バリデーション機能

#### エラー分類
- **致命的エラー**: `syntax_error`, `invalid_structure`
  - ペトリネット表示不可
- **非致命的エラー**: その他（`duplicate_id`, `reference_error`等）
  - 警告表示のみ、表示は可能

#### エラー視覚化
- `extractAffectedElements()`: エラーから影響を受けるノード/エッジを抽出
- エラーノード/エッジに `hasError` フラグと `className: 'error-node'/'error-edge'` を設定
- CSS クラスでスタイリング（赤枠表示等）

#### バリデーション実行
- 自動: ファイル読み込み後
- 手動: ValidationPanelボタン
- `/api/s3/validate-maiml-content` API使用

### 3.9. 保存機能

#### 新保存ダイアログ（SaveConfirmDialog）
- バリデーション結果表示
- 保存先選択（S3 / ローカル）
- 自動補正オプション

#### 保存処理
1. **MaiML生成**
   - 単一Method: `convertReactFlowToMaiML()`
   - 複数Method: `convertMultipleMethodsToMaiML()`

2. **自動補正（オプション）**
   - `/api/s3/maiml-auto-correct-realtime` API

3. **保存実行**
   - S3保存: `/api/s3/save` API
   - ローカルダウンロード: Blob生成

### 3.10. Draft機能

#### 自動保存
- `useDraftManager` フック使用
- 30秒間隔で自動保存
- `autoSaveEnabled` でON/OFF切替

#### Draft読み込み
- `handleLoadDraft()`: Draftからノード/エッジを復元
- DraftManagerダイアログから選択

#### Draft復元モード
- `editMode='draft'` 時に自動でDraftManagerを表示

### 3.11. ワークフロー追加

#### ワークフロー追加モード
- `selectedTool='workflow'` 時にキャンバスクリックで位置指定
- `openWorkflowDialogInternal()`: ファイル一覧取得
- WorkflowSelectorDialogでファイル選択

#### ワークフロー追加実行
- `addWorkflow()` フック使用
- MAIMLファイルを読み込み
- 指定位置にノード/エッジを追加

### 3.12. 複数Method管理

#### Method構造
```javascript
{
  methodId: string,
  methodIndex: number,
  name: string,
  nodes: Node[],
  edges: Edge[],
  viewport: { x, y, zoom }
}
```

#### Method切り替え
- `handleMethodChange()`: Methodタブクリック時
- 現在のMethod状態を保存（nodes, edges, viewport）
- 新しいMethodのデータを読み込み
- ビューポートを復元

#### Method追加/削除
- `handleAddMethod()`: 新規Method作成
- `handleDeleteMethod()`: Method削除（最低1個は保持）
- `handleEditMethodId()`: Method ID編集

### 3.13. ビューモード切替

#### ペトリネットモード
- React Flowキャンバス表示
- ノード/エッジ編集可能

#### テンプレートモード
- TemplateListView表示
- テンプレート一覧（カテゴリ別）
- 共通テンプレート/メソッド内テンプレート切替

#### ビューポート保存/復元
- ペトリネットモードから切り替え時にビューポートを保存
- ペトリネットモードに戻る時に復元

---

## 4. キーボードショートカット

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

### 4.3. 無効化条件
- ダイアログ/モーダルが開いている時
- テキストBOXにフォーカスがある時（Ctrl+C/Vのみ）

---

## 5. カスタムフック

### 5.1. useHistory
- Undo/Redo履歴管理
- `pushState()`, `undo()`, `redo()`, `reset()`

### 5.2. useWorkflow
- ワークフロー追加機能
- `addWorkflow(position, maimlContent, fileName)`

### 5.3. useDraftManager
- Draft自動保存/読み込み
- `autoSaveEnabled`, `lastSavedDraft`, `lastAutoSaveTime`

---

## 6. 外部依存

### 6.1. ライブラリ
- `reactflow`: ペトリネット描画
- `@mui/material`: UI コンポーネント
- `xml-js`: XMLパース（MaiMLParser経由）

### 6.2. ユーティリティ
- `converters/reactFlowToMaiml`: MaiML変換
- `converters/multiMethodConverter`: 複数Method変換
- `documentParser`: Document情報抽出
- `petriNetExtractor`: テンプレートマップ構築
- `reactFlowConverter`: React Flow形式変換

### 6.3. コンポーネント
- Viewer用ノード: `MaterialTemplateNode`, `ConditionTemplateNode`, `ResultTemplateNode`, `TransitionNode`
- サブコンポーネント: `EditorToolbar`, `MethodTabPanel`, `PropertyPanel`, `TemplateEditorDialog`, `DocumentEditDialog`, 等

---

## 7. 特徴的な実装

### 7.1. エラー分類と視覚化
- 致命的/非致命的エラーの分類
- エラーノード/エッジの赤枠表示
- ValidationPanelで詳細表示

### 7.2. 共通テンプレート検出
- 複数placeRefを持つテンプレートを自動検出
- `commonTemplateRefMap` で参照関係を管理
- `isCommonTemplate` フラグで識別

### 7.3. 複数Method対応
- Method単位でノード/エッジ/ビューポートを管理
- Method切り替え時にビューポートを復元
- 保存時は全Methodをまとめて変換

### 7.4. ビューポート管理
- ビューモード切替時にビューポートを保存/復元
- Method切り替え時も同様

### 7.5. 履歴管理の最適化
- ノード移動は `setTimeout(..., 0)` で次のイベントループで保存
- 過度な履歴保存を防ぐ

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
- `isLoadingRef`: ローディング中フラグ

---

## 9. セキュリティ/エラーハンドリング

### 9.1. 認証
- localStorage から userId 取得
- API呼び出しに `credentials: 'include'` を設定

### 9.2. エラーハンドリング
- try-catch で例外をキャッチ
- エラー状態をvalidationResultに変換
- ユーザーフレンドリーなエラーメッセージ

### 9.3. バリデーション
- ファイル読み込み後に自動実行
- 保存前にバリデーション結果を表示

---

## 10. 改善の余地

### 10.1. コード分割
- 2,800行の巨大コンポーネント
- サブコンポーネントへの分割が望ましい

### 10.2. 型安全性
- JavaScriptのため型チェックなし
- TypeScript化でバグを減らせる

### 10.3. テスト
- テストコードが見当たらない
- ユニットテスト/統合テストの追加が望ましい

### 10.4. ドキュメント
- JSDocコメントが少ない
- 関数の説明を追加すべき

---

## 11. まとめ

### 11.1. 強み
- ✅ 機能が豊富（Undo/Redo, Copy/Paste, Draft, バリデーション等）
- ✅ 複数Method対応
- ✅ 共通テンプレート検出
- ✅ エラー分類と視覚化
- ✅ ビューモード切替（ペトリネット/テンプレート）
- ✅ キーボードショートカット充実

### 11.2. 弱み
- ❌ 巨大な単一コンポーネント（保守性低）
- ❌ JavaScript（型安全性なし）
- ❌ Material-UI（プロジェクトはAnt Design）
- ❌ テストコードなし
- ❌ JSDocコメント不足

### 11.3. 総評
Reference版は機能的には非常に充実しているが、コード品質の観点では改善の余地がある。現行版への移植時には、機能を保ちつつ、TypeScript化、コンポーネント分割、Ant Design化を行う必要がある。
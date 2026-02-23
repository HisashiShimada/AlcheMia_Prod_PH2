# PetriNetEditor (PetriNetEditorInner) UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

React Flowを使用したペトリネット表示・編集のメインコンポーネント。MAIMLファイルの視覚的な編集、複数メソッド対応、テンプレート管理、バリデーション、ドラフト管理などの高度な機能を提供します。

### 1.2. 使用場面

- PetriNetEditorScreenから呼び出され、プロジェクトの実験フローを編集
- フォーマット管理画面からワークフローテンプレートを編集
- ドラフトファイルを復元して編集を継続

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. ファイルパス

```
frontend/src/components/editorv2/PetriNetEditorInner.tsx
```

**重要な変更**: 以前は`PetriNetEditor.tsx`でしたが、`PetriNetEditorInner.tsx`に名称変更されました。

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| maimlData | string \| null | ✓ | MAIML XML文字列（nullの場合は新規作成モード） |
| editingFileName | string | | 編集中のファイル名 |
| editMode | string | ✓ | 編集モード（'project', 'draft'等） |
| originalFileName | string | | 元ファイル名 |
| sourceS3Key | string | | S3キー |
| onError | (error: Error) => void | | エラーコールバック |

---

## 4. 主要なState定義

### 4.1. ReactFlow関連

| State変数 | 型 | 説明 |
|----------|---|------|
| nodes | Node<NodeData>[] | ReactFlowノード配列 |
| edges | Edge<EdgeData>[] | ReactFlowエッジ配列 |
| selectedNode | Node<NodeData> \| null | 選択中のノード |
| selectedEdge | Edge<EdgeData> \| null | 選択中のエッジ |
| selectedNodes | Node<NodeData>[] | 複数選択中のノード配列 |

### 4.2. エディタ状態

| State変数 | 型 | 説明 |
|----------|---|------|
| isLoading | boolean | ローディング状態 |
| selectedTool | 'select' \| 'workflow' | 選択中のツール |
| clipboard | ClipboardData \| null | クリップボード |
| pressedKeys | Set<string> | 押下中のキー |

### 4.3. バリデーション関連

| State変数 | 型 | 説明 |
|----------|---|------|
| validationResult | AnalysisResult \| null | バリデーション結果 |
| criticalErrors | ErrorContent[] | 致命的エラー配列 |
| nonCriticalErrors | ErrorContent[] | 非致命的エラー配列 |
| validationPanelOpen | boolean | ValidationPanel表示状態 |
| isValidating | boolean | バリデーション実行中 |

### 4.4. ダイアログ状態

| State変数 | 型 | 説明 |
|----------|---|------|
| saveConfirmDialogOpen | boolean | 保存確認ダイアログ |
| templateEditorOpen | boolean | テンプレートエディタ |
| documentDialogOpen | boolean | Document編集ダイアログ |
| workflowDialogOpen | boolean | ワークフロー選択ダイアログ |
| draftManagerOpen | boolean | Draft管理ダイアログ |

### 4.5. 複数メソッド管理

| State変数 | 型 | 説明 |
|----------|---|------|
| methods | MethodData[] | メソッド配列 |
| activeMethodIndex | number | アクティブなメソッドのインデックス |
| multiMethodMode | boolean | 複数メソッドモード |

### 4.6. ビューモード

| State変数 | 型 | 説明 |
|----------|---|------|
| viewMode | 'petriNet' \| 'templates' | 表示モード |
| showCommonTemplates | boolean | 共通テンプレート表示フラグ |

---

## 5. 主要機能

### 5.1. MAIMLデータ読み込みと変換

**処理フロー:**
1. useEffect()でmaimlDataを監視
2. maimlDataがnullの場合は新規作成モード
3. MaimlParserTyped()でMAIMLをパース
4. getMethods()で複数メソッドを取得
5. 各メソッドをconvertToReactFlowFormat()でReactFlow形式に変換
6. methods配列に格納
7. 最初のメソッドを表示

**新規作成モード:**
- maimlDataがnullの場合
- 空の状態で起動
- editingFileNameからdocumentDataを初期化

**エラーハンドリング:**
- パースエラー時はvalidationResultに変換して表示
- 致命的エラーの場合はペトリネット表示を停止

### 5.2. ノード・エッジの選択と編集

**ノード選択:**
- handleNodeClick(): 単一ノード選択
- handleSelectionChange(): 複数ノード選択
- selectedNode更新→PropertyPanel表示

**エッジ選択:**
- handleEdgeClick(): エッジ選択
- selectedEdge更新→PropertyPanel表示

**プロパティ更新:**
- handleUpdateNodeProperty(): ノードプロパティ更新
- handleUpdateNodeId(): ノードID変更
- handleUpdateEdgeProperty(): エッジID変更

### 5.3. ノード・エッジの追加と削除

**ノード追加（キーボードショートカット）:**
- M+クリック: Material Place追加
- C+クリック: Condition Place追加
- R+クリック: Result Place追加
- T+クリック: Transition追加

**エッジ追加:**
- ノードのハンドルをドラッグ&ドロップ
- handleConnect()でエッジ作成

**削除:**
- Deleteキー: handleNodesDelete()、handleEdgesDelete()
- PropertyPanelの削除ボタン: handleDeleteNode()、handleDeleteEdge()

### 5.4. コピー・ペースト

**実装:**
- useEditorActions()フックでhandleCopy、handlePasteを提供
- Ctrl+C: 選択ノードをクリップボードにコピー
- Ctrl+V: クリップボードからノードをペースト

### 5.5. Undo・Redo

**実装:**
- useHistory()フックで履歴管理
- Ctrl+Z: undo()
- Ctrl+Y: redo()
- 最大履歴数: デフォルト設定

### 5.6. テンプレート編集

**処理フロー:**
1. PropertyPanelの「テンプレート編集」ボタン
2. handleOpenTemplateEditor()実行
3. TemplateEditorDialogを表示
4. テンプレート編集後、handleSaveTemplate()
5. ノードのtemplateプロパティ更新
6. TemplateContextに保存

**新規テンプレート作成:**
- isNewTemplateフラグで判定
- 新しいテンプレートIDを生成
- window.clineAddTemplate()でContextに追加

### 5.7. 複数メソッド管理

**メソッド切り替え:**
- handleMethodChange(): 
  1. 現在のメソッド状態を保存（viewport含む）
  2. 新しいメソッドのnodes/edgesを読み込み
  3. activeMethodIndex更新
  4. viewport復元

**メソッド追加:**
- handleAddMethod(): 空のメソッドを追加

**メソッド削除:**
- handleDeleteMethod(): メソッドを削除（最後の1つは削除不可）

**メソッドID編集:**
- handleEditMethodId(): メソッドIDを変更

### 5.8. バリデーション

**実行タイミング:**
1. 自動: MAIMLファイル読み込み時（500ms後）
2. 手動: EditorToolbarの「バリデーション」ボタン

**処理フロー:**
1. convertReactFlowToMaiML()またはconvertMultipleMethodsToMaiML()でMAIML生成
2. Base64エンコード
3. maimlService.validateMaiml()でサーバー側バリデーション
4. 結果をvalidationResultに設定
5. エラー分類（致命的/非致命的）
6. 非致命的エラーはノード/エッジに視覚化

**エラー視覚化:**
- extractAffectedElements()でエラー該当ノード/エッジを特定
- hasError、errorsプロパティを設定
- error-node、error-edgeクラス名を付与

### 5.9. 保存処理

**処理フロー:**
1. handleOpenSaveConfirmDialog(): バリデーション実行
2. SaveConfirmDialogを表示
3. handleSaveConfirmAction(): 保存先選択（S3/ローカル）
4. convertReactFlowToMaiML()でMAIML生成
5. S3保存またはローカルダウンロード

**複数メソッド対応:**
- multiMethodModeの場合、convertMultipleMethodsToMaiML()使用
- 全methodsを含むMAIMLを生成

### 5.10. ドラフト管理

**自動保存:**
- useDraftManager()フックで30秒ごとに自動保存
- autoSaveEnabled状態で制御

**Draft復元:**
- editMode='draft'の場合、自動的にDraftManagerを表示
- handleLoadDraft(): Draftからノード/エッジを復元

### 5.11. ワークフロー追加

**処理フロー:**
1. handleWorkflowModeToggle(): ワークフローモード有効化
2. selectedTool: 'workflow'
3. キャンバスクリック→WorkflowSelectorDialog表示
4. ファイル選択→handleWorkflowFileSelect()
5. addWorkflow()でサブネット追加

### 5.12. Document編集

**処理フロー:**
1. handleOpenDocumentEditor(): DocumentEditDialog表示
2. documentData編集
3. handleSaveDocument(): documentDataステート更新

### 5.13. ビューモード切替

**モード:**
- 'petriNet': ペトリネット編集ビュー
- 'templates': テンプレート一覧ビュー

**処理フロー:**
1. handleViewModeChange(): ビューモード切替
2. ペトリネット→テンプレート: viewportを保存
3. テンプレート→ペトリネット: viewportを復元

### 5.14. キーボードショートカット

**実装:**
- useKeyboardShortcuts()フックで一元管理

| キー | 動作 |
|------|------|
| Ctrl+S | 保存ダイアログを開く |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+C | コピー |
| Ctrl+V | ペースト |
| Delete | 削除 |
| M+クリック | Material Place追加 |
| C+クリック | Condition Place追加 |
| R+クリック | Result Place追加 |
| T+クリック | Transition追加 |

---

## 6. UIレイアウト

### 6.1. 全体構造

```
┌─────────────────────────────────────────────────────────┐
│ EditorToolbar                                           │
│ [ペトリネット/テンプレート] [ノード追加] [保存] ...    │
├─────────────────────────────────────────────────────────┤
│ MethodTabPanel（複数メソッドの場合）                    │
│ [Method 1] [Method 2] [+ 追加]                         │
├─────────────────────────────────────────────────────────┤
│ ReactFlow編集エリア                    PropertyPanel   │
│ ┌───────────────────────────┐  ┌──────────────────┐   │
│ │                           │  │ ノード/エッジ     │   │
│ │  ○ → [T] → ○            │  │ プロパティ編集   │   │
│ │                           │  │                  │   │
│ │ [Controls] [MiniMap]      │  │ [更新] [削除]    │   │
│ └───────────────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 6.2. ローディング表示

**表示条件**: isLoading === true

```jsx
<Spin size="large">
  <div style={{ minHeight: 100 }} />
</Spin>
```

### 6.3. エラー表示

**致命的エラー:**
- ペトリネット表示を停止
- Alertでエラー一覧表示

**非致命的エラー:**
- 警告バナーを表示
- ノード/エッジにエラーマーク表示
- 「詳細を表示」ボタンでValidationPanel表示

---

## 7. 使用しているコンポーネント

### 7.1. Ant Designコンポーネント

| コンポーネント | 使用箇所 |
|--------------|---------|
| Spin | ローディング表示 |
| Alert | エラー/警告バナー |
| Flex | レイアウト |
| message | トースト通知 |

### 7.2. ReactFlowコンポーネント

| コンポーネント | 用途 |
|--------------|------|
| ReactFlow | メインキャンバス |
| Background | ドット背景 |
| Controls | ズーム/フィット操作 |
| MiniMap | ミニマップ |

### 7.3. カスタムノード

| ノードタイプ | コンポーネント |
|------------|--------------|
| materialTemplate | MaterialTemplateNode |
| conditionTemplate | ConditionTemplateNode |
| resultTemplate | ResultTemplateNode |
| transition | TransitionNode |

---

## 8. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| EditorToolbar | ./components/EditorToolbar | ツールバー |
| MethodTabPanel | ./components/MethodTabPanel | メソッド切替タブ |
| PropertyPanel | ./components/PropertyPanel | プロパティ編集パネル |
| ValidationPanel | ./components/ValidationPanel | バリデーション結果表示 |
| SaveConfirmDialog | ./components/SaveConfirmDialog | 保存確認ダイアログ |
| TemplateEditorDialog | ./components/TemplateEditorDialog | テンプレート編集 |
| DocumentEditDialog | ./components/DocumentEditDialog | Document編集 |
| WorkflowSelectorDialog | ./components/WorkflowSelectorDialog | ワークフロー選択 |
| DraftManager | ./components/DraftManager | Draft管理 |
| TemplateList | ./components/TemplateViewer/TemplateList | テンプレート一覧 |

---

## 9. カスタムフック

| フック | パス | 役割 |
|--------|------|------|
| useHistory | ./hooks/useHistory | Undo/Redo履歴管理 |
| useWorkflow | ./hooks/useWorkflow | ワークフロー追加 |
| useDraftManager | ./hooks/useDraftManager | ドラフト自動保存 |
| useKeyboardShortcuts | ./hooks/useKeyboardShortcuts | キーボードショートカット |
| useEditorActions | ./hooks/useEditorActions | エディタアクション（コピー/ペースト） |
| useNamespaceOperations | ./hooks/useNamespaceOperations | 名前空間操作 |

---

## 10. 備考

### 10.1. TemplateContext統合

- TemplateProviderでラップ
- window.clineAddTemplate、window.clineDeleteTemplate、window.clineUpdateTemplate、window.clineAllTemplatesを公開
- TemplateEditorDialogから直接アクセス可能

### 10.2. Phase 3: エラー分類

**致命的エラー（critical）:**
- syntax_error
- invalid_structure
→ ペトリネット表示不可

**非致命的エラー（non-critical）:**
- duplicate_id
- reference_error
- missing_attribute
- invalid_value
→ ペトリネット表示可能、警告表示

### 10.3. デバッグログ

すべての主要なアクションで詳細なコンソールログ出力:
- 🔍 分析・確認
- ✅ 成功
- ❌ エラー
- 🔄 変更・更新
- 💾 保存
- 📋 メソッド操作

### 10.4. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| react | 18.2.0 | UIフレームワーク |
| reactflow | 11.11.4 | フロー図エディタ |
| antd | 6.x | UIコンポーネント |

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
| 2.0.0 | 2026-02-19 | 最新ソース（PetriNetEditorInner.tsx）に基づいて全面更新 | Cline |

# Phase 4: PetriNetEditor.tsx メインコンポーネント実装 - 詳細計画書

## メタデータ
- **作成日時**: 2025-12-23 09:18
- **タスクID**: PetriNetEditor_Phase4
- **優先度**: 高
- **推定工数**: 5-6時間

---

## 1. タスク概要

reference配下のPetriNetEditorInner.jsx（約1,800行）をTypeScript + Ant Design v6に変換し、Phase 2-3で作成したすべてのサブコンポーネントを統合する。

---

## 2. 参照元ファイル分析

### ファイル情報
- **パス**: `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx`
- **行数**: 約1,800行
- **主要機能**: 56個のstate、40個以上のハンドラー関数

### コンポーネント構成

#### インポート（約30行）
- React Flow関連（ReactFlow, useNodesState, useEdgesState, useReactFlow等）
- Material-UI（Box, ThemeProvider, CircularProgress, Alert）
- サブコンポーネント（10個）
- カスタムフック（3個）
- ユーティリティ関数（4個）
- Viewer用ノード（4個）

#### State管理（約60変数）

**React Flow State:**
- `nodes`, `setNodes`, `onNodesChange`
- `edges`, `setEdges`, `onEdgesChange`
- `isLoading`, `error`

**編集State:**
- `selectedTool` - 現在のツール（select, workflow等）
- `selectedNode` - 選択中のノード
- `selectedEdge` - 選択中のエッジ
- `selectedNodes` - 複数選択ノード配列
- `clipboard` - コピー&ペースト用
- `pressedKeys` - 押下中のキー（M/C/R/T）

**ダイアログState:**
- `saveDialogOpen` - 旧保存ダイアログ
- `saveConfirmDialogOpen` - 新保存ダイアログ
- `validationPanelOpen` - バリデーションパネル
- `templateEditorOpen` - テンプレート編集
- `documentDialogOpen` - Document編集
- `workflowDialogOpen` - ワークフロー選択
- `draftManagerOpen` - Draft管理

**バリデーション/保存State:**
- `validationResult` - バリデーション結果
- `isValidating` - バリデーション中フラグ
- `isCorrecting` - 自動補正中フラグ
- `isSaving` - 保存中フラグ
- `saveError` - 保存エラー

**Document/Draft State:**
- `documentData` - Document情報
- `availableFiles` - 利用可能ファイル一覧
- `isLoadingFiles` - ファイル読み込み中
- `pendingClickPosition` - クリック位置保持
- `draftModeHandled` - draftモード処理済みフラグ

**複数Method State:**
- `methods` - method配列
- `activeMethodIndex` - アクティブなmethod
- `multiMethodMode` - 複数methodモードフラグ

#### イベントハンドラー（約40関数）

**ノード操作:**
- `handleAddNode` - ノード追加
- `handleNodesDelete` - ノード削除
- `handleDeleteNode` - PropertyPanelからのノード削除
- `handleNodeClick` - ノード選択
- `handleNodeDragStop` - ドラッグ停止
- `handleUpdateNodeProperty` - プロパティ更新
- `handleSelectionChange` - 選択変更

**エッジ操作:**
- `handleConnect` - エッジ接続
- `handleEdgesDelete` - エッジ削除
- `handleDeleteEdge` - PropertyPanelからのエッジ削除
- `handleEdgeClick` - エッジ選択
- `handleUpdateEdgeProperty` - エッジID更新

**コピー&ペースト:**
- `handleCopy` - コピー
- `handlePaste` - ペースト

**ダイアログ操作:**
- `handleOpenTemplateEditor` / `handleCloseTemplateEditor`
- `handleOpenDocumentEditor` / `handleCloseDocumentEditor`
- `handleOpenSaveDialog` / `handleCloseSaveDialog`
- `handleOpenSaveConfirmDialog` / `handleCloseSaveConfirmDialog`
- `handleOpenValidationPanel` / `handleCloseValidationPanel`
- `handleOpenDraftManager` / `handleCloseDraftManager`
- `handleCloseWorkflowDialog`

**保存/バリデーション:**
- `handleSave` - 旧保存
- `handleSaveConfirmAction` - 新保存アクション
- `handleAutoCorrect` - 自動補正
- `handleRevalidate` - 再バリデーション

**Template/Document:**
- `handleSaveTemplate` - Template保存
- `handleSaveDocument` - Document保存
- `convertNestedPropertiesToArray` - Properties変換

**Draft:**
- `handleLoadDraft` - Draft読み込み

**Method管理:**
- `handleMethodChange` - Method切り替え
- `handleAddMethod` - Method追加
- `handleDeleteMethod` - Method削除
- `handleEditMethodId` - Method ID編集

**ワークフロー:**
- `handleWorkflowModeToggle` - ワークフロー追加モード切り替え
- `handleWorkflowFileSelect` - ワークフローファイル選択
- `openWorkflowDialogInternal` - ワークフロー選択ダイアログを開く

**その他:**
- `handlePaneClick` - キャンバスクリック
- `handleClosePropertyPanel` - プロパティパネルを閉じる

#### useEffect（約7個）

1. **初回読み込み** - MaiMLデータ読み込みと変換（約300行）
2. **履歴同期** - history.presentとの同期
3. **キーボードショートカット** - Ctrl+Z/Y/C/V/S + M/C/R/T
4. **キー解放** - ウィンドウフォーカス時
5. **draftモード** - editMode='draft'時の自動DraftManager表示

#### JSX構造

```jsx
<ThemeProvider>
  <Box>
    {/* ツールバー */}
    <EditorToolbar {...props} />
    
    {/* Methodタブ */}
    <MethodTabPanel {...props} />
    
    {/* React Flowキャンバス */}
    <ReactFlow {...props}>
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
    
    {/* PropertyPanel */}
    {selectedNode && <PropertyPanel {...props} />}
    
    {/* 各種ダイアログ */}
    <SaveDialog {...props} />
    <SaveConfirmDialog {...props} />
    <TemplateEditorDialog {...props} />
    <DocumentEditDialog {...props} />
    <ValidationPanel {...props} />
    <WorkflowSelectorDialog {...props} />
    <DraftManager {...props} />
  </Box>
</ThemeProvider>
```

---

## 3. 実装ステップ

### Phase A: 基本骨格（1時間）

#### A-1. ファイル作成とインポート（10分）
- [ ] `frontend/src/components/viewer/PetriNetEditor/PetriNetEditor.tsx`作成
- [ ] React Flow関連インポート
- [ ] サブコンポーネントインポート（10個）
- [ ] カスタムフックインポート（3個）
- [ ] ユーティリティインポート（4個）
- [ ] Ant Design v6インポート

#### A-2. Props型定義（10分）
```typescript
export interface PetriNetEditorProps {
  maimlData?: string;
  onError?: (error: Error) => void;
  editingFileName?: string;
  editMode?: 'normal' | 'draft';
  originalFileName?: string;
  sourceS3Key?: string;
}
```

#### A-3. State定義（30分）
すべてのstate変数をTypeScript型付きで定義：
- React Flow State（nodes, edges, isLoading, error）
- 編集State（selectedTool, selectedNode等）
- ダイアログState（8個）
- バリデーション/保存State（5個）
- Document/Draft State（5個）
- 複数Method State（3個）

#### A-4. カスタムノードタイプ（10分）
```typescript
const nodeTypes = useMemo(
  () => ({
    materialTemplate: MaterialTemplateNode,
    conditionTemplate: ConditionTemplateNode,
    resultTemplate: ResultTemplateNode,
    transition: TransitionNode,
  }),
  []
);
```

### Phase B: サブコンポーネント統合（2時間）

#### B-1. EditorToolbar統合（20分）
- [ ] props定義
- [ ] イベントハンドラー接続
- [ ] Undo/Redo統合
- [ ] 保存/バリデーションボタン

#### B-2. MethodTabPanel統合（20分）
- [ ] methods state管理
- [ ] Method切り替えハンドラー
- [ ] Method追加/削除/編集

#### B-3. PropertyPanel統合（20分）
- [ ] selectedNode/selectedEdge管理
- [ ] プロパティ更新ハンドラー
- [ ] Template編集ダイアログ連携

#### B-4. ダイアログ統合（60分）
1. **TemplateEditorDialog** - Template編集
2. **DocumentEditDialog** - Document編集
3. **SaveConfirmDialog** - 新保存ダイアログ
4. **ValidationPanel** - バリデーション結果
5. **WorkflowSelectorDialog** - ワークフロー選択
6. **DraftManager** - Draft管理

各ダイアログ:
- [ ] open/close state管理
- [ ] イベントハンドラー接続
- [ ] データフロー確認

### Phase C: 状態管理統合（1時間）

#### C-1. Document状態管理（15分）
- [ ] documentData state
- [ ] Document編集ダイアログ連携
- [ ] Document情報の保存時反映

#### C-2. Undo/Redo統合（15分）
- [ ] useHistory フック連携
- [ ] pushState呼び出し（ノード/エッジ操作時）
- [ ] history.present同期

#### C-3. Workflow管理統合（15分）
- [ ] useWorkflow フック連携
- [ ] ワークフロー追加処理
- [ ] ファイル選択ダイアログ

#### C-4. Draft管理統合（15分）
- [ ] useDraftManager フック連携
- [ ] 自動保存設定
- [ ] Draft読み込み/保存

### Phase D: イベントハンドラー実装（1時間）

#### D-1. ノード操作（20分）
- [ ] handleAddNode
- [ ] handleNodesDelete
- [ ] handleNodeClick
- [ ] handleNodeDragStop
- [ ] handleUpdateNodeProperty
- [ ] handleSelectionChange
- [ ] handleCopy/handlePaste

#### D-2. エッジ操作（15分）
- [ ] handleConnect
- [ ] handleEdgesDelete
- [ ] handleEdgeClick
- [ ] handleUpdateEdgeProperty

#### D-3. 保存・読み込み（25分）
- [ ] handleSaveConfirmAction（複雑）
- [ ] handleAutoCorrect
- [ ] handleRevalidate
- [ ] handleLoadDraft
- [ ] handleSaveTemplate
- [ ] handleSaveDocument

### Phase E: useEffect実装（30分）

#### E-1. 初回読み込み（15分）
- [ ] MaiMLデータ取得API呼び出し
- [ ] 複数method対応
- [ ] React Flow形式変換
- [ ] fitView実行

#### E-2. キーボードショートカット（10分）
- [ ] Ctrl+Z/Y（Undo/Redo）
- [ ] Ctrl+C/V（Copy/Paste）
- [ ] Ctrl+S（Save）
- [ ] M/C/R/T（ノード追加）

#### E-3. その他useEffect（5分）
- [ ] 履歴同期
- [ ] キー解放
- [ ] draftモード

### Phase F: JSX構造実装（30分）

#### F-1. メインレイアウト（10分）
- [ ] Material-UI Box → Ant Design Layout/Flex
- [ ] ローディング表示
- [ ] エラー表示

#### F-2. ReactFlow統合（10分）
- [ ] ReactFlowコンポーネント
- [ ] Background
- [ ] Controls
- [ ] MiniMap

#### F-3. 全ダイアログ配置（10分）
- [ ] 6個のダイアログを配置
- [ ] z-index調整

### Phase G: 最終確認とテスト（30分）

#### G-1. TypeScript型エラー修正（15分）
- [ ] すべての型エラー解消
- [ ] any型を厳密な型に置き換え

#### G-2. Ant Design変換確認（10分）
- [ ] Material-UI → Ant Design完全変換
- [ ] スタイリング確認

#### G-3. 動作確認（5分）
- [ ] 基本的な編集操作
- [ ] ダイアログ開閉
- [ ] 保存機能

---

## 4. 技術的な注意点

### Material-UI → Ant Design v6 変換

| Material-UI | Ant Design v6 | 備考 |
|-------------|---------------|------|
| ThemeProvider | ConfigProvider | テーマ適用 |
| Box | Flex / div | レイアウト |
| CircularProgress | Spin | ローディング |
| Alert | Alert | エラー表示 |

### TypeScript型定義のポイント

```typescript
// React Flow型
import type { Node, Edge } from 'reactflow';

// カスタム型
interface MethodData {
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}

interface DocumentData {
  id: string;
  protocolId: string;
  methodId: string;
  pnmlId: string;
  programId: string;
  name: string;
  description: string;
  date: string;
  uuid: string;
  creator: { id: string; name: string };
  vendor: { id: string; name: string };
  owner: { id: string; name: string };
  instrument: { id: string; name: string };
}
```

### React Flowの設定

参照元と同じ設定を維持：
```typescript
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodesDraggable={true}
  nodesConnectable={true}
  nodesFocusable={true}
  edgesFocusable={true}
  elementsSelectable={true}
  nodesDeletable={true}
  edgesDeletable={true}
  deleteKeyCode="Delete"
  multiSelectionKeyCode="Control"
  selectionOnDrag={false}
  panOnDrag={[1, 2]}
  selectionMode="partial"
  // ...
>
```

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 1,800行の大規模コンポーネント | 高 | 高 | 段階的に実装、Phase分割 |
| TypeScript型定義の複雑さ | 中 | 中 | any型を一時的に許可、後で厳密化 |
| コンテキストウィンドウ不足 | 高 | 中 | 複数セッションに分割 |
| useEffect依存配列の設定ミス | 中 | 中 | ESLint警告に従う |
| イベントハンドラーの接続漏れ | 中 | 中 | チェックリスト使用 |

---

## 6. 完了判定基準

### 必須要件
- [ ] TypeScriptコンパイルエラーなし
- [ ] すべてのサブコンポーネントが統合されている
- [ ] React Flowが正常に動作する
- [ ] ノード追加・編集・削除が可能
- [ ] Undo/Redo機能が動作する
- [ ] 保存機能が動作する（バリデーション含む）

### 推奨要件
- [ ] ESLintエラーが最小限
- [ ] Material-UI依存がゼロ
- [ ] カスタムフックが正しく動作
- [ ] 複数Method対応が動作
- [ ] Draft管理が動作

---

## 7. 次回セッションへの引き継ぎ

### コンテキストウィンドウが不足した場合

**現在のコンテキストウィンドウ使用率: 80%**

Phase 4を複数セッションに分割する場合：

#### セッション1: Phase A-C（基本骨格+統合）
- 推定時間: 3時間
- コンテキストウィンドウ: 約40-50%

#### セッション2: Phase D-G（ハンドラー+最終調整）
- 推定時間: 2-3時間
- コンテキストウィンドウ: 約30-40%

---

## 8. 承認記録

- **計画書提示日時**: 2025-12-23 09:18
- **承認日時**: （承認待ち）
- **承認者コメント**: 

---

## 9. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 最終的な成果物
- [ ] PetriNetEditor.tsx（約1,500-1,800行）完成
- [ ] TypeScript + Ant Design v6変換完了
- [ ] 全機能動作確認完了

---

**Phase 4 詳細計画完了**

次のステップ: ユーザーの承認後、Phase A（基本骨格）から実装開始

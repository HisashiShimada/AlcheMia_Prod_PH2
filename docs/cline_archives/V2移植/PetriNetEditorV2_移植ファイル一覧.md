# PetriNetEditorV2 移植ファイル一覧

## 作成日
2026-01-29

## 概要
reference/frontend/src/components/PetriNetEditorV2 の移植に必要なファイルの完全リストです。

---

## 1. PetriNetEditorV2フォルダ内のファイル（31ファイル）

### 移植状況サマリー
- ✅ 移植完了: 22ファイル
- ⏳ 未移植: 9ファイル
- 📝 Note: TypeScript化（tsx/ts）により移植完了

### 1.1 メインファイル
```
reference/frontend/src/components/PetriNetEditorV2/
├── ✅ index.jsx                        # → index.tsx に統合
└── ✅ PetriNetEditorInner.jsx         # → PetriNetEditorV2.tsx に統合
```
**移植先**: `frontend/src/components/editorv2/PetriNetEditorV2.tsx`, `index.tsx`

### 1.2 componentsフォルダ（14ファイル）
```
reference/frontend/src/components/PetriNetEditorV2/components/
├── ✅ DocumentEditDialog.jsx           # → DocumentEditDialog.tsx
├── ❌ DraftManager.jsx                 # Draft管理ダイアログ（未移植）
├── ✅ EditorToolbar.jsx                # → EditorToolbar.tsx
├── ✅ MethodTabPanel.jsx               # → MethodTabPanel.tsx
├── ❌ MultiObjectEditor.jsx            # 複数オブジェクト編集（未移植）
├── ✅ PropertyPanel.jsx                # → PropertyPanel.tsx
├── ❌ SaveConfirmDialog.jsx            # 保存確認ダイアログ（未移植）
├── ✅ SaveDialog.jsx                   # → SaveDialog.tsx
├── ✅ TemplateEditorDialog.jsx         # → TemplateEditorDialog.tsx
├── ❌ TemplateListItem.jsx             # テンプレートリストアイテム（未移植）
├── ❌ TemplateListView.jsx             # テンプレートリストビュー（未移植）
├── ✅ ValidationPanel.jsx              # → ValidationPanel.tsx
├── ❌ WorkflowSelectorDialog.jsx       # ワークフロー選択ダイアログ（未移植）
└── TemplateViewer/
    ├── ❌ index.js                     # エクスポート（未移植）
    ├── ❌ TemplateItem.jsx             # テンプレートアイテム（未移植）
    └── ❌ TemplateList.jsx             # テンプレートリスト（未移植）
```
**移植先**: `frontend/src/components/editorv2/components/`
**追加ファイル**: 
- ✨ ReactFlowCanvas.tsx（新規作成）
- ✨ nodes/ConditionPlaceNode.tsx（新規作成）
- ✨ nodes/MaterialPlaceNode.tsx（新規作成）
- ✨ nodes/ResultPlaceNode.tsx（新規作成）
- ✨ nodes/TransitionNode.tsx（新規作成）

### 1.3 hooksフォルダ（4ファイル）
```
reference/frontend/src/components/PetriNetEditorV2/hooks/
├── ✅ useDraftManager.js               # → useDraftManager.ts
├── ✅ useHistory.js                    # → useHistory.ts
├── ✅ useNamespaceOperations.js        # → useNamespaceOperations.ts
└── ✅ useWorkflow.js                   # → useWorkflow.ts
```
**移植先**: `frontend/src/components/editorv2/hooks/`

### 1.4 nodesフォルダ（2ファイル）
```
reference/frontend/src/components/PetriNetEditorV2/nodes/
├── ✅ EditablePlaceNode.jsx            # → EditablePlaceNode.tsx
└── ✅ EditableTransitionNode.jsx       # → EditableTransitionNode.tsx
```
**移植先**: `frontend/src/components/editorv2/nodes/`

### 1.5 stylesフォルダ（2ファイル）
```
reference/frontend/src/components/PetriNetEditorV2/styles/
├── ❌ editorTheme.js                   # MUIテーマ定義（未移植）
└── ❌ errorStyles.css                  # エラー表示スタイル（未移植）
```
**Note**: スタイルはAnt Designベースに変更されている可能性があります

### 1.6 utilsフォルダ（6ファイル）
```
reference/frontend/src/components/PetriNetEditorV2/utils/
├── ✅ documentParser.js                # → documentParser.ts
├── ✅ templateExtractor.js             # → templateExtractor.ts
├── ✅ xmlSignature.js                  # → xmlSignature.ts
└── converters/
    ├── ✅ maimlToReactFlow.js         # → maimlToReactFlow.ts
    ├── ✅ multiMethodConverter.js      # → multiMethodConverter.ts
    └── ✅ reactFlowToMaiml.js         # → reactFlowToMaiml.ts
```
**移植先**: `frontend/src/components/editorv2/utils/`
**追加ファイル**: 
- ✨ types/index.ts（型定義ファイル、新規作成）

---

## 2. 外部依存コンポーネント（PetriNetEditorV2外）

### 2.1 PetriNetViewerコンポーネント
```
reference/frontend/src/components/PetriNetViewer/
├── nodes/
│   ├── MaterialTemplateNode.jsx        # ★必須: Material表示ノード
│   ├── ConditionTemplateNode.jsx       # ★必須: Condition表示ノード
│   ├── ResultTemplateNode.jsx          # ★必須: Result表示ノード
│   └── TransitionNode.jsx              # ★必須: Transition表示ノード
└── utils/
    ├── petriNetExtractor.js            # ★必須: buildTemplateMap関数
    └── reactFlowConverter.js           # ★必須: convertToReactFlowFormat関数
```

### 2.2 Contextsフォルダ
```
reference/frontend/src/contexts/
└── TemplateContext.js                  # ★必須: テンプレート管理Context
    - TemplateProvider
    - useTemplates
```

### 2.3 ExperimentRecorderコンポーネント
```
reference/frontend/src/components/ExperimentRecorder/
└── utils/
    └── MaiMLParser.js                  # ★必須: MaiMLパーサー
```

### 2.4 Servicesフォルダ
```
reference/frontend/src/services/
└── apiService.js                       # ★必須: API通信サービス
    - fetchFileContent
    - fetchFileList
```

### 2.5 Hooksフォルダ
```
reference/frontend/src/hooks/
└── useNamespaceOperations.js           # ★必須: 名前空間操作フック
```

---

## 3. 外部ライブラリ依存関係

### 3.1 React Flow関連
```json
{
  "reactflow": "^11.11.4",              # ★必須: React Flowライブラリ
  "@reactflow/core": "^11.x",
  "@reactflow/node-toolbar": "^1.x"
}
```

### 3.2 Material-UI関連
```json
{
  "@mui/material": "^5.x",              # ★必須: MUIコンポーネント
  "@mui/icons-material": "^5.x",        # ★必須: MUIアイコン
  "@emotion/react": "^11.x",            # ★必須: CSS-in-JS
  "@emotion/styled": "^11.x"            # ★必須: styled components
}
```

### 3.3 その他
```json
{
  "react": "^18.2.0",                   # ★必須
  "react-dom": "^18.2.0",               # ★必須
  "xml-js": "^1.6.11"                   # MaiML解析用
}
```

---

## 4. 移植手順の推奨順序

### Phase 1: 基盤準備
1. **外部ライブラリのインストール**
   ```bash
   npm install reactflow @mui/material @mui/icons-material @emotion/react @emotion/styled xml-js
   ```

2. **外部依存コンポーネントの確認**
   - PetriNetViewer/nodes/* の4ファイル
   - PetriNetViewer/utils の2ファイル
   - TemplateContext.js
   - MaiMLParser.js
   - apiService.js
   - useNamespaceOperations.js

### Phase 2: Utilsとスタイル
3. **utilsフォルダ（6ファイル）**
4. **stylesフォルダ（2ファイル）**

### Phase 3: Hooks
5. **hooksフォルダ（4ファイル）**

### Phase 4: Nodesコンポーネント
6. **nodesフォルダ（2ファイル）** ※既存Viewerノードが使えれば不要の可能性

### Phase 5: UIコンポーネント
7. **componentsフォルダ（14ファイル）**
   - 小さいコンポーネントから順に
   - EditorToolbar → PropertyPanel → TemplateEditorDialog → ...

### Phase 6: メインコンポーネント
8. **PetriNetEditorInner.jsx**
9. **index.jsx**

---

## 5. 既存実装との差分確認が必要な項目

### 5.1 既に存在する可能性のあるコンポーネント
- `frontend/src/components/PetriNetViewer/` - 既存のViewer実装
- `frontend/src/contexts/TemplateContext.tsx` - 既存のContext（TSX）
- `frontend/src/services/apiService.ts` - 既存のAPIサービス（TS）

### 5.2 確認が必要な点
1. **既存PetriNetViewerとの統合**
   - nodesコンポーネントの再利用可否
   - utilsの重複確認

2. **TypeScript化**
   - referenceはJSX/JS
   - 現行プロジェクトはTSX/TS
   - 型定義の追加が必要

3. **APIエンドポイント**
   - `/api/worker/petri-net-structure-from-content`
   - `/api/worker/multiple-methods-structure-from-content`
   - `/api/s3/validate-maiml-content`
   - `/api/s3/maiml-auto-correct-realtime`
   - `/api/s3/save`
   - `/api/s3/files`
   - `/api/s3/file-content`
   - `/api/s3/maiml-drafts`

---

## 6. 重要な注意事項

### 6.1 必須の外部依存
以下のコンポーネントが存在しない場合、移植前に作成が必要：
- ✅ PetriNetViewer/nodes/* （4ファイル）
- ✅ PetriNetViewer/utils/* （2ファイル）
- ✅ TemplateContext
- ✅ MaiMLParser
- ⚠️ apiService（既存の可能性あり、拡張が必要）
- ⚠️ useNamespaceOperations（既存の可能性あり）

### 6.2 TypeScript化の対応
- 全JSXファイルをTSXに変換
- 全JSファイルをTSに変換
- 型定義ファイルの作成
- インターフェース定義の追加

### 6.3 スタイリング
- MUI v5のテーマシステム使用
- Emotion（CSS-in-JS）使用
- 既存プロジェクトがAnt Designの場合、統合方法の検討が必要

---

## 7. 移植完了チェックリスト

### 基本機能
- [x] PetriNetEditorV2フォルダ内のファイル移植（22/31ファイル完了）
- [ ] 残り9ファイルの移植
  - [ ] DraftManager
  - [ ] MultiObjectEditor
  - [ ] SaveConfirmDialog
  - [ ] TemplateListItem
  - [ ] TemplateListView
  - [ ] WorkflowSelectorDialog
  - [ ] TemplateViewer/* (3ファイル)
  - [ ] styles/* (2ファイル)
- [ ] 外部依存コンポーネント（9箇所）を確認・整備
- [ ] 外部ライブラリをインストール

### 機能確認
- [ ] ペトリネット表示機能
- [ ] ノード追加・削除機能
- [ ] エッジ接続機能
- [ ] Undo/Redo機能
- [ ] テンプレート編集機能
- [ ] Document編集機能
- [ ] バリデーション機能
- [ ] 保存機能（S3、ローカル）
- [ ] Draft管理機能
- [ ] ワークフロー追加機能
- [ ] 複数Method対応
- [ ] テンプレート一覧表示

### TypeScript化
- [ ] 全TSX/TSファイルに型定義を追加
- [ ] interface/type定義ファイルの作成
- [ ] エラーなくビルドが通ること

---

## 8. まとめ

**移植対象ファイル総数: 31ファイル（PetriNetEditorV2内）**
- ✅ **移植完了: 22ファイル (71%)**
- ⏳ **未移植: 9ファイル (29%)**

**外部依存箇所: 9箇所（最低限必要）**

### 移植完了状況
- メインファイル: ✅ 2/2 (100%)
- components: ✅ 8/14 (57%)
- hooks: ✅ 4/4 (100%)
- nodes: ✅ 2/2 (100%)
- styles: ❌ 0/2 (0%)
- utils: ✅ 6/6 (100%)

### 次のステップ
1. 未移植の9ファイルを移植
2. 外部依存コンポーネントの確認・整備
3. 機能テスト・動作確認

移植作業は順調に進んでいます。特に未移植のダイアログコンポーネントの移植を進めることを推奨します。

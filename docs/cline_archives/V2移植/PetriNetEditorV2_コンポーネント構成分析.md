# PetriNetEditorV2 コンポーネント構成分析

**調査日時**: 2026-01-29 16:53  
**対象**: reference/frontend/src/components/PetriNetEditorV2/

---

## 📋 分析結果サマリー

### 調査済みファイル数
- 進行中: 1/N ファイル

### 主要な依存関係
- React Flow
- Material-UI
- (調査中...)

---

## 📁 ファイル別詳細分析

### 1. index.jsx
**パス**: `reference/frontend/src/components/PetriNetEditorV2/index.jsx`  
**役割**: エントリーポイント

#### インポート
**外部ライブラリ:**
- `React` from 'react'
- `ReactFlowProvider` from 'reactflow'

**内部コンポーネント:**
- `PetriNetEditorInner` from `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx`

#### 主な機能
- ReactFlowProviderでラップしてReact Flowコンテキストを提供
- propsを整形してPetriNetEditorInnerに渡す
  - `initialMaiMLData` → `maimlData`
  - `initialEditMode` → `editMode`

#### 受け取るProps
- `initialMaiMLData`: MAIMLデータ
- `editingFileName`: 編集中のファイル名
- `originalFileName`: 元のファイル名
- `sourceS3Key`: S3キー
- `initialEditMode`: 編集モード（読み取り専用/編集可能）

---

### 2. PetriNetEditorInner.jsx
**パス**: `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx`  
**役割**: メインコンポーネント（React Flow統合、状態管理、編集機能）

#### インポート

**Reactフック:**
- `React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense }` from 'react'

**React Flow:**
- `ReactFlow, { useNodesState, useEdgesState, useReactFlow, Background, Controls, MiniMap, addEdge }` from 'reactflow'
- `'reactflow/dist/style.css'`

**Material-UI:**
- `{ Box, ThemeProvider, CircularProgress, Alert, Typography }` from '@mui/material'

**スタイル・テーマ:**
- `editorTheme` from `reference/frontend/src/components/PetriNetEditorV2/styles/editorTheme.js`
- `'./styles/errorStyles.css'`

**コンテキスト:**
- `{ TemplateProvider, useTemplates }` from `reference/frontend/src/contexts/TemplateContext.jsx`

**コンポーネント（components/配下）:**
- `TemplateList` from `reference/frontend/src/components/PetriNetEditorV2/components/TemplateViewer.jsx`
- `EditorToolbar` from `reference/frontend/src/components/PetriNetEditorV2/components/EditorToolbar.jsx`
- `MethodTabPanel` from `reference/frontend/src/components/PetriNetEditorV2/components/MethodTabPanel.jsx`
- `PropertyPanel` from `reference/frontend/src/components/PetriNetEditorV2/components/PropertyPanel.jsx`
- `TemplateEditorDialog` from `reference/frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx`
- `DocumentEditDialog` from `reference/frontend/src/components/PetriNetEditorV2/components/DocumentEditDialog.jsx`
- `WorkflowSelectorDialog` from `reference/frontend/src/components/PetriNetEditorV2/components/WorkflowSelectorDialog.jsx`
- `SaveDialog` from `reference/frontend/src/components/PetriNetEditorV2/components/SaveDialog.jsx`
- `DraftManager` from `reference/frontend/src/components/PetriNetEditorV2/components/DraftManager.jsx`
- `SaveConfirmDialog` from `reference/frontend/src/components/PetriNetEditorV2/components/SaveConfirmDialog.jsx`
- `ValidationPanel` from `reference/frontend/src/components/PetriNetEditorV2/components/ValidationPanel.jsx`

**カスタムフック（hooks/配下）:**
- `useHistory` from `reference/frontend/src/components/PetriNetEditorV2/hooks/useHistory.js`
- `useWorkflow` from `reference/frontend/src/components/PetriNetEditorV2/hooks/useWorkflow.js`
- `useDraftManager` from `reference/frontend/src/components/PetriNetEditorV2/hooks/useDraftManager.js`

**ユーティリティ（utils/converters/配下）:**
- `{ convertReactFlowToMaiML, validatePetriNet }` from `reference/frontend/src/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js`
- `convertMultipleMethodsToMaiML` from `reference/frontend/src/components/PetriNetEditorV2/utils/converters/multiMethodConverter.js`

**Viewer用ノード（../PetriNetViewer/nodes/配下）:**
- `MaterialTemplateNode` from `reference/frontend/src/components/PetriNetViewer/nodes/MaterialTemplateNode.jsx`
- `ConditionTemplateNode` from `reference/frontend/src/components/PetriNetViewer/nodes/ConditionTemplateNode.jsx`
- `ResultTemplateNode` from `reference/frontend/src/components/PetriNetViewer/nodes/ResultTemplateNode.jsx`
- `TransitionNode` from `reference/frontend/src/components/PetriNetViewer/nodes/TransitionNode.jsx`

**Viewerユーティリティ（../PetriNetViewer/utils/配下）:**
- `buildTemplateMap` from `reference/frontend/src/components/PetriNetViewer/utils/petriNetExtractor.js`
- `convertToReactFlowFormat` from `reference/frontend/src/components/PetriNetViewer/utils/reactFlowConverter.js`

**その他ユーティリティ:**
- `extractDocumentFromMaiML` from `reference/frontend/src/components/PetriNetEditorV2/utils/documentParser.js`
- `MaiMLParser` from `reference/frontend/src/components/ExperimentRecorder/utils/MaiMLParser.js`

#### 主な機能
- ペトリネット編集画面の全体制御
- ノード・エッジの状態管理（React Flow State）
- 複数メソッド対応
- バリデーション・エラー表示
- 編集履歴管理（Undo/Redo）
- テンプレート管理
- ドキュメント編集
- Draft管理・自動保存
- ワークフロー追加
- 保存機能（S3/ローカル）

#### 内部構造
- `PetriNetEditorContent`: メインロジックコンポーネント
- `PetriNetEditorInnerUI`: UIレンダリングコンポーネント（TemplateProvider内）

---

## 🔄 依存関係ツリー

```
index.jsx
└── PetriNetEditorInner.jsx
    ├── [外部ライブラリ]
    │   ├── React (useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense)
    │   ├── ReactFlow (useNodesState, useEdgesState, useReactFlow, Background, Controls, MiniMap, addEdge)
    │   └── Material-UI (Box, ThemeProvider, CircularProgress, Alert, Typography)
    │
    ├── [スタイル]
    │   ├── editorTheme
    │   └── errorStyles.css
    │
    ├── [コンテキスト]
    │   └── TemplateProvider, useTemplates
    │
    ├── [コンポーネント] (調査予定)
    │   ├── TemplateList
    │   ├── EditorToolbar
    │   ├── MethodTabPanel
    │   ├── PropertyPanel
    │   ├── TemplateEditorDialog
    │   ├── DocumentEditDialog
    │   ├── WorkflowSelectorDialog
    │   ├── SaveDialog
    │   ├── DraftManager
    │   ├── SaveConfirmDialog
    │   └── ValidationPanel
    │
    ├── [カスタムフック] (調査予定)
    │   ├── useHistory
    │   ├── useWorkflow
    │   └── useDraftManager
    │
    ├── [ユーティリティ] (調査予定)
    │   ├── converters/
    │   │   ├── reactFlowToMaiml
    │   │   └── multiMethodConverter
    │   └── documentParser
    │
    └── [ノードコンポーネント] (調査予定)
        ├── MaterialTemplateNode
        ├── ConditionTemplateNode
        ├── ResultTemplateNode
        └── TransitionNode
```

---

## 📊 統計情報

### ファイル数
- 調査完了: 2
- 調査中: 0
- 未調査: 30+

### コンポーネント種別
- エントリーポイント: 1
- メインコンポーネント: 1
- UIコンポーネント: 11 (未調査)
- ノードコンポーネント: 4 (未調査)
- カスタムフック: 3 (未調査)
- ユーティリティ: 5+ (未調査)

---

### 3. EditorToolbar.jsx
**パス**: `reference/frontend/src/components/PetriNetEditorV2/components/EditorToolbar.jsx`  
**役割**: 編集ツールバー（ノード追加、Undo/Redo、保存、バリデーション等）

#### インポート

**Reactフック:**
- `React` from 'react'

**Material-UI コンポーネント:**
- `{ Box, Button, Divider, Tooltip, IconButton, Switch, FormControlLabel, Typography, ToggleButtonGroup, ToggleButton }` from '@mui/material'

**Material-UI アイコン:**
- `RadioButtonUnchecked` (Material Place)
- `CropSquare` (Condition Place)
- `RoundedCorner` (Result Place)
- `CompareArrows` (Transition)
- `Undo, Redo` (編集履歴)
- `Save` (保存)
- `Description` (Document編集)
- `CheckCircle` (バリデーション)
- `AccountTree` (ワークフロー追加)
- `FolderOpen` (Draft管理)
- `BubbleChart as PetriNetIcon` (ペトリネットビュー)
- `List as TemplateListIcon` (テンプレートビュー)

#### 主な機能
- **ノード追加ボタン**: Material, Condition, Result, Transition
- **編集機能**: Undo/Redo（履歴管理）
- **保存機能**: 保存ボタン、自動保存トグル
- **ビューモード切替**: ペトリネット ⇔ テンプレート
- **ワークフロー追加**: 他のMAIMLファイルを統合
- **Document編集**: ドキュメント編集ダイアログ起動
- **バリデーション**: ペトリネット検証実行
- **Draft管理**: 一時保存・読み込み

#### Props
- `onAddNode`: ノード追加ハンドラー
- `onUndo, onRedo`: Undo/Redoハンドラー
- `canUndo, canRedo`: Undo/Redo可否
- `onSave, canSave`: 保存ハンドラーと可否
- `onEditDocument`: Document編集ハンドラー
- `onValidate, isValidating`: バリデーションハンドラーと状態
- `onAddWorkflow, workflowModeActive`: ワークフロー追加
- `onOpenDraftManager`: Draft管理ダイアログ起動
- `autoSaveEnabled, onAutoSaveToggle, lastAutoSaveTime`: 自動保存関連
- `viewMode, onViewModeChange`: ビューモード切替

#### UIレイアウト
- ツールバー形式（flexbox、横並び）
- ボタングループをDividerで区切り
- 右端に自動保存トグルとヒント表示

---

---

### 4. TemplateEditorDialog.jsx
**パス**: `reference/frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx`  
**役割**: テンプレート情報編集ダイアログ（NestedPropertyEditor完全準拠版）

#### インポート

**Reactフック:**
- `React, { useState, useEffect, useMemo }` from 'react'

**Material-UI コンポーネント（大量）:**
- `Dialog, DialogTitle, DialogContent, DialogActions` - ダイアログ構造
- `Button, TextField, Box, Typography` - 基本UI
- `IconButton, Chip, Alert` - インタラクション
- `Select, MenuItem, FormControl, InputLabel, Divider` - フォーム
- `Accordion, AccordionSummary, AccordionDetails` - 展開可能パネル

**Material-UI アイコン（18個）:**
- `Close, Add, Delete, Save` - 基本アクション
- `Science, Tune, Assessment` - テンプレートタイプ
- `ExpandMore, ChevronRight` - 展開制御
- `CloudDownload, Folder` - ファイル操作
- その他多数

**カスタムフック:**
- `useNamespaceOperations` from `reference/frontend/src/components/PetriNetEditorV2/hooks/useNamespaceOperations`

**内部定義コンポーネント:**
- `NestedPropertyEditor` - ファイル内で定義（再帰的なプロパティ編集UI）

#### 主な機能
- **テンプレート基本情報編集**: UUID, Name, Description, Insertion
- **NestedPropertyEditor統合**: 属性・要素・子要素の階層的編集
- **MaiML Property Types**: 45種類のデータ型対応（Simple/List）
- **Properties管理**: ネスト構造のプロパティ編集（xsi:type対応）
- **Contents管理**: ResultTemplate用のコンテンツ編集
- **Place References編集**: 参照するPlaceの管理
- **名前空間テンプレート取り込み**: S3フォルダからテンプレートインポート
- **継承元テンプレート表示**: templateRefからの継承情報（読み取り専用）
- **バリデーションエラー表示**: テンプレートエラーの可視化

#### State管理（多数）
- 基本情報: `templateId, uuid, name, description, insertion`
- Properties: `properties, expandedNodes, forceRenderKey`
- Contents: `contents, expandedContentNodes, forceContentRenderKey`
- Place Refs: `placeRefs`
- 名前空間: `namespaceFiles, s3FolderStructure, namespaceData`
- モーダル制御: 各種ダイアログ表示フラグ

#### Props
- `open, onClose`: ダイアログ制御
- `node`: 編集対象ノード
- `onSave`: 保存ハンドラー
- `allNodes`: 全ノード（継承元・Place参照用）
- `templateErrors`: バリデーションエラー

#### 特徴的な実装
- **V1パターン適用**: `forceRenderKey`による強制再レンダリング
- **深い再帰探索**: ネスト構造の属性・要素更新
- **XML直接抽出**: `element`からの子要素再構築
- **継承元情報の拡張**: XMLから子要素を直接抽出して補完

---

---

### 5. DocumentEditDialog.jsx
**パス**: `reference/frontend/src/components/PetriNetEditorV2/components/DocumentEditDialog.jsx`  
**役割**: Document編集ダイアログ（Creator、Vendor、Owner、Instrument）

#### インポート

**Reactフック:**
- `React, { useState, useCallback, useEffect, useMemo, useRef }` from 'react'

**Material-UI コンポーネント（多数）:**
- `Dialog, DialogTitle, DialogContent, DialogActions` - ダイアログ構造
- `Button, TextField, Box, Typography, Grid` - 基本UI
- `Accordion, AccordionSummary, AccordionDetails` - セクション展開
- `Alert, IconButton, Chip, Checkbox, FormControlLabel, Paper` - その他
- `Select, MenuItem, FormControl, InputLabel` - セレクトボックス

**Material-UI アイコン:**
- `ExpandMore, Casino, Schedule, Add, Security` - 各種操作アイコン

**内部コンポーネント:**
- `MultiObjectEditor` from `reference/frontend/src/components/PetriNetEditorV2/components/MultiObjectEditor.jsx`
- `IndependentComplexObjectEditor` - ファイル内で定義（独立した複合オブジェクトエディタ）

#### 主な機能
- **Document基本情報編集**: ID, UUID, Name, Description, Date
- **MaiML ID属性編集**: Protocol ID, Method ID, PNML ID, Program ID
- **複数要素管理**: Creator（必須1+）、Vendor（必須1+）、Owner（必須1+）、Instrument（任意）
- **参照プロパティ**: vendorRef, instrumentRef（Creatorのみ）
- **UUID自動生成**: 個別・一括生成機能
- **XML署名機能**: W3C XMLDSig対応（改ざん防止）
- **バリデーション**: リアルタイムバリデーション（遅延実行）
- **新規作成対応**: 新規Documentモードと編集モードの切り替え

#### State管理
- `editingDocument`: 編集中のDocumentデータ
- `expandedSections`: 各セクションの展開状態
- `hasChanges`: 変更フラグ
- `validationErrors`: バリデーションエラー配列
- `isNewDocument`: 新規作成フラグ

#### Props
- `open`: ダイアログ表示フラグ
- `documentData`: 編集対象Documentデータ
- `onClose`: 閉じるハンドラー
- `onSave`: 保存ハンドラー

#### 特徴的な実装
- **後方互換性**: 単一オブジェクトを配列に自動正規化
- **遅延バリデーション**: 500msのタイムアウト処理
- **ID重複チェック**: 全要素のID重複を検証
- **参照ID連番生成**: vendorRef_1, instrumentRef_1 形式

---

---

### 6. MultiObjectEditor.jsx
**パス**: `reference/frontend/src/components/PetriNetEditorV2/components/MultiObjectEditor.jsx`  
**役割**: 複数オブジェクト編集コンポーネント（DocumentEditDialogから使用）

#### インポート

**Reactフック:**
- `React, { useState, useCallback, useEffect, useRef }` from 'react'

**Material-UI コンポーネント:**
- `Box, Button, IconButton, TextField, Grid, Typography` - 基本UI
- `Accordion, AccordionSummary, AccordionDetails` - 展開パネル
- `Alert, Chip, Paper` - フィードバック
- `FormControl, InputLabel, Select, MenuItem` - セレクトボックス

**Material-UI アイコン:**
- `ExpandMore, Add, Delete` - 基本操作
- `ArrowUpward, ArrowDownward` - 並び替え
- `Casino` - UUID生成

**内部コンポーネント:**
- `SingleObjectEditor` - ファイル内で定義（単一オブジェクト編集UI）

#### 主な機能
- **複数要素管理**: Creator、Vendor、Owner、Instrument等の配列管理
- **CRUD操作**: 追加、削除、編集、並び替え（上下移動）
- **UUID自動生成**: 各要素にUUID生成機能
- **参照プロパティ**: vendorRef, instrumentRef対応
- **最小件数制御**: minItems以下の削除を防止
- **遅延更新**: 500msのタイムアウト処理でパフォーマンス最適化
- **展開制御**: 各アイテムの個別展開/折りたたみ

#### State管理
- `objects`: 管理対象オブジェクト配列
- `expandedItems`: 各アイテムの展開状態

#### Props
- `objectKey`: オブジェクト種別（'creators', 'vendors', 'owners', 'instruments'）
- `title`: 表示タイトル
- `icon`: アイコン（絵文字）
- `includeReferences`: 参照プロパティ表示フラグ
- `initialData`: 初期データ配列
- `onDataChange`: データ変更ハンドラー
- `minItems`: 最小件数（デフォルト: 1）
- `isExpanded`: 展開状態
- `onToggleExpanded`: 展開切り替えハンドラー
- `vendorIds, instrumentIds`: 参照先ID一覧（Phase緊急修正で追加）

#### 特徴的な実装
- **遅延更新**: 500msのdebounce処理でパフォーマンス向上
- **参照ID連番生成**: `vendorRef_1`, `instrumentRef_2` 形式
- **自動展開**: 新規追加時に自動で展開
- **削除保護**: minItems以下の削除を無効化

---

---

### 7. TemplateViewer/ (ディレクトリ)
**パス**: `reference/frontend/src/components/PetriNetEditorV2/components/TemplateViewer/`  
**役割**: テンプレート一覧表示機能

#### 構成ファイル
- **index.js** - エクスポート（TemplateList, TemplateItemをエクスポート）
- **TemplateList.jsx** - メインコンポーネント
- **TemplateItem.jsx** - 個別テンプレート表示

#### TemplateList.jsx インポート

**Reactフック:**
- `React, { useState }` from 'react'

**Material-UI コンポーネント:**
- `Box, Typography, Badge, CircularProgress, Paper` - レイアウト・表示
- `FormControlLabel, Checkbox, IconButton, Tooltip` - インタラクション

**Material-UI アイコン:**
- `AddIcon` - テンプレート追加

**コンテキスト:**
- `useTemplates` from `reference/frontend/src/contexts/TemplateContext.jsx`

**内部コンポーネント:**
- `TemplateItem` from `reference/frontend/src/components/PetriNetEditorV2/components/TemplateViewer/TemplateItem.jsx`

#### 主な機能
- **3カラムレイアウト**: Material, Condition, Result の3分割表示
- **テンプレート一覧表示**: Context APIから取得したテンプレートを表示
- **共通テンプレート切替**: プロジェクト固有/共通の切り替え
- **カテゴリ別カラー**: Material（黄）、Condition（青）、Result（紫）
- **テンプレート追加**: カテゴリごとの追加ボタン
- **エラーバッジ表示**: バリデーションエラー件数を表示
- **スクロール最適化**: 各カラム独立スクロール、常時スクロールバー表示

#### Props
- `onTemplateSelect`: テンプレート選択ハンドラー
- `showCommonTemplates`: 共通テンプレート表示フラグ
- `onShowCommonTemplatesChange`: 表示切替ハンドラー
- `onTemplateAdd`: テンプレート追加ハンドラー
- `onTemplateDelete`: テンプレート削除ハンドラー

#### Context使用
- `templates`: プロジェクト固有テンプレート
- `commonTemplates`: 共通テンプレート
- `allTemplates`: 全テンプレート
- `templateErrors`: バリデーションエラー
- `isLoading`: ローディング状態

#### UIレイアウト特徴
- **Grid Layout**: `gridTemplateColumns: 'repeat(3, 1fr)'`
- **固定ヘッダー**: カテゴリ名・件数・追加ボタン
- **スクロール領域**: `overflowY: 'scroll'` 常時表示
- **Webkit/Firefox対応**: カスタムスクロールバースタイル

---

## 🔍 次の調査対象

1. ✅ index.jsx - 完了
2. ✅ PetriNetEditorInner.jsx - 完了
3. 🔄 components/配下（13コンポーネント + 2ファイル）
   - ✅ EditorToolbar.jsx - 完了
   - ✅ TemplateEditorDialog.jsx - 完了
   - ✅ DocumentEditDialog.jsx - 完了
   - ✅ MultiObjectEditor.jsx - 完了
   - ✅ TemplateViewer/ (TemplateList, TemplateItem) - 完了
   - ⏳ 残り8コンポーネント（効率化調査へ）
4. ⏳ hooks/配下（4フック）
5. ⏳ utils/配下（5+ユーティリティ）
6. ⏳ ノードコンポーネント（4ノード）

---

*このドキュメントは調査の進行に伴って更新されます*

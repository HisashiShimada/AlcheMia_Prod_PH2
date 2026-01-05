# reference配下のMAIML編集画面（PetriNetEditorV2）構成分析

## 作成日時
2025-12-23 08:14

## 1. 概要

reference配下の既存ソース `reference/frontend/src/components/PetriNetEditorV2/` は、React Flow + Material-UIをベースとしたペトリネット（MAIML）編集画面です。

- **バージョン**: 2.0.0-beta
- **最終更新**: 2025-10-30
- **主要技術**: React Flow, Material-UI (@mui/material), ReactFlow Provider

## 2. ディレクトリ構造

```
reference/frontend/src/components/PetriNetEditorV2/
├── index.jsx                      # エントリーポイント
├── PetriNetEditorInner.jsx       # メインコンポーネント（約1800行）
├── components/                    # サブコンポーネント
│   ├── EditorToolbar.jsx         # 編集ツールバー
│   ├── PropertyPanel.jsx         # プロパティパネル（右側パネル）
│   ├── TemplateEditorDialog.jsx  # テンプレート編集ダイアログ
│   ├── DocumentEditDialog.jsx    # Document情報編集ダイアログ
│   ├── MethodTabPanel.jsx        # Method管理タブ
│   ├── SaveDialog.jsx            # 保存ダイアログ（旧版）
│   ├── SaveConfirmDialog.jsx     # 保存確認ダイアログ（新版）
│   ├── ValidationPanel.jsx       # バリデーションパネル
│   ├── WorkflowSelectorDialog.jsx # ワークフロー選択ダイアログ
│   ├── DraftManager.jsx          # Draft管理ダイアログ
│   └── MultiObjectEditor.jsx     # 複数オブジェクト編集（未使用？）
├── hooks/                         # カスタムフック
│   ├── useHistory.js             # Undo/Redo履歴管理
│   ├── useWorkflow.js            # ワークフロー追加機能
│   ├── useDraftManager.js        # Draft自動保存機能
│   └── useNamespaceOperations.js # Namespace操作
├── nodes/                         # カスタムノード
│   ├── EditablePlaceNode.jsx     # 編集可能なPlaceノード
│   └── EditableTransitionNode.jsx # 編集可能なTransitionノード
├── styles/                        # スタイル定義
│   └── editorTheme.js            # Material-UIテーマ
└── utils/                         # ユーティリティ
    ├── documentParser.js         # Document情報パース
    ├── xmlSignature.js           # XML署名処理
    └── converters/               # 変換ユーティリティ
        ├── reactFlowToMaiml.js   # React Flow → MAIML変換
        └── multiMethodConverter.js # 複数Method → MAIML変換
```

## 3. 画面構成

### 3.1. 全体レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ EditorToolbar (ツールバー)                                    │
│ [Material] [Condition] [Result] | [Transition] | ...         │
├─────────────────────────────────────────────────────────────┤
│ MethodTabPanel (Method管理タブ)                               │
│ [Method 1] [Method 2] [+ 追加]                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  React Flow Canvas (ペトリネット描画エリア)                   │
│  ┌───────────────────────────────────────────┐              │
│  │                                             │              │
│  │  ○ Material Place                          │  PropertyPanel│
│  │     ↓                                      │  ┌──────────┐│
│  │  □ Transition                              │  │ ノード    ││
│  │     ↓                                      │  │ プロパティ││
│  │  ◇ Result Place                            │  │          ││
│  │                                             │  │ [編集]   ││
│  │  [Controls] [MiniMap]                       │  │          ││
│  └───────────────────────────────────────────┘  └──────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. EditorToolbar（ツールバー）

**表示位置**: 画面上部

**主要ボタン**:
- **ノード追加**: Material / Condition / Result / Transition
- **ワークフロー追加**: 他のMAIMLファイルを統合
- **Document編集**: Document要素の編集
- **バリデーション**: MaiMLバリデーション実行
- **保存**: S3またはローカルに保存 (Ctrl+S)
- **Draft管理**: Draft一時保存・読み込み
- **Undo/Redo**: 操作の取り消し・やり直し (Ctrl+Z/Y)
- **自動保存トグル**: 自動保存ON/OFF切替

**キーボードショートカット表示**:
```
ヒント: Ctrl+Sで保存 | Ctrl+Z/Yで取り消し/やり直し | M/C/R/T+クリックでノード追加
```

### 3.3. MethodTabPanel（Method管理タブ）

**表示位置**: ツールバー直下

**機能**:
- 複数Methodの切り替え
- Method追加 [+ 追加]
- Method ID編集
- Method削除

**表示例**:
```
[Method 1 (42)] [Method 2 (15)] [+ 追加]
     ↑アクティブ    ↑ノード数
```

### 3.4. React Flow Canvas（メイン編集エリア）

**主要機能**:

#### ノード（Place/Transition）
- **Material Place**: 🟡 円形（黄色系）
- **Condition Place**: 🔵 四角形（青色系）
- **Result Place**: 🟣 五角形（紫色系）
- **Transition**: ⬜ 長方形（グレー）

#### 操作方法
- **ノード追加**: 
  - ツールバーボタンクリック
  - キーボード（M/C/R/T）+ キャンバスクリック
- **ノード移動**: ドラッグ&ドロップ
- **接続**: ノード間をドラッグして接続
- **選択**: クリック（単一選択）、Ctrl+クリック（複数選択）
- **削除**: Deleteキー

#### コントロール
- **Background**: ドット表示
- **Controls**: ズーム、フィットビュー
- **MiniMap**: 全体マップ表示（右下）

### 3.5. PropertyPanel（プロパティパネル）

**表示位置**: キャンバス右側（オーバーレイ）

**表示内容**:

#### Placeノード選択時
```
┌─────────────────┐
│ Material Place  │
│                 │
│ ID: mat-001     │
│ 名前: [入力]    │
│ 説明: [入力]    │
│                 │
│ [テンプレート]  │
│ [削除]          │
└─────────────────┘
```

#### Transitionノード選択時
```
┌─────────────────┐
│ Transition      │
│                 │
│ ID: trans-001   │
│ 名前: [入力]    │
│ 説明: [入力]    │
│                 │
│ [削除]          │
└─────────────────┘
```

#### エッジ（Arc）選択時
```
┌─────────────────┐
│ Arc             │
│                 │
│ ID: arc-001     │
│ From: mat-001   │
│ To: trans-001   │
│                 │
│ [削除]          │
└─────────────────┘
```

### 3.6. TemplateEditorDialog（テンプレート編集ダイアログ）

**表示タイミング**: PropertyPanelの「テンプレート」ボタンクリック時

**機能**:
- Template ID設定
- Template名設定
- プロパティの階層的編集
  - stringType
  - integerType
  - floatType
  - propertyListType（ネスト可能）
- 単位（units）設定
- デフォルト値設定
- 説明（description）設定

### 3.7. DocumentEditDialog（Document編集ダイアログ）

**表示タイミング**: ツールバーの「Document」ボタンクリック時

**編集項目**:
- Document ID
- Protocol ID
- Method ID
- PNML ID
- Program ID
- 名前（name）
- 説明（description）
- 日付（date）
- UUID
- Creator情報
- Vendor情報
- Owner情報
- Instrument情報

### 3.8. SaveConfirmDialog（保存確認ダイアログ）

**表示タイミング**: 保存ボタン（Ctrl+S）押下時

**機能**:
1. **バリデーション結果表示**
   - エラー一覧
   - 警告一覧
   - エラー詳細

2. **保存先選択**
   - S3に保存（フォルダ選択可能）
   - ローカルダウンロード

3. **自動補正オプション**
   - 補正してから保存
   - そのまま保存

### 3.9. ValidationPanel（バリデーションパネル）

**表示タイミング**: ツールバーの「バリデーション」ボタンクリック時

**機能**:
- MaiML XML検証
- エラー詳細表示
- 警告表示
- 自動補正実行
- 再検証

### 3.10. WorkflowSelectorDialog（ワークフロー選択ダイアログ）

**表示タイミング**: ツールバーの「ワークフロー」ボタン → キャンバスクリック時

**機能**:
- S3から.maimlファイル一覧取得
- ファイル選択
- 選択位置にワークフロー追加（統合）

### 3.11. DraftManager（Draft管理ダイアログ）

**表示タイミング**: ツールバーの「Draft」ボタンクリック時

**機能**:
- 一時保存済みDraft一覧表示
- Draft読み込み
- Draft削除
- 自動保存ON/OFF切替

## 4. 主要機能

### 4.1. ノード編集機能（Phase 3A）

- ノード追加（Material/Condition/Result/Transition）
- ノード削除
- ノード移動（ドラッグ&ドロップ）
- プロパティ編集
- テンプレート編集

### 4.2. エッジ編集機能

- ノード間の接続
- エッジ削除
- エッジID編集

### 4.3. 履歴管理（Phase 3C）

- Undo/Redo機能
- 履歴スタック管理
- キーボードショートカット（Ctrl+Z/Y）

### 4.4. コピー&ペースト（Phase 3C-2/3）

- 単一ノードコピー&ペースト
- 複数ノードコピー&ペースト（Ctrl+C/V）

### 4.5. 複数Method対応

- Method切り替え
- Method追加/削除
- Method ID編集
- 各Methodのビューポート保存

### 4.6. 保存機能（Phase 3D + Week1）

#### 保存先
- S3に保存（フォルダ指定可能）
- ローカルダウンロード

#### MaiML変換
- React Flow形式 → MaiML XML変換
- 単一Method / 複数Method対応
- Document要素含む完全なMaiML生成

### 4.7. バリデーション機能（Week2）

- MaiML XML検証
- エラー/警告表示
- 自動補正機能
- 再検証

### 4.8. ワークフロー追加機能

- 他のMAIMLファイルを選択
- 指定位置にワークフローを統合
- ノード/エッジの自動配置

### 4.9. Draft管理機能

- 自動保存（30秒間隔）
- Draft一時保存/読み込み
- Draft削除
- 自動保存ON/OFF切替

## 5. データフロー

### 5.1. 初期読み込み

```
maimlData (props)
  ↓
fetchPetriNetData()
  ↓
/api/worker/multiple-methods-structure-from-content (複数Method)
  or
/api/worker/petri-net-structure-from-content (単一Method)
  ↓
convertToReactFlowFormat()
  ↓
setNodes() / setEdges()
  ↓
React Flow Canvas描画
```

### 5.2. 保存処理

```
保存ボタンクリック
  ↓
バリデーション実行
  ↓
convertReactFlowToMaiML() or convertMultipleMethodsToMaiML()
  ↓
SaveConfirmDialog表示
  ↓
保存先選択（S3 / ローカル）
  ↓
/api/s3/save (S3) or Blobダウンロード (ローカル)
```

### 5.3. 編集履歴管理

```
ノード/エッジ操作
  ↓
setNodes() / setEdges()
  ↓
pushState() (useHistory)
  ↓
履歴スタックに追加
  ↓
Undo/Redo可能
```

## 6. 使用しているノード形状

### ビューア用ノード（PetriNetViewer）
- `MaterialTemplateNode`: Material Place（円形）
- `ConditionTemplateNode`: Condition Place（四角形）
- `ResultTemplateNode`: Result Place（五角形）
- `TransitionNode`: Transition（長方形）

※ PetriNetEditorV2では、PetriNetViewerのノードコンポーネントを再利用

## 7. 外部API連携

### バックエンドAPI
- `POST /api/worker/multiple-methods-structure-from-content`: 複数Method構造取得
- `POST /api/worker/petri-net-structure-from-content`: ペトリネット構造取得
- `POST /api/s3/validate-maiml-content`: MaiMLバリデーション
- `POST /api/s3/maiml-auto-correct-realtime`: MaiML自動補正
- `POST /api/s3/save`: S3保存
- `GET /api/s3/files`: S3ファイル一覧取得
- `GET /api/s3/file-content`: S3ファイル内容取得
- `POST /api/s3/maiml-drafts`: Draft保存
- `GET /api/s3/maiml-drafts`: Draft一覧取得

## 8. 技術的特徴

### React Flow統合
- ReactFlowProvider でラップ
- useNodesState / useEdgesState でノード/エッジ管理
- useReactFlow でビューポート操作

### Material-UI統合
- ThemeProvider でテーマ適用
- editorTheme.js でカスタムテーマ定義
- Box, Button, Dialog 等のMUIコンポーネント使用

### カスタムフック
- `useHistory`: Undo/Redo履歴管理
- `useWorkflow`: ワークフロー追加機能
- `useDraftManager`: Draft自動保存機能
- `useNamespaceOperations`: Namespace操作

### キーボードショートカット
- `Ctrl+S`: 保存
- `Ctrl+Z`: Undo
- `Ctrl+Y` / `Ctrl+Shift+Z`: Redo
- `Ctrl+C`: コピー
- `Ctrl+V`: ペースト
- `M + クリック`: Material Place追加
- `C + クリック`: Condition Place追加
- `R + クリック`: Result Place追加
- `T + クリック`: Transition追加
- `Delete`: 選択削除

## 9. まとめ

reference配下のPetriNetEditorV2は、**完全な機能を備えた高度なMAIML編集画面**です。

### 主要な特徴
1. **React Flow + Material-UI**: モダンなUIフレームワーク
2. **完全な編集機能**: ノード/エッジの追加・編集・削除
3. **Undo/Redo**: 操作履歴管理
4. **複数Method対応**: 複数のMethodを切り替えて編集
5. **保存機能**: S3/ローカル両対応
6. **バリデーション**: MaiML XML検証・自動補正
7. **ワークフロー統合**: 他のMAIMLファイルを取り込み
8. **Draft管理**: 自動保存・復元機能
9. **豊富なキーボードショートカット**: 効率的な編集作業

### 取り込み推奨度
⭐⭐⭐⭐⭐ **非常に高い**

- 完成度が高く、そのまま移植可能
- 既存のfrontend/src/components/viewer/PetriNetEditor.tsx を置き換える候補
- バックエンドAPIとの連携も確立済み
- ユーザビリティが高く、実用的

### 移植時の注意点
1. Material-UI依存 → Ant Design v6への変換が必要
2. 一部のバックエンドAPIが存在するか確認が必要
3. TypeScript化が必要（現在はJSX）

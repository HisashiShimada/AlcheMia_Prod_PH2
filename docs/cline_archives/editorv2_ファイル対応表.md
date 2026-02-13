# PetriNetEditorV2 ファイル対応表

**作成日**: 2026-01-30 10:05  
**目的**: `frontend/src/components/editorv2`に移植されたファイルと現行プロジェクト内の対応ファイルの関係を明確化

---

## 📋 対応表の凡例

| 記号 | 意味 |
|------|------|
| ✅ | 完全一致・同等の機能 |
| 🔄 | 類似機能だが差異あり |
| 🆕 | editorv2で新規追加 |
| ❌ | 現行に対応なし |
| 📦 | 複数ファイルに分割 |

---

## 1. メインコンポーネント

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `PetriNetEditorV2.tsx` | `components/editor/PetriNetEditor.tsx` | 🔄 | V2は新アーキテクチャ |
| `PetriNetEditorInner.tsx` | - | 🆕 | V2の内部実装層 |
| `index.tsx` | - | 🆕 | エクスポート定義 |
| `index.ts` | - | 🆕 | 型定義エクスポート |

---

## 2. コンポーネント (components/)

### 2.1 エディタダイアログ・UI

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `components/DocumentEditDialog.tsx` | `components/editor/DocumentEditDialog.tsx` | ✅ | ドキュメント編集ダイアログ |
| `components/DraftManager.tsx` | `components/editor/DraftManager.tsx` | ✅ | 下書き管理UI |
| `components/EditorToolbar.tsx` | `components/editor/EditorToolbar.tsx` | ✅ | ツールバー |
| `components/MethodTabPanel.tsx` | `components/editor/MethodTabPanel.tsx` | ✅ | メソッドタブパネル |
| `components/PropertyPanel.tsx` | `components/editor/PropertyPanel.tsx` | ✅ | プロパティパネル |
| `components/SaveConfirmDialog.tsx` | `components/editor/SaveConfirmDialog.tsx` | ✅ | 保存確認ダイアログ |
| `components/TemplateEditorDialog.tsx` | `components/editor/TemplateEditorDialog.tsx` | ✅ | テンプレート編集ダイアログ |
| `components/ValidationPanel.tsx` | `components/editor/ValidationPanel.tsx` | ✅ | バリデーションパネル |
| `components/WorkflowSelectorDialog.tsx` | `components/editor/WorkflowSelectorDialog.tsx` | ✅ | ワークフロー選択ダイアログ |

### 2.2 V2専用コンポーネント

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `components/ReactFlowCanvas.tsx` | - | 🆕 | ReactFlow描画キャンバス (V2専用) |
| `components/SaveDialog.tsx` | - | 🆕 | 保存ダイアログ (V2専用) |
| `components/index.ts` | - | 🆕 | コンポーネントエクスポート |

### 2.3 テンプレートビューア

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `components/TemplateViewer/TemplateItem.tsx` | `components/editor/TemplateItem.tsx` | 📦 | フォルダ分割 |
| `components/TemplateViewer/TemplateList.tsx` | `components/editor/TemplateList.tsx` | 📦 | フォルダ分割 |
| `components/TemplateViewer/index.ts` | - | 🆕 | エクスポート定義 |

---

## 3. ノードコンポーネント (nodes/)

### 3.1 editorv2/components/nodes/

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `components/nodes/ConditionPlaceNode.tsx` | `components/nodes/ConditionTemplateNode.tsx` | 🔄 | 名称変更: Template→Place |
| `components/nodes/MaterialPlaceNode.tsx` | `components/nodes/MaterialTemplateNode.tsx` | 🔄 | 名称変更: Template→Place |
| `components/nodes/ResultPlaceNode.tsx` | `components/nodes/ResultTemplateNode.tsx` | 🔄 | 名称変更: Template→Place |
| `components/nodes/TransitionNode.tsx` | `components/nodes/TransitionNode.tsx` | ✅ | トランジションノード |
| `components/nodes/index.ts` | - | 🆕 | エクスポート定義 |

### 3.2 editorv2/nodes/ (編集可能ノード)

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `nodes/EditablePlaceNode.tsx` | - | 🆕 | 編集可能なプレースノード |
| `nodes/EditableTransitionNode.tsx` | - | 🆕 | 編集可能なトランジションノード |
| `nodes/index.ts` | - | 🆕 | エクスポート定義 |

---

## 4. カスタムフック (hooks/)

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `hooks/useDraftManager.ts` | `hooks/useDraftManager.ts` | ✅ | 下書き管理フック |
| `hooks/useHistory.ts` | `hooks/useHistory.ts` | ✅ | 履歴管理フック |
| `hooks/useNamespaceOperations.ts` | `hooks/useNamespaceOperations.ts` | ✅ | 名前空間操作フック |
| `hooks/useWorkflow.ts` | `hooks/useWorkflow.ts` | ✅ | ワークフロー管理フック |
| `hooks/index.ts` | - | 🆕 | エクスポート定義 |

### 現行プロジェクト専用フック (editorv2に未移植)

| 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------------|------|------|
| `hooks/useApi.ts` | ❌ | API通信フック (V2では未使用?) |
| `hooks/useExpandState.ts` | ❌ | 展開状態管理フック |
| `hooks/useInstructions.ts` | ❌ | 指示管理フック |

---

## 5. ユーティリティ (utils/)

### 5.1 パーサー・変換

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `utils/documentParser.ts` | `utils/documentParser.ts` | ✅ | MAIMLドキュメントパーサー |
| `utils/templateExtractor.ts` | - | 🆕 | テンプレート抽出ユーティリティ |
| `utils/xmlSignature.ts` | - | 🆕 | XML署名ユーティリティ |

### 5.2 コンバーター (utils/converters/)

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `utils/converters/maimlToReactFlow.ts` | `utils/reactFlowConverter.ts` | 🔄 | MAIML→ReactFlow変換 (名称変更) |
| `utils/converters/multiMethodConverter.ts` | `utils/converters/multiMethodConverter.ts` | ✅ | 複数メソッド変換 |
| `utils/converters/reactFlowToMaiml.ts` | `utils/converters/reactFlowToMaiml.ts` | ✅ | ReactFlow→MAIML変換 |
| `utils/converters/index.ts` | - | 🆕 | エクスポート定義 |

### 現行プロジェクト専用ユーティリティ (editorv2に未移植)

| 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------------|------|------|
| `utils/maimlGenerator.ts` | ❌ | MAIML生成ユーティリティ |
| `utils/maimlParser.ts` | ❌ | MAIMLパーサー (documentParser.tsと重複?) |
| `utils/subnetReactFlowConverter.ts` | ❌ | サブネット変換 |
| `utils/exportHelpers.ts` | ❌ | エクスポートヘルパー |
| `utils/exportUtils.ts` | ❌ | エクスポートユーティリティ |
| `utils/validation.ts` | ❌ | バリデーションユーティリティ |
| `utils/authUtils.ts` | ❌ | 認証ユーティリティ |
| `utils/errorMapper.ts` | ❌ | エラーマッピング |
| `utils/errorUtils.ts` | ❌ | エラーユーティリティ |
| `utils/formatters.ts` | ❌ | フォーマッター |
| `utils/instructionHelpers.ts` | ❌ | 指示ヘルパー |

---

## 6. 型定義 (types/)

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `types/index.ts` | - | 🆕 | V2専用型定義 |

---

## 7. スタイル (styles/)

| editorv2のファイル | 現行プロジェクトのファイル | 状態 | 備考 |
|-------------------|-------------------------|------|------|
| `styles/` | - | 🆕 | V2専用スタイル (詳細未確認) |

---

## 📊 統計サマリー

### editorv2のファイル数

| カテゴリ | ファイル数 |
|---------|-----------|
| メインコンポーネント | 4 |
| UIコンポーネント | 12 |
| ノードコンポーネント | 8 |
| カスタムフック | 5 |
| ユーティリティ | 8 |
| 型定義 | 1 |
| **合計** | **38** |

### 対応状況

| 状態 | 説明 | 件数 |
|------|------|------|
| ✅ | 完全一致 | 15 |
| 🔄 | 類似・差異あり | 5 |
| 🆕 | V2で新規追加 | 15 |
| 📦 | フォルダ分割 | 2 |
| ❌ | 未移植 | 13 |

---

## 🔍 重要な差異・注意点

### 1. アーキテクチャの違い

- **editorv2**: `PetriNetEditorV2` + `PetriNetEditorInner`の2層構造
- **現行**: `PetriNetEditor`の単層構造

### 2. ノードコンポーネントの命名

- **editorv2**: `PlaceNode` (Condition, Material, Result)
- **現行**: `TemplateNode` (Condition, Material, Result)

### 3. 編集可能ノードの追加

editorv2では編集機能を持つノードが独立:
- `EditablePlaceNode.tsx`
- `EditableTransitionNode.tsx`

### 4. ReactFlowキャンバスの分離

- **editorv2**: `ReactFlowCanvas.tsx`として独立
- **現行**: エディタ内に統合

### 5. コンバーターの整理

- **editorv2**: `utils/converters/`に集約
  - `maimlToReactFlow.ts`
  - `reactFlowToMaiml.ts`
  - `multiMethodConverter.ts`
- **現行**: `utils/`直下に分散
  - `reactFlowConverter.ts`
  - `converters/multiMethodConverter.ts`
  - `converters/reactFlowToMaiml.ts`

### 6. 未移植の主要ファイル

以下は現行に存在するがeditorv2に未移植:
- `MultiObjectEditor.tsx` (複数オブジェクト編集)
- `maimlGenerator.ts` (MAIML生成)
- `maimlParser.ts` (MAIMLパーサー)
- `subnetReactFlowConverter.ts` (サブネット変換)
- 各種ヘルパー・ユーティリティ

---

## 📝 移植推奨ファイル

editorv2での利用が推奨されるファイル:

### 優先度: 高

1. **`utils/validation.ts`** - バリデーション機能
2. **`utils/maimlParser.ts`** - MAIMLパーサー (documentParser.tsとの統合検討)
3. **`utils/exportUtils.ts`** - エクスポート機能
4. **`hooks/useApi.ts`** - API通信フック (必要に応じて)

### 優先度: 中

5. **`utils/formatters.ts`** - フォーマッター
6. **`utils/errorUtils.ts`** - エラーハンドリング
7. **`components/editor/MultiObjectEditor.tsx`** - 複数オブジェクト編集

### 優先度: 低

8. **`utils/subnetReactFlowConverter.ts`** - サブネット機能が必要な場合
9. **`hooks/useExpandState.ts`** - 展開状態管理が必要な場合

---

## 🚀 次のアクション

1. **差分分析**: editorv2と現行の同名ファイルの詳細比較
2. **機能確認**: V2で新規追加されたファイルの機能検証
3. **移植計画**: 未移植ファイルの必要性判断と移植計画策定
4. **統合テスト**: 移植後の動作確認
5. **ドキュメント更新**: 実装差異の詳細記録

---

**作成者**: Cline  
**最終更新**: 2026-01-30 10:05
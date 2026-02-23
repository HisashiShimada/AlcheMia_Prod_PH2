# EditorToolbar UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

PetriNetEditorInnerの編集ツールバーコンポーネント。ビューモード切替、ノード追加、Undo/Redo、保存、バリデーション、ドキュメント編集、Draft管理などの編集操作を提供します。

### 1.2. 使用場面

- PetriNetEditorInner内で常に表示
- 編集操作のメインインターフェース

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/EditorToolbar.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| onAddNode | (nodeType) => void | ✓ | ノード追加コールバック |
| onUndo | () => void | ✓ | Undo実行 |
| onRedo | () => void | ✓ | Redo実行 |
| canUndo | boolean | ✓ | Undo可能フラグ |
| canRedo | boolean | ✓ | Redo可能フラグ |
| onSave | () => void | ✓ | 保存処理 |
| canSave | boolean | ✓ | 保存可能フラグ |
| onEditDocument | () => void | ✓ | Document編集 |
| onValidate | () => void | ✓ | バリデーション実行 |
| isValidating | boolean | ✓ | バリデーション中フラグ |
| onAddWorkflow | () => void | ✓ | ワークフロー追加 |
| workflowModeActive | boolean | ✓ | ワークフローモード有効フラグ |
| onOpenDraftManager | () => void | | Draft管理ダイアログを開く |
| autoSaveEnabled | boolean | | 自動保存有効フラグ |
| onAutoSaveToggle | (checked: boolean) => void | | 自動保存トグル |
| lastAutoSaveTime | string \| Date \| null | | 最終自動保存時刻 |
| viewMode | 'petriNet' \| 'templates' | | 現在のビューモード |
| onViewModeChange | (mode) => void | | ビューモード変更 |

---

## 4. レイアウト構造

```
┌────────────────────────────────────────────────────────────────┐
│ [ペトリネット/テンプレート] | [Material] [Condition] [Result]  │
│ [Transition] | [ワークフロー] | [Document] | [バリデーション]  │
│ | [保存] [Draft] | [Undo] [Redo] | 自動保存: [ON] 最終: HH:MM:SS│
│ ヒント: Ctrl+Sで保存 | Ctrl+Z/Yで取り消し | M/C/R/T+クリック  │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. 主要UI要素

### 5.1. ビューモード切替（Segmented）

**表示条件**: viewModeとonViewModeChangeが存在する場合

| オプション | アイコン | 値 |
|-----------|---------|---|
| ペトリネット | NodeIndexOutlined | 'petriNet' |
| テンプレート | UnorderedListOutlined | 'templates' |

### 5.2. ノード追加ボタン群

| ボタン | アイコン | nodeType |
|-------|---------|---------|
| Material | PlusCircleOutlined | 'material' |
| Condition | BorderOutlined | 'condition' |
| Result | RadiusSettingOutlined | 'result' |
| Transition | SwapOutlined | 'transition' |

### 5.3. ワークフロー追加ボタン

**表示:**
- workflowModeActive=false: 「ワークフロー」（type="default"）
- workflowModeActive=true: 「ワークフロー (有効)」（type="primary"）

**アイコン**: ApartmentOutlined

### 5.4. 編集操作ボタン

| ボタン | アイコン | 有効条件 |
|-------|---------|---------|
| Document | FileTextOutlined | 常に有効 |
| バリデーション | CheckCircleOutlined | 常に有効（loading時はスピナー） |
| 保存 | SaveOutlined | canSave=true |
| Draft | FolderOpenOutlined | onOpenDraftManager存在時 |
| Undo | UndoOutlined | canUndo=true |
| Redo | RedoOutlined | canRedo=true |

### 5.5. 自動保存コントロール

**表示条件**: onAutoSaveToggle存在時

| 要素 | 説明 |
|------|------|
| Text | 「自動保存」 |
| Switch | autoSaveEnabledで制御 |
| Text（secondary） | 「(最終: HH:MM:SS)」 |

**時刻フォーマット関数:**
```typescript
const formatAutoSaveTime = (time: string | Date | null | undefined): string => {
  if (!time) return '';
  const date = new Date(time);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};
```

### 5.6. ヒント表示

**テキスト:**
```
ヒント: Ctrl+Sで保存 | Ctrl+Z/Yで取り消し/やり直し | M/C/R/T+クリックでノード追加
```

**スタイル:**
- type="secondary"
- fontSize: 11
- marginLeft: 16

---

## 6. 使用しているAnt Designコンポーネント

| コンポーネント | 使用箇所 |
|--------------|---------|
| Flex | 全体レイアウト |
| Segmented | ビューモード切替 |
| Button | 各種ボタン |
| Tooltip | ボタンのツールチップ |
| Switch | 自動保存トグル |
| Text | ラベル・ヒント表示 |
| Space | アイコン+テキストのレイアウト |
| Divider | セクション区切り |

---

## 7. 使用しているアイコン

**@ant-design/icons:**
- SaveOutlined, UndoOutlined, RedoOutlined
- FileTextOutlined, CheckCircleOutlined
- ApartmentOutlined, FolderOpenOutlined
- NodeIndexOutlined, UnorderedListOutlined
- PlusCircleOutlined, BorderOutlined
- RadiusSettingOutlined, SwapOutlined

---

## 8. スタイル定義

**コンテナ:**
```typescript
{
  padding: '8px 16px',
  borderBottom: '1px solid #f0f0f0',
  backgroundColor: '#fff',
  flexWrap: 'wrap',
  gap: 8,
}
```

**Divider:**
- type="vertical"
- height: 24

---

## 9. 主要機能

### 9.1. ビューモード切替

**処理フロー:**
1. Segmentedの値が変更
2. onViewModeChange(value)を実行
3. PetriNetEditorInner側でviewMode更新

### 9.2. ノード追加

**処理フロー:**
1. ノード追加ボタンをクリック
2. onAddNode(nodeType)を実行

**nodeType値:**
- 'material', 'condition', 'result', 'transition'

### 9.3. ワークフロー追加

**処理フロー:**
1. ワークフローボタンをクリック
2. onAddWorkflow()を実行
3. workflowModeActiveをトグル

**表示変更:**
- 非アクティブ: 通常ボタン
- アクティブ: プライマリボタン、「(有効)」表示

### 9.4. バリデーション

**処理フロー:**
1. バリデーションボタンをクリック
2. onValidate()を実行
3. isValidating=trueの間、ボタンにloading表示

### 9.5. 保存

**処理フロー:**
1. 保存ボタンをクリック（Ctrl+Sショートカットも可）
2. onSave()を実行

**有効条件:**
- canSave=true（ノードが存在する場合）

### 9.6. Undo/Redo

**Undo:**
- canUndo=true時のみ有効
- Ctrl+Zショートカット（PetriNetEditorInner側）

**Redo:**
- canRedo=true時のみ有効
- Ctrl+Yショートカット（PetriNetEditorInner側）

---

## 10. 備考

### 10.1. バージョン

- version: 2.0.0
- date: 2026-01-29
- Material-UI → Ant Design変換版

### 10.2. レスポンシブ対応

- flexWrap: 'wrap'で自動折り返し
- gap: 8pxで要素間隔を統一

### 10.3. アクセシビリティ

- すべてのボタンにTooltipでヒント表示
- キーボードショートカットをヒント欄に表示

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
| 2.0.0 | 2026-01-29 | Ant Design v6対応 | Development Team |
| 2.1.0 | 2026-02-19 | 最新ソース（editorv2）に基づいて更新 | Cline |

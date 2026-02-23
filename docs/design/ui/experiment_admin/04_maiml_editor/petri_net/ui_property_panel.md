# PropertyPanel UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

ノードまたはエッジ選択時に表示される右側プロパティ編集パネル。ノードID編集、プロパティ編集、テンプレート管理、エラー表示などの機能を提供します。

### 1.2. 使用場面

- PetriNetEditorInner内でノードを選択した場合
- PetriNetEditorInner内でエッジを選択した場合

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/PropertyPanel.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| selectedNode | Node<NodeData> \| null | ✓ | 選択中のノード |
| selectedEdge | Edge<EdgeData> \| null | ✓ | 選択中のエッジ |
| onUpdate | (nodeId, data) => void | ✓ | ノードプロパティ更新 |
| onUpdateEdge | (oldId, newId) => void | | エッジID更新 |
| onClose | () => void | ✓ | パネルを閉じる |
| onOpenTemplateEditor | (node) => void | ✓ | テンプレートエディタを開く |
| onDelete | (nodeId) => void | ✓ | ノード削除 |
| onDeleteEdge | (edgeId) => void | | エッジ削除 |
| onUpdateNodeId | (oldId, newId) => void | | ノードID更新 |
| nodes | Node<NodeData>[] | ✓ | 全ノード配列 |
| edges | Edge<EdgeData>[] | ✓ | 全エッジ配列 |
| methods | MethodData[] | ✓ | メソッド配列 |
| activeMethodIndex | number | ✓ | アクティブなメソッドインデックス |

---

## 4. 主要機能

### 4.1. ノードID編集（新機能）

**処理フロー:**
1. ノードIDフィールドを編集
2. 重複チェック（既存ノードとの重複を検証）
3. onUpdateNodeId(oldId, newId)を実行
4. エッジの接続も自動更新

**バリデーション:**
- 空白不可
- 重複ID不可（エラーメッセージ表示）

### 4.2. エラー表示（新機能）

**表示条件:** node.data.hasError または edge.data.hasError

**表示内容:**
- エラー数表示（例: 「2件の警告」）
- エラー詳細リスト:
  - type（エラータイプ）
  - message（エラーメッセージ）
  - details（詳細情報）

**スタイル:**
- backgroundColor: #fff3e0（警告色）
- border: 1px solid #ff9800

### 4.3. テンプレート編集

**処理フロー:**
1. 「テンプレート編集」ボタンをクリック
2. allTemplatesからテンプレートを復元（TemplateContext）
3. 既存テンプレートの場合: ID・UUIDを保持
4. 新規テンプレートの場合: 初期データを生成
5. handleOpenTemplateEditor()を実行

**重要な実装:**
- placeRefsを自動設定（新規テンプレート時）
- methodIdを設定（共通テンプレートでない場合）
- isNewTemplateフラグで新規/既存を判定

### 4.4. テンプレート継承（新機能）

**同一method内のテンプレート継承:**
- 利用可能テンプレート一覧をSelectで表示
- 選択時: templateRef.ref = `#${templateId}`
- templateRefプロパティを設定

### 4.5. 共通テンプレート参照（新機能）

**複数メソッド対応:**
- methods配列から共通テンプレートを検索
- isCommonTemplate=trueのテンプレートを表示
- 選択時: commonTemplateRefプロパティを設定
- 表示形式: 「テンプレート名 (from Method X)」

### 4.6. 共通テンプレートフラグ

**Checkbox:**
- ラベル: 「共通テンプレート（全methodで共有）」
- チェック時: isCommonTemplate=trueに設定
- 他のmethodからも参照可能になる

---

## 5. UIレイアウト

### 5.1. ノード選択時

```
┌────────────────────────────────┐
│ [×] Place プロパティ            │
├────────────────────────────────┤
│ ⚠️ 2件の警告                   │
│   duplicate_id                 │
│   このIDは既に使用されています  │
├────────────────────────────────┤
│ ノードタイプ: Material Place   │
├────────────────────────────────┤
│ ノードID: [編集可能]           │
│ ヒント: 重複不可               │
├────────────────────────────────┤
│ 名前: [入力]                   │
│ 説明: [テキストエリア]         │
├────────────────────────────────┤
│ □ 共通テンプレート             │
│                                │
│ テンプレート継承:              │
│ [▼ なし（独立テンプレート）]   │
│                                │
│ 共通テンプレート参照:          │
│ [▼ テンプレートA (from Method 2)]│
│                                │
│ テンプレート情報               │
│ 種類: Material Template        │
│ プロパティ数: 5件              │
│ [テンプレート編集]             │
├────────────────────────────────┤
│ [ノードを削除]                 │
└────────────────────────────────┘
```

### 5.2. エッジ選択時

```
┌────────────────────────────────┐
│ [×] Arc プロパティ              │
├────────────────────────────────┤
│ 要素タイプ: Arc (エッジ)       │
├────────────────────────────────┤
│ Arc ID: [編集可能]             │
│ ヒント: 重複チェックは保存時   │
├────────────────────────────────┤
│ 接続情報                       │
│ Source: node1                  │
│ Target: node2                  │
│ (Source/Targetは変更不可)      │
├────────────────────────────────┤
│ [エッジを削除]                 │
└────────────────────────────────┘
```

---

## 6. 使用しているコンポーネント

### 6.1. Ant Designコンポーネント

| コンポーネント | 使用箇所 |
|--------------|---------|
| Input | ノードID、名前 |
| TextArea | 説明 |
| Select | テンプレート継承、共通テンプレート参照 |
| Checkbox | 共通テンプレートフラグ |
| Button | テンプレート編集、削除、閉じる |
| Card | エラー表示、テンプレート情報 |
| Typography.Text | ラベル、ヒント |
| Space | レイアウト |
| Modal | 削除確認ダイアログ |

### 6.2. アイコン

- CloseOutlined: 閉じるボタン
- DeleteOutlined: 削除ボタン
- WarningOutlined: エラー表示

---

## 7. スタイル定義

**コンテナ:**
```typescript
{
  position: 'absolute',
  right: 0,
  top: 0,
  width: 350,
  height: '100%',
  backgroundColor: '#fff',
  borderLeft: '1px solid #f0f0f0',
  zIndex: 1000,
  boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
}
```

**ヘッダー:**
```typescript
{
  padding: '12px 16px',
  borderBottom: '1px solid #f0f0f0',
  backgroundColor: '#1890ff',
  color: '#fff',
}
```

---

## 8. TemplateContext統合

**使用方法:**
```typescript
const { allTemplates } = useTemplates();
```

**allTemplates構造:**
```typescript
{
  material: Template[],
  condition: Template[],
  result: Template[],
}
```

**テンプレート復元:**
- placeRefsからノードIDで検索
- 該当するテンプレートを取得
- 最新のプロパティ情報を使用

---

## 9. 備考

### 9.1. バージョン

- version: 2.0.2
- date: 2026-02-16
- Material-UI → Ant Design変換版

### 9.2. 重要な変更点

1. **ノードID編集機能**: onUpdateNodeIdで実装
2. **エラー表示**: node.data.errors配列を表示
3. **テンプレート継承**: templateRefプロパティで管理
4. **共通テンプレート**: isCommonTemplateフラグとcommonTemplateRef
5. **TemplateContext統合**: allTemplatesから復元

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
| 2.0.0 | 2025-12-23 | Ant Design v6対応 | Development Team |
| 2.0.2 | 2026-02-19 | 最新ソース（editorv2）に基づいて更新 | Cline |

# TemplateEditor UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

MAIMLファイルのTemplate情報（Material、Condition、Result）を編集するダイアログ。ネスト構造のプロパティ編集、XML属性・要素管理、名前空間テンプレート取り込み機能を提供します。

### 1.2. 使用場面

- PetriNetEditorでTemplateノードをダブルクリックした場合
- EditorToolbarの「Template」ボタンをクリックした場合
- Material/Condition/Resultテンプレートを編集する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌──────────────────────────────────────────────────────────┐
│ Template編集                                     [×]      │
├──────────────────────────────────────────────────────────┤
│ テンプレート種別: [Material ▼]                           │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 🔽 property: root_property [Level 0] [propertyLis…│  │
│ │ ├─ Attributes (XML属性)                            │  │
│ │ │  └─ xsi:type = "propertyListType" [削除]         │  │
│ │ ├─ Elements (XML要素)                              │  │
│ │ │  └─ (なし)                                        │  │
│ │ └─ Actions                                         │  │
│ │    [属性追加] [要素追加] [子追加] [コピー] [削除]   │  │
│ │                                                     │  │
│ │   🔽 property: material_name [Level 1]             │  │
│ │   ├─ Attributes                                    │  │
│ │   │  └─ name = "Material Name" [削除]              │  │
│ │   ├─ Elements                                      │  │
│ │   │  └─ value = "Sample Material" [削除]          │  │
│ │   └─ Actions                                       │  │
│ │      [属性追加] [要素追加] [子追加] [コピー] [削除]│  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ 📁 名前空間テンプレート取り込み                           │
│ [フォルダツリー]                                          │
│                                                          │
│ [キャンセル] [保存]                                       │
└──────────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | 説明 |
|------|------|
| タイトル | 「Template編集」 |
| 閉じるボタン | Xアイコン、onClose()実行 |

#### 2.2.2. テンプレート種別選択

| 項目 | コンポーネント | 選択肢 |
|------|--------------|-------|
| テンプレート種別 | Select | Material, Condition, Result |

**機能:**
- テンプレート種別を切り替え
- 種別に応じたテンプレート構造を初期化

#### 2.2.3. NestedPropertyEditor（ネスト構造プロパティ編集）

**階層構造表示:**
- Level 0: ルートプロパティ
- Level 1-N: 子プロパティ（ネスト可能）

**各プロパティの表示要素:**
- 展開/縮小ボタン（子要素がある場合）
- プロパティ名（property: キー名）
- レベル表示タグ（Level N）
- xsi:type表示タグ（propertyListType等）

**各プロパティのセクション:**
1. **Attributes（XML属性）**
   - 属性名 = 値のリスト
   - 各属性に削除ボタン

2. **Elements（XML要素）**
   - 要素名 = 値のリスト
   - 各要素に削除ボタン

3. **Actions（操作ボタン）**
   - 属性追加
   - 要素追加
   - 子追加
   - 同階層コピー
   - 削除

#### 2.2.4. 名前空間テンプレート取り込み

**コンポーネント:**
- Collapse Panel「名前空間テンプレート取り込み」
- フォルダツリー（Tree）
- ファイルリスト

**機能:**
- 名前空間からテンプレートファイルを選択
- 選択したテンプレートを現在のテンプレートにマージ

#### 2.2.5. フッターボタン

| ボタン | 機能 |
|-------|------|
| キャンセル | 変更を破棄してダイアログを閉じる |
| 保存 | テンプレートを保存 |

**スタイル:**
- 保存ボタン: type="primary", icon="SaveOutlined"
- キャンセルボタン: type="default"

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. テンプレート初期化

**処理フロー:**
1. ダイアログオープン時にnodeDataを取得
2. data.properties から PropertyData を構築
3. templateType（Material/Condition/Result）を判定
4. NestedPropertyEditor に渡す

#### 3.1.2. テンプレート種別切り替え

**処理フロー:**
1. Select で種別を選択
2. templateType を更新
3. デフォルトプロパティ構造を初期化
4. 再レンダリング

#### 3.1.3. 属性追加

**処理フロー:**
1. 「属性追加」ボタンをクリック
2. 属性追加モーダルを表示
3. 属性名と値を入力
4. OKをクリック
5. onUpdateNestedAttribute(propertyKey, attrName, attrValue) 実行
6. PropertyData の attributes を更新
7. モーダルを閉じる

**バリデーション:**
- 属性名: 必須、重複不可
- 値: 任意

#### 3.1.4. 要素追加

**処理フロー:**
1. 「要素追加」ボタンをクリック
2. 要素追加モーダルを表示
3. 要素名と値を入力
4. OKをクリック
5. onUpdateNestedElement(propertyKey, elemName, elemValue) 実行
6. PropertyData の elements を更新
7. モーダルを閉じる

**バリデーション:**
- 要素名: 必須、重複不可
- 値: 任意

#### 3.1.5. 子プロパティ追加

**処理フロー:**
1. 「子追加」ボタンをクリック
2. 子追加モーダルを表示
3. 子プロパティのキー名とタグ名を入力
4. OKをクリック
5. onAddNestedChild(parentKey, childTagName, specifiedKey) 実行
6. PropertyData の children 配列に追加
7. 自動的に展開状態にする
8. モーダルを閉じる

**制約:**
- 親のxsi:typeが「propertyListType」の場合のみ追加可能

#### 3.1.6. 同階層コピー

**処理フロー:**
1. 「コピー」ボタンをクリック
2. コピーモーダルを表示
3. 新しいキー名を入力
4. OKをクリック
5. onAddSameLevelCopy(sourceKey, sourceData, newKey, level) 実行
6. 同じ階層に新しいプロパティをコピー
7. モーダルを閉じる

**機能:**
- プロパティの構造を保持したままコピー
- attributes, elements, children すべてコピー

#### 3.1.7. プロパティ削除

**処理フロー:**
1. 「削除」ボタンをクリック
2. 確認ダイアログを表示
3. OKをクリック
4. onDeleteProperty(propertyKey) 実行
5. PropertyData から削除
6. 子プロパティも再帰的に削除

**制約:**
- ルートプロパティ（Level 0）は削除不可

#### 3.1.8. 属性削除

**処理フロー:**
1. 属性の「削除」ボタンをクリック
2. onDeleteNestedAttribute(propertyKey, attrName) 実行
3. PropertyData の attributes から削除

#### 3.1.9. 要素削除

**処理フロー:**
1. 要素の「削除」ボタンをクリック
2. onDeleteNestedElement(propertyKey, elemName) 実行
3. PropertyData の elements から削除

#### 3.1.10. 展開/縮小

**処理フロー:**
1. 展開/縮小ボタンをクリック
2. onToggleExpanded(nodeId) 実行
3. expandedNodes Set に追加/削除
4. 子プロパティの表示/非表示を切り替え

#### 3.1.11. 名前空間テンプレート取り込み

**処理フロー:**
1. 「名前空間テンプレート取り込み」パネルを展開
2. フォルダツリーからフォルダを選択
3. ファイルリストからテンプレートファイルを選択
4. 「取り込み」ボタンをクリック
5. 選択したテンプレートをパース
6. 現在のPropertyDataにマージ
7. 成功メッセージを表示

**機能:**
- useNamespaceOperations フックを使用
- フォルダツリー階層表示
- ファイル選択とプレビュー
- テンプレートマージ処理

#### 3.1.12. 保存処理

**処理フロー:**
1. 「保存」ボタンをクリック
2. PropertyDataをXML形式に変換
3. nodeDataを更新
4. onSave(updatedNodeData) 実行
5. ダイアログを閉じる

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| テンプレート種別選択 | 種別切り替え | templateType更新 |
| 展開/縮小ボタン | 子プロパティ表示切替 | expandedNodes更新 |
| 属性追加ボタン | 属性追加モーダル表示 | Modal表示 |
| 要素追加ボタン | 要素追加モーダル表示 | Modal表示 |
| 子追加ボタン | 子追加モーダル表示 | Modal表示 |
| コピーボタン | コピーモーダル表示 | Modal表示 |
| 削除ボタン | プロパティ削除 | PropertyData削除 |
| 属性削除ボタン | 属性削除 | attributes更新 |
| 要素削除ボタン | 要素削除 | elements更新 |
| 名前空間取り込み | テンプレートマージ | PropertyData更新 |
| キャンセルボタン | ダイアログを閉じる | onClose() |
| 保存ボタン | 保存処理 | onSave() |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface TemplateEditorDialogProps {
  open: boolean;                              // モーダル表示フラグ
  nodeData: Node;                             // Templateノードデータ
  onClose: () => void;                        // 閉じる
  onSave: (updatedNodeData: Node) => void;    // 保存
}
```

### 4.2. PropertyData型定義

```typescript
interface PropertyData {
  tagName: string;                       // タグ名（"property"等）
  attributes?: { [key: string]: string }; // XML属性
  elements?: { [key: string]: string };   // XML要素
  children?: PropertyData[];              // 子プロパティ
}
```

### 4.3. NestedPropertyEditorProps型定義

```typescript
interface NestedPropertyEditorProps {
  propertyData: PropertyData;
  propertyKey: string;
  level?: number;                        // 階層レベル
  expandedNodes: Set<string>;            // 展開中のノードID
  onToggleExpanded: (nodeId: string) => void;
  onAddNestedChild: (parentKey: string, childTagName: string, specifiedKey: string) => void;
  onAddSameLevelCopy: (sourceKey: string, sourceData: PropertyData, newKey: string, level: number) => void;
  onUpdateNestedAttribute: (propertyKey: string, attrName: string, attrValue: string) => void;
  onUpdateNestedElement: (propertyKey: string, elemName: string, elemValue: string) => void;
  onDeleteNestedAttribute: (propertyKey: string, attrName: string) => void;
  onDeleteNestedElement: (propertyKey: string, elemName: string) => void;
  onDeleteProperty: (propertyKey: string) => void;
  forceRenderKey: number;
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | 外側のコンテナ | open, onCancel, title, width, footer |
| Select | テンプレート種別選択 | value, onChange, options |
| Button | 各種操作ボタン | type, size, icon, onClick |
| Input | 属性・要素入力 | value, onChange |
| TextArea | 要素値入力（複数行） | value, onChange, rows |
| Collapse | 名前空間パネル | defaultActiveKey |
| Panel | セクションパネル | header, key |
| Tag | レベル・タイプ表示 | color |
| Flex | ボタングループ配置 | justify, align, gap |
| Tree | フォルダツリー | treeData, onSelect |
| Spin | ローディング | spinning |
| Alert | エラー・警告表示 | type, message, showIcon |

### 5.2. @ant-design/icons使用

- SaveOutlined: 保存ボタン
- CloseOutlined: 閉じるボタン
- PlusOutlined: 追加ボタン
- DeleteOutlined: 削除ボタン
- DownOutlined: 展開状態
- RightOutlined: 縮小状態
- ExperimentOutlined: Materialアイコン
- SettingOutlined: Conditionアイコン
- BarChartOutlined: Resultアイコン
- CloudDownloadOutlined: 取り込みアイコン
- FolderOutlined / FolderOpenOutlined: フォルダアイコン
- FileOutlined: ファイルアイコン

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/editorv2/components/TemplateEditorDialog.tsx
```

### 6.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| PetriNetEditor | ./PetriNetEditor | 親コンポーネント |
| useNamespaceOperations | @/hooks/useNamespaceOperations | 名前空間操作フック |

### 6.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |
| reactflow | 11.11.4 | Node型定義 |

---

## 7. 既知の課題・TODO

- [ ] プロパティのドラッグ&ドロップ並び替え
- [ ] プロパティのインポート/エクスポート
- [ ] バリデーションルールの設定
- [ ] プロパティのプレビュー機能

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
| 3.0.0 | 2025-12-23 | Next.js + TypeScript + Ant Design v6対応 | Development Team |
| 3.1.0 | 2026-02-19 | 最新ソース（editorv2）に基づいてファイルパス更新 | Cline |

---

## 9. 使用例

```typescript
<TemplateEditorDialog
  open={templateDialogOpen}
  nodeData={selectedNode}
  onClose={() => setTemplateDialogOpen(false)}
  onSave={handleSaveTemplate}
/>
```

---

## 10. パフォーマンス最適化

### 10.1. メモ化

- useMemo() でhasChildren, hasAttributes, hasElementsを計算
- useCallback() でイベントハンドラをメモ化

### 10.2. 再レンダリング制御

- forceRenderKey で強制再レンダリング
- React.memo() でNestedPropertyEditorをメモ化

---

## 11. アクセシビリティ

### 11.1. キーボード操作

- Tab: フォーカス移動
- Enter: モーダルのOK（フォーカスがOKボタンにある場合）
- Escape: モーダルのキャンセル

---

## 12. バリデーション

### 12.1. 属性追加時

```typescript
if (!newAttributeName.trim()) {
  message.error('属性名は必須です');
  return;
}

if (propertyData.attributes && newAttributeName in propertyData.attributes) {
  message.error('この属性名は既に存在します');
  return;
}
```

### 12.2. 要素追加時

```typescript
if (!newElementName.trim()) {
  message.error('要素名は必須です');
  return;
}

if (propertyData.elements && newElementName in propertyData.elements) {
  message.error('この要素名は既に存在します');
  return;
}
```

### 12.3. 子プロパティ追加時

```typescript
const parentXsiType = propertyData.attributes?.['xsi:type'] || '';
if (parentXsiType !== 'propertyListType') {
  message.error('親プロパティのxsi:typeが"propertyListType"でないため、子プロパティを追加できません');
  return;
}

if (!childKey.trim()) {
  message.error('プロパティキーは必須です');
  return;
}

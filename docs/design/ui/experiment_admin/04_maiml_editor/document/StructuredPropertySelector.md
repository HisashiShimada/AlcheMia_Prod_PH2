# StructuredPropertySelector UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

PlaceノードのプロパティをMAIML構造（基本情報、テンプレート、データ）別に選択するダイアログ。選択したプロパティのみをPetriNetビューアで表示します。

### 1.2. 使用場面

- PetriNetViewerでPlaceノードをクリックした場合
- Placeノードに表示するプロパティを選択する場合
- Material/Condition/Resultノードのプロパティを絞り込む場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌──────────────────────────────────────────────────────────┐
│ プロパティ選択: material_001                     [×]      │
├──────────────────────────────────────────────────────────┤
│ 選択済み: [基本情報: ID] [テンプレート: formula] [×] [×] │
│                                                          │
│ [基本情報] [テンプレート] [データ]                        │
├──────────────────────────────────────────────────────────┤
│ ☐ ID                 (material_001)                     │
│ ☑ 名前                (サンプル材料)                     │
│ ☐ タイプ              (Material)                        │
│ ☐ 説明                (実験用サンプル材料)               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | 説明 |
|------|------|
| タイトル | 「プロパティ選択: {nodeName}」 |
| 閉じるボタン | Xアイコン、onClose()実行 |

#### 2.2.2. 選択済みチップエリア

**表示内容:**
- 選択済みプロパティをTagで表示
- 「{構造名}: {プロパティキー}」形式
- 各Tagに削除ボタン（×）付き

**機能:**
- チップをクリックで選択解除
- 構造別に色分け
  - 基本情報: blue
  - テンプレート: green
  - データ: orange

#### 2.2.3. タブ

| タブ | 内容 |
|------|------|
| 基本情報 | 基本プロパティのリスト |
| テンプレート | テンプレートプロパティのリスト |
| データ | データプロパティのリスト |

**タブ切り替え:**
- デフォルト: 「基本情報」タブ
- クリックで切り替え
- activeTabでstate管理

#### 2.2.4. プロパティリスト

**List.Item構成:**
- Checkbox: 選択状態
- プロパティキー（太字）
- プロパティ値（グレー、括弧内）

**表示例:**
```
☑ 名前 (サンプル材料)
☐ ID (material_001)
```

**値の表示:**
- 文字列: そのまま表示
- 数値: 数値表示
- オブジェクト: 「{N}個の子要素」
- 未設定: 「未設定」

#### 2.2.5. 表示モード

| モード | 説明 |
|-------|------|
| modal | Modalダイアログ（デフォルト） |
| drawer | Drawerサイドパネル |
| embedded | 埋め込み表示（Modal/Drawerなし） |

**用途:**
- modal: 通常のダイアログ表示
- drawer: サイドバーから表示
- embedded: 他のコンポーネント内に埋め込み

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. プロパティ選択の初期化

**処理フロー:**
1. コンポーネントマウント時にpropsを受け取る
2. structuredProperties: { basic, template, data }
3. selectedProperties: { basic: [], template: [], data: [] }
4. 各構造のプロパティリストを構築

#### 3.1.2. タブ切り替え

**処理フロー:**
1. タブをクリック
2. activeTabを更新（'basic', 'template', 'data'）
3. 対応するプロパティリストを表示

#### 3.1.3. プロパティ選択/解除

**処理フロー:**
1. Checkboxをクリック
2. onPropertyToggle(structure, property) を実行
3. 親コンポーネントでselectedPropertiesを更新
4. チェック状態を切り替え

**チェック状態の判定:**
```typescript
const isChecked = selectedProperties[structure].includes(property);
```

#### 3.1.4. 選択済みチップの表示

**処理フロー:**
1. selectedPropertiesの各構造をループ
2. 選択されているプロパティをTagで表示
3. 構造名とプロパティキーを結合
4. closable=true で削除ボタンを表示

**削除処理:**
1. Tag の onClose をクリック
2. onPropertyToggle(structure, property) を実行
3. 選択を解除

#### 3.1.5. プロパティ値のフォーマット

**処理フロー:**
1. PropertyObjectから値を取得
2. value, elements.value, children を確認
3. 値の型に応じてフォーマット
4. 未設定の場合は「未設定」を返す

**フォーマットロジック:**
```typescript
if (obj.value !== undefined) return String(obj.value);
if (obj.elements?.value !== undefined) return String(obj.elements.value);
if (obj.children && obj.children.length > 0) return `${obj.children.length}個の子要素`;
return '未設定';
```

#### 3.1.6. プロパティラベルの取得

**処理フロー:**
1. PropertyObjectのkeyプロパティを確認
2. keyがあればそれを使用
3. なければpropKeyをそのまま使用

#### 3.1.7. 表示モードの決定

**処理フロー:**
1. displayMode propを確認
2. displayModeがない場合、embedded propで判定
3. actualDisplayMode を決定
4. modal/drawer/embeddedに応じた表示

**後方互換性:**
- embedded=true → actualDisplayMode='embedded'
- embedded=false → actualDisplayMode='modal'
- displayMode指定時は displayMode を優先

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| タブクリック | タブ切り替え | activeTab更新 |
| Checkboxクリック | プロパティ選択/解除 | selectedProperties更新 |
| チップ削除ボタン | プロパティ選択解除 | selectedProperties更新 |
| 閉じるボタン | ダイアログを閉じる | onClose() |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface StructuredPropertySelectorProps {
  open: boolean;                                    // 表示フラグ
  onClose: () => void;                              // 閉じる
  nodeId: string | null;                            // ノードID
  nodeName?: string;                                // ノード名
  structuredProperties: StructuredProperties;       // 構造化プロパティ
  selectedProperties: SelectedProperties;           // 選択済みプロパティ
  onPropertyToggle: (structure: keyof StructuredProperties, property: string) => void;
  embedded?: boolean;                               // 埋め込みモード（後方互換）
  displayMode?: 'modal' | 'drawer' | 'embedded';    // 表示モード（新規）
  getContainer?: () => HTMLElement;                 // コンテナ要素取得関数
}
```

### 4.2. StructuredProperties型定義

```typescript
interface StructuredProperties {
  basic: Record<string, PropertyObject>;    // 基本情報
  template: Record<string, PropertyObject>; // テンプレート
  data: Record<string, PropertyObject>;     // データ
}
```

### 4.3. SelectedProperties型定義

```typescript
interface SelectedProperties {
  basic: string[];      // 選択済み基本情報プロパティ
  template: string[];   // 選択済みテンプレートプロパティ
  data: string[];       // 選択済みデータプロパティ
}
```

### 4.4. PropertyObject型定義

```typescript
interface PropertyObject {
  key?: string;           // プロパティキー
  value?: unknown;        // 値
  type?: string;          // 型
  description?: string;   // 説明
  elements?: {
    value?: unknown;      // 要素の値
  };
  children?: unknown[];   // 子要素
}
```

### 4.5. State型定義

```typescript
interface State {
  activeTab: string;  // 'basic' | 'template' | 'data'
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | modal表示モード | open, onCancel, title, footer |
| Drawer | drawer表示モード | open, onClose, title, placement |
| Tabs | タブコンテナ | activeKey, onChange |
| TabPane | タブパネル（非推奨、items使用推奨） | tab, key |
| List | プロパティリスト | dataSource, renderItem |
| List.Item | リスト項目 | - |
| Checkbox | 選択チェックボックス | checked, onChange |
| Tag | 選択済みチップ | closable, onClose, color |
| Typography.Text | テキスト表示 | strong, type |
| Space | レイアウト | wrap, size |
| Empty | 空状態 | description |

### 5.2. @ant-design/icons使用

- CheckCircleOutlined: 選択状態アイコン
- CloseCircleOutlined: 非選択状態アイコン

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx
```

### 6.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| PetriNetViewer | ../PetriNetViewer | 親コンポーネント |
| PropertyViewerWithSelection | ./PropertyViewerWithSelection | 選択機能付きビューア |

### 6.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |
| react | 18.2.0 | Reactライブラリ |

---

## 7. 既知の課題・TODO

- [ ] プロパティの一括選択/解除機能
- [ ] プロパティの検索/フィルタ機能
- [ ] プロパティの並び替え機能
- [ ] 選択済みプロパティのエクスポート

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-26 | displayMode追加、Ant Design v6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 9. 使用例

### 9.1. Modal表示モード（デフォルト）

```typescript
<StructuredPropertySelector
  open={selectorOpen}
  onClose={() => setSelectorOpen(false)}
  nodeId="material_001"
  nodeName="サンプル材料"
  structuredProperties={{
    basic: {
      id: { value: 'material_001' },
      name: { value: 'サンプル材料' },
      type: { value: 'Material' }
    },
    template: {
      formula: { value: 'H2O' },
      molarMass: { value: 18.015 }
    },
    data: {
      quantity: { value: 100 },
      unit: { value: 'g' }
    }
  }}
  selectedProperties={{
    basic: ['name'],
    template: ['formula'],
    data: []
  }}
  onPropertyToggle={(structure, property) => {
    // 選択状態を切り替え
  }}
/>
```

### 9.2. Drawer表示モード

```typescript
<StructuredPropertySelector
  displayMode="drawer"
  open={selectorOpen}
  onClose={() => setSelectorOpen(false)}
  nodeId="material_001"
  // ... その他のprops
/>
```

### 9.3. Embedded表示モード

```typescript
<StructuredPropertySelector
  displayMode="embedded"
  open={true}
  onClose={() => {}}
  nodeId="material_001"
  // ... その他のprops
/>
```

---

## 10. スタイリング

### 10.1. チップカラー（構造別）

```typescript
const getTagColor = (structure: string): string => {
  switch (structure) {
    case 'basic':
      return 'blue';      // 基本情報
    case 'template':
      return 'green';     // テンプレート
    case 'data':
      return 'orange';    // データ
    default:
      return 'default';
  }
};
```

### 10.2. モード別スタイル

**Modal:**
- width: 600px
- footer: null（フッターなし）

**Drawer:**
- placement: 'right'
- width: 400px

**Embedded:**
- padding: 16px
- border: なし

---

## 11. パフォーマンス最適化

### 11.1. メモ化

```typescript
// 選択済みチップをメモ化
const selectedChips = useMemo(() => {
  // チップの配列を構築
}, [selectedProperties, structuredProperties]);

// プロパティリストをメモ化
const propertyList = useMemo(() => {
  // リストデータソースを構築
}, [structuredProperties, selectedProperties, activeTab]);
```

### 11.2. 再レンダリング制御

- React.memo() でコンポーネントをメモ化
- 不要な再レンダリングを防止

---

## 12. アクセシビリティ

### 12.1. キーボード操作

- Tab: フォーカス移動
- Space: チェックボックス切り替え
- Enter: チェックボックス切り替え
- Escape: ダイアログを閉じる

### 12.2. ARIA属性

- aria-label="プロパティ選択"
- role="dialog"（Modal/Drawer時に自動付与）

---

## 13. エラーハンドリング

### 13.1. プロパティが存在しない場合

```typescript
if (!structuredProperties || Object.keys(structuredProperties).length === 0) {
  return (
    <Empty description="プロパティがありません" />
  );
}
```

### 13.2. 値のフォーマットエラー

```typescript
const formatPropertyValue = (propertyObj: PropertyObject | unknown): string => {
  try {
    // フォーマットロジック
  } catch (error) {
    console.error('プロパティ値フォーマットエラー:', error);
    return '[表示エラー]';
  }
};
```

---

## 14. 使用シナリオ

### 14.1. Placeノードのプロパティ選択

1. PetriNetViewerでPlaceノードをクリック
2. StructuredPropertySelectorが表示される
3. 「基本情報」タブでnameを選択
4. 「テンプレート」タブでformulaを選択
5. 閉じるボタンをクリック
6. 選択したプロパティのみがPlaceノードラベルに表示される

### 14.2. 選択済みプロパティの変更

1. 既に選択済みのプロパティがある状態
2. 選択済みチップエリアに表示される
3. チップの×ボタンをクリックで選択解除
4. または、リストのCheckboxをクリックで選択解除

### 14.3. タブを切り替えて複数構造から選択

1. 「基本情報」タブでnameを選択
2. 「テンプレート」タブに切り替え
3. formulaとmolarMassを選択
4. 「データ」タブに切り替え
5. quantityを選択
6. 合計4つのプロパティが選択される

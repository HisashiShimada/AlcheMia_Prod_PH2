# PropertyViewer UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

MAIMLファイルのプロパティ（Material、Condition、Result、Transition）を3つのタブ（基本、テンプレート、データ）で構造化して表示するビューアコンポーネント。

### 1.2. 使用場面

- PetriNetViewerでノードをクリックした場合
- プロパティパネルで詳細プロパティを表示する場合
- Material/Condition/Resultノードの内容を確認する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **モード**: 読み取り専用

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌──────────────────────────────────────────────────────────┐
│ Material: material_001                          [×]      │
├──────────────────────────────────────────────────────────┤
│ [基本情報] [テンプレート] [データ]                        │
├──────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐  │
│ │ プロパティ              │ 値                        │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ ID                      │ material_001             │  │
│ │ 名前                     │ サンプル材料              │  │
│ │ タイプ                   │ Material                 │  │
│ │ 説明                     │ 実験用サンプル材料        │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | 説明 |
|------|------|
| タイトル | プロパティタイプ + ID（例: "Material: material_001"） |
| 閉じるボタン | CloseOutlinedアイコン、onClose()実行 |

**ヘッダーカラー（タイプ別）:**
- Material: `#F8C471` (黄色)
- Condition: `#85C1E9` (シアン)
- Result: `#D7BDE2` (マゼンタ)
- Transition: `#CCCCCC` (グレー)

#### 2.2.2. タブ

| タブ | 内容 |
|------|------|
| 基本情報 | ID、名前、タイプ、説明など |
| テンプレート | テンプレートプロパティ |
| データ | データプロパティ |

**タブ切り替え:**
- デフォルト: 「基本情報」タブ
- クリックで切り替え
- activeTabでstate管理

#### 2.2.3. プロパティテーブル

**カラム構成:**
| カラム | 幅 | 説明 |
|--------|-----|------|
| プロパティ | 35% | プロパティキー（太字） |
| 値 | 65% | プロパティ値 |

**値の表示形式:**
- 文字列: そのまま表示
- 数値: 数値表示
- オブジェクト: JSON文字列化
- 配列: JSON文字列化
- 未設定: 「未設定」表示
- 空文字: 「（空）」表示

**スタイル:**
- ボーダー: なし
- パディング: small
- 背景: ストライプ（奇数行/偶数行）

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. プロパティ初期化

**処理フロー:**
1. コンポーネントマウント時にpropsを受け取る
2. properties: { id, name, type }
3. structuredProperties: { basic, template, data }
4. 各タブのプロパティテーブルを構築

#### 3.1.2. タブ切り替え

**処理フロー:**
1. タブをクリック
2. activeTabを更新（'basic', 'template', 'data'）
3. 対応するプロパティテーブルを表示

#### 3.1.3. プロパティ値の取得

**処理フロー:**
1. PropertyObjectから値を取得
2. value !== undefined → value を返す
3. defaultValue !== undefined → defaultValue を返す
4. それ以外 → '未設定' を返す

**PropertyObject型:**
```typescript
{
  key?: string;
  value?: unknown;
  type?: string;
  description?: string;
  defaultValue?: string;
}
```

#### 3.1.4. プロパティテーブルの構築

**処理フロー:**
1. structuredProperties.basic/template/data を取得
2. Object.entries() でループ
3. 各エントリーから key と PropertyObject を取得
4. getPropertyValue() で値を取得
5. テーブルのdataSourceを構築

**dataSource形式:**
```typescript
[
  { propKey: 'id', value: 'material_001' },
  { propKey: 'name', value: 'サンプル材料' },
  ...
]
```

#### 3.1.5. 値のフォーマット

**処理フロー:**
1. 値の型を判定
2. string → そのまま表示
3. number → 数値表示
4. boolean → 'true' / 'false'
5. object/array → JSON.stringify()
6. null/undefined → '未設定'
7. 空文字 → '（空）'

#### 3.1.6. 閉じる処理

**処理フロー:**
1. 閉じるボタンをクリック
2. onClose() を実行
3. 親コンポーネントで表示制御

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| タブクリック | タブ切り替え | activeTab更新 |
| 閉じるボタン | ビューアを閉じる | onClose() |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface PropertyViewerProps {
  properties: {
    id: string;
    name: string;
    type: 'Material' | 'Condition' | 'Result' | 'Transition';
  };
  structuredProperties: StructuredProperties;
  onClose?: () => void;
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

### 4.3. PropertyObject型定義

```typescript
interface PropertyObject {
  key?: string;           // プロパティキー
  value?: unknown;        // 値
  type?: string;          // 型
  description?: string;   // 説明
  defaultValue?: string;  // デフォルト値
}
```

### 4.4. State型定義

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
| Card | 外側のコンテナ | bordered, style |
| Typography.Title | タイトル | level={4} |
| Typography.Text | テキスト表示 | strong |
| Tabs | タブコンテナ | activeKey, onChange, items |
| Table | プロパティテーブル | columns, dataSource, pagination, bordered, size |
| Button | 閉じるボタン | type, icon, onClick |
| Space | ボタングループ | - |
| Tag | タグ表示（オプション） | color |

### 5.2. @ant-design/icons使用

- CloseOutlined: 閉じるボタン

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/viewer/dialogs/PropertyViewer.tsx
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

- [ ] プロパティの編集機能
- [ ] プロパティのエクスポート機能
- [ ] プロパティの検索/フィルタ機能
- [ ] プロパティの履歴表示

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-26 | Ant Design v6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 9. 使用例

```typescript
<PropertyViewer
  properties={{
    id: 'material_001',
    name: 'サンプル材料',
    type: 'Material'
  }}
  structuredProperties={{
    basic: {
      id: { value: 'material_001' },
      name: { value: 'サンプル材料' },
      type: { value: 'Material' },
      description: { value: '実験用サンプル材料' }
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
  onClose={() => setViewerOpen(false)}
/>
```

---

## 10. スタイリング

### 10.1. ヘッダーカラー

```typescript
const headerColor = useMemo(() => {
  switch (properties.type) {
    case 'Result':
      return '#D7BDE2'; // マゼンタ
    case 'Condition':
      return '#85C1E9'; // シアン
    case 'Material':
      return '#F8C471'; // 黄色
    case 'Transition':
      return '#CCCCCC'; // グレー
    default:
      return '#D7BDE2';
  }
}, [properties.type]);
```

### 10.2. テーブルスタイル

```typescript
{
  bordered: false,
  size: 'small',
  pagination: false,
  showHeader: true
}
```

### 10.3. レスポンシブ対応

- カード幅: 100%（親要素に応じる）
- テーブル: スクロール対応
- モバイル: タブを縦表示

---

## 11. パフォーマンス最適化

### 11.1. メモ化

```typescript
// ヘッダーカラーをメモ化
const headerColor = React.useMemo(() => {
  // 計算ロジック
}, [properties.type]);

// 基本情報をメモ化
const basicInfo = React.useMemo(() => {
  // 変換ロジック
}, [structuredProperties.basic]);

// テンプレートプロパティをメモ化
const templateProps = React.useMemo(() => {
  // 変換ロジック
}, [structuredProperties.template]);

// データプロパティをメモ化
const dataProps = React.useMemo(() => {
  // 変換ロジック
}, [structuredProperties.data]);
```

### 11.2. 再レンダリング制御

- React.memo() でコンポーネントをメモ化（必要に応じて）
- 不要な再レンダリングを防止

---

## 12. アクセシビリティ

### 12.1. キーボード操作

- Tab: フォーカス移動
- Enter/Space: タブ切り替え
- Escape: 閉じる（onClose()が設定されている場合）

### 12.2. ARIA属性

- role="tabpanel"（自動付与）
- aria-label="プロパティビューア"

---

## 13. エラーハンドリング

### 13.1. プロパティが存在しない場合

```typescript
if (!properties || !structuredProperties) {
  return (
    <Card>
      <Text type="secondary">プロパティが読み込まれていません</Text>
    </Card>
  );
}
```

### 13.2. 値のフォーマットエラー

```typescript
const formatValue = (value: unknown): string => {
  try {
    if (value === null || value === undefined) return '未設定';
    if (typeof value === 'string' && value === '') return '（空）';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  } catch (error) {
    console.error('値のフォーマットエラー:', error);
    return '[表示エラー]';
  }
};
```

---

## 14. 表示例

### 14.1. Material（材料）

**基本情報:**
- ID: material_001
- 名前: サンプル材料
- タイプ: Material
- 説明: 実験用サンプル材料

**テンプレート:**
- formula: H2O
- molarMass: 18.015
- density: 1.0

**データ:**
- quantity: 100
- unit: g
- purity: 99.9

### 14.2. Condition（条件）

**基本情報:**
- ID: condition_001
- 名前: 温度条件
- タイプ: Condition

**テンプレート:**
- temperature: { min: 20, max: 30, unit: '°C' }
- pressure: { value: 1, unit: 'atm' }

**データ:**
- actualTemperature: 25
- actualPressure: 1.01

### 14.3. Result（結果）

**基本情報:**
- ID: result_001
- 名前: 測定結果
- タイプ: Result

**テンプレート:**
- measurementType: 'spectroscopy'
- unit: 'nm'

**データ:**
- wavelength: [400, 450, 500, 550, 600]
- intensity: [0.1, 0.5, 0.8, 0.6, 0.2]

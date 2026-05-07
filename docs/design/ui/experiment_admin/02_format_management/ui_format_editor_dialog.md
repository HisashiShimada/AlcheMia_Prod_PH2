# フォーマットエディタダイアログ UI仕様書

## 1. 概要

### 1.1 コンポーネントの目的
フォーマットエディタダイアログは、フォーマット管理画面においてXMLテンプレートファイル（`.xml`）の `keyDictionary` 構造を編集するためのモーダルダイアログです。Property・Contentのネスト構造を視覚的に編集でき、既存ファイルの読み込み・新規作成・保存をサポートします。

### 1.2 使用場面
- **表示場所**: フォーマット管理画面のモーダルオーバーレイ
- **トリガー**: ファイル一覧の「編集」ボタンクリック（`.xml` 拡張子のファイルのみ）
- **主な用途**:
  - XMLテンプレートファイルのプロパティ定義の新規作成・編集
  - Property / Content のネスト構造の管理
  - 既存テンプレートファイルからのプロパティ取り込み

### 1.3 アクセス権限
- **必須ロール**: Experiment Admin（実験管理者）
- **認証**: 親コンポーネント（FormatManagement）で認証済み

---

## 2. 画面構成

### 2.1 モーダル構造

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔬 result を編集                             [キャンセル] [💾 保存] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ⚠️ バリデーション警告（N件）  ← エラーある場合のみ表示            │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ 🏷️ Properties                                                   │
│ [+ 新規プロパティ追加]  [⬇ テンプレートから取り込み]              │
│                                                                 │
│  ┌─ property: compound ─────────────────────────────────────┐   │
│  │  📋 属性: xsi:type = stringType                          │   │
│  │  📄 要素: value = C6H12O6                                │   │
│  │  [▶ 子要素追加] [📋 同レベルコピー] [🗑 削除]              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ property: concentration ────────────────────────────────┐   │
│  │  📋 属性: xsi:type = floatType                           │   │
│  │  📄 要素: value = 0.5                                    │   │
│  │  [▶ 子要素追加] [📋 同レベルコピー] [🗑 削除]              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ ▼ 🔗 継承元プロパティ（親テンプレート: xxx）  [読み取り専用]      │
│   ← inheritedTemplate がある場合のみ表示                         │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ 🏷️ Contents  ← result タイプのみ表示                             │
│ [+ 新規Content追加]  [⬇ テンプレートから取り込み]                │
│                                                                 │
│  ┌─ content: measurement_data ──────────────────────────────┐   │
│  │  📋 属性: xsi:type = stringType                          │   │
│  │  📄 要素: value = ...                                    │   │
│  │  [▶ 子要素追加] [📋 同レベルコピー] [🗑 削除]              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 モーダルヘッダー
- **タイトル**: placeType アイコン + 「{placeType} を編集」
  - `material` → 🔬 ExperimentOutlined
  - `condition` → ⚙️ SettingOutlined
  - `result` → 📊 BarChartOutlined
- **幅**: 960px
- **上部マージン**: 20px（`style={{ top: 20 }}`）
- **本体最大高さ**: `calc(100vh - 200px)`、縦スクロール有効

#### 2.2.2 フッターボタン
- **「キャンセル」ボタン**: `onClose()` を呼び出してモーダルを閉じる
- **「保存」ボタン**（プライマリ、💾 SaveOutlined）: `handleSave()` を実行

#### 2.2.3 バリデーション警告（条件付き）
- **表示条件**: `templateErrors[mergedTemplate.id]` にエラーが1件以上ある場合
- **タイプ**: Alert（warning）
- **内容**: エラー件数、エラータイプ、エラーメッセージ一覧

#### 2.2.4 Properties セクション
- **見出し**: 🏷️ Properties
- **操作ボタン**:
  - 「+ 新規プロパティ追加」（プライマリ、PlusOutlined）: プロパティ追加モーダルを開く
  - 「⬇ テンプレートから取り込み」（DownloadOutlined）: 名前空間取り込みモーダルを開く
- **空の場合**: 「プロパティがありません。『新規プロパティ追加』ボタンから追加してください。」（info Alert）
- **プロパティ一覧**: `NestedPropertyEditor` コンポーネントを各プロパティに対して表示

#### 2.2.5 継承元プロパティセクション（条件付き）
- **表示条件**: `inheritedTemplate` が存在する場合
- **タイプ**: Collapse（折りたたみ）
- **ラベル**: 🔗 継承元プロパティ（親テンプレート: {inheritedTemplate.id}）
- **バッジ**: 「読み取り専用」（青色 Tag）
- **内容**: 親テンプレートのプロパティを読み取り専用で表示（属性・要素情報を含む）
- **背景色**: `#f0f5ff`

#### 2.2.6 Contents セクション（条件付き）
- **表示条件**: `node.data.placeType === 'result'`
- **見出し**: 🏷️ Contents
- **操作ボタン**:
  - 「+ 新規Content追加」（プライマリ、PlusOutlined）: Content追加モーダルを開く
  - 「⬇ テンプレートから取り込み」（DownloadOutlined）: 名前空間取り込みモーダルを開く（`replace_all_contents` モード）
- **空の場合**: 「Contentがありません。『新規Contentを追加』ボタンから追加してください。」（info Alert）
- **Content一覧**: `NestedPropertyEditor` コンポーネントを各Contentに対して表示

---

## 3. サブモーダル

### 3.1 プロパティ追加モーダル

```
┌──────────────────────────────────────────┐
│ 新規プロパティ追加           [キャンセル][OK] │
├──────────────────────────────────────────┤
│ [プロパティキー入力フィールド]              │
│ [タグ名セレクト: property/content/parameter] │
└──────────────────────────────────────────┘
```

- **トリガー**: 「+ 新規プロパティ追加」ボタン
- **入力フォーム**:
  - プロパティキー（Input、例: `compound`, `concentration`）
  - タグ名（Select）: `property` / `content` / `parameter`
- **バリデーション**:
  - キーが空の場合: 「プロパティキーを入力してください」（エラー）
  - 同一キーが既存の場合: 「同じキーのプロパティが既に存在します」（エラー）

### 3.2 Content追加モーダル

```
┌──────────────────────────────────────────┐
│ 新規Content追加              [キャンセル][OK] │
├──────────────────────────────────────────┤
│ [Contentキー入力フィールド]                │
│ [タグ名セレクト: property/content/parameter] │
└──────────────────────────────────────────┘
```

- **トリガー**: 「+ 新規Content追加」ボタン
- **入力フォーム**:
  - Contentキー（Input、例: `measurement_data`）
  - タグ名（Select）: `property` / `content` / `parameter`
- **バリデーション**:
  - キーが空の場合: 「Contentキーを入力してください」（エラー）
  - 同一キーが既存の場合: 「同じキーのContentが既に存在します」（エラー）

### 3.3 テンプレートから取り込みモーダル

```
┌─────────────────────────────────────────────────────────────────┐
│ ⬇ テンプレートから名前空間を取り込み   [キャンセル] [取り込む]  │
├─────────────────────────────────────────────────────────────────┤
│ ℹ️ テンプレートファイルのproperties定義を追加します              │
│   ・同じキーは上書きされます                                    │
│   ・複数のテンプレートから取り込み可能                          │
│                                                                 │
│ テンプレートファイル                                            │
│ [TreeSelect: 部門/フォルダ/ファイルのツリー構造]                │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ （ファイル選択後）                                              │
│ 📊 プロパティプレビュー (N件)                                   │
│  ┌─ compound ────────────────────────────────────────────────┐  │
│  │  [stringType]                                             │  │
│  │  値: C6H12O6                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ▼ 📄 XMLプレビュー（最初の500行）                               │
│   [XML内容]                                                     │
└─────────────────────────────────────────────────────────────────┘
```

- **幅**: 900px
- **「取り込む」ボタン**: `selectedNamespaceFile` が空の場合は disabled
- **ファイル選択**: TreeSelect（部門 → フォルダ → ファイルの階層構造、検索対応）
- **プレビュー**: ファイル選択後に自動取得・表示
  - プロパティプレビュー（key・xsi:type・value を表示）
  - XMLプレビュー（Collapse で折りたたみ、最大500行）
- **取り込み対象フィルタリング**: `node.data.placeType` に一致するフォルダ（`material` / `condition` / `result`）のファイルのみ表示

### 3.4 取り込み確認ダイアログ

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ プロパティ取り込み確認              [キャンセル] [取り込む] │
├──────────────────────────────────────────────────────────────┤
│ ⚠️ 重複するプロパティキーが N件あります                        │
│   [compound] [concentration] ...（オレンジ Tag）              │
│                                                              │
│ 取り込むプロパティ: M件                                       │
│   [key1]（重複は橙色、新規は青色）                            │
└──────────────────────────────────────────────────────────────┘
```

- **幅**: 720px
- **表示条件**: 「取り込む」ボタンクリック後、重複チェック後に表示
- **重複あり**: 警告 Alert + オレンジ Tag で重複キーを列挙
- **重複なし**: 成功 Alert「✅ 重複なし」
- **取り込むプロパティ一覧**: 重複キーは橙色、新規キーは青色 Tag で表示

---

## 4. 機能仕様

### 4.1 初期化処理

ダイアログが開いた際（`open === true`）に以下の優先順で初期化を行う。

```
優先順位 1: node.data.parsedProperties / parsedContents が存在する場合
  → 直接 setProperties / setContents に設定（フォーマット管理専用パス）

優先順位 2: mergedTemplate が空（id・name が空）の場合
  → デフォルト値で初期化（新規作成モード）
  → templateId = `{placeType}_template_{Date.now()}`
  → name = node.data.name || 'Untitled'

優先順位 3: 既存テンプレートデータがある場合
  → mergedTemplate から Properties を変換して設定
```

- **再初期化防止**: `isInitialized` フラグにより、ダイアログが開いている間は node 参照が変わっても再初期化しない
- **閉じた際**: `isInitialized` を `false` にリセット

### 4.2 プロパティ操作

#### 4.2.1 新規プロパティ追加（ルートレベル）
- サブモーダルでキーとタグ名を入力して追加
- `xsi:type` 等の属性は追加後に個別設定

#### 4.2.2 ネスト子要素追加（`handleAddNestedChild`）
- **再帰的検索**: ネストが深い場合でも対象親を探索
- **重複キーチェック**: 同一階層に同名の子要素がある場合はエラー
- **自動 xsi:type 設定**: 子要素追加時に親の `xsi:type` を `propertyListType` に自動設定
- **自動展開**: 追加後に親ノードを自動展開

#### 4.2.3 同レベルコピー（`handleAddSameLevelCopy`）
- ソースデータをディープコピーし、新しいキーで追加
- 重複キーの場合はエラー

#### 4.2.4 属性・要素の更新・削除
- **属性更新** (`handleUpdateNestedAttribute`): 再帰的に対象ノードを検索して属性値を更新
- **要素更新** (`handleUpdateNestedElement`): 再帰的に対象ノードを検索して要素値を更新
- **属性削除** (`handleDeleteNestedAttribute`): 再帰的に対象を検索して属性を削除
- **要素削除** (`handleDeleteNestedElement`): 再帰的に対象を検索して要素を削除
- **プロパティ削除** (`handleDeleteProperty`): ルートレベルのプロパティを削除

#### 4.2.5 強制再レンダリング
- `forceRenderKey`（Properties用）・`forceContentRenderKey`（Contents用）により、状態変更後に `NestedPropertyEditor` を強制再描画

### 4.3 Contents操作

`result` プレイスタイプのみ表示・操作可能。基本的な操作体系は Properties と同一。

### 4.4 名前空間取り込み処理

```
1. 「テンプレートから取り込み」ボタンをクリック
   → fetchTemplateFiles() でテンプレートファイル一覧を取得
   → placeType に一致するカテゴリのファイルのみフィルタリング

2. TreeSelect でファイルを選択
   → fetchTemplateContent(fileKey) で XML を取得
   → parseNamespacesFromXml() でプロパティを解析
   → プレビューとして表示

3. 「取り込む」ボタンをクリック
   → 重複キーを検出
   → 確認ダイアログを表示

4. 確認ダイアログで「取り込む」をクリック
   → 既存プロパティにマージ（重複キーは上書き）
   → importedNamespaces に取り込み済みファイル名を追加
```

### 4.5 保存処理（`handleSave`）

```typescript
// 1. templateId が空の場合は自動生成
const effectiveTemplateId = templateId.trim() ||
  `${node.data.placeType}_template_${Date.now()}`;

// 2. PropertyData → Property[] / Content[] に変換
const convertedProperties = convertPropertyDataToPropertiesArray(properties);
const convertedContents = convertPropertyDataToContentsArray(contents);

// 3. 親の onSave コールバックを呼び出す
onSave(
  node.id,
  convertedProperties,
  convertedContents,
  effectiveTemplateId,
  name,
  description,
  nodeCategory
);
```

- **注意**: `onClose()` は `FormatManagement` の `onSave` ハンドラ内で呼び出されるため、`handleSave` 内では呼ばない

---

## 5. データ仕様

### 5.1 Props定義

```typescript
interface FormatEditorDialogProps {
  open: boolean;                          // ダイアログの表示/非表示
  node: {
    id: string;
    data: NodeData;                       // placeType, name, template等を含む
  };
  onClose: () => void;                    // 閉じるハンドラ
  onSave: (                               // 保存ハンドラ
    nodeId: string,
    properties: Property[],
    contents: Content[],
    templateId: string,
    name: string,
    description: string,
    category: string
  ) => void;
  allNodes?: Array<{ id: string; data: NodeData }>;     // 継承元テンプレート検索用
  templateErrors?: Record<string, TemplateError[]>;     // バリデーションエラー
}
```

### 5.2 NodeData の拡張フィールド（フォーマット管理専用）

```typescript
// FormatManagement から渡される拡張フィールド
node.data.parsedProperties?: Record<string, PropertyData>  // XMLをパース済みのProperty
node.data.parsedContents?: Record<string, PropertyData>    // XMLをパース済みのContent
node.data.isNewFile?: boolean                              // 新規ファイルフラグ
node.data.placeType: 'material' | 'condition' | 'result'  // テンプレートタイプ
```

### 5.3 State定義

```typescript
// 基本情報（UI非表示、保存時に使用）
const [templateId, setTemplateId] = useState('');
const [uuid, setUuid] = useState('');
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [placeRefs, setPlaceRefs] = useState<PlaceRef[]>([]);
const [insertion, setInsertion] = useState<Insertion>({...});

// NestedPropertyEditor用
const [properties, setProperties] = useState<Record<string, PropertyData>>({});
const [contents, setContents] = useState<Record<string, PropertyData>>({});
const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
const [expandedContentNodes, setExpandedContentNodes] = useState(new Set<string>());
const [forceRenderKey, setForceRenderKey] = useState(0);
const [forceContentRenderKey, setForceContentRenderKey] = useState(0);

// プロパティ追加モーダル
const [showAddModal, setShowAddModal] = useState(false);
const [newPropertyKey, setNewPropertyKey] = useState('');
const [newPropertyTagName, setNewPropertyTagName] = useState('property');

// Content追加モーダル
const [showContentAddModal, setShowContentAddModal] = useState(false);
const [newContentKey, setNewContentKey] = useState('');
const [newContentTagName, setNewContentTagName] = useState('content');

// 名前空間取り込み
const [showNamespaceDialog, setShowNamespaceDialog] = useState(false);
const [templateFiles, setTemplateFiles] = useState<FormatTemplateFile[]>([]);
const [selectedNamespaceFile, setSelectedNamespaceFile] = useState('');
const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
const [importedNamespaces, setImportedNamespaces] = useState<string[]>([]);
const [namespaceImportMode, setNamespaceImportMode] = useState<'replace_all_properties' | 'replace_all_contents'>('replace_all_properties');
const [namespaceData, setNamespaceData] = useState<{ xml?: string; properties?: Record<string, PropertyData>; error?: string }>({});

// 取り込み確認ダイアログ
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);

// バリデーション
const [validationErrors, setValidationErrors] = useState<string[]>([]);

// 変更フラグ
const [hasChanges, setHasChanges] = useState(false);
const [isInitialized, setIsInitialized] = useState(false);
```

### 5.4 PropertyData型（NestedPropertyEditor用）

```typescript
interface PropertyData {
  key: string;
  tagName: string;                        // 'property' | 'content' | 'parameter'
  attributes: Record<string, string>;     // 属性 (xsi:type, unit, など)
  elements: Record<string, string>;       // 要素 (value, など)
  children: PropertyData[];               // ネスト子要素
  namespaceOrigin?: boolean;              // 名前空間取り込みフラグ
  namespaceSource?: {                     // 取り込み元情報
    fileName: string;
    importedAt: string;
  };
}
```

---

## 6. API連携

### 6.1 テンプレートファイル一覧取得

```typescript
// サービス: frontend/src/services/templateApi.ts
const response = await fetchTemplateFiles();
// → ListFormatsResponse（部門・フォルダ・ファイル階層）
```

### 6.2 テンプレートファイル内容取得

```typescript
// サービス: frontend/src/services/templateApi.ts
const xmlContent = await fetchTemplateContent(fileKey);
// fileKey = `${organizationId}/${filePath}`
```

---

## 7. エラーハンドリング

### 7.1 エラーケースと表示方法

| エラーケース | 検知タイミング | 表示方法 | 表示内容 |
|------------|------------|---------|---------|
| プロパティキーが空 | 追加ボタンクリック時 | Ant Design Message（error） | 「プロパティキーを入力してください」 |
| 重複プロパティキー | 追加ボタンクリック時 | Ant Design Message（error） | 「同じキーのプロパティが既に存在します」 |
| 重複ネスト子キー | 子要素追加時 | Ant Design Message（error） | 「同じ階層に既に「{key}」というキーの子要素が存在します」 |
| テンプレート一覧取得失敗 | 取り込みモーダル表示時 | Ant Design Message（error） | 「ファイル一覧の取得に失敗しました」 |
| プレビュー取得失敗 | ファイル選択時 | Alert（error）| 「プレビューの読み込みに失敗しました」 |
| 名前空間取り込み失敗 | 取り込み確認後 | Ant Design Message（error） | 「取り込みに失敗しました: {message}」 |

---

## 8. 実装ファイル

### 8.1 ファイルパス
- **メインファイル**: `frontend/src/components/format/FormatEditorDialog.tsx`

### 8.2 関連ファイル

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/format/FormatManagement.tsx` | 親コンポーネント（ダイアログの開閉・onSave処理） |
| `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | プロパティ・Content のネスト編集UI |
| `frontend/src/services/templateApi.ts` | テンプレートファイル一覧・内容取得API |
| `frontend/src/components/editorv2/utils/templateConverter.ts` | Property変換ユーティリティ |
| `frontend/src/types/maiml-unified.ts` | Template, Property, Content 型定義 |
| `frontend/src/types/editor.ts` | NodeData, TemplateError 型定義 |
| `frontend/src/hooks/useAttributeMasters.ts` | 属性マスタ取得フック |
| `frontend/src/contexts/LanguageContext.tsx` | 多言語対応（useLanguage） |

### 8.3 依存ライブラリ
- **Ant Design**: Modal, Button, Input, Form, Alert, Space, Typography, Select, TreeSelect, Divider, Tag, message, Collapse
- **Ant Design Icons**: SaveOutlined, ThunderboltOutlined, CloseOutlined, ExperimentOutlined, SettingOutlined, BarChartOutlined, PlusOutlined, DeleteOutlined, DownOutlined, RightOutlined, CopyOutlined, DownloadOutlined, FileSearchOutlined, FolderOutlined, FileOutlined
- **uuid**: v4（templateId自動生成用）

---

## 9. UI/UXの考慮事項

### 9.1 モーダルサイズ
- **幅**: 960px
- **高さ**: 最大 `calc(100vh - 200px)`、縦スクロール有効

### 9.2 再描画制御
- `forceRenderKey` / `forceContentRenderKey` でネストエディタを強制再描画
- 不必要な再初期化を `isInitialized` フラグで防止

### 9.3 ネスト対応
- 子要素追加・属性更新・削除はすべて再帰的に対象ノードを検索して処理
- 深さに制限なし

### 9.4 フォーマット管理専用の動作
- `templateId` 入力フィールドは非表示（フォーマット管理では不要）
- PlaceRef・Insertion セクションも非表示
- `parsedProperties` / `parsedContents` が存在する場合、テンプレート型変換をスキップして直接読み込む

---

## 10. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-04-21 | 実装ベースで仕様書を新規作成 | Cline |

# TemplateEditorDialog Reference版移植 - 完全タスク計画書

## 📋 概要

現行版TemplateEditorDialog.tsxをReference版TemplateEditorDialog.jsxの機能に完全に合わせるための移植計画書です。

**目標:** Reference版の全機能を現行版に移植し、Ant Design v6でUIを実装する

---

## 🔍 全体差分分析結果

### 0. 両方にある機能の内部処理差分（重要）

#### 0-1. データ読み込みロジック (useEffect)

**Reference版:**
```typescript
// Line 487-634
useEffect(() => {
  if (open && node) {
    // mergedTemplateを使用（templateとtemplateRefをマージ）
    const template = node.data.template || {};
    const templateRef = node.data.templateRef || {};
    const mergedTemplate = {
      ...templateRef,
      ...template,
      properties: template.properties || templateRef.properties || []
    };
    
    // properties変換（配列形式とオブジェクト形式の両対応）
    let convertedProperties = {};
    if (mergedTemplate.properties) {
      if (Array.isArray(mergedTemplate.properties)) {
        convertedProperties = convertPropertiesArrayToNestedFormat(mergedTemplate.properties);
      } else if (typeof mergedTemplate.properties === 'object') {
        // 既にNestedPropertyEditor形式かチェック
        const isAlreadyNestedFormat = /* チェックロジック */;
        if (isAlreadyNestedFormat) {
          convertedProperties = mergedTemplate.properties;
        } else {
          convertedProperties = convertPropertiesObjectToNestedFormat(mergedTemplate.properties);
        }
      }
    }
    
    setProperties(convertedProperties);
  }
}, [open, node]);
```

**現行版:**
```typescript
// Line 1227-1248
useEffect(() => {
  if (open && node) {
    // templateRefまたはtemplateから直接読み込み（マージなし）
    const templateRef = node.data.templateRef || node.data.template || {};
    
    // properties変換なし - そのまま使用
    setProperties(templateRef.properties || {});
  }
}, [open, node]);
```

**❌ 問題点:**
- 現行版は`mergedTemplate`を使用していない
- properties変換ロジックが存在しない（配列形式に未対応）
- Reference版の`convertPropertiesArrayToNestedFormat`が移植されていない

#### 0-2. 保存処理 (handleSaveClick)

**Reference版:**
```typescript
// Line 2130-2172
const handleSaveClick = () => {
  // ✅ 元のtemplateRefから全ての情報を保持し、編集した値で上書き
  const templateRef = {
    ...(node.data.templateRef || {}),  // 🔑 スプレッド演算子で全情報を保持
    id: templateId,
    type: templateType,
    uuid: uuid,
    name: name,
    // ...
  };
  
  // ✅ 継承元情報（href）を保持
  if (node.data.templateRef?.href) {
    templateRef.href = node.data.templateRef.href;
  }
  
  // ResultTemplateの場合のみContentsを追加
  if (node.data.placeType === 'result' && Object.keys(contents).length > 0) {
    templateRef.contents = contents;
  }
};
```

**現行版:**
```typescript
// Line 1730-1786
const handleSaveClick = () => {
  // ❌ 新規オブジェクト作成（元の情報が失われる）
  const templateRef: Record<string, unknown> = {
    type: templateType,
    uuid: uuid,
    name: name,
    description: description,
    properties: properties
  };
  
  // ✅ 継承元情報（href）は保持している
  if (node.data.templateRef?.href) {
    templateRef.href = node.data.templateRef.href;
  }
};
```

**❌ 問題点:**
- 現行版は`...(node.data.templateRef || {})`でスプレッド展開していない
- 元のtemplateRefに存在した他の情報（例: templateRefs, placeRefs以外の属性）が失われる可能性

#### 0-3. 変換関数の有無

**Reference版には存在するが現行版にない:**
```typescript
// Line 636-728
const convertPropertiesArrayToNestedFormat = (propertiesArray) => {
  // MaiMLParser.jsの配列形式をNestedPropertyEditor形式に変換
  // 詳細なロジック...
};

const convertPropertiesArrayToNestedFormatRecursive = (propertiesArray) => {
  // 再帰的な変換処理
};

const convertPropertiesObjectToNestedFormat = (propertiesObject) => {
  // オブジェクト形式をNestedPropertyEditor形式に変換
};
```

**現行版:**
- これらの変換関数が一切存在しない

**❌ 影響:**
- MaiMLParser.jsからの配列形式propertiesを受け取れない
- 既存のテンプレートデータとの互換性問題

#### 0-4. mergedTemplate計算ロジック

**Reference版:**
```typescript
// Line 156-191
const mergedTemplate = useMemo(() => {
  if (!node) return null;
  
  const template = node.data.template || {};
  const templateRef = node.data.templateRef || {};
  
  // templateとtemplateRefをマージ（templateを優先）
  const merged = {
    ...templateRef,
    ...template,
    properties: template.properties || templateRef.properties || []
  };
  
  return merged;
}, [node]);
```

**現行版:**
- mergedTemplate自体が存在しない

**❌ 影響:**
- データ読み込みが一貫性を欠く
- template優先の処理ができない

### 1. UIライブラリの違い
##  全体差分分析結果（完全版）

### 0. 🚨 両方にある機能の内部処理差分（最重要）

#### 0-1. データ読み込みロジック (useEffect)

**Reference版:**
```typescript
// Line 487-634
useEffect(() => {
  if (open && node) {
    // mergedTemplateを使用（templateとtemplateRefをマージ）
    const template = node.data.template || {};
    const templateRef = node.data.templateRef || {};
    const mergedTemplate = {
      ...templateRef,
      ...template,
      properties: template.properties || templateRef.properties || []
    };
    
    // properties変換（配列形式とオブジェクト形式の両対応）
    let convertedProperties = {};
    if (mergedTemplate.properties) {
      if (Array.isArray(mergedTemplate.properties)) {
        convertedProperties = convertPropertiesArrayToNestedFormat(mergedTemplate.properties);
      } else if (typeof mergedTemplate.properties === 'object') {
        // 既にNestedPropertyEditor形式かチェック
        const isAlreadyNestedFormat = /* チェックロジック */;
        if (isAlreadyNestedFormat) {
          convertedProperties = mergedTemplate.properties;
        } else {
          convertedProperties = convertPropertiesObjectToNestedFormat(mergedTemplate.properties);
        }
      }
    }
    
    setProperties(convertedProperties);
  }
}, [open, node]);
```

**現行版:**
```typescript
// Line 1227-1248
useEffect(() => {
  if (open && node) {
    // templateRefまたはtemplateから直接読み込み（マージなし）
    const templateRef = node.data.templateRef || node.data.template || {};
    
    // properties変換なし - そのまま使用
    setProperties(templateRef.properties || {});
  }
}, [open, node]);
```

**❌ 問題点:**
- 現行版は`mergedTemplate`を使用していない
- properties変換ロジックが存在しない（配列形式に未対応）
- Reference版の`convertPropertiesArrayToNestedFormat`が移植されていない

#### 0-2. 保存処理 (handleSaveClick)

**Reference版:**
```typescript
// Line 2130-2172
const handleSaveClick = () => {
  // ✅ 元のtemplateRefから全ての情報を保持し、編集した値で上書き
  const templateRef = {
    ...(node.data.templateRef || {}),  // 🔑 スプレッド演算子で全情報を保持
    id: templateId,
    type: templateType,
    uuid: uuid,
    name: name,
    // ...
  };
  
  // ✅ 継承元情報（href）を保持
  if (node.data.templateRef?.href) {
    templateRef.href = node.data.templateRef.href;
  }
  
  // ResultTemplateの場合のみContentsを追加
  if (node.data.placeType === 'result' && Object.keys(contents).length > 0) {
    templateRef.contents = contents;
  }
};
```

**現行版:**
```typescript
// Line 1730-1786
const handleSaveClick = () => {
  // ❌ 新規オブジェクト作成（元の情報が失われる）
  const templateRef: Record<string, unknown> = {
    type: templateType,
    uuid: uuid,
    name: name,
    description: description,
    properties: properties
  };
  
  // ✅ 継承元情報（href）は保持している
  if (node.data.templateRef?.href) {
    templateRef.href = node.data.templateRef.href;
  }
};
```

**❌ 問題点:**
- 現行版は`...(node.data.templateRef || {})`でスプレッド展開していない
- 元のtemplateRefに存在した他の情報（例: templateRefs等）が失われる可能性

#### 0-3. 変換関数の有無

**Reference版には存在するが現行版にない:**
```typescript
// Line 636-728
const convertPropertiesArrayToNestedFormat = (propertiesArray) => {
  // MaiMLParser.jsの配列形式をNestedPropertyEditor形式に変換
  // 詳細なロジック...
};

const convertPropertiesArrayToNestedFormatRecursive = (propertiesArray) => {
  // 再帰的な変換処理
};

const convertPropertiesObjectToNestedFormat = (propertiesObject) => {
  // オブジェクト形式をNestedPropertyEditor形式に変換
};
```

**現行版:**
- これらの変換関数が一切存在しない

**❌ 影響:**
- MaiMLParser.jsからの配列形式propertiesを受け取れない
- 既存のテンプレートデータとの互換性問題

#### 0-4. mergedTemplate計算ロジック

**Reference版:**
```typescript
// Line 156-191
const mergedTemplate = useMemo(() => {
  if (!node) return null;
  
  const template = node.data.template || {};
  const templateRef = node.data.templateRef || {};
  
  // templateとtemplateRefをマージ（templateを優先）
  const merged = {
    ...templateRef,
    ...template,
    properties: template.properties || templateRef.properties || []
  };
  
  return merged;
}, [node]);
```

**現行版:**
- mergedTemplate自体が存在しない

**❌ 影響:**
- データ読み込みが一貫性を欠く
- template優先の処理ができない

### 1. UIライブラリの違い

| 項目 | Reference版 | 現行版 |
|------|-------------|--------|
| UIライブラリ | Material-UI (MUI) | Ant Design v6 |
| ダイアログ | Dialog | Modal |
| ボタン | Button | Button |
| 入力 | TextField | Input |
| セレクト | Select + MenuItem | Select + Select.Option |
| レイアウト | Box | Space, Flex, Divider |
| アイコン | @mui/icons-material | @ant-design/icons |
| タイポグラフィ | Typography | Typography.Text, Typography.Title |
| アラート | Alert | Alert |

### 2. State管理の差分

#### Reference版にあって現行版にないState
1. ✅ **templateId** - テンプレートID（現行版にも追加済み）
2. ✅ **placeRefs** - Place References（現行版にも追加済み）
3. ❌ **maimlId** - MaiML ID属性（現行版にない）
4. ❌ **inheritedTemplate処理** - 継承元テンプレートのXML直接解析（現行版にない）
5. ❌ **selectedPropertiesToAdd/selectedContentsToAdd** - 個別要素追加機能（現行版にない）
6. ❌ **additionMode** - 追加モード管理（現行版にない）

#### 両方にあるState
- uuid, name, description, insertion
- properties, contents
- expandedNodes, expandedContentNodes
- showAddModal, showContentAddModal
- 名前空間関連State

### 3. 機能差分

#### ✅ Reference版にあって現行版にある機能
1. 基本情報編集（UUID, name, description）
2. Properties編集（NestedPropertyEditor）
3. Contents編集（ResultTemplateのみ）
4. 名前空間テンプレート取り込み
5. Place References編集
6. Template ID管理

#### ❌ Reference版にあって現行版にない機能

##### A. MaiML ID (XML ID属性) 管理
```typescript
// Reference版: Line 65-66, 276-283
const [maimlId, setMaimlId] = useState('');

const handleGenerateMaimlId = () => {
  const prefix = node.data.placeType === 'material' ? 'mat' :
                 node.data.placeType === 'condition' ? 'cond' :
                 'res';
  // 自動生成ロジック...
};
```

##### B. 継承元テンプレート詳細表示
```typescript
// Reference版: Line 284-416
const inheritedTemplate = useMemo(() => {
  // XMLから直接子要素を抽出してpropertiesNestedを再構築
  if (baseTemplate?.element) {
    // XML解析処理...
    return enhancedPropertiesNested;
  }
}, [node?.data?.templateRefId, node?.id, allNodes]);
```

**特徴:**
- XMLから直接子要素を抽出
- `extractChildrenFromXML`による再帰的な子要素抽出
- 継承元プロパティの完全な構造を表示

##### C. テンプレートエラー表示
```typescript
// Reference版: Line 2183-2224
{mergedTemplate && templateErrors && templateErrors[mergedTemplate.id] && (
  <Box sx={{ mb: 3, p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
    <Typography>⚠️ バリデーション警告</Typography>
    {templateErrors[mergedTemplate.id].map((error, index) => (
      // エラー表示...
    ))}
  </Box>
)}
```

##### D. 個別要素追加機能（名前空間）
```typescript
// Reference版: Line 144-147
const [selectedPropertiesToAdd, setSelectedPropertiesToAdd] = useState(new Set());
const [selectedContentsToAdd, setSelectedContentsToAdd] = useState(new Set());
const [additionMode, setAdditionMode] = useState('add'); // 'add' or 'replace'
```

**用途:** 名前空間テンプレートから個別のプロパティ/Contentを選択して追加

##### E. Template ID自動生成の詳細ロジック
```typescript
// Reference版: Line 2132-2154
const handleGenerateTemplateId = () => {
  const prefix = node.data.placeType === 'material' ? 'material_template' :
                 node.data.placeType === 'condition' ? 'condition_template' :
                 'result_template';
  
  // 既存のTemplate IDから最大連番を取得
  const existingIds = allNodes.map(...).filter(...);
  const maxNumber = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  const nextNumber = maxNumber + 1;
  const newTemplateId = `${prefix}_${String(nextNumber).padStart(3, '0')}`;
  
  setTemplateId(newTemplateId);
};
```

##### F. Place References詳細管理
```typescript
// Reference版: Line 2072-2129
const [showPlaceRefAddDialog, setShowPlaceRefAddDialog] = useState(false);

// 利用可能なPlaceのフィルタリング
allNodes
  .filter(n => n.data.nodeType === 'place')
  .filter(n => !placeRefs.includes(n.id))
```

##### G. 継承元プロパティの詳細表示
```typescript
// Reference版: Line 2454-2643
{inheritedTemplate && inheritedTemplate.propertiesNested && (
  <>
    <Typography>📖 継承元プロパティ（参照専用）</Typography>
    {Object.entries(inheritedTemplate.propertiesNested).map(([propKey, prop]) => {
      // 詳細な属性・要素・子要素の表示...
    })}
  </>
)}
```

**表示内容:**
- 属性（attributes）
- 要素（elements）
- 子要素（children）の詳細（最大3階層まで）
- 孫要素の情報も表示

##### H. 保存時のテンプレート情報保持
```typescript
// Reference版: Line 2130-2172
const handleSaveClick = () => {
  // ✅ 元のtemplateRefから全ての情報を保持し、編集した値で上書き
  const templateRef = {
    ...(node.data.templateRef || {}),  // 元のtemplateRefを保持
    id: templateId,
    // ...
  };
  
  // ✅ 継承元情報（href）を保持
  if (node.data.templateRef?.href) {
    templateRef.href = node.data.templateRef.href;
  }
};
```

---

## 🎯 移植タスク一覧

### Phase 0: 🚨 両方にある機能の内部処理統一（最優先）

**優先度:** 最高（データ整合性に直接影響）

#### タスク0-1: properties変換関数の実装

**実装内容:**
- [ ] `convertPropertiesArrayToNestedFormat` 関数を追加
- [ ] `convertPropertiesArrayToNestedFormatRecursive` 関数を追加
- [ ] `convertPropertiesObjectToNestedFormat` 関数を追加

**Reference版の該当箇所:**
- Line 636-728

**実装位置:**
- `TemplateEditorDialog.tsx`の先頭（コンポーネント定義の前）

#### タスク0-2: mergedTemplate計算ロジックの追加

**実装内容:**
- [ ] `mergedTemplate` useMemoを追加
- [ ] templateとtemplateRefをマージ（template優先）
- [ ] placeRefsの正規化処理を追加

**Reference版の該当箇所:**
- Line 156-191

**実装位置:**
- `TemplateEditorDialog.tsx`のコンポーネント内、他のuseMemoの直後

#### タスク0-3: useEffectのデータ読み込み処理修正

**実装内容:**
- [ ] `mergedTemplate`を使用するように修正
- [ ] properties変換ロジックを追加（配列・オブジェクト両対応）
- [ ] contents変換ロジックも同様に追加

**Reference版の該当箇所:**
- Line 487-634

**実装位置:**
- 既存のuseEffect（Line 1227-1248）を置き換え

#### タスク0-4: handleSaveClick保存処理修正

**実装内容:**
- [ ] `...(node.data.templateRef || {})`でスプレッド展開を追加
- [ ] 元のtemplateRefの全情報を保持
- [ ] hrefの保持を確実に

**Reference版の該当箇所:**
- Line 2130-2172

**実装位置:**
- 既存のhandleSaveClick（Line 1730-1786）を修正

**重要度説明:**
- Phase 0は既存機能の**内部処理の不整合**を修正するため最優先
- データの読み込み・保存に直接影響
- この修正なしでは新機能追加が無意味になる可能性

---

### Phase 1: MaiML ID管理機能の追加

**優先度:** 高

#### タスク1-1: State追加
- [ ] `maimlId` Stateを追加
- [ ] `handleGenerateMaimlId` 関数を実装
- [ ] `useEffect`でmaimlId読み込み処理を追加

#### タスク1-2: UI追加
- [ ] 基本情報セクションにMaiML ID入力フィールド追加
- [ ] 自動生成ボタン追加
- [ ] ヘルプテキスト追加（XML ID属性の説明）

#### タスク1-3: 保存処理修正
- [ ] `handleSaveClick`でmaimlIdを保存

**実装箇所:**
- `frontend/src/components/editor/TemplateEditorDialog.tsx`

**Reference版の該当箇所:**
- Line 65-66, 276-283, 2294-2311

---

### Phase 2: 継承元テンプレートのXML解析機能追加

**優先度:** 高

#### タスク2-1: XML解析ロジック実装
- [ ] `extractChildrenFromXML` 関数を実装
- [ ] `inheritedTemplate` useMemoを修正
- [ ] XMLからの直接子要素抽出ロジックを実装

#### タスク2-2: 継承元プロパティ詳細表示UI
- [ ] 継承元プロパティ表示セクションを追加
- [ ] 属性・要素・子要素の詳細表示
- [ ] 孫要素の表示（最大3階層）

**実装箇所:**
- `frontend/src/components/editor/TemplateEditorDialog.tsx`

**Reference版の該当箇所:**
- Line 284-416 (inheritedTemplate useMemo)
- Line 417-485 (extractChildrenFromXML関数)
- Line 2454-2643 (継承元プロパティ表示UI)

---

### Phase 3: テンプレートエラー表示機能追加

**優先度:** 中

#### タスク3-1: Props型定義修正
- [ ] `TemplateEditorDialogProps`に`templateErrors`を追加

#### タスク3-2: エラー表示UI実装
- [ ] ダイアログ上部にエラー表示セクション追加
- [ ] エラーの種類・メッセージ・XPath・詳細を表示

**実装箇所:**
- `frontend/src/components/editor/TemplateEditorDialog.tsx`

**Reference版の該当箇所:**
- Line 80 (Props型定義)
- Line 2183-2224 (エラー表示UI)

---

### Phase 4: Template ID自動生成ロジック改善

**優先度:** 中

#### タスク4-1: 自動生成ロジック修正
- [ ] Reference版のロジックに合わせる
- [ ] 連番の3桁ゼロパディング

**実装箇所:**
- `frontend/src/components/editor/TemplateEditorDialog.tsx`

**Reference版の該当箇所:**
- Line 2132-2154

---

### Phase 5: 個別要素追加機能（名前空間）

**優先度:** 低

#### タスク5-1: State追加
- [ ] `selectedPropertiesToAdd` State追加
- [ ] `selectedContentsToAdd` State追加
- [ ] `additionMode` State追加

#### タスク5-2: UI実装
- [ ] 名前空間ダイアログで個別選択UI追加
- [ ] チェックボックスで個別選択
- [ ] 追加モード選択（add or replace）

#### タスク5-3: ロジック実装
- [ ] 個別要素追加ハンドラー実装
- [ ] 追加モードによる処理分岐

**実装箇所:**
- `frontend/src/components/editor/TemplateEditorDialog.tsx`

**Reference版の該当箇所:**
- Line 144-147 (State)
- (UIとロジックは名前空間ダイアログ内に実装)

---

### Phase 6: 保存処理の改善

**優先度:** 高

#### タスク6-1: 元のtemplateRef保持ロジック
- [ ] `handleSaveClick`でスプレッド演算子を使用
- [ ] 元の`templateRef`の全情報を保持
- [ ] `href`の保持を確実に

**実装箇所:**
- `frontend/src/components/editor/TemplateEditorDialog.tsx`

**Reference版の該当箇所:**
- Line 2130-2172

---

### Phase 7: データ読み込みロジックの改善

**優先度:** 高

#### タスク7-1: mergedTemplate計算ロジック修正
- [ ] `useMemo`で`mergedTemplate`を計算
- [ ] `template`を優先、`templateRef`を補助的に使用
- [ ] placeRefsの正規化処理を追加

#### タスク7-2: useEffect内の読み込み処理修正
- [ ] `mergedTemplate`を使用してデータ読み込み

**実装箇所:**
- `frontend/src/components/editor/TemplateEditorDialog.tsx`

**Reference版の該当箇所:**
- Line 156-191 (mergedTemplate useMemo)
- Line 487-634 (useEffect)

---

## 📝 実装順序の推奨

### 優先順位1（即実施）
1. **Phase 6:** 保存処理の改善
2. **Phase 7:** データ読み込みロジックの改善
3. **Phase 1:** MaiML ID管理機能の追加

### 優先順位2（次に実施）
4. **Phase 2:** 継承元テンプレートのXML解析機能追加
5. **Phase 4:** Template ID自動生成ロジック改善

### 優先順位3（その後実施）
6. **Phase 3:** テンプレートエラー表示機能追加
7. **Phase 5:** 個別要素追加機能（名前空間）

---

## 🔧 実装時の注意事項

### 1. UIライブラリの変換

Reference版（MUI）から現行版（Ant Design v6）への変換ルール：

```typescript
// MUI → Ant Design変換例

// Dialog → Modal
<Dialog open={open} onClose={onClose}>
  → <Modal open={open} onCancel={onClose}>

// Box → Space, Flex, Divider
<Box sx={{ display: 'flex', gap: 1 }}>
  → <Space size="small">
  → <Flex gap="small">

// TextField → Input / Input.TextArea
<TextField value={value} onChange={onChange} />
  → <Input value={value} onChange={onChange} />
  → <Input.TextArea value={value} onChange={onChange} />

// Select → Select
<Select value={value}>
  <MenuItem value="1">Option</MenuItem>
</Select>
  → <Select value={value}>
      <Select.Option value="1">Option</Select.Option>
    </Select>

// Typography → Typography.Text / Typography.Title
<Typography variant="h6">Title</Typography>
  → <Typography.Title level={5}>Title</Typography.Title>
<Typography variant="body2">Text</Typography>
  → <Typography.Text>Text</Typography.Text>

// Alert → Alert
<Alert severity="info">Message</Alert>
  → <Alert type="info" message="Message" />

// IconButton → Button
<IconButton onClick={onClick}><Icon /></IconButton>
  → <Button icon={<Icon />} onClick={onClick} />
```

### 2. Reference版のロジックを忠実に移植

- 関数名・変数名を可能な限りReference版に合わせる
- コメントも含めて移植する
- デバッグログもReference版に合わせる

### 3. 型定義の追加

- TypeScriptなので、Reference版のJavaScriptに型定義を追加
- PropTypes相当の型をインターフェースで定義

---

## ✅ テスト計画

### 単体テスト
- [ ] MaiML ID自動生成機能
- [ ] Template ID自動生成機能（連番）
- [ ] Place References追加・削除

### 統合テスト
- [ ] 継承元テンプレートの表示
- [ ] XMLからの子要素抽出
- [ ] 保存時のデータ保持確認

### 回帰テスト
- [ ] 既存の名前空間取り込み機能
- [ ] 既存のProperties編集機能
- [ ] 既存のContents編集機能

---

## 📊 進捗管理

- [ ] Phase 1: MaiML ID管理機能の追加
- [ ] Phase 2: 継承元テンプレートのXML解析機能追加
- [ ] Phase 3: テンプレートエラー表示機能追加
- [ ] Phase 4: Template ID自動生成ロジック改善
- [ ] Phase 5: 個別要素追加機能（名前空間）
- [ ] Phase 6: 保存処理の改善
- [ ] Phase 7: データ読み込みロジックの改善
- [ ] 全体テスト
- [ ] デバッグログ削除（本番用クリーンアップ）

---

**作成日時:** 2026-01-29 09:20
**担当者:** Cline
**ステータス:** タスク計画完成 - ユーザー承認待ち
**次のアクション:** ユーザーに承認を得て実装開始
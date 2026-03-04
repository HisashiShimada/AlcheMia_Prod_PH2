# タスク計画書: デバッグ用コンソールログ実装

## メタデータ
- **作成日時**: 2026-02-27 10:54
- **タスクID**: デバッグ用コンソールログ実装
- **優先度**: 中
- **推定工数**: 30分

## 1. タスク概要

フォーマット管理画面のXML編集機能で、buildPropertyXML()とbuildContentXML()の出力をコンソールログで確認するデバッグ処理を実装する。

**重要**: 
- ファイル保存は行わない（デバッグ用）
- Property型/Content型からXML文字列を生成してコンソールログに出力

## 2. 目的と期待される成果

### 目的
- XML編集後、保存前にProperty型/Content型からXML文字列への変換をテスト
- buildPropertyXML()とbuildContentXML()の出力をコンソールログで確認
- 変換処理が正しく動作することを検証

### 期待される成果
- [ ] 既存関数（buildPropertyXML, buildContentXML）をインポート
- [ ] FormatEditorDialogのonSaveコールバックでデバッグ処理を実装
- [ ] Property型配列の各要素をbuildPropertyXML()に渡してコンソールログ出力
- [ ] Content型配列の各要素をbuildContentXML()に渡してコンソールログ出力
- [ ] ファイル保存処理はコメントアウト

## 3. 既存関数の確認

### reactFlowToMaiml.ts に既に存在する関数

| 関数名 | 機能 | 引数 | 戻り値 |
|--------|------|------|--------|
| `buildPropertyXML()` | Property型からXML文字列生成 | Property, indentLevel | string |
| `buildContentXML()` | Content型からXML文字列生成 | Content, indentLevel | string |
| `escapeXml()` | XMLエスケープ処理 | string | string |

### 使用例

```typescript
import { buildPropertyXML, buildContentXML } from '@/components/editorv2/utils/converters/reactFlowToMaiml';

// Property型からXML文字列を取得
const prop: Property = {
  key: "temperature",
  xsiType: "doubleType",
  value: "25.5",
  units: "°C",
  properties: [],
  contents: []
};

const propertyXml = buildPropertyXML(prop, 0);
// 出力: <property key="temperature" units="°C" xsi:type="doubleType">
//         <value>25.5</value>
//       </property>

// Content型からXML文字列を取得
const content: Content = {
  key: "data",
  xsiType: "contentDoubleListType",
  value: "100 105 110",
  size: 3,
  axis: "x",
  properties: [],
  contents: [],
  uncertainty: []
};

const contentXml = buildContentXML(content, 0);
// 出力: <content key="data" axis="x" size="3" xsi:type="contentDoubleListType">
//       </content>
```

## 4. 実装手順

### Step 1: インポート文を追加

**ファイル**: `frontend/src/components/project/FormatManagement.tsx`

```typescript
// インポート文を追加（約3行）
import { 
  buildPropertyXML, 
  buildContentXML 
} from '@/components/editorv2/utils/converters/reactFlowToMaiml';
import { Property, Content } from '@/types/maiml-unified';
```

### Step 2: onSaveコールバックを修正

FormatEditorDialogのonSaveコールバック内にデバッグ処理を実装：

```typescript
onSave={async (nodeId, templateRef, isNewTemplate, templateCategory) => {
  console.log('🐛 [DEBUG] ===== XML変換デバッグ開始 =====');
  console.log('🐛 [DEBUG] templateRef:', {
    id: templateRef.id,
    name: templateRef.name,
    propertiesCount: templateRef.properties?.length || 0,
    contentsCount: templateRef.contents?.length || 0
  });
  
  // ✅ Property型配列を取得
  const properties: Property[] = templateRef.properties || [];
  
  console.log('🐛 [DEBUG] Properties配列:', properties.length, '個');
  
  // ✅ 各Property型からXML文字列を生成してコンソールログ出力
  properties.forEach((prop, index) => {
    const propertyXml = buildPropertyXML(prop, 0);
    console.log(`🐛 [DEBUG] Property[${index}] XML:\n`, propertyXml);
  });
  
  // ✅ Content型配列を取得
  const contents: Content[] = templateRef.contents || [];
  
  console.log('🐛 [DEBUG] Contents配列:', contents.length, '個');
  
  // ✅ 各Content型からXML文字列を生成してコンソールログ出力
  contents.forEach((content, index) => {
    const contentXml = buildContentXML(content, 0);
    console.log(`🐛 [DEBUG] Content[${index}] XML:\n`, contentXml);
  });
  
  console.log('🐛 [DEBUG] ===== XML変換デバッグ完了 =====');
  
  // ✅ ファイル保存処理はコメントアウト（デバッグ用）
  /*
  const { convertTemplateToXml } = await import('@/utils/xmlConverter');
  const xmlContent = convertTemplateToXml(templateRef, placeType);
  
  const client = createApiClient();
  await client.put('/formats/files', {
    content: xmlContent,
    filePath: editingXmlFile.path,
  });
  
  message.success('保存しました');
  */
  
  // ✅ デバッグモードではダイアログを閉じない
  message.info('デバッグモード: コンソールログを確認してください');
  // setShowTemplateEditor(false); // コメントアウト
}}
```

## 5. 変更ファイル

### 修正ファイル
- `frontend/src/components/project/FormatManagement.tsx`
  - インポート文追加（3行）
  - onSaveコールバック修正（約30行のデバッグ処理）

### 新規ファイル
- なし

### 削除ファイル
- なし

**正味**: 約+33行

## 6. データフロー

### シンプルな変換フロー

```
┌──────────────────────────────────┐
│ Property型の変数                 │
│ {                                │
│   key: "temperature",           │
│   value: "25.5",                │
│   units: "°C"                   │
│ }                               │
└──────────────────────────────────┘
            ↓
   buildPropertyXML(prop, 0)  ★既存関数
            ↓
┌──────────────────────────────────┐
│ XML文字列                        │
│ <property key="temperature"      │
│           units="°C"             │
│           xsi:type="doubleType"> │
│   <value>25.5</value>           │
│ </property>                      │
└──────────────────────────────────┘
```

```
┌──────────────────────────────────┐
│ Content型の変数                  │
│ {                                │
│   key: "data",                  │
│   value: "100 105 110",         │
│   size: 3                       │
│ }                               │
└──────────────────────────────────┘
            ↓
   buildContentXML(content, 0)  ★既存関数
            ↓
┌──────────────────────────────────┐
│ XML文字列                        │
│ <content key="data"              │
│          size="3"                │
│          xsi:type="...">         │
│ </content>                       │
└──────────────────────────────────┘
```

### 重要なポイント

- ✅ 既存関数をインポートして使うだけ
- ✅ Property型 → `buildPropertyXML()` → XML文字列
- ✅ Content型 → `buildContentXML()` → XML文字列
- ✅ 新規実装は不要

## 7. 既存関数の詳細

### buildPropertyXML()

**場所**: `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`

**シグネチャ**:
```typescript
function buildPropertyXML(property: Property, indentLevel: number): string
```

**例**:
```typescript
const prop: Property = {
  key: "temperature",
  xsiType: "doubleType",
  value: "25.5",
  units: "°C",
  properties: [],
  contents: []
};

const xml = buildPropertyXML(prop, 0);
// 出力:
// <property key="temperature" units="°C" xsi:type="doubleType">
//   <value>25.5</value>
// </property>
```

### buildContentXML()

**場所**: `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`

**シグネチャ**:
```typescript
function buildContentXML(content: Content, indentLevel: number): string
```

**例**:
```typescript
const content: Content = {
  key: "spectrum",
  xsiType: "contentDoubleListType",
  value: "100 105 110 115 120",
  size: 5,
  axis: "x",
  properties: [],
  contents: [],
  uncertainty: []
};

const xml = buildContentXML(content, 0);
// 出力:
// <content key="spectrum" axis="x" size="5" xsi:type="contentDoubleListType">
// </content>
```

## 8. 完全な実装例

### FormatManagement.tsx での使用例

```typescript
import { 
  buildPropertyXML, 
  buildContentXML 
} from '@/components/editorv2/utils/converters/reactFlowToMaiml';
import { Property, Content } from '@/types/maiml-unified';

// 使用例1: 単一のProperty型からXML文字列を取得
function example1() {
  const prop: Property = {
    key: "temperature",
    xsiType: "doubleType",
    value: "25.5",
    units: "°C",
    properties: [],
    contents: []
  };
  
  const xml = buildPropertyXML(prop, 0);
  console.log(xml);
  // 出力: <property key="temperature" units="°C" xsi:type="doubleType">
  //         <value>25.5</value>
  //       </property>
}

// 使用例2: Property型配列からXML文字列を取得
function example2(properties: Property[]) {
  let xmlParts: string[] = [];
  
  properties.forEach(prop => {
    const xml = buildPropertyXML(prop, 0);
    xmlParts.push(xml);
  });
  
  const allXml = xmlParts.join('\n');
  console.log(allXml);
}

// 使用例3: Content型からXML文字列を取得
function example3(content: Content) {
  const xml = buildContentXML(content, 0);
  console.log(xml);
  // 出力: <content key="..." xsi:type="...">...</content>
}

// 使用例4: FormatEditorDialogのonSaveで使用
<FormatEditorDialog
  onSave={async (nodeId, templateRef) => {
    // Property型配列を取得
    const properties = templateRef.properties;
    
    // ✅ 各Property型からXML文字列を取得
    properties.forEach(prop => {
      const propertyXml = buildPropertyXML(prop, 0);
      // propertyXmlを使用
    });
    
    // Content型配列を取得
    const contents = templateRef.contents;
    
    // ✅ 各Content型からXML文字列を取得
    contents.forEach(content => {
      const contentXml = buildContentXML(content, 0);
      // contentXmlを使用
    });
  }}
/>
```

## 9. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| インポートパスの間違い | 低 | 低 | 正しいパスを確認してインポート |
| 型定義の不一致 | 低 | 低 | Property型/Content型の定義を確認 |
| indentLevel引数の誤り | 低 | 低 | 通常は0または1を使用 |

**注意**: 既存関数を使用するだけなので、リスクは極めて低い

## 10. 確認事項

### 動作確認

- [ ] FormatManagement.tsxにインポート文を追加
- [ ] XML編集画面でProperty/Contentを追加
- [ ] 保存ボタンをクリック
- [ ] ブラウザのコンソールログを確認
- [ ] 各Property型からXML文字列が出力されている
- [ ] 各Content型からXML文字列が出力されている

### コンソールログ出力例

期待される出力：
```
🐛 [DEBUG] ===== XML変換デバッグ開始 =====
🐛 [DEBUG] templateRef: { id: "...", name: "...", propertiesCount: 2, contentsCount: 1 }
🐛 [DEBUG] Properties配列: 2 個
🐛 [DEBUG] Property[0] XML:
 <property key="temperature" units="°C" xsi:type="doubleType">
  <value>25.5</value>
</property>
🐛 [DEBUG] Property[1] XML:
 <property key="sampleName" xsi:type="stringType">
  <value>Sample A</value>
</property>
🐛 [DEBUG] Contents配列: 1 個
🐛 [DEBUG] Content[0] XML:
 <content key="data" size="3" xsi:type="contentDoubleListType">
</content>
🐛 [DEBUG] ===== XML変換デバッグ完了 =====
```

## 11. 完了条件

- [ ] FormatManagement.tsxにインポート文が追加されている
- [ ] onSaveコールバックにデバッグ処理が実装されている
- [ ] ブラウザのコンソールログでProperty型のXML文字列が確認できる
- [ ] ブラウザのコンソールログでContent型のXML文字列が確認できる
- [ ] ファイル保存処理がコメントアウトされている
- [ ] デバッグモード完了後、保存処理を有効化する準備ができている

## 12. 関連ドキュメント

- [.clinerules/development/config.md](../../.clinerules/development/config.md) - コーディング規約
- [.clinerules/development/typescript.md](../../.clinerules/development/typescript.md) - TypeScript型定義規約
- [frontend/src/types/maiml-unified.ts](../../frontend/src/types/maiml-unified.ts) - Template型定義
- [frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts](../../frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts) - 既存のXML生成関数

## 13. 承認記録

- **計画書提示日時**: 2026-02-27 10:32
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）

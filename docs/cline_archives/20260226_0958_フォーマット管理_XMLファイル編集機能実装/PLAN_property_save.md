# タスク計画書: フォーマット管理_空XMLファイル対応とプロパティ保存機能実装

## メタデータ
- **作成日時**: 2026-02-26 11:14
- **タスクID**: format_xml_empty_file_property_save
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

フォーマット管理画面でXMLファイルを編集する際、空のXMLファイル（または無効なXML）に対して自動的に最低限の構造を生成し、その後プロパティを追加・保存できるようにする機能を実装します。

## 2. 目的と期待される成果

### 目的
- 空のXMLファイルを編集可能にする
- XMLとして最低限必要な構造を自動生成する
- プロパティを追加して保存できるようにする
- ユーザーが意識せずに有効なXMLファイルを作成できるようにする

### 期待される成果
- [x] 空XMLファイル検出処理の実装
- [x] 最低限のXML構造の自動生成
- [x] TemplateEditorDialogでの初期化処理
- [x] プロパティ追加後の保存処理（Phase3完了）
- [x] バックエンドAPIへの保存リクエスト実装（Phase4完了）
- [ ] 動作確認（空ファイル → プロパティ追加 → 保存 → 再読み込み）

## 3. 実装ステップ

### Phase 1: 空ファイル検出と最低限のXML構造生成

#### 1-1. FormatManagement.tsx修正
**目的**: ファイル編集時に空ファイルを検出し、デフォルトXMLを生成

**実装箇所**: `handleFileEdit`関数

**実装内容**:
```typescript
const handleFileEdit = useCallback(async (file: FormatFileDetailData) => {
  const fileName = file.name.toLowerCase();
  const isXmlFile = fileName.endsWith('.xml');
  
  if (isXmlFile) {
    // ✅ XMLファイルの内容を読み込み
    let xmlContent = '';
    
    if (file.path && file.path.trim() !== '') {
      try {
        const client = createApiClient();
        const response = await client.post('/files/download-url', 
          { fileKey: file.path },
          { responseType: 'blob' }
        );
        const blob = response.data as Blob;
        xmlContent = await blob.text();
      } catch (error) {
        console.log('ファイル読み込みエラー - 新規扱い');
      }
    }
    
    // ✅ 空ファイル検出: 最低限のXML構造を生成
    if (!xmlContent || xmlContent.trim() === '') {
      console.log('🆕 空XMLファイル検出 - デフォルトXML生成');
      
      // テンプレートタイプを判定（ファイル名から推測）
      const templateType = fileName.includes('material') ? 'materialTemplate' :
                          fileName.includes('condition') ? 'conditionTemplate' :
                          'resultTemplate';
      
      const templateId = `${templateType}_${Date.now()}`;
      const templateName = file.name.replace('.xml', '');
      
      xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<${templateType} id="${templateId}">
  <name>${templateName}</name>
  <description></description>
</${templateType}>`;
    }
    
    // TemplateEditorDialogを開く
    setEditingXmlFile({
      ...file,
      content: xmlContent,
      isNewFile: !xmlContent || xmlContent.trim() === '',
    });
    setShowTemplateEditor(true);
  }
}, []);
```

#### 1-2. TemplateEditorDialog.tsx修正
**目的**: 空のテンプレートデータを適切に初期化

**実装箇所**: `useEffect`（初期化処理）

**実装内容**:
```typescript
useEffect(() => {
  if (open && node) {
    // ✅ mergedTemplateが空の場合の処理を追加
    if (!mergedTemplate || 
        !mergedTemplate.id || 
        Object.keys(mergedTemplate).length === 0) {
      
      console.log('🆕 空テンプレート検出 - デフォルト値を設定');
      
      // デフォルト値を設定
      const defaultId = `${node.data.placeType}_template_${Date.now()}`;
      const defaultName = node.data.name || 'Untitled';
      
      setTemplateId(defaultId);
      setUuid('');
      setName(defaultName);
      setDescription('');
      setProperties({});
      setContents({});
      setPlaceRefs([]);
      setInsertion({ uri: '', hash: { method: '', value: '' }, format: '' });
      setExpandedNodes(new Set());
      setForceRenderKey(Date.now());
      
      return;
    }
    
    // 既存の処理（データがある場合）
    setTemplateId(mergedTemplate.id || '');
    // ... 既存のロジック
  }
}, [open, node, mergedTemplate]);
```

---

### Phase 2: プロパティ追加機能の確認

#### 2-1. NestedPropertyEditor.tsx
**状況**: ✅ 既に実装済み

**確認ポイント**:
- 属性追加モーダル
- 要素追加モーダル
- 子要素追加モーダル
- 同階層コピー

**動作確認**:
- [ ] 空の状態から新規プロパティを追加できるか
- [ ] 属性（xsi:type, unitsなど）を追加できるか
- [ ] 要素（value, descriptionなど）を追加できるか
- [ ] 保存時に正しいデータ構造になっているか

---

### Phase 3: 保存処理の実装

#### 3-1. TemplateEditorDialog.tsx修正
**目的**: プロパティをXML形式に変換して保存

**実装箇所**: `handleSave`関数

**実装内容**:
```typescript
const handleSave = () => {
  // バリデーション
  if (!templateId.trim()) {
    message.error('テンプレートIDを入力してください');
    return;
  }
  
  // PropertyData形式からProperty[]とContent[]に変換
  const convertedProperties = convertPropertyDataToPropertiesArray(properties);
  const convertedContents = convertPropertyDataToContentsArray(contents);
  
  // Template型のオブジェクトを構築
  const templateRef: Template = {
    id: templateId,
    uuid: uuid,
    name: name,
    category: nodeCategory,
    description: description,
    properties: convertedProperties,
    contents: convertedContents,
    placeRefs: placeRefs,
  };
  
  // insertionがある場合は追加
  if ((node.data.placeType === 'material' || node.data.placeType === 'result') && 
      (insertion.uri || insertion.hash || insertion.format)) {
    templateRef.insertion = insertion;
  }
  
  // onSaveコールバックを呼び出し
  onSave(
    node.id, 
    templateRef, 
    true,  // isNewTemplate
    nodeCategory, 
    false, // isCommonTemplate
    null   // methodId
  );
  
  onClose();
  setHasChanges(false);
};
```

#### 3-2. FormatManagement.tsx修正
**目的**: TemplateEditorDialogからの保存リクエストを処理

**実装箇所**: TemplateEditorDialog呼び出し部分

**実装内容**:
```typescript
{showTemplateEditor && editingXmlFile && (() => {
  const tempId = `temp_${editingXmlFile.id}_${editingXmlFile.lastModified}`;
  const tempNode = {
    id: tempId,
    type: 'materialTemplate', // TODO: templateTypeから判定
    position: { x: 0, y: 0 },
    data: {
      id: tempId,
      name: editingXmlFile.name.replace('.xml', ''),
      description: '',
      placeType: 'material' as const,  // TODO: ファイル名から判定
      nodeType: 'place' as const,
    },
  };
  
  return (
    <TemplateEditorDialog
      open={showTemplateEditor}
      onClose={() => {
        setShowTemplateEditor(false);
        setEditingXmlFile(null);
      }}
      node={tempNode}
      onSave={async (nodeId, templateRef, isNewTemplate, templateCategory, isCommonTemplate, methodId) => {
        console.log('💾 [FormatManagement] XML保存:', editingXmlFile.name, {
          templateRef,
          isNewTemplate,
        });
        
        try {
          // ✅ Template型オブジェクトをXML文字列に変換
          const xmlContent = convertTemplateToXml(templateRef, templateCategory);
          
          // ✅ バックエンドAPIに保存リクエスト
          const client = createApiClient();
          await client.put(`/formats/files/${editingXmlFile.id}`, {
            content: xmlContent,
            filePath: editingXmlFile.path,
          });
          
          message.success('保存しました');
          
          // ファイル一覧を更新
          if (selectedFormatId && selectedFormat) {
            const fileResponse = await fetchFormatFiles(selectedFormatId, undefined);
            setFormatFilesData(prev => ({
              ...prev,
              [selectedFormatId]: {
                allFiles: (fileResponse.success && fileResponse.data?.files) 
                  ? fileResponse.data.files as FormatFileData[] 
                  : [],
              }
            }));
          }
          
          setShowTemplateEditor(false);
          setEditingXmlFile(null);
        } catch (error) {
          console.error('❌ 保存エラー:', error);
          message.error('保存に失敗しました');
        }
      }}
    />
  );
})()}
```

#### 3-3. XML変換関数の実装
**新規ファイル**: `frontend/src/utils/xmlConverter.ts`

**実装内容**:
```typescript
import { Template } from '@/types/maiml-unified';

/**
 * Template型オブジェクトをXML文字列に変換
 */
export function convertTemplateToXml(
  template: Template,
  templateType: 'material' | 'condition' | 'result'
): string {
  const templateTag = templateType === 'material' ? 'materialTemplate' :
                      templateType === 'condition' ? 'conditionTemplate' :
                      'resultTemplate';
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<${templateTag} id="${template.id}">\n`;
  
  // 基本情報
  xml += `  <name>${escapeXml(template.name || '')}</name>\n`;
  if (template.description) {
    xml += `  <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // Properties
  if (template.properties && template.properties.length > 0) {
    template.properties.forEach(prop => {
      xml += convertPropertyToXml(prop, 2);
    });
  }
  
  // Contents（ResultTemplateのみ）
  if (templateType === 'result' && template.contents && template.contents.length > 0) {
    template.contents.forEach(content => {
      xml += convertContentToXml(content, 2);
    });
  }
  
  xml += `</${templateTag}>`;
  
  return xml;
}

/**
 * Property型オブジェクトをXML文字列に変換
 */
function convertPropertyToXml(prop: any, indent: number): string {
  const spaces = '  '.repeat(indent);
  let xml = `${spaces}<property key="${prop.key}"`;
  
  // 属性を追加
  if (prop.attributes) {
    Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
      xml += ` ${attrName}="${escapeXml(String(attrValue))}"`;
    });
  }
  
  xml += '>\n';
  
  // 要素を追加
  if (prop.elements) {
    Object.entries(prop.elements).forEach(([elemName, elemValue]) => {
      xml += `${spaces}  <${elemName}>${escapeXml(String(elemValue))}</${elemName}>\n`;
    });
  }
  
  // 子要素を再帰的に追加
  if (prop.children && Array.isArray(prop.children) && prop.children.length > 0) {
    prop.children.forEach((child: any) => {
      xml += convertPropertyToXml(child, indent + 1);
    });
  }
  
  xml += `${spaces}</property>\n`;
  
  return xml;
}

/**
 * XMLエスケープ
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Content変換関数も同様に実装
function convertContentToXml(content: any, indent: number): string {
  // propertyと同じロジック（タグ名が'content'になるだけ）
  // ...
}
```

---

### Phase 4: バックエンドAPI実装

#### 4-1. ファイル保存エンドポイント
**新規エンドポイント**: `PUT /api/v1/formats/files/:fileId`

**実装ファイル**: `backend/src/routes/formatRoutes.ts`

**実装内容**:
```typescript
// XMLファイルの内容を更新
router.put('/files/:fileId', 
  auth, 
  tenantIsolation, 
  async (req: AuthRequest, res: Response) => {
    try {
      const { fileId } = req.params;
      const { content, filePath } = req.body;
      const organizationId = req.organizationId!;
      
      // バリデーション
      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONTENT',
            message: 'ファイル内容が不正です'
          }
        });
      }
      
      // S3/Swiftにファイルを保存
      const storageService = getStorageService();
      await storageService.uploadFile(
        organizationId,
        filePath,
        Buffer.from(content, 'utf-8'),
        { contentType: 'application/xml' }
      );
      
      res.json({
        success: true,
        data: {
          fileId,
          filePath,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('ファイル保存エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SAVE_FAILED',
          message: 'ファイルの保存に失敗しました'
        }
      });
    }
  }
);
```

---

### Phase 5: 動作確認

#### 5-1. テストシナリオ1: 空XMLファイルの編集

**手順**:
1. フォーマット管理画面を開く
2. 新規XMLファイルを作成（空の状態）
3. 編集ボタンをクリック
4. TemplateEditorDialogが開くことを確認
5. 「新規プロパティ追加」ボタンをクリック
6. プロパティキー: `temperature`、タグ名: `property` で追加
7. 追加されたプロパティの「属性」ボタンをクリック
8. `xsi:type`: `doubleType`、`units`: `℃` を追加
9. 「要素」ボタンをクリック
10. `value`: `25.5` を追加
11. 保存ボタンをクリック
12. 成功メッセージが表示されることを確認

**期待される結果**:
- XMLファイルに以下の内容が保存される
```xml
<?xml version="1.0" encoding="UTF-8"?>
<materialTemplate id="materialTemplate_1234567890">
  <name>temperature_data</name>
  <description></description>
  <property key="temperature" xsi:type="doubleType" units="℃">
    <value>25.5</value>
  </property>
</materialTemplate>
```

#### 5-2. テストシナリオ2: 保存後の再読み込み

**手順**:
1. 保存したファイルを再度開く
2. 追加したプロパティが正しく表示されることを確認
3. 属性と要素が正しく読み込まれることを確認

**期待される結果**:
- `temperature`プロパティが表示される
- 属性: `xsi:type="doubleType"`, `units="℃"`
- 要素: `value="25.5"`

---

## 4. 影響範囲

### 修正するファイル
1. `frontend/src/components/project/FormatManagement.tsx`
   - `handleFileEdit`関数に空ファイル検出とデフォルトXML生成を追加
   - TemplateEditorDialogの`onSave`でXML保存処理を実装

2. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
   - `useEffect`に空テンプレート検出処理を追加
   - `handleSave`関数でXML変換と保存処理を呼び出し

3. `frontend/src/utils/xmlConverter.ts`（新規作成）
   - `convertTemplateToXml`関数を実装
   - `convertPropertyToXml`関数を実装
   - `escapeXml`関数を実装

4. `backend/src/routes/formatRoutes.ts`
   - `PUT /files/:fileId`エンドポイントを追加

### 新規作成するファイル
1. `frontend/src/utils/xmlConverter.ts`
   - Template型 → XML文字列変換ユーティリティ

---

## 5. 技術的詳細

### XMLエスケープ処理
- `&`, `<`, `>`, `"`, `'` を適切にエスケープ
- XSS攻撃を防ぐため、すべてのユーザー入力値をエスケープ

### ファイル保存
- S3/Swiftにアップロード
- Content-Type: `application/xml`
- UTF-8エンコーディング

### エラーハンドリング
- ファイル読み込みエラー → デフォルトXML生成
- バリデーションエラー → ユーザーにメッセージ表示
- 保存エラー → エラーメッセージ表示、ロールバック

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| XML変換エラー | 高 | 中 | ユニットテストで検証、エラーハンドリング実装 |
| 既存ファイルの上書き | 高 | 低 | 確認ダイアログ表示、バックアップ機能 |
| 大容量XMLファイル | 中 | 低 | ファイルサイズ制限、プレビュー制限 |
| 文字エンコーディング問題 | 中 | 低 | UTF-8を強制、BOM処理 |

---

## 7. テスト計画

### ユニットテスト
- [ ] `convertTemplateToXml`関数のテスト
  - 空のプロパティ
  - 単一プロパティ
  - ネストされたプロパティ
  - 特殊文字を含むプロパティ
- [ ] `escapeXml`関数のテスト
  - `&`, `<`, `>`, `"`, `'` のエスケープ

### 統合テスト
- [ ] 空XMLファイル作成 → 編集 → 保存 → 再読み込み
- [ ] 既存XMLファイル編集 → プロパティ追加 → 保存
- [ ] エラーケース: 無効なテンプレートID
- [ ] エラーケース: ネットワークエラー

### 手動テスト
- [ ] UI操作確認: 新規プロパティ追加
- [ ] UI操作確認: 属性・要素・子要素の追加
- [ ] UI操作確認: 保存ボタン
- [ ] ファイル一覧更新確認

---

## 8. ロールバック計画

修正前のファイルをバックアップ：
```bash
cp frontend/src/components/project/FormatManagement.tsx \
   frontend/src/components/project/FormatManagement.tsx.backup_20260226

cp frontend/src/components/editorv2/components/TemplateEditorDialog.tsx \
   frontend/src/components/editorv2/components/TemplateEditorDialog.tsx.backup_20260226
```

---

## 9. 関連ドキュメント

- `.clinerules/development/file-writing.md` - ファイル書き込み規約
- `.clinerules/development/typescript.md` - TypeScript型定義規約
- `docs/20260226_0958_フォーマット管理_XMLファイル編集機能実装/PLAN.md` - 元のタスク計画書

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-26 11:14
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

---

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（実施後に記入）

### 発生した問題と解決方法
（実施後に記入）

### 最終的な成果物
- [ ] FormatManagement.tsx修正完了
- [ ] TemplateEditorDialog.tsx修正完了
- [ ] xmlConverter.ts作成完了
- [ ] バックエンドAPI実装完了
- [ ] 動作確認完了

---

## 12. 振り返り

### うまくいった点
（実施後に記入）

### 改善が必要な点
（実施後に記入）

### 学んだこと
（実施後に記入）

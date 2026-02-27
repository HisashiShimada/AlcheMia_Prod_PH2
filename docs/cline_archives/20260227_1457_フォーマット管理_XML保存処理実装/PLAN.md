# タスク計画書: フォーマット管理画面 XML保存処理実装

## メタデータ
- **作成日時**: 2026-02-27 14:57
- **タスクID**: format_xml_save_implementation
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

フォーマット管理画面でXML編集時の保存処理を実装します。FormatEditorDialogで編集したProperty/ContentデータをkeyDictionary形式のXMLファイルとして保存する機能を実装します。

## 2. 目的と期待される成果

### 目的
- XMLテンプレートファイルの編集・保存機能を完成させる
- keyDictionary形式のXML生成を実装する
- 部門cd + S3パス情報を含む正しいxmlns属性を設定する

### 期待される成果
- [ ] keyDictionary形式のXML生成関数を作成
- [ ] xmlns属性の動的生成（部門cd + S3パス）
- [ ] FormatManagement.tsx の保存処理を有効化
- [ ] バックエンドAPIへの保存リクエスト実装
- [ ] 保存成功時のフィードバック表示

## 3. 実装ステップ

### Phase 1: FormatManagement.tsx の保存処理実装
- [ ] onSaveハンドラのデバッグモードを解除
- [ ] escapeXmlをインポート追加
- [ ] keyDictionary XML生成処理を直接実装
  - xmlns属性を構築（S3パスから`.xml`を除去）
  - keyDictionary開始タグを生成
  - Property配列をループしてbuildPropertyXMLで出力
  - Content配列をループしてbuildContentXMLで出力
  - keyDictionary閉じタグを生成
- [ ] バックエンドAPI（PUT /formats/files）にXMLを送信
- [ ] 保存成功時のメッセージ表示
- [ ] ファイル一覧の更新
- [ ] ダイアログのクローズ処理

### Phase 2: エラーハンドリング
- [ ] XML生成エラーのキャッチ
- [ ] API通信エラーのキャッチ
- [ ] ユーザーへのエラーメッセージ表示

### Phase 3: テスト
- [ ] Material/Condition/Resultの各カテゴリでテスト
- [ ] 空のPropertyリストでテスト
- [ ] xmlns属性の正しさを確認
- [ ] 保存後のファイル内容を確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/FormatManagement.tsx`
   - `escapeXml` のインポート追加
   - `onSave` ハンドラのデバッグコードを削除
   - keyDictionary XML生成と保存処理を実装（関数化せず直接実装）

### 新規作成するファイル
なし

### 影響を受ける機能
- フォーマット管理画面のXML編集機能
- FormatEditorDialogの保存ボタン

## 5. 技術的詳細

### XML構造の要件

```xml
<keyDictionary xmlns="http://abc.com/schema/keyDictionary/{部門cd}/{サブパス}/resultTemplate/RTSpectrum" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <property formatString="0.000" key="LocationX" scaleFactor="1.000" xsi:type="doubleType">
  </property>
  <property formatString="0.000" key="LocationY" scaleFactor="1.000" xsi:type="doubleType">
  </property>
  <content axis="Intensity" formatString="0.0000000" id="RTSpecrumI" key="Intensity" scaleFactor="1.0000000" size="1016" xsi:type="contentDoubleListType">
  </content>
</keyDictionary>
```

**注意**: XML宣言（`<?xml version="1.0" encoding="UTF-8"?>`）は不要です。

### xmlns属性の構築ルール

**S3パス構造:**
```
{organization_id}/formats/{department_cd}/{category_folder}/{file_name}.xml
```

**例:** `a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/DEP004/material/TEST.xml`

**xmlns属性の構築:**
```
http://abc.com/schema/keyDictionary/ + {S3パスの拡張子なし}
```

**構築ステップ:**
1. **ベースURL**: `http://abc.com/schema/keyDictionary/`
2. **S3パスを取得**: `editingXmlFile.path` から取得
   - 例: `a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/DEP004/material/TEST.xml`
3. **拡張子を除去**: `.xml` を削除
   - 例: `a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/DEP004/material/TEST`
4. **結合**: ベースURL + S3パス（拡張子なし）
   - 結果: `http://abc.com/schema/keyDictionary/a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/DEP004/material/TEST`

**実装例:**
```typescript
// editingXmlFile.path から拡張子を除去
const s3PathWithoutExt = editingXmlFile.path.replace(/\.xml$/i, '');
const xmlns = `http://abc.com/schema/keyDictionary/${s3PathWithoutExt}`;
```

**別の例:**
- S3パス: `b1234567-89ab-cdef-0123-456789abcdef/formats/DEP001/condition/ConditionA.xml`
- xmlns: `http://abc.com/schema/keyDictionary/b1234567-89ab-cdef-0123-456789abcdef/formats/DEP001/condition/ConditionA`

### keyDictionary XML生成処理の仕様

**FormatManagement.tsx の onSave ハンドラ内で直接実装**

```typescript
// ✅ xmlns属性の構築（S3パスから拡張子を除去）
const s3PathWithoutExt = editingXmlFile.path.replace(/\.xml$/i, '');
const xmlns = `http://abc.com/schema/keyDictionary/${s3PathWithoutExt}`;

// ✅ keyDictionary XML生成（関数化せず直接実装）
let xmlContent = `<keyDictionary xmlns="${escapeXml(xmlns)}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;

// property要素群を出力
properties.forEach(prop => {
  xmlContent += buildPropertyXML(prop, 1);
});

// content要素群を出力
contents.forEach(content => {
  xmlContent += buildContentXML(content, 1);
});

xmlContent += `</keyDictionary>\n`;
```

**ポイント:**
- 新しい関数を作成しない（FormatManagement.tsx内で完結）
- XML宣言（`<?xml ...?>`）は出力しない
- 既存の `buildPropertyXML` と `buildContentXML` 関数を再利用
- `escapeXml` をインポートして使用
- インデントレベル=1（keyDictionary直下の要素）

### FormatManagement.tsx の保存処理

```typescript
onSave={async (
  nodeId: string,
  properties: Property[],
  contents: Content[],
  templateId: string,
  name: string,
  description: string,
  category: string
) => {
  console.log('📝 [FormatManagement] XML保存開始:', {
    templateId,
    name,
    category,
    propertiesCount: properties.length,
    contentsCount: contents.length
  });
  
  try {
    // ✅ xmlns属性の構築（S3パスから拡張子を除去）
    const s3PathWithoutExt = editingXmlFile.path.replace(/\.xml$/i, '');
    const xmlns = `http://abc.com/schema/keyDictionary/${s3PathWithoutExt}`;
    
    console.log('🔍 [FormatManagement] S3パス:', editingXmlFile.path);
    console.log('🔍 [FormatManagement] xmlns:', xmlns);
    
    // ✅ keyDictionary XML生成（直接実装）
    let xmlContent = `<keyDictionary xmlns="${escapeXml(xmlns)}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
    
    // property要素群を出力
    properties.forEach(prop => {
      xmlContent += buildPropertyXML(prop, 1);
    });
    
    // content要素群を出力
    contents.forEach(content => {
      xmlContent += buildContentXML(content, 1);
    });
    
    xmlContent += `</keyDictionary>\n`;
    
    console.log('📄 [FormatManagement] 生成されたXML:', xmlContent.substring(0, 500) + '...');
    
    // バックエンドAPIに保存
    const client = createApiClient();
    await client.put('/formats/files', {
      content: xmlContent,
      filePath: editingXmlFile.path,
    });
    
    console.log('✅ [FormatManagement] ファイル保存成功:', editingXmlFile.path);
    
    message.success('保存しました');
    
    // ファイル一覧を更新
    if (selectedFormatId && selectedFormat) {
      const currentPath = currentFolderPath.length > 0 
        ? currentFolderPath.join('/')
        : undefined;
      const fileResponse = await fetchFormatFiles(selectedFormatId, currentPath);
      const cacheKey = currentPath 
        ? `${selectedFormatId}/${currentPath}`
        : selectedFormatId;
      setFormatFilesData(prev => ({
        ...prev,
        [cacheKey]: {
          allFiles: (fileResponse.success && fileResponse.data?.files) 
            ? fileResponse.data.files as FormatFileData[] 
            : [],
        }
      }));
    }
    
    setShowTemplateEditor(false);
    setEditingXmlFile(null);
  } catch (error) {
    console.error('❌ [FormatManagement] 保存エラー:', error);
    message.error('保存に失敗しました: ' + (error as Error).message);
  }
}}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| xmlns属性のパス構築エラー | 高 | 中 | パス構築ロジックをテスト、フォールバック処理を実装 |
| 既存のbuildPropertyXML/buildContentXMLとの不整合 | 中 | 低 | インデントレベルを適切に調整、出力確認 |
| バックエンドAPI通信エラー | 中 | 低 | try-catchでエラーハンドリング、ユーザーへのメッセージ表示 |
| 空のプロパティ/コンテンツリスト | 低 | 中 | 空配列のケースを考慮したXML生成 |

## 7. テスト計画

### ユニットテスト
- [ ] buildKeyDictionaryXML関数のテスト
  - 正常系: Property/Content配列からXML生成
  - 空配列の場合
  - xmlns属性の正しさ

### 統合テスト
- [ ] FormatManagement.tsx の保存フロー
  - XML生成 → API送信 → 成功メッセージ
  - エラー時のメッセージ表示

### 手動テスト
- [ ] Material/Condition/Resultカテゴリで保存テスト
- [ ] 生成されたXMLの妥当性確認
- [ ] S3に保存されたファイルの内容確認

## 8. ロールバック計画

問題が発生した場合:
1. FormatManagement.tsx の onSave ハンドラをデバッグモードに戻す
2. buildKeyDictionaryXML関数をコメントアウト
3. ユーザーには「一時的に保存機能を無効化しています」とアナウンス

## 9. 関連ドキュメント

- `.clinerules/development/typescript.md` - 型定義規約
- `.clinerules/development/config.md` - コーディング規約
- `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` - 既存のXML生成関数

## 10. 承認記録

- **計画書提示日時**: 2026-02-27 14:57
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: （承認後に記入）

## 11. 実施記録

### 実施日時
開始: 2026-02-27 15:11
完了: 2026-02-27 15:11

### 計画からの変更点
なし - 計画通りに実装完了

### 発生した問題と解決方法
問題なし - スムーズに実装完了

### 最終的な成果物
- [x] escapeXmlのインポート追加
- [x] onSaveハンドラの保存処理実装
  - xmlns属性の構築（S3パスから拡張子除去）
  - keyDictionary XML生成（直接実装）
  - バックエンドAPIへの保存
  - ファイル一覧の更新
  - ダイアログのクローズ
- [x] エラーハンドリング（既存のtry-catch構造を活用）

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）

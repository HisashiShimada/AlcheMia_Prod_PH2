# PetriNetEditor fetchPetriNetData分析レポート

## 日時
2025-12-26 15:29

## 確認内容

PetriNetEditorのfetchPetriNetData関数で、フォーマットファイルを読み込んだ際の処理を確認。

## 現状の実装

### ケース1: 新規作成モード（effectiveMaimlDataがない）

```typescript
if (!effectiveMaimlData) {
  console.log('🆕 [PetriNetEditor] 新規作成モード: 空の状態で起動');
  
  const baseName = sourceContext === 'format' && editingFileName 
    ? editingFileName.replace(/\.maiml$/, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    : projectName;
  
  if (baseName && !documentData) {
    const sanitizedBaseName = baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const uuidFull = crypto.randomUUID();
    const uuidPrefix = uuidFull.substring(0, 8);
    
    const initialDocumentData: DocumentData = {
      id: `document_${sanitizedBaseName}_${uuidPrefix}`,
      protocolId: `protocol_${sanitizedBaseName}_${crypto.randomUUID().substring(0, 8)}`,
      methodId: `method_${sanitizedBaseName}_${crypto.randomUUID().substring(0, 8)}`,
      pnmlId: `pnml_${sanitizedBaseName}_${crypto.randomUUID().substring(0, 8)}`,
      programId: `program_${sanitizedBaseName}_${crypto.randomUUID().substring(0, 8)}`,
      name: baseName,
      description: '',
      date: new Date().toISOString(),
      uuid: uuidFull,
      creators: [],  // ✅ 空配列（マスタから追加）
      vendors: [],   // ✅ 空配列（マスタから追加）
      owners: [],    // ✅ 空配列（マスタから追加）
      instruments: [],
    };
    setDocumentData(initialDocumentData);
  }
  
  // ... 以下省略
  return;
}
```

✅ **新規作成時は問題なし**: 基本情報は自動生成、Creator等は空配列

### ケース2: 既存ファイル読み込みモード（effectiveMaimlDataがある）

```typescript
// extractDocumentFromMaiMLで直接抽出
const extractedDocument = extractDocumentFromMaiML(effectiveMaimlData || '');
if (extractedDocument) {
  const documentWithCorrectName: DocumentData = {
    ...extractedDocument,  // ← そのままコピー
    name: originalFileName 
      ? originalFileName.replace('.maiml', '') 
      : extractedDocument.name || 'document'
  };
  setDocumentData(documentWithCorrectName);
  console.log('📄 [PetriNetEditor] Document情報を読み込みました');
}
```

⚠️ **問題あり**: フォーマット管理から読み込んだ場合も、すべてそのまま引き継いでいる

## 必要な修正

### 修正案: sourceContext判定による条件分岐

```typescript
const extractedDocument = extractDocumentFromMaiML(effectiveMaimlData || '');
if (extractedDocument) {
  let documentToSet: DocumentData;
  
  if (sourceContext === 'format') {
    // フォーマット管理から: Creator/Vendor/Owner/Instrumentsは引き継ぎ、基本情報は新規生成
    const sanitizedBaseName = (originalFileName || 'template')
      .replace('.maiml', '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
    const uuidFull = crypto.randomUUID();
    const uuidPrefix = uuidFull.substring(0, 8);
    
    documentToSet = {
      // 基本情報は新規生成
      id: `document_${sanitizedBaseName}_${uuidPrefix}`,
      protocolId: `protocol_${sanitizedBaseName}_${crypto.randomUUID().substring(0, 8)}`,
      methodId: `method_${sanitizedBaseName}_${crypto.randomUUID().substring(0, 8)}`,
      pnmlId: `pnml_${sanitizedBaseName}_${crypto.randomUUID().substring(0, 8)}`,
      programId: `program_${sanitizedBaseName}_${crypto.randomUUID().substring(0, 8)}`,
      name: projectName || sanitizedBaseName,  // プロジェクト名を使用
      description: '',
      date: new Date().toISOString(),
      uuid: uuidFull,
      
      // Creator/Vendor/Owner/Instrumentsは引き継ぐ
      creators: extractedDocument.creators || [],
      vendors: extractedDocument.vendors || [],
      owners: extractedDocument.owners || [],
      instruments: extractedDocument.instruments || [],
      
      // XML署名は無効化
      signature: { enabled: false },
    };
    
    console.log('📄 [PetriNetEditor] フォーマット管理モード: 基本情報を新規生成、テンプレートは引き継ぎ', {
      newDocumentId: documentToSet.id,
      creatorsCount: documentToSet.creators.length,
      vendorsCount: documentToSet.vendors.length,
      ownersCount: documentToSet.owners.length,
    });
  } else {
    // プロジェクト管理から: すべてそのまま引き継ぎ（現行通り）
    documentToSet = {
      ...extractedDocument,
      name: originalFileName 
        ? originalFileName.replace('.maiml', '') 
        : extractedDocument.name || 'document'
    };
    
    console.log('📄 [PetriNetEditor] プロジェクト管理モード: すべて引き継ぎ');
  }
  
  setDocumentData(documentToSet);
}
```

## 実装方針

### Phase 1: PetriNetEditor修正（必須）

1. **fetchPetriNetData関数の修正**
   - sourceContext判定を追加
   - フォーマット管理モード時の処理分岐

2. **DocumentData生成ロジック**
   - フォーマット管理: Creator等引き継ぎ + 基本情報新規生成
   - プロジェクト管理: すべて引き継ぎ（現行通り）

### Phase 2: DocumentEditDialog修正（既存計画）

1. **UI制限**
   - sourceContext === 'format' の場合、3セクションを編集不可

2. **バリデーション除外**
   - フォーマット管理モードではCreator/Vendor/Ownerのバリデーションをスキップ

3. **保存時データクリーニング**
   - フォーマット管理モードでは制限対象フィールドを空にする

## 期待される動作フロー

### フォーマット管理 → プロジェクト管理

1. **フォーマット管理でMaiMLファイル作成**
   ```
   Document:
   - id: (空)
   - name: (空)
   - date: (空)
   - uuid: (空)
   - protocolId: (空)
   - methodId: (空)
   - pnmlId: (空)
   - programId: (空)
   - creators: [Creator1, Creator2]  ← 設定済み
   - vendors: [Vendor1]               ← 設定済み
   - owners: [Owner1]                 ← 設定済み
   - signature: { enabled: false }
   ```

2. **プロジェクト管理でフォーマットファイルを取り込み**
   ```
   PetriNetEditor (sourceContext='project'):
   - フォーマットファイルを読み込み
   - fetchPetriNetDataで処理:
     - creators/vendors/owners: そのまま引き継ぐ
     - 基本情報: プロジェクト名から新規生成
   
   結果:
   Document:
   - id: document_MyProject_abc123def
   - name: MyProject
   - date: 2025-12-26T15:30:00Z
   - uuid: abc123de-f456-7890-ghij-klmnopqrstu
   - protocolId: protocol_MyProject_xyz789
   - methodId: method_MyProject_uvw456
   - pnmlId: pnml_MyProject_rst123
   - programId: program_MyProject_mno789
   - creators: [Creator1, Creator2]  ← 引き継ぎ
   - vendors: [Vendor1]               ← 引き継ぎ
   - owners: [Owner1]                 ← 引き継ぎ
   - signature: { enabled: false }
   ```

3. **DocumentEditDialogで確認**
   - 基本情報セクション: 自動生成された値が表示される
   - MaiML ID属性セクション: 自動生成された値が表示される
   - XML署名セクション: 無効
   - Creator/Vendor/Owner: 引き継いだ値が表示される
   - バリデーションエラー: なし（自動生成されたため）

## 修正優先度

**最優先（Phase 1）:**
1. PetriNetEditor.tsxのfetchPetriNetData修正
   - これがないとフォーマットファイルの取り込みが正しく動作しない

**次優先（Phase 2）:**
2. DocumentEditDialog.tsxの編集制限機能
   - UI制限とバリデーション除外

## 次のステップ

1. タスク計画書を更新（PetriNetEditor修正を追加）
2. PetriNetEditor.tsx修正（Phase 1）
3. DocumentEditDialog.tsx修正（Phase 2）
4. 多言語対応
5. テスト

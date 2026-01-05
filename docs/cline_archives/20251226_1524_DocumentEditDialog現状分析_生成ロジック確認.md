# DocumentEditDialog現状分析: 生成ロジック確認レポート

## 日時
2025-12-26 15:24

## 確認内容

プロジェクト管理からMaiml編集画面を開いた際に、フォーマットファイル（3項目が空）を取り込んだ場合の自動生成ロジックの動作を確認。

## 現状の実装分析

### 1. 新規作成判定ロジック

```typescript
const isNewDocument = !documentData || 
                      documentData.name === 'document' || 
                      documentData.id === 'documentID';
```

- documentDataがnull/undefined
- documentData.name が 'document'（デフォルト値）
- documentData.id が 'documentID'（デフォルト値）

のいずれかの場合、新規作成と判定される。

### 2. normalizeDocumentData関数（自動生成ロジック）

```typescript
const normalizeDocumentData = useCallback((data?: DocumentData): DocumentData => {
  if (!data) return getInitialDocumentData();
  
  return {
    ...data,
    // ✅ MaiML ID属性を保持（undefinedの場合はデフォルト値を使用）
    protocolId: data.protocolId || 'protocolID',
    methodId: data.methodId || 'methodID',
    pnmlId: data.pnmlId || 'pnmlID',
    programId: data.programId || 'programID',
    
    // ⚠️ 空配列をデフォルトに変更（マスタから追加する前提）
    creators: Array.isArray(data.creators) ? data.creators : 
              data.creator ? [data.creator] : [],
    vendors: Array.isArray(data.vendors) ? data.vendors :
             data.vendor ? [data.vendor] : [],
    owners: Array.isArray(data.owners) ? data.owners :
            data.owner ? [data.owner] : [],
    instruments: Array.isArray(data.instruments) ? data.instruments :
                 data.instrument ? [data.instrument] : [],
    
    signature: data.signature || { enabled: false }
  };
}, []);
```

### 3. バリデーションロジック

```typescript
const validateDocumentData = useMemo(() => (data: DocumentData): string[] => {
  const errors: string[] = [];
  
  // ... 他のバリデーション ...
  
  // ⚠️ 必須要素チェック（配列対応）
  if (!data.creators || data.creators.length === 0) {
    errors.push('❌ At least one Creator is required');
  }
  if (!data.vendors || data.vendors.length === 0) {
    errors.push('❌ At least one Vendor is required');
  }
  if (!data.owners || data.owners.length === 0) {
    errors.push('❌ At least one Owner is required');
  }
  
  // ...
}, []);
```

## 確認結果

### ✅ 正常に動作する項目

#### 1. MaiML ID属性セクション
- **protocolId, methodId, pnmlId, programId**
- 空（undefined）の場合、自動的にデフォルト値が設定される
- フォーマット管理で空にしても、プロジェクト管理で開いたときに自動生成される

#### 2. XML署名セクション
- **signature.enabled**
- 空（undefined）の場合、`{ enabled: false }` が設定される
- フォーマット管理で空にしても問題なし

#### 3. 基本情報セクション（部分的）
- **date**
- 空の場合でもエラーにはならない（バリデーションで必須チェックなし）

### ⚠️ 問題がある項目

#### 1. Creator、Vendor、Owner（重要）

**現状の動作:**
```typescript
creators: Array.isArray(data.creators) ? data.creators : 
          data.creator ? [data.creator] : [],  // ← 空配列になる
```

**問題点:**
1. フォーマット管理で空にした場合、プロジェクト管理で開いたときに空配列になる
2. バリデーションで「At least one Creator is required」エラーが発生
3. ユーザーは保存できない（マスタから手動追加が必要）

**期待される動作:**
- フォーマット管理: 空でもバリデーションエラーにならない
- プロジェクト管理: 空の場合、デフォルト値を自動設定 or ユーザーに選択を促す

#### 2. 基本情報セクション（一部）

**name, id:**
- バリデーションで必須チェックあり
- 空の場合エラーになる
- しかし、フォーマット管理では空にしたい

## 修正が必要な内容

### 1. バリデーションロジックの条件分岐

```typescript
const validateDocumentData = useMemo(() => (
  data: DocumentData, 
  isFormatMode: boolean  // ← 追加
): string[] => {
  const errors: string[] = [];
  
  if (!data.name?.trim()) {
    errors.push('❌ Document name is required');
  }
  
  if (!data.id?.trim()) {
    errors.push('❌ Document ID is required');
  }
  
  // フォーマットモードの場合はスキップ
  if (!isFormatMode) {
    // 必須要素チェック（配列対応）
    if (!data.creators || data.creators.length === 0) {
      errors.push('❌ At least one Creator is required');
    }
    if (!data.vendors || data.vendors.length === 0) {
      errors.push('❌ At least one Vendor is required');
    }
    if (!data.owners || data.owners.length === 0) {
      errors.push('❌ At least one Owner is required');
    }
  }
  
  // ... 他のバリデーション ...
  
  return errors;
}, []);
```

### 2. プロジェクト管理モードでの自動補完

```typescript
useEffect(() => {
  if (open && !isFormatMode) {
    // プロジェクト管理モードで、creators/vendors/ownersが空の場合
    if (documentData && 
        (!documentData.creators || documentData.creators.length === 0) &&
        creators.length > 0) {
      // マスタデータから最初の1件を自動設定（または選択ダイアログ表示）
      console.log('⚠️ Creatorsが空です。マスタから選択してください。');
      // 必要に応じて自動設定やダイアログ表示
    }
  }
}, [open, isFormatMode, documentData, creators]);
```

### 3. 保存時のデータクリーニング

```typescript
const handleSave = useCallback(() => {
  // フォーマットモードの場合、制限対象フィールドを空にする
  const dataToSave = isFormatMode
    ? {
        ...editingDocument,
        // 基本情報を空にする
        name: '',
        description: '',
        date: '',
        // MaiML ID属性を空にする
        protocolId: '',
        methodId: '',
        pnmlId: '',
        programId: '',
        // XML署名を無効化
        signature: { enabled: false },
        // Creator/Vendor/Ownerも空にする
        creators: [],
        vendors: [],
        owners: [],
      }
    : editingDocument;
  
  const errors = validateDocumentData(dataToSave, isFormatMode);
  // ...
}, [editingDocument, isFormatMode, validateDocumentData, onSave, onClose]);
```

## 結論

### ✅ 既存の自動生成ロジックで対応可能な項目
1. MaiML ID属性（protocolId, methodId, pnmlId, programId）
2. XML署名（signature）

### ⚠️ 追加実装が必要な項目
1. Creator、Vendor、Ownerのバリデーション条件分岐
2. プロジェクト管理モードでの空データ補完ロジック（オプション）
3. フォーマット管理モードでの保存時データクリーニング

### 推奨する実装方針

**Phase 1: 最小限の修正（必須）**
1. バリデーションロジックに`isFormatMode`パラメータを追加
2. フォーマットモードでは3セクションのバリデーションをスキップ
3. 保存時に制限対象フィールドを空にする

**Phase 2: ユーザー体験向上（オプション）**
4. プロジェクト管理モードで空の場合、警告メッセージを表示
5. マスタデータから選択を促すダイアログを表示
6. または最初の1件を自動設定するオプション

## 次のステップ

1. タスク計画書を更新（バリデーション条件分岐を追加）
2. 実装開始
3. テスト（特にプロジェクト管理モードでの動作確認）

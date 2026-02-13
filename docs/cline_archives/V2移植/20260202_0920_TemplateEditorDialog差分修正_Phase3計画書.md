# TemplateEditorDialog差分修正 Phase 3実装計画書

## 作成日時
2026-02-02 09:20

## 概要
Phase 3では、名前空間取り込み機能をreference版レベルの高度UIにアップグレードします。

---

## 🎯 Phase 3の目標

### 現状（簡易版）
```typescript
// △ 現在版: シンプルなSelect選択のみ
<Select
  placeholder="テンプレートファイルを選択"
  value={selectedTemplateFile}
  onChange={setSelectedTemplateFile}
  options={templateFiles.map(file => ({
    label: `${file.fileName} (${(file.size / 1024).toFixed(1)}KB)`,
    value: file.filePath,
  }))}
/>
```

### 目標（高度版）
```typescript
// ✅ reference版: 高度なUI
- フォルダツリー表示（階層構造）
- ファイルプレビュー機能
- XMLプレビュー表示
- プロパティ一覧のプレビュー
- 取り込み前の確認機能
```

---

## 📋 Phase 3の実装内容

### Phase 3-1: フォルダツリー表示機能

#### 実装内容
1. **ディレクトリ構造の解析**
   - ファイルパスから階層構造を構築
   - フォルダとファイルを分離

2. **TreeSelect コンポーネントの使用**
   - Ant Design の TreeSelect を活用
   - フォルダアイコン・ファイルアイコンの表示
   - 展開/折りたたみ機能

3. **データ構造の変換**
```typescript
interface TreeNode {
  title: string;
  value: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
  icon?: React.ReactNode;
}

const buildTreeData = (files: TemplateFile[]): TreeNode[] => {
  const tree: Record<string, TreeNode> = {};
  
  files.forEach(file => {
    const parts = file.filePath.split('/');
    let currentPath = '';
    
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!tree[currentPath]) {
        tree[currentPath] = {
          title: part,
          value: currentPath,
          key: currentPath,
          isLeaf: index === parts.length - 1,
          children: [],
          icon: index === parts.length - 1 ? <FileOutlined /> : <FolderOutlined />
        };
      }
    });
  });
  
  return Object.values(tree);
};
```

---

### Phase 3-2: ファイルプレビュー機能

#### 実装内容
1. **プレビューパネルの追加**
   - ファイル選択時にプレビューを表示
   - XMLコンテンツの整形表示
   - シンタックスハイライト（オプション）

2. **プロパティ一覧のプレビュー**
```typescript
const [previewContent, setPreviewContent] = useState<{
  xml?: string;
  properties?: Record<string, PropertyData>;
  error?: string;
}>({});

const handleFileSelect = async (filePath: string) => {
  setSelectedTemplateFile(filePath);
  
  try {
    const xmlContent = await fetchTemplateContent(organizationId, filePath);
    const parsedProperties = parseNamespacesFromXml(xmlContent);
    
    setPreviewContent({
      xml: xmlContent,
      properties: parsedProperties
    });
  } catch (error) {
    setPreviewContent({
      error: 'プレビューの読み込みに失敗しました'
    });
  }
};
```

3. **プレビューUI**
```typescript
{previewContent.xml && (
  <Collapse
    items={[
      {
        key: 'xml',
        label: '📄 XMLプレビュー',
        children: (
          <pre style={{ 
            maxHeight: 300, 
            overflow: 'auto',
            backgroundColor: '#f5f5f5',
            padding: 16,
            borderRadius: 4
          }}>
            {previewContent.xml}
          </pre>
        )
      },
      {
        key: 'properties',
        label: '🏷️ プロパティ一覧プレビュー',
        children: (
          <div>
            <Alert
              message={`${Object.keys(previewContent.properties || {}).length} 個のプロパティが見つかりました`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            {Object.entries(previewContent.properties || {}).map(([key, data]) => (
              <Tag key={key} style={{ marginBottom: 4 }}>
                {key}: {data.attributes?.['xsi:type'] || 'stringType'}
              </Tag>
            ))}
          </div>
        )
      }
    ]}
  />
)}
```

---

### Phase 3-3: 取り込み確認機能

#### 実装内容
1. **取り込み前の確認ダイアログ**
```typescript
const [showConfirmDialog, setShowConfirmDialog] = useState(false);

const handleImportClick = () => {
  if (!selectedTemplateFile || !previewContent.properties) {
    message.error('ファイルを選択してください');
    return;
  }
  
  // プロパティ数をカウント
  const propertyCount = Object.keys(previewContent.properties).length;
  
  // 重複チェック
  const existingKeys = Object.keys(properties);
  const duplicateKeys = Object.keys(previewContent.properties).filter(key => 
    existingKeys.includes(key)
  );
  
  // 確認ダイアログを表示
  setShowConfirmDialog(true);
};
```

2. **確認ダイアログUI**
```typescript
<Modal
  title="⚠️ 取り込み確認"
  open={showConfirmDialog}
  onCancel={() => setShowConfirmDialog(false)}
  onOk={handleConfirmImport}
  okText="取り込む"
  cancelText="キャンセル"
>
  <Space direction="vertical" style={{ width: '100%' }}>
    <Alert
      message={`${Object.keys(previewContent.properties || {}).length} 個のプロパティを取り込みます`}
      type="info"
    />
    
    {duplicateKeys.length > 0 && (
      <Alert
        message="重複するプロパティがあります"
        description={
          <div>
            <p>以下のプロパティは上書きされます：</p>
            {duplicateKeys.map(key => (
              <Tag key={key} color="warning">{key}</Tag>
            ))}
          </div>
        }
        type="warning"
      />
    )}
    
    <Text>よろしいですか？</Text>
  </Space>
</Modal>
```

---

## 📊 実装統計予測

### Phase 3-1: フォルダツリー表示
- **追加行数**: 約80行
  - TreeData構築ロジック: 50行
  - TreeSelect UI: 30行

### Phase 3-2: ファイルプレビュー
- **追加行数**: 約100行
  - プレビュー取得ロジック: 30行
  - XML表示UI: 30行
  - プロパティ一覧UI: 40行

### Phase 3-3: 取り込み確認
- **追加行数**: 約50行
  - 確認ダイアログロジック: 20行
  - 確認ダイアログUI: 30行

**合計追加行数**: 約230行

---

## 🧪 テスト計画

### Phase 3-1: フォルダツリー表示

#### テストケース1: 階層構造の表示
- [ ] フォルダとファイルが正しく階層表示される
- [ ] フォルダアイコンとファイルアイコンが正しく表示される
- [ ] 展開/折りたたみが機能する

#### テストケース2: ファイル選択
- [ ] ファイルを選択できる
- [ ] 選択したファイルパスが正しく取得される

### Phase 3-2: ファイルプレビュー

#### テストケース1: XMLプレビュー
- [ ] XMLコンテンツが整形表示される
- [ ] スクロールが機能する

#### テストケース2: プロパティ一覧プレビュー
- [ ] プロパティ数が正しく表示される
- [ ] プロパティキーと型が表示される

#### テストケース3: エラーハンドリング
- [ ] ファイル読み込みエラーが適切に表示される

### Phase 3-3: 取り込み確認

#### テストケース1: 確認ダイアログ
- [ ] 取り込み前に確認ダイアログが表示される
- [ ] プロパティ数が正しく表示される

#### テストケース2: 重複チェック
- [ ] 重複するプロパティが検出される
- [ ] 重複プロパティが警告表示される

#### テストケース3: 取り込み実行
- [ ] OKボタンで取り込みが実行される
- [ ] キャンセルボタンで取り込みがキャンセルされる

---

## 📈 期待される効果

### Before（Phase 3実装前）
- △ シンプルなSelect選択
- △ ファイル構造が見えにくい
- △ 取り込み前の内容確認ができない
- △ 重複プロパティの検出なし

### After（Phase 3実装後）
- ✅ 階層的なフォルダツリー表示
- ✅ ファイル構造が一目瞭然
- ✅ XMLとプロパティのプレビュー機能
- ✅ 取り込み前の確認・重複検出

---

## 💡 技術的な注意点

### Phase 3-1: フォルダツリー
- TreeSelectコンポーネントは大量のノードでパフォーマンス低下の可能性
- 必要に応じて仮想スクロール（rc-virtual-list）を検討

### Phase 3-2: プレビュー
- 大きなXMLファイルは表示を制限（最初の500行など）
- シンタックスハイライトは react-syntax-highlighter を使用可能（オプション）

### Phase 3-3: 確認ダイアログ
- 重複チェックは大量プロパティで処理時間がかかる可能性
- 非同期処理を検討

---

## 📋 完了基準

### Phase 3全体
- [ ] フォルダツリー表示機能実装
- [ ] ファイルプレビュー機能実装
- [ ] 取り込み確認機能実装
- [ ] TypeScriptエラーなし
- [ ] 手動テスト完了

---

## 🎯 実装順序

1. **Phase 3-1: フォルダツリー表示** → 基盤機能
2. **Phase 3-2: ファイルプレビュー** → UX向上
3. **Phase 3-3: 取り込み確認** → 安全性向上

---

## 📝 関連ドキュメント

- [差分調査レポート](./20260202_0905_TemplateEditorDialog差分調査_レポート.md)
- [Phase 1完了報告書](./20260202_0913_TemplateEditorDialog差分修正_Phase1完了報告.md)
- [Phase 2完了報告書](./20260202_0917_TemplateEditorDialog差分修正_Phase2完了報告.md)

---

## 承認

- **計画書作成日時**: 2026-02-02 09:20
- **承認待ち**: Phase 3実装開始の承認
- **推定実装時間**: 20分

**Phase 3実装準備完了** ✅
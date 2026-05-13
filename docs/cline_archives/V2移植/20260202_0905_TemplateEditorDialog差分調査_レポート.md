# TemplateEditorDialog差分調査レポート

## 作成日時
2026-02-02 09:05

## 概要
現在のTemplateEditorDialog.tsx（editorv2版）とreference版を比較し、欠けている項目を特定しました。

---

## 📊 比較結果サマリー

### ファイル情報
- **現在版**: `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
  - バージョン: 2.1.0
  - 日付: 2026-01-30
  - 行数: 約1,100行

- **reference版**: `frontend/src/reference/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx`
  - バージョン: 3.0.0 - NestedPropertyEditor完全準拠版
  - 日付: 2025-10-30
  - 行数: 約2,400行（2倍以上）

### 重要度別の欠落項目

| カテゴリ | 欠落項目数 | 重要度 |
|---------|-----------|--------|
| 基本情報編集 | 1項目 | 🔴 高 |
| Place References | 1機能 | 🔴 高 |
| 継承元表示 | 1機能 | 🟡 中 |
| 属性追加UI | 1機能 | 🟡 中 |
| 名前空間取り込み | 1機能 | 🟢 低 |

---

## 🔴 重要度：高（即座に対応が必要）

### 1. Place References編集機能（完全欠落）

**reference版の実装:**
```jsx
// ✅ Place References編集セクション
const [placeRefs, setPlaceRefs] = useState([]);
const [showPlaceRefAddDialog, setShowPlaceRefAddDialog] = useState(false);

// Place Referencesの読み込み（文字列配列に正規化）
const loadedPlaceRefs = mergedTemplate.placeRefs || [];
const normalizedPlaceRefs = loadedPlaceRefs.map(ref => 
  typeof ref === 'string' ? ref : (ref.ref || ref.id || '')
).filter(ref => ref);
setPlaceRefs(normalizedPlaceRefs);

// UI表示
<Box>
  <Typography variant="h6">🔗 Place References</Typography>
  <Button onClick={() => setShowPlaceRefAddDialog(true)}>追加</Button>
  
  {placeRefs.map((placeRef, index) => (
    <Box key={index}>
      <Typography>Place Ref #{index + 1}</Typography>
      <Typography>Ref: {placeRef}</Typography>
      <IconButton onClick={() => {
        const updated = placeRefs.filter((_, i) => i !== index);
        setPlaceRefs(updated);
      }}>
        <DeleteIcon />
      </IconButton>
    </Box>
  ))}
</Box>

// 追加ダイアログ
<Dialog open={showPlaceRefAddDialog}>
  <DialogTitle>🔗 Place Reference追加</DialogTitle>
  <DialogContent>
    {allNodes
      .filter(n => n.data.nodeType === 'place')
      .filter(n => !placeRefs.includes(n.id))
      .map(place => (
        <Button onClick={() => {
          setPlaceRefs([...placeRefs, place.id]);
          setShowPlaceRefAddDialog(false);
        }}>
          {place.id} - {place.data.name}
        </Button>
      ))}
  </DialogContent>
</Dialog>
```

**現在版の実装:**
```typescript
// ❌ placeRefsのStateはあるが、UI表示・編集機能が全くない
const [placeRefs, setPlaceRefs] = useState<string[]>([]);

// 読み込みのみ実装
const loadedPlaceRefs = mergedTemplate.placeRefs || [];
const normalizedPlaceRefs = loadedPlaceRefs.map(ref => 
  typeof ref === 'string' ? ref : (ref.ref || ref.id || '')
).filter(ref => ref);
setPlaceRefs(normalizedPlaceRefs);

// ✅ UI表示・追加・削除機能が完全に欠落
```

**影響:**
- ユーザーがPlace Referencesを編集できない
- テンプレートとPlaceの関連付けができない
- MaiML仕様で必須の要素が編集不可能

---

### 2. テンプレートID重複チェック機能（不完全）

**reference版の実装:**
```jsx
const handleSaveClick = () => {
  // ✅ テンプレートID重複チェック
  if (!templateId.trim()) {
    alert('テンプレートIDを入力してください');
    return;
  }
  
  // ノードIDとの重複チェック
  const nodeIds = allNodes.map(n => n.id);
  if (nodeIds.includes(templateId) && templateId !== node.id) {
    alert(`テンプレートID "${templateId}" は既にノードIDとして使用されています。`);
    return;
  }
  
  // 他のテンプレートIDとの重複チェック
  if (window.clineAllTemplates) {
    const allTemplateIds = [];
    ['material', 'condition', 'result'].forEach(category => {
      if (window.clineAllTemplates[category]) {
        window.clineAllTemplates[category].forEach(t => {
          if (t.id !== (node.data.template?.id || node.data.templateRef?.id)) {
            allTemplateIds.push(t.id);
          }
        });
      }
    });
    
    if (allTemplateIds.includes(templateId)) {
      alert(`テンプレートID "${templateId}" は既に他のテンプレートで使用されています。`);
      return;
    }
  }
};
```

**現在版の実装:**
```typescript
const handleSave = () => {
  // ❌ 簡易チェックのみ
  if (!templateId.trim()) {
    message.error('テンプレートIDを入力してください');
    return;
  }
  
  // ✅ 重複チェックが欠落
};
```

**影響:**
- テンプレートID重複によるデータ破損の危険性
- ノードIDとの競合が検出できない

---

## 🟡 重要度：中（機能向上に必要）

### 3. 継承元プロパティ参照表示機能（完全欠落）

**reference版の実装:**
```jsx
// ✅ 継承元テンプレート情報取得 + XMLから子要素を直接抽出
const inheritedTemplate = useMemo(() => {
  const templateRefHref = node?.data?.templateRef?.href;
  if (!templateRefHref || !allNodes) return null;
  
  const templateRefId = templateRefHref.startsWith('#') 
    ? templateRefHref.substring(1) 
    : templateRefHref;
  
  const inheritedNode = allNodes.find(n => {
    if (n.id === currentNodeId) return false;
    const nodeTemplateId = n.data?.template?.templateId || n.data?.template?.id || n.data?.id;
    return nodeTemplateId === templateRefId || n.id === templateRefId;
  });
  
  if (!inheritedNode?.data?.template) return null;
  
  const baseTemplate = inheritedNode.data.template;
  
  // 🎯 XMLから直接子要素を抽出してpropertiesNestedを再構築
  if (baseTemplate?.element) {
    const enhancedPropertiesNested = {};
    const basePropertiesNested = baseTemplate.propertiesNested || {};
    
    Object.entries(basePropertiesNested).forEach(([propKey, propData]) => {
      enhancedPropertiesNested[propKey] = { ...propData };
      
      let propertyElement = templateElement.querySelector(`property[key="${propKey}"]`);
      if (propertyElement) {
        const childElements = Array.from(propertyElement.children).filter(child => 
          ['content', 'property', 'parameter'].includes(child.tagName.toLowerCase())
        );
        
        if (childElements.length > 0) {
          enhancedPropertiesNested[propKey].children = extractChildrenFromXML(childElements);
        }
      }
    });
    
    return {
      ...baseTemplate,
      propertiesNested: enhancedPropertiesNested
    };
  }
  
  return baseTemplate;
}, [node?.data?.templateRefId, node?.id, allNodes]);

// UI表示
{inheritedTemplate && inheritedTemplate.propertiesNested && (
  <Box sx={{ mb: 2, p: 2, bgcolor: '#f0f8ff' }}>
    <Typography variant="h6">📖 継承元プロパティ（参照専用）</Typography>
    <Alert severity="info">
      継承元テンプレート「{node.data.templateRefId}」からのプロパティです。
    </Alert>
    {Object.entries(inheritedTemplate.propertiesNested).map(([propKey, prop]) => (
      <Box key={propKey}>
        {/* 詳細表示 */}
      </Box>
    ))}
  </Box>
)}
```

**現在版の実装:**
```typescript
// ❌ 継承元プロパティ表示機能が完全に欠落
// mergedTemplate計算はあるが、継承元の詳細表示なし
```

**影響:**
- 継承元テンプレートの内容が確認できない
- テンプレート継承関係の可視化ができない
- デバッグが困難

---

### 4. 属性追加モーダルのカスタム属性名入力機能

**reference版の実装:**
```jsx
<FormControl fullWidth>
  <InputLabel>属性名</InputLabel>
  <Select value={newAttributeName} onChange={(e) => {
    setNewAttributeName(e.target.value);
    if (e.target.value === 'xsi:type' && !newAttributeValue) {
      setNewAttributeValue('stringType');
    }
  }}>
    <MenuItem value="xsi:type">xsi:type (MaiML型定義)</MenuItem>
    <MenuItem value="units">units (単位)</MenuItem>
    <MenuItem value="formatString">formatString (書式文字列)</MenuItem>
    <MenuItem value="scaleFactor">scaleFactor (スケール係数)</MenuItem>
    <MenuItem value="key">key (キー)</MenuItem>
    <MenuItem value="id">id (ID)</MenuItem>
    <MenuItem value="ref">ref (参照)</MenuItem>
    <MenuItem value="__custom__">その他（直接入力）</MenuItem>
  </Select>
</FormControl>

{newAttributeName === '__custom__' && (
  <TextField
    fullWidth
    label="カスタム属性名"
    onChange={(e) => setNewAttributeName(e.target.value)}
    placeholder="例: customAttribute"
  />
)}
```

**現在版の実装:**
```typescript
<Select
  placeholder="属性名を選択"
  value={newAttributeName}
  onChange={(value) => {
    setNewAttributeName(value);
    if (value === 'xsi:type' && !newAttributeValue) {
      setNewAttributeValue('stringType');
    }
  }}
>
  <Option value="xsi:type">xsi:type (MaiML型定義)</Option>
  <Option value="units">units (単位)</Option>
  <Option value="formatString">formatString (書式文字列)</Option>
  <Option value="scaleFactor">scaleFactor (スケール係数)</Option>
  <Option value="key">key (キー)</Option>
  <Option value="id">id (ID)</Option>
  <Option value="ref">ref (参照)</Option>
  {/* ❌ カスタム属性名入力機能なし */}
</Select>
```

**影響:**
- 定義済み以外の属性名を追加できない
- 柔軟性が低下

---

## 🟢 重要度：低（将来的に実装を検討）

### 5. 高度な名前空間取り込み機能

**reference版の実装:**
- S3フォルダ構造の再帰的表示
- フォルダツリーのUI
- ファイルプレビュー機能
- 段階的インポートモード選択

**現在版の実装:**
- 基本的な名前空間取り込み（fetchTemplateFiles、fetchTemplateContent）
- シンプルなファイル選択UI

**影響:**
- 使いやすさの差
- 大規模なテンプレートライブラリでの操作性

---

## 📈 コード量の比較

### 機能別行数

| 機能 | reference版 | 現在版 | 差分 |
|------|-------------|--------|------|
| Place References | 約150行 | 0行 | -150 |
| 継承元表示 | 約200行 | 0行 | -200 |
| 属性追加UI | 約50行 | 約30行 | -20 |
| 名前空間取り込み | 約300行 | 約150行 | -150 |
| その他 | 約1,700行 | 約920行 | -780 |
| **合計** | **約2,400行** | **約1,100行** | **-1,300行** |

---

## 🎯 推奨される対応

### Phase 1: 緊急対応（重要度：高）
1. **Place References編集機能の完全実装**
   - State管理（既存）
   - UI表示セクション追加
   - 追加ダイアログ実装
   - 削除機能実装
   - 保存処理への統合

2. **テンプレートID重複チェック強化**
   - ノードIDとの重複チェック
   - 他テンプレートIDとの重複チェック
   - わかりやすいエラーメッセージ

### Phase 2: 機能向上（重要度：中）
3. **継承元プロパティ参照表示**
   - useMemoでinheritedTemplate計算
   - XML要素からの子要素抽出ロジック
   - 読み取り専用UI表示

4. **カスタム属性名入力機能**
   - `__custom__`オプション追加
   - 条件付きTextField表示
   - バリデーション追加

### Phase 3: 将来的改善（重要度：低）
5. **名前空間取り込みUI改善**
   - フォルダツリー表示
   - プレビュー機能強化
   - 詳細なファイル情報表示

---

## 📋 修正計画書への引き継ぎ事項

### 優先順位1（即座に対応）
- ✅ Place References編集機能の完全実装
- ✅ テンプレートID重複チェック強化

### 優先順位2（次回対応）
- ⚠️ 継承元プロパティ参照表示
- ⚠️ カスタム属性名入力機能

### 優先順位3（将来対応）
- ℹ️ 名前空間取り込みUI改善

---

## 🔍 技術的詳細メモ

### Place References実装時の注意点
1. `placeRefs`は文字列配列（`string[]`）として管理
2. オブジェクト形式（`{ref: string}`）を文字列に正規化する処理が必要
3. `allNodes`からPlace型のノードのみをフィルタ
4. 既に登録済みのPlaceは追加候補から除外

### 継承元プロパティ実装時の注意点
1. `node.data.templateRef.href`から継承元IDを取得（#プレフィックス除去）
2. `allNodes`から継承元テンプレートを検索
3. `element`プロパティが存在する場合、XMLから直接子要素を抽出
4. `querySelector`でproperty要素を検索し、children配列を再構築

---

## ✅ まとめ

現在版は基本機能は実装されているものの、**Place References編集機能が完全に欠落**しており、これが最も重大な問題です。

reference版の2,400行に対して現在版は1,100行と半分以下であり、主に以下の機能が欠けています：

1. 🔴 **Place References編集** - 完全欠落（UI未実装）
2. 🔴 **テンプレートID重複チェック** - 不完全
3. 🟡 **継承元プロパティ表示** - 完全欠落
4. 🟡 **カスタム属性名入力** - 制限的
5. 🟢 **高度な名前空間取り込みUI** - 簡易版のみ

次のステップとして、詳細な修正計画書を作成します。
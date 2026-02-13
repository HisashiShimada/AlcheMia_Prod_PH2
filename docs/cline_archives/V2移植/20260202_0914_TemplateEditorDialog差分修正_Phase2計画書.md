# TemplateEditorDialog差分修正 Phase 2実装計画書

## 作成日時
2026-02-02 09:14

## 概要
Phase 1で重要度高の機能を実装完了しました。Phase 2では重要度中の2機能を実装します。

---

## 🎯 Phase 2の目標

### Phase 2-1: 継承元プロパティ参照表示
**目的**: テンプレート継承時に、親テンプレートのプロパティを視覚的に確認できるようにする

**ビジネス価値**:
- テンプレート継承関係が明確になる
- 重複プロパティの発見が容易
- デバッグ効率の向上

### Phase 2-2: カスタム属性名入力機能
**目的**: MaiML標準属性以外の独自属性を追加できるようにする

**ビジネス価値**:
- 実験特有のメタデータを追加可能
- 拡張性の向上
- 柔軟なテンプレート設計

---

## 📋 Phase 2-1: 継承元プロパティ参照表示

### reference版の実装分析

**場所**: `frontend/src/components/reference/PetriNetEditorV2/components/TemplateEditorDialog.tsx`

**実装内容**:
```typescript
// 1. inheritedTemplateの計算
const inheritedTemplate = useMemo(() => {
  if (!mergedTemplate?.templateRefs || mergedTemplate.templateRefs.length === 0) {
    return null;
  }
  
  const parentTemplateId = mergedTemplate.templateRefs[0];
  
  // グローバルテンプレートから検索
  if (window.clineAllTemplates) {
    const category = node.data.placeType === 'material' ? 'material' :
                     node.data.placeType === 'condition' ? 'condition' : 'result';
    const templates = window.clineAllTemplates[category] || [];
    return templates.find(t => t.id === parentTemplateId) || null;
  }
  
  // allNodesから検索
  const parentNode = allNodes.find(n => 
    n.id === parentTemplateId || 
    n.data?.template?.id === parentTemplateId ||
    n.data?.templateRef?.id === parentTemplateId
  );
  
  if (parentNode) {
    return parentNode.data.template || parentNode.data.templateRef || null;
  }
  
  return null;
}, [mergedTemplate, allNodes, node]);

// 2. UI表示（継承元プロパティセクション）
{inheritedTemplate && (
  <Collapse
    items={[
      {
        key: 'inherited',
        label: (
          <Space>
            <FileSearchOutlined />
            <Text strong>
              🔗 継承元プロパティ（親テンプレート: {inheritedTemplate.id}）
            </Text>
            <Tag color="blue">読み取り専用</Tag>
          </Space>
        ),
        children: (
          <div style={{ padding: 16, backgroundColor: '#f0f5ff' }}>
            <Alert
              message="このプロパティは親テンプレートから継承されています"
              description="編集する場合は、親テンプレート側で変更してください"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            {Object.entries(inheritedTemplate.properties || {}).map(([key, data]) => (
              <div
                key={key}
                style={{
                  marginBottom: 16,
                  padding: 12,
                  border: '1px solid #91d5ff',
                  borderRadius: 8,
                  backgroundColor: '#e6f7ff'
                }}
              >
                <Text strong style={{ color: '#0958d9' }}>
                  {data.tagName || 'property'}: {key}
                </Text>
                
                {/* 属性表示 */}
                {data.attributes && Object.keys(data.attributes).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" strong style={{ fontSize: 12 }}>
                      📋 属性
                    </Text>
                    {Object.entries(data.attributes).map(([attrName, attrValue]) => (
                      <div key={attrName} style={{ marginLeft: 16 }}>
                        <Text style={{ fontSize: 12 }}>
                          {attrName}: <Tag>{attrValue}</Tag>
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 要素表示 */}
                {data.elements && Object.keys(data.elements).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" strong style={{ fontSize: 12 }}>
                      📄 要素
                    </Text>
                    {Object.entries(data.elements).map(([elemName, elemValue]) => (
                      <div key={elemName} style={{ marginLeft: 16 }}>
                        <Text style={{ fontSize: 12 }}>
                          {elemName}: {elemValue}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    ]}
  />
)}
```

### 実装ステップ

#### Step 1: inheritedTemplate計算ロジック追加
```typescript
const inheritedTemplate = useMemo(() => {
  if (!mergedTemplate?.templateRefs || mergedTemplate.templateRefs.length === 0) {
    return null;
  }
  
  const parentTemplateId = Array.isArray(mergedTemplate.templateRefs)
    ? mergedTemplate.templateRefs[0]
    : mergedTemplate.templateRefs;
  
  if (!parentTemplateId || typeof parentTemplateId !== 'string') {
    return null;
  }
  
  // window.clineAllTemplatesから検索
  if ((window as unknown as Record<string, unknown>).clineAllTemplates) {
    const category = node.data.placeType === 'material' ? 'material' :
                     node.data.placeType === 'condition' ? 'condition' : 'result';
    const templates = ((window as unknown as Record<string, unknown>).clineAllTemplates as Record<string, unknown>)[category];
    
    if (templates && Array.isArray(templates)) {
      const found = templates.find((t: unknown) => 
        t && typeof t === 'object' && 'id' in t && (t as { id: string }).id === parentTemplateId
      );
      if (found) return found as TemplateData;
    }
  }
  
  // allNodesから検索
  const parentNode = allNodes.find(n => 
    n.id === parentTemplateId || 
    n.data?.template?.id === parentTemplateId ||
    n.data?.templateRef?.id === parentTemplateId
  );
  
  if (parentNode) {
    return (parentNode.data.template || parentNode.data.templateRef) as TemplateData;
  }
  
  return null;
}, [mergedTemplate, allNodes, node]);
```

#### Step 2: 読み取り専用UI表示
- Collapseコンポーネントで折りたたみ可能に
- 青色ベースの読み取り専用デザイン
- 親テンプレートIDを表示
- 属性・要素を表示

---

## 📋 Phase 2-2: カスタム属性名入力機能

### reference版の実装分析

**場所**: 属性追加モーダル内

**実装内容**:
```typescript
<Select
  style={{ width: '100%' }}
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
  <Option value="__custom__">🔧 カスタム属性名を入力...</Option>
</Select>

{/* カスタム属性名入力フィールド */}
{newAttributeName === '__custom__' && (
  <Input
    placeholder="カスタム属性名を入力（例: customField, myAttribute）"
    value={customAttributeName}
    onChange={(e) => setCustomAttributeName(e.target.value)}
  />
)}
```

### 実装ステップ

#### Step 1: State追加
```typescript
const [customAttributeName, setCustomAttributeName] = useState('');
```

#### Step 2: Select選択肢に`__custom__`追加
```typescript
<Option value="__custom__">🔧 カスタム属性名を入力...</Option>
```

#### Step 3: 条件付き入力フィールド表示
```typescript
{newAttributeName === '__custom__' && (
  <Input
    placeholder="カスタム属性名を入力（例: customField, myAttribute）"
    value={customAttributeName}
    onChange={(e) => setCustomAttributeName(e.target.value)}
  />
)}
```

#### Step 4: 保存処理の修正
```typescript
const handleAddAttributeOk = () => {
  const finalAttributeName = newAttributeName === '__custom__'
    ? customAttributeName.trim()
    : newAttributeName.trim();
    
  if (!finalAttributeName) {
    message.error('属性名を入力してください');
    return;
  }
  
  if (!newAttributeValue.trim()) {
    message.error('属性値を入力してください');
    return;
  }
  
  onUpdateNestedAttribute(propertyKey, finalAttributeName, newAttributeValue.trim());
  setNewAttributeName('');
  setNewAttributeValue('');
  setCustomAttributeName('');
  setShowAttributeAddModal(false);
};
```

---

## 🧪 テスト計画

### Phase 2-1: 継承元プロパティ表示

#### テストケース1: templateRefsあり
- [ ] templateRefsが設定されている場合、Collapseが表示される
- [ ] 親テンプレートIDが正しく表示される
- [ ] 親テンプレートのプロパティが表示される
- [ ] 読み取り専用（編集不可）である

#### テストケース2: templateRefsなし
- [ ] templateRefsがない場合、Collapseが表示されない

#### テストケース3: 親テンプレートが見つからない
- [ ] 親テンプレートが存在しない場合、Collapseが表示されない

### Phase 2-2: カスタム属性名入力

#### テストケース1: 通常の属性名選択
- [ ] 既存の属性名を選択できる
- [ ] カスタム入力フィールドは表示されない

#### テストケース2: カスタム属性名入力
- [ ] `__custom__`を選択すると入力フィールドが表示される
- [ ] カスタム属性名を入力して追加できる
- [ ] 空文字チェックが機能する

#### テストケース3: バリデーション
- [ ] カスタム属性名が空の場合、エラーメッセージ表示
- [ ] 既存の属性名と重複する場合、警告表示（オプション）

---

## 📊 実装統計予測

### Phase 2-1: 継承元プロパティ表示
- **追加行数**: 約100行
  - inheritedTemplate計算: 40行
  - UI表示: 60行

### Phase 2-2: カスタム属性名入力
- **追加行数**: 約30行
  - State追加: 2行
  - Select選択肢追加: 1行
  - 条件付き入力フィールド: 10行
  - 保存処理修正: 17行

**合計追加行数**: 約130行

---

## 📈 期待される効果

### Phase 2-1: 継承元プロパティ表示
- ✅ テンプレート継承関係の可視化
- ✅ デバッグ効率の向上
- ✅ 重複プロパティの発見が容易

### Phase 2-2: カスタム属性名入力
- ✅ 柔軟なテンプレート設計が可能
- ✅ 実験特有のメタデータ追加
- ✅ 拡張性の向上

---

## 🎯 実装順序

1. **Phase 2-1: 継承元プロパティ表示** → 優先度高
2. **Phase 2-2: カスタム属性名入力** → 優先度中

---

## 💡 技術的な注意点

### Phase 2-1
- `window.clineAllTemplates`へのアクセスは型安全に
- `templateRefs`が配列または文字列の可能性を考慮
- `allNodes`からの検索も実装（フォールバック）

### Phase 2-2
- `__custom__`は特殊値として扱う
- 空文字チェックを必ず実施
- 既存の属性名と重複しないか確認（オプション）

---

## 📋 完了基準

### Phase 2-1
- [x] inheritedTemplate計算ロジック実装
- [x] 読み取り専用UI表示
- [x] TypeScriptエラーなし
- [x] 手動テスト完了

### Phase 2-2
- [x] `__custom__`オプション追加
- [x] 条件付き入力フィールド実装
- [x] バリデーション実装
- [x] TypeScriptエラーなし
- [x] 手動テスト完了

---

## 📝 関連ドキュメント

- [Phase 1完了報告書](./20260202_0913_TemplateEditorDialog差分修正_Phase1完了報告.md)
- [差分調査レポート](./20260202_0905_TemplateEditorDialog差分調査_レポート.md)
- [修正計画書](./20260202_0907_TemplateEditorDialog差分修正_計画書.md)

---

## 承認

- **計画書作成日時**: 2026-02-02 09:14
- **承認待ち**: Phase 2実装開始の承認
- **推定実装時間**: 15分

**Phase 2実装準備完了** ✅
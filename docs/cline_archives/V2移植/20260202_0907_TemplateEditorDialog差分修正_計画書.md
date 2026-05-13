# TemplateEditorDialog差分修正 計画書

## メタデータ
- **作成日時**: 2026-02-02 09:07
- **タスクID**: TemplateEditorDialog差分修正
- **優先度**: 高
- **推定工数**: 4-6時間

---

## 1. タスク概要

現在のTemplateEditorDialog.tsx（editorv2版）にreference版の欠落機能を追加し、完全版に更新します。

**主な欠落項目:**
1. 🔴 Place References編集機能（完全欠落）
2. 🔴 テンプレートID重複チェック（不完全）
3. 🟡 継承元プロパティ参照表示（完全欠落）
4. 🟡 カスタム属性名入力機能（制限的）

---

## 2. 目的と期待される成果

### 目的
reference版の全機能をeditorv2版に統合し、機能的に同等以上のコンポーネントを実現する

### 期待される成果
- [x] Place References編集機能の完全実装
- [x] テンプレートID重複チェックの強化
- [x] 継承元プロパティの参照表示
- [x] カスタム属性名の入力対応
- [x] TypeScript化完了（reference版はJSX）
- [x] Ant Design v6対応（reference版はMaterial-UI）

---

## 3. 実装ステップ

### Phase 1: 緊急対応（重要度：高）

#### Step 1-1: Place References編集機能の完全実装

**対象ファイル:**
- `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`

**実装内容:**

1. **State追加**（既存のplaceRefsを活用）
```typescript
// 既存
const [placeRefs, setPlaceRefs] = useState<string[]>([]);

// 追加
const [showPlaceRefAddDialog, setShowPlaceRefAddDialog] = useState(false);
```

2. **UI表示セクション追加**（基本情報編集セクション内）
```typescript
{/* Place References編集セクション */}
<Divider style={{ margin: '16px 0' }} />
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
  <Typography.Title level={5}>
    🔗 Place References
  </Typography.Title>
  <Button
    type="primary"
    icon={<PlusOutlined />}
    onClick={() => setShowPlaceRefAddDialog(true)}
  >
    追加
  </Button>
</div>

{placeRefs.length === 0 ? (
  <Alert
    message="Place Referenceが登録されていません"
    description="「追加」ボタンから登録してください"
    type="info"
    showIcon
  />
) : (
  <Space direction="vertical" style={{ width: '100%' }}>
    {placeRefs.map((placeRef, index) => (
      <Card
        key={index}
        size="small"
        style={{ 
          backgroundColor: '#f0f8ff',
          border: '1px solid #90caf9'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Text strong>Place Ref #{index + 1}</Typography.Text>
            <br />
            <Typography.Text type="secondary">Ref: {placeRef}</Typography.Text>
          </div>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              const updated = placeRefs.filter((_, i) => i !== index);
              setPlaceRefs(updated);
              message.success('Place Referenceを削除しました');
            }}
          />
        </div>
      </Card>
    ))}
  </Space>
)}
```

3. **追加ダイアログ実装**
```typescript
{/* Place Reference追加ダイアログ */}
<Modal
  title="🔗 Place Reference追加"
  open={showPlaceRefAddDialog}
  onCancel={() => setShowPlaceRefAddDialog(false)}
  footer={[
    <Button key="close" onClick={() => setShowPlaceRefAddDialog(false)}>
      閉じる
    </Button>
  ]}
  width={600}
>
  <Alert
    message="既存のPlace（現在未登録）から選択してください"
    type="info"
    showIcon
    style={{ marginBottom: 16 }}
  />
  
  <Space direction="vertical" style={{ width: '100%', maxHeight: 400, overflowY: 'auto' }}>
    {allNodes
      .filter(n => n.data?.nodeType === 'place')
      .filter(n => !placeRefs.includes(n.id))
      .map(place => (
        <Button
          key={place.id}
          block
          style={{ 
            textAlign: 'left',
            height: 'auto',
            padding: '12px'
          }}
          onClick={() => {
            setPlaceRefs([...placeRefs, place.id]);
            setShowPlaceRefAddDialog(false);
            message.success('Place Referenceを追加しました');
          }}
        >
          <div>
            <Typography.Text strong>{place.id}</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              {place.data?.name || '(名前なし)'} | {place.data?.placeType}
            </Typography.Text>
          </div>
        </Button>
      ))}
    
    {allNodes
      .filter(n => n.data?.nodeType === 'place')
      .filter(n => !placeRefs.includes(n.id))
      .length === 0 && (
      <Alert
        message="追加可能なPlaceがありません"
        description="すべてのPlaceが既に登録されているか、Placeが存在しません"
        type="warning"
        showIcon
      />
    )}
  </Space>
</Modal>
```

4. **保存処理への統合**（handleSave内）
```typescript
const handleSave = () => {
  // ... 既存のバリデーション ...
  
  const templateRef = {
    ...(node.data.templateRef || {}),
    id: templateId,
    type: templateType,
    uuid: uuid,
    name: name,
    description: description,
    properties: properties,
    placeRefs: placeRefs,  // ✅ placeRefsを追加
  };
  
  // ... 以降の処理 ...
};
```

---

#### Step 1-2: テンプレートID重複チェックの強化

**実装内容:**

```typescript
const handleSave = () => {
  // ✅ 基本チェック
  if (!templateId.trim()) {
    message.error('テンプレートIDを入力してください');
    return;
  }
  
  // ✅ ノードIDとの重複チェック
  const nodeIds = allNodes.map(n => n.id);
  if (nodeIds.includes(templateId) && templateId !== node.id) {
    message.error(
      `テンプレートID "${templateId}" は既にノードIDとして使用されています。別のIDを指定してください。`
    );
    return;
  }
  
  // ✅ 他のテンプレートIDとの重複チェック
  // window.clineAllTemplatesがグローバルに存在する場合のみチェック
  if ((window as any).clineAllTemplates) {
    const allTemplateIds: string[] = [];
    ['material', 'condition', 'result'].forEach(category => {
      const templates = (window as any).clineAllTemplates[category];
      if (templates) {
        templates.forEach((t: any) => {
          // 自分自身のテンプレートは除外
          const currentTemplateId = node.data.template?.id || node.data.templateRef?.id;
          if (t.id && t.id !== currentTemplateId) {
            allTemplateIds.push(t.id);
          }
        });
      }
    });
    
    if (allTemplateIds.includes(templateId)) {
      message.error(
        `テンプレートID "${templateId}" は既に他のテンプレートで使用されています。別のIDを指定してください。`
      );
      return;
    }
  }
  
  // ... 以降の保存処理 ...
};
```

---

### Phase 2: 機能向上（重要度：中）

#### Step 2-1: 継承元プロパティ参照表示

**実装内容:**

1. **inheritedTemplate計算ロジック追加**
```typescript
// mergedTemplateの下に追加
const inheritedTemplate = useMemo(() => {
  if (!node?.data?.templateRef?.href || !allNodes) return null;
  
  const templateRefHref = node.data.templateRef.href;
  const templateRefId = templateRefHref.startsWith('#') 
    ? templateRefHref.substring(1) 
    : templateRefHref;
  
  const currentNodeId = node.id;
  
  const inheritedNode = allNodes.find(n => {
    if (n.id === currentNodeId) return false;
    
    const nodeTemplateId = n.data?.template?.templateId || 
                          n.data?.template?.id || 
                          n.data?.id;
    const nodeId = n.id;
    
    return nodeTemplateId === templateRefId || nodeId === templateRefId;
  });
  
  if (!inheritedNode?.data?.template) {
    return null;
  }
  
  const baseTemplate = inheritedNode.data.template;
  
  // XML要素からの子要素抽出は省略（複雑なため）
  // 基本的なpropertiesNestedのみ表示
  return baseTemplate;
}, [node?.data?.templateRef?.href, node?.id, allNodes]);
```

2. **UI表示追加**（Properties編集セクションの後）
```typescript
{/* 継承元プロパティ参照表示 */}
{inheritedTemplate && inheritedTemplate.propertiesNested && 
 Object.keys(inheritedTemplate.propertiesNested).length > 0 && (
  <>
    <Divider style={{ margin: '24px 0' }} />
    <Card
      style={{
        backgroundColor: '#f0f8ff',
        border: '2px solid #1976d2',
        marginBottom: 16
      }}
    >
      <Typography.Title level={5} style={{ color: '#1976d2' }}>
        📖 継承元プロパティ（参照専用）
      </Typography.Title>
      <Alert
        message={`継承元テンプレート「${node.data.templateRefId}」からのプロパティです。これらは編集できません。`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Space direction="vertical" style={{ width: '100%' }}>
        {Object.entries(inheritedTemplate.propertiesNested).map(([propKey, prop]: [string, any]) => (
          <Card
            key={propKey}
            size="small"
            style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              opacity: 0.8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Typography.Text strong style={{ color: '#1976d2' }}>
                {prop.key || prop.name || propKey}
              </Typography.Text>
              <Tag color="blue">
                {prop.type || prop.xsiType || prop.attributes?.['xsi:type'] || 'stringType'}
              </Tag>
            </div>
            
            {/* 属性表示 */}
            {prop.attributes && Object.keys(prop.attributes).length > 0 && (
              <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #e0e0e0' }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  📋 属性:
                </Typography.Text>
                {Object.entries(prop.attributes).map(([attrName, attrValue]: [string, any]) => (
                  <div key={attrName} style={{ paddingLeft: 8 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      • {attrName}: {String(attrValue)}
                    </Typography.Text>
                  </div>
                ))}
              </div>
            )}
            
            {/* 要素表示 */}
            {prop.elements && Object.keys(prop.elements).length > 0 && (
              <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #e0e0e0' }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  📄 要素:
                </Typography.Text>
                {Object.entries(prop.elements).map(([elemName, elemValue]: [string, any]) => (
                  <div key={elemName} style={{ paddingLeft: 8 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      • {elemName}: {String(elemValue)}
                    </Typography.Text>
                  </div>
                ))}
              </div>
            )}
            
            {/* 子要素数表示 */}
            {prop.children && prop.children.length > 0 && (
              <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #e0e0e0' }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  🌿 子要素: {prop.children.length}件
                </Typography.Text>
              </div>
            )}
          </Card>
        ))}
      </Space>
    </Card>
  </>
)}
```

---

#### Step 2-2: カスタム属性名入力機能

**実装内容:**

属性追加モーダル内に条件付きフィールドを追加：

```typescript
{/* 属性追加モーダル内 */}
<Select
  style={{ width: '100%', marginBottom: 16 }}
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
  <Option value="__custom__">その他（直接入力）</Option>
</Select>

{/* カスタム属性名入力フィールド（条件付き表示） */}
{newAttributeName === '__custom__' && (
  <Input
    style={{ width: '100%', marginBottom: 16 }}
    placeholder="カスタム属性名を入力（例: customAttribute）"
    onChange={(e) => {
      // __custom__選択時は、入力値を直接newAttributeNameに設定
      if (e.target.value.trim()) {
        setNewAttributeName(e.target.value.trim());
      }
    }}
  />
)}
```

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
   - Place References UI追加（約150行追加）
   - テンプレートID重複チェック強化（約30行追加）
   - 継承元プロパティ表示追加（約100行追加）
   - カスタム属性名入力追加（約20行追加）

### 新規作成するファイル
なし（既存ファイルへの追加のみ）

### 影響を受ける機能
- テンプレート編集機能全般
- テンプレート保存処理
- PetriNetエディタ全体の整合性

---

## 5. 技術的詳細

### Place References実装の注意点

1. **データ構造の正規化**
```typescript
// オブジェクト形式 → 文字列配列に変換
const normalizedPlaceRefs = loadedPlaceRefs.map(ref => 
  typeof ref === 'string' ? ref : (ref.ref || ref.id || '')
).filter(ref => ref);
```

2. **フィルタリング条件**
- `nodeType === 'place'` のノードのみ
- 既に`placeRefs`に含まれているものは除外

3. **TypeScript型定義**
```typescript
interface TemplateEditorDialogProps {
  // ... 既存のprops ...
  allNodes: Node[];  // Place検索に必要
}
```

### 継承元プロパティ表示の注意点

1. **循環参照の回避**
- 自分自身（currentNodeId）は継承元から除外

2. **useMemoの依存配列**
```typescript
[node?.data?.templateRef?.href, node?.id, allNodes]
```

3. **null安全性**
- 各段階でnullチェック実施
- inheritedTemplateがnullの場合はUI非表示

---

## 6. リスクと対策

### リスク1: State更新の不整合
**影響度**: 中
**発生確率**: 低
**対策**: 
- 関数型setStateを使用（`setPlaceRefs(prev => [...])`）
- useEffectの依存配列を正しく設定

### リスク2: allNodesが大量の場合のパフォーマンス
**影響度**: 低
**発生確率**: 低
**対策**:
- useMemoでフィルタリング結果をキャッシュ
- ダイアログ内のリストに仮想スクロール検討（将来）

### リスク3: 継承元テンプレートが見つからない
**影響度**: 低
**発生確率**: 中
**対策**:
- nullチェックで安全に処理
- 見つからない場合は非表示（エラーにしない）

---

## 7. テスト計画

### 単体テスト
- [ ] Place References追加機能
- [ ] Place References削除機能
- [ ] テンプレートID重複チェック
- [ ] 継承元プロパティ表示
- [ ] カスタム属性名入力

### 統合テスト
- [ ] テンプレート保存後のplaceRefs確認
- [ ] 継承元テンプレート変更時の表示更新
- [ ] テンプレートID重複時のエラー表示

### 手動テスト
- [ ] MaterialTemplateでの動作確認
- [ ] ConditionTemplateでの動作確認
- [ ] ResultTemplateでの動作確認
- [ ] 複数Place追加・削除の操作性確認
- [ ] 継承元テンプレートがない場合の動作確認

---

## 8. ロールバック計画

問題が発生した場合：
1. 該当機能のUI部分をコメントアウト
2. Stateの初期化処理のみ残す
3. 保存処理からplaceRefsを除外（既存動作に戻す）

---

## 9. 関連ドキュメント

- [差分調査レポート](./20260202_0905_TemplateEditorDialog差分調査_レポート.md)
- [ファイル対応表](./ファイル対応表.md)
- [Phase4実装計画書](./20260202_0856_Phase4_TemplateEditorDialog実装_計画書.md)

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-02 09:07
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

---

## 11. 実施記録

### 実施日時
- 開始: （作業開始時記入）
- 完了: （作業完了時記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中の問題と解決策を記録）

### 最終的な成果物
- [ ] Place References編集機能実装完了
- [ ] テンプレートID重複チェック強化完了
- [ ] 継承元プロパティ参照表示完了
- [ ] カスタム属性名入力機能完了

---

## 12. 振り返り

### うまくいった点
（完了後記入）

### 改善が必要な点
（完了後記入）

### 学んだこと
（完了後記入）
# Phase 3: DocumentEditDialog完全版実装 - 計画書

**作成日時**: 2026-02-02 08:53  
**タスクID**: PetriNetEditorV2_Complete_Implementation_Phase3  
**優先度**: 高  
**推定工数**: 2時間

---

## 📋 実施内容サマリー

Phase 3として、DocumentEditDialog.tsxにMultiObjectEditorを統合し、Creator/Vendor/Owner/Instrument編集機能を完全実装します。

### 実装対象ファイル

1. **`frontend/src/components/editorv2/components/DocumentEditDialog.tsx`**
   - MultiObjectEditorの統合
   - 状態管理の拡張
   - イベントハンドラの実装
   - TODOアラートの削除

---

## 1. 現状分析

### 現在のDocumentEditDialog.tsx

**実装済み機能:**
- ✅ 基本プロパティ編集（ID, UUID, Name, Description, Date）
- ✅ MaiML ID属性編集（protocolId, methodId, pnmlId, programId）
- ✅ XML署名設定
- ✅ バリデーション機能
- ✅ UUID一括生成
- ✅ 現在時刻設定

**未実装機能:**
- ❌ Creator編集（MultiObjectEditor）
- ❌ Vendor編集（MultiObjectEditor）
- ❌ Owner編集（MultiObjectEditor）
- ❌ Instrument編集（MultiObjectEditor）
- ❌ TODOアラート（削除予定）

### Reference版との差分

| 機能 | Reference版 | 現在のTypeScript版 | 状態 |
|------|-----------|------------------|------|
| 基本プロパティ編集 | ✅ | ✅ | 完了 |
| MultiObjectEditor統合 | ✅ | ❌ | **Phase 3で実装** |
| Creator編集 | ✅ | ❌ | **Phase 3で実装** |
| Vendor編集 | ✅ | ❌ | **Phase 3で実装** |
| Owner編集 | ✅ | ❌ | **Phase 3で実装** |
| Instrument編集 | ✅ | ❌ | **Phase 3で実装** |

---

## 2. 実装計画

### Phase 3.1: MultiObjectEditorインポート

**作業内容:**
```typescript
import MultiObjectEditor from './MultiObjectEditor';
```

### Phase 3.2: 状態管理の拡張

**expandedSections状態の拡張:**

**Before:**
```typescript
const [activeKeys, setActiveKeys] = useState<string[]>(['basic']);
```

**After:**
```typescript
const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
  basic: true,
  maimlIds: false,
  signature: false,
  creators: false,
  vendors: false,
  owners: false,
  instruments: false,
});
```

### Phase 3.3: イベントハンドラの実装

**1. handleToggleSection - セクション展開切り替え:**
```typescript
const handleToggleSection = useCallback((sectionKey: string) => {
  setExpandedSections(prev => ({
    ...prev,
    [sectionKey]: !prev[sectionKey]
  }));
}, []);
```

**2. handleMultiObjectDataChange - MultiObjectEditor用データ変更:**
```typescript
const handleMultiObjectDataChange = useCallback((objectKey: string, objectsArray: ComplexObject[]) => {
  form.setFieldValue(objectKey, objectsArray);
  setHasChanges(true);
  
  // バリデーション
  if (validationTimeoutRef.current) {
    clearTimeout(validationTimeoutRef.current);
  }
  validationTimeoutRef.current = setTimeout(() => {
    const values = form.getFieldsValue();
    const errors = validateDocumentData(values as DocumentData);
    setValidationErrors(errors);
  }, 500);
}, [form, validateDocumentData]);
```

**3. vendorIds/instrumentIds算出:**
```typescript
const vendorIds = useMemo(() => {
  const vendors = form.getFieldValue('vendors') || [];
  return vendors.map((v: Vendor) => v.id).filter(Boolean);
}, [form.getFieldValue('vendors')]);

const instrumentIds = useMemo(() => {
  const instruments = form.getFieldValue('instruments') || [];
  return instruments.map((i: Instrument) => i.id).filter(Boolean);
}, [form.getFieldValue('instruments')]);
```

### Phase 3.4: MultiObjectEditorコンポーネントの追加

**配置場所:**
- 基本プロパティセクション
- MaiML ID属性セクション
- XML署名セクション
- **👉 Creator編集（新規追加）**
- **👉 Vendor編集（新規追加）**
- **👉 Owner編集（新規追加）**
- **👉 Instrument編集（新規追加）**
- ヒント表示

**実装コード:**

```typescript
{/* Creator編集 */}
<Box sx={{ mt: 2 }}>
  <MultiObjectEditor
    objectKey="creators"
    title="Creator"
    icon="👤"
    includeReferences={true}
    initialData={form.getFieldValue('creators') || []}
    onDataChange={handleMultiObjectDataChange}
    minItems={1}
    isExpanded={expandedSections.creators}
    onToggleExpanded={handleToggleSection}
    vendorIds={vendorIds}
    instrumentIds={instrumentIds}
  />
</Box>

{/* Vendor編集 */}
<Box sx={{ mt: 2 }}>
  <MultiObjectEditor
    objectKey="vendors"
    title="Vendor"
    icon="🏢"
    includeReferences={false}
    initialData={form.getFieldValue('vendors') || []}
    onDataChange={handleMultiObjectDataChange}
    minItems={1}
    isExpanded={expandedSections.vendors}
    onToggleExpanded={handleToggleSection}
  />
</Box>

{/* Owner編集 */}
<Box sx={{ mt: 2 }}>
  <MultiObjectEditor
    objectKey="owners"
    title="Owner"
    icon="👥"
    includeReferences={false}
    initialData={form.getFieldValue('owners') || []}
    onDataChange={handleMultiObjectDataChange}
    minItems={1}
    isExpanded={expandedSections.owners}
    onToggleExpanded={handleToggleSection}
  />
</Box>

{/* Instrument編集 */}
<Box sx={{ mt: 2 }}>
  <MultiObjectEditor
    objectKey="instruments"
    title="Instrument"
    icon="🔬"
    includeReferences={false}
    initialData={form.getFieldValue('instruments') || []}
    onDataChange={handleMultiObjectDataChange}
    minItems={0}
    isExpanded={expandedSections.instruments}
    onToggleExpanded={handleToggleSection}
  />
</Box>
```

### Phase 3.5: TODOアラートの削除

**削除対象:**
```typescript
{/* Phase TODO通知 */}
<Alert
  message="🚧 Phase TODO"
  description="MultiObjectEditor（Creator/Vendor/Owner/Instrument編集）は次Phaseで実装します"
  type="warning"
/>
```

### Phase 3.6: ヒント表示の更新

**Before:**
```typescript
<Alert
  message="💡 ヒント"
  description={
    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
      <li>UUIDジェネレーターボタンで一意の識別子を生成できます</li>
      <li>Creator、Vendor、Ownerの編集は次Phaseで実装予定です</li>
      <li>XML署名を有効にすると、MaiML保存時に自動的に署名が追加されます</li>
    </ul>
  }
  type="info"
/>
```

**After:**
```typescript
<Alert
  message="💡 ヒント"
  description={
    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
      <li>UUIDジェネレーターボタンで一意の識別子を一括生成できます</li>
      <li>Creator、Vendor、Ownerは最低1件必要です</li>
      <li>Instrumentは任意（0件可）です</li>
      <li>各要素は追加/削除/並び替えが可能です</li>
      <li>XML署名を有効にすると、MaiML保存時に自動的に署名が追加されます</li>
    </ul>
  }
  type="info"
/>
```

### Phase 3.7: バリデーションの強化

**validateDocumentData関数の強化:**

```typescript
const validateDocumentData = useMemo(() => (data: DocumentData): string[] => {
  const errors: string[] = [];
  
  // 既存のバリデーション
  if (!data.name?.trim()) {
    errors.push('❌ Document name is required');
  }
  
  if (!data.id?.trim()) {
    errors.push('❌ Document ID is required');
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (data.uuid && !uuidRegex.test(data.uuid)) {
    errors.push('❌ Invalid UUID format');
  }
  
  if (data.date && isNaN(Date.parse(data.date))) {
    errors.push('❌ Invalid date format');
  }
  
  // 👉 必須要素チェック（追加）
  if (!data.creators || data.creators.length === 0) {
    errors.push('❌ At least one Creator is required');
  }
  if (!data.vendors || data.vendors.length === 0) {
    errors.push('❌ At least one Vendor is required');
  }
  if (!data.owners || data.owners.length === 0) {
    errors.push('❌ At least one Owner is required');
  }
  
  // 👉 ID重複チェック（追加）
  const ids = [data.id];
  if (data.creators) data.creators.forEach(c => c.id && ids.push(c.id));
  if (data.vendors) data.vendors.forEach(v => v.id && ids.push(v.id));
  if (data.owners) data.owners.forEach(o => o.id && ids.push(o.id));
  if (data.instruments) data.instruments.forEach(i => i.id && ids.push(i.id));
  
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`❌ Duplicate IDs found: ${duplicateIds.join(', ')}`);
  }
  
  return errors;
}, []);
```

---

## 3. 実装の優先順位

### High Priority（必須）

1. ✅ **MultiObjectEditorインポート**
2. ✅ **状態管理の拡張（expandedSections）**
3. ✅ **handleToggleSection実装**
4. ✅ **handleMultiObjectDataChange実装**
5. ✅ **4つのMultiObjectEditorコンポーネント追加**
6. ✅ **TODOアラート削除**

### Medium Priority（重要）

7. ✅ **バリデーション強化**
8. ✅ **ヒント表示更新**
9. ✅ **vendorIds/instrumentIds算出**

### Low Priority（オプション）

10. ⚠️ **スタイル微調整**
11. ⚠️ **アクセシビリティ対応**

---

## 4. Reference版との機能比較

### Reference版の実装パターン

**1. MultiObjectEditorの使用:**
```jsx
<MultiObjectEditor
  objectKey="creators"
  title="Creator"
  icon="👤"
  includeReferences={true}
  initialData={editingDocument.creators || []}
  onDataChange={handleMultiObjectDataChange}
  minItems={1}
  isExpanded={expandedSections.creators}
  onToggleExpanded={handleToggleSection}
  vendorIds={(editingDocument.vendors || []).map(v => v.id).filter(Boolean)}
  instrumentIds={(editingDocument.instruments || []).map(i => i.id).filter(Boolean)}
/>
```

**2. データ変更ハンドラ:**
```jsx
const handleMultiObjectDataChange = useCallback((objectKey, objectsArray) => {
  setEditingDocument(prev => ({
    ...prev,
    [objectKey]: objectsArray
  }));
  setHasChanges(true);
}, []);
```

**3. セクション展開管理:**
```jsx
const [expandedSections, setExpandedSections] = useState({
  basic: true,
  maimlIds: false,
  signature: false,
  creators: false,
  vendors: false,
  owners: false,
  instruments: false
});
```

### TypeScript版への変換

**型定義の追加:**
```typescript
interface ExpandedSections {
  basic: boolean;
  maimlIds: boolean;
  signature: boolean;
  creators: boolean;
  vendors: boolean;
  owners: boolean;
  instruments: boolean;
}

const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
  basic: true,
  maimlIds: false,
  signature: false,
  creators: false,
  vendors: false,
  owners: false,
  instruments: false,
});
```

---

## 5. 実装手順（ステップバイステップ）

### Step 1: MultiObjectEditorインポート（5分）
- [x] import文追加

### Step 2: 状態管理の拡張（10分）
- [ ] expandedSections状態の定義
- [ ] 初期値設定
- [ ] 型定義の追加

### Step 3: イベントハンドラの実装（20分）
- [ ] handleToggleSection実装
- [ ] handleMultiObjectDataChange実装
- [ ] vendorIds/instrumentIds算出

### Step 4: MultiObjectEditorコンポーネント追加（30分）
- [ ] Creator編集
- [ ] Vendor編集
- [ ] Owner編集
- [ ] Instrument編集

### Step 5: バリデーション強化（20分）
- [ ] 必須要素チェック追加
- [ ] ID重複チェック追加

### Step 6: UIクリーンアップ（15分）
- [ ] TODOアラート削除
- [ ] ヒント表示更新

### Step 7: テスト・調整（20分）
- [ ] 動作確認
- [ ] ESLint/TypeScriptエラー修正
- [ ] スタイル調整

**合計推定時間: 2時間**

---

## 6. 期待される成果

### 完成後の機能

1. ✅ Creator編集（複数登録、追加/削除/並び替え）
2. ✅ Vendor編集（複数登録、追加/削除/並び替え）
3. ✅ Owner編集（複数登録、追加/削除/並び替え）
4. ✅ Instrument編集（複数登録、追加/削除/並び替え）
5. ✅ vendorRef/instrumentRef管理（Creator用）
6. ✅ UUID一括生成
7. ✅ バリデーション（必須要素、ID重複チェック）
8. ✅ TODOアラート削除

### Reference版との互換性

| 機能 | Reference版 | TypeScript版 | 互換性 |
|------|-----------|-------------|--------|
| MultiObjectEditor統合 | ✅ | ✅ | 100% |
| Creator編集 | ✅ | ✅ | 100% |
| Vendor編集 | ✅ | ✅ | 100% |
| Owner編集 | ✅ | ✅ | 100% |
| Instrument編集 | ✅ | ✅ | 100% |
| バリデーション | ✅ | ✅ | 100% |

---

## 7. リスクと対策

### 想定されるリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MultiObjectEditorの型不一致 | 中 | 低 | 型定義を事前確認済み |
| フォーム状態管理の複雑化 | 中 | 中 | Reference版の実装パターンを踏襲 |
| バリデーションロジックの漏れ | 低 | 低 | Reference版と同じロジックを実装 |
| ESLintエラー発生 | 低 | 中 | Phase 2で対応パターン確立済み |

---

## 8. 完了基準

### Phase 3完了チェックリスト

- [ ] MultiObjectEditorインポート完了
- [ ] expandedSections状態拡張完了
- [ ] handleToggleSection実装完了
- [ ] handleMultiObjectDataChange実装完了
- [ ] Creator編集コンポーネント追加完了
- [ ] Vendor編集コンポーネント追加完了
- [ ] Owner編集コンポーネント追加完了
- [ ] Instrument編集コンポーネント追加完了
- [ ] バリデーション強化完了
- [ ] TODOアラート削除完了
- [ ] ヒント表示更新完了
- [ ] ESLint/TypeScriptエラー0件
- [ ] Phase 3完了報告書作成

---

## 9. 次のアクション

### Phase 3完了後

- Phase 4: TemplateEditorDialog完全版実装
- Phase 5: PetriNetEditorInner統合
- Phase 6: PetriNetEditor最終調整
- Phase 7: 最終検証・ドキュメント完成

---

**Phase 3開始準備完了！ユーザー承認後、実装を開始します。**
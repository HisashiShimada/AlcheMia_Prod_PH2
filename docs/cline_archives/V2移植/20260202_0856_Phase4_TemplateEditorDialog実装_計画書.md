# Phase 4: TemplateEditorDialog完全版実装 - 計画書

**作成日時**: 2026-02-02 08:56  
**タスクID**: PetriNetEditorV2_Complete_Implementation_Phase4  
**優先度**: 高  
**推定工数**: 10-15分

---

## 📋 タスク概要

Phase 4として、TemplateEditorDialog.tsxを完全実装します。Material/Condition/Result編集機能を追加し、Reference版と完全互換にします。

---

## 🎯 目的と期待される成果

### 目的

PetriNetEditorInner分割時に反映漏れが発生したTemplateEditorDialogの機能を、Reference版から正しく移植します。

### 期待される成果

- ✅ TemplateEditorDialog.tsx完全版実装
- ✅ Material/Condition/Result編集機能
- ✅ カスタムプロパティ編集機能
- ✅ Reference版との100%互換性
- ✅ TypeScriptエラー0件

---

## 📊 現状分析

### 現在のTemplateEditorDialog.tsx

**ファイル**: `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`

**現状**:
- 基本的なフレームワークのみ実装
- TODO通知が表示されている
- MultiObjectEditor統合が未実装

**不足している機能**:
1. ❌ Material編集機能
2. ❌ Condition編集機能
3. ❌ Result編集機能
4. ❌ カスタムプロパティ編集機能
5. ❌ バリデーション（必須要素チェック）

### Reference版の構造

**参照元**: `frontend/src/components/reference/PetriNetEditorV2.jsx`内のTemplateEditorDialog

**主要機能**:
1. ✅ Material編集（MultiObjectEditor使用）
2. ✅ Condition編集（MultiObjectEditor使用）
3. ✅ Result編集（MultiObjectEditor使用）
4. ✅ カスタムプロパティ編集
5. ✅ バリデーション（必須要素、ID重複チェック）

---

## 🔧 実装ステップ

### Step 1: Reference版コードの確認 ✅

**実施内容**:
- Reference版TemplateEditorDialogの構造を確認
- 必要な機能を洗い出し

### Step 2: MultiObjectEditorインポートと状態管理拡張

**実施内容**:
```typescript
// MultiObjectEditorインポート
import MultiObjectEditor, { type ComplexObject } from './MultiObjectEditor';

// expandedSections状態拡張
const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
  basic: true,
  materials: false,
  conditions: false,
  results: false,
  customProperties: false,
});
```

### Step 3: イベントハンドラの実装

**実施内容**:
```typescript
// セクション展開切り替え
const handleToggleSection = useCallback((sectionKey: string) => {
  setExpandedSections(prev => ({
    ...prev,
    [sectionKey]: !prev[sectionKey]
  }));
}, []);

// MultiObjectEditor用データ変更
const handleMultiObjectDataChange = useCallback((objectKey: string, objectsArray: ComplexObject[]) => {
  form.setFieldValue(objectKey, objectsArray);
  setHasChanges(true);
  
  // バリデーション
  if (validationTimeoutRef.current) {
    clearTimeout(validationTimeoutRef.current);
  }
  validationTimeoutRef.current = setTimeout(() => {
    const values = form.getFieldsValue();
    const errors = validateTemplateData(values as TemplateData);
    setValidationErrors(errors);
  }, 500);
}, [form, validateTemplateData]);

// カスタムプロパティ変更
const handleCustomPropertiesChange = useCallback((properties: CustomProperty[]) => {
  form.setFieldValue('customProperties', properties);
  setHasChanges(true);
}, [form]);
```

### Step 4: MultiObjectEditorコンポーネント追加

**実施内容**:
```typescript
{/* Material編集 */}
<MultiObjectEditor
  objectKey="materials"
  title="Material"
  icon="🧪"
  includeReferences={false}
  initialData={form.getFieldValue('materials') || []}
  onDataChange={handleMultiObjectDataChange}
  minItems={0}
  isExpanded={expandedSections.materials}
  onToggleExpanded={handleToggleSection}
/>

{/* Condition編集 */}
<MultiObjectEditor
  objectKey="conditions"
  title="Condition"
  icon="⚙️"
  includeReferences={false}
  initialData={form.getFieldValue('conditions') || []}
  onDataChange={handleMultiObjectDataChange}
  minItems={0}
  isExpanded={expandedSections.conditions}
  onToggleExpanded={handleToggleSection}
/>

{/* Result編集 */}
<MultiObjectEditor
  objectKey="results"
  title="Result"
  icon="📊"
  includeReferences={false}
  initialData={form.getFieldValue('results') || []}
  onDataChange={handleMultiObjectDataChange}
  minItems={0}
  isExpanded={expandedSections.results}
  onToggleExpanded={handleToggleSection}
/>
```

### Step 5: カスタムプロパティエディタの実装

**実施内容**:
```typescript
{/* カスタムプロパティ編集 */}
<Card
  title={
    <Space>
      <span>🔧 カスタムプロパティ</span>
      <Button
        size="small"
        icon={expandedSections.customProperties ? <UpOutlined /> : <DownOutlined />}
        onClick={() => handleToggleSection('customProperties')}
      />
    </Space>
  }
>
  {expandedSections.customProperties && (
    <CustomPropertyEditor
      properties={form.getFieldValue('customProperties') || []}
      onPropertiesChange={handleCustomPropertiesChange}
    />
  )}
</Card>
```

### Step 6: バリデーション強化

**実施内容**:
```typescript
const validateTemplateData = useMemo(() => (data: TemplateData): string[] => {
  const errors: string[] = [];
  
  // 基本プロパティチェック
  if (!data.id?.trim()) {
    errors.push('❌ Template ID is required');
  }
  
  if (!data.type) {
    errors.push('❌ Template type is required');
  }
  
  // ID重複チェック
  const ids: string[] = [data.id];
  if (data.materials) data.materials.forEach((m: Material) => m.id && ids.push(m.id));
  if (data.conditions) data.conditions.forEach((c: Condition) => c.id && ids.push(c.id));
  if (data.results) data.results.forEach((r: Result) => r.id && ids.push(r.id));
  
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`❌ Duplicate IDs found: ${duplicateIds.join(', ')}`);
  }
  
  return errors;
}, []);
```

### Step 7: UIクリーンアップ

**実施内容**:
- TODOアラート削除
- ヒント表示更新
- 新規作成モード通知追加

---

## 📁 変更するファイル

### 修正ファイル

1. **`frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`**
   - MultiObjectEditorインポート追加
   - expandedSections状態拡張
   - handleToggleSection実装
   - handleMultiObjectDataChange実装
   - handleCustomPropertiesChange実装
   - Material/Condition/Resultコンポーネント追加
   - カスタムプロパティエディタ統合
   - バリデーション強化
   - UIクリーンアップ

### 新規作成ファイル（必要に応じて）

2. **`frontend/src/components/editorv2/components/CustomPropertyEditor.tsx`**
   - カスタムプロパティ編集専用コンポーネント
   - key-value形式の編集機能
   - 追加/削除機能

---

## 🎯 Reference版との比較

### 実装パターン

| 項目 | Reference版 | 実装予定 |
|------|-----------|---------|
| Material編集 | MultiObjectEditor | MultiObjectEditor |
| Condition編集 | MultiObjectEditor | MultiObjectEditor |
| Result編集 | MultiObjectEditor | MultiObjectEditor |
| カスタムプロパティ | CustomPropertyEditor | CustomPropertyEditor |
| バリデーション | 必須要素+ID重複 | 必須要素+ID重複 |
| 状態管理 | useState | useState |
| イベントハンドラ | useCallback | useCallback |

### 互換性目標

- ✅ Reference版と100%同等の機能
- ✅ TypeScript型安全性
- ✅ Ant Design UI統一

---

## 📊 影響範囲

### 直接影響

- ✅ TemplateEditorDialog.tsx: 完全実装
- ✅ CustomPropertyEditor.tsx: 新規作成（必要に応じて）

### 間接影響

- ✅ MultiObjectEditor.tsx: 既存コンポーネント使用
- ✅ types/index.ts: 型定義（変更不要）

---

## ⚠️ リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| CustomPropertyEditor実装が複雑 | 中 | 中 | シンプルな実装から開始、段階的に機能追加 |
| バリデーションロジックの漏れ | 中 | 低 | Reference版と照合して確認 |
| TypeScriptエラー | 低 | 低 | 型定義を事前確認 |

---

## 🔍 テスト計画

### 機能テスト

- [ ] Material編集（追加/削除/並び替え）
- [ ] Condition編集（追加/削除/並び替え）
- [ ] Result編集（追加/削除/並び替え）
- [ ] カスタムプロパティ編集
- [ ] テンプレートタイプ切り替え

### バリデーションテスト

- [ ] Template ID必須チェック
- [ ] Template type必須チェック
- [ ] ID重複チェック

### UI/UXテスト

- [ ] セクション展開/折りたたみ
- [ ] 未保存変更の警告
- [ ] 新規作成モード表示

---

## 📝 実装チェックリスト

### Phase 4実装項目

- [ ] Reference版コード確認
- [ ] MultiObjectEditorインポート
- [ ] expandedSections状態拡張
- [ ] handleToggleSection実装
- [ ] handleMultiObjectDataChange実装
- [ ] handleCustomPropertiesChange実装
- [ ] Material編集コンポーネント追加
- [ ] Condition編集コンポーネント追加
- [ ] Result編集コンポーネント追加
- [ ] CustomPropertyEditor統合
- [ ] バリデーション強化
- [ ] TODOアラート削除
- [ ] ヒント表示更新
- [ ] ESLint/TypeScriptエラー0件確認
- [ ] Phase 4完了報告書作成

---

## 🚀 次のステップ（Phase 5以降）

### Phase 5: 残りのダイアログ実装

- 必要に応じて他のダイアログコンポーネントを実装

### Phase 6: PetriNetEditorInner最終統合

- 全ダイアログの統合
- イベントハンドラの接続
- 状態管理の完成

### Phase 7: 最終検証・ドキュメント完成

- 動作確認
- ドキュメント更新
- 移植完了報告

---

## 💡 実装のポイント

### 成功要因

1. **DocumentEditDialogの実装経験を活用**
   - 同じパターンで実装可能
   - コードの再利用性

2. **MultiObjectEditorの汎用性**
   - Material/Condition/Resultも同じコンポーネントで対応
   - 統一されたUI/UX

3. **段階的な実装**
   - ステップごとに動作確認
   - 早期にエラー検出

### 注意点

1. **CustomPropertyEditorの実装**
   - key-value形式の編集
   - シンプルかつ使いやすいUI

2. **テンプレートタイプの扱い**
   - Material/Condition/Resultの切り替え
   - タイプごとの適切なバリデーション

---

**Phase 4実装準備完了 - 実装開始承認待ち ⏳**

Phase 3の経験を活かし、スムーズな実装を目指します。
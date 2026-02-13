# PetriNetEditorV2 完全版実装 - 詳細計画書

**作成日時**: 2026-02-02 08:41  
**タスクID**: PetriNetEditorV2_Complete_Implementation  
**優先度**: 高  
**推定工数**: 3-5日

---

## 1. タスク概要

PetriNetEditorV2のreference版からcurrent版への完全移植を実施します。

### 実装対象

1. **MultiObjectEditor.tsx** - 複数オブジェクト編集コンポーネント
2. **DocumentEditDialog.tsx** - 完全版への置き換え
3. **TemplateEditorDialog.tsx** - NestedPropertyEditor完全準拠版への置き換え
4. **PropertyPanel.tsx** - 高度機能の追加

---

## 2. 目的と期待される成果

### 目的
Reference版の全機能をcurrent版に移植し、機能的に完全同等にする

### 期待される成果
- [x] 詳細計画書作成
- [ ] Phase 1: ドキュメント更新
- [ ] Phase 2: MultiObjectEditor実装
- [ ] Phase 3: DocumentEditDialog完全版実装
- [ ] Phase 4: TemplateEditorDialog完全版実装
- [ ] Phase 5: PropertyPanel高度機能追加
- [ ] Phase 6: 統合テスト
- [ ] Phase 7: 最終検証

---

## 3. 実装ステップ

### Phase 1: ドキュメント更新（優先度: 最高）

**推定工数**: 30分

#### Step 1.1: 未移植ファイルの依存関係.md 更新

**対象**: `docs/V2移植/未移植ファイルの依存関係.md`

```markdown
| ファイル | 移植元 | 推奨移植先 | 優先度 | 状態 |
|---------|--------|-----------|--------|------|
| DraftManager.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ✅ **移植完了** |
| SaveConfirmDialog.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ✅ **移植完了** |
| WorkflowSelectorDialog.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ✅ **移植完了** |
| TemplateViewer/* | reference/.../components/TemplateViewer/ | frontend/.../editorv2/components/TemplateViewer/ | 高 | ✅ **移植完了** |
| MultiObjectEditor.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | 🚧 **Phase 2実装中** |
| DocumentEditDialog.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | 🚧 **Phase 3で完全版** |
| TemplateEditorDialog.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | 🚧 **Phase 4で完全版** |
| PropertyPanel.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 中 | 🚧 **Phase 5で機能追加** |
| TemplateListView.tsx | reference/.../components/ | - | 低 | ➖ **実装不要**（Reference版未使用） |
| TemplateListItem.tsx | reference/.../components/ | - | 低 | ➖ **実装不要**（Reference版未使用） |
```

---

### Phase 2: MultiObjectEditor実装（優先度: 高）

**推定工数**: 1日

#### Step 2.1: MultiObjectEditor.tsx 新規作成

**参照**: `reference/frontend/src/components/PetriNetEditorV2/components/MultiObjectEditor.jsx`

**主要機能**:
1. 複数オブジェクトの追加/削除/並び替え
2. Accordion形式の展開/折りたたみUI
3. 各オブジェクトのプロパティ編集
4. Reference管理（vendorRef, instrumentRef）
5. 最小アイテム数制限
6. UUID自動生成

**TypeScript型定義**:
```typescript
interface MultiObjectEditorProps {
  objectKey: 'creators' | 'vendors' | 'owners' | 'instruments';
  title: string;
  icon: React.ReactNode;
  includeReferences?: boolean;
  initialData: any[];
  onDataChange: (key: string, data: any[]) => void;
  minItems?: number;
  isExpanded: boolean;
  onToggleExpanded: (key: string) => void;
  vendorIds?: string[];
  instrumentIds?: string[];
}
```

**MUI → Ant Design変換**:
- Accordion → Collapse
- AccordionSummary → Collapse.Panel header
- AccordionDetails → Collapse.Panel 内部
- IconButton → Button icon
- Grid → Row + Col
- TextField → Input
- Select → Select

#### Step 2.2: IndependentComplexObjectEditor実装

Reference版の`IndependentComplexObjectEditor`を`MultiObjectEditor.tsx`内に実装：

**主要機能**:
1. 単一オブジェクト編集
2. 遅延更新（500ms debounce）
3. UUID生成
4. Reference追加/削除
5. 新規作成時の自動初期化

---

### Phase 3: DocumentEditDialog完全版実装（優先度: 高）

**推定工数**: 1日

#### Step 3.1: 現在の実装をバックアップ

```bash
cp frontend/src/components/editorv2/components/DocumentEditDialog.tsx \
   frontend/src/components/editorv2/components/DocumentEditDialog.backup.tsx
```

#### Step 3.2: MultiObjectEditor統合

Reference版（1018行）の構造に基づき、以下を追加：

**追加機能**:
1. MultiObjectEditorのインポートと使用
2. creators/vendors/owners/instruments の配列編集UI
3. Reference管理機能（vendorRef, instrumentRef）
4. Vendor/Instrument IDリスト取得
5. 展開状態管理（expandedSections）

**実装箇所**:
```typescript
// MultiObjectEditor使用例
<MultiObjectEditor
  objectKey="creators"
  title="Creator"
  icon={<UserOutlined />}
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

#### Step 3.3: 配列データ管理

**追加ハンドラー**:
```typescript
const handleMultiObjectDataChange = useCallback((objectKey: string, objectsArray: any[]) => {
  setEditingDocument(prev => ({
    ...prev,
    [objectKey]: objectsArray
  }));
  setHasChanges(true);
}, []);
```

#### Step 3.4: バリデーション更新

配列要素のバリデーション追加：
- creators 最低1件必須
- vendors 最低1件必須
- owners 最低1件必須
- instruments 任意（0件可）
- ID重複チェック

---

### Phase 4: TemplateEditorDialog完全版実装（優先度: 中）

**推定工数**: 1.5日

#### Step 4.1: 現在の実装をバックアップ

```bash
cp frontend/src/components/editorv2/components/TemplateEditorDialog.tsx \
   frontend/src/components/editorv2/components/TemplateEditorDialog.backup.tsx
```

#### Step 4.2: MaiMLスキーマ全propertyタイプ対応

Reference版（2956行）から以下を移植：

**MaiML Property Types定義**:
```typescript
const MAIML_PROPERTY_TYPES = [
  // Simple Types (23種類)
  { value: 'stringType', label: 'stringType - 文字列', category: 'Simple' },
  { value: 'tokenType', label: 'tokenType - トークン', category: 'Simple' },
  { value: 'idType', label: 'idType - ID', category: 'Simple' },
  // ... 全40+種類を定義

  // List Types
  { value: 'propertyListType', label: 'propertyListType - プロパティリスト', category: 'List' },
  { value: 'stringListType', label: 'stringListType - 文字列リスト', category: 'List' },
  // ...
];
```

#### Step 4.3: NestedPropertyEditor完全準拠

**追加機能**:
1. attributes（XML属性）管理
2. elements（XML要素）管理
3. children（子要素）管理
4. propertyListType対応（子要素を持つ複合型）
5. 展開/縮小機能の強化
6. 同階層コピー機能
7. カテゴリ別propertyタイプ選択

#### Step 4.4: useNamespaceOperations統合

Reference版のフック使用パターンを移植：
```typescript
const {
  validateAndAddNamespace,
  removeNamespace,
  // ...
} = useNamespaceOperations();
```

---

### Phase 5: PropertyPanel高度機能追加（優先度: 中）

**推定工数**: 0.5日

#### Step 5.1: Reference版との差分分析

Reference版（844行）vs Current版（564行）の主な差分：
- Template関連UIの詳細化
- 高度な編集機能の追加

#### Step 5.2: 高度機能の追加

Reference版から以下を移植：
1. Template詳細表示の強化
2. プロパティ編集の高度なUI
3. バリデーション機能の強化

---

### Phase 6: 統合テスト（優先度: 高）

**推定工数**: 0.5日

#### Step 6.1: 単体テスト

**テスト対象**:
- [ ] MultiObjectEditor単独動作
- [ ] DocumentEditDialog保存/読込
- [ ] TemplateEditorDialog編集
- [ ] PropertyPanel表示/編集

#### Step 6.2: 統合テスト

**テストシナリオ**:
1. Document新規作成
   - creators/vendors/owners追加・編集
   - instruments追加・編集
   - Reference設定
   - UUID生成
   - 保存・読込

2. Template編集
   - 全propertyタイプの選択
   - ネスト構造の編集
   - 名前空間管理
   - 保存・読込

3. 複合操作
   - Document編集後にTemplate編集
   - 複数Methodでの動作確認
   - Draft保存・読込

---

### Phase 7: 最終検証（優先度: 高）

**推定工数**: 0.5日

#### Step 7.1: Reference版との機能比較

**チェックリスト**:
- [ ] DocumentEditDialog: 全機能が同等
- [ ] TemplateEditorDialog: 全propertyタイプ対応
- [ ] MultiObjectEditor: 配列編集が動作
- [ ] PropertyPanel: 高度機能が動作

#### Step 7.2: パフォーマンステスト

**確認項目**:
- [ ] 大量データ（creators 10件以上）での動作
- [ ] 深いネスト構造（5階層以上）での動作
- [ ] Draft保存/読込の速度
- [ ] メモリリーク確認

#### Step 7.3: ユーザビリティ確認

**確認項目**:
- [ ] UI操作がスムーズ
- [ ] エラーメッセージが適切
- [ ] バリデーションが正確
- [ ] 保存・読込が確実

---

## 4. 影響範囲

### 新規作成するファイル
1. `frontend/src/components/editorv2/components/MultiObjectEditor.tsx`

### 大幅に変更するファイル
1. `frontend/src/components/editorv2/components/DocumentEditDialog.tsx`
   - 現在: 494行 → 変更後: 約1000行
2. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
   - 現在: 1505行 → 変更後: 約2900行
3. `frontend/src/components/editorv2/components/PropertyPanel.tsx`
   - 現在: 564行 → 変更後: 約800行

### 更新するドキュメント
1. `docs/V2移植/未移植ファイルの依存関係.md`
2. `docs/V2移植/PetriNetEditorV2_移植ファイル一覧.md`

---

## 5. 技術的詳細

### MUI → Ant Design 変換パターン

| MUI コンポーネント | Ant Design 対応 | 備考 |
|-------------------|-----------------|------|
| Dialog | Modal | width, title, footer props |
| Accordion | Collapse | activeKey制御 |
| AccordionSummary | Collapse.Panel | header prop |
| Grid | Row + Col | gutter, span |
| TextField | Input, Input.TextArea | size, placeholder |
| Select, MenuItem | Select, Select.Option | options配列 |
| IconButton | Button | icon, size="small" |
| Chip | Tag | color props |
| Alert | Alert | type, message, description |
| FormControlLabel + Checkbox | Checkbox | children prop |

### TypeScript型定義の追加

**MultiObjectEditor用**:
```typescript
interface ComplexObject {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  annotation?: string;
  vendorRef?: {
    id: string;
    ref: string;
  };
  instrumentRef?: {
    id: string;
    ref: string;
  };
}

interface MultiObjectEditorProps {
  objectKey: 'creators' | 'vendors' | 'owners' | 'instruments';
  title: string;
  icon: React.ReactNode;
  includeReferences?: boolean;
  initialData: ComplexObject[];
  onDataChange: (key: string, data: ComplexObject[]) => void;
  minItems?: number;
  isExpanded: boolean;
  onToggleExpanded: (key: string) => void;
  vendorIds?: string[];
  instrumentIds?: string[];
}
```

**TemplateEditorDialog用**:
```typescript
interface MaimlPropertyType {
  value: string;
  label: string;
  category: 'Simple' | 'List';
}

interface NestedProperty {
  name: string;
  type: string;
  value?: any;
  attributes?: Record<string, any>;
  elements?: any[];
  children?: NestedProperty[];
}
```

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 大規模改修による既存機能の破壊 | 高 | 中 | バックアップ作成、段階的実装、各Phase後テスト |
| MUI→Ant Design変換での動作不良 | 中 | 中 | Reference版の動作を参考、丁寧に変換 |
| 型定義の不整合 | 中 | 低 | TypeScriptの型チェックを活用 |
| パフォーマンス劣化 | 中 | 低 | Phase 7でパフォーマンステスト実施 |
| 複雑なstate管理でのバグ | 高 | 中 | useMemo, useCallback活用、適切な依存配列 |

---

## 7. テスト計画

### Phase 2後のテスト
- [ ] MultiObjectEditor単独動作確認
- [ ] 配列追加/削除/並び替え
- [ ] Reference追加/削除
- [ ] UUID生成

### Phase 3後のテスト
- [ ] DocumentEditDialog保存
- [ ] creators/vendors/owners/instruments編集
- [ ] Reference設定
- [ ] バリデーション

### Phase 4後のテスト
- [ ] TemplateEditorDialog編集
- [ ] 全propertyタイプ選択
- [ ] ネスト構造編集
- [ ] 名前空間管理

### Phase 5後のテスト
- [ ] PropertyPanel表示
- [ ] Template詳細表示
- [ ] プロパティ編集

### Phase 6統合テスト
- [ ] 全機能の統合動作
- [ ] 複合操作シナリオ
- [ ] エラーケース

### Phase 7最終検証
- [ ] Reference版との機能比較
- [ ] パフォーマンステスト
- [ ] ユーザビリティ確認

---

## 8. ロールバック計画

各Phaseでバックアップを作成し、問題発生時は即座にロールバック可能にします。

**バックアップファイル**:
- `DocumentEditDialog.backup.tsx`
- `TemplateEditorDialog.backup.tsx`
- `PropertyPanel.backup.tsx`

**Git管理**:
- 各Phase完了時にcommit
- 問題発生時は該当commitをrevert

---

## 9. スケジュール

### Day 1
- Phase 1: ドキュメント更新（0.5h）
- Phase 2: MultiObjectEditor実装（7h）

### Day 2
- Phase 3: DocumentEditDialog完全版実装（8h）

### Day 3
- Phase 4: TemplateEditorDialog完全版実装（8h）

### Day 4
- Phase 4: TemplateEditorDialog完全版実装（続き）（4h）
- Phase 5: PropertyPanel高度機能追加（4h）

### Day 5
- Phase 6: 統合テスト（4h）
- Phase 7: 最終検証（4h）

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-02 08:41
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: 

---

## 11. 実施記録

### Phase 1: ドキュメント更新
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 2: MultiObjectEditor実装
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 3: DocumentEditDialog完全版実装
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 4: TemplateEditorDialog完全版実装
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 5: PropertyPanel高度機能追加
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 6: 統合テスト
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 7: 最終検証
- **開始**: 
- **完了**: 
- **結果**: 

---

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）

---

## 付録: 参考資料

- `docs/V2移植/20260202_0816_PetriNetEditorInner_反映漏れ調査_最終報告書.md`
- `reference/frontend/src/components/PetriNetEditorV2/components/`
- `.clinerules/development/frontend.md`
- `.clinerules/references/ui_policy.md`
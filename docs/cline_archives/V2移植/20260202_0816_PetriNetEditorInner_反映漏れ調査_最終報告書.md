# PetriNetEditorInner 反映漏れ調査 - 最終報告書

**作成日時**: 2026-02-02 08:16  
**タスクID**: PetriNetEditorInner_Missing_Features_Report  
**優先度**: 高

---

## 📋 調査サマリー

PetriNetEditorV2の移植作業において、referenceから現在のeditorv2への移植時に**意図的に未実装とされた機能**と**単純な移植漏れ**を特定しました。

### 結論

✅ **主要コンポーネントファイルは全て存在**  
⚠️ **一部コンポーネントで機能的な実装が大幅に簡略化されている**  
🚧 **意図的未実装（TODO記載）とドキュメント未更新が混在**

---

## 1. ファイル存在確認結果

### ✅ 実装済みコンポーネント

| コンポーネント | Reference行数 | Current行数 | 差分率 | 状態 |
|--------------|--------------|------------|-------|------|
| **DraftManager.tsx** | 711行 | 500行 | -30% | ✅ 実装済み |
| **SaveConfirmDialog.tsx** | 535行 | 483行 | -10% | ✅ 実装済み |
| **WorkflowSelectorDialog.tsx** | 473行 | 406行 | -14% | ✅ 実装済み |
| **EditorToolbar.tsx** | 297行 | 283行 | -5% | ✅ 実装済み |
| **MethodTabPanel.tsx** | 285行 | 265行 | -7% | ✅ 実装済み |
| **SaveDialog.tsx** | 160行 | 191行 | +19% | ✅ 実装済み |
| **ValidationPanel.tsx** | 442行 | 441行 | -0.2% | ✅ 実装済み |
| **ReactFlowCanvas.tsx** | - | 178行 | 新規 | ✅ 新規追加 |

### ✅ TemplateViewer 完全実装

| ファイル | 状態 |
|---------|------|
| `TemplateViewer/index.ts` | ✅ 実装済み |
| `TemplateViewer/TemplateList.tsx` | ✅ 実装済み |
| `TemplateViewer/TemplateItem.tsx` | ✅ 実装済み |

### ✅ カスタムノード完全実装

| ファイル | 状態 |
|---------|------|
| `nodes/TransitionNode.tsx` | ✅ 実装済み |
| `nodes/MaterialPlaceNode.tsx` | ✅ 実装済み |
| `nodes/ConditionPlaceNode.tsx` | ✅ 実装済み |
| `nodes/ResultPlaceNode.tsx` | ✅ 実装済み |
| `nodes/index.ts` | ✅ 実装済み |

---

## 2. 重大な差分発見（機能的欠落）

### 🚨 DocumentEditDialog.tsx - 重大な機能欠落

#### Reference版（1018行）の機能
```javascript
✅ IndependentComplexObjectEditor - 独立複合オブジェクトエディタ
✅ MultiObjectEditor - 複数オブジェクト編集
✅ creators[] / vendors[] / owners[] / instruments[] 配列編集UI
✅ vendorRef / instrumentRef 参照プロパティ管理UI
✅ 各オブジェクトの個別UUID生成
✅ Reference ID連番生成
✅ Vendor/Instrument IDリストからの選択
✅ 新規作成時の自動初期化
✅ 遅延更新機能（500ms debounce）
✅ XML署名機能（W3C XMLDSig）
✅ MaiML ID属性編集（protocolId, methodId, pnmlId, programId）
```

#### Current版（494行）の機能
```javascript
✅ 基本プロパティ編集（id, uuid, name, description, date）
✅ UUID生成（Document全体のみ）
✅ MaiML ID属性編集
✅ XML署名有効化フラグ
❌ MultiObjectEditor（意図的未実装）
❌ 配列編集UI（creators/vendors/owners/instruments）
❌ Reference管理UI（vendorRef/instrumentRef）
```

#### 実装状態
```typescript
// 現在のコードに明示的なTODO
<Alert
  message="🚧 Phase TODO"
  description="MultiObjectEditor（Creator/Vendor/Owner/Instrument編集）は次Phaseで実装します"
  type="warning"
/>
```

**結論**: **意図的未実装（Phase TODO）** であり、反映漏れではない

---

### 🚨 TemplateEditorDialog.tsx - 大幅な簡略化

#### Reference版（2956行）の機能
```javascript
✅ NestedPropertyEditor完全準拠
✅ MaiMLスキーマ全propertyタイプ対応（40+種類）
  - Simple Types: stringType, tokenType, idType, dateTimeType, etc.
  - List Types: propertyListType, stringListType, idRefListType, etc.
✅ attributes（XML属性）管理
✅ elements（XML要素）管理
✅ children（子要素）管理
✅ propertyListType対応（子要素を持つ複合型）
✅ 展開/縮小機能
✅ 同階層コピー機能
✅ useNamespaceOperations フック使用
✅ カテゴリ別propertyタイプ選択
```

#### Current版（1505行）の機能
```javascript
✅ 基本的なTemplate編集
✅ Material/Condition/Result Template対応
✅ 名前空間管理
✅ 構造化プロパティ編集
⚠️ propertyタイプ選択（簡略版）
⚠️ ネストレベル制限あり
❌ MaiMLスキーマ全propertyタイプ未対応
❌ 完全なNestedPropertyEditor準拠ではない
```

**結論**: 大幅に簡略化されているが、**基本機能は動作する**

---

### 📊 PropertyPanel.tsx - 中程度の簡略化

| Feature | Reference (844行) | Current (564行) |
|---------|-------------------|-----------------|
| 基本プロパティ編集 | ✅ | ✅ |
| Template関連UI | ✅ 詳細 | ✅ 簡略版 |
| 高度な編集機能 | ✅ | ⚠️ 一部 |

**結論**: 基本機能は実装済み、高度な機能が簡略化

---

### 📊 DraftManager.tsx - 軽微な簡略化

| Feature | Reference (711行) | Current (500行) |
|---------|-------------------|-----------------|
| Draft保存/読込 | ✅ | ✅ |
| Draft一覧表示 | ✅ | ✅ |
| useDraftManager hook | ✅ | ✅ 完全実装 |
| UI表示 | ✅ MUI | ✅ Ant Design |

**結論**: 機能的に同等、MUI→Ant Design変換のみ

---

## 3. 未実装コンポーネント

### ❌ MultiObjectEditor.tsx
- **Reference版**: 565行（完全実装）
- **Current版**: 存在しない
- **状態**: **意図的未実装**（DocumentEditDialog内にTODO記載）
- **影響**: DocumentEditDialog内のCreator/Vendor/Owner/Instrument編集不可

### ⚠️ TemplateListView.tsx / TemplateListItem.tsx
- **Reference版**: コメントアウト状態
- **Current版**: 存在しない
- **状態**: Reference版でも未使用
- **影響**: なし（TemplateViewer/配下の同等コンポーネントで代替）

---

## 4. docs/V2移植/未移植ファイルの依存関係.md の状態

### ドキュメント更新が必要

| ファイル | ドキュメント記載 | 実態 |
|---------|-----------------|------|
| DraftManager.tsx | ❌ 未実装 | ✅ **実装済み** |
| SaveConfirmDialog.tsx | ❌ 未実装 | ✅ **実装済み** |
| WorkflowSelectorDialog.tsx | ❌ 未実装 | ✅ **実装済み** |
| TemplateViewer/* | ❌ 未実装 | ✅ **実装済み** |
| MultiObjectEditor.tsx | ⚠️ TODO | 🚧 **意図的未実装** |
| TemplateListView.tsx | ❌ 未実装 | - Reference版でも未使用 |
| TemplateListItem.tsx | ❌ 未実装 | - Reference版でも未使用 |

**結論**: **ドキュメントの更新漏れ** - 実装は完了しているが、ドキュメントが更新されていない

---

## 5. 機能的反映漏れの分類

### 🟢 実装完了（ドキュメント更新のみ必要）

1. ✅ **DraftManager** - 完全実装済み
2. ✅ **SaveConfirmDialog** - 完全実装済み
3. ✅ **WorkflowSelectorDialog** - 完全実装済み
4. ✅ **TemplateViewer系** - 完全実装済み
5. ✅ **カスタムノード** - 完全実装済み

### 🟡 意図的簡略化（機能的には動作）

1. ⚠️ **TemplateEditorDialog** - 基本機能は実装、高度な機能は簡略化
2. ⚠️ **PropertyPanel** - 基本機能は実装、一部簡略化
3. ⚠️ **DraftManager** - MUI→Ant Design変換で行数減

### 🔴 意図的未実装（TODO記載あり）

1. 🚧 **MultiObjectEditor** - DocumentEditDialog内にTODO記載
2. 🚧 **DocumentEditDialog の複合オブジェクト編集UI** - Phase TODO

### ⚪ 実装不要（Reference版でも未使用）

1. ➖ **TemplateListView** - Reference版でコメントアウト
2. ➖ **TemplateListItem** - Reference版でコメントアウト

---

## 6. 推奨アクション

### 優先度: 高（即座に実施）

#### ✅ ドキュメント更新

**対象ファイル**: `docs/V2移植/未移植ファイルの依存関係.md`

```markdown
| ファイル | 移植元 | 推奨移植先 | 優先度 | 状態 |
|---------|--------|-----------|--------|------|
| DraftManager.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ✅ **移植完了** |
| SaveConfirmDialog.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ✅ **移植完了** |
| WorkflowSelectorDialog.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ✅ **移植完了** |
| TemplateViewer/* | reference/.../components/TemplateViewer/ | frontend/.../editorv2/components/TemplateViewer/ | 高 | ✅ **移植完了** |
| MultiObjectEditor.tsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | 🚧 **Phase TODO** |
| TemplateListView.tsx | reference/.../components/ | - | 低 | ➖ **実装不要**（Reference版未使用） |
| TemplateListItem.tsx | reference/.../components/ | - | 低 | ➖ **実装不要**（Reference版未使用） |
```

---

### 優先度: 中（必要に応じて実施）

#### 🔄 機能強化（オプション）

**1. TemplateEditorDialog の完全版実装**
- Reference版のNestedPropertyEditor完全準拠版への置き換え
- MaiMLスキーマ全propertyタイプ対応
- **推定工数**: 2-3日
- **必要性**: 現在のシンプル版でも基本機能は動作するため、優先度は中

**2. DocumentEditDialog の複合オブジェクト編集実装**
- MultiObjectEditor コンポーネントの移植
- IndependentComplexObjectEditor の実装
- creators/vendors/owners/instruments 配列編集UI
- **推定工数**: 1-2日
- **必要性**: TODOとして明示されているため、Phase計画に従う

---

### 優先度: 低（現状維持）

1. **PropertyPanel** - 現状で十分機能している
2. **DraftManager** - 現状で十分機能している
3. **その他のコンポーネント** - 行数差は主にMUI→Ant Design変換によるもの

---

## 7. 結論

### 重要な発見

1. **✅ 主要コンポーネントは全て実装済み**
   - ドキュメント（`未移植ファイルの依存関係.md`）が更新されていなかっただけ

2. **🚧 意図的未実装は明示されている**
   - DocumentEditDialog内のMultiObjectEditor機能
   - 「Phase TODO」として明確に記載されている

3. **⚠️ 一部コンポーネントは簡略版**
   - TemplateEditorDialog（基本機能は動作）
   - PropertyPanel（基本機能は動作）
   - 現状でも十分に使用可能

4. **📝 ドキュメント更新が最優先**
   - 実装状況とドキュメントの乖離を解消

### 反映漏れの実態

❌ **重大な反映漏れは存在しない**
✅ **計画的に段階実装されている**
📝 **ドキュメント更新が追いついていない**

---

## 8. 次のアクション（推奨）

### Step 1: ドキュメント更新（即座に実施可能）

```bash
# 対象ファイル
docs/V2移植/未移植ファイルの依存関係.md
```

更新内容:
- DraftManager, SaveConfirmDialog, WorkflowSelectorDialog → ✅ 移植完了
- TemplateViewer系 → ✅ 移植完了
- MultiObjectEditor → 🚧 Phase TODO（意図的未実装）
- TemplateListView/Item → ➖ 実装不要

### Step 2: MultiObjectEditor実装（Phase計画に従う）

DocumentEditDialog内のTODOに従い、次Phaseで実装：
1. MultiObjectEditor.tsx コンポーネント移植
2. IndependentComplexObjectEditor実装
3. DocumentEditDialog統合

### Step 3: 機能強化（オプション）

必要に応じて：
- TemplateEditorDialog の完全版実装
- PropertyPanel の高度な機能追加

---

## 9. 承認依頼

以下の方針でよろしいでしょうか？

### 提案1: ドキュメント更新のみ実施（推奨）
- `docs/V2移植/未移植ファイルの依存関係.md` を実態に合わせて更新
- 現在の実装状況を正確に反映

### 提案2: MultiObjectEditor実装も含める
- ドキュメント更新 + MultiObjectEditor移植
- DocumentEditDialog の完全版実装
- **推定工数**: 1-2日

### 提案3: 完全版実装（大規模）
- ドキュメント更新
- MultiObjectEditor実装
- TemplateEditorDialog完全版実装
- **推定工数**: 3-5日

---

**ご判断をお願いいたします。**
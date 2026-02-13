# PetriNetEditorInner Phase9.12.1 作業手順書

## 作業概要
存在しない型の修正とReact Flow型アサーション（優先度1,2）

## 前提条件

### 型定義の確認結果
- ✅ `Template` (line 60) - 完全なテンプレート定義
- ✅ `TemplateRef` (line 48) - テンプレート参照
- ✅ `MethodData` (line 145) - メソッドデータ
- ❌ `TemplateData` - 存在しない
- ❌ `Method` - 存在しない

### TemplateEditorDialogProps定義（line 293）
```typescript
export interface TemplateEditorDialogProps {
  open: boolean;
  template: Template | null;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSave: (template: Template) => void;
  existingTemplates?: Template[];
}
```

## 修正手順

### Step 1: PetriNetEditorInner.tsx Line 3559 (Method[] → MethodData[])

**エラー:**
```
Line 3559: Type 'Method[]' is not assignable to type 'MethodData[]'
```

**修正箇所を検索:**
```bash
cd frontend && sed -n '3555,3565p' src/components/editorv2/PetriNetEditorInner.tsx
```

**修正内容:**
`Method[]` → `MethodData[]` に変更

### Step 2: PetriNetEditorV2.tsx Line 361 (Method[] → MethodData[])

**エラー:**
```
Line 361: Type '{ methodId: string; nodes: Node[]; edges: Edge[]; }[]' is not assignable to type 'Method[]'
```

**修正箇所を検索:**
```bash
cd frontend && sed -n '355,365p' src/components/editorv2/PetriNetEditorV2.tsx
```

**修正内容:**
型アサーション追加または配列の型定義を修正

### Step 3: React Flow型アサーション

#### Line 3601: selectionMode
**エラー:**
```
Line 3601: Type '"partial"' is not assignable to type 'SelectionMode | undefined'
```

**修正:**
```typescript
// 修正前
selectionMode="partial"

// 修正後
selectionMode={"partial" as SelectionMode}
```

**検索コマンド:**
```bash
cd frontend && sed -n '3595,3605p' src/components/editorv2/PetriNetEditorInner.tsx
```

#### Line 3618: variant
**エラー:**
```
Line 3618: Type '"dots"' is not assignable to type 'BackgroundVariant | undefined'
```

**修正:**
```typescript
// 修正前
variant="dots"

// 修正後
variant={"dots" as BackgroundVariant}
```

**検索コマンド:**
```bash
cd frontend && sed -n '3615,3625p' src/components/editorv2/PetriNetEditorInner.tsx
```

### Step 4: インポート追加確認

`SelectionMode`と`BackgroundVariant`がインポートされているか確認:

```bash
cd frontend && head -50 src/components/editorv2/PetriNetEditorInner.tsx | grep "SelectionMode\|BackgroundVariant"
```

インポートがない場合は追加:
```typescript
import { SelectionMode, BackgroundVariant } from 'reactflow';
```

## 修正後の確認

### エラー数確認
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "editorv2" | grep "error" | wc -l
```

**期待値:**
- 修正前: 21件
- 修正後: 17件（4件減少）

## 次のステップ

Phase9.12.2に進む:
- Props型の不一致修正（残り17件）
- null/undefined統一
- Node型変換

## 推定所要時間

約10分

## 注意事項

1. 型アサーションは最小限に
2. 各修正後にエラー数を確認
3. コンパイルエラーが増えていないか確認
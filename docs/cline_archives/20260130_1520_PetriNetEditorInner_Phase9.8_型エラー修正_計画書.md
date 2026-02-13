# PetriNetEditorInner Phase9.8 型エラー修正計画書

**作成日時**: 2026-01-30 14:50  
**Phase**: Phase9.8 - 残存型エラー修正（29件）  
**優先度**: 高

---

## 📋 現状分析

### Phase9.7の修正内容の問題
Phase9.7で562行目と2914行目にMethod[]→MethodData[]変換コードを追加しましたが、`convertMultipleMethodsToMaiML`は`Method[]`型を期待していることが判明しました。

### 現在のエラー状況（29件）

#### PetriNetEditorInner.tsx（21件）
1. **562行目・2914行目**: `MethodData[]`を`Method[]`に渡そうとしている（Phase9.7の修正が誤り）
2. **3611行目**: `Method[]`を`MethodData[]`に代入しようとしている
3. **暗黙のany型エラー（5件）**: 929, 1080, 1108, 1264, 1350行目
4. **その他の型互換性エラー（14件）**: 435, 890, 966, 1691, 1757, 3264, 3539, 3653, 3670, 3706, 3719, 3728, 3740, 3760, 3761, 3762, 3782, 3784, 3790, 3802行目

#### PetriNetEditor.tsx（7件）
- 古いPetriNetEditorの型エラー（Phase9.8では対象外）

#### demoファイル（30件）
- デモファイルの型エラー（Phase9.8では対象外）

---

## 🎯 Phase9.8の目標

### 目標
PetriNetEditorInner.tsxの21件の型エラーを完全に解消する

### スコープ
- ✅ PetriNetEditorInner.tsxの型エラー修正
- ❌ PetriNetEditor.tsx（古いエディタ）は対象外
- ❌ demoファイルは対象外

---

## 📝 実装ステップ

### Step1: Method/MethodData型の整理（562, 2914, 3611行目）

#### 1-1. 562行目の修正
**問題**: Phase9.7で追加したMethodData[]変換コードが不要

**修正内容**:
```typescript
// 修正前（Phase9.7で追加したコード - 誤り）
const methodsData: MethodData[] = updatedMethods.map((m: Method) => {
  // Method → MethodData変換コード
});
maimlXml = convertMultipleMethodsToMaiML(methodsData, ...);

// 修正後（Method[]を直接渡す）
maimlXml = convertMultipleMethodsToMaiML(updatedMethods, metadata, documentData, allTemplatesFromContext);
```

#### 1-2. 2914行目の修正
**問題**: 562行目と同じ

**修正内容**: 562行目と同様の修正

#### 1-3. 3611行目の修正
**問題**: `Method[]`を`MethodData[]`として返そうとしている

**確認箇所**:
```typescript
// 3611行目付近のコード
return {
  ...
  methods: updatedMethods, // Method[] を MethodData[] に代入
};
```

**修正方針**: 戻り値の型定義を確認して修正

---

### Step2: 暗黙のany型エラー修正（5件）

#### 2-1. 929行目
```typescript
// 修正前
.map((m) => ...)
// 修正後
.map((m: Method) => ...)
```

#### 2-2. 1080行目
```typescript
// 修正前
.filter((edge) => ...)
// 修正後
.filter((edge: Edge<EdgeData>) => ...)
```

#### 2-3. 1108行目
```typescript
// 修正前
.filter((m) => ...)
// 修正後
.filter((m: Method) => ...)
```

#### 2-4. 1264行目
```typescript
// 修正前
.filter((edge) => ...)
// 修正後
.filter((edge: Edge<EdgeData>) => ...)
```

#### 2-5. 1350行目
```typescript
// 修正前
.map((e) => ...)
// 修正後
.map((e: Edge<EdgeData>) => ...)
```

---

### Step3: 型互換性エラー修正（14件）

#### 3-1. 435行目 - onHistoryChange型エラー
```typescript
// 問題: EditorState型とstring型の不一致
onHistoryChange={handleHistoryChange}
```

#### 3-2. 890行目 - null代入エラー
```typescript
// 問題: string型にnullを代入
setSelectedMethodId(null);
// 修正後
setSelectedMethodId(null as any); // または型定義を修正
```

#### 3-3. 966行目 - undefined vs null
```typescript
// 問題: string | undefined を string | null に代入
```

#### 3-4. 1691行目 - setNodes型エラー
```typescript
// 問題: ノード生成時の型が不一致
```

#### 3-5. 1757行目 - undefined関数呼び出し
```typescript
// 問題: 関数がundefinedの可能性
if (onValidationChange) {
  onValidationChange(result);
}
```

#### 3-6. 3264行目 - Date vs number
```typescript
// 問題: Date型をnumber型に代入
```

#### 3-7. 3539行目 - Template型不一致
```typescript
// 問題: category型が不一致
```

#### 3-8. 3653行目 - SelectionMode型
```typescript
// 問題: 文字列リテラル型が不一致
selectionMode="partial"
// 修正後
selectionMode={"partial" as SelectionMode}
```

#### 3-9. 3670行目 - BackgroundVariant型
```typescript
// 問題: 文字列リテラル型が不一致
variant="dots"
// 修正後
variant={"dots" as BackgroundVariant}
```

#### 3-10. 3706行目 - Template vs TemplateRef
```typescript
// 問題: TemplateRef型とTemplate型の不一致
```

#### 3-11. 3719行目 - NodeData vs Record<string, unknown>
```typescript
// 問題: NodeData型の不一致
```

#### 3-12. 3728行目 - Method[] vs MethodInfo[]
```typescript
// 問題: Method[]をMethodInfo[]に代入
```

#### 3-13. 3740行目 - null vs undefined
```typescript
// 問題: string | null を string | undefined に代入
```

#### 3-14. 3760, 3761, 3762行目 - 複数の型エラー
```typescript
// 問題: DocumentEditDialog関連の型不一致
```

#### 3-15. 3782, 3784, 3790, 3802行目 - 複数の型エラー
```typescript
// 問題: DocumentEditDialog関連の型不一致
```

---

## 📊 期待される成果

### エラー数の変化
| ファイル | 修正前 | 修正後 | 削減数 |
|---------|--------|--------|--------|
| PetriNetEditorInner.tsx | 21件 | 0件 | **21件削減** |

### 修正対象
- ✅ Method/MethodData型の整理（3件）
- ✅ 暗黙のany型エラー（5件）
- ✅ 型互換性エラー（13件）

---

## ⚠️ リスクと対策

### リスク1: Phase9.7の修正の取り消し
**対策**: 562行目と2914行目のMethodData変換コードを完全に削除

### リスク2: 型定義の不整合
**対策**: editorTypes.tsの型定義を確認しながら修正

### リスク3: 既存機能への影響
**対策**: 修正後にTypeScriptビルドで検証

---

## 📚 関連ドキュメント

- [Phase9.7完了報告](./20260130_1515_PetriNetEditorInner_Phase9.7_完了報告.md)
- [Phase9全体計画](./20260130_1410_PetriNetEditorInner_Phase9_型エラー修正_計画書.md)

---

**作成日時**: 2026-01-30 14:50  
**担当**: Cline
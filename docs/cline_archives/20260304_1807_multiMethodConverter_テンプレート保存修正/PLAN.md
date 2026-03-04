# タスク計画書: multiMethodConverter テンプレート保存修正

## メタデータ
- **作成日時**: 2026-03-04 18:07
- **タスクID**: multiMethodConverter_テンプレート保存修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

ペトリネットエディタの保存処理において、ペトリネットの情報は正しく保存されているが、テンプレートの情報が保存されないバグを修正する。

## 目的と期待される成果

### 目的

`multiMethodConverter.ts` の `buildMethodXML` 関数がテンプレートを `place.data.template` のみに依存しており、`TemplateContext`（`window.clineAllTemplates`）の最新情報を参照していないため、テンプレートが保存時に欠落してしまう。

`convertReactFlowToMaiML`（単一method用）と同じアプローチ（`allTemplates` を直接参照）に統一することで、両モードで正しくテンプレートが保存されるようにする。

### 期待される成果

- [ ] 複数method モード（`multiMethodMode === true`）でも、テンプレート情報がMAIML XMLに正しく出力される
- [ ] 単一method モード（`multiMethodMode === false`）でも、同様に正しく出力される（既存動作確認）
- [ ] `buildTemplateXML` で placeRef が複数ある場合も正しく出力される

## 実装ステップ

### Phase 1: `buildMethodXML` のテンプレート取得ロジック修正

- [ ] `buildMethodXML` 関数シグネチャで `allTemplates` が渡されていることを確認
- [ ] `allTemplates` が提供されている場合、`allTemplates.material/condition/result` から `methodId === method.methodId` のテンプレートを直接フィルタして取得するロジックに変更
- [ ] `allTemplates` が提供されていない場合は既存の `place.data.template` 参照をフォールバックとして維持

### Phase 2: `buildTemplateXML` の placeRef 複数対応修正

- [ ] 現在の `buildTemplateXML` は `placeRef` を1件のみ出力（`node.id` のみ使用）
- [ ] `template.placeRefs` の全件を出力するよう修正（`buildCommonTemplateXMLFromTemplate` と同様のアプローチ）

### Phase 3: 動作確認

- [ ] 単一methodモードで保存時にテンプレートが出力されることを確認
- [ ] 複数methodモードで保存時にすべてのmethodのテンプレートが出力されることを確認
- [ ] 共通テンプレートが `protocol` 直下に正しく出力されることを確認（既存動作）

## 変更ファイル

1. `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts`
   - `buildMethodXML` 関数のテンプレート取得ロジックを修正
   - `buildTemplateXML` 関数の placeRef 出力を複数対応に修正

## 技術的詳細

### 問題のあるコード（修正前）

```typescript
// buildMethodXML 内
const templateNodes = places.filter((place: Node<NodeData>) => {
  if (!place.data.template) {
    return false;  // ← place.data.templateがなければスキップ（TemplateContextは無視）
  }
  // allTemplatesはmethodIdの確認にしか使っていない
});

// buildTemplateXML 内
const placeRefId = template.placeRefs[0].id || `${templateId}TL`;
templateXml += `          <placeRef id="${placeRefId}" ref="${node.id}"/>\n`;
// ← placeRefsが複数あっても1件しか出力されない
```

### 修正後のアプローチ

```typescript
// buildMethodXML 内: allTemplatesが提供されている場合
if (allTemplates) {
  // convertReactFlowToMaiMLと同じアプローチ
  const materialTemplates = allTemplates.material.filter((t: Template) =>
    t.methodId === methodId && t.placeRefs && t.placeRefs.length > 0
  );
  // materialTemplates, conditionTemplates, resultTemplatesを直接buildTemplateXMLFromContextへ
}

// buildTemplateXML 内: placeRefsの全件を出力
const placeRefs = template.placeRefs || [];
placeRefs.forEach((placeRef: PlaceRef, index: number) => {
  const placeRefId = index === 0
    ? (template.placeRefs[0].id || `${templateId}TL`)
    : `${templateId}TL_${index}`;
  templateXml += `          <placeRef id="${placeRefId}" ref="${placeRef.ref}"/>\n`;
});
```

### アーキテクチャ上の考慮事項

- `convertReactFlowToMaiML`（単一method）と `buildMethodXML`（複数method）でテンプレート取得ロジックを統一する
- `allTemplates` から `fakeNode` を作成してXML生成するか、Template オブジェクトを直接受け取る新しいビルダー関数を追加する
- 既存の `buildTemplateXML(node, templateType, allNodes)` は `node.data.template` を使うため、`allTemplates` から作成した `fakeNode` を渡す形式で互換性を維持できる

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| allTemplatesがnullの場合の動作 | 中 | 低 | フォールバック処理を維持 |
| placeRefs変更によるXML構造への影響 | 中 | 低 | 既存のbuildCommonTemplateXMLFromTemplateと同じロジックを適用 |

## テスト計画

### 手動テスト
- [ ] 単一methodのMAIMLファイルを開き、テンプレート付きで保存してXMLにテンプレートが含まれることを確認
- [ ] 複数methodのMAIMLファイルを開き、各methodのテンプレートが保存されることを確認
- [ ] 共通テンプレートが `protocol` 直下に正しく出力されることを確認

## 承認記録

- **計画書提示日時**: 2026-03-04 18:07
- **承認日時**: 2026-03-04 18:07
- **承認者コメント**: 承認済み（ユーザーによるActモード切り替え）

## 実施記録

### 実施日時
開始: 2026-03-04 18:07
完了: 2026-03-04 18:26

### 根本原因の特定

調査の結果、以下の根本原因を特定：

1. **共通テンプレートフィルタ条件のバグ（最重要）**

   `MaimlParserTyped.collectTemplates()` の実装:
   ```typescript
   result.push({ ...template, methodId: methodId ?? undefined });
   ```
   
   protocol直下テンプレートは `methodId = null` で渡されるが、
   `null ?? undefined` = `undefined` になるため、実際は `methodId: undefined` として格納される。
   
   しかし旧来のフィルタは:
   ```typescript
   t.methodId === null  // undefinedはnullと一致しないため常にfalse → テンプレートが欠落
   ```

2. **`buildTemplateXML` の placeRef 1件のみ出力（別途修正済み）**
   
   複数の placeRef がある場合でも1件しか出力されていなかったが、すでに複数対応済みだったことを確認。

### 変更ファイル

- `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts`

### 変更内容

#### Phase 1: 共通テンプレートフィルタ条件の修正（Material/Condition/Result 全3カテゴリ）

**修正前:**
```typescript
// Material
const commonMaterials = allTemplates.material.filter(
  (t: Template) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0
);
// Condition
const commonConditions = allTemplates.condition.filter(
  (t: Template) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0
);
// Result
const commonResults = allTemplates.result.filter(
  (t: Template) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0
);
```

**修正後:**
```typescript
// Material
const commonMaterials = allTemplates.material.filter(
  (t: Template) => (t.methodId === null || t.methodId === undefined) && t.placeRefs && t.placeRefs.length > 0
);
// Condition
const commonConditions = allTemplates.condition.filter(
  (t: Template) => (t.methodId === null || t.methodId === undefined) && t.placeRefs && t.placeRefs.length > 0
);
// Result
const commonResults = allTemplates.result.filter(
  (t: Template) => (t.methodId === null || t.methodId === undefined) && t.placeRefs && t.placeRefs.length > 0
);
```

#### Phase 2: `buildTemplateXML` の placeRef 複数対応（実装済み確認）
- コードを精査した結果、すでに `template.placeRefs` の全件を出力する実装になっていた
- 追加変更不要

### 最終成果物

- [x] 共通テンプレートフィルタを `null || undefined` 両対応に修正
- [x] Material / Condition / Result の全3カテゴリで統一修正
- [x] method内テンプレートの取得ロジックは正常動作していたことを確認（変更不要）

#### Phase 4: `reactFlowToMaiml.ts` の同一バグを修正

単一methodモード用の `convertReactFlowToMaiML` にも同じ `methodId === null` のみのフィルタバグが存在したため修正。

**修正箇所（全4箇所）:**

1. `validatePetriNet` 内の `isCommonTemplate` 判定:
   ```typescript
   // 修正前
   const isCommonTemplate = template.methodId === null;
   // 修正後
   const isCommonTemplate = template.methodId === null || template.methodId === undefined;
   ```

2. `convertReactFlowToMaiML` 内の共通MaterialTemplate フィルタ
3. `convertReactFlowToMaiML` 内の共通ConditionTemplate フィルタ
4. `convertReactFlowToMaiML` 内の共通ResultTemplate フィルタ

   ```typescript
   // 修正前（3箇所）
   filter((t: Template) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0)
   // 修正後（3箇所）
   filter((t: Template) => (t.methodId === null || t.methodId === undefined) && t.placeRefs && t.placeRefs.length > 0)
   ```

**変更ファイル:** `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`

#### Phase 6: `reactFlowToMaiml.ts` の currentMethodId フォールバック修正（メソッドテンプレート削除バグ）

**根本原因:**

保存時に `documentData?.methodId` が `undefined` になるケースで、  
メソッドテンプレートのフィルタ条件:
```typescript
t.methodId === currentMethodId  // undefined === undefined → 共通テンプレートもマッチ
```
が共通テンプレート（`methodId: undefined`）にもマッチし、  
メソッドテンプレート（`methodId` が文字列）が除外されていた。

**修正内容:**

`currentMethodId` の取得ロジックを以下のように変更:

```typescript
// 修正前
const currentMethodId = documentData?.methodId;

// 修正後
const currentMethodId = documentData?.methodId || allMethods?.[0]?.methodId;
const hasKnownMethodId = currentMethodId !== undefined && currentMethodId !== null;
```

フィルタ条件も以下のように変更（material / condition / result 全3カテゴリ）:

```typescript
// 修正前（3箇所）
t.methodId === currentMethodId && t.placeRefs && t.placeRefs.length > 0

// 修正後（3箇所）
(hasKnownMethodId ? t.methodId === currentMethodId : (t.methodId !== null && t.methodId !== undefined))
&& t.placeRefs && t.placeRefs.length > 0
```

**動作フロー:**

| 状況 | currentMethodId | hasKnownMethodId | フィルタ動作 |
|------|-----------------|------------------|------------|
| documentDataにmethodIdあり | `"method_xxx"` | true | `t.methodId === "method_xxx"` でフィルタ |
| documentDataになし・allMethodsあり | `allMethods[0].methodId` | true | `t.methodId === allMethods[0].methodId` でフィルタ |
| 両方ともなし | `undefined` | false | 共通テンプレートでない全テンプレートを出力 |

**変更ファイル:** `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`

### 最終成果物（Phase 6追加）

- [x] `currentMethodId` が `undefined` のとき `allMethods[0].methodId` にフォールバック
- [x] `hasKnownMethodId` フラグでフィルタ条件を分岐（メソッドテンプレートの誤除外を解消）
- [x] material / condition / result の全3カテゴリで統一修正

#### Phase 7: 「追加先テンプレート（フォーマットテンプレート）」が削除される問題の修正

**根本原因:**

フォーマットから読み込まれた「追加先テンプレート」は protocol 直下に配置される共通テンプレートだが、
プレースへの参照（`placeRefs`）が空の状態でロードされる。

保存時の共通テンプレートフィルタ条件に `t.placeRefs && t.placeRefs.length > 0` が付いていたため、
`placeRefs` が空のフォーマットテンプレートは全て除外されて保存されなかった。

```typescript
// 修正前（reactFlowToMaiml.ts・multiMethodConverter.ts 共通）
filter((t: Template) => (t.methodId === null || t.methodId === undefined)
  && t.placeRefs && t.placeRefs.length > 0)  // ← placeRefs空のテンプレートが除外される

// 修正後
filter((t: Template) => t.methodId === null || t.methodId === undefined)
// ※ placeRefs が空でも出力する（フォーマットのテンプレート＝追加先テンプレートはplaceRefsが空）
```

**修正箇所（合計6箇所）:**

| ファイル | カテゴリ | 修正内容 |
|---------|---------|---------|
| `reactFlowToMaiml.ts` | Material | `placeRefs.length > 0` 条件を削除 |
| `reactFlowToMaiml.ts` | Condition | `placeRefs.length > 0` 条件を削除 |
| `reactFlowToMaiml.ts` | Result | `placeRefs.length > 0` 条件を削除 |
| `multiMethodConverter.ts` | Material | `placeRefs.length > 0` 条件を削除 |
| `multiMethodConverter.ts` | Condition | `placeRefs.length > 0` 条件を削除 |
| `multiMethodConverter.ts` | Result | `placeRefs.length > 0` 条件を削除 |

**期待される動作:**
- 「追加先テンプレート」（フォーマットから読み込まれた `placeRefs` 空のテンプレート）も protocol 直下に保存される
- プレース選択→テンプレート編集→保存 で作成したテンプレート（`placeRefs` あり）も引き続き正常に保存される
- メソッドに紐づくテンプレートも引き続き正常に保存される

#### Phase 8: ワークフロー追加後のテンプレートが保存されない問題の修正

**症状:**

ワークフローをファイルから追加した後、プロパティ→テンプレート編集→保存しても、保存したMAIMLファイルにテンプレートが含まれない。

**根本原因:**

`handleOpenTemplateEditor` に渡すノードの `data.methodId` が未設定（`undefined`）になるケースがあった。

`TemplateEditorDialog.handleSave` では:
```typescript
const methodId = node.data.methodId || null;
onSave(..., methodId);
```
`methodId = null` として `handleSaveTemplate` に渡される。

`handleSaveTemplate` では:
```typescript
const correctMethodId = isCommonTemplate ? undefined
  : (methodId || documentData?.methodId || methods[activeMethodIndex]?.methodId);
```
`methodId` が `null` の場合、フォールバックとして `documentData?.methodId` が使われるが、
単一methodモードでは `documentData.methodId` が一致しない場合があり、
複数methodモードでは `methods[activeMethodIndex]?.methodId` が正しい値となる。

しかし問題は**その後の `buildMethodXML`** フィルタにある:
```typescript
// buildMethodXML 内のメソッドテンプレートフィルタ
t.methodId === methodId && t.placeRefs && t.placeRefs.length > 0
```
`correctMethodId` が `undefined` になった場合、この条件は全メソッドテンプレートにマッチせず除外される。

**修正内容（`PetriNetEditorInner.tsx`）:**

`handleOpenTemplateEditor` で `methodId` が未設定のノードに activeMethod の methodId を補完:

```typescript
const handleOpenTemplateEditor = useCallback((node: Node<NodeData>) => {
  const isCommon = node.data.isCommonTemplate || false;
  const currentMethodId = methods[activeMethodIndex]?.methodId;
  const nodeWithMethodId: Node<NodeData> = {
    ...node,
    data: {
      ...node.data,
      methodId: isCommon
        ? null                                          // 共通テンプレートは null のまま
        : (node.data.methodId ?? currentMethodId ?? null), // 未設定なら activeMethod の ID を補完
    },
  };
  setTemplateEditNode(nodeWithMethodId);
  setTemplateEditorOpen(true);
}, [methods, activeMethodIndex]);
```

**修正ファイル:** `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

**期待される動作:**
- ワークフロー追加後のノードでテンプレート編集→保存しても `methodId` が正しく設定される
- 共通テンプレート（`isCommonTemplate: true`）の場合は引き続き `methodId: null` が渡される
- 既存のプロパティパネルから開くテンプレート編集も引き続き正常に動作する

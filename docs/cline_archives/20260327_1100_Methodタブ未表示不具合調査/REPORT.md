# 不具合調査レポート: MAIML編集画面でMethodタブが表示されない

- **調査日**: 2026-03-27
- **対象**: MAIML編集画面（既存ファイルを開いた場合）
- **症状**: ペトリネットは正常表示されるが、Methodの追加・編集タブ（MethodTabPanel）が表示されない
- **発生条件**: 既存ファイルを開いた場合のみ発生。新規作成からの編集では発生しない

---

## 1. 症状の詳細

スクリーンショット確認：

- ペトリネット（ノード・エッジ）は正常に表示されている
- ツールバー（EditorToolbar）は表示されている
- **画面上部にMethodタブパネル（MethodTabPanel）が表示されていない**

---

## 2. MethodTabPanel の表示条件

`PetriNetEditorInner.tsx`（`PetriNetEditorInnerUI`）：

```tsx
{methods.length > 0 && !showCommonTemplates && (
  <MethodTabPanel ... />
)}
```

**`methods.length > 0` が false のとき、MethodTabPanel は表示されない。**

---

## 3. 根本原因：MAIMLファイル解析時の構造エラーが握りつぶされ `methods = []` になる

### 変換失敗 → methods空配列 の連鎖フロー

```
MAIMLファイルのXML
  ↓
MaimlParserTyped コンストラクタ
  ↓
convertXmlJsToMaimlRoot()
  ↓
convertProtocol()
  ├─ normalizeXmlJsArray(xmlProtocol.method)   ← method要素の配列を取得
  └─ convertArraySafe(methods, convertMethod)  ← 各methodを変換（ここが問題）
          ↓
     convertMethod(xmlMethod) を各要素に実行
          ↓
     xmlMethod.pnml が undefined の場合
          throw new Error('pnml element is required')
               ↓
     convertArraySafe の catch でキャッチ
     ⚠️ "warning" として記録（エラーとして扱わない）
     その要素をスキップ
          ↓
     全methodがスキップ → results = []
          ↓
protocol.methods = []
  ↓
getMethods() → []
  ↓
PetriNetEditorInner: if (methodsData.length > 0) → false
  ↓
setMethods() が一切呼ばれない
  ↓
methods state = [] のまま
  ↓
{methods.length > 0 && <MethodTabPanel />} → 非表示（不具合）
```

---

## 4. 各箇所の詳細

### 4-1. `convertArraySafe` の設計：エラーを握りつぶす

```typescript
// maimlTypeConverter.ts
function convertArraySafe<T, R>(
  value: any,
  converter: (item: T) => R,
  errorContext?: ErrorContext,
  elementName?: string
): R[] {
  const arr = normalizeArray(value);
  const results: R[] = [];

  arr.forEach((item, index) => {
    try {
      results.push(converter(item));
    } catch (error) {
      if (errorContext && elementName) {
        errorContext.addError(
          `${elementName}[${index}]`,
          `Failed to convert ${elementName} at index ${index}`,
          'warning',   // ← 'warning' として記録（hasErrors() = false のまま）
          error as Error
        );
      }
      // エラーが発生した要素はスキップ ← silent skip
    }
  });

  return results; // ← 全要素スキップ時は [] が返る
}
```

この設計により `convertXmlJsToMaimlRoot` は `hasErrors: false` で「成功」を返しつつ、`protocol.methods = []` という壊れたデータを返す。呼び出し元はエラーを検知できない。

---

### 4-2. `convertMethod` の問題：`pnml` 要素の取得が不完全

```typescript
// maimlTypeConverter.ts
function convertMethod(xmlMethod: any, errorContext?: ErrorContext): Method {
  const pnml = xmlMethod.pnml as XmlJsElement | undefined;  // ← ここが問題
  if (!pnml) {
    throw new Error('pnml element is required');  // ← これがスローされる
  }
  ...
}
```

xml-js は `compact: true` で変換した結果として、**XML要素名をそのままオブジェクトのキーにする**。  
MAIMLファイルに XML 名前空間プレフィックスが付いている場合：

```xml
<!-- 正常（プレフィックスなし） -->
<pnml id="...">...</pnml>
→ xmlMethod.pnml = { _attributes: {...}, ... }

<!-- 問題（名前空間プレフィックス付き） -->
<maiml:pnml id="...">...</maiml:pnml>
→ xmlMethod['maiml:pnml'] = { ... }
→ xmlMethod.pnml = undefined  ← throw Error → convertArraySafe でスキップ
```

または、MAIMLファイルが旧バージョンで `<net>` 要素を使用している場合も同様に `pnml` が `undefined` になる。

---

### 4-3. `fetchPetriNetData` に else ブランチがない

```typescript
// PetriNetEditorInner.tsx
const methodsData = parser.getMethods();

if (methodsData.length > 0) {
  // setMethods(convertedMethods) ← ここでしか setMethods が呼ばれない
  setIsLoading(false);
}
// ← else がない
// getMethods() が [] を返した場合、setMethods() は実行されず
// methods は初期値 [] のまま → MethodTabPanel が非表示
```

---

### 4-4. 新規作成では問題が起きない理由

```typescript
// 新規作成時（maimlData === null）
if (!maimlData) {
  const initialMethod = generateInitialMethod(initialDocumentData.methodId);
  setMethods([initialMethod]);  // ← 無条件で必ず実行される
  setIsLoading(false);
  return;
}
```

新規作成では変換処理を経由しないため、`setMethods()` が必ず呼ばれる。

---

## 5. 修正ポイント（3か所）

| # | 優先度 | ファイル | 問題 | 修正方法 |
|---|--------|----------|------|----------|
| **①** | **必須** | `PetriNetEditorInner.tsx` | `methods = []` 時に `setMethods()` が呼ばれない | `else` ブランチ追加（症状への対処） |
| **②** | **根本修正** | `maimlTypeConverter.ts` | `pnml` 要素を固定キー名でのみ参照（名前空間非対応） | 名前空間プレフィックス付きキーも検索する |
| **③** | **推奨** | `maimlTypeConverter.ts` | method変換失敗が `warning` で握りつぶされる | method変換失敗は `error` レベルにして呼び出し元が検知できるようにする |

---

### 修正① `fetchPetriNetData` に else ブランチを追加（必須）

**ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

```typescript
// 変更前
if (methodsData.length > 0) {
  // ... 既存処理 ...
  setMethods(convertedMethods);
  setIsLoading(false);
}

// 変更後
if (methodsData.length > 0) {
  // ... 既存処理（変更なし） ...
  setMethods(convertedMethods);
  setIsLoading(false);
} else {
  // methodsが取得できなかった場合：初期methodを設定してタブを表示
  console.warn('⚠️ [fetchPetriNetData] MAIMLのmethod取得件数が0 - フォールバック処理');
  const fallbackMethod = generateInitialMethod(`method_${Date.now()}`);
  setMethods([fallbackMethod]);
  setIsLoading(false);
}
```

---

### 修正② `convertMethod` で pnml を名前空間対応で取得（根本修正）

**ファイル**: `frontend/src/utils/maimlTypeConverter.ts`

```typescript
// 変更前
function convertMethod(xmlMethod: any, errorContext?: ErrorContext): Method {
  const pnml = xmlMethod.pnml as XmlJsElement | undefined;
  if (!pnml) {
    throw new Error('pnml element is required');
  }
  ...
}

// 変更後
function convertMethod(xmlMethod: any, errorContext?: ErrorContext): Method {
  // 名前空間プレフィックス付きキー（例: 'maiml:pnml'）も検索
  const pnml = (
    xmlMethod.pnml
    || Object.entries(xmlMethod).find(([k]) => k === 'pnml' || k.endsWith(':pnml'))?.[1]
  ) as XmlJsElement | undefined;

  if (!pnml) {
    if (errorContext) {
      errorContext.addError('pnml', 'pnml element is required but missing', 'error');
    }
    throw new Error('pnml element is required');
  }
  ...
}
```

---

### 修正③ `getDocument()` を try-catch で囲む（推奨）

**ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

`getDocument()` は `document` が存在しない場合に例外をスローする実装。  
`if (methodsData.length > 0)` ブロック内で呼ばれており、例外が発生すると `setMethods()` が実行されない。

```typescript
// 変更前
const extractedDoc = parser.getDocument();
if (extractedDoc) { ... }

// 変更後
let extractedDoc: MaimlDocument | null = null;
try {
  extractedDoc = parser.getDocument();
} catch (docError) {
  console.warn('⚠️ [fetchPetriNetData] Document取得エラー（処理続行）:', docError);
}
if (extractedDoc) { ... }
```

---

## 6. デバッグ確認方法

ブラウザの開発者コンソールで以下のログを確認：

### methods が空になっているか確認

```
✅ [PetriNetEditorInner] 複数method変換完了: { methodCount: 1, ... }
```
→ このログが**出ていない**場合、`getMethods()` が空を返している

### 変換エラーが発生しているか確認

```
⚠️ [ConversionError] protocol.method[0]: Failed to convert method at index 0
⚠️ [ConversionError] protocol.method[0].pnml: pnml element is required but missing
```
→ このログが出ていれば「pnml の取得失敗」が原因

### 型変換エラーが発生しているか確認

```
⚠️ [MaimlParserTyped] 型変換中にエラーが発生しました
```
→ このログが出ていれば `convertXmlJsToMaimlRoot` でエラーが発生している

---

## 7. 調査対象ファイル一覧

| ファイル | 役割 | 修正要否 |
|----------|------|----------|
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | メインコンポーネント | **修正必須** |
| `frontend/src/utils/maimlTypeConverter.ts` | XML→型変換（`convertArraySafe`, `convertMethod` 定義） | **修正推奨（根本修正）** |
| `frontend/src/utils/maimlParserTyped.ts` | MAIMLパーサー（`getMethods()`, `getDocument()` 定義） | 修正不要 |
| `frontend/src/components/editorv2/components/MethodTabPanel.tsx` | Methodタブ表示コンポーネント | 修正不要 |

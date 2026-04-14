# タスク計画書: MAIML編集画面 Methodタブ未表示不具合修正

## メタデータ
- **作成日時**: 2026-03-27 13:22
- **更新日時**: 2026-03-27 13:30
- **タスクID**: fix-method-tab-not-shown
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## タスク概要

既存の MAIML ファイルを編集画面で開いたとき、MethodTabPanel（Methodの追加・編集タブ）が表示されない不具合を修正する。

調査結果（REPORT.md）に基づき、以下を修正する。

---

## 目的と期待される成果

- [ ] 既存 MAIML ファイルを開いたとき、MethodTabPanel が正しく表示される
- [ ] 名前空間プレフィックス付き XML 要素を持つ MAIML ファイルでも全要素が正常に変換できる
- [ ] `getDocument()` の例外が `fetchPetriNetData` 全体を中断しなくなる

---

## 実装ステップ

### Phase 1: 症状への対処（最優先・即効性あり）

- [ ] `PetriNetEditorInner.tsx` の `fetchPetriNetData` 関数内に `else` ブランチを追加
  - `getMethods()` が `[]` を返した場合、`generateInitialMethod()` でフォールバック用 method を生成して `setMethods()` を呼ぶ
  - これにより、変換失敗時でも MethodTabPanel が表示される

### Phase 2: 根本修正（名前空間プレフィックスの一括除去）

**対象ファイル**: `frontend/src/utils/maimlTypeConverter.ts`（または `frontend/src/types/xml-js-types.ts`）

xml-js で XML を解析すると、名前空間プレフィックス付き要素（例: `<maiml:pnml>`）はキーがそのまま `maiml:pnml` になる。  
`maimlTypeConverter.ts` の全変換関数は固定キー名（例: `.pnml`, `.method`, `.place`）でアクセスしており、これらがすべて影響を受ける。

**対象箇所（全関数の固定キー参照）:**

| 関数 | 影響を受ける固定キー参照 |
|------|--------------------------|
| `convertDocument` | `.uuid`, `.name`, `.description`, `.date`, `.creator`, `.vendor`, `.owner`, `.instrument` |
| `convertCreator` | `.uuid`, `.name`, `.description`, `.vendorRef`, `.instrumentRef` |
| `convertVendor` | `.uuid`, `.name`, `.description` |
| `convertOwner` | `.uuid`, `.name`, `.description` |
| `convertInstrument` | `.uuid`, `.name`, `.description` |
| `convertProtocol` | `.uuid`, `.name`, `.description`, `.method`, `.materialTemplate`, `.conditionTemplate`, `.resultTemplate` |
| `convertMethod` | `.pnml` ⭐（最重要）, `.uuid`, `.name`, `.description`, `.program`, `.materialTemplate`, `.conditionTemplate`, `.resultTemplate` |
| `convertPNML` | `.uuid`, `.name`, `.description`, `.place`, `.transition`, `.arc` |
| `convertPlace` | `.uuid`, `.name`, `.description`, `.position` |
| `convertTransition` | `.uuid`, `.name`, `.description`, `.position` |
| `convertArc` | `.uuid`, `.name`, `.description` |
| `convertProgram` | `.uuid`, `.name`, `.description`, `.instruction`, `.materialTemplate`, `.conditionTemplate`, `.resultTemplate` |
| `convertInstruction` | `.uuid`, `.name`, `.description`, `.transitionRef` |
| `convertMaterialTemplate` / `convertConditionTemplate` / `convertResultTemplate` | `.uuid`, `.name`, `.description`, `.placeRef`, `.templateRef`, `.property`, `.content`, `.insertion` |
| `convertData` | `.uuid`, `.name`, `.description`, `.results` |
| `convertResults` | `.uuid`, `.name`, `.description`, `.material`, `.condition`, `.result` |
| `convertEventLog` | `.uuid`, `.name`, `.description`, `.log` |
| `convertLog` | `.uuid`, `.name`, `.description`, `.trace`, `.extension`, `.global`, `.classifier`, `.creatorRef`, `.ownerRef` |
| `convertTrace` | `.uuid`, `.name`, `.description`, `.event`, `.creatorRef`, `.ownerRef` |
| `convertEvent` | `.uuid`, `.name`, `.description`, `.resultsRef`, `.creatorRef`, `.ownerRef`, `.property`, `.content` |

**修正方針: 名前空間プレフィックス一括除去ユーティリティを追加する**

個別の変換関数を1つずつ修正するのではなく、xml-js 変換直後のオブジェクトに対して**再帰的に名前空間プレフィックスを除去する**ユーティリティ関数を作成・適用する。

```typescript
/**
 * xml-jsオブジェクトのキーから名前空間プレフィックスを再帰的に除去する
 * 例: { 'maiml:pnml': {...}, 'ns:place': {...} } → { pnml: {...}, place: {...} }
 * 
 * @param obj - xml-jsが生成したオブジェクト
 * @returns プレフィックス除去後のオブジェクト
 */
export function stripNamespacePrefixes(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripNamespacePrefixes);

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // _attributes, _text などの xml-js 内部キーはそのまま保持
    if (key.startsWith('_')) {
      result[key] = stripNamespacePrefixes(value);
      continue;
    }
    // 名前空間プレフィックスを除去（例: 'maiml:pnml' → 'pnml'）
    const strippedKey = key.includes(':') ? key.split(':').pop()! : key;
    // 同名キーが複数ある場合は配列化（安全のため）
    if (result[strippedKey] !== undefined) {
      result[strippedKey] = [
        ...(Array.isArray(result[strippedKey]) ? result[strippedKey] : [result[strippedKey]]),
        stripNamespacePrefixes(value)
      ];
    } else {
      result[strippedKey] = stripNamespacePrefixes(value);
    }
  }
  return result;
}
```

**適用箇所**: `convertXmlJsToMaimlRoot()` の先頭で `maimlElement` に対して一度だけ適用する。

```typescript
export function convertXmlJsToMaimlRoot(xmlData: XmlJsMaimlRoot | XmlJsElement): ConversionResult {
  const errorContext = new ErrorContext();
  errorContext.pushPath('maiml');

  try {
    const rawMaimlElement = (xmlData as XmlJsMaimlRoot).maiml || xmlData as XmlJsElement;
    
    // ⭐ 名前空間プレフィックスを一括除去（全変換関数が固定キーでアクセスできるようにする）
    const maimlElement = stripNamespacePrefixes(rawMaimlElement);
    
    // 以降の変換処理は変更なし
    ...
  }
}
```

### Phase 3: 副次原因修正（安定性向上）

- [ ] `PetriNetEditorInner.tsx` の `getDocument()` 呼び出しを `try-catch` で囲む
  - 例外が発生しても `setMethods()` が実行されるようにする

---

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | Phase 1（else追加） + Phase 3（getDocument try-catch） |
| `frontend/src/utils/maimlTypeConverter.ts` | Phase 2（`stripNamespacePrefixes` 関数追加 + `convertXmlJsToMaimlRoot` で適用） |

---

## 技術的詳細

### Phase 1 変更箇所

**対象**: `PetriNetEditorInner.tsx` の `fetchPetriNetData` 関数内、`if (methodsData.length > 0)` ブロック

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

### Phase 2 変更箇所

**対象**: `maimlTypeConverter.ts`

1. `stripNamespacePrefixes` 関数を追加（上記コード参照）
2. `convertXmlJsToMaimlRoot` の先頭で適用

```typescript
// convertXmlJsToMaimlRoot 内
const rawMaimlElement = (xmlData as XmlJsMaimlRoot).maiml || xmlData as XmlJsElement;

// ⭐ 追加: 名前空間プレフィックスを一括除去
const maimlElement = stripNamespacePrefixes(rawMaimlElement);

// 以降は変更なし（maimlElement を使い続ける）
const attrs = maimlElement._attributes || {};
const docElement = maimlElement.document as XmlJsElement | undefined;
const protocolElement = maimlElement.protocol as XmlJsElement | undefined;
...
```

### Phase 3 変更箇所

**対象**: `PetriNetEditorInner.tsx` の `parser.getDocument()` 呼び出し箇所

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

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `stripNamespacePrefixes` が深いネストで無限ループになる | 高 | 低 | Array.isArray チェックで配列を適切に処理。循環参照は xml-js の出力には存在しないため問題なし |
| 異なる名前空間の同名要素（例: `ns1:pnml` と `ns2:pnml`）が同一キーに統合される | 中 | 低 | MAIML では1要素に同名要素が複数の名前空間で存在するケースは想定されない。配列化処理で安全に対応 |
| Phase 1 の fallbackMethod が保存時に空の method として出力される | 低 | 低 | console.warn を追加し、ユーザーへの影響を最小化 |
| Phase 3 の try-catch で getDocument 失敗が隠蔽される | 低 | 低 | console.warn でログに残す |

---

## テスト計画

- [ ] 既存 MAIML ファイルを開いて MethodTabPanel が表示されることを確認
- [ ] 新規作成から編集でも引き続き MethodTabPanel が表示されることを確認（リグレッション確認）
- [ ] 名前空間プレフィックス付き MAIML ファイルでも正常変換されることを確認
- [ ] ブラウザのコンソールに以下のログが出ないことを確認（正常変換の場合）
  ```
  ⚠️ [ConversionError] protocol.method[0]: Failed to convert method at index 0
  ```
- [ ] `stripNamespacePrefixes` の単体テスト
  - プレフィックスありのオブジェクト → プレフィックス除去後に正しく変換されるか
  - `_text`, `_attributes` などの内部キーが変換されないか
  - 配列を含むオブジェクトが正しく処理されるか

---

## 調査関連ドキュメント

- [調査レポート](REPORT.md)

---

## 承認記録

- **計画書提示日時**: 2026-03-27 13:22
- **更新日時**: 2026-03-27 13:30（pnml以外の全変換関数の名前空間対応を計画に追加）
- **承認日時**: 
- **承認者コメント**: 

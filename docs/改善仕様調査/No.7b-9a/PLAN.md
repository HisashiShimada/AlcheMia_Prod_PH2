# タスク計画書: MAIMLパースエラーをValidationPanelに表示する

## メタデータ
- **作成日時**: 2026-03-30 09:00
- **タスクID**: maiml-parse-error-validation-panel
- **優先度**: 中
- **推定工数**: 約1〜1.5時間（Phase 0〜2）

## タスク概要

`test_data/test0327.maiml` のように、MAIMLファイルにタイポ（例: `<protcol>` → `<protocol>`）などの想定外タグが含まれている場合、編集画面を開くと空のReactFlowが表示されるだけでエラー内容がユーザーに全く伝わらない。

本タスクでは以下の2点を実装する：
1. **未知タグの情報保持**: 変換できないタグを捨てずに `unknownElements` として保持する
2. **ValidationPanelへの表示**: パースエラー → error、未知タグ → warning として ValidationPanel に表示する

## 根本原因（調査済み）

### 現状の変換フロー

```
XML文字列
  ↓ MaimlParserTyped コンストラクタ（maimlParserTyped.ts）
  ↓   xml-js.xml2js() でパース
  ↓   convertXmlJsToMaimlRoot() を呼び出す
  ↓     → ConversionResult { data, errors, hasErrors, hasWarnings } を返す
  ↓   conversionResult.data だけを this.typedMaiml に保持
  ↓   conversionResult.errors は console.warn するだけで捨てられる  ← 問題①
  ↓
getMethods() 呼び出し
  ↓ <protcol> タイポ → protocol が空 → methods = []
  ↓
PetriNetEditorInner の fetchPetriNetData（PetriNetEditorInner.tsx）
  ↓ methods.length === 0 → フォールバック処理
  ↓   generateInitialMethod() でダミーmethodを生成
  ↓   setMethods([fallbackMethod])
  ↓   setValidationResult() を呼ばない  ← 問題②
  ↓
ValidationPanel には何も表示されない → 空のReactFlowのみ表示
```

### 問題①: `ConversionError` の情報が捨てられている

`maimlTypeConverter.ts` には既に `ConversionError` 型と `ConversionResult` が実装済み：
```typescript
export interface ConversionError {
  path: string;      // 例: "maiml.protocol"
  element: string;   // 例: "protcol"
  message: string;
  level: 'warning' | 'error';
  originalError?: Error;
}
export interface ConversionResult {
  data: MaimlRoot;
  errors: ConversionError[];
  hasErrors: boolean;
  hasWarnings: boolean;
}
```

`MaimlParserTyped` のコンストラクタは `conversionResult.errors` を `console.warn` するだけで、外部から取得できない。

### 問題②: フォールバック処理が ValidationPanel に連携していない

`PetriNetEditorInner.tsx` のフォールバック処理（methods.length === 0 時）：
```typescript
// 現状（問題あり）
console.warn('⚠️ [fetchPetriNetData] MAIMLのmethod取得件数が0 - フォールバック処理');
const fallbackMethod = generateInitialMethod(`method_${Date.now()}`);
setMethods([fallbackMethod]);
setActiveMethodIndex(0);
// setValidationResult() が呼ばれない → ValidationPanel が開かない
```

### 問題③: 未知タグが完全に消える

`convertXmlJsToMaimlRoot` は `maimlElement.document`, `maimlElement.protocol` 等の既知キーのみ処理し、`protcol` のような未知キーを無視・破棄している。

---

## 実装ステップ

### Phase 0: 未知タグ情報の保持（型拡張 + 収集ロジック）

**目的**: 変換できないタグを捨てずに保持し、警告として伝達できるようにする

#### Phase 0-1: 型定義に `unknownElements` フィールドを追加

**対象ファイル**: `frontend/src/types/maiml-unified.ts`

対象の型（`MaimlRoot`, `Protocol`, `Method`）に以下を追加：
```typescript
/** 変換できなかった未知のXML要素（キー: タグ名, 値: xml-jsオブジェクト） */
unknownElements?: Record<string, any>;
```

#### Phase 0-2: 未知タグ収集ロジックを追加

**対象ファイル**: `frontend/src/utils/maimlTypeConverter.ts`

`convertXmlJsToMaimlRoot` の `result` 構築部分に追加：
```typescript
// maimlElement の既知キー以外を unknownElements に収集
const knownMaimlKeys = ['document', 'protocol', 'data', 'eventLog', '_attributes', '_text'];
const unknownElements: Record<string, any> = {};
Object.keys(maimlElement).forEach(key => {
  if (!knownMaimlKeys.includes(key)) {
    unknownElements[key] = maimlElement[key];
    errorContext.addError(key, `Unknown element "<${key}>" found (preserved in unknownElements)`, 'warning');
  }
});
// MaimlRoot に格納
if (Object.keys(unknownElements).length > 0) {
  result.unknownElements = unknownElements;
}
```

`convertProtocol` / `convertMethod` にも同様のロジックを追加（既知キーリストはそれぞれ異なる）。

---

### Phase 1: `MaimlParserTyped` に ConversionErrors の保持・公開を追加

**対象ファイル**: `frontend/src/utils/maimlParserTyped.ts`

#### 変更内容

1. フィールド追加（クラス冒頭）：
```typescript
private conversionErrors: import('./maimlTypeConverter').ConversionError[] = [];
```

2. コンストラクタの変換部分を修正（`conversionResult.errors` を保持）：
```typescript
const conversionResult = convertXmlJsToMaimlRoot(xmlData);
this.typedMaiml = conversionResult.data;
this.conversionErrors = conversionResult.errors; // ← 追加（捨てずに保持）
// 以下の console.warn は維持
```

3. 公開メソッドを追加：
```typescript
/** 変換エラー・警告を取得 */
getConversionErrors(): ConversionError[] {
  return this.conversionErrors;
}

/** 変換エラー（level: 'error'）が1件以上あるか */
hasConversionErrors(): boolean {
  return this.conversionErrors.some(e => e.level === 'error');
}

/** 変換警告（level: 'warning'）が1件以上あるか */
hasConversionWarnings(): boolean {
  return this.conversionErrors.some(e => e.level === 'warning');
}
```

---

### Phase 2: `PetriNetEditorInner` のフォールバック処理に ValidationPanel 連携を追加

**対象ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

#### 変更箇所

`fetchPetriNetData` 内の methods.length === 0 フォールバック部分を以下のように変更：

```typescript
// 現状
console.warn('⚠️ [fetchPetriNetData] MAIMLのmethod取得件数が0 - フォールバック処理');
const fallbackMethod = generateInitialMethod(`method_${Date.now()}`);
setMethods([fallbackMethod]);
setActiveMethodIndex(0);

// ↓ 変更後
console.warn('⚠️ [fetchPetriNetData] MAIMLのmethod取得件数が0 - フォールバック処理');
const fallbackMethod = generateInitialMethod(`method_${Date.now()}`);
setMethods([fallbackMethod]);
setActiveMethodIndex(0);

// パースエラー・警告があれば ValidationPanel に表示
const conversionErrors = parser.getConversionErrors();
if (conversionErrors.length > 0) {
  const parseValidationResult: AnalysisResult = {
    fileKey: maimlData?.fileKey || '',
    isValid: !parser.hasConversionErrors(),
    errors: conversionErrors.map(err => ({
      type: err.level === 'error' ? 'PARSE_ERROR' : 'PARSE_WARNING',
      severity: err.level === 'error' ? 'error' : 'warning',  // ← エラー/警告を区別
      message: err.message,
      details: `パス: ${err.path} / 要素: ${err.element}`,
      path: err.path
    }))
  };
  setValidationResult(parseValidationResult);
  setTimeout(() => {
    setValidationPanelOpen(true);  // ValidationPanel を自動オープン
  }, 0);
}
```

**ポイント**:
- `ConversionError.level === 'error'` → `severity: 'error'`（赤表示）
- `ConversionError.level === 'warning'`（未知タグ含む）→ `severity: 'warning'`（黄表示）
- フォールバック method の設定は引き続き行う（空 ReactFlow でも操作できるよう維持）

---

## 変更ファイル一覧

| # | ファイル | 変更内容 | 規模 |
|---|---------|---------|------|
| 1 | `frontend/src/types/maiml-unified.ts` | `MaimlRoot` / `Protocol` / `Method` に `unknownElements?: Record<string, any>` 追加 | 3行追加 |
| 2 | `frontend/src/utils/maimlTypeConverter.ts` | `convertXmlJsToMaimlRoot` / `convertProtocol` / `convertMethod` に未知タグ収集ロジック追加 | 30〜40行追加 |
| 3 | `frontend/src/utils/maimlParserTyped.ts` | `conversionErrors` フィールド・3メソッド追加 | 20行追加 |
| 4 | `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | フォールバック処理に ValidationPanel 連携追加 | 15〜20行追加 |

---

## 影響範囲

- **影響を受ける機能**: MAIMLファイル編集画面（パースエラー・未知タグが存在する場合のみ）
- **影響なし**: 正常なMAIMLファイルの表示・編集・保存フロー
- **既存バリデーション機能**: 変更なし（既存の ValidationPanel をそのまま再利用）
- **後方互換性**: `unknownElements` はオプショナル（`?`）のため既存コードへの影響なし

---

## 期待される表示結果（test0327.maiml の場合）

ValidationPanel に以下が表示される：

| 種別 | 内容 |
|------|------|
| ⚠️ 警告 | `Unknown element "<protcol>" found (preserved in unknownElements)` / パス: `maiml` |
| ❌ エラー | `Protocol element is required but missing` / パス: `maiml` / 要素: `protocol` |
| ❌ エラー | `protocol/methodセクションが見つかりません`（validateForExperimentManager相当） |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `AnalysisResult` の `errors` 型に `severity` フィールドが存在しない可能性 | 中 | 中 | 実装前に `AnalysisResult` / `ErrorContent` 型を確認して適合させる |
| `ValidationPanel` の自動オープンが既存フローと干渉 | 低 | 低 | 自動オープンはフォールバック処理時のみ（既存の正常フローは変更しない） |
| `convertProtocol` / `convertMethod` の既知キーリストが不完全 | 低 | 低 | 実装時に各関数で使用しているキー名を洗い出して既知キーリストを構築 |

---

## テスト計画

- [ ] `test_data/test0327.maiml`（`<protcol>` タイポあり）で編集画面を開き、ValidationPanel が自動オープンされることを確認
- [ ] ValidationPanel にエラー（赤）と警告（黄）が区別されて表示されることを確認
- [ ] 正常な MAIML ファイルでは ValidationPanel が自動オープンされないことを確認
- [ ] フォールバック ReactFlow は引き続き表示されることを確認（空でも操作可能）

---

## 承認記録

- **計画書提示日時**: 2026-03-30 09:05
- **承認日時**: （承認後に記入）
- **承認者コメント**:

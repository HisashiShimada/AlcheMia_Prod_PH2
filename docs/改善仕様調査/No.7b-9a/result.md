# 実装結果: MAIMLパースエラーをValidationPanelに表示する

## メタデータ
- **実施日時**: 2026-03-30
- **タスクID**: maiml-parse-error-validation-panel
- **対応PLAN**: `docs/改善仕様調査/No.7b-9a/PLAN.md`

---

## 概要

MAIMLファイルにタイポ（例: `<protcol>`）などの未知タグが含まれる場合、編集画面を開くと空のReactFlowが表示されるだけでエラー内容がユーザーに全く伝わらなかった問題を修正した。

あわせて、正常なMAIMLファイルを開いたときにローディングスピナーが消えない不具合（`setIsLoading(false)` が `finally` に入っていなかった）も同時に修正した。

---

## 修正ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/types/maiml-unified.ts` | `MaimlRoot` / `Protocol` / `Method` 型に `unknownElements?: Record<string, any>` を追加 |
| 2 | `frontend/src/utils/maimlTypeConverter.ts` | `convertXmlJsToMaimlRoot` / `convertProtocol` / `convertMethod` に未知タグ収集ロジック追加 |
| 3 | `frontend/src/utils/maimlParserTyped.ts` | `conversionErrors` フィールドと `getConversionErrors()` / `hasConversionErrors()` / `hasConversionWarnings()` メソッドを追加 |
| 4 | `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | フォールバック処理への ValidationPanel 連携追加 + `setIsLoading(false)` を `finally` ブロックへ移動 |

---

## 各フェーズの実装詳細

### Phase 0: 未知タグ情報の保持

#### `frontend/src/types/maiml-unified.ts`

`MaimlRoot`, `Protocol`, `Method` の各型に以下を追加した：

```typescript
/** 変換できなかった未知のXML要素（キー: タグ名, 値: xml-jsオブジェクト） */
unknownElements?: Record<string, any>;
```

オプショナル（`?`）のため既存コードへの影響はない。

#### `frontend/src/utils/maimlTypeConverter.ts`

各コンバータ関数（`convertXmlJsToMaimlRoot`, `convertProtocol`, `convertMethod`）に、既知キー以外を `unknownElements` に収集するロジックを追加した。

```typescript
// 例: convertXmlJsToMaimlRoot 内
const knownMaimlKeys = ['document', 'protocol', 'data', 'eventLog', '_attributes', '_text'];
const unknownElements: Record<string, any> = {};
Object.keys(maimlElement).forEach(key => {
  if (!knownMaimlKeys.includes(key)) {
    unknownElements[key] = maimlElement[key];
    // warning レベルの ConversionError を生成
    errors.push({
      path: 'maiml',
      element: key,
      message: `Unknown element "<${key}>" found (preserved in unknownElements)`,
      level: 'warning',
    });
  }
});
if (Object.keys(unknownElements).length > 0) {
  result.unknownElements = unknownElements;
}
```

`<protcol>` のようなタイポタグは `warning` として記録される。

---

### Phase 1: MaimlParserTyped への ConversionErrors 公開

#### `frontend/src/utils/maimlParserTyped.ts`

1. **フィールド追加**:
```typescript
private conversionErrors: ConversionError[] = [];
```

2. **コンストラクタ修正**（`conversionResult.errors` を捨てずに保持）:
```typescript
const conversionResult = convertXmlJsToMaimlRoot(xmlData);
this.typedMaiml = conversionResult.data;
this.conversionErrors = conversionResult.errors; // 追加
```

3. **公開メソッド追加**:
```typescript
getConversionErrors(): ConversionError[] {
  return this.conversionErrors;
}

hasConversionErrors(): boolean {
  return this.conversionErrors.some(e => e.level === 'error');
}

hasConversionWarnings(): boolean {
  return this.conversionErrors.some(e => e.level === 'warning');
}
```

---

### Phase 2: PetriNetEditorInner のフォールバック処理への連携

#### `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

**変更箇所1: フォールバック処理に ValidationPanel 連携を追加**

`methods.length === 0` のフォールバック分岐に以下を追記した：

```typescript
// パースエラー・警告があれば ValidationPanel に表示
const convErrors = parser.getConversionErrors();
if (convErrors.length > 0) {
  // type を 'unknown_element' にして非致命的エラー扱いにする
  // ('syntax_error' にすると criticalTypes に該当して画面が操作不能になるため)
  const errorContents = convErrors
    .filter(e => e.level === 'error')
    .map(e => ({
      type: 'unknown_element',
      severity: 'error' as const,
      message: `[${e.path}.${e.element}] ${e.message}`,
    }));
  const warningContents = convErrors
    .filter(e => e.level === 'warning')
    .map(e => ({
      type: 'unknown_element',
      severity: 'warning' as const,
      message: `[${e.path}.${e.element}] ${e.message}`,
    }));
  const conversionValidationResult: AnalysisResult = {
    fileKey: '',
    isValid: errorContents.length === 0,
    errors: errorContents,
    warnings: warningContents,
    autoCorrections: [],
  };
  setValidationResult(conversionValidationResult);
  setTimeout(() => {
    setValidationPanelOpen(true); // ValidationPanel を自動オープン
  }, 0);
}
```

- `error` → ValidationPanel に赤表示
- `warning`（未知タグ含む）→ ValidationPanel に黄表示
- フォールバック ReactFlow（空の編集画面）は引き続き表示（既存動作を維持）

**変更箇所2: ローディング不具合の修正（バグ修正）**

`setIsLoading(false)` が catch ブロックのみにあり、正常ケースでローディングが解除されない不具合を修正した。

```diff
  } catch (err: unknown) {
    ...
-   setIsLoading(false);  // catch 内にのみあった
    ...
  } finally {
-   isLoadingRef.current = false;
+   // 正常・エラー問わず必ず実行
+   setIsLoading(false);
+   isLoadingRef.current = false;
  }
```

`finally` ブロックで `setIsLoading(false)` を呼ぶことで、すべてのコードパスでローディングが確実に解除される。

---

## 実装上の注意点

### `type: 'unknown_element'` を使用した理由

`ValidationPanel` には致命的エラーと非致命的エラーの分類処理がある：

```typescript
const criticalTypes = ['syntax_error', 'invalid_structure'];
```

`syntax_error` を使うと `criticalErrors` に分類され、ReactFlow 全体が「致命的エラー画面」に置き換わって操作不能になる。  
`unknown_element` を使うことで非致命的エラー（警告バナー表示）として扱い、フォールバック ReactFlow を維持したまま ValidationPanel にエラー内容を表示できる。

### `handleOpenValidationPanel` との共存

ValidationPanel を開く既存の API 呼び出しルート（`handleOpenValidationPanel`）には以下の早期リターン処理を追加した：

```typescript
// フォールバック由来の変換エラーが既にある場合はAPIを呼ばずそのまま表示
if (validationResult && validationResult.errors?.some(e => e.type === 'unknown_element')) {
  setValidationPanelOpen(true);
  return;
}
```

これにより、未知タグ起因のエラーは API バリデーションをスキップして変換エラーをそのまま再表示する。

---

## 動作確認ポイント

| ケース | 期待動作 |
|--------|---------|
| `<protcol>` タイポあり MAIML を開く | ValidationPanel が自動オープン。`[maiml.protcol] Unknown element...` が警告（黄）表示 |
| `<protocol>` が完全に欠落した MAIML を開く | ValidationPanel にエラー（赤）表示 |
| 正常な MAIML を開く | ValidationPanel は自動オープンしない。ローディングが正常に解除される |
| フォールバック後にツールバーの「検証」ボタンを押す | 変換エラー結果を再利用（API は呼ばない） |

---

## 残課題・制限事項

- `convertProtocol` / `convertMethod` の既知キーリストは現時点の実装ベースで構築しており、将来 MAIML 仕様が拡張された場合は既知キーリストの更新が必要
- `unknownElements` フィールドは型定義に追加されているが、現時点では ValidationPanel 表示以外の用途（保存・編集時の保持など）には利用していない

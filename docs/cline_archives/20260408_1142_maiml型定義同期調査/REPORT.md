# MAIML型定義・型変換ユーティリティ 同期状況調査レポート

- **調査日時**: 2026-04-08 11:42
- **調査対象ファイル（6ファイル）**:

| # | ファイル | 行数 | バージョン |
|---|---------|------|---------|
| 1 | `backend/src/types/maiml-unified.ts` | 1225行 | 1.0.0 (2026-02-02) |
| 2 | `frontend/src/types/maiml-unified.ts` | 1248行 | 1.0.0 (2026-02-02) |
| 3 | `backend/src/utils/maimlTypeConverter.ts` | 811行 | **1.0.0** (2026-02-02) |
| 4 | `frontend/src/utils/maimlTypeConverter.ts` | 1403行 | **2.0.0** (2026-02-24) |
| 5 | `backend/src/utils/maimlParserTyped.ts` | 988行 | 1.0.0 (2026-02-02) |
| 6 | `frontend/src/utils/maimlParserTyped.ts` | 1046行 | 1.0.0 (2026-02-02) |

---

## 1. 概要

3組のファイルペアすべてで、フロントエンドとバックエンドに差分が存在する。  
最も深刻な差分は **`maimlTypeConverter.ts`** のバージョン乖離（backend: v1.0.0 / frontend: v2.0.0）。  
`maimlParserTyped.ts` はそれに依存しているため、バックエンド側は間接的に古い変換ロジックを使い続けている状態。

---

## 2. `maiml-unified.ts` の差分（型定義ファイル）

### 2-1. フロントエンドのみに存在するフィールド

| インターフェース | フィールド | 説明 |
|---------------|-----------|------|
| `Place` | `position?: { x: number; y: number }` | PetriNetノード座標（MAIMLの `<position x y />` 要素対応） |
| `Transition` | `position?: { x: number; y: number }` | PetriNetノード座標（MAIMLの `<position x y />` 要素対応） |
| `Method` | `unknownElements?: Record<string, any>` | 変換できなかった未知のXML要素を保持 |
| `Protocol` | `unknownElements?: Record<string, any>` | 変換できなかった未知のXML要素を保持 |
| `MaimlRoot` | `unknownElements?: Record<string, any>` | 変換できなかった未知のXML要素を保持 |

フロントエンドのみに存在するファイルレベルの宣言：

| 種別 | 内容 |
|------|------|
| import文 | `import { Dayjs } from "dayjs"` （型定義内では実際に未使用） |
| ESLint directive | `/* eslint-disable @typescript-eslint/no-explicit-any */` |

### 2-2. バックエンドのみに存在する要素

| 種別 | インターフェース | 内容 |
|------|---------------|------|
| コメント | `Property.attributes` フィールド | `// ============================================================================`<br>`// XML属性（id、ref、カスタム属性用）★ フロントから同期` という注釈 |

（機能差分なし・管理メモのみ）

### 2-3. diff形式の差分

#### Place インターフェース
```diff
  export interface Place {
    id: string;
    uuid?: string;
    name?: string;
    description?: string;
    annotation?: string;
+   /** ノード座標（MAIMLの <position x y /> 要素から読み込み・書き出し） */
+   position?: { x: number; y: number };
  }
```

#### Transition インターフェース
```diff
  export interface Transition {
    id: string;
    uuid?: string;
    name?: string;
    description?: string;
    annotation?: string;
+   /** ノード座標（MAIMLの <position x y /> 要素から読み込み・書き出し） */
+   position?: { x: number; y: number };
  }
```

#### Method インターフェース
```diff
  export interface Method {
    // ... （他フィールドは同一）
    materialTemplates: Template[];
    conditionTemplates: Template[];
    resultTemplates: Template[];
+   /** 変換できなかった未知のXML要素（キー: タグ名, 値: xml-jsオブジェクト） */
+   unknownElements?: Record<string, any>;
  }
```

#### Protocol インターフェース
```diff
  export interface Protocol {
    // ... （他フィールドは同一）
    materialTemplates: Template[];
    conditionTemplates: Template[];
    resultTemplates: Template[];
+   /** 変換できなかった未知のXML要素（キー: タグ名, 値: xml-jsオブジェクト） */
+   unknownElements?: Record<string, any>;
  }
```

#### MaimlRoot インターフェース
```diff
  export interface MaimlRoot {
    // ... （他フィールドは同一）
    data?: Data;
    eventLog?: EventLog;
+   /** 変換できなかった未知のXML要素（キー: タグ名, 値: xml-jsオブジェクト） */
+   unknownElements?: Record<string, any>;
  }
```

---

## 3. `maimlTypeConverter.ts` の差分（変換ユーティリティ）

### 3-1. バージョン・基本情報

| 項目 | backend (v1.0.0) | frontend (v2.0.0) |
|------|-----------------|------------------|
| バージョン | 1.0.0 | **2.0.0** |
| 更新日 | 2026-02-02 | **2026-02-24** |
| 行数 | 811行 | **1403行** |
| `convertXmlJsToMaimlRoot` 戻り値型 | `MaimlRoot`（直接返却） | `ConversionResult`（エラー情報付き） |
| 名前空間プレフィックス除去 | **なし** | `stripNamespacePrefixes()` あり |
| タグ大文字小文字正規化 | **なし** | `normalizeTagCase()` あり |
| エラー収集機能 | **なし** | `ErrorContext` クラスあり |
| 未知要素収集 | **なし** | `unknownElements` 収集あり |
| `position` フィールド変換 | **なし** | `convertPlace` / `convertTransition` に実装あり |
| エラーハンドリング付き配列変換 | `convertArray()` のみ | `convertArraySafe()` も追加 |

### 3-2. `convertXmlJsToMaimlRoot` 関数のシグネチャ差分

**バックエンド（v1.0.0）**:
```typescript
export function convertXmlJsToMaimlRoot(xmlData: XmlJsMaimlRoot | XmlJsElement): MaimlRoot {
  // → MaimlRoot を直接返却
  // → Document/Protocol がなければ throw
  // → 名前空間プレフィックス除去なし
  // → タグ大文字小文字正規化なし
}
```

**フロントエンド（v2.0.0）**:
```typescript
export function convertXmlJsToMaimlRoot(xmlData: XmlJsMaimlRoot | XmlJsElement): ConversionResult {
  // → ConversionResult { data: MaimlRoot, errors, hasErrors, hasWarnings } を返却
  // → Document/Protocol がなくても空オブジェクトでフォールバック
  // → stripNamespacePrefixes() で名前空間プレフィックスを除去
  // → normalizeTagCase() でタグ名を小文字化
}
```

### 3-3. フロントエンドのみに存在するクラス・関数・型

| 名前 | 種別 | 説明 |
|------|------|------|
| `ConversionError` | interface | エラー情報（path, element, message, level, originalError） |
| `ConversionResult` | interface | 変換結果（data: MaimlRoot, errors, hasErrors, hasWarnings） |
| `ErrorContext` | class | エラー収集・パス管理（pushPath, popPath, addError 等） |
| `stripNamespacePrefixes()` | function (export) | xml-jsオブジェクトキーから名前空間プレフィックスを再帰的に除去 |
| `normalizeTagCase()` | function (export) | タグ名キーを再帰的に小文字化（大文字小文字差異を吸収） |
| `warnUnknownKeys()` | function (private) | 未知キーをwarningとして収集する共通ヘルパー |
| `createErrorResult()` | function (private) | エラー時の ConversionResult 生成 |
| `createEmptyMaimlRoot()` | function (private) | エラー時のフォールバック MaimlRoot 生成 |
| `createEmptyDocument()` | function (private) | エラー時のフォールバック Document 生成 |
| `createEmptyProtocol()` | function (private) | エラー時のフォールバック Protocol 生成 |
| `convertArraySafe()` | function (private) | エラーハンドリング付き配列変換（失敗要素はスキップ） |

### 3-4. XML要素キー名の扱いの差分

バックエンドはキー名をそのまま（PascalCase）で参照しているが、フロントエンドは `normalizeTagCase()` で小文字化した後にアクセスしている。

| 変換対象 | backend (v1.0.0) キー参照 | frontend (v2.0.0) キー参照 |
|---------|-------------------------|--------------------------|
| materialTemplate | `xmlProtocol.materialTemplate` | `(xmlProtocol as any).materialtemplate` |
| conditionTemplate | `xmlMethod.conditionTemplate` | `xmlMethod.conditiontemplate` |
| transitionRef | `xmlInstruction.transitionRef` | `xmlInstruction.transitionref` |
| vendorRef (Creator) | `xmlCreator.vendorRef` | `(xmlCreator as any).vendorref` |
| placeRef (Template) | `xmlTemplate.placeRef` | `xmlTemplate.placeref` |
| creatorRef (Log) | `xmlLog.creatorRef` | `xmlLog.creatorref` |
| instanceRef (Material等) | `xmlMaterial.instanceRef` | `xmlMaterial.instanceref` |
| eventLog (root) | `maimlElement.eventLog` | `maimlElement.eventlog` |

### 3-5. `convertInsertion` の差分

**バックエンド（v1.0.0）** ─ 子要素形式に対応済み:
```typescript
uri: xmlInsertion.uri?._text || xmlInsertion._attributes?.uri || '',
format: xmlInsertion.format?._text || xmlInsertion._attributes?.format
// ↑ 子テキスト要素（<uri>...</uri>）と属性形式（uri="..."）の両方に対応
```

**フロントエンド（v2.0.0）** ─ 属性形式のみ:
```typescript
uri: xmlInsertion._attributes?.uri || '',
format: xmlInsertion._attributes?.format
// ↑ 属性形式のみ（子テキスト要素に未対応）
```

> ⚠️ `convertInsertion` に関してはバックエンドの方が対応範囲が広い（フロントエンドに反映すべき）。

---

## 4. `maimlParserTyped.ts` の差分（パーサークラス）

### 4-1. 基本情報

| 項目 | backend | frontend |
|------|---------|---------|
| import元 | `'./maimlTypeConverter'` | `'./maimlTypeConverter'` |
| `TemplatesByCategory` 型のimport元 | ファイル内でローカル定義 | `'@/types/editor'` からimport |
| `ConversionError` のimport | **なし** | `import type { ConversionError } from './maimlTypeConverter'` |

### 4-2. クラスフィールドの差分

**バックエンドのみ**:
```typescript
export class MaimlParserTyped {
  private typedMaiml: MaimlRoot;
  // (maimlStringフィールドなし)
  // (conversionErrorsフィールドなし)
```

**フロントエンドのみ**:
```typescript
export class MaimlParserTyped {
  private typedMaiml: MaimlRoot;
  private maimlString: string | null = null;  // ← フロントのみ
  private conversionErrors: ConversionError[] = [];  // ← フロントのみ
```

### 4-3. コンストラクタの差分

**バックエンド（旧）**:
```typescript
constructor(maimlData: string | XmlJsMaimlRoot | XmlJsElement) {
  // maimlStringを保存しない
  // ...
  // convertXmlJsToMaimlRoot は MaimlRoot を直接返却
  this.typedMaiml = convertXmlJsToMaimlRoot(xmlData);
  console.log('✅ [MaimlParserTyped] 型変換成功');
}
```

**フロントエンド（新）**:
```typescript
constructor(maimlData: string | XmlJsMaimlRoot | XmlJsElement) {
  if (typeof maimlData === 'string') {
    this.maimlString = maimlData;  // ← 文字列を保存
  }
  // ...
  // convertXmlJsToMaimlRoot は ConversionResult を返却
  const conversionResult = convertXmlJsToMaimlRoot(xmlData);
  this.typedMaiml = conversionResult.data;  // ← .data から取得
  this.conversionErrors = conversionResult.errors;  // ← エラーを保存
  // ← エラー・警告をログ出力する処理
}
```

### 4-4. フロントエンドのみに存在するメソッド

| メソッド | 説明 |
|---------|------|
| `getConversionErrors(): ConversionError[]` | 型変換エラー・警告の一覧を取得 |
| `hasConversionErrors(): boolean` | error レベルの変換エラーが存在するか |
| `hasConversionWarnings(): boolean` | warning レベルの変換警告が存在するか |

### 4-5. `getTemplates()` / `collectTemplates()` の差分

**バックエンド**: `collectTemplates(templates, type, result)` ─ methodId引数なし
```typescript
private collectTemplates(
  templates: Template | Array<Template>,
  _type: 'material' | 'condition' | 'result',
  result: Array<Template>
): void {
  // templateをそのままpush
  result.push(template);
}
```

**フロントエンド**: `collectTemplates(templates, type, result, methodId)` ─ methodIdを付与
```typescript
private collectTemplates(
  templates: Template | Array<Template>,
  type: 'material' | 'condition' | 'result',
  result: Array<Template>,
  methodId: string | null | undefined = undefined  // ← 追加引数
): void {
  // template.methodIdが未設定の場合にmethodIdを付与してpush
  if (template.methodId === undefined) {
    result.push({ ...template, methodId: methodId ?? undefined });
  } else {
    result.push(template);
  }
}
```

また `getTemplates()` 呼び出し側も、フロントエンドではprotocol直下テンプレートに `null`、method内テンプレートに `method.id` を引数で渡している。

### 4-6. `getInstructionByTransitionId` の差分

**バックエンド**: メソッドとして実装（正常に動作）
```typescript
getInstructionByTransitionId(transitionId: string): Instruction | null {
  // ...
  const instruction = program.instructions.find(i =>
    i.transitionRef.ref === transitionId  // ← 正しい比較
  );
}
```

**フロントエンド**: `getInstructionIdByTransitionId` のみ（バグあり）
```typescript
getInstructionIdByTransitionId(transitionId: string): string {
  // ...
  const instruction = instructions.find(i => {
    i.transitionRef.ref === transitionId;  // ← バグ: 式文になっており常に undefined を返す（return なし）
  });
}
```

> ⚠️ **フロントエンドにバグがある**: `find` のコールバック内が `return` なし（アロー関数の波括弧問題）。バックエンドの実装が正しく、フロントエンドに反映すべき。

### 4-7. `TemplatesByCategory` の定義場所

| ファイル | 定義場所 |
|---------|---------|
| backend/src/utils/maimlParserTyped.ts | ファイル内でローカル定義（`export interface TemplatesByCategory`）|
| frontend/src/utils/maimlParserTyped.ts | `@/types/editor` からimport |

### 4-8. `determineTransitionCategory` 引数名の差分

| 引数 | backend | frontend |
|------|---------|---------|
| 第2引数 | `_methodIndex` (アンダースコア: 未使用を明示) | `methodIndex` (アンダースコアなし) |
| 第3引数 | `_totalTransitions` (アンダースコア: 未使用を明示) | `totalTransitions` (アンダースコアなし) |

（動作差異なし・命名スタイルの違いのみ）

---

## 5. 差分の重大度まとめ

| 比較対象 | 深刻度 | 件数 | 主な差分 |
|---------|-------|------|---------|
| `maiml-unified.ts` | ⚠️ 中 | 5点 | Place/Transition の `position` フィールド欠落、3インターフェースの `unknownElements` フィールド欠落 |
| `maimlTypeConverter.ts` | 🔴 大 | 多数 | v1.0.0 vs v2.0.0（エラーハンドリング、名前空間除去、タグ大文字小文字正規化などが未移植） |
| `maimlParserTyped.ts` | ⚠️ 中 | 5点 | `conversionErrors` フィールドなし、`ConversionResult` API未対応、`getInstructionByTransitionId` メソッドの差異、`collectTemplates` の methodId 付与なし |

---

## 6. バグ・互換性問題

### 6-1. バックエンドのバグ

| ファイル | 内容 |
|---------|------|
| `maimlParserTyped.ts` コンストラクタ | `convertXmlJsToMaimlRoot` が v1.0.0 で `MaimlRoot` を直接返却するため、フロントエンドの v2.0.0 とシグネチャが不一致。フロントとバックでソースを共有しようとすると型エラーになる。 |
| `maimlTypeConverter.ts` | `normalizeTagCase` がないため `<Protocol>` や `<MaterialTemplate>` など PascalCase のタグを含む MAIML をパースするとキーが見つからずに空配列になる可能性がある。 |
| `maimlTypeConverter.ts` | `eventLog` キーが `maimlElement.eventLog` と PascalCase で参照されているため、`normalizeTagCase` なしでは `<eventLog>` タグしかパースできない（`<EventLog>` は取りこぼす）。 |

### 6-2. フロントエンドのバグ

| ファイル | 内容 |
|---------|------|
| `maimlParserTyped.ts` `getInstructionIdByTransitionId` | `find` コールバックで `return` が欠落しており、常に `undefined` が返るバグがある。 |
| `maimlTypeConverter.ts` `convertInsertion` | `<uri>` や `<format>` が子テキスト要素として記述された MAIML に未対応（バックエンド v1.0.0 は対応済み）。 |

---

## 7. 対応方針（案）

### 優先度：高

1. **`maimlTypeConverter.ts` の同期**（フロントエンド v2.0.0 → バックエンドに反映）
   - `stripNamespacePrefixes()` / `normalizeTagCase()` を追加
   - `ErrorContext` クラスとエラーハンドリング機能を追加
   - `convertXmlJsToMaimlRoot` の戻り値を `ConversionResult` に変更
   - `position` フィールドの変換処理（`convertPlace`, `convertTransition`）を追加
   - `unknownElements` 収集処理を追加
   - `convertArraySafe()` ヘルパーを追加
   - `warnUnknownKeys()` ヘルパーを追加
   - ⚠️ ただし `convertInsertion` はバックエンド版（子テキスト要素対応）の方が優秀なため、フロントにも反映すること

2. **`maiml-unified.ts` の同期**（フロントエンド → バックエンドに反映）
   - `Place.position`, `Transition.position` を追加
   - `Method.unknownElements`, `Protocol.unknownElements`, `MaimlRoot.unknownElements` を追加
   - `import { Dayjs }` と `eslint-disable` はフロントエンド固有のため追加不要

3. **`maimlParserTyped.ts` のバックエンド側更新**
   - `maimlString` フィールドを追加
   - `conversionErrors` フィールドを追加し、`ConversionError` 型をimport
   - コンストラクタを `ConversionResult` API に対応（`.data` から MaimlRoot を取得）
   - `getConversionErrors()`, `hasConversionErrors()`, `hasConversionWarnings()` メソッドを追加
   - `collectTemplates()` に `methodId` 引数を追加し、templateに付与する処理を追加
   - `getInstructionByTransitionId()` メソッドをフロントにも追加（またはフロントのバグを修正）

### 優先度：中

4. **フロントエンドのバグ修正**
   - `maimlParserTyped.ts` `getInstructionIdByTransitionId` の `find` コールバックに `return` を追加
   - `maimlTypeConverter.ts` `convertInsertion` をバックエンド版に合わせて子テキスト要素対応を追加

5. **フロントエンドの不要 import 削除**
   - `import { Dayjs } from "dayjs"` を削除（未使用）

---

## 8. XSD属性/要素の区分け調査

### 8-1. 調査概要

XSD定義と `maimlTypeConverter.ts` の実装を照合し、**XMLの属性（`xs:attribute`）と要素（`xs:element`）の区分けが正しく実装されているか**を確認した。

xml-jsライブラリではパース結果の以下のルールに従う：
- XML **属性** → `obj._attributes.xxx` でアクセス
- XML **子テキスト要素** → `obj.xxx._text` でアクセス
- XML **子オブジェクト要素** → `obj.xxx` でアクセス

---

### 8-2. 各型の属性/要素マッピング（XSD仕様）

#### `insertionType`（maiml-core.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `uri` | **要素** (`xs:element`) | `xmlInsertion.uri._text` |
| `hash` | **要素** (`xs:element`) | `xmlInsertion.hash` |
| `uuid` | **要素** (`xs:element`, optional) | `xmlInsertion.uuid._text` |
| `format` | **要素** (`xs:element`, optional) | `xmlInsertion.format._text` |

#### `hashType`（maiml-core.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| テキスト値 | `xs:base64Binary` simpleContent | `xmlHash._text` |
| `method` | **属性** (`xs:attribute`) | `xmlHash._attributes.method` |

#### `extensionType`（maiml-eventLog.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `name` | **属性** (`xs:attribute`, required) | `xmlExt._attributes.name` |
| `prefix` | **属性** (`xs:attribute`, required) | `xmlExt._attributes.prefix` |
| `uri` | **属性** (`xs:attribute`, required) | `xmlExt._attributes.uri` |

#### `classifierType`（maiml-eventLog.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `name` | **属性** (`xs:attribute`, required) | `xmlCls._attributes.name` |
| `scope` | **属性** (`xs:attribute`, required) | `xmlCls._attributes.scope` |
| `keys` | **属性** (`xs:attribute`, required) | `xmlCls._attributes.keys` |

#### `logType` / `traceType` / `eventType`（maiml-eventLog.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `ref` | **属性** (`xs:attribute`, required) | `xmlLog._attributes.ref` |

#### `materialType` / `conditionType` / `resultType`（maiml-data.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `ref` | **属性** (`xs:attribute`, required) | `xmlMat._attributes.ref` |

#### `placeRefType` / `transitionRefType` / その他Ref型（maiml-refTypes.xsd）

`referenceObjectType` を継承：
| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `id` | **属性** (`xs:attribute`, required) | `xmlRef._attributes.id` |
| `ref` | **属性** (`xs:attribute`, required) | `xmlRef._attributes.ref` |
| `name` | **要素** (`xs:element`, optional) | `xmlRef.name._text` |
| `description` | **要素** (`xs:element`, optional) | `xmlRef.description._text` |
| `initialMarking` | **属性** (`xs:attribute`, optional, placeRefのみ) | `xmlRef._attributes.initialMarking` |

#### `uncertaintyBaseType` → `propertyBaseType` / `contentBaseType`（maiml-property.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `key` | **属性** (`xs:attribute`, required) | `xmlProp._attributes.key` |

`contentBaseType` 固有：
| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `axis` | **属性** (`xs:attribute`) | `xmlContent._attributes.axis` |
| `size` | **属性** (`xs:attribute`) | `xmlContent._attributes.size` |
| `id` | **属性** (`xs:attribute`) | `xmlContent._attributes.id` |
| `ref` | **属性** (`xs:attribute`) | `xmlContent._attributes.ref` |

各Propertyの数値型（`decimalType`, `doubleType`, `floatType`, `intType` 等）固有：
| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `formatString` | **属性** (`xs:attribute`) | `xmlProp._attributes.formatString` |
| `units` | **属性** (`xs:attribute`) | `xmlProp._attributes.units` |
| `scaleFactor` | **属性** (`xs:attribute`) | `xmlProp._attributes.scaleFactor` |

#### `chainType` / `parentType`（maiml-document.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `uuid` | **要素** (`xs:element`) | `xmlChain.uuid._text` |
| `hash` | **要素** (`xs:element`) | `xmlChain.hash` |
| `chain` / `parent` | **要素** (`xs:element`, 再帰) | `xmlChain.chain` |
| `key` | **属性** (`xs:attribute`) | `xmlChain._attributes.key` |

#### `simpleObjectType` / `hasIdAttributeType`（maiml-core.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `id` | **属性** (`xs:attribute`, required) | `xmlObj._attributes.id` |
| `name` | **要素** (`xs:element`, optional) | `xmlObj.name._text` |
| `description` | **要素** (`xs:element`, optional) | `xmlObj.description._text` |

#### `rootObjectType`（maiml.xsd）

| フィールド | XSD種別 | xml-js参照方法 |
|-----------|--------|--------------|
| `version` | **属性** (`xs:attribute`, required) | `xmlRoot._attributes.version` |
| `features` | **属性** (`xs:attribute`) | `xmlRoot._attributes.features` |
| `document` | **要素** (`xs:element`) | `xmlRoot.document` |

---

### 8-3. 型定義ファイルの区分け評価

TypeScriptの型定義（`maiml-unified.ts`）はXMLの属性/要素を区別せずすべてプロパティとして表現しており、これは正常。  
型定義自体に属性/要素の区分け誤りはない。

---

### 8-4. ⚠️ パーサー実装での属性/要素区分け誤り

#### 問題1: `convertInsertion` の `uri` / `format` フィールド

**XSD仕様**: `uri`, `format` は **要素** (`xs:element`)

| 実装 | コード | 正誤 |
|------|-------|------|
| backend v1.0.0 | `xmlInsertion.uri?._text \|\| xmlInsertion._attributes?.uri` | ✅ 正しい（要素優先・属性フォールバック） |
| frontend v2.0.0 | `xmlInsertion._attributes?.uri` のみ | ❌ XSD違反（属性のみ・要素未対応） |

`insertionType` はすべてのフィールドが `xs:element` であり、属性は一切定義されていない。  
フロントエンド v2.0.0 は `uri` を属性として読もうとしており、XSD準拠の MAIML では常に `undefined` になる。

#### 問題2: `convertHash` の実装確認が必要

**XSD仕様**: `hashType` は `xs:base64Binary` の `simpleContent` + `method` 属性

```xml
<xs:complexType name="hashType">
  <xs:simpleContent>
    <xs:extension base="xs:base64Binary">
      <xs:attribute name="method" type="xs:string" />
    </xs:extension>
  </xs:simpleContent>
</xs:complexType>
```

パーサーでは `_text` でハッシュ値を、`_attributes.method` でメソッドを読む必要がある。  
両実装での確認が必要（本調査ではコード読み込みが完全ではないため要確認）。

#### 問題3: `Extension` / `Classifier` / `Globals` の区分け

- `extensionType`: **全フィールドが属性** → `_attributes` から読む（正常であれば問題なし）
- `classifierType`: **全フィールドが属性** → `_attributes` から読む
- `globalsType`: `scope` は **属性**、子要素として `property` を持つ（`AttributableType` 継承）

---

### 8-5. 正しい実装対照表（`insertionType` の例）

```typescript
// ✅ XSD準拠の正しい実装（バックエンド v1.0.0 方式）
function convertInsertion(xmlInsertion: any): Insertion | undefined {
  return {
    uri: xmlInsertion.uri?._text      // 要素（XSD準拠）
      || xmlInsertion._attributes?.uri  // 属性（フォールバック）
      || '',
    hash: xmlInsertion.hash ? {
      method: xmlInsertion.hash._attributes?.method,  // 属性（XSD準拠）
      value: xmlInsertion.hash._text,                 // simpleContent（XSD準拠）
    } : undefined,
    uuid: xmlInsertion.uuid?._text    // 要素（XSD準拠）
      || xmlInsertion._attributes?.uuid,
    format: xmlInsertion.format?._text  // 要素（XSD準拠）
      || xmlInsertion._attributes?.format,
  };
}

// ❌ XSD違反の実装（フロントエンド v2.0.0 方式）
function convertInsertion(xmlInsertion: any): Insertion | undefined {
  return {
    uri: xmlInsertion._attributes?.uri || '',  // ← 属性のみ（XSD違反）
    format: xmlInsertion._attributes?.format,  // ← 属性のみ（XSD違反）
  };
}
```

---

### 8-6. まとめ（XSD属性/要素区分け調査）

| 調査項目 | 結果 |
|---------|------|
| 型定義ファイル（`maiml-unified.ts`）の属性/要素区分け | ✅ 問題なし（TSプロパティとして統一表現は正常） |
| `insertionType` の `uri`/`format` フィールド（フロントエンド v2.0.0） | ❌ **XSD違反**：要素を属性として誤読 |
| `extensionType` / `classifierType` の全フィールド（属性） | ⚠️ 実装確認要（パーサーコード要精査） |
| `chainType` / `parentType` の `key` フィールド（属性） | ⚠️ 実装確認要（パーサーコード要精査） |
| その他（`id`, `ref`, `key`, `units` 等の属性フィールド） | ✅ 概ね属性として正しく参照されている |

**最重要の修正対象**: フロントエンド `maimlTypeConverter.ts` v2.0.0 の `convertInsertion` は、`uri` / `format` / `uuid` をXSD準拠の要素として読み取るようバックエンド v1.0.0 の実装に合わせて修正が必要。

---

## 9. ファイル間の依存関係

```
【バックエンド】
backend/src/utils/maimlParserTyped.ts (v1.0.0)
  ├── import { convertXmlJsToMaimlRoot } from './maimlTypeConverter'
  │     └── backend/src/utils/maimlTypeConverter.ts (v1.0.0) ← 旧バージョン
  └── import { MaimlRoot, ... } from '../types/maiml-unified'
        └── backend/src/types/maiml-unified.ts ← positionフィールドなし

【フロントエンド】
frontend/src/utils/maimlParserTyped.ts (v1.0.0相当)
  ├── import { convertXmlJsToMaimlRoot, ConversionError } from './maimlTypeConverter'
  │     └── frontend/src/utils/maimlTypeConverter.ts (v2.0.0) ← 最新版
  ├── import { TemplatesByCategory } from '@/types/editor'
  └── import { MaimlRoot, ... } from '@/types/maiml-unified'
        └── frontend/src/types/maiml-unified.ts ← positionフィールドあり
```

---

## 10. 実施結果（2026-04-08）

### 10-1. 対応完了項目

| Phase | 内容 | 結果 |
|-------|------|------|
| 1 | `maiml-unified.ts` 型定義の同期 | ✅ 完了：backend に `position`（Place/Transition）・`unknownElements`（Method/Protocol/MaimlRoot）を追加 |
| 2-1 | backend `maimlTypeConverter.ts` の更新 | ✅ 完了：`convertPlace`/`convertTransition` に `position` 読み取り追加、`convertProtocol`/`convertMethod` に `unknownElements` 収集追加 |
| 2-2 | frontend `convertInsertion` XSD準拠修正 | ✅ 完了：属性のみ → 子要素 + 属性フォールバックに修正 |
| 2-3 | `convertHash` 実装確認 | ✅ 不要（両実装とも XSD 準拠済み） |
| 3-1 | backend `maimlParserTyped.ts` ConversionResult 対応 | ⏭ スキップ（後述） |
| 3-2 | frontend `getInstructionIdByTransitionId` バグ修正 | ✅ 不要（コードが既に修正済み） |
| 3-3 | frontend `import { Dayjs }` 削除 | ✅ 不要（該当コードなし） |
| 4 | コンパイルエラー確認 | ✅ エラー 0 件（`tsc --noEmit` exit:0 確認） |

### 10-2. Phase 3-1 スキップ理由

`ConversionResult` パターン（エラーをスローせず結果オブジェクトに収集する）は  
**React の状態管理向け**のフロントエンド専用設計。

backend の `maimlParserTyped.ts` はクラスベースで `try/catch` を持つサーバーサイド設計であり、  
例外をスローして呼び出し元の Express ミドルウェアでハンドリングするパターンが適切。  
無理に `ConversionResult` に合わせると backend の既存 API（`getTypedMaiml()` 等）が破壊される。

→ **backend は現状のクラス + 例外スロー方式を維持する**

### 10-3. 対応後のファイル更新サマリー

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/types/maiml-unified.ts` | `Place.position`、`Transition.position`、`Method.unknownElements`、`Protocol.unknownElements`、`MaimlRoot.unknownElements` を追加 |
| `backend/src/utils/maimlTypeConverter.ts` | `convertPlace`/`convertTransition` に `position` パース処理追加、`convertProtocol`/`convertMethod` に `unknownElements` 収集処理追加 |
| `frontend/src/utils/maimlTypeConverter.ts` | `convertInsertion` を子要素（`_text`）優先・属性フォールバック方式に修正（XSD準拠） |

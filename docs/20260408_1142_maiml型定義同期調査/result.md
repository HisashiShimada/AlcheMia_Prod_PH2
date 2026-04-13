# MAIML型定義同期調査 - 修正内容まとめ

- **実施日**: 2026-04-08
- **対象タスク**: backend/frontend 間の MAIML 型定義・型変換ユーティリティの同期

---

## 修正ファイル一覧

| # | ファイル | 変更種別 |
|---|---------|---------|
| 1 | `backend/src/types/maiml-unified.ts` | フィールド追加 |
| 2 | `backend/src/utils/maimlTypeConverter.ts` | パース処理追加 |
| 3 | `frontend/src/utils/maimlTypeConverter.ts` | XSD準拠修正 |

---

## 1. `backend/src/types/maiml-unified.ts`

### 変更内容：フロントエンドにあってバックエンドに欠けていたフィールドを追加

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
    // ... 既存フィールド ...
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
    // ... 既存フィールド ...
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
    // ... 既存フィールド ...
    data?: Data;
    eventLog?: EventLog;
+   /** 変換できなかった未知のXML要素（キー: タグ名, 値: xml-jsオブジェクト） */
+   unknownElements?: Record<string, any>;
  }
```

---

## 2. `backend/src/utils/maimlTypeConverter.ts`

### 変更内容①：`convertPlace` に `position` 読み取り処理を追加

```diff
  function convertPlace(xmlPlace: any): Place {
+   const positionEl = xmlPlace.position;
+   let position: { x: number; y: number } | undefined;
+   if (positionEl?._attributes) {
+     const x = parseFloat(positionEl._attributes.x);
+     const y = parseFloat(positionEl._attributes.y);
+     if (!isNaN(x) && !isNaN(y)) {
+       position = { x, y };
+     }
+   }
    return {
      id: xmlPlace._attributes?.id || '',
      uuid: xmlPlace.uuid?._text,
      name: xmlPlace.name?._text,
      description: xmlPlace.description?._text,
+     position
    };
  }
```

### 変更内容②：`convertTransition` に `position` 読み取り処理を追加

```diff
  function convertTransition(xmlTransition: any): Transition {
+   const positionEl = xmlTransition.position;
+   let position: { x: number; y: number } | undefined;
+   if (positionEl?._attributes) {
+     const x = parseFloat(positionEl._attributes.x);
+     const y = parseFloat(positionEl._attributes.y);
+     if (!isNaN(x) && !isNaN(y)) {
+       position = { x, y };
+     }
+   }
    return {
      id: xmlTransition._attributes?.id || '',
      uuid: xmlTransition.uuid?._text,
      name: xmlTransition.name?._text,
      description: xmlTransition.description?._text,
+     position
    };
  }
```

### 変更内容③：`convertProtocol` に `unknownElements` 収集処理を追加

```diff
  function convertProtocol(xmlProtocol: XmlJsElement): Protocol {
    // ...
    const methods = normalizeXmlJsArray(xmlProtocol.method as XmlJsElement);
+
+   const PROTOCOL_KNOWN_KEYS = new Set([
+     '_attributes', 'uuid', 'name', 'description', 'annotation',
+     'method', 'materialTemplate', 'conditionTemplate', 'resultTemplate'
+   ]);
+   const unknownElements: Record<string, any> = {};
+   for (const key of Object.keys(xmlProtocol)) {
+     if (!PROTOCOL_KNOWN_KEYS.has(key)) {
+       unknownElements[key] = (xmlProtocol as any)[key];
+     }
+   }

    return {
      // ... 既存フィールド ...
      resultTemplates: ...,
+     ...(Object.keys(unknownElements).length > 0 ? { unknownElements } : {})
    };
  }
```

### 変更内容④：`convertMethod` に `unknownElements` 収集処理を追加

```diff
  function convertMethod(xmlMethod: any): Method {
    // ...
    const program = normalizeArray(xmlMethod.program);
+
+   const METHOD_KNOWN_KEYS = new Set([
+     '_attributes', 'uuid', 'name', 'description', 'annotation',
+     'pnml', 'program', 'materialTemplate', 'conditionTemplate', 'resultTemplate'
+   ]);
+   const unknownElements: Record<string, any> = {};
+   for (const key of Object.keys(xmlMethod)) {
+     if (!METHOD_KNOWN_KEYS.has(key)) {
+       unknownElements[key] = xmlMethod[key];
+     }
+   }

    return {
      // ... 既存フィールド ...
      resultTemplates: ...,
+     ...(Object.keys(unknownElements).length > 0 ? { unknownElements } : {})
    };
  }
```

---

## 3. `frontend/src/utils/maimlTypeConverter.ts`

### 変更内容：`convertInsertion` をXSD準拠に修正（属性のみ → 子要素優先・属性フォールバック）

**修正前（XSD違反）**：`<uri>` / `<format>` が子テキスト要素として記述された MAIML に未対応

```typescript
// 修正前
function convertInsertion(xmlInsertion: any): Insertion {
  return {
    uri: xmlInsertion._attributes?.uri || '',        // 属性のみ参照 → XSD違反
    hash: xmlInsertion.hash ? convertHash(xmlInsertion.hash) : undefined,
    uuid: xmlInsertion._attributes?.uuid,            // 属性のみ参照 → XSD違反
    format: xmlInsertion._attributes?.format         // 属性のみ参照 → XSD違反
  };
}
```

**修正後（XSD準拠）**：子テキスト要素 `_text` を優先し、属性はフォールバック

```typescript
// 修正後
function convertInsertion(xmlInsertion: any): Insertion {
  return {
    uri: xmlInsertion.uri?._text || xmlInsertion._attributes?.uri || '',   // 要素優先
    hash: xmlInsertion.hash ? convertHash(xmlInsertion.hash) : undefined,
    uuid: xmlInsertion.uuid?._text || xmlInsertion._attributes?.uuid,      // 要素優先
    format: xmlInsertion.format?._text || xmlInsertion._attributes?.format // 要素優先
  };
}
```

**XSD仕様**（`insertionType`）：`uri`・`hash`・`uuid`・`format` はすべて `xs:element`（属性ではない）

```xml
<!-- maiml-core.xsd の insertionType -->
<xs:complexType name="insertionType">
  <xs:sequence>
    <xs:element name="uri"    type="xs:anyURI" />
    <xs:element name="hash"   type="hashType" minOccurs="0" />
    <xs:element name="uuid"   type="xs:string" minOccurs="0" />
    <xs:element name="format" type="xs:string" minOccurs="0" />
  </xs:sequence>
</xs:complexType>
```

---

## コンパイル確認

修正後、backend の TypeScript コンパイルを実行してエラーがないことを確認済み。

```
tsc --noEmit -p backend/tsconfig.json → exit:0（エラーなし）
```

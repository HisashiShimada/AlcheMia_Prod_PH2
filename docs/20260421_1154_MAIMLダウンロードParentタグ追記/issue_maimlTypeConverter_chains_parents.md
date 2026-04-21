# Issue: maimlTypeConverter が Document の chains / parents を変換しない

## 概要

`backend/src/utils/maimlTypeConverter.ts` および `frontend/src/utils/maimlTypeConverter.ts` の `convertDocument()` 関数において、`chains` および `parents` フィールドが常に空配列 `[]` としてハードコードされており、XMLから実際の値が読み取られない。

## 影響範囲

| ファイル | 問題箇所 |
|---------|---------|
| `backend/src/utils/maimlTypeConverter.ts` | `convertDocument()` 内 `chains: []`, `parents: []` |
| `frontend/src/utils/maimlTypeConverter.ts` | `convertDocument()` 内 `chains: []`, `parents: []` |

## 型定義（期待される構造）

`backend/src/types/maiml-unified.ts` より：

```typescript
/** Chain（チェーン構造、ブロックチェーン用） */
export interface Chain {
  uuid: Uuid;
  hash: Hash;
  chains: Chain[];  // 再帰的ネスト
  key?: string;
}

/** Parent（親要素参照） */
export interface Parent {
  uuid: Uuid;
  hash: Hash;
  parents: Parent[];  // 再帰的ネスト
  key?: string;
}

/** Document */
export interface Document {
  // ...
  chains: Chain[];   // 現状: 常に []
  parents: Parent[]; // 現状: 常に []
}
```

## 現状の問題コード

### backend & frontend 共通（convertDocument 内）

```typescript
// backend/src/utils/maimlTypeConverter.ts（line 121-123 付近）
// frontend/src/utils/maimlTypeConverter.ts（同様）
return {
  id: getAttribute(xmlDoc, 'id') || '',
  uuid: extractText(xmlDoc.uuid as XmlJsElement) || '',
  // ...
  chains:  [],   // ❌ ハードコード: XMLの <chain> 要素を無視
  parents: [],   // ❌ ハードコード: XMLの <parent> 要素を無視
};
```

## 直接的な影響

### 1. maimlParentInjector の重複チェックが機能しない

`backend/src/utils/maimlParentInjector.ts` の `injectParentTag()` は以下のロジックで重複を防止している：

```typescript
const parser = new MaimlParserTyped(maimlContent);
const doc = parser.getDocument();
if (doc.parents && doc.parents.length > 0) {
  existingParentUuid = doc.parents[0].uuid?.trim() ?? null;
}
// 同一UUIDなら挿入スキップ
if (existingParentUuid === projectUuid) { return maimlContent; }
```

`convertDocument()` が `parents: []` を返すため `doc.parents` は常に空 → 重複チェックが機能せず、ダウンロードのたびに `<parent>` が多重挿入される。

### 2. chains の来歴情報が失われる

MAIMLの `<chain>` はブロックチェーン的な来歴管理に使用される。変換後のデータモデルから chain 情報が欠落する。

### 3. フロントエンドでの parents/chains 表示・検証が不可能

フロントエンドでMAIMLの親子関係・来歴を表示・検証するロジックがあっても、データが空のため機能しない。

## 修正方針

### 1. convertParent() / convertChain() 関数の追加

```typescript
/** Parent変換（再帰対応） */
function convertParent(xmlParent: any): Parent {
  return {
    uuid: xmlParent.uuid?._text || '',
    hash: xmlParent.hash ? convertHash(xmlParent.hash) : { value: '' },
    parents: xmlParent.parent
      ? convertArray(xmlParent.parent, convertParent)
      : [],
    key: xmlParent._attributes?.key,
  };
}

/** Chain変換（再帰対応） */
function convertChain(xmlChain: any): Chain {
  return {
    uuid: xmlChain.uuid?._text || '',
    hash: xmlChain.hash ? convertHash(xmlChain.hash) : { value: '' },
    chains: xmlChain.chain
      ? convertArray(xmlChain.chain, convertChain)
      : [],
    key: xmlChain._attributes?.key,
  };
}
```

### 2. convertDocument() の修正

```typescript
// Before
chains:  [],
parents: [],

// After
chains:  xmlDoc.chain  ? convertArray(xmlDoc.chain,  convertChain)  : [],
parents: xmlDoc.parent ? convertArray(xmlDoc.parent, convertParent) : [],
```

### 3. 対象ファイル（バックエンド・フロントエンド両方）

- `backend/src/utils/maimlTypeConverter.ts`
- `frontend/src/utils/maimlTypeConverter.ts`

## その他の変換不足の確認事項

調査中に以下の潜在的問題も確認済み。追加調査が必要：

| 項目 | 場所 | 状況 |
|-----|------|------|
| `Document.annotation` | convertDocument | 型定義にあるが変換されていない可能性 |
| `Chain.key` / `Parent.key` | 上記修正で対応 | `_attributes.key` から取得が必要 |
| `Hash.method` の取得方法 | convertHash | `_attributes.method` と子要素 `method._text` の両方に対応済みだが確認必要 |

## 優先度

**高** — `maimlParentInjector` の重複チェック機能が直接依存しており、MAIMLダウンロード時の `<parent>` 多重挿入バグの根本原因となっている。

## 関連

- `backend/src/utils/maimlParentInjector.ts` — `injectParentTag()` の重複チェックロジック
- `backend/src/utils/maimlParserTyped.ts` — `MaimlParserTyped` が `convertXmlJsToMaimlRoot` を使用
- `backend/src/types/maiml-unified.ts` — `Chain`, `Parent`, `Document` 型定義
- `frontend/src/types/maiml-unified.ts` — 同上（フロントエンド側）

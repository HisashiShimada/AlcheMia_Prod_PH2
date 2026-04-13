# 実施結果: NestedPropertyEditor Attributeマスタ対応

- **作成日時**: 2026-04-09 11:17
- **タスクID**: 20260409_0946_NestedPropertyEditor_attribute_master対応

---

## 概要

NestedPropertyEditorにおいて、PropertyおよびContentの属性追加ダイアログで選択できる属性キーをAttributeマスタのデータから設定できるようにした。  
あわせて、実装中に発覚した「カスタム属性が保存後に消失する」不具合を修正した。

---

## 実装内容（フェーズ1〜5）

### Phase 1: バックエンド — Attributeマスタ API

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/routes/masterRoutes.ts` | `GET /api/v1/masters/attributes` エンドポイント追加 |
| `backend/src/controllers/masterController.ts` | `getAttributeMasters` ハンドラ追加 |
| `backend/src/repositories/masterRepository.ts` | `findAttributeMasters()` 関数追加（`attribute_master` テーブルから取得） |

### Phase 2: フロントエンド — API サービス

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/services/masterApiService.ts` | `fetchAttributeMasters()` 関数追加、`AttributeMaster` 型定義 |

### Phase 3: フロントエンド — カスタムフック

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/hooks/useAttributeMasters.ts` | `useAttributeMasters()` フック新規作成（マスタ一覧取得・キャッシュ） |

### Phase 4: フロントエンド — NestedPropertyEditor 修正

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | 属性追加ダイアログのAttributeキー選択をAttributeマスタから動的取得に変更。カスタム属性入力欄を削除。 |

### Phase 5: 型定義・その他

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/maiml-unified.ts` | `Property.attributes?: Record<string, string>` フィールドが既存で定義済みであることを確認 |

---

## 不具合修正（セッション後半）

### 問題の症状

- Attributeマスタから属性を選択してプロパティを保存した後、再度編集ダイアログを開くとカスタム属性が消えている
- `mergedTemplate`（`TemplateEditorDialog.tsx` の `useEffect` 内）の段階で、`property` の中身が `xsi:type` と `key` しか持っていない

### 根本原因の調査

以下の2層でカスタム属性が脱落していることが判明。

```
XML _attributes（カスタム属性含む）
  ↓ [問題①] convertXmlJsProperty — customAttrs を property.attributes に格納しない
property.attributes = undefined  ← 脱落
  ↓ [問題②] convertPropertiesArrayToNestedFormat — prop.attributes を復元しない、かつ xsiType 未設定時に 'stringType' を強制セット
PropertyData.attributes = { 'xsi:type': 'stringType' } のみ  ← 脱落＋上書き
  ↓ NestedPropertyEditor 表示
カスタム属性なし
```

### 修正①: `frontend/src/utils/maimlTypeConverter.ts`

**関数**: `convertXmlJsProperty`

XML パース時に `_attributes` 内の既知キー以外をすべてカスタム属性として `property.attributes` に格納するロジックを追加。  
`propertyListType` を含む全分岐（9箇所）に対応。

```ts
// 既知キー以外を customAttrs として抽出
const KNOWN_ATTRS = new Set(['key', 'xsi:type', 'units', 'formatString', 'scaleFactor', 'axis', 'size', 'id', 'ref']);
const customAttrs: Record<string, string> = {};
if (xmlProp._attributes) {
  Object.entries(xmlProp._attributes).forEach(([k, v]) => {
    if (!KNOWN_ATTRS.has(k) && v !== undefined && v !== null) {
      customAttrs[k] = String(v);
    }
  });
}
const hasCustomAttrs = Object.keys(customAttrs).length > 0;

// 各 return 文の直前に追加
if (hasCustomAttrs) result.attributes = customAttrs;
```

### 修正②: `frontend/src/components/editorv2/utils/templateConverter.ts`

**関数**: `convertPropertiesArrayToNestedFormat` / `convertPropertiesArrayToNestedFormatRecursive`

1. `prop.attributes`（保存済みカスタム属性）を `attributes` オブジェクトに先にコピー
2. `xsiType` は値がある場合のみ `'xsi:type'` にセット（空の場合に `'stringType'` を強制付与していたバグを修正）

```ts
// 修正前
const attributes: Record<string, string> = {
  'xsi:type': (prop.xsiType as string) || 'stringType'  // ← 空でも 'stringType' が付与される
};

// 修正後
const attributes: Record<string, string> = {};

// ① マスタ属性等（prop.attributes）を先にコピー
if (prop.attributes && typeof prop.attributes === 'object') {
  Object.entries(prop.attributes).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      attributes[k] = String(v);
    }
  });
}

// ② xsiType は空でない場合のみセット
if (prop.xsiType) {
  attributes['xsi:type'] = prop.xsiType as string;
}
```

---

## 残課題・別途対応が必要な事項

- 今回の修正でパーサー（`maimlTypeConverter.ts`）とコンバーター（`templateConverter.ts`）の2層で属性が保持されるようになったが、  
  実際の動作確認（保存→再読み込み→属性が保持されているか）を手動で行う必要がある
- `TemplateEditorDialog.tsx` の `mergedTemplate` 生成ロジック、および `FormatEditorDialog.tsx` の同様の処理についても、  
  カスタム属性の受け渡しが正しく行われているか別途確認が必要

---

## TypeScriptビルド確認

修正後の `npx tsc --noEmit` 結果：  
今回変更したファイル（`maimlTypeConverter.ts`, `templateConverter.ts`）に起因するエラーはゼロ。  
残存する11件はすべて本タスクとは無関係の既存エラー（`AuthContainer.integration.test.tsx`, `BulkUploadDialog.tsx`, `LanguageContext.tsx`, `fileAccessService.ts` 等）。

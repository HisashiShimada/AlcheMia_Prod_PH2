# タスク計画書: XMLパーサーkeyDictionary対応

## メタデータ
- **作成日時**: 2026-02-27 15:21
- **タスクID**: xml-parser-keydictionary-support
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

フォーマット管理画面でXMLファイルを編集後、再度編集しようとすると「不明なテンプレートタイプ: keyDictionary」というエラーが発生する問題を修正します。

## 2. 目的と期待される成果

### 目的
- `xmlConverter.ts`の`convertXmlToTemplate`関数に`keyDictionary`ルート要素のサポートを追加
- フォーマット管理画面で保存したXMLファイルを再度編集可能にする

### 期待される成果
- [x] エラーの原因特定完了
- [ ] `xmlConverter.ts`の修正
- [ ] 編集→保存→再編集のフローが正常に動作する

## 3. 問題の詳細

### 現在の状況

**保存時（FormatManagement.tsx）:**
```typescript
// keyDictionary形式でXMLを生成
let xmlContent = `<keyDictionary xmlns="${escapeXml(xmlns)}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
```

**再編集時（FormatEditorDialog.tsx）:**
```typescript
// convertXmlToTemplateを呼び出す
const { convertXmlToTemplate } = await import('@/utils/xmlConverter');
parsedTemplate = convertXmlToTemplate(xmlContent);
```

**エラー発生箇所（xmlConverter.ts）:**
```typescript
// keyDictionaryが想定されていない
let category: 'material' | 'condition' | 'result';
if (templateTag === 'materialTemplate' || templateTag === 'maiml:materialTemplate') {
  category = 'material';
} else if (templateTag === 'conditionTemplate' || templateTag === 'maiml:conditionTemplate') {
  category = 'condition';
} else if (templateTag === 'resultTemplate' || templateTag === 'maiml:resultTemplate') {
  category = 'result';
} else {
  throw new Error(`不明なテンプレートタイプ: ${templateTag}`); // ← ここでエラー
}
```

## 4. 実装ステップ

### Phase 1: xmlConverter.tsの修正
- [ ] `convertXmlToTemplate`関数に`keyDictionary`ケースを追加
- [ ] `keyDictionary`のルート要素から`category`を判定するロジックを実装
- [ ] `xmlns`属性からカテゴリを推測（material/condition/result）

### Phase 2: テスト・検証
- [ ] 新規XMLファイル作成 → 保存 → 再編集の動作確認
- [ ] 各カテゴリ（material/condition/result）での動作確認
- [ ] 既存のXMLファイルとの互換性確認

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/utils/xmlConverter.ts` - `convertXmlToTemplate`関数を修正

### 影響を受ける機能
- フォーマット管理画面のXML編集機能
- テンプレートファイルの読み込み処理

## 6. 技術的詳細

### keyDictionaryのcategory判定方法

**方法1: xmlns属性から判定（推奨）**
```typescript
// xmlns="http://abc.com/schema/keyDictionary/{s3_path}"
// s3_pathに material/condition/result が含まれているか確認
const xmlns = rootElement.getAttribute('xmlns') || '';
if (xmlns.includes('/material/')) {
  category = 'material';
} else if (xmlns.includes('/condition/')) {
  category = 'condition';
} else if (xmlns.includes('/result/') || xmlns.includes('/measurement/')) {
  category = 'result';
}
```

**方法2: FormatEditorDialogから渡されるnode.data.placeTypeを活用**
- ただし、`convertXmlToTemplate`は汎用関数なので、引数にcategoryを追加する必要がある
- → より大きな変更になるため、方法1を優先

### 修正後のコード構造
```typescript
export function convertXmlToTemplate(xmlContent: string): Template {
  // ... 既存のパース処理 ...
  
  const rootElement = xmlDoc.documentElement;
  const templateTag = rootElement.tagName;
  
  let category: 'material' | 'condition' | 'result';
  
  if (templateTag === 'keyDictionary') {
    // ✅ keyDictionary対応
    const xmlns = rootElement.getAttribute('xmlns') || '';
    category = inferCategoryFromXmlns(xmlns);
  } else if (templateTag === 'materialTemplate' || templateTag === 'maiml:materialTemplate') {
    category = 'material';
  } else if (templateTag === 'conditionTemplate' || templateTag === 'maiml:conditionTemplate') {
    category = 'condition';
  } else if (templateTag === 'resultTemplate' || templateTag === 'maiml:resultTemplate') {
    category = 'result';
  } else {
    throw new Error(`不明なテンプレートタイプ: ${templateTag}`);
  }
  
  // ... 残りの処理 ...
}

function inferCategoryFromXmlns(xmlns: string): 'material' | 'condition' | 'result' {
  if (xmlns.includes('/material/')) return 'material';
  if (xmlns.includes('/condition/')) return 'condition';
  if (xmlns.includes('/result/') || xmlns.includes('/measurement/')) return 'result';
  
  // デフォルト: result（最も汎用的）
  return 'result';
}
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| xmlns属性からカテゴリが判定できない | 中 | 低 | デフォルト値（result）を返す |
| 既存のMAIMLファイルとの互換性問題 | 低 | 低 | keyDictionaryケースのみ追加、既存ロジックは変更しない |

## 8. テスト計画

### 単体テスト
- [ ] `keyDictionary` + material系のxmlns → category='material'
- [ ] `keyDictionary` + condition系のxmlns → category='condition'
- [ ] `keyDictionary` + result系のxmlns → category='result'
- [ ] `materialTemplate` → category='material'（既存動作確認）

### 統合テスト
- [ ] フォーマット管理画面で新規XMLファイル作成
- [ ] 保存後、再度編集ボタンをクリック
- [ ] エラーが発生せず、FormatEditorDialogが開く
- [ ] プロパティが正しく表示される

## 9. 承認記録

- **計画書提示日時**: 2026-02-27 15:21
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

## 10. 実施記録

### 実施日時
開始: （作業開始時記入）
完了: （作業完了時記入）

### 計画からの変更点
（作業中に記入）

### 発生した問題と解決方法
（作業中に記入）

### 最終的な成果物
- [ ] `frontend/src/utils/xmlConverter.ts` - 修正完了
- [ ] 動作確認完了

## 11. 振り返り

### うまくいった点
（完了後記入）

### 改善が必要な点
（完了後記入）

### 学んだこと
（完了後記入）

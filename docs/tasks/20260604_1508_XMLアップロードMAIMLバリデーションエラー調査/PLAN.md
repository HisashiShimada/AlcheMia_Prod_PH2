# 調査レポート: XMLアップロード時のMAIMLバリデーションエラー

## メタデータ
- **作成日時**: 2026-06-04 15:08
- **タスクID**: xml_upload_maiml_validation_error
- **調査対象ファイル**: `test_data/Trityl-OH-ChemMatrix_resin.xml`
- **対象画面**: `frontend/src/components/format/FormatManagement.tsx`

---

## 1. 問題の概要

FormatManagement画面でXMLテンプレートファイル（例: `Trityl-OH-ChemMatrix_resin.xml`）をアップロードすると、MAIMLバリデーションが実行されエラーとなり、アップロードが失敗する。

---

## 2. 対象ファイルの内容

`test_data/Trityl-OH-ChemMatrix_resin.xml` は `keyDictionary` 形式のXMLテンプレートファイル：

```xml
<keyDictionary xmlns="http://abc.com/schema/keyDictionary/formats/default/material/Trityl-OH-ChemMatrix_resin" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <property key="KGY:MaterialName" xsi:type="stringType">
    <value>Trityl-OH-ChemMatrix(R) resin</value>
  </property>
  ...
</keyDictionary>
```

- **ルート要素**: `<keyDictionary>`（MAIMLの`<maiml>`要素ではない）
- **用途**: Materialテンプレートとして使用するXML
- **MAIMLファイルではない**ことが明確

---

## 3. 根本原因

### 問題箇所: `backend/src/utils/maimlAnalyzer.ts` の `isMaimlFile` 関数

**修正前のコード:**

```typescript
export function isMaimlFile(fileName: string, contentType?: string): boolean {
  // 拡張子チェック
  const hasMaimlExtension = fileName.toLowerCase().endsWith('.maiml');

  // Content-Typeチェック
  const isXmlContentType =
    contentType === 'application/xml' || contentType === 'text/xml';

  return hasMaimlExtension || isXmlContentType;  // ← 問題箇所
}
```

**問題の原因:**

| ファイル種別 | 拡張子 | Content-Type | 旧判定結果 | 正しい判定 |
|------------|--------|--------------|----------|----------|
| MAIMLファイル | `.maiml` | `application/xml` | `true` ✅ | `true` |
| XMLテンプレート | `.xml` | `application/xml` | `true` ❌ | `false` |

`isXmlContentType = contentType === 'application/xml'` の条件により、**`.xml`拡張子のファイルも `application/xml` の Content-Type を持つためMAIMLと誤判定**される。

---

## 4. 問題の処理フロー

```
[フロントエンド]
FormatUploadDialog.tsx - handleUpload()
  → uploadFiles API呼び出し（POST /api/v1/files/upload）

[バックエンド]
fileAccessController.ts - uploadFiles()
  → fileAccessService.ts - uploadFiles()
    → isMaimlFile(sanitizedFileName, file.mimetype) 
       ← 'application/xml' のため .xml ファイルが true と判定（誤）
    → if (isMaiml) { analyzeMaiMLFile(...) }
       ← MAIMLバリデーション実行
    → validateMaiMLStructure() で "Missing root 'maiml' element" エラー
    → fatalErrors.length > 0 → MAIML_VALIDATION_ERROR をスロー
    → HTTP 400 レスポンス

[フロントエンド]
FormatUploadDialog.tsx - catch ブロック
  → errorCode === 'MAIML_VALIDATION_ERROR' 
  → Modal.error でエラーダイアログ表示
```

---

## 5. 実施した修正

### 修正ファイル: `backend/src/utils/maimlAnalyzer.ts`

**修正後のコード:**

```typescript
export function isMaimlFile(fileName: string, _contentType?: string): boolean {
  // 拡張子チェックのみで判定する
  // .xml ファイルはXMLテンプレートとして扱い、MAIMLバリデーションの対象外とする
  // Content-Type (application/xml) は .xml と .maiml 両方に付与されるため判定に使用しない
  const hasMaimlExtension = fileName.toLowerCase().endsWith('.maiml');

  return hasMaimlExtension;
}
```

**修正内容:**
- `contentType` による判定を削除
- `.maiml` 拡張子のみをMAIMLファイルとして扱うよう変更
- 引数名を `_contentType` に変更（未使用引数の明示）

---

## 6. 修正後の動作

| ファイル種別 | 拡張子 | Content-Type | 修正後判定 | MAIMLバリデーション |
|------------|--------|--------------|----------|-------------------|
| MAIMLファイル | `.maiml` | `application/xml` | `true` | 実行 |
| XMLテンプレート | `.xml` | `application/xml` | `false` | **スキップ** ✅ |

---

## 7. 影響範囲

`isMaimlFile` 関数は以下の箇所で参照されている：

- `backend/src/services/fileAccessService.ts` - アップロード時のMAIMLバリデーション判定
- （他に参照なし）

この修正により、`.xml` ファイルのアップロード時にMAIMLバリデーションが実行されなくなる。`.maiml` ファイルのバリデーションは引き続き正常に実行される。

---

## 8. テスト方法

1. FormatManagement画面を開く
2. Materialフォルダを選択
3. `Trityl-OH-ChemMatrix_resin.xml` をアップロード
4. エラーなくアップロードが完了することを確認
5. `.maiml` ファイルのアップロードも引き続き正常にバリデーションされることを確認

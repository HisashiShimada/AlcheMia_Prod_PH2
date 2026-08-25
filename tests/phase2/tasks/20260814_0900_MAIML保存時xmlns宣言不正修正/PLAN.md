# タスク計画書: MAIML保存時 xmlns宣言不正修正

## メタデータ

- **作成日時**: 2026-08-14 09:00
- **タスクID**: 20260814_0900
- **優先度**: 高
- **推定工数**: 30分
- **関連タスク**: 20260813_1000_グローバル名前空間ファイルサーバ管理化 / 20260813_1400_NamespaceMain改修_MAIML名前空間注入修正

---

## 1. タスク概要

MAIML編集画面でファイルを保存後にダウンロードすると、`<maiml>` タグの `xmlns` 宣言が正しく記載されていない問題を修正する。

### 根本原因

`maimlApiService.ts` の `saveMaiml` 関数内で、**Base64エンコード済みの文字列**に対して `injectNamespacesToMaiml` を呼び出している。

`injectNamespacesToMaiml` はプレーンXML文字列の `<maiml>` タグを正規表現で検索するため、Base64文字列には `<maiml>` タグが存在せず、xmlns 宣言が注入されない。

#### 保存フローの問題箇所

```
PetriNetEditorInner.tsx:
  1. maimlXml = convertReactFlowToMaiML(...)    ← プレーンXML
  2. base64Data = btoa(encodeURIComponent(maimlXml))  ← Base64エンコード
  3. maimlService.saveMaiml(fileKey, base64Data, ...)  ← Base64文字列を渡す

maimlApiService.ts saveMaiml():
  4. const namespaces = await getOrganizationNamespaces()
  5. contentToSave = injectNamespacesToMaiml(content, namespaces)
     ↑ content はBase64文字列 → <maiml> タグが見つからず注入されない ❌
  6. Base64のままバックエンドへ POST
```

#### XMLビューが正しく表示される理由（比較）

```
XMLViewerWrapper.tsx:
  1. xmlString = convertReactFlowToMaiML(...)     ← プレーンXML
  2. xmlString = injectNamespacesToMaiml(xmlString, namespaces)  ← プレーンXMLに注入 ✅
  3. setXmlContent(xmlString) → 画面表示
```

---

## 2. 修正方針

`maimlApiService.ts` の `saveMaiml` 内で、注入処理の前後に **Base64デコード → xmlns注入 → Base64再エンコード** を行う。

```typescript
// 修正前（問題あり）
contentToSave = injectNamespacesToMaiml(content, namespaces); // content=Base64文字列

// 修正後
const decodedXml = decodeURIComponent(escape(atob(content)));       // Base64デコード
const injectedXml = injectNamespacesToMaiml(decodedXml, namespaces); // プレーンXMLに注入
contentToSave = btoa(unescape(encodeURIComponent(injectedXml)));     // 再エンコード
```

---

## 3. 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/services/maimlApiService.ts` | `saveMaiml` の xmlns注入処理を Base64デコード→注入→再エンコードに修正 |

---

## 4. 承認記録

- **計画書提示日時**: 2026-08-14 09:00
- **承認日時**: 2026-08-14 09:00
- **承認者コメント**: Act モードにて承認済み

---

## 5. 実施記録

### 実施日時
開始: 2026-08-14 09:00
完了: 2026-08-14 09:10

### 変更内容

`frontend/src/services/maimlApiService.ts` の `saveMaiml` 関数（251〜265行目）を修正。

#### 修正前
```typescript
// 保存前に名前空間宣言を XMLに注入する（失敗しても保存は継続）
let contentToSave = content;
try {
  const namespaces = await getOrganizationNamespaces();
  if (namespaces.length > 0) {
    contentToSave = injectNamespacesToMaiml(content, namespaces);
    console.log(`🔧 [maimlApiService] 名前空間 ${namespaces.length} 件を注入しました`);
  }
} catch (nsError) {
  console.warn('⚠️ [maimlApiService] 名前空間注入をスキップします:', nsError);
}
```

#### 修正後
```typescript
// 保存前に名前空間宣言を XMLに注入する（失敗しても保存は継続）
// content は Base64エンコード済み文字列のため、一度デコードしてから注入し再エンコードする
let contentToSave = content;
try {
  const namespaces = await getOrganizationNamespaces();
  if (namespaces.length > 0) {
    // Base64デコード → xmlns注入 → Base64再エンコード
    const decodedXml = decodeURIComponent(escape(atob(content)));
    const injectedXml = injectNamespacesToMaiml(decodedXml, namespaces);
    contentToSave = btoa(unescape(encodeURIComponent(injectedXml)));
    console.log(`🔧 [maimlApiService] 名前空間 ${namespaces.length} 件を注入しました`);
  }
} catch (nsError) {
  console.warn('⚠️ [maimlApiService] 名前空間注入をスキップします:', nsError);
}
```

### ビルド確認

- **フロントエンド `tsc --noEmit`**: ✅ 今回変更ファイル（`maimlApiService.ts`）に起因するエラーなし
  - 残存エラー3件は既存別ファイルの問題（`EncryptionManagement.tsx`, `DetailModal.tsx`）

### 手動テスト（実施予定）

- [ ] MAIMLエディタで編集後、保存実行
- [ ] 保存後にダウンロードして `<maiml>` タグの xmlns宣言を確認
- [ ] `xmlns="http://www.maiml.org/schemas"` が正しく出力される
- [ ] XMLビューでの表示と保存済みファイルの内容が一致する

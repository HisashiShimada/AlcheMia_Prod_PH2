# 対応結果: MAIMLアップロードバリデーション緩和

**対応日:** 2026-04-23  
**タスクフォルダ:** `docs/20260423_1146_MAIMLアップロードバリデーション緩和/`  
**追加対応:** 2026-04-23（バリデーション緩和方式変更）  
**追加フォルダ:** `docs/20260423_1620_MAIMLバリデーション機能追加/`、`docs/20260423_1650_MAIMLバリデーション緩和方式変更/`

---

## 背景・課題

`backend/src/utils/maimlParser.ts` のMAIMLバリデーションにて、アップロード時（lenientモード）と編集画面での保存時（strictモード）が同じバリデーション基準で動作していた。

編集画面で補正・追記可能な項目（document id属性、creator/vendor/owner/date等）についてもアップロードをブロックしてしまうため、ユーザーが修正前のファイルをアップロードできない状態になっていた。

---

## 対応内容

### フェーズ1: バリデーションモードの分離（初回対応）

`validateDocumentStructure()` にてuuid以外の必須子要素の扱いをモード別に分離。  
**※初回は「エラー→警告に降格」方式で実装したが、後続フェーズで方式を変更。**

### フェーズ2: `validateDuplicateIds()` バグ修正

初回ID出現時に空配列をセットするだけで要素情報を追加していなかったため、重複チェック（`occurrences.length > 1`）が常に機能しなかった。初回出現時にも要素情報を配列に格納するよう修正。

```typescript
// 修正前（バグあり）
if (!idMap.has(id)) {
  idMap.set(id, []);  // 空配列のまま → 重複検出不可
} else {
  idMap.get(id)?.push({ ... });
}

// 修正後
if (!idMap.has(id)) {
  idMap.set(id, [{ elementType: currentElementType, path: path }]);  // 初回も格納
} else {
  idMap.get(id)?.push({ ... });
}
```

### フェーズ3: バリデーション緩和方式を `canBeIgnoredOnUpload` フラグ方式に変更（追加対応）

初回対応（警告への降格）では **DB保存時にエラー情報が失われる** 問題があったため、方式を変更。  
「エラーのまま保持しつつ、アップロード許可フラグで識別する」方式に統一。

#### 変更の概要

| 方式 | 説明 | 問題点 |
|------|------|--------|
| 旧: 警告降格方式 | lenientモードでエラーを `warnings` に移動 | DB保存時にエラー数が消える・整合性が取れない |
| 新: フラグ方式 | エラーは `errors` に残し `canBeIgnoredOnUpload: true` を付与 | エラー情報を保持しつつアップロード可否のみ制御できる |

---

## 最終的なバリデーション分類

| 項目 | lenient（アップロード時） | strict（保存時） |
|------|----------------------|----------------|
| document `uuid` 欠落 | 🔴 致命的エラー（ブロック） | 🔴 エラー |
| document `uuid` 形式不正 | 🔴 致命的エラー（ブロック） | 🔴 エラー |
| document `id` 属性欠落 | 🟠 編集可能エラー（アップロード許可） | 🔴 エラー |
| document `creator` 欠落 | 🟠 編集可能エラー（アップロード許可） | 🔴 エラー |
| document `vendor` 欠落 | 🟠 編集可能エラー（アップロード許可） | 🔴 エラー |
| document `owner` 欠落 | 🟠 編集可能エラー（アップロード許可） | 🔴 エラー |
| document `date` 欠落 | 🟠 編集可能エラー（アップロード許可） | 🔴 エラー |
| method `id` 属性欠落 | 🟠 編集可能エラー（アップロード許可） | 🔴 エラー |
| protocol欠落 / pnml欠落 | 🔴 致命的エラー（ブロック） | 🔴 エラー |
| 参照エラー / ID重複 | 🔴 致命的エラー（ブロック） | 🔴 エラー |
| XML構文エラー | 🔴 致命的エラー（ブロック） | 🔴 エラー |

**🟠 編集可能エラー** = `canBeIgnoredOnUpload: true` が付与されたエラー。  
アップロードはブロックされないが、編集画面のValidationPanelに「編集可能」タグ付きで表示される。

**document uuidをlenientでもエラーにする理由:**  
document uuidはアップロード時に `project_uuid` フィールドへ格納されるため、アップロード後は変更不可。欠落・不正の場合は編集画面での補正手段がないためエラーとした。

---

## 実装詳細

### 型定義（`maimlValidation.ts`）

```typescript
// ErrorContent に canBeIgnoredOnUpload フィールドを追加
export interface ErrorContent {
  message: string;
  severity: 'error' | 'warning';
  code?: string;
  path?: string;
  canBeIgnoredOnUpload?: boolean;  // ← 追加: trueの場合アップロードはブロックしない
}
```

### バリデーションロジック（`maimlParser.ts`）

```typescript
// lenientモード: creator/vendor/owner/date/id欠落は canBeIgnoredOnUpload=true でerrorsに追加
if (mode === 'lenient') {
  errors.push({
    message: '...',
    severity: 'error',
    canBeIgnoredOnUpload: true,  // アップロードはブロックしない
    path: '...',
    code: '...',
  });
} else {
  errors.push({ message: '...', severity: 'error', path: '...', code: '...' });
}
```

### アップロード判定（`fileAccessService.ts`）

```typescript
// canBeIgnoredOnUpload=true のエラーはアップロードブロックから除外
const fatalErrors = validationResult.errors.filter(
  (e) => e.severity === 'error' && !e.canBeIgnoredOnUpload
);
const ignorableErrors = validationResult.errors.filter(
  (e) => e.severity === 'error' && e.canBeIgnoredOnUpload === true
);

if (fatalErrors.length > 0) {
  // アップロードブロック
}
// ignorableErrors はレスポンスに含めて通知のみ
```

### フロントエンド表示（`ValidationPanel.tsx`）

エラーを3分類して表示：
- **致命的エラー**（赤タグ）: `canBeIgnoredOnUpload` が false / 未設定
- **編集可能エラー**（オレンジタグ）: `canBeIgnoredOnUpload: true`
- **警告**（黄タグ）: `severity: 'warning'`

---

## テストデータ・テストソース整備

### テストデータ（`backend/tests/utils/maiml_validation/`）

12ケースのサンプルMAIMLファイルを作成。

| ファイル | 内容 |
|---------|------|
| `01_valid.maiml` | 正常ファイル |
| `02_document_missing_children.maiml` | creator/vendor/owner/date欠落（uuidあり） |
| `03_document_missing_id.maiml` | document id属性欠落 |
| `04_method_missing_id.maiml` | method id属性欠落 |
| `05_invalid_uuid.maiml` | document UUID形式不正 |
| `06_missing_protocol.maiml` | protocol要素欠落 |
| `07_missing_pnml.maiml` | pnml要素欠落 |
| `08_reference_error.maiml` | 存在しないIDを参照 |
| `09_duplicate_id.maiml` | ID重複 |
| `10_xml_syntax_error.maiml` | XML構文エラー |
| `11_warning_only_combined.maiml` | 複合警告（document id欠落 + 子要素4件欠落 + method id欠落） |
| `12_document_missing_uuid.maiml` | document uuid要素欠落 |

### テストソース（`backend/tests/utils/maimlParser.validation.test.ts`）

12ケース × lenient/strict の24テスト + 実ファイル2テスト = **合計26テスト**  

テストヘルパー関数を追加：
- `hasFatalError(result)` — `canBeIgnoredOnUpload` が false/未設定のエラーが存在するか
- `hasIgnorableError(result)` — `canBeIgnoredOnUpload: true` のエラーが存在するか

---

## テスト結果

```
Test Suites: 1 passed, 1 total
Tests:       26 passed, 26 total
Time:        ~3s
```

---

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `backend/src/types/maimlValidation.ts` | 修正 | `canBeIgnoredOnUpload?: boolean` フィールド追加 |
| `frontend/src/types/maimlValidation.ts` | 修正 | 同フィールド追加 |
| `backend/src/utils/maimlParser.ts` | 修正 | uuid欠落エラー化・validateDuplicateIdsバグ修正・lenient時canBeIgnoredOnUploadフラグ付与 |
| `backend/src/services/fileAccessService.ts` | 修正 | fatalErrors判定を `!canBeIgnoredOnUpload` 条件に変更 |
| `frontend/src/components/editorv2/components/ValidationPanel.tsx` | 修正 | 致命的/編集可能/警告の3分類表示 |
| `backend/tests/utils/maimlParser.validation.test.ts` | 新規→修正 | バリデーションテストソース（26テスト、フラグ方式対応） |
| `backend/tests/utils/maiml_validation/01〜12_*.maiml` | 新規 | テスト用MAIMLサンプル（12ファイル） |
| `docs/20260423_1146_MAIMLアップロードバリデーション緩和/validation_test_cases.md` | 新規 | テストケース一覧ドキュメント |

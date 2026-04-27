# MAIMLバリデーション テストケース一覧

**テストファイル:** `backend/tests/utils/maimlParser.validation.test.ts`  
**テストデータ:** `backend/tests/utils/maiml_validation/`  
**作成日:** 2026-04-23

---

## バリデーションモード概要

| モード | 使用箇所 | 概要 |
|--------|----------|------|
| `lenient` | MAIMLアップロード時 | 編集画面で補正・追記可能な項目はエラーを警告に降格。アップロードを許可。 |
| `strict`  | 編集画面での保存時 | すべての不備をエラーとして扱う。保存を拒否。 |

---

## テストケース一覧

| No. | ファイル名 | 問題内容 | lenient | strict | 理由 |
|-----|-----------|---------|---------|--------|------|
| 01 | `01_valid.maiml` | 正常ファイル | ✅ OK | ✅ OK | 問題なし |
| 02 | `02_document_missing_children.maiml` | document子要素欠落<br>（creator/vendor/owner/date） | 🟡 警告→成功 | 🔴 エラー→失敗 | 編集画面で追加可能 |
| 03 | `03_document_missing_id.maiml` | document id属性欠落 | 🟡 警告→成功 | 🔴 エラー→失敗 | 編集画面で追加可能 |
| 04 | `04_method_missing_id.maiml` | method id属性欠落 | 🟡 警告→成功 | 🔴 エラー→失敗 | 編集画面で追加可能 |
| 05 | `05_invalid_uuid.maiml` | document UUID形式不正 | 🔴 エラー→失敗 | 🔴 エラー→失敗 | UUIDは変更不可（後述） |
| 06 | `06_missing_protocol.maiml` | protocol要素欠落 | 🔴 エラー→失敗 | 🔴 エラー→失敗 | 構造的必須要素 |
| 07 | `07_missing_pnml.maiml` | pnml要素欠落 | 🔴 エラー→失敗 | 🔴 エラー→失敗 | 構造的必須要素 |
| 08 | `08_reference_error.maiml` | 存在しないIDを参照 | 🔴 エラー→失敗 | 🔴 エラー→失敗 | 参照整合性破壊 |
| 09 | `09_duplicate_id.maiml` | ID重複 | 🔴 エラー→失敗 | 🔴 エラー→失敗 | 参照整合性破壊 |
| 10 | `10_xml_syntax_error.maiml` | XML構文エラー | 🔴 エラー→失敗 | 🔴 エラー→失敗 | パース不可 |
| 11 | `11_warning_only_combined.maiml` | 複合警告<br>（document id欠落 + 子要素4件欠落 + method id欠落） | 🟡 警告→成功 | 🔴 エラー→失敗 | すべて編集画面で補正可能 |
| 12 | `12_document_missing_uuid.maiml` | document uuid要素欠落 | 🔴 エラー→失敗 | 🔴 エラー→失敗 | UUIDは変更不可（後述） |

---

## lenientでもエラーになる項目（警告に降格しない）

以下の項目は、編集画面で補正できないためlenientモードでもエラーとして扱います。

### document/uuid
- **理由:** `project_uuid` フィールドの設定に使用される。アップロード後にデータベースに格納されるため変更不可。
- **関連ケース:** 05（UUID形式不正）、12（uuid要素欠落）

### 参照整合性（reference_error / duplicate_id）
- **理由:** 存在しないIDへの参照やID重複は、Petri Netの参照関係（placeRef等）を破壊する。画面上で修正しても再アップロードが必要。
- **関連ケース:** 08（参照エラー）、09（ID重複）

### 構造的必須要素（protocol / pnml / program / method uuid）
- **理由:** これらはMAIMLの基本構造として必須であり、欠落すると画面描画が不可能。
- **関連ケース:** 06（protocol欠落）、07（pnml欠落）

### XML構文エラー
- **理由:** XML自体が解析できないためバリデーションの前提が成立しない。
- **関連ケース:** 10（XML構文エラー）

---

## lenientで警告に降格される項目

以下の項目は編集画面で補正・追記可能なため、lenientモードでは警告として扱いアップロードを許可します。

| 項目 | 降格理由 |
|------|---------|
| document `id` 属性欠落 | 編集画面でid属性を追加可能 |
| document `creator` 要素欠落 | 編集画面で追加可能 |
| document `vendor` 要素欠落 | 編集画面で追加可能 |
| document `owner` 要素欠落 | 編集画面で追加可能 |
| document `date` 要素欠落 | 編集画面で追加可能 |
| method `id` 属性欠落 | 編集画面でid属性を追加可能 |

---

## テスト実行方法

```bash
cd backend
npx jest tests/utils/maimlParser.validation.test.ts --no-coverage
```

### 期待される結果

```
Tests: 26 passed, 26 total
```

---

## 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/utils/maimlParser.ts` | `validateDocumentStructure()` にてuuid欠落を両モードともエラー化。`validateDuplicateIds()` の初回ID格納バグを修正。 |
| `backend/tests/utils/maimlParser.validation.test.ts` | 12ケース × lenient/strict = 24テスト + ベースファイル2テスト |
| `backend/tests/utils/maiml_validation/` | テスト用MAIMLサンプルファイル（01〜12） |

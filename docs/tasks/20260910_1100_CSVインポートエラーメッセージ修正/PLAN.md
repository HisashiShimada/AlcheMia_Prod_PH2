# タスク計画書: CSVインポートエラーメッセージ修正

## メタデータ

- **作成日時**: 2026-09-10 11:00
- **タスクID**: 20260910_1100_CSVインポートエラーメッセージ修正
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## 1. タスク概要

ロール管理・ユーザー管理のCSVインポートでエラーが発生した際、何が原因でエラーになったかユーザーに伝わっていない問題を修正する。

---

## 2. 問題の詳細

### 根本原因の構造

バックエンドは `{ statusCode, code, message, details }` を throw し、
`errorHandler` が `response.data.error.message` / `response.data.error.details` として返しているが、
フロントエンドの `extractErrorMessage` がこれらを**完全に無視**している。

`extractErrorMessage` は内部で `extractErrorCode` → `mapErrorToMessage` を呼ぶだけで、
`PROVIDER_FUNCTION_NOT_ALLOWED` などCSV固有のエラーコードは `ERROR_CODE_TO_KEY` に未登録のため、
常に `defaultMessage`（汎用メッセージ）が返る。

---

## 3. 目的と期待される成果

- [ ] CSV インポートでバリデーションエラーが発生した際、バックエンドから返ってきたエラーメッセージがユーザーに表示される
- [ ] `details` 配列がある場合（行番号・フィールド名付きエラー）も表示できる
- [ ] 既存の `extractErrorMessage` 呼び出し箇所への影響を最小化する（後方互換性を維持）

---

## 4. 実装ステップ

### Step 1: `extractErrorMessage` の修正とユーティリティ追加

**ファイル**: `frontend/src/utils/errorUtils.ts`

**優先順位の変更:**
1. `response.data.error.message`（バックエンドから返ってきた具体的メッセージ）
2. 通常の `Error.message`（`new Error(msg)` で throw された場合）
3. `mapErrorToMessage(code)` によるエラーコード → 翻訳キーマッピング
4. `defaultMessage`（呼び出し元が渡したフォールバック）

**`extractErrorDetails` を新規追加:**  
`response.data.error.details` 配列を取り出して `string[]` で返す。

- [ ] **1-1**: `AxiosApiErrorBody` の型に `details` フィールドを追加
- [ ] **1-2**: `extractErrorMessage` にバックエンドメッセージ優先ロジックを追加
- [ ] **1-3**: `extractErrorDetails` 関数を追加・export

### Step 2: `RoleManagement.tsx` の CSV アップロードエラー表示改善

**ファイル**: `frontend/src/components/SystemManagement/RoleManagement.tsx`

- [ ] **2-1**: `extractErrorDetails` を import
- [ ] **2-2**: CSV アップロードの catch で details を付加して表示

### Step 3: `UserManagement.tsx` の CSV アップロードエラー表示改善

**ファイル**: `frontend/src/components/SystemManagement/UserManagement.tsx`

- [ ] **3-1**: `extractErrorDetails` を import
- [ ] **3-2**: CSV アップロードの catch で details を付加して表示

---

## 5. 変更ファイル一覧

| # | ファイル | 変更種別 | 内容 |
|---|---------|---------|------|
| 1 | `frontend/src/utils/errorUtils.ts` | 修正 | `extractErrorMessage` バックエンドメッセージ優先化・`extractErrorDetails` 追加 |
| 2 | `frontend/src/components/SystemManagement/RoleManagement.tsx` | 修正 | CSV upload catch で details 付きメッセージ表示 |
| 3 | `frontend/src/components/SystemManagement/UserManagement.tsx` | 修正 | 同上 |

---

## 6. 影響範囲の分析

`extractErrorMessage` は全画面で使われているが、変更は**バックエンドのメッセージがある場合のみ挙動が変わる**。
バックエンドメッセージなし→エラーコードマッピング→defaultMessage の流れは維持される。

| ケース | 変更前 | 変更後 |
|--------|--------|--------|
| バックエンドが `message` を返した | defaultMessage が表示 | バックエンドの message を表示 ✅ |
| ネットワークエラー（レスポンスなし） | 従来通り | 変更なし |
| E5012 等の既知エラーコード | 翻訳キーのメッセージ | バックエンドの message を優先 ※ |

※ 認証系エラーはバックエンドも汎用メッセージを返すため実害なし。

---

## 7. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| バックエンドが技術的な英語メッセージを返すケースでそのままユーザーに見える | 低 | `messages.ts` で日英両対応済みのため問題なし |
| `details` 型が想定と異なるケース | 低 | `d.message ?? String(d)` でフォールバック |

---

## 8. テスト計画

- [ ] ロール管理でプロバイダーメニュー（010000）を含む CSV をアップロード → 具体的なエラーメッセージが表示されること
- [ ] ロール管理で role_cd が重複した CSV をアップロード → 具体的なエラーメッセージが表示されること
- [ ] ユーザー管理で必須項目欠落の CSV をアップロード → 行番号付きのエラーメッセージが表示されること
- [ ] 通常の認証エラー（403）では従来通り汎用メッセージが表示されること

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-10 11:00
- **承認日時**: 2026-09-10（承認済み）
- **承認者コメント**: 承認します。

---

## 10. 実施記録

### 実施日時

開始: 2026-09-10  
完了: 2026-09-10

### 計画からの変更点

なし

### 発生した問題と解決方法

なし

### 最終的な成果物

- [x] `errorUtils.ts` — `AxiosApiErrorBody` に `details` フィールド追加
- [x] `errorUtils.ts` — `extractErrorMessage` にバックエンドメッセージ優先ロジック追加
- [x] `errorUtils.ts` — `extractErrorDetails` 関数を新規追加・export
- [x] `RoleManagement.tsx` — `extractErrorDetails` を import、CSV upload catch で details 付きメッセージ表示
- [x] `UserManagement.tsx` — `extractErrorDetails` を import、CSV upload catch で details 付きメッセージ表示
- [x] TypeScript コンパイル確認 — EXIT:0（エラーなし）

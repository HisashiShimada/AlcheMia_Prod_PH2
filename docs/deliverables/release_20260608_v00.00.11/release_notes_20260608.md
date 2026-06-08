# リリースノート

**リリース日**: 2026-06-08  
**対象ブランチ**: main  
**前回リリースコミット**: `917d6010`  
**今回リリースコミット**: `27fe0d5c`

---

## 新機能・改善

### 1. XMLエディタでの編集内容の反映（Issue39）

- **`TemplateEditorDialog.tsx` 改修**: XMLテンプレートエディタで編集した内容が正しく反映されるよう修正。編集操作後の反映ロジックを改善
- **`templateToXML.ts` 改修**: テンプレートオブジェクトから XML への変換処理を改善し、編集内容が正確に XML に出力されるよう対応

### 2. 多言語メッセージの追加

- **`en.json` / `ja.json` 更新**: フロントエンドの一部画面でメッセージが不足していた箇所に英語・日本語のメッセージキーを追加

---

## バグ修正

### 1. MAIMLファイル判定ミスによる誤バリデーション修正

- **問題**: XMLテンプレートファイルに対して、誤って MAIML バリデーションが適用されてしまっていた
- **修正内容**:
  - `fileAccessService.ts`: ファイル種別（MAIMLファイル / XMLテンプレートファイル）の判定ロジックを修正
  - `maimlAnalyzer.ts`: 不要となったユーティリティを削除し、判定ロジックを整理

---

## DB マイグレーション

なし

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/services/fileAccessService.ts` | MAIMLファイル / XMLテンプレートファイルの判定ロジック修正 |
| `backend/src/utils/maimlAnalyzer.ts` | 不要となったユーティリティを削除 |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | XMLエディタの編集内容反映ロジック改善 |
| `frontend/src/utils/templateToXML.ts` | テンプレートオブジェクト → XML 変換処理の改善 |
| `frontend/src/locales/ja.json` | 不足していた日本語メッセージを追加 |
| `frontend/src/locales/en.json` | 不足していた英語メッセージを追加 |

# タスク計画書: 不確かさ基準インポート処理修正

## メタデータ
- **作成日時**: 2026-09-25 10:00
- **タスクID**: 20260925_1000
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

実験管理者メニュー > 名前空間管理タブ > 不確かさ基準管理タブ内の
「不確かさ基準インポート」について、処理フローを調査した結果、
以下の問題点が発見されたため修正・追加実装する。

---

## 問題点の詳細

| # | 問題 | 場所 | 影響 |
|---|------|------|------|
| ① | CSV エクスポートに `nameSpaceId` が含まれない | `uncertaintyCriteriaService.ts` EXPORT_CSV_HEADERS | CSV 往復でレイヤー情報が失われる |
| ② | フロントから `nameSpaceId` を送信しない | `uncertaintyCriteriaApiService.ts` | DB に `name_space_id=''` で INSERT |
| ③ | Prefix の存在確認がない | Service/Repository | 存在しない Prefix の基準が登録される |
| ④ | namespace_term の存在確認がない | Service/Repository | 用語が未登録でも基準が登録される |
| ⑤ | 画面で選択中のスコープと異なる nameSpaceId を持つファイルをインポートすると違うスコープに登録される | `uncertaintyCriteriaApiService.ts` / `UncertaintyImportModal.tsx` | インポート成功と表示されるが選択中の一覧に出ない |
| ⑥ | `validatePrefixExists.sql` が `namespace_id` を無視していた | SQL / Repository | 他スコープの同名 prefix がヒットし誤ってバリデーション通過する |

---

## 確定仕様

| # | 項目 | 仕様 |
|---|------|------|
| ① | nameSpaceId 指定方法 | CSV/JSON ファイル内にカラムとして含める（UI変更なし） |
| ② | 重複（同一 uncertainty_key が既存の場合） | 新バージョンとして追加（既存動作維持） |
| ③ | Prefix・用語が対象レイヤーに存在しない | **全体エラー**（1件も INSERT しない） |

---

## 修正後の処理フロー

### 正常系（修正後の追加バリデーション部分のみ）

```
uncertaintyCriteriaService.importCriteria()
  ⑭ ファイル解析（CSV/JSON → BulkInsertCriteriaItem[]）
     ★ nameSpaceId を必須カラムとして解析（CSV: ヘッダー必須, JSON: フィールド必須）
  ⑮ nameSpaceId が空の item があれば 400 エラー（全体中止）
  ⑯ ★新規★ バリデーション
       uncertaintyCriteriaRepository.validatePrefixAndTerms() 呼び出し
         a. uncertaintyKey を "prefix" と "localname" に分解
         b. Prefix 存在確認（prefix テーブル）
            → 1件でも不存在 → 400 E1004 エラー（全体中止）
         c. namespace_term 存在確認
            → 1件でも不存在 → 400 E1004 エラー（全体中止）
  ⑰ 全バリデーション通過 → bulkInsertCriteria()（変更なし）
```

### 異常系（追加分）

| # | 発生箇所 | 原因 | レスポンス |
|---|---------|------|-----------|
| ① | Service | nameSpaceId が空文字 | 400 E1004 |
| ② | Service（validatePrefixAndTerms） | Prefix が存在しない | 400 E1004 |
| ③ | Service（validatePrefixAndTerms） | namespace_term が存在しない | 400 E1004 |

---

## 修正・追加ファイル一覧

| # | ファイル | 変更種別 | 変更概要 |
|---|---------|---------|---------|
| 1 | `backend/src/services/uncertaintyCriteriaService.ts` | 修正 | ①`CSV_REQUIRED_HEADERS`/`EXPORT_CSV_HEADERS` に `nameSpaceId` 追加、②`ImportOptions` に `overrideNameSpaceId?` 追加・items の nameSpaceId 上書き処理追加、③`importCriteria()` にバリデーション追加 |
| 2 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 修正 | `validatePrefixAndTerms()` 関数追加・Prefix 確認呼び出しに `nameSpaceId` 引数追加 |
| 3 | `backend/src/sql/queries/uncertainty_criteria/validatePrefixExists.sql` | 新規→修正 | Prefix 存在確認 SQL。`namespace_id` による絞り込みを追加し `$1(org), $2(nsId), $3(prefixes[])` の3引数に変更 |
| 4 | `backend/src/sql/queries/uncertainty_criteria/validateTermExists.sql` | 新規 | namespace_term 存在確認 SQL（`namespace_id` で絞り込み済み） |
| 5 | `backend/src/controllers/uncertaintyCriteriaController.ts` | 修正 | ①catch ブロックにバリデーションエラー文字列追加、②`scopeKey` 受け取り・`findNamespaceIdByScopeKey()` で namespace_id 解決・`overrideNameSpaceId` として Service へ渡す |
| 6 | `frontend/src/services/uncertaintyCriteriaApiService.ts` | 修正 | `importUncertaintyCriteria()` に `scopeKey?` 引数追加・FormData に `scopeKey` を追加して送信 |
| 7 | `frontend/src/components/uncertainty/UncertaintyImportModal.tsx` | 修正 | Props に `scopeKey?: string \| null` 追加・`importUncertaintyCriteria()` の第3引数として渡す |
| 8 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | 修正 | `<UncertaintyImportModal>` に `scopeKey={resolveScopeKey(selectedNsKey) ?? null}` を渡す |

---

## 実装ステップ

- [x] PLAN.md 作成
- [x] validatePrefixExists.sql 作成
- [x] validateTermExists.sql 作成
- [x] uncertaintyCriteriaRepository.ts に validatePrefixAndTerms() 追加
- [x] uncertaintyCriteriaService.ts 修正（nameSpaceId 必須化・CSV ヘッダー追加・バリデーション追加）
- [x] uncertaintyCriteriaController.ts の catch ブロック修正
- [x] ビルドエラー確認（BE）→ エラーなし
- [x] スコープ不一致バグ修正（Act②）
  - [x] uncertaintyCriteriaService.ts: `ImportOptions` に `overrideNameSpaceId` 追加・上書き処理追加
  - [x] uncertaintyCriteriaController.ts: `scopeKey` 受け取り・namespace_id 解決・Service へ渡す
  - [x] uncertaintyCriteriaApiService.ts: `importUncertaintyCriteria()` に `scopeKey` 引数追加
  - [x] UncertaintyImportModal.tsx: Props に `scopeKey` 追加・呼び出しに渡す
  - [x] UncertaintyManagement.tsx: モーダルに `scopeKey={resolveScopeKey(selectedNsKey) ?? null}` を渡す
- [x] ビルドエラー確認（BE + FE）→ エラーなし
- [x] validatePrefixExists.sql に `namespace_id` 絞り込みを追加（Act③）
- [x] uncertaintyCriteriaRepository.ts の `validatePrefixAndTerms()` 引数修正・エラーメッセージ改善（Act③）
- [x] ビルドエラー確認（BE）→ エラーなし

---

## 承認記録
- **計画書提示日時**: 2026-09-25 10:00
- **承認日時**: 2026-09-25 (Act モード切り替えにより承認)

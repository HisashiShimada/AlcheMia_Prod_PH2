# タスク計画書: 不確かさ基準インポートスキップバグ修正

## メタデータ
- **作成日時**: 2026-09-17 18:00
- **タスクID**: 20260917_1800
- **優先度**: 高
- **推定工数**: 0.5時間

---

## タスク概要

実験管理者が不確かさ基準一覧画面でインポートを実行すると「0件インポートしました（スキップ: 1件）」と表示され、データが登録されないバグの調査・修正。

---

## 調査結果

### 根本原因

`backend/src/repositories/uncertaintyCriteriaRepository.ts` の `bulkInsertCriteria` 関数内で、`invalidatePreviousVersions.sql` を呼び出す際に **第5パラメータ（`update_user_id` = `$5`）が不足している**。

### エラー発生フロー（修正前）

```
【フロントエンド】
UncertaintyImportModal → importUncertaintyCriteria(file, format)
  ↓ FormData: { file, format }（nameSpaceId は未送信）

【バックエンド Controller】
nameSpaceId = req.body.nameSpaceId ?? '' → '' (空文字)

【Service: importCriteria】
CSVパース → items = [{ nameSpaceId: '', uncertaintyKey: 'xxx', ... }]
  ↓ bulkInsertCriteria(organizationId, items) を呼び出す

【Repository: bulkInsertCriteria】（トランザクション内）
try {
  ① insertNewVersion.sql($1~$15) → INSERT 成功
  ② invalidatePreviousVersions.sql($1, $2, $3, $4)  ← ❌ $5 が不足！
     → PostgreSQL: "bind message supplies 4 parameters,
                    but prepared statement requires 5" エラー
  ③ catch → skippedCount++
}
→ tx() が COMMIT を試みるが接続は abort state → ROLLBACK

【レスポンス】
insertedCount: 0, skippedCount: 1

【UI表示】
「0件インポートしました（スキップ: 1件）」
```

### 参照コード比較

**`insertNewVersion`（正常・参照実装）：**
```typescript
await t.none(invalidatePrevSql, [
  organizationId,       // $1
  data.nameSpaceId,     // $2
  data.uncertaintyKey,  // $3
  newVersion,           // $4
  data.createUserId,    // $5 ← ✅ あり
]);
```

**`bulkInsertCriteria`（バグあり）：**
```typescript
await t.none(invalidatePrevSql, [
  organizationId,
  item.nameSpaceId,
  item.uncertaintyKey,
  newVersion,
  // ← ❌ item.createUserId が欠落
]);
```

**`invalidatePreviousVersions.sql`（$5 が必須）：**
```sql
UPDATE uncertainty_criteria
SET
    is_invalid       = TRUE,
    update_user_id = $5,   -- ← $5 必須
    update_at      = NOW()
WHERE ...
```

---

## 修正方針

**最小の修正**: `bulkInsertCriteria` の `invalidatePrevSql` 呼び出しに `item.createUserId` を追加する（1行追加）。

---

## 修正前後の機能フロー

### 修正前フロー（バグあり）

```
インポート実行
  └─ bulkInsertCriteria
       └─ pgp.tx(async (t) => {
            for each item:
              try {
                ① insertCriteriaSql($1~$15)   → 成功
                ② invalidatePrevSql($1,$2,$3,$4) → ❌ $5 不足エラー
              } catch {
                skippedCount++  ← スキップカウント増加
              }
          })
          → tx ROLLBACK（接続 abort state のため）
          → insertedCount=0, skippedCount=1

表示: 「0件インポートしました（スキップ: 1件）」
```

### 修正後フロー（正常）

```
インポート実行
  └─ bulkInsertCriteria
       └─ pgp.tx(async (t) => {
            for each item:
              try {
                ① insertCriteriaSql($1~$15)        → 成功
                ② invalidatePrevSql($1,$2,$3,$4,$5) → ✅ 旧バージョン無効化
                ③ insertSelectorSql（定性の場合）   → 成功
                insertedCount++
              } catch {
                skippedCount++（重複キー等の本当のエラー時のみ）
              }
          })
          → tx COMMIT 成功
          → insertedCount=1, skippedCount=0

表示: 「1件インポートしました（スキップ: 0件）」
```

---

## 修正・追加が必要なファイル一覧

| No | ファイル | 種別 | 概要 |
|----|---------|------|------|
| 1 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 修正 | `bulkInsertCriteria` 内の `invalidatePrevSql` 呼び出しに第5引数 `item.createUserId` を追加 |

---

## 実装ステップ

- [x] 調査・根本原因特定
- [ ] タスク計画書作成（本ファイル）
- [ ] `uncertaintyCriteriaRepository.ts` の `bulkInsertCriteria` 修正
- [ ] TypeScript ビルドエラー確認
- [ ] 動作確認（手動テスト手順記載）

---

## 影響範囲

- **修正対象**: `bulkInsertCriteria`（インポート専用関数）
- **他機能への影響**: なし
- **既存APIへの影響**: なし（内部ロジック修正のみ）

---

## リスク

| リスク | 対策 |
|--------|------|
| 修正後に重複キーエラーが本当に発生した場合、正しくスキップされるか | `insertCriteriaSql` が重複PKC でエラーを投げることを確認済み（同じ try-catch 内で捕捉される） |

---

## テスト計画

### 手動テスト
- [ ] CSV形式のファイルで1件インポートし、「1件インポートしました（スキップ: 0件）」が表示されることを確認
- [ ] 同じファイルを再度インポートし、「0件インポートしました（スキップ: 1件）」が表示されることを確認（重複スキップが正常動作）
- [ ] JSON形式のファイルでも同様に確認

---

## 承認記録

- **計画書提示日時**: 2026-09-17 18:00
- **承認日時**: 2026-09-17 18:00
- **承認者コメント**: ユーザー承認済み（Actモード切り替えにより）

---

## 実施記録

### 実施日時
開始: 2026-09-17 18:00
完了: 2026-09-17 18:10

### 最終的な成果物
- [x] `backend/src/repositories/uncertaintyCriteriaRepository.ts` 修正完了（`bulkInsertCriteria` の `invalidatePrevSql` 呼び出しに `item.createUserId` 追加）
- [x] TypeScript ビルドエラーなし確認済み

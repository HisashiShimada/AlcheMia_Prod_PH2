# タスク計画書: issuesテーブル名修正（issues → issue）

## メタデータ
- **作成日時**: 2026-02-27 10:39
- **タスクID**: issues-table-name-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`backend/src/sql/queries` 配下のSQLクエリファイルにおいて、存在しないテーブル名 `issues` を正しいテーブル名 `issue` に修正する。

## 調査結果

### 対象ディレクトリ

`backend/src/sql/queries/` 配下を検索し、`issues` という文字列を含むSQLファイルを調査した。

### issuesテーブルへのSQL操作が存在するファイル（修正対象）

| # | ファイルパス | 操作種別 | 修正箇所 |
|---|---|---|---|
| 1 | `backend/src/sql/queries/issues/create.sql` | INSERT | `INSERT INTO issues (` |
| 2 | `backend/src/sql/queries/issues/delete.sql` | DELETE | `DELETE FROM issues` |
| 3 | `backend/src/sql/queries/issues/existsById.sql` | SELECT | `FROM issues` |
| 4 | `backend/src/sql/queries/issues/findById.sql` | SELECT | `FROM issues` |
| 5 | `backend/src/sql/queries/issues/findByOrganizationCount.sql` | SELECT | `FROM issues` |
| 6 | `backend/src/sql/queries/issues/findByOrganizationData.sql` | SELECT | `FROM issues` |
| 7 | `backend/src/sql/queries/issues/listIssuesWithCommentsIssues.sql` | SELECT | `FROM issues i` |
| 8 | `backend/src/sql/queries/issues/updateAssignee.sql` | UPDATE | `UPDATE issues` |
| 9 | `backend/src/sql/queries/issues/updatePartial.sql` | UPDATE | `UPDATE issues` |
| 10 | `backend/src/sql/queries/issues/updateStatus.sql` | UPDATE | `UPDATE issues` |
| 11 | `backend/src/sql/queries/issue_comment/addCommentCheckIssue.sql` | SELECT | `FROM issues` |

**合計：11ファイル**

### コメント行にのみ `issues` が含まれるファイル（修正不要）

以下のファイルはSQLコメント（`--`）内にのみ `issues` が登場するため、修正不要。

| ファイルパス | 内容 |
|---|---|
| `backend/src/sql/queries/issue_comment/addCommentGetAuthorName.sql` | コメント行のみ |
| `backend/src/sql/queries/issue_comment/addCommentInsert.sql` | コメント行のみ |
| `backend/src/sql/queries/issue_comment/addCommentGetNextSeq.sql` | コメント行のみ |

### 各ファイルの修正内容詳細

#### 1. `issues/create.sql`
```sql
-- 修正前
INSERT INTO issues (
-- 修正後
INSERT INTO issue (
```

#### 2. `issues/delete.sql`
```sql
-- 修正前
DELETE FROM issues
-- 修正後
DELETE FROM issue
```

#### 3. `issues/existsById.sql`
```sql
-- 修正前
  FROM issues
-- 修正後
  FROM issue
```

#### 4. `issues/findById.sql`
```sql
-- 修正前
FROM issues
-- 修正後
FROM issue
```

#### 5. `issues/findByOrganizationCount.sql`
```sql
-- 修正前
FROM issues
-- 修正後
FROM issue
```

#### 6. `issues/findByOrganizationData.sql`
```sql
-- 修正前
FROM issues
-- 修正後
FROM issue
```

#### 7. `issues/listIssuesWithCommentsIssues.sql`
```sql
-- 修正前
FROM issues i
-- 修正後
FROM issue i
```

#### 8. `issues/updateAssignee.sql`
```sql
-- 修正前
UPDATE issues
-- 修正後
UPDATE issue
```

#### 9. `issues/updatePartial.sql`
```sql
-- 修正前
UPDATE issues
-- 修正後
UPDATE issue
```

#### 10. `issues/updateStatus.sql`
```sql
-- 修正前
UPDATE issues
-- 修正後
UPDATE issue
```

#### 11. `issue_comment/addCommentCheckIssue.sql`
```sql
-- 修正前
FROM issues
-- 修正後
FROM issue
```

---

## 目的と期待される成果

### 目的
SQLクエリファイル内の誤ったテーブル名 `issues` を正しいテーブル名 `issue` に修正し、実行時エラーを解消する。

### 期待される成果
- [ ] 11ファイルすべての `issues` テーブル参照が `issue` に修正されること
- [ ] コメント行・エイリアス等のテーブル名以外の `issues` 文字列は変更しないこと

---

## 実装ステップ

### Phase 1: `issues/` フォルダ内の SELECT 系ファイル修正
- [ ] `issues/existsById.sql` の `FROM issues` を `FROM issue` に修正
- [ ] `issues/findById.sql` の `FROM issues` を `FROM issue` に修正
- [ ] `issues/findByOrganizationCount.sql` の `FROM issues` を `FROM issue` に修正
- [ ] `issues/findByOrganizationData.sql` の `FROM issues` を `FROM issue` に修正
- [ ] `issues/listIssuesWithCommentsIssues.sql` の `FROM issues i` を `FROM issue i` に修正

### Phase 2: `issues/` フォルダ内の INSERT/DELETE 系ファイル修正
- [ ] `issues/create.sql` の `INSERT INTO issues (` を `INSERT INTO issue (` に修正
- [ ] `issues/delete.sql` の `DELETE FROM issues` を `DELETE FROM issue` に修正

### Phase 3: `issues/` フォルダ内の UPDATE 系ファイル修正
- [ ] `issues/updateAssignee.sql` の `UPDATE issues` を `UPDATE issue` に修正
- [ ] `issues/updatePartial.sql` の `UPDATE issues` を `UPDATE issue` に修正
- [ ] `issues/updateStatus.sql` の `UPDATE issues` を `UPDATE issue` に修正

### Phase 4: `issue_comment/` フォルダ内のファイル修正
- [ ] `issue_comment/addCommentCheckIssue.sql` の `FROM issues` を `FROM issue` に修正

---

## 影響範囲

### 変更するファイル
1. `backend/src/sql/queries/issues/create.sql`
2. `backend/src/sql/queries/issues/delete.sql`
3. `backend/src/sql/queries/issues/existsById.sql`
4. `backend/src/sql/queries/issues/findById.sql`
5. `backend/src/sql/queries/issues/findByOrganizationCount.sql`
6. `backend/src/sql/queries/issues/findByOrganizationData.sql`
7. `backend/src/sql/queries/issues/listIssuesWithCommentsIssues.sql`
8. `backend/src/sql/queries/issues/updateAssignee.sql`
9. `backend/src/sql/queries/issues/updatePartial.sql`
10. `backend/src/sql/queries/issues/updateStatus.sql`
11. `backend/src/sql/queries/issue_comment/addCommentCheckIssue.sql`

### 影響を受ける機能
- 問題（Issue）管理機能全般
  - 問題の作成・取得・更新・削除
  - 問題コメントの追加

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| コメント行・エイリアス等を誤って変更する | 低 | 低 | 修正はテーブル名として使われている箇所のみに限定する |
| 修正漏れが発生する | 中 | 低 | 修正後に再度 `grep` 検索で確認する |

---

## 承認記録
- **計画書提示日時**: 2026-02-27 10:39
- **承認日時**: 2026-02-27 10:41
- **承認者コメント**: 承認します。修正作業を開始してください。

---

## 実施記録

### 実施日時
開始: 2026-02-27 10:41  
完了: 2026-02-27 10:44

### 計画からの変更点
なし

### 最終的な成果物
- [x] 11ファイルの `issues` → `issue` テーブル名修正

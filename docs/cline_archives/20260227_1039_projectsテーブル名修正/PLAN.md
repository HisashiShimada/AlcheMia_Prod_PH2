# タスク計画書: SQLクエリ内 `projects` テーブル名誤記修正

## メタデータ
- **作成日時**: 2026-02-27 10:51
- **タスクID**: sql-projects-to-project-fix
- **優先度**: 高
- **推定工数**: 0.5時間

---

## 1. タスク概要

`backend/src/sql/queries` 配下のSQLクエリファイルにて、存在しない `projects` テーブルを参照している箇所が3ファイル確認された。正しくは `project` テーブル（末尾に `s` なし）であるため、これを修正する。

---

## 2. 調査結果

### 調査対象
`backend/src/sql/queries/**/*.sql` 全ファイルを対象に `projects` キーワードを検索。

### 発見した誤りのあるファイル（3件）

#### ① `backend/src/sql/queries/projects/findByNameWithStatus.sql`

**誤り箇所:**
```sql
SELECT 
  id, 
  status 
FROM projects    -- ← 誤り
WHERE organization_id = $1 
  AND project_name = $2;
```

**修正内容:** `FROM projects` → `FROM project`

---

#### ② `backend/src/sql/queries/issues/listIssuesWithCommentsIssues.sql`

**誤り箇所:**
```sql
INNER JOIN projects p ON p.organization_id = i.organization_id AND p.project_id = i.project_id
--         ^^^^^^^^ ← 誤り
```

**修正内容:** `INNER JOIN projects p ON` → `INNER JOIN project p ON`

---

#### ③ `backend/src/sql/queries/issues/getProjectIdByName.sql`

**誤り箇所:**
```sql
SELECT project_id
FROM projects    -- ← 誤り
WHERE project_name = $1 AND organization_id = $2
```

**修正内容:** `FROM projects` → `FROM project`

---

## 3. 実装ステップ

### Phase 1: ファイル①の修正
- [ ] `backend/src/sql/queries/projects/findByNameWithStatus.sql` の `FROM projects` を `FROM project` に修正

### Phase 2: ファイル②の修正
- [ ] `backend/src/sql/queries/issues/listIssuesWithCommentsIssues.sql` の `INNER JOIN projects p ON` を `INNER JOIN project p ON` に修正

### Phase 3: ファイル③の修正
- [ ] `backend/src/sql/queries/issues/getProjectIdByName.sql` の `FROM projects` を `FROM project` に修正

### Phase 4: 修正漏れの確認
- [ ] 再度 `projects` キーワードで全体検索を実施し、修正漏れがないことを確認

---

## 4. 影響範囲

### 修正するファイル
1. `backend/src/sql/queries/projects/findByNameWithStatus.sql` - `FROM projects` → `FROM project`
2. `backend/src/sql/queries/issues/listIssuesWithCommentsIssues.sql` - `INNER JOIN projects` → `INNER JOIN project`
3. `backend/src/sql/queries/issues/getProjectIdByName.sql` - `FROM projects` → `FROM project`

### 影響を受ける機能
- プロジェクト名からプロジェクトIDとステータスを取得する機能（`findByNameWithStatus.sql`）
- コメント付き問題一覧取得機能（`listIssuesWithCommentsIssues.sql`）
- プロジェクト名からプロジェクトIDを取得する機能（`getProjectIdByName.sql`）

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正後もSQL実行時エラーが発生する | 高 | 低 | `project` テーブルのカラム定義（`id`, `status`, `project_name`, `project_id` 等）が一致しているかDDLで確認 |
| 他のSQLファイルにも同様の誤記が存在する | 中 | 低 | Phase 4 の再検索で確認 |

---

## 6. テスト計画

### 手動テスト
- [ ] 修正後、各SQLファイルを読み込む機能（問題一覧取得APIなど）を実行し、エラーが出ないことを確認

---

## 7. 承認記録

- **計画書提示日時**: 2026-02-27 10:51
- **承認日時**: ―
- **承認者コメント**: ―

---

## 8. 実施記録

### 実施日時
開始: ―  
完了: ―

### 計画からの変更点
―

### 発生した問題と解決方法
―

### 最終的な成果物
- [ ] `findByNameWithStatus.sql` 修正完了
- [ ] `listIssuesWithCommentsIssues.sql` 修正完了
- [ ] `getProjectIdByName.sql` 修正完了
- [ ] 修正漏れなし確認完了

# タスク計画書: プロジェクト管理画面バグ修正（ファイル数・公開エラー表示）

## メタデータ
- **作成日時**: 2026-03-31 14:22
- **タスクID**: project-management-bugfix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

プロジェクト管理画面における2件のバグを修正する。

1. プロジェクト一覧のファイル数が常に「0件」と表示される
2. 公開機能でステータスエラー等が返った際に、ダイアログ内メッセージではなくシステムエラーダイアログが表示される

---

## 調査結果

### 問題1: ファイル数が0件固定

**原因箇所**: `backend/src/services/projectService.ts` の `list()` 関数

```typescript
// 現状（バグ）
fileCount: 0, // 後で実装予定
totalSize: 0, // 後で実装予定
```

`list()` 内のSQLで `file_metadata` テーブルとのJOINが実装されておらず、ファイル数が常に `0` で返っている。フロントエンドの `ProjectFolderTree.tsx` はこの値を受け取って表示しているため、常に「0 ファイル」と表示される。

---

### 問題2: 公開エラーがシステムエラーとして表示される／ボタンの有効/無効制御が不完全

**原因1：エラーコードのマッピング不足**  
`MaimlPublishDialog.tsx` の `ERROR_MESSAGES` にバックエンドが返す `E7005` キーが存在しない。

バックエンド (`maimlPublishService.ts`) は公開条件チェック時に以下のエラーを `throw` する：

```
PROJECT_NOT_CHECKED_OUT  → チェックアウト状態でない
PROJECT_STATUS_INVALID   → ステータスが対象外
TASKS_NOT_COMPLETED      → 未完了タスクあり
MAIML_NOT_FOUND          → MAIMLファイルなし
ALREADY_IN_PROGRESS      → 処理進行中
```

しかし `projectController.ts` で `PROJECT_STATUS_INVALID` エラーを `E7005` コードに変換して返す：

```typescript
// projectController.ts
} else if (errorCode === 'E7005' || errorCode === 'E7006') {
  statusCode = 400;
```

```typescript
if (code === 'E7005') {
  res.status(400).json({ error: { code: 'E7005', ... } });
}
```

フロントエンドの `ERROR_MESSAGES` には `E7005` キーがないため `SYSTEM_ERROR` にフォールバックし、システムエラーダイアログが表示される。

**原因2：公開ボタンのステータス制御が不完全**  
公開ボタンの `disabled` 条件が以下のみで、**プロジェクトステータスを考慮していない**：

```typescript
disabled={!selectedProject || publishStatusLoading || isPolling}
```

バックエンドは **ステータス3（タスク結果レビュー待ち）** または **ステータス4（プロジェクト完了）** のみ公開可能とするが、フロントエンド側で事前にガードしていないため、ステータス0〜2・5でもボタンが押せてしまいエラーになる。

---

## 目的と期待される成果

- [ ] プロジェクト一覧でプロジェクト配下の実際のファイル数が表示される
- [ ] 公開機能でステータスエラー等が発生した場合、ダイアログ内に適切なエラーメッセージが表示される

---

## 実装ステップ

### Phase 1: 問題2の修正（フロントエンド）

- [ ] `frontend/src/components/project/ProjectManagement.tsx` の公開ボタンの `disabled` 条件に `selectedProject.status` が `3` または `4` 以外の場合を追加
- [ ] `frontend/src/components/project/MaimlPublishDialog.tsx` の `ERROR_MESSAGES` に `E7005` キーを追加（念のため残す）

### Phase 2: 問題1の修正（バックエンド）

- [ ] `backend/src/services/projectService.ts` の `list()` SQLクエリにファイル数取得サブクエリを追加
- [ ] `fileCount: 0` を `fileCount: parseInt(row.file_count, 10) || 0` に変更

---

## 変更ファイル

### 修正ファイル
1. `frontend/src/components/project/ProjectManagement.tsx`
   - 公開ボタンの `disabled` 条件にステータスチェックを追加（ステータス3または4のみ有効）
2. `frontend/src/components/project/MaimlPublishDialog.tsx`
   - `ERROR_MESSAGES` に `E7005` キーを追加
3. `backend/src/services/projectService.ts`
   - `list()` SQLに `file_metadata` テーブルからファイル数を取得するサブクエリを追加
   - `fileCount: 0` → `fileCount: parseInt(row.file_count, 10) || 0` に変更

---

## 修正の詳細

### ProjectManagement.tsx の修正（公開ボタン disabled 条件）

```typescript
// 修正前
disabled={!selectedProject || publishStatusLoading || isPolling}

// 修正後
// ステータス3（タスク結果レビュー待ち）または4（プロジェクト完了）のみ公開可能
const canPublish = selectedProject?.status === 3 || selectedProject?.status === 4;
disabled={!selectedProject || !canPublish || publishStatusLoading || isPolling}
```

### MaimlPublishDialog.tsx の修正

```typescript
// 修正後（E7005 を追加）
const ERROR_MESSAGES: Record<string, string> = {
  PROJECT_NOT_FOUND:       'プロジェクトが見つかりません',
  PROJECT_NOT_CHECKED_OUT: 'プロジェクトがチェックアウトされていません',
  PROJECT_STATUS_INVALID:  'プロジェクトステータスがタスク結果レビュー待ちではありません',
  E7005:                   'プロジェクトステータスがタスク結果レビュー待ちではありません',
  TASKS_NOT_COMPLETED:     '完了・異常終了以外のタスクが残っています',
  MAIML_NOT_FOUND:         'MAIMLファイルが存在しません',
  ALREADY_IN_PROGRESS:     '公開処理がすでに進行中です',
  SYSTEM_ERROR:            'システムエラーが発生しました',
};
```

### projectService.ts の修正

`list()` 関数内のSQLの SELECT 句に以下のサブクエリを追加：

```sql
(
  SELECT COUNT(*)
  FROM file_metadata fm
  WHERE fm.organization_id = p.organization_id
    AND fm.parent_folder_path LIKE $ORG_ID || '/projects/' || p.project_name || '%'
) as file_count,
```

※ `file_metadata.parent_folder_path` には `{organization_id}/projects/{project_name}` 形式のパスが格納されている。

そして返却値の変更：
```typescript
// 修正前
fileCount: 0, // 後で実装予定

// 修正後
fileCount: parseInt(row.file_count, 10) || 0,
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| SQLサブクエリによるパフォーマンス低下 | 低 | 中 | 1プロジェクトあたりのファイル数は多くないため影響軽微。インデックス（`parent_folder_path`）は既に存在する。 |
| `parent_folder_path` の形式が想定と異なる場合 | 中 | 低 | `file_metadata.sql` DDLとDBの実データを確認済み。形式は `{org_id}/projects/{project_name}` |

---

## テスト計画

- [ ] プロジェクト管理画面を開き、ファイルが存在するプロジェクトのファイル数が正しく表示されることを確認
- [ ] ファイルが0件のプロジェクトで「0 ファイル」と表示されることを確認
- [ ] チェックアウト済みでないプロジェクトに対して公開ボタンを押し、ダイアログ内にエラーメッセージが表示されることを確認
- [ ] ステータスが「タスク結果レビュー待ち」以外のプロジェクトに対して公開ボタンを押し、ダイアログ内に「プロジェクトステータスがタスク結果レビュー待ちではありません」と表示されることを確認

---

## 承認記録

- **計画書提示日時**: 2026-03-31 14:22
- **承認日時**: 
- **承認者コメント**: 

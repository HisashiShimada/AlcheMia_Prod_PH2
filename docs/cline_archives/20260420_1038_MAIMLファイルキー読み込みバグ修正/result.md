# 調査結果レポート: MAIMLファイルキー読み込みバグ調査

- **作成日時**: 2026-04-20 10:38
- **調査内容**: StorageServiceの読み込み処理確認

---

## 1. 問題の概要

以下のパスに格納されたMAIMLファイルにアクセスした際、編集画面でMethodタブが表示されず単体メソッド状態で表示された。

```
a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/Raman_test2/Raman.maiml/Raman.maiml
```

`Raman.maiml` という **フォルダ名と同名のMAIMLファイル** が1階層余分にネストされたパス構造になっており、正しいファイルが取得できていないことが疑われた。

---

## 2. 調査範囲と処理フローの確認

### 2-1. StorageService (`backend/src/services/storageService.ts`)

`downloadFile()` は以下の流れでS3からファイルを取得する。

```typescript
async downloadFile(organizationId: string, filePath: string): Promise<Buffer> {
  const key = this.buildKey(organizationId, filePath);
  // → `{organizationId}/{filePath}` 形式のKeyでS3へGetObjectCommand
}
```

`buildKey()` は単純に `{organizationId}/{filePath}` を返す。  
StorageService自体にパス解析の問題はなく、**渡されたパスをそのままS3のKeyとして使用する**。

### 2-2. フロントエンド側の `sourceS3Key` 生成 (`frontend/src/components/project/ProjectManagement.tsx`)

編集画面を開く際に `onEdit()` に渡す `sourceS3Key` は以下のように生成されている（3箇所共通）。

```typescript
// maimlFileKey が存在する場合はそれを使用（ファイル名がプロジェクト名と異なるケースに対応）
const sourceS3Key = targetProject.maimlFileKey
  ?? `${orgId}/projects/${targetProject.name}/${targetProject.name}.maiml`;
```

- **`maimlFileKey` がある場合**: `file_metadata` テーブルから取得した正確なファイルキーを使用
- **`maimlFileKey` が null/undefined の場合**: `{orgId}/projects/{projectName}/{projectName}.maiml` というデフォルトパスにフォールバック

今回の問題は `maimlFileKey` が正しく取得できていないため、フォールバックの `Raman_test2/Raman_test2.maiml` というパスへアクセスが発生し（実際のパスは `Raman_test2/Raman.maiml/Raman.maiml`）、正しいファイルが読み込めていなかった。

### 2-3. `maimlFileKey` の取得元 (`backend/src/services/projectService.ts`)

プロジェクト一覧取得 `list()` メソッドのクエリ内で、`maiml_file_key` を以下のサブクエリで取得している。

```sql
-- 修正前（バグあり）
SELECT fm2.file_key
FROM file_metadata fm2
WHERE fm2.project_uuid = p.project_uuid
  AND fm2.file_key LIKE '%.maiml'
  AND fm2.file_key NOT LIKE '%/archive/%'
ORDER BY fm2.create_at DESC   -- ← エラー: file_metadata には create_at カラムは存在しない
LIMIT 1
```

---

## 3. 根本原因

`file_metadata` テーブルのカラム名は `created_at` であるにもかかわらず、`create_at`（存在しないカラム名）で `ORDER BY` していた。

| テーブル | カラム名 |
|---------|---------|
| `project` テーブル | `create_at` |
| `file_metadata` テーブル | `created_at` (`docs/design/db/ddl/file_metadata.sql`) |

この不一致により：
1. SQLエラーが発生する、もしくはDBがエラーを握りつぶして `maiml_file_key` が `null` で返される
2. フロントエンドで `maimlFileKey` が `null` となりフォールバックパス `Raman_test2/Raman_test2.maiml` を使用
3. 実際のファイルパス `Raman_test2/Raman.maiml/Raman.maiml` と一致せず、正しいMAIMLが取得できない
4. MAIMLが読み込めないため、Methodタブが表示されず単体メソッド状態で編集画面が開く

---

## 4. 修正内容

**`backend/src/services/projectService.ts`**

```sql
-- 修正前
ORDER BY fm2.create_at DESC

-- 修正後
ORDER BY fm2.created_at DESC
```

この修正により、`file_metadata` テーブルから正しい `file_key`（実際のS3パス）が取得され、フロントエンドの `sourceS3Key` に正確なパスが渡されるようになる。

---

## 5. 関連ファイル

| ファイル | 内容 |
|---------|------|
| `backend/src/services/storageService.ts` | ストレージ読み込み処理。`buildKey()` / `downloadFile()` に問題なし |
| `backend/src/services/projectService.ts` | `list()` 内の `maiml_file_key` サブクエリで `created_at` カラム名を修正 |
| `frontend/src/components/project/ProjectManagement.tsx` | `maimlFileKey` を優先使用し、nullの場合にデフォルトパスへフォールバックする実装（変更なし） |
| `backend/src/types/project.ts` | `Project` 型に `maimlFileKey?: string | null` 定義済み（変更なし） |
| `frontend/src/types/project.ts` | `Project` 型に `maimlFileKey?: string | null` 定義済み（変更なし） |

# タスク計画書: WorkProgressDetailDialog モックデータをAPIコールに置き換え

## メタデータ
- **作成日時**: 2026-03-09 11:30
- **タスクID**: work-details-mock-to-api
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`WorkProgressDetailDialog.tsx` の `fetchFileDetails()` 関数が現在モックデータ（`mockProjects.json`）から全データを取得しているが、
バックエンド側に `GET /api/v1/progress/projects/:projectName/work-details` が既に実装済みであるため、
フロントエンド側をAPIコールに切り替える。

---

## 目的と期待される成果

### 目的
モックデータへの依存を排除し、実際のDBデータをUIに表示できるようにする。

### 期待される成果
- [ ] `WorkProgressDetailDialog.tsx` の `fetchFileDetails()` が実APIを呼び出すこと
- [ ] モックデータインポート（`mockProjects.json`）が削除されること
- [ ] `maimlFileKey` からプロジェクト名を正しく抽出できること
- [ ] APIレスポンスをそのまま `fileDetails` state にセットできること
- [ ] エラーハンドリングが維持されること

---

## 現状の分析

### 現在のコード（`fetchFileDetails` 内の問題箇所）

#### 問題 1: 古いAPIエンドポイントがコメントアウトされている
```typescript
// 現在コメントアウトされているが、パスが間違っている
// const response = await axios.get(
//   `/api/manager/file-progress-detail/${encodeURIComponent(fileData.maimlFileKey)}`,
//   { params: { managerId } }
// );
```
→ 正しいエンドポイントは `GET /api/v1/progress/projects/:projectName/work-details`

#### 問題 2: プロジェクトID抽出の正規表現が古い形式を前提としている
```typescript
// 現在のモックデータ用コード
const projectIdMatch = fileData.maimlFileKey.match(/projects?\/(proj_\d+)/);
const projectId = projectIdMatch ? projectIdMatch[1] : null;
```
→ 実際の `maimlFileKey` 形式は `{organizationId}/projects/{projectName}/{projectName}.maiml`  
→ `projectName` を抽出する正規表現に変更が必要

#### 問題 3: モックデータの全処理が不要になる
```typescript
// 削除対象: モックデータ全処理ブロック（約60行）
const project = mockProjectsData.projects.find(p => p.id === projectId);
// ... モックデータ加工処理
```

#### 問題 4: `import mockProjectsData` が不要になる
```typescript
// 削除対象
import mockProjectsData from '@/data/mock/mockProjects.json';
```

### 既存バックエンドAPIの仕様

**エンドポイント:**
```
GET /api/v1/progress/projects/:projectName/work-details
```

**認証:** JWT認証必須、機能CD `040000`（実験管理者メニュー）読取専用

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "projectInfo": {
      "projectId": "uuid",
      "projectName": "材料実験A",
      "projectDescription": "説明",
      "owner": "佐藤太郎",
      "department": "研究部",
      "status": "in_progress",
      "methods": ["method_001", "method_002"],
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-20T15:30:00Z"
    },
    "fileInfo": {
      "fileName": "材料実験A.maiml",
      "maimlFileKey": "{organizationId}/projects/材料実験A/材料実験A.maiml",
      "organizationId": "uuid",
      "checkoutStatus": {
        "isCheckedOut": false,
        "checkoutBy": null
      }
    },
    "workDetails": [...]
  },
  "meta": { ... }
}
```

---

## 実装ステップ

### Step 1: `maimlFileKey` からプロジェクト名を抽出するロジックに変更
- 現在: `fileKey.match(/projects?\/(proj_\d+)/)` → `proj_XXX` 形式前提
- 変更後: `fileKey.match(/\/projects\/([^/]+)\//)` → `projects/{projectName}/` 形式対応

### Step 2: コメントアウトされたAPIコールを復活・修正
- 旧エンドポイント: `/api/manager/file-progress-detail/:fileKey?managerId=...`
- 新エンドポイント: `/api/v1/progress/projects/:projectName/work-details`

### Step 3: モックデータ処理ブロックを削除

### Step 4: `import mockProjectsData` を削除

### Step 5: APIレスポンスのデータ構造をそのまま利用

APIレスポンスの `data` フィールドは以下の構造を持つ:
```
{ projectInfo, fileInfo, workDetails }
```
これは現在の `setFileDetails()` 呼び出し引数と互換性がある。

---

## 変更ファイル一覧

### 修正
1. `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
   - `import mockProjectsData` を削除
   - `fetchFileDetails()` 内のモックデータ処理を実APIコールに置き換え

---

## 技術的詳細

### 変更後の `fetchFileDetails()` 処理フロー

```typescript
const fetchFileDetails = useCallback(async () => {
  if (!fileData || !fileData.maimlFileKey || !managerId) return;

  setLoading(true);
  setError(null);

  try {
    // maimlFileKey からプロジェクト名を抽出
    // 形式: {organizationId}/projects/{projectName}/{projectName}.maiml
    const projectNameMatch = fileData.maimlFileKey.match(/\/projects\/([^/]+)\//);
    const projectName = projectNameMatch ? projectNameMatch[1] : null;

    if (!projectName) {
      throw new Error('maimlFileKeyからプロジェクト名を取得できませんでした');
    }

    // API呼び出し
    const response = await axios.get(
      `/api/v1/progress/projects/${encodeURIComponent(projectName)}/work-details`
    );

    if (response.data.success) {
      const { projectInfo, fileInfo, workDetails } = response.data.data;

      setFileDetails({
        projectInfo: projectInfo ? {
          ...projectInfo,
          status: projectInfo.status as 'planning' | 'in_progress' | 'pending' | 'completed'
        } : undefined,
        fileInfo: {
          ...fileInfo,
          checkoutStatus: fileInfo.checkoutStatus ? {
            isCheckedOut: fileInfo.checkoutStatus.isCheckedOut,
            checkoutBy: fileInfo.checkoutStatus.checkoutBy || undefined
          } : undefined
        },
        workDetails: (workDetails || []) as WorkDetail[],
      });
      setSelectedWorkIndex(0);
    } else {
      throw new Error(response.data.error?.message || 'ファイル詳細の取得に失敗しました');
    }
  } catch (err) {
    const errorMessage =
      axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error.message || err.response.data.error
        : err instanceof Error ? err.message : 'ファイル詳細の取得に失敗しました';
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
}, [fileData, managerId]);
```

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `maimlFileKey` の形式が想定と異なる場合 | 中 | 正規表現マッチ失敗時にエラーメッセージを表示 |
| バックエンドAPIが `RESOURCE_NOT_FOUND` を返す場合 | 低 | axiosエラーハンドリングで適切なエラーメッセージを表示 |
| `progressInfo.status` の型不一致 | 低 | 既存のキャスト処理を維持 |

---

## テスト計画

### 手動確認事項
- [ ] 進捗確認タブでプロジェクトを選択し「詳細」ボタンをクリック → ダイアログが開くこと
- [ ] ダイアログにプロジェクト情報・タスク情報が表示されること
- [ ] 「再読み込み」ボタンでデータが再取得されること
- [ ] 存在しないプロジェクトの場合にエラーが表示されること

---

## 承認記録
- **計画書提示日時**: 2026-03-09 11:30
- **承認日時**: 
- **承認者コメント**: 

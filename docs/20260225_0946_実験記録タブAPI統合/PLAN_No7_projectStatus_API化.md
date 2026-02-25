# タスク計画書: No.7 projectStatus の null 固定 → APIから取得

## メタデータ
- **作成日時**: 2026-02-25 15:57
- **タスクID**: mock_api_no7_project_status
- **優先度**: 中
- **推定工数**: 1.5時間
- **対象ファイル**: `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
- **依存API**: `GET /api/v1/projects/:projectId`（✅ バックエンド実装済み）

---

## 1. タスク概要

`ExperimentRecordTab.tsx` において、プロジェクトのステータスが `null` に固定されており、
`isProjectRecordable`（記録可能判定）が常に `true` となっている問題を修正する。

`GET /api/v1/projects/:projectId` API を呼び出して実際のプロジェクトステータスを取得し、
記録可能判定を正しく機能させる。

---

## 2. 現状の問題

### 問題箇所（ExperimentRecordTab.tsx）

```typescript
// 現状: プロジェクトの状態を取得（暫定: APIから取得できるまでnull）
const projectStatus: ProjectStatus | null = null;

// 影響: isProjectRecordable が常に true になる
const isProjectRecordable = projectStatus 
  ? ['active', 'in_progress', 'executing_task'].includes(projectStatus) 
  : true;   // ← projectStatus = null のため常にtrue
```

### 問題の影響範囲

`isProjectRecordable` は以下のコンポーネントに渡される：

| 渡し先 | Props名 | 影響 |
|--------|---------|------|
| `TransitionList` | `projectStatus` | 記録ボタン・問題報告ボタンの活性/非活性 |
| `DataRecordDialog` | `projectStatus` | 保存ボタンの活性/非活性 |
| `TransitionFlowDiagram` | `isProjectRecordable` | フロー図上のアクションボタン制御 |
| `IssueManagementModal` | `projectStatus` | 問題報告フォームの活性/非活性 |

---

## 3. 修正方針

### 3.1 全体方針

1. `projectStatus` をローカル定数から `useState` による状態管理に変更
2. `projectId` が確定した後（`fetchWorkerTasks` 完了後）に `GET /api/v1/projects/:projectId` を呼び出す
3. バックエンドの `project_status` 値をフロントエンドの `ProjectStatus` 型にマッピング
4. `isProjectRecordable` の判定条件をバックエンド実際値に合わせて修正

### 3.2 APIレスポンス確認（api_project_management.md より）

`GET /api/v1/projects/:projectId`（API #7）のレスポンス：

```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-...",
    "project_name": "Sample Project",
    "project_status": "created",
    ...
  }
}
```

バックエンドの `project_status` 値：
- `"created"` - 作成済み
- `"in_progress"` - チェックアウト中
- `"checked_in"` - チェックイン済み
- `"waiting_approval"` - 承認待ち
- `"approved"` - 承認済み（`WorkerProject` レスポンスより）
- `"active"` - アクティブ（`worker-accessible` レスポンスより）

### 3.3 ステータスマッピング方針

`experimentWorker.ts` の `ProjectStatus` 型と、バックエンド `project_status` 値の対応：

| バックエンド `project_status` | フロントエンド `ProjectStatus` | 記録可否 |
|-------------------------------|-------------------------------|----------|
| `"active"` | `"executing_task"` | ✅ 記録可 |
| `"in_progress"` | `"executing_task"` | ✅ 記録可 |
| `"created"` | `"waiting_task"` | ❌ 記録不可 |
| `"checked_in"` | `"waiting_task"` | ❌ 記録不可 |
| `"waiting_approval"` | `"waiting_approval"` | ❌ 記録不可 |
| `"approved"` | `"completed"` | ❌ 記録不可 |

**重要**: 現在の `isProjectRecordable` 判定ロジックは `ProjectStatus` 型に存在しない値（`'active'`, `'in_progress'`）を使っているため、一緒に修正が必要。

---

## 4. 実装ステップ

### Phase 1: `projectApiService.ts` に関数を追加

- [ ] `getProjectDetail` 関数を追加（`GET /api/v1/projects/:projectId`）
  - `projectId` (UUID) をパスパラメータとして受け取る
  - `project_status` を含むプロジェクト詳細を返す

### Phase 2: `ExperimentRecordTab.tsx` を修正

- [ ] `projectStatus` を定数から `useState` に変更
- [ ] `fetchProjectStatus` 関数を追加
  - `projectId` が確定したタイミングで呼び出す
  - バックエンド `project_status` → フロントエンド `ProjectStatus` のマッピング処理
- [ ] `useEffect` で `projectId` 変更を監視して `fetchProjectStatus` を呼び出す
- [ ] `isProjectRecordable` の判定条件を修正（実際の `ProjectStatus` 値に合わせる）

---

## 5. 変更ファイル

### 変更するファイル

1. `frontend/src/services/projectApiService.ts`
   - `ProjectDetailResponse` 型を追加
   - `getProjectDetail()` 関数を追加

2. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
   - `projectStatus` を定数から `useState<ProjectStatus | null>` に変更
   - `fetchProjectStatus` 関数を追加
   - `useEffect`（`projectId` 監視）を追加
   - `isProjectRecordable` の判定条件を修正

### 新規作成するファイル

なし

---

## 6. 詳細実装内容

### 6.1 `projectApiService.ts` への追加

```typescript
/**
 * プロジェクト詳細レスポンス型
 */
export interface ProjectDetailResponse {
  project_id: string;
  project_name: string;
  description: string | null;
  project_status: string;
  is_checked_out: boolean;
  checked_out_by: string | null;
  checked_out_at: string | null;
  checked_out_user_name: string | null;
  create_at: string;
  update_at: string;
}

/**
 * プロジェクト詳細を取得
 * GET /api/v1/projects/:projectId
 *
 * @param projectId プロジェクトID（UUID）
 * @returns プロジェクト詳細情報
 * @throws Error APIエラー時
 */
export const getProjectDetail = async (
  projectId: string
): Promise<ApiResponse<ProjectDetailResponse>> => {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getProjectDetail - Start', { projectId });

    const response = await client.get<{
      success: boolean;
      data: ProjectDetailResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/projects/${encodeURIComponent(projectId)}`);

    console.log('[DEBUG] getProjectDetail - Success', {
      projectId: response.data.data.project_id,
      projectStatus: response.data.data.project_status,
    });

    return {
      success: response.data.success,
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    console.error('[DEBUG] getProjectDetail - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
};
```

### 6.2 `ExperimentRecordTab.tsx` の修正内容

#### (1) インポートに `getProjectDetail` を追加

```typescript
import { getWorkerTasks, getProjectDetail } from '@/services/projectApiService';
```

#### (2) `projectStatus` を state に変更

```typescript
// 変更前（定数）
const projectStatus: ProjectStatus | null = null;

// 変更後（state）
const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
```

#### (3) ステータスマッピング関数を追加

```typescript
/**
 * バックエンドの project_status 値をフロントエンドの ProjectStatus 型にマッピング
 */
const mapBackendStatusToProjectStatus = (
  backendStatus: string
): ProjectStatus | null => {
  switch (backendStatus) {
    case 'active':
    case 'in_progress':
      return 'executing_task';
    case 'created':
    case 'checked_in':
      return 'waiting_task';
    case 'waiting_approval':
      return 'waiting_approval';
    case 'approved':
      return 'completed';
    default:
      console.warn('[mapBackendStatusToProjectStatus] 未知のステータス:', backendStatus);
      return null;
  }
};
```

#### (4) プロジェクトステータス取得の useEffect を追加

```typescript
// projectId が確定したらプロジェクトステータスを取得
useEffect(() => {
  const fetchProjectStatus = async () => {
    if (!projectId) {
      setProjectStatus(null);
      return;
    }

    try {
      console.log('[DEBUG] ExperimentRecordTab - Fetching project status', { projectId });

      const result = await getProjectDetail(projectId);

      if (result.success && result.data) {
        const mappedStatus = mapBackendStatusToProjectStatus(
          result.data.project_status
        );
        console.log('[DEBUG] ExperimentRecordTab - Project status fetched', {
          backendStatus: result.data.project_status,
          mappedStatus,
        });
        setProjectStatus(mappedStatus);
      } else {
        console.warn('[DEBUG] ExperimentRecordTab - getProjectDetail returned unsuccessful');
        setProjectStatus(null);
      }
    } catch (error) {
      console.error('[DEBUG] ExperimentRecordTab - Error fetching project status', error);
      // エラー時は null のまま（isProjectRecordable = true で安全側に倒す）
      setProjectStatus(null);
    }
  };

  fetchProjectStatus();
}, [projectId]);
```

#### (5) `isProjectRecordable` の判定条件を修正

```typescript
// 変更前（ProjectStatus 型に存在しない値を使っている）
const isProjectRecordable = projectStatus 
  ? ['active', 'in_progress', 'executing_task'].includes(projectStatus) 
  : true;

// 変更後（ProjectStatus 型の実際の値に合わせる）
const isProjectRecordable = projectStatus 
  ? ['executing_task'].includes(projectStatus) 
  : true;
```

---

## 7. 影響範囲分析

### 変更の影響

| コンポーネント | Props | 影響内容 |
|------------|-------|---------|
| `TransitionList` | `projectStatus` | `projectStatus` の型は変わらないため影響なし |
| `DataRecordDialog` | `projectStatus` | 同上 |
| `TransitionFlowDiagram` | `isProjectRecordable` | `boolean` 型は変わらないため影響なし |
| `IssueManagementModal` | `projectStatus` | 同上 |

### 機能への影響

- **プロジェクトステータスが記録可能（`executing_task`）の場合**: 現状と同じく記録ボタンが有効
- **プロジェクトステータスが記録不可（`waiting_task`等）の場合**: 記録ボタンが無効になる（**動作が変わる**）

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| バックエンドが返すステータス値が仕様書と異なる | 中 | 低 | APIレスポンスをコンソールログで確認し、マッピングを調整 |
| `projectId` が確定する前に別の useEffect が先に動作する競合 | 低 | 低 | `projectId` を依存配列に指定することで順序保証 |
| APIエラー時に `isProjectRecordable = false` で操作不能になる | 高 | 低 | エラー時は `projectStatus = null`（= `true`）に倒すことで操作可能を維持 |

---

## 9. テスト計画

### 手動テスト

- [ ] プロジェクトを選択後、プロジェクトステータスが正しく取得されること
- [ ] `executing_task`（active/in_progress）状態のプロジェクトで記録ボタンが有効なこと
- [ ] `waiting_task`（created/checked_in）状態のプロジェクトで記録ボタンが無効なこと
- [ ] `waiting_approval` 状態のプロジェクトで記録ボタンが無効なこと
- [ ] プロジェクト未選択時に記録ボタンが有効なこと（後退なし）
- [ ] API取得エラー時に記録ボタンが有効なこと（エラー時の安全側フォールバック）

### コンソールログ確認

- [ ] `[DEBUG] ExperimentRecordTab - Fetching project status` が出力されること
- [ ] `[DEBUG] ExperimentRecordTab - Project status fetched` で `backendStatus` / `mappedStatus` が正しく出力されること

---

## 10. 関連ドキュメント

- [調査結果](./mock_investigation.md) - モックデータ使用箇所の詳細
- [API仕様書](../design/api/api_project_management.md) - API #7 プロジェクト詳細取得
- [UI仕様書](../design/ui/ui_experiment_record_tab.md) - 実験記録タブUI仕様

---

## 11. 承認記録

- **計画書提示日時**: 2026-02-25 15:57
- **承認日時**: 2026-02-25 15:58
- **承認者コメント**: 承認済み、実施

---

## 12. 実施記録

### 実施日時
開始: 2026-02-25 15:58  
完了: 2026-02-25 16:02

### 実施結果
- [x] `projectApiService.ts` に `ProjectDetailResponse` 型を追加
- [x] `projectApiService.ts` に `getProjectDetail` 関数を追加
- [x] `ExperimentRecordTab.tsx` のimportに `getProjectDetail` を追加
- [x] `ExperimentRecordTab.tsx` の `projectStatus` を `useState<ProjectStatus | null>` に変更
- [x] ステータスマッピング関数 `mapBackendStatusToProjectStatus` を実装
- [x] `useEffect`（`projectId` 監視）を追加して `fetchProjectStatus` を呼び出し
- [x] `isProjectRecordable` の判定条件を修正（`projectStatus === null || projectStatus === 'executing_task'`）

### 変更内容詳細

#### `frontend/src/services/projectApiService.ts`
- `ProjectDetailResponse` インターフェースを追加
- `getProjectDetail(projectId: string)` 関数を追加
  - `GET /api/v1/projects/:projectId` を呼び出す
  - `ApiResponse<ProjectDetailResponse>` を返す

#### `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
- import に `getProjectDetail` を追加
- `const projectStatus: ProjectStatus | null = null;`（定数）を
  `const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);`（state）に変更
- `mapBackendStatusToProjectStatus()` 関数を追加
  - `active` / `in_progress` → `executing_task`
  - `created` / `checked_in` → `waiting_task`
  - `waiting_approval` → `waiting_approval`
  - `approved` → `completed`
- `useEffect`（依存: `[projectId]`）を追加
  - `projectId` が確定したら `getProjectDetail(projectId)` を呼び出す
  - 成功時: マッピング後の値を `setProjectStatus` で設定
  - エラー時: `setProjectStatus(null)` で安全側にフォールバック
- `isProjectRecordable` を修正
  - 変更前: `projectStatus ? ['active', 'in_progress', 'executing_task'].includes(projectStatus) : true`
  - 変更後: `projectStatus === null || projectStatus === 'executing_task'`

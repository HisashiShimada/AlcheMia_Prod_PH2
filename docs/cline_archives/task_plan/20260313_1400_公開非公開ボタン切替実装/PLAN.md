# タスク計画書: 公開/非公開ボタン切替実装

## メタデータ
- **作成日時**: 2026-03-13 14:00
- **タスクID**: publish-unpublish-toggle
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

`ProjectManagement.tsx` の公開ボタンを「公開ステータス」に応じて「公開」/「非公開」ボタンに切り替えて表示する。
あわせて、`unpublishProject` の即時非公開ロジック（現在のレスポンス型・Worker 側挙動）の整合性を確認し、必要であれば修正する。

---

## 現状の整理

### フロントエンド
| 項目 | 状況 |
|------|------|
| `publishProject()` API 関数 | ✅ 実装済み (`projectApiService.ts`) |
| `unpublishProject()` API 関数 | ✅ 実装済み (`projectApiService.ts`) |
| 公開ボタン UI (`handlePublish`) | ✅ 実装済み (`ProjectManagement.tsx`) |
| 非公開ボタン UI (`handleUnpublish`) | ❌ **未実装** |
| 公開ステータス取得 → ボタン切替 | ❌ **未実装** |

### バックエンド
| 項目 | 状況 |
|------|------|
| `POST /projects/:projectName/publish` | ✅ 実装済み |
| `POST /projects/:projectName/unpublish` | ✅ 実装済み |
| `GET /projects/:projectName/publish-status` | ✅ 実装済み |
| `enqueueUnpublish()` サービス | ✅ 実装済み (bullmq 非同期) |
| `maimlUnpublishWorker` | ✅ 実装済み |

### 注目点: `unpublishProject` のレスポンス型の不整合

`projectApiService.ts` の `unpublishProject()` は即時完了レスポンス型 `MaimlUnpublishResponse` を想定：
```typescript
// 現在のフロントエンド型
export interface MaimlUnpublishResponse {
  projectName: string;
  mode: 'keep_meta' | 'full_delete';
  unpublishedAt: string;  // ← 即時完了を前提
}
```

しかし実際のバックエンド `unpublish` エンドポイントは **bullmq 非同期処理（202 Accepted）**：
```typescript
// 実際のバックエンドレスポンス (PublishJobResponse)
{
  job_id:  string,
  status:  'pending',
  message: '非公開ジョブを受け付けました'
}
```

→ **フロントエンドの型定義・ハンドラロジックを公開と同様の非同期ポーリング方式に揃える必要がある。**

---

## 目的と期待される成果

- [ ] プロジェクト選択時に `GET /publish-status` を呼び出し、現在の公開状態を取得する
- [ ] 公開済み（`job_type=publish` かつ `status=done`）→「非公開」ボタンを表示
- [ ] 未公開または非公開済み → 「公開」ボタンを表示
- [ ] pending/running 中はどちらのボタンも `disabled` + ローディング表示
- [ ] `handleUnpublish` を実装し、`unpublishProject()` を正しく呼び出す
- [ ] `MaimlUnpublishResponse` の型を実際のレスポンス（202 + `job_id`）に修正する
- [ ] `unpublishProject()` のリクエストボディを実際の API 仕様に合わせる

---

## 実装ステップ

### Phase 1: フロントエンド型定義の修正

**`frontend/src/services/projectApiService.ts`**

- [ ] `MaimlUnpublishResponse` を削除し、公開と共通の `PublishJobResponse` 型を定義
  ```typescript
  export interface PublishJobResponse {
    job_id:  string | null;
    status:  'pending' | 'running' | 'done' | 'error' | null;
    message: string;
  }
  ```
- [ ] `unpublishProject()` の戻り値型を `ApiResponse<PublishJobResponse>` に変更
- [ ] リクエストボディを `{ mode }` から正しい形式（バックエンド仕様確認後）に修正
  - バックエンドの `unpublish` は現在ボディを受け取っていない（`enqueueUnpublish` の引数は `organizationId, projectName, userId` のみ）
  - → ボディ不要に変更するか、または `keep_raw_on_unpublish` フラグを受け取るよう修正

### Phase 2: 公開ステータス取得 hook/関数の追加

**`frontend/src/services/projectApiService.ts`**

- [ ] `getPublishStatus(projectName)` 関数を追加
  ```typescript
  export interface PublishStatusResponse {
    job_id:        string | null;
    job_type:      'publish' | 'unpublish' | null;
    status:        'pending' | 'running' | 'done' | 'error' | null;
    asset_id:      string | null;
    project_name:  string;
    started_at:    string | null;
    finished_at:   string | null;
    error_message: string | null;
  }

  export const getPublishStatus = async (
    projectName: string
  ): Promise<PublishStatusResponse>
  ```

### Phase 3: ProjectManagement.tsx の修正

**`frontend/src/components/project/ProjectManagement.tsx`**

- [ ] `publishStatus` state を追加
  ```typescript
  const [publishStatus, setPublishStatus] = useState<PublishStatusResponse | null>(null);
  const [publishStatusLoading, setPublishStatusLoading] = useState(false);
  ```
- [ ] プロジェクト選択時（`selectedProject` が変わったとき）に `fetchPublishStatus()` を呼び出す
  ```typescript
  useEffect(() => {
    if (selectedProject) {
      fetchPublishStatus(selectedProject.name);
    } else {
      setPublishStatus(null);
    }
  }, [selectedProject]);
  ```
- [ ] `fetchPublishStatus()` 関数を追加（`getPublishStatus` を呼び出す）

- [ ] 公開/非公開ボタンの表示ロジック
  ```
  isPublished = publishStatus?.job_type === 'publish' && publishStatus?.status === 'done'
  isProcessing = publishStatus?.status === 'pending' || publishStatus?.status === 'running'
  
  isPublished  → 「非公開」ボタン（danger）を表示、「公開」ボタンは非表示
  !isPublished → 「公開」ボタンを表示、「非公開」ボタンは非表示
  isProcessing → 表示中のボタンを disabled + loading
  ```

- [ ] `handleUnpublish()` を追加
  - `unpublishProject(selectedProject.name)` を呼び出す
  - 成功メッセージ表示
  - 完了後 `fetchPublishStatus()` を再実行してボタンを更新
  - エラーハンドリング（AxiosError）

- [ ] `handlePublish()` 完了後にも `fetchPublishStatus()` を呼び出してボタン状態を更新

### Phase 4: バックエンド確認と修正（必要に応じて）

**`backend/src/controllers/projectController.ts`**

- [ ] `unpublish` コントローラが受け取るリクエストボディを確認
  - 現状: ボディなし（`enqueueUnpublish(organizationId, projectName, userId)` のみ）
  - フロントエンドとの整合を取る

- [ ] `keep_raw_on_unpublish` フラグの扱いを決定
  - Option A: バックエンドで受け取り、Worker に渡す（将来的な拡張）
  - Option B: 当面はバックエンド固定値（フロントからは送らない）

---

## 影響範囲

### 変更するファイル
1. `frontend/src/services/projectApiService.ts` — 型修正・`getPublishStatus` 追加・`unpublishProject` 修正
2. `frontend/src/components/project/ProjectManagement.tsx` — ボタン切替 UI・`handleUnpublish` 追加

### 確認するファイル（修正が必要な場合のみ）
3. `backend/src/controllers/projectController.ts` — `unpublish` のボディ処理
4. `backend/src/workers/maimlUnpublishWorker.ts` — `keep_raw_on_unpublish` の扱い

### 新規作成するファイル
なし

---

## 技術的詳細

### 公開ステータスの判定ロジック

```typescript
// 公開済み：最新ジョブが publish の done
const isPublished = (s: PublishStatusResponse | null): boolean =>
  s?.job_type === 'publish' && s?.status === 'done';

// 処理中：pending または running
const isProcessing = (s: PublishStatusResponse | null): boolean =>
  s?.status === 'pending' || s?.status === 'running';
```

### UI 切替イメージ

```
[未公開状態]
  [公開] ← 表示・有効

[公開済み状態]
  [非公開] ← 表示・有効（danger ボタン）

[処理中（pending/running）]
  [公開] or [非公開] ← disabled + loading

[エラー状態]
  ステータスに応じてどちらかのボタンを表示
```

### `unpublishProject` API 修正方針

バックエンドの `POST /projects/:projectName/unpublish` は現在ボディを無視しているため：
- フロントエンドの `unpublishProject()` のリクエストボディは空（または省略）に変更
- `MaimlUnpublishResponse` 型は `PublishJobResponse` 相当（`job_id`, `status`, `message`）に変更
- 将来 `keep_raw_on_unpublish` を実装する際はバックエンドと同時に修正

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ポーリングなしでボタンが即時更新されない | 中 | 中 | `fetchPublishStatus` 完了後に再取得するだけで十分（`publish` 側と同方式） |
| `job_type=publish` & `status=error` のときに誤った表示になる | 低 | 低 | エラー状態は「未公開」扱いとして「公開」ボタンを表示する |
| バックエンドの `unpublish` ボディ変更で既存テストが壊れる | 低 | 低 | テストファイルを確認して合わせて修正 |

---

## テスト計画

- [ ] プロジェクト選択 → `GET /publish-status` が呼ばれ公開状態を取得
- [ ] 未公開プロジェクト → 「公開」ボタンのみ表示
- [ ] 公開済みプロジェクト → 「非公開」ボタンのみ表示
- [ ] 「非公開」ボタン押下 → `POST /unpublish` が呼ばれ、完了後ボタンが「公開」に戻る
- [ ] pending/running 中 → ボタンが disabled になる
- [ ] エラーレスポンス → エラーメッセージが表示される

---

## 関連ファイル（参照）

- `frontend/src/services/projectApiService.ts` — 現在の `publishProject`・`unpublishProject` 実装
- `frontend/src/components/project/ProjectManagement.tsx` — 現在の `handlePublish` 実装
- `backend/src/services/maimlPublishService.ts` — `enqueueUnpublish` の実装
- `backend/src/controllers/projectController.ts` — `unpublish` コントローラ
- `backend/src/routes/projectRoutes.ts` — ルート定義
- `docs/MaiML_OpenData_Pipeline/spec.md` — API 仕様書

---

## 承認記録
- **計画書提示日時**: 2026-03-13 14:00
- **承認日時**: 
- **承認者コメント**: 

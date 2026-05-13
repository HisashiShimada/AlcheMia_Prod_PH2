# タスク計画書: 公開ボタン押下後リフレッシュ修正

## メタデータ
- **作成日時**: 2026-05-13 14:49
- **タスクID**: 公開ボタン押下後リフレッシュ修正
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

`frontend/src/components/project/ProjectManagement.tsx` において、
公開ボタン（および非公開ボタン）を押下してAPIが完了した後に、
プロジェクト一覧が再取得されないため、画面の状態が正しく更新されない問題を修正する。

---

## 2. 問題の詳細分析

### 2.1 公開フローの現状

```
[公開ボタン押下]
  → handlePublish()
    → setPublishDialogOpen(true)
      → MaimlPublishDialog で「公開する」クリック
        → publishProject(projectId) API呼び出し（202受付）
          → handlePublishSuccess(_jobId)
            → setIsPolling(true)
            → startPoller()   ← 3秒ごとにステータスをポーリング
              → ジョブが done/error になったら
                → handlePollingComplete(status) が呼ばれる
```

### 2.2 handlePollingComplete の現状実装（問題箇所）

```typescript
const handlePollingComplete = useCallback(async (status: PublishStatusResponse) => {
  setIsPolling(false);
  // ✅ 成功/失敗メッセージ表示
  if (status.status === 'done') { message.success(...); }
  else if (status.status === 'error') { message.error(...); }
  
  // ✅ publishStatus を再取得（公開/非公開ボタンの切り替えは機能する）
  if (selectedProject) {
    const latest = await getPublishStatus(selectedProject.id);
    setPublishStatus(latest);
  }
  // ❌ refetchProjects() が呼ばれていない！
}, [selectedProject]);
```

### 2.3 欠落しているリフレッシュと影響

| 欠落しているもの | 影響 |
|---|---|
| `refetchProjects()` が呼ばれない | プロジェクト一覧（左パネル）のステータスが更新されない |
| `selectedProject.status` が古い値のまま | プロジェクトヘッダーのステータスタグが更新されない |
| 公開ボタンの `disabled` 条件が古い `selectedProject.status` に依存 | 公開完了後もボタンの活性/非活性が正しく反映されない |

具体的に影響を受けるUI要素：

1. **左パネルのプロジェクト一覧**
   - `ProjectFolderTree` に渡している `sortedProjects` → `projects` state（古いまま）

2. **プロジェクトヘッダーのステータスタグ**
   ```tsx
   selectedProject.status === ProjectStatus.PLANNING ? '計画中' : ...
   ```
   - `selectedProject` は `projects.find(p => p.id === selectedProjectId)` から取得
   - `projects` が更新されないため古いステータスが表示される

3. **公開ボタンの disabled 制御**
   ```tsx
   disabled={!(selectedProject?.status === ProjectStatus.REVIEW_WAITING
             || selectedProject?.status === ProjectStatus.COMPLETED)
             || publishStatusLoading || isPolling}
   ```
   - ジョブ完了後にプロジェクトステータスが `COMPLETED` に変わった場合、
     `refetchProjects()` がないとボタン状態が正しく更新されない

4. **`isPublished` フラグ**（既存で正しく動作している）
   - `publishStatus` state は更新されているため、公開/非公開ボタンの切り替えは機能している
   - ただし、プロジェクトステータス変化を伴う場合は上記3の問題が残る

---

## 3. 修正方針

### 背景

公開処理は非同期ジョブとして受け付けられるが、**`publishProject()` API（POST /projects/:name/publish）を呼び出した時点でバックエンド側のプロジェクトステータスが即座に更新される**。そのためポーリング完了を待つまでもなく、API呼び出し成功（202受付）直後にもリフレッシュが必要である。

### 修正対象: 2箇所

#### 修正箇所① `handlePublishSuccess` / `handleUnpublishSuccess` に `refetchProjects()` を追加

公開/非公開APIが202を返した時点（ジョブ受付完了）でプロジェクト一覧を再取得する。

##### 修正前
```typescript
// 公開ダイアログ成功時
const handlePublishSuccess = useCallback((_jobId: string) => {
  setIsPolling(true);
  startPoller();
}, [startPoller]);

// 非公開ダイアログ成功時
const handleUnpublishSuccess = useCallback((_jobId: string) => {
  setIsPolling(true);
  startPoller();
}, [startPoller]);
```

##### 修正後
```typescript
// 公開ダイアログ成功時
const handlePublishSuccess = useCallback(async (_jobId: string) => {
  setIsPolling(true);
  startPoller();
  // ✅ API受付完了時点でプロジェクト一覧を再取得（ステータスが即座に更新されるため）
  try {
    await refetchProjects();
  } catch {
    console.warn('[ProjectManagement] handlePublishSuccess: refetchProjects failed');
  }
}, [startPoller, refetchProjects]);

// 非公開ダイアログ成功時
const handleUnpublishSuccess = useCallback(async (_jobId: string) => {
  setIsPolling(true);
  startPoller();
  // ✅ API受付完了時点でプロジェクト一覧を再取得（ステータスが即座に更新されるため）
  try {
    await refetchProjects();
  } catch {
    console.warn('[ProjectManagement] handleUnpublishSuccess: refetchProjects failed');
  }
}, [startPoller, refetchProjects]);
```

---

#### 修正箇所② `handlePollingComplete` に `refetchProjects()` を追加

ポーリング完了（ジョブ done/error）時にもプロジェクト一覧を再取得する。
ジョブ完了でさらにステータスが変化する可能性があるため、ポーリング完了時にも再取得が必要。

##### 修正前
```typescript
const handlePollingComplete = useCallback(async (status: PublishStatusResponse) => {
  setIsPolling(false);
  if (status.status === 'done') {
    if (status.job_type === 'publish') {
      message.success(t('project.publishSuccess').replace('{name}', selectedProject?.name ?? ''));
    } else {
      message.success(t('project.unpublishSuccess').replace('{name}', selectedProject?.name ?? ''));
    }
  } else if (status.status === 'error') {
    message.error(status.error_message ?? t('project.processingFailed'));
  }
  // ステータスを再取得
  if (selectedProject) {
    try {
      const latest = await getPublishStatus(selectedProject.id);
      setPublishStatus(latest);
    } catch {
      setPublishStatus(null);
    }
  }
}, [selectedProject]);
```

##### 修正後
```typescript
const handlePollingComplete = useCallback(async (status: PublishStatusResponse) => {
  setIsPolling(false);
  if (status.status === 'done') {
    if (status.job_type === 'publish') {
      message.success(t('project.publishSuccess').replace('{name}', selectedProject?.name ?? ''));
    } else {
      message.success(t('project.unpublishSuccess').replace('{name}', selectedProject?.name ?? ''));
    }
  } else if (status.status === 'error') {
    message.error(status.error_message ?? t('project.processingFailed'));
  }
  // publishStatus を再取得
  if (selectedProject) {
    try {
      const latest = await getPublishStatus(selectedProject.id);
      setPublishStatus(latest);
    } catch {
      setPublishStatus(null);
    }
  }
  // ✅ プロジェクト一覧を再取得（ジョブ完了でさらにステータスが変化するため）
  try {
    await refetchProjects();
  } catch {
    console.warn('[ProjectManagement] handlePollingComplete: refetchProjects failed');
  }
}, [selectedProject, refetchProjects]);
```

### 変更点の要約

| 変更箇所 | 変更内容 |
|---|---|
| `handlePublishSuccess` | `async` 化、末尾に `refetchProjects()` 追加、依存配列に `refetchProjects` 追加 |
| `handleUnpublishSuccess` | `async` 化、末尾に `refetchProjects()` 追加、依存配列に `refetchProjects` 追加 |
| `handlePollingComplete` | 末尾に `refetchProjects()` 追加、依存配列に `refetchProjects` 追加 |

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/ProjectManagement.tsx`
   - `handlePollingComplete` のコールバック内容（L1129〜L1149）
   - `useCallback` の依存配列に `refetchProjects` を追加

### 影響を受ける機能
- **公開完了後**: プロジェクトステータスが最新化される
- **非公開完了後**: プロジェクトステータスが最新化される
- **公開エラー後**: プロジェクトステータスが最新化される（影響は軽微だが一貫性のため）
- チェックアウト/チェックイン・アップロード等の既存フローは変更なし

### 副作用リスク
- `refetchProjects()` はプロジェクト一覧を再取得するAPIコールであり、既存の他の処理でも使用されており安全
- ポーリング完了時に1回だけ呼ばれるため、過剰なAPI呼び出しは発生しない

---

## 5. テスト計画

### 手動テスト

| シナリオ | 期待結果 |
|---|---|
| レビュー待ち(3)のプロジェクトで公開ボタン押下 → 完了待ち | ポーリング完了後、左パネルのプロジェクトステータスが更新される |
| 公開完了後 | ヘッダーのステータスタグが「完了」に更新される |
| 公開完了後 | 公開ボタン→非公開ボタンに切り替わる（既存動作と変わらず） |
| 非公開ボタン押下 → 完了 | プロジェクトステータスが正しく更新される |
| 公開エラー発生時 | エラーメッセージが表示され、プロジェクト一覧が再取得される |

---

## 6. 実装ステップ

- [x] `handlePublishSuccess` / `handleUnpublishSuccess` を `async` 化し `refetchProjects()` を追加
- [x] `handlePollingComplete` に `refetchProjects()` 呼び出しを追加
- [x] 各 `useCallback` 依存配列に `refetchProjects` を追加

---

## 7. 承認記録

- **計画書提示日時**: 2026-05-13 14:49
- **承認日時**: 2026-05-13 14:56
- **承認者コメント**: 問題なし

## 8. 実施記録

### 実施日時
開始: 2026-05-13 14:56
完了: 2026-05-13 14:57

### 変更内容
`frontend/src/components/project/ProjectManagement.tsx` の3関数を修正。

| 関数 | 変更内容 |
|---|---|
| `handlePublishSuccess` | `async` 化、末尾に `await refetchProjects()` 追加、依存配列に `refetchProjects` 追加 |
| `handleUnpublishSuccess` | `async` 化、末尾に `await refetchProjects()` 追加、依存配列に `refetchProjects` 追加 |
| `handlePollingComplete` | `await handleProjectReload()` 追加（リロードボタンと同等処理）、依存配列に `handleProjectReload` 追加 |
| `handleProjectReload` の位置 | `handlePollingComplete` より前に移動（前方参照エラー解消）、重複定義を削除 |

### TSエラー確認結果
- `npx tsc --noEmit` にて `ProjectManagement.tsx` に関するエラーなしを確認済み

# 実験コメントダイアログ UI設計書

## メタデータ
- **画面名**: 実験コメントダイアログ
- **物理名**: ExperimentCommentDialog.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/ExperimentCommentDialog.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-09-09
- **担当者**: Development Team
- **バージョン**: 1.2.0

---

## 1. 画面概要

### 1.1. 目的

実験作業者が実験中に気づいた注意点・異常・メモをコメントとして記録するダイアログです。
タスクNo・トランジションIDと紐付けてコメントを保存します。

> ✅ **API連携済み（2026-09-09 更新）**: `WorkRecordPanel` の `handleSaveComment` は `saveTransitionComment` API（`PATCH /api/v1/progress/projects/:projectId/methods/:methodId/transitions/:transitionId/status`）を実際に呼び出してコメントを保存します。旧バージョンで「未連携」と記載していた注記は誤りで、現ソースでは完全に連携済みです。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_worker` | ✅ 操作可 |
| `experiment_admin` | ✅ 操作可 |

### 1.3. 主要機能

1. タスクNo・トランジションIDの表示（対象情報）
2. コメントのテキスト入力（最大500文字）
3. 入力内容の保存（コールバック呼び出し）

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────┐
│ Modal（幅560px）                             │
│ Title: 💬 実験コメントを記録                 │
├──────────────────────────────────────────────┤
│ Body:                                        │
│ ┌──────────────────────────────────────────┐ │
│ │ タスクNo: #1 ｜ トランジション: T001     │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ コメント *                                   │
│ ┌──────────────────────────────────────────┐ │
│ │ 実験中に気づいたこと、異常・注意点、      │ │
│ │ メモなどを入力してください               │ │
│ │                                  0/500   │ │
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ Footer: [キャンセル]  [保存]                 │
└──────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
export interface ExperimentCommentDialogProps {
  open: boolean;
  /** コメントを紐付けるタスクNo */
  taskNo: number;
  /** コメントを紐付けるトランジションID */
  transitionId: string;
  /** ダイアログを閉じる */
  onClose: () => void;
  /** コメントを保存する（保存処理は呼び出し元が担当） */
  onSave: (comment: string) => void;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `open` | `boolean` | ✅ | ダイアログ表示/非表示 |
| `taskNo` | `number` | ✅ | 紐付けるタスクNo（表示用）|
| `transitionId` | `string` | ✅ | 紐付けるトランジションID（表示用）|
| `onClose` | `() => void` | ✅ | 閉じるコールバック |
| `onSave` | `(comment: string) => void` | ✅ | 保存コールバック（呼び出し元が保存処理を担う）|

---

## 4. 動作仕様

### 4.1. 初期化・リセット

- ダイアログが閉じるたびにコメント入力欄を空に戻す
- リセットは以下の二重制御で行われる：
  1. `handleClose` 内で `setComment('')` を**明示的に**呼び出してステートをリセット
  2. `Modal` の `destroyOnHidden` が有効で、非表示時にDOMを破棄して完全リセット

### 4.2. 保存ボタン制御

| 状態 | 保存ボタン |
|------|----------|
| コメント未入力（空・空白のみ） | ❌ disabled |
| コメント入力済み | ✅ 活性 |

### 4.3. 保存フロー

```
コメント入力
  ↓
[保存] クリック
  ↓
comment.trim() を onSave() に渡す
  ↓
入力欄リセット（setComment('')） → onClose() 呼び出し
```

**呼び出し元（`WorkRecordPanel.handleSaveComment`）での処理（2026-09-09 更新）:**

```typescript
// WorkRecordPanel.tsx
const handleSaveComment = useCallback(async (
  comment: string,
  taskNo: number,
  transitionId: string
) => {
  if (!projectId || !methodId) {
    console.warn('[WorkRecordPanel] コメント保存: projectId / methodId が未設定');
    return;
  }
  try {
    await saveTransitionComment(projectId, methodId, transitionId, { taskNo, comment });
    modal.success({ title: t('workRecord.commentSaved'), content: comment });
  } catch {
    message.error(t('workRecord.commentSaveError'));
  }
}, [projectId, methodId, t]);
```

- `saveTransitionComment` API（`projectApiService`）を `await` で呼び出してコメントを保存
- 成功時: `modal.success({ title: t('workRecord.commentSaved'), content: comment })` を表示
- 失敗時: `message.error(t('workRecord.commentSaveError'))` を表示
- `projectId` または `methodId` が未設定の場合は `console.warn` のみで処理を中断

---

## 5. UI仕様

| 要素 | コンポーネント | 備考 |
|------|--------------|------|
| モーダル | `Modal` | 幅560px、`destroyOnHidden` |
| タイトル | `Space` + `CommentOutlined` | アイコン色: `#1677ff` |
| Body レイアウト | `Space` | `direction="vertical"`（縦並び）、`size="middle"`、`width: '100%'`。ソース上は `orientation="vertical"` と記述されているが、Ant Design の `Space` コンポーネントの正式 prop は `direction` |
| 対象情報 | 灰色背景 `div` + `Space` / `Divider` | `padding: '8px 12px'`、`background: '#f5f5f5'`、`borderRadius: 6`、`border: '1px solid #d9d9d9'`。タスクNo・トランジションIDを `Divider type="vertical"` で区切って並列表示 |
| コメント入力 | `TextArea` | `rows=6`, `maxLength=500`, `showCount`, `autoFocus` |

---

## 6. API連携

### バックエンド（実装済み）

コメントを受け付けるバックエンドAPIは以下の通り実装済み。

| API | コメントフィールド | 最大文字数 |
|-----|-----------------|----------|
| `POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data` | `records[].comment`（optional） | 2000文字 |
| `PATCH /api/v1/progress/projects/:projectId/methods/:methodId/transitions/:transitionId/status` | `comment`（optional） | 2000文字 |
| `PATCH /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/status` | `comment`（optional） | 500文字 |

### フロントエンド（連携済み・2026-09-09 更新）

| 項目 | 状態 | 備考 |
|------|------|------|
| `ExperimentCommentDialog` → `onSave` コールバック経由 | ✅ 連携済み | `WorkRecordPanel.handleSaveComment` は `saveTransitionComment` API を呼び出してコメントを保存する |
| `handleSave` / `handleSaveAndNext` での `comment` フィールド | — | 実績値保存API（`saveBatchExperimentData`）とは別経路。コメントは `saveTransitionComment` で保存 |

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.2.0 | 2026-09-09 | API連携済みに更新（2026-09-09）：①§1.1 注記を「フロントエンド未連携」→「API連携済み」に修正（`saveTransitionComment` API 呼び出し確認）。②§4.3 呼び出し元 `handleSaveComment` のコードを最新実装（`async`・`saveTransitionComment` await・成功時 `modal.success`・失敗時 `message.error`・未設定時 `console.warn`）に更新。③§6 フロントエンド連携状態を「未連携」→「連携済み」に修正 | Cline |

| 1.1.0 | 2026-08-27 | ソースコードとの照合に基づき以下を修正：①§1.1 フェーズ注記を「バックエンドAPI実装済み・フロントエンド未連携」に修正（旧: 「バックエンドAPIへの保存は別フェーズで実装予定」）。②§4.1 リセット方法を `handleClose` 内 `setComment('')` と `destroyOnHidden` の二重制御として修正（旧: `destroyOnHidden` のみ記載）。③§4.3 保存フローに呼び出し元 `WorkRecordPanel.handleSaveComment` の実際の動作（`console.info` + `Modal.success`）を追記。④§5 UI仕様テーブルに Body レイアウト行（`direction="vertical"`）と対象情報のスタイル詳細を追記。⑤§6 API連携をバックエンド（実装済み）とフロントエンド（未連携）に分けて全面修正 | Cline |
| 1.0.0 | 2026-08-15 | 初版作成 | Development Team |


# 実験コメントダイアログ UI設計書

## メタデータ
- **画面名**: 実験コメントダイアログ
- **物理名**: ExperimentCommentDialog.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/ExperimentCommentDialog.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-27
- **担当者**: Development Team
- **バージョン**: 1.1.0

---

## 1. 画面概要

### 1.1. 目的

実験作業者が実験中に気づいた注意点・異常・メモをコメントとして記録するダイアログです。
タスクNo・トランジションIDと紐付けてコメントを保存します。

> ⚠️ **フロントエンド未連携（2026-08-27 確認）**: バックエンドAPIはコメントフィールドを受け付ける形で実装済み（`POST /api/v1/experiments/.../data` の `records[].comment`、`PATCH .../transitions/:transitionId/status` の `comment` フィールド）。ただし `WorkRecordPanel` の `handleSaveComment` は `console.info` によるログ出力と `Modal.success` による成功ダイアログ表示のみを行い、APIへの保存は行っていない。

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

**呼び出し元（`WorkRecordPanel.handleSaveComment`）での処理（2026-08-27 確認）:**

```typescript
// WorkRecordPanel.tsx
const handleSaveComment = useCallback((comment: string) => {
  console.info('[WorkRecordPanel] コメント保存（モック）:', comment);
  Modal.success({ title: t('workRecord.commentSaved'), content: comment });
}, []);
```

- `console.info` でコメント内容をログ出力
- `Modal.success` で「保存成功」ダイアログを表示
- バックエンドAPIへの保存は**現時点で未連携**（APIは実装済みだがフロントエンド側の呼び出しがない）

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

### フロントエンド（未連携・2026-08-27 確認）

| 項目 | 状態 | 備考 |
|------|------|------|
| `ExperimentCommentDialog` → `onSave` コールバック経由 | ⚠️ 未連携 | `WorkRecordPanel.handleSaveComment` は `console.info` + `Modal.success` のみ。APIを呼び出していない |
| `handleSave` / `handleSaveAndNext` での `comment` フィールド | ⚠️ 未連携 | `ExperimentDataRecord` に `comment` フィールドは型定義されているが、`records` 生成時に含めていない |

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.1.0 | 2026-08-27 | ソースコードとの照合に基づき以下を修正：①§1.1 フェーズ注記を「バックエンドAPI実装済み・フロントエンド未連携」に修正（旧: 「バックエンドAPIへの保存は別フェーズで実装予定」）。②§4.1 リセット方法を `handleClose` 内 `setComment('')` と `destroyOnHidden` の二重制御として修正（旧: `destroyOnHidden` のみ記載）。③§4.3 保存フローに呼び出し元 `WorkRecordPanel.handleSaveComment` の実際の動作（`console.info` + `Modal.success`）を追記。④§5 UI仕様テーブルに Body レイアウト行（`direction="vertical"`）と対象情報のスタイル詳細を追記。⑤§6 API連携をバックエンド（実装済み）とフロントエンド（未連携）に分けて全面修正 | Cline |
| 1.0.0 | 2026-08-15 | 初版作成 | Development Team |


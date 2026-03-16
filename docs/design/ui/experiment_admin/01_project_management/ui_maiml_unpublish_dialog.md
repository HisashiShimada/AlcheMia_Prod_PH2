# UI仕様書: MaiML 非公開確認ダイアログ

**作成日**: 2026-03-13  
**最終更新**: 2026-03-13  
**バージョン**: 1.0.0  
**対象ロール**: experiment_admin  
**実装状況**: 実装済み

---

## 1. 概要

### 1.1 コンポーネントの目的

プロジェクト管理画面のファイル操作ツールバーにある「非公開にする」ボタン押下時に表示される確認ダイアログ。  
公開済みアセットの非公開ジョブを BullMQ キューへ投入する。  
処理は非同期で行われるため、本ダイアログは 202 Accepted 受取後すぐに閉じる。

### 1.2 使用場面

- プロジェクト管理画面で公開済みプロジェクトを選択し「非公開にする」ボタンを押した時

### 1.3 関連コンポーネント

- **呼び出し元**: `ProjectManagement.tsx`（ファイル操作ツールバー）
- **対**: `MaimlPublishDialog`（公開確認ダイアログ）

---

## 2. 画面仕様

### 2.1 ダイアログレイアウト

```
┌──────────────────────────────────────┐
│ MaiML 非公開確認              [×]   │
├──────────────────────────────────────┤
│                                      │
│  プロジェクト [プロジェクト名]       │
│  の公開を取り消します。よろしいですか？│
│                                      │
│  ┌───────────────────────────────┐  │
│  │ ⚠ 非公開処理に失敗しました    │  │  ← エラー時のみ表示
│  │ （エラーメッセージ）           │  │
│  └───────────────────────────────┘  │
│                                      │
│     [キャンセル] [非公開にする]      │
└──────────────────────────────────────┘
```

### 2.2 ダイアログ仕様

| 項目 | 値 |
|------|---|
| タイトル | `MaiML 非公開確認` |
| Ant Design コンポーネント | `Modal` |
| `destroyOnClose` | `true`（閉じるたびにアンマウント） |
| フッター | カスタム（`Space` で `キャンセル` と `非公開にする` を横並び） |

### 2.3 本文

```
プロジェクト {projectName} の公開を取り消します。よろしいですか？
```

- `{projectName}` 部分は `<Text strong>` で太字表示

### 2.4 フッターボタン

| ボタン | 種別 | 動作 | 活性状態 |
|-------|------|------|---------|
| キャンセル | `type="default"` | ダイアログを閉じ、エラー状態をリセット | API呼び出し中は `disabled` |
| 非公開にする | `type="primary" danger` | `unpublishProject()` API を呼び出す | API呼び出し中は `loading` |

> **注意**: 「非公開にする」は危険操作のため `danger` を付与して赤ボタンで表示する。

### 2.5 エラー表示

API からエラーが返ってきた場合、本文の下に `Alert` コンポーネントで表示する。

```
⚠ 非公開処理に失敗しました
（エラーメッセージ）
```

| Prop | 値 |
|------|---|
| `type` | `"error"` |
| `showIcon` | `true` |
| `message` | `"非公開処理に失敗しました"` |
| `description` | エラーコードに対応する日本語メッセージ |

---

## 3. 操作フロー

### 3.1 正常フロー

```
ユーザー:「非公開にする」ボタン押下（ツールバー）
  └─→ MaimlUnpublishDialog が開く
      └─→ ユーザー:「非公開にする」ボタン押下（ダイアログ内）
          └─→ loading = true / errorCode = null
              └─→ POST /api/v1/projects/:projectName/unpublish
                  └─→ 202 Accepted
                      ├─→ ダイアログを閉じる（handleClose）
                      └─→ onSuccess(jobId) コールバック
                          └─→ usePublishStatusPoller.start() でポーリング開始
```

### 3.2 エラーフロー

```
POST /api/v1/projects/:projectName/unpublish
  └─→ 404 / 409 / 500
      └─→ errorCode を state に保存
          └─→ ダイアログ内に Alert を表示
              └─→ ユーザーはキャンセルして状況を確認
```

### 3.3 ダイアログを閉じる

- `×` ボタン押下（`onCancel`）
- `キャンセル` ボタン押下
- いずれも `errorCode` をリセットしてから `onClose()` を呼ぶ

---

## 4. エラーメッセージ一覧

| エラーコード | 日本語メッセージ | 発生条件 |
|------------|---------------|---------|
| `NOT_PUBLISHED` | 公開済みアセットが存在しません | 対象プロジェクトに公開済みアセットがない |
| `ALREADY_IN_PROGRESS` | 非公開処理がすでに進行中です | `status = pending/running` のジョブが既にある |
| `SYSTEM_ERROR`（フォールバック） | システムエラーが発生しました | 上記以外のエラー |

---

## 5. Props 定義

```typescript
export interface MaimlUnpublishDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** 非公開対象のプロジェクト名 */
  projectName: string;
  /** ダイアログを閉じる時のコールバック */
  onClose: () => void;
  /**
   * 非公開ジョブ受付成功時のコールバック
   * @param jobId 受け付けたジョブID（UUID）
   */
  onSuccess: (jobId: string) => void;
}
```

| Prop | 型 | 必須 | 説明 |
|------|---|------|------|
| `open` | `boolean` | ✅ | `true` でダイアログを表示 |
| `projectName` | `string` | ✅ | 非公開対象プロジェクト名。本文中に表示される |
| `onClose` | `() => void` | ✅ | キャンセル・`×` 押下時のコールバック |
| `onSuccess` | `(jobId: string) => void` | ✅ | 202 受付成功時のコールバック。引数は `job_id` |

---

## 6. State 定義

```typescript
const [loading, setLoading] = useState(false);
const [errorCode, setErrorCode] = useState<string | null>(null);
```

| State | 型 | 初期値 | 説明 |
|-------|----|--------|------|
| `loading` | `boolean` | `false` | API呼び出し中 `true`。ボタンの `loading` / `disabled` に使用 |
| `errorCode` | `string \| null` | `null` | エラーコード。`null` のときエラー Alert を非表示 |

---

## 7. API 連携

### 7.1 呼び出す API

| API | エンドポイント | メソッド | 成功レスポンス |
|-----|-------------|--------|-------------|
| MaiML非公開 | `/api/v1/projects/:projectName/unpublish` | `POST` | `202 Accepted` |

### 7.2 リクエスト

```http
POST /api/v1/projects/{projectName}/unpublish
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

リクエストボディなし。

### 7.3 成功レスポンス (202 Accepted)

```json
{
  "success": true,
  "data": {
    "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "status": "pending",
    "message": "非公開ジョブを受け付けました"
  }
}
```

`job_id` を `onSuccess` コールバックへ渡す。

### 7.4 エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "NOT_PUBLISHED",
    "message": "..."
  }
}
```

`error.code` を `errorCode` state にセットして Alert を表示する。

---

## 8. 実装ファイル

| 種別 | ファイルパス |
|------|------------|
| コンポーネント | `frontend/src/components/project/MaimlUnpublishDialog.tsx` |
| API サービス | `frontend/src/services/projectApiService.ts`（`unpublishProject`） |
| 型定義 | `backend/src/types/maimlOpenData.ts`（`PublishJobResponse`） |

---

## 9. 権限制御

| ロール | ダイアログ表示 |
|-------|-------------|
| experiment_admin | ✅ 表示（ボタンが「非公開にする」状態の時のみ） |
| その他 | ❌ 呼び出し元ボタン自体が非表示のため到達不可 |

バックエンド側でも `authMiddleware` によりロールチェックを実施。

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-03-13 | 初版作成（実装済みソースコードから仕様を起こす） | Cline |

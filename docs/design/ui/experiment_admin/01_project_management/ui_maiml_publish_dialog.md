# UI仕様書: MaiML 公開確認ダイアログ

**作成日**: 2026-03-13  
**最終更新**: 2026-08-20  
**バージョン**: 1.1.0  
**対象ロール**: experiment_admin  
**実装状況**: 実装済み

---

## 1. 概要

### 1.1 コンポーネントの目的

プロジェクト管理画面のファイル操作ツールバーにある「公開する」ボタン押下時に表示される確認ダイアログ。  
バックエンドのプリコンディションチェックを通過した場合のみ公開ジョブを受け付け、  
処理は非同期（BullMQ）で行われるため、本ダイアログは 202 Accepted 受取後すぐに閉じる。

### 1.2 使用場面

- プロジェクト管理画面で任意のプロジェクトを選択し「公開する」ボタンを押した時
- 再公開（一度非公開にした後に再公開する）する時

### 1.3 関連コンポーネント

- **呼び出し元**: `ProjectManagement.tsx`（ファイル操作ツールバー）
- **対**: `MaimlUnpublishDialog`（非公開確認ダイアログ）

---

## 2. 画面仕様

### 2.1 ダイアログレイアウト

```
┌─────────────────────────────────┐
│ MaiML 公開確認          [×]    │
├─────────────────────────────────┤
│                                 │
│  プロジェクト [プロジェクト名]  │
│  を公開します。よろしいですか？ │
│                                 │
│  ┌──────────────────────────┐  │
│  │ ⚠ 公開できません         │  │  ← エラー時のみ表示
│  │ （エラーメッセージ）      │  │
│  └──────────────────────────┘  │
│                                 │
│         [キャンセル] [公開する] │
└─────────────────────────────────┘
```

### 2.2 ダイアログ仕様

| 項目 | 値 |
|------|---|
| タイトル | `t('maimlPublish.title')` |
| Ant Design コンポーネント | `Modal` |
| `destroyOnHidden` | `true`（閉じるたびにアンマウント）※Ant Design v6 プロパティ名 |
| フッター | カスタム（`Space` で `キャンセル` と `公開する` を横並び） |

### 2.3 本文

```
t('maimlPublish.confirmText').replace('{{projectName}}', projectName)
```

- `{{projectName}}` プレースホルダーをプロジェクト名で置換して表示
- プロジェクト名部分の太字表示なし

### 2.4 フッターボタン

| ボタン | ラベル | 種別 | 動作 | 活性状態 |
|-------|--------|------|------|---------|
| キャンセル | `t('maimlPublish.cancel')` | `type="default"` | ダイアログを閉じ、エラー状態をリセット | API呼び出し中は `disabled` |
| 公開する | `t('maimlPublish.publish')` | `type="primary"` | `publishProject(projectId)` API を呼び出す | API呼び出し中は `loading` |

### 2.5 エラー表示

API からエラーが返ってきた場合、本文の下に `Alert` コンポーネントで表示する。

```
⚠ 公開できません
（エラーメッセージ）
```

| Prop | 値 |
|------|---|
| `type` | `"error"` |
| `showIcon` | `true` |
| `message` | `t('maimlPublish.errorTitle')` |
| `description` | `getErrorMessage(errorCode)` — i18nキー `maimlPublish.errors.{code}` で取得。キーが存在しない場合は `t('maimlPublish.errors.E4001')` にフォールバック |

---

## 3. 操作フロー

### 3.1 正常フロー

```
ユーザー:「公開する」ボタン押下（ツールバー）
  └─→ MaimlPublishDialog が開く
      └─→ ユーザー:「公開する」ボタン押下（ダイアログ内）
          └─→ loading = true / errorCode = null
              └─→ POST /api/v1/projects/:projectName/publish
                  └─→ 202 Accepted
                      ├─→ ダイアログを閉じる（handleClose）
                      └─→ onSuccess(jobId) コールバック
                          └─→ usePublishStatusPoller.start() でポーリング開始
```

### 3.2 エラーフロー（プリコンディション不満足）

```
POST /api/v1/projects/:projectName/publish
  └─→ 400 / 404 / 409
      └─→ errorCode を state に保存
          └─→ ダイアログ内に Alert を表示
              └─→ ユーザーはキャンセルまたは条件を満たしてから再試行
```

### 3.3 ダイアログを閉じる

- `×` ボタン押下（`onCancel`）
- `キャンセル` ボタン押下
- いずれも `errorCode` をリセットしてから `onClose()` を呼ぶ

---

## 4. エラーメッセージ一覧

| エラーコード | 日本語メッセージ | 発生条件 |
|------------|---------------|---------|
| `PROJECT_NOT_FOUND` | プロジェクトが見つかりません | プロジェクトが DB に存在しない |
| `PROJECT_NOT_CHECKED_OUT` | プロジェクトがチェックアウトされていません | `checkout_status != 1` |
| `PROJECT_STATUS_INVALID` | プロジェクトステータスがタスク結果レビュー待ちではありません | `project_status != 3`（レビュー待ち） |
| `E7005` | プロジェクトステータスがタスク結果レビュー待ちではありません | バックエンドが返す `E7005` コード（`PROJECT_STATUS_INVALID` と同義） |
| `TASKS_NOT_COMPLETED` | 完了・異常終了以外のタスクが残っています | 完了/異常終了以外のタスク詳細が存在する |
| `MAIML_NOT_FOUND` | MAIMLファイルが存在しません | ストレージに `.maiml` ファイルがない |
| `ALREADY_IN_PROGRESS` | 公開処理がすでに進行中です | `status = pending/running` のジョブが既にある |
| `E4001`（フォールバック） | `t('maimlPublish.errors.E4001')` | 上記以外のエラー、またはエラーコードが取得できない場合（`code ?? 'E4001'`）|

---

## 5. Props 定義

```typescript
export interface MaimlPublishDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** 公開対象のプロジェクト名（表示用） */
  projectName: string;
  /** 公開対象のプロジェクトID */
  projectId: string;
  /** ダイアログを閉じる時のコールバック */
  onClose: () => void;
  /**
   * 公開ジョブ受付成功時のコールバック
   * @param jobId 受け付けたジョブID（UUID）
   */
  onSuccess: (jobId: string) => void;
}
```

| Prop | 型 | 必須 | 説明 |
|------|---|------|------|
| `open` | `boolean` | ✅ | `true` でダイアログを表示 |
| `projectName` | `string` | ✅ | 公開対象プロジェクト名。本文中に表示される |
| `projectId` | `string` | ✅ | 公開対象プロジェクトID。API呼び出しに使用 |
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
| MaiML公開 | `/api/v1/projects/:projectId/publish` | `POST` | `202 Accepted` |

### 7.2 リクエスト

```http
POST /api/v1/projects/{projectId}/publish
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

- `projectId`（UUID）をURLパスパラメータに使用
- リクエストボディなし（公開設定はサーバー側デフォルト値を使用）

### 7.3 成功レスポンス (202 Accepted)

```json
{
  "success": true,
  "data": {
    "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "status": "pending",
    "message": "公開ジョブを受け付けました"
  }
}
```

`job_id` を `onSuccess` コールバックへ渡す。

### 7.4 エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "PROJECT_STATUS_INVALID",
    "message": "..."
  }
}
```

`error.code` を `errorCode` state にセットして Alert を表示する。

---

## 8. 実装ファイル

| 種別 | ファイルパス |
|------|------------|
| コンポーネント | `frontend/src/components/project/MaimlPublishDialog.tsx` |
| API サービス | `frontend/src/services/projectApiService.ts`（`publishProject`） |
| 型定義 | `backend/src/types/maimlOpenData.ts`（`PublishJobResponse`） |

---

## 9. 権限制御

| ロール | ダイアログ表示 |
|-------|-------------|
| experiment_admin | ✅ 表示 |
| その他 | ❌ 呼び出し元ボタン自体が非表示のため到達不可 |

バックエンド側でも `authMiddleware` によりロールチェックを実施。

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.1.0 | 2026-08-20 | `projectId` Props追加・APIエンドポイントをprojectIdベースに修正・エラーフォールバックを `E4001` に修正・エラーメッセージ/タイトル/ボタンラベルをi18nキーに修正・`destroyOnClose`→`destroyOnHidden`に修正・本文太字なしに修正 | Cline |
| 1.0.1 | 2026-03-31 | エラーメッセージ一覧に `E7005` コードを追加（バックエンドの `E` プレフィックス形式エラーコードへの対応） | Cline |
| 1.0.0 | 2026-03-13 | 初版作成（実装済みソースコードから仕様を起こす） | Cline |

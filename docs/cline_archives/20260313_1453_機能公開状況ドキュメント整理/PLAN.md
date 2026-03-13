# タスク計画書: 公開/非公開機能UI改善

## メタデータ
- **作成日時**: 2026-03-13 15:05
- **最終更新**: 2026-03-13 15:16
- **タスクID**: 公開非公開UI改善
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

プロジェクト管理画面の「公開」「非公開」ボタンに以下の改善を実施する。

1. **確認ダイアログ追加** — 公開・非公開それぞれにダイアログを追加し、誤操作を防ぐ
2. **バックエンド公開前チェック強化** — `POST /api/v1/projects/:projectName/publish` 内でチェックを行い、NGならジョブ登録せずエラーレスポンスを返す
3. **公開時にプロジェクトステータスを完了に更新** — 公開ジョブ受付時にプロジェクトステータスを「プロジェクト完了（4）」に更新する
4. **非同期ジョブのステータスポーリング** — 公開/非公開処理の完了をリアルタイムで画面に反映する

---

## 現状の実装

| 項目 | 現状 |
|------|------|
| 公開ボタン | クリック → ダイアログなし → 直接 `publishProject()` API呼び出し |
| 非公開ボタン | クリック → ダイアログなし → 直接 `unpublishProject()` API呼び出し |
| ステータス取得 | プロジェクト選択時に1回のみ `getPublishStatus()` を呼び出し（ポーリングなし） |
| 完了通知 | `message.success` トーストのみ |
| バックエンドチェック | `enqueuePublish` 内で重複チェック・MAIMLファイル存在確認のみ（プロジェクト状態・タスク状態の確認なし） |

---

## 実装ステップ

### Phase 1: バックエンド — maimlPublishService にバリデーション追加

`enqueuePublish()` 関数（`backend/src/services/maimlPublishService.ts`）の冒頭に以下チェックを追加する。
チェックNGの場合はジョブ登録・キュー投入を行わず例外を投げる。

- [ ] **チェック①** プロジェクトが存在するか（`projectRepository.findByName`）
- [ ] **チェック②** プロジェクトがチェックアウト状態であるか（`is_checked_out = true`）
  - NG → `throw new Error('PROJECT_NOT_CHECKED_OUT')`
- [ ] **チェック③** プロジェクトステータスが「タスク結果レビュー待ち（3）」であるか
  - NG → `throw new Error('PROJECT_STATUS_INVALID')`
- [ ] **チェック④** 全タスク詳細が「完了（4）」または「異常終了（5）」であるか
  - `projectTaskDetailRepository` で当該プロジェクトの全タスク詳細を取得し確認
  - NG → `throw new Error('TASKS_NOT_COMPLETED')`
- [ ] **チェック⑤**（既存）MAIMLファイルが存在するか
- [ ] **チェック⑥**（既存）処理中ジョブが存在しないか
- [ ] **公開受付後** プロジェクトステータスを「プロジェクト完了（4）」に更新
  - `projectRepository.updateStatus(projectId, 4)` を呼び出す
  - bullmq 投入後・レスポンス返却前に実行

### Phase 2: バックエンド — コントローラーにエラーコードを追加

`backend/src/controllers/projectController.ts` の `publish()` 関数にエラーハンドリングを追加する。

- [ ] `PROJECT_NOT_CHECKED_OUT` → 400
- [ ] `PROJECT_STATUS_INVALID` → 400
- [ ] `TASKS_NOT_COMPLETED` → 400
- [ ] `MAIML_NOT_FOUND` → 400（既存）
- [ ] `ALREADY_IN_PROGRESS` → 409（既存）

### Phase 3: フロントエンド — 公開確認ダイアログ

- [ ] `MaimlPublishDialog.tsx` を新規作成（`frontend/src/components/project/`）
  - モーダル表示：「{プロジェクト名} を公開しますか？」
  - 「公開する」ボタン押下 → `publishProject()` API 呼び出し
  - API エラー（400/409）返却時 → モーダル内に `Alert` でエラーメッセージ表示
    - `PROJECT_NOT_CHECKED_OUT` → 「プロジェクトがチェックアウトされていません」
    - `PROJECT_STATUS_INVALID` → 「プロジェクトステータスがタスク結果レビュー待ちではありません」
    - `TASKS_NOT_COMPLETED` → 「完了・異常終了以外のタスクが残っています」
    - `MAIML_FILE_NOT_FOUND` → 「MAIMLファイルが存在しません」
    - `JOB_ALREADY_IN_PROGRESS` → 「公開処理がすでに進行中です」
  - API 成功（202）→ モーダルを閉じてポーリング開始

### Phase 4: フロントエンド — 非公開確認ダイアログ

- [ ] `MaimlUnpublishDialog.tsx` を新規作成（`frontend/src/components/project/`）
  - モーダル表示：「{プロジェクト名} の公開を取り消しますか？」
  - danger ボタンで `unpublishProject()` API 呼び出し
  - 成功後はモーダルを閉じてポーリング開始

### Phase 5: フロントエンド — ポーリングカスタムフック

- [ ] `usePublishStatusPoller.ts` を新規作成（`frontend/src/hooks/`）
  - `pending` / `running` の間は 3秒ごとに `getPublishStatus()` を呼び出す
  - `done` / `error` になったら停止し `onComplete(status)` コールバックを呼ぶ
  - コンポーネントアンマウント時にクリーンアップ（`clearInterval`）
  - タイムアウト: 5分（300秒）で自動停止

### Phase 6: フロントエンド — ProjectManagement 組み込み

- [ ] 公開ボタン → `MaimlPublishDialog` を開くように変更
- [ ] 非公開ボタン → `MaimlUnpublishDialog` を開くように変更
- [ ] `usePublishStatusPoller` フックを組み込む
  - 公開/非公開実行後にポーリング開始
  - `pending`/`running` 中はボタンにスピナー表示
  - `done` → `publishStatus` を再取得してボタン状態を更新、`message.success` を表示
  - `error` → `message.error` でエラー内容を表示

---

## バックエンドのチェック仕様（全チェック）

| # | チェック項目 | エラーコード | HTTPステータス |
|---|------------|-----------|------------|
| 1 | チェックアウト状態であること | `PROJECT_NOT_CHECKED_OUT` | 400 |
| 2 | プロジェクトステータスが「タスク結果レビュー待ち（3）」 | `PROJECT_STATUS_INVALID` | 400 |
| 3 | 全タスク詳細が完了（4）または異常終了（5） | `TASKS_NOT_COMPLETED` | 400 |
| 4 | MAIMLファイルが存在する（既存） | `MAIML_NOT_FOUND` | 400 |
| 5 | 処理中ジョブが存在しない（既存） | `ALREADY_IN_PROGRESS` | 409 |

チェック通過後の追加処理：
- bullmq キューへジョブ投入（既存）
- プロジェクトステータスを「プロジェクト完了（4）」に更新（追加）

---

## ポーリング仕様

| 項目 | 値 |
|------|---|
| ポーリング間隔 | 3秒 |
| ポーリング対象ステータス | `pending` / `running` |
| ポーリング停止条件 | `done` / `error` / コンポーネントアンマウント |
| タイムアウト | 5分（300秒）で自動停止 |

---

## 変更ファイル

### 新規作成
| ファイル | 説明 |
|---------|------|
| `frontend/src/components/project/MaimlPublishDialog.tsx` | 公開確認ダイアログ |
| `frontend/src/components/project/MaimlUnpublishDialog.tsx` | 非公開確認ダイアログ |
| `frontend/src/hooks/usePublishStatusPoller.ts` | ポーリングカスタムフック |

### 修正
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/maimlPublishService.ts` | `enqueuePublish` にチェック処理・ステータス更新を追加 |
| `backend/src/controllers/projectController.ts` | `publish` にエラーコードマッピングを追加 |
| `frontend/src/components/project/ProjectManagement.tsx` | ダイアログ組み込み・ポーリング組み込み |

---

## テスト計画
- [ ] チェックアウト未の状態で公開ボタン押下 → `PROJECT_NOT_CHECKED_OUT` エラー表示
- [ ] ステータス不正な状態で公開ボタン押下 → `PROJECT_STATUS_INVALID` エラー表示
- [ ] 未完了タスクがある状態で公開ボタン押下 → `TASKS_NOT_COMPLETED` エラー表示
- [ ] 正常な状態で公開ボタン押下 → 公開受付・ポーリング開始・プロジェクトステータスが4に変わる
- [ ] 非公開ダイアログが開く・閉じる
- [ ] 非公開後にポーリングが開始される
- [ ] ポーリング完了後にボタン状態が「公開」になる

---

## 承認記録
- **計画書提示日時**: 2026-03-13 15:16
- **承認日時**: 2026-03-13 15:20
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-03-13 15:20
完了: 2026-03-13 15:42

### 最終的な成果物

#### 新規作成ファイル
- [x] `frontend/src/components/project/MaimlPublishDialog.tsx` — 公開確認ダイアログ（エラーコード別メッセージ付き）
- [x] `frontend/src/components/project/MaimlUnpublishDialog.tsx` — 非公開確認ダイアログ
- [x] `frontend/src/hooks/usePublishStatusPoller.ts` — 非同期ジョブポーリングフック（3秒間隔・5分タイムアウト）

#### 修正ファイル
- [x] `backend/src/services/maimlPublishService.ts` — `enqueuePublish` にチェックアウト/ステータス/タスク状態チェック追加・公開後ステータスを4に更新
- [x] `backend/src/controllers/projectController.ts` — エラーコードマッピング追加（PROJECT_NOT_CHECKED_OUT / PROJECT_STATUS_INVALID / TASKS_NOT_COMPLETED）
- [x] `frontend/src/components/project/ProjectManagement.tsx` — ダイアログ組み込み・ポーリングフック組み込み・ボタンloading制御

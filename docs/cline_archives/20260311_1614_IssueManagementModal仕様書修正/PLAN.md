# タスク計画書: IssueManagementModal仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 16:14
- **タスクID**: IssueManagementModal仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/ui/experiment_worker/ui_issue_management_modal.md` の仕様書を、実際のソースコード `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` と一致するよう修正する。

ソースコードはPropのコールバック設計から**内部APIを直接呼び出す設計**に変更されており、仕様書が現状のコードと大きく乖離しているため、仕様書を正確な内容に更新する。

## 目的と期待される成果
- [ ] 仕様書がソースコードの実装内容と一致した状態になる
- [ ] Props定義が最新の状態に更新される
- [ ] 内部API呼び出し設計が仕様書に追記される
- [ ] 各イベントハンドラの処理内容が正確に記載される

## 実装ステップ

### Step 1: Props定義の修正（セクション3）
- [ ] 古いProps（`transitionName`, `issues`, `onSubmitIssue`, `onSubmitComment`, `onUpdateStatus`）を削除
- [ ] 新しいProps（`targetName`, `projectId`, `projectName`, `methodId`, `taskNo`）を追加
- [ ] Props詳細説明を更新

### Step 2: モーダルタイトルの修正（セクション11.1）
- [ ] タイトルの記述を `transitionName` → `targetName` に修正
- [ ] viewModeによるタイトル切り替え（`問題確認` / `問題報告`）を追記

### Step 3: State定義の修正（セクション4.1）
- [ ] `issues` 内部State を追加
- [ ] `issuesLoading` ローディング状態を追加
- [ ] `fetchIssues()` 関数の説明を追加

### Step 4: 内部API呼び出し設計の追記（新セクション）
- [ ] `useEffect` によるモーダルオープン時の問題一覧取得を追記
- [ ] `fetchIssues()` の仕様を追記
- [ ] 使用APIサービス（`issueApiService`）の記述を追記

### Step 5: イベントハンドラの処理内容修正（セクション9.2）
- [ ] `handleSubmitNewIssue`：コールバック → `createIssue()` API呼び出しに修正
- [ ] `handleCommentSubmit`：コールバック → `addComment()` API呼び出しに修正
- [ ] `handleSetResolved`：コールバック → `addComment()` + `updateIssueStatus()` API呼び出しに修正
- [ ] `handleSetUnresolved`：コールバック → `addComment()` + `updateIssueStatus()` API呼び出しに修正
- [ ] `handleClose`：`setIssues([])` の追記

### Step 6: その他細部の修正
- [ ] `destroyOnClose` → `destroyOnHidden` の修正（セクション11.1）
- [ ] `bodyStyle` → `styles.body` の修正（セクション11.2）
- [ ] ボタンの `title` tooltip 追記（セクション7.4）
- [ ] `SendOutlined` アイコン削除（セクション2.3）
- [ ] 使用コンポーネントに `Spin` を追加（セクション2.3）
- [ ] インポートに `useEffect`, `useCallback` を追記（セクション2.3）

## 変更ファイル
1. `docs/design/ui/experiment_worker/ui_issue_management_modal.md` - 仕様書の修正

## リスク
| リスク | 対策 |
|--------|------|
| 修正漏れが発生する | 差分一覧を参照しながら各Stepを順番に実施 |

## テスト計画
- [ ] 修正後の仕様書を読み、ソースコードと整合性が取れているか確認

## 承認記録
- **承認日時**: 2026-03-11 16:14

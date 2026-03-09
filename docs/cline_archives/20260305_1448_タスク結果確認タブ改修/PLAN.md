# タスク計画書: タスク結果確認タブ改修

## メタデータ
- **作成日時**: 2026-03-05 14:48
- **タスクID**: task-results-tab-refactor
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

プロジェクト管理画面のタスク結果確認タブおよびファイル操作ツールバーに対して以下の改修を行う。

### 改修内容

1. **「結果確認」ボタンの削除**
   - `TaskResultsTable.tsx` のテーブル「操作」列にある「詳細」（結果確認）ボタンを削除する

2. **「作業確認」ボタンの移動**
   - ファイル操作ツールバーの「作業者画面」ボタンを削除する
   - タスク結果確認タブに「作業確認」ボタン（旧：作業者画面）を移動・改名する

3. **「タスク確認完了」ボタンの追加**
   - タスク結果確認タブに「作業確認」ボタンの隣に「タスク確認完了」ボタンを追加する
   - ボタン押下時に、当該プロジェクトのレビュー待ち（`review_waiting`）タスクを全て完了（`completed`）にする

4. **バックエンドAPI追加**
   - `POST /api/v1/projects/:projectName/tasks/complete-review` を新規追加
   - `review_waiting` 状態のタスクを全て `completed` に更新する

---

## 2. 目的と期待される成果

### 目的
- UI整理：結果確認ボタンは冗長なため削除
- 操作性向上：作業者画面ボタンをタスク結果確認タブに集約し、関連操作を一か所にまとめる
- 新機能：レビュー待ちタスクを一括完了できるボタンを実験管理者に提供する

### 期待される成果
- [ ] `TaskResultsTable.tsx` の「詳細」（結果確認）ボタンが削除されている
- [ ] ファイル操作ツールバーの「作業者画面」ボタンが削除されている
- [ ] タスク結果確認タブに「作業確認」ボタンが表示される
- [ ] タスク結果確認タブに「タスク確認完了」ボタンが表示される
- [ ] 「タスク確認完了」ボタン押下でレビュー待ちタスクが全て完了になる
- [ ] バックエンドAPIが正常に動作する

---

## 3. 実装ステップ

### Phase 1: フロントエンド - TaskResultsTable.tsx の修正

- [ ] 「操作」列全体（`actions` カラム）を削除する
  - `columns` 配列から `key: 'actions'` のカラム定義を削除
  - `onViewResult` prop の受け取りを削除（`TaskResultsTableProps`から削除）
  - `EyeOutlined` のimportを削除

### Phase 2: フロントエンド - ProjectManagement.tsx の修正

#### 2-1. ファイル操作ツールバーから「作業者画面」ボタンを削除
- [ ] ファイル操作ツールバーの `<Button>作業者画面</Button>` を削除する

#### 2-2. タスク結果確認タブにボタンエリアを追加
- [ ] 統計カードの上・右寄せにボタンエリアを追加する
  - 配置: `<Flex justify="flex-end">` で右寄せにし、統計カードグリッドの直上に配置
  - 「作業確認」ボタン（既存ロジック `onOpenWorkerScreen` を流用、ボタン表示名を「作業確認」に変更）
  - 「タスク確認完了」ボタン（新規）
- [ ] `handleCompleteReview` ハンドラを実装する
  - `review_waiting` タスクが0件の場合はメッセージを表示して処理を中断
  - バックエンドAPI (`POST /api/v1/projects/:projectName/tasks/complete-review`) を呼び出す
  - 成功時: タスク一覧を再取得して統計を更新 + 成功メッセージ表示
  - 失敗時: エラーメッセージ表示
- [ ] `isCompletingReview` ステートを追加（ローディング制御用）
- [ ] `TaskResultsTable` への `onViewResult` prop の渡しを削除する

#### 2-3. API呼び出し関数を追加
- [ ] `projectApiService.ts` にレビュー完了API関数 `completeReviewTasks` を追加する

### Phase 3: バックエンド - API実装

#### 3-1. コントローラー実装
- [ ] `projectController.ts` に `completeReviewTasks` 関数を追加する
  - `project_task` テーブルで `work_status = 'review_waiting'` のタスクを全て `completed` に更新
  - 更新件数が0件の場合もエラーにせず成功レスポンスを返す

#### 3-2. ルート追加
- [ ] `projectRoutes.ts` にルートを追加する
  ```
  POST /api/v1/projects/:projectName/tasks/complete-review
  権限: checkPermission('040000', 1)（実験管理者メニュー・書込可）
  ```

#### 3-3. サービス層実装
- [ ] `projectService.ts` に `completeReviewTasks` 関数を追加する
  - organization_id と project_name でプロジェクトを特定する
  - `review_waiting` 状態のタスクを全て `completed` に更新するSQL実行
  - 更新した件数をレスポンスとして返す

---

## 4. 影響範囲

### 変更するファイル

#### フロントエンド
1. `frontend/src/components/project/TaskResultsTable.tsx` - 「操作」列・`onViewResult` prop を削除
2. `frontend/src/components/project/ProjectManagement.tsx` - ツールバーのボタン削除、タブへのボタン追加、ハンドラ追加
3. `frontend/src/services/projectApiService.ts` - `completeReviewTasks` API関数を追加

#### バックエンド
4. `backend/src/controllers/projectController.ts` - `completeReviewTasks` コントローラー追加
5. `backend/src/services/projectService.ts` - `completeReviewTasks` サービス関数追加
6. `backend/src/routes/projectRoutes.ts` - `POST .../tasks/complete-review` ルート追加

### 新規作成するファイル
なし

### 削除するファイル
なし

---

## 5. 技術的詳細

### 新規APIの仕様

**エンドポイント:**
```
POST /api/v1/projects/:projectName/tasks/complete-review
```

**権限:** 実験管理者（機能CD: 040000, 書込可）

**レスポンス (200 OK):**
```json
{
  "success": true,
  "data": {
    "updatedCount": 5,
    "message": "レビュー待ちタスクを5件完了に更新しました"
  }
}
```

**レスポンス (レビュー待ちなし, 200 OK):**
```json
{
  "success": true,
  "data": {
    "updatedCount": 0,
    "message": "レビュー待ちのタスクはありませんでした"
  }
}
```

### タスク結果確認タブのボタン配置

```
┌─────────────────────────────────────────────────────┐
│                        [ 作業確認 ][ タスク確認完了 ] │ ← 右上（統計カードの上）
│ ──────────────────────────────────────────────────  │
│ 統計カード（6カラム）                                  │
│ ──────────────────────────────────────────────────  │
│ タスク一覧テーブル                                     │
└─────────────────────────────────────────────────────┘
```

実装方針: 統計カードグリッドの直上に `<Flex justify="flex-end">` のボタンエリアを配置する。

### ボタンの活性制御

| ボタン | 活性条件 |
|--------|----------|
| 作業確認 | `isProjectCheckedOut === true`（既存ロジック流用） |
| タスク確認完了 | `taskStats.review_waiting > 0` かつ `isCompletingReview === false` |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 一括完了APIの権限ミス | 高 | 低 | checkPermission('040000', 1) を確実に設定 |
| 重複クリックによる二重実行 | 中 | 中 | `isCompletingReview` フラグでローディング中はボタン無効化 |
| review_waiting以外のタスクが誤って完了になる | 高 | 低 | SQL WHERE句で `work_status = 'review_waiting'` を確実にフィルタ |

---

## 7. テスト計画

### 手動テスト
- [ ] タスク結果確認タブに「作業確認」ボタンが表示されること
- [ ] タスク結果確認タブに「タスク確認完了」ボタンが表示されること
- [ ] ファイル操作ツールバーに「作業者画面」ボタンが表示されないこと
- [ ] テーブルの「操作」列（詳細ボタン）が表示されないこと
- [ ] プロジェクト未チェックアウト時に「作業確認」ボタンが非活性であること
- [ ] レビュー待ちタスクが0件の場合に「タスク確認完了」ボタンが非活性であること
- [ ] 「タスク確認完了」押下でレビュー待ちタスクが全て完了になること
- [ ] 「タスク確認完了」後に統計カードの数値が更新されること

---

## 8. 承認記録

- **計画書提示日時**: 2026-03-05 14:48
- **承認日時**: （承認時に記入）
- **承認者コメント**: （承認後に記入）

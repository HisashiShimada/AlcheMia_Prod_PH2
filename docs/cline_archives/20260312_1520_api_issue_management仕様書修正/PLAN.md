# タスク計画書: api_issue_management.md 仕様書修正

## メタデータ
- **作成日時**: 2026-03-12 17:22
- **タスクID**: api_issue_management仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/api/api_issue_management.md` の内容を、実際のソースコード実装に合わせて修正する。

対象ソースコード:
- `backend/src/controllers/issueController.ts`
- `backend/src/services/issueService.ts`
- `backend/src/repositories/issueRepository.ts`
- `backend/src/routes/issueRoutes.ts`

---

## ソースコード調査結果

### issueRoutes.ts の実装概要

```typescript
// ルート定義（実装）
router.post('/',          checkPermission('050000', 1), ..., issueController.create)
router.post('/comments',  checkPermission('050000', 1), ..., issueController.addComment)
router.get('/',           checkPermission('050000', 0), ..., issueController.list)
router.get('/:issueId',   // checkPermission なし（authMiddleware + tenantIsolation のみ）
router.patch('/status',   checkPermission('050000', 1), ..., issueController.updateStatus)
```

### issueService.ts の実装概要

- `create()`: issueType を code_master テーブルで検証（code_division='issue_type'）
- `list()`: `IssueListFilters` を受け取り、全フィルタオプション
- `updateStatus()`: status は **integer（0=未解決、1=解決済）**
- `addComment()`: projectName から projectId を取得し、issueId はボディで受け取る

### issueRepository.ts の実装概要

- `listIssuesWithComments()`: `IssueListFilters` に基づく動的フィルタ
  - `methodId`, `taskNo`, `transitionId` はすべて **オプション**
  - フィルタなし時はプロジェクト全件取得
  - taskNo フィルタ: `AND (i.issue_target != 2 OR i.task_no = $N)` — issue_target=2(task)以外は常に含む
  - transitionId フィルタ: `AND (i.issue_target != 3 OR i.transition_id = $N)`
- `addComment()`: pg-promise の `tx()` でトランザクション管理

---

## 差分分析（仕様書 vs 実装）

### 差分1: API一覧テーブル

| 項目 | 現行仕様書 | 実際の実装 | 修正要否 |
|------|-----------|-----------|---------|
| コメント投稿エンドポイント（#2） | `POST /api/v1/issues/:issueId/comments` | `POST /api/v1/issues/comments` | ✅ 要修正 |

### 差分2: 1. 問題報告API（POST /api/v1/issues）

| 項目 | 現行仕様書 | 実際の実装 | 修正要否 |
|------|-----------|-----------|---------|
| ミドルウェア権限チェック | `permissionCheck(['worker', 'manager', 'admin'])` | `checkPermission('050000', 1)` | ✅ 要修正 |
| `handleValidationErrors` | 記載なし | 追加されている | ✅ 要修正 |
| SQL例のテーブル名 | `issues` | `issue` | ✅ 要修正 |
| description 文字数 | 1-2000文字 | 1-2000文字 | ✅ 正しい |

### 差分3: 2. コメント投稿API

| 項目 | 現行仕様書 | 実際の実装 | 修正要否 |
|------|-----------|-----------|---------|
| **エンドポイント（最重要）** | `POST /api/v1/issues/comments` | `POST /api/v1/issues/comments` | ✅ セクション見出しは正しい |
| **issueIdの渡し方** | パスパラメータ（`:issueId`）として言及なし | **リクエストボディ** | ✅ 正しい（ただしAPI一覧テーブルが誤り） |
| ミドルウェア権限チェック | `permissionCheck(['experiment_worker'])` | `checkPermission('050000', 1)` | ✅ 要修正 |
| `handleValidationErrors` | 記載なし | 追加されている | ✅ 要修正 |
| SQL例中のテーブル名 `issue` | `issue` | `issue` | ✅ 正しい |

### 差分4: 3. 問題一覧取得API（GET /api/v1/issues）

| 項目 | 現行仕様書 | 実際の実装 | 修正要否 |
|------|-----------|-----------|---------|
| `methodId` 必須/オプション | **必須（○）** | **オプション** | ✅ 要修正 |
| `taskNo` 必須/オプション | **必須（○）** | **オプション** | ✅ 要修正 |
| `transitionId` 必須/オプション | **必須（○）** | **オプション** | ✅ 要修正 |
| ミドルウェア権限チェック | `permissionCheck(['worker', 'manager', 'admin'])` | `checkPermission('050000', 0)` | ✅ 要修正 |
| `handleValidationErrors` | 記載なし | 追加されている | ✅ 要修正 |
| ビジネスロジック フィルタリング条件 | issue_target に基づく3パターン（厳密な一致） | task/transition系は除外条件で動的フィルタ | ✅ 要修正 |
| バリデーション（methodId/taskNo/transitionId） | 必須チェック | **オプション**（指定された場合のみチェック） | ✅ 要修正 |

### 差分5: 5. 問題ステータス変更API（PATCH /api/v1/issues/status）

| 項目 | 現行仕様書 | 実際の実装 | 修正要否 |
|------|-----------|-----------|---------|
| 認証要件ロール記述 | 「experiment_worker のみ書込可」 | `checkPermission('050000', 1)` | ✅ 要修正 |
| セキュリティ節権限記述 | 「Manager以上の権限が必要（Worker は不可）」 | checkPermission('050000', 1)（Workerも含む可能性） | ✅ 要修正 |
| ミドルウェア権限チェック | `permissionCheck(['experiment_worker'])` | `checkPermission('050000', 1)` | ✅ 要修正 |
| `handleValidationErrors` | 記載なし | 追加されている | ✅ 要修正 |
| status バリデーション | `status は "unresolved" または "resolved"` | **integer: 0または1** | ✅ 要修正（バリデーション節） |

---

## 目的と期待される成果

### 目的
実際のソースコードに基づいて仕様書を正確に反映し、開発者が仕様書を参照した際に誤った情報を得ないようにする。

### 期待される成果
- [ ] API一覧テーブルのコメント投稿エンドポイント修正
- [ ] 各APIのミドルウェアチェーンを実装に合わせて修正
- [ ] コメント投稿APIのエンドポイント・パラメータ仕様修正
- [ ] 問題一覧取得APIのクエリパラメータ必須/オプション修正
- [ ] 問題一覧取得APIのビジネスロジック・バリデーション修正
- [ ] 問題ステータス変更APIの権限・バリデーション修正

---

## 実装ステップ

### Phase 1: API一覧テーブル修正
- [ ] API一覧テーブルの #2 コメント投稿エンドポイントを修正（`:issueId` 削除）

### Phase 2: 問題報告API（POST /api/v1/issues）修正
- [ ] ミドルウェアチェーン記述を `checkPermission('050000', 1)` + `handleValidationErrors` に修正
- [ ] SQL例のテーブル名 `issues` → `issue` に修正

### Phase 3: コメント投稿API（POST /api/v1/issues/comments）修正
- [ ] ミドルウェアチェーン記述を `checkPermission('050000', 1)` + `handleValidationErrors` に修正
- [ ] SQL例を実装（pg-promise tx()）に合わせて修正

### Phase 4: 問題一覧取得API（GET /api/v1/issues）修正
- [ ] クエリパラメータの必須/オプションを修正（methodId/taskNo/transitionId をオプションに）
- [ ] ミドルウェアチェーン記述を `checkPermission('050000', 0)` + `handleValidationErrors` に修正
- [ ] ビジネスロジックの説明を実装のフィルタリングロジックに合わせて修正
- [ ] バリデーション節をオプションに合わせて修正

### Phase 5: 問題ステータス変更API（PATCH /api/v1/issues/status）修正
- [ ] 認証要件ロール記述を修正（experiment_worker → checkPermission ベース）
- [ ] ミドルウェアチェーン記述を `checkPermission('050000', 1)` + `handleValidationErrors` に修正
- [ ] バリデーション節の status 記述を integer（0/1）に修正
- [ ] セキュリティ節の権限記述矛盾を解消

### Phase 6: 変更履歴の更新
- [ ] 変更履歴に今回の修正内容を追記

---

## 変更ファイル

1. `docs/design/api/api_issue_management.md` - 仕様書の修正

---

## リスク

| リスク | 対策 |
|--------|------|
| ソースコード側の追加変更がある | 修正後に実装との整合性を再確認 |
| issueType の型（整数 vs 文字列）が不明確 | issueRoutes.tsのバリデーションを確認（文字列バリデーションと整数処理が混在）→ 型の扱いを明記 |

---

## 承認記録
- **計画書提示日時**: 2026-03-12 17:22
- **承認日時**: 2026-03-12 17:22
- **承認者コメント**: 調査結果も含めてタスク計画書を作成し修正を実施



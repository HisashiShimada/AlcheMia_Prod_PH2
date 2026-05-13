# タスク計画書: 問題ステータス更新の修正

## メタデータ
- **作成日時**: 2026-02-27 19:04
- **タスクID**: 問題ステータス更新修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`IssueManagementModal` の「未解決」ボタン・「解決」ボタン押下時に、コメント投稿API（`POST /api/v1/issues/comments`）のみが呼ばれ、ステータス更新API（`PATCH /api/v1/issues/status`）が呼ばれていないため、問題のステータスが更新されない不具合を修正する。

## 原因分析

### 問題1: フロントエンド - `onUpdateStatus` が渡されていない
`TransitionList.tsx` で `IssueManagementModal` に `onUpdateStatus` プロパティが渡されていない。
`IssueManagementModal` 内部では `handleSetResolved` / `handleSetUnresolved` で `onUpdateStatus` コールバックを呼んでいるが、渡されていないため何も起きない。

### 問題2: フロントエンド - `updateIssueStatus` 関数が未実装
`issueApiService.ts` に `PATCH /api/v1/issues/status` を呼ぶ関数がない。

### 問題3: バックエンド - `status` の型不一致
API設計書では `status` を **integer（0:未解決, 1:解決）** と定めているが、バックエンド実装（`issueRoutes.ts`, `issueService.ts`）は **文字列（`'unresolved'|'resolved'`）** のままになっている。

## 目的と期待される成果

- [ ] 「未解決」ボタン押下時に `PATCH /api/v1/issues/status`（status=0）が呼ばれ、ステータスが未解決に更新される
- [ ] 「解決」ボタン押下時に `PATCH /api/v1/issues/status`（status=1）が呼ばれ、ステータスが解決済に更新される
- [ ] ステータス更新後に問題一覧が再取得され、画面に最新状態が反映される

## 実装ステップ

### Phase 1: タスク計画書の作成
- [x] タスク計画書の作成と出力

### Phase 2: バックエンド修正

#### Step 1: `issueRoutes.ts` の `status` バリデーション修正
- [ ] `PATCH /api/v1/issues/status` の `status` バリデーションを `isIn(ISSUE_STATUS_VALUES)` から `isInt({ min: 0, max: 1 })` に変更

#### Step 2: `issueService.ts` の `updateStatus` メソッド修正
- [ ] `updateStatus` メソッドのシグネチャを `status: IssueStatus` → `status: number` に変更
- [ ] `validateStatus` メソッドを integer チェック（0 or 1）に変更
- [ ] `convertStatusToNumber` メソッドを削除（不要になるため）
- [ ] `updateStatus` 内の `convertStatusToNumber` 呼び出しを削除

### Phase 3: フロントエンド修正

#### Step 3: `issueApiService.ts` に `updateIssueStatus` 関数を追加
- [ ] `UpdateIssueStatusParams` インターフェースを追加
- [ ] `updateIssueStatus` 関数を追加（`IssueStatus` 文字列を integer に変換して送信）

#### Step 4: `TransitionList.tsx` に `handleUpdateStatus` ハンドラを追加
- [ ] `updateIssueStatus` のインポートを追加
- [ ] `handleUpdateStatus` ハンドラを追加
- [ ] `IssueManagementModal` に `onUpdateStatus={handleUpdateStatus}` を渡す

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/routes/issueRoutes.ts` | `status` バリデーションを `isInt({min:0, max:1})` に変更 |
| 2 | `backend/src/services/issueService.ts` | `updateStatus` の `status` 引数を `number` 型に変更、バリデーション修正、`convertStatusToNumber` 削除 |
| 3 | `frontend/src/services/issueApiService.ts` | `UpdateIssueStatusParams` 型と `updateIssueStatus` 関数を追加 |
| 4 | `frontend/src/components/ExperimentWorker/TransitionList.tsx` | `handleUpdateStatus` 追加 + `onUpdateStatus` 渡す |

## 技術的詳細

### バックエンドの `status` 型変換フロー

```
フロントエンド（文字列）  →  APIリクエスト（integer）  →  バックエンド（integer）  →  DB（integer）
'unresolved' / 'resolved'  →  0 / 1              →  0 / 1                →  0 / 1
```

### フロントエンドの変換ロジック（`issueApiService.ts`）

```typescript
const statusInt = params.status === 'resolved' ? 1 : 0;
```

### `updateStatus` ハンドラのフロー（`TransitionList.tsx`）

```
handleUpdateStatus(issueId, status)
  → updateIssueStatus({ projectName, issueId, status })
    → PATCH /api/v1/issues/status { projectName, issueId, status: 0 or 1 }
  → getIssues(...) // 問題一覧再取得
  → setIssues(fetchedIssues) // 表示更新
```

## セキュリティ考慮事項
- [ ] 変更なし（既存の認証・認可ミドルウェアをそのまま使用）

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| DB の status カラムが文字列型の場合に integer が保存できない | 高 | 低 | issueService.ts にて既に `convertStatusToNumber` で数値変換済みのため問題なし |
| バックエンドのテストが文字列型前提で書かれている場合 | 中 | 中 | テストファイルを確認して必要なら修正 |

## テスト計画
- [ ] 「解決」ボタン押下 → ステータスが「解決済」に変わること
- [ ] 「未解決」ボタン押下 → ステータスが「未解決」に戻ること
- [ ] ステータス更新後にコメント一覧に新規コメントが表示されること

## 承認記録
- **計画書提示日時**: 2026-02-27 19:04
- **承認日時**: 2026-02-27 19:04
- **承認者コメント**: 実装作業はなるべく細かく分けて実行すること

## 実施記録

### 実施日時
開始: 2026-02-27 19:04
完了: （完了後に記入）

### 計画からの変更点
（実施後に記入）

### 最終的な成果物
- [ ] `backend/src/routes/issueRoutes.ts` 修正完了
- [ ] `backend/src/services/issueService.ts` 修正完了
- [ ] `frontend/src/services/issueApiService.ts` 修正完了
- [ ] `frontend/src/components/ExperimentWorker/TransitionList.tsx` 修正完了

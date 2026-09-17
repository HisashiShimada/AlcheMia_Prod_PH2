# タスク計画書: requestApproval での checkout_status=0 更新漏れ修正

## メタデータ
- **作成日時**: 2026-09-17 17:00
- **タスクID**: 20260917_1700_requestApproval_checkout_status修正
- **優先度**: 高（管理者画面の承認処理が機能しない障害）
- **推定工数**: 1時間

---

## タスク概要

`backend/src/services/projectService.ts` の `requestApproval` メソッドにて、  
`project` テーブルの `checkout_status` を `0`（CHECKED_IN）に更新する処理が抜けている。

承認依頼（`requestApproval`）時は、ワーカーがチェックアウト中のプロジェクトを  
チェックインし直す（`checkout_status = 0`）ことで、管理者画面が  
「チェックアウト済のため操作不可」と判断しなくなり、承認処理が実施できるようになる。

---

## 問題の詳細

### 現状

`requestApproval` 内のトランザクション処理では以下のみ実施している：

1. `project_status` を `3`（REVIEW_WAITING）に更新 ← `updateApprovalStatus.sql` で実行
2. タスクステータスを IN_PROGRESS(1) → REVIEW_WAITING(2) に一括更新

`checkout_status = 0` への更新が**存在しない**。

### 期待する動作

`requestApproval` 完了後に `project.checkout_status = 0`（CHECKED_IN）になっていることで、  
管理者画面側が「チェックイン済＝編集ロックなし」と判断し、承認処理を実施できる。

---

## 目的と期待される成果

- [x] `requestApproval` 実行後に `checkout_status = 0` が設定される
- [x] 管理者画面での承認処理がブロックされなくなる
- [x] 既存の動作（`project_status` 更新・タスクステータス更新）には影響なし

---

## 影響範囲の分析

### 変更対象ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `backend/src/sql/queries/projects/updateApprovalStatus.sql` | **修正** | `checkout_status = 0` のセット追加 |

### 変更アプローチの検討

**アプローチA: `updateApprovalStatus.sql` を修正する（推奨）**

`updateApprovalStatus.sql` の `SET` 句に `checkout_status = 0` を追記する。  
Service 層・Repository 層のコードを変更しないため影響範囲が最小。

```sql
-- Before
UPDATE project
SET project_status = $1,
    update_at = $2,
    update_user_id = $3
WHERE organization_id = $4 
  AND project_id = $5

-- After
UPDATE project
SET project_status = $1,
    checkout_status = 0,
    update_at = $2,
    update_user_id = $3
WHERE organization_id = $4 
  AND project_id = $5
```

**アプローチB: Service 層でトランザクション内に `updateCheckinStatus` を追加呼び出し**

既存の `projectRepository.updateCheckinStatus(client, organizationId, projectId)` を  
トランザクション内で呼び出す方法。ただし `updateCheckinStatus` は `PoolClient` を引数に取るが、  
`requestApproval` のトランザクションは `pg-promise` の `tx` を使っており、  
`PoolClient` と `pg-promise TaskContext` は互換性がないため**不適切**。

→ **アプローチA（SQLファイル修正）を採用する**

---

## 実装ステップ

- [ ] 1. `updateApprovalStatus.sql` に `checkout_status = 0` を追記
- [ ] 2. 動作確認（コードレビュー）
- [ ] 3. 既存テストの確認（テスト内容の変更不要か確認）

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `updateApprovalStatus` を呼ぶ他の箇所への影響 | 低 | grep 確認済み：`projectService.requestApproval` のみが呼び出し元であるため影響なし |
| チェックアウト中でない状態（`checkout_status = 0`）に対して `checkout_status = 0` を再設定 | 低 | 冪等な更新のため問題なし |

---

## テスト計画

- [ ] `updateApprovalStatus.sql` の SQL が `checkout_status = 0` を設定していることを目視確認
- [ ] 既存テスト（`backend/tests/`）を実行しパス確認

---

## 承認記録
- **計画書提示日時**: 2026-09-17 17:00
- **承認日時**: 2026-09-17 17:10
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-09-17 17:10
完了: 2026-09-17 17:20

### 変更ファイル
- [x] `backend/src/sql/queries/projects/updateApprovalStatus.sql` — `SET` 句に `checkout_status = 0` を追加

### 計画からの変更点
なし

### 発生した問題と解決方法
テスト実行時に `nanoid` ESM/CJS 互換エラー・`notificationRepository` 不在エラーが発生したが、
いずれも今回の修正とは無関係な既存問題であることを確認済み。

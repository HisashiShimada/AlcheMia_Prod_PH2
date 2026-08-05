# organization_group テストデータ 動作確認対応表

## ファイル構成と実行順序

```
1. test_data_insert.sql                                     （前提：既存の基本データ）
2. test_data_organization_group_access.sql                  （ユーザー・グループ・プロジェクト登録）
3. test_data_organization_group_access_file_metadata.sql    （MAIMLファイルメタデータ・project_uuid設定）
4. test_data_organization_group_access_tasks.sql            （project_task / project_task_detail 登録）
```

> ファイル3・4 はシナリオ B（ステータス確認）に必要。シナリオ A のみ確認する場合は 1・2 のみで可。

---

## グループ階層構造

```
HQ（本社）is_active=true  ← chief: hq_user@example.com
├── HQ-DEV（開発部）is_active=true  ← chief: dev_user@example.com
│   └── HQ-DEV-A（開発部Aチーム）is_active=false  ← chief: dev_a_user@example.com
└── HQ-SALES（営業部）is_active=true  ← chief: sales_user@example.com

EXTERNAL（外部パートナー）is_active=true  ← chief: exp.admin@example.com（既存）
```

---

## ユーザー一覧

| ユーザーID | 所属グループ | ロール | 備考 |
|---|---|---|---|
| `hq_user@example.com` | HQ | experiment_admin | 親グループ代表 |
| `dev_user@example.com` | HQ-DEV | experiment_admin | 子グループ代表 |
| `dev_a_user@example.com` | HQ-DEV-A | experiment_admin | 孫グループ代表（非アクティブグループ所属） |
| `sales_user@example.com` | HQ-SALES | experiment_admin | 別系統グループ代表 |
| `multi_user@example.com` | HQ + HQ-DEV | experiment_admin | 複数グループ所属 |
| `no_group_user@example.com` | なし | experiment_admin | グループ未所属 |
| `exp.admin@example.com` | EXTERNAL | （既存ユーザー） | 既存テストデータのユーザー |
| `system.admin@example.com` | — | system_admin | 既存テストデータの管理者 |

**パスワード（全ユーザー共通）**: `test123`

---

## シナリオ A：グループアクセス制御確認

必要ファイル: `test_data_insert.sql` + `test_data_organization_group_access.sql`

### プロジェクトとアクセス権対応表

| プロジェクト名 | 所属グループ | grp_active | 閲覧可ユーザー | 編集可ユーザー |
|---|---|:---:|---|---|
| `P_HQ` | HQ | ✅ | hq_user, multi_user | hq_user, multi_user |
| `P_HQ_DEV` | HQ-DEV | ✅ | hq_user（祖先）, dev_user, multi_user | dev_user, multi_user |
| `P_HQ_DEV_A` | HQ-DEV-A | ❌ | hq_user, dev_user, multi_user（有効祖先経由） | dev_a_user（chief特例のみ） |
| `P_HQ_SALES` | HQ-SALES | ✅ | hq_user（祖先）, sales_user, multi_user（HQ所属） | sales_user |
| `P_EXTERNAL` | EXTERNAL | ✅ | exp.admin（chiefのみ） | exp.admin |

> **全員閲覧・編集不可**: `no_group_user@example.com`
> **全件閲覧・編集可**: `system.admin@example.com`（SystemAdmin権限）

### 確認シナリオ詳細

| シナリオ | 使用ユーザー | 使用プロジェクト | 確認内容 |
|---|---|---|---|
| A-1 親グループは子グループのプロジェクトを閲覧可 | `hq_user` | `P_HQ_DEV`, `P_HQ_DEV_A`, `P_HQ_SALES` | 閲覧できる／編集できない |
| A-2 直接所属グループのみ編集可 | `dev_user` | `P_HQ_DEV` | 閲覧・編集できる |
| A-2 他グループは閲覧のみ | `dev_user` | `P_HQ` | 閲覧できる／編集できない |
| A-3 無関係グループは閲覧不可 | `sales_user` | `P_HQ_DEV`, `P_HQ_DEV_A` | 閲覧できない（0件） |
| A-3 無関係グループは閲覧不可 | `dev_user` | `P_HQ_SALES` | 閲覧できない（0件） |
| A-4 is_active=false グループでも有効祖先所属なら閲覧可 | `dev_user`（HQ-DEV所属） | `P_HQ_DEV_A` | 閲覧できる（HQ-DEVはHQ-DEV-Aの有効祖先） |
| A-4 is_active=false グループ直接所属者は閲覧不可 | `dev_a_user`（HQ-DEV-A所属） | `P_HQ_DEV_A` | 閲覧できない（非アクティブグループ直接所属） |
| A-5 非アクティブグループの chief は編集可 | `dev_a_user` | `P_HQ_DEV_A` | 閲覧・編集できる（chief特例） |
| A-6 SystemAdmin は全件操作可 | `system.admin` | 全プロジェクト | 全て閲覧・編集できる |
| A-グループ未所属 | `no_group_user` | 全プロジェクト | 全て閲覧・編集できない（0件） |
| A-複数グループ | `multi_user`（HQ+HQ-DEV） | `P_HQ`, `P_HQ_DEV` | どちらも閲覧・編集できる |
| A-複数グループ | `multi_user`（HQ+HQ-DEV） | `P_HQ_DEV_A`, `P_HQ_SALES` | 閲覧できる／編集できない |

---

## シナリオ B：プロジェクトステータス × MAIML × チェックアウト状態確認

必要ファイル: 上記 + `test_data_organization_group_access_file_metadata.sql` + `test_data_organization_group_access_tasks.sql`

全プロジェクトが `HQ-DEV` グループ所属。

**閲覧可**: `hq_user`（祖先）, `dev_user`, `multi_user`
**編集可**: `dev_user`, `multi_user`（HQ-DEV直接所属）

### プロジェクト状態一覧

| プロジェクト名 | status | MAIMLあり | checkout | タスクデータ |
|---|:---:|:---:|:---:|---|
| `P_STATUS_PLANNING_NO_MAIML` | 0: PLANNING | ❌ | CHECKED_IN | なし |
| `P_STATUS_PLANNING_WITH_MAIML` | 0: PLANNING | ✅ | CHECKED_IN | project_task 3件のみ（詳細未登録） |
| `P_STATUS_IN_PROGRESS_CO` | 2: IN_PROGRESS | ✅ | CHECKED_OUT | task1:COMPLETED, task2:IN_PROGRESS, task3:PENDING |
| `P_STATUS_REVIEW_WAITING` | 3: REVIEW_WAITING | ✅ | CHECKED_IN | task1,2,3: REVIEW_WAITING（レビュー未完了） |
| `P_STATUS_COMPLETED` | 4: COMPLETED | ✅ | CHECKED_IN | task1,2,3: COMPLETED（レビュー済み） |

### MAIMLファイルの project_uuid（file_metadata.sql で設定）

| プロジェクト名 | project_uuid |
|---|---|
| `P_STATUS_PLANNING_WITH_MAIML` | `b1000002-0000-4000-8000-000000000002` |
| `P_STATUS_IN_PROGRESS_CO` | `b1000003-0000-4000-8000-000000000003` |
| `P_STATUS_REVIEW_WAITING` | `b1000004-0000-4000-8000-000000000004` |
| `P_STATUS_COMPLETED` | `b1000005-0000-4000-8000-000000000005` |

### 確認シナリオ詳細

| シナリオ | 使用ユーザー | 使用プロジェクト | 確認内容 |
|---|---|---|---|
| B-1 MAIMLなし状態のプロジェクト表示 | `dev_user` | `P_STATUS_PLANNING_NO_MAIML` | MAIMLなし・タスクなし・チェックイン状態で表示 |
| B-2 MAIMLあり・タスク未登録 | `dev_user` | `P_STATUS_PLANNING_WITH_MAIML` | MAIMLあり・タスク未割り当て状態 |
| B-3 チェックアウト中の排他制御 | `dev_user` | `P_STATUS_IN_PROGRESS_CO` | 自分がチェックアウト中（再チェックアウト不可） |
| B-3 チェックアウト中の排他制御 | `hq_user` | `P_STATUS_IN_PROGRESS_CO` | 他ユーザーがチェックアウト中（チェックアウト不可） |
| B-3 タスク進行状況確認 | `dev_user` | `P_STATUS_IN_PROGRESS_CO` | task1:完了, task2:実行中, task3:待機中 |
| B-4 レビュー待ち状態 | `dev_user` | `P_STATUS_REVIEW_WAITING` | 全タスクがREVIEW_WAITING・レビュー未完了 |
| B-5 完了済みプロジェクト | `dev_user` | `P_STATUS_COMPLETED` | 全タスク完了・レビュー済み |
| B-5 完了済みフィルタ | `dev_user` | `P_STATUS_COMPLETED` | include_completed=false で非表示になること |
| B-閲覧のみ×状態確認 | `hq_user` | B系全プロジェクト | 閲覧はできるが編集操作（チェックアウト等）は不可 |

---

## 全体アクセスマトリクス（シナリオ A+B 統合）

| プロジェクト | hq_user (HQ) | dev_user (HQ-DEV) | dev_a_user (HQ-DEV-A) | sales_user (HQ-SALES) | multi_user (HQ+HQ-DEV) | no_group_user |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| P_HQ | 閲・編 | 閲 | × | 閲 | 閲・編 | × |
| P_HQ_DEV | 閲 | 閲・編 | × | × | 閲・編 | × |
| P_HQ_DEV_A | 閲 | 閲 | 閲・編※ | × | 閲 | × |
| P_HQ_SALES | 閲 | × | × | 閲・編 | 閲 | × |
| P_EXTERNAL | × | × | × | × | × | × |
| P_STATUS_* (HQ-DEV) | 閲 | 閲・編 | × | × | 閲・編 | × |

※ `dev_a_user`: 非アクティブグループ HQ-DEV-A の chief のため編集可（特例）  
`system.admin@example.com`: 全プロジェクトを閲覧・編集可（SystemAdmin権限）

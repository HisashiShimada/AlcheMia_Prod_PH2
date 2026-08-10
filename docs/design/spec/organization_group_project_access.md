# organization_group によるプロジェクト閲覧・編集権限仕様

> **作成日**: 2026-08-05  
> **調査対象**: `backend/src/services/projectService.ts`, `backend/src/sql/queries/projects/findAllWithDetails.sql`, マイグレーションファイル群

---

## 1. 概要

`organization_group`（組織階層グループ）は、同一組織内のユーザーをチーム・部門単位で階層管理するための仕組みです。プロジェクトは必ずいずれかのグループに紐づき、ユーザーの所属グループに基づいて **閲覧範囲** と **編集可否** が制御されます。

### 背景

旧来の `department`（部署）テーブルを廃止し、階層構造・代表者・有効/無効フラグを持つ `organization_group` へ移行（2026-07-10 マイグレーション）。

---

## 2. テーブル定義

### 2.1 organization_group（組織階層グループ）

| カラム名 | 型 | 説明 |
|---|---|---|
| organization_id | UUID (PK) | 組織ID |
| organization_group_cd | VARCHAR(50) (PK) | グループCD（主キー） |
| organization_group_name | VARCHAR(255) | グループ名 |
| chief_user_id | VARCHAR(50) | 代表者ユーザーID |
| parent_group_cd | VARCHAR(50) | 親グループCD（NULL=ルートグループ） |
| layer | VARCHAR(20) | レイヤー（任意メタ情報） |
| is_active | BOOLEAN | アクティブ判定（デフォルト: true） |
| create_user_id / create_at | - | 作成者・作成日時 |
| update_user_id / update_at | - | 更新者・更新日時 |

**主キー**: `(organization_id, organization_group_cd)`

### 2.2 organization_group_user（グループ所属ユーザー・多対多中間テーブル）

| カラム名 | 型 | 説明 |
|---|---|---|
| organization_id | UUID (PK) | 組織ID |
| organization_group_cd | VARCHAR(50) (PK) | グループCD |
| user_id | VARCHAR(50) (PK) | ユーザーID |
| create_at | TIMESTAMP | 登録日時 |

**主キー**: `(organization_id, organization_group_cd, user_id)`  
**特記**: ユーザーは複数グループへの同時所属が可能。

### 2.3 project（プロジェクト、関連カラム抜粋）

| カラム名 | 型 | 説明 |
|---|---|---|
| organization_group_cd | VARCHAR(50) | 所属グループCD（必須。旧 `department_cd` から rename） |

---

## 3. 階層構造のイメージ

```
organization_group
  ├── HQ（ルート, parent_group_cd=NULL）
  │   ├── HQ-DEV（子グループ）
  │   │   └── HQ-DEV-A（孫グループ）
  │   └── HQ-SALES（子グループ）
  └── EXTERNAL（ルート, 別系統）
```

- プロジェクトは各グループに紐づく（例: `Project_A` → `HQ-DEV`）
- ユーザーはグループに所属（例: `UserX` → `HQ`）

---

## 4. 閲覧権限ロジック

実装箇所: `backend/src/services/projectService.ts` - `list()` メソッド  
SQL 実装: `backend/src/sql/queries/projects/findAllWithDetails.sql` の `WHERE` 句（`$3::text[] = ANY(...)`）

### 4.1 SystemAdmin（roleCd === 'ROLE002'）

- **全プロジェクトを閲覧可能**（グループフィルタなし）
- `visibleGroupCds = null` として SQL に渡すと、`$3::text[] IS NULL` により全件返却。

### 4.2 一般ユーザー

ユーザーの JWT ペイロードに含まれる `organizationGroupCds`（直接所属グループ CD 配列）をベースに以下のロジックで閲覧可能グループを算出します。

#### ステップ 1: 直接所属グループが存在する場合

1. 直接所属グループ群のうち、他の所属グループの **子孫でないルートグループ** を抽出。  
   例: `[A, A-1]` の場合 → `A-1` は `A` の子孫なので `A` のみをルートとする。
2. ルートグループ群の **全配下グループ CD**（自身含む）を再帰取得（`organizationGroupRepository.findDescendantCds`）。  
   → これが **アクティブ配下グループ一覧**。
3. 非アクティブグループの救済ロジック（後述 §4.3）で追加された `inactiveVisibleCds` を合算。
4. 最終的な `visibleGroupCds = [...activeDescendantCds, ...inactiveVisibleCds]`（重複除去）。

#### ステップ 2: 直接所属グループが 0 件の場合

- 非アクティブグループ救済ロジック（§4.3）で閲覧可能になったグループのみ閲覧可能。
- それも 0 件なら **0 件を返す**（空配列で即早期リターン）。

### 4.3 非アクティブグループの救済ロジック

`is_active = false` のグループに紐づくプロジェクトは通常の配下取得では取得されません。そのため、以下の救済ロジックが適用されます。

```
非アクティブグループ（is_active=false）ごとに：
  ├── ルートグループが非アクティブ → SystemAdmin のみアクセス可（スキップ）
  └── 親グループを持つ場合：
        有効な祖先グループ CD 一覧（findActiveAncestorCds）を取得
        ↓
        ユーザーがいずれかの有効祖先グループに所属している
          → inactiveVisibleCds に追加（閲覧可能）
```

**閲覧可能条件まとめ**:

| 条件 | 閲覧可否 |
|---|---|
| SystemAdmin | ✅ 全件閲覧可 |
| ユーザーが所属グループ配下のプロジェクト | ✅ 閲覧可 |
| ユーザーが所属グループの子孫グループのプロジェクト | ✅ 閲覧可 |
| 非アクティブグループのプロジェクト（有効祖先グループに所属） | ✅ 閲覧可 |
| 非アクティブグループのプロジェクト（有効祖先グループ未所属） | ❌ 閲覧不可 |
| ルートが非アクティブのグループのプロジェクト（非SystemAdmin） | ❌ 閲覧不可 |
| 全く関係ないグループのプロジェクト | ❌ 閲覧不可 |

---

## 5. 編集権限ロジック（isEditable）

実装箇所: `findAllWithDetails.sql` の SELECT 句  
```sql
($4::text[] IS NULL OR p.organization_group_cd = ANY($4::text[])) AS is_editable
```

`$4` = `editableGroupCds`（Service 層で算出）

### 5.1 editableGroupCds の算出

| ユーザー種別 | editableGroupCds |
|---|---|
| SystemAdmin | `null`（SQL で `$4::text[] IS NULL` = true → 全件 is_editable=true） |
| 一般ユーザー（所属グループあり） | `[...activeOrganizationGroupCds, ...inactiveEditableCds]`（直接所属グループのうち **is_active=true のみ** + 非アクティブグループの有効祖先chief分） |
| 一般ユーザー（所属グループなし） | `inactiveEditableCds`（非アクティブグループの有効祖先chief分のみ） |

### 5.2 非アクティブグループの編集権限特例

```
非アクティブグループごとに：
  有効な祖先グループ CD 一覧を取得
  ↓
  ユーザーがいずれかの有効祖先グループの chief_user_id である
    → inactiveEditableCds に追加（そのグループのプロジェクトを編集可能）
```

**編集可能条件まとめ**:

| 条件 | 編集可否 |
|---|---|
| SystemAdmin | ✅ 全件編集可（is_editable = true） |
| ユーザーが **直接所属** グループのプロジェクト | ✅ 編集可 |
| ユーザーが **子孫** グループにのみ所属（親グループのプロジェクト） | ❌ 編集不可（閲覧のみ） |
| ユーザーが **親** グループに所属（子グループのプロジェクト） | ❌ 編集不可（閲覧のみ） |
| 非アクティブグループのプロジェクト（有効祖先 chief_user_id が一致） | ✅ 編集可 |
| 非アクティブグループのプロジェクト（chief_user_id 不一致） | ❌ 編集不可（閲覧のみ） |

---

## 6. API エンドポイント別 権限チェック実装状況

| エンドポイント | メソッド | ロール権限チェック | 組織グループチェック |
|---|---|---|---|
| `GET /api/v1/projects` | 一覧取得 | なし | ✅ Service層で `visibleGroupCds` フィルタ、`isEditable` 算出 |
| `POST /api/v1/projects` | 作成 | なし（Controller内でWorker除外） | ❌ なし（選択グループCDをそのまま登録） |
| `DELETE /api/v1/projects/:projectId` | 削除 | `checkPermission('040000', 1)` | ❌ なし |
| `PATCH /api/v1/projects/:projectId/rename` | リネーム | `checkPermission('040000', 1)` | ❌ なし |
| `GET /api/v1/projects/:projectId/maiml` | MAIML取得 | なし | ❌ なし |
| `POST /api/v1/projects/:projectId/checkout` | チェックアウト | なし | ❌ なし |
| `POST /api/v1/projects/:projectId/checkin` | チェックイン | なし | ❌ なし |
| `POST /api/v1/projects/:projectId/publish` | 公開 | `checkPermission('040000', 1)` | ❌ なし |
| `POST /api/v1/projects/:projectId/unpublish` | 非公開 | `checkPermission('040000', 1)` | ❌ なし |

> ⚠️ **既知の制約**: 個別の更新系 API（削除・リネーム・チェックアウト等）では、バックエンド側に `organization_group_cd` による所属チェックが実装されていません。編集権限の制御は **プロジェクト一覧 API のレスポンスに含まれる `isEditable` フラグをフロントエンドが参照してボタンの disabled 制御を行う** という形で実現されています。API を直接呼び出した場合は、グループ外のプロジェクトに対しても操作可能な状態です。

---

## 7. フロントエンドでの利用

### 7.1 プロジェクト管理画面（`ProjectManagement.tsx`）

`isEditable` フラグを参照して以下のボタンの活性/非活性を制御：

- 削除ボタン
- プロジェクト名変更
- チェックイン / チェックアウト
- ファイルアップロード
- 暗号化・電子署名
- 公開 / 非公開

### 7.2 プロジェクト作成モーダル（`CreateProjectModal.tsx`）

- プロジェクト作成時にグループを選択（必須）
- ユーザーが直接所属するグループのみ選択肢として表示

### 7.3 プロジェクト一覧表示（`ProgressMonitoring.tsx` 等）

- `organizationGroup`（グループ CD）・`organizationGroupName`（グループ名）を表示
- グループでのフィルタリング機能あり

---

## 8. グループ階層の取得実装

| 処理 | 実装箇所 |
|---|---|
| 全グループ取得 | `organizationGroupRepository.findAll(organizationId)` |
| 配下グループ CD 再帰取得（アクティブのみ） | `organizationGroupRepository.findDescendantCds(organizationId, rootCds)` |
| 非アクティブグループの有効祖先 CD 取得 | `projectService.ts` 内ローカル関数 `findActiveAncestorCds()` |
| 子孫判定 | `projectService.ts` 内ローカル関数 `isDescendantOfAny()` |

---

## 9. プロジェクト作成時のグループ設定

- `POST /api/v1/projects` の `organizationGroupId` パラメータで指定
- `project.organization_group_cd` に保存
- 作成後の変更: 現状 API なし（UI 上も変更不可）

---

## 10. 関連ファイル一覧

| ファイル | 内容 |
|---|---|
| `backend/src/services/projectService.ts` | 閲覧・編集権限ロジック本体（`list()` メソッド） |
| `backend/src/sql/queries/projects/findAllWithDetails.sql` | SQL クエリ（`is_editable` 算出・`visibleGroupCds` フィルタ） |
| `backend/src/repositories/organizationGroupRepository.ts` | グループ取得・配下 CD 再帰取得 |
| `backend/src/routes/projectRoutes.ts` | API ルーティング定義 |
| `backend/migrations/20260710_add_organization_group.sql` | organization_group テーブル追加マイグレーション |
| `backend/migrations/20260805_add_is_active_to_organization_group.sql` | `is_active` カラム追加マイグレーション |
| `backend/sql/test_data_organization_group_access.sql` | 動作確認用テストデータ |

---

## 11. 更新履歴

| 日付 | 変更内容 |
|---|---|
| 2026-08-05 | 初版作成（ソースコード調査に基づく現状仕様整理） |

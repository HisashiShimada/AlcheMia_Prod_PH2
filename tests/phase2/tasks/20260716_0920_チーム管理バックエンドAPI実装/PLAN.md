# タスク計画書: チーム管理バックエンドAPI実装

## メタデータ
- **作成日時**: 2026-07-16 09:20
- **タスクID**: チーム管理バックエンドAPI実装
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

チーム管理タブ（`TeamManagementPanel`, `TeamAddDialog`, `TeamEditDialog`）が呼び出しているバックエンドAPIのうち、未実装のエンドポイントを実装する。

現在フロントエンドはAPIエラー時にダミーデータへフォールバックしているため、実際のDB連携が行われていない。

---

## 2. 現状把握

### 既実装エンドポイント（`departmentUnitRoutes.ts`）

| メソッド | パス | 状態 |
|---------|------|------|
| GET | `/api/v1/department-units/users` | ✅ 実装済み |
| GET | `/api/v1/department-units` | ✅ 実装済み |
| POST | `/api/v1/department-units` | ✅ 実装済み |
| GET | `/api/v1/department-units/:id/members` | ✅ 実装済み |
| PUT | `/api/v1/department-units/:id/members` | ✅ 実装済み |

### 未実装エンドポイント（フロントエンドが呼び出し中）

| メソッド | パス | 呼び出し元 | 概要 |
|---------|------|-----------|------|
| GET | `/api/v1/department-units/my-teams` | `TeamManagementPanel.tsx` | ログインユーザーが代表者のチーム一覧取得 |
| PUT | `/api/v1/department-units/:id` | `TeamEditDialog.tsx` | チーム名更新 |
| PUT | `/api/v1/department-units/:id/owner` | `TeamEditDialog.tsx` | 代表者ユーザー更新 |

---

## 3. 実装設計

### 使用テーブル

**`department_unit`** テーブル（`20260617_add_department_unit.sql` で作成済み）
- organization_id, department_unit_id, department_cd, unit_name, layer, description, is_active, create_user_id, create_at, update_user_id, update_at

**`organization_user`** テーブル（既存）
- organization_id, user_id, user_name, department_unit_id, is_active, ...

### API設計

#### GET `/api/v1/department-units/my-teams`
- 認証ユーザーのuser_idが `department_unit.chief_user_id`（※ `departmentUnitRepository`の既存構造を確認して設計）に一致するチームを取得
- **注**: `department_unit` テーブルに `chief_user_id` カラムが存在しない場合、`organization_user` テーブルの `department_unit_id` から「自分が所属する」チームをフォールバック取得、またはフロントエンドが想定する形を確認して適切に設計

**レスポンス形式（`Team[]`型 ← `frontend/src/types/namespace.ts` に定義）:**
```json
[
  {
    "departmentUnitId": "xxx",
    "unitName": "材料解析チーム",
    "departmentName": "研究開発部",
    "ownerName": "山田 太郎",
    "ownerUserId": "user-001",
    "nsUri": "https://example.org/ns/materials/",
    "members": [...]
  }
]
```

#### PUT `/api/v1/department-units/:id`
- チーム名（`unit_name`）を更新
- リクエストボディ: `{ unitName: string }`
- レスポンス: 204 No Content

#### PUT `/api/v1/department-units/:id/owner`
- 代表者ユーザーIDを更新
- リクエストボディ: `{ ownerUserId: string }`
- レスポンス: 204 No Content
- **注**: `department_unit` テーブルに `chief_user_id` が存在しない場合はカラム追加マイグレーションが必要

---

## 4. 実装ステップ

### Phase 1: テーブル構造確認
- [ ] `department_unit` テーブルの実際のカラム構成を確認（DDLファイルを特定）
  - 参照先: `backend/migrations/20260617_add_department_unit.sql`
- [ ] `chief_user_id` カラムの有無を確認
- [ ] カラムが不足する場合はマイグレーションSQL作成を計画に含める

### Phase 2: Repository 拡張（`departmentUnitRepository.ts`）
- [ ] `findMyTeams(organizationId, userId)` - 自分が代表者のチーム一覧取得
- [ ] `updateUnit(organizationId, departmentUnitId, unitName)` - チーム名更新
- [ ] `updateChiefUser(organizationId, departmentUnitId, ownerUserId)` - 代表者更新

### Phase 3: Controller 拡張（`departmentUnitController.ts`）
- [ ] `getMyTeams` - GET /my-teams ハンドラー
- [ ] `updateDepartmentUnit` - PUT /:id ハンドラー
- [ ] `updateOwner` - PUT /:id/owner ハンドラー

### Phase 4: Route 追加（`departmentUnitRoutes.ts`）
- [ ] `GET /my-teams` ルート追加（`/users` より前に定義が必要）
- [ ] `PUT /:id` ルート追加
- [ ] `PUT /:id/owner` ルート追加

### Phase 5: マイグレーション（必要な場合）
- [ ] `chief_user_id` カラムが `department_unit` テーブルに存在しない場合:
  - `backend/migrations/20260716_add_chief_user_id_to_department_unit.sql` 作成

---

## 5. 変更ファイル

### 新規作成
1. `backend/migrations/20260716_add_chief_user_id_to_department_unit.sql` - （テーブル構造確認後、必要な場合のみ）

### 修正
1. `backend/src/repositories/departmentUnitRepository.ts` - 3メソッド追加
2. `backend/src/controllers/departmentUnitController.ts` - 3ハンドラー追加
3. `backend/src/routes/departmentUnitRoutes.ts` - 3ルート追加

---

## 6. 技術的詳細

### `my-teams` エンドポイントのレスポンス整合性
フロントエンドの `Team` 型（`frontend/src/types/namespace.ts`）が要求するフィールド:
```typescript
interface Team {
  departmentUnitId: string;
  unitName: string;
  departmentName: string;     // 親の organization_group / department 名
  ownerName: string;          // 代表者ユーザ名
  ownerUserId: string;
  nsPrefix?: string;
  nsUri?: string;
  nsDisplayName?: string;
  members: TeamMember[];      // メンバー一覧（別途JOIN or 別APIで取得可）
}
```

- `departmentName` は department_unit の `department_cd` を使って `organization_group` テーブルから `organization_group_name` をJOINして取得
- `ownerName` は `organization_user` テーブルから取得
- `members` は `organization_user` の `department_unit_id` で紐づくユーザーを返す

### 認証情報の取得
既存パターンに倣い `(req as any).organizationId` と `(req as any).userId` を使用。

---

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `department_unit` に `chief_user_id` カラムが存在しない | 中 | 中 | Phase 1で確認し、マイグレーション追加で対応 |
| `my-teams` のレスポンス型がフロントと不一致 | 中 | 低 | フロントの型定義を参照して確認 |
| `my-teams` でJOINが複雑になる | 低 | 中 | 複数クエリに分割して対応 |

---

## 8. テスト計画

### 手動テスト
- [ ] `GET /api/v1/department-units/my-teams` でログインユーザーが代表者のチームが返ること
- [ ] `PUT /api/v1/department-units/:id` でチーム名が更新されること
- [ ] `PUT /api/v1/department-units/:id/owner` で代表者が更新されること
- [ ] チーム管理タブUIが実際のDBデータで動作すること（ダミーデータからの切り替え確認）

---

## 9. 承認記録

- **計画書提示日時**: 2026-07-16 09:20
- **承認日時**: -
- **承認者コメント**: -

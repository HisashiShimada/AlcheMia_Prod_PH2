# 組織グループ管理API仕様書

## メタデータ
- **作成日**: 2026-08-14
- **バージョン**: 1.0.0
- **最終更新**: 2026-08-14
- **対象ルートバージョン**: `organizationGroupRoutes.ts` v2.0.0 / `organizationGroupController.ts` v2.0.0
- **カテゴリ**: 組織グループ管理

---

## 1. 概要

組織グループ管理APIは、組織内の階層グループ（部署・チーム等）の管理機能を提供します。

> **背景**: 旧 `department` テーブルを廃止し `organization_group` テーブルに移行した経緯があります（2026-07-10 対応）。

### 主要機能
- **グループ管理**: 組織グループの作成・更新・論理削除
- **メンバー管理**: グループへのユーザー一括割り当て・代表者変更
- **閲覧権限制御**: `visibleOnly` パラメータによるロールベースのグループ絞り込み

### データモデルの概念

```
組織（Organization）
  └─ 組織グループ（OrganizationGroup）
       └─ organization_group_cd: "GROUP_001"
       └─ organization_group_name: "材料開発チーム"
       └─ parent_group_cd: null（ルートグループ）または親グループCD
       └─ layer: 1（parent_group_cd から自動算出）
       └─ chief_user_id: "user001"（代表者、作成時はログインユーザーが自動セット）
       └─ is_active: true

          └─ メンバー（OrganizationGroupMember）
               └─ user_id: "user001", "user002", ...
```

### 使用箇所

- **部署管理タブ**: グループの作成・編集・削除・メンバー管理
- **プロジェクト管理**: プロジェクトのグループスコープ絞り込み
- **名前空間管理**: `scope_key` による名前空間のグループスコープ絞り込み

---

## 2. 共通仕様

### 2.1. ベースURL

```
/api/v1/organization-groups
```

### 2.2. 認証・テナント分離

すべてのエンドポイントに `authMiddleware` + `tenantIsolation` が適用されます。

```
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

- `organizationId` / `userId` はセッションから自動取得
- クロステナントアクセスは `tenantIsolation` ミドルウェアで禁止

### 2.3. 権限

- **すべてのロールがアクセス可能**（テナント分離で保護）

### 2.4. 多言語対応

- `Accept-Language` ヘッダーで言語を指定（`ja` / `en`、デフォルト: `ja`）
- グループ名等の表示に影響する場合あり

### 2.5. 共通レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... }
}
```

**エラーレスポンス（バリデーション 400）**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "organization_group_cd は必須です",
    "details": []
  }
}
```

---

## 3. API一覧

| # | メソッド | エンドポイント | 概要 | 状態 |
|---|---------|--------------|------|------|
| 1 | GET | `/api/v1/organization-groups` | 組織グループ一覧取得 | ✅ 実装済み |
| 2 | POST | `/api/v1/organization-groups` | 組織グループ新規作成 | ✅ 実装済み |
| 3 | GET | `/api/v1/organization-groups/users` | 組織内ユーザー一覧取得 | ✅ 実装済み |
| 4 | GET | `/api/v1/organization-groups/:groupCd` | 組織グループ単件取得 | ✅ 実装済み |
| 5 | PUT | `/api/v1/organization-groups/:groupCd` | 組織グループ更新 | ✅ 実装済み |
| 6 | PATCH | `/api/v1/organization-groups/:groupCd/status` | アクティブ状態更新（論理削除/有効化） | ✅ 実装済み |
| 7 | GET | `/api/v1/organization-groups/:groupCd/members` | グループメンバー一覧取得 | ✅ 実装済み |
| 8 | PUT | `/api/v1/organization-groups/:groupCd/members` | グループメンバー一括更新 | ✅ 実装済み |
| 9 | PUT | `/api/v1/organization-groups/:groupCd/chief` | グループ代表者変更 | ✅ 実装済み |

**完了率**: 100% (9/9)

---

## 4. API詳細仕様

---

### 4.1. GET /api/v1/organization-groups — 組織グループ一覧取得

**説明**: 組織グループの一覧を取得する。`visibleOnly` / `search` クエリで絞り込み可能。

#### 動作モード

| `visibleOnly` | 動作 |
|--------------|------|
| `false`（省略時） | ログインユーザーが代表者（`chief_user_id`）のグループのみ返す |
| `true` | ログインユーザーが所属するグループCDを基に閲覧可能なグループ一覧を返す（非アクティブグループの権限ルールも反映） |

#### リクエスト

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `search` | string | × | グループCDまたはグループ名による部分一致検索（`visibleOnly=false` 時のみ有効） |
| `visibleOnly` | boolean | × | `true` の場合、閲覧権限に基づくグループ一覧を返す |

#### レスポンス

**`visibleOnly=false`（省略時）の成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "organization_group_cd": "GROUP_001",
      "organization_group_name": "材料開発チーム",
      "parent_group_cd": null,
      "layer": 1,
      "chief_user_id": "user001",
      "is_active": true
    }
  ]
}
```

**`visibleOnly=true` の成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "organization_group_cd": "GROUP_001",
        "organization_group_name": "材料開発チーム",
        "is_active": true
      }
    ]
  }
}
```

#### 実装ファイル
- **コントローラー**: `organizationGroupController.ts` (`getOrganizationGroups`)
- **サービス**: `organizationGroupService.ts` (`getOrganizationGroups` / `getVisibleOrganizationGroups`)

---

### 4.2. POST /api/v1/organization-groups — 組織グループ新規作成

**説明**: 新しい組織グループを作成する。`chief_user_id` はログインユーザーが自動セットされる。`layer` は `parent_group_cd` から自動算出されるため送信不要。

#### リクエスト

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "organization_group_cd": "GROUP_002",
  "organization_group_name": "解析チーム",
  "parent_group_cd": "GROUP_001"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `organization_group_cd` | string | ✅ | グループCD（ユニーク識別子） |
| `organization_group_name` | string | ✅ | グループ名 |
| `parent_group_cd` | string \| null | × | 親グループCD（省略時はルートグループ） |

#### レスポンス

**成功時（201 Created）**:
```json
{
  "success": true,
  "data": {
    "organization_group_cd": "GROUP_002",
    "organization_group_name": "解析チーム",
    "parent_group_cd": "GROUP_001",
    "layer": 2,
    "chief_user_id": "user001",
    "is_active": true
  }
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `organization_group_cd` または `organization_group_name` が未指定 |
| 401 | 認証エラー |
| 409 | 同一CDのグループが既に存在する |

#### 実装ファイル
- **コントローラー**: `organizationGroupController.ts` (`createOrganizationGroup`)
- **サービス**: `organizationGroupService.ts` (`createOrganizationGroup`)

---

### 4.3. GET /api/v1/organization-groups/users — 組織内ユーザー一覧取得

**説明**: 組織内のアクティブなユーザー一覧を取得する。グループメンバー追加ダイアログ（TeamAddDialog / TeamEditDialog）のプルダウン用。

> ⚠️ **ルーティング上の注意**: `/:groupCd` より前に定義されているため、`/users` が正しく解決される。

#### リクエスト

パラメータなし

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "user_id": "user001",
      "display_name": "山田 太郎",
      "email": "yamada@example.com",
      "role": "experiment_admin"
    }
  ]
}
```

#### 実装ファイル
- **コントローラー**: `organizationGroupController.ts` (`getOrgUsers`)
- **サービス**: `organizationGroupService.ts` (`getOrgUsersForGroups`)

---

### 4.4. GET /api/v1/organization-groups/:groupCd — 組織グループ単件取得

**説明**: 指定したグループCDの組織グループ情報を取得する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `groupCd` | string | ✅ | グループCD |

**ヘッダー**:
| ヘッダー | 説明 |
|--------|------|
| `Accept-Language` | 言語指定（`ja` / `en`、デフォルト: `ja`） |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "organization_group_cd": "GROUP_001",
    "organization_group_name": "材料開発チーム",
    "parent_group_cd": null,
    "layer": 1,
    "chief_user_id": "user001",
    "is_active": true
  }
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `groupCd` が未指定 |
| 401 | 認証エラー |
| 404 | 指定したグループが存在しない |

#### 実装ファイル
- **コントローラー**: `organizationGroupController.ts` (`getOrganizationGroupById`)
- **サービス**: `organizationGroupService.ts` (`getOrganizationGroupById`)

---

### 4.5. PUT /api/v1/organization-groups/:groupCd — 組織グループ更新

**説明**: 指定したグループの情報を更新する。`chief_user_id` はフロントエンドから送信しない（既存値を維持）。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `groupCd` | string | ✅ | 更新するグループCD |

**Content-Type**: `application/json`

**ボディ**（すべて省略可能）:
```json
{
  "organization_group_name": "解析・計測チーム",
  "parent_group_cd": null,
  "layer": "1"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `organization_group_name` | string | × | 新しいグループ名（空文字列不可） |
| `parent_group_cd` | string \| null | × | 新しい親グループCD |
| `layer` | string \| null | × | レイヤー（通常は `parent_group_cd` から自動算出） |

#### レスポンス

**成功時（200 OK）**: 更新後のグループオブジェクト（`GET /:groupCd` の成功レスポンスと同形式）

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `organization_group_name` を指定したが空文字列 |
| 401 | 認証エラー |
| 404 | 指定したグループが存在しない |

#### 実装ファイル
- **コントローラー**: `organizationGroupController.ts` (`updateOrganizationGroup`)
- **サービス**: `organizationGroupService.ts` (`updateOrganizationGroup`)

---

### 4.6. PATCH /api/v1/organization-groups/:groupCd/status — アクティブ状態更新

**説明**: 組織グループの有効/無効状態を切り替える。論理削除・有効化に共用。

#### 動作
| `isActive` | 処理 |
|-----------|------|
| `false`（無効化） | `is_active = false` に更新し、グループメンバーを**物理削除** |
| `true`（有効化） | `is_active = true` に更新。メンバーは空のまま（再追加が必要） |

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `groupCd` | string | ✅ | 対象グループCD |

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "isActive": false
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `isActive` | boolean | ✅ | `true`: 有効化、`false`: 無効化（論理削除） |

#### レスポンス

**成功時（200 OK）**: 更新後のグループオブジェクト

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `isActive` が未指定または boolean でない |
| 401 | 認証エラー |
| 404 | 指定したグループが存在しない |

#### 実装ファイル
- **コントローラー**: `organizationGroupController.ts` (`updateOrganizationGroupStatus`)
- **サービス**: `organizationGroupService.ts` (`updateOrganizationGroupActiveStatus`)

---

### 4.7. GET /api/v1/organization-groups/:groupCd/members — グループメンバー一覧取得

**説明**: 指定したグループのメンバー一覧を取得する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `groupCd` | string | ✅ | グループCD |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "user_id": "user001",
      "display_name": "山田 太郎",
      "email": "yamada@example.com",
      "role": "experiment_admin"
    },
    {
      "user_id": "user002",
      "display_name": "田中 花子",
      "email": "tanaka@example.com",
      "role": "experiment_worker"
    }
  ]
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `groupCd` が未指定 |
| 401 | 認証エラー |
| 404 | 指定したグループが存在しない |

#### 実装ファイル
- **コントローラー**: `organizationGroupController.ts` (`getOrganizationGroupMembers`)
- **サービス**: `organizationGroupService.ts` (`getOrganizationGroupMembers`)

---

### 4.8. PUT /api/v1/organization-groups/:groupCd/members — グループメンバー一括更新

**説明**: 指定したグループのメンバーを一括で設定する（差分更新ではなく全置換）。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `groupCd` | string | ✅ | グループCD |

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "userIds": ["user001", "user002", "user003"]
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userIds` | string[] | ✅ | 設定するユーザーIDの配列（空配列でメンバー全削除） |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `userIds` が配列でない |
| 401 | 認証エラー |
| 404 | 指定したグループが存在しない |

#### 実装ファイル
- **コントローラー**: `organizationGroupController.ts` (`setOrganizationGroupMembers`)
- **サービス**: `organizationGroupService.ts` (`setOrganizationGroupMembers`)

---

### 4.9. PUT /api/v1/organization-groups/:groupCd/chief — グループ代表者変更

**説明**: 指定したグループの代表者（`chief_user_id`）を変更する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `groupCd` | string | ✅ | グループCD |

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "chiefUserId": "user002"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `chiefUserId` | string | ✅ | 新しい代表者のユーザーID |

#### レスポンス

**成功時（200 OK）**: 更新後のグループオブジェクト

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `chiefUserId` が未指定 |
| 401 | 認証エラー |
| 404 | 指定したグループまたはユーザーが存在しない |

#### 実装ファイル
- **コントローラー**: `organizationGroupController.ts` (`updateOrganizationGroupChief`)
- **サービス**: `organizationGroupService.ts` (`updateOrganizationGroupChief`)

---

## 5. 実装ファイル一覧

| レイヤー | ファイルパス |
|---------|------------|
| ルート | `backend/src/routes/organizationGroupRoutes.ts` (v2.0.0) |
| コントローラー | `backend/src/controllers/organizationGroupController.ts` (v2.0.0) |
| サービス | `backend/src/services/organizationGroupService.ts` |
| リポジトリ | `backend/src/repositories/organizationGroupRepository.ts` |

---

## 6. 関連ドキュメント

- [api_list.md](./api_list.md)
- [department廃止_organization_group移行](../../20260710_1142_department廃止_organization_group移行/)
- [api_namespace.md](./api_namespace.md)（scopeKey によるグループスコープ絞り込み）

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-08-14 | 初版作成 | Cline |
| | | - 9エンドポイント全件を記載 | |
| | | - organizationGroupRoutes.ts v2.0.0 / organizationGroupController.ts v2.0.0 をベースに作成 | |
| | | - department廃止・organization_group移行（2026-07-10）の経緯を概要に記載 | |

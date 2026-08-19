# 部署ユニット管理API仕様書

## メタデータ
- **作成日**: 2026-08-14
- **バージョン**: 2.0.0
- **最終更新**: 2026-08-14
- **最終更新コミット**: `651973aae` (feature/phase2_mock)
- **対象ルートバージョン**: `departmentUnitRoutes.ts` v1.0.0 / `departmentUnitController.ts`
- **カテゴリ**: 部署ユニット管理

---

## ⚠️ 移行情報

> **重要**: 旧 `department` テーブルに基づく `/api/v1/systemManagement/department` 系エンドポイントは廃止されています。
> 2026-07-10 の `department廃止_organization_group移行` 対応により、部署管理機能は以下の2つの仕組みに分離されました。
>
> | 旧（廃止） | 新 |
> |-----------|-----|
> | `/api/v1/systemManagement/department` | 組織グループ管理: `/api/v1/organization-groups`（[api_organization_group.md](./api_organization_group.md) 参照） |
> | 部署ユニット（チーム）管理 | `/api/v1/department-units`（本ドキュメント） |

---

## 1. 概要

部署ユニット管理APIは、組織内の部署ユニット（チーム）の管理機能を提供します。

### 主要機能
- **部署ユニット一覧取得**: 組織に属する部署ユニット一覧を取得
- **部署ユニット新規作成**: 新しい部署ユニット（チーム）を作成
- **メンバー管理**: 部署ユニットへのメンバーの一覧取得・一括更新
- **ユーザー一覧取得**: メンバー選択用の組織ユーザー一覧取得

### 関連機能

- 組織階層グループ管理は [api_organization_group.md](./api_organization_group.md) を参照してください。

---

## 2. 共通仕様

### 2.1. ベースURL

```
/api/v1/department-units
```

### 2.2. 認証

すべてのエンドポイントに `authMiddleware` が適用されます。

```
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

- `organizationId` はセッションから自動取得

### 2.3. 権限

> ⚠️ **確認事項**: 各エンドポイントの詳細な権限要件（ロール制限・機能CD等）はコントローラー実装（`departmentUnitController.ts`）を参照してください。ルートファイルには `authMiddleware` のみ定義されており、追加の権限チェックミドルウェアは未確認です。

---

## 3. API一覧

| # | メソッド | エンドポイント | 概要 | 状態 |
|---|---------|--------------|------|------|
| 1 | GET | `/api/v1/department-units/users` | 組織のユーザー一覧取得（メンバー選択用） | ✅ 実装済み |
| 2 | GET | `/api/v1/department-units` | 部署ユニット一覧取得 | ✅ 実装済み |
| 3 | POST | `/api/v1/department-units` | 部署ユニット新規作成 | ✅ 実装済み |
| 4 | GET | `/api/v1/department-units/:id/members` | 指定ユニットのメンバー一覧取得 | ✅ 実装済み |
| 5 | PUT | `/api/v1/department-units/:id/members` | 指定ユニットのメンバー一括更新 | ✅ 実装済み |

**完了率**: 100% (5/5)

---

## 4. API詳細仕様

---

### 4.1. GET /api/v1/department-units/users — 組織のユーザー一覧取得

**説明**: メンバー選択用に組織内のユーザー一覧を取得する。

> ⚠️ **ルーティング上の注意**: `/:id/members` より前に定義されているため、`/users` が正しく解決される。

#### リクエスト

パラメータなし

#### レスポンス

> ⚠️ **確認事項**: レスポンスの詳細な構造はコントローラー実装（`departmentUnitController.getOrgUsers()`）を参照してください。

想定レスポンス形式（200 OK）:
```json
[
  {
    "user_id": "user001",
    "display_name": "山田 太郎",
    "email": "yamada@example.com"
  }
]
```

#### 実装ファイル
- **コントローラー**: `backend/src/controllers/departmentUnitController.ts` (`getOrgUsers`)

---

### 4.2. GET /api/v1/department-units — 部署ユニット一覧取得

**説明**: 組織に属する部署ユニット一覧を取得する。

#### リクエスト

パラメータなし

#### レスポンス

> ⚠️ **確認事項**: レスポンスの詳細な構造はコントローラー実装（`departmentUnitController.getDepartmentUnits()`）を参照してください。

想定レスポンス形式（200 OK）:
```json
[
  {
    "id": "unit-uuid-001",
    "name": "材料開発チーム",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-07-01T00:00:00.000Z"
  }
]
```

#### 実装ファイル
- **コントローラー**: `backend/src/controllers/departmentUnitController.ts` (`getDepartmentUnits`)

---

### 4.3. POST /api/v1/department-units — 部署ユニット新規作成

**説明**: 新しい部署ユニット（チーム）を作成する。

#### リクエスト

**Content-Type**: `application/json`

> ⚠️ **確認事項**: リクエストボディのフィールド定義はコントローラー実装（`departmentUnitController.createDepartmentUnit()`）を参照してください。バリデーション定義がルートファイルに記述されていないため、詳細は不明です。

想定リクエストボディ:
```json
{
  "name": "解析チーム"
}
```

#### レスポンス

> ⚠️ **確認事項**: レスポンスの詳細な構造はコントローラー実装を参照してください。

**成功時**: 201 Created（想定）

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | バリデーションエラー |
| 401 | 認証エラー |

#### 実装ファイル
- **コントローラー**: `backend/src/controllers/departmentUnitController.ts` (`createDepartmentUnit`)

---

### 4.4. GET /api/v1/department-units/:id/members — メンバー一覧取得

**説明**: 指定した部署ユニットのメンバー一覧を取得する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `id` | string | ✅ | 部署ユニットID |

#### レスポンス

> ⚠️ **確認事項**: レスポンスの詳細な構造はコントローラー実装（`departmentUnitController.getMembers()`）を参照してください。

想定レスポンス形式（200 OK）:
```json
[
  {
    "user_id": "user001",
    "display_name": "山田 太郎",
    "email": "yamada@example.com"
  }
]
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 401 | 認証エラー |
| 404 | 指定したユニットが存在しない |

#### 実装ファイル
- **コントローラー**: `backend/src/controllers/departmentUnitController.ts` (`getMembers`)

---

### 4.5. PUT /api/v1/department-units/:id/members — メンバー一括更新

**説明**: 指定した部署ユニットのメンバーを一括で設定する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `id` | string | ✅ | 部署ユニットID |

**Content-Type**: `application/json`

> ⚠️ **確認事項**: リクエストボディのフィールド定義はコントローラー実装（`departmentUnitController.updateMembers()`）を参照してください。

想定リクエストボディ:
```json
{
  "userIds": ["user001", "user002"]
}
```

#### レスポンス

> ⚠️ **確認事項**: レスポンスの詳細な構造はコントローラー実装を参照してください。

**成功時**: 200 OK（想定）

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | バリデーションエラー |
| 401 | 認証エラー |
| 404 | 指定したユニットが存在しない |

#### 実装ファイル
- **コントローラー**: `backend/src/controllers/departmentUnitController.ts` (`updateMembers`)

---

## 5. 実装ファイル一覧

| レイヤー | ファイルパス |
|---------|------------|
| ルート | `backend/src/routes/departmentUnitRoutes.ts` (v1.0.0) |
| コントローラー | `backend/src/controllers/departmentUnitController.ts` |

---

## 6. 関連ドキュメント

- [api_list.md](./api_list.md)
- [api_organization_group.md](./api_organization_group.md)（組織グループ管理 - 旧 department 機能の後継）
- [department廃止_organization_group移行](../../20260710_1142_department廃止_organization_group移行/)

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2026-08-14 | 全面書き直し（旧 department API → departmentUnit API へ移行） | Cline |
| | | - ベースURLを `/api/v1/systemManagement/department` → `/api/v1/department-units` に変更 | |
| | | - 旧7エンドポイントを廃止、新5エンドポイントに全面差し替え | |
| | | - `departmentUnitRoutes.ts` v1.0.0 をベースに作成 | |
| | | - 旧 department テーブル廃止・organization_group 移行の経緯を概要に記載 | |
| | | - 最終更新コミット: 651973aae (feature/phase2_mock) | |
| 1.0.0 | 2026-02-13 | 初版作成（旧 department API） | Development Team |

# 名前空間管理API仕様書

## メタデータ
- **作成日**: 2026-08-14
- **バージョン**: 1.0.0
- **最終更新**: 2026-08-14
- **対象ルートバージョン**: `namespaceRoutes.ts` v3.0.0 / `namespaceController.ts` v4.0.0
- **カテゴリ**: 名前空間・用語管理

---

## 1. 概要

名前空間管理APIは、MAIML XMLで使用する名前空間（prefix/URI）と用語（term）を管理します。

### 主要機能
- **名前空間（Prefix）管理**: MAIML XML の `xmlns:xxx` 宣言に使用する prefix/URI ペアの登録・取得・削除
- **用語（Term）管理**: 名前空間に紐づく用語の登録・更新・削除・アクティブ切替
- **宣言取得**: MAIML XML ビュー表示・保存時の `xmlns` 自動注入に使用する宣言一覧の取得

### データモデルの概念

```
名前空間（Namespace）
  └─ prefix: "maiml"
  └─ uri: "http://www.maiml.jp/maiml/1.0/"
  └─ scopeKey: ユーザーIDまたはグループCD（スコープ絞り込み用）
  └─ globalFlg: true の場合は全プロジェクトで利用可能

     └─ 用語（Term）
          └─ localName: "sampleRate"
          └─ displayName: "サンプリングレート"
          └─ typeHint: "xsd:float"
          └─ unitHint: "Hz"
          └─ isActive: true
```

### 使用箇所

- **部署管理タブ / 名前空間管理画面**: 名前空間・用語の登録・編集・削除
- **MAIML XML ビュー**: 保存前の `xmlns` 自動注入（`/declarations`, `/project-declarations`）
- **実験記録画面**: プロジェクトスコープの名前空間取得

---

## 2. 共通仕様

### 2.1. ベースURL

```
/api/v1/namespaces
```

### 2.2. 認証・テナント分離

すべてのエンドポイントに `authMiddleware` + `tenantIsolation` が適用されます。

```
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

- `organizationId` はセッションから自動取得
- クロステナントアクセスは `tenantIsolation` ミドルウェアで禁止

### 2.3. 権限

- **すべてのロールがアクセス可能**（テナント分離で保護）

### 2.4. 共通レスポンス形式

**エラーレスポンス（404）**:
```json
{ "error": "Namespace with prefix \"maiml\" not found" }
```

**エラーレスポンス（バリデーション 400）**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "prefix は必須です",
    "details": []
  }
}
```

---

## 3. API一覧

| # | メソッド | エンドポイント | 概要 | 状態 |
|---|---------|--------------|------|------|
| 1 | GET | `/api/v1/namespaces` | 名前空間一覧取得 | ✅ 実装済み |
| 2 | POST | `/api/v1/namespaces` | 名前空間新規登録 | ✅ 実装済み |
| 3 | DELETE | `/api/v1/namespaces/:prefix` | 名前空間削除 | ✅ 実装済み |
| 4 | GET | `/api/v1/namespaces/declarations` | 名前空間宣言取得（xmlns注入用） | ✅ 実装済み |
| 5 | GET | `/api/v1/namespaces/project-declarations` | プロジェクトスコープ宣言取得 | ✅ 実装済み |
| 6 | GET | `/api/v1/namespaces/terms` | 用語一覧取得 | ✅ 実装済み |
| 7 | POST | `/api/v1/namespaces/terms` | 用語新規登録 | ✅ 実装済み |
| 8 | PUT | `/api/v1/namespaces/terms/:prefix/:localName` | 用語更新 | ✅ 実装済み |
| 9 | DELETE | `/api/v1/namespaces/terms/:prefix/:localName` | 用語削除 | ✅ 実装済み |
| 10 | PATCH | `/api/v1/namespaces/terms/:prefix/:localName/active` | 用語アクティブ切替 | ✅ 実装済み |

**完了率**: 100% (10/10)

---

## 4. API詳細仕様

---

### 4.1. GET /api/v1/namespaces — 名前空間一覧取得

**説明**: 組織の名前空間一覧を取得する。`scopeKey` クエリパラメータでフィルタリング可能。

#### リクエスト

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `scopeKey` | string | × | フィルタするスコープキー（= userId）。省略時は全件取得 |

#### レスポンス

**`scopeKey` なしの場合（200 OK）**:
```json
{
  "namespaces": [
    {
      "prefix": "maiml",
      "uri": "http://www.maiml.jp/maiml/1.0/"
    },
    {
      "prefix": "xsd",
      "uri": "http://www.w3.org/2001/XMLSchema"
    }
  ]
}
```

**`scopeKey` ありの場合（200 OK）**:
```json
{
  "namespaces": [
    {
      "namespace_id": "550e8400-e29b-41d4-a716-446655440000",
      "uri": "http://www.maiml.jp/maiml/1.0/",
      "scope_key": "user001",
      "global_flg": false,
      "user_name": "山田 太郎"
    }
  ]
}
```

#### 実装ファイル
- **ルート**: `backend/src/routes/namespaceRoutes.ts`
- **コントローラー**: `backend/src/controllers/namespaceController.ts` (`getNamespaces`)
- **サービス**: `backend/src/services/namespaceService.ts` (`getNamespaces` / `getNamespacesByScopeKey`)

---

### 4.2. POST /api/v1/namespaces — 名前空間新規登録

**説明**: 新しい名前空間（prefix/URI ペア）を登録する。

#### リクエスト

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "prefix": "ex",
  "uri": "http://example.org/ns/",
  "scopeKey": "user001",
  "description": "実験用名前空間"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `prefix` | string | ✅ | XML接頭辞（例: `maiml`, `xsd`） |
| `uri` | string | ✅ | 名前空間URI |
| `scopeKey` | string | × | スコープキー（= userId または organization_group_cd） |
| `description` | string | × | 説明文 |

#### レスポンス

**成功時（201 Created）**:
```json
{
  "namespaceId": "550e8400-e29b-41d4-a716-446655440000",
  "prefix": "ex",
  "uri": "http://example.org/ns/"
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `prefix` または `uri` が未指定 |
| 401 | 認証エラー |
| 500 | システムエラー |

#### 実装ファイル
- **コントローラー**: `namespaceController.ts` (`createNamespace`)
- **サービス**: `namespaceService.ts` (`createNamespace`)
- **バリデーション**: `namespaceValidation.ts` (`validateCreateNamespace`)

---

### 4.3. DELETE /api/v1/namespaces/:prefix — 名前空間削除

**説明**: 指定した prefix の名前空間を削除する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `prefix` | string | ✅ | 削除する名前空間の接頭辞 |

#### レスポンス

**成功時（204 No Content）**: ボディなし

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 401 | 認証エラー |
| 404 | 指定した prefix の名前空間が存在しない |

#### 実装ファイル
- **コントローラー**: `namespaceController.ts` (`deleteNamespace`)
- **サービス**: `namespaceService.ts` (`deleteNamespace`)

---

### 4.4. GET /api/v1/namespaces/declarations — 名前空間宣言取得（xmlns注入用）

**説明**: MAIML XML ビュー表示・保存前の `xmlns` 注入に使用する宣言URIを取得する。組織の名前空間宣言を1件返す。

#### リクエスト

パラメータなし

#### レスポンス

**成功時（200 OK）**:
```json
{
  "uri": "http://www.maiml.jp/maiml/1.0/"
}
```

名前空間が存在しない場合:
```json
{
  "uri": null
}
```

#### 実装ファイル
- **コントローラー**: `namespaceController.ts` (`getDeclarations`)
- **サービス**: `namespaceService.ts` (`getDeclarations`)

---

### 4.5. GET /api/v1/namespaces/project-declarations — プロジェクトスコープ宣言取得

**説明**: 指定プロジェクトのスコープに応じた名前空間宣言一覧を取得する。MAIML XML 保存時の `xmlns` 自動注入に使用。

#### 取得ロジック
1. `project` テーブルから `organization_group_cd` を取得
2. `global_flg = TRUE` の名前空間は常に含める
3. `organization_group_cd` が指定されている場合は `scope_key` が一致する名前空間も含める
4. `organization_group_cd` が NULL の場合は全件返す

#### リクエスト

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectId` | string | ✅ | プロジェクトID（UUID） |

#### レスポンス

**成功時（200 OK）**:
```json
[
  {
    "prefix": "maiml",
    "uri": "http://www.maiml.jp/maiml/1.0/",
    "globalFlg": true
  },
  {
    "prefix": "ex",
    "uri": "http://example.org/ns/",
    "globalFlg": false
  }
]
```

**エラー時**:
| ステータス | エラーコード | 説明 |
|-----------|-------------|------|
| 400 | `VALIDATION_ERROR` | `projectId` が未指定 |
| 401 | `AUTH_TOKEN_INVALID` | 認証エラー |
| 404 | `E6001` | プロジェクトが存在しない |

#### 実装ファイル
- **コントローラー**: `namespaceController.ts` (`getDeclarationsByProject`)
- **サービス**: `namespaceService.ts` (`getDeclarationsByProject`)
- **バリデーション**: `namespaceValidation.ts` (`validateGetDeclarationsByProject`)

---

### 4.6. GET /api/v1/namespaces/terms — 用語一覧取得

**説明**: 組織の全用語を取得する。

#### リクエスト

パラメータなし（組織IDはセッションから自動取得）

#### レスポンス

**成功時（200 OK）**:
```json
[
  {
    "organization_id": "org_maiml_lab_001",
    "prefix": "maiml",
    "local_name": "sampleRate",
    "display_name": "サンプリングレート",
    "description": "測定のサンプリングレート",
    "type_hint": "xsd:float",
    "unit_hint": "Hz",
    "is_active": true,
    "created_at": "2026-08-14T10:00:00.000Z",
    "updated_at": "2026-08-14T10:00:00.000Z"
  }
]
```

**フィールド定義**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `organization_id` | string | 組織ID |
| `prefix` | string | 名前空間の接頭辞 |
| `local_name` | string | ローカル名 |
| `display_name` | string \| null | 表示名 |
| `description` | string \| null | 説明文 |
| `type_hint` | string \| null | 型ヒント（例: `xsd:float`） |
| `unit_hint` | string \| null | 単位ヒント（例: `Hz`） |
| `is_active` | boolean | アクティブ状態 |
| `created_at` | string | 作成日時（ISO 8601） |
| `updated_at` | string | 更新日時（ISO 8601） |

#### 実装ファイル
- **コントローラー**: `namespaceController.ts` (`getTerms`)
- **サービス**: `namespaceService.ts` (`getTerms`)

---

### 4.7. POST /api/v1/namespaces/terms — 用語新規登録

**説明**: 指定した prefix の名前空間に用語を登録する。prefix に対応する名前空間が存在しない場合は 404 を返す。

#### リクエスト

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "prefix": "maiml",
  "localName": "sampleRate",
  "displayName": "サンプリングレート",
  "description": "測定のサンプリングレート",
  "typeHint": "xsd:float",
  "unitHint": "Hz"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `prefix` | string | ✅ | 名前空間の接頭辞 |
| `localName` | string | ✅ | ローカル名（XML要素名） |
| `displayName` | string | × | 表示名 |
| `description` | string | × | 説明文 |
| `typeHint` | string | × | 型ヒント（例: `xsd:float`, `xsd:string`） |
| `unitHint` | string | × | 単位ヒント（例: `Hz`, `°C`） |

#### レスポンス

**成功時（201 Created）**:
```json
{
  "organization_id": "org_maiml_lab_001",
  "prefix": "maiml",
  "local_name": "sampleRate",
  "display_name": "サンプリングレート",
  "description": "測定のサンプリングレート",
  "type_hint": "xsd:float",
  "unit_hint": "Hz",
  "is_active": true,
  "created_at": "2026-08-14T10:00:00.000Z",
  "updated_at": "2026-08-14T10:00:00.000Z"
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `prefix` または `localName` が未指定 |
| 401 | 認証エラー |
| 404 | 指定した prefix の名前空間が存在しない |

#### 実装ファイル
- **コントローラー**: `namespaceController.ts` (`createTerm`)
- **サービス**: `namespaceService.ts` (`createTerm`)
- **バリデーション**: `namespaceValidation.ts` (`validateCreateTerm`)

---

### 4.8. PUT /api/v1/namespaces/terms/:prefix/:localName — 用語更新

**説明**: 指定した用語を更新する。`prefix` と `localName` の複合キーで対象を特定する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `prefix` | string | ✅ | 名前空間の接頭辞 |
| `localName` | string | ✅ | ローカル名 |

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "displayName": "サンプリングレート（更新）",
  "description": "更新後の説明",
  "typeHint": "xsd:integer",
  "unitHint": "kHz"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `displayName` | string | × | 表示名 |
| `description` | string | × | 説明文 |
| `typeHint` | string | × | 型ヒント |
| `unitHint` | string | × | 単位ヒント |

#### レスポンス

**成功時（200 OK）**: 更新後の用語オブジェクト（`POST /terms` の成功レスポンスと同形式）

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | パスパラメータが未指定 |
| 401 | 認証エラー |
| 404 | 指定した用語が存在しない |

#### 実装ファイル
- **コントローラー**: `namespaceController.ts` (`updateTerm`)
- **サービス**: `namespaceService.ts` (`updateTerm`)
- **バリデーション**: `namespaceValidation.ts` (`validateUpdateTerm`)

---

### 4.9. DELETE /api/v1/namespaces/terms/:prefix/:localName — 用語削除

**説明**: 指定した用語を削除する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `prefix` | string | ✅ | 名前空間の接頭辞 |
| `localName` | string | ✅ | ローカル名 |

#### レスポンス

**成功時（204 No Content）**: ボディなし

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | パスパラメータが未指定 |
| 401 | 認証エラー |
| 404 | 指定した用語が存在しない |

#### 実装ファイル
- **コントローラー**: `namespaceController.ts` (`deleteTerm`)
- **サービス**: `namespaceService.ts` (`deleteTerm`)
- **バリデーション**: `namespaceValidation.ts` (`validateDeleteTerm`)

---

### 4.10. PATCH /api/v1/namespaces/terms/:prefix/:localName/active — 用語アクティブ切替

**説明**: 指定した用語のアクティブ/非アクティブ状態を切り替える。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `prefix` | string | ✅ | 名前空間の接頭辞 |
| `localName` | string | ✅ | ローカル名 |

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
| `isActive` | boolean | ✅ | アクティブにする場合は `true`、非アクティブにする場合は `false` |

#### レスポンス

**成功時（200 OK）**: 更新後の用語オブジェクト（`POST /terms` の成功レスポンスと同形式）

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `isActive` が未指定または boolean でない |
| 401 | 認証エラー |
| 404 | 指定した用語が存在しない |

#### 実装ファイル
- **コントローラー**: `namespaceController.ts` (`toggleTermActive`)
- **サービス**: `namespaceService.ts` (`toggleTermActive`)
- **バリデーション**: `namespaceValidation.ts` (`validateToggleTermActive`)

---

## 5. 実装ファイル一覧

| レイヤー | ファイルパス |
|---------|------------|
| ルート | `backend/src/routes/namespaceRoutes.ts` (v3.0.0) |
| バリデーション | `backend/src/middleware/namespaceValidation.ts` |
| コントローラー | `backend/src/controllers/namespaceController.ts` (v4.0.0) |
| サービス | `backend/src/services/namespaceService.ts` |
| リポジトリ | `backend/src/repositories/namespaceTermRepository.ts` |

---

## 6. 関連ドキュメント

- [api_list.md](./api_list.md)
- [部署管理タブ名前管理追加](../../20260626_0835_部署管理タブ名前管理追加/)
- [名前空間ツリーコンテキストメニュー追加](../../20260623_0849_名前空間ツリーコンテキストメニュー追加/)
- [名前空間URI自動採番](../../20260629_1537_名前空間URI自動採番/)

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-08-14 | 初版作成 | Cline |
| | | - 10エンドポイント全件を記載 | |
| | | - namespaceRoutes.ts v3.0.0 / namespaceController.ts v4.0.0 をベースに作成 | |

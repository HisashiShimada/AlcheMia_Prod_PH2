# プロジェクト管理画面 バックエンド機能要件書

---
title: プロジェクト管理画面 バックエンド機能要件書
category: API仕様
version: 0.1.0
last_updated: 2026-01-09
author: Development Team
tags: [project-management, api, backend]
---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 0.2.0 | 2026-01-09 | プロジェクト一覧取得機能追加 | Development Team |
| 0.1.0 | 2026-01-09 | 初版作成（テンプレート） | Development Team |

---

## 1. 概要

### 1.1 システム概要

プロジェクト管理画面のバックエンドAPIは、実験プロジェクトのライフサイクル全体を管理する機能を提供します。マルチテナント環境において、組織ごとに分離されたプロジェクトデータの安全な管理を実現します。

### 1.2 対象ユーザー

| ロール | 説明 | 権限レベル | 主な操作 |
|--------|------|-----------|----------|
| System Admin | システム管理者 | Level 3 | 全組織のプロジェクト閲覧・管理 |
| Manager | 実験管理者 | Level 2 | 所属組織のプロジェクト作成・編集・削除 |
| Worker | 実験作業者 | Level 1 | 割り当てられたプロジェクトの閲覧のみ |

### 1.3 主要機能一覧

以下の機能を段階的に追加していきます：

- [x] プロジェクト一覧取得
- [ ] プロジェクト詳細取得
- [ ] プロジェクト作成
- [ ] プロジェクト更新
- [ ] プロジェクト削除
- [ ] プロジェクト検索・フィルタリング
- [ ] プロジェクトステータス管理
- [ ] その他（ユーザーから提供される機能を追記）

---

## 2. 機能詳細

### 2.1 プロジェクト一覧取得

#### 概要
プロジェクト管理画面を表示した際に、ログインユーザーの所属組織に紐づくプロジェクト一覧を取得します。プロジェクト完了ステータス（project_status = 4）のプロジェクトも取得しますが、初期表示時は非表示とします。

#### エンドポイント
- **URL**: `GET /api/v1/projects`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上（Worker: 割り当てられたプロジェクトのみ）

#### リクエスト

##### ヘッダー
| ヘッダー名 | 型 | 必須 | 説明 | 例 |
|-----------|---|-----|------|---|
| Authorization | string | ○ | JWTトークン | Bearer maiml_session-abc123_1234567890 |
| X-Organization-Id | string | ○ | 組織ID | a0718dc5-21f3-44e6-87e9-cc2ae83f3385 |

##### パラメータ（クエリ）
| パラメータ名 | 型 | 必須 | 説明 | デフォルト値 | 例 |
|------------|---|-----|------|------------|---|
| page | number | × | ページ番号 | 1 | 1 |
| limit | number | × | 1ページあたりの件数 | 20 | 20 |
| include_completed | boolean | × | 完了プロジェクトを含めるか | false | false |
| sort_by | string | × | ソート項目 | create_at | create_at, project_name |
| order | string | × | ソート順 | desc | desc, asc |

#### レスポンス

##### 成功時（200 OK）
```json
{
  "success": true,
  "data": [
    {
      "organizationId": "a0718dc5-21f3-44e6-87e9-cc2ae83f3385",
      "projectId": "b1234567-89ab-cdef-0123-456789abcdef",
      "projectName": "サンプルプロジェクト",
      "description": "これはサンプルプロジェクトです",
      "departmentId": "c2345678-9abc-def0-1234-56789abcdef0",
      "ownerUserId": "d3456789-abcd-ef01-2345-6789abcdef01",
      "projectStatus": 2,
      "projectStatusName": "タスク実行中",
      "projectMaimlFlg": true,
      "checkoutStatus": 0,
      "checkoutStatusName": "チェックイン中",
      "createAt": "2026-01-05T10:30:00.000Z"
    },
    {
      "organizationId": "a0718dc5-21f3-44e6-87e9-cc2ae83f3385",
      "projectId": "e4567890-bcde-f012-3456-789abcdef012",
      "projectName": "実験プロジェクトA",
      "description": "材料分析プロジェクト",
      "departmentId": null,
      "ownerUserId": "d3456789-abcd-ef01-2345-6789abcdef01",
      "projectStatus": 1,
      "projectStatusName": "タスク実行待ち",
      "projectMaimlFlg": false,
      "checkoutStatus": 0,
      "checkoutStatusName": "チェックイン中",
      "createAt": "2026-01-03T14:20:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-01-09T11:39:00Z",
    "requestId": "req_abc123"
  }
}
```

##### エラー時
| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー（不正なクエリパラメータ） |
| 401 | AUTH_TOKEN_EXPIRED | 認証エラー（トークン期限切れ） |
| 401 | AUTH_TOKEN_INVALID | 認証エラー（トークン不正） |
| 403 | PERMISSION_INSUFFICIENT | 権限不足 |
| 500 | SYSTEM_DATABASE_ERROR | データベースエラー |

#### ビジネスロジック
1. **認証チェック**: JWTトークンとセッションの検証
2. **組織ID取得**: セッション情報から組織IDを取得（X-Organization-Idヘッダーと照合）
3. **権限チェック**: ユーザーのロールに応じたアクセス制御
   - System Admin: 全組織のプロジェクト取得可能
   - Manager: 自組織のプロジェクトのみ取得可能
   - Worker: 割り当てられたプロジェクトのみ取得可能
4. **データ取得**: projectテーブルから該当データを取得
   - organization_idでフィルタリング（必須）
   - include_completed=falseの場合、project_status != 4でフィルタリング
   - create_atの降順（新しい順）でソート
   - ページネーション適用
5. **コード値変換**: project_statusとcheckout_statusの名称をcode_masterから取得
6. **レスポンス生成**: キャメルケースに変換してJSON形式で返却

#### バリデーション
- [x] Authorization ヘッダーの存在チェック
- [x] X-Organization-Id ヘッダーの存在チェック
- [x] X-Organization-Id が UUID 形式であることをチェック
- [x] page が正の整数であることをチェック
- [x] limit が 1〜100 の範囲内であることをチェック
- [x] include_completed が boolean であることをチェック
- [x] sort_by が許可された値（create_at, project_name）であることをチェック
- [x] order が許可された値（desc, asc）であることをチェック

#### セキュリティチェックリスト
- [x] JWT認証の実施（authミドルウェア）
- [x] organization_idフィルタの適用（必須）
- [x] テナント分離（tenantIsolationミドルウェア）
- [x] 権限チェック（permissionCheckミドルウェア）
- [x] Parameterized Queryの使用
- [x] 入力値のサニタイゼーション
- [x] クロステナントアクセスの防止

#### データベース操作

##### SQL（基本クエリ）
```sql
-- プロジェクト一覧取得（完了除外版）
SELECT 
  p.organization_id,
  p.project_id,
  p.project_name,
  p.description,
  p.department_id,
  p.owner_user_id,
  p.project_status,
  ps.code_name AS project_status_name,
  p.project_maiml_flg,
  p.checkout_status,
  cs.code_name AS checkout_status_name,
  p.create_at
FROM 
  project p
LEFT JOIN 
  code_master ps ON ps.organization_id = p.organization_id 
    AND ps.code_division = 'project_status' 
    AND ps.code_value = p.project_status::VARCHAR
LEFT JOIN 
  code_master cs ON cs.organization_id = p.organization_id 
    AND cs.code_division = 'checkout_status' 
    AND cs.code_value = p.checkout_status::VARCHAR
WHERE 
  p.organization_id = $1
  AND p.project_status != 4  -- プロジェクト完了を除外（include_completed=falseの場合）
ORDER BY 
  p.create_at DESC
LIMIT $2 OFFSET $3;
```

##### SQL（件数取得）
```sql
-- 総件数取得
SELECT COUNT(*) AS total_count
FROM project
WHERE organization_id = $1
  AND project_status != 4;  -- プロジェクト完了を除外（include_completed=falseの場合）
```

##### TypeScript実装例（Kysely使用）
```typescript
import { db } from '../database/db';

export class ProjectRepository {
  async findByOrganizationId(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      includeCompleted: boolean;
      sortBy: string;
      order: 'desc' | 'asc';
    }
  ) {
    const { page, limit, includeCompleted, sortBy, order } = options;
    const offset = (page - 1) * limit;

    let query = db
      .selectFrom('project as p')
      .leftJoin('code_master as ps', (join) =>
        join
          .onRef('ps.organization_id', '=', 'p.organization_id')
          .on('ps.code_division', '=', 'project_status')
          .onRef('ps.code_value', '=', db.raw('p.project_status::VARCHAR'))
      )
      .leftJoin('code_master as cs', (join) =>
        join
          .onRef('cs.organization_id', '=', 'p.organization_id')
          .on('cs.code_division', '=', 'checkout_status')
          .onRef('cs.code_value', '=', db.raw('p.checkout_status::VARCHAR'))
      )
      .select([
        'p.organization_id',
        'p.project_id',
        'p.project_name',
        'p.description',
        'p.department_id',
        'p.owner_user_id',
        'p.project_status',
        'ps.code_name as project_status_name',
        'p.project_maiml_flg',
        'p.checkout_status',
        'cs.code_name as checkout_status_name',
        'p.create_at',
      ])
      .where('p.organization_id', '=', organizationId);

    // プロジェクト完了の除外（デフォルト）
    if (!includeCompleted) {
      query = query.where('p.project_status', '!=', 4);
    }

    // ソート
    const orderBy = sortBy === 'project_name' ? 'p.project_name' : 'p.create_at';
    query = query.orderBy(orderBy, order);

    // ページネーション
    const items = await query.limit(limit).offset(offset).execute();

    // 総件数取得
    let countQuery = db
      .selectFrom('project')
      .select(db.fn.count('project_id').as('total_count'))
      .where('organization_id', '=', organizationId);

    if (!includeCompleted) {
      countQuery = countQuery.where('project_status', '!=', 4);
    }

    const countResult = await countQuery.executeTakeFirst();
    const totalItems = Number(countResult?.total_count || 0);

    return {
      items,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      page,
      limit,
    };
  }
}
```

#### テストケース
- [x] 正常系：認証済みManagerによるプロジェクト一覧取得
- [x] 正常系：System Adminによる全組織のプロジェクト取得
- [x] 正常系：完了プロジェクトが除外されていることを確認
- [x] 正常系：include_completed=trueで完了プロジェクトも取得
- [x] 正常系：create_atの降順でソートされていることを確認
- [x] 正常系：ページネーションが正しく動作することを確認
- [x] 異常系：未認証ユーザーによるアクセス（401エラー）
- [x] 異常系：権限不足ユーザーによるアクセス（403エラー）
- [x] 異常系：他組織のデータへのアクセス（403エラー）
- [x] 異常系：不正なorganization_id（400エラー）
- [x] 異常系：不正なページ番号（400エラー）
- [x] 異常系：limitが範囲外（400エラー）

#### レスポンスフィールド説明

| フィールド名 | 型 | NULL許可 | 説明 |
|------------|---|---------|------|
| organizationId | string | × | 組織ID（UUID） |
| projectId | string | × | プロジェクトID（UUID） |
| projectName | string | × | プロジェクト名 |
| description | string | ○ | プロジェクト説明 |
| departmentId | string | ○ | 部門ID（UUID） |
| ownerUserId | string | × | 所有者ユーザーID（UUID） |
| projectStatus | number | × | プロジェクトステータス（0〜5） |
| projectStatusName | string | ○ | プロジェクトステータス名称 |
| projectMaimlFlg | boolean | × | プロジェクトMaiml有無 |
| checkoutStatus | number | × | チェックアウトステータス（0, 1） |
| checkoutStatusName | string | ○ | チェックアウトステータス名称 |
| createAt | string | × | 作成日時（ISO 8601形式） |

#### プロジェクトステータス一覧

| コード値 | 名称 | 説明 |
|---------|------|------|
| 0 | プロジェクト計画中 | プロジェクトの計画段階 |
| 1 | タスク実行待ち | タスクの実行を待機中 |
| 2 | タスク実行中 | タスクが実行中 |
| 3 | タスク結果レビュー待ち | タスク結果のレビュー待ち |
| 4 | プロジェクト完了 | プロジェクトが完了（初期表示では非表示） |
| 5 | タスク異常終了 | タスクが異常終了 |

#### チェックアウトステータス一覧

| コード値 | 名称 | 説明 |
|---------|------|------|
| 0 | チェックイン中 | プロジェクトがチェックイン中 |
| 1 | チェックアウト済 | プロジェクトがチェックアウト済 |

---

### 📝 機能追加方法

各機能仕様は以下のテンプレートに従って追記していきます：

```markdown
### 2.X [機能名]

#### 概要
[機能の簡潔な説明]

#### エンドポイント
- **URL**: `GET /api/v1/projects`
- **認証**: 必須（JWT）
- **権限**: Manager以上

#### リクエスト

##### パラメータ（クエリ）
| パラメータ名 | 型 | 必須 | 説明 | デフォルト値 | 例 |
|------------|---|-----|------|------------|---|
| page | number | × | ページ番号 | 1 | 1 |
| limit | number | × | 1ページあたりの件数 | 20 | 20 |

##### パラメータ（パス）
| パラメータ名 | 型 | 必須 | 説明 | 例 |
|------------|---|-----|------|---|
| id | string | ○ | プロジェクトID | proj_123 |

##### リクエストボディ
\`\`\`json
{
  "projectName": "サンプルプロジェクト",
  "description": "説明"
}
\`\`\`

#### レスポンス

##### 成功時（200 OK）
\`\`\`json
{
  "success": true,
  "data": {
    "projectId": "proj_123",
    "projectName": "サンプルプロジェクト"
  },
  "meta": {
    "timestamp": "2026-01-09T10:00:00Z",
    "requestId": "req_abc123"
  }
}
\`\`\`

##### エラー時
| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー |
| 401 | AUTH_TOKEN_EXPIRED | 認証エラー |
| 403 | PERMISSION_INSUFFICIENT | 権限不足 |
| 404 | RESOURCE_NOT_FOUND | リソースが存在しない |

#### ビジネスロジック
1. [処理ステップ1]
2. [処理ステップ2]
3. [処理ステップ3]

#### バリデーション
- [ ] 必須フィールドのチェック
- [ ] データ型のチェック
- [ ] 文字列長のチェック
- [ ] organization_idの存在チェック

#### セキュリティチェックリスト
- [ ] JWT認証の実施
- [ ] organization_idフィルタの適用
- [ ] 権限チェック（permissionCheck）の実施
- [ ] Parameterized Queryの使用
- [ ] 入力値のサニタイゼーション

#### データベース操作
\`\`\`sql
SELECT * FROM projects 
WHERE organization_id = $1 
ORDER BY created_at DESC 
LIMIT $2 OFFSET $3;
\`\`\`

#### テストケース
- [ ] 正常系：認証済みユーザーによるアクセス
- [ ] 異常系：未認証ユーザーによるアクセス
- [ ] 異常系：権限不足ユーザーによるアクセス
- [ ] 異常系：他組織のデータへのアクセス
```

---

## 3. データモデル

### 3.1 使用するテーブル

#### projects テーブル

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|----------|------|
| id | varchar(255) | NOT NULL | - | プロジェクトID（PK） |
| organization_id | varchar(255) | NOT NULL | - | 組織ID（マルチテナント分離） |
| project_name | varchar(255) | NOT NULL | - | プロジェクト名 |
| description | text | NULL | - | プロジェクト説明 |
| status | varchar(50) | NOT NULL | 'active' | ステータス |
| created_by | varchar(255) | NOT NULL | - | 作成者ユーザーID |
| created_at | timestamp | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | timestamp | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |
| deleted_at | timestamp | NULL | - | 削除日時（論理削除） |

#### インデックス
- PRIMARY KEY: `id`
- INDEX: `organization_id`
- INDEX: `organization_id, status`
- INDEX: `created_at`

### 3.2 リレーション

```
projects (1) --- (N) experiments
projects (1) --- (N) project_members
projects (N) --- (1) organizations
```

---

## 4. セキュリティ要件

### 4.1 認証・認可

#### 認証方式
- JWT + Session Hybrid認証を使用
- すべてのエンドポイントで `auth` ミドルウェアを適用

#### 認可（RBAC）

| エンドポイント | System Admin | Manager | Worker |
|--------------|-------------|---------|--------|
| GET /projects | ○（全組織） | ○（自組織のみ） | ○（割り当てのみ） |
| POST /projects | ○ | ○ | × |
| PUT /projects/:id | ○ | ○ | × |
| DELETE /projects/:id | ○ | ○ | × |

### 4.2 マルチテナント分離

#### 必須事項
- すべてのAPIリクエストに `X-Organization-Id` ヘッダーが必須
- すべてのDBクエリに `organization_id` フィルタが必須
- クロステナントアクセスは厳禁（System Adminを除く）

#### ミドルウェアチェーン
```javascript
router.get('/projects',
  auth,                        // JWT認証
  tenantIsolation,            // テナント分離
  permissionCheck(['manager', 'admin']), // 権限チェック
  projectController.list
);
```

### 4.3 データアクセス制御

#### SQL実装例
```typescript
// ✅ 良い例
const projects = await db.query(
  'SELECT * FROM projects WHERE organization_id = $1',
  [organizationId]
);

// ❌ 悪い例
const projects = await db.query('SELECT * FROM projects');
```

---

## 5. パフォーマンス要件

### 5.1 レスポンスタイム

| エンドポイント | 目標レスポンスタイム | 最大許容時間 |
|--------------|-------------------|-------------|
| GET /projects | < 200ms | < 500ms |
| POST /projects | < 300ms | < 1000ms |
| PUT /projects/:id | < 300ms | < 1000ms |
| DELETE /projects/:id | < 200ms | < 500ms |

### 5.2 スループット

- 同時リクエスト処理: 100 req/sec 以上
- データベース接続プール: 最大20接続

### 5.3 キャッシング戦略

#### 対象データ
- プロジェクト一覧（TTL: 5分）
- プロジェクト詳細（TTL: 3分）

#### キャッシュ無効化タイミング
- プロジェクト作成時
- プロジェクト更新時
- プロジェクト削除時

---

## 6. テスト要件

### 6.1 ユニットテスト

#### テスト対象
- バリデーション関数
- ビジネスロジック
- データ変換処理

#### カバレッジ目標
- Branches: 70%以上
- Functions: 70%以上
- Lines: 70%以上

### 6.2 統合テスト

#### テストシナリオ
- 認証・認可フロー
- マルチテナント分離
- CRUD操作の一連の流れ
- エラーハンドリング

### 6.3 E2Eテスト（将来実装予定）

#### テストシナリオ
- ユーザーログインからプロジェクト作成まで
- プロジェクト一覧表示から詳細表示まで
- プロジェクト編集から保存まで

---

## 7. エラーハンドリング

### 7.1 エラーコード体系

#### カテゴリ別エラーコード

**VALIDATION_***
- `VALIDATION_REQUIRED_FIELD` - 必須フィールドが不足
- `VALIDATION_INVALID_FORMAT` - フォーマットが不正
- `VALIDATION_STRING_TOO_LONG` - 文字列が長すぎる

**AUTH_***
- `AUTH_TOKEN_EXPIRED` - トークンの有効期限切れ
- `AUTH_TOKEN_INVALID` - トークンが無効
- `AUTH_UNAUTHORIZED` - 未認証

**PERMISSION_***
- `PERMISSION_INSUFFICIENT` - 権限不足
- `PERMISSION_DENIED` - アクセス拒否

**RESOURCE_***
- `RESOURCE_NOT_FOUND` - リソースが存在しない
- `RESOURCE_ALREADY_EXISTS` - リソースが既に存在
- `RESOURCE_CONFLICT` - リソースの競合

**BUSINESS_***
- `BUSINESS_INVALID_OPERATION` - 不正な操作
- `BUSINESS_DUPLICATE_PROJECT_NAME` - プロジェクト名の重複

### 7.2 エラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_REQUIRED_FIELD",
    "message": "必須フィールドが不足しています",
    "details": [
      {
        "field": "projectName",
        "message": "プロジェクト名は必須です",
        "code": "REQUIRED_FIELD"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-09T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 8. 関連ドキュメント

- [API設計ポリシー](../../.clinerules/development/api.md)
- [バックエンド規約](../../.clinerules/development/backend.md)
- [セキュリティルール](../../.clinerules/development/security.md)
- [データベース設計](../db/)

---

## 9. 付録

### 9.1 用語集

| 用語 | 説明 |
|------|------|
| プロジェクト | 実験の単位となる管理対象 |
| マルチテナント | 組織ごとにデータを分離する仕組み |
| RBAC | ロールベースアクセス制御 |
| JWT | JSON Web Token（認証トークン） |

### 9.2 実装時の注意事項

#### DO（推奨）
✅ すべてのDBクエリに organization_id フィルタを含める
✅ Parameterized Queries を使用する
✅ 適切なエラーハンドリングを実装する
✅ ログを適切に記録する
✅ トランザクション管理を適切に行う

#### DON'T（非推奨）
❌ organization_id なしでクエリを実行しない
❌ 文字列連結でSQLクエリを構築しない
❌ 認証・認可ミドルウェアを省略しない
❌ エラーを握りつぶさない
❌ 機密情報をログに出力しない

---

## 📝 機能仕様の追加について

このドキュメントは段階的に更新されます。
新しい機能仕様を追加する際は、以下の手順で進めてください：

1. **セクション2（機能詳細）に新しい機能を追記**
   - テンプレートに従って記述
   - 一貫性のある形式を維持

2. **セクション3（データモデル）の更新**
   - 新しいテーブルやカラムが必要な場合は追記

3. **セクション4（セキュリティ要件）の確認**
   - 新機能の権限設定を追加

4. **セクション6（テスト要件）の更新**
   - 新機能のテストケースを追加

5. **変更履歴の更新**
   - ドキュメント冒頭の変更履歴テーブルに記録

---

**現在の状態**: テンプレート作成完了。機能仕様の追加待ち。

**次のステップ**: ユーザーから提供される各機能仕様を順次このドキュメントに統合していきます。
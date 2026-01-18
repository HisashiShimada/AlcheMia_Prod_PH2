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
| 1.4.0 | 2026-01-14 | セクション1.2をrole_permissionベースのアクセス制御に修正、データレベルのアクセス制御を追加 | Development Team |
| 1.3.0 | 2026-01-13 | 主要機能6件の概要とエンドポイント追加（詳細検索、チェックイン/アウト、アップロード、ダウンロード、リロード、公開） | Development Team |
| 1.2.0 | 2026-01-13 | セクション2.4のpriority/type/targetTypeを数値型に変更、taskNumber対応追加（code_master準拠） | Development Team |
| 1.1.0 | 2026-01-13 | セクション2.4の手動修正内容を全体に反映（リクエスト構造変更、タスク単位のexperimentCondition/trialCount対応） | Development Team |
| 1.0.0 | 2026-01-13 | セクション2.4指示送信機能のリクエスト仕様修正（assignedWorkerId削除、experimentConditionを数値型0/1に変更） | Development Team |
| 0.9.0 | 2026-01-13 | セクション2.4指示送信機能を画面構成に合わせて修正（InstructionDialog.tsx準拠） | Development Team |
| 0.8.0 | 2026-01-13 | 実装例・SQL例を全削除、実際のDDL構造に完全準拠、セクション3データモデルを実DDLに合わせて修正 | Development Team |
| 0.7.0 | 2026-01-13 | 指示送信機能を実際のDDL構造に合わせて修正（方針B採用：既存構造活用） | Development Team |
| 0.6.0 | 2026-01-13 | 指示送信機能追加（4テーブル更新、トランザクション管理、プロジェクトステータス遷移を含む） | Development Team |
| 0.5.0 | 2026-01-13 | プロジェクト作成機能追加（S3フォルダ作成、トランザクション管理を含む） | Development Team |
| 0.4.0 | 2026-01-13 | プロジェクト詳細取得機能仕様を修正（クエリパラメータ削除、タスク一覧取得ロジック変更） | Development Team |
| 0.3.0 | 2026-01-09 | プロジェクト詳細取得機能追加（S3ファイル一覧、タスク一覧を含む） | Development Team |
| 0.2.0 | 2026-01-09 | プロジェクト一覧取得機能追加 | Development Team |
| 0.1.0 | 2026-01-09 | 初版作成（テンプレート） | Development Team |

---

## 1. 概要

### 1.1 システム概要

プロジェクト管理画面のバックエンドAPIは、実験プロジェクトのライフサイクル全体を管理する機能を提供します。マルチテナント環境において、組織ごとに分離されたプロジェクトデータの安全な管理を実現します。

### 1.2 アクセス制御

#### 権限管理の基本方針

プロジェクト管理APIのアクセス制御は、以下の2つの仕組みで管理されます：

1. **機能レベルのアクセス制御**: `role_permission` テーブルで定義
2. **データレベルのアクセス制御**: organization_id、プロジェクト所有権、タスク割り当て状況により動的に判定

#### 機能レベルのアクセス制御（role_permission）

各エンドポイントへのアクセス権限は `role_permission` テーブルで管理されます。ロールごとに許可される機能（function_id）が定義されており、ミドルウェア（`permissionCheck`）で検証されます。

**主要なロール:**
- **System Admin（システム管理者）**: 全組織のデータにアクセス可能
- **Data Admin（データ管理者）**: 自組織のデータ管理
- **Experiment Admin（実験管理者）**: 実験プロジェクトの管理・作成
- **Experiment Worker（実験作業者）**: 割り当てられたタスクの実行
- **その他**: Provider、MI Engineer など

**注意**: 具体的なロールと権限の対応は `role_permission` テーブルおよび `function` テーブルで定義されます。

#### データレベルのアクセス制御

機能レベルでアクセスが許可されても、以下の条件でデータレベルのアクセス可否が判定されます：

1. **組織分離（必須）**: すべてのクエリで `organization_id` フィルタを適用
2. **プロジェクト所有権**: プロジェクトの `owner_user_id` または `department_id` で判定
3. **タスク割り当て**: `project_task_detail.experiment_user_id` で判定
4. **チェックアウト状態**: 編集操作時に排他制御

**例:**
- System Adminは機能レベルで全組織アクセス可能
- Experiment Adminは自組織のプロジェクトのみアクセス可能
- Experiment Workerは自分に割り当てられたタスクを持つプロジェクトのみアクセス可能

### 1.3 主要機能一覧

以下の機能を段階的に追加していきます：

- [x] プロジェクト一覧取得
- [x] プロジェクト詳細取得（S3ファイル一覧、タスク一覧を含む）
- [x] プロジェクト作成（S3フォルダ作成、トランザクション管理を含む）
- [x] 指示送信（タスク作成）（4テーブル更新、プロジェクトステータス遷移を含む）
- [x] プロジェクト詳細検索
- [x] チェックイン/チェックアウト状態切り替え
- [x] ファイルアップロード（S3）
- [x] ファイルダウンロード（署名付きURL）
- [x] プロジェクトリロード（S3ファイル再読み込み）
- [x] プロジェクト公開
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

### 2.2 プロジェクト詳細取得

#### 概要
プロジェクト一覧から特定のプロジェクトを選択した際に、プロジェクトの詳細情報を取得します。プロジェクト基本情報（名称・概要）に加えて、S3上のファイル一覧とタスク一覧を含む包括的な情報を返却します。

#### エンドポイント
- **URL**: `GET /api/v1/projects/:projectId`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上（Worker: 割り当てられたプロジェクトのみ）

#### リクエスト

##### ヘッダー
| ヘッダー名 | 型 | 必須 | 説明 | 例 |
|-----------|---|-----|------|---|
| Authorization | string | ○ | JWTトークン | Bearer maiml_session-abc123_1234567890 |
| X-Organization-Id | string | ○ | 組織ID | a0718dc5-21f3-44e6-87e9-cc2ae83f3385 |

##### パラメータ（パス）
| パラメータ名 | 型 | 必須 | 説明 | 例 |
|------------|---|-----|------|---|
| projectId | string | ○ | プロジェクトID（UUID） | b1234567-89ab-cdef-0123-456789abcdef |

#### レスポンス

##### 成功時（200 OK）
```json
{
  "success": true,
  "data": {
    "project": {
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
    "files": [
      {
        "fileName": "sample_project.maiml",
        "filePath": "projects/sample_project/sample_project.maiml",
        "fileSize": 15360,
        "lastModified": "2026-01-08T14:20:00.000Z",
        "fileType": "maiml",
        "isArchive": false,
        "signedUrl": "https://s3.amazonaws.com/bucket/...?X-Amz-Signature=..."
      },
      {
        "fileName": "sample_project_v1.maiml",
        "filePath": "projects/sample_project/archive/sample_project_v1.maiml",
        "fileSize": 12800,
        "lastModified": "2026-01-05T10:30:00.000Z",
        "fileType": "maiml",
        "isArchive": true,
        "version": 1,
        "signedUrl": "https://s3.amazonaws.com/bucket/...?X-Amz-Signature=..."
      }
    ],
    "tasks": [
      {
        "organizationId": "a0718dc5-21f3-44e6-87e9-cc2ae83f3385",
        "projectId": "b1234567-89ab-cdef-0123-456789abcdef",
        "methodId": "method_001",
        "taskNo": 1,
        "taskStatus": 3,
        "taskStatusName": "完了",
        "experimentStartAt": "2026-01-06T09:00:00.000Z",
        "experimentEndAt": "2026-01-06T17:30:00.000Z",
        "experimentUserId": "e5678901-cdef-0123-4567-89abcdef0123",
        "experimentUserName": "山田太郎",
        "reviewedAt": "2026-01-07T10:00:00.000Z",
        "reviewUserId": "d3456789-abcd-ef01-2345-6789abcdef01",
        "reviewUserName": "佐藤花子"
      },
      {
        "organizationId": "a0718dc5-21f3-44e6-87e9-cc2ae83f3385",
        "projectId": "b1234567-89ab-cdef-0123-456789abcdef",
        "methodId": "method_001",
        "taskNo": 2,
        "taskStatus": 1,
        "taskStatusName": "実行中",
        "experimentStartAt": "2026-01-08T09:00:00.000Z",
        "experimentEndAt": null,
        "experimentUserId": "e5678901-cdef-0123-4567-89abcdef0123",
        "experimentUserName": "山田太郎",
        "reviewedAt": null,
        "reviewUserId": null,
        "reviewUserName": null
      }
    ],
    "summary": {
      "totalFiles": 2,
      "totalTasks": 5,
      "completedTasks": 2,
      "inProgressTasks": 1,
      "pendingTasks": 2
    }
  },
  "meta": {
    "timestamp": "2026-01-09T16:42:00Z",
    "requestId": "req_def456"
  }
}
```

##### エラー時
| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー（不正なprojectId） |
| 401 | AUTH_TOKEN_EXPIRED | 認証エラー（トークン期限切れ） |
| 401 | AUTH_TOKEN_INVALID | 認証エラー（トークン不正） |
| 403 | PERMISSION_INSUFFICIENT | 権限不足（アクセス権限がない） |
| 404 | RESOURCE_NOT_FOUND | プロジェクトが存在しない |
| 500 | SYSTEM_DATABASE_ERROR | データベースエラー |
| 500 | SYSTEM_S3_ERROR | S3アクセスエラー |

#### ビジネスロジック
1. **認証チェック**: JWTトークンとセッションの検証
2. **組織ID取得**: セッション情報から組織IDを取得
3. **権限チェック**: ユーザーのロールとプロジェクトアクセス権限の確認
   - System Admin: 全組織のプロジェクト取得可能
   - Manager: 自組織のプロジェクトのみ取得可能
   - Worker: 割り当てられたプロジェクトのみ取得可能
4. **プロジェクト基本情報取得**: projectテーブルから取得
   - organization_idとproject_idでフィルタリング（必須）
   - 存在しない場合は404エラー
5. **S3ファイル一覧取得**（常に実行）:
   - storageService.listFilesで対象プロジェクトフォルダ配下を取得
   - パス: `projects/{project_name}/`
   - アーカイブフォルダも含める: `projects/{project_name}/archive/`
   - 各ファイルの署名付きURL（有効期限: 1時間）を生成
   - ファイルサイズ、最終更新日時を取得
6. **タスク一覧取得**（タスクが作成済みの場合のみ）:
   - project_task_detailテーブルにレコードが存在するかチェック
   - レコードが存在する場合のみ取得
   - organization_idとproject_idでフィルタリング（必須）
   - task_no順でソート
   - ユーザー名を取得（organization_userテーブルとJOIN）
   - タスクステータス名称をcode_masterから取得
7. **サマリー情報生成**:
   - ファイル数、タスク数、完了タスク数などを集計
8. **レスポンス生成**: キャメルケースに変換してJSON形式で返却

#### バリデーション
- [x] Authorization ヘッダーの存在チェック
- [x] X-Organization-Id ヘッダーの存在チェック
- [x] X-Organization-Id が UUID 形式であることをチェック
- [x] projectId が UUID 形式であることをチェック

#### セキュリティチェックリスト
- [x] JWT認証の実施（authミドルウェア）
- [x] organization_idフィルタの適用（必須）
- [x] テナント分離（tenantIsolationミドルウェア）
- [x] 権限チェック（permissionCheckミドルウェア）
- [x] プロジェクトアクセス権限の確認
- [x] Parameterized Queryの使用
- [x] S3署名付きURLの使用（有効期限: 1時間）
- [x] organization_prefixの強制適用


#### テストケース
- [x] 正常系：認証済みManagerによるプロジェクト詳細取得
- [x] 正常系：ファイル一覧が常に含まれることを確認
- [x] 正常系：タスクが作成済みの場合、タスク一覧が含まれることを確認
- [x] 正常系：タスクが未作成の場合、空の配列が返却されることを確認
- [x] 正常系：署名付きURLが正しく生成される
- [x] 正常系：アーカイブファイルがバージョン番号付きで取得される
- [x] 正常系：タスクステータス別の件数が正しく集計される
- [x] 正常系：タスク未作成時もサマリー情報が正しく生成される
- [x] 異常系：未認証ユーザーによるアクセス（401エラー）
- [x] 異常系：権限不足ユーザーによるアクセス（403エラー）
- [x] 異常系：他組織のプロジェクトへのアクセス（403エラー）
- [x] 異常系：存在しないprojectId（404エラー）
- [x] 異常系：不正なprojectId形式（400エラー）
- [x] 異常系：S3アクセスエラー（500エラー）

#### レスポンスフィールド説明

##### project（プロジェクト基本情報）
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

##### files（ファイル一覧）
| フィールド名 | 型 | NULL許可 | 説明 |
|------------|---|---------|------|
| fileName | string | × | ファイル名 |
| filePath | string | × | S3上のファイルパス |
| fileSize | number | × | ファイルサイズ（バイト） |
| lastModified | string | × | 最終更新日時（ISO 8601形式） |
| fileType | string | × | ファイル種別（maiml, other） |
| isArchive | boolean | × | アーカイブファイルかどうか |
| version | number | ○ | バージョン番号（アーカイブの場合のみ） |
| signedUrl | string | × | 署名付きURL（有効期限: 1時間） |

##### tasks（タスク一覧）
| フィールド名 | 型 | NULL許可 | 説明 |
|------------|---|---------|------|
| organizationId | string | × | 組織ID（UUID） |
| projectId | string | × | プロジェクトID（UUID） |
| methodId | string | × | メソッドID |
| taskNo | number | × | タスク連番 |
| taskStatus | number | × | タスクステータス（0〜4） |
| taskStatusName | string | ○ | タスクステータス名称 |
| experimentStartAt | string | ○ | 実験開始日時（ISO 8601形式） |
| experimentEndAt | string | ○ | 実験終了日時（ISO 8601形式） |
| experimentUserId | string | ○ | 実験作業者ID（UUID） |
| experimentUserName | string | ○ | 実験作業者名 |
| reviewedAt | string | ○ | レビュー完了日時（ISO 8601形式） |
| reviewUserId | string | ○ | レビュアーID（UUID） |
| reviewUserName | string | ○ | レビュアー名 |

##### summary（サマリー情報）
| フィールド名 | 型 | NULL許可 | 説明 |
|------------|---|---------|------|
| totalFiles | number | × | 総ファイル数 |
| totalTasks | number | × | 総タスク数 |
| completedTasks | number | × | 完了タスク数 |
| inProgressTasks | number | × | 実行中タスク数 |
| pendingTasks | number | × | 実行待ちタスク数 |

#### タスクステータス一覧

| コード値 | 名称 | 説明 |
|---------|------|------|
| 0 | 実行待ち | タスクの実行を待機中 |
| 1 | 実行中 | タスクが実行中 |
| 2 | レビュー待ち | タスク結果のレビュー待ち |
| 3 | 完了 | タスクが完了 |
| 4 | 異常終了 | タスクが異常終了 |

#### S3パス構造

```
org_{organization_prefix}/projects/{project_name}/
├── {project_name}.maiml           # 現在のMAIMLファイル
└── archive/
    ├── {project_name}_v1.maiml    # アーカイブバージョン1
    ├── {project_name}_v2.maiml    # アーカイブバージョン2
    └── {project_name}_v3.maiml    # アーカイブバージョン3
```

#### 設計上の考慮事項

##### データ取得方針
- **ファイル一覧**: 常に取得（ファイル確認タブ用）
- **タスク一覧**: 作成済みの場合のみ取得（タスク結果確認タブ用）
  - プロジェクト作成直後など、タスク未作成時は空配列を返却
  - タスク存在チェック後に取得することで、不要なクエリを回避

##### パフォーマンス最適化
- **並列取得**: プロジェクト基本情報、S3ファイル一覧、タスク存在チェックを並列実行可能
- **条件付きタスク取得**: タスクが存在する場合のみ詳細を取得
- **キャッシング**: プロジェクト基本情報は短時間（3分）キャッシュ可能
- **署名付きURL**: S3ファイルへのアクセスは署名付きURLで1時間有効

##### スケーラビリティ
- **大量ファイル対応**: S3ファイル一覧は最大1000件まで取得（ページネーション不要と想定）
- **大量タスク対応**: タスク一覧は全件取得（通常は数十〜数百件程度を想定）
- **必要に応じて分割**: ファイル・タスクが大量になる場合は別エンドポイントに分割を検討

##### 実装上の注意事項
- タスク未作成時でもレスポンス構造は統一（`tasks: []`, `summary.totalTasks: 0`）
- S3ファイルが存在しない場合も空配列を返却（エラーにしない）
- アーカイブファイルはバージョン番号順にソート推奨

##### 代替案: エンドポイント分割
パフォーマンスやスケーラビリティが問題になる場合は、以下のように分割することも可能：
- `GET /api/v1/projects/:projectId` - プロジェクト基本情報のみ
- `GET /api/v1/projects/:projectId/files` - ファイル一覧のみ
- `GET /api/v1/projects/:projectId/tasks` - タスク一覧のみ

---

### 2.3 プロジェクト作成

#### 概要
プロジェクト管理画面で「新規プロジェクト」ボタンを押下すると表示されるダイアログで入力された情報をもとに、新しいプロジェクトを作成します。データベース（projectテーブル）への登録とS3上へのプロジェクトフォルダ作成を行います。

#### エンドポイント
- **URL**: `POST /api/v1/projects`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上

#### リクエスト

##### ヘッダー
| ヘッダー名 | 型 | 必須 | 説明 | 例 |
|-----------|---|-----|------|---|
| Authorization | string | ○ | JWTトークン | Bearer maiml_session-abc123_1234567890 |
| X-Organization-Id | string | ○ | 組織ID | a0718dc5-21f3-44e6-87e9-cc2ae83f3385 |

##### リクエストボディ
```json
{
  "projectName": "新規プロジェクト",
  "description": "プロジェクトの説明文"
}
```

| フィールド名 | 型 | 必須 | 説明 | 制約 |
|------------|---|-----|------|------|
| projectName | string | ○ | プロジェクト名 | 1〜255文字、同一組織内で一意 |
| description | string | × | プロジェクト説明 | 最大1000文字 |

#### レスポンス

##### 成功時（201 Created）
```json
{
  "success": true,
  "data": {
    "organizationId": "a0718dc5-21f3-44e6-87e9-cc2ae83f3385",
    "projectId": "f6789012-defg-3456-789a-bcdef0123456",
    "projectName": "新規プロジェクト",
    "description": "プロジェクトの説明文",
    "departmentId": "c2345678-9abc-def0-1234-56789abcdef0",
    "ownerUserId": "d3456789-abcd-ef01-2345-6789abcdef01",
    "projectStatus": 0,
    "projectStatusName": "プロジェクト計画中",
    "projectMaimlFlg": false,
    "checkoutStatus": 0,
    "checkoutStatusName": "チェックイン中",
    "createAt": "2026-01-13T08:36:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-13T08:36:00Z",
    "requestId": "req_ghi789"
  }
}
```

##### エラー時
| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー（必須フィールド不足、文字数超過） |
| 401 | AUTH_TOKEN_EXPIRED | 認証エラー（トークン期限切れ） |
| 401 | AUTH_TOKEN_INVALID | 認証エラー（トークン不正） |
| 403 | PERMISSION_INSUFFICIENT | 権限不足（Manager以上が必要） |
| 409 | BUSINESS_DUPLICATE_PROJECT_NAME | プロジェクト名が既に存在 |
| 500 | SYSTEM_DATABASE_ERROR | データベースエラー |
| 500 | SYSTEM_S3_ERROR | S3アクセスエラー |

#### ビジネスロジック
1. **認証チェック**: JWTトークンとセッションの検証
2. **組織ID取得**: セッション情報から組織IDを取得
3. **権限チェック**: Manager以上の権限が必要
4. **ユーザー情報取得**: ログインユーザーの部門ID、ユーザーIDを取得
5. **プロジェクト名重複チェック**: 同一組織内で同じプロジェクト名が存在しないか確認
6. **プロジェクトID生成**: UUID v4を使用して新規プロジェクトIDを生成
7. **projectテーブルへの登録**:
   - organization_id: セッション情報から取得
   - project_id: 新規生成したUUID
   - project_name: リクエストボディから取得
   - description: リクエストボディから取得（NULL許容）
   - department_id: ログインユーザーの部門ID
   - owner_user_id: ログインユーザーのユーザーID
   - project_status: 0（プロジェクト計画中）
   - project_maiml_flg: false
   - checkout_status: 0（チェックイン中）
   - create_at: 現在日時
8. **S3プロジェクトフォルダ作成**:
   - パス: `org_{organization_prefix}/projects/{project_name}/`
   - 空のプロジェクトフォルダを作成（マーカーファイルで実現）
9. **レスポンス生成**: 作成したプロジェクト情報を返却
10. **トランザクション**: データベース登録とS3作成は一貫性を保つ（片方失敗時はロールバック）

#### バリデーション
- [x] Authorization ヘッダーの存在チェック
- [x] X-Organization-Id ヘッダーの存在チェック
- [x] X-Organization-Id が UUID 形式であることをチェック
- [x] projectName が必須であることをチェック
- [x] projectName が1〜255文字であることをチェック
- [x] projectName が有効な文字のみ含むことをチェック（英数字、日本語、アンダースコア、ハイフン）
- [x] description が1000文字以内であることをチェック（指定時）
- [x] projectName が同一組織内で一意であることをチェック

#### セキュリティチェックリスト
- [x] JWT認証の実施（authミドルウェア）
- [x] organization_idフィルタの適用（必須）
- [x] テナント分離（tenantIsolationミドルウェア）
- [x] 権限チェック（permissionCheck - Manager以上）
- [x] Parameterized Queryの使用
- [x] 入力値のサニタイゼーション
- [x] プロジェクト名重複チェック
- [x] organization_prefixの強制適用（S3）


#### テストケース
- [x] 正常系：認証済みManagerによるプロジェクト作成
- [x] 正常系：descriptionなしでのプロジェクト作成
- [x] 正常系：部門IDがnullのユーザーによるプロジェクト作成
- [x] 正常系：作成したプロジェクトのデフォルト値が正しい
- [x] 正常系：S3にプロジェクトフォルダが作成される
- [x] 正常系：作成後のレスポンスに全フィールドが含まれる
- [x] 異常系：未認証ユーザーによるアクセス（401エラー）
- [x] 異常系：権限不足ユーザー（Worker）によるアクセス（403エラー）
- [x] 異常系：projectNameが空文字（400エラー）
- [x] 異常系：projectNameが256文字以上（400エラー）
- [x] 異常系：projectNameが重複（409エラー）
- [x] 異常系：descriptionが1001文字以上（400エラー）
- [x] 異常系：不正なorganization_id（400エラー）
- [x] 異常系：S3エラー発生時のロールバック（500エラー、DBに登録されない）

#### レスポンスフィールド説明

| フィールド名 | 型 | NULL許可 | 説明 |
|------------|---|---------|------|
| organizationId | string | × | 組織ID（UUID） |
| projectId | string | × | プロジェクトID（UUID、新規生成） |
| projectName | string | × | プロジェクト名 |
| description | string | ○ | プロジェクト説明 |
| departmentId | string | ○ | 部門ID（ログインユーザーの部門ID） |
| ownerUserId | string | × | 所有者ユーザーID（ログインユーザーのユーザーID） |
| projectStatus | number | × | プロジェクトステータス（常に0） |
| projectStatusName | string | ○ | プロジェクトステータス名称（「プロジェクト計画中」） |
| projectMaimlFlg | boolean | × | プロジェクトMaiml有無（常にfalse） |
| checkoutStatus | number | × | チェックアウトステータス（常に0） |
| checkoutStatusName | string | ○ | チェックアウトステータス名称（「チェックイン中」） |
| createAt | string | × | 作成日時（ISO 8601形式） |

#### S3フォルダ構造

```
org_{organization_prefix}/projects/{project_name}/
└── .keep  # マーカーファイル（フォルダ作成のため）
```

#### 設計上の考慮事項

##### トランザクション管理
- データベース挿入とS3フォルダ作成は一貫性を保つ
- S3作成失敗時はデータベースのトランザクションをロールバック
- エラー発生時は適切なHTTPステータスコードとエラーメッセージを返却

##### プロジェクト名の制約
- 同一組織内で一意である必要がある
- 論理削除されたプロジェクトと同名は作成可能（deleted_at IS NULL でフィルタ）
- S3のフォルダ名としても使用されるため、特殊文字は制限

##### デフォルト値
- project_status: 0（プロジェクト計画中）
- checkout_status: 0（チェックイン中）
- project_maiml_flg: false
- これらの値は固定でフロントエンドから指定不可

##### フロントエンド連携
- 作成成功後、フロントエンドでプロジェクト一覧を再取得
- 新規作成されたプロジェクトが一覧の先頭に表示される（create_at DESC）

##### エラーハンドリング
- プロジェクト名重複時は409 Conflictを返却
- S3エラー時は500 Internal Server Errorを返却し、DBはロールバック
- バリデーションエラー時は400 Bad Requestを返却

---

### 2.4 指示送信（タスク作成）

#### 概要
プロジェクト管理画面で「指示送信」ボタンを押下すると表示されるダイアログで入力された情報をもとに、プロジェクトに対する作業指示とタスクを作成します。複数のテーブル（project、project_instruction、project_task、project_task_detail）に対してトランザクション管理しながらデータを登録します。

#### エンドポイント
- **URL**: `POST /api/v1/projects/:projectId/instructions`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上

#### リクエスト

##### ヘッダー
| ヘッダー名 | 型 | 必須 | 説明 | 例 |
|-----------|---|-----|------|---|
| Authorization | string | ○ | JWTトークン | Bearer maiml_session-abc123_1234567890 |
| X-Organization-Id | string | ○ | 組織ID | a0718dc5-21f3-44e6-87e9-cc2ae83f3385 |

##### パラメータ（パス）
| パラメータ名 | 型 | 必須 | 説明 | 例 |
|------------|---|-----|------|---|
| projectId | string | ○ | プロジェクトID（UUID） | b1234567-89ab-cdef-0123-456789abcdef |

##### リクエストボディ
```json
{
  "tasks": [
    {
      "methodId": "method_001",
      "experimentCondition": 0,
      "trialCount": 3
    },
    {
      "methodId": "method_002",
      "experimentCondition": 0,
      "trialCount": 1
    }
  ],
  "instructions": [
    {
      "content": "以下の手順で実験を実施してください。",
      "priority": 1,
      "type": 0,
      "targetType": 0,
      "transitionId": null,
      "taskNumber": null
    },
    {
      "content": "測定時は温度を25℃に保ってください。",
      "priority": 3,
      "type": 2,
      "targetType": 2,
      "transitionId": "transition_002",
      "taskNumber": null
    },
    {
      "content": "特定タスクに対する指示です。",
      "priority": 2,
      "type": 0,
      "targetType": 1,
      "transitionId": null,
      "taskNumber": 1
    }
  ]
}
```

| フィールド名 | 型 | 必須 | 説明 | 制約 |
|------------|---|-----|------|------|
| tasks | array | ○ | タスク一覧（メソッド順序） | 最低1件以上 |
| tasks[].methodId | string | ○ | メソッドID | 255文字以内 |
| experimentCondition | number | ○ | 実験条件 | 0（全て同一条件）または 1（実験ごとに変更） |
| trialCount | number | × | 試行回数 | 1〜999の整数 |
| instructions | array | ○ | 指示一覧 | 最低1件以上 |
| instructions[].content | string | ○ | 指示内容 | 1〜1000文字 |
| instructions[].priority | number | ○ | 優先度 | 0（低）、1（通常）、2（中）、3（高） |
| instructions[].type | number | ○ | タイプ | 0（一般）、1（セットアップ）、2（測定）、3（安全）、4（清掃） |
| instructions[].targetType | number | ○ | 指示対象 | 0（ファイル全体）、1（特定タスク）、2（特定トランジション） |
| instructions[].transitionId | string | ○※ | 対象トランジションID | targetType=2の場合必須、それ以外はnull |
| instructions[].taskNumber | number | ○※ | 対象タスク番号 | targetType=1の場合必須で1以上の整数、それ以外はnull |

#### レスポンス

##### 成功時（201 Created）
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTasks": 2,
      "createdTasks": 2
    }
  },
  "meta": {
    "timestamp": "2026-01-13T10:55:00Z",
    "requestId": "req_jkl012"
  }
}
```

##### エラー時
| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー（必須フィールド不足、タスク配列が空） |
| 401 | AUTH_TOKEN_EXPIRED | 認証エラー（トークン期限切れ） |
| 401 | AUTH_TOKEN_INVALID | 認証エラー（トークン不正） |
| 403 | PERMISSION_INSUFFICIENT | 権限不足（Manager以上が必要） |
| 404 | RESOURCE_NOT_FOUND | プロジェクトが存在しない |
| 409 | BUSINESS_INVALID_PROJECT_STATUS | プロジェクトステータスが不正（指示送信不可） |
| 500 | SYSTEM_DATABASE_ERROR | データベースエラー |

#### ビジネスロジック
1. **認証チェック**: JWTトークンとセッションの検証
2. **組織ID取得**: セッション情報から組織IDを取得
3. **権限チェック**: Manager以上の権限が必要
4. **プロジェクト存在確認**: 指定されたprojectIdが存在し、自組織のものであることを確認
5. **プロジェクトステータス確認**: project_status = 0（プロジェクト計画中）であることを確認
6. **ユーザー存在確認**: 割り当てユーザーIDが全て存在し、同一組織のユーザーであることを確認
7. **指示ID生成**: UUID v4を使用して新規指示IDを生成
8. **トランザクション開始**: 複数テーブルの更新を一貫性を保って実行
9. **project_instructionテーブルへの登録**:
   - experiment_instruction_id: 新規生成したUUID
   - organization_id: セッション情報から取得
   - project_id: パスパラメータから取得
   - instructions: リクエストボディのinstructionContent
   - instruction_user_id: ログインユーザーID
   - instruction_date: 現在日時
   - instruction_target: 画面で選択した指示対象のコード値
   - priority: 画面で選択した優先度のコード値
   - type: 画面で選択したタイプのコード値
   - task_no: 画面で選択されている場合、画面で設定したタスク番号
   - transition_id: 画面で選択されている場合、画面で設定したトランジションのID
10. **project_taskテーブルへの登録**:
    - organization_id: セッション情報から取得
    - project_id: パスパラメータから取得
    - method_id: 各タスクのmethod_id
    - task_name: 各タスクのtaskName
    - experiment_order: タスク詳細セクションの作業順序
    - experiment_condition: タスク詳細セクションの実験条件
    - attempts_count: タスク詳細セクションの試行回数
    - 各method_idごとにレコード作成（重複時はUPSERT）
11. **project_task_detailテーブルへの登録**:
    - organization_id: セッション情報から取得
    - project_id: パスパラメータから取得
    - method_id: 各タスクのmethod_id
    - task_no: 各タスクのtask_no
    - task_status: 0（実行待ち）固定
    - experiment_user_id, experiment_start_at, experiment_end_at, reviewed_at, review_user_id: NULL
    - 各タスクごとにレコード作成
12. **projectテーブルの更新**:
    - project_status: 1（タスク実行待ち）に更新
13. **トランザクションコミット**: すべての処理が成功した場合のみコミット
14. **レスポンス生成**: 作成した指示とタスク情報を返却

**注意事項:**
- DBへの実際の登録内容は別途連携される仕様に従う
- リクエストボディの項目とDBカラムの対応は「登録時の値マッピング」セクションを参照

#### バリデーション
- [x] Authorization ヘッダーの存在チェック
- [x] X-Organization-Id ヘッダーの存在チェック
- [x] X-Organization-Id が UUID 形式であることをチェック
- [x] projectId が UUID 形式であることをチェック
- [x] tasks が配列であることをチェック
- [x] tasks が最低1件以上含まれることをチェック
- [x] tasks[].methodId が必須であることをチェック
- [x] experimentCondition が必須で 0 または 1 であることをチェック
- [x] trialCount が 1〜999 の整数であることをチェック（指定時）
- [x] instructions が配列であることをチェック
- [x] instructions が最低1件以上含まれることをチェック
- [x] instructions[].content が必須で1〜1000文字であることをチェック
- [x] instructions[].priority が 0〜3 の整数であることをチェック
- [x] instructions[].type が 0〜4 の整数であることをチェック
- [x] instructions[].targetType が 0〜2 の整数であることをチェック
- [x] instructions[].transitionId が targetType=2 の場合必須であることをチェック
- [x] instructions[].taskNumber が targetType=1 の場合必須で1以上の整数であることをチェック

#### セキュリティチェックリスト
- [x] JWT認証の実施（authミドルウェア）
- [x] organization_idフィルタの適用（必須）
- [x] テナント分離（tenantIsolationミドルウェア）
- [x] 権限チェック（permissionCheck - Manager以上）
- [x] プロジェクト所有権の確認
- [x] 割り当てユーザーの組織確認
- [x] Parameterized Queryの使用
- [x] 入力値のサニタイゼーション
- [x] トランザクション管理


#### テストケース
- [x] 正常系：認証済みManagerによる指示送信
- [x] 正常系：複数のタスクを含む指示の作成
- [x] 正常系：due_dateなしでの指示作成
- [x] 正常系：task_nameなしでのタスク作成
- [x] 正常系：プロジェクトステータスが1に更新される
- [x] 正常系：project_taskテーブルにmethod_idごとのレコードが作成される
- [x] 正常系：project_task_detailテーブルに各タスクのレコードが作成される
- [x] 正常系：タスクステータスが0（実行待ち）で作成される
- [x] 正常系：作成後のレスポンスに全フィールドが含まれる
- [x] 異常系：未認証ユーザーによるアクセス（401エラー）
- [x] 異常系：権限不足ユーザー（Worker）によるアクセス（403エラー）
- [x] 異常系：存在しないprojectId（404エラー）
- [x] 異常系：他組織のプロジェクトへのアクセス（403エラー）
- [x] 異常系：プロジェクトステータスが不正（project_status != 0）（409エラー）
- [x] 異常系：instructionTitleが空文字（400エラー）
- [x] 異常系：instructionContentが空文字（400エラー）
- [x] 異常系：tasks配列が空（400エラー）
- [x] 異常系：存在しないassignedUserId（400エラー）
- [x] 異常系：他組織のユーザーをassignedUserIdに指定（400エラー）
- [x] 異常系：トランザクション中のエラー発生時のロールバック（500エラー）

#### レスポンスフィールド説明

##### summary（サマリー情報）
| フィールド名 | 型 | NULL許可 | 説明 |
|------------|---|---------|------|
| totalTasks | number | × | 作成されたタスク総数 |
| createdTasks | number | × | 正常に作成されたタスク数 |

#### 実際のテーブル構造（DDLに基づく）

##### project_instruction テーブル（指示情報）
- `experiment_instruction_id`: 指示ID（主キーの一部）
- `instructions`: 指示内容（リクエストのinstructionContentを格納）
- `instruction_user_id`: 指示作成者ID
- `instruction_date`: 指示作成日時
- `instruction_target`: 指示対象（1:ファイル全体、2:タスク、3:トランジション）
- `priority`, `type`, `task_no`, `transition_id`: NULL（現在は使用しない）

##### project_task テーブル（メソッド単位のタスク管理）
- 主キー: `(organization_id, project_id, method_id)`
- `task_name`: タスク名
- `experiment_order`, `experiment_condition`, `attempts_count`: NULL（現在は使用しない）
- **注意**: `instruction_id`カラムは存在しない（DDL上）

##### project_task_detail テーブル（タスク詳細）
- 主キー: `(organization_id, project_id, method_id, task_no)`
- `task_status`: タスクステータス（0:実行待ち、1:実行中、2:レビュー待ち、3:完了、4:異常終了）
- `experiment_user_id`: 実験作業者ID（リクエストのassignedUserIdを格納、本来は実験実施者だが初期値として使用）
- `experiment_start_at`, `experiment_end_at`: 実験期間
- `reviewed_at`, `review_user_id`: レビュー情報
- **注意**: `task_name`カラムは存在しない（project_taskに存在）
- **注意**: `assigned_user_id`カラムは存在しない（experiment_user_idで代用）

#### テーブル間の関係

```
project (1) --- (N) project_instruction
project (1) --- (N) project_task
project_task (1) --- (N) project_task_detail

注意: 
- project_instructionとproject_taskは直接の外部キー関係なし
- project_taskとproject_task_detailは(organization_id, project_id, method_id)で紐づく
```

#### 登録時の値マッピング

##### project_instruction への登録
- `experiment_instruction_id` ← UUID v4生成
- `instructions` ← リクエストのinstructionContent
- `instruction_user_id` ← ログインユーザーID
- `instruction_date` ← 現在日時
- `instruction_target` ← 1（ファイル全体）固定
- その他 ← NULL

##### project_task への登録
- `method_id` ← リクエストのmethodId
- `task_name` ← リクエストのtaskName
- その他 ← NULL

##### project_task_detail への登録
- `task_no` ← リクエストのtaskNo
- `task_status` ← 0（実行待ち）固定
- `experiment_user_id` ← リクエストのassignedUserId（⚠️本来は実験実施者だが初期値として使用）
- その他 ← NULL

##### project の更新
- `project_status` ← 1（タスク実行待ち）に更新

#### 設計上の考慮事項

##### トランザクション管理（重要）
- 4つのテーブル（project, project_instruction, project_task, project_task_detail）への操作は一貫性を保つ
- いずれかのテーブルへの登録・更新が失敗した場合、全てロールバック
- エラー発生時は適切なHTTPステータスコードとエラーメッセージを返却

##### プロジェクトステータスの遷移
- 指示送信前: project_status = 0（プロジェクト計画中）
- 指示送信後: project_status = 1（タスク実行待ち）
- project_status != 0 の場合は指示送信不可（409エラー）

##### project_taskテーブルの役割
- method_idごとに1レコード作成
- 同じmethod_idの複数タスクは、1つのproject_taskレコードに紐づく
- instruction_idで最新の指示を追跡

##### project_task_detailテーブルの役割
- 各タスクごとに1レコード作成
- 実験作業者はこのテーブルを参照してタスクを実行
- task_status で進捗管理（0: 実行待ち, 1: 実行中, 2: レビュー待ち, 3: 完了, 4: 異常終了）

##### フロントエンド連携
- 指示送信成功後、フロントエンドでプロジェクト一覧と詳細を全て再取得
- プロジェクトステータスが「タスク実行待ち」に変更される
- 作成されたタスクが「タスク結果確認」タブに表示される

##### 割り当てユーザーの制約
- 割り当てユーザーは必ず同一組織内のユーザーである必要がある
- Worker権限のユーザーに割り当てることを想定
- 存在しないユーザーIDの場合はバリデーションエラー

##### エラーハンドリング
- プロジェクトが存在しない: 404 Not Found
- プロジェクトステータスが不正: 409 Conflict
- 割り当てユーザーが存在しない: 400 Bad Request
- トランザクション中のエラー: 500 Internal Server Error（ロールバック）

---

### 2.5 プロジェクト詳細検索

#### 概要
プロジェクト管理画面で、複数の条件を組み合わせてプロジェクトを検索します。プロジェクト名、説明、ステータス、作成日範囲、所有者などの条件で絞り込みが可能です。

#### エンドポイント
- **URL**: `POST /api/v1/projects/search`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上（Worker: 割り当てられたプロジェクトのみ）

---

### 2.6 チェックイン/チェックアウト状態切り替え

#### 概要
プロジェクトのチェックアウトステータスを切り替えます。チェックイン中にのみ実験計画の修正が可能。チェックアウト状態になったのちに実験作業者にて作業を行う。

#### エンドポイント
- **URL**: `PATCH /api/v1/projects/:projectId/checkout-status`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上

---

### 2.7 ファイルアップロード

#### 概要
プロジェクトフォルダにファイルをアップロードします。MAIMLファイル、実験データファイル、画像ファイルなど、任意のファイルをS3に保存します。ファイルメタデータはfile_metadataテーブルに記録されます。

#### エンドポイント
- **URL**: `POST /api/v1/projects/:projectId/files`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上

---

### 2.8 ファイルダウンロード

#### 概要
プロジェクトフォルダ内のファイルをダウンロードするための署名付きURLを生成します。生成されたURLは1時間有効で、クライアント側で直接S3からファイルをダウンロードできます。

#### エンドポイント
- **URL**: `GET /api/v1/projects/:projectId/files/:fileName/download`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上（Worker: 割り当てられたプロジェクトのみ）

---

### 2.9 プロジェクトリロード

#### 概要
S3上のファイル一覧を再読み込みし、最新の状態を取得します。外部からファイルが追加・更新された場合や、キャッシュをクリアして最新状態を確認したい場合に使用します。

#### エンドポイント
- **URL**: `POST /api/v1/projects/:projectId/reload`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上

---

### 2.10 プロジェクト公開

#### 概要
プロジェクトを他の組織や外部ユーザーに公開します。公開設定により、読み取り専用アクセスを付与したり、共同編集を許可したりできます。公開URLの生成や、アクセス権限の管理を行います。

#### エンドポイント
- **URL**: `POST /api/v1/projects/:projectId/publish`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: Manager以上

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

このAPIで使用する主要テーブルの構造を記載します。詳細なDDL定義は `docs/design/db/ddl/` を参照してください。

#### project テーブル（プロジェクト）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|----------|------|
| organization_id | UUID | NOT NULL | - | 組織ID（マルチテナント分離、複合主キー） |
| project_id | UUID | NOT NULL | uuid_generate_v4() | プロジェクトID（複合主キー） |
| project_name | VARCHAR(255) | NULL | - | プロジェクト名 |
| description | TEXT | NULL | - | プロジェクト説明 |
| department_id | UUID | NULL | - | 部門ID |
| owner_user_id | UUID | NULL | - | 所有者ユーザーID |
| project_status | NUMERIC(2,0) | NULL | - | プロジェクトステータス（0-5） |
| project_maiml_flg | BOOLEAN | NULL | - | プロジェクトMaiml有無 |
| checkout_status | NUMERIC(2,0) | NULL | - | チェックアウトステータス（0-1） |
| create_at | TIMESTAMP | NULL | - | 作成日時 |

**主キー**: `(organization_id, project_id)`

**インデックス**:
- `organization_id`
- `project_id`
- `project_status`

#### project_instruction テーブル（プロジェクト指示）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|----------|------|
| organization_id | UUID | NOT NULL | - | 組織ID（複合主キー） |
| project_id | UUID | NOT NULL | - | プロジェクトID（複合主キー） |
| experiment_instruction_id | VARCHAR(255) | NOT NULL | - | 指示ID（複合主キー） |
| instruction_target | NUMERIC(2,0) | NULL | - | 指示対象（1:ファイル全体、2:タスク、3:トランジション） |
| priority | NUMERIC(2,0) | NULL | - | 優先度 |
| type | NUMERIC(2,0) | NULL | - | タイプ |
| task_no | NUMERIC(3,0) | NULL | - | タスク連番 |
| transition_id | VARCHAR(255) | NULL | - | トランジションID |
| instructions | TEXT | NULL | - | 指示内容 |
| instruction_user_id | UUID | NULL | - | 指示作成者ID |
| instruction_date | TIMESTAMP | NULL | - | 指示作成日時 |

**主キー**: `(organization_id, project_id, experiment_instruction_id)`

**インデックス**:
- `organization_id`
- `project_id`
- `experiment_instruction_id`

#### project_task テーブル（プロジェクトタスク）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|----------|------|
| organization_id | UUID | NOT NULL | - | 組織ID（複合主キー） |
| project_id | UUID | NOT NULL | - | プロジェクトID（複合主キー） |
| method_id | VARCHAR(255) | NOT NULL | - | メソッドID（複合主キー） |
| task_name | VARCHAR(255) | NULL | - | タスク名 |
| experiment_order | NUMERIC(2,0) | NULL | - | 実験順序 |
| experiment_condition | NUMERIC(2,0) | NULL | - | 実験条件 |
| attempts_count | NUMERIC(3,0) | NULL | - | 試行回数 |

**主キー**: `(organization_id, project_id, method_id)`

**インデックス**:
- `organization_id`
- `project_id`
- `method_id`

**外部キー**:
- `(organization_id, project_id)` → `project(organization_id, project_id)`

#### project_task_detail テーブル（プロジェクトタスク詳細）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|----------|------|
| organization_id | UUID | NOT NULL | - | 組織ID（複合主キー） |
| project_id | UUID | NOT NULL | - | プロジェクトID（複合主キー） |
| method_id | VARCHAR(255) | NOT NULL | - | メソッドID（複合主キー） |
| task_no | NUMERIC(3,0) | NOT NULL | - | タスク連番（複合主キー） |
| task_status | NUMERIC(2,0) | NULL | - | タスクステータス（0-4） |
| experiment_start_at | TIMESTAMP | NULL | - | 実験開始日時 |
| experiment_end_at | TIMESTAMP | NULL | - | 実験終了日時 |
| experiment_user_id | UUID | NULL | - | 実験作業者ID |
| reviewed_at | TIMESTAMP | NULL | - | レビュー完了日時 |
| review_user_id | UUID | NULL | - | レビュアーID |

**主キー**: `(organization_id, project_id, method_id, task_no)`

**インデックス**:
- `organization_id`
- `project_id`
- `method_id`
- `task_status`
- `experiment_user_id`

**外部キー**:
- `(organization_id, project_id, method_id)` → `project_task(organization_id, project_id, method_id)`

### 3.2 リレーション

```
project (1) ─┬─ (N) project_instruction
             ├─ (N) project_task (1) ─── (N) project_task_detail
             └─ (N) file_metadata (S3ファイル管理)

organization (1) ─── (N) project
organization_user (1) ─── (N) project_task_detail (experiment_user_id)
```

### 3.3 ステータス値の定義

#### project_status（プロジェクトステータス）

| 値 | 名称 | 説明 |
|----|------|------|
| 0 | プロジェクト計画中 | プロジェクトの計画段階 |
| 1 | タスク実行待ち | タスクの実行を待機中 |
| 2 | タスク実行中 | タスクが実行中 |
| 3 | タスク結果レビュー待ち | タスク結果のレビュー待ち |
| 4 | プロジェクト完了 | プロジェクトが完了 |
| 5 | タスク異常終了 | タスクが異常終了 |

#### checkout_status（チェックアウトステータス）

| 値 | 名称 | 説明 |
|----|------|------|
| 0 | チェックイン中 | プロジェクトがチェックイン中 |
| 1 | チェックアウト済 | プロジェクトがチェックアウト済 |

#### task_status（タスクステータス）

| 値 | 名称 | 説明 |
|----|------|------|
| 0 | 実行待ち | タスクの実行を待機中 |
| 1 | 実行中 | タスクが実行中 |
| 2 | レビュー待ち | タスク結果のレビュー待ち |
| 3 | 完了 | タスクが完了 |
| 4 | 異常終了 | タスクが異常終了 |

#### instruction_priority（優先度）

| 値 | 名称 | 説明 |
|----|------|------|
| 0 | 低 | 優先度が低い指示 |
| 1 | 通常 | 通常の優先度 |
| 2 | 中 | 優先度が中程度の指示 |
| 3 | 高 | 優先度が高い指示 |

#### instruction_type（指示タイプ）

| 値 | 名称 | 説明 |
|----|------|------|
| 0 | 一般 | 一般的な指示 |
| 1 | セットアップ | セットアップに関する指示 |
| 2 | 測定 | 測定に関する指示 |
| 3 | 安全 | 安全に関する指示 |
| 4 | 清掃 | 清掃に関する指示 |

#### instruction_target（指示対象）

| 値 | 名称 | 説明 |
|----|------|------|
| 0 | ファイル全体 | プロジェクト全体への指示 |
| 1 | 特定タスク | 特定タスクへの指示 |
| 2 | 特定トランジション | 特定トランジションへの指示 |

### 3.4 マルチテナント設計

#### 必須事項
- すべてのテーブルに `organization_id` カラムが存在
- すべてのテーブルで `organization_id` が複合主キーの一部
- すべてのクエリで `organization_id` フィルタが必須
- クロステナントアクセスは厳禁（System Adminを除く）

#### 外部キー制約
外部キー制約には必ず `organization_id` を含める：
```sql
FOREIGN KEY (organization_id, project_id, method_id)
REFERENCES project_task(organization_id, project_id, method_id)
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

# Requirements Document

## Project Description (Input)
ファイルダウンロード機能実装

## Introduction
本仕様書は、mmdpfシステム・プロジェクト管理画面におけるファイルダウンロード機能の要件を定義します。この機能は、S3/Swiftに保存されたプロジェクトファイル（MAIMLファイル、アーカイブファイル、その他の添付ファイル）を安全にダウンロードするための署名付きURLを生成し、マルチテナント分離を維持しながらファイルアクセスを提供します。

**対象画面**: プロジェクト管理画面（Experiment Admin）
- **FileListTable.tsx**: ファイル一覧の各行に「ダウンロード」ボタン（単一ファイルダウンロード）
- **ProjectManagement.tsx**: ツールバーに「プロジェクトダウンロード」ボタン（全ファイル一括ダウンロード）

**対応API**: 
- `GET /api/v1/projects/:projectId/files/:fileName/download` - 単一ファイルダウンロード（新規実装）
- `GET /api/v1/projects/:projectId/files/download-all` - プロジェクト一括ダウンロード（新規実装）

**関連API**: `POST /api/v1/projects/:projectId/files/upload`（セクション2.7: ファイルアップロード）

## Requirements

### Requirement 1: 署名付きURLの生成
**Objective:** システム利用者として、S3上のファイルに安全にアクセスするための一時的なダウンロードURLを取得できるようにしたい

#### Acceptance Criteria
1. When ユーザーがファイルダウンロードをリクエストしたとき、the ファイルダウンロードAPI shall S3署名付きURL（Pre-signed URL）を生成する
2. The ファイルダウンロードAPI shall 署名付きURLの有効期限を1時間（3600秒）に設定する
3. The ファイルダウンロードAPI shall 署名付きURLにorganization_prefixが含まれることを検証する
4. When 署名付きURL生成に成功したとき、the ファイルダウンロードAPI shall URLをレスポンスボディに含めて返却する
5. The ファイルダウンロードAPI shall 署名付きURLにセキュリティトークン（AWS署名情報）を付加する

### Requirement 2: ファイルパスの検証とセキュリティ
**Objective:** システム管理者として、マルチテナント分離を維持し、不正なファイルアクセスを防止したい

#### Acceptance Criteria
1. The ファイルダウンロードAPI shall リクエストされたファイルパスがユーザーの所属組織のファイルであることを検証する
2. When ユーザーが他組織のファイルにアクセスしようとしたとき、the ファイルダウンロードAPI shall 403 Forbiddenエラーを返却する
3. The ファイルダウンロードAPI shall ファイルパスにorganization_prefix（`org_{organization_id}`）が含まれることを強制する
4. If ファイルパスがパストラバーサル攻撃を含む場合、then the ファイルダウンロードAPI shall 400 Bad Requestエラーを返却する
5. The ファイルダウンロードAPI shall リクエストされたファイルがプロジェクトに紐づいていることを確認する

### Requirement 3: プロジェクトアクセス権限の確認
**Objective:** システム利用者として、自分がアクセス権限を持つプロジェクトのファイルのみダウンロードできるようにしたい

#### Acceptance Criteria
1. When Manager権限のユーザーがファイルダウンロードをリクエストしたとき、the ファイルダウンロードAPI shall 自組織のプロジェクトファイルへのアクセスを許可する
2. When Worker権限のユーザーがファイルダウンロードをリクエストしたとき、the ファイルダウンロードAPI shall 割り当てられたプロジェクトのファイルのみアクセスを許可する
3. When System Admin権限のユーザーがファイルダウンロードをリクエストしたとき、the ファイルダウンロードAPI shall 全組織のプロジェクトファイルへのアクセスを許可する
4. If ユーザーがアクセス権限を持たないプロジェクトのファイルをリクエストした場合、then the ファイルダウンロードAPI shall 403 Forbiddenエラーを返却する
5. The ファイルダウンロードAPI shall projectテーブルとorganization_userテーブルを結合してアクセス権限を確認する

### Requirement 4: ファイル種別の対応
**Objective:** システム利用者として、様々な種類のファイル（MAIMLファイル、アーカイブ、その他添付ファイル）をダウンロードできるようにしたい

#### Acceptance Criteria
1. When ユーザーが現在のMAIMLファイル（`{project_name}.maiml`）をリクエストしたとき、the ファイルダウンロードAPI shall `projects/{project_name}/{project_name}.maiml`パスの署名付きURLを生成する
2. When ユーザーがアーカイブMAIMLファイル（`{project_name}_v{version}.maiml`）をリクエストしたとき、the ファイルダウンロードAPI shall `projects/{project_name}/archive/{project_name}_v{version}.maiml`パスの署名付きURLを生成する
3. When ユーザーがCSV、JSON、TXT、PDF等の添付ファイルをリクエストしたとき、the ファイルダウンロードAPI shall 該当するファイルパスの署名付きURLを生成する
4. The ファイルダウンロードAPI shall 画像ファイル（.png, .jpg, .jpeg, .gif, .tif, .tiff, .bmp, .svg, .webp）のダウンロードをサポートする
5. The ファイルダウンロードAPI shall レスポンスにファイルの`Content-Type`ヘッダー情報を含める

### Requirement 5: ファイル存在確認
**Objective:** システム利用者として、存在しないファイルのダウンロード試行時に明確なエラーメッセージを受け取りたい

#### Acceptance Criteria
1. When ユーザーがファイルダウンロードをリクエストしたとき、the ファイルダウンロードAPI shall S3/Swift上でファイルの存在を確認する
2. If リクエストされたファイルがS3/Swift上に存在しない場合、then the ファイルダウンロードAPI shall 404 Not Foundエラーを返却する
3. When ファイルが存在しないとき、the ファイルダウンロードAPI shall エラーメッセージに「ファイルが見つかりません」と含める
4. The ファイルダウンロードAPI shall file_metadataテーブルでファイルメタデータの存在も確認する
5. If file_metadataテーブルにレコードが存在するがS3上にファイルが存在しない場合、then the ファイルダウンロードAPI shall 500 Internal Server Errorエラーを返却する

### Requirement 6: ダウンロード履歴の記録
**Objective:** システム管理者として、ファイルダウンロード履歴を監査ログとして記録したい

#### Acceptance Criteria
1. When ファイルダウンロード用署名付きURLが生成されたとき、the ファイルダウンロードAPI shall ダウンロード履歴をログに記録する
2. The ファイルダウンロードAPI shall ログにユーザーID、組織ID、プロジェクトID、ファイル名、タイムスタンプを含める
3. The ファイルダウンロードAPI shall ログにリクエストID（X-Request-Id）を含める
4. When 管理者権限のユーザーがダウンロードしたとき、the ファイルダウンロードAPI shall admin_audit_logテーブルに監査ログを記録する
5. The ファイルダウンロードAPI shall ログレベルを`info`に設定してWinstonでログ出力する

### Requirement 7: エラーハンドリングとレスポンス
**Objective:** 開発者として、一貫したエラーハンドリングとレスポンス形式でAPIを実装したい

#### Acceptance Criteria
1. When 認証エラーが発生したとき、the ファイルダウンロードAPI shall 401 Unauthorizedとエラーコード`AUTH_TOKEN_INVALID`を返却する
2. When 権限エラーが発生したとき、the ファイルダウンロードAPI shall 403 Forbiddenとエラーコード`PERMISSION_INSUFFICIENT`を返却する
3. When ファイルが見つからないとき、the ファイルダウンロードAPI shall 404 Not Foundとエラーコード`RESOURCE_NOT_FOUND`を返却する
4. When S3アクセスエラーが発生したとき、the ファイルダウンロードAPI shall 500 Internal Server Errorとエラーコード`SYSTEM_S3_ERROR`を返却する
5. The ファイルダウンロードAPI shall すべてのレスポンスに`success`、`data`または`error`、`meta`フィールドを含める

### Requirement 8: パフォーマンスとスケーラビリティ
**Objective:** システム運用者として、高速で信頼性の高いファイルダウンロードサービスを提供したい

#### Acceptance Criteria
1. The ファイルダウンロードAPI shall 署名付きURL生成処理を200ms以内に完了する
2. When 同一ファイルへの複数リクエストがあったとき、the ファイルダウンロードAPI shall 署名付きURLを個別に生成する（キャッシュしない）
3. The ファイルダウンロードAPI shall storageService.getSignedUrl関数を使用してS3/Swift署名付きURLを生成する
4. The ファイルダウンロードAPI shall 並列リクエスト（100 req/sec以上）を処理できる
5. The ファイルダウンロードAPI shall タイムアウトを30秒に設定する

### Requirement 9: APIリクエストとレスポンス形式
**Objective:** フロントエンド開発者として、明確なAPIインターフェースでファイルダウンロード機能を実装したい

#### Acceptance Criteria
1. The ファイルダウンロードAPI shall エンドポイントを`GET /api/v1/projects/:projectId/files/:fileName/download`として公開する
2. The ファイルダウンロードAPI shall リクエストヘッダーに`Authorization`（JWTトークン）と`X-Organization-Id`を必須とする
3. The ファイルダウンロードAPI shall パスパラメータ`:projectId`（UUID形式）と`:fileName`（URLエンコード済み）を受け取る
4. When ダウンロード成功時、the ファイルダウンロードAPI shall 200 OKステータスとレスポンスボディに署名付きURL、ファイルメタデータを返却する
5. The ファイルダウンロードAPI shall レスポンスボディに`signedUrl`、`fileName`、`fileSize`、`contentType`、`expiresAt`フィールドを含める

### Requirement 10: フロントエンド連携とユーザビリティ
**Objective:** システム利用者として、直感的にファイルをダウンロードできるUIを提供したい

#### Acceptance Criteria
1. When ユーザーがファイル一覧でダウンロードボタンをクリックしたとき、the フロントエンド shall ファイルダウンロードAPIを呼び出す
2. When 署名付きURLを受け取ったとき、the フロントエンド shall ブラウザの`window.open`または`<a>`タグでダウンロードを開始する
3. When ダウンロード処理中、the フロントエンド shall ローディングインジケーターを表示する
4. When ダウンロード成功時、the フロントエンド shall 成功通知メッセージを表示する
5. When ダウンロードエラー発生時、the フロントエンド shall エラーメッセージをAlert（type="error"）で表示する

### Requirement 11: マルチテナント対応とセキュリティ
**Objective:** システム管理者として、組織ごとに分離されたファイルダウンロードと適切なアクセス制御を実現したい

#### Acceptance Criteria
1. The ファイルダウンロードAPI shall ログイン情報から取得した組織IDをX-Organization-Idヘッダーから検証する
2. The ファイルダウンロードAPI shall S3パスに組織プレフィックス（`org_{organization_id}`）を強制適用する
3. When ファイルダウンロード用署名付きURLが生成されるとき、the API shall S3パスに組織プレフィックスが含まれることを確認する
4. The ファイルダウンロードAPI shall 署名付きURLの有効期限切れ後はアクセスを拒否する
5. The ファイルダウンロードAPI shall HTTPSプロトコルを使用して通信する

### Requirement 12: プロジェクト一括ダウンロード
**Objective:** システム利用者として、プロジェクト内の全ファイルを一括でダウンロードできるようにしたい

#### Acceptance Criteria
1. When ユーザーが「プロジェクトダウンロード」ボタンをクリックしたとき、the プロジェクト一括ダウンロードAPI shall プロジェクト内の全ファイルの署名付きURLリストを返却する
2. The プロジェクト一括ダウンロードAPI shall 現在のMAIMLファイル、archiveフォルダ内のファイル、その他の添付ファイルを全て含める
3. The プロジェクト一括ダウンロードAPI shall 各ファイルの署名付きURL、ファイル名、ファイルパス、ファイルサイズ、コンテンツタイプを返却する
4. When フロントエンドが署名付きURLリストを受け取ったとき、the フロントエンド shall 各ファイルを順次ダウンロードする
5. The プロジェクト一括ダウンロードAPI shall 空のプロジェクト（ファイルが0件）の場合、空の配列を返却する
6. The プロジェクト一括ダウンロードAPI shall ダウンロード対象ファイル数が100件を超える場合、ページネーション機能を提供する
7. When ダウンロード処理中にエラーが発生したとき、the フロントエンド shall エラーが発生したファイル名とエラー内容を表示する
8. The プロジェクト一括ダウンロードAPI shall プロジェクトアクセス権限を確認し、権限がない場合は403 Forbiddenエラーを返却する

## 非機能要件

### パフォーマンス
- 署名付きURL生成は200ms以内に完了する
- 同時ダウンロードリクエスト処理: 100 req/sec以上
- タイムアウト: 30秒
- 署名付きURLの有効期限: 1時間（3600秒）

### 互換性
- Chrome、Firefox、Safari、Edge の最新版に対応
- iOS Safari、Android Chrome に対応
- S3（AWS）とSwift（OpenStack）の両方をサポート
- file_metadataテーブルとの統合

### 保守性
- storageService.getSignedUrl関数を使用
- 統一されたエラーハンドリング
- ロギングとモニタリング
- TypeScriptによる型安全性

### セキュリティ
- JWT + Session Hybrid認証
- マルチテナント分離（organization_id必須）
- 署名付きURL（Pre-signed URL）の使用
- パストラバーサル攻撃の防止
- アクセス権限の厳格な検証
- 監査ログの記録

## データモデル

### file_metadata テーブル（参照）

ダウンロード対象ファイルのメタデータを参照するテーブル。

| カラム名 | 型 | NULL | 説明 |
|---------|---|------|------|
| organization_id | UUID | NOT NULL | 組織ID（複合主キー） |
| file_id | UUID | NOT NULL | ファイルID（複合主キー） |
| bucket_name | VARCHAR(255) | NULL | S3バケット名 |
| object_key | VARCHAR(1024) | NULL | S3オブジェクトキー |
| file_name | VARCHAR(255) | NULL | ファイル名 |
| file_type | VARCHAR(50) | NULL | ファイル種別（maiml, xml, csv等） |
| file_size | BIGINT | NULL | ファイルサイズ（バイト） |
| content_type | VARCHAR(100) | NULL | コンテンツタイプ |
| last_modified | TIMESTAMP | NULL | 最終更新日時 |

### S3パス構造

```
org_{organization_prefix}/projects/{project_name}/
├── {project_name}.maiml           # 現在のMAIMLファイル
├── data.csv                        # その他のファイル
├── results.json
└── archive/
    ├── {project_name}_v1.maiml    # アーカイブバージョン1
    ├── {project_name}_v2.maiml    # アーカイブバージョン2
    └── {project_name}_v3.maiml    # アーカイブバージョン3
```

## APIエンドポイント仕様

### API 1: 単一ファイルダウンロード

#### リクエスト

**エンドポイント**: `GET /api/v1/projects/:projectId/files/:fileName/download`

**パスパラメータ**:
- `projectId`: プロジェクトID（UUID形式）
- `fileName`: ファイル名（URLエンコード済み、例: `sample_project.maiml`, `sample_project_v1.maiml`, `data.csv`）

**ヘッダー**:
- `Authorization`: JWTトークン（必須）
- `X-Organization-Id`: 組織ID（UUID形式、必須）

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "signedUrl": "https://s3.amazonaws.com/bucket/org_maiml_lab_001/projects/sample_project/sample_project.maiml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Signature=...",
    "fileName": "sample_project.maiml",
    "filePath": "projects/sample_project/sample_project.maiml",
    "fileSize": 15360,
    "contentType": "application/xml",
    "expiresAt": "2026-01-19T11:50:00.000Z",
    "expiresInSeconds": 3600
  },
  "meta": {
    "timestamp": "2026-01-19T10:50:00Z",
    "requestId": "req_download_001"
  }
}
```

**エラー時**:
- `400 Bad Request`: バリデーションエラー（不正なパラメータ）
- `401 Unauthorized`: 認証エラー
- `403 Forbidden`: 権限不足（他組織のファイル、アクセス権限なし）
- `404 Not Found`: ファイルが存在しない
- `500 Internal Server Error`: S3アクセスエラー、サーバーエラー

---

### API 2: プロジェクト一括ダウンロード

#### リクエスト

**エンドポイント**: `GET /api/v1/projects/:projectId/files/download-all`

**パスパラメータ**:
- `projectId`: プロジェクトID（UUID形式）

**クエリパラメータ（オプション）**:
- `page`: ページ番号（デフォルト: 1、ファイル数が100件を超える場合に使用）
- `limit`: 1ページあたりの件数（デフォルト: 100、最大: 100）

**ヘッダー**:
- `Authorization`: JWTトークン（必須）
- `X-Organization-Id`: 組織ID（UUID形式、必須）

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "projectName": "sample_project",
    "files": [
      {
        "signedUrl": "https://s3.amazonaws.com/bucket/org_maiml_lab_001/projects/sample_project/sample_project.maiml?X-Amz-...",
        "fileName": "sample_project.maiml",
        "filePath": "projects/sample_project/sample_project.maiml",
        "fileSize": 15360,
        "contentType": "application/xml",
        "expiresAt": "2026-01-19T11:50:00.000Z"
      },
      {
        "signedUrl": "https://s3.amazonaws.com/bucket/org_maiml_lab_001/projects/sample_project/archive/sample_project_v1.maiml?X-Amz-...",
        "fileName": "sample_project_v1.maiml",
        "filePath": "projects/sample_project/archive/sample_project_v1.maiml",
        "fileSize": 14200,
        "contentType": "application/xml",
        "expiresAt": "2026-01-19T11:50:00.000Z"
      },
      {
        "signedUrl": "https://s3.amazonaws.com/bucket/org_maiml_lab_001/projects/sample_project/data.csv?X-Amz-...",
        "fileName": "data.csv",
        "filePath": "projects/sample_project/data.csv",
        "fileSize": 2048,
        "contentType": "text/csv",
        "expiresAt": "2026-01-19T11:50:00.000Z"
      }
    ],
    "totalFiles": 3,
    "totalSize": 31608,
    "expiresInSeconds": 3600
  },
  "pagination": {
    "page": 1,
    "limit": 100,
    "totalItems": 3,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-01-19T10:50:00Z",
    "requestId": "req_download_all_001"
  }
}
```

**エラー時**:
- `400 Bad Request`: バリデーションエラー（不正なパラメータ）
- `401 Unauthorized`: 認証エラー
- `403 Forbidden`: 権限不足（他組織のプロジェクト、アクセス権限なし）
- `404 Not Found`: プロジェクトが存在しない
- `500 Internal Server Error`: S3アクセスエラー、サーバーエラー

## 実装に関する注意事項

### storageServiceの使用（必須）

```typescript
import { getStorageService } from '@/services/storageService';

const storageService = getStorageService();

// 署名付きURLの生成
const signedUrl = await storageService.getSignedUrl(
  organizationPrefix,  // 'maiml_lab_001'
  filePath,            // 'projects/sample_project/sample_project.maiml'
  3600                 // 有効期限: 1時間
);
```

### パストラバーサル攻撃の防止

```typescript
// ファイル名のサニタイゼーション
const sanitizeFileName = (fileName: string): string => {
  // ../ や ..\ などを除去
  return fileName.replace(/\.\.[\/\\]/g, '');
};

// パスの検証
const isValidPath = (filePath: string): boolean => {
  // 絶対パスや相対パス記号を含まない
  return !/^\/|\.\./.test(filePath);
};
```

### organization_prefixの強制適用

```typescript
// ✅ 正しい実装
const organizationPrefix = req.organizationPrefix; // ミドルウェアで設定
const filePath = `projects/${projectName}/${fileName}`;
const signedUrl = await storageService.getSignedUrl(
  organizationPrefix,
  filePath,
  3600
);

// ❌ 間違った実装（organization_prefixなし）
const signedUrl = await s3Client.getSignedUrl({
  Key: `projects/${projectName}/${fileName}` // プレフィックスなし
});
```

### ファイル存在確認

```typescript
// S3上でファイルの存在を確認
const exists = await storageService.fileExists(
  organizationPrefix,
  filePath
);

if (!exists) {
  throw new NotFoundError('ファイルが見つかりません');
}
```

## 関連ドキュメント

- [API仕様: ファイルアップロード](../../design/api/api_project_management.md#27-ファイルアップロード) - アップロード機能の詳細仕様
- [API設計ポリシー](../../../.clinerules/development/api.md) - RESTful API設計規約
- [バックエンド規約](../../../.clinerules/development/backend.md) - Node.js開発規約
- [セキュリティ規約](../../../.clinerules/development/security.md) - マルチテナント分離の詳細
- [S3構造定義](../../../.clinerules/references/s3_structure.md) - S3フォルダ構成
- [データベース構造](../../../.clinerules/references/db_structure.md) - file_metadataテーブル

## テストケース概要

### 正常系（単一ファイルダウンロード）
- [x] 認証済みManagerによる現在のMAIMLファイルのダウンロード
- [x] 認証済みManagerによるアーカイブファイルのダウンロード
- [x] 認証済みManagerによるCSV/JSONファイルのダウンロード
- [x] Workerによる割り当てられたプロジェクトのファイルダウンロード
- [x] System Adminによる全組織のファイルダウンロード
- [x] 署名付きURLの有効期限が正しく設定される
- [x] ファイルメタデータが正しく返却される
- [x] ダウンロード履歴がログに記録される

### 正常系（プロジェクト一括ダウンロード）
- [x] 認証済みManagerによるプロジェクト内全ファイルの一括ダウンロード
- [x] 複数のファイル種別（MAIML、アーカイブ、CSV、画像等）が含まれる場合の一括ダウンロード
- [x] 空のプロジェクト（ファイル0件）の場合、空の配列が返却される
- [x] 100件を超えるファイルがある場合、ページネーション機能が正しく動作する
- [x] 各ファイルの署名付きURLが個別に生成される
- [x] 総ファイル数と総ファイルサイズが正しく計算される
- [x] フロントエンドで各ファイルを順次ダウンロードできる

### 異常系（単一ファイルダウンロード）
- [x] 未認証ユーザーによるアクセス（401エラー）
- [x] 権限不足ユーザーによるアクセス（403エラー）
- [x] 他組織のファイルへのアクセス（403エラー）
- [x] 存在しないファイルへのアクセス（404エラー）
- [x] 不正なファイル名（パストラバーサル攻撃）（400エラー）
- [x] 不正なprojectId形式（400エラー）
- [x] S3アクセスエラー（500エラー）
- [x] file_metadataにレコードが存在するがS3上にファイルがない（500エラー）

### 異常系（プロジェクト一括ダウンロード）
- [x] 未認証ユーザーによるプロジェクト一括ダウンロードアクセス（401エラー）
- [x] 権限不足ユーザーによるプロジェクト一括ダウンロードアクセス（403エラー）
- [x] 他組織のプロジェクトへのアクセス（403エラー）
- [x] 存在しないプロジェクトへのアクセス（404エラー）
- [x] 不正なpage/limitパラメータ（400エラー）
- [x] S3アクセスエラー（500エラー）
- [x] 一部のファイルでS3アクセスエラーが発生した場合、エラー情報を含めて返却する

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成（要件定義完了） | Development Team |

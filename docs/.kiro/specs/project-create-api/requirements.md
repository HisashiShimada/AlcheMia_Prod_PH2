# Requirements Document

## Introduction

本要件書は、プロジェクト管理画面におけるプロジェクト作成API（POST /api/v1/projects）のバックエンド実装に関する要件を定義します。本APIは、実験管理者（Experiment Admin）がプロジェクトを新規作成し、データベース（projectテーブル）への登録とS3上へのプロジェクトフォルダ作成を行います。

**参照API仕様**: `docs/design/api/api_project_management.md` セクション2.3

---

## Requirements

### Requirement 1: プロジェクト作成機能
**目的**: 実験管理者として、新しいプロジェクトを作成できるようにすることで、実験計画の管理を開始できるようにする

#### Acceptance Criteria (受入基準)

1. When プロジェクト作成リクエストを受信した場合、the Project Creation API shall プロジェクト名と説明を受け取り、新規プロジェクトをデータベースに登録する

2. When プロジェクトをデータベースに登録する場合、the Project Creation API shall UUID v4形式の新規プロジェクトIDを生成し、organization_id、project_name、description、owner_user_id、department_id、project_status（0）、checkout_status（0）、project_maiml_flg（false）を含む完全なレコードを作成する

3. When データベースへのプロジェクト登録が成功した場合、the Project Creation API shall S3上に `org_{organization_prefix}/projects/{project_name}/` フォルダを作成する

4. When S3フォルダ作成が失敗した場合、the Project Creation API shall データベーストランザクションをロールバックし、500エラーを返却する

5. When すべての処理が成功した場合、the Project Creation API shall 201 Created ステータスコードと作成されたプロジェクト情報（organizationId、projectId、projectName、description、projectStatus等の全フィールド）を返却する

---

### Requirement 2: 入力バリデーション
**目的**: データの整合性を保証するため、すべての入力値を適切に検証する

#### Acceptance Criteria (受入基準)

1. When リクエストボディにprojectNameフィールドが含まれていない場合、the Project Creation API shall 400 Bad Request エラー（VALIDATION_REQUIRED_FIELD）を返却する

2. When projectNameが1文字未満または255文字を超える場合、the Project Creation API shall 400 Bad Request エラー（VALIDATION_STRING_LENGTH）を返却する

3. When projectNameに不正な文字（制御文字等）が含まれる場合、the Project Creation API shall 400 Bad Request エラー（VALIDATION_INVALID_FORMAT）を返却する

4. When descriptionが指定され、かつ1000文字を超える場合、the Project Creation API shall 400 Bad Request エラー（VALIDATION_STRING_TOO_LONG）を返却する

5. When 同一組織内に同じプロジェクト名が既に存在する場合、the Project Creation API shall 409 Conflict エラー（BUSINESS_DUPLICATE_PROJECT_NAME）を返却する

6. When X-Organization-IdヘッダーがUUID形式でない場合、the Project Creation API shall 400 Bad Request エラー（VALIDATION_INVALID_FORMAT）を返却する

---

### Requirement 3: 認証・認可
**目的**: セキュリティを確保するため、適切なユーザーのみがプロジェクトを作成できるようにする

#### Acceptance Criteria (受入基準)

1. When リクエストにAuthorizationヘッダーが含まれていない場合、the Project Creation API shall 401 Unauthorized エラー（AUTH_TOKEN_INVALID）を返却する

2. When JWTトークンが無効または期限切れの場合、the Project Creation API shall 401 Unauthorized エラー（AUTH_TOKEN_EXPIRED または AUTH_TOKEN_INVALID）を返却する

3. When ユーザーのロールがWorker（experiment_worker）の場合、the Project Creation API shall 403 Forbidden エラー（PERMISSION_INSUFFICIENT）を返却する

4. When ユーザーのロールがManager（experiment_admin、data_admin）以上の場合、the Project Creation API shall プロジェクト作成処理を継続する

5. When System Adminユーザーの場合、the Project Creation API shall 任意の組織に対してプロジェクトを作成できる

---

### Requirement 4: マルチテナント分離
**目的**: 組織間のデータ分離を保証し、クロステナントアクセスを防止する

#### Acceptance Criteria (受入基準)

1. When プロジェクトを作成する場合、the Project Creation API shall リクエストヘッダーのX-Organization-Idとセッション情報のorganization_idが一致することを検証する

2. When データベースにプロジェクトを登録する場合、the Project Creation API shall 必ず検証済みのorganization_idをレコードに含める

3. When S3フォルダを作成する場合、the Project Creation API shall パスに `org_{organization_prefix}` プレフィックスを必ず含める

4. When プロジェクト名の重複チェックを行う場合、the Project Creation API shall 同一organization_id内でのみ重複を確認する（他組織の同名プロジェクトは許容）

5. The Project Creation API shall すべてのデータベースクエリにorganization_idフィルタを適用する

---

### Requirement 5: データ整合性とトランザクション管理
**目的**: データベースとS3の一貫性を保証し、部分的な失敗による不整合を防止する

#### Acceptance Criteria (受入基準)

1. When プロジェクト作成処理を開始する場合、the Project Creation API shall データベーストランザクションを開始する

2. When データベース登録が成功した場合、the Project Creation API shall S3フォルダ作成を試行する

3. If S3フォルダ作成が失敗した場合、then the Project Creation API shall データベーストランザクションをロールバックし、500 Internal Server Error（SYSTEM_S3_ERROR）を返却する

4. When すべての処理が成功した場合、the Project Creation API shall データベーストランザクションをコミットする

5. The Project Creation API shall データベースクエリにはParameterized Queries（プリペアドステートメント）を使用し、SQLインジェクションを防止する

---

### Requirement 6: デフォルト値とビジネスルール
**目的**: 新規プロジェクトに適切な初期値を設定し、ビジネスルールに従った状態管理を行う

#### Acceptance Criteria (受入基準)

1. When プロジェクトを作成する場合、the Project Creation API shall project_statusを0（プロジェクト計画中）に設定する

2. When プロジェクトを作成する場合、the Project Creation API shall checkout_statusを0（チェックイン中）に設定する

3. When プロジェクトを作成する場合、the Project Creation API shall project_maiml_flgをfalseに設定する

4. When プロジェクトを作成する場合、the Project Creation API shall owner_user_idをログインユーザーのユーザーIDに設定する

5. When プロジェクトを作成する場合、the Project Creation API shall department_idをログインユーザーの部門IDに設定する（部門が未設定の場合はNULL）

6. When プロジェクトを作成する場合、the Project Creation API shall create_atを現在日時（ISO 8601形式）に設定する

---

### Requirement 7: エラーハンドリング
**目的**: すべてのエラーケースを適切に処理し、ユーザーにわかりやすいエラーメッセージを提供する

#### Acceptance Criteria (受入基準)

1. When バリデーションエラーが発生した場合、the Project Creation API shall 400 Bad Requestとエラー詳細（フィールド名、エラー理由）を含むレスポンスを返却する

2. When 認証エラーが発生した場合、the Project Creation API shall 401 Unauthorizedとエラーコード（AUTH_TOKEN_EXPIRED または AUTH_TOKEN_INVALID）を返却する

3. When 権限エラーが発生した場合、the Project Creation API shall 403 Forbiddenとエラーコード（PERMISSION_INSUFFICIENT）を返却する

4. When プロジェクト名重複エラーが発生した場合、the Project Creation API shall 409 Conflictとエラーコード（BUSINESS_DUPLICATE_PROJECT_NAME）を返却する

5. When データベースエラーが発生した場合、the Project Creation API shall 500 Internal Server Errorとエラーコード（SYSTEM_DATABASE_ERROR）を返却し、スタックトレースを含まない安全なエラーメッセージを提供する

6. When S3エラーが発生した場合、the Project Creation API shall 500 Internal Server Errorとエラーコード（SYSTEM_S3_ERROR）を返却する

7. The Project Creation API shall すべてのエラーをログに記録し、requestId、userId、organizationId、エラー詳細を含める

---

### Requirement 8: S3統合
**目的**: プロジェクトフォルダをS3上に作成し、将来のファイル管理の基盤を提供する

#### Acceptance Criteria (受入基準)

1. When S3フォルダを作成する場合、the Project Creation API shall パス `org_{organization_prefix}/projects/{project_name}/` にフォルダを作成する

2. When S3フォルダを作成する場合、the Project Creation API shall マーカーファイル（.keepまたは空ファイル）を配置してフォルダの存在を保証する

3. When organization_prefixを取得する場合、the Project Creation API shall organizationテーブルからorganization_nameを取得し、スペースをアンダースコアに変換する

4. When project_nameに特殊文字が含まれる場合、the Project Creation API shall S3パスとして安全な文字のみを使用する

5. The Project Creation API shall storageServiceモジュールを使用してS3操作を行い、直接S3Clientを使用しない

---

### Requirement 9: レスポンス生成
**目的**: 一貫性のあるレスポンス形式でクライアントに結果を返却する

#### Acceptance Criteria (受入基準)

1. When プロジェクト作成が成功した場合、the Project Creation API shall HTTPステータス201 Createdを返却する

2. When レスポンスを生成する場合、the Project Creation API shall success: true、data（プロジェクト情報）、meta（timestamp、requestId）を含むJSON形式で返却する

3. When データベースのカラム名をレスポンスに含める場合、the Project Creation API shall スネークケース（organization_id）をキャメルケース（organizationId）に変換する

4. When プロジェクトステータスとチェックアウトステータスをレスポンスに含める場合、the Project Creation API shall code_masterテーブルから名称（projectStatusName、checkoutStatusName）を取得して含める

5. When レスポンスを生成する場合、the Project Creation API shall UUID v4形式のrequestIdを生成し、metaオブジェクトに含める

6. The Project Creation API shall レスポンスに作成されたプロジェクトの全フィールド（organizationId、projectId、projectName、description、departmentId、ownerUserId、projectStatus、projectStatusName、projectMaimlFlg、checkoutStatus、checkoutStatusName、createAt）を含める

---

### Requirement 10: パフォーマンスとスケーラビリティ
**目的**: APIレスポンスタイムを適切な範囲に保ち、スケーラブルなシステムを実現する

#### Acceptance Criteria (受入基準)

1. The Project Creation API shall 目標レスポンスタイム300ms以内で処理を完了する

2. The Project Creation API shall 最大許容レスポンスタイム1000ms以内で処理を完了する

3. When 並列リクエストを処理する場合、the Project Creation API shall データベース接続プールを使用し、最大20接続を超えないようにする

4. When トランザクションを開始する場合、the Project Creation API shall トランザクションの保持時間を最小限（5秒以内）に抑える

5. The Project Creation API shall 不要なデータベースクエリを削減し、必要最小限のクエリで処理を完了する

---

## Summary

本要件書は、プロジェクト作成API実装に必要な10の主要要件領域を定義しました：

1. **プロジェクト作成機能**: データベースとS3への一貫した登録
2. **入力バリデーション**: データ整合性の保証
3. **認証・認可**: セキュアなアクセス制御
4. **マルチテナント分離**: 組織間データ分離
5. **データ整合性**: トランザクション管理
6. **デフォルト値**: ビジネスルールに基づく初期値設定
7. **エラーハンドリング**: 適切なエラー処理と通知
8. **S3統合**: ファイル管理基盤の構築
9. **レスポンス生成**: 統一されたAPI応答形式
10. **パフォーマンス**: スケーラブルな実装

すべての要件はEARS形式で記述され、テスト可能かつ検証可能です。

# Requirements Document

## Project Description (Input)
プロジェクトリロードAPI実装

## Introduction

本要件定義書は、プロジェクト管理システムにおけるプロジェクトリロードAPI機能の要件を定義します。

### 背景
プロジェクト詳細画面には「ファイル一覧タブ」と「タスク一覧タブ」があり、ユーザーはこれらを切り替えて情報を確認します。プロジェクトフォルダ内のファイルは外部から直接アップロードされることがあり、タスク情報は他のユーザーによって更新されることがあります。このような場合、画面に表示されている情報が最新の状態と乖離する可能性があります。

### 目的
プロジェクトリロード機能は、現在開いているタブの情報を最新化することを目的とします。ファイル一覧タブではS3上の最新ファイル状態を、タスク一覧タブではデータベース上の最新タスク状態を再取得します。キャッシュをクリアして最新情報を表示することで、ユーザーは常に正確な情報を確認できます。

### 対象ユーザー
- 実験管理者（Experiment Admin）
- データ管理者（Data Admin）
- システム管理者（System Admin）

## Requirements

### Requirement 1: データの再読み込み

**Objective:** 実験管理者として、現在表示中のタブの最新情報を確認したいため、開いているタブに応じてファイル一覧またはタスク一覧を再取得できる

#### Acceptance Criteria
1. When ファイル一覧タブが開いている状態でリロードされた時、Project Reload API shall 指定されたプロジェクトのS3フォルダから全ファイル情報を取得する
2. When タスク一覧タブが開いている状態でリロードされた時、Project Reload API shall データベースから最新のタスク一覧情報を取得する
3. The Project Reload API shall プロジェクトフォルダ配下の全ファイル（サブフォルダ含む）を再帰的に取得する
4. When ファイル一覧取得が完了した時、Project Reload API shall 各ファイルのメタデータ（ファイル名、サイズ、最終更新日時、コンテンツタイプ）を取得する
5. When タスク一覧取得が完了した時、Project Reload API shall 各タスクの情報（タスクステータス、実験作業者、実験期間、レビュー情報）を取得する
6. If S3上にファイルが存在しない場合、then Project Reload API shall 空のファイル一覧を返却し、エラーとしない
7. If データベースにタスクが存在しない場合、then Project Reload API shall 空のタスク一覧を返却し、エラーとしない
8. The Project Reload API shall organization_prefixを含むS3パスでファイルを取得する（マルチテナント分離）
9. The Project Reload API shall organization_idでフィルタしてタスクを取得する（マルチテナント分離）

### Requirement 2: キャッシュクリア

**Objective:** 実験管理者として、古い情報を表示したくないため、プロジェクトに関連するキャッシュをクリアできる

#### Acceptance Criteria
1. When プロジェクトリロードが実行される時、Project Reload API shall 該当プロジェクトのファイル一覧キャッシュとタスク一覧キャッシュをクリアする
2. When キャッシュクリアが完了した時、Project Reload API shall 次回のプロジェクト詳細取得時に最新データを返却する
3. The Project Reload API shall organization_id単位でキャッシュを管理する（他組織のキャッシュに影響を与えない）
4. While リロード処理中の場合、Project Reload API shall 同時実行される他のリクエストに対してキャッシュなしでデータを取得する
5. The Project Reload API shall ファイル一覧とタスク一覧のキャッシュを独立して管理する

### Requirement 3: メタデータ更新

**Objective:** システム管理者として、ファイルメタデータを最新化したいため、file_metadataテーブルを更新できる

#### Acceptance Criteria
1. When 新しいファイルがS3上で検出された時、Project Reload API shall file_metadataテーブルに新規レコードを作成する
2. When 既存ファイルのメタデータが変更されている時、Project Reload API shall file_metadataテーブルの該当レコードを更新する
3. When S3上からファイルが削除されている時、Project Reload API shall file_metadataテーブルの該当レコードを論理削除する
4. The Project Reload API shall ファイルメタデータの更新をトランザクション管理する
5. If メタデータ更新中にエラーが発生した場合、then Project Reload API shall ロールバックし、エラーレスポンスを返却する

### Requirement 4: 認証・認可

**Objective:** システム全体として、セキュリティを確保するため、適切な認証・認可制御を実施する

#### Acceptance Criteria
1. The Project Reload API shall JWTトークンとセッションによるハイブリッド認証を実施する
2. When 未認証ユーザーがアクセスした時、Project Reload API shall 401 Unauthorizedエラーを返却する
3. The Project Reload API shall Manager以上の権限を持つユーザーのみアクセスを許可する
4. When 権限不足のユーザーがアクセスした時、Project Reload API shall 403 Forbiddenエラーを返却する
5. The Project Reload API shall ユーザーの所属組織のプロジェクトのみアクセスを許可する（System Adminを除く）
6. When 他組織のプロジェクトにアクセスしようとした時、Project Reload API shall 403 Forbiddenエラーを返却する

### Requirement 5: エラーハンドリング

**Objective:** 開発者として、エラー発生時に適切な対応ができるため、明確なエラー情報を取得できる

#### Acceptance Criteria
1. When プロジェクトが存在しない時、Project Reload API shall 404 Not Foundエラーを返却する
2. If S3アクセス中にエラーが発生した場合、then Project Reload API shall 500 Internal Server Errorエラーとエラー詳細を返却する
3. If データベースエラーが発生した場合、then Project Reload API shall 500 Internal Server Errorエラーとエラー詳細を返却する
4. When バリデーションエラーが発生した時、Project Reload API shall 400 Bad Requestエラーと詳細なエラー情報を返却する
5. The Project Reload API shall エラー発生時にリクエストIDを含むレスポンスを返却する
6. The Project Reload API shall エラー内容をログに記録する（機密情報を除く）

### Requirement 6: パフォーマンス

**Objective:** ユーザーとして、快適に操作したいため、リロード処理を適切な時間内で完了させる

#### Acceptance Criteria
1. The Project Reload API shall 通常のプロジェクト（ファイル数100件以下）のファイル一覧リロードを3秒以内に完了する
2. The Project Reload API shall 大規模プロジェクト（ファイル数1000件以下）のファイル一覧リロードを10秒以内に完了する
3. The Project Reload API shall 通常のプロジェクト（タスク数100件以下）のタスク一覧リロードを2秒以内に完了する
4. The Project Reload API shall 大規模プロジェクト（タスク数1000件以下）のタスク一覧リロードを5秒以内に完了する
5. When 大量ファイルを処理する時、Project Reload API shall バッチ処理またはページング処理で対応する
6. The Project Reload API shall 並列処理によりS3アクセスを最適化する
7. When タイムアウトが発生した時、Project Reload API shall 504 Gateway Timeoutエラーを返却する

### Requirement 7: ログとモニタリング

**Objective:** 運用担当者として、システムの状態を把握するため、適切なログとメトリクスを記録する

#### Acceptance Criteria
1. When リロード処理が開始された時、Project Reload API shall 開始ログを記録する（projectId, organizationId, userId, reloadTarget）
2. When リロード処理が完了した時、Project Reload API shall 完了ログと処理時間を記録する
3. When エラーが発生した時、Project Reload API shall エラーログとスタックトレースを記録する
4. The Project Reload API shall ファイルリロード時に処理されたファイル数、追加数、更新数、削除数をメトリクスとして記録する
5. The Project Reload API shall タスクリロード時に処理されたタスク数をメトリクスとして記録する
6. The Project Reload API shall レスポンスタイムをメトリクスとして記録する
7. The Project Reload API shall リロード対象（files/tasks）をログに記録する

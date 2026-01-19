# Requirements Document

## Project Description (Input)
ファイルアップロードダイアログ実装

## Introduction
本仕様書は、mmdpfシステム・プロジェクト管理画面における一括ファイルアップロードダイアログコンポーネントの要件を定義します。このダイアログは、単一ファイル・一括ファイル・フォルダの3つのアップロードモードをサポートし、プロジェクトフォルダへのファイルアップロードを効率化します。

**対象画面**: プロジェクト管理画面（Experiment Admin）
**既存実装**: `frontend/src/components/project/BulkUploadDialog.tsx`
**対応API**: `POST /api/v1/projects/:projectId/files/upload`（api_project_management.md 2.7節）

## Requirements

### Requirement 1: アップロードモード選択と切り替え
**Objective:** システム利用者として、ファイルアップロードの用途に応じて適切なモードを選択できるようにしたい

#### Acceptance Criteria
1. The ファイルアップロードダイアログ shall Segmentedコンポーネントで3つのモード（単一ファイル/一括ファイル/フォルダ）を表示する
2. When ユーザーがモードを切り替えたとき、the ファイルアップロードダイアログ shall 選択済みファイルリストとバッチ名をクリアする
3. When ユーザーが単一ファイルモードを選択したとき、the ファイルアップロードダイアログ shall 1つのファイルのみ選択可能にする
4. When ユーザーが一括ファイルモードを選択したとき、the ファイルアップロードダイアログ shall 複数ファイルの同時選択を可能にする
5. When ユーザーがフォルダモードを選択したとき、the ファイルアップロードダイアログ shall フォルダ選択ボタンを表示し、ドラッグ&ドロップを無効化する

### Requirement 2: ファイル選択機能（単一/一括）
**Objective:** システム利用者として、ドラッグ&ドロップまたはクリックで効率的にファイルを選択できるようにしたい

#### Acceptance Criteria
1. When ユーザーがドロップエリアをクリックしたとき、the ファイルアップロードダイアログ shall システムのファイル選択ダイアログを表示する
2. When ユーザーがファイルをドロップエリアにドラッグ&ドロップしたとき、the ファイルアップロードダイアログ shall ドロップされたファイルを選択リストに追加する
3. When 単一ファイルモードでファイルが選択されたとき、the ファイルアップロードダイアログ shall バッチ名を「単一アップロード: {ファイル名}」に自動設定する
4. When 一括ファイルモードで複数ファイルが選択されたとき、the ファイルアップロードダイアログ shall バッチ名を「一括アップロード {件数}ファイル」に自動設定する
5. The ファイルアップロードダイアログ shall 許可されたファイル形式（.maiml, .xml, .json, .txt, .csv, .png, .jpg, .jpeg, .gif, .pdf, .tif, .tiff, .bmp, .svg, .webp）のみ選択可能にする

### Requirement 3: フォルダ選択機能
**Objective:** システム利用者として、フォルダ階層を保持したまま複数ファイルをアップロードできるようにしたい

#### Acceptance Criteria
1. When ユーザーがフォルダモードでフォルダ選択ボタンをクリックしたとき、the ファイルアップロードダイアログ shall ブラウザのフォルダ選択ダイアログを表示する
2. When ユーザーがフォルダを選択したとき、the ファイルアップロードダイアログ shall フォルダ内の全ファイルをwebkitRelativePathと共に選択リストに追加する
3. When フォルダが選択されたとき、the ファイルアップロードダイアログ shall バッチ名を「フォルダアップロード: {フォルダ名}」に自動設定する
4. The ファイルアップロードダイアログ shall フォルダモード時にフォルダ構造保持オプションをデフォルトでtrueに設定する
5. When ユーザーがフォルダ構造保持オプションをfalseに変更したとき、the ファイルアップロードダイアログ shall アップロード時にファイルをフラット化する

### Requirement 4: 階層的アップロード先選択
**Objective:** システム利用者として、組織・部門・プロジェクトの階層構造でアップロード先を選択できるようにしたい

#### Acceptance Criteria
1. The ファイルアップロードダイアログ shall 所属組織を固定値として画面上部に表示する
2. When ユーザーがCascaderを開いたとき、the ファイルアップロードダイアログ shall 部門（dept_xxx）→ プロジェクト（project_xxx）の2階層構造を表示する
3. When 単一ファイルモードのとき、the ファイルアップロードダイアログ shall プロジェクトまで選択を必須とする（changeOnSelect=false）
4. When 一括ファイル・フォルダモードのとき、the ファイルアップロードダイアログ shall 部門レベルでも選択可能にする（changeOnSelect=true）
5. When ユーザーがフォルダパスを選択したとき、the ファイルアップロードダイアログ shall 選択パスを「org_{organization_id}/{dept}/{project}」形式で画面に表示する

### Requirement 5: 選択ファイル一覧表示
**Objective:** システム利用者として、選択したファイルの詳細を確認してからアップロードできるようにしたい

#### Acceptance Criteria
1. When ファイルが選択されたとき、the ファイルアップロードダイアログ shall ファイル名とサイズをリスト形式で表示する
2. When 選択ファイルが10件以下のとき、the ファイルアップロードダイアログ shall 全ファイルを表示する
3. When 選択ファイルが11件以上のとき、the ファイルアップロードダイアログ shall 最初の10件を表示し、残りは「他 {件数} ファイル...」と省略表示する
4. The ファイルアップロードダイアログ shall 選択ファイルの総サイズを人間が読める形式（Bytes, KB, MB, GB）で表示する
5. The ファイルアップロードダイアログ shall ファイル名が長い場合は省略記号（...）で省略し、ホバー時にフルパスをtooltipで表示する

### Requirement 6: アップロード処理と進捗表示
**Objective:** システム利用者として、アップロード処理の進行状況をリアルタイムで確認できるようにしたい

#### Acceptance Criteria
1. When ユーザーがアップロード開始ボタンをクリックしたとき、the ファイルアップロードダイアログ shall APIに対してmultipart/form-data形式でリクエストを送信する
2. While ファイルアップロード処理中、the ファイルアップロードダイアログ shall Progressコンポーネントで進捗率（0-100%）を表示する
3. While ファイルアップロード処理中、the ファイルアップロードダイアログ shall 「{完了数} / {総数} ファイル完了」を表示する
4. When 全ファイルのアップロードが完了したとき、the ファイルアップロードダイアログ shall 成功メッセージAlertを2秒間表示してから状態をリセットする
5. While アップロード処理中、the ファイルアップロードダイアログ shall アップロード開始ボタンとキャンセルボタンを無効化する

### Requirement 7: バリデーションとエラー表示
**Objective:** システム利用者として、不適切なファイルやアップロード条件でのエラーを明確に把握できるようにしたい

#### Acceptance Criteria
1. When ファイルが選択されていない状態でアップロード開始しようとしたとき、the ファイルアップロードダイアログ shall 警告メッセージ「ファイルを選択してください」を表示する
2. If ファイルサイズが100MBを超える場合、then the API shall 400エラーを返却し、ダイアログはエラーメッセージAlertを表示する
3. If ファイル数が100件を超える場合、then the API shall 400エラーを返却し、ダイアログはエラーメッセージAlertを表示する
4. If 許可されていないファイル形式が選択された場合、then the ファイルアップロードダイアログ shall ブラウザのファイル選択ダイアログで選択不可にする
5. When APIからエラーが返却されたとき、the ファイルアップロードダイアログ shall エラー内容をAlert（type="error"）で表示し、閉じるボタンで非表示にできるようにする

### Requirement 8: ダイアログ制御とユーザビリティ
**Objective:** システム利用者として、アップロード中の誤操作を防ぎつつ、柔軟にダイアログを操作できるようにしたい

#### Acceptance Criteria
1. When ユーザーがキャンセルボタンをクリックしたとき、the ファイルアップロードダイアログ shall アップロード中でない場合は即座に閉じる
2. When ユーザーがアップロード中にキャンセルボタンをクリックしたとき、the ファイルアップロードダイアログ shall 確認モーダル「アップロード処理が進行中です。キャンセルしますか？」を表示する
3. The ファイルアップロードダイアログ shall モーダル幅を800pxに設定する
4. The ファイルアップロードダイアログ shall コンテンツエリアの最大高さを70vhに制限し、オーバーフロー時はスクロール可能にする
5. The ファイルアップロードダイアログ shall Escキーでダイアログを閉じることができる（アップロード中を除く）

### Requirement 9: API連携とデータ送信
**Objective:** 開発者として、フロントエンドとバックエンド間でファイルデータを正しく送受信できるようにしたい

#### Acceptance Criteria
1. When アップロード開始時、the ファイルアップロードダイアログ shall `POST /api/v1/projects/:projectId/files/upload` エンドポイントにリクエストを送信する
2. The ファイルアップロードダイアログ shall リクエストヘッダーに Authorization（JWTトークン）とX-Organization-Idを含める
3. The ファイルアップロードダイアログ shall リクエストボディに uploadMode, targetFolder, batchName, preserveFolderStructure, files（multipart）を含める
4. When APIから201 Createdが返却されたとき、the ファイルアップロードダイアログ shall 成功処理を実行し、onUploadCompleteコールバックを呼び出す
5. When APIからエラーレスポンスが返却されたとき、the ファイルアップロードダイアログ shall エラーメッセージを抽出してAlert表示する

### Requirement 10: マルチテナント対応とセキュリティ
**Objective:** システム管理者として、組織ごとに分離されたファイルストレージと適切なアクセス制御を実現したい

#### Acceptance Criteria
1. The ファイルアップロードダイアログ shall ログイン情報から取得した組織IDをX-Organization-Idヘッダーに設定する
2. The ファイルアップロードダイアログ shall 選択されたフォルダパスの先頭に組織IDプレフィックス（org_{organization_id}）を自動付与する
3. When ファイルがアップロードされたとき、the API shall S3パスに組織プレフィックスを強制適用する
4. The API shall アップロード後にfile_metadataテーブルにメタデータ（organization_id, file_id, bucket_name, object_key, file_name, file_type, file_size, content_type, metadata_json）を記録する
5. The API shall HTTPSプロトコルを使用して通信する

### Requirement 11: 親コンポーネントとの統合
**Objective:** 開発者として、ファイルアップロードダイアログを様々な画面から呼び出し、アップロード完了後の処理をカスタマイズできるようにしたい

#### Acceptance Criteria
1. The ファイルアップロードダイアログ shall open（boolean）プロパティでダイアログの表示/非表示を制御可能にする
2. The ファイルアップロードダイアログ shall onCloseコールバックでダイアログを閉じる処理を親コンポーネントに委譲する
3. The ファイルアップロードダイアログ shall onUploadCompleteコールバックでアップロード完了情報（mode, fileCount, success）を親コンポーネントに渡す
4. The ファイルアップロードダイアログ shall preselectedFolder（string）プロパティで初期選択フォルダを設定可能にする
5. When アップロード完了後、the 親コンポーネント shall onUploadCompleteコールバックを受け取り、プロジェクト一覧やファイル一覧を再取得する

## 非機能要件

### パフォーマンス
- ファイルリスト表示は200ms以内に完了する
- ダイアログの表示は500ms以内に完了する
- アップロード進捗は200ms以内に更新される
- 最大100MB/ファイル、最大100ファイルまで安定動作する

### 互換性
- Chrome、Firefox、Safari、Edge の最新版に対応
- iOS Safari、Android Chrome に対応
- Ant Design v6 のコンポーネントライブラリと統合
- webkitdirectory属性を使用したフォルダ選択に対応

### 保守性
- 単一ファイル（BulkUploadDialog.tsx）として実装される
- TypeScriptによる型安全性を確保
- Propsによる設定で再利用可能
- モックデータは開発時のみ使用し、本番環境では実APIを使用

### アクセシビリティ
- Tabキーによるフォーカス移動に対応
- Escキーでダイアログを閉じる（アップロード中を除く）
- スクリーンリーダー用のARIAラベルを全ての操作要素に設定
- ドラッグ中の視覚的フィードバック（ハイライト表示）を提供

## 実装済み機能（frontend/src/components/project/BulkUploadDialog.tsx）

✅ 3つのアップロードモード（単一/一括/フォルダ）
✅ Segmentedによるモード切り替え
✅ Draggerによるドラッグ&ドロップサポート
✅ Cascaderによる階層的フォルダ選択（組織 → 部門 → プロジェクト）
✅ ファイルリスト表示（10件まで、それ以上は省略）
✅ ファイルサイズフォーマット（formatFileSize関数）
✅ 進捗表示UI（Progress + Alert）
✅ バッチ名自動生成ロジック
✅ フォルダ構造保持オプション（Checkbox）
✅ アップロード中の閉じる確認モーダル
✅ エラー表示UI（Alert type="error"）

## 未実装機能（TODO）

⏳ 実際のAPI呼び出し処理（現在はモック動作）
⏳ APIから返却されたfile_idの受け取り
⏳ リアルタイム進捗更新（現在は擬似進捗）
⏳ ファイル名重複チェック
⏳ サーバーサイドバリデーションエラーの詳細表示
⏳ キャンセル機能（アップロード中断）
⏳ 部分的な成功時のハンドリング
⏳ アップロード履歴保存

## 関連ドキュメント

- [API仕様: ファイルアップロード](../../design/api/api_project_management.md#27-ファイルアップロード) - バックエンドAPI仕様（2.7節）
- [フロントエンド規約](../../../.clinerules/development/frontend.md) - React開発規約
- [UIポリシー](../../../.clinerules/references/ui_policy.md) - Ant Design使用規約
- [S3構造定義](../../../.clinerules/references/s3_structure.md) - S3フォルダ構成

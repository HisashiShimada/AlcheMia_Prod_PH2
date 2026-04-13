# タスク計画書: ファイルアップロード時 project_maiml_flg 更新

## メタデータ
- **作成日時**: 2026-03-31 11:56
- **タスクID**: upload-maiml-flg
- **優先度**: 中
- **推定工数**: 1〜2時間

## タスク概要

MAIMLファイル（`.maiml` または `application/xml`）をプロジェクトにアップロードした際に、`project` テーブルの `project_maiml_flg` を `true` に更新する。
通常アップロード（10MB以下）・チャンクアップロード（10MB超）の両方で対応する。

あわせて以下の追加仕様も実装する：
- **file_metadata 登録**: MAIMLファイルをアップロードした際に `file_metadata` テーブルにレコードを追加する
- **アップロード制約**: MAIMLファイルをアップロードする際、ファイル名がプロジェクト名と一致しない場合はアップロードを拒否する
- **削除時のアーカイブ連動削除**: MAIMLファイルを削除した際に、`archive/` フォルダ内のアーカイブファイルもまとめて削除する

## 目的と期待される成果

- [ ] MAIMLファイルをアップロードした場合（通常・チャンク共通）に `file_metadata` テーブルにレコードが追加される
- [ ] MAIMLファイルをアップロードした場合（通常・チャンク共通）に `project_maiml_flg` が `true` になる
- [ ] `projectId` が指定されていない場合（フォーマットアップロード等）はフラグ更新をスキップする
- [ ] `project_maiml_flg` が既に `true` の場合は不要なDB更新をスキップする
- [ ] MAIMLファイル名がプロジェクト名と一致しない場合はアップロードを拒否する
- [ ] アップロード拒否時は画面にファイル名を表示し、ログにはファイル名と失敗理由を記録する
- [ ] MAIMLファイル削除時に `archive/` フォルダ内のファイルもまとめて削除する

## 実装ステップ

### file_metadata 登録レコードの内容（通常・チャンク共通）

`FileMetadataRepository.insertFileMetadata()` に渡すデータの内容：

| カラム | 値 | 備考 |
|---|---|---|
| `file_key` | `{organizationId}/projects/{projectName}/{fileName}` | ストレージ保存後のS3キー |
| `s3_bucket` | バケット名 | ストレージサービスから取得 |
| `organization_id` | リクエストユーザーの組織ID | 認証ミドルウェアから取得 |
| `original_filename` | `sample_project.maiml` | アップロードファイル名 |
| `file_size` | ファイルバイト数 | アップロード時のファイル情報 |
| `file_type` | `application/xml` | MAIMLファイル固定 |
| `is_maiml_file` | `true` | MAIMLファイル固定 |
| `uploaded_by` | ログインユーザーID | 認証ミドルウェアから取得 |
| `create_user_id` | ログインユーザーID | 監査証跡 |
| `update_user_id` | ログインユーザーID | 監査証跡 |
| `parent_folder_path` | `{organizationId}/projects/{projectName}` | 階層管理用 |
| `upload_source` | `web_upload` | アップロード元 |
| `upload_method` | 通常: `single` / チャンク: `multipart` | アップロード方法 |
| `upload_batch_id` | 新規生成UUID | バックエンドで生成。単一ファイルでも1ファイル=1バッチとしてUUIDを生成（一括・フォルダアップロード時は同一IDを共有） |
| `maiml_metadata_extraction_status` | `pending` | アップロード直後は未解析のため `pending` 固定 |
| `file_hash` | SHA-256ハッシュ値 | アップロード時にファイル内容が手元にあるため計算して設定する（重複検出に使用） |

---

### 通常アップロード（10MB以下）
- [ ] `backend/src/services/fileAccessService.ts` の `uploadFiles()` を修正
  - MAIMLファイル（`isMaimlFile()` が `true`）の場合のみ `file_metadata` テーブルへの登録処理を実施する（CSV・ZIP等の非MAIMLファイルは登録しない）
  - ストレージ保存成功後、`FileMetadataRepository.insertFileMetadata()` を呼び出して `file_metadata` テーブルに上記レコードを追加する
  - `file_metadata` INSERT失敗時は警告ログのみ出力し、ストレージをロールバックせず処理続行する（**仕様変更**: 当初はロールバックを予定していたが、MAIMLのみ登録とする設計変更に伴い非MAIMLファイルのロールバック問題を回避するため変更）
  - アップロードされたファイルの中にMAIMLファイルが含まれており、かつ `targetPath` が `projects/` で始まる場合に `project_maiml_flg` 更新処理を実行する（`metadata.projectId` は使用しない）
  - `targetPath` から `projects/{projectName}` の形式でプロジェクト名を抽出し、`projectRepository.findByName()` でプロジェクトを取得する
  - `project_maiml_flg` が `false` または `null` の場合のみ `projectRepository.update({ ...existingProject, project_maiml_flg: true })` を呼び出す
  - フラグ更新失敗時は警告ログのみ出力し、ファイルアップロードは成功として処理を続行する（ロールバックなし）

### チャンクアップロード（10MB超）
- [ ] `backend/src/controllers/fileAccessController.ts` の `completeChunkUpload()` を修正
  - チャンク結合・ストレージ保存成功後、`FileMetadataRepository.insertFileMetadata()` を呼び出して `file_metadata` テーブルにレコードを追加する
  - `file_metadata` INSERT失敗時は `storageService.deleteFile()` でストレージ上のファイルをロールバックしてエラーを返す
  - `result.fileKey` が `projects/` で始まる かつ MAIMLファイル（`.maiml`）の場合のみ `project_maiml_flg` 更新処理を実行する（`projectId` 指定は不要。`projects/` 以外のパスは自動的にスキップ）
  - `result.fileKey` から `projects/{projectName}` の形式でプロジェクト名を抽出し、`projectRepository.findByName()` でプロジェクトを取得する
  - `project_maiml_flg` が `false` または `null` の場合のみ `projectRepository.update({ ...existingProject, project_maiml_flg: true })` を呼び出す
  - フラグ更新失敗時は警告ログのみ出力し、ファイルアップロードは成功として処理を続行する（ロールバックなし）

### MAIMLアップロード制約（通常・チャンクアップロード共通）
- [ ] `backend/src/services/fileAccessService.ts` にMAIML用バリデーション処理を追加（通常アップロード）
  - `.maiml` ファイルかつ `targetPath` が `projects/` で始まる場合に以下を検証する
  - **ファイル名チェック**: アップロードファイル名（拡張子除く）がプロジェクト名と一致しない場合はアップロードを拒否する
    - エラー時: 画面にはファイル名を表示、ログにはファイル名と「ファイル名がプロジェクト名と一致しません」を記録する
  - バリデーションエラーのHTTPステータスは **400**、エラーコードは **E1003**
- [ ] `backend/src/controllers/fileAccessController.ts` の `initChunkUpload()` にMAIML用バリデーション処理を追加（チャンクアップロード）
  - `.maiml` ファイルかつ `filePath` が `projects/` で始まる場合に同一チェックを実施する
  - バリデーションエラーのHTTPステータスは **400**、エラーコードは **E1003**

### MAIMLファイル削除時のアーカイブ連動削除
- [ ] `backend/src/services/fileAccessService.ts` の `deleteFile()` を修正
  - 削除対象ファイルがMAIMLファイルかつプロジェクト配下（`projects/{projectName}/`）の場合、`archive/` フォルダ内のファイルも一括削除する
  - `storageService.listFiles()` で `projects/{projectName}/archive/` のファイル一覧を取得
  - 取得したファイルを `storageService.deleteFile()` で順次削除
  - archive削除失敗時は警告ログのみ出力し、MAIMLファイル本体の削除は成功として返す

## 変更ファイル

| ファイル | 変更種別 | 変更内容 | 状態 |
|---|---|---|---|
| `backend/src/services/fileAccessService.ts` | 修正 | ① `uploadFiles()` に `file_metadata` INSERT・バリデーション（ファイル名チェック）・`project_maiml_flg = true` 更新処理を追加（通常アップロード）<br>② `deleteFileByKey()` にMAIMLファイル削除時の `archive/` 連動削除処理を追加 | ✅ 完了 |
| `backend/src/controllers/fileAccessController.ts` | 修正 | ① `completeChunkUpload()` に `file_metadata` INSERT・`project_maiml_flg = true` 更新処理を追加（チャンクアップロード）<br>② `initChunkUpload()` にMAIMLファイル名バリデーション（通常アップロードと同一ロジック）を追加 | ✅ 完了 |

## フラグ更新ロジック

### 通常アップロード（uploadFiles）
```
アップロードされたファイルを判定
  ↓
isMaimlFile(fileName, mimeType) === true
  かつ
targetPath が metadata の projectId が指定されている
  ↓ Yes（通常アップロードのみ）
[バリデーション] targetPath から projectName を抽出し、ファイル名（拡張子除く）と一致するか確認
  → 不一致なら HTTP 400 / E1003 を返す
  ↓ OK
ストレージにアップロード
  ↓ 成功
FileMetadataRepository.insertFileMetadata() を呼び出す
  ↓ 成功（失敗時はストレージをロールバックしてエラーを返す）
全ファイル処理完了後、uploadedFiles にMAIMLファイルが含まれる かつ targetPath が projects/ で始まる
  ↓ Yes
targetPath から projectName を抽出し、projectRepository.findByName() を呼び出す
  ↓
project_maiml_flg === false または null
  ↓ Yes
projectRepository.update({ ...existingProject, project_maiml_flg: true }) を呼び出す
  ↓
更新失敗時 → 警告ログのみ出力（ロールバックなし）・処理続行
  ↓ 成功
アップロード完了
```

### チャンクアップロード（completeChunkUpload）
```
全チャンク結合・ストレージ保存
  ↓ 成功
FileMetadataRepository.insertFileMetadata() を呼び出す
  ↓ 成功（失敗時はストレージをロールバックしてエラーを返す）
result.fileKey が projects/ で始まる かつ fileName が .maiml で終わる
  ↓ Yes（フォーマットアップロード等は自動スキップ）
result.fileKey から projectName を抽出し、projectRepository.findByName() を呼び出す
  ↓
project_maiml_flg === false または null
  ↓ Yes
projectRepository.update({ ...existingProject, project_maiml_flg: true }) を呼び出す
  ↓
更新失敗時 → 警告ログのみ出力（ロールバックなし）・処理続行
  ↓ 成功
アップロード完了
```

## 依存関係

| 依存先 | 内容 |
|---|---|
| `backend/src/utils/maimlAnalyzer.ts` | `isMaimlFile()` 関数（既存・流用） |
| `backend/src/repositories/projectRepository.ts` | `findByName()`・`update()` 関数（既存・流用） |
| `backend/src/repositories/fileMetadataRepository.ts` | `insertFileMetadata()` 関数（既存・流用） |
| `backend/src/types/database.ts` | `Project` 型（既存・流用） |

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| フラグ更新が失敗してフラグが `false` のままになる | 低 | フラグ更新失敗時は警告ログを出力する。ファイル自体はアップロード済みのため、手動でフラグを修正する運用で対応する |
| フォーマットアップロード等でフラグ更新が実行される | 低 | `targetPath.startsWith('projects/')` で判定するため、`projects/` 以外のパスは自動的にスキップされる |
| MAIMLファイル削除後にarchive削除が一部失敗し孤立ファイルが残る | 低 | archive削除失敗時は警告ログのみ出力し、手動クリーンアップで対応する |

## テスト計画

### project_maiml_flg 更新
- [ ] MAIMLファイルを通常アップロード: `project_maiml_flg` が `true` に更新されること
- [ ] MAIMLファイルをチャンクアップロード: `project_maiml_flg` が `true` に更新されること
- [ ] MAIMLファイル以外（CSV・ZIP等）をアップロード: `project_maiml_flg` が変化しないこと
- [ ] `targetPath` が `projects/` で始まらない場合（フォーマットアップロード等、`formats/...` など）: フラグ更新処理がスキップされること（スキップ条件は `projectId` の有無ではなく `targetPath` のプレフィックスで判定）

### MAIMLアップロード制約
- [ ] ファイル名がプロジェクト名と一致しない場合（例: プロジェクト名 `sample_project`、ファイル名 `other.maiml`）: アップロードを拒否し、HTTP 400 / E1003 が返ること、画面にファイル名が表示されること、ログにファイル名と「ファイル名がプロジェクト名と一致しません」が記録されること（通常・チャンク両方で拒否されること）
- [ ] ファイル名がプロジェクト名と一致する場合（例: `sample_project.maiml`）: アップロードが成功すること

### MAIMLファイル削除時のアーカイブ連動削除
- [ ] MAIMLファイルを削除した場合: `archive/` フォルダ内の全ファイルも削除されること
- [ ] `archive/` フォルダが存在しない場合にMAIMLファイルを削除: MAIMLファイル本体の削除は成功すること
- [ ] archive内ファイルの削除が一部失敗した場合: MAIMLファイル本体の削除は成功レスポンスが返ること、警告ログが出力されること

## 承認記録
- **計画書提示日時**: 2026-03-31 11:56
- **承認日時**: -
- **承認者コメント**: -

# タスク計画書: プロジェクト名変更機能

## メタデータ
- **作成日時**: 2026-04-02 15:27
- **タスクID**: プロジェクト名変更機能
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## 1. タスク概要

プロジェクト管理画面にプロジェクト名変更機能を追加する。
プロジェクト名はS3フォルダパス・DB・file_metadataなど複数箇所で使用されているため、
変更時は関連するすべてのリソースを一括で更新する必要がある。

あわせて、ファイル単体のリネーム機能（`PATCH /api/v1/files/rename`）も実装する。

---

## 2. 目的と期待される成果

### 目的
- プロジェクト管理画面からプロジェクト名を変更できるようにする
- ファイルリストからファイル名を変更できるようにする
- 変更に伴うS3パス・DB・file_metadataの整合性を保つ

### 期待される成果
- [ ] プロジェクト名変更ボタンをプロジェクト管理画面に追加
- [ ] `RenameProjectModal` コンポーネントを新規作成
- [ ] `renameService.ts` を新規作成（`renameProject` / `renameFile` 関数）
- [ ] `PATCH /api/v1/projects/:projectName/rename` API エンドポイント実装
- [ ] `PATCH /api/v1/files/rename` API エンドポイント実装
- [ ] ファイルリストに「名前の変更」メニューを追加

---

## 3. 背景・前提

### プロジェクト名の利用箇所
プロジェクト名は以下の箇所で使用されており、変更時はすべてを更新する必要がある：

| 場所 | 内容 |
|------|------|
| `project` テーブル | `project_name` カラム |
| S3 パス | `projects/{project_name}/` プレフィックス |
| `file_metadata` テーブル | `file_path` カラムにプロジェクト名が含まれる |
| `maiml_drafts` テーブル | `project_id` で特定（`20260324` マイグレーション済み） |
| `maiml_publish_job` テーブル | `project_name` カラム（別マイグレーションで対応済み） |
| 指示（instruction）関連 | `instruction_id` が `{project_name}_XXX` 形式 |

### 制約事項
- プロジェクト名変更はチェックアウト中・タスク作業中は不可
- S3 コピー→削除方式でファイルを移動する（直接リネーム不可）
- アーカイブファイルもフォルダパスを新 `project_name` に移動する

---

## 4. 対応方針

### 🟡 プロジェクト特定の方式
現状、`file_metadata` の検索はファイルパスの LIKE 検索で行っているケースがある。
プロジェクト名変更時の一括更新は `project_id`（または `project_name`）を条件に
`file_metadata` を更新する方針とする。

### renameService の設計方針
- `renameProject`: プロジェクト名変更（S3 一括移動 + DB 更新）
- `renameFile`: ファイル単体リネーム（S3 コピー→削除 + file_metadata 更新）
- どちらも失敗時はエラーを返し、呼び出し元でロールバックを行う

---

## 5. 技術的制約・前提

- S3 はオブジェクトのリネームができないため、コピー→削除で対応
- 変更前後でプロジェクト名が一致する場合はエラーではなく早期リターン
- 既存のプロジェクト名と重複する場合は `E7001` を返す

---

## 6. 実装ステップ

### Phase 1: DB マイグレーション

- [x] `maiml_drafts` テーブルに `project_id` カラム追加（`20260324_add_project_id_to_maiml_draft.sql`）
- [ ] `maiml_publish_job` テーブルに関連カラム追加（別マイグレーションで実施済みか確認）
- [ ] DDL ファイル更新（`docs/design/db/ddl/`）

### Phase 2: バックエンド実装

#### `backend/src/services/renameService.ts`（新規作成）
- [ ] `renameProject()` 関数
  - [ ] 既存プロジェクト名の存在確認
  - [ ] 新プロジェクト名の重複チェック
  - [ ] S3 内ファイルを一括コピー→削除
  - [ ] `project` テーブルの `project_name` 更新
  - [ ] `file_metadata` テーブルの `file_path` 一括更新
- [ ] `renameFile()` 関数
  - [ ] 対象ファイルの存在確認（S3）
  - [ ] 同名ファイルの重複チェック
  - [ ] 拡張子変更禁止チェック
  - [ ] S3 コピー→削除
  - [ ] `file_metadata` テーブルの `file_path` 更新

#### `backend/src/controllers/projectController.ts`（修正）
- [x] `renameProjectHandler` 関数追加（`renameService` を import）

#### `backend/src/controllers/fileAccessController.ts`（修正）
- [x] `renameFileHandler` 関数追加（`renameService` を import）

#### `backend/src/routes/projectRoutes.ts`（修正）
- [x] `PATCH /:projectName/rename` ルート追加
  - 権限チェック: `checkPermission('040000', 1)`（実験管理者・書込可）
  - バリデーション: `projectName`・`newProjectName`

#### `backend/src/routes/fileAccessRoutes.ts`（修正）
- [x] `PATCH /files/rename` ルート追加
  - バリデーション: `fileKey`・`newFileName`

### Phase 3: フロントエンド UI 実装

#### `frontend/src/components/project/RenameProjectModal.tsx`（新規作成）
- [ ] Props: `open`, `currentProjectName`, `onCancel`, `onSuccess`
- [ ] 入力バリデーション（空文字・255文字以内・制御文字禁止）
- [ ] `projectApiService.renameProject()` を呼び出す
- [ ] 成功時: `onSuccess(newProjectName)` を呼び出す

#### `frontend/src/services/projectApiService.ts`（修正）
- [x] `renameProject(projectName, newProjectName)` 関数追加

#### `frontend/src/components/project/ProjectManagement.tsx`（修正）
- [x] `RenameProjectModal` import・組み込み
- [x] リネームボタン（`EditOutlined`）追加
- [x] `renameModalOpen` state 追加
- [x] `handleRenameSuccess` ハンドラ追加（プロジェクト一覧再取得）

#### `frontend/src/components/project/FileListTable.tsx`（修正）
- [x] 「名前の変更」コンテキストメニュー追加
- [x] インラインリネームモーダル実装
- [x] `renameFile()` 呼び出し
- [x] `onRenameFile` コールバック prop 追加

#### `frontend/src/services/fileAccessService.ts`（修正）
- [x] `renameFile(params)` 関数追加（`PATCH /api/v1/files/rename`）

### Phase 3.5: 実験作業者メニュー APIパス変更

実験作業者メニューは `projectName` を使って API を呼び出していたが、
プロジェクト名変更後も動作するよう `projectId` ベースに変更する。

- [ ] `frontend/src/contexts/ProjectMaimlContext.tsx` — `loadMaiml` の引数を `projectId` に変更
- [ ] `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — `selectedProject` を `projectId` で扱うよう変更
- [ ] `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` — API 呼び出しの projectName を projectId に変更
- [ ] `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` — API 呼び出しの projectName を projectId に変更
- [ ] 各 API エンドポイントのパラメータ型確認（`projectName` → `projectId` への移行）

---

## 7. 変更ファイル一覧

### 新規作成
1. `backend/src/services/renameService.ts` — プロジェクト名変更・ファイルリネームサービス
2. `frontend/src/components/project/RenameProjectModal.tsx` — プロジェクト名変更モーダル
3. `backend/migrations/20260324_add_project_id_to_maiml_draft.sql` — ✅ 作成済み

### 修正
1. `backend/src/controllers/projectController.ts` — `renameProjectHandler` 追加 ✅
2. `backend/src/controllers/fileAccessController.ts` — `renameFileHandler` 追加 ✅
3. `backend/src/routes/projectRoutes.ts` — rename ルート追加 ✅
4. `backend/src/routes/fileAccessRoutes.ts` — rename ルート追加 ✅
5. `frontend/src/services/projectApiService.ts` — `renameProject()` 追加 ✅
6. `frontend/src/services/fileAccessService.ts` — `renameFile()` 追加 ✅
7. `frontend/src/components/project/ProjectManagement.tsx` — リネームボタン・モーダル組み込み ✅
8. `frontend/src/components/project/FileListTable.tsx` — ファイルリネームモーダル追加 ✅
9. `frontend/src/contexts/ProjectMaimlContext.tsx` — `loadMaiml` 引数変更
10. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — projectId 対応
11. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` — projectId 対応
12. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` — projectId 対応

---

## 8. テスト計画

### 手動テスト

#### プロジェクト名変更
- [ ] 正常: プロジェクト名を変更 → 一覧・詳細が新名称で表示される
- [ ] 正常: 変更後にファイル一覧が正しく表示される（S3 パス更新確認）
- [ ] 異常: 既存プロジェクト名と重複 → エラーメッセージ表示
- [ ] 異常: 空文字・制御文字 → バリデーションエラー

#### ファイルリネーム
- [ ] 正常: ファイル名を変更 → ファイル一覧が新名称で表示される
- [ ] 異常: 拡張子変更試行 → エラーまたは拒否
- [ ] 異常: 同名ファイルが存在 → 重複エラー

---

## 9. TODO（今回は対応しない）

| ID | 内容 | 理由 |
|----|------|------|
| TODO-1 | エディタで開いているファイルのリネーム制限 | 別タスクで対応 |
| TODO-2 | UUID特定ロジックへの全面移行（LIKE 検索廃止） | 影響範囲が大きいため別タスク |
| TODO-3 | MAIML `<Document uuid>` 編集禁止 | 別タスクで対応 |
| TODO-4 | `instruction_id` 形式の連番化（プロジェクト名依存の廃止） | 別タスクで対応 |
| TODO-5 | S3 大量ファイル時のタイムアウト対応（非同期ジョブ化） | 別タスクで対応 |

---

## 補足A: 現状の構造

### DBテーブル

#### `project` テーブル（現状）
```
organization_id (PK), project_id (PK), project_name, description,
department_cd, owner_user_id, project_status, project_maiml_flg,
checkout_status, create_user_id, create_at, update_user_id, update_at
```
- `project_name` がフォルダ名と一致する設計
- `project_uuid` カラムなし（今回追加する）

#### `file_metadata` テーブル（現状）
```
file_key (PK = S3パス), s3_bucket, organization_id, original_filename, ...
maiml_document_uuid (MAIML内のDocument要素のUUID) ← カラムは存在するが現在未使用
```
- `file_key`（S3のファイルパス文字列）が主キー
- `project_uuid` カラムなし（プロジェクトとの紐付けはS3パスの命名規則に依存）
- `maiml_document_uuid` は INSERT/UPDATE 時に値がセットされておらず、検索にも使われていない（完全未使用状態）

### S3パス構造（現状）
```
{organization_id}/projects/{project_name}/{project_name}.maiml
{organization_id}/projects/{project_name}/archive/{project_name}_v{n}.maiml
```

### UI（現状）
- ProjectManagement.tsx にボタン群あり
  - ZIPダウンロード、編集、削除、チェックアウト/イン、問題確認、公開/非公開
- **「名前の変更」ボタンは実装済み**
  - 設置場所: ファイル一覧欄のダウンロードボタンの左
  - ボタン自体は表示・動作しているが、バックエンドAPIとの接続（リネーム処理）は未実装

---

## 補足B: project_uuid 導入仕様

### project テーブルに UUID カラム追加
```sql
ALTER TABLE project ADD COLUMN project_uuid UUID;
```
- MAIMLファイルの `<Document>` タグに記載されている UUID を格納する
- MAIMLファイル作成時またはアップロード時に、XMLを解析して取得しセットする
- 既存レコードへのbackfillは、既存MAIMLファイルをS3から読み込んで `<Document>` タグのUUIDを抽出して更新する

### file_metadata テーブルに project_uuid カラム追加
```sql
ALTER TABLE file_metadata ADD COLUMN project_uuid UUID;
```
- どのプロジェクトに属するファイルかをUUIDで紐付け
- MAIMLファイルアップロード・保存時に、XMLを解析して `<Document>` タグのUUIDをセットする
- 既存レコードへのbackfillは、S3パス（`file_key`）から `project_name` を抽出し `project.project_uuid` を逆引きしてセットする

### project_uuid のセット方法

MAIMLファイルの `<Document>` タグに記載されているUUIDをパースして取得する。

```xml
<!-- MAIMLファイル内のDocumentタグ（イメージ） -->
<Document uuid="550e8400-e29b-41d4-a716-446655440000" ...>
  ...
</Document>
```

| 処理 | ファイル | セット方法 |
|------|---------|-----------|
| 通常アップロード（.maiml） | `fileAccessService.ts` | XMLパースして `<Document uuid>` を抽出 → `file_metadata.project_uuid` にセット |
| チャンクアップロード完了（.maiml） | `fileAccessController.ts` | 同上 |
| エディタからの保存 | `maimlService.ts` / `maimlWriterService.ts` | XMLパースして `<Document uuid>` を抽出 → `project.project_uuid` と `file_metadata.project_uuid` にセット |

### UUID によるファイル特定ロジック
- **MAIMLファイルを特定する時のみ** `project_uuid` で `file_metadata` を検索する
- プロジェクト名とMAIMLファイル名は異なっていてもよい（名称の一致を前提としない）
- 現在 `project_name` でS3パスを組み立てている箇所を、`project_uuid` → `file_metadata` 検索 → `file_key` 取得の方式に置き換える

```sql
-- UUID特定ロジックの検索クエリ（イメージ）
SELECT file_key
FROM file_metadata
WHERE project_uuid = $1
  AND is_maiml = true
ORDER BY update_at DESC
LIMIT 1
```

> **✅ 仕様確定**
> - UUID移行のスコープ: 今回はDBカラム追加と計画書への記載のみ。UUID特定ロジックへの移行実装は別タスクで指示する

---

## 補足C: project_name 使用箇所の洗い出し結果

リネーム実装時に影響を受ける箇所の調査結果。

### 🔴 S3パス組み立て（最重要 - リネーム時に全て影響）

| ファイル | 内容 |
|---------|------|
| `services/maimlPublishService.ts` | `projects/${projectName}/${projectName}.maiml` でS3パスを組み立て |
| `services/experimentDataService.ts` | `projects/${projectName}/${projectName}.maiml` でMAIMLをダウンロード（2箇所） |
| `services/fileAccessService.ts` | S3パスから project_name 抽出・アーカイブパス組み立て（Upload/Delete/ChunkComplete 各処理） |
| `controllers/fileAccessController.ts` | S3パスから `pathParts[1]` で project_name 抽出・アーカイブパス組み立て |

### 🔴 project_name で project_id を逆引き検索

| ファイル | 内容 |
|---------|------|
| `controllers/projectController.ts` | `WHERE organization_id=$1 AND project_name=$2` で project_id を取得（複数箇所） |
| `repositories/projectRepository.ts` | `findByName()` - project_name で検索 |
| `services/experimentDataService.ts` | `projects/findIdByName.sql` を使い project_name → project_id 変換 |
| `controllers/projectInstructionController.ts` | 全エンドポイントで `findByName()` を使用（6箇所） |
| `services/issueService.ts` | `getProjectIdByName()` - project_name → project_id 変換（2箇所） |
| `repositories/issueRepository.ts` | `WHERE project_name=$1` でproject_id取得 |
| `services/maimlPublishService.ts` | `findByName()` でプロジェクト存在確認 |
| `services/maimlService.ts` | S3パスから project_name を抽出 → `findByName()` で検索 |

### 🟡 file_metadata テーブルでのパスプレフィックス検索

`file_metadata.file_key` には S3 のファイルパス（例: `{org_id}/projects/{project_name}/xxx.maiml`）が格納されており、project_name を含むパスで LIKE 検索している。

| ファイル | 内容 |
|---------|------|
| `repositories/fileMetadataRepository.ts` | `${organizationId}/projects/${projectName}/%` で LIKE 検索 |
| `sql/queries/projectSearch/searchByMaimlMetadata.sql` | `LIKE CONCAT(..., '/projects/', p.project_name, '/%')` でJOIN |

**リネーム時の必須対応**: S3 物理移動（コピー→削除）と `file_metadata.file_key` の一括 UPDATE をセットで行う必要がある。

### 🟡 maiml_publish_job / maiml_asset テーブルの project_name

| ファイル | 内容 |
|---------|------|
| `repositories/maimlPublishJobRepository.ts` | `WHERE project_name=$2` で最新ジョブ・公開済みアセットを検索（2箇所） |
| `repositories/maimlAssetRepository.ts` | `file_uri LIKE 'projects/${projectName}/%'` でアセット検索 |
| `sql/queries/semanticSearch/upsertTransitionSet.sql` | `project_name` カラムにINSERT/UPDATE |
| `sql/queries/semanticSearch/search.sql` | `WHERE project_name=$12` で絞り込み |

**✅ 仕様確定**: `maiml_publish_job.project_name`・`maiml_asset.file_uri`・`transition_set.project_name` はリネーム時に一緒に更新する（必須）。

### 🟡 指示ID生成に project_name を使用

| ファイル | 内容 |
|---------|------|
| `repositories/instructionRepository.ts` | `${projectName}_001` 形式で instruction_id を生成 |
| `repositories/projectInstructionRepository.ts` | `${projectName}_NNN` 形式で再採番 |

**注意**: 既存の instruction_id はプロジェクト名を含む文字列。リネームしても既存IDは変更しない（IDは不変とする）。

### 🔴 MAIMLファイル取得箇所（`projects/{project_name}/{project_name}.maiml`）

すべて同じパターン `projects/${projectName}/${projectName}.maiml` でS3からダウンロードしている。

| ファイル | 用途 |
|---------|------|
| `services/projectService.ts` | MAIMLファイル取得API（`getProjectMaiml`） |
| `services/projectService.ts` | タスク一覧取得（メソッド解析用） |
| `services/experimentDataService.ts` | 実験データ取得（テンプレートデータ用、2箇所） |
| `services/maimlPublishService.ts` | 公開処理（S3ファイル存在確認用） |
| `services/maimlWriterService.ts` | MAIML保存・アーカイブ処理 |
| `services/taskRegistrationService.ts` | タスク登録（MAIML解析用） |
| `services/projectInstructionService.ts` | 作業指示送信（MAIML解析用） |
| `services/progressService.ts` | 進捗詳細取得（MAIMLファイルキー参照） |

**バッチ系（project_name を直接指定せず S3 スキャンで取得）:**

| ファイル | 用途 |
|---------|------|
| `services/batchIngestService.ts` | S3全体スキャンで `projects/*/` 配下の `.maiml` を列挙 |
| `services/singleFileIngestService.ts` | 単一MAIMLファイルのインジェスト（パスから project_name を抽出） |

### 📋 リネーム時の更新対象まとめ

| 対象 | 更新内容 | 必須/要確認 |
|------|---------|------------|
| S3パス（`projects/{project_name}/`配下） | 新 project_name パスへコピー→削除 | 必須 |
| `file_metadata.file_key` | 新パスに一括UPDATE | 必須 |
| `project.project_name` | 新名称に UPDATE | 必須 |
| `maiml_publish_job.project_name` | 既存ジョブの project_name を更新する | 必須 |
| `maiml_asset.file_uri` | アセットの file_uri を新パスに更新する | 必須 |
| `transition_set.project_name` | セマンティック検索用テーブルの project_name を更新する | 必須 |
| 既存の `instruction_id`（`{project_name}_NNN` 形式） | 変更しない（IDは不変） | 不要 |

---

## 補足D: 仕様確定事項一覧

| # | 項目 | 決定内容 |
|---|------|---------|
| 1 | **リネーム可能な条件** | 制限なし。チェックアウト中・プロジェクトステータスに関わらず常時可能 |
| 2 | **アーカイブファイルのファイル名（プロジェクト名変更時）** | **変更しない**（過去バージョンのファイル名は変更時点のまま保持） |
| 2b | **アーカイブファイルのファイル名（ファイル名変更時）** | **変更する**（バージョン情報 `_v{n}` はそのまま残し、ファイル名部分のみ変更） |
| 3 | **最新MAIMLファイルの定義** | `file_metadata.update_at` が最新のレコードを最新ファイルとして扱う |
| 4 | **既存レコードへのbackfill** | 必要。既存MAIMLファイルをS3から読み込み `<Document>` タグのUUIDを抽出して `project.project_uuid` と `file_metadata.project_uuid` にセットするマイグレーションが必要 |
| 5 | **UUID移行のスコープ** | 今回はDBカラム追加と計画書への記載のみ。UUID特定ロジックへの移行実装は別タスクで指示する |
| 6 | **プロジェクト名とMAIMLファイル名の関係** | 異なっていてもよい。名称の一致を前提としない |
| 7 | **MAIMLファイル特定方法** | MAIMLファイルを特定する時のみ `project_uuid` で検索する |
| 8 | **アップロード済みファイルの変更** | 「名前の変更」ボタン押下時、アップロード済みファイルも対象にリネーム処理を行う |
| 9 | **S3フォルダリネーム方式** | 旧フォルダを削除し、新規フォルダ名で再作成（コピー→削除方式） |
| 10 | **実験作業者の保存処理** | 検索時に使用した `project_id` を保持し、保存時はその `project_id` を使用してデータを保存する |

### 実験作業者画面への影響（補足）

現状の課題：
- 保存処理が `project_name` を検索キーに `project` テーブルをSELECTして `project_id` を取得する実装の場合、リネーム実行中に `project_name` が変わると保存先を見失う可能性がある

対応方針（確定）：
- **検索時**: `project_id` をプルダウン等で保持する
- **保存時**: 保持している `project_id` を直接使用する（`project_name` で再検索しない）
- この対応により、作業中にプロジェクト名が変更されても作業データは正しく保存される

---

## 10. 承認記録

- **計画書提示日時**: 2026-04-02 15:27
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

---

## 11. 実施記録

（実装後に記入）

---

## §3-7 ファイル名変更機能

### 概要

`FileListTable.tsx` のドロップダウンメニューに既存の「名前の変更」ボタンがあるが、
クリックすると `message.info('名前の変更機能は未実装です')` を表示するのみで API 未接続。
本セクションでバックエンド API を実装し、フロントエンドと接続する。

---

### バックエンド: PATCH /api/v1/files/rename

#### ルート定義（`fileAccessRoutes.ts`）

- メソッド: `PATCH /rename`
- ミドルウェア: `authMiddleware`
- バリデーション:
  - `fileKey`: 必須・文字列・1〜1024文字
  - `newFileName`: 必須・文字列・1〜255文字（パス区切り文字禁止）
- ハンドラ: `fileAccessController.renameFileHandler`

#### サービス層（`renameService.ts` — `renameFile()` 関数）

処理フロー:

1. MAIMLファイルはリネーム不可（`E1003` を返す）
2. `newFileName` にパス区切り文字（`/`, `\`）が含まれていたらエラー（`E1003`）
3. `newFileName` が空文字ならエラー（`E1004`）
4. `oldFileKey` から親パスを取得し `newFileKey` を組み立てる
5. 変更前後のファイルキーが同一なら `{ success: true, newFileKey }` で早期リターン
6. S3: `storageService.copyFile(organizationId, oldFileKey, newFileKey)`
7. S3: `storageService.deleteFile(organizationId, oldFileKey)`
   - 削除失敗時はコピー先を削除してベストエフォートロールバック
8. DB: `file_metadata` テーブルを更新
   - `oldFullKey = {organizationId}/{oldFileKey}`
   - `newFullKey = {organizationId}/{newFileKey}`
   - 更新カラム: `file_key`, `original_filename`, `parent_folder_path`, `updated_at`, `update_user_id`
   - DB更新失敗はログのみ（S3リネーム完了後のためロールバックなし、処理続行）
9. `{ success: true, newFileKey }` を返す

#### コントローラー層（`fileAccessController.ts` — `renameFileHandler`）

- `req.user` から `organizationId`, `userId` を取得
- `req.body` から `fileKey`, `newFileName` を取得
- `renameService.renameFile()` を呼び出す
- 成功: HTTP 200、`{ success: true, data: { newFileKey } }`
- 失敗:
  - `E1003` / `E1004` → HTTP 400
  - `E4006` → HTTP 500

---

### フロントエンド: FileListTable.tsx 接続

#### `fileAccessService.ts` — `renameFile()` 関数

```typescript
renameFile(params: { fileKey: string; newFileName: string }): Promise<{ newFileKey: string }>
// PATCH /api/v1/files/rename
// レスポンス: { success: true, data: { newFileKey: string } }
```

#### `FileListTable.tsx` — 「名前の変更」ボタン

- クリック時: インライン入力ダイアログを表示（デフォルト値: 現在のファイル名）
- フロントエンド側バリデーション:
  - 空文字不可
  - パス区切り文字（`/`, `\`）禁止
  - 現在のファイル名と同一の場合は API コール不要
- 送信: `fileAccessService.renameFile({ fileKey, newFileName })` を呼び出す
- 成功時: `onRenameFile` コールバックを呼び出してファイル一覧を再取得
- エラー時: エラーメッセージをトーストで表示

---

### 仕様確定事項

| # | 内容 |
|---|------|
| 1 | MAIMLファイル（`.maiml`）のリネームは禁止 |
| 2 | ファイル名のみ変更可（ディレクトリ移動は不可） |
| 3 | 拡張子変更は可（拡張子変更禁止チェックは不要） |
| 4 | 同名ファイルの重複チェックは未実装（TODO） |
| 5 | アーカイブフォルダ配下のファイルもリネーム可能 |

---

### 実装状況

- [ ] `renameService.ts` — `renameFile()` 追加
- [ ] `fileAccessController.ts` — `renameFileHandler` 追加
- [ ] `fileAccessRoutes.ts` — `PATCH /rename` ルート追加
- [ ] `fileAccessService.ts` — `renameFile()` 追加
- [ ] `FileListTable.tsx` — 「名前の変更」ボタンを API に接続

---

## 📋 全体まとめ

### このタスクについて

プロジェクト管理画面に **「プロジェクト名の変更」** および **「ファイル名の変更」** 機能を追加するタスク。

プロジェクト名は S3 フォルダパス・DB・file_metadata など複数箇所で使われているため、
変更時は以下のリソースをすべて一括更新する必要がある。

| 更新対象 | 内容 |
|---------|------|
| S3 | `projects/{旧project_name}/` 配下を新パスへコピー→削除 |
| `project.project_name` | DB の project テーブルを更新 |
| `file_metadata.file_key` | S3 パス変更に合わせて一括 UPDATE |
| `maiml_publish_job.project_name` | 既存ジョブの project_name を更新 |
| `maiml_asset.file_uri` | アセットの file_uri を新パスに更新 |
| `transition_set.project_name` | セマンティック検索用テーブルの project_name を更新 |

ファイルリネームは S3 コピー→削除 + `file_metadata` 更新で対応。
MAIMLファイル（`.maiml`）のリネームは禁止。

---

### 実装状況サマリ

| フェーズ | 内容 | 状態 |
|---------|------|------|
| バックエンド `renameService.ts` | プロジェクト名変更・ファイルリネームのコアロジック | 🔴 未実装 |
| フロントエンド `RenameProjectModal.tsx` | プロジェクト名変更モーダル（API 接続） | 🔴 未実装 |
| フロントエンド `FileListTable.tsx` | 「名前の変更」ボタンの API 接続 | 🔴 未実装 |
| 実験作業者メニュー `projectId` 対応（Phase 3.5） | URL パラメータを projectName → projectId に変更 | 🔴 未実装 |
| バックエンド ルート・コントローラー定義 | renameProjectHandler / renameFileHandler | ✅ 完了 |
| フロントエンド サービス関数 | renameProject / renameFile | ✅ 完了 |

### 今回対応しない項目（別タスク）

- UUID特定ロジックへの全面移行（LIKE 検索廃止）
- `instruction_id` のプロジェクト名依存廃止
- S3 大量ファイル時の非同期ジョブ化

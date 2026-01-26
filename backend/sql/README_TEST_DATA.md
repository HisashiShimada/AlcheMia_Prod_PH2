# テストデータ準備ガイド

ファイル一覧・タスク一覧APIの動作確認用にテストデータを準備する手順です。

## 📋 概要

以下の2つの作業を実施します：

1. **Swiftストレージにテストファイルを作成** - 各プロジェクトフォルダに適当なファイルを配置
2. **データベースにタスクデータを投入** - project_task / project_task_detail テーブルにINSERT

## 🎯 対象プロジェクト

test_data/public.project.csv および frontend/src/data/mock/mockProjects.json から以下のプロジェクトを選定：

| プロジェクト名 | project_id | タスク数 | 状態 |
|--------------|-----------|---------|------|
| HighTempSuperconductor | 9a92873d-9deb-471d-8ccf-bce2a2cd216b | 6 | 作業中 |
| PerovskiteSolarCell | ca80aca8-5a58-4148-826c-71545f1fb696 | 3 | 作業中 |
| NanoparticleCatalyst | 5d9a7f7e-b464-4ec9-897b-2761e2cd8b4b | 1 | 完了 |
| GrapheneComposite | 435b0667-af37-49e9-bc21-58f748587e49 | 1 | 作業中 |
| FuelCellElectrolyte | 91907679-cf1f-41f9-aa83-0b9e1c36bbbb | 2 | エラー |
| QuantumDotLED | 10ee60f0-51cb-4bc7-b512-e1ee05a7d9f9 | 3 | 未開始 |
| OrganicSolarCell | f7c59dde-d9e5-43f4-aa5d-db310f7f1d74 | 1 | 完了 |

**合計:** 
- project_task: 13レコード
- project_task_detail: 20レコード

## 🚀 実施手順

### Step 1: Swiftストレージにテストファイルを作成

#### 前提条件

- OpenStack Swift が起動している（Dockerコンテナ）
- curl がインストールされている（WSL環境標準で利用可能）

**注意:** python-swiftclient のインストールは不要です。スクリプトは curl を使用してSwiftと通信します。

#### 環境変数の確認（必要に応じて設定）

```bash
# デフォルト値で問題なければスキップ可能
export SWIFT_AUTH_URL="http://localhost:8080/auth/v1.0"
export SWIFT_USERNAME="test:tester"
export SWIFT_PASSWORD="testing"
export SWIFT_CONTAINER="mmdpf-files"
export SWIFT_STORAGE_URL_BASE="http://localhost:8080/v1/AUTH_test"
```

#### 実行コマンド

```bash
cd backend/scripts

# スクリプトに実行権限を付与
chmod +x create-test-files-in-swift.sh

# 実行
./create-test-files-in-swift.sh
```

**実行時の出力例:**
```
=== Creating test files in Swift using curl ===
Auth URL: http://localhost:8080/auth/v1.0
Container: mmdpf-files
Organization: org_maiml_lab_001

Authenticating to Swift...
✓ Authentication successful
  Token: gAAAAABl...
  Storage URL: http://localhost:8080/v1/AUTH_test

Processing project: HighTempSuperconductor
  ✓ Created 6 files for HighTempSuperconductor
...
=== Test files creation completed ===
```

#### 作成されるファイル

各プロジェクトフォルダに以下のファイルが作成されます：

```
org_maiml_lab_001/projects/{project_name}/
├── {project_name}.maiml          # 現在のMAIMLファイル
├── archive/
│   ├── {project_name}_v1.maiml   # アーカイブv1
│   └── {project_name}_v2.maiml   # アーカイブv2
├── README.txt                     # プロジェクト説明
├── data.csv                       # データファイル
└── results.csv                    # 結果ファイル
```

**合計:** 9プロジェクト × 6ファイル = 54ファイル

#### 確認方法

curlを使ってファイル一覧を確認：

```bash
# 認証トークンを取得
AUTH_RESPONSE=$(curl -s -i \
  -H "X-Auth-User: test:tester" \
  -H "X-Auth-Key: testing" \
  http://localhost:8080/auth/v1.0)

AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | grep -i "X-Auth-Token:" | awk '{print $2}' | tr -d '\r')
STORAGE_URL=$(echo "$AUTH_RESPONSE" | grep -i "X-Storage-Url:" | awk '{print $2}' | tr -d '\r')

# ファイル一覧を取得
curl -H "X-Auth-Token: ${AUTH_TOKEN}" \
  "${STORAGE_URL}/mmdpf-files?prefix=org_maiml_lab_001/projects"

# 特定プロジェクトのファイルを確認（見やすく整形）
curl -H "X-Auth-Token: ${AUTH_TOKEN}" \
  "${STORAGE_URL}/mmdpf-files?prefix=org_maiml_lab_001/projects/HighTempSuperconductor" | \
  tr ',' '\n'
```

**または、スクリプトの最後に表示される確認コマンドを実行:**
```bash
# スクリプト実行後に表示されるコマンドをそのまま実行
curl -H "X-Auth-Token: gAAAAABl..." "http://localhost:8080/v1/AUTH_test/mmdpf-files?prefix=org_maiml_lab_001/projects"
```

### Step 2: データベースにタスクデータを投入

#### 2-1. タスクデータの投入

```bash
cd backend/sql

# PostgreSQLに接続してSQLを実行
psql -h 10.3.3.37 -p 5434 -U maiml_user -d maiml_db -f test_data_project_tasks.sql
```

または、Docker経由で実行：

```bash
docker exec -i mmdpf-postgres psql -U maiml_user -d maiml_db < test_data_project_tasks.sql
```

#### 2-2. ファイルメタデータの投入

Swiftに作成したファイルのメタデータをfile_metadataテーブルに登録：

```bash
cd backend/sql

# PostgreSQLに接続してSQLを実行
psql -h 10.3.3.37 -p 5434 -U maiml_user -d maiml_db -f test_data_file_metadata.sql
```

または、Docker経由で実行：

```bash
docker exec -i mmdpf-postgres psql -U maiml_user -d maiml_db < test_data_file_metadata.sql
```

#### 投入されるデータ概要

##### 2-1. project_task テーブル（13レコード）

各プロジェクトのメソッド情報：

- organization_id: 組織ID
- project_id: プロジェクトID
- method_id: メソッドID（例: "SamplePreparation", "Characterization"）
- task_name: タスク名
- experiment_order: 実験順序
- experiment_condition: 実験条件
- attempts_count: 試行回数

##### 2-2. project_task_detail テーブル（20レコード）

各タスクの詳細情報：

- task_no: タスク連番
- task_status: タスクステータス（0: pending, 1: in_progress, 2: completed, 3: review_waiting, 4: error）
- experiment_start_at: 実験開始日時
- experiment_end_at: 実験終了日時
- experiment_user_id: 実験作業者ID
- reviewed_at: レビュー完了日時
- review_user_id: レビュアーID

##### 2-3. file_metadata テーブル（54レコード）

各プロジェクトのSwiftファイルメタデータ：

- file_key: S3キー（org_maiml_lab_001/projects/{project_name}/{filename}）
- s3_bucket: mmdpf-files
- organization_id: 組織ID
- original_filename: 元のファイル名
- file_size: ファイルサイズ（バイト）
- file_type: MIMEタイプ（application/xml, text/csv, text/plain）
- uploaded_by: アップロードユーザーID
- parent_folder_path: 親フォルダパス

**ファイル構成（各プロジェクト共通）:**
1. {project_name}.maiml - 現在のMAIMLファイル
2. archive/{project_name}_v1.maiml - アーカイブv1
3. archive/{project_name}_v2.maiml - アーカイブv2
4. README.txt - プロジェクト説明
5. data.csv - データファイル
6. results.csv - 結果ファイル

**合計:** 9プロジェクト × 6ファイル = 54レコード

#### 確認方法

##### project_task / project_task_detail の確認

```sql
-- project_taskの確認
SELECT 
  pt.project_id,
  p.project_name,
  pt.method_id,
  pt.task_name,
  pt.attempts_count
FROM project_task pt
JOIN project p ON pt.project_id = p.project_id
ORDER BY p.project_name, pt.experiment_order;

-- project_task_detailの確認
SELECT 
  ptd.project_id,
  p.project_name,
  ptd.method_id,
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_start_at,
  ptd.experiment_end_at
FROM project_task_detail ptd
JOIN project p ON ptd.project_id = p.project_id
ORDER BY p.project_name, ptd.method_id, ptd.task_no;

-- タスクステータスごとの件数
SELECT 
  task_status,
  CASE task_status
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'in_progress'
    WHEN 2 THEN 'completed'
    WHEN 3 THEN 'review_waiting'
    WHEN 4 THEN 'error'
  END as status_name,
  COUNT(*) as count
FROM project_task_detail
GROUP BY task_status
ORDER BY task_status;
```

##### file_metadata の確認

```sql
-- ファイルメタデータ件数確認
SELECT COUNT(*) as total_files FROM file_metadata
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

-- プロジェクトごとのファイル数
SELECT 
  SPLIT_PART(parent_folder_path, '/', 3) as project_name,
  COUNT(*) as file_count,
  SUM(file_size) as total_size
FROM file_metadata
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND parent_folder_path LIKE 'org_maiml_lab_001/projects/%'
GROUP BY SPLIT_PART(parent_folder_path, '/', 3)
ORDER BY project_name;

-- ファイル種別ごとの件数
SELECT 
  file_type,
  COUNT(*) as count,
  SUM(file_size) as total_size
FROM file_metadata
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
GROUP BY file_type
ORDER BY count DESC;

-- 特定プロジェクトのファイル一覧
SELECT 
  file_key,
  original_filename,
  file_size,
  file_type,
  created_at
FROM file_metadata
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND parent_folder_path LIKE '%HighTempSuperconductor%'
ORDER BY file_key;
```

## ✅ 動作確認

### APIエンドポイントのテスト

#### 1. ファイル一覧取得

```bash
# HighTempSuperconductor プロジェクトのファイル一覧
curl -X GET "http://localhost:3001/api/v1/projects/HighTempSuperconductor/files" \
  -H "Cookie: maiml_session-{your-session-id}" \
  -H "X-Organization-Id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385"

# アーカイブファイルも含める
curl -X GET "http://localhost:3001/api/v1/projects/HighTempSuperconductor/files?include_archive=true" \
  -H "Cookie: maiml_session-{your-session-id}" \
  -H "X-Organization-Id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385"
```

**期待されるレスポンス:**
```json
{
  "success": true,
  "data": {
    "projectId": "9a92873d-9deb-471d-8ccf-bce2a2cd216b",
    "projectName": "HighTempSuperconductor",
    "files": [
      {
        "name": "HighTempSuperconductor.maiml",
        "path": "org_maiml_lab_001/projects/HighTempSuperconductor/HighTempSuperconductor.maiml",
        "size": 1234,
        "lastModified": "2026-01-23T14:00:00Z",
        "type": "maiml"
      },
      {
        "name": "README.txt",
        "path": "org_maiml_lab_001/projects/HighTempSuperconductor/README.txt",
        "size": 567,
        "lastModified": "2026-01-23T14:00:00Z",
        "type": "text"
      }
      // ... 他のファイル
    ],
    "archiveFiles": [
      {
        "name": "HighTempSuperconductor_v1.maiml",
        "path": "org_maiml_lab_001/projects/HighTempSuperconductor/archive/HighTempSuperconductor_v1.maiml",
        "size": 1200,
        "lastModified": "2026-01-23T14:00:00Z",
        "type": "maiml",
        "version": "v1"
      }
      // ... 他のアーカイブファイル
    ]
  }
}
```

#### 2. タスク一覧取得

```bash
# HighTempSuperconductor プロジェクトのタスク一覧
curl -X GET "http://localhost:3001/api/v1/projects/HighTempSuperconductor/tasks" \
  -H "Cookie: maiml_session-{your-session-id}" \
  -H "X-Organization-Id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385"

# 実行中のタスクのみ
curl -X GET "http://localhost:3001/api/v1/projects/HighTempSuperconductor/tasks?status=in_progress" \
  -H "Cookie: maiml_session-{your-session-id}" \
  -H "X-Organization-Id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385"
```

**期待されるレスポンス:**
```json
{
  "success": true,
  "data": {
    "projectId": "9a92873d-9deb-471d-8ccf-bce2a2cd216b",
    "projectName": "HighTempSuperconductor",
    "tasks": [
      {
        "methodId": "SamplePreparation",
        "taskName": "サンプル準備",
        "taskNo": 1,
        "taskStatus": "completed",
        "experimentStartAt": "2024-12-08T08:00:00Z",
        "experimentEndAt": "2024-12-08T16:00:00Z",
        "experimentUserId": "0c5d7815-5bc1-477f-9749-230b8156901e",
        "reviewedAt": "2024-12-08T17:00:00Z"
      }
      // ... 他のタスク
    ],
    "statistics": {
      "totalTasks": 6,
      "pending": 2,
      "inProgress": 1,
      "completed": 2,
      "reviewWaiting": 1,
      "error": 0
    }
  }
}
```

## 📊 task_status の定義

| 値 | 状態名 | 説明 |
|----|--------|------|
| 0 | pending | 未開始 |
| 1 | in_progress | 作業中 |
| 2 | completed | 完了（レビュー済み） |
| 3 | review_waiting | レビュー待ち（作業完了、レビュー未完了） |
| 4 | error | エラー・異常 |

## 🔧 トラブルシューティング

### Swift認証エラー

**症状:**
```
Error: Failed to authenticate to Swift
```

**原因:**
- Swiftコンテナが起動していない
- 認証情報（ユーザー名、パスワード）が間違っている
- 認証URLが間違っている

**解決策:**
```bash
# 1. Swiftコンテナが起動しているか確認
docker ps | grep swift

# 2. 認証URLにアクセスできるか確認
curl -i http://localhost:8080/auth/v1.0

# 3. 手動で認証テスト
curl -v -H "X-Auth-User: test:tester" -H "X-Auth-Key: testing" http://localhost:8080/auth/v1.0
```

### ファイルアップロードエラー

**症状:**
```
✗ Failed to upload org_maiml_lab_001/projects/...
```

**原因:**
- 認証トークンが無効
- コンテナが存在しない
- ストレージURLが間違っている

**解決策:**
```bash
# 1. コンテナを作成（存在しない場合）
AUTH_TOKEN=$(curl -s -i -H "X-Auth-User: test:tester" -H "X-Auth-Key: testing" http://localhost:8080/auth/v1.0 | grep -i "X-Auth-Token:" | awk '{print $2}' | tr -d '\r')

curl -X PUT -H "X-Auth-Token: ${AUTH_TOKEN}" http://localhost:8080/v1/AUTH_test/mmdpf-files

# 2. スクリプトを再実行
./create-test-files-in-swift.sh
```

### Swift接続エラー

```bash
# Swiftサービスが起動しているか確認
docker ps | grep swift

# 環境変数を確認
echo $SWIFT_AUTH_URL
echo $SWIFT_USERNAME
echo $SWIFT_PASSWORD
```

### PostgreSQL接続エラー

```bash
# データベースが起動しているか確認
docker ps | grep postgres

# 接続テスト
psql -h 10.3.3.37 -p 5434 -U maiml_user -d maiml_db -c "SELECT version();"
```

### データの重複エラー

既にデータが存在する場合は、削除してから再投入：

```sql
-- 既存データの削除（注意: テストデータのみ削除）
DELETE FROM file_metadata
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

DELETE FROM project_task_detail 
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

DELETE FROM project_task 
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

-- 再投入
\i test_data_project_tasks.sql
\i test_data_file_metadata.sql
```

## 📝 関連ファイル

- `backend/scripts/create-test-files-in-swift.sh` - Swiftファイル作成スクリプト（curl版）
- `backend/sql/test_data_project_tasks.sql` - タスクデータINSERT文
- `backend/sql/test_data_file_metadata.sql` - ファイルメタデータINSERT文
- `test_data/public.project.csv` - プロジェクトマスタCSV
- `frontend/src/data/mock/mockProjects.json` - モックプロジェクトデータ

## 🎉 完了

テストデータの準備が完了したら、以下のAPIエンドポイントが正常に動作することを確認してください：

- ✅ GET `/api/v1/projects/:projectName/files`
- ✅ GET `/api/v1/projects/:projectName/files?include_archive=true`
- ✅ GET `/api/v1/projects/:projectName/tasks`
- ✅ GET `/api/v1/projects/:projectName/tasks?status={status}`
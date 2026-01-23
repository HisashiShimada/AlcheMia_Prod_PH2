# FormatManagement UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

フォーマット管理画面のメインコンポーネント。XML/MAIMLフォーマットファイルの閲覧、作成、編集、削除、アップロードなどの管理機能を提供します。

### 1.2. 使用場面

- 実験管理者がフォーマット管理メニューから遷移
- フォーマット定義ファイル（XML/MAIML）の一元管理
- テンプレートファイルの作成・編集
- ワークフローファイル（MAIML）の管理

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────────────────────┐
│ ツールバー（検索・フィルタ・リフレッシュ）                      │
├─────────────────┬───────────────────────────────────────────┤
│ 左側（33%）     │ 右側（67%）                               │
│                 │                                           │
│ FormatFolderTree│ ┌───────────────────────────────────────┐ │
│ （フォーマット  │ │ フォーマット情報ヘッダー              │ │
│   一覧）        │ ├───────────────────────────────────────┤ │
│                 │ │ フォーマット操作ツールバー            │ │
│                 │ ├───────────────────────────────────────┤ │
│                 │ │ FormatFileListTable                   │ │
│                 │ │ （ファイル一覧）                      │ │
│                 │ │                                       │ │
│                 │ │                                       │ │
│                 │ └───────────────────────────────────────┘ │
└─────────────────┴───────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ツールバー（上部）

| 要素 | コンポーネント | 説明 |
|------|--------------|------|
| カテゴリ絞込 | Select | プロトコル、材料、測定、分析、サンプル、デバイス |
| ファイルタイプ絞込 | Select | 全て、XML、MAIML |
| 検索バー | Input | 前方一致検索（名前、説明、タグなど） |
| 詳細検索ボタン | Button (primary) | 詳細検索モーダルを開く |
| リフレッシュボタン | Button (primary) | フォーマット一覧を再取得 |

#### 2.2.2. 左側: フォーマット一覧（FormatFolderTree）

- フォーマットの階層構造表示
- ソート機能（名前、カテゴリ、更新日時）
- 選択されたフォーマットをハイライト表示

#### 2.2.3. 右側: ファイル管理エリア

**フォーマット情報ヘッダー:**
- フォーマット名（Title level 5）
- フォーマットの説明（Text secondary）

**フォーマット操作ツールバー:**
- 新規ファイル作成ボタン（XML/MAIML）
- 新規フォルダ作成ボタン
- アップロードボタン

**ファイル一覧（FormatFileListTable）:**
- ファイル・フォルダの一覧表示
- サブフォルダ階層のサポート
- ファイル操作（詳細、編集、削除）

### 2.3. 画面遷移

```
FormatManagement
├── FormatSearchModal（詳細検索モーダル）
├── FormatUploadDialog（アップロードダイアログ）
├── CreateFormatFileModal（新規ファイル作成モーダル）
├── CreateFormatFolderModal（新規フォルダ作成モーダル）
├── FormatFileDetailModal（ファイル詳細モーダル）
├── PetriNetEditor（MAIMLファイル編集 - フルスクリーン）
└── TemplateEditorDialog（XMLファイル編集 - モーダル）
```

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. フォーマット一覧の表示

**処理フロー:**
1. コンポーネントマウント時にAPI経由でフォーマット一覧を取得
2. カテゴリ・ファイルタイプ・検索クエリでフィルタリング
3. ソート（名前、カテゴリ、更新日時）を適用
4. FormatFolderTreeコンポーネントに表示

**API連携:**
- `GET /api/v1/formats` - フォーマット一覧取得（useApiフックで自動取得）

#### 3.1.2. フォーマット選択

**処理フロー:**
1. FormatFolderTreeでフォーマットをクリック
2. selectedFormatIdを更新
3. 右側にフォーマット情報とファイル一覧を表示
4. currentFolderPathをリセット

#### 3.1.3. ファイル・フォルダ一覧の表示

**処理フロー:**
1. 選択されたフォーマットIDでモックデータを取得
2. currentFolderPathに応じて表示階層を切り替え
   - ルート: ルートファイル + サブフォルダ
   - サブフォルダ内: 「戻る」ボタン + ファイル一覧
3. FormatFileListTableに渡して表示

#### 3.1.4. 新規ファイル作成

**処理フロー:**
1. 「新規ファイル作成」ボタンをクリック
2. フォーマット未選択時は警告メッセージ
3. CreateFormatFileModalを開く
4. ユーザーがファイル情報を入力
5. XMLファイルの場合、templateTypeに応じたデフォルトXML生成（Phase 6実装予定）
6. API呼び出し（Phase 6実装予定）
7. 成功メッセージ表示 & ファイル一覧を更新

#### 3.1.5. 新規フォルダ作成

**処理フロー:**
1. 「新規フォルダ作成」ボタンをクリック
2. フォーマット未選択時は警告メッセージ
3. CreateFormatFolderModalを開く
4. ユーザーがフォルダ情報を入力
5. API呼び出し（Phase 6実装予定）
6. 成功メッセージ表示 & ファイル一覧を更新

#### 3.1.6. ファイルアップロード

**処理フロー:**
1. 「アップロード」ボタンをクリック
2. FormatUploadDialogを開く
3. ユーザーがファイルを選択してアップロード
4. アップロード完了後、ファイル一覧を更新

#### 3.1.7. ファイル編集

**処理フロー:**

**MAIMLファイル（.maiml）の場合:**
1. ファイル拡張子を確認
2. ファイル内容を読み込み（`/api/worker/load-maiml-file`）
3. 読み込み成功 & 内容あり → 既存ファイルモード
4. 読み込み失敗 or 内容なし → 新規作成モード
5. PetriNetEditorをフルスクリーンで開く

**XMLファイル（.xml）の場合:**
1. ファイル拡張子を確認
2. TemplateEditorDialogをモーダルで開く
3. 一時的なノードを作成してエディタに渡す

**その他のファイル:**
- エラーメッセージを表示

#### 3.1.8. ファイル詳細表示

**処理フロー:**
1. ファイル一覧で「詳細」ボタンをクリック
2. 作成者情報を付与（現在のログインユーザー情報）
3. FormatFileDetailModalを開く

#### 3.1.9. フォルダ階層の移動

**処理フロー:**
1. フォルダアイコンをクリック
2. currentFolderPathを更新
3. ファイル一覧を再計算して表示
4. サブフォルダ内では「↑ 戻る」ボタンを表示

#### 3.1.10. リフレッシュ

**処理フロー:**
1. 「リフレッシュ」ボタンをクリック
2. refetchFormats()を呼び出してAPI再取得
3. フォーマット一覧を更新

### 3.2. ボタン・操作の動作

| ボタン | 動作 | 条件 |
|--------|------|------|
| 詳細検索 | FormatSearchModalを開く | - |
| リフレッシュ | API再取得してフォーマット一覧を更新 | - |
| 新規ファイル作成 | CreateFormatFileModalを開く | フォーマット選択済み |
| 新規フォルダ作成 | CreateFormatFolderModalを開く | フォーマット選択済み |
| アップロード | FormatUploadDialogを開く | フォーマット選択済み |
| ファイル詳細 | FormatFileDetailModalを開く | - |
| ファイル編集 | PetriNetEditor or TemplateEditorDialogを開く | ファイル拡張子に応じる |
| ファイル削除 | 削除確認 → API呼び出し（Phase 6実装予定） | - |
| フォルダクリック | サブフォルダ内へ移動 | - |
| 戻るボタン | ルートフォルダへ戻る | サブフォルダ内のみ |

### 3.3. バリデーションルール

| 項目 | ルール |
|------|--------|
| フォーマット選択 | 新規作成・アップロード時は必須 |
| ファイル拡張子 | 編集時は .maiml または .xml のみ |

---

## 4. データ仕様

### 4.1. 入力項目

#### 4.1.1. フィルタリング

| 項目 | 型 | 必須 | デフォルト | 説明 |
|------|---|------|-----------|------|
| categoryFilter | string | - | 'all' | カテゴリ絞込（all, protocol, material, measurement, analysis, sample, device） |
| fileTypeFilter | 'all' \| 'xml' \| 'maiml' | - | 'all' | ファイルタイプ絞込 |
| searchQuery | string | - | '' | 検索クエリ（前方一致） |

#### 4.1.2. ソート

| 項目 | 型 | 必須 | デフォルト | 説明 |
|------|---|------|-----------|------|
| sortBy | 'name' \| 'category' \| 'updatedAt' | - | 'name' | ソート項目 |
| sortOrder | 'asc' \| 'desc' | - | 'asc' | ソート順序 |

### 4.2. 出力項目

#### 4.2.1. Format型（フォーマット）

```typescript
interface Format {
  id: string;               // フォーマットID
  name: string;             // フォーマット名
  folderName: string;       // フォルダ名
  description: string;      // 説明
  fileCount: number;        // ファイル数
  fileType: 'xml' | 'maiml'; // ファイルタイプ
  category: string;         // カテゴリ
  department: string;       // 部門
  createdAt: string;        // 作成日時
  updatedAt: string;        // 更新日時
  tags: string[];           // タグ
}
```

#### 4.2.2. FormatFile型（ファイル）

```typescript
interface FormatFile {
  id: string;               // ファイルID
  name: string;             // ファイル名
  path: string;             // ファイルパス
  size: number;             // ファイルサイズ（バイト）
  lastModified: string;     // 最終更新日時
  type: string;             // ファイルタイプ
  version?: string;         // バージョン
  description?: string;     // 説明
  isFolder?: boolean;       // フォルダフラグ
  fileCount?: number;       // フォルダ内のファイル数
}
```

### 4.3. 初期表示データ

- **フォーマット一覧**: API経由で取得（`GET /api/v1/formats`）
- **ファイル一覧**: モックデータから取得（Phase 6でAPI化予定）

---

## 5. API連携

### 5.1. 使用するAPI一覧

| # | API名 | メソッド | エンドポイント | 状態 | 優先度 | 説明 |
|---|------|---------|---------------|------|--------|------|
| 1 | フォーマット一覧取得 | GET | `/api/v1/formats` | 🔴 未実装 | ⭐⭐⭐ 高 | フォーマット一覧を取得 |
| 2 | フォーマットファイル一覧取得 | GET | `/api/v1/formats/:formatId/files` | 🔴 未実装 | ⭐⭐⭐ 高 | フォーマット内のファイル一覧を取得 |
| 3 | 新規ファイル作成 | POST | `/api/v1/formats/:formatId/files` | 🔴 未実装 | ⭐⭐ 中 | 新規ファイルを作成 |
| 4 | 新規フォルダ作成 | POST | `/api/v1/formats/:formatId/folders` | 🔴 未実装 | ⭐⭐ 中 | 新規フォルダを作成 |
| 5 | ファイル編集（保存） | PUT | `/api/v1/formats/:formatId/files/:fileId` | 🔴 未実装 | ⭐⭐⭐ 高 | ファイル内容を保存 |

**共通API:**
- [ファイルアップロード](../../api/api_common.md#1-ファイルアップロード-) - context=format
- [ファイルダウンロード](../../api/api_common.md#2-ファイルダウンロード-) - 個別ファイル用
- [MAIMLファイル読み込み](../../api/api_maiml_edit.md#31-maimlファイル読み込み-) - MAIML編集用

**詳細**: [フォーマット管理API仕様書](../../api/api_format_management.md) を参照

### 5.2. リクエスト/レスポンス例

#### 5.2.1. フォーマット一覧取得 🔴

**Request:**
```http
GET /api/v1/formats?file_type=all
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
```

**Query Parameters:**
- `file_type`: ファイル種別フィルタ（`all`, `maiml`, `xml`）

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "format_id": "format-uuid",
      "format_prefix": "chemistry",
      "file_type": "maiml",
      "description": "化学実験用ワークフロー",
      "subfolder_count": 3,
      "file_count": 8,
      "created_at": "2026-01-21T10:00:00Z",
      "updated_at": "2026-01-21T16:00:00Z"
    },
    {
      "format_id": "format-uuid-2",
      "format_prefix": "materials",
      "file_type": "xml",
      "description": "材料テンプレート",
      "subfolder_count": 2,
      "file_count": 5,
      "created_at": "2026-01-20T10:00:00Z",
      "updated_at": "2026-01-21T15:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 5.2.2. フォーマットファイル一覧取得 🔴

**Request:**
```http
GET /api/v1/formats/format-uuid/files?subfolder_id=subfolder-uuid
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
```

**Query Parameters:**
- `subfolder_id`: サブフォルダID（未指定時はルート直下）

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "format_id": "format-uuid",
    "format_prefix": "chemistry",
    "file_type": "maiml",
    "current_path": "chemistry/synthesis",
    "folders": [
      {
        "subfolder_id": "subfolder-uuid",
        "subfolder_name": "synthesis",
        "subfolder_path": "chemistry/synthesis",
        "file_count": 3,
        "created_at": "2026-01-21T10:00:00Z"
      },
      {
        "subfolder_id": "subfolder-uuid-2",
        "subfolder_name": "analysis",
        "subfolder_path": "chemistry/analysis",
        "file_count": 2,
        "created_at": "2026-01-21T11:00:00Z"
      }
    ],
    "files": [
      {
        "file_id": "file-uuid",
        "file_name": "workflow.maiml",
        "file_path": "org_maiml_lab_001/formats/chemistry/workflow.maiml",
        "file_size": 12345,
        "file_type": "maiml",
        "created_at": "2026-01-21T10:00:00Z",
        "updated_at": "2026-01-21T16:00:00Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 5.2.3. 新規ファイル作成 🔴

**Request:**
```http
POST /api/v1/formats/format-uuid/files
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
Content-Type: application/json

{
  "fileName": "new_workflow.maiml",
  "subfolderId": "subfolder-uuid",
  "templateType": "empty"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "file_id": "file-uuid",
    "file_name": "new_workflow.maiml",
    "file_path": "org_maiml_lab_001/formats/chemistry/synthesis/new_workflow.maiml",
    "file_size": 1234,
    "file_type": "maiml",
    "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<maiml>...</maiml>",
    "created_at": "2026-01-21T16:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 5.2.4. 新規フォルダ作成 🔴

**Request:**
```http
POST /api/v1/formats/format-uuid/folders
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
Content-Type: application/json

{
  "subfolderName": "new_category",
  "parentSubfolderId": "parent-subfolder-uuid",
  "description": "新しいカテゴリ"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "subfolder_id": "subfolder-uuid",
    "format_id": "format-uuid",
    "subfolder_name": "new_category",
    "subfolder_path": "chemistry/synthesis/new_category",
    "parent_subfolder_id": "parent-uuid",
    "description": "新しいカテゴリ",
    "created_at": "2026-01-21T16:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 5.2.5. ファイル編集（保存） 🔴

**Request:**
```http
PUT /api/v1/formats/format-uuid/files/file-uuid
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
Content-Type: application/json

{
  "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<maiml>...</maiml>",
  "createBackup": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "file_id": "file-uuid",
    "file_name": "workflow.maiml",
    "file_path": "org_maiml_lab_001/formats/chemistry/workflow.maiml",
    "file_size": 15678,
    "updated_at": "2026-01-21T16:00:00Z",
    "backup_created": true,
    "backup_path": "org_maiml_lab_001/formats/chemistry/.backup/workflow_20260121160000.maiml"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 5.2.6. MAIMLファイル読み込み ✅

詳細は [MAIML編集API仕様書](../../api/api_maiml_edit.md#31-maimlファイル読み込み-) を参照

**Request:**
```http
POST /api/v1/maiml/load
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
Content-Type: application/json

{
  "s3_key": "org_maiml_lab_001/formats/chemistry/sample.maiml"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": "base64-encoded-content",
    "file_size": 12345,
    "last_modified": "2026-01-20T15:30:00Z"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 6. エラーハンドリング

### 6.1. エラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [
      {
        "field": "fieldName",
        "message": "詳細メッセージ",
        "code": "FIELD_ERROR_CODE"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 6.2. 共通エラーコード

| コード | HTTPステータス | 説明 | 対処方法 |
|-------|---------------|------|----------|
| `AUTH_TOKEN_INVALID` | 401 | 認証トークンが無効 | 再ログインを促す |
| `AUTH_TOKEN_EXPIRED` | 401 | 認証トークンの有効期限切れ | 再ログインを促す |
| `PERMISSION_INSUFFICIENT` | 403 | 権限不足 | エラーメッセージを表示 |
| `RESOURCE_NOT_FOUND` | 404 | リソースが見つからない | リストを再取得 |
| `VALIDATION_ERROR` | 400 | バリデーションエラー | 詳細メッセージを表示 |
| `BUSINESS_DUPLICATE_FORMAT_NAME` | 409 | フォーマット名が重複 | 別の名前を入力させる |
| `BUSINESS_DUPLICATE_FILE_NAME` | 409 | ファイル名が重複 | 別の名前を入力させる |
| `SYSTEM_DATABASE_ERROR` | 500 | データベースエラー | 再試行を促す |
| `SYSTEM_STORAGE_ERROR` | 500 | ストレージエラー | 再試行を促す |

### 6.3. エラーケース別の処理

| エラーケース | HTTPステータス | エラーコード | 対処方法 |
|-------------|---------------|-------------|----------|
| フォーマット一覧取得失敗 | 500 | `SYSTEM_DATABASE_ERROR` | message.error表示 + 空配列設定 + 再試行ボタン |
| フォーマット詳細取得失敗 | 404 | `RESOURCE_NOT_FOUND` | message.error表示 + フォーマットリストを再取得 |
| ファイル一覧取得失敗 | 404 | `RESOURCE_NOT_FOUND` | message.error表示 + 空配列設定 |
| ファイル作成失敗（重複） | 409 | `BUSINESS_DUPLICATE_FILE_NAME` | message.error表示 + 別の名前を入力させる + モーダルは開いたまま |
| フォルダ作成失敗 | 500 | `SYSTEM_STORAGE_ERROR` | message.error表示 + モーダルは開いたまま |
| MAIMLファイル読み込み失敗 | 404 | `RESOURCE_NOT_FOUND` | 新規作成モードで開く |
| ファイル削除失敗 | 403, 500 | `PERMISSION_INSUFFICIENT`, `SYSTEM_STORAGE_ERROR` | message.error表示 + 削除中止 |
| フォーマット未選択で新規作成 | - | - | message.warning表示「フォーマットを選択してください」 |
| 編集できないファイル形式 | - | - | message.error表示「編集できないファイル形式です」 |

### 6.4. 成功メッセージ

| メッセージ | 表示タイミング | 種類 |
|----------|--------------|------|
| 「ファイルが正常に作成されました」 | ファイル作成成功 | success |
| 「フォルダが正常に作成されました」 | フォルダ作成成功 | success |
| 「ファイルが削除されました」 | ファイル削除成功 | success |
| 「保存しました」 | PetriNetEditor/TemplateEditorDialog保存成功 | success |
| 「フォーマット一覧を更新しました」 | リフレッシュ成功 | success |

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Card | ツールバー、ヘッダー、操作ツールバー | bordered={false} |
| Input | 検索バー | prefix={<SearchOutlined />}, allowClear |
| Select | カテゴリ絞込、ファイルタイプ絞込 | style={{ width: 150 }} |
| Button | 詳細検索、リフレッシュ、新規作成、アップロード | type="primary", icon={...} |
| Space | ボタングループ配置 | size="small" |
| Typography.Title | フォーマット名 | level={5} |
| Typography.Text | 説明テキスト、ラベル | type="secondary" |
| Spin | MAIMLファイル読み込み中 | size="large" |
| message | 通知メッセージ | success/error/warning |

### 7.2. デザイントークン使用

```typescript
const { token } = theme.useToken();

// 使用例
backgroundColor: token.colorBgLayout
borderBottom: `1px solid ${token.colorBorderSecondary}`
padding: token.margin
paddingLG: token.paddingLG
fontSize: token.fontSizeSM
fontWeight: token.fontWeightStrong
colorSuccess: token.colorSuccess
```

### 7.3. レスポンシブ対応

- 左側フォーマット一覧: 33%幅、最小350px、最大500px
- 右側ファイル管理: flex: 1（残りの幅を使用）
- ツールバーは flexWrap: 'wrap' で折り返し対応

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/project/FormatManagement.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| FormatFolderTree | ./FormatFolderTree.tsx | フォーマット一覧ツリー表示 |
| FormatFileListTable | ./FormatFileListTable.tsx | ファイル一覧テーブル表示 |
| FormatSearchModal | ./FormatSearchModal.tsx | 詳細検索モーダル |
| FormatUploadDialog | ./FormatUploadDialog.tsx | アップロードダイアログ |
| CreateFormatFileModal | ./CreateFormatFileModal.tsx | 新規ファイル作成モーダル |
| CreateFormatFolderModal | ./CreateFormatFolderModal.tsx | 新規フォルダ作成モーダル |
| FormatFileDetailModal | ./FormatFileDetailModal.tsx | ファイル詳細モーダル |
| PetriNetEditor | ../editor/PetriNetEditor.tsx | MAIMLファイル編集エディタ |
| TemplateEditorDialog | ../editor/TemplateEditorDialog.tsx | XMLファイル編集エディタ |

### 8.3. カスタムフック

| フック | パス | 役割 |
|--------|------|------|
| useLanguage | @/contexts/LanguageContext | 多言語化対応 |
| useApi | @/hooks/useApi | API呼び出しとデータ管理 |

### 8.4. ユーティリティ

| ユーティリティ | パス | 役割 |
|-------------|------|------|
| fetchFormats | @/utils/apiClient | フォーマット一覧取得API |

### 8.5. モックデータ

| データ | パス | 説明 |
|--------|------|------|
| mockFormatFilesData | @/data/mock/mockFormatFiles.json | フォーマットファイルのモックデータ |

---

## 9. 既知の課題・TODO

### Phase 6実装予定

- [ ] ファイル作成API呼び出しの実装
- [ ] フォルダ作成API呼び出しの実装
- [ ] ファイル削除API呼び出しの実装
- [ ] XMLファイルのtemplateTypeに応じたデフォルトXML生成
- [ ] PetriNetEditorの保存処理実装
- [ ] TemplateEditorDialogの保存処理実装
- [ ] ファイル一覧のAPI化（モックデータからの移行）

### 改善提案

- [ ] パンくずリストの表示（現在はフォルダ階層が深い場合にわかりにくい）
- [ ] ファイルのドラッグ&ドロップアップロード対応
- [ ] フォルダのドラッグ&ドロップ移動対応
- [ ] ファイルのバージョン管理機能
- [ ] ファイルのプレビュー機能

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

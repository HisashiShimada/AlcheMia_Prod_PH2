# ProgressMonitoring UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

実験管理者がプロジェクトの進捗状況を一覧で確認し、フィルタリング・検索・ソートを行える進捗監視画面。各プロジェクトの完了タスク数、プロジェクトステータス、チェックアウト状態を把握し、詳細確認が可能です。

### 1.2. 使用場面

- ExperimentAdminMenuの「進捗確認」メニュー選択時
- プロジェクトの進捗状況を確認する場合
- タスクの完了状況を監視する場合
- 特定のプロジェクトの詳細を確認する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────────────┐
│ 進捗管理画面                                         │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ フィルター・検索エリア                   [更新] │ │
│ │ 所有者: [自分所有のみ ▼] 部門: [全部門 ▼]      │ │
│ │ ステータス: [全て ▼] チェックアウト: [全て ▼]  │ │
│ │ 検索: [🔍 入力値でフィルタリング_________]      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ プロジェクト一覧テーブル            [25件]      │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ プロジェクト名 │部門│ステータス│チェック│所有│ │
│ │───────────────┼────┼─────────┼────────┼────│ │
│ │ 材料実験A      │研究│実行中    │イン済み│佐藤│ │
│ │ PRJ-001        │    │[cyan]    │[green] │ 3/5│ │
│ │                │    │          │        │[詳] │ │
│ │───────────────┼────┼─────────┼────────┼────│ │
│ │ 材料実験B      │開発│完了      │イン済み│鈴木│ │
│ │ PRJ-002        │    │[green]   │[green] │ 5/5│ │
│ │                │    │          │        │[詳] │ │
│ └─────────────────────────────────────────────────┘ │
│ [< 前へ] [1] [2] [3] ... [次へ >] 合計 25 件        │
└─────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. フィルター・検索カード

| フィルター項目 | コンポーネント | 幅 | 選択肢 |
|--------------|--------------|-----|--------|
| 所有者 | Select | 150px | 自分所有のみ / 全体 |
| 部門 | Select | 150px | 全部門 / 部門名リスト（動的） |
| プロジェクトステータス | Select | 200px | 全て / 計画中 / 実行待ち / 実行中 / レビュー待ち / 完了 / 異常終了 |
| チェックアウト状態 | Select | 150px | 全て / チェックアウト済み / チェックイン済み |
| 検索 | Input | 300px | 全項目を対象に検索 |
| 更新ボタン | Button | - | API再取得 |

**ラベルスタイル:**
- フォントサイズ: `fontSizeSM`
- フォントウェイト: `fontWeightStrong`
- テキスト色: secondary

#### 2.2.2. テーブルカラム定義

| カラム | 幅 | 配置 | ソート | 説明 |
|--------|-----|------|--------|------|
| プロジェクト名 | 250px | left | ○ | プロジェクト名 + プロジェクトID（2行表示）+ 件数Tag |
| 部門 | 120px | left | ○ | 部門名 |
| プロジェクトステータス | 180px | left | ○ | ステータスTag（色分け） |
| チェックアウト | 150px | center | ○ | チェックアウト中 / チェックイン済み Tag |
| 所有者 | 150px | left | ○ | 所有者名（太字） |
| 完了タスク数/総タスク数 | 150px | center | ○ | 数値表示（太字） |
| 操作 | 120px | center | - | 詳細ボタン |

#### 2.2.3. プロジェクトステータスの色定義

| ステータス | 色 | 表示名 |
|-----------|-----|--------|
| planning | default（灰色） | プロジェクト計画中 |
| pending | blue | タスク実行待ち |
| in_progress | cyan | タスク実行中 |
| review_waiting | purple | タスク結果レビュー待ち |
| completed | success（緑） | プロジェクト完了 |
| error | error（赤） | タスク異常終了 |

#### 2.2.4. チェックアウト状態の色定義

| 状態 | 色 | 表示名 |
|------|-----|--------|
| チェックアウト中 | orange | チェックアウト中 |
| チェックイン済み | success（緑） | チェックイン済み |

#### 2.2.5. 詳細ボタン

| 項目 | 値 |
|------|-----|
| タイプ | primary ghost |
| サイズ | small |
| アイコン | EyeOutlined |
| テキスト | 多言語対応（progress.actions.viewDetails） |

### 2.3. 画面遷移

- **詳細ボタンクリック**: WorkProgressDetailDialogモーダルを表示
- 画面遷移なし（単一画面）

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. 画面初期表示

**処理フロー:**
1. コンポーネントマウント時にuseApiフックでプロジェクト一覧を取得
2. APIレスポンスをProgressRecord型に変換
3. 初期状態でフィルターを適用（所有者: 自分所有のみ）
4. テーブルに表示

**初期値:**
- 所有者フィルター: `my_only`（自分所有のみ）
- 部門フィルター: `all`（全部門）
- プロジェクトステータスフィルター: `all`（全て）
- チェックアウトフィルター: `all`（全て）
- 検索テキスト: 空文字列
- ページ: 0
- 1ページあたりの行数: 10
- ソート順序: `asc`（昇順）
- ソート対象: `projectName`

#### 3.1.2. プロジェクト一覧の取得（API連携）

**処理フロー:**
1. useApiフックでfetchProjects()を呼び出し
2. APIレスポンス（ProjectListResponse）を取得
3. projectsData.data.projectsをProgressRecord[]に変換
4. 変換ロジック:
   ```typescript
   {
     key: index + 1,
     projectId: item.id,
     projectName: item.name,
     projectStatus: item.status,
     department: item.department || '',
     isCheckedOut: item.isCheckedOut || false,
     ownerEmail: item.ownerEmail || '',
     ownerName: item.ownerName || item.owner || '',
     completedTasks: item.completedTasks || 0,
     totalTasks: item.totalTasks || 0,
   }
   ```

**エラーハンドリング:**
- useApiフックが自動的にエラーハンドリング
- isLoadingでローディング状態を管理
- projectsErrorでエラー情報を取得

#### 3.1.3. フィルタリング機能

**処理フロー:**
1. useMemo()でfilteredDataを計算
2. 以下の条件で複合フィルタリング:
   - 検索テキスト（全項目を対象、表示名も含む）
   - チェックアウト状態
   - プロジェクトステータス
   - 部門
3. 条件に一致するレコードのみ抽出

**検索対象項目:**
- プロジェクトID
- プロジェクト名
- プロジェクトステータス（値と表示名）
- チェックアウト状態（表示名）
- 部門
- 所有者メールアドレス
- 所有者名
- 完了タスク数（文字列変換）
- 総タスク数（文字列変換）

**大文字小文字の区別:**
- なし（toLowerCase()で正規化）

#### 3.1.4. ソート機能

**処理フロー:**
1. useMemo()でsortedDataを計算
2. orderBy（対象カラム）とorder（昇順/降順）に基づいてソート
3. 文字列の場合はlocaleCompare()で日本語対応
4. 数値・真偽値の場合は直接比較

**ソート可能なカラム:**
- プロジェクト名
- 部門
- プロジェクトステータス
- チェックアウト状態
- 所有者名
- 完了タスク数

#### 3.1.5. ページネーション

**Ant Design Tableのpagination設定:**
- デフォルトページサイズ: 10件
- ページサイズ変更: 可能
- ページサイズ選択肢: [5, 10, 25, 50]
- 総件数表示: 「合計 N 件」

#### 3.1.6. 部門リストの動的生成

**処理フロー:**
1. useMemo()でdepartmentsを計算
2. allDataから部門を抽出
3. Set()でユニーク化
4. sort()で昇順ソート
5. Select optionsとして使用

#### 3.1.7. 統計データの計算

**計算内容:**
- 総プロジェクト数: filteredData.length
- プロジェクト名カラムのヘッダーにTagで表示

#### 3.1.8. 詳細表示

**処理フロー:**
1. 詳細ボタンクリック時にhandleViewDetails()を呼び出し
2. 選択されたProgressRecordをsetSelectedProject()で保存
3. ダミーFileDataを作成（モック環境）:
   ```typescript
   {
     maimlFileKey: `org_001/projects/${projectId}/test_omori11.maiml`,
     fileName: `test_omori11.maiml`
   }
   ```
4. WorkProgressDetailDialogを開く（setIsDetailDialogOpen(true)）

**FileDataの生成:**
- 本番環境では実際のS3キーを使用
- モック環境ではtest_omori11.maimlを使用

#### 3.1.9. リフレッシュ機能

**処理フロー:**
1. 更新ボタンクリック時にhandleRefresh()を呼び出し
2. refetchProjects()でAPIを再取得
3. テーブルデータが自動更新

#### 3.1.10. モーダルを閉じる

**処理フロー:**
1. WorkProgressDetailDialogのonClose()コールバックが呼ばれる
2. handleCloseDialog()で以下をクリア:
   - isDetailDialogOpen: false
   - selectedProject: null
   - fileData: null

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| 所有者フィルター変更 | フィルタリング再実行 | ownerFilter更新 |
| 部門フィルター変更 | フィルタリング再実行 | departmentFilter更新 |
| ステータスフィルター変更 | フィルタリング再実行 | projectStatusFilter更新 |
| チェックアウトフィルター変更 | フィルタリング再実行 | checkoutFilter更新 |
| 検索テキスト入力 | フィルタリング再実行 | searchText更新 |
| 検索クリアボタン | 検索テキストをクリア | searchText: '' |
| 更新ボタン | API再取得 | - |
| カラムヘッダークリック | ソート実行 | order, orderBy更新 |
| 詳細ボタン | モーダル表示 | isDetailDialogOpen: true |
| ページ変更 | 表示ページ切替 | Tableが管理 |

### 3.3. バリデーションルール

- バリデーションなし（表示専用画面）

---

## 4. データ仕様

### 4.1. ProgressRecord型定義

```typescript
interface ProgressRecord {
  key: string;                 // テーブル行キー（連番）
  projectId: string;           // プロジェクトID
  projectName: string;         // プロジェクト名
  projectStatus: string;       // プロジェクトステータス
  department: string;          // 部門
  isCheckedOut: boolean;       // チェックアウト状態
  ownerEmail: string;          // 所有者メールアドレス
  ownerName: string;           // 所有者名
  completedTasks: number;      // 完了タスク数
  totalTasks: number;          // 総タスク数
}
```

### 4.2. 入力項目

- なし（Props不要、自己完結型コンポーネント）

### 4.3. 初期表示データ

**API経由で取得:**
- エンドポイント: fetchProjects()
- レスポンス型: ApiResponse<ProjectListResponse>

---

## 5. API連携

### 5.1. 現在使用しているAPI

| # | API名 | メソッド | エンドポイント | 状態 | 説明 |
|---|------|---------|---------------|------|--------|
| 1 | プロジェクト一覧取得 | GET | `/api/v1/projects` | ✅ 実装済み | プロジェクト一覧を取得（進捗情報含む） |

**詳細**: [プロジェクト管理API仕様書](../../api/api_project_management.md#31-プロジェクト一覧取得-)

**使用箇所:**
- 画面初期表示時にプロジェクト一覧を取得
- クエリパラメータ `include_progress=true` で進捗情報も含めて取得
- レスポンスに `completed_tasks`, `total_tasks`, `progress_percentage` を含む

### 5.2. 進捗確認API（参照）

詳細な進捗情報を取得するための進捗確認APIが定義されています：

**詳細**: [進捗確認API仕様書](../../api/api_progress_monitoring.md)

| # | API名 | メソッド | エンドポイント | 状態 | 優先度 | 説明 |
|---|------|---------|---------------|------|--------|------|
| 1 | メソッド別タスク一覧取得 | GET | `/api/v1/projects/:projectId/methods/:methodId/tasks` | 🔴 未実装 | ⭐⭐⭐ 高 | 指定メソッドに紐づくタスク一覧を進捗情報付きで取得 |
| 2 | タスク詳細取得 | GET | `/api/v1/tasks/:taskId` | 🔴 未実装 | ⭐⭐ 中 | 指定タスクの詳細情報を取得 |

**主な機能:**
- メソッド単位でタスクの進捗を集約
- 各タスクの詳細情報（担当者、ステータス、実験記録）を取得
- リアルタイム進捗の反映

**将来の統合方針:**
- 現在はプロジェクト一覧API（`include_progress=true`）でタスク進捗を取得
- 進捗確認APIが実装された後は、以下の2段階で情報を取得する設計に移行：
  1. プロジェクト一覧API → プロジェクトの基本情報と概要進捗
  2. 進捗確認API → 詳細な進捗情報（メソッド別、タスク別）
- WorkProgressDetailDialogでの詳細表示時に進捗確認APIを呼び出す

**注意:** 
- 両APIとも現在未実装のため、実装時は適切に統合する必要があります
- APIレスポンス形式は統一レスポンス形式（`success`, `data`, `meta`）に準拠

### 5.2. リクエスト/レスポンス例

#### 5.2.1. プロジェクト一覧取得 ✅

**Request:**
```http
GET /api/v1/projects?page=1&limit=20&include_progress=true
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
```

**Query Parameters:**
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）
- `include_progress`: 進捗情報を含めるか（true/false）

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "project_id": "550e8400-e29b-41d4-a716-446655440000",
        "project_name": "材料実験A",
        "project_folder_name": "PRJ-001",
        "description": "プロジェクトの説明",
        "project_status": "in_progress",
        "is_checked_out": false,
        "checked_out_by": null,
        "checked_out_at": null,
        "owner_id": "user-uuid",
        "owner_name": "佐藤太郎",
        "owner_email": "sato@example.com",
        "department_id": "dept-uuid",
        "department_name": "研究開発部",
        "completed_tasks": 3,
        "total_tasks": 5,
        "progress_percentage": 60,
        "created_at": "2026-01-15T10:00:00Z",
        "updated_at": "2026-01-20T15:30:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
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
| `SYSTEM_DATABASE_ERROR` | 500 | データベースエラー | 再試行を促す |
| `SYSTEM_STORAGE_ERROR` | 500 | ストレージエラー | 再試行を促す |

### 6.3. エラーケース別の処理

| エラーケース | HTTPステータス | エラーコード | 対処方法 |
|-------------|---------------|-------------|----------|
| プロジェクト一覧取得失敗 | 500 | `SYSTEM_DATABASE_ERROR` | message.error表示 + 空配列設定 + 再試行ボタン |
| 進捗詳細取得失敗 | 404 | `RESOURCE_NOT_FOUND` | message.error表示 + モーダルを閉じる |
| タスク進捗一覧取得失敗 | 404 | `RESOURCE_NOT_FOUND` | message.error表示 + 空配列設定 |
| データが0件 | - | - | 空のテーブル表示（Ant Designのデフォルト）「データがありません」 |
| API接続エラー | - | - | useApiフックのerror状態で管理 + 再試行ボタン |

### 6.4. ローディング状態

- useApiフックの`isLoading`でローディング状態を管理
- Table全体にSpinコンポーネントでローディング表示
- 長時間のローディング時はタイムアウト警告（30秒以上）

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Card | フィルターエリア、テーブルエリア | bordered={false} |
| Select | フィルター項目 | style, value, onChange, options |
| Input | 検索 | prefix, placeholder, value, onChange, allowClear |
| Button | 更新ボタン、詳細ボタン | type, icon, onClick, ghost, size |
| Space | 要素の配置 | direction, size, wrap, align |
| Table | プロジェクト一覧 | dataSource, columns, rowKey, pagination, scroll, size |
| Tag | ステータス表示、件数表示 | color |
| Typography.Text | ラベル表示 | type, style |

### 7.2. デザイントークン使用

```typescript
import { theme } from 'antd';
const { token } = theme.useToken();

// 使用箇所
padding: token.paddingLG
backgroundColor: token.colorBgLayout
fontSize: token.fontSizeSM
fontWeight: token.fontWeightStrong
```

### 7.3. カラーパレット

**プロジェクトステータス:**
- planning: default（灰色）
- pending: blue
- in_progress: cyan
- review_waiting: purple
- completed: success（緑）
- error: error（赤）

**チェックアウト状態:**
- チェックアウト中: orange
- チェックイン済み: success（緑）

**件数Tag:**
- blue（情報）

### 7.4. 多言語対応

useLanguage()カスタムフックを使用：

```typescript
const { t } = useLanguage();

t('progress.table.projectName')
t('progress.filter.myOnly')
t('progress.filter.allProjects')
// など
```

### 7.5. レスポンシブ対応

- 画面全体: padding: token.paddingLG
- 背景色: token.colorBgLayout
- 最小高さ: 100vh
- フィルターエリア: flexWrap: 'wrap'（モバイル対応）
- テーブルスクロール: scroll={{ x: 1200 }}（横スクロール有効）

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/progress/ProgressMonitoring.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| WorkProgressDetailDialog | ./WorkProgressDetailDialog.tsx | 詳細表示モーダル |

### 8.3. カスタムフック

| フック | パス | 役割 |
|--------|------|------|
| useLanguage | @/contexts/LanguageContext | 多言語化 |
| useApi | @/hooks/useApi | API通信 |

### 8.4. API関数

| 関数 | パス | 役割 |
|------|------|------|
| fetchProjects | @/utils/apiClient | プロジェクト一覧取得 |

### 8.5. 型定義

| 型 | パス | 役割 |
|----|------|------|
| FileData | @/types/progress | ファイルデータ型 |
| Project | @/types/progress | プロジェクト型 |
| ApiResponse | @/types/api | API共通レスポンス型 |
| ProjectListResponse | @/types/project | プロジェクト一覧レスポンス型 |

---

## 9. 既知の課題・TODO

### 実装待ち

- [ ] 所有者フィルター（my_onlyの実装）
- [ ] managerId の実際のログインユーザーIDへの置き換え
- [ ] 本番環境でのFileData生成（実際のS3キー使用）

### 改善提案

- [ ] エクスポート機能（CSV、Excel）
- [ ] 列の表示/非表示切替
- [ ] カラム幅のカスタマイズ
- [ ] 保存されたフィルター設定の復元
- [ ] リアルタイム更新（WebSocket）
- [ ] グラフ表示（進捗状況の可視化）
- [ ] 一括操作機能
- [ ] 詳細検索モーダル
- [ ] フィルター条件の保存・共有
- [ ] 通知機能（ステータス変更時）

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

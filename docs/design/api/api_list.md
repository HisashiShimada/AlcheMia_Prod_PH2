# API一覧対応表

## メタデータ
- **作成日**: 2026-01-20
- **バージョン**: 2.0.0
- **最終更新**: 2026-01-23
- **担当**: Development Team

---

## 概要

このドキュメントは、mmdpfプロジェクトの全APIエンドポイントを一覧化し、実装ファイルとAPI設計書を対応付けます。

### 使用方法

1. **API名で検索**: 実装したいAPIをこの一覧から探す
2. **ルートファイルを特定**: 実装ファイルパスで該当ファイルを開く
3. **API設計書を参照**: 詳細仕様を確認
4. **実装状態を確認**: 実装済み/未実装を確認

---

## 📋 API一覧

### 1. 認証API（Authentication）

**API設計書**: [api_auth.md](./api_auth.md)  
**ルートファイル**: `backend/src/routes/authRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 1.1 | POST | /api/v1/auth/login | 初回ログイン（PINコード送信） | ✅ 実装済み | AuthController.login |
| 1.2 | POST | /api/v1/auth/verify-pin | PINコード検証・本セッション生成 | ✅ 実装済み | AuthController.verifyPin |
| 1.3 | POST | /api/v1/auth/resend-pin | PINコード再送信 | ✅ 実装済み | AuthController.resendPin |
| 1.4 | POST | /api/v1/auth/reset-password-request | パスワードリセット要求 | ✅ 実装済み | AuthController.resetPasswordRequest |
| 1.5 | POST | /api/v1/auth/reset-password | パスワードリセット実行 | ✅ 実装済み | AuthController.resetPassword |
| 1.6 | POST | /api/v1/auth/logout | ログアウト | ✅ 実装済み | AuthController.logout |

**ミドルウェアチェーン:**
- 1.1, 1.4: 認証不要
- 1.2, 1.3: 仮セッショントークン必須
- 1.5: リセットトークン必須
- 1.6: JWT認証 + テナント分離

**備考:**
- JWT + Session Hybrid認証を使用
- PINコードは6桁数字、有効期限5分
- セッション有効期限はロール別（12〜48時間）

---

### 2. プロジェクト管理API（Project Management）

**API設計書**: [api_project_management.md](./api_project_management.md)  
**ルートファイル**: `backend/src/routes/projectRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 2.1 | GET | /api/v1/projects | プロジェクト一覧取得 | ✅ 実装済み | ProjectController.list |
| 2.2 | POST | /api/v1/projects | プロジェクト作成 | ✅ 実装済み | ProjectController.create |
| 2.3 | POST | /api/v1/projects/:projectId/checkout | チェックアウト | ✅ 実装済み | ProjectController.checkout |
| 2.4 | POST | /api/v1/projects/:projectId/checkin | チェックイン | ✅ 実装済み | ProjectController.checkin |
| 2.5 | GET | /api/v1/projects/:projectId/files | ファイル一覧取得 | ⏳ 未実装 | ProjectController.listFiles |
| 2.6 | GET | /api/v1/projects/:projectId/tasks | タスク一覧取得 | ⏳ 未実装 | ProjectController.listTasks |
| 2.7 | POST | /api/v1/projects/:projectId/reload | プロジェクトリロード | ✅ 実装済み | ProjectController.reload |
| 2.8 | POST | /api/v1/projects/:projectId/instructions | 指示送信（タスク作成） | ⏳ 未実装 | ProjectController.createInstruction |
| 2.9 | GET | /api/v1/projects/:projectId/instructions | 指示一覧取得 | ⏳ 未実装 | ProjectController.listInstructions |
| 2.10 | POST | /api/v1/projects/search | プロジェクト詳細検索 | ⏳ 未実装 | ProjectController.search |
| 2.11 | POST | /api/v1/projects/:projectId/publish | プロジェクト公開 | ⏳ 未実装 | ProjectController.publish |

**ミドルウェアチェーン:**
- すべて: `auth` → `tenantIsolation` → `permissionCheck`
- 権限: Manager以上（Worker は閲覧のみ可能）

**備考:**
- すべてのクエリに organization_id フィルタ必須
- S3操作には organization_prefix を強制適用
- チェックアウト/チェックインで排他編集制御
- トランザクション管理が必要な操作: 2.2, 2.8

---

### 3. 共通API（Common / File Operations）

**API設計書**: [api_common.md](./api_common.md)  
**ルートファイル**: `backend/src/routes/fileRoutes.ts`（推定）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 3.1 | POST | /api/v1/files/upload | ファイルアップロード（汎用） | ⏳ 未実装 | FileController.upload |
| 3.2 | POST | /api/v1/files/download | ファイル/フォルダダウンロード | ⏳ 未実装 | FileController.download |

**ミドルウェアチェーン:**
- すべて: `auth` → `tenantIsolation` → `permissionCheck`
- 権限: Manager以上

**備考:**
- contextパラメータで保存先を判定（project/format）
- フォルダダウンロード時はZIP生成（最大1GB、1000ファイル）
- 署名付きURL有効期限: 1時間（最大24時間）
- マルチテナント分離必須（organization_prefix強制付与）

---

### 4. フォーマット管理API（Format Management）

**API設計書**: [api_format_management.md](./api_format_management.md)  
**ルートファイル**: `backend/src/routes/formatRoutes.ts`（推定）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 4.1 | GET | /api/v1/formats | フォーマット一覧取得 | ⏳ 未実装 | FormatController.list |
| 4.2 | GET | /api/v1/formats/:formatId/files | フォーマットファイル一覧取得 | ⏳ 未実装 | FormatController.listFiles |
| 4.3 | POST | /api/v1/formats/:formatId/files | 新規ファイル作成 | ⏳ 未実装 | FormatController.createFile |
| 4.4 | POST | /api/v1/formats/:formatId/folders | 新規フォルダ作成 | ⏳ 未実装 | FormatController.createFolder |
| 4.5 | PUT | /api/v1/formats/:formatId/files/:fileId | ファイル編集（保存） | ⏳ 未実装 | FormatController.updateFile |

**ミドルウェアチェーン:**
- すべて: `auth` → `tenantIsolation` → `permissionCheck`
- 権限: Manager以上

**備考:**
- ワークフローMAIML（.maiml）とテンプレートXML（.xml）を管理
- S3パス: `org_{organization_prefix}/formats/{format_prefix}/`
- バックアップ機能（.backupフォルダ）
- XMLバリデーション必須（XXE攻撃対策）

---

### 5. Maiml編集API（MAIML Editor）

**API設計書**: [api_maiml_editor.md](./api_maiml_edit.md)  
**ルートファイル**: `backend/src/routes/maimlRoutes.ts`（推定）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 5.1 | POST | /api/v1/maiml/parse | MAIMLパース（複数メソッド構造取得） | ⏳ 未実装 | MaimlController.parse |
| 5.2 | PUT | /api/v1/projects/:projectId/maiml | MAIMLファイル保存（プロジェクト） | ⏳ 未実装 | MaimlController.saveProject |
| 5.3 | PUT | /api/v1/formats/:formatId/maiml | MAIMLファイル保存（フォーマット） | ⏳ 未実装 | MaimlController.saveFormat |
| 5.4 | GET | /api/v1/maiml-files | MAIMLファイル一覧取得 | ⏳ 未実装 | MaimlController.listFiles |
| 5.5 | GET | /api/v1/projects/:projectId/maiml | MAIMLファイル取得（プロジェクト） | ⏳ 未実装 | MaimlController.getProject |
| 5.6 | GET | /api/v1/formats/:formatId/maiml | MAIMLファイル取得（フォーマット） | ⏳ 未実装 | MaimlController.getFormat |
| 5.7 | POST | /api/v1/maiml/validate | MAIMLバリデーション | ⏳ 未実装 | MaimlController.validate |
| 5.8 | POST | /api/v1/maiml/correct | MAIML自動補正 | ⏳ 未実装 | MaimlController.correct |

**ミドルウェアチェーン:**
- すべて: `auth` → `tenantIsolation` → `permissionCheck`
- 権限: Manager以上

**備考:**
- 複数メソッド対応（1ファイルに複数の実験手順）
- Petri Net構造解析
- XMLバリデーション・自動補正機能
- バックアップ機能（archiveフォルダ）
- 旧エンドポイント（`/api/worker/*`）は2026年7月21日廃止予定

---

### 6. 進捗確認API（Progress Monitoring）

**API設計書**: [api_progress_monitoring.md](./api_progress_check.md)  
**ルートファイル**: `backend/src/routes/progressRoutes.ts`（推定）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 6.1 | GET | /api/v1/projects/:projectId/methods/:methodId/tasks | メソッド別タスク一覧取得 | ⏳ 未実装 | ProgressController.listTasks |
| 6.2 | GET | /api/v1/tasks/:taskId | タスク詳細取得 | ⏳ 未実装 | ProgressController.getTaskDetail |

**ミドルウェアチェーン:**
- すべて: `auth` → `tenantIsolation` → `permissionCheck`
- 権限: Manager以上

**備考:**
- メソッド別進捗集約
- タスク詳細情報（担当者、ステータス、実験記録）
- リアルタイム進捗反映
- 進捗情報キャッシュ（5分間）

---

## 🔍 API検索ガイド

### API名で検索する

**例: "プロジェクト一覧を取得したい"**
1. このドキュメントで「プロジェクト一覧取得」を検索
2. API番号: 2.1
3. ルートファイル: `backend/src/routes/projectRoutes.ts`
4. コントローラー: `ProjectController.list`
5. API設計書: [api_project_management.md](./api_project_management.md) のセクション2.1

### エンドポイントで検索する

**例: "POST /api/v1/auth/login の実装を確認したい"**
1. このドキュメントで `/api/v1/auth/login` を検索
2. API番号: 1.1
3. ルートファイル: `backend/src/routes/authRoutes.ts`
4. コントローラー: `AuthController.login`
5. API設計書: [api_auth.md](./api_auth.md) のセクション3.1

### 機能カテゴリで探す

**認証が必要な場合:**
- セクション1: 認証API

**プロジェクト管理が必要な場合:**
- セクション2: プロジェクト管理API

**ファイル操作が必要な場合:**
- セクション3: 共通API（ファイルアップロード/ダウンロード）
- セクション4: フォーマット管理API
- セクション5: Maiml編集API

**進捗確認が必要な場合:**
- セクション6: 進捗確認API

---

## 📊 実装状況サマリー

### 全体統計

| カテゴリ | 総数 | 実装済み | 未実装 | 実装率 |
|---------|------|---------|--------|--------|
| 認証API | 6 | 6 | 0 | 100% |
| プロジェクト管理API | 11 | 5 | 6 | 45% |
| 共通API | 2 | 0 | 2 | 0% |
| フォーマット管理API | 5 | 0 | 5 | 0% |
| Maiml編集API | 8 | 0 | 8 | 0% |
| 進捗確認API | 2 | 0 | 2 | 0% |
| **合計** | **34** | **11** | **23** | **32%** |

### 優先度別実装状況

**Phase 1（基本機能）- 完了:**
- ✅ 認証API（6エンドポイント）
- ✅ プロジェクト一覧取得
- ✅ プロジェクト詳細取得
- ✅ プロジェクト作成
- ✅ 指示送信

**Phase 2（検索・管理機能）- 完了:**
- ✅ プロジェクト詳細検索

**Phase 3（ファイル管理）- 未実装:**
- ⏳ ファイルアップロード/ダウンロード（共通API）
- ⏳ フォーマット管理API（5エンドポイント）
- ⏳ Maiml編集API（8エンドポイント）
- ⏳ チェックイン/チェックアウト
- ⏳ プロジェクトリロード

**Phase 4（進捗・公開機能）- 未実装:**
- ⏳ 進捗確認API（2エンドポイント）
- ⏳ プロジェクト公開

---

## 🛠️ 実装ファイルパス一覧

### ルートファイル
```
backend/src/routes/
├── authRoutes.ts              # 認証API（6エンドポイント）✅ 実装済み
├── projectRoutes.ts           # プロジェクト管理API（10エンドポイント）✅ 実装済み
├── fileRoutes.ts              # 共通API（2エンドポイント）⏳ 未実装
├── formatRoutes.ts            # フォーマット管理API（5エンドポイント）⏳ 未実装
├── maimlRoutes.ts             # Maiml編集API（8エンドポイント）⏳ 未実装
└── progressRoutes.ts          # 進捗確認API（2エンドポイント）⏳ 未実装
```

### コントローラーファイル（推定）
```
backend/src/controllers/
├── authController.ts          # 認証コントローラー ✅
├── projectController.ts       # プロジェクト管理コントローラー ✅
├── fileController.ts          # ファイルコントローラー ⏳
├── formatController.ts        # フォーマット管理コントローラー ⏳
├── maimlController.ts         # Maiml編集コントローラー ⏳
└── progressController.ts      # 進捗確認コントローラー ⏳
```

### サービスファイル（推定）
```
backend/src/services/
├── authService.ts             # 認証サービス ✅
├── projectService.ts          # プロジェクトサービス ✅
├── storageService.ts          # S3操作サービス ✅
├── emailService.ts            # メール送信サービス ✅
├── formatService.ts           # フォーマットサービス ⏳
├── maimlService.ts            # Maimlパースサービス ⏳
└── progressService.ts         # 進捗サービス ⏳
```

---

## ⚠️ 重要な設計原則

### マルチテナント分離（必須）

すべてのAPIで以下を徹底：
```typescript
// ✅ 良い例
const projects = await db.query(
  'SELECT * FROM projects WHERE organization_id = $1',
  [organizationId]
);

// ❌ 悪い例
const projects = await db.query('SELECT * FROM projects');
```

### ミドルウェアチェーン（必須）

すべての認証付きAPIで以下の順序を適用：
```typescript
router.get('/projects',
  auth,                        // 1. JWT認証
  tenantIsolation,            // 2. テナント分離
  permissionCheck(['manager']), // 3. 権限チェック
  projectController.list       // 4. ルートハンドラ
);
```

### S3操作（必須）

organization_prefix を必ず含める：
```typescript
// ✅ 良い例
const path = `org_${organizationPrefix}/projects/${projectName}/file.maiml`;

// ❌ 悪い例
const path = `projects/${projectName}/file.maiml`;
```

### RESTful設計原則

- リソース指向のURL設計
- 適切なHTTPメソッド使用（GET/POST/PUT/PATCH/DELETE）
- 動詞はサブリソースとして配置（例: `/maiml/parse`, `/maiml/validate`）
- kebab-case統一（例: `/api/v1/maiml-files`）

---

## 📝 更新ガイドライン

### 新規API追加時

1. **API設計書を作成または更新**
   - `docs/design/api/api_*.md` に仕様を記載

2. **このドキュメントを更新**
   - 該当カテゴリのテーブルに追加
   - 実装状況サマリーを更新

3. **実装ファイルを作成**
   - ルート、コントローラー、サービスを実装

4. **テストを追加**
   - `backend/tests/` にテストケースを追加

### API仕様変更時

1. **API設計書を更新**
   - 変更内容と変更履歴を記録

2. **このドキュメントを更新**
   - 説明欄を更新（必要に応じて）

3. **実装を修正**
   - ルート、コントローラー、サービスを修正

4. **テストを更新**
   - 変更に合わせてテストケースを修正

---

## 🔗 関連ドキュメント

### 規約
- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一ルール
- [バックエンド規約](../../.clinerules/development/backend.md) - 実装規約
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティ要件

### 参照ドキュメント
- [API構成定義](../../.clinerules/references/api_structure.md) - API構成の参照ルール
- [データベース構造](../../.clinerules/references/db_structure.md) - DB設計
- [S3構造](../../.clinerules/references/s3_structure.md) - S3フォルダ構成

### API設計書
- [認証API](./api_auth.md) - 認証・セッション管理
- [プロジェクト管理API](./api_project_management.md) - プロジェクト操作
- [共通API](./api_common.md) - ファイルアップロード/ダウンロード
- [フォーマット管理API](./api_format_management.md) - フォーマット管理
- [Maiml編集API](./api_maiml_edit.md) - MAIML編集・パース
- [進捗確認API](./api_progress_check.md) - タスク進捗確認

---

## 📋 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.1.0 | 2026-01-23 | プロジェクト管理APIを最新化（34エンドポイント） | Cline |
| | | - プロジェクト管理API: 10→11エンドポイントに更新 | |
| | | - チェックアウト/チェックイン機能を追加 | |
| | | - ファイル一覧/タスク一覧/指示一覧取得を追加 | |
| | | - プロジェクト詳細取得を削除（設計書に未記載） | |
| 2.0.0 | 2026-01-23 | 全API仕様書を反映して大幅更新（33エンドポイント登録） | Cline |
| | | - 共通API追加（2エンドポイント） | |
| | | - フォーマット管理API追加（5エンドポイント） | |
| | | - Maiml編集API追加（8エンドポイント） | |
| | | - 進捗確認API追加（2エンドポイント） | |
| | | - 実装状況サマリーを更新 | |
| | | - RESTful設計原則を追記 | |
| 1.0.0 | 2026-01-20 | 初版作成（17エンドポイント登録） | Development Team |

---

**注意**: このドキュメントは実装状況に合わせて定期的に更新してください。新しいAPIを追加した際は、必ずこのドキュメントも更新してください。
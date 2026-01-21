# API一覧対応表

## メタデータ
- **作成日**: 2026-01-20
- **バージョン**: 1.0.0
- **最終更新**: 2026-01-20
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
| 2.2 | GET | /api/v1/projects/:projectId | プロジェクト詳細取得 | ✅ 実装済み | ProjectController.getDetail |
| 2.3 | POST | /api/v1/projects | プロジェクト作成 | ✅ 実装済み | ProjectController.create |
| 2.4 | POST | /api/v1/projects/:projectId/instructions | 指示送信（タスク作成） | ✅ 実装済み | ProjectController.createInstruction |
| 2.5 | POST | /api/v1/projects/search | プロジェクト詳細検索 | ✅ 実装済み | ProjectController.search |
| 2.6 | PATCH | /api/v1/projects/:projectId/checkout-status | チェックイン/チェックアウト切替 | ⏳ 未実装 | - |
| 2.7 | POST | /api/v1/projects/:projectId/files/upload | ファイルアップロード | ⏳ 未実装 | - |
| 2.8 | GET | /api/v1/projects/:projectId/files/:fileName/download | ファイルダウンロード（署名付きURL） | ⏳ 未実装 | - |
| 2.9 | POST | /api/v1/projects/:projectId/reload | プロジェクトリロード | ⏳ 未実装 | - |
| 2.10 | POST | /api/v1/projects/:projectId/publish | プロジェクト公開 | ⏳ 未実装 | - |

**ミドルウェアチェーン:**
- すべて: `auth` → `tenantIsolation` → `permissionCheck`
- 2.1, 2.2, 2.5: Manager以上（Worker: 割り当てプロジェクトのみ）
- 2.3, 2.4, 2.6〜2.10: Manager以上

**備考:**
- すべてのクエリに organization_id フィルタ必須
- S3操作には organization_prefix を強制適用
- トランザクション管理が必要な操作: 2.3, 2.4, 2.7

---

### 3. ファイルダウンロードAPI（File Download）

**API設計書**: 未作成（api_project_management.mdに含まれる）  
**ルートファイル**: `backend/src/routes/fileDownloadRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 3.1 | GET | /api/v1/files/download | 汎用ファイルダウンロード | ⚠️ 要確認 | FileDownloadController.download |

**ミドルウェアチェーン:**
- `auth` → `tenantIsolation` → `permissionCheck`

**備考:**
- S3署名付きURLを生成（有効期限: 1時間）
- organization_prefix の検証必須
- プロジェクトAPI（2.8）との重複を要確認

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
- セクション2.7, 2.8: ファイルアップロード/ダウンロード
- セクション3: 汎用ファイルダウンロード

---

## 📊 実装状況サマリー

### 全体統計

| カテゴリ | 総数 | 実装済み | 未実装 | 実装率 |
|---------|------|---------|--------|--------|
| 認証API | 6 | 6 | 0 | 100% |
| プロジェクト管理API | 10 | 5 | 5 | 50% |
| ファイルダウンロードAPI | 1 | 0 | 1 | 0% |
| **合計** | **17** | **11** | **6** | **65%** |

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
- ⏳ チェックイン/チェックアウト
- ⏳ ファイルアップロード
- ⏳ ファイルダウンロード
- ⏳ プロジェクトリロード

**Phase 4（公開機能）- 未実装:**
- ⏳ プロジェクト公開

---

## 🛠️ 実装ファイルパス一覧

### ルートファイル
```
backend/src/routes/
├── authRoutes.ts              # 認証API（6エンドポイント）
├── projectRoutes.ts           # プロジェクト管理API（10エンドポイント）
└── fileDownloadRoutes.ts      # ファイルダウンロードAPI（1エンドポイント）
```

### コントローラーファイル（推定）
```
backend/src/controllers/
├── authController.ts          # 認証コントローラー
├── projectController.ts       # プロジェクト管理コントローラー
└── fileDownloadController.ts # ファイルダウンロードコントローラー
```

### サービスファイル（推定）
```
backend/src/services/
├── authService.ts             # 認証サービス
├── projectService.ts          # プロジェクトサービス
├── storageService.ts          # S3操作サービス
└── emailService.ts            # メール送信サービス
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

- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一ルール
- [バックエンド規約](../../.clinerules/development/backend.md) - 実装規約
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティ要件
- [データベース構造](../../.clinerules/references/db_structure.md) - DB設計
- [S3構造](../../.clinerules/references/s3_structure.md) - S3フォルダ構成

---

## 📋 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-20 | 初版作成（17エンドポイント登録） | Development Team |

---

**注意**: このドキュメントは実装状況に合わせて定期的に更新してください。新しいAPIを追加した際は、必ずこのドキュメントも更新してください。

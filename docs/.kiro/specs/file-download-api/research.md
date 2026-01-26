# Research Log: file-download-api

**Feature**: ファイルダウンロードAPI実装
**Discovery Type**: Light (Extension)
**Created**: 2026-01-19T13:45:00+09:00

## Summary

既存のmmdpfプロジェクト管理システムに2つのファイルダウンロードAPIエンドポイントを追加する拡張機能。既存のストレージサービス、認証ミドルウェア、データベーステーブルを活用し、新規ライブラリ依存なしで実装可能。

**主要な発見**:
- 既存の`storageService.getSignedUrl()`をそのまま使用可能
- 既存の`auth` + `tenantIsolation`ミドルウェアチェーンを適用
- `file_metadata`テーブルで既にファイル情報を管理済み
- パストラバーサル対策は新規実装が必要

**統合リスク**: 低（既存パターンの踏襲）

## Research Topics

### 1. Existing Storage Service Integration

**Investigation**:
既存の`backend/src/services/storageService.ts`を調査し、S3署名付きURL生成機能を確認。

**Findings**:
```typescript
// 既存メソッド（確認済み）
async getSignedUrl(
  organizationPrefix: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string>
```

**Implications**:
- 新規実装不要、既存メソッドを直接使用
- organization_prefixの強制適用が既に組み込まれている
- 有効期限（デフォルト1時間）の設定が可能

**Sources**:
- `.clinerules/references/s3_structure.md` - S3パス構造定義
- `.clinerules/development/backend.md` - storageService使用ガイド

---

### 2. Middleware Chain and Authentication

**Investigation**:
既存の認証・認可ミドルウェアの適用パターンを確認。

**Findings**:
標準的なミドルウェアチェーン:
```typescript
router.get('/endpoint',
  auth,                  // JWT認証
  tenantIsolation,       // テナント分離
  permissionCheck(['manager', 'admin']), // 権限チェック
  controller.handler
);
```

**Implications**:
- 新規ミドルウェア不要
- ファイルダウンロードAPIにも同じパターンを適用
- `req.organizationPrefix`が自動設定される
- `req.user`にユーザー情報が格納される

**Sources**:
- `.clinerules/development/backend.md` - ミドルウェアチェーン規約
- `.clinerules/development/security.md` - 認証・認可の詳細

---

### 3. File Metadata Database Schema

**Investigation**:
`file_metadata`テーブルの構造を確認し、ファイル情報取得方法を検討。

**Findings**:
```sql
-- file_metadata テーブル（既存）
CREATE TABLE file_metadata (
  organization_id UUID NOT NULL,
  file_id UUID NOT NULL,
  bucket_name VARCHAR(255),
  object_key VARCHAR(1024),
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  file_size BIGINT,
  content_type VARCHAR(100),
  last_modified TIMESTAMP,
  PRIMARY KEY (organization_id, file_id)
);
```

**Implications**:
- ファイルメタデータ取得に使用
- S3パスの検証に利用
- ファイル存在確認の補助として活用

**Sources**:
- `.clinerules/references/db_structure.md` - データベース構造定義
- `docs/design/db/db_table_list.md` - テーブル一覧

---

### 4. Path Traversal Security

**Investigation**:
パストラバーサル攻撃への対策方法を調査。

**Findings**:
- ファイル名サニタイゼーション関数の実装が必要
- `../` や `..\\` の除去
- 絶対パスの禁止

**Implementation Approach**:
```typescript
const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/\.\.[\/\\]/g, '');
};

const isValidPath = (filePath: string): boolean => {
  return !/^\/|\.\./.test(filePath);
};
```

**Sources**:
- `.clinerules/development/security.md` - セキュリティ規約
- OWASP Path Traversal Prevention Cheat Sheet

---

### 5. Error Handling Patterns

**Investigation**:
既存のエラーハンドリングパターンを確認。

**Findings**:
統一されたエラーレスポンス形式:
```typescript
// エラー時
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": []
  },
  "meta": {
    "timestamp": "2026-01-19T10:50:00Z",
    "requestId": "req_xxx"
  }
}
```

エラークラス:
- `ValidationError` (400)
- `AuthenticationError` (401)
- `AuthorizationError` (403)
- `NotFoundError` (404)
- `DatabaseError` (500)

**Implications**:
- 既存のエラークラスを使用
- 統一されたエラーハンドリングミドルウェアを適用

**Sources**:
- `.clinerules/development/backend.md` - エラーハンドリング規約
- `.clinerules/development/api.md` - API設計ポリシー

---

## Architecture Pattern Evaluation

### Selected Pattern: Layered Architecture (既存)

**Rationale**:
既存システムのレイヤードアーキテクチャを踏襲。新規パターン導入によるコンプレックスを回避。

**Layers**:
1. **Routes**: HTTPリクエストのルーティング
2. **Middleware**: 認証・認可・テナント分離
3. **Controllers**: リクエスト/レスポンス処理
4. **Services**: ビジネスロジック
5. **Repositories**: データアクセス（file_metadataテーブル）
6. **Storage Service**: S3/Swift操作（既存）

**Boundary Map**:
```
Client (React)
    ↓
API Gateway (Express Routes)
    ↓
Middleware Chain (auth → tenantIsolation → permissionCheck)
    ↓
Controller (downloadController)
    ↓
Service (fileDownloadService)
    ↓
├─ Repository (fileMetadataRepository)
└─ Storage Service (storageService)
```

---

## Design Decisions

### Decision 1: Use Existing storageService

**Context**: S3署名付きURL生成機能が必要

**Options Considered**:
1. 既存の`storageService.getSignedUrl()`を使用
2. 新規にS3 SDKを直接使用

**Decision**: オプション1を選択

**Rationale**:
- organization_prefix強制が既に実装済み
- 一貫したエラーハンドリング
- Swift/S3の抽象化が完了
- テスト済みの信頼性

---

### Decision 2: Two Separate API Endpoints

**Context**: 単一ファイルダウンロードとプロジェクト一括ダウンロード

**Options Considered**:
1. 2つの独立したエンドポイント
2. クエリパラメータで切り替える単一エンドポイント

**Decision**: オプション1を選択（2つのエンドポイント）

**Rationale**:
- APIの意図が明確
- レスポンス形式が異なる
- パフォーマンス最適化が独立
- RESTful設計の原則に準拠

---

### Decision 3: Sequential Download on Frontend

**Context**: プロジェクト一括ダウンロード時のファイル取得方法

**Options Considered**:
1. サーバー側でZIP作成して返却
2. 署名付きURLリストを返却し、クライアント側で順次ダウンロード

**Decision**: オプション2を選択（クライアント側順次ダウンロード）

**Rationale**:
- サーバー負荷の軽減
- メモリ使用量の削減
- タイムアウトリスクの回避
- ユーザーへの進捗表示が容易

---

## Technology Alignment

### Backend Stack (既存を維持)
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.3
- **Language**: TypeScript
- **Authentication**: JWT + Session Hybrid
- **Storage**: AWS SDK v3 (@aws-sdk/client-s3)
- **Database**: PostgreSQL (Kysely query builder)
- **Logging**: Winston

### Frontend Stack (既存を維持)
- **Framework**: Next.js 15 + React 18.2.0
- **UI Library**: Ant Design v6
- **Language**: TypeScript
- **HTTP Client**: Axios 1.9.0

### No New Dependencies Required
すべて既存ライブラリで実装可能。

---

## Integration Points

### Backend Integration
**新規ファイル**:
- `backend/src/routes/fileDownloadRoutes.ts` - ルート定義
- `backend/src/controllers/fileDownloadController.ts` - コントローラー
- `backend/src/services/fileDownloadService.ts` - ビジネスロジック
- `backend/src/repositories/fileMetadataRepository.ts` - データアクセス

**既存ファイルの修正**:
- `backend/src/server.ts` - 新規ルートの追加

### Frontend Integration
**修正ファイル**:
- `frontend/src/components/project/FileListTable.tsx` - ダウンロードボタンの実装
- `frontend/src/components/project/ProjectManagement.tsx` - プロジェクトダウンロードボタンの実装

**新規ファイル（オプション）**:
- `frontend/src/utils/fileDownload.ts` - ダウンロードユーティリティ関数

---

## Risks and Mitigations

### Risk 1: 大量ファイル一括ダウンロードのパフォーマンス

**Impact**: Medium
**Probability**: Medium

**Mitigation**:
- ページネーション機能の実装（100件ごと）
- フロントエンドでの順次ダウンロード
- タイムアウト設定（30秒）

---

### Risk 2: 署名付きURLの有効期限切れ

**Impact**: Low
**Probability**: Medium

**Mitigation**:
- 有効期限を1時間に設定（十分な時間）
- エラーメッセージで再取得を促す
- フロントエンドでリトライ機能を実装

---

### Risk 3: パストラバーサル攻撃

**Impact**: High
**Probability**: Low

**Mitigation**:
- ファイル名サニタイゼーション関数の実装
- パス検証ロジックの追加
- ユニットテストでエッジケースを確認

---

## Open Questions

### Q1: アーカイブファイルの自動削除ポリシー
**Status**: To be decided
**Context**: アーカイブフォルダ内の古いバージョンファイルの保持期間
**Impact**: ストレージコスト、パフォーマンス

### Q2: ダウンロード履歴の保存期間
**Status**: To be decided
**Context**: 監査ログの保存期間とローテーション
**Impact**: コンプライアンス、ストレージコスト

---

## Performance Considerations

### Target Metrics (Requirements)
- 署名付きURL生成: 200ms以内
- 同時リクエスト処理: 100 req/sec以上
- タイムアウト: 30秒

### Implementation Strategy
- 署名付きURL生成は軽量（CPU負荷低）
- S3操作はI/O bound（並列処理可能）
- ページネーションで大量ファイル対応

---

## Testing Strategy

### Unit Tests
- Path sanitization functions
- storageService mock tests
- Error handling scenarios

### Integration Tests
- API endpoint tests (success/error cases)
- Middleware chain validation
- Database integration

### Security Tests
- Path traversal attack prevention
- Cross-tenant access prevention
- JWT token validation

---

## Compliance and Security

### マルチテナント分離
- organization_prefix強制適用
- テナント分離ミドルウェア必須
- クロステナントアクセス禁止

### 監査ログ
- 全ダウンロード操作を記録
- Admin権限の操作は`admin_audit_log`に記録

---

## Conclusion

本機能は既存システムへの低リスクな拡張。新規ライブラリ依存なし、既存パターンの踏襲により、実装の複雑性を最小限に抑えられる。主要なリスクはパストラバーサル攻撃のみで、適切なバリデーションで対応可能。

# 情報ダウンロードAPI設計書

## メタデータ
- **作成日**: 2026-02-26
- **バージョン**: 1.0.0
- **担当**: Development Team
- **対象画面**: 情報ダウンロード画面（プロバイダーメニュー）

---

## 概要

プロバイダーが全組織の統計情報をCSV形式でダウンロードするAPIです。

**ルートファイル**: `backend/src/routes/organizationRoutes.ts`  
**コントローラー**: `backend/src/controllers/organizationController.ts`  
**権限**: provider（`authMiddleware`のみ）

---

## API一覧

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 |
|----|-------------|---------------|------|---------|
| 1.1 | GET | /api/v1/provider/organization/download-information-csv | 情報CSVダウンロード | ✅ 実装済み |

---

## API詳細

### 1.1 情報CSVダウンロード

#### 基本情報

| 項目 | 内容 |
|------|------|
| HTTPメソッド | GET |
| エンドポイント | `/api/v1/provider/organization/download-information-csv` |
| 説明 | 全組織の統計情報（組織・ユーザー・プロジェクト等）をCSV形式でダウンロードする |
| 認証 | 必須（`authMiddleware`） |
| 権限 | provider |

#### ミドルウェアチェーン

```
authMiddleware → downloadInformationCsv
```

#### リクエスト

**クエリパラメータ**: なし  
**リクエストボディ**: なし  
**リクエストヘッダー**: Cookie（セッションCookie）

#### レスポンス

**成功時（200 OK）**

| ヘッダー | 値 |
|--------|-----|
| Content-Type | `text/csv; charset=utf-8` |
| Content-Disposition | `attachment; filename=information_YYYYMMDDHHMMSS.csv` |

**CSVカラム構成:**

| カラム名 | 説明 |
|---------|------|
| organization_id | 組織ID（UUID） |
| organization_cd | 組織コード |
| organization_display_name | 組織表示名 |
| corporation_name | 会社名 |
| is_active | アクティブ状態（true/false） |
| user_count | 総ユーザー数 |
| active_user_count | アクティブユーザー数 |
| project_count | 総プロジェクト数 |
| created_at | 組織作成日時 |

**ファイル名形式:**
```
information_YYYYMMDDHHMMSS.csv
例: information_20260226174530.csv
```

**エラー時**

| ステータスコード | エラーコード | 説明 |
|----------------|-------------|------|
| 401 Unauthorized | UNAUTHORIZED | 認証エラー |
| 403 Forbidden | FORBIDDEN | 権限不足（provider以外） |
| 500 Internal Server Error | SYSTEM_ERROR | サーバー内部エラー |

```json
{
  "success": false,
  "error": {
    "code": "SYSTEM_ERROR",
    "message": "情報CSVのダウンロードに失敗しました"
  }
}
```

#### フロントエンド実装

**APIサービス**: `frontend/src/components/Provider/InformationDownload.tsx`（直接呼び出し）

```typescript
const response = await client.get(
  '/provider/organization/download-information-csv',
  { responseType: 'blob' }
);
```

**ファイル名取得優先順位:**
1. レスポンスヘッダーの `Content-Disposition` からファイル名を抽出
2. 取得できない場合はフロントエンドで `information_YYYYMMDDHHMMSS.csv` を生成

---

## セキュリティ考慮事項

- `authMiddleware` によるJWT認証必須
- provider権限のユーザーのみアクセス可能
- 全組織データを取得するためマルチテナント分離の対象外（provider専用API）

---

## 関連ドキュメント

- [API一覧](./api_list.md)
- [組織管理API](./api_organization_management.md)

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-02-26 | 初版作成 | Cline |

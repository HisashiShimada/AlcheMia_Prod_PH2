# タスク計画書: fetchProjects 401エラー修正

## メタデータ
- **作成日時**: 2026-03-09 16:06
- **タスクID**: fetchProjects_401fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

進捗確認タブ（ProgressMonitoring）に遷移したタイミングで `GET /api/v1/projects` が 401 Unauthorized を返す問題を修正する。

---

## 調査結果

### 発生事象

```
GET http://localhost:3001/api/v1/projects
→ 401 Unauthorized
{
  "success": false,
  "error": {
    "code": "AUTH_TOKEN_MISSING",
    "message": "認証トークンが提供されていません"
  }
}
```

### 根本原因

`frontend/src/utils/apiClient.ts` の `fetchProjects()` が **`Authorization` ヘッダーを付与せず** にAPIを呼び出しているため、バックエンドの認証ミドルウェアで 401 を返している。

#### 問題のコード（修正前）

```typescript
// fetchProjects() - 問題箇所
export async function fetchProjects(): Promise<ApiResponse<ProjectListResponse>> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'GET',
    credentials: 'include', // Cookie認証のみ
    headers: {
      'Content-Type': 'application/json',
      // ← Authorization ヘッダーなし！
    },
  });
  ...
}
```

`fetch()` を直接使用しており、`localStorage` の `sessionToken` を読み込む処理がない。

#### バックエンドの認証フロー

`backend/src/middleware/authMiddleware.ts` は `Authorization` ヘッダーからトークンを取得する。Cookieは参照しない。

```typescript
const authHeader = req.headers.authorization;
if (!authHeader || authHeader.trim() === '') {
  // → 401 AUTH_TOKEN_MISSING
}
```

#### 正しい実装パターン（他のAPI関数）

`fetchFormats()` 等は `createApiClient()` を使用しており、リクエストインターセプターが自動的に `Authorization: Bearer <token>` を付与する。

```typescript
export async function fetchFormats(...) {
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient(); // ← axios インスタンス（自動でAuthヘッダー付与）
  const response = await client.get<...>(`/formats`);
  ...
}
```

#### 不整合のあるAPI関数一覧

| 関数名 | 実装 | Authorizationヘッダー |
|--------|------|----------------------|
| `fetchProjects` | `fetch()` 直接 | ❌ なし → **要修正** |
| `fetchProjectById` | `fetch()` 直接 | ❌ なし → **要修正** |
| `fetchProjectFilesReal` | `fetch()` 直接 | ❌ なし → 関連修正 |
| `fetchFormats` | `createApiClient()` | ✅ 自動付与 |
| `fetchFormatFiles` | `createApiClient()` | ✅ 自動付与 |

---

## 目的と期待される成果

- [ ] `fetchProjects()` が `Authorization` ヘッダーを付与してAPIを呼び出す
- [ ] 進捗確認タブでプロジェクト一覧が正常に取得できる
- [ ] `fetchProjectById()` も合わせて修正（同じ問題を抱えているため）
- [ ] `fetchProjectFilesReal()` も合わせて修正（詳細ボタン押下時に使用）

---

## 実装ステップ

### Step 1: `fetchProjects` を `createApiClient()` 経由に変更
- [ ] `fetchProjects()` の実装を `fetch()` から `createApiClient()` に変更

### Step 2: `fetchProjectById` を `createApiClient()` 経由に変更
- [ ] `fetchProjectById()` の実装を `fetch()` から `createApiClient()` に変更

### Step 3: `fetchProjectFilesReal` を `createApiClient()` 経由に変更
- [ ] `fetchProjectFilesReal()` の実装を `fetch()` から `createApiClient()` に変更

---

## 変更ファイル

1. `frontend/src/utils/apiClient.ts` - `fetchProjects`, `fetchProjectById`, `fetchProjectFilesReal` を修正

---

## リスク

| リスク | 対策 |
|--------|------|
| `createApiClient()` の動的インポートで循環参照が発生する | 既存の `fetchFormats` と同じパターンで実装するため問題なし |
| 修正後にレスポンス形式が変わり画面が壊れる | axios の `response.data` を返すように統一する |

---

## テスト計画

- [ ] 進捗確認タブに遷移して、プロジェクト一覧が表示されることを確認
- [ ] Network タブで `Authorization: Bearer ...` ヘッダーが付与されていることを確認
- [ ] 詳細ボタン押下時にファイル一覧が正常に取得できることを確認

---

## 承認記録
- **承認日時**: 2026-03-09 16:06

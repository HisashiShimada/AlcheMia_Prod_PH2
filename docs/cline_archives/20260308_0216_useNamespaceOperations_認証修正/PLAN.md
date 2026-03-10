# タスク計画書: useNamespaceOperations 認証エラー修正

## メタデータ
- **作成日時**: 2026-03-08 00:18
- **タスクID**: useNamespaceOperations_認証修正
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

`GET /api/v1/maiml/file-content` の呼び出しが `401 Unauthorized (AUTH_TOKEN_MISSING)` で失敗する問題を修正する。

## 2. 調査結果

### エラー内容

```
GET http://localhost:3001/api/v1/maiml/file-content?key=a0718dc5-.../formats/DEP004/result/contentTEST.xml
401 Unauthorized
{
    "success": false,
    "error": {
        "code": "AUTH_TOKEN_MISSING",
        "message": "認証トークンが提供されていません"
    }
}
```

### 根本原因

`frontend/src/components/editorv2/hooks/useNamespaceOperations.ts` 内の2つの関数が、認証トークンを自動付与する `createApiClient()` を使わず、生の `fetch` API を使っているため。

#### 問題のある関数

**① `fetchFileContent`（ファイル内容取得）**

```typescript
// ❌ 現状: 生 fetch + credentials:'include' のみ → 認証トークンなし → 401
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';  // '/api/v1' ではない

const fetchFileContent = async (fileKey: string): Promise<string> => {
  const response = await fetch(
    `${API_BASE_URL}/maiml/file-content?key=${encodeURIComponent(fileKey)}`,
    { credentials: 'include' }
  );
```

**② `fetchFileList`（ファイル一覧取得）**

```typescript
// ❌ 現状: 生 fetch + credentials:'include' のみ → 認証トークンなし → 同様に認証エラーの可能性
const fetchFileList = async (): Promise<S3File[]> => {
  const response = await fetch(`${API_BASE_URL}/s3/files`, {
    credentials: 'include'
  });
```

#### 正しい実装（templateApi.ts）

```typescript
// ✅ createApiClient() を使用 → 認証トークンが自動付与される
const client = createApiClient();
const response = await client.get('/maiml/file-content', {
  params: { key: fileKey },
});
```

#### authUtils.ts の createApiClient()

```typescript
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
// axiosインスタンスにインターセプターで認証ヘッダーを自動付与
```

### 比較表

| 項目 | useNamespaceOperations.ts（現状） | templateApi.ts（正しい） |
|------|----------------------------------|------------------------|
| 通信方法 | `fetch` (生) | axios (`createApiClient()`) |
| 認証 | Cookie のみ (`credentials: 'include'`) | 認証トークン自動付与 |
| APIパス | `/api/maiml/...`（v1 なし） | `/maiml/...`（createApiClientがv1付与） |
| 結果 | **401 AUTH_TOKEN_MISSING** | ✅ 正常 |

## 3. 目的と期待される成果

### 目的
- 名前空間テンプレート取り込み機能でファイル内容が取得できるようにする

### 期待される成果
- [ ] `fetchFileContent` が認証付きで動作し、ファイル内容を正常取得できる
- [ ] `fetchFileList` も認証付きで動作する

## 4. 実装ステップ

### Phase 1: fetchFileContent の修正
- [x] `createApiClient` のimportを追加
- [x] `fetchFileContent` 関数をcreateApiClient使用に変更

### Phase 2: fetchFileList の修正
- [x] `fetchFileList` 関数をcreateApiClient使用に変更
- [x] エンドポイントを `/s3/files` から `/maiml/files` に変更（v1ルーティング対応）

## 5. 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/components/editorv2/hooks/useNamespaceOperations.ts` | `fetchFileContent`, `fetchFileList` を `createApiClient()` 使用に変更 |

## 6. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| fetchFileList のエンドポイント変更による動作変化 | 低 | `/maiml/files` は同等のファイル一覧を返すAPIとして存在する |

## 7. 承認記録
- **計画書提示日時**: 2026-03-08 00:18
- **承認日時**: 2026-03-08 00:18（ユーザー承認済み）

## 8. 実施記録

### 実施日時
開始: 2026-03-08 00:18
完了: 2026-03-08 00:20

### 変更点
`frontend/src/components/editorv2/hooks/useNamespaceOperations.ts` を修正:

1. **import 追加**
   ```typescript
   import { createApiClient } from '@/utils/authUtils';
   ```

2. **`fetchFileList` を修正**
   - `fetch` → `createApiClient().get('/maiml/files')` に変更
   - エンドポイント: `/s3/files` → `/maiml/files`（v1ルーティング対応）

3. **`fetchFileContent` を修正**
   - `fetch` → `createApiClient().get('/maiml/file-content')` に変更
   - レスポンス構造: `response.data?.data?.data?.content` で取得

4. **`API_BASE_URL` 定数を削除**
   - `createApiClient()` が `http://localhost:3001/api/v1` を baseURL として保持するため不要

### 最終的な成果物
- [x] `fetchFileContent` が認証付きで動作し、ファイル内容を正常取得できる
- [x] `fetchFileList` も認証付きで動作する

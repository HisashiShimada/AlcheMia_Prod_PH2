# タスク計画書: useNamespaceOperations APIパス v1重複修正

## メタデータ
- **作成日時**: 2026-03-08 00:12
- **タスクID**: useNamespaceOperations_API_v1_fix
- **優先度**: 高
- **推定工数**: 0.1時間

## タスク概要

`useNamespaceOperations.ts` の `fetchFileContent` 関数で、APIリクエストURLに `/v1` が重複している問題を修正する。

## 調査結果

### 発生している問題

リクエストURLが以下のようになっている：

```
http://localhost:3001/api/v1/v1/maiml/file-content?key=...
```

`v1` が二重に付与されており、APIエンドポイントが存在しないパスへのリクエストとなっている。

### 原因

#### 問題のあるコード（useNamespaceOperations.ts）

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const fetchFileContent = async (fileKey: string): Promise<string> => {
  const response = await fetch(
    `${API_BASE_URL}/v1/maiml/file-content?key=${encodeURIComponent(fileKey)}`,
    { credentials: 'include' }
  );
```

#### 環境変数の値

```
NEXT_PUBLIC_API_URL = http://localhost:3001/api/v1
```

#### URLの組み立て結果

```
http://localhost:3001/api/v1  +  /v1/maiml/file-content
= http://localhost:3001/api/v1/v1/maiml/file-content  ← v1 が重複
```

### 正しいURL

```
http://localhost:3001/api/v1/maiml/file-content
```

### 他のAPIサービスとの比較

`templateApi.ts` は `createApiClient()` 経由で axios を使用しており、baseURL に `/api/v1` が含まれているため、パスに `/v1` を含めない正しい実装になっている：

```typescript
// templateApi.ts（正しい実装）
const client = createApiClient();  // baseURL = http://localhost:3001/api/v1
const response = await client.get('/maiml/file-content', { params: { key: fileKey } });
```

一方、`useNamespaceOperations.ts` は `fetch` を直接使用し、URLを手動で組み立てているため、`API_BASE_URL` に既に含まれている `/v1` を重複して付与してしまっている。

### 影響範囲

| ファイル | 関数 | 問題 |
|---------|------|------|
| `frontend/src/components/editorv2/hooks/useNamespaceOperations.ts` | `fetchFileContent` | `/v1` が重複 |

`fetchFileList` 関数は `/api/s3/files` を使用しており、`/v1` を付与していないため問題なし。

## 修正内容

### 修正前

```typescript
const fetchFileContent = async (fileKey: string): Promise<string> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/maiml/file-content?key=${encodeURIComponent(fileKey)}`,
      { credentials: 'include' }
    );
```

### 修正後

```typescript
const fetchFileContent = async (fileKey: string): Promise<string> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/maiml/file-content?key=${encodeURIComponent(fileKey)}`,
      { credentials: 'include' }
    );
```

## 変更ファイル

1. `frontend/src/components/editorv2/hooks/useNamespaceOperations.ts` - `/v1` を削除

## 実装ステップ

- [ ] Step 1: `useNamespaceOperations.ts` の `fetchFileContent` 関数のURLパスを修正

## テスト計画

- [ ] 名前空間取り込みダイアログを開く
- [ ] テンプレートファイルを選択する
- [ ] APIリクエストが `http://localhost:3001/api/v1/maiml/file-content?key=...` になっていること（v1重複なし）を確認
- [ ] ファイル内容が正常に取得できることを確認

## 承認記録

- **計画書提示日時**: 2026-03-08 00:12
- **承認日時**: 2026-03-08 00:12
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-03-08 00:12
完了: 2026-03-08 00:13

### 最終的な成果物
- [x] `useNamespaceOperations.ts` の修正完了

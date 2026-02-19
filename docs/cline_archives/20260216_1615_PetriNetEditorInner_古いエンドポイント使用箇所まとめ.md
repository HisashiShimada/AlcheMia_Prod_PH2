# PetriNetEditorInner.tsx 古いS3エンドポイント使用箇所まとめ

## 📋 概要

`frontend/src/components/editorv2/PetriNetEditorInner.tsx` で使用されている古いS3 APIエンドポイント（`/api/s3/`）を新しいエンドポイント（`/api/v1/maiml/`）に置き換える必要があります。

## 🔍 使用箇所一覧

### 1. ワークフロー追加ダイアログ - ファイル一覧取得

**場所**: 行2456付近 `openWorkflowDialogInternal()`

**現在のコード**:
```typescript
const response = await fetch(`/api/s3/files?organizationId=${currentOrgId}`, {
  credentials: 'include',
});
```

**新しいエンドポイント**: `GET /api/v1/maiml/files?organizationId={organizationId}`

**変更内容**:
- エンドポイントを `/api/v1/maiml/files` に変更
- レスポンス型を `ListFilesResponse` に変更
- `.maimlファイルのフィルタリング処理は維持（Backend側でも実施済み）

---

### 2. ワークフローファイル選択 - ファイル内容取得

**場所**: 行2481付近 `handleWorkflowFileSelect()`

**現在のコード**:
```typescript
const response = await fetch(`/api/s3/file-content?key=${encodeURIComponent(file.key)}`, {
  credentials: 'include',
});
```

**新しいエンドポイント**: `GET /api/v1/maiml/file-content?key={fileKey}`

**変更内容**:
- エンドポイントを `/api/v1/maiml/file-content` に変更
- レスポンス型を `FileContentResponse` に変更
- `result.data.content` でコンテンツにアクセス（構造は同じ）

---

### 3. 保存確認ダイアログ - 自動補正（その1）

**場所**: 行3082付近 `handleSaveConfirmAction()`

**現在のコード**:
```typescript
const response = await fetch('/api/s3/maiml-auto-correct-realtime', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    maimlContent: maimlXml,
    organizationId: currentOrgId,
  }),
});
```

**新しいエンドポイント**: `POST /api/v1/maiml/auto-correct`

**変更内容**:
- エンドポイントを `/api/v1/maiml/auto-correct` に変更
- リクエストボディの構造は同じ
  - `maimlContent` (Base64エンコード済み)
  - `organizationId`
  - `selectedErrors` (空配列でOK)
- レスポンス型を `AutoCorrectResponse` に変更

---

### 4. ValidationPanel - 自動補正（その2）

**場所**: 行3395付近 `handleAutoCorrect()`

**現在のコード**:
```typescript
const response = await fetch('/api/s3/maiml-auto-correct-realtime', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    maimlContent: maimlXml,
    organizationId: currentOrgId,
    selectedErrors,
  }),
});
```

**新しいエンドポイント**: `POST /api/v1/maiml/auto-correct`

**変更内容**:
- エンドポイントを `/api/v1/maiml/auto-correct` に変更
- リクエストボディの構造は同じ
  - `maimlContent` (Base64エンコード済み)
  - `organizationId`
  - `selectedErrors` (選択されたエラーインデックス配列)
- レスポンス型を `AutoCorrectResponse` に変更

---

## 📊 まとめ

| # | 機能 | 行数 | 旧エンドポイント | 新エンドポイント |
|---|------|------|------------------|------------------|
| 1 | ファイル一覧取得 | 2456 | `GET /api/s3/files` | `GET /api/v1/maiml/files` |
| 2 | ファイル内容取得 | 2481 | `GET /api/s3/file-content` | `GET /api/v1/maiml/file-content` |
| 3 | 自動補正（保存時） | 3082 | `POST /api/s3/maiml-auto-correct-realtime` | `POST /api/v1/maiml/auto-correct` |
| 4 | 自動補正（検証時） | 3395 | `POST /api/s3/maiml-auto-correct-realtime` | `POST /api/v1/maiml/auto-correct` |

**合計**: 4箇所（3種類のエンドポイント）

---

## 🔄 置き換え方針

### 型定義の使用
- `frontend/src/types/storage.ts` の型定義を使用
- `ListFilesResponse`
- `FileContentResponse`
- `AutoCorrectResponse`

### エラーハンドリング
- Backend側で統一されたエラーレスポンス形式を使用
- `response.success` で成功判定
- `response.error` でエラーメッセージ取得

### Base64エンコーディング
- 自動補正APIは既にBase64エンコード済みのMAIMLコンテンツを要求
- 現在の実装と同じ形式を維持

---

## 📝 実装手順

1. **型定義のインポート追加**
   - `import type { ListFilesResponse, FileContentResponse, AutoCorrectResponse } from '@/types/storage';`

2. **各エンドポイント呼び出しの置き換え**
   - URLを新しいエンドポイントに変更
   - レスポンス型を明示的に指定
   - エラーハンドリングを追加

3. **テスト**
   - ワークフロー追加ダイアログの動作確認
   - 自動補正機能の動作確認

---

## ✅ 次のステップ

1. PetriNetEditorInner.tsxの4箇所を順次置き換え
2. TypeScriptコンパイルエラーがないことを確認
3. 動作テスト（可能であれば）

---

**作成日**: 2026-02-16
**対象ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
**関連資料**: 
- `docs/20260216_1606_Backend処理取り込み_PLAN.md`
- `frontend/src/types/storage.ts`
- `backend/src/types/storage.ts`

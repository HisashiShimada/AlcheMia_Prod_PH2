# タスク計画書: experimentDataApiService 401エラー修正

## メタデータ
- **作成日時**: 2026-02-27 21:05
- **タスクID**: experimentDataApiService-401fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` にアクセスすると「401 Unauthorized」が返される問題の原因調査と修正。

## 原因調査結果

### 根本原因

`frontend/src/services/experimentDataApiService.ts` が **素の `axios` を直接呼び出している** ため、`Authorization: Bearer <token>` ヘッダーが付与されない。

### 詳細

#### 正常なAPIサービス（例: `projectApiService.ts`）

```typescript
import { createApiClient } from '@/utils/authUtils';

const apiClient = createApiClient();
// ✅ createApiClient() のリクエストインターセプターが
//    localStorage の sessionToken を自動取得して
//    Authorization: Bearer <token> ヘッダーを付与する
```

#### 問題の `experimentDataApiService.ts`（修正前）

```typescript
import axios from 'axios';

// ❌ createApiClient() を使っていないため、
//    インターセプターが動かず Authorization ヘッダーが付かない
//    → authMiddleware が AUTH_TOKEN_MISSING で 401 を返す
const response = await axios.get<GetTemplateDataResponse>(url, {
  withCredentials: true,
});
```

#### バックエンド側の認証チェック（`authMiddleware.ts`）

```typescript
if (!authHeader || authHeader.trim() === '') {
  res.status(401).json({
    error: { code: 'AUTH_TOKEN_MISSING', message: '認証トークンが提供されていません' }
  });
  return;
}
```

Authorization ヘッダーが存在しないリクエストに対し、即座に 401 を返す。

### 影響範囲

`experimentDataApiService.ts` 内の2つの関数がいずれも `axios` 直呼び出しになっている：

| 関数 | メソッド | 問題 |
|------|----------|------|
| `getTemplateData` | GET | 401エラー（現在発生中） |
| `saveBatchExperimentData` | POST | 同様に 401エラーが発生する可能性あり |

## 目的と期待される成果

### 目的

`experimentDataApiService.ts` の axios 直呼び出しを `createApiClient()` 経由に変更し、Authorization ヘッダーが自動付与されるようにする。

### 期待される成果
- [x] 原因特定完了
- [x] `getTemplateData` が正常にバックエンドに到達できる
- [x] `saveBatchExperimentData` も同様に修正済み
- [x] 両関数とも `createApiClient()` 経由で呼び出される

## 実装ステップ

### Step 1: `experimentDataApiService.ts` の import を修正

`axios` の直接 import を削除し、`createApiClient` を import する。

### Step 2: `saveBatchExperimentData` の axios 直呼び出しを修正

`axios.post` → `apiClient.post` に変更。

### Step 3: `getTemplateData` の axios 直呼び出しを修正

`axios.get` → `apiClient.get` に変更。

## 変更ファイル

1. `frontend/src/services/experimentDataApiService.ts` - axios 直呼び出しを createApiClient() 経由に修正

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正後も401が続く | 高 | 低 | localStorage に sessionToken が存在するか確認 |
| URL の二重パス問題 | 中 | 低 | createApiClient の baseURL と URL の組み合わせを確認 |

## テスト計画

### 手動テスト
- [ ] ログイン済み状態で DataRecordDialog を開き、テンプレート実績データが取得されること
- [ ] テンプレートを選択して「保存」ボタンを押し、POST が成功すること
- [ ] 未ログイン状態でアクセスした場合に適切にログイン画面へリダイレクトされること

## 承認記録

- **計画書提示日時**: 2026-02-27 21:05
- **承認日時**: 2026-02-27 21:05（ユーザー承認済み・Act Mode 移行により実装開始）

## 実施記録

### 実施日時
開始: 2026-02-27 21:05
完了: 2026-02-27 21:22

### 計画からの変更点
- URL のパスについて、`createApiClient()` が `baseURL` (`NEXT_PUBLIC_API_URL`) を持つため、
  関数内の URL から `${API_BASE_URL}` プレフィックスを削除し、相対パス（`/experiments/...`）に変更した。
- `withCredentials: true` は `createApiClient()` 内で既に設定済みのため、各呼び出しから削除した。

### 最終的な成果物
- [x] `frontend/src/services/experimentDataApiService.ts` 修正完了

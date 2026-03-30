# タスク計画書: プロジェクト管理一覧 全件取得修正

## メタデータ
- **作成日時**: 2026-03-30 15:30
- **タスクID**: project-list-pagination-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

プロジェクト管理の一覧部分が最大20件までしか取得されていない問題を修正する。
UI側にページネーションのコントロールが存在せず、フロントエンドでフィルタリング・ソートする設計にもかかわらず、`limit=20` のデフォルト値で取得が打ち切られているため、全件表示できていない。

## 問題の根本原因

### 1. フロントエンド呼び出し側 (`ProjectManagement.tsx`)
```typescript
// limit 引数を渡していないため、デフォルト20件になる
await getProjects()
```

### 2. APIサービス関数 (`projectApiService.ts`)
```typescript
export const getProjects = async (
  status?: 'active' | 'archived' | 'all',
  page: number = 1,
  limit: number = 20  // ← デフォルト20件
): Promise<...>
```

### 3. バックエンドコントローラー (`projectController.ts`)
```typescript
const limit = parseInt(req.query.limit as string) || 20;  // ← デフォルト20件
```

## 修正方針

フロントエンド側は全件をメモリ上でフィルタリング・ソートする設計のため、**limitを大きな値（1000）に設定**して事実上の全件取得を実現する。

### 修正箇所

1. **`frontend/src/services/projectApiService.ts`**
   - `getProjects` の `limit` デフォルト値を `20` → `1000` に変更

2. **`frontend/src/components/project/ProjectManagement.tsx`**
   - `getProjects()` 呼び出しを `getProjects(undefined, 1, 1000)` に変更
   - または `useApi` の呼び出しを修正

## 変更ファイル

1. `frontend/src/services/projectApiService.ts` - limitデフォルト値を変更
2. `frontend/src/components/project/ProjectManagement.tsx` - getProjects呼び出し修正

## 承認記録
- **計画書提示日時**: 2026-03-30 15:30

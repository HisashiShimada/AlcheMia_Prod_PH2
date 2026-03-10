# タスク計画書: shouldUseMockAPI() 環境変数切り替え実装

## メタデータ
- **作成日時**: 2026-03-09 11:50
- **タスクID**: mock_api_env_switch
- **優先度**: 高
- **推定工数**: 0.5時間
- **親タスク**: 進捗確認タブ実装状況調査 PLAN.md

## タスク概要

`frontend/src/utils/apiClient.ts` 内の `shouldUseMockAPI()` 関数が `return true` でハードコードされており、すべての API 呼び出しが強制的にモックデータを返す状態になっている。

モック API は使用しない方針のため、**常に実 API を使用する `return false`** に変更する。環境変数による切り替えは行わない。

## 目的と期待される成果

### 目的
- `shouldUseMockAPI()` が常に `false` を返すよう変更し、実 API を使用する状態に固定する
- 環境変数による切り替え機構は設けない（シンプルな実装）

### 期待される成果
- [x] `shouldUseMockAPI()` が常に `false` を返すよう変更される
- [x] `.env.prod.aws.example` / `.env.prod.onprem.example` に誤って追加した `NEXT_PUBLIC_USE_MOCK_API` を削除

## 変更箇所の詳細

### 変更前コード（`frontend/src/utils/apiClient.ts`）

```typescript
export function shouldUseMockAPI(): boolean {
  return true; // 現在は常にモックAPI使用
}
```

### 変更後コード

```typescript
/**
 * モックAPIを使用するかどうかを判定
 *
 * 常に実APIを使用するため false を返す。
 */
export function shouldUseMockAPI(): boolean {
  return false;
}
```

## 実装ステップ

### Step 1: `apiClient.ts` の `shouldUseMockAPI()` 修正
- [x] `return true` を `return false` に変更し、コメントを更新する

### Step 2 / 3: 環境変数サンプルファイルの復元
- [x] `.env.prod.aws.example` から誤って追加した `NEXT_PUBLIC_USE_MOCK_API` セクションを削除
- [x] `.env.prod.onprem.example` から誤って追加した `NEXT_PUBLIC_USE_MOCK_API` セクションを削除

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/utils/apiClient.ts` | `shouldUseMockAPI()` を `return false` に変更 |
| 2 | `.env.prod.aws.example` | `NEXT_PUBLIC_USE_MOCK_API` セクションを削除（復元） |
| 3 | `.env.prod.onprem.example` | `NEXT_PUBLIC_USE_MOCK_API` セクションを削除（復元） |

## 影響範囲

### この変更が影響するコンポーネント
- `frontend/src/components/progress/PetriNetVisualization.tsx`
  - `shouldUseMockAPI()` が `false` を返すようになり、実 API モードで動作する

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `PetriNetVisualization` が実 API を呼び出すようになる | 高 | 確実 | 後続タスクで実 API パスの修正（`fetchPetriNetStructure`・`fetchTransitionStatus`）を実施する |

## テスト計画

### 手動確認
- [x] `shouldUseMockAPI()` が常に `false` を返すことをコードレベルで確認

## 承認記録

- **計画書提示日時**: 2026-03-09 11:50
- **承認日時**: 2026-03-09 11:54
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-03-09 11:54
完了: 2026-03-09 11:55

### 最終的な成果物
- [x] `frontend/src/utils/apiClient.ts` - `shouldUseMockAPI()` 関数変更
- [x] `.env.prod.aws.example` - 環境変数追加
- [x] `.env.prod.onprem.example` - 環境変数追加

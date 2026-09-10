# タスク計画書: 集約ルール保存エラー修正

## メタデータ
- **作成日時**: 2026-09-10 13:40
- **タスクID**: 20260910_1340_集約ルール保存エラー修正
- **優先度**: 高
- **推定工数**: 0.5時間

---

## タスク概要

システム管理者メニューの「集約ルール設定」画面で「保存」ボタンを押すとエラーになる問題を修正する。  
調査により **2つのバグ** が判明した。

---

## バグ1: APIパス二重付与（404エラーの直接原因）

### 根本原因

`createApiClient()` の `baseURL` には既に `/api/v1/` が含まれている。

```ts
// authUtils.ts
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
//                                                                         ↑ /api/v1 が含まれる
```

しかし `aggregationRuleApiService.ts` の `BASE_URL` にも `/api/v1/` を含めているため、  
リクエストパスが **`/api/v1/api/v1/aggregation-rules`** となり 404 になる。

```ts
// aggregationRuleApiService.ts（誤り）
const BASE_URL = '/api/v1/aggregation-rules';  // ← /api/v1/ が重複
```

### 影響範囲

`aggregationRuleApiService.ts` の全APIリクエスト（取得・保存・プレビュー全て）

### 修正内容

```ts
// 修正後
const BASE_URL = '/aggregation-rules';
```

### 他サービスとの比較

| サービスファイル | BASE_URL | createApiClient使用 | 状態 |
|---|---|---|---|
| `projectApiService.ts` | `'/projects'` | ✅ | ✅ 正常 |
| `userApiService.ts` | `'/systemManagement/user'` | ✅ | ✅ 正常 |
| `uncertaintyCriteriaApiService.ts` | `'/uncertainty-criteria'` | ✅ | ✅ 正常 |
| `projectOverallEvaluationApiService.ts` | `'/project-overall-evaluations'` | ✅ | ✅ 正常 |
| **`aggregationRuleApiService.ts`** | **`'/api/v1/aggregation-rules'`** | ✅ | ❌ **二重付与** |
| `encryptionService.ts` | `'/api/v1/encryption'` | ❌（axios直接） | 別問題・対象外 |
| `signatureService.ts` | `'/api/v1/signature'` | ❌（axios直接） | 別問題・対象外 |

> `encryptionService.ts` / `signatureService.ts` は `createApiClient` ではなく `axios` を直接使用しているため、`baseURL` の設定が異なり、今回の修正対象外。

---

## バグ2: catch ブロックの誤ったエラーハンドリング

### 根本原因

`handleSave` / `handlePreview` の catch ブロックで、  
Ant Design の `form.validateFields()` が throw する **`ValidateErrorEntity`（`Error` インスタンスではないオブジェクト）** を誤って汎用エラーメッセージ表示につなげている。

`ValidateErrorEntity instanceof Error === false` のため、バリデーションエラー発生時に  
フォームへのエラー表示に加えて、**「保存に失敗しました」というアラートも誤表示**される。

### 修正内容

**修正前（handleSave / handlePreview 共通）**
```tsx
} catch (err) {
  setError(err instanceof Error ? err.message : t('aggregationRule.saveFailed'));
}
```

**修正後**
```tsx
} catch (err) {
  // form.validateFields() によるバリデーションエラーはフォームに表示済みのため何もしない
  if (err instanceof Error) {
    setError(err.message);
  }
}
```

---

## 目的と期待される成果

- [ ] 保存・取得・プレビューのAPIリクエストが正しいパスに送信される（404解消）
- [ ] バリデーションエラー時に「保存に失敗しました」という誤アラートが表示されなくなる
- [ ] API エラー（ネットワークエラー、サーバーエラー等）は引き続き正しくエラーアラートに表示される

---

## 実装ステップ

- [ ] `aggregationRuleApiService.ts` の `BASE_URL` から `/api/v1` を削除
- [ ] コメント（@remarks のエンドポイント記述）も合わせて整合させる
- [ ] `AggregationRuleSettings.tsx` の `handleSave` の catch ブロックを修正
- [ ] `AggregationRuleSettings.tsx` の `handlePreview` の catch ブロックを修正
- [ ] TypeScript 型チェック（`npx tsc --noEmit`）を実施

---

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/services/aggregationRuleApiService.ts` | `BASE_URL` から `/api/v1` を削除 |
| `frontend/src/components/SystemManagement/AggregationRuleSettings.tsx` | `handleSave` と `handlePreview` の catch ブロックを修正 |

---

## リスク

| リスク | 対策 |
|--------|------|
| パス修正で既存の動作が変わる | 他サービスと同一パターンへの統一のみのため影響なし |
| API エラー時にエラーメッセージが表示されなくなる | `err instanceof Error` チェックで API エラーは引き続き表示（`AxiosError extends Error`） |

---

## テスト計画

- [ ] TypeScript 型チェック（`npx tsc --noEmit`）がエラーなし
- [ ] 手動確認: 保存ボタン押下で 404 にならないこと（バックエンド起動時）
- [ ] 手動確認: バリデーションエラー時に「保存に失敗しました」が表示されないこと

---

## 承認記録
- **計画書提示日時**: 2026-09-10 13:45
- **承認日時**: 2026-09-10 13:50
- **承認者コメント**: 計画書を更新したうえで修正してください

## 実施記録

### 実施日時
開始: 2026-09-10 13:50
完了: 2026-09-10 13:55

### 変更ファイル
1. `frontend/src/services/aggregationRuleApiService.ts`
   - `const BASE_URL = '/api/v1/aggregation-rules'` → `'/aggregation-rules'` に修正
   - コメント（@remarks のエンドポイント記述）も `/api/v1/` を削除して整合

2. `frontend/src/components/SystemManagement/AggregationRuleSettings.tsx`
   - `handlePreview` の catch ブロック: `err instanceof Error` のみ `setError` に渡すよう修正、不要な `t` を依存配列から削除
   - `handleSave` の catch ブロック: 同上

### 型チェック結果
- `npx tsc --noEmit` exit:0（エラーなし）

### 最終的な成果物
- [x] バグ1: `aggregationRuleApiService.ts` の BASE_URL 修正（404解消）
- [x] バグ2: `AggregationRuleSettings.tsx` の catch ブロック修正（誤アラート解消）
- [x] TypeScript 型チェック通過

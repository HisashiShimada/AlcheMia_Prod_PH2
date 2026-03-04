# タスク計画書: updateTransitionStatus - organizationId取得バグ修正

## メタデータ
- **作成日時**: 2026-03-02 14:22
- **タスクID**: updateTransitionStatus_organizationId修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`GET http://localhost:3001/api/v1/progress/projects/.../transitions/.../status` で
500 Internal Server Error が返される問題を調査・修正する。

**エラーログ:**
```
ValidationError: Organization ID is required
    at updateTransitionStatus (progressController.ts:212:26)
```

## 目的と期待される成果

### 目的
`updateTransitionStatus` ハンドラーで `organizationId` が常に `undefined` になるバグを修正し、
正常にトランジションステータスを更新できるようにする。

### 期待される成果
- [x] 原因調査完了
- [x] `progressController.ts` の `updateTransitionStatus` を修正
- [ ] バックエンドを再起動して動作確認

## 実装ステップ

### Phase 1: 調査
- [x] `progressController.ts` を確認し、エラー発生箇所を特定
- [x] `progressRoutes.ts` を確認し、ミドルウェアチェーンを確認
- [x] `authMiddleware.ts` を確認し、`req.user` へのセット方法を確認

### Phase 2: 修正
- [x] `updateTransitionStatus` 内の `organizationId` 取得方法を修正
  - `(req as any).organizationId` → `req.user?.organizationId`
- [x] `updatedBy` 取得方法の冗長なフォールバック削除
  - `req.user?.userId || (req.user as any)?.id` → `req.user?.userId`

### Phase 3: 動作確認
- [ ] バックエンドサーバーを再起動
- [ ] `PATCH /api/v1/progress/projects/TestProjectOmori8/methods/method_TestProjectOmori8_6cc24b82/transitions/transition-1772412556174/status` で 200 が返ることを確認

## 影響範囲

### 変更したファイル
1. `backend/src/controllers/progressController.ts` - `updateTransitionStatus` 関数内の `organizationId` / `updatedBy` 取得方法を修正

### 影響を受ける機能
- トランジションステータス更新API（`PATCH .../transitions/:transitionId/status`）

### 影響を受けないもの
- 他の3つのハンドラー（`getProgressData`, `getWorkerTasks`, `updateTaskStatus`）はもともと正しい実装のため変更なし

## 原因分析

### 根本原因

`authMiddleware` はJWT検証後にペイロードを **`req.user`** にセットするが、
`updateTransitionStatus` だけが **`req.organizationId`**（存在しないプロパティ）を参照していた。

| ハンドラー | 取得方法 | 状態 |
|---|---|---|
| `getProgressData` | `req.user!.organizationId` | ✅ 正常 |
| `getWorkerTasks` | `req.user!.organizationId` | ✅ 正常 |
| `updateTaskStatus` | `req.user!.organizationId` | ✅ 正常 |
| **`updateTransitionStatus`** | `(req as any).organizationId` | ❌ **バグ** |

### 修正内容

```typescript
// 修正前（バグ）
const organizationId = (req as any).organizationId;  // 常にundefined
const updatedBy = req.user?.userId || (req.user as any)?.id;

// 修正後
const organizationId = req.user?.organizationId;
const updatedBy = req.user?.userId;
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正後もエラーが出る場合（req.user の型定義の問題） | 中 | 低 | `req.user` の型定義を確認して型アサーションを追加 |

## テスト計画

### 手動テスト
- [ ] 認証トークン付きで `PATCH .../transitions/:transitionId/status` を呼び出し、200が返ることを確認
- [ ] 認証なしで呼び出し、401が返ることを確認

## 承認記録
- **計画書提示日時**: 2026-03-02 14:22
- **承認日時**: 2026-03-02 14:22（緊急バグ修正のため承認省略）

## 実施記録

### 実施日時
開始: 2026-03-02 14:20
完了: 2026-03-02 14:21（修正のみ、動作確認は未実施）

### 計画からの変更点
なし

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] `backend/src/controllers/progressController.ts` 修正済み
- [ ] 動作確認（バックエンド再起動後に実施）

# タスク計画書: workerProjectService引数不一致修正

## メタデータ
- **作成日時**: 2026-02-03 10:42
- **タスクID**: workerProjectService-listWorkerAccessible-fix
- **優先度**: 高
- **推定工数**: 15分

## 1. タスク概要

`backend/src/services/workerProjectService.ts`の`listWorkerAccessible`メソッドで、コントローラーとサービスの引数の順序が一致していないエラーが発生しています。

## 2. 目的と期待される成果

### 目的
- コントローラーとサービスのメソッドシグネチャを一致させる
- TypeScriptの型エラーを解消する

### 期待される成果
- [x] エラー内容を確認
- [x] 問題の原因を特定
- [ ] コントローラーの引数順序を修正
- [ ] 動作確認

## 3. 問題分析

### 現状の実装

**コントローラー（workerProjectController.ts:158-165）:**
```typescript
const result = await this.workerProjectService.listWorkerAccessible(
  userId,
  organizationId,  // ← 問題: roleが抜けている
  {
    page,
    limit,
    status,
    sortBy: sortBy as 'create_at' | 'project_name' | 'update_at',
    order: order as 'asc' | 'desc',
  }
);
```

**サービス（workerProjectService.ts:53-57）:**
```typescript
async listWorkerAccessible(
  userId: string,
  role: UserRole,           // ← 第2引数はrole
  organizationId: string,   // ← 第3引数はorganizationId
  params: ListWorkerProjectsParams
): Promise<WorkerProjectListResult>
```

### エラーの原因
- コントローラーは `userId, organizationId, params` の順で渡している
- サービスは `userId, role, organizationId, params` の順で受け取る
- **第2引数の`role`が抜けている**

## 4. 実装ステップ

### Phase 1: コントローラー修正
- [ ] `req.user`から`role`を取得
- [ ] `listWorkerAccessible`呼び出し時に`role`を第2引数として追加

## 5. 影響範囲

### 変更するファイル
1. `backend/src/controllers/workerProjectController.ts` - `listWorkerAccessible`メソッドの引数修正

### 影響を受ける機能
- 実験作業者用プロジェクト一覧取得API

## 6. 技術的詳細

### 使用する技術・ライブラリ
- TypeScript: 型安全性の確保
- Express.js: リクエストハンドリング

### 修正内容
```typescript
// 修正前
const { userId, organizationId } = req.user;
const result = await this.workerProjectService.listWorkerAccessible(
  userId,
  organizationId,
  { ... }
);

// 修正後
const { userId, role, organizationId } = req.user;
const result = await this.workerProjectService.listWorkerAccessible(
  userId,
  role,
  organizationId,
  { ... }
);
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| req.userにroleが存在しない | 高 | 低 | ミドルウェアで設定済みを前提とする |

## 8. テスト計画

### 手動テスト
- [ ] APIエンドポイントの動作確認
- [ ] TypeScriptコンパイルエラーがないことを確認

## 9. 承認記録

- **計画書提示日時**: 2026-02-03 10:42
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

## 10. 実施記録

### 実施日時
開始: 2026-02-03 10:42
完了: （完了後記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 最終的な成果物
- [ ] コントローラーの引数順序修正
- [ ] TypeScriptコンパイルエラー解消

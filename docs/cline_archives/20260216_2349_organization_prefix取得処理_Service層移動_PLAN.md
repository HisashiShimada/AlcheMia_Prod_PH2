# タスク計画書: organization_prefix取得処理のService層への移動

## メタデータ
- **作成日時**: 2026-02-16 23:49
- **タスクID**: refactor_organization_prefix_to_service
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

現在、projectControllerで実行されているorganization_prefix取得処理をprojectServiceに移動するリファクタリングを実施します。これにより、関心の分離、DRY原則の遵守、テスタビリティの向上を実現します。

## 2. 目的と期待される成果

### 目的
- アーキテクチャの原則に従った設計（関心の分離）
- コードの重複排除（DRY原則）
- テスタビリティの向上
- エラーハンドリングの一元化

### 期待される成果
- [x] organization_prefix取得処理がService層に集約される
- [x] Controller層がシンプルになる
- [x] コードの重複が削減される
- [x] テストコードが更新される

## 3. 実装ステップ

### Phase 1: 影響範囲の確認と分析
- [x] organization_prefixを使用している全関数をリストアップ
- [x] 各関数のシグネチャ変更箇所を特定
- [x] テストコードへの影響を確認

### Phase 2: Service層の修正
- [ ] getProjectMaiml: organizationPrefixパラメータを削除
- [ ] getById: organizationPrefixパラメータを削除
- [ ] getProjectFiles: organizationPrefixパラメータを削除
- [ ] 各メソッドにorganization_prefix取得処理を追加

### Phase 3: Controller層の修正
- [ ] getProjectMaiml: organization_prefix取得処理を削除
- [ ] getById: organization_prefix取得処理を削除
- [ ] getProjectFiles: organization_prefix取得処理を削除
- [ ] Service呼び出しからorganizationPrefixパラメータを削除

### Phase 4: テストコードの更新
- [ ] projectService.test.ts: organization_prefix取得処理のモックを追加
- [ ] projectController.test.ts: organization_prefix取得処理のモックを削除
- [ ] 各テストケースの動作確認

### Phase 5: 統合テスト
- [ ] 修正した全APIエンドポイントの動作確認
- [ ] エラーケースの動作確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/projectService.ts`
   - getProjectMaiml: シグネチャ変更、organization_prefix取得処理追加
   - getById: シグネチャ変更、organization_prefix取得処理追加
   - getProjectFiles: シグネチャ変更、organization_prefix取得処理追加

2. `backend/src/controllers/projectController.ts`
   - getProjectMaiml: organization_prefix取得処理削除、Service呼び出し変更
   - getById: organization_prefix取得処理削除、Service呼び出し変更
   - getProjectFiles: organization_prefix取得処理削除、Service呼び出し変更

3. `backend/tests/services/projectService.test.ts`
   - organization_prefix取得クエリのモック追加
   - テストケースの更新

4. `backend/tests/controllers/projectController.test.ts`
   - organization_prefix取得クエリのモック削除
   - テストケースの更新

### 影響を受ける機能
- GET /api/v1/projects/:projectId/maiml
- GET /api/v1/projects/:projectId
- GET /api/v1/projects/:projectName/files

## 5. 技術的詳細

### 修正前（Controller層）
```typescript
// Controller: organization_prefix取得
const orgQuery = 'SELECT organization_prefix FROM organization WHERE organization_id = $1';
const orgResult = await pool.query(orgQuery, [organizationId]);
const organizationPrefix = orgResult.rows[0].organization_prefix;

// Service呼び出し
const result = await projectService.getProjectMaiml(organizationId, projectId, organizationPrefix);
```

### 修正後（Service層）
```typescript
// Controller: シンプルに
const result = await projectService.getProjectMaiml(organizationId, projectId);

// Service: organization_prefix取得処理を追加
async getProjectMaiml(organizationId: string, projectId: string): Promise<ServiceResult<any>> {
  const pool = getPool();
  
  // organization_prefix取得
  const orgQuery = 'SELECT organization_prefix FROM organization WHERE organization_id = $1';
  const orgResult = await pool.query(orgQuery, [organizationId]);
  
  if (orgResult.rows.length === 0) {
    return {
      success: false,
      error: { code: 'RESOURCE_NOT_FOUND', message: '組織情報が見つかりません' },
    };
  }
  
  const organizationPrefix = orgResult.rows[0].organization_prefix;
  // ... 以降の処理
}
```

### セキュリティ考慮事項
- [x] organization_idフィルタは維持される
- [x] Parameterized Queryを使用
- [x] エラーハンドリングは統一された形式

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| テストケース更新漏れ | 中 | 中 | 全テストケースを実行して確認 |
| エラーハンドリングの不整合 | 低 | 低 | 各関数で統一されたエラーレスポンス形式を使用 |
| パフォーマンス劣化 | 低 | 低 | organization_prefix取得は軽量なクエリ |

## 7. テスト計画

### ユニットテスト
- [ ] projectService.getProjectMaiml: organization_prefix取得成功/失敗
- [ ] projectService.getById: organization_prefix取得成功/失敗
- [ ] projectService.getProjectFiles: organization_prefix取得成功/失敗

### 統合テスト
- [ ] GET /api/v1/projects/:projectId/maiml の動作確認
- [ ] GET /api/v1/projects/:projectId の動作確認
- [ ] GET /api/v1/projects/:projectName/files の動作確認

### エラーケーステスト
- [ ] 存在しないorganization_idの場合
- [ ] DBエラー発生時の挙動

## 8. ロールバック計画

変更が少ないため、Gitで前のコミットに戻すことで即座にロールバック可能。

## 9. 関連ドキュメント

- [.clinerules/development/config.md](.clinerules/development/config.md) - コーディング規約
- [.clinerules/core/workflow.md](.clinerules/core/workflow.md) - ワークフロー規約

## 10. 承認記録

- **計画書提示日時**: 2026-02-16 23:49
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] projectService.ts修正完了
- [ ] projectController.ts修正完了
- [ ] テストコード更新完了
- [ ] 統合テスト完了

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）

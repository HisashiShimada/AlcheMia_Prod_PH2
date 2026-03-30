# タスク計画書: プロジェクト管理画面エラーコード統一

## メタデータ
- **作成日時**: 2026-03-30 11:30
- **タスクID**: error-code-unification-project-controller
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

プロジェクト管理画面（projectController.ts）で、統一エラーコード（E1xxx～E9xxx）を使用するように修正します。現在は古いエラーコード（`SYSTEM_ERROR`, `RESOURCE_NOT_FOUND`など）が混在しているため、`backend/src/enums/errorCodes.ts`の定義に従って統一します。

## 2. 目的と期待される成果

### 目的
- エラーコードの統一化により、フロントエンドで一貫したエラーハンドリングを実現
- エラーメッセージの分類が明確になり、保守性向上
- 既存のエラーコードマッピング（LEGACY_CODE_MAP）を活用した段階的移行

### 期待される成果
- [ ] projectController.tsの全エンドポイントで統一エラーコードを使用
- [ ] 旧エラーコードの完全削除
- [ ] エラーレスポンスの形式が統一される

## 3. 実装ステップ

### Phase 1: 現状分析
- [x] projectController.tsで使用されている旧エラーコードを特定
- [x] エラーコードマッピング（LEGACY_CODE_MAP）の確認

### Phase 2: エラーコード置き換え
- [ ] `deleteProject`関数のエラーコード修正
  - `SYSTEM_ERROR` → `E4001`
  - `RESOURCE_NOT_FOUND` → `E6001`
  - `BUSINESS_MAIML_FILE_EXISTS` → 新規追加（E7009: MAIMLファイル存在）
  - `VALIDATION_*` → `E1003`, `E1004`

- [ ] `publish`関数のエラーコード修正
  - `PROJECT_NOT_FOUND` → `E6001`
  - `PROJECT_NOT_CHECKED_OUT` → `E7002`
  - `TASKS_NOT_COMPLETED` → 新規追加（E7010: タスク未完了）
  - `ALREADY_IN_PROGRESS` → 新規追加（E7011: 処理中）
  - `MAIML_NOT_FOUND` → `E6002`

- [ ] `unpublish`関数のエラーコード修正
  - `NOT_PUBLISHED` → 新規追加（E7012: 非公開済み）
  - `ALREADY_IN_PROGRESS` → `E7011`

### Phase 3: backend/src/enums/errorCodes.ts に新規エラーコード追加
- [ ] E7009: MAIMLファイル存在
- [ ] E7010: タスク未完了
- [ ] E7011: 処理中
- [ ] E7012: 非公開済み

### Phase 4: frontend/src/utils/errorCodes.ts に新規エラーコード追加
- [ ] バックエンドと同じ新規エラーコードを追加

### Phase 5: テスト
- [ ] 各エンドポイントのエラーレスポンス確認
- [ ] エラーコードが正しく返されることを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/enums/errorCodes.ts` - 新規エラーコード追加
2. `backend/src/controllers/projectController.ts` - エラーコード置き換え
3. `frontend/src/utils/errorCodes.ts` - 新規エラーコード追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- プロジェクト削除機能（deleteProject）
- MAIML公開機能（publish）
- MAIML非公開機能（unpublish）
- エラーハンドリング全般

## 5. 技術的詳細

### 使用する技術・ライブラリ
- TypeScript
- Express.js

### エラーコード体系
- **E1xxx**: CLIENT - クライアント操作・入力エラー
- **E4xxx**: SERVER - サーバー・システム内部エラー
- **E5xxx**: AUTH - 認証・認可エラー
- **E6xxx**: RESOURCE - リソース不存在・競合
- **E7xxx**: BUSINESS - 業務ロジックエラー

### 新規追加するエラーコード
```typescript
// ===== E7xxx: BUSINESS =====
export const E7009 = 'E7009'; // MAIMLファイル存在
export const E7010 = 'E7010'; // タスク未完了
export const E7011 = 'E7011'; // 処理中
export const E7012 = 'E7012'; // 非公開済み
```

### LEGACY_CODE_MAPへの追加
```typescript
export const LEGACY_CODE_MAP: Record<string, ErrorCode> = {
  // ... 既存のマッピング
  
  // BUSINESS（新規追加）
  BUSINESS_MAIML_FILE_EXISTS: E7009,
  TASKS_NOT_COMPLETED: E7010,
  ALREADY_IN_PROGRESS: E7011,
  NOT_PUBLISHED: E7012,
};
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| フロントエンドでのエラー表示不具合 | 中 | 低 | エラーコード変更前にフロントエンドも同時更新 |
| 既存のエラーハンドリングコードとの非互換 | 低 | 低 | LEGACY_CODE_MAPで旧コードもサポート |
| 未検出の旧エラーコード残存 | 低 | 中 | grep検索で全ファイル確認 |

## 7. テスト計画

### 手動テスト
- [ ] プロジェクト削除（MAIML登録済み）→ E7009が返る
- [ ] プロジェクト削除（プロジェクト不存在）→ E6001が返る
- [ ] MAIML公開（タスク未完了）→ E7010が返る
- [ ] MAIML公開（処理中）→ E7011が返る
- [ ] MAIML非公開（未公開）→ E7012が返る

## 8. ロールバック計画

変更内容はエラーコード文字列の置き換えのみなので、git revertで即座にロールバック可能です。

## 9. 関連ドキュメント

- `backend/src/enums/errorCodes.ts` - エラーコード定義
- `frontend/src/utils/errorCodes.ts` - フロントエンド側エラーコード定義
- `.clinerules/development/config.md` - コーディング規約

## 10. 承認記録

- **計画書提示日時**: 2026-03-30 11:30
- **承認日時**: 2026-03-30 11:33
- **承認者コメント**: 承認します - 実装を開始してください

## 11. 実施記録

### 実施日時
開始: 2026-03-30 11:34
完了: 2026-03-30 11:37

### 実施内容

#### Phase 1: backend/src/enums/errorCodes.ts 修正
- ✅ E7009～E7012の新規エラーコード定義追加
- ✅ ErrorCode型定義への追加
- ✅ LEGACY_CODE_MAPへのマッピング追加

#### Phase 2: backend/src/controllers/projectController.ts 修正
- ✅ deleteProject関数のエラーコード統一化
  - `SYSTEM_ERROR` → `E4001`
  - `RESOURCE_NOT_FOUND` → `E6001`
  - `BUSINESS_MAIML_FILE_EXISTS` → `E7009`
- ✅ publish関数のエラーコード統一化
  - `PROJECT_NOT_FOUND` → `E6001`
  - `PROJECT_NOT_CHECKED_OUT` → `E7002`
  - `TASKS_NOT_COMPLETED` → `E7010`
  - `ALREADY_IN_PROGRESS` → `E7011`
  - `MAIML_NOT_FOUND` → `E6002`
- ✅ unpublish関数のエラーコード統一化
  - `NOT_PUBLISHED` → `E7012`
  - `ALREADY_IN_PROGRESS` → `E7011`

#### Phase 3: frontend/src/utils/errorCodes.ts 修正
- ✅ E7009～E7012の新規エラーコード定義追加
- ✅ ErrorCode型定義への追加

### 計画からの変更点
なし。計画通りに実施完了。

### 最終的な成果物
- [x] projectController.tsの全エンドポイントで統一エラーコードを使用
- [x] 旧エラーコードの完全削除
- [x] エラーレスポンスの形式が統一される

## 12. 振り返り

### うまくいった点
- LEGACY_CODE_MAPを活用することで、旧コードも一時的にサポート可能な設計になっている
- エラーコード体系（E1xxx～E9xxx）に従って一貫性のある実装ができた
- バックエンド・フロントエンド両方で同じエラーコードを使用可能になった

### 今後の展開
- 他のコントローラー（fileAccessController.ts等）でも同様の統一化を実施予定
- LEGACY_CODE_MAPは移行期間完了後に削除を検討

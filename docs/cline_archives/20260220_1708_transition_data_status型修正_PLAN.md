# タスク計画書: transition_data.status型修正

## メタデータ
- **作成日時**: 2026-02-20 17:08
- **タスクID**: transition_data_status型修正
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

ER図（er_diagram.a5er）によると、transition_dataテーブルのstatusカラムはnumeric(2)型（数値型）として定義されています。
しかし、バックエンドおよびフロントエンドのソースコードで文字列型として扱われている可能性があります。
この不整合を調査し、数値型として正しく扱うように修正します。

## 2. 目的と期待される成果

### 目的
- データベース定義とソースコードの型整合性を確保
- 型の不一致によるバグや予期しない動作を防止
- コードの保守性と可読性の向上

### 期待される成果
- [x] transition_data.statusカラムの型定義確認
- [ ] バックエンドの型定義・実装の調査
- [ ] フロントエンドの型定義・実装の調査
- [ ] 必要に応じた型定義の修正
- [ ] 必要に応じたバックエンド実装の修正
- [ ] 必要に応じたフロントエンド実装の修正
- [ ] 修正内容の検証

## 3. 実装ステップ

### Phase 1: 現状調査
- [ ] ER図でtransition_data.statusの型定義確認（完了: numeric(2)）
- [ ] バックエンド型定義ファイルの確認
  - [ ] `backend/src/types/` 配下のtransition_data関連型定義
- [ ] バックエンド実装ファイルの確認
  - [ ] Repository層（`backend/src/repositories/`）
  - [ ] Service層（`backend/src/services/`）
  - [ ] Controller層（`backend/src/controllers/`）
- [ ] フロントエンド型定義・実装の確認
  - [ ] 型定義ファイル（`frontend/src/types/`）
  - [ ] コンポーネント（`frontend/src/components/`）

### Phase 2: 問題箇所の特定
- [ ] 文字列型として扱っている箇所のリストアップ
- [ ] 影響範囲の分析
- [ ] 修正方針の決定

### Phase 3: バックエンド修正
- [ ] 型定義ファイルの修正（string → number）
- [ ] Repository層の修正
- [ ] Service層の修正
- [ ] Controller層の修正
- [ ] バリデーション処理の修正

### Phase 4: フロントエンド修正
- [ ] 型定義ファイルの修正（string → number）
- [ ] コンポーネントの修正
- [ ] API通信処理の修正
- [ ] 表示ロジックの修正

### Phase 5: テストデータ・マイグレーション確認
- [ ] テストデータの確認（`backend/sql/`）
- [ ] マイグレーションファイルの確認（`backend/migrations/`）
- [ ] 必要に応じた修正

### Phase 6: 動作確認
- [ ] バックエンドのビルド確認
- [ ] フロントエンドのビルド確認
- [ ] 統合テスト（API → 画面表示）

## 4. 影響範囲

### 変更する可能性のあるファイル
1. `backend/src/types/*.ts` - 型定義
2. `backend/src/repositories/transitionDataRepository.ts` - Repository層
3. `backend/src/services/taskService.ts` - Service層（transition_data操作）
4. `backend/src/controllers/*.ts` - Controller層
5. `frontend/src/types/*.ts` - フロントエンド型定義
6. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` - 進捗確認タブ
7. `backend/sql/insert_transition_data_samples.sql` - サンプルデータ

### 影響を受ける機能
- 実験作業者画面の進捗確認タブ
- トランジション実績の登録・更新
- トランジション実績の表示

## 5. 技術的詳細

### データベース定義（確認済み）
```sql
-- transition_dataテーブル
status numeric(2,0)  -- 数値型（2桁）
```

### 想定される修正パターン

#### バックエンド型定義
```typescript
// 修正前（想定）
interface TransitionData {
  status?: string;  // 文字列型
}

// 修正後
interface TransitionData {
  status?: number;  // 数値型
}
```

#### フロントエンド表示
```typescript
// 修正前（想定）
status === "1"  // 文字列比較

// 修正後
status === 1  // 数値比較
```

### セキュリティ考慮事項
- [ ] 数値型バリデーションの実装
- [ ] 範囲チェック（0-99の範囲内）
- [ ] SQLインジェクション対策（Parameterized Query使用継続）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存データとの不整合 | 高 | 低 | データベース内の既存データを確認し、数値型として格納されているか検証 |
| 文字列→数値変換時のエラー | 中 | 中 | 型変換処理を慎重に実装し、エラーハンドリングを追加 |
| フロントエンドでの表示崩れ | 低 | 低 | 表示ロジックを確認し、数値として正しく表示されるか検証 |
| 他のステータスカラムへの影響 | 中 | 低 | 他のテーブルのstatusカラムも同様の問題がないか確認 |

## 7. テスト計画

### ユニットテスト
- [ ] transitionDataRepository のテスト
- [ ] taskService のテスト

### 統合テスト
- [ ] API経由でのtransition_data登録・取得
- [ ] 進捗確認タブでの表示確認

### 手動テスト
- [ ] 進捗確認タブを開いてステータスが正しく表示されるか
- [ ] ステータス更新が正常に動作するか

## 8. ロールバック計画

修正前のコードをバックアップし、問題が発生した場合は即座にロールバック可能にする。
Git履歴から復元可能。

## 9. 関連ドキュメント

- [ER図](../../docs/design/db/er_diagram.a5er)
- [データベース操作規約](../../.clinerules/development/database.md)
- [TypeScript型定義規約](../../.clinerules/development/typescript.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-20 17:08
- **承認日時**: （承認後に記入）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に記入）

### 発生した問題と解決方法
（実施中に記入）

### 最終的な成果物
（完了時に記入）

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）

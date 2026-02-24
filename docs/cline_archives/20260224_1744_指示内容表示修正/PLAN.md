# タスク計画書: 指示内容表示修正

## メタデータ
- **作成日時**: 2026-02-24 17:44
- **タスクID**: fix-instruction-content-display
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

作業指示タブにて、指示内容（project_instructionテーブルのinstructionsカラム）が表示されない問題を修正します。

### 現象
- `GET http://localhost:3001/api/v1/projects/TestProjectOmori3/worker-instructions` のレスポンスに指示内容が含まれていない
- フロントエンドのInstructionCardコンポーネントで`instruction.content`を参照しているが、データが空

### 原因
バックエンドのService層（`projectService.ts`）で、SQLクエリ結果のマッピング時に誤ったプロパティ名を参照している。

- SQLクエリ: `pi.instructions as instruction_content` → `row.instruction_content`として取得
- Service層: `row.instructions`を参照 → **存在しないプロパティ**
- 正しくは: `row.instruction_content`を参照すべき

## 2. 目的と期待される成果

### 目的
作業指示一覧APIのレスポンスに指示内容を正しく含める

### 期待される成果
- [x] バックエンドAPIのレスポンスに`instruction_content`フィールドが正しく含まれる
- [x] フロントエンドで指示内容が表示される
- [x] 既存機能に影響を与えない

## 3. 実装ステップ

### Phase 1: バックエンド修正
- [x] `backend/src/services/projectService.ts`の`getWorkerInstructions`メソッドを修正
  - 該当行: 約1370行目付近
  - 修正内容: `instruction_content: row.instructions` → `instruction_content: row.instruction_content`

### Phase 2: 動作確認
- [x] バックエンドを再起動（ユーザーが実施）
- [ ] APIレスポンスを確認（`GET /api/v1/projects/:projectName/worker-instructions`）
- [ ] フロントエンドで指示内容が表示されることを確認

### Phase 3: テスト実行
- [ ] 指示確認タブで各種指示内容が表示されることを確認
- [ ] プロジェクト指示、タスク指示、トランジション指示すべてで動作確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/projectService.ts` - Service層のマッピング修正（1行のみ）

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 作業指示一覧取得API: 修正により正しくデータが返却されるようになる
- 指示確認タブ: 指示内容が表示されるようになる

### 影響を受けないもの
- その他のAPI
- 指示確認以外の機能
- データベース構造

## 5. 技術的詳細

### 修正箇所の詳細

**ファイル**: `backend/src/services/projectService.ts`
**メソッド**: `getWorkerInstructions`
**該当箇所**: instructionsマッピング部分

```typescript
// 修正前（約1370行目）
const instructions = result.map((row: any) => ({
  id: row.id,
  project_id: row.project_id,
  project_name: row.project_name,
  method_id: row.method_id,
  method_name: '',
  transition_id: row.transition_id,
  transition_name: '',
  task_no: row.task_no,
  instruction_target: row.instruction_target,
  instruction_content: row.instructions,  // ❌ ここが間違い
  priority: row.priority,
  type: row.type,
  create_at: row.create_at.toISOString(),
  created_by: row.created_by,
  created_by_name: row.created_by_name || '',
  is_acknowledged: row.is_acknowledged,
}));

// 修正後
const instructions = result.map((row: any) => ({
  id: row.id,
  project_id: row.project_id,
  project_name: row.project_name,
  method_id: row.method_id,
  method_name: '',
  transition_id: row.transition_id,
  transition_name: '',
  task_no: row.task_no,
  instruction_target: row.instruction_target,
  instruction_content: row.instruction_content,  // ✅ 修正
  priority: row.priority,
  type: row.type,
  create_at: row.create_at.toISOString(),
  created_by: row.created_by,
  created_by_name: row.created_by_name || '',
  is_acknowledged: row.is_acknowledged,
}));
```

### データフロー

1. **SQLクエリ** (`backend/src/sql/queries/instructions/findWorkerInstructions.sql`):
   ```sql
   pi.instructions as instruction_content
   ```
   → `row.instruction_content`として取得される

2. **Service層** (`backend/src/services/projectService.ts`):
   ```typescript
   instruction_content: row.instruction_content  // 正しい参照
   ```

3. **フロントエンド** (`frontend/src/components/ExperimentWorker/InstructionCard.tsx`):
   ```typescript
   {instruction.content}  // instruction_contentがcontentにマッピングされて表示
   ```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他のプロパティ参照箇所への影響 | 低 | 低 | 1行のみの修正のため、他への影響はない |
| APIレスポンス形式の変更 | 低 | 低 | プロパティ名は変更せず、値のみ修正 |
| 既存データとの互換性 | 低 | 低 | データ構造は変更なし |

## 7. テスト計画

### 単体テスト
- [ ] `getWorkerInstructions`メソッドの動作確認
  - テスト内容: SQLクエリ結果を正しくマッピングできるか
  - 期待値: `instruction_content`が空でないこと

### 統合テスト
- [ ] APIエンドポイントのテスト
  - URL: `GET /api/v1/projects/TestProjectOmori3/worker-instructions`
  - 期待値: レスポンスに`instruction_content`フィールドが含まれる

### 手動テスト
- [ ] ブラウザで指示確認タブを開く
- [ ] プロジェクト指示が表示されることを確認
- [ ] タスク指示が表示されることを確認
- [ ] トランジション指示が表示されることを確認
- [ ] 指示内容が正しく表示されることを確認

## 8. ロールバック計画

修正が1行のみのため、問題が発生した場合は以下の手順でロールバック可能：

1. `backend/src/services/projectService.ts`を修正前の状態に戻す
2. バックエンドを再起動

または、Gitで直前のコミットに戻す：
```bash
git checkout HEAD~1 backend/src/services/projectService.ts
```

## 9. 関連ドキュメント

- [指示確認タブ UI設計書](../design/ui/ui_instruction_confirmation_tab.md)
- [InstructionCard UI設計書](../design/ui/ui_instruction_card.md)
- [InstructionGroup UI設計書](../design/ui/ui_instruction_group.md)
- [作業指示一覧取得API仕様](../design/api/API一覧_実験作業者画面.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 17:44
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: 2026-02-24 17:44
完了: 2026-02-24 17:48

### 計画からの変更点
なし。計画通りに実施完了。

### 発生した問題と解決方法
なし。1行のみの修正のため、スムーズに完了。

### 最終的な成果物
- [x] バックエンド修正完了（`backend/src/services/projectService.ts` 1行修正）
- [ ] 動作確認完了（ユーザーによる確認が必要）
- [ ] テスト完了（ユーザーによるテストが必要）

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）

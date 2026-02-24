# タスク計画書: 指示確認ボタンの非活性化条件追加

## メタデータ
- **作成日時**: 2026-02-24 20:16
- **タスクID**: 指示確認ボタン非活性化
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

指示確認タブにおいて、`isAcknowledged`フィールドを使用して「確認完了」ボタンの非活性化条件を追加します。
対象の指示がすべて確認済み（`is_acknowledged=true`）の場合、ボタンを非活性にします。

### 背景
- 現在のコードでは`isRead`フィールドを使用しているが、API仕様では`isAcknowledged`が定義されている
- 型定義ファイルには`isAcknowledged`フィールドが存在しない
- すべて確認済みの場合にボタンを非活性化する処理が不足している

## 2. 目的と期待される成果

### 目的
- API仕様（`GET /api/v1/projects/:projectName/worker-instructions`）に準拠した実装
- すべての指示が確認済みの場合、確認完了ボタンを非活性化してUI/UXを改善

### 期待される成果
- [x] 型定義に`isAcknowledged`関連フィールドを追加
- [ ] プロジェクト指示の「確認完了」ボタンが適切に非活性化される
- [ ] タスク指示の「確認完了」ボタンが適切に非活性化される
- [ ] トランジション指示の「確認完了」ボタンが適切に非活性化される
- [ ] 「すべての指示の確認完了」ボタンが適切に非活性化される
- [ ] 確認完了処理が`isAcknowledged`フィールドを使用するように修正

## 3. 実装ステップ

### Phase 1: 型定義の修正
- [ ] Step 1-1: `frontend/src/types/experimentWorker.ts`を開く
- [ ] Step 1-2: `Instruction`インターフェースに以下のフィールドを追加
  - `isAcknowledged: boolean`
  - `acknowledgedAt?: string`
  - `acknowledgedBy?: string`
  - `acknowledgedByName?: string`
- [ ] Step 1-3: 変更を保存

### Phase 2: InstructionConfirmationTab.tsx の修正

#### Step 2-1: プロジェクト指示「確認完了」ボタンの非活性条件追加
- [ ] Step 2-1-1: ファイルを開く（行数約580）
- [ ] Step 2-1-2: 該当箇所（行数約550付近）を特定
- [ ] Step 2-1-3: `disabled`プロパティに条件追加
  ```typescript
  disabled={
    confirmLoading || 
    filteredInstructions
      .filter((i) => i.targetType === 'file')
      .every((i) => i.isAcknowledged)
  }
  ```
- [ ] Step 2-1-4: 変更を保存

#### Step 2-2: 「すべての指示の確認完了」ボタンの非活性条件追加
- [ ] Step 2-2-1: 該当箇所（行数約670付近）を特定
- [ ] Step 2-2-2: `disabled`プロパティに条件追加
  ```typescript
  disabled={
    filteredStats.total === 0 || 
    confirmLoading || 
    filteredInstructions.every((i) => i.isAcknowledged)
  }
  ```
- [ ] Step 2-2-3: `style`の`backgroundColor`も条件分岐を修正
  ```typescript
  backgroundColor: 
    (filteredStats.total === 0 || 
     filteredInstructions.every((i) => i.isAcknowledged)) 
      ? undefined 
      : token.colorSuccess
  ```
- [ ] Step 2-2-4: 変更を保存

#### Step 2-3: 確認完了処理の修正（4箇所）
- [ ] Step 2-3-1: `handleConfirmProjectInstructions`関数を修正
  - `!i.isRead` → `!i.isAcknowledged`
- [ ] Step 2-3-2: `handleConfirmTaskInstructions`関数を修正
  - `!i.isRead` → `!i.isAcknowledged`
- [ ] Step 2-3-3: `handleConfirmTransitionInstructions`関数を修正
  - `!i.isRead` → `!i.isAcknowledged`
- [ ] Step 2-3-4: `handleConfirmAllInstructions`関数を修正
  - `!i.isRead` → `!i.isAcknowledged`
- [ ] Step 2-3-5: 変更を保存

### Phase 3: InstructionGroup.tsx の修正

#### Step 3-1: タスク指示「確認完了」ボタンの非活性条件追加
- [ ] Step 3-1-1: ファイルを開く
- [ ] Step 3-1-2: タスク指示セクション（行数約120付近）を特定
- [ ] Step 3-1-3: `disabled`プロパティに条件追加
  ```typescript
  disabled={
    confirmLoading || 
    taskInstructions.every((i) => i.isAcknowledged)
  }
  ```
- [ ] Step 3-1-4: 変更を保存

#### Step 3-2: メソッド指示「確認完了」ボタンの非活性条件追加
- [ ] Step 3-2-1: メソッド指示セクション（行数約190付近）を特定
- [ ] Step 3-2-2: `disabled`プロパティに条件追加
  ```typescript
  disabled={
    confirmLoading || 
    methodInstructions.every((i) => i.isAcknowledged)
  }
  ```
- [ ] Step 3-2-3: 変更を保存

#### Step 3-3: トランジション指示「確認完了」ボタンの非活性条件追加
- [ ] Step 3-3-1: トランジション指示セクション（行数約260付近）を特定
- [ ] Step 3-3-2: `disabled`プロパティに条件追加
  ```typescript
  disabled={
    confirmLoading || 
    transitionInstructions.every((i) => i.isAcknowledged)
  }
  ```
- [ ] Step 3-3-3: 変更を保存

### Phase 4: 動作確認
- [ ] Step 4-1: 開発サーバーを起動
- [ ] Step 4-2: 実験作業者としてログイン
- [ ] Step 4-3: 指示確認タブを開く
- [ ] Step 4-4: プロジェクト指示の確認完了ボタンが適切に非活性化されることを確認
- [ ] Step 4-5: タスク指示の確認完了ボタンが適切に非活性化されることを確認
- [ ] Step 4-6: トランジション指示の確認完了ボタンが適切に非活性化されることを確認
- [ ] Step 4-7: 「すべての指示の確認完了」ボタンが適切に非活性化されることを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/types/experimentWorker.ts` - 型定義の追加
2. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - ボタン非活性条件の追加
3. `frontend/src/components/ExperimentWorker/InstructionGroup.tsx` - ボタン非活性条件の追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 指示確認タブ全体のUI/UX
- 確認完了ボタンの動作
- 確認完了処理のロジック

## 5. 技術的詳細

### 使用する技術・ライブラリ
- TypeScript 5.x
- React 18.2.0
- Ant Design v6

### 非活性化条件の実装

**Array.every()メソッドを使用:**
```typescript
// すべての要素がisAcknowledged=trueの場合にtrueを返す
instructions.every((i) => i.isAcknowledged)
```

**disabled属性の設定:**
```typescript
<Button
  disabled={
    confirmLoading ||                           // ローディング中
    instructions.every((i) => i.isAcknowledged) // すべて確認済み
  }
  ...
/>
```

### セキュリティ考慮事項
- マルチテナント分離（organization_id）は既存の仕組みを維持
- 確認完了APIの呼び出しは既存のセキュリティチェックを経由

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| モックデータに`isAcknowledged`フィールドがない | 中 | 高 | モックデータ生成箇所も修正する |
| `isRead`フィールドとの混同 | 低 | 中 | コメントで両者の違いを明記 |
| 既存の確認完了処理への影響 | 低 | 低 | API呼び出し部分は変更しない |

## 7. テスト計画

### 手動テスト

#### テストケース1: プロジェクト指示の確認完了ボタン
- [ ] 未確認の指示がある場合 → ボタン活性
- [ ] すべて確認済みの場合 → ボタン非活性

#### テストケース2: タスク指示の確認完了ボタン
- [ ] 未確認の指示がある場合 → ボタン活性
- [ ] すべて確認済みの場合 → ボタン非活性

#### テストケース3: トランジション指示の確認完了ボタン
- [ ] 未確認の指示がある場合 → ボタン活性
- [ ] すべて確認済みの場合 → ボタン非活性

#### テストケース4: すべての指示の確認完了ボタン
- [ ] 未確認の指示がある場合 → ボタン活性
- [ ] すべて確認済みの場合 → ボタン非活性
- [ ] 指示が0件の場合 → ボタン非活性

#### テストケース5: 確認完了処理
- [ ] 未確認の指示のみが対象となることを確認
- [ ] 確認済みの指示は処理対象外となることを確認

## 8. ロールバック計画

問題が発生した場合は、以下の手順でロールバック：

1. Gitで変更をrevert
2. 開発サーバーを再起動
3. 動作確認

## 9. 関連ドキュメント

- [指示確認タブ UI設計書](../design/ui/ui_instruction_confirmation_tab.md)
- [API一覧 - 実験作業者画面](../design/api/API一覧_実験作業者画面.md)
- [TypeScript型定義規約](../../.clinerules/development/typescript.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 20:16
- **承認日時**: 2026-02-24 20:16
- **承認者コメント**: タスク計画書を作成し、細かくステップを分けて実行

## 11. 実施記録

### 実施日時
開始: 2026-02-24 20:16
完了: (作業完了時に記入)

### 計画からの変更点
(実施中に発生した変更を記録)

### 発生した問題と解決方法
(実施中に発生した問題とその解決方法を記録)

### 最終的な成果物
- [ ] 型定義ファイルの修正
- [ ] InstructionConfirmationTab.tsxの修正
- [ ] InstructionGroup.tsxの修正
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
(作業完了後に記入)

### 改善が必要な点
(作業完了後に記入)

### 学んだこと
(作業完了後に記入)

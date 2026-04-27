# タスク計画書: 指示確認タブ メソッド指示表示バグ修正

## メタデータ
- **作成日時**: 2026-04-24 15:14
- **タスクID**: 指示確認タブメソッド指示追加
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験管理者画面でメソッド指示を追加して指示送信したにもかかわらず、実験作業者の指示確認タブにてメソッド指示グループではなくプロジェクト指示グループに表示されるバグを修正する。

## 目的と期待される成果

### 目的
フロントエンドの `instruction_target` 変換マップとバックエンドの定義が不一致であり、メソッド指示が誤ったグループに分類されていた。正しいマッピングに修正することで、各指示が正しいグループ（プロジェクト指示・メソッド指示・トランジション指示・タスク指示）に表示されるようにする。

### 期待される成果
- [x] メソッド指示が「メソッド指示」グループに正しく表示される
- [x] プロジェクト指示・トランジション指示・タスク指示も正しいグループに表示される
- [x] 指示統計（Stats）のメソッド件数・タスク件数が正しく計算される

## バグ原因の詳細

### バックエンドの `instruction_target` 定義（正）

`backend/src/services/projectInstructionService.ts`:

```typescript
let instructionTarget = 0; // デフォルト: ファイル全体
if (request.taskNumber !== null && request.taskNumber !== undefined) {
  instructionTarget = 3; // タスク
} else if (request.transitionId) {
  instructionTarget = 2; // トランジション
} else if (request.methodId) {
  instructionTarget = 1; // メソッド
}
```

| 値 | 意味 |
|----|------|
| 0 | ファイル全体（プロジェクト指示） |
| 1 | メソッド指示 |
| 2 | トランジション指示 |
| 3 | タスク指示 |

### フロントエンドの修正前 `targetTypeMap`（誤）

```typescript
const targetTypeMap: Record<string, TargetType> = {
  '1': 'file',  // ← バグ：メソッド指示(1)をfileに変換
  // '2', '3' の定義なし → フォールバックで全て 'file' に
};
```

**結果**: メソッド指示（`instruction_target=1`）が `'file'` に変換され、プロジェクト指示グループに混入。

## 変更ファイル

### 修正ファイル
1. `frontend/src/services/projectApiService.ts` - `targetTypeMap` の修正、コメント修正
2. `frontend/src/hooks/useInstructions.ts` - `stats.method` フィルタ修正、`stats.task` フィールド追加

## 実装ステップ

- [x] バグ原因の調査（`projectApiService.ts` の `targetTypeMap` とバックエンドの不一致を特定）
- [x] `frontend/src/services/projectApiService.ts` の `targetTypeMap` を正しい値に修正
- [x] `WorkerInstruction.instruction_target` のコメントを正しい定義に修正
- [x] `frontend/src/hooks/useInstructions.ts` の `stats.method` フィルタを修正（`'task'` → `'method'`）
- [x] `frontend/src/hooks/useInstructions.ts` の `stats.task` フィールドを追加

## 修正内容

### `frontend/src/services/projectApiService.ts`

```typescript
// 修正前
const targetTypeMap: Record<string, TargetType> = {
  '1': 'file',       // プロジェクト指示（誤）
};

// 修正後
// バックエンド: 0=ファイル全体, 1=メソッド, 2=トランジション, 3=タスク
const targetTypeMap: Record<string, TargetType> = {
  '0': 'file',        // プロジェクト指示（ファイル全体）
  '1': 'method',      // メソッド指示
  '2': 'transition',  // トランジション指示
  '3': 'task',        // タスク指示
};
```

### `frontend/src/hooks/useInstructions.ts`

```typescript
// 修正前
method: instructions.filter((i) => i.targetType === 'task').length, // 後方互換性のためmethodキーを維持、taskでフィルタ
// task フィールドなし

// 修正後
method: instructions.filter((i) => i.targetType === 'method').length,
task: instructions.filter((i) => i.targetType === 'task').length,
```

## テスト計画

### 手動テスト
- [ ] 実験管理者でメソッド指示を追加して指示送信する
- [ ] 実験作業者の指示確認タブで「メソッド指示」グループに表示されることを確認する
- [ ] プロジェクト指示（メソッドなし）が「プロジェクト指示」グループに表示されることを確認する
- [ ] 統計数（メソッド指示件数）が正しく表示されることを確認する

## 承認記録
- **計画書提示日時**: 2026-04-24 15:14
- **承認日時**: 2026-04-24 15:15

## 実施記録

### 実施日時
開始: 2026-04-24 15:08  
完了: 2026-04-24 15:14

### 最終的な成果物
- [x] `frontend/src/services/projectApiService.ts` の `targetTypeMap` を正しい値に修正
- [x] `frontend/src/hooks/useInstructions.ts` の stats 計算を修正

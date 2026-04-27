# タスク計画書: メソッド指示 instruction_target=0 バグ修正

## メタデータ
- **作成日時**: 2026-04-24 16:27
- **タスクID**: fix-instruction-target-method
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験管理者画面でメソッド指示を追加して指示送信しても、実験作業者の指示確認タブにてメソッド指示グループではなくプロジェクトグループに表示される。

## 目的と期待される成果
- [ ] `project_instruction` テーブルの `instruction_target` が、メソッド指示を追加したとき `1`（メソッド）で保存されること
- [ ] 実験作業者の指示確認タブでメソッド指示がメソッドグループに正しく表示されること

## 根本原因

### バックエンド: `projectInstructionService.ts` の判定ロジックバグ

`instruction_target` 判定時、`request.methodId` が空文字列 `''` の場合、JavaScriptの truthy/falsy 評価で `if (request.methodId)` が **false** になり `instructionTarget = 0`（プロジェクト）のまま保存される。

```typescript
// 現在の誤ったコード
} else if (request.methodId) {   // '' は falsy → 条件に入らない
  instructionTarget = 1;
}
```

**正しいコード:**
```typescript
} else if (request.methodId && request.methodId !== '') {
  instructionTarget = 1;
}
```

ただし、フロントエンドの `SaveInstructionRequest` で `methodId: string`（必須）となっているため、実際には `request.methodId` が空文字列 `''` が送られてくることが原因。

## 実装ステップ
- [ ] `backend/src/services/projectInstructionService.ts` の `instruction_target` 判定を修正

## 変更ファイル
1. `backend/src/services/projectInstructionService.ts` - `instruction_target` の判定ロジック修正

## 承認記録
- **承認日時**: 2026-04-24 16:27（ユーザー承認済）

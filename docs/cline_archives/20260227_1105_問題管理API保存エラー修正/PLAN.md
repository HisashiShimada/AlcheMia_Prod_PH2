# タスク計画書: 問題管理API保存エラー修正

## メタデータ
- **作成日時**: 2026-02-27 11:05
- **タスクID**: issue-api-save-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

問題管理モーダルで「保存」ボタンを押下すると、`POST /api/v1/issues` が `VALIDATION_ERROR: タイトルは必須です` を返しエラーになる。

## 2. 目的と期待される成果

### 目的
`issueService.ts` の `create` メソッドにあるフィールド名のミスマッチを修正し、問題報告が正常に保存できるようにする。

### 期待される成果
- [ ] 問題管理モーダルの「保存」ボタン押下で問題が正常登録される
- [ ] `POST /api/v1/issues` が 201 Created を返す

## 3. 原因分析

### リクエストのフィールド名
`issueController.ts` が `req.body` から取り出して Service に渡すフィールド名：
```
{ projectId, methodId, issueType, targetType, taskNo, transitionId, title, description }
```

### issueService.ts の誤ったマッピング
```typescript
// create() 内 NewIssue マッピング
issueTarget:   data.issueTarget,    // ❌ undefined になる（正: data.targetType）
issueTitle:    data.issueTitle,     // ❌ undefined になる（正: data.title）
issueContents: data.issueContents,  // ❌ undefined になる（正: data.description）
```

`issueTitle` が `undefined` のため、`validateIssueData()` で
`throw new ValidationError('タイトルは必須です')` が発生し、
Controller がそのまま 400 エラーとして返却していた。

## 4. 実装ステップ

### Phase 1: 計画書作成
- [x] タスク計画書ファイルを作成

### Phase 2: バグ修正
- [ ] `backend/src/services/issueService.ts` の `create` メソッドを修正（3箇所）

## 5. 変更ファイル

### 修正
1. `backend/src/services/issueService.ts` - create メソッドのフィールド名ミスマッチ修正

| # | 修正箇所 | 現在（誤り） | 修正後（正しい） |
|---|---|---|---|
| 1 | issueTitle | `data.issueTitle` | `data.title` |
| 2 | issueContents | `data.issueContents` | `data.description` |
| 3 | issueTarget | `data.issueTarget` | `data.targetType` |

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正後に他の呼び出し元が壊れる | 低 | 低 | issueService.create の呼び出し元を確認済み（Controller のみ） |

## 7. テスト計画

### 手動テスト
- [ ] 問題管理モーダルで問題タイトル・内容・タイプを入力して「保存」押下 → 201 Created が返ること
- [ ] バリデーションエラー（タイトル未入力など）が正しく表示されること

## 8. 承認記録
- **計画書提示日時**: 2026-02-27 11:05
- **承認日時**: 2026-02-27 11:07

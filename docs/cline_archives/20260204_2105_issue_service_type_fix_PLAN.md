# タスク計画書: issueService.ts型エラー修正

## メタデータ
- **作成日時**: 2026-02-04 21:05
- **タスクID**: issue-service-type-fix
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

issueService.tsで型エラーが発生しており、TypeScriptのコンパイルが失敗している。型定義ファイル（issue.ts）とサービス実装（issueService.ts）の間でプロパティ名と型に不整合があるため、修正が必要。

## 2. エラー内容

```
1. Property 'reporterId' does not exist on type 'Issue'
   → 正しくは 'issueReporterId'

2. Argument of type 'string' is not assignable to parameter of type 'IssueStatus'
   → Issue.statusはstring型だが、IssueStatus型が期待されている

3. Property 'reporterId' does not exist on type 'Issue'
   → 正しくは 'issueReporterId'

4. 'taskDetailId' does not exist in type 'NewIssue'
   → NewIssueには存在しないプロパティ

5-12. Partial<NewIssue>のプロパティアクセスエラー
   → title, description, severityなどが存在しない
```

## 3. 原因分析

### 型定義（issue.ts）の構造
- `Issue.issueReporterId`: string（データベース物理名）
- `Issue.status`: string（'unresolved' | 'resolved'）
- `Issue.issueType`: number
- `NewIssue.issueTitle`: string（物理名）
- `NewIssue.issueContents`: string（物理名）
- `NewIssue.issueReporterId`: string（物理名）

### サービス実装（issueService.ts）の期待
- `Issue.reporterId`: string（論理名）
- `Issue.status`: IssueStatus型（'open' | 'in_progress' | ...）
- `Issue.issueType`: IssueType型（'bug' | 'feature_request' | ...）
- `NewIssue.title`: string（論理名）
- `NewIssue.description`: string（論理名）
- `NewIssue.reporterId`: string（論理名）

## 4. 修正方針

データベーススキーマとの整合性を保つため、**型定義はそのままで、issueService.tsを修正**する方針とします。

## 5. 実装ステップ

### Phase 1: プロパティ名の修正
- [ ] `reporterId` → `issueReporterId` に変更（3箇所）
- [ ] `title` → `issueTitle` に変更
- [ ] `description` → `issueContents` に変更
- [ ] `taskDetailId`プロパティの削除

### Phase 2: 型の修正
- [ ] `status`の型アサーションを追加（string → IssueStatus）
- [ ] `issueType`の型変換処理を追加（number ⇔ IssueType）
- [ ] `severity`プロパティの削除（データベースには存在しない）

### Phase 3: バリデーション関数の修正
- [ ] `validateIssueData`で使用するプロパティ名を修正
- [ ] `validateUpdateData`で使用するプロパティ名を修正
- [ ] 存在しないプロパティのバリデーションを削除

### Phase 4: 動作確認
- [ ] TypeScriptコンパイルが成功することを確認
- [ ] デバッグ実行でエラーが発生しないことを確認

## 6. 影響範囲

### 変更するファイル
1. `backend/src/services/issueService.ts` - プロパティ名と型の修正

### 影響を受ける可能性のあるファイル
- `backend/src/controllers/issueController.ts` - サービス層を呼び出している
- `backend/src/repositories/issueRepository.ts` - 同じ型定義を使用

## 7. 技術的詳細

### プロパティ名マッピング
```typescript
// 修正前（論理名） → 修正後（物理名）
reporterId → issueReporterId
title → issueTitle
description → issueContents
taskDetailId → （削除、存在しない）
```

### 型マッピング
```typescript
// Issue.status: string型だが、実際の値は限定的
// IssueStatus型が期待される箇所では型アサーションを使用
status as IssueStatus

// Issue.issueType: number型
// 文字列から数値への変換が必要
const issueTypeMap = {
  'bug': 1,
  'feature_request': 2,
  // ...
};
```

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他のファイルでも同様のエラーが存在 | 中 | 中 | コンパイル後、全体的なエラーチェック |
| データベーススキーマとの不整合 | 高 | 低 | 型定義がER図と一致していることを確認済み |

## 9. テスト計画

### コンパイルテスト
- [ ] `npm run build` でエラーが発生しないこと

### デバッグ実行テスト
- [ ] バックエンドがデバッグモードで起動できること
- [ ] エラーログが出力されないこと

## 10. 承認記録

- **計画書提示日時**: 2026-02-04 21:05
- **承認日時**: （承認待ち）
- **承認者コメント**: （なし）

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（なし）

### 発生した問題と解決方法
（なし）

### 最終的な成果物
- [ ] issueService.tsの型エラー修正
- [ ] TypeScriptコンパイル成功
- [ ] デバッグ実行成功

## 12. 振り返り

### うまくいった点
（実施後に記入）

### 改善が必要な点
（実施後に記入）

### 学んだこと
（実施後に記入）
# タスク計画書: 個人スコープ名前空間URI修正

## メタデータ
- **作成日時**: 2026-09-04 10:00
- **タスクID**: 20260904_1000_個人スコープ名前空間URI修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

XMLビューで個人スコープの名前空間URIのドメイン部が正しくない問題を修正する。

### 事象
- 組織CD: ORG001-AIML
- ユーザID: test.user004@soft-service.co.jp
- 個人スコープに prefix「exam」を新規作成後、XMLビューを確認すると：
  - 誤: `xmlns:exam="https://test_group002.Alchemia.co.jp/test.user004"`
  - 正: `xmlns:exam="https://ORG001-AIML.Alchemia.co.jp/test.user004"`

## 根本原因

`backend/src/services/namespaceService.ts` の `getSuggestedUri()` 関数（個人スコープ分岐）において、  
URI のドメイン部に `organization_cd` ではなく `findUserOrgGroupCd()` で取得したグループCDを使用しているため。

```
ユーザー作成時（registerUserNamespace）: organizationCd ベースで URI を DB 登録
  → https://ORG001-AIML.Alchemia.co.jp/test.user004  ← DB に保存

XML表示時（getSuggestedUri → fetchSuggestedUri → getOrganizationNamespaces）: userGroupCd ベースで URI 生成
  → https://test_group002.Alchemia.co.jp/test.user004  ← DB 保存値と乖離

フロント（getOrganizationNamespaces）: DB の正しい URI を上記の誤った URI で上書きして XML に注入
  → xmlns:exam="https://test_group002.Alchemia.co.jp/test.user004"  ← 誤った URI が表示される
```

## 目的と期待される成果
- [x] `getSuggestedUri()` が `userService.ts:registerUserNamespace()` と同一の  
  `https://{organization_cd}.Alchemia.co.jp/{loginName}` 形式で URI を返すようになる
- [x] XMLビューの個人スコープ prefix の名前空間 URI が正しく表示される

## 実装ステップ
- [ ] `backend/src/services/namespaceService.ts` の `getSuggestedUri()` 個人スコープ分岐を修正
  - `findUserOrgGroupCd()` の呼び出しを削除
  - ドメイン部を `organizationCd` 固定に変更
- [ ] `backend/tests/phase2/services/namespaceService.phase2.test.ts` に `getSuggestedUri()` のテストを追加
- [ ] 動作確認

## 変更ファイル
1. `backend/src/services/namespaceService.ts` - `getSuggestedUri()` 個人スコープ分岐修正
2. `backend/tests/phase2/services/namespaceService.phase2.test.ts` - テスト追加

## 影響範囲
| 機能 | 影響 | 備考 |
|------|------|------|
| XMLビュー（個人スコープ prefix の xmlns） | 修正される | `fetchSuggestedUri()` が正しいURIを返す |
| Prefix追加時のURI自動生成（PrefixManagement.tsx） | 修正される | `handleAutoFillUri()` も正しいURIを返す |
| MAIMLファイル保存時の xmlns 注入 | 修正される | `getOrganizationNamespaces()` の上書き値が正しくなる |
| グループスコープのURI生成 | 影響なし | `if (scopeKey && scopeKey !== userId)` ブロックは変更なし |
| ユーザー作成時のURI登録（userService.ts） | 変更なし | 元から正しいロジック |

## リスク
| リスク | 対策 |
|--------|------|
| Prefix追加時のURI自動生成に影響 | 修正後のURIは `userService.ts` と同一形式のため正しい動作 |

## テスト計画
- [ ] `getSuggestedUri()` 個人スコープのテスト追加（organizationCd ベースで URI 生成されること）
- [ ] `getSuggestedUri()` グループスコープのテストが既存のまま通ること（変更なし）

## 承認記録
- **計画書提示日時**: 2026-09-04 10:00
- **承認日時**: 2026-09-04（act モードで承認済み）
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-09-04 10:00
完了: 2026-09-04 11:45

### 計画からの変更点
- 既存テスト（`createNamespace`, `updateNamespace`, `getDeclarationsByProject`, `getTerms`, `createTerm`, `toggleTermActive`）が古いAPIを参照していたため、現在の API に合わせて修正した（本タスクのスコープ外だが、テストスイートを動作させるために対応）
- `globalNamespaceFileService` のモックを追加（S3呼び出しによるテスト失敗を回避）

### 発生した問題と解決方法
- 既存テストが `insertNamespace`, `getTerms`, `setTermActive`, `getDeclarationsByProject` 等の存在しない関数を参照していた
  → 現在の実装（`findNamespaceIdByScopeKey + createPrefixOnly`, `findProjectGroupCd + findDeclarationsByProjectScope` 等）に合わせて修正

### 最終的な成果物
- [x] `backend/src/services/namespaceService.ts` 修正 - `getSuggestedUri()` 個人スコープのドメイン部を `organizationCd` 固定に変更
- [x] `backend/tests/phase2/services/namespaceService.phase2.test.ts` 修正 - 既存テストの API 更新 + `getSuggestedUri()` テスト5件追加
- [x] 全テスト（11件）パス確認

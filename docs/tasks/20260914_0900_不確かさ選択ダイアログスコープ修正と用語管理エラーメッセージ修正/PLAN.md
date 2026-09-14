# タスク計画書: 不確かさ選択ダイアログ スコープ修正 & 用語管理エラーメッセージ修正

## メタデータ
- **作成日時**: 2026-09-14 09:00
- **タスクID**: 20260914_0900
- **優先度**: 高
- **推定工数**: 3時間

---

## 1. タスク概要

### 問題①: テンプレート不確かさ選択ダイアログ — 関係ないスコープのキーが表示される

`GET /api/v1/uncertainty-criteria/for-selector` が `organization_id` のみでフィルタし、
プロジェクトの所属グループのスコープによる絞り込みが未実装。
→ 組織内全グループの不確かさ基準が全件表示される。

### 問題②: 用語管理 — 上位層 prefix:用語追加時エラーメッセージのスコープ名が誤っている

`findPrefixNamespaceId.sql` が `prefix.scope_key` で organization_group を JOIN しているが、
`prefix.scope_key` が `namespace.scope_key` と一致しないケースで ORDER BY が機能せず、
グループより**ユーザ**の namespace_id を先に返すことがある。
→ エラーメッセージが「ユーザ004で既に登録されています」と表示される。

---

## 2. 変更ファイル一覧

### バックエンド
| # | ファイル | 変更種別 | 内容 |
|---|---------|---------|------|
| 1 | `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` | **修正** | `organizationGroupCd` によるスコープフィルタ追加（WITH RECURSIVE 祖先グループ絞り込み）|
| 2 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | **修正** | `findForSelector()` に `organizationGroupCd?: string \| null` 引数追加 |
| 3 | `backend/src/services/uncertaintyCriteriaService.ts` | **修正** | `getForSelector()` に `organizationGroupCd` 引数追加 |
| 4 | `backend/src/controllers/uncertaintyCriteriaController.ts` | **修正** | `getForSelector()` でクエリパラメータ取得 |
| 5 | `backend/src/routes/uncertaintyCriteriaRoutes.ts` | **修正** | `/for-selector` に optional クエリパラメータ追加 |
| 6 | `backend/src/sql/queries/namespace_terms/findPrefixNamespaceId.sql` | **修正** | JOIN を `prefix.scope_key` → `namespace.scope_key` に変更 |
| 7 | `backend/tests/phase2/repositories/uncertaintyCriteriaRepository.phase2.test.ts` | **修正** | `findForSelector()` テスト更新 |
| 8 | `backend/tests/phase2/repositories/namespaceTermRepository.phase2.test.ts` | **修正・追加** | `findPrefixNamespaceId` のグループ優先テスト追加 |

### フロントエンド
| # | ファイル | 変更種別 | 内容 |
|---|---------|---------|------|
| 9 | `frontend/src/services/uncertaintyCriteriaApiService.ts` | **修正** | `fetchUncertaintyCriteriaForSelector(organizationGroupCd?)` に引数追加 |
| 10 | `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` | **修正** | `fetchUncertaintyCriteriaForSelector` 呼び出しに `organizationGroupCd` を渡す |

---

## 3. 実装ステップ

- [x] Step 1: `findForSelector.sql` スコープフィルタ追加
- [x] Step 2: `uncertaintyCriteriaRepository.ts` `findForSelector()` 引数追加
- [x] Step 3: `uncertaintyCriteriaService.ts` `getForSelector()` 引数追加
- [x] Step 4: `uncertaintyCriteriaController.ts` クエリパラメータ取得
- [x] Step 5: `uncertaintyCriteriaRoutes.ts` optional クエリパラメータ追加
- [x] Step 6: `uncertaintyCriteriaApiService.ts` 引数追加
- [x] Step 7: `UncertaintyCriteriaSelectorModal.tsx` `organizationGroupCd` 渡し
- [x] Step 8: `findPrefixNamespaceId.sql` JOIN修正
- [x] Step 9: バックエンドテスト修正・追加（61件 PASS）
- [x] Step 10: バックエンドビルド確認（エラーなし）
- [x] Step 11: フロントエンドビルド確認（エラーなし）
- [x] Step 12: テスト実行確認

---

## 4. 承認記録

- **承認日時**: 2026-09-14（act モードへの切り替えにより承認済み）

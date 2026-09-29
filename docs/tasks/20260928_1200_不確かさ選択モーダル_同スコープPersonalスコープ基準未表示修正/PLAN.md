# タスク計画書: 不確かさ選択モーダル — 同スコープ・Personalスコープ基準未表示修正

## メタデータ
- **作成日時**: 2026-09-28 12:00
- **タスクID**: 20260928_1200
- **優先度**: 高
- **推定工数**: 1h

---

## タスク概要

テンプレート編集画面の不確かさ選択モーダル（`UncertaintyCriteriaSelectorModal`）で
「不確かさ基準候補に表示されない」問題を修正する。

`findForSelector.sql` の WHERE 句に以下2つの条件が欠如していることが原因。

1. **同スコープ（指定グループ自身）が漏れる**  
   `ancestors` CTE は `organization_group` テーブルに `$2` のレコードが存在しない場合に空集合となり、
   `scope_key IN ancestors` でマッチしない。`scope_key = $2` の直接参照が必要。

2. **Personal スコープが未実装**  
   `namespace.scope_key = userId` の個人用 namespace に格納された基準が含まれていない。

---

## 原因図解

```
【現在の動作】
$1 = organizationId
$2 = organizationGroupCd = 'G'

ancestors CTE:
  organization_group WHERE organization_group_cd = 'G'
  → G が存在すれば {G, Gの親…}、存在しなければ {}

WHERE:
  ns.scope_key IN ancestors  ← G が存在しない場合は空マッチ → Gスコープが漏れる ❌
  OR ns.scope_key IS NULL    ← 組織共通スコープのみ確実に返る
  ← Personal スコープ(userId) は未実装 ❌

────────────────────────────────────────────────

【修正後】
$1 = organizationId
$2 = organizationGroupCd = 'G'
$3 = userId = 'user-001'  ← 新規追加

WHERE:
  ns.scope_key IN ancestors    ← 上位グループ（Gの親以上）
  OR ns.scope_key = $2         ← Gスコープ自身を直接対象 ★修正①
  OR ns.scope_key = $3         ← Personal スコープ(userId) ★修正②
  OR ns.scope_key IS NULL      ← 組織共通スコープ
```

---

## 修正前/修正後 機能フロー図

### 修正前

```
[UncertaintyCriteriaSelectorModal]
    ↓ organizationGroupCd='G'
[Controller] getForSelector(req, res, next)
    ↓ userId を取得しない
[Service] getForSelector(orgId, 'G')
[Repository] findForSelector(orgId, 'G')
    ↓ SQL: [$1=orgId, $2='G']
[SQL] WHERE scope_key IN ancestors OR scope_key IS NULL
    結果: 上位グループ + 組織共通のみ
    → Gスコープが漏れる可能性 ❌
    → Personal スコープなし ❌
```

### 修正後

```
[UncertaintyCriteriaSelectorModal]
    ↓ organizationGroupCd='G'
[Controller] getForSelector(req, res, next)
    ↓ userId = req.user.userId を取得 ★
[Service] getForSelector(orgId, 'G', 'user-001')
[Repository] findForSelector(orgId, 'G', 'user-001')
    ↓ SQL: [$1=orgId, $2='G', $3='user-001']
[SQL] WHERE scope_key IN ancestors
         OR scope_key = 'G'          ← Gスコープ自身
         OR scope_key = 'user-001'   ← Personal スコープ
         OR scope_key IS NULL        ← 組織共通
    結果: Gスコープ + 上位グループ + Personal + 組織共通 ✅
```

---

## 修正ファイル一覧

| # | ファイルパス | 変更種別 | 内容 |
|---|------------|---------|------|
| 1 | `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` | **修正** | `$3` 追加・WHERE 句に `OR ns.scope_key = $2` と `OR ns.scope_key = $3` を追加 |
| 2 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | **修正** | `findForSelector()` に `userId` 引数追加・SQL 呼び出しに `$3` を渡す |
| 3 | `backend/src/services/uncertaintyCriteriaService.ts` | **修正** | `getForSelector()` に `userId` 引数追加・Repository 呼び出しに渡す |
| 4 | `backend/src/controllers/uncertaintyCriteriaController.ts` | **修正** | `req.user.userId` を取得して Service に渡す |
| 5 | `backend/tests/phase2/controllers/uncertaintyCriteriaController.phase2.test.ts` | **修正** | `getForSelector` テストの期待引数に `userId` を追加 |
| 6 | `backend/tests/phase2/repositories/uncertaintyCriteriaRepository.phase2.test.ts` | **修正** | `findForSelector` テストの呼び出し引数・期待値に `userId` を追加 |

---

## 実装ステップ

- [x] タスク計画書作成
- [x] Step 1: `findForSelector.sql` — WHERE 句修正（$2直接参照・$3 Personal スコープ追加）
- [x] Step 2: `uncertaintyCriteriaRepository.ts` — `findForSelector()` 引数・SQL 呼び出し修正
- [x] Step 3: `uncertaintyCriteriaService.ts` — `getForSelector()` 引数修正
- [x] Step 4: `uncertaintyCriteriaController.ts` — `userId` 取得・渡し処理追加
- [x] Step 5: テスト修正（Controller・Repository）
- [x] Step 6: ビルド確認（TSC exit code 0 / テスト 23件 PASS）

---

## 承認記録
- **計画書提示日時**: 2026-09-28 12:00
- **承認日時**: 2026-09-28 12:00
- **承認者コメント**: 修正内容問題なし。Personal スコープも追加する。

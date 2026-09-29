# タスク計画書: 不確かさ選択モーダルスコープ名表示修正

## メタデータ
- **作成日時**: 2026-09-28 10:00
- **タスクID**: 20260928_1000
- **優先度**: 中
- **推定工数**: 1時間

---

## タスク概要

不確かさ選択モーダル（`UncertaintyCriteriaSelectorModal`）のスコープ列に、
スコープ名（組織グループ名またはユーザー名）ではなく `namespace_id`（例: `NS0118`）が
表示されているバグを修正する。

---

## 原因調査

### 根本原因

セレクター用APIエンドポイント `GET /api/v1/uncertainty-criteria/for-selector` が呼び出す
`findForSelector.sql` に `organization_group` / `organization_user` の LEFT JOIN がないため、
スコープ名（`scopeName`）が取得できない。

フロントエンドは受け取った `nameSpaceId`（例: `NS0118`）を `scopeLabel` としてそのまま表示している。

### 原因トレース

```
① findForSelector.sql
   namespace テーブルはJOIN済みだが
   organization_group / organization_user へのJOINがない
   → scopeKey / scopeName を SELECT していない

② uncertaintyCriteriaRepository.ts
   UncertaintyCriteriaSelectorRow 型に scopeKey/scopeName フィールドなし
   findForSelector() の内部型にも scopeKey/scopeName なし

③ uncertaintyCriteriaApiService.ts (フロントエンド)
   UncertaintyCriteriaSelectorApiRow 型に scopeKey/scopeName なし
   scopeLabel: row.nameSpaceId ← "NS0118" を直接使用 ← バグ箇所

④ UncertaintyCriteriaSelectorModal.tsx
   scopeLabel = "NS0118" をそのまま「スコープ」列に表示
```

### 参照比較（修正済みの類似箇所）

`findAllByOrganization.sql`（一覧取得）では既に正しく実装済み:

```sql
, n.scope_key                      AS "scopeKey"
, COALESCE(og.organization_group_name, ou.user_name, '') AS "scopeName"
LEFT JOIN organization_group og ON og.organization_group_cd = n.scope_key
LEFT JOIN organization_user ou ON ou.user_id = n.scope_key
```

---

## 修正前/修正後の機能フロー図

### 修正前

```
UncertaintyCriteriaSelectorModal
  │
  └─ fetchUncertaintyCriteriaForSelector()
       ↓
     GET /api/v1/uncertainty-criteria/for-selector
       ↓
     [SQL] findForSelector.sql
       ✗ organization_group / organization_user JOIN なし
       ✗ scopeKey / scopeName SELECT なし
       ↓
     戻り値: { nameSpaceId: "NS0118" } ← scopeName なし
       ↓
     scopeLabel: row.nameSpaceId = "NS0118"
       ↓
     スコープ列に "NS0118" が表示される  ← バグ
```

### 修正後

```
UncertaintyCriteriaSelectorModal
  │
  └─ fetchUncertaintyCriteriaForSelector()
       ↓
     GET /api/v1/uncertainty-criteria/for-selector
       ↓
     [SQL] findForSelector.sql
       ✅ LEFT JOIN organization_group og ON og.organization_group_cd = ns.scope_key
       ✅ LEFT JOIN organization_user ou ON ou.user_id = ns.scope_key
       ✅ ns.scope_key AS "scopeKey"
       ✅ COALESCE(og.organization_group_name, ou.user_name, '') AS "scopeName"
       ↓
     戻り値: { ..., scopeKey: "GRP001", scopeName: "グループ名" }
       ↓
     scopeLabel: row.scopeName ?? row.scopeKey ?? row.nameSpaceId = "グループ名"
       ↓
     スコープ列に "グループ名" が表示される  ✅ 正しい
```

---

## 修正対象ファイル一覧

| # | ファイル | 変更種別 | 変更概要 |
|---|---------|---------|---------|
| 1 | `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` | 修正 | `organization_group` / `organization_user` LEFT JOIN 追加、`scopeKey` / `scopeName` SELECT 追加 |
| 2 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 修正 | `UncertaintyCriteriaSelectorRow` 型に `scopeKey` / `scopeName` 追加、`findForSelector` 内部型・グループ化処理更新 |
| 3 | `frontend/src/services/uncertaintyCriteriaApiService.ts` | 修正 | `UncertaintyCriteriaSelectorApiRow` 型に `scopeKey` / `scopeName` 追加、`scopeLabel` マッピングを `row.scopeName ?? row.scopeKey ?? row.nameSpaceId` に変更 |

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `namespace` テーブルに対応レコードがない既存データで `scopeName` が空になる | 低 | フォールバック `scopeName ?? scopeKey ?? nameSpaceId` で nameSpaceId を表示（既存挙動維持） |
| 個人スコープで `organization_group` に一致しない場合 | 低 | `organization_user` を LEFT JOIN しているため `user_name` を取得 |
| JOIN 追加によるクエリ性能劣化 | 低 | すべて LEFT JOIN かつ既存インデックスを利用。件数も少量のため影響なし |

---

## 実装ステップ

- [x] タスク計画書作成（PLAN.md）
- [ ] `findForSelector.sql` 修正（JOIN追加・SELECT追加）
- [ ] `uncertaintyCriteriaRepository.ts` 修正（型定義・処理追加）
- [ ] `uncertaintyCriteriaApiService.ts` 修正（型定義・マッピング修正）
- [ ] バックエンド build 確認
- [ ] フロントエンド build 確認

---

## 承認記録

- **計画書提示日時**: 2026-09-28 10:00
- **承認日時**: 2026-09-28（ユーザー承認済み・Act モード移行）

---

## 実施記録

### 実施日時
開始: 2026-09-28 10:00
完了: （作業完了時に記入）

### 最終的な成果物
- [x] `findForSelector.sql` 修正完了
- [x] `uncertaintyCriteriaRepository.ts` 修正完了
- [x] `uncertaintyCriteriaApiService.ts` 修正完了
- [x] ビルドエラーなし確認

# タスク計画書: 名前空間管理 — スコープ表示不整合 調査・実装

## メタデータ

- **作成日時**: 2026-09-09 19:00
- **タスクID**: namespace-scope-display-inconsistency
- **優先度**: 高
- **推定工数**: 1.0 時間

---

## 1. タスク概要

名前空間管理タブにて、左ペインで同じ階層（例: `group1`）を選択しているにもかかわらず、
各タブのスコープ列に表示される内容が以下のように異なる問題を調査・実装する。

| タブ | スコープ列の表示 | 正誤 |
|---|---|---|
| Prefix管理 | `group1`（組織グループ名） | 正しい |
| 用語管理 | `group1`（組織グループ名） | 正しい |
| 不確かさ基準一覧 | `NS0127`（namespace 内部ID） | 誤り |

---

## 2. 根本原因

### 問題のデータフロー（修正前）

```
[左ペイン: 「group1」選択]
    ↓ selectedNsKey → resolveScopeKey() → scopeKey = "group1"
    ↓ Controller: findNamespaceIdByScopeKey(orgId, "group1") → "NS0127"
    ↓ findAllByOrganization.sql WHERE name_space_id = "NS0127"  (フィルタ正常)
    ↓ レスポンス: { scopeKey: NULL, scopeName: NULL }  ← JOIN 未実装
    ↓ フロント: scope = null ?? null ?? "NS0127" = "NS0127"  ← 内部IDを直接表示
```

### 原因ファイル（修正前）

| ファイル | 問題点 |
|---|---|
| `findAllByOrganization.sql` | namespace / organization_group / organization_user への LEFT JOIN が未実装 |
| `uncertaintyCriteriaRepository.ts` | `UncertaintyCriteriaRow` 型に `scopeKey` / `scopeName` フィールドが未定義 |
| `uncertaintyCriteriaApiService.ts` | `scope` マッピングが `row.nameSpaceId`（内部ID）固定 |

---

## 3. 目的と期待される成果

- [x] 不確かさ基準一覧のスコープ列に `organization_group_name` または `user_name` が表示される
- [x] Prefix管理・用語管理と同じ表示形式で統一される
- [x] 後方互換維持・マルチテナント分離が維持されている

---

## 4. 変更ファイル一覧

| # | ファイル | 種別 | 変更内容 |
|---|---|---|---|
| 1 | `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` | 修正 | namespace / organization_group / organization_user の LEFT JOIN 追加、scopeKey / scopeName SELECT 追加 |
| 2 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 修正 | `UncertaintyCriteriaRow` 型に `scopeKey` / `scopeName` 追加 |
| 3 | `frontend/src/services/uncertaintyCriteriaApiService.ts` | 修正 | 型拡張・`scope` マッピング修正（`row.scopeName ?? row.scopeKey ?? row.nameSpaceId`） |

---

## 5. 影響範囲

| エンドポイント | 影響 |
|---|---|
| `GET /api/v1/uncertainty-criteria` | `scopeKey` / `scopeName` フィールドが追加される（後方互換維持） |
| 他エンドポイント | 変更なし |

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| `namespace` テーブルに対応レコードがない既存データで `scopeName` が空になる | 低 | `scopeName ?? scopeKey ?? nameSpaceId` フォールバックで内部IDを表示 |
| 個人スコープで `organization_group` に一致しない場合 | 低 | `organization_user` を LEFT JOIN しているため `user_name` を取得 |

---

## 7. テスト計画

- [ ] 左ペインで組織グループノードを選択 → スコープ列にグループ名が表示されること
- [ ] 左ペインで Personal 配下のユーザーノードを選択 → スコープ列にユーザー名が表示されること
- [ ] Prefix管理タブ・用語管理タブのスコープ列と一致していること

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-09 19:00
- **承認日時**: 2026-09-09（act モードにて承認済み）

---

## 9. 実施記録

### 実施日時

開始: 2026-09-09 / 完了: 2026-09-09

### 計画からの変更点

調査の結果、`c:\git\mmdpf` の対象3ファイルは既にコミット `87019ac2`（`jira課題対応（353/355）`）にて実装済みであることが判明した。
`c:\git\test` との差分比較（`IDENTICAL`）により、両リポジトリで同一の修正が適用済みであることを確認した。

`c:\git\test` は `c:\git\mmdpf` の `feature/phase2_mock_takizawa_2` ブランチを `feature/phese2_mock_takizawa_4` にマージしたブランチであり、`mmdpf` の変更がそのまま反映されていた。

### 最終的な成果物

- [x] `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` — LEFT JOIN 追加、scopeKey / scopeName カラム追加（実装済み確認）
- [x] `backend/src/repositories/uncertaintyCriteriaRepository.ts` — `scopeKey` / `scopeName` フィールド追加（実装済み確認）
- [x] `frontend/src/services/uncertaintyCriteriaApiService.ts` — 型拡張・`scope` マッピング修正（実装済み確認）
- [x] `docs/tasks/20260909_1900_名前空間管理スコープ表示不整合調査実装/PLAN.md` — 本タスク計画書作成

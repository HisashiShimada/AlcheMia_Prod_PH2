# タスク計画書: Prefix管理 — 上位層重複 一覧表示バグ修正

## メタデータ
- **作成日時**: 2026-09-10 15:00
- **タスクID**: 20260910_1500_Prefix管理上位層重複一覧表示バグ修正
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

名前空間管理タブ（Prefix管理）で、上位層に存在する Prefix（例: `Uncertainty`）を下位層（グループ002）に
登録すると警告メッセージが表示されるが、「登録する」を押下しても一覧に表示されない。
また警告メッセージの文言が「上書き登録しますか？」と誤解を招く表現になっている。

### 事象①: 一覧に表示されない（根本バグ）

`fetchNamespacesWithAncestorsAndDescendants()` 内のマージロジックが
`prefix` 名のみで重複除去しているため、`ancestorList`（グループ001の `Uncertainty`）が先に
`seen` セットに追加され、`descendantList`（グループ002の新規登録 `Uncertainty`）が除外される。

DBには正常に INSERT されているが、`reloadNamespaces()` 後の一覧に表示されない。

### 事象②: 警告メッセージの文言が誤り

- **誤**: 「「Uncertainty」は「結合テスト グループ001」に既に登録されています。上書き登録しますか？」
- **正**: 「「Uncertainty」は上位層「結合テスト グループ001」に既に登録されています。現在の階層にも追加登録しますか？」

`createPrefix.sql` に `ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING` があり、
実際には上書きは発生しないため「上書き」という表現が不正確。

---

## 2. 変更ファイル一覧

| # | ファイル | 変更種別 | 内容 |
|---|---------|---------|------|
| 1 | `frontend/src/components/namespace/PrefixManagement.tsx` | **修正** | `fetchNamespacesWithAncestorsAndDescendants` のマージロジックを複合キー化 |
| 2 | `frontend/src/locales/ja.json` | **修正** | `warnAlreadyRegistered` 文言修正（「上書き登録」→「追加登録」） |
| 3 | `frontend/src/locales/en.json` | **修正** | `warnAlreadyRegistered` 英語文言修正 |
| 4 | `frontend/src/components/namespace/__tests__/PrefixManagement.unit.test.ts` | **新規** | マージロジック・警告メッセージの単体テスト |

---

## 3. 実装ステップ

- [x] PLAN.md 作成
- [x] `PrefixManagement.tsx` マージロジック複合キー化
- [x] `ja.json` 文言修正
- [x] `en.json` 文言修正
- [x] `PrefixManagement.unit.test.ts` 単体テスト作成
- [x] フロントエンド TS チェック（`tsc --noEmit` → exit code 0）
- [x] テスト実行確認（9件全 PASS）

---

## 4. 承認記録
- **計画書提示日時**: 2026-09-10 15:00
- **承認日時**: 2026-09-10（ユーザー承認済み・act モード）

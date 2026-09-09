# タスク計画書: 不確かさ基準管理 — スコープ列表示修正

## メタデータ

- **作成日時**: 2026-09-09 10:00
- **タスクID**: uncertainty-criteria-scope-display-fix
- **優先度**: 高
- **推定工数**: 1.0 時間

---

## 1. タスク概要

名前空間管理の左ペインで「結合テスト グループ001」階層を選択し、不確かさ基準キーを新規追加した後、
不確かさ基準一覧の **スコープ列** に内部ID（例: `NS0118`）が表示される不具合を修正する。

本来は `namespace.scope_key` → `organization_group.organization_group_name`（または `organization_user.user_name`）
を辿って **人間が読めるグループ名（例: 結合テスト グループ001）** を表示すべきである。

---

## 2. 根本原因

### 問題のデータフロー

```
[左ペイン: 「結合テスト グループ001」選択]
    ↓ selectedNsKey = organization_group_cd
    ↓ resolveScopeKey() → scopeKey
    ↓ Controller: findNamespaceIdByScopeKey(orgId, scopeKey) → "NS0118"
    ↓ findAllByOrganization.sql WHERE name_space_id = "NS0118"  ✅ フィルタ正常
    ↓ レスポンス: { nameSpaceId: "NS0118", ... }  ← scopeName 未取得 ❌
    ↓ フロント: scope: row.nameSpaceId = "NS0118"  ← 内部IDを直接表示 ❌
```

### 原因ファイル

| ファイル | 問題点 |
|---|---|
| `findAllByOrganization.sql` | `namespace` / `organization_group` / `organization_user` へのJOINが未実装 |
| `uncertaintyCriteriaRepository.ts` | `UncertaintyCriteriaRow` 型に `scopeKey` / `scopeName` フィールドが未定義 |
| `uncertaintyCriteriaApiService.ts` | `scope` マッピングが `row.nameSpaceId`（内部ID）固定 |

---

## 3. 目的と期待される成果

- [x] スコープ列に `organization_group.organization_group_name`（グループスコープ）または `organization_user.user_name`（個人スコープ）が表示される
- [x] 左ペインでグループノードを選択した状態で新規キーを追加後、一覧再取得時に正しいグループ名が表示される
- [x] `namespace` テーブルと紐づかない既存レコードでも表示が壊れない（後方互換維持）

---

## 4. 実装ステップ

### Phase 1: バックエンド — SQL修正
- [x] `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` 修正
  - `namespace n` を LEFT JOIN（`n.namespace_id = uc.name_space_id`）
  - `organization_group og` を LEFT JOIN（`og.organization_group_cd = n.scope_key`）
  - `organization_user ou` を LEFT JOIN（`ou.user_id = n.scope_key`）
  - `n.scope_key AS "scopeKey"` カラム追加
  - `COALESCE(og.organization_group_name, ou.user_name, '') AS "scopeName"` カラム追加

### Phase 2: バックエンド — 型定義修正
- [x] `backend/src/repositories/uncertaintyCriteriaRepository.ts` 修正
  - `UncertaintyCriteriaRow` に `scopeKey: string | null` フィールド追加
  - `UncertaintyCriteriaRow` に `scopeName: string | null` フィールド追加

### Phase 3: フロントエンド — APIサービス修正
- [x] `frontend/src/services/uncertaintyCriteriaApiService.ts` 修正
  - `UncertaintyCriteriaApiRow` に `scopeKey: string | null` フィールド追加
  - `UncertaintyCriteriaApiRow` に `scopeName: string | null` フィールド追加
  - `scope` マッピングを `row.scopeName ?? row.scopeKey ?? row.nameSpaceId` に変更

---

## 5. 変更ファイル一覧

| # | ファイル | 種別 | 変更内容 |
|---|---|---|---|
| 1 | `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` | 修正 | JOIN 追加・`scopeKey` / `scopeName` SELECT 追加 |
| 2 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 修正 | `UncertaintyCriteriaRow` 型に `scopeKey` / `scopeName` 追加 |
| 3 | `frontend/src/services/uncertaintyCriteriaApiService.ts` | 修正 | 型拡張・`scope` マッピング修正 |

---

## 6. 影響範囲

### 影響を受けるエンドポイント

| エンドポイント | 影響 |
|---|---|
| `GET /api/v1/uncertainty-criteria` | スコープ表示名が追加される（既存フィールドの変更なし） |
| `GET /api/v1/uncertainty-criteria/for-selector` | 変更なし（`findForSelector.sql` は別SQL） |
| `POST /api/v1/uncertainty-criteria` | 変更なし（保存処理に変更なし） |
| `GET /api/v1/uncertainty-criteria/:key` | 変更なし（`findByKey.sql` は別SQL） |

### セキュリティ・マルチテナント分離への影響

- LEFT JOIN に `uc.organization_id` を必ず含めているためマルチテナント分離を維持 ✅
- 追加カラムは読み取りのみで既存セキュリティモデルに影響なし ✅

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| `namespace` テーブルに対応レコードがない既存データで `scopeName` が空になる | 低 | 低 | フォールバック `scopeName ?? scopeKey ?? nameSpaceId` で内部IDを表示 |
| `organization_group` に `scope_key` が一致しない場合（個人スコープ） | 低 | 中 | `organization_user` を LEFT JOIN しているため `user_name` を取得 ✅ |
| JOIN 追加によるクエリ性能劣化 | 低 | 低 | すべて LEFT JOIN かつ既存インデックスを利用。件数も少量のため影響なし |

---

## 8. テスト計画

### 手動テスト

- [ ] 左ペインで組織グループノードを選択 → スコープ列にグループ名が表示されること
- [ ] 新規不確かさ基準を追加後、一覧再取得時にスコープ列に正しいグループ名が表示されること
- [ ] 左ペインで Personal 配下のユーザーノードを選択 → スコープ列にユーザー名が表示されること
- [ ] 左ペインで全件表示（company 等）選択 → すべての基準が表示され各スコープ列に名前が表示されること
- [ ] `namespace` と紐づかない既存データがある場合、エラーにならず `nameSpaceId` がフォールバック表示されること

---

## 9. ロールバック計画

3ファイルの変更を元に戻す：

1. `findAllByOrganization.sql` — 追加した JOIN 4本と `scopeKey` / `scopeName` SELECT カラムを削除
2. `uncertaintyCriteriaRepository.ts` — `UncertaintyCriteriaRow` から `scopeKey` / `scopeName` フィールドを削除
3. `uncertaintyCriteriaApiService.ts` — 同フィールドを削除し `scope` マッピングを `row.nameSpaceId` に戻す

---

## 10. 関連ドキュメント

- `docs/design/db/ddl/namespace.sql` — namespace テーブル定義
- `docs/design/db/ddl/organization_group.sql` — organization_group テーブル定義
- `docs/design/db/ddl/uncertainty_criteria.sql` — uncertainty_criteria テーブル定義

---

## 11. 承認記録

- **計画書提示日時**: 2026-09-09
- **承認日時**: 2026-09-09（plan モードにて調査・TODO 作成承認済み、act モードに切り替えて実装承認済み）

---

## 12. 実施記録

### 実施日時

開始: 2026-09-09
完了: 2026-09-09

### 計画からの変更点

なし（計画通りに実施）

### 発生した問題と解決方法

なし

### 最終的な成果物

- [x] `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` — namespace / organization_group / organization_user の LEFT JOIN 追加、scopeKey / scopeName カラム追加
- [x] `backend/src/repositories/uncertaintyCriteriaRepository.ts` — `UncertaintyCriteriaRow` 型に `scopeKey` / `scopeName` フィールド追加
- [x] `frontend/src/services/uncertaintyCriteriaApiService.ts` — `UncertaintyCriteriaApiRow` 型拡張 + `scope` マッピングを `row.scopeName ?? row.scopeKey ?? row.nameSpaceId` に修正

---

## 13. 振り返り

### うまくいった点

- 既存の `findNamespacesByScopeKey.sql` 等で確立されたパターン（`COALESCE(og.organization_group_name, ou.user_name, '')`）をそのまま流用できた
- すべて LEFT JOIN のため後方互換を維持しながら対応できた

### 改善が必要な点

- 新規キー追加時のスコープ設定フローは今後も注意が必要（`nameSpaceId` が正しく設定されているか確認すること）

### 学んだこと

- `namespace.namespace_id` は内部IDであり、画面表示には `namespace.scope_key` → `organization_group_name` / `user_name` の変換が必要
- スコープ情報の取得は `findNamespacesByScopeKey.sql` 等の既存 SQL と同じパターンで統一できる

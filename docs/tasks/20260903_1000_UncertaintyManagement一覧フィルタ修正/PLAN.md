# タスク計画書: UncertaintyManagement 一覧フィルタ修正

## メタデータ
- **作成日時**: 2026-09-03 10:00
- **タスクID**: UncertaintyManagement一覧フィルタ修正
- **優先度**: 高
- **推定工数**: 3時間

---

## タスク概要

`UncertaintyManagement.tsx` の左ペイン（名前空間ツリー）で何を選択しても、
`uncertainty_criteria` テーブルの全レコードを取得してしまうバグを修正する。

左ペインの選択ノード（`selectedNsKey`）を API クエリパラメータとして渡し、
バックエンドで `name_space_id` フィルタを適用することで、選択ノードに紐づく
レコードのみを一覧表示する。

---

## 根本原因

| 層 | 現状の問題 |
|----|-----------|
| **フロント** `UncertaintyManagement.tsx` | `fetchUncertaintyCriteriaList()` をマウント時1回のみ呼び出し（`useEffect(fn, [])`）。`selectedNsKey` の変更を一切反映していない |
| **フロント** `uncertaintyCriteriaApiService.ts` | `fetchUncertaintyCriteriaList()` は引数なし。`nameSpaceId` をクエリパラメータとして付与できない |
| **バック** `findAllByOrganization.sql` | `WHERE organization_id = $1` のみ（全件取得）。`name_space_id` フィルタが存在しない |
| **バック** Controller / Service / Repository | `nameSpaceId` クエリパラメータを受け取る処理が存在しない |

### キー対応関係（調査で確定）

```
selectedNsKey (フロント)
  = namespace.scope_key         ← organization_group_cd または userId
        ↓ (namespace テーブルで解決)
  namespace.namespace_id
  = uncertainty_criteria.name_space_id   ← フィルタに使う値
```

既存の `GET /api/v1/namespaces?scopeKey={key}` API（`namespaceApiService.ts`）で
`scope_key → namespace_id` の変換が可能。

---

## 実装ステップ

### Phase 1: バックエンド — SQL 修正
- [ ] `findAllByOrganization.sql`：`$2::text IS NULL OR uc.name_space_id = $2` の条件を追加

### Phase 2: バックエンド — Repository 修正
- [ ] `uncertaintyCriteriaRepository.ts`：`findAllByOrganization(organizationId, nameSpaceId?: string | null)` に引数追加
- [ ] SQL に `nameSpaceId ?? null` を第2引数として渡す

### Phase 3: バックエンド — Service 修正
- [ ] `uncertaintyCriteriaService.ts`：`getList(organizationId, nameSpaceId?: string | null)` に引数追加

### Phase 4: バックエンド — Controller / Route 修正
- [ ] `uncertaintyCriteriaController.ts`：`req.query.nameSpaceId` を受け取りサービスに渡す
- [ ] `uncertaintyCriteriaRoutes.ts`：`query('nameSpaceId').optional().isString()` バリデーション追加

### Phase 5: フロントエンド — API サービス修正
- [ ] `uncertaintyCriteriaApiService.ts`：`fetchUncertaintyCriteriaList(nameSpaceId?: string)` に引数追加
- [ ] クエリパラメータとして `{ params: { nameSpaceId } }` を付与
- [ ] `UncertaintyTemplate.scope` に `row.nameSpaceId` をマッピング（現在 `''` 固定）

### Phase 6: フロントエンド — UncertaintyManagement 修正
- [ ] `resolveNameSpaceId(selectedNsKey)` ユーティリティ関数を追加
  - `'global'` / `'ns-maiml'` / `'ns-xsi'` / `'personal'` / `'company'` → `null`（全件）
  - `'personal-{userId}'` → `userId` を `scopeKey` として `getNamespaceList` で `namespace_id` を取得
  - `organization_group_cd`（組織ツリーのリーフ） → `scopeKey` として `getNamespaceList` で `namespace_id` を取得
  - 解決できない場合 → `null`（全件表示・安全側）
- [ ] `useEffect` の依存配列に `selectedNsKey` を追加し、変更のたびに `fetchUncertaintyCriteriaList` を再呼び出し
- [ ] 新規作成・保存後の再取得も `selectedNsKey` 連動に修正

---

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` | `nameSpaceId` オプションフィルタ追加（`$2` パラメータ） |
| 2 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | `findAllByOrganization` に `nameSpaceId?` 引数追加 |
| 3 | `backend/src/services/uncertaintyCriteriaService.ts` | `getList` に `nameSpaceId?` 引数追加 |
| 4 | `backend/src/controllers/uncertaintyCriteriaController.ts` | `req.query.nameSpaceId` を受け取りサービスへ渡す |
| 5 | `backend/src/routes/uncertaintyCriteriaRoutes.ts` | `nameSpaceId` オプショナルバリデーション追加 |
| 6 | `frontend/src/services/uncertaintyCriteriaApiService.ts` | `fetchUncertaintyCriteriaList` に `nameSpaceId?` 引数追加、`scope` フィールドマッピング修正 |
| 7 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | `resolveNameSpaceId` 追加・`useEffect` 依存修正・再取得処理修正 |

---

## 影響範囲

- `uncertainty_criteria` 一覧取得 API（`GET /api/v1/uncertainty-criteria`）の動作変更
  - `nameSpaceId` パラメータなし → 従来通り全件取得（後方互換性あり）
  - `nameSpaceId` パラメータあり → 指定スコープのみ絞り込み
- `fetchUncertaintyCriteriaList()` の呼び出し元（引数なし）は動作変更なし（後方互換性あり）

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `selectedNsKey` が `namespace.scope_key` に存在しない場合 | 低 | `namespace_id` が取得できない → `null` として全件表示（安全側） |
| `resolveNameSpaceId` の非同期処理中に再度 `selectedNsKey` が変わる | 低 | `useEffect` のクリーンアップでキャンセルフラグを立てて多重実行を防ぐ |
| `findAllByOrganization.sql` に `$2` を追加することによる既存テスト影響 | 低 | バックエンドテストを確認・修正 |

---

## テスト計画

- [ ] `selectedNsKey` が組織ツリーのリーフノードのとき、そのノードに紐づくレコードのみ表示される
- [ ] `selectedNsKey` が `'company'`（会社ルート）のとき、全件表示される
- [ ] `selectedNsKey` が `null`（未選択）のとき、全件表示される
- [ ] ノードを切り替えると一覧が自動更新される
- [ ] 新規作成・保存後に一覧が再取得される（選択スコープが維持される）
- [ ] `nameSpaceId` なしの API 呼び出しは従来通り全件返す（後方互換）

---

## 承認記録
- **計画書提示日時**: 2026-09-03 10:00
- **承認日時**: 2026-09-03 10:00
- **承認者コメント**: 承認します

## 実施記録

### 実施日時
開始: 2026-09-03 10:00
完了: 2026-09-03 10:30

### 計画からの変更点
- `nameSpaceId` クエリパラメータ方式から `scopeKey` クエリパラメータ方式に変更
  - フロントエンドは `selectedNsKey`（= `scope_key`）をそのまま渡せる
  - バックエンドの Controller が `findNamespaceIdByScopeKey` で `namespace_id` に変換してから絞り込む
  - フロントエンドで変換処理を持つ必要がなくなりシンプルな実装になった

### 最終的な成果物
- [x] `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` — `$2` フィルタ条件追加
- [x] `backend/src/repositories/uncertaintyCriteriaRepository.ts` — `findAllByOrganization` に `nameSpaceId?` 引数追加
- [x] `backend/src/services/uncertaintyCriteriaService.ts` — `getList` に `nameSpaceId?` 引数追加
- [x] `backend/src/controllers/uncertaintyCriteriaController.ts` — `scopeKey` 受取・`findNamespaceIdByScopeKey` で変換
- [x] `backend/src/routes/uncertaintyCriteriaRoutes.ts` — `scopeKey` バリデーション追加
- [x] `frontend/src/services/uncertaintyCriteriaApiService.ts` — `fetchUncertaintyCriteriaList(scopeKey?)` 引数追加・`scope` フィールドマッピング修正
- [x] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` — `resolveScopeKey` 追加・`useEffect` 依存修正・再取得処理修正

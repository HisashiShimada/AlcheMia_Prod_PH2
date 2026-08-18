# タスク計画書: 不確かさ基準管理画面 スコープ列実装

## メタデータ
- **作成日時**: 2026-07-15 17:05
- **タスクID**: 不確かさ基準スコープ列実装
- **優先度**: 中
- **推定工数**: 4時間

## タスク概要

不確かさ基準管理画面の「スコープ列」を `namespace` テーブル（新規作成予定）と連携して実装する。
現在スコープ列は常に `—` 表示となっているが、`namespace.scope_key` の表示名を表示するよう変更する。
また、左ペインの名前空間ツリー選択と不確かさ基準一覧を連動させ、選択スコープに絞り込んだ表示・追加・編集を可能にする。

## 前提条件

- `namespace` テーブルが作成済みであること（DDL: `docs/design/db/ddl/namespace.sql`）
- テーブル作成後に本タスクの実装を開始する

---

## 確定仕様

### スコープ列の表示
- `uncertainty_criteria` と `namespace` を `organization_id + name_space_id` でJOIN
- `namespace.scope_key` に対応する **表示名のみ** を表示（例：「研究開発部」）
- 階層パス（`›` 区切り等）は使用しない

### 左ペインとの連動
- 左ペインでノードを選択すると、そのスコープ（`name_space_id`）に紐づく不確かさ基準のみ一覧表示
- 左ペイン未選択時は全件表示（現状と同じ「すべて」）

### 新規作成
- 左ペインで選択中のスコープの `namespace_id` を `name_space_id` として自動セット
- モーダル内にスコープ入力フォームは追加しない（ユーザーは意識しない）
- 左ペイン未選択状態では「新規不確かさ基準」ボタンを非活性にする（スコープ不明のため）

### 編集
- 選択中のスコープに属する不確かさ基準の編集が可能（現状と同じ動作）
- スコープ変更は行わない

---

## 実装ステップ

### Phase 1: バックエンド — SQLクエリ修正（scope_key取得）
- [ ] `findAllByOrganization.sql` を修正：`namespace` テーブルをLEFT JOINして `scope_key` を取得
- [ ] `findByKey.sql` を修正：同上（詳細取得クエリにも `scope_key` を追加）

### Phase 2: バックエンド — API レスポンスに scope_key を追加
- [ ] `uncertaintyCriteriaRepository.ts` の型定義に `scopeKey` フィールドを追加
- [ ] `uncertaintyCriteriaController.ts` のレスポンスに `scopeKey` を含める

### Phase 3: バックエンド — スコープフィルタ対応
- [ ] 一覧取得API（`GET /uncertainty-criteria`）にクエリパラメータ `nameSpaceId` を追加
- [ ] `nameSpaceId` が指定された場合、そのスコープのみ絞り込む

### Phase 4: フロントエンド — 型定義・APIサービス修正
- [ ] `uncertaintyCriteriaApiService.ts`：`UncertaintyCriteriaApiRow` に `scopeKey` を追加
- [ ] `fetchUncertaintyCriteriaList()` に `nameSpaceId?` パラメータを追加
- [ ] `UncertaintyTemplate` 型の `scope` フィールドに `scopeKey` をマッピング

### Phase 5: フロントエンド — 一覧テーブルのスコープ列表示修正
- [ ] `UncertaintyListTable.tsx`：スコープ列の表示を `scope_key` の表示名のみ（Tagなし、テキスト）に変更
- [ ] `" › "` 区切り分割ロジックを削除

### Phase 6: フロントエンド — 左ペイン連動
- [ ] `UncertaintyManagement.tsx`：`selectedNsKey` 変更時に不確かさ基準一覧を再取得
- [ ] 左ペイン選択ノードから `nameSpaceId` を解決するユーティリティを実装
- [ ] `UncertaintyListTable` に `selectedNsKey` でフィルタをかける（またはAPIパラメータで絞り込み）
- [ ] 左ペイン未選択時は `nameSpaceId` なしで全件取得

### Phase 7: フロントエンド — 新規作成ボタン制御
- [ ] `UncertaintyManagement.tsx`：左ペイン未選択時は「新規不確かさ基準」ボタンを `disabled`
- [ ] `UncertaintyCreateModal` に `defaultNameSpaceId` プロパティを追加
- [ ] 新規作成保存時に `defaultNameSpaceId` を `nameSpaceId` として送信

### Phase 8: 単体テスト
- [ ] バックエンド：`findAllByOrganization.sql` のJOIN結果テスト（`nameSpaceId` フィルタあり・なし）
- [ ] フロントエンド：左ペイン選択時に一覧フィルタが動作することの確認
- [ ] フロントエンド：左ペイン未選択時に新規作成ボタンが非活性になることの確認

---

## 変更ファイル一覧

### バックエンド（修正）
1. `backend/src/sql/queries/uncertainty_criteria/findAllByOrganization.sql` — namespaceとJOINしてscope_key取得、nameSpaceIdフィルタ追加
2. `backend/src/sql/queries/uncertainty_criteria/findByKey.sql` — namespaceとJOINしてscope_key取得
3. `backend/src/repositories/uncertaintyCriteriaRepository.ts` — scopeKeyフィールド追加
4. `backend/src/controllers/uncertaintyCriteriaController.ts` — レスポンスにscopeKey含める、nameSpaceIdクエリパラメータ対応

### フロントエンド（修正）
5. `frontend/src/services/uncertaintyCriteriaApiService.ts` — scopeKeyフィールド追加、nameSpaceIdパラメータ追加
6. `frontend/src/components/uncertainty/UncertaintyListTable.tsx` — スコープ列表示ロジック修正
7. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` — 左ペイン連動・ボタン制御
8. `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` — defaultNameSpaceId props追加・保存時にセット

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `namespace` テーブル未作成時に一覧取得がエラーになる | 高 | LEFT JOINを使用し、namespaceがなくてもscopeKey=nullで取得可能にする |
| 左ペインのキー（`rd-analysis`等）とDB上の`namespace_id`の対応が不明 | 中 | `namespace.namespace_id` カラムの値をモックJSONと合わせて確認する |
| 新規作成時にスコープ未選択でボタン操作された場合 | 低 | ボタン非活性化で防止 |

---

## テスト計画

### 手動テスト
- [ ] 左ペインで「解析チーム」を選択 → 解析チームに紐づく不確かさ基準のみ表示される
- [ ] 左ペイン未選択 → 全件表示、新規作成ボタン非活性
- [ ] 左ペインでノード選択 → 新規作成ボタン活性、モーダル保存時に対象nameSpaceIdでDBに登録される
- [ ] スコープ列：`namespace.scope_key` の表示名が正しく表示される（例：「解析チーム」）
- [ ] スコープ列：namespaceが紐づかない場合は `—` 表示

---

## 承認記録
- **計画書提示日時**: 2026-07-15 17:05
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーフィードバック）

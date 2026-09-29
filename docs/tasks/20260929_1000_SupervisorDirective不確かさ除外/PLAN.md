# タスク計画書: SupervisorDirective 不確かさ基準・Key の選択候補除外

## メタデータ
- **作成日時**: 2026-09-29 17:52
- **タスクID**: 20260929_1000_SupervisorDirective不確かさ除外
- **優先度**: 中
- **推定工数**: 0.5 時間

---

## 1. タスク概要

不確かさ基準選択モーダル（`UncertaintyCriteriaSelectorModal`）に表示される不確かさ基準候補、
および不確かさ基準新規作成モーダル（`UncertaintyCreateModal`）の Key 選択プルダウンから、
`uncertainty_key` の localName 部分（`prefix:localName` のコロン後）もしくは `namespace_term.local_name` が
`SupervisorDirective` で始まるものを除外する。

---

## 2. 目的と期待される成果

- [ ] 不確かさ基準選択モーダルに `SupervisorDirective` 始まりの不確かさ基準が表示されない
- [ ] 不確かさ基準新規作成モーダルの Key 選択プルダウンに `SupervisorDirective` 始まりの用語が表示されない
- [ ] 通常の不確かさ基準・用語は引き続き正常に表示される
- [ ] ビルドエラーが発生しない

---

## 3. 原因調査

### ① 不確かさ基準選択モーダル（スクリーンショット上段）

```
[UncertaintyCriteriaSelectorModal]
  └─ fetchUncertaintyCriteriaForSelector()          ← フロントエンド サービス関数
       └─ GET /api/v1/uncertainty-criteria/for-selector
            └─ uncertaintyCriteriaController.getForSelector()
                 └─ uncertaintyCriteriaService.getForSelector()
                      └─ uncertaintyCriteriaRepository.findForSelector()
                           └─ findForSelector.sql
                                （SupervisorDirective 除外条件なし → 全件返却） ❌
```

`findForSelector.sql` の WHERE 句には `is_Invalid = FALSE` の条件しかなく、
`uncertainty_key` が `Uncertainty1:SupervisorDirectiveUncTest2` のような
SupervisorDirective 系の基準も返却されてしまう。

### ② 不確かさ基準新規作成モーダルの Key 選択プルダウン（スクリーンショット下段）

```
[UncertaintyCreateModal]
  └─ getTermsForPropertyDialog(organizationGroupCd) / getTerms()
       └─ GET /api/v1/namespaces/terms
            └─ namespace_term テーブル（SupervisorDirective 系 local_name を含む）
  └─ keyOptions useMemo
       └─ .filter((t) => t.isActive !== false)  ← isActive のみフィルタ
            （SupervisorDirective 除外なし） ❌
```

`namespace_term` には `local_name` が `SupervisorDirectivegroup3Aterm` や
`SupervisorDirectivetestDup1` などの指示用語が存在するが、
`keyOptions` の useMemo では `isActive` チェックのみでフィルタリングしていない。

---

## 4. 実装内容

### 変更ファイル一覧

| # | ファイル | 変更種別 | 変更概要 |
|---|---------|---------|---------|
| 1 | `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` | 変更 | WHERE 句に `SPLIT_PART(uc.uncertainty_key, ':', 2) NOT LIKE 'SupervisorDirective%'` を追加 |
| 2 | `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` | 変更 | `keyOptions` の useMemo フィルタに `!t.localName.startsWith('SupervisorDirective')` を追加 |

### 変更1: `findForSelector.sql`

```sql
-- 追加する WHERE 条件
AND SPLIT_PART(uc.uncertainty_key, ':', 2) NOT LIKE 'SupervisorDirective%'
```

`uncertainty_key` は `prefix:localName` 形式のため、`SPLIT_PART(..., ':', 2)` で localName 部分を取り出し、
`SupervisorDirective` で始まるものを除外する。

### 変更2: `UncertaintyCreateModal.tsx`

```tsx
// 変更前
.filter((t) => t.isActive !== false)

// 変更後
.filter((t) => t.isActive !== false && !t.localName.startsWith('SupervisorDirective'))
```

---

## 5. 機能フロー図（修正前 → 修正後）

### 修正前

```
【不確かさ基準選択モーダル】
  UncertaintyCriteriaSelectorModal
    │
    ▼
  fetchUncertaintyCriteriaForSelector()
    │
    ▼
  GET /api/v1/uncertainty-criteria/for-selector
    │
    ▼
  findForSelector.sql
    WHERE is_Invalid = FALSE
    （SupervisorDirective 除外なし）
    │
    ▼
  レスポンス: [あああ, 新規 不確かさ基準 作成２(SupervisorDirective含), 新規基準１, ...]
    │
    ▼
  モーダル表示: SupervisorDirective基準も表示される ❌

【新規作成モーダルの Key 選択】
  UncertaintyCreateModal
    │
    ▼
  getTermsForPropertyDialog() → GET /api/v1/namespaces/terms
    │
    ▼
  keyOptions useMemo
    .filter(t => t.isActive !== false)
    （SupervisorDirective 除外なし）
    │
    ▼
  プルダウン: SupervisorDirective系用語も表示される ❌
```

### 修正後

```
【不確かさ基準選択モーダル】
  UncertaintyCriteriaSelectorModal
    │
    ▼
  fetchUncertaintyCriteriaForSelector()
    │
    ▼
  GET /api/v1/uncertainty-criteria/for-selector
    │
    ▼
  findForSelector.sql
    WHERE is_Invalid = FALSE
      AND SPLIT_PART(uc.uncertainty_key, ':', 2) NOT LIKE 'SupervisorDirective%'  ← 追加
    │
    ▼
  レスポンス: [あああ, 新規基準１, ...]（SupervisorDirective 除外済み）
    │
    ▼
  モーダル表示: SupervisorDirective基準は表示されない ✅

【新規作成モーダルの Key 選択】
  UncertaintyCreateModal
    │
    ▼
  getTermsForPropertyDialog() → GET /api/v1/namespaces/terms
    │
    ▼
  keyOptions useMemo
    .filter(t => t.isActive !== false && !t.localName.startsWith('SupervisorDirective'))  ← 追加
    │
    ▼
  プルダウン: SupervisorDirective系用語は表示されない ✅
```

---

## 6. 影響範囲

- `findForSelector.sql` は `GET /api/v1/uncertainty-criteria/for-selector` 専用。他のエンドポイントには影響しない。
- `keyOptions` の変更は `UncertaintyCreateModal.tsx` 内のみ。他コンポーネントには影響しない。
- `findAllByOrganization.sql` 等（管理画面一覧）は変更しないため、管理者の一覧画面には引き続きすべての基準が表示される。

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `findForSelector.sql` 修正が他呼び出し元に影響 | 低 | 低 | このSQLはセレクター専用エンドポイントのみが使用 |
| `keyOptions` フィルタの localName が空文字列の場合 | 低 | 低 | `startsWith('')` は常に true だが SupervisorDirective 始まりでなければ除外されない（問題なし） |

## 8. テスト計画

### 手動テスト
- [ ] テンプレート編集から不確かさ選択モーダルを開き、`SupervisorDirective` 系基準が表示されないこと
- [ ] 不確かさ選択モーダルの通常の不確かさ基準（SupervisorDirective でない）は表示されること
- [ ] 不確かさ基準新規作成モーダルの Key 選択プルダウンで `SupervisorDirective` 系用語が表示されないこと
- [ ] ビルドエラー（フロントエンド・バックエンド）が発生しないこと

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-29 17:52
- **承認日時**: 2026-09-29（ユーザー承認済み）

---

## 10. 実施記録

### 実施日時
開始: 2026-09-29 17:52
完了: 2026-09-29 17:58

### 最終的な成果物
- [x] `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` 修正完了
- [x] `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` 修正完了

### バックエンド TypeScript チェック
- exit code 0（エラーなし）

### フロントエンド TypeScript チェック
- exit code 0（エラーなし）

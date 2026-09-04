# タスク計画書: 新規プロパティ追加ダイアログ スコープ絞り込み実装

## メタデータ
- **作成日時**: 2026-09-02 14:17
- **タスクID**: 新規プロパティ追加ダイアログ_スコープ絞り込み実装
- **優先度**: 中
- **推定工数**: 3〜5時間

---

## 1. タスク概要

テンプレート編集画面の「新規プロパティ追加」ダイアログにおいて、
キーの選択肢として表示される用語を以下のスコープに絞り込む。

- **そのプロジェクトが属するグループスコープ**の用語
- **そのプロジェクトが属するグループに紐づく上位グループスコープ**の用語
- **ログインユーザの個人スコープ**の用語

加えて、上記スコープ取得に使用する `findAllByScopeKeyWithAncestors.sql` に
`has_directive_term` 列が欠落しているため、あわせて追加する。

---

## 2. 現状の問題

| # | 問題 | 場所 |
|---|------|------|
| 1 | 用語取得が組織全件（スコープ無視） | `getAllTermsAsMap()` → `getTerms()`（引数なし） |
| 2 | `findAllByScopeKeyWithAncestors.sql` に `has_directive_term` 列がない | バックエンドSQL |
| 3 | `displayName` が空の用語がプルダウンに表示されない | `TemplateEditorDialog.tsx` L2160 |

---

## 3. 実装ステップ

### Phase 1: バックエンドSQL修正
- [ ] `findAllByScopeKeyWithAncestors.sql` に `t.has_directive_term AS "hasDirectiveTerm"` を追加

### Phase 2: フロントエンド サービス層
- [ ] `namespaceApiService.ts` に `getTermsForPropertyDialog(organizationGroupCd?: string)` 関数を追加
  - `organizationGroupCd` が指定されている場合: `getTerms({ scopeKey: organizationGroupCd, withAncestors: true })` でグループ＋上位グループの用語を取得
  - `localStorage.userInfo.id`（userId）で個人スコープの用語を取得: `getTerms({ scopeKey: userId })`
  - 両結果をマージして `Map<qname, NamespaceTermRow>` を返す
  - `organizationGroupCd` が未指定の場合は個人スコープのみ返す（フォールバック）

### Phase 3: 型定義追加
- [ ] `types/maimlEditor.ts` の `MaimlEditorParams` に `organizationGroupCd?: string` を追加

### Phase 4: フロントエンド Props の伝搬
- [ ] `hooks/project/useProjectMaimlEditor.ts` の `buildEditorParams` で `project.organizationGroup` を `organizationGroupCd` として `MaimlEditorParams` に含める
- [ ] `components/editorv2/PetriNetEditorScreen.tsx` で `params.organizationGroupCd` を `PetriNetEditorInner` に渡す
- [ ] `components/editorv2/PetriNetEditorInner.tsx` の `PetriNetEditorInnerProps` に `organizationGroupCd?: string` を追加し、`TemplateEditorDialog` に渡す
- [ ] `components/editorv2/TemplateEditorDialog.tsx` の Props に `organizationGroupCd?: string` を追加

### Phase 5: TemplateEditorDialog 用語取得ロジック変更
- [ ] open 時の `getAllTermsAsMap()` 呼び出しを `getTermsForPropertyDialog(organizationGroupCd)` に変更
- [ ] `hasDirectiveTerm === true` フィルタ（L628-630）はそのまま維持
- [ ] `displayName` 空フィルタ（L2160）を削除し、`displayName` がある場合のみ太字表示、ない場合は `qname` のみ表示するよう Option のレンダリングを修正

---

## 4. 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/sql/queries/namespace_terms/findAllByScopeKeyWithAncestors.sql` | `has_directive_term` 列を追加 |
| 2 | `frontend/src/services/namespaceApiService.ts` | `getTermsForPropertyDialog` 関数を追加 |
| 3 | `frontend/src/types/maimlEditor.ts` | `MaimlEditorParams` に `organizationGroupCd?: string` を追加 |
| 4 | `frontend/src/hooks/project/useProjectMaimlEditor.ts` | `buildEditorParams` に `organizationGroupCd` を追加 |
| 5 | `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` | `organizationGroupCd` を `PetriNetEditorInner` に渡す |
| 6 | `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | Props 追加・`TemplateEditorDialog` に渡す |
| 7 | `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | 用語取得ロジック変更・Option レンダリング修正 |

---

## 5. 影響範囲

- テンプレート編集ダイアログ（プロジェクト管理画面）のみ影響
- フォーマット管理画面からテンプレートを開く場合は `organizationGroupCd` が未指定となるため、個人スコープのみの用語表示にフォールバック

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `organizationGroupCd` が `undefined` の場合に用語が少なくなる | 低 | 低 | 個人スコープのみにフォールバック |
| `findAllByScopeKeyWithAncestors.sql` 変更により既存の名前空間ツリー表示に影響 | 低 | 低 | このSQLはツリー用途にも使用されているため動作確認を実施 |

---

## 7. テスト計画

### 手動テスト
- [ ] ユーザ004でログインし、個人スコープに `exam:Sample`（`has_directive_term=true`, `display_name`あり）を登録
- [ ] 新規プロジェクト（グループ所属あり）を作成・テンプレート編集画面を開く
- [ ] 「新規プロパティ追加」ダイアログを開き、`exam:Sample` が選択肢に表示されることを確認
- [ ] グループスコープの用語も選択肢に表示されることを確認
- [ ] 上位グループスコープの用語も選択肢に表示されることを確認
- [ ] `displayName` が未設定の用語が `qname` のみで表示されることを確認
- [ ] フォーマット管理画面からテンプレートを開いた場合も正常動作することを確認

---

## 8. ロールバック計画

各ファイルの変更は独立しているため、問題発生時は変更ファイルを元に戻すことで即時ロールバック可能。

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-02 14:17
- **承認日時**: 2026-09-02 14:17
- **承認者コメント**: 承認済み

## 11. 実施記録

### 実施日時
開始: 2026-09-02 14:17
完了: 2026-09-02 14:43

### 実施チェックリスト
- [x] Phase 1: `findAllByScopeKeyWithAncestors.sql` に `has_directive_term` 列追加
- [x] Phase 2: `namespaceApiService.ts` に `getTermsForPropertyDialog` 関数追加
- [x] Phase 3: `types/maimlEditor.ts` の `MaimlEditorParams` に `organizationGroupCd` 追加
- [x] Phase 4-1: `useProjectMaimlEditor.ts` の `buildEditorParams` に `organizationGroupCd` 追加
- [x] Phase 4-2: `PetriNetEditorScreen.tsx` に `organizationGroupCd` 受け取り・渡し処理追加
- [x] Phase 4-3: `PetriNetEditorInner.tsx` に `organizationGroupCd` Props 追加・TemplateEditorDialog に渡す
- [x] Phase 4-4: `TemplateEditorDialog.tsx` に Props `organizationGroupCd` 追加
- [x] Phase 5: `TemplateEditorDialog.tsx` 用語取得を `getTermsForPropertyDialog` に変更・Option レンダリング修正

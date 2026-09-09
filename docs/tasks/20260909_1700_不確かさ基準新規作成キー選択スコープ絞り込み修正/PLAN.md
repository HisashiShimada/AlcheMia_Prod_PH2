# タスク計画書: 不確かさ基準新規作成 — Key属性設定スコープ絞り込み修正

## メタデータ

- **作成日時**: 2026-09-09 17:00
- **タスクID**: uncertainty-create-key-scope-filter
- **優先度**: 高
- **推定工数**: 2.0 時間

---

## 1. タスク概要

テンプレート不確かさ基準選択ダイアログ（`UncertaintyCriteriaSelectorModal`）から
「新規評価基準を作成」を押下して開く `UncertaintyCreateModal` の
**Key属性設定プルダウン**に、関係のないスコープの用語キーが表示される不具合を修正する。

---

## 2. 根本原因

`UncertaintyCriteriaSelectorModal` / `UncertaintyCriteriaSelectorPanel` から
`UncertaintyCreateModal` を開く際、`selectedNsKey` / `organizationGroupCd` を渡していない。
そのため `getTerms(undefined)` が呼ばれ、組織内全スコープの用語が全件表示される。

### 表示すべきスコープの要件

1. ログインユーザの個人スコープ
2. プロジェクト作成先グループのスコープ
3. プロジェクト作成先グループに紐づく親グループのスコープ

→ 既存の `getTermsForPropertyDialog(organizationGroupCd)` 関数で対応可能。

---

## 3. 実装ステップ

### Step 1: `UncertaintyCreateModal.tsx`
- [ ] Props に `organizationGroupCd?: string | null` を追加
- [ ] import に `getTermsForPropertyDialog` を追加
- [ ] 用語取得ロジック修正: `organizationGroupCd` 優先 → `selectedNsKey` 既存ロジック → フォールバック

### Step 2: `UncertaintyCriteriaSelectorModal.tsx`
- [ ] Props に `organizationGroupCd?: string | null` を追加
- [ ] `UncertaintyCreateModal` に `organizationGroupCd` を渡す

### Step 3: `UncertaintyCriteriaSelectorPanel.tsx`
- [ ] Props に `organizationGroupCd?: string | null` を追加
- [ ] `UncertaintyCreateModal` に `organizationGroupCd` を渡す

### Step 4: `TemplateEditorDialog.tsx`
- [ ] `UncertaintyCriteriaSelectorModal` に既存 `organizationGroupCd` を渡す

### Step 5: バックエンド型修正
- [ ] `findWorkerAccessible.sql` に `organization_group_cd` を SELECT 追加
- [ ] `WorkerAccessibleProjectRow` 型に `organization_group_cd` 追加
- [ ] `WorkerAccessibleProject` 型に `organizationGroupCd` 追加
- [ ] `workerProjectService.ts` のマッピングに `organizationGroupCd` 追加

### Step 6: フロントエンド型・コンポーネント連鎖
- [ ] `WorkerProject` 型に `organizationGroupCd` 追加
- [ ] `projectApiService.ts` のレスポンスマッピングに追加
- [ ] `WorkRecordPanel.tsx` に `organizationGroupCd` props 追加・Panel への伝達
- [ ] `ExperimentWorkerMenu.tsx` から `WorkRecordPanel` へ伝達

---

## 4. 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` | `organizationGroupCd` props 追加・用語取得ロジック修正 |
| 2 | `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` | `organizationGroupCd` props 追加・伝達 |
| 3 | `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx` | `organizationGroupCd` props 追加・伝達 |
| 4 | `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | `UncertaintyCriteriaSelectorModal` への伝達 |
| 5 | `backend/src/sql/queries/projects/findWorkerAccessible.sql` | `organization_group_cd` を SELECT 追加 |
| 6 | `backend/src/repositories/workerProjectRepository.ts` | 型に `organization_group_cd` 追加 |
| 7 | `backend/src/types/workerProject.ts` | 型に `organizationGroupCd` 追加 |
| 8 | `backend/src/services/workerProjectService.ts` | マッピングに `organizationGroupCd` 追加 |
| 9 | `frontend/src/types/project.ts` | `WorkerProject` 型に `organizationGroupCd` 追加 |
| 10 | `frontend/src/services/projectApiService.ts` | レスポンスマッピングに追加 |
| 11 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | props 追加・Panel への伝達 |
| 12 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `WorkRecordPanel` への伝達 |

---

## 5. リスクと対策

| リスク | 対策 |
|---|---|
| `organizationGroupCd` 未渡し時のフォールバック | `getTermsForPropertyDialog(undefined)` で個人スコープのみ取得 |
| 既存呼び出し元への影響 | 全て `optional` フィールドのため影響なし |
| SQL変更による既存テスト失敗 | SELECT カラム追加のみ（WHERE 変更なし）のため影響なし |

---

## 6. 承認記録

- **計画書提示日時**: 2026-09-09 17:00
- **承認日時**: 2026-09-09（act モードへの切り替えにより承認済み）

---

## 7. 実施記録

### 実施日時

開始: 2026-09-09  
完了: 2026-09-09

### 計画からの変更点

- `UncertaintyCriteriaSelectorPanel` は現在どのコンポーネントからもインポートされていないことが判明。
  `WorkRecordPanel.tsx` には直接組み込まれておらず、Props 追加（Step 6-3）のみ実施。

### 最終的な成果物

- [x] Step 1: `UncertaintyCreateModal.tsx` — `organizationGroupCd` props 追加・`getTermsForPropertyDialog` 利用に変更
- [x] Step 2: `UncertaintyCriteriaSelectorModal.tsx` — `organizationGroupCd` props 追加・`UncertaintyCreateModal` へ伝達
- [x] Step 3: `UncertaintyCriteriaSelectorPanel.tsx` — `organizationGroupCd` props 追加・`UncertaintyCreateModal` へ伝達
- [x] Step 4: `TemplateEditorDialog.tsx` — `UncertaintyCriteriaSelectorModal` への `organizationGroupCd` 伝達
- [x] Step 5: バックエンド SQL・型修正（`findWorkerAccessible.sql` / `workerProjectRepository.ts` / `workerProject.ts` / `workerProjectService.ts`）
- [x] Step 6: フロントエンド `WorkerProject` 型（`project.ts`）・`WorkRecordPanel.tsx` / `ExperimentWorkerMenu.tsx` 連鎖
- [x] TypeScript コンパイルエラーなし（フロントエンド・バックエンドとも）


# タスク計画書: i18n キー漏れ全対応

## メタデータ
- **作成日時**: 2026-08-21 14:30
- **タスクID**: 20260821_1430_i18nキー漏れ全対応
- **優先度**: 高
- **推定工数**: 2時間

---

## タスク概要

`scripts/check-i18n-keys.js` の実行結果に基づき、コンポーネントが参照している i18n キーのうち
言語ファイル（ja.json / en.json）に未定義のものをすべて追加する。
また、ja.json と en.json の間にある定義の非対称（片方のみ定義）についても整理する。

---

## チェック結果サマリ（対応前）

| カテゴリ | 件数 | 対応方針 |
|----------|------|----------|
| 【1】MISSING_BOTH（ja & en 両方未定義） | 8 件 | ja.json + en.json 両方に追加 |
| 【2】MISSING_JA（en にあるが ja 未定義） | 25 件 | ja.json に追加 |
| 【3】MISSING_EN（ja にあるが en 未定義） | 22 件 | en.json に追加 |
| 【4】JA_ONLY（ja にあって en に無い・コンポーネント未使用） | 102 件 | 対応不要（未使用キーの整理は別タスク） |
| 【5】EN_ONLY（en にあって ja に無い・コンポーネント未使用） | 336 件 | 対応不要（未使用キーの整理は別タスク） |
| 【6】ハードコード | 0 件 | 対応不要 |

> **注意**: 【4】【5】はコンポーネントで使用されていないキーの言語間非対称であり、  
> 今回はコンポーネントが使っているキーの欠損修正（【1】〜【3】の 55 件）のみを対応範囲とする。  
> 未使用キーの整理は別タスクで対応する。

---

## 対応内容詳細

### 【1】MISSING_BOTH — ja.json + en.json 両方に追加（8 件）

各キーの文脈をコンポーネントから確認し、適切な日本語・英語訳を追加する。

| キー | コンポーネント | 想定内容 |
|------|--------------|---------|
| `experimentPlan.orderChangeNotAllowed` | ExperimentPlanDialog | 順序変更不可メッセージ |
| `projectCompletion.maimlQualityWriteSuccess` | ProjectCompletionDialog | MAiML品質書き込み成功メッセージ（{count}パラメータあり） |
| `projectCompletion.maimlQualityWriteWarning` | ProjectCompletionDialog | MAiML品質書き込み警告メッセージ |
| `uncertaintyCreate.descReadOnlyPlaceholder` | UncertaintyCreateModal | 説明フィールド読み取り専用プレースホルダー |
| `uncertaintyCreate.nameReadOnlyPlaceholder` | UncertaintyCreateModal | 名前フィールド読み取り専用プレースホルダー |
| `uncertaintyCriteria.confirmModalCancel` | UncertaintyCriteriaSelectorPanel | 確認モーダルキャンセルボタン |
| `uncertaintyCriteria.confirmModalOk` | UncertaintyCriteriaSelectorPanel | 確認モーダルOKボタン |
| `uncertaintyCriteria.confirmModalTitle` | UncertaintyCriteriaSelectorPanel | 確認モーダルタイトル |

### 【2】MISSING_JA — ja.json に追加（25 件）

en.json に既存の英語値を参考に日本語訳を追加する。

**namespaceMain（2件）**
- `namespaceMain.systemNamespaceBadge`
- `namespaceMain.systemNamespaceTooltip`

**prefixManagement（2件）**
- `prefixManagement.systemNamespaceBadge`
- `prefixManagement.systemNamespaceTooltip`

**teamAddDialog（3件）**
- `teamAddDialog.isActiveLabel`
- `teamAddDialog.isActiveOptionActive`
- `teamAddDialog.isActiveOptionInactive`

**teamEditDialog（3件）**
- `teamEditDialog.isActiveLabel`
- `teamEditDialog.isActiveOptionActive`
- `teamEditDialog.isActiveOptionInactive`

**teamManagement（15件）**
- `teamManagement.activateBtn`
- `teamManagement.activateConfirmDesc`
- `teamManagement.activateConfirmTitle`
- `teamManagement.activateOk`
- `teamManagement.activateSuccess`
- `teamManagement.deactivateBtn`
- `teamManagement.deactivateConfirmDesc`
- `teamManagement.deactivateConfirmTitle`
- `teamManagement.deactivateOk`
- `teamManagement.deactivateSuccess`
- `teamManagement.inactiveLabel`
- `teamManagement.namespaceUriLabel`
- `teamManagement.statusChangeCancel`
- `teamManagement.statusChangeError`
- `teamManagement.statusChangeFailed`

### 【3】MISSING_EN — en.json に追加（22 件）

ja.json に既存の日本語値を参考に英語訳を追加する。

**evaluation（4件）**
- `evaluation.empty.noMatchingResults`
- `evaluation.empty.noResults`
- `evaluation.tabLabel`
- `evaluation.title`

**experimentPlanDialog（3件）**
- `experimentPlanDialog.all`
- `experimentPlanDialog.cannotChangeOrder`
- `experimentPlanDialog.task`

**namespaceMain（2件）**
- `namespaceMain.noPrefixTooltip`
- `namespaceMain.teamAddParentLabelDefault`

**projectCompletion（13件）**
- `projectCompletion.colComment`
- `projectCompletion.colQualitative`
- `projectCompletion.colTarget`
- `projectCompletion.commentPlaceholder`
- `projectCompletion.completeButton`
- `projectCompletion.completeFailed`
- `projectCompletion.criteriaLabel`
- `projectCompletion.criteriaPlaceholder`
- `projectCompletion.description`
- `projectCompletion.entireProject`
- `projectCompletion.noEvalTarget`
- `projectCompletion.saveNote`
- `projectCompletion.unevaluated`

---

## 実装ステップ

- [ ] Step 1: en.json の `namespaceMain` / `prefixManagement` セクションから `systemNamespaceBadge` / `systemNamespaceTooltip` を確認して ja.json に追加
- [ ] Step 2: en.json の `teamManagement` / `teamAddDialog` / `teamEditDialog` セクションから漏れキーを確認して ja.json に追加（21件）
- [ ] Step 3: ja.json の `experimentPlan` / `experimentPlanDialog` を確認して en.json の `experimentPlanDialog` セクションを追加
- [ ] Step 4: ja.json の `evaluation` セクションを確認して en.json の不足キーを追加（4件）
- [ ] Step 5: ja.json の `projectCompletion` セクションを確認して en.json の不足キーを追加（13件）
- [ ] Step 6: ja.json + en.json 両方に MISSING_BOTH の 8 件を追加
- [ ] Step 7: `node scripts/check-i18n-keys.js` を再実行してすべての MISSING_BOTH / MISSING_JA / MISSING_EN が 0 件になることを確認

---

## 変更ファイル

1. `frontend/src/locales/ja.json` — 【1】8件 + 【2】25件 = **33件追加**
2. `frontend/src/locales/en.json` — 【1】8件 + 【3】22件 = **30件追加**

---

## リスク

| リスク | 対策 |
|--------|------|
| JSON構文エラー（カンマ・括弧ミス） | 各編集後に `node -e "JSON.parse(...)"` で構文チェック |
| キーの重複追加 | 追加前に grep で既存確認 |
| 翻訳が不適切 | en.json の既存値・ja.json の既存値を参考に統一感を保つ |

---

## テスト計画

- [ ] `node scripts/check-i18n-keys.js` 再実行 → MISSING_BOTH / MISSING_JA / MISSING_EN が全て 0 件
- [ ] `node -e "require('./frontend/src/locales/ja.json')"` で JSON 構文確認
- [ ] `node -e "require('./frontend/src/locales/en.json')"` で JSON 構文確認

---

## 承認記録
- **計画書提示日時**: 2026-08-21 14:30
- **承認日時**: 2026-08-21 14:30
- **承認者コメント**: 承認します

## 11. 実施記録

### 実施日時
開始: 2026-08-21 14:30
完了: 2026-08-21 14:11

### 最終的な成果物
- [x] ja.json — 33 件追加（namespaceMain +2, prefixManagement +2, teamAddDialog +4, teamEditDialog +3, teamManagement +15, uncertaintyCriteria +3, uncertaintyCreate +2, experimentPlan +1, projectCompletion +2）
- [x] en.json — 30 件追加（evaluation +5, experimentPlan +1, experimentPlanDialog +5, namespaceMain +2, projectCompletion +15, uncertaintyCriteria +3, uncertaintyCreate +2）
- [x] `node scripts/check-i18n-keys.js` 再実行 → MISSING_BOTH: 0件 / MISSING_JA: 0件 / MISSING_EN: 0件 を確認
- [x] ja.json / en.json 構文チェック（node JSON.parse）OK

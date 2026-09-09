# タスク計画書: 不確かさ基準編集ダイアログ 有効表示 二重記号修正

## メタデータ

- **作成日時**: 2026-09-09 19:30
- **タスクID**: 20260909_1930_不確かさ基準編集ダイアログ有効表示二重記号修正
- **優先度**: 高
- **推定工数**: 0.5時間

---

## 1. タスク概要

実験管理者画面の「不確かさ基準一覧タブ」で編集ボタンを押下すると開く
`UncertaintyDetailModal`（詳細・編集ダイアログ）にて、

- ダイアログタイトルバー右端の状態表示
- 「状態」フォームフィールド内の Tag 表示
- Switch コンポーネントの `checkedChildren` / `unCheckedChildren`

のいずれにおいても **「● ● 有効」** のように記号が二重表示される不具合を修正する。

---

## 2. 原因分析

`UncertaintyDetailModal.tsx` のコンポーネント側で `●` / `○` 記号を直接ハードコードしながら、
翻訳ファイル `ja.json` / `en.json` の翻訳値にも同じ記号が含まれているため二重表示が発生している。

| 場所 | コード | 翻訳値(ja) | 実際の表示 |
|---|---|---|---|
| タイトルバー statusTag | `● {t('uncertaintyDetail.statusActive')}` | `"● 有効"` | `● ● 有効` ❌ |
| 状態フィールド Tag（有効） | `● {t('uncertaintyDetail.statusActive')}` | `"● 有効"` | `● ● 有効` ❌ |
| 状態フィールド Tag（廃止） | `○ {t('uncertaintyDetail.statusDeprecated')}` | `"○ 無効"` | `○ ○ 無効` ❌ |
| Switch checkedChildren | `t('uncertaintyDetail.statusActive')` | `"● 有効"` | Switch内 `● 有効` ❌ |
| Switch unCheckedChildren | `t('uncertaintyDetail.statusDeprecated')` | `"○ 無効"` | Switch内 `○ 無効` ❌ |

---

## 3. 修正方針

**翻訳値から記号（`●` / `○`）を除去する。**

- コンポーネント側の Tag では `● {t('...')}` と記号をハードコードしているため、翻訳値を `"有効"` のみにすることで正しく `● 有効` と表示される。
- Switch の `checkedChildren` / `unCheckedChildren` には記号不要なため、既存の専用キー `statusActiveOn` / `statusDeprecatedOff` に切り替える（記号なしの `"有効"` / `"無効"` が定義済み）。

---

## 4. 実装ステップ

- [x] 調査完了（`UncertaintyDetailModal.tsx` / `ja.json` / `en.json` の該当箇所特定）
- [ ] **STEP-1**: `frontend/src/locales/ja.json` 修正
  - `uncertaintyDetail.statusActive`: `"● 有効"` → `"有効"`
  - `uncertaintyDetail.statusDeprecated`: `"○ 無効"` → `"無効"`
- [ ] **STEP-2**: `frontend/src/locales/en.json` 修正
  - `uncertaintyDetail.statusActive`: `"● Active"` → `"Active"`
  - `uncertaintyDetail.statusDeprecated`: `"○ Deprecated"` → `"Deprecated"`
- [ ] **STEP-3**: `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` 修正
  - Switch `checkedChildren`（3箇所）: `t('uncertaintyDetail.statusActive')` → `t('uncertaintyDetail.statusActiveOn')`
  - Switch `unCheckedChildren`（3箇所）: `t('uncertaintyDetail.statusDeprecated')` → `t('uncertaintyDetail.statusDeprecatedOff')`
- [ ] **STEP-4**: 修正後の表示確認（コードレビュー）

---

## 5. 変更ファイル一覧

| # | ファイルパス | 変更種別 | 変更内容 |
|---|---|---|---|
| 1 | `frontend/src/locales/ja.json` | 修正 | `uncertaintyDetail.statusActive` / `statusDeprecated` から記号除去 |
| 2 | `frontend/src/locales/en.json` | 修正 | `uncertaintyDetail.statusActive` / `statusDeprecated` から記号除去 |
| 3 | `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` | 修正 | Switch の checkedChildren / unCheckedChildren を専用キーに変更（6箇所） |

> **新規ファイルの作成なし。**
> `statusActiveOn` / `statusDeprecatedOff` キーは `ja.json` 3921-3922行目・`en.json` 3919-3920行目に既存定義済み。

---

## 6. 影響範囲分析

- **影響あり**: `UncertaintyDetailModal`（不確かさ基準 詳細・編集ダイアログ）のタイトルバー・状態フィールド・Switch の表示
- **影響なし**: 保存ロジック・API 通信・DBデータ・他画面・他コンポーネント
- **Do Not**: UI 変更なし（表示修正のみ）、MaiML ファイルへの保存なし

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `statusActive` キーが他画面でも参照されている場合の意図しない変更 | 中 | 低 | 変更対象は `uncertaintyDetail.statusActive` のみで、他セクション（`uncertaintyList.statusActive` 等）は別キーのため影響なし |
| Switch 内の記号消去で視認性が低下 | 低 | 低 | Switch には元々テキストのみが適切（記号は Tag 側で担保） |

---

## 8. テスト計画

### 手動テスト

- [ ] 有効な不確かさ基準の編集ボタンを押下 → タイトルバーに `● 有効` が1個のみ表示されること
- [ ] 状態フィールドの Tag に `● 有効` が1個のみ表示されること
- [ ] Switch の表示が `有効` テキストのみであること（記号なし）
- [ ] Switch をオフにすると状態が `○ 無効` に変わること
- [ ] 英語環境に切り替えて同様の表示を確認すること

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-09 19:30
- **承認日時**: 2026-09-09 19:30
- **承認者コメント**: Act モードへの切り替えにより承認

---

## 10. 実施記録

### 実施日時

開始: 2026-09-09 19:30
完了: 2026-09-09 19:45

### 最終的な成果物

- [x] PLAN.md 作成
- [x] ja.json 修正（`uncertaintyDetail.statusActive`: `"● 有効"` → `"有効"`、`statusDeprecated`: `"○ 無効"` → `"無効"`）
- [x] en.json 修正（`uncertaintyDetail.statusActive`: `"● Active"` → `"Active"`、`statusDeprecated`: `"○ Deprecated"` → `"Deprecated"`）
- [x] UncertaintyDetailModal.tsx 修正（Switch checkedChildren/unCheckedChildren を statusActiveOn/statusDeprecatedOff に変更、3箇所ずつ）

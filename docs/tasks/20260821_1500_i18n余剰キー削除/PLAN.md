# タスク計画書: i18n 余剰キー削除（JA_ONLY / EN_ONLY 整理）

## メタデータ
- **作成日時**: 2026-08-21 15:00
- **タスクID**: 20260821_1500_i18n余剰キー削除
- **優先度**: 中
- **推定工数**: 2〜3時間

---

## タスク概要

`analyze-only-keys.js` による分析の結果、JA_ONLY（78件）・EN_ONLY（310件）は
**すべてコンポーネントで未使用の余剰キー**であることが確認された。

これらをそれぞれの言語ファイルから削除し、定義キー数を実使用キーに絞り込む。

---

## 分析結果

| カテゴリ | 件数 | 判定 | 対応方針 |
|----------|------|------|----------|
| JA_ONLY（ja のみ定義・コンポーネント未使用） | **78 件** | 余剰 | **ja.json から削除** |
| EN_ONLY（en のみ定義・コンポーネント未使用） | **310 件** | 余剰 | **en.json から削除** |

---

## JA_ONLY 削除対象（78件）のセクション内訳

| セクション | 削除件数 |
|-----------|---------|
| `dataRecordDialog` | 42 件（旧キー群。現在は `format.dataRecordDialog.*` に移行済み）|
| `projectCompletion` | 14 件（旧キー群。現在は別名キーに移行済み）|
| `stateRecordDialog` | 13 件（コンポーネント削除済みまたは未実装）|
| `statusUpdateSection` | 9 件（コンポーネント削除済みまたは未実装）|

## EN_ONLY 削除対象（310件）のセクション内訳

| セクション | 削除件数 |
|-----------|---------|
| `namespace.*` (main/project/team/termManagement/duplicateSuggestModal) | 49 件 |
| `workRecord.*` | 35 件 |
| `templateInputPanel.*` | 26 件 |
| `experimentInstruction.*` | 26 件 |
| `uncertaintyManagement.*` | 24 件 |
| `uncertaintyDetail.*` | 21 件 |
| `namespaceMain.*` | 20 件 |
| `uncertaintyListTable.*` | 18 件 |
| `templateEditor.*` | 18 件 |
| `uncertaintyCriteriaSelector.*` | 17 件 |
| `uncertaintyCreate.*` | 16 件 |
| `approvalWizard.*` | 16 件 |
| `prefixManagement.*` | 11 件 |
| `teamEditDialog.*` | 4 件 |
| `dataRecordDialog.*` | 4 件 |
| `evaluation.*` | 3 件 |
| `uncertaintyList.*` | 1 件 |
| `teamManagement.*` | 1 件 |

---

## 実装ステップ

- [ ] Step 1: 削除用スクリプト（`scripts/remove-only-keys.js`）を作成
  - `analyze-only-keys.js` の分析結果を元に、未使用キーをJSONから削除する
  - 削除前後でJSON構文チェックを実施
- [ ] Step 2: スクリプト実行 → ja.json から JA_ONLY 78件を削除
- [ ] Step 3: スクリプト実行 → en.json から EN_ONLY 310件を削除
- [ ] Step 4: `node scripts/check-i18n-keys.js` 再実行
  - MISSING_BOTH / MISSING_JA / MISSING_EN が 0件のまま維持されていることを確認
  - JA_ONLY / EN_ONLY が 0件になっていることを確認
- [ ] Step 5: JSON構文チェック（`JSON.parse`）

---

## 変更ファイル

1. `frontend/src/locales/ja.json` — **78 件削除**（削除後は約4225キー相当）
2. `frontend/src/locales/en.json` — **310 件削除**（削除後は約4225キー相当）
3. `scripts/remove-only-keys.js` — 新規作成（削除スクリプト）

---

## リスク

| リスク | 対策 |
|--------|------|
| 削除後に想定外の画面で翻訳が表示されなくなる | スクリプトがコンポーネント使用状況を正しく把握しているかを前提とする。削除後の check-i18n-keys.js で MISSING 0件を確認 |
| JSON 構文破損 | スクリプトによる自動削除（手動編集なし）＋ JSON.parse による構文確認 |
| 将来的な復元が必要になる | Git 管理下のため、削除前の状態はコミット前の diff で確認可能 |

---

## テスト計画

- [ ] `node scripts/check-i18n-keys.js` → MISSING_BOTH: 0 / MISSING_JA: 0 / MISSING_EN: 0 / JA_ONLY: 0 / EN_ONLY: 0
- [ ] `node -e "require('./frontend/src/locales/ja.json')"` → 構文OK
- [ ] `node -e "require('./frontend/src/locales/en.json')"` → 構文OK

---

## 承認記録
- **計画書提示日時**: 2026-08-21 15:00
- **承認日時**: 2026-08-21 15:00
- **承認者コメント**: 承認します

## 11. 実施記録

### 実施日時
開始: 2026-08-21 15:00
完了: 2026-08-21 15:16

### 最終的な成果物
- [x] `scripts/remove-only-keys.js` 作成（自動削除スクリプト）
- [x] ja.json — 78 件削除（4303 → 4225 キー）
- [x] en.json — 310 件削除（4535 → 4225 キー）
- [x] `node scripts/check-i18n-keys.js` 再実行 → 全6項目 0件を確認
  - MISSING_BOTH: 0 / MISSING_JA: 0 / MISSING_EN: 0
  - JA_ONLY: 0 / EN_ONLY: 0 / ハードコード: 0
- [x] ja.json / en.json 構文チェック（JSON.parse）OK
- [x] ja.json・en.json のキー数が 4225 件で完全一致

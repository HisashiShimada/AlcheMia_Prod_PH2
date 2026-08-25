# タスク計画書: locales重複キー削除

## メタデータ
- **作成日時**: 2026-08-13 00:00
- **タスクID**: 20260813_0000_locales重複キー削除
- **優先度**: 中
- **推定工数**: 0.5時間

---

## タスク概要

`frontend/src/locales/ja.json` と `frontend/src/locales/en.json` に、
`teamAddDialog` / `teamEditDialog` / `teamManagement` の3セクションが重複して存在する。
重複を解消し、プレースホルダーあり・情報量が多い方の値を正とした単一のブロックに整理する。

---

## 目的と期待される成果

- [ ] `ja.json` の重複3セクションを削除し、1つのブロックのみに統一する
- [ ] `en.json` の重複を解消し、各セクションが正しい値で1つのブロックのみになる
- [ ] コンポーネント（TeamAddDialog.tsx / TeamEditDialog.tsx / TeamManagementPanel.tsx）が参照するすべてのキーが欠落なく存在する

---

## 重複箇所の詳細

### ja.json

| セクション | 1つ目（採用） | 2つ目（削除） |
|---|---|---|
| `teamManagement` | 行 4562–4595 | 行 5019–5043 |
| `teamAddDialog`  | 行 4596–4626 | 行 4965–4991 |
| `teamEditDialog` | 行 4627–4661 | 行 4992–5018 |

**採用根拠（1つ目を採用）**:
- `teamManagement`: 1つ目は `inactiveLabel` / `deactivateConfirmTitle` 等コンポーネント必須キーを網羅。2つ目はこれらが欠落。
- `teamAddDialog`: 1つ目は `createSuccess` に `{name}` プレースホルダーあり、`isActiveLabel` 等のキーあり。
- `teamEditDialog`: 1つ目は `saveSuccess` に `{name}/{count}`、`saveFailed` に `{detail}` プレースホルダーあり、`isActiveLabel` 等のキーあり。

**実装内容**: `ja.json` の行 4964〜5043（`teamAddDialog`2つ目〜`teamManagement`2つ目）を削除。
前の `signature` セクション末尾のカンマを適切に維持し、`uncertaintyExport` セクションに正しく続くよう整形する。

---

### en.json

`en.json` は `teamManagement` のみ2ブロックあり、`teamAddDialog` / `teamEditDialog` は
**1ブロック内に同一キーが重複定義**されている（後の値がJSONパース時に先の値を上書きする）。

| セクション | 処置 |
|---|---|
| `teamManagement`（行4865–4898が1つ目、行4984–5008が2つ目） | 2つ目のブロック（行4984–5008）を削除 |
| `teamAddDialog`（行4899–4944、内部に重複キーあり） | ブロックを書き換えてクリーンな単一定義に整理 |
| `teamEditDialog`（行4945–4983、内部に重複キーあり） | ブロックを書き換えてクリーンな単一定義に整理 |

#### en.json `teamAddDialog` 整理後（採用値の根拠）

重複キーは後半値（プレースホルダーあり・情報量多）を採用:

| キー | 採用値 | 理由 |
|---|---|---|
| `addBtn` | `"Add"` | 後半 |
| `addMemberDuplicate` | `"This member has already been added"` | 情報量多 |
| `addMemberLoading` | `"Loading..."` | 後半 |
| `addMemberNotFound` | `"No candidates found"` | 後半 |
| `addMemberPlaceholder` | `"Search by name..."` | 後半 |
| `createError` | `"An error occurred while creating the group"` | 情報量多 |
| `createFailed` | `"Failed to create group: {detail}"` | プレースホルダーあり |
| `createSuccess` | `"Group \"{name}\" created"` | プレースホルダーあり |
| `isActiveLabel/Option*` | 後半値 | 後半のみに存在 |
| `memberRemoveHint` | `"Click × to remove a member"` | 情報量多 |
| `memberSetFailed` | `"Group created but failed to set members"` | 情報量多 |
| `membersCount` | `"({count})"` | `{count}` 単一波括弧が正しい形式 |
| `membersLabel` | `"Members (optional)"` | 情報量多 |
| `noMembers` | `"No members"` | 後半のみに存在 |

#### en.json `teamEditDialog` 整理後（採用値の根拠）

| キー | 採用値 | 理由 |
|---|---|---|
| `addBtn/addMember*` | 前半値 | 後半にこれらのキーなし |
| `isActiveLabel/Option*` | 後半値 | 後半のみに存在 |
| `membersCount` | `"({count} members)"` | `{count}` 単一波括弧が正しい形式 |
| `noGroupCd` | `"Skipped saving to DB because Group CD is not set"` | 情報量多 |
| `saveError` | `"An error occurred during save"` | 情報量多 |
| `saveFailed` | `"Save failed: {detail}"` | プレースホルダーあり |
| `saveSuccess` | `"'{name}' saved ({count} members)"` | プレースホルダーあり |
| `chiefUpdateFailed/memberUpdateFailed/nameUpdateFailed` | 後半値 | 後半のみに存在 |
| `saveSkipped` | 後半値 | 後半のみに存在 |

---

## 実装ステップ

- [ ] **Step 1**: `ja.json` の2つ目の `teamAddDialog`・`teamEditDialog`・`teamManagement`（行4965–5043）を削除し、前後の結合部を修正
- [ ] **Step 2**: `en.json` の `teamAddDialog` ブロックを整理済みクリーン版に書き換え
- [ ] **Step 3**: `en.json` の `teamEditDialog` ブロックを整理済みクリーン版に書き換え
- [ ] **Step 4**: `en.json` の2つ目の `teamManagement`（行4984–5008）を削除
- [ ] **Step 5**: `ja.json` の JSON 構文を `node -e` で検証
- [ ] **Step 6**: `en.json` の JSON 構文を `node -e` で検証
- [ ] **Step 7**: コンポーネントで使用している全キーが存在するか確認

---

## 変更ファイル

1. `frontend/src/locales/ja.json` - 2つ目の重複3セクション削除
2. `frontend/src/locales/en.json` - 重複キー整理・2つ目の `teamManagement` 削除

---

## リスク

| リスク | 対策 |
|--------|------|
| 削除後に JSON 構文エラー（カンマ過不足など） | 編集後に `node -e "JSON.parse(...)"` で即時検証 |
| コンポーネントが使用するキーを誤って消す | grep で全使用キーを洗い出してから整理後ブロックと照合 |
| `{{count}}` と `{count}` の形式混在 | `useLanguage` の `t()` に合わせて `{count}` 形式（単一波括弧）に統一 |

---

## テスト計画

- [ ] `node -e "JSON.parse(require('fs').readFileSync('frontend/src/locales/ja.json', 'utf8'))"` でパース成功確認
- [ ] `node -e "JSON.parse(require('fs').readFileSync('frontend/src/locales/en.json', 'utf8'))"` でパース成功確認
- [ ] `grep` でコンポーネント使用キーがすべて存在することを確認

---

## 承認記録

- **計画書提示日時**: 2026-08-13 00:00
- **承認日時**: 2026-08-13
- **承認者コメント**: 承認します

---

## 実施記録

### 実施日時
開始: 2026-08-13
完了: 2026-08-13

### 最終的な成果物
- [x] Step 1: `ja.json` の2つ目の重複3セクション（行4965–5043）を削除
- [x] Step 2: `en.json` の `teamAddDialog` ブロック内の重複キーを整理・書き換え
- [x] Step 3: `en.json` の `teamEditDialog` ブロック内の重複キーを整理・書き換え
- [x] Step 4: `en.json` の2つ目の `teamManagement` ブロック（行4984–5008）を削除
- [x] Step 5: `ja.json` JSON構文検証 → OK
- [x] Step 6: `en.json` JSON構文検証 → OK
- [x] Step 7: コンポーネント使用全キー存在確認 → 全キー存在確認: OK

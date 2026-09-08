# タスク計画書: Uncertainty追加モーダル units/formatString/scaleFactor 選択式化

## メタデータ
- **作成日時**: 2026-09-07 12:00
- **タスクID**: 20260907_1200_Uncertainty追加モーダルunits等選択式化
- **優先度**: 中
- **推定工数**: 2〜3時間

---

## 1. タスク概要

`UncertaintyCreateModal`（不確かさ基準新規作成）および `UncertaintyDetailModal`（不確かさ基準詳細・編集）において、`units` / `formatString` / `scaleFactor` の3フィールドが自由テキスト入力（`<Input>`）になっている問題を修正する。

これらはMAIML仕様上 **Attributeマスタ** で管理される値であり、既存の `NestedPropertyEditor.tsx` と同様に Attributeマスタ API（`/api/v1/master/attribute`）から取得した選択肢による **`<Select>`** に変更する。

---

## 2. 問題の詳細

### 現状

| モーダル | フィールド | 現状のUI |
|---|---|---|
| UncertaintyCreateModal | `units` | `<Input placeholder="GPa">` / xsiType 無効時 disabled |
| UncertaintyCreateModal | `formatString` | `<Input placeholder="#,###E0">` |
| UncertaintyCreateModal | `scaleFactor` | `<Input placeholder="1">` |
| UncertaintyDetailModal | `units` | `<Input>` / xsiType 無効時 disabled |
| UncertaintyDetailModal | `formatString` | `<Input>` |
| UncertaintyDetailModal | `scaleFactor` | `<Input placeholder="1">` |

### あるべき姿

- `units` / `formatString` / `scaleFactor` はそれぞれ Attributeマスタから取得した選択肢による `<Select>` に変更する
  - `units`: `attribute_name='units'` のレコード
  - `formatString`: `attribute_name='formatString'` のレコード
  - `scaleFactor`: `attribute_name='scaleFactor'` のレコード
- DBにマスタ未登録の場合は `<Select>` を `disabled` にする（設定不可）
- 編集モーダルで既存データの値が選択肢にない場合：`allowClear` で消去可能にする（強制クリアなし）

### 既存の実装パターン（参照元）

`NestedPropertyEditor.tsx` + `useAttributeMasters.ts` による実装が同一要件を満たしており、このパターンを踏襲する。

```
NestedPropertyEditor.tsx
  └─ useAttributeMasters (hooks/useAttributeMasters.ts)
      └─ fetchAttributeMasters(true) (services/masterApiService.ts)
          └─ GET /api/v1/master/attribute?apply_organization_group_filter=true&is_active=true
```

---

## 3. 目的と期待される成果

- [ ] `UncertaintyCreateModal` の `units` / `formatString` / `scaleFactor` が Attributeマスタ由来の `<Select>` になる
- [ ] `UncertaintyDetailModal` の `units` / `formatString` / `scaleFactor` が Attributeマスタ由来の `<Select>` になる
- [ ] DBにマスタ未登録の場合は `<Select>` が disabled（設定不可）になる
- [ ] `units` の xsiType による disabled 制御は従来通り維持される
- [ ] TypeScript コンパイルエラーなし

---

## 4. 実装ステップ

### Step 1: `UncertaintyCreateModal.tsx` の修正

- [ ] **1-1.** `useAttributeMasters` フックをインポート追加
- [ ] **1-2.** コンポーネント内でフックを呼び出し（`getAttributeValues` を使用）
- [ ] **1-3.** `units` / `formatString` / `scaleFactor` の選択肢を `useMemo` で生成
- [ ] **1-4.** `units` フィールドの `<Input>` → `<Select>` に変更
  - `disabled={!unitEnabled || unitsOptions.length === 0}` で xsiType 制御 + マスタ未登録制御を両立
  - `allowClear`
- [ ] **1-5.** `formatString` フィールドの `<Input>` → `<Select>` に変更（マスタ未登録時 disabled / allowClear）
- [ ] **1-6.** `scaleFactor` フィールドの `<Input>` → `<Select>` に変更（マスタ未登録時 disabled / allowClear）
- [ ] **1-7.** `handleParentChange` での `form.setFieldsValue` の値が `<Select>` に正しく反映されることを確認

### Step 2: `UncertaintyDetailModal.tsx` の修正

- [ ] **2-1.** `useAttributeMasters` フックをインポート追加・呼び出し
- [ ] **2-2.** `units` / `formatString` / `scaleFactor` の選択肢を `useMemo` で生成
- [ ] **2-3.** `units` フィールドの `<Input>` → `<Select>` に変更（xsiType 制御 + マスタ未登録制御）
- [ ] **2-4.** `formatString` フィールドの `<Input>` → `<Select>` に変更
- [ ] **2-5.** `scaleFactor` フィールドの `<Input>` → `<Select>` に変更
- [ ] **2-6.** `useEffect` での `form.setFieldsValue` での初期値設定が `<Select>` に正しく反映されることを確認

### Step 3: 動作確認・型チェック

- [ ] **3-1.** TypeScript コンパイルチェック: `cd /home/mi_ito/mmdpf/frontend && npx tsc --noEmit`
- [ ] **3-2.** 変更ファイルの最終確認

---

## 5. 変更ファイル

| # | ファイルパス | 変更種別 | 変更内容 |
|---|---|---|---|
| 1 | `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` | 修正 | `useAttributeMasters` 追加・3フィールドを `<Select>` に変更 |
| 2 | `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` | 修正 | 同上 |

---

## 6. 影響範囲の分析

- **影響あり（修正対象）**: `UncertaintyCreateModal.tsx`、`UncertaintyDetailModal.tsx`
- **影響なし（参照のみ）**: `useAttributeMasters.ts`、`masterApiService.ts`
- **バックエンド変更**: なし（既存の `/api/v1/master/attribute` エンドポイントを使用）
- **型定義変更**: なし / **DB変更**: なし
- **セキュリティ**: `fetchAttributeMasters(true)` の `apply_organization_group_filter=true` により組織グループ分離済み

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| DBにマスタ未登録でフィールド設定不可になる | 中 | 中 | マスタ管理画面で事前登録が必要であることを周知する |
| 既存データの値が選択肢にない場合、編集モーダルで値が空表示になる | 中 | 低 | `allowClear` で明示的消去を可能にし、強制クリアはしない |
| `form.getFieldsValue` で `undefined` が返るケースの考慮 | 低 | 低 | `values.units \|\| null` の既存パターンはそのまま維持（Select は空選択時に `undefined` を返す） |

---

## 8. テスト計画

### 手動テスト

- [ ] Create モーダルを開き `units` / `formatString` / `scaleFactor` がドロップダウンになること
- [ ] xsiType を数値型に変更すると `units` が有効になり、文字列型に変更すると `units` が disabled になること
- [ ] DBにマスタ未登録の属性は `<Select>` が disabled になること
- [ ] Detail モーダルを開き、既存データの値が `<Select>` に表示されること
- [ ] 保存処理が正常に動作すること

### TypeScript チェック

- [ ] `npx tsc --noEmit` でエラーなし

---

## 9. 関連ドキュメント

- `frontend/src/hooks/useAttributeMasters.ts` - Attributeマスタ取得フック（参照元）
- `frontend/src/components/editorv2/NestedPropertyEditor.tsx` - 実装パターン参照元

---

## 10. 承認記録

- **計画書提示日時**: 2026-09-07 12:00
- **承認日時**: 2026-09-07 12:10
- **承認者コメント**: 承認します

---

## 11. 実施記録

### 実施日時
開始: 2026-09-07 12:10
完了: 2026-09-07 12:20

### 計画からの変更点
なし

### 最終的な成果物
- [x] **1-1〜1-3**: `UncertaintyCreateModal.tsx` に `useMemo` / `useAttributeMasters` インポート追加・選択肢生成
- [x] **1-4**: `units` フィールドを `<Select options={unitsOptions} disabled={!unitEnabled || unitsOptions.length === 0} allowClear />` に変更
- [x] **1-5**: `formatString` フィールドを `<Select options={formatStrOptions} disabled={formatStrOptions.length === 0} allowClear />` に変更
- [x] **1-6**: `scaleFactor` フィールドを `<Select options={scaleFactorOptions} disabled={scaleFactorOptions.length === 0} allowClear />` に変更
- [x] **2-1〜2-2**: `UncertaintyDetailModal.tsx` に同様のフック追加・選択肢生成
- [x] **2-3〜2-5**: Detail モーダルの3フィールドを同様に `<Select>` に変更
- [x] **3-1**: `npx tsc --noEmit` エラーなし（exit: 0）

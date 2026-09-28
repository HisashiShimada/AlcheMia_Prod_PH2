# タスク計画書: WorkRecordPanel 定量評価追加行 property_set 未反映修正

## メタデータ

- **作成日時**: 2026-09-28 10:00
- **タスクID**: 20260928_1000
- **優先度**: 高
- **推定工数**: 0.5時間

---

## 1. タスク概要

`WorkRecordPanel.tsx` にて「値の追加」ボタンから追加した定量評価の入力値が、
`template_data` レコードの `property_set` カラム内の `uncertainty[]` に登録されない不具合を修正する。

---

## 2. 根本原因の分析

### 2-1. データフロー

```
PropertyCard（UI）
  └── handleAddValue()         追加ボタン押下 → addedValues に空行追加
  └── handleUncertaintyKeyChange() → onUncertaintyValuesChange コールバック
  └── handleValueChange()      → onUncertaintyValuesChange コールバック
        ↓
onUncertaintyValuesChange（WorkRecordPanel 側）
  └── uncertaintyValuesRef.current.set(`${placeId}__${propKey}`, entries)
        ↓
handleSave / handleSaveCorrection
  └── records 組み立て: p.uncertainty[] へ書き込み
```

### 2-2. バグ箇所

**`handleSave` 内 L3055〜3073 および `handleSaveCorrection` 内 L2908〜2926**

```tsx
// 現在の処理（問題あり）
if (propEntries.length === 0 || !Array.isArray(p.uncertainty)) return;
//                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// p.uncertainty が存在しない or 空配列の場合は return してしまう

(p.uncertainty as Array<...>).forEach((unc) => {
  const entry = propEntries.find((e) => e.uncertaintyKey === ucKey);
  if (entry ...) unc['value'] = entry.value;
  // ↑ 既存エントリへの value 書き込みのみ
  // 追加行（p.uncertainty[] に存在しないキー）を push する処理がない！
});
```

**問題点を整理:**

| # | 問題 | 影響 |
|---|------|------|
| 1 | `!Array.isArray(p.uncertainty)` 時に `return` する | テンプレートに uncertainty[] が定義されていない場合、処理が打ち切られる |
| 2 | 既存 `unc` に `find` でマッチングするだけ | `p.uncertainty[]` に存在しない uncertaintyKey（追加ボタンで新規追加）のエントリは push されない |

### 2-3. 補足: `uncertaintyValues` ペイロードは正常

`saveBatchExperimentData` へ送る `uncertaintyValues`（L3083〜3095）は
`uncertaintyValuesRef` を直接参照して組み立てられており問題ない。
今回の不具合は `records[].data.properties[].uncertainty[]` への書き込み漏れのみ。

---

## 3. 修正方針

### 修正内容

`propEntries` の中で `p.uncertainty[]` に存在しないキーのエントリを
新規エントリとして `p.uncertainty[]` に push する処理を追加する。

あわせて、`!Array.isArray(p.uncertainty)` の場合でも
`propEntries` に有効な追加行がある場合は `p.uncertainty` を空配列として初期化し
push できるよう条件を修正する。

### 修正後のロジック（両箇所共通）

```tsx
// ── 定量評価値（uncertaintyValuesRef）を uncertainty[] に書き込む ──
if (Array.isArray(baseData.properties)) {
  (baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
    if (p.isCustomProperty === true) return;
    const propKey = String(p.key ?? '');
    const propEntries: UncertaintyValueEntry[] =
      uncertaintyValuesRef.current.get(`${item.templateId}__${propKey}`) ??
      uncertaintyValuesRef.current.get(`${item.placeId}__${propKey}`) ?? [];
    if (propEntries.length === 0) return; // ← !Array.isArray 条件を分離

    // uncertainty[] が未定義 or 配列でない場合は空配列で初期化
    if (!Array.isArray(p.uncertainty)) p.uncertainty = [];

    // 既存エントリへの value 書き込み（変更なし）
    (p.uncertainty as Array<Record<string, unknown>>).forEach((unc) => {
      const ucKey = unc['key'] as string | undefined;
      if (!ucKey) return;
      const entry = propEntries.find((e) => e.uncertaintyKey === ucKey);
      if (entry && entry.value && !isNaN(Number(entry.value))) {
        unc['value'] = entry.value;
      }
    });

    // 追加行: p.uncertainty[] に存在しないキーを新規 push する ← NEW
    const existingKeys = new Set(
      (p.uncertainty as Array<Record<string, unknown>>).map((unc) => unc['key'] as string)
    );
    for (const entry of propEntries) {
      if (!entry.uncertaintyKey || existingKeys.has(entry.uncertaintyKey)) continue;
      if (!entry.value || isNaN(Number(entry.value))) continue;
      (p.uncertainty as Array<Record<string, unknown>>).push({
        key: entry.uncertaintyKey,
        value: entry.value,
      });
    }
  });
}
```

---

## 4. 実装ステップ

- [x] タスク専用フォルダ作成・PLAN.md 作成
- [x] `handleSave` 内（旧L3055〜3073 → 新L3071〜3106）の定量評価書き込み処理を修正
- [x] `handleSaveCorrection` 内（旧L2908〜2926 → 新L2908〜2943）の定量評価書き込み処理を同様に修正
- [x] 修正後のコードを確認（read_files）・TypeScript ビルドエラーなし

---

## 5. 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `handleSave` 内 L3055〜3073: 追加行 push 処理を追加・条件修正 |
| 2 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `handleSaveCorrection` 内 L2908〜2926: 同上 |

---

## 6. 影響範囲

- **修正スコープ**: フロントエンド 1 ファイル、2 箇所のみ
- **バックエンド変更**: なし
- **既存機能への影響**:
  - プリセット行（テンプレートに定義済みの uncertainty エントリ）への書き込みは変更なし
  - 既存の定性評価書き込み処理は変更なし
  - `uncertaintyValues` ペイロードは変更なし

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 追加行の重複 push | 中 | 低 | `existingKeys` Set で重複チェックを行う |
| 値が数値でない行の混入 | 低 | 低 | `isNaN(Number(entry.value))` チェックで除外 |

---

## 8. テスト計画

### 手動テスト
- [ ] 「値の追加」ボタンで新規行を追加し、uncertaintyKey と value を入力して保存
- [ ] 保存後に `template_data.property_set` の `uncertainty[]` に追加行が含まれることを確認
- [ ] プリセット行（テンプレート定義済み）への書き込みが引き続き正常に機能することを確認
- [ ] `handleSaveCorrection`（修正モード保存）でも同様に動作することを確認

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-28 10:00
- **承認日時**: 2026-09-28 10:00（ユーザー指示により計画書作成後即実装）
- **承認者コメント**: 計画書を起こした後実装に移ってください

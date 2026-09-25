# タスク計画書: WorkRecordPanel addedValues 追加行保持・プリセット行表示分離

## メタデータ

- **作成日時**: 2026-09-25
- **タスクID**: 20260925_WorkRecordPanel_addedValues追加行保持・表示分離
- **優先度**: 高
- **推定工数**: 1.5時間（根本原因の追加調査により更新）


> ⚠️ **根本原因を追加調査により更新（2026-09-25）**  
> 問題1の根本原因は当初の分析より深く、`uncertaintyValuesRef` のキー設計と追加行の復元処理の両方に問題がある。STEP 数を5に拡張。


---

## タスク概要

`WorkRecordPanel.tsx` の定量評価入力欄に関する以下2件の問題を修正する。

1. **追加ボタンから追加した行がテンプレート切替時に保持されない**
2. **プリセット（デフォルト）行で不要な Select コンポーネントが表示されている**

---

## 問題1：追加行がテンプレート切替時に保持されない

### 根本原因

`handleUncertaintyKeyChange` / `handleValueChange`（413〜426行目）の `onUncertaintyValuesChange` 通知フィルタが **`av.uncertaintyKey && av.value` の両方が揃った行のみ** を通知する仕様になっている。

```typescript
// 現状のフィルタ（問題箇所）
onUncertaintyValuesChange?.(next.filter((av) => av.uncertaintyKey && av.value).map(...));
```

この結果、以下のケースで `uncertaintyValuesRef` への保存が欠落する：

| ケース | 現状の挙動 |
|--------|-----------|
| 追加行で `uncertaintyKey` だけ選択して `value` 未入力の状態で切替 | 欠落（フィルタで除外される） |
| 追加行で `value` だけ入力して `uncertaintyKey` 未選択の状態で切替 | 欠落（フィルタで除外される） |
| 追加行を削除（`handleRemoveValue`）して切替 | `onUncertaintyValuesChange` 自体を呼ばないため削除操作が Ref に反映されない |

また、プリセット行（`isPreset: true`）は `uncertaintyKey` が初期設定済みのため `value` を入力すれば Ref に保存されるが、追加行は両方揃わないと保存されない。

### 修正方針

`onUncertaintyValuesChange` への通知内容を**フィルタなしで全行（addedValues の現在状態）** に変更する。  
保存時（`handleSave`）のフィルタは既存コードに `uncertaintyKey && value` フィルタが別途存在するため、通知時に絞り込む必要はない。

あわせて `handleRemoveValue` でも `onUncertaintyValuesChange` を呼ぶよう修正する。

---

## 問題2：プリセット行で Select が不要

### 根本原因

プリセット行（`isPreset: true`）は不確かさキーが固定であり、前回の修正で `disabled={!!av.isPreset}` を追加したが、Select 部品自体は表示されたまま。キー名をテキストで表示するだけで十分。

### 修正方針

描画ロジックをプリセット行と追加行で分岐する。

- **プリセット行（`av.isPreset === true`）**: Select の代わりに不確かさキー名（`qInfo?.uncertaintyName || av.uncertaintyKey`）をテキスト表示する。削除ボタンも不要なため非表示にする
- **追加行（`av.isPreset` なし/`false`）**: 現状どおり Select・値入力・削除ボタンを表示する

---

## 実装ステップ

### STEP 1: `handleUncertaintyKeyChange` / `handleValueChange` の通知フィルタを修正

**ファイル:** `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

現状（413〜415行目・424〜426行目）の `onUncertaintyValuesChange?.(next.filter((av) => av.uncertaintyKey && av.value).map(...))` を、全行通知に変更する。

```typescript
// 修正後の共通通知ヘルパー（全行を通知）
onUncertaintyValuesChange?.(next.map((av) => ({
  propKey: prop.key, uncertaintyKey: av.uncertaintyKey, value: av.value,
})));
```

- [ ] `handleUncertaintyKeyChange` 内の `onUncertaintyValuesChange` 通知を全行通知に変更
- [ ] `handleValueChange` 内の `onUncertaintyValuesChange` 通知を全行通知に変更

### STEP 2: `handleRemoveValue` でも `onUncertaintyValuesChange` を呼ぶよう修正

**ファイル:** `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

```typescript
/** 行を削除する */
const handleRemoveValue = (id: string) => {
  setAddedValues((prev) => {
    const next = prev.filter((av) => av.id !== id);
    onUncertaintyValuesChange?.(next.map((av) => ({
      propKey: prop.key, uncertaintyKey: av.uncertaintyKey, value: av.value,
    })));
    return next;
  });
};
```

- [ ] `handleRemoveValue` を `setAddedValues` のコールバック形式に変更し、削除後の配列で `onUncertaintyValuesChange` を呼ぶよう修正

### STEP 3: プリセット行と追加行の描画を分岐

**ファイル:** `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

638〜664行目の入力行部分を `av.isPreset` で分岐する。

```tsx
{/* 入力行 */}
<Flex gap={4} align="center">
  {av.isPreset ? (
    // プリセット行: キー名をテキスト表示（Select不要）
    <Text style={{ flex: 6, minWidth: 0, fontSize: 12 }}>
      {qInfo?.uncertaintyName || av.uncertaintyKey}
    </Text>
  ) : (
    // 追加行: Select でキーを選択
    <Select
      size="small"
      style={{ flex: 6, minWidth: 0 }}
      placeholder={t('workRecord.quantitativeEvalPlaceholder')}
      value={av.uncertaintyKey || undefined}
      onChange={(val) => handleUncertaintyKeyChange(av.id, val)}
      options={uncertaintyOptionsCache}
    />
  )}
  <Input
    size="small"
    style={{ flex: 4, minWidth: 0 }}
    placeholder={t('workRecord.valuePlaceholder')}
    value={av.value}
    onChange={(e) => handleValueChange(av.id, e.target.value)}
  />
  {!av.isPreset && (
    <Button
      size="small"
      type="text"
      danger
      icon={<DeleteOutlined />}
      onClick={() => handleRemoveValue(av.id)}
    />
  )}
</Flex>
```

- [ ] `av.isPreset` が `true` の場合は Select の代わりにキー名テキストを表示
- [ ] `av.isPreset` が `true` の場合は削除ボタンを非表示にする
- [ ] `av.isPreset` が `false`/`undefined` の場合は現状と同様に Select と削除ボタンを表示
- [ ] `disabled={!!av.isPreset}` の記述（不要になる）を削除

---

## 変更ファイル一覧

| # | ファイル | 変更種別 | 対応STEP |
|---|---------|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正 | STEP 1〜3 |

---

## 影響範囲

- `onUncertaintyValuesChange` の通知内容が変わる（フィルタなし全行 → `uncertaintyKey` と `value` が空のエントリも含まれる）
- 保存時の `uncertaintyValues` 送信フィルタは `handleSave` 内に別途存在するため保存動作への影響なし
- `uncertaintyValuesRef` のデータ量が若干増えるが、エントリ数は最大でもプロパティ数×定量評価数と限定的

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `uncertaintyKey` 空・`value` 空のエントリが `uncertaintyValuesRef` に保存されるが、保存時フィルタが機能するか | 低 | 低 | `handleSave` 内の既存フィルタ（`uncertaintyKey && value` が揃ったもののみ送信）は変更しないため影響なし |

---

## テスト計画

### 手動テスト（問題1）
- [ ] 追加ボタンで行を追加し `uncertaintyKey` だけ選択 → テンプレート切替 → 戻す → 行が復元されている
- [ ] 追加ボタンで行を追加し `value` だけ入力 → テンプレート切替 → 戻す → 行が復元されている
- [ ] 追加ボタンで行を追加後に削除 → テンプレート切替 → 戻す → 削除済みのまま

### 手動テスト（問題2）
- [ ] プリセット行の Select が消え、キー名テキストが表示されている
- [ ] プリセット行の削除ボタンが表示されていない
- [ ] 追加行の Select と削除ボタンは引き続き表示されている

---

## 承認記録

- **計画書提示日時**: 2026-09-25
- **承認日時**: 2026-09-25
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-09-25
完了: 2026-09-25

### 最終的な成果物
- [x] STEP 1-①: DB `recordedValue` 初期化を `${tpl.id}__${wp.key}` キーのプロパティ単位に変更
- [x] STEP 1-②: `onUncertaintyValuesChange` ハンドラのキーを `${placeId}__${entries[0].propKey}` に変更
- [x] STEP 1-③: `onGetInitialUncertaintyValues` を `${placeId}__${propKey}` 直接アクセスに変更
- [x] STEP 1-④: `handleSave`/`handleSaveCorrection` の `uncertaintyValuesRef` 参照を新キー形式に変更（フォールバックあり）
- [x] STEP 2: `handleUncertaintyKeyChange` / `handleValueChange` の通知フィルタを全行通知に変更
- [x] STEP 3: `handleRemoveValue` で削除後も `onUncertaintyValuesChange` を通知するよう変更
- [x] STEP 4: `addedValues` 初期化で `initialUncertaintyValues` のプリセット外エントリを `isPreset: false` の追加行として復元
- [x] STEP 5: プリセット行はキー名テキスト表示・削除ボタン非表示、追加行は Select・削除ボタン表示に分岐

### TypeScript ビルド結果
- フロントエンド: `tsc --noEmit` → エラーなし（exit:0）

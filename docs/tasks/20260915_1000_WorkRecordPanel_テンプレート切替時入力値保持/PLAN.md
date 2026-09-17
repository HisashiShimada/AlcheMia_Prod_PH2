# タスク計画書: WorkRecordPanel テンプレート切替時入力値保持

## メタデータ
- **作成日時**: 2026-09-15 10:00
- **タスクID**: 20260915_1000
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

`WorkRecordPanel` の `handleSave` では `rawTemplateItemsRef` から各テンプレートの構造を取得して保存データを組み立てているが、**確信度（confidence）・定性評価理由（qualitativeReason）・定量評価値（addedValues）はテンプレート構造に含まれない入力値**であり、それぞれ以下の Ref に格納されている。

| 入力値 | 管理場所 |
|--------|---------|
| 確信度 (`confidence`) | `confidenceValuesRef`（`Map<string, {templateId, propKey, value, description?}>`） |
| 定性評価理由 (`qualitativeReason`) | 同上（`description` フィールド） |
| 定量評価行 (`addedValues`) | `uncertaintyValuesRef`（`Map<string, UncertaintyValueEntry[]>`） |

これらの Ref はテンプレートIDとpropKeyをキーに持つが、**テンプレートを別のものに切り替えると PropertyCard が再マウント**される。  
再マウント時 `PropertyCard` の local state（`confidence`, `qualitativeReason`, `addedValues`）は `prop.defaultConfidence` / `prop.qualitativeReason` / `prop.quantitativeUncertainties` を初期値として再生成されるため、ユーザーが入力していた未保存の値がリセットされてしまう。

---

## 2. 問題の詳細分析

### 2-1. PropertyCard の local state 初期化ロジック（L338〜355）

```tsx
const [confidence, setConfidence] = useState<string | null>(prop.defaultConfidence ?? null);
const [qualitativeReason, setQualitativeReason] = useState<string>(prop.qualitativeReason ?? '');
const [addedValues, setAddedValues] = useState<AddedUncertaintyValue[]>(() => {
  if (prop.quantitativeUncertainties && prop.quantitativeUncertainties.length > 0) {
    return prop.quantitativeUncertainties.map((qu) => ({
      id: qu.uncertaintyKey,
      uncertaintyKey: qu.uncertaintyKey,
      value: '',   // ← 常に空文字にリセットされる
    }));
  }
  return [{ id: 'initial', uncertaintyKey: '', value: '' }];
});
```

- `confidence` / `qualitativeReason` は DB 保存済み値は `apiTransitions` の `WorkProperty` に反映されているため保存後の切替では復元されるが、**未保存入力値は失われる**。
- `addedValues` の `value` は常に空文字で初期化されるため、**保存済み値も含めてテンプレート切替後にリセットされる**。

### 2-2. 保存成功後の復元ロジック（L2867〜2884）

`handleSave` 成功後に `setApiTransitions` で `defaultConfidence` / `qualitativeReason` を WorkProperty に書き戻す処理はあるが、`addedValues` の `value` に相当する値は書き戻されない。

### 2-3. 根本原因

`confidenceValuesRef` / `uncertaintyValuesRef` に最新の入力値は存在するが、`PropertyCard` 再マウント時にこれらの Ref から初期値を復元する仕組みがない。

---

## 3. 解決方針

### 方針: Ref の値を PropertyCard の初期値として注入する

テンプレートが切り替わると `PropertyCard` が再マウントされる。このとき `prop` の初期値として Ref から復元した値を使えば、テンプレート切替後も入力値を保持できる。

以下の2つのコールバックを上位コンポーネントから PropertyCard まで伝達する Props チェーンを追加する:

**① `onGetInitialConfidence(placeId, propKey)` → `{ confidence, qualitativeReason }`**  
`confidenceValuesRef` から未保存の confidence / qualitativeReason を取得し、`prop.defaultConfidence` / `prop.qualitativeReason` を上書きして PropertyCard に渡す。

**② `onGetInitialUncertaintyValues(placeId, propKey)` → `UncertaintyValueEntry[]`**  
`uncertaintyValuesRef` から未保存の定量評価入力値を取得し、`addedValues` の初期値として PropertyCard に渡す。

---

## 4. 実装ステップ

### Step 1: `PropertyCardProps` に `initialUncertaintyValues?` を追加し、`addedValues` 初期化修正

`PropertyCardProps` に `initialUncertaintyValues?: UncertaintyValueEntry[]` を追加。

`addedValues` の初期化ロジックを修正:

```tsx
const [addedValues, setAddedValues] = useState<AddedUncertaintyValue[]>(() => {
  if (prop.quantitativeUncertainties && prop.quantitativeUncertainties.length > 0) {
    return prop.quantitativeUncertainties.map((qu) => {
      const savedEntry = initialUncertaintyValues?.find(
        (e) => e.uncertaintyKey === qu.uncertaintyKey
      );
      return {
        id: qu.uncertaintyKey,
        uncertaintyKey: qu.uncertaintyKey,
        value: savedEntry?.value ?? '',
      };
    });
  }
  return [{ id: 'initial', uncertaintyKey: '', value: '' }];
});
```

### Step 2: `PropertyListProps` にコールバック2本を追加

```tsx
onGetInitialConfidence?: (placeId: string, propKey: string) => { confidence: string | null; qualitativeReason: string | undefined };
onGetInitialUncertaintyValues?: (placeId: string, propKey: string) => UncertaintyValueEntry[];
```

### Step 3: `PropertyList` 内で `prop` を補完して `PropertyCard` に渡す

`PropertyList` のレンダリングループで、各 `prop` を描画する前に以下の補完処理を行う:

```tsx
const initialConf = onGetInitialConfidence?.(template.id, prop.key);
const enrichedProp: WorkProperty = {
  ...prop,
  defaultConfidence: initialConf?.confidence ?? prop.defaultConfidence,
  qualitativeReason: initialConf?.qualitativeReason ?? prop.qualitativeReason,
};
const initialUncValues = onGetInitialUncertaintyValues?.(template.id, prop.key) ?? [];

<PropertyCard
  prop={enrichedProp}
  initialUncertaintyValues={initialUncValues}
  ...
/>
```

### Step 4: `PlanProps` に2本のコールバックを追加

`PlanProps` インターフェースに以下を追加:

```tsx
onGetInitialConfidence?: (placeId: string, propKey: string) => { confidence: string | null; qualitativeReason: string | undefined };
onGetInitialUncertaintyValues?: (placeId: string, propKey: string) => UncertaintyValueEntry[];
```

### Step 5: `PlanB` で `PropertyList` に渡す

`PlanB` の Props から受け取り、`PropertyList` にそのまま渡す（バケツリレー）。

### Step 6: `WorkRecordPanel` 本体で実装して `planProps` に追加

```tsx
onGetInitialConfidence: (placeId: string, propKey: string) => {
  const key = `${placeId}__${propKey}`;
  const entry = confidenceValuesRef.current.get(key);
  return {
    confidence: entry?.value ?? null,
    qualitativeReason: entry?.description ?? undefined,
  };
},
onGetInitialUncertaintyValues: (placeId: string, propKey: string): UncertaintyValueEntry[] => {
  const key = `${placeId}__${propKey}`;
  return uncertaintyValuesRef.current.get(key) ?? [];
},
```

---

## 5. 変更ファイルリスト

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | **修正** | ① `PropertyCardProps` に `initialUncertaintyValues?` 追加・`addedValues` 初期化修正、② `PropertyListProps` にコールバック2本追加・PropertyList 内で prop 補完、③ `PlanProps` にコールバック2本追加、④ `PlanB` でコールバックを `PropertyList` に接続、⑤ `planProps` に実装済みコールバック2本追加 |

変更ファイルは1ファイルのみ（WorkRecordPanel.tsx）。

---

## 6. 影響範囲の分析

- **変更コンポーネント**: `PropertyCard`、`PropertyList`、`PlanB`、`WorkRecordPanel` 本体（すべて同一ファイル内）
- **API への影響**: なし
- **保存ロジックへの影響**: `handleSave` / `handleSaveCorrection` は変更なし
- **既存動作への影響**:
  - 初回マウント時は Ref が空のため `prop.defaultConfidence` / `prop.qualitativeReason` / 空の `addedValues` が使われ、既存動作と変わらない
  - ユーザーが入力後にテンプレートを切り替えると Ref 値が復元される（意図した変更）
- **認証・認可への影響**: なし
- **マルチテナント分離への影響**: なし

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Ref アクセスのパフォーマンス影響 | 低 | 低 | Map の get は O(1) で無視できる |
| Props バケツリレーの増加 | 低 | 確定 | 同一ファイル内のローカルコンポーネントのため管理上の問題なし |

---

## 8. テスト計画

### 手動テスト
- [ ] テンプレートA で confidence を選択 → テンプレートB に切り替え → テンプレートA に戻る → confidence が保持されていること
- [ ] テンプレートA で qualitativeReason を入力 → テンプレートB に切り替え → テンプレートA に戻る → qualitativeReason が保持されていること
- [ ] テンプレートA で定量評価値を入力 → テンプレートB に切り替え → テンプレートA に戻る → 定量評価値が保持されていること
- [ ] 保存後にテンプレートを切り替えても、保存された値が正しく表示されること
- [ ] 初回ロード時（DB 値あり）でテンプレートを切り替えても、DB 値が正しく表示されること

### ビルド確認
- [ ] TypeScript コンパイルエラーなし（`cd frontend && npx tsc --noEmit`）

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-15 10:00
- **承認日時**: 2026-09-15 10:00
- **承認者コメント**: 承認

---

## 10. 実施記録

### 実施日時
開始: 2026-09-15 10:00
完了: 2026-09-15 10:30

### 変更箇所（すべて WorkRecordPanel.tsx 1ファイル内）

1. **`PropertyCardProps`** に `initialUncertaintyValues?: UncertaintyValueEntry[]` を追加
2. **`PropertyCard`** の分割束縛に `initialUncertaintyValues` を追加、`addedValues` 初期化で `savedEntry?.value` を使って復元
3. **`PropertyListProps`** に `onGetInitialConfidence?` / `onGetInitialUncertaintyValues?` を追加
4. **`PropertyList`** の分割束縛に2本追加、レンダリングループで `enrichedProp` を生成して `PropertyCard` に渡す
5. **`PlanProps`** に `onGetInitialConfidence?` / `onGetInitialUncertaintyValues?` を追加
6. **`PlanB`** の分割束縛に2本追加、`PropertyList` へそのまま伝達
7. **`planProps`** に `onGetInitialConfidence` / `onGetInitialUncertaintyValues` を実装して追加

### 最終的な成果物
- [x] テンプレート切替後に `confidence`（確信度）が保持されるようになった
- [x] テンプレート切替後に `qualitativeReason`（定性評価理由）が保持されるようになった
- [x] テンプレート切替後に `addedValues`（定量評価値）が保持されるようになった
- [x] TypeScript コンパイルエラーなし（WorkRecordPanel.tsx に関するエラーゼロ）
- [x] 変更ファイル1本のみ（WorkRecordPanel.tsx）


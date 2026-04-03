# タスク計画書: 実験記録カスタムプロパティ追加

## メタデータ
- **作成日時**: 2026-04-01 16:23
- **タスクID**: experiment-record-custom-property
- **優先度**: 高
- **推定工数**: 4〜6時間

## タスク概要

実験作業者画面の実験記録ダイアログ（DataRecordDialog）に、カスタムプロパティの登録機能を追加する。
reference版（`frontend/src/reference/components/ExperimentRecorder/`）に同様の機能があるため、それを参考に現行のNext.js版へ移植する。

---

## 調査結果サマリー

### reference版の機能概要

`MobileDataInput.js` + `useCustomProperties.js` に実装済み。

#### カスタムプロパティ追加ダイアログ（`showAddPropertyDialog`）

入力フィールド:
1. **プロパティキー** (`newPropertyKey`) — テキスト入力
2. **データコンテナ種** (`newPropertyContainerType`) — セレクト
   - `property`（単一値）
   - `content`（複数値・配列）
   - `insertion`（ファイル添付）
3. **データ型** (`newPropertyType`) — コンテナ種に応じて動的変化
   - property: `stringType` / `doubleType` / `intType` / `booleanType` / `dateTimeType`
   - content: `contentType`（1次元） / `contentData`（2次元）
   - insertion: 非表示（自動設定）
4. **値** (`newPropertyValue`) — テキストエリア（insertion時は非表示）

#### 保存時のデータ構造（`useCustomProperties.js: handleConfirmAddProperty`）

- **通常プロパティ**: `{ value, customType, containerType, isCustomProperty: true, timestamp }`
- **insertion**: `{ value: null, customType: 'insertion', containerType, isCustomProperty: true, timestamp }`
- **contentData**: `{ type: 'propertyList', xsiType: 'propertyListType', properties: { [key+'Data']: {...isDataGrid:true...} }, isCustomProperty: true }`

#### 追加後の表示（`renderPropertyInputs`）

- `isCustomProperty === true` のプロパティをformDataから抽出し、テンプレートプロパティの後ろに追加表示
- 「カスタムプロパティ」バッジを付与

---

### UIモックの調査結果

`docs/20260401_1528_実験記録カスタムプロパティ追加/ui-mock.html` に3案が作成済み。

| 案 | 方式 | 特徴 |
|----|------|------|
| **案A（推奨）** | フォーム末尾追加 | 区切り線＋インライン行追加。最もシンプル |
| 案B | Collapse折りたたみ | 普段は隠れている。展開して入力 |
| 案C | タブ切り替え | テンプレート/カスタムを完全分離 |

**推奨: 案A** — 既存UIに最も馴染む。キー・型・値・単位をインライン入力し、行追加ボタンで増やす方式。

---

## 現行コードの対象ファイル

現行のDataRecordDialogは以下に存在する（要確認）：

- `frontend/src/components/` 配下の実験作業者向けDataRecordDialog
- 対応するカスタムフック

---

## 実装ステップ

### Phase 1: 対象ファイル特定・構造確認

- [ ] `frontend/src/components/` 配下でDataRecordDialog相当のファイルを特定
- [ ] 現行のフォームデータ管理フックを確認
- [ ] 現行の保存処理（onSave）の引数形式を確認

### Phase 2: カスタムプロパティフック実装

- [ ] `frontend/src/components/[対象ディレクトリ]/hooks/useCustomProperties.ts` を新規作成
  - `handleAddCustomProperty` — ダイアログ表示
  - `handlePropertyChange` — 値変更
  - `handleConfirmAddProperty` — カスタムプロパティ追加確定
  - `handleRemoveCustomProperty` — 削除（現行reference版にないが追加）
  - 対応する state: `showAddPropertyDialog`, `newPropertyKey`, `newPropertyValue`, `newPropertyType`, `newPropertyContainerType`, `currentTemplateForProperty`

### Phase 3: ダイアログUI実装（案A: インライン行追加方式）

- [ ] 対象コンポーネントファイルにカスタムプロパティセクションを追加
  - 区切り線 + 「カスタムプロパティ（任意追加）」ラベル
  - 追加済みカスタムプロパティの一覧行（キー・型・値・削除ボタン）
  - 「＋ カスタムプロパティを追加」ボタン → モーダルダイアログ表示
- [ ] 追加ダイアログ（Modal/Drawer）
  - プロパティキー入力
  - コンテナ種セレクト（property / insertion）
  - データ型セレクト（stringType / doubleType / intType / booleanType / dateTimeType）
  - 値入力（insertion時は非表示）

### Phase 4: 保存処理への統合

- [ ] 保存時にカスタムプロパティをテンプレートデータにマージ
- [ ] `isCustomProperty: true` フラグを保持して既存の保存ロジックへ渡す

### Phase 5: 読み込み時の表示

- [ ] 既存データ読み込み時にカスタムプロパティを正しく復元・表示

### Phase 6: 型定義

- [ ] `frontend/src/types/` にカスタムプロパティ関連型を追加

---

## 変更ファイル

（Phase 1確認後に確定。現時点の予測）

### 新規作成
1. `frontend/src/components/[対象]/hooks/useCustomProperties.ts` — カスタムプロパティ管理フック

### 修正
1. `frontend/src/components/[対象]/DataRecordDialog.tsx` — UI追加・フック接続
2. `frontend/src/types/[対象].ts` — 型定義追加

---

## 技術的詳細

### カスタムプロパティのデータ構造

```typescript
// フォームデータ内のカスタムプロパティ
interface CustomPropertyValue {
  value: string | number | boolean | null;
  customType: 'stringType' | 'doubleType' | 'intType' | 'booleanType' | 'dateTimeType' | 'insertion';
  containerType: 'property' | 'content' | 'insertion';
  isCustomProperty: true;
  timestamp: string;
}
```

### scope（対象外）

- contentData（2次元配列）コンテナ — reference版に存在するが、現行UIに2次元データ入力UIが未整備のため今回はスコープ外
- propertyListType（ネスト構造）— 同上

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 現行DataRecordDialogの構造が大きく異なる | 高 | Phase 1で必ず確認してから実装着手 |
| 保存APIのペイロード形式変更が必要 | 中 | 既存保存処理をwrapする形で対応 |
| 既存データ読み込み時の`isCustomProperty`フラグ欠損 | 低 | フォールバック処理を追加 |

---

## 承認記録

- **計画書提示日時**: 2026-04-01 16:23
- **承認日時**: （承認後記入）

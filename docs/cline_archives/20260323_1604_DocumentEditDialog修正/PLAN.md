# タスク計画書: DocumentEditDialog 3件修正

## メタデータ
- **作成日時**: 2026-03-23 16:04
- **タスクID**: DocumentEditDialog修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

DocumentEditDialog（ドキュメント編集ダイアログ）に関する3件のUI修正を行う。

## 目的と期待される成果

- [ ] Creatorのアイコンを人アイコン（👤）から機器アイコンに変更する
- [ ] Document基本プロパティのUUID欄にラベル「UUID」を表示する
- [ ] CreatorのVendorRef・InstrumentRef選択肢にマスタデータの一覧を反映する

---

## 課題詳細・原因分析

### 課題1: Creatorアイコンの変更

**現状**  
`DocumentEditDialog.tsx` の Creator用 `MultiObjectEditor` に `icon="👤"`（人）が渡されている。

```tsx
// DocumentEditDialog.tsx L405
<MultiObjectEditor
  objectKey="creators"
  title="Creator"
  icon="👤"   ← ここを変更
  ...
/>
```

**修正内容**  
Creatorは装置・システムの「作成者（製造者）」であり、人ではなく機器・ツールのイメージのアイコンへ変更する。  
Ant Designの `ToolOutlined` アイコン（🔧相当）を使用する案、または絵文字 `⚙️` を使用する案がある。  
→ 絵文字 `⚙️`（設定/機器）に変更する。

**変更ファイル**  
- `frontend/src/components/editorv2/components/DocumentEditDialog.tsx`

---

### 課題2: UUID欄にラベルがない

**現状**  
`DocumentEditDialog.tsx` の基本プロパティパネル内、UUID欄の `Form.Item` が `noStyle` かつ `label` 未設定のため、ラベルが表示されていない。

```tsx
// DocumentEditDialog.tsx - 基本プロパティセクション
<Space.Compact style={{ width: '100%' }}>
  <Form.Item label="UUID" name="uuid" noStyle>   ← labelが設定されているがnoStyleで非表示
    <Input />
  </Form.Item>
  <Button ...>生成</Button>
</Space.Compact>
```

`noStyle` を指定すると `Form.Item` のラベルや余白が消えてしまうため、ラベルを外側に別途表示する構造に変更する必要がある。

**修正内容**  
UUID フィールドを `Space.Compact` の外側に `Form.Item label="UUID"` でラップし直し、内側の `Space.Compact` で Input と生成ボタンを並べる構造に変更する。

```tsx
// 修正後のイメージ
<Form.Item label="UUID">
  <Space.Compact style={{ width: '100%' }}>
    <Form.Item name="uuid" noStyle>
      <Input />
    </Form.Item>
    <Button icon={<ThunderboltOutlined />} onClick={...}>生成</Button>
  </Space.Compact>
</Form.Item>
```

**変更ファイル**  
- `frontend/src/components/editorv2/components/DocumentEditDialog.tsx`

---

### 課題3: VendorRef・InstrumentRef の選択肢が空になる

**現状**  
`DocumentEditDialog.tsx` で `vendorIds` / `instrumentIds` を算出する `useMemo` の**依存配列が `[form]` のみ**になっている。  
Ant Design の `form` オブジェクト自体は参照が変わらないため、画面上で Vendor / Instrument を追加しても **`useMemo` が再計算されず、選択肢が常に空のまま**になっている。

```typescript
// DocumentEditDialog.tsx（現状）
const vendorIds = useMemo(() => {
  const vendors = form.getFieldValue('vendors') || [];
  return vendors.map((v: DocumentTagData) => v.id).filter(Boolean);
}, [form]);  // ← form の参照は変わらないため再計算されない ← これが原因

const instrumentIds = useMemo(() => {
  const instruments = form.getFieldValue('instruments') || [];
  return instruments.map((i: DocumentTagData) => i.id).filter(Boolean);
}, [form]);  // ← 同上
```

**修正内容**  
画面上で登録済みの Vendor / Instrument の一覧を React state として管理し、その state から `vendorIds` / `instrumentIds` を導出するよう変更する。

具体的には:
1. `currentVendors: DocumentTagData[]` / `currentInstruments: DocumentTagData[]` という state を追加する
2. `handleMultiObjectDataChange` が `'vendors'` / `'instruments'` で呼び出された際に、その state を更新する
3. `vendorIds` / `instrumentIds` の `useMemo` を、form 参照ではなくこの state に依存するよう変更する

```typescript
// 修正後のイメージ
const [currentVendors, setCurrentVendors] = useState<DocumentTagData[]>([]);
const [currentInstruments, setCurrentInstruments] = useState<DocumentTagData[]>([]);

// handleMultiObjectDataChange 内で更新
if (objectKey === 'vendors') setCurrentVendors(objectsArray);
if (objectKey === 'instruments') setCurrentInstruments(objectsArray);

// useMemo の依存配列を state に変更
const vendorIds = useMemo(() => {
  return currentVendors.map((v) => v.id).filter(Boolean);
}, [currentVendors]);  // ← state に依存するため正しく再計算される

const instrumentIds = useMemo(() => {
  return currentInstruments.map((i) => i.id).filter(Boolean);
}, [currentInstruments]);
```

また、ダイアログを開いた際の初期化時にも `currentVendors` / `currentInstruments` を `documentData` の値で初期化する。

**変更ファイル**  
- `frontend/src/components/editorv2/components/DocumentEditDialog.tsx`（state追加・handleMultiObjectDataChange修正・useMemo依存配列修正・初期化処理追加）

---

## 実装ステップ

### Phase 1: 課題1 - Creatorアイコン変更
- [ ] `DocumentEditDialog.tsx` の Creator `MultiObjectEditor` の `icon` を `"👤"` → `"⚙️"` に変更

### Phase 2: 課題2 - UUIDラベル追加
- [ ] `DocumentEditDialog.tsx` の UUID フィールドを外側 `Form.Item label="UUID"` でラップする構造に変更

### Phase 3: 課題3 - VendorRef/InstrumentRef 選択肢追加
- [ ] `MultiObjectEditor.tsx` の `SingleObjectEditorProps` の `vendorIds` / `instrumentIds` 型を `{ value: string; label: string }[]` に変更
- [ ] `MultiObjectEditor.tsx` の `MultiObjectEditorProps` も同様に変更
- [ ] `MultiObjectEditor.tsx` の Select の `options` を新しい型に対応させる
- [ ] `DocumentEditDialog.tsx` で `vendorOptions` / `instrumentOptions` を計算するロジックを実装（フォーム値 ＋ マスタデータを統合）
- [ ] `DocumentEditDialog.tsx` の `MultiObjectEditor` の props を更新

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|--------|--------|
| `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` | 課題1・2・3の修正 |
| `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` | 課題3のprops型変更・Select修正 |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| vendorIds/instrumentIds のprops型変更により他の呼び出し箇所が壊れる | 中 | 低 | `MultiObjectEditor` の呼び出し箇所を全検索して影響確認 |
| フォーム値 + マスタデータの統合で重複IDが発生 | 低 | 中 | Set で重複除去処理を実装 |

---

## 承認記録

- **計画書提示日時**: 2026-03-23 16:04
- **承認日時**: （承認時に記入）
- **承認者コメント**: 

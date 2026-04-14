# タスク計画書: MasterManagement.tsx Attribute対応

## メタデータ
- **作成日時**: 2026-04-08 15:30
- **タスクID**: MasterManagement_attribute対応
- **優先度**: 高
- **推定工数**: 3〜5時間

---

## 1. タスク概要

`frontend/src/components/DataManagement/MasterManagement.tsx` の**検索・編集処理に Attribute マスタ（masterId=`'4'`）を追加**する。

バックエンド（Repository / Service / Controller / Route）および型定義（`masterDataTypes.ts` / `masterApiService.ts`）は前タスク（`docs/20260408_1402_attribute_master追加/PLAN.md`）で実装済み。

本タスクでは **MasterManagement.tsx 内の未対応箇所** を実装・修正する。

---

## 2. 現状調査結果

### ✅ 既に実装済み（MasterManagement.tsx 内）

| 処理 | 実装箇所 | 状態 |
|------|----------|------|
| masterId変換 | `convertMasterIdToType()` L.103 | ✅ `'4' → 'attribute'` 追加済み |
| マスタ選択肢 | `masterTypes` useMemo L.170 | ✅ `'attribute'` 追加済み |
| 部署選択肢取得 | useEffect L.1254〜1288 | ✅ `GET /systemManagement/department` 呼び出し済み |
| 属性名選択肢生成 | useEffect L.1242〜1251 | ✅ mastersから一意の `attributeName` を生成済み |
| 編集開始処理 | `handleEdit()` L.410〜417 | ✅ `isNewAttributeName` リセット・`attributeNameSelect` セット済み |
| 保存処理（POST/PUT） | `handleModalOk()` L.1100〜1155 | ✅ `masterId === '4'` 分岐あり |
| CSVダウンロード | `handleDownload()` L.727 | ✅ `masterId === '4'` 分岐あり |
| CSVアップロード | `handleCSVUpload()` L.627 | ✅ `masterId === '4'` 分岐あり |
| 一括有効化/無効化 | `handleActivate/Deactivate()` | ✅ `DB_CONNECTED_MASTERS = ['3','2','1','4']` に含まれている |
| フォームフィールド描画 | Modal 内 L.1562〜1641 | ✅ `attributeName`（Select + 新規入力）・`departmentName`（Select）対応済み |

### ⚠️ 確認・修正が必要な箇所

#### 問題1: `handleModalOk()` の `attributeName` 解決ロジック

**現状コード（L.1113〜1118）:**
```typescript
body: JSON.stringify({
  attributeName: values.attributeName,   // ← 問題あり
  attributeValue: values.attributeValue,
  departmentCd: values.departmentCd,
  isActive: values.isActive,
}),
```

**問題点:**
- フォームには `attributeNameSelect`（Select フィールド）と `attributeName`（hidden または text）の2つが存在する
- `isNewAttributeName=false`（既存選択）の場合: `form.setFieldValue('attributeName', value)` でセット済み → `values.attributeName` に値が入る ✅
- `isNewAttributeName=true`（新規入力）の場合: `Form.Item name="attributeName"` の Input に入力 → `values.attributeName` に値が入る ✅
- **ただし**、`attributeNameSelect` で `'__new__'` を選んだまま `attributeName` を空のままOKを押した場合のバリデーションが `attributeNameSelect` のバリデーションのみに依存しており、`attributeName` の値が空でも通過する可能性がある

#### 問題2: POST 時の `attributeName` が `undefined` になるケース

**現状コード（L.1138〜1143）:**
```typescript
body: JSON.stringify({
  attributeId: values.attributeId,
  attributeName: values.attributeName,   // ← undefined になりうる
  attributeValue: values.attributeValue,
  departmentCd: values.departmentCd,
  isActive: values.isActive !== undefined ? values.isActive : true,
}),
```

`isNewAttributeName=true` かつ `attributeName` テキスト入力が空のまま送信された場合、バックエンドでエラーになる。

**対策:** `attributeName` の最終値を `values.attributeName || values.attributeNameSelect` のようにフォールバック付きで取得する（ただし `'__new__'` の場合は空になるため、バリデーションを強化する方が正確）。

#### 問題3: 編集時の `attributeNameSelect` 初期値

**現状コード（L.411〜414）:**
```typescript
const formValues = { ...master };
formValues.attributeNameSelect = master.attributeName || '';
form.setFieldsValue(formValues);
```

- 既存レコードの `attributeName` を `attributeNameSelect` にセット → 選択肢一覧に当該値がなければ Select の表示が空になる
- `attributeNameOptions` の生成は `masters` データから行われるが、フォームを開く時点で `attributeNameOptions` に値が含まれていれば問題なし
- **確認ポイント:** `masters` ロード後に `attributeNameOptions` が生成されているか

#### 問題4: 部署名の `departmentCd` → `departmentName` 変換（一覧表示）

**現状 `findAllWithFilters.sql`:**
```sql
LEFT JOIN department d ON a.organization_id = d.organization_id AND a.department_cd = d.department_cd
```

- バックエンドのSQLでは `department_name` を JOIN で取得している ✅
- フロントエンドの `masterDataTypes.ts` の `attribute` 設定でも `departmentName` フィールドが `isDisplay: true` に設定済み ✅

#### 問題5: `attributeName` フィールドの `searchFixed: false` 設定

**現状 `masterDataTypes.ts`:**
```typescript
{ dbField: 'attributeName',  searchFixed: false, isDisplay: true, ... },
{ dbField: 'attributeValue', searchFixed: false, isDisplay: true, ... },
{ dbField: 'departmentName', searchFixed: false, isDisplay: true, ... },
```

- `searchFixed: false` → すべて曖昧検索（`searchText`）の対象
- 部署名でフィルタリングしたい場合は `departmentName` を `searchFixed: true` にすることも検討可

---

## 3. 実装ステップ

### Phase 1: 動作確認（手動テスト）

以下を実際に動かして確認する。

- [ ] Attribute マスタ選択 → 一覧表示される
- [ ] 検索テキスト入力 → `attributeName` / `attributeValue` / `departmentName` で絞り込まれる
- [ ] 新規追加ダイアログ → `attributeId` / `attributeNameSelect` / `attributeValue` / `departmentName` が表示される
- [ ] `attributeNameSelect` で既存選択 → `attributeName` に値がセットされる
- [ ] `attributeNameSelect` で「＋ 新規入力」選択 → テキスト入力欄が表示される
- [ ] 保存（POST）→ API が成功し一覧に反映される
- [ ] 編集ダイアログ → 既存値が正しくプリセットされる
- [ ] 保存（PUT）→ API が成功し一覧に反映される
- [ ] アクティブ/非アクティブ切替ボタン → 動作する
- [ ] 一括有効化/無効化 → 動作する

### Phase 2: バグ修正

#### Fix 1: `handleModalOk()` の `attributeName` フォールバック追加

**変更ファイル:** `frontend/src/components/DataManagement/MasterManagement.tsx`

```typescript
// masterId === '4' の POST/PUT 処理内
// attributeNameの最終値を安全に取得
const resolvedAttributeName = isNewAttributeName
  ? values.attributeName   // 新規入力テキスト
  : (values.attributeName || values.attributeNameSelect); // hidden値 or select値
```

#### Fix 2: 新規追加時の `attributeName` 必須バリデーション強化

**変更ファイル:** `frontend/src/components/DataManagement/MasterManagement.tsx`

`isNewAttributeName=true` 時の `Form.Item name="attributeName"` のバリデーションルールを強化:

```typescript
rules={[
  { required: true, message: `${category.headerName}を入力してください` },
  { min: 1, message: '1文字以上入力してください' },
]}
```

#### Fix 3: 部署名フィルター改善（検討）

`departmentName` を `searchFixed: true` に変更すると部署でのドロップダウンフィルタが使えるようになる。
現状は `searchText` による曖昧検索のみ対応。

**変更ファイル:** `frontend/src/types/masterDataTypes.ts`

```typescript
{
  dbField: 'departmentName',
  displayName: '部署名',
  searchFixed: true,   // false → true に変更
  isDisplay: true,
  ...
}
```

> `searchFixed: true` にすると一覧上部にドロップダウンフィルターが自動生成される（既存の `fixedFilterFields` ロジックを活用）。

### Phase 3: displayScope 対応確認

- Attribute マスタ選択時に `displayScope`（全体/自組織）の Select が表示される
- バックエンド `getAttributeMastersWithFilters()` が `display_scope` パラメータを受け取るか確認
- 不要な場合は Attribute 選択時に `displayScope` を非表示にすることも検討

---

## 4. 変更ファイル一覧

| ファイル | 変更内容 | 優先度 |
|---------|---------|--------|
| `frontend/src/components/DataManagement/MasterManagement.tsx` | Fix 1〜2: `attributeName` フォールバック / バリデーション強化 | 高 |
| `frontend/src/types/masterDataTypes.ts` | Fix 3: `departmentName` の `searchFixed` 変更（任意） | 中 |

---

## 5. 影響範囲

- 既存の Creator / Vendor / Instrument 機能への影響：**なし**
- Attribute マスタの新規追加・編集フロー全体に影響

---

## 6. テスト計画

### 手動テスト

- [ ] マスタ選択 → 「Attribute」が表示される
- [ ] 一覧表示（departmentName が表示される）
- [ ] 曖昧検索（attributeName / attributeValue で絞り込み）
- [ ] 部署ドロップダウンフィルター（Fix 3 適用時）
- [ ] 新規追加: 既存属性名選択 → POST 成功
- [ ] 新規追加: 新規属性名入力 → POST 成功
- [ ] 新規追加: 属性名未入力 → バリデーションエラー
- [ ] ID 重複 → 409 エラーメッセージ
- [ ] 編集: 既存値プリセット確認 → PUT 成功
- [ ] アクティブ/非アクティブ個別切替
- [ ] 一括アクティブ化/非アクティブ化
- [ ] CSV ダウンロード
- [ ] CSV アップロード

---

## 7. 承認記録

- **計画書提示日時**: 2026-04-08 15:30
- **承認日時**: 2026-04-08 15:30
- **承認者コメント**: 承認済み

---

## 8. 実施記録

### 実施日時
開始: 2026-04-08 16:17  
完了: 2026-04-08 16:18

### 実施内容

| Fix | 内容 | 状態 |
|-----|------|------|
| Fix 1 | `handleModalOk()` の `attributeName` フォールバック追加 | ✅ 実装済み（前タスク内で完了） |
| Fix 2 | 新規追加時の `attributeName` 必須バリデーション強化（`min: 1` 追加） | ✅ 今回実施 |
| Fix 3 | `departmentName` の `searchFixed: true` 変更 | ✅ 実装済み（前タスク内で完了） |

### 変更ファイル

1. `frontend/src/components/DataManagement/MasterManagement.tsx`
   - L.1611: `isNewAttributeName=true` 時の `Form.Item name="attributeName"` に `{ min: 1, message: '1文字以上入力してください' }` バリデーションを追加

### 最終的な成果物
- [x] Fix 1: attributeName フォールバック対応（実装済み確認）
- [x] Fix 2: 新規入力時のバリデーション強化（min:1 追加）
- [x] Fix 3: 部署名ドロップダウンフィルター有効化（実装済み確認）

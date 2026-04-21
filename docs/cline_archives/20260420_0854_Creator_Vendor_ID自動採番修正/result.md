# 修正結果: Creator/Vendor ID自動採番の重複バグ修正

## 概要

- **対応日時**: 2026-04-20
- **対象ファイル**: `frontend/src/components/editorv2/components/MultiObjectEditor.tsx`
- **修正関数**: `handleAdd`

---

## 問題

Document編集ダイアログで Creator / Vendor / Owner / Instrument を追加する際、
「空のXxxを追加」ボタンで採番される ID が削除操作後に重複する問題が発生していた。

### 再現手順

1. Creator を 3 件追加 → ID: `creators1`, `creators2`, `creators3`
2. `creators2` を削除 → 配列: `[creators1, creators3]`（配列長 = 2）
3. 再度「空の Creator を追加」 → `objects.length + 1 = 3` → **`creators3` が重複！**

### MaiML 規約上の影響

MaiML の XML では ID 属性の一意性が必須であり、重複 ID は規約違反となる。

---

## 修正内容

### 修正箇所

`MultiObjectEditor.tsx` の `handleAdd` 関数（544行目付近）

### Before（修正前）

```typescript
const handleAdd = useCallback(() => {
  const newObject: DocumentTagData = {
    tagName: objectKey === 'creators' ? 'Creator' : ...,
    id: `${objectKey}${objects.length + 1}`,  // 配列長ベースのため削除後に重複
    uuid: '',
    name: '',
    description: '',
    annotation: ''
  };
  ...
}, [objects, objectKey, onDataChange]);
```

### After（修正後）

```typescript
const handleAdd = useCallback(() => {
  // 既存IDの末尾数値の最大値を取得し、次の連番を算出（削除後の重複防止）
  const existingNumbers = objects.map(obj => {
    const match = obj.id?.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = maxNumber + 1;

  const newObject: DocumentTagData = {
    tagName: objectKey === 'creators' ? 'Creator' : ...,
    id: `${objectKey}${nextNumber}`,  // 既存IDの最大値+1で重複しない
    uuid: '',
    name: '',
    description: '',
    annotation: ''
  };
  ...
}, [objects, objectKey, onDataChange]);
```

### 修正の考え方

| 項目 | 説明 |
|------|------|
| **修正方針** | 既存 ID の末尾数値の最大値 + 1 を次の連番として使用 |
| **空配列の場合** | `existingNumbers.length > 0` のガードにより `maxNumber = 0` → `nextNumber = 1` から開始 |
| **数値以外の ID の場合** | 正規表現 `match` が null → `0` にフォールバック（次回は `1` から開始） |

---

## 修正後の動作確認

| 操作 | Before（バグあり） | After（修正済み） |
|------|----------------|----------------|
| 3件追加 | creators1, creators2, creators3 | creators1, creators2, creators3 |
| creators2を削除 | [creators1, creators3] | [creators1, creators3] |
| 再度追加 | **creators3（重複❌）** | **creators4（重複なし✅）** |
| 全件削除後に追加 | creators1 | creators1 |

---

## 影響範囲

- **対象**: `MultiObjectEditor` コンポーネントの「空のXxxを追加」ボタン
- **適用タイプ**: Creator / Vendor / Owner / Instrument の全タイプ
- **マスタから追加**: `handleAddFromMaster` はマスタの ID をそのまま引き継ぐため影響なし

# タスク計画書: DocumentEditDialog バリデーション処理削除

## メタデータ
- **作成日時**: 2026-04-14 17:08
- **タスクID**: DocumentEditDialog-validation-removal
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`frontend/src/components/editorv2/components/DocumentEditDialog.tsx` に実装されているバリデーション処理をすべて除去する。

---

## バリデーション処理の特定

以下がファイル内に存在するバリデーション関連の処理：

### 1. `validationErrors` state（71行目）
```typescript
const [validationErrors, setValidationErrors] = useState<string[]>([]);
```

### 2. `validationTimeoutRef`（81行目）
```typescript
const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

### 3. `validateDocumentData` 関数（138〜183行目）
```typescript
const validateDocumentData = useMemo(() => (data: DocumentData): string[] => {
  const errors: string[] = [];
  // ... name, id, uuid, date, creators, vendors, owners, ID重複チェック等
  return errors;
}, []);
```

### 4. `handleMultiObjectDataChange` 内のバリデーション呼び出し（291〜299行目）
```typescript
if (validationTimeoutRef.current) {
  clearTimeout(validationTimeoutRef.current);
}
validationTimeoutRef.current = setTimeout(() => {
  const values = form.getFieldsValue(true);
  const errors = validateDocumentData(values);
  setValidationErrors(errors);
}, 500);
```

### 5. `handleFormChange` 内のバリデーション呼び出し（321〜329行目）
```typescript
if (validationTimeoutRef.current) {
  clearTimeout(validationTimeoutRef.current);
}
validationTimeoutRef.current = setTimeout(() => {
  const values = form.getFieldsValue(true);
  const errors = validateDocumentData(values);
  setValidationErrors(errors);
}, 500);
```

### 6. `handleSave` 内のバリデーション呼び出し（347〜353行目）
```typescript
const errors = validateDocumentData(documentToSave);
setValidationErrors(errors);

if (errors.length > 0) {
  message.error('バリデーションエラーがあります');
  return;
}
```

### 7. クリーンアップ useEffect（384〜390行目）
```typescript
useEffect(() => {
  return () => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
  };
}, []);
```

### 8. Formフィールドの required ルール
- `id`フィールド（474行目）: `rules={[{ required: true, message: 'Document ID は必須です' }]}`
- `name`フィールド（500行目）: `rules={[{ required: true, message: 'Name は必須です' }]}`

### 9. バリデーションエラー表示 Alert（419〜433行目）
```tsx
{validationErrors.length > 0 && (
  <Alert
    message="バリデーションエラー"
    description={...}
    type="error"
    showIcon
  />
)}
```

### 10. 保存ボタンの `disabled` 条件（410行目）
```tsx
disabled={validationErrors.length > 0}
```

### 11. ダイアログ初期化時の `setValidationErrors([])` （228行目）
```typescript
setValidationErrors([]);
```

### 12. `handleSave` 内の `form.validateFields()` （337行目）
```typescript
await form.validateFields();
```
および catch 節のエラーメッセージ（358〜360行目）
```typescript
} catch (error) {
  console.error('Validation failed:', error);
  message.error('入力内容を確認してください');
}
```

---

## 目的と期待される成果

### 目的
バリデーション処理を削除し、Document編集ダイアログで自由に保存できるようにする。

### 期待される成果
- [ ] `validateDocumentData` 関数が削除される
- [ ] `validationErrors` state が削除される
- [ ] `validationTimeoutRef` が削除される
- [ ] バリデーションエラー表示 Alert が削除される
- [ ] 保存ボタンの `disabled={validationErrors.length > 0}` が削除される
- [ ] Form フィールドの `required` ルールが削除される
- [ ] `handleSave` 内の `form.validateFields()` とcatch節のバリデーションエラー処理が削除される
- [ ] ダイアログ初期化時の `setValidationErrors([])` が削除される
- [ ] `handleMultiObjectDataChange` と `handleFormChange` 内のバリデーション呼び出しが削除される
- [ ] クリーンアップ useEffect が削除される（バリデーション専用のためこれごと削除）
- [ ] ファイルが正常にビルドできる（未使用importが残らない）

---

## 実装ステップ

### Phase 1: バリデーション関連コードの削除

- [ ] `validationErrors` state の削除（71行目）
- [ ] `validationTimeoutRef` の削除（81行目）
- [ ] `validateDocumentData` 関数全体の削除（138〜183行目）
- [ ] `handleMultiObjectDataChange` 内のバリデーション呼び出し部分の削除（291〜299行目）
- [ ] `handleFormChange` 内のバリデーション呼び出し部分の削除（321〜329行目）
- [ ] `handleSave` のバリデーション処理簡略化（337〜362行目）
  - `await form.validateFields()` の削除（try-catchごとシンプルな実装に変更）
  - `validateDocumentData(documentToSave)` 呼び出しと条件分岐の削除
  - catch節のバリデーションエラーメッセージの削除
- [ ] ダイアログ初期化 useEffect 内の `setValidationErrors([])` の削除（228行目）
- [ ] クリーンアップ useEffect の削除（384〜390行目）

### Phase 2: UI要素の削除

- [ ] バリデーションエラー表示 Alert の削除（419〜433行目）
- [ ] 保存ボタンの `disabled={validationErrors.length > 0}` の削除（410行目）
- [ ] `id`フィールドの `rules` プロパティ削除（474行目）
- [ ] `name`フィールドの `rules` プロパティ削除（500行目）

### Phase 3: 未使用import・定数の確認と削除

- [ ] `useMemo` が他で使われているか確認 → 使われていなければ import から削除
- [ ] `useRef` が他で使われているか確認 → 使われていなければ import から削除
- [ ] ヒント Alert の文言見直し（「Creator、Vendor、Ownerは最低1件必要です」の記述はそのまま残すか確認）

---

## 変更ファイル

1. `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` - バリデーション処理の削除

---

## 影響範囲

- バリデーションが無くなるため、Document IDやName未入力のまま保存できるようになる
- Creator/Vendor/Ownerが0件でも保存できるようになる
- 重複IDチェックが無くなる
- 保存ボタンは常に活性状態になる

---

## リスク

| リスク | 対策 |
|--------|------|
| `useMemo` / `useRef` の削除忘れによるビルドエラー | 削除後にimport文を確認する |
| `validateDocumentData` の `useMemo` 依存配列が他の箇所で参照されていた場合のエラー | 削除前にsearch_filesで参照箇所を確認 |

---

## 承認記録

- **計画書提示日時**: 2026-04-14 17:08
- **承認日時**: （承認後に記入）

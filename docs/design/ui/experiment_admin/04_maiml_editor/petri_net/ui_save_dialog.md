# SaveDialog UI仕様書

## 1. 概要

Draft名と説明を入力してペトリネットを保存するダイアログコンポーネント。

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/SaveDialog.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| open | boolean | ✓ | Modal表示状態 |
| onClose | () => void | ✓ | Modalを閉じる |
| onSave | (data) => void | ✓ | 保存処理 |
| isLoading | boolean | | 保存中フラグ |
| error | string | | エラーメッセージ |
| initialName | string | | Draft名初期値 |
| initialDescription | string | | 説明初期値 |

**SaveData型:**
```typescript
interface SaveData {
  name: string;        // Draft名
  description: string; // 説明
}
```

---

## 4. レイアウト

```
┌─────────────────────────────────────┐
│ ペトリネットを保存          [×]    │
├─────────────────────────────────────┤
│ Draft名 *                           │
│ [例: 材料合成プロセス]              │
│ ペトリネットの名前を入力してください│
│                                     │
│ 説明                                │
│ ┌─────────────────────────────────┐ │
│ │例: このプロセスは材料A、B、C... │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ ペトリネットの説明（オプション）    │
│                                     │
│        [キャンセル] [💾 保存]       │
└─────────────────────────────────────┘
```

---

## 5. 主要機能

### 5.1. 保存処理

**バリデーション:**
- Draft名: 必須、100文字以内、空白のみ不可
- 説明: オプション

**処理フロー:**
1. フォームバリデーション
2. trim()で前後の空白除去
3. onSave({name, description})実行

### 5.2. 初期値設定

**useEffect:**
- openがtrueになった時、form.setFieldsValue()で初期値設定

---

## 6. 使用コンポーネント

### 6.1. Ant Design

- Modal, Input, TextArea, Button, Alert, Spin, Space, Form

### 6.2. アイコン

- SaveOutlined

---

## 7. バリデーション

```typescript
rules={[
  { required: true, message: 'Draft名は必須です' },
  { max: 100, message: 'Draft名は100文字以内にしてください' },
  {
    validator: (_, value) => {
      if (value && value.trim() === '') {
        return Promise.reject('Draft名は必須です');
      }
      return Promise.resolve();
    },
  },
]}
```

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2026-01-29 | Ant Design変換版 | Development Team |
| 2.1.0 | 2026-02-19 | UI仕様書作成 | Cline |

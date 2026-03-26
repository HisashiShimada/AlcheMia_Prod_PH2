# dissolution 調査結果

**調査日時**: 2026-03-24  
**調査対象**: `dissolution` キーワードの出現箇所（reference版・現行版）

---

## サマリー

| 対象 | ファイル数 | 出現箇所 |
|------|-----------|---------|
| **reference版** | 1ファイル | `HelperComponents.js` 内に5箇所 |
| **現行版** | 0ファイル | 未実装（対応コードなし） |

---

## reference版の出現箇所

### ファイル

```
frontend/src/reference/components/ExperimentRecorder/components/HelperComponents.js
```

### 概要

`HelperComponents.js` は実験データ入力コンポーネント群を定義するファイル。  
`PropertyInput` コンポーネント内の **バリデーションロジック** に `dissolution` が使われている。

### 実装の位置と内容

`PropertyInput` コンポーネントの `getInputConfig()` 関数内で、  
`doubleType` と `floatType` のバリデーター（validator）に以下の処理が追加されている（**No.25対応**）。

#### 1. `doubleType` バリデーター内（1箇所）

```javascript
// 🆕 No.25対応: dissolution等の範囲チェック（0-100）
const lowerKey = propertyKey.toLowerCase();
if (lowerKey.includes('dissolution') || lowerKey.includes('溶解率')) {
  if (num < 0 || num > 100) {
    return {
      isValid: true, // 入力自体は有効だが警告を表示
      error: '',
      warning: `⚠️ 異常値: ${num}（通常は0〜100の範囲です）`
    };
  }
}
```

#### 2. `floatType` バリデーター内（1箇所）

`doubleType` と同じロジックを `floatType` にも適用。

```javascript
// 🆕 No.25対応: dissolution等の範囲チェック（0-100）
const lowerKey = propertyKey.toLowerCase();
if (lowerKey.includes('dissolution') || lowerKey.includes('溶解率')) {
  if (num < 0 || num > 100) {
    return {
      isValid: true, // 入力自体は有効だが警告を表示
      error: '',
      warning: `⚠️ 異常値: ${num}（通常は0〜100の範囲です）`
    };
  }
}
```

#### 3. 警告表示 UI（1箇所）

`PropertyInput` コンポーネントのレンダリング部分で、警告を `Alert` として表示：

```jsx
{/* 🆕 No.25対応: dissolution異常値警告表示 */}
{validationWarning && (
  <Alert severity="warning" sx={{ mt: 1 }}>
    {validationWarning}
  </Alert>
)}
```

### バリデーションの仕組み（フロー）

```
PropertyInput コンポーネント
  ↓
  getInputConfig(property.type, property.key)
    ├─ doubleType の validator(val)
    │    ├─ 数値として有効か判定
    │    └─ propertyKey に 'dissolution' or '溶解率' が含まれる場合
    │         └─ 0〜100 の範囲外 → warning を返す（エラーではなく警告）
    └─ floatType の validator(val)  ← 同じロジック
  ↓
  useEffect / handleChange でリアルタイムバリデーション実行
  ↓
  validationWarning が設定される
  ↓
  <Alert severity="warning"> で画面に表示
```

### 判定条件

| 条件 | 内容 |
|------|------|
| 対象プロパティキー | `propertyKey.toLowerCase()` に `'dissolution'` または `'溶解率'` を含む |
| 対象データ型 | `doubleType`, `floatType` |
| 異常値の判定 | `num < 0` または `num > 100` |
| バリデーション結果 | `isValid: true`（入力はブロックしない）、`warning` にメッセージを設定 |

### 注意点

- **入力をブロックしない設計**: `-0.01` などの異常値が入力されても `isValid: true` のまま。
  警告表示のみで、保存自体は可能。
- **大文字小文字を区別しない**: `toLowerCase()` を使用しているため、
  `Dissolution`, `DISSOLUTION` なども検知対象。
- **日本語対応**: `溶解率` も対象キーワードに含まれている。

---

## 現行版の状況

### 検索結果

| 拡張子 | 対象ディレクトリ | dissolution 件数 |
|--------|----------------|----------------|
| `.ts`  | `frontend/src/` | 0件 |
| `.tsx` | `frontend/src/` | 0件 |
| `.ts`  | `backend/src/`  | 0件 |
| `.md`  | `docs/`         | 0件 |

### 現行版の対応ファイル

reference版の `HelperComponents.js` → `PropertyInput` コンポーネントに相当するのは：

```
frontend/src/components/ExperimentWorker/DataRecordDialog.tsx
```

の `renderPropertyInput()` 関数内。

### 現行版の `floatType` 入力（バリデーションなし）

```tsx
case 'floatType':
  return (
    <Form.Item key={key} name={key} label={label} extra={descriptionExtra} rules={rules}>
      <InputNumber
        style={{ width: '100%' }}
        placeholder={`${property.label}を入力`}
        min={property.min}
        max={property.max}
        step={precisionFromFormat !== undefined ? Math.pow(10, -precisionFromFormat) : 0.01}
        precision={precisionFromFormat ?? 2}
        disabled={!isProjectEditable}
      />
    </Form.Item>
  );
```

**`dissolution` の範囲チェック（0〜100）は実装されていない。**  
`property.min` / `property.max` がテンプレートで設定されていない限り、制限なしに入力できる。

---

## reference版と現行版の対応関係

| reference版 | 現行版 | dissolution対応 |
|-------------|--------|----------------|
| `HelperComponents.js` → `PropertyInput` | `DataRecordDialog.tsx` → `renderPropertyInput()` | **現行版は未実装** |
| `MobileDataInput.js` | `DataRecordDialog.tsx` | 全体的に移植・再設計済み |

---

## 課題の整理

### 課題

> reference版にて `dissolution` に `-0.01` などの異常値が入るという課題

### 原因（reference版）

`HelperComponents.js` の実装では、`dissolution` を含むプロパティに対して  
**警告は表示するが入力をブロックしない**設計になっている。

```javascript
return {
  isValid: true,   // ← ブロックしない
  error: '',
  warning: `⚠️ 異常値: ${num}（通常は0〜100の範囲です）`
};
```

そのため、ユーザーが警告を無視して `-0.01` を保存することが可能。

### 現行版の状況

現行版（`DataRecordDialog.tsx`）には `dissolution` の範囲チェック自体が**未実装**。  
reference版の No.25 対応が現行版に移植されていない状態。

---

## 関連ファイル一覧

### reference版

| ファイルパス | 役割 | dissolution関連 |
|------------|------|----------------|
| `frontend/src/reference/components/ExperimentRecorder/components/HelperComponents.js` | プロパティ入力UIコンポーネント | バリデーションロジック（警告表示）を実装 |
| `frontend/src/reference/components/ExperimentRecorder/components/MobileDataInput.js` | データ入力メインコンポーネント | `PropertyInput` を呼び出す（間接的に関係） |

### 現行版

| ファイルパス | 役割 | dissolution関連 |
|------------|------|----------------|
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | データ記録ダイアログ | dissolution チェックなし（未実装） |

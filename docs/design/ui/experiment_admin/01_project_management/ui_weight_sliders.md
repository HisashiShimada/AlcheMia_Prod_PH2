# WeightSliders - 4軸重みスライダーコンポーネント

## 1. 概要

### 1.1 コンポーネントの目的
セマンティック検索の4軸（入力条件・手順・出力・構造）の重みをスライダーで調整するUIコンポーネント。プリセットボタンで推奨バランスを即座に適用できる。

### 1.2 使用場面
- TransitionSetSearchModal の「詳細な重み調整」折りたたみ内に配置

---

## 2. 画面構成

```
┌──────────────────────────────────────────────────┐
│ 🎚️ 検索重み設定              [デフォルト ↺]      │
│                                                  │
│ プリセット                                       │
│ [構造重視] [手順重視] [入力重視]                │
│ [出力重視] [バランス] [...]                      │
│                                                  │
│ 合計: [100%]                                     │
│                                                  │
│ 📥 入力条件 [────────●──] 25%                   │
│ ⚡ 手順     [────────●──] 25%                   │
│ 📤 出力     [────────●──] 25%                   │
│ 🕸️ 構造    [────────●──] 25%                   │
│                                                  │
│ 💡 スライダーを調整すると自動的に重みが変更...   │
└──────────────────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 ヘッダー
- タイトル: "🎚️ 検索重み設定"
- デフォルトボタン（右寄せ）: `<ReloadOutlined />` + "デフォルト"

#### 2.2.2 プリセットボタン
各プリセットに Tooltip で説明を表示。選択中のプリセットは `type="primary"` で強調表示。

| プリセットキー | 名称 |
|---|---|
| structureFocused | 構造重視 |
| procedureFocused | 手順重視 |
| inputFocused | 入力重視 |
| outputFocused | 出力重視 |
| balanced | バランス |

#### 2.2.3 合計表示
- 合計が 100% の場合: `color="success"` の Tag
- 合計が 100% 以外の場合: `color="warning"` の Tag

#### 2.2.4 軸スライダー

| 軸 | ラベル |
|----|--------|
| input | 📥 入力条件 |
| transition | ⚡ 手順 |
| output | 📤 出力 |
| structure | 🕸️ 構造 |

- スライダー: min=0, max=100, step=5
- 右端に現在値（%）を表示

---

## 3. 機能仕様

### 3.1 スライダー操作

```typescript
const handleAxisChange = (axis: keyof SearchWeights, value: number) => {
  onChange({ ...weights, [axis]: value / 100 });
  setActivePreset(null);  // プリセット選択を解除
};
```

### 3.2 プリセット適用

```typescript
const handlePresetClick = (presetKey: string) => {
  const preset = WEIGHT_PRESETS[presetKey];
  if (preset) {
    onChange(preset.weights);
    setActivePreset(presetKey);
  }
};
```

### 3.3 デフォルトリセット

```typescript
const handleReset = () => {
  onChange(DEFAULT_WEIGHTS);  // 各軸0.25
  setActivePreset('balanced');
};
```

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface WeightSlidersProps {
  weights: SearchWeights;
  onChange: (weights: SearchWeights) => void;
  disabled?: boolean;
}
```

### 4.2 DEFAULT_WEIGHTS

```typescript
const DEFAULT_WEIGHTS: SearchWeights = {
  input: 0.25,
  transition: 0.25,
  output: 0.25,
  structure: 0.25,
};
```

---

## 5. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-03-06 | 1.0.0 | 初版作成 | Cline |

# 4軸重みスライダー UI仕様書

## 概要

### 目的
セマンティック検索の4軸（入力条件・手順・出力・構造）の重みをスライダーで調整するUIコンポーネント。プリセットボタンで推奨バランスを適用できる。

### 使用場面
- TransitionSetSearchModal内の「詳細な重み調整」折りたたみパネル
- 検索時の4軸の重み調整
- プリセット選択による推奨バランスの適用

### アクセス権限
- **Experiment Admin（実験管理者）**: 重み調整の実行
- **その他のロール**: アクセス不可

---

## 画面構成

### レイアウト構造

```
┌────────────────────────────────────────────────┐
│ 🎚️ 検索重み設定              [デフォルト]    │
├────────────────────────────────────────────────┤
│ プリセット                                     │
│ [構造重視] [手順重視] [入力重視]             │
│ [出力重視] [バランス]  [その他...]            │
├────────────────────────────────────────────────┤
│ [合計: 100%]                                   │
├────────────────────────────────────────────────┤
│ 📥 入力条件  [━━━━━━━━━━━]  25%              │
│ ⚡ 手順      [━━━━━━━━━━━]  25%              │
│ 📤 出力      [━━━━━━━━━━━]  25%              │
│ 🕸️ 構造      [━━━━━━━━━━━]  25%              │
├────────────────────────────────────────────────┤
│ 💡 スライダーを調整すると自動的に重みが変更... │
└────────────────────────────────────────────────┘
```

### UI要素

#### 1. ヘッダー
- **左側**: 🎚️ + 「検索重み設定」（12px、太字）
- **右側**: デフォルトボタン（`ReloadOutlined`アイコン、12px）

#### 2. プリセットボタン
- **ラベル**: 「プリセット」（11px、グレー）
- **ボタンレイアウト**: Grid（xs: 12、sm: 8）
- **ボタンサイズ**: small、11px
- **ツールチップ**: プリセットの説明
- **アクティブ状態**: primaryタイプ（青色）

#### 3. 合計表示
- **タグ**: 「合計: {totalPercent}%」
- **色**:
  - 100%: success（緑）
  - その他: warning（オレンジ）

#### 4. 各軸スライダー
| 列 | 幅 | 内容 |
|----|-----|------|
| 1列目 | 8/24 | 軸ラベル（12px） |
| 2列目 | 12/24 | スライダー（0-100、5%刻み） |
| 3列目 | 4/24 | パーセント表示（12px） |

#### 5. ヒントカード
- **背景色**: `#f0f5ff`（淡い青）
- **ボーダー**: `1px solid #adc6ff`
- **内容**: 💡 + 使い方の説明（11px、グレー）

---

## 機能仕様

### Props定義

```typescript
interface WeightSlidersProps {
  weights: SearchWeights;              // 現在の重み
  onChange: (weights: SearchWeights) => void; // 重み変更ハンドラー
  disabled?: boolean;                  // 非活性状態
}
```

### State管理

```typescript
// アクティブなプリセットキー
const [activePreset, setActivePreset] = useState<string | null>(null);
```

### 主要機能

#### 1. 軸の重みを変更

```typescript
const handleAxisChange = (axis: keyof SearchWeights, value: number) => {
  onChange({ ...weights, [axis]: value / 100 });
  setActivePreset(null);
};
```

**動作**:
- スライダーの値（0-100）を0-1の範囲に変換（`value / 100`）
- 該当軸の重みを更新
- アクティブプリセットをクリア（手動調整のため）

#### 2. プリセットを適用

```typescript
const handlePresetClick = (presetKey: string) => {
  const preset = WEIGHT_PRESETS[presetKey];
  if (preset) {
    onChange(preset.weights);
    setActivePreset(presetKey);
  }
};
```

**動作**:
- プリセットキーから重み設定を取得
- `onChange`で親コンポーネントに通知
- アクティブプリセットを設定（ボタンがプライマリ色に変化）

#### 3. デフォルトにリセット

```typescript
const handleReset = () => {
  onChange(DEFAULT_WEIGHTS);
  setActivePreset('balanced');
};
```

**動作**:
- デフォルト重み（各軸25%）を適用
- アクティブプリセットを「balanced」に設定

#### 4. 合計パーセントの計算

```typescript
const total = Object.values(weights).reduce((sum, v) => sum + v, 0);
const totalPercent = Math.round(total * 100);
```

**表示**:
- 合計が100%の場合: 緑色のタグ
- 合計が100%以外の場合: オレンジ色のタグ

---

## データ型定義

### SearchWeights

```typescript
interface SearchWeights {
  input: number;                       // 入力条件の重み（0-1）
  transition: number;                  // 手順の重み（0-1）
  output: number;                      // 出力の重み（0-1）
  structure: number;                   // 構造の重み（0-1）
}
```

### 軸ラベル

```typescript
const AXIS_LABELS: Record<keyof SearchWeights, string> = {
  input: '📥 入力条件',
  transition: '⚡ 手順',
  output: '📤 出力',
  structure: '🕸️ 構造',
};
```

### プリセット定義（WEIGHT_PRESETS）

**構造**:
```typescript
{
  [presetKey: string]: {
    name: string;                      // プリセット名
    description: string;               // プリセットの説明（ツールチップ）
    weights: SearchWeights;            // 重み設定
  }
}
```

**プリセット例**:
| キー | 名前 | 説明 | 重み |
|------|------|------|------|
| structureFocused | 構造重視 | 実験構造に重点を置いた検索 | input:15%, transition:20%, output:15%, structure:50% |
| procedureFocused | 手順重視 | 実験手順に重点を置いた検索 | input:15%, transition:50%, output:20%, structure:15% |
| inputFocused | 入力重視 | 入力条件に重点を置いた検索 | input:50%, transition:20%, output:15%, structure:15% |
| outputFocused | 出力重視 | 出力結果に重点を置いた検索 | input:15%, transition:20%, output:50%, structure:15% |
| balanced | バランス | 全軸を均等に評価 | input:25%, transition:25%, output:25%, structure:25% |

### デフォルト重み（DEFAULT_WEIGHTS）

```typescript
const DEFAULT_WEIGHTS: SearchWeights = {
  input: 0.25,
  transition: 0.25,
  output: 0.25,
  structure: 0.25,
};
```

---

## スライダー仕様

### スライダー設定

```typescript
<Slider
  min={0}
  max={100}
  step={5}
  value={Math.round(weights[axis] * 100)}
  onChange={(val) => handleAxisChange(axis, val)}
  disabled={disabled}
/>
```

**設定**:
- **最小値**: 0%
- **最大値**: 100%
- **刻み**: 5%
- **値**: 0-1の範囲を0-100に変換して表示
- **非活性**: `disabled`プロパティに従う

---

## 特記事項

### アクティブプリセットの表示

**状態**:
```typescript
const [activePreset, setActivePreset] = useState<string | null>(null);
```

**表示ロジック**:
```typescript
type={activePreset === key ? 'primary' : 'default'}
```

- アクティブプリセット: primaryタイプ（青色）
- その他のプリセット: defaultタイプ（白色）

### 手動調整時の動作

**スライダーを手動で調整した場合**:
```typescript
setActivePreset(null);
```

- アクティブプリセットをクリア
- すべてのプリセットボタンがdefaultタイプに戻る
- 手動調整したことを明示

### 合計パーセントの警告

**合計が100%以外の場合**:
- オレンジ色のタグで表示
- ユーザーに調整が必要であることを警告

**合計が100%の場合**:
- 緑色のタグで表示
- 正しいバランスであることを示す

### プリセットボタンのレイアウト

**レスポンシブ対応**:
```typescript
<Col xs={12} sm={8}>
```

- **xs（モバイル）**: 1行に2列
- **sm以上（タブレット・デスクトップ）**: 1行に3列

### ツールチップ

**プリセットボタン**:
```typescript
<Tooltip title={preset.description}>
```

- プリセットの説明をツールチップで表示
- ホバー時に表示

---

## 使用例

### 親コンポーネントでの使用

```typescript
const [weights, setWeights] = useState<SearchWeights>(DEFAULT_WEIGHTS);

<WeightSliders
  weights={weights}
  onChange={setWeights}
  disabled={loading}
/>
```

**動作**:
1. ユーザーがスライダーを調整
2. `onChange(newWeights)`が呼ばれる
3. 親コンポーネントのstateが更新
4. 検索時に更新された重みを使用

---

## 実装ファイル情報

### パス
```
frontend/src/components/TransitionSetSearch/WeightSliders.tsx
```

### 主要な依存パッケージ
- `antd`: UI コンポーネント（Slider, Typography, Space, Button, Row, Col, Tag, Tooltip）
- `@ant-design/icons`: アイコン（ReloadOutlined）
- `react`: React本体（useState）

### Hooks
- `useSemanticSearch`: プリセット定義とデフォルト重みを提供

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.0 | 2026-03-11 | 実装ベースで仕様書を新規作成（実装ファイル: WeightSliders.tsx） | Cline |

---

## 関連ドキュメント

- [TransitionSet検索モーダル](ui_transition_set_search_modal.md)
- [検索結果一覧](ui_transition_search_results.md)
- [プロジェクト管理画面](ui_project_management.md)

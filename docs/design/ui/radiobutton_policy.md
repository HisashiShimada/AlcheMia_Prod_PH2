# ラジオボタン形状ポリシー

## 標準3パターン

### パターン1: 垂直レイアウト（デフォルト）
**用途**: 2〜4個程度の選択肢、各選択肢に説明が必要な場合

- レイアウト: 垂直（縦並び）
- 間隔: `token.marginXS` (8px)
- ラジオボタンサイズ: 16px
- テキストフォントサイズ: `token.fontSize` (14px)
- 最小高さ: 32px（1選択肢あたり）
- パディング: なし（Radio.Groupはpaddingなし）
- 幅: 親要素に合わせる

**実装例:**
```tsx
<Radio.Group
  value={selectedValue}
  onChange={(e) => setSelectedValue(e.target.value)}
  style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
>
  <Radio value="option1">選択肢1</Radio>
  <Radio value="option2">選択肢2</Radio>
  <Radio value="option3">選択肢3</Radio>
</Radio.Group>
```

---

### パターン2: 水平レイアウト（コンパクト）
**用途**: 2〜3個程度の短い選択肢、横幅に余裕がある場合

- レイアウト: 水平（横並び）
- 間隔: `token.margin` (16px)
- ラジオボタンサイズ: 16px
- テキストフォントサイズ: `token.fontSize` (14px)
- 高さ: 32px
- パディング: なし（Radio.Groupはpaddingなし）
- 幅: コンテンツに合わせる（auto）

**実装例:**
```tsx
<Radio.Group
  value={selectedValue}
  onChange={(e) => setSelectedValue(e.target.value)}
>
  <Radio value="yes">はい</Radio>
  <Radio value="no">いいえ</Radio>
</Radio.Group>
```

---

### パターン3: ボタンスタイル（強調表示）
**用途**: 視認性を高めたい重要な選択、2〜5個程度の選択肢

- レイアウト: 水平（横並び）
- 間隔: 0px（ボタンが連結）
- ボタン高さ: `token.controlHeight` (32px)
- ボタン最小幅: 80px
- テキストフォントサイズ: `token.fontSize` (14px)
- ボーダーラジアス: 左端・右端のみ `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (11px)
- 幅: コンテンツに合わせる（auto）

**実装例:**
```tsx
<Radio.Group
  value={selectedValue}
  onChange={(e) => setSelectedValue(e.target.value)}
  optionType="button"
  buttonStyle="solid"
>
  <Radio.Button value="option1">選択肢1</Radio.Button>
  <Radio.Button value="option2">選択肢2</Radio.Button>
  <Radio.Button value="option3">選択肢3</Radio.Button>
</Radio.Group>
```

---

## 共通仕様（全パターン）

### 色定義

#### パターン1・2（通常ラジオボタン）

**通常（未選択）**
- ラジオボタン外枠: `token.colorBorder` (rgba(0,0,0,0.12))
- ラジオボタン内側: `transparent`
- 背景色: `transparent`
- テキスト色: `token.colorText` (#212121)

**ホバー（未選択）**
- ラジオボタン外枠: `token.colorPrimary` (#CF0027)
- ラジオボタン内側: `transparent`
- 背景色: `transparent`
- テキスト色: `token.colorText` (#212121)

**選択済み**
- ラジオボタン外枠: `token.colorPrimary` (#CF0027)
- ラジオボタン内側: `token.colorPrimary` (#CF0027)
- 背景色: `transparent`
- テキスト色: `token.colorText` (#212121)

**無効（未選択）**
- ラジオボタン外枠: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- ラジオボタン内側: `transparent`
- 背景色: `transparent`
- テキスト色: `token.colorTextDisabled` (#bdbdbd)

**無効（選択済み）**
- ラジオボタン外枠: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- ラジオボタン内側: `token.colorTextDisabled` (#bdbdbd)
- 背景色: `transparent`
- テキスト色: `token.colorTextDisabled` (#bdbdbd)

#### パターン3（ボタンスタイル）

**通常（未選択）**
- ボーダー色: `token.colorBorder` (rgba(0,0,0,0.12))
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

**ホバー（未選択）**
- ボーダー色: `token.colorPrimaryHover` (#E63946)
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorPrimaryHover` (#E63946)

**選択済み（buttonStyle="solid"）**
- ボーダー色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorPrimary` (#CF0027)
- テキスト色: `#ffffff`

**選択済み（buttonStyle="outline"）**
- ボーダー色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorPrimary` (#CF0027)

**無効（未選択）**
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- 背景色: `token.colorBgContainerDisabled` (#f5f5f5)
- テキスト色: `token.colorTextDisabled` (#bdbdbd)

**無効（選択済み）**
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- 背景色: `token.colorBgContainerDisabled` (#f5f5f5)
- テキスト色: `token.colorTextDisabled` (#bdbdbd)

### アニメーション
- ホバー時のトランジション: `0.2s ease-out`
- 選択時のトランジション: `0.2s ease-in-out`
- ボタンスタイルのホバー: `0.2s ease-out`

### アクセシビリティ
- フォーカス表示: `token.colorPrimary`の2pxアウトライン
- キーボード操作: 上下矢印キー（垂直）、左右矢印キー（水平・ボタン）
- スクリーンリーダー: 自動的にARIA属性が付与される
- ラベル: 必ず明確なラベルテキストを設定

---

## パターン選択ガイドライン

### パターン1（垂直レイアウト）を使用する場合
- ✅ 選択肢が2〜4個程度
- ✅ 各選択肢に説明文が必要
- ✅ 選択肢のテキストが長い（15文字以上）
- ✅ 縦スペースに余裕がある
- ✅ アイコン付きの選択肢を使用する

**使用例:**
- 実験条件の選択（「全て同一条件で実施」「実験ごとに条件を変更」）
- 指示対象の選択（「ファイル全体」「特定トランジション」）
- データ処理方法の選択

---

### パターン2（水平レイアウト）を使用する場合
- ✅ 選択肢が2〜3個程度
- ✅ 選択肢のテキストが短い（10文字以内）
- ✅ 横スペースに余裕がある
- ✅ コンパクトな表示が必要

**使用例:**
- Yes/No選択
- 性別選択（男性・女性・その他）
- 公開/非公開の切り替え
- 有効/無効の選択

---

### パターン3（ボタンスタイル）を使用する場合
- ✅ 選択肢が2〜5個程度
- ✅ 視認性を高めたい重要な選択
- ✅ 選択肢のテキストが短い（10文字以内）
- ✅ UI上で強調したい操作

**使用例:**
- 表示モード切り替え（リスト/グリッド/カード）
- 期間選択（日/週/月/年）
- サイズ選択（S/M/L/XL）
- 優先度選択（低/中/高）

---

## レイアウト補足

### 垂直レイアウトでのアイコン使用
```tsx
<Radio.Group
  value={targetType}
  onChange={(e) => setTargetType(e.target.value)}
  style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
>
  <Radio value="file">
    <FileTextOutlined /> ファイル全体
  </Radio>
  <Radio value="transition">
    <AimOutlined /> 特定トランジション
  </Radio>
</Radio.Group>
```

### 水平レイアウトでの間隔調整
```tsx
<Radio.Group
  value={value}
  onChange={(e) => setValue(e.target.value)}
  style={{ display: 'flex', gap: token.margin }}
>
  <Radio value="yes">はい</Radio>
  <Radio value="no">いいえ</Radio>
</Radio.Group>
```

### ボタンスタイルのサイズ指定
```tsx
<Radio.Group
  value={size}
  onChange={(e) => setSize(e.target.value)}
  optionType="button"
  buttonStyle="solid"
  size="middle" // small | middle | large
>
  <Radio.Button value="small">小</Radio.Button>
  <Radio.Button value="medium">中</Radio.Button>
  <Radio.Button value="large">大</Radio.Button>
</Radio.Group>
```

---

## 使用禁止パターン

### ❌ 避けるべきパターン

1. **選択肢が多すぎる（6個以上）**
   - 理由: 視認性が悪化し、選択が困難になる
   - 代替: Select（ドロップダウン）を使用

2. **選択肢のテキストが不統一**
   - 理由: UIの一貫性が損なわれる
   - 例: 「はい」「いいえ」「わからない」「未回答」など長さが異なる

3. **垂直と水平の混在**
   - 理由: レイアウトが不統一になる
   - 対策: 同一画面内では同じレイアウトを使用

4. **ボタンスタイルでの長いテキスト**
   - 理由: ボタンが不自然に横長になる
   - 対策: テキストを短くするか、通常のラジオボタンを使用

5. **必須選択なのにデフォルト値なし**
   - 理由: ユーザーが選択を忘れる可能性がある
   - 対策: 最も一般的な選択肢をデフォルト値として設定

---

## 実装時の注意点

### Radio.Groupの必須属性
```tsx
<Radio.Group
  value={selectedValue}           // 必須: 選択中の値
  onChange={(e) => handleChange(e.target.value)} // 必須: 変更ハンドラ
>
  <Radio value="option1">選択肢1</Radio>
</Radio.Group>
```

### disabled状態の設定
```tsx
// グループ全体を無効化
<Radio.Group disabled={true}>
  <Radio value="option1">選択肢1</Radio>
  <Radio value="option2">選択肢2</Radio>
</Radio.Group>

// 個別のラジオボタンを無効化
<Radio.Group value={value}>
  <Radio value="option1">選択肢1</Radio>
  <Radio value="option2" disabled>選択肢2（無効）</Radio>
</Radio.Group>
```

### 動的な選択肢の生成
```tsx
const options = [
  { value: 'option1', label: '選択肢1' },
  { value: 'option2', label: '選択肢2' },
  { value: 'option3', label: '選択肢3' },
];

<Radio.Group value={value}>
  {options.map(option => (
    <Radio key={option.value} value={option.value}>
      {option.label}
    </Radio>
  ))}
</Radio.Group>
```

---

## バリデーション

### 必須チェック
```tsx
// フォーム送信時のバリデーション例
const handleSubmit = () => {
  if (!selectedValue) {
    message.warning('選択肢を選んでください');
    return;
  }
  // 送信処理
};
```

### Ant Design Formとの統合
```tsx
<Form.Item
  name="condition"
  label="実験条件"
  rules={[{ required: true, message: '実験条件を選択してください' }]}
>
  <Radio.Group>
    <Radio value="same">全て同一条件で実施</Radio>
    <Radio value="different">実験ごとに条件を変更</Radio>
  </Radio.Group>
</Form.Item>
```

---

## プロジェクト内の使用例

### 実験条件の選択（InstructionDialog.tsx）
```tsx
<Radio.Group
  value={experimentCondition}
  onChange={(e) => setExperimentCondition(e.target.value)}
  disabled={submitting}
  style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
>
  <Radio value="same">全て同一条件で実施</Radio>
  <Radio value="different">実験ごとに条件を変更</Radio>
</Radio.Group>
```
- **パターン**: パターン1（垂直レイアウト）
- **理由**: 2つの選択肢で、各選択肢のテキストが長いため

### 指示対象の選択（InstructionDialog.tsx）
```tsx
<Radio.Group
  value={instruction.targetType}
  onChange={(e) => handleUpdateInstruction(instruction.id, 'targetType', e.target.value)}
  disabled={submitting}
>
  <Radio value={TARGET_TYPES.FILE}>
    <FileTextOutlined /> ファイル全体
  </Radio>
  <Radio value={TARGET_TYPES.TRANSITION} disabled={availableTransitions.length === 0}>
    <AimOutlined /> 特定トランジション
  </Radio>
</Radio.Group>
```
- **パターン**: パターン1（垂直レイアウト）+ アイコン
- **理由**: アイコン付きの選択肢で、視認性を高めるため
- **特徴**: 条件によって個別のRadioを無効化

---

## まとめ

### DO（推奨）
✅ 選択肢が2〜5個程度の場合にラジオボタンを使用する
✅ 明確で統一されたラベルテキストを使用する
✅ デフォルト値を設定する（推奨される選択肢がある場合）
✅ 垂直レイアウトには適切な間隔（8px）を設定する
✅ アイコンを使って視認性を高める（必要に応じて）
✅ disabled状態を適切に使用する
✅ 重要な選択にはボタンスタイルを使用する

### DON'T（非推奨）
❌ 6個以上の選択肢でラジオボタンを使用しない
❌ 垂直と水平のレイアウトを同一画面内で混在させない
❌ 選択肢のテキストを不統一にしない
❌ ボタンスタイルで長いテキストを使用しない
❌ デフォルト値なしで必須選択にしない
❌ ラベルなしのラジオボタンを作成しない
❌ アクセシビリティを無視しない

# チェックボックス形状ポリシー

## 標準3パターン

### パターン1: 単一チェックボックス
**用途**: 単独の設定項目、オプション選択

- レイアウト: 単独配置
- チェックボックスサイズ: 16px
- テキストフォントサイズ: `token.fontSize` (14px)
- 最小高さ: 32px
- テキストとの間隔: 8px
- パディング: なし
- 幅: コンテンツに合わせる（auto）

**実装例:**
```tsx
<Checkbox
  checked={preserveFolderStructure}
  onChange={(e) => setPreserveFolderStructure(e.target.checked)}
>
  フォルダ構造を保持する
</Checkbox>
```

---

### パターン2: 垂直レイアウト（チェックボックスグループ）
**用途**: 3個以上の複数選択項目、各項目に説明が必要な場合

- レイアウト: 垂直（縦並び）
- 間隔: `token.marginXS` (8px)
- チェックボックスサイズ: 16px
- テキストフォントサイズ: `token.fontSize` (14px)
- 最小高さ: 32px（1項目あたり）
- パディング: なし（Checkbox.Groupはpaddingなし）
- 幅: 親要素に合わせる

**実装例:**
```tsx
<Checkbox.Group
  value={selectedOptions}
  onChange={(checkedValues) => setSelectedOptions(checkedValues)}
  style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
>
  <Checkbox value="option1">選択肢1</Checkbox>
  <Checkbox value="option2">選択肢2</Checkbox>
  <Checkbox value="option3">選択肢3</Checkbox>
  <Checkbox value="option4">選択肢4</Checkbox>
</Checkbox.Group>
```

---

### パターン3: 水平レイアウト（コンパクト）
**用途**: 2〜3個の短い選択肢、横幅に余裕がある場合

- レイアウト: 水平（横並び）
- 間隔: `token.margin` (16px)
- チェックボックスサイズ: 16px
- テキストフォントサイズ: `token.fontSize` (14px)
- 高さ: 32px
- パディング: なし（Checkbox.Groupはpaddingなし）
- 幅: コンテンツに合わせる（auto）

**実装例:**
```tsx
<Checkbox.Group
  value={selectedOptions}
  onChange={(checkedValues) => setSelectedOptions(checkedValues)}
>
  <Checkbox value="option1">選択肢1</Checkbox>
  <Checkbox value="option2">選択肢2</Checkbox>
  <Checkbox value="option3">選択肢3</Checkbox>
</Checkbox.Group>
```

---

## 共通仕様（全パターン）

### 色定義

**通常（未選択）**
- チェックボックス外枠: `token.colorBorder` (rgba(0,0,0,0.12))
- チェックボックス内側: `transparent`
- 背景色: `transparent`
- テキスト色: `token.colorText` (#212121)

**ホバー（未選択）**
- チェックボックス外枠: `token.colorPrimary` (#CF0027)
- チェックボックス内側: `transparent`
- 背景色: `transparent`
- テキスト色: `token.colorText` (#212121)

**選択済み**
- チェックボックス外枠: `token.colorPrimary` (#CF0027)
- チェックボックス内側: `token.colorPrimary` (#CF0027)
- チェックマーク色: `#ffffff`
- 背景色: `transparent`
- テキスト色: `token.colorText` (#212121)

**不確定状態（indeterminate）**
- チェックボックス外枠: `token.colorPrimary` (#CF0027)
- チェックボックス内側: `token.colorPrimary` (#CF0027)
- 横線色: `#ffffff`
- 背景色: `transparent`
- テキスト色: `token.colorText` (#212121)

**無効（未選択）**
- チェックボックス外枠: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- チェックボックス内側: `transparent`
- 背景色: `transparent`
- テキスト色: `token.colorTextDisabled` (#bdbdbd)

**無効（選択済み）**
- チェックボックス外枠: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- チェックボックス内側: `token.colorTextDisabled` (#bdbdbd)
- チェックマーク色: `#ffffff`
- 背景色: `transparent`
- テキスト色: `token.colorTextDisabled` (#bdbdbd)

### アニメーション
- ホバー時のトランジション: `0.2s ease-out`
- チェック時のトランジション: `0.2s ease-in-out`
- チェックマークのアニメーション: スムーズなフェードイン

### アクセシビリティ
- フォーカス表示: `token.colorPrimary`の2pxアウトライン
- キーボード操作: Spaceキーで選択/解除切り替え
- スクリーンリーダー: 自動的にARIA属性が付与される
- ラベル: 必ず明確なラベルテキストを設定

### インタラクション
- クリック領域: チェックボックス本体だけでなく、ラベルテキスト全体
- 最小タップターゲット: 44px × 44px（モバイル対応）
- 視覚的フィードバック: ホバー時の外枠色変更

---

## パターン選択ガイドライン

### パターン1（単一チェックボックス）を使用する場合
- ✅ 単独の設定項目（ON/OFF切り替え）
- ✅ オプション機能の有効/無効
- ✅ 利用規約の同意チェック
- ✅ 真偽値を表すデータ入力

**使用例:**
- フォルダ構造を保持する
- パスワードを表示する
- 通知を受け取る
- ログイン状態を保持する
- 規約に同意する

---

### パターン2（垂直レイアウト）を使用する場合
- ✅ 選択肢が3個以上
- ✅ 各選択肢に説明文が必要
- ✅ 選択肢のテキストが長い（15文字以上）
- ✅ 縦スペースに余裕がある
- ✅ 複数選択可能であることを明示したい

**使用例:**
- 権限設定（閲覧、編集、削除、共有など）
- フィルタリング条件（複数カテゴリ）
- 通知設定（メール、SMS、アプリ内通知など）
- エクスポートオプション（複数ファイル形式）

---

### パターン3（水平レイアウト）を使用する場合
- ✅ 選択肢が2〜3個程度
- ✅ 選択肢のテキストが短い（10文字以内）
- ✅ 横スペースに余裕がある
- ✅ コンパクトな表示が必要

**使用例:**
- ファイル形式選択（PDF、Excel、CSV）
- 曜日選択（月、火、水など）
- 表示列の選択（名前、日付、サイズ）

---

## Form.Itemとの統合

### 単一チェックボックス
```tsx
<Form.Item
  name="preserveFolderStructure"
  valuePropName="checked"
  initialValue={false}
>
  <Checkbox>フォルダ構造を保持する</Checkbox>
</Form.Item>
```

### チェックボックスグループ
```tsx
<Form.Item
  name="selectedPermissions"
  label="権限設定"
  rules={[{ required: true, message: '最低1つ選択してください', type: 'array' }]}
>
  <Checkbox.Group
    style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
  >
    <Checkbox value="read">閲覧</Checkbox>
    <Checkbox value="write">編集</Checkbox>
    <Checkbox value="delete">削除</Checkbox>
    <Checkbox value="share">共有</Checkbox>
  </Checkbox.Group>
</Form.Item>
```

---

## 不確定状態（indeterminate）の使用

親チェックボックスで子チェックボックスの選択状態を表現する場合に使用します。

**実装例:**
```tsx
const CheckboxTree = () => {
  const [checkedList, setCheckedList] = useState<string[]>([]);
  const allOptions = ['option1', 'option2', 'option3'];
  
  const checkAll = checkedList.length === allOptions.length;
  const indeterminate = checkedList.length > 0 && checkedList.length < allOptions.length;
  
  const onCheckAllChange = (e: CheckboxChangeEvent) => {
    setCheckedList(e.target.checked ? allOptions : []);
  };
  
  return (
    <Space direction="vertical">
      <Checkbox
        indeterminate={indeterminate}
        checked={checkAll}
        onChange={onCheckAllChange}
      >
        すべて選択
      </Checkbox>
      <Checkbox.Group
        value={checkedList}
        onChange={setCheckedList}
        style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS, marginLeft: 24 }}
      >
        <Checkbox value="option1">選択肢1</Checkbox>
        <Checkbox value="option2">選択肢2</Checkbox>
        <Checkbox value="option3">選択肢3</Checkbox>
      </Checkbox.Group>
    </Space>
  );
};
```

---

## 動的な選択肢の生成

```tsx
const options = [
  { value: 'read', label: '閲覧', disabled: false },
  { value: 'write', label: '編集', disabled: false },
  { value: 'delete', label: '削除', disabled: true },
  { value: 'share', label: '共有', disabled: false },
];

<Checkbox.Group
  value={selectedPermissions}
  onChange={setSelectedPermissions}
>
  {options.map(option => (
    <Checkbox
      key={option.value}
      value={option.value}
      disabled={option.disabled}
    >
      {option.label}
    </Checkbox>
  ))}
</Checkbox.Group>
```

---

## 使用禁止パターン

### ❌ 避けるべきパターン

1. **選択肢が多すぎる（10個以上）**
   - 理由: スクロールが必要になり、全体把握が困難
   - 代替: Select（ドロップダウン）のmultiple modeを使用

2. **単一選択にチェックボックスを使用**
   - 理由: 単一選択はラジオボタンの役割
   - 代替: Radio.Groupを使用

3. **チェックボックスのラベルが不明瞭**
   - 理由: ユーザーが何を選択しているか理解できない
   - 例: 「オプション1」「設定A」など意味不明なラベル

4. **垂直と水平のレイアウトを同一画面内で混在**
   - 理由: UIの一貫性が損なわれる
   - 対策: 同一画面内では同じレイアウトを使用

5. **チェックボックスだけで説明なし**
   - 理由: 何をチェックしているのか理解できない
   - 対策: 必ず明確なラベルテキストを付ける

6. **必須選択なのにチェックボックス**
   - 理由: チェックボックスはオプション選択を意味する
   - 対策: 必須選択の場合はラジオボタンやSelectを使用

---

## 実装時の注意点

### Checkbox vs Checkbox.Group

**単一チェックボックス:**
```tsx
const [checked, setChecked] = useState(false);

<Checkbox
  checked={checked}
  onChange={(e) => setChecked(e.target.checked)}
>
  ラベル
</Checkbox>
```

**複数チェックボックス（グループ）:**
```tsx
const [checkedList, setCheckedList] = useState<string[]>([]);

<Checkbox.Group
  value={checkedList}
  onChange={setCheckedList}
>
  <Checkbox value="option1">選択肢1</Checkbox>
  <Checkbox value="option2">選択肢2</Checkbox>
</Checkbox.Group>
```

### disabled状態の設定

```tsx
// グループ全体を無効化
<Checkbox.Group disabled={true}>
  <Checkbox value="option1">選択肢1</Checkbox>
  <Checkbox value="option2">選択肢2</Checkbox>
</Checkbox.Group>

// 個別のチェックボックスを無効化
<Checkbox.Group value={checkedList}>
  <Checkbox value="option1">選択肢1</Checkbox>
  <Checkbox value="option2" disabled>選択肢2（無効）</Checkbox>
</Checkbox.Group>
```

### options形式での定義

```tsx
const options = [
  { label: '選択肢1', value: 'option1' },
  { label: '選択肢2', value: 'option2' },
  { label: '選択肢3', value: 'option3', disabled: true },
];

<Checkbox.Group
  options={options}
  value={checkedList}
  onChange={setCheckedList}
/>
```

---

## バリデーション

### 必須チェック
```tsx
// フォーム送信時のバリデーション例
const handleSubmit = () => {
  if (!agreedToTerms) {
    message.warning('利用規約に同意してください');
    return;
  }
  // 送信処理
};
```

### 最低選択数のバリデーション
```tsx
// 最低1つは選択必須
const handleSubmit = () => {
  if (selectedPermissions.length === 0) {
    message.warning('最低1つの権限を選択してください');
    return;
  }
  // 送信処理
};
```

### Ant Design Formとの統合
```tsx
<Form.Item
  name="permissions"
  label="権限設定"
  rules={[
    { 
      required: true, 
      message: '最低1つ選択してください',
      type: 'array',
      min: 1 
    }
  ]}
>
  <Checkbox.Group>
    <Checkbox value="read">閲覧</Checkbox>
    <Checkbox value="write">編集</Checkbox>
    <Checkbox value="delete">削除</Checkbox>
  </Checkbox.Group>
</Form.Item>
```

---

## プロジェクト内の使用例

### 単一チェックボックス（FormatUploadDialog.tsx）
```tsx
<Checkbox
  checked={preserveFolderStructure}
  onChange={(e) => setPreserveFolderStructure(e.target.checked)}
  disabled={uploadState.isUploading}
>
  フォルダ構造を保持する
</Checkbox>
```
- **パターン**: パターン1（単一チェックボックス）
- **理由**: 単独の設定項目（オプション機能）
- **用途**: 一括アップロード時にフォルダ構造を維持するかの選択

### フォーム内での使用（DataRecordDialog.tsx）
```tsx
<Form.Item
  name={key}
  valuePropName="checked"
>
  <Checkbox>{property.label}</Checkbox>
</Form.Item>
```
- **パターン**: パターン1（単一チェックボックス）
- **理由**: 真偽値（boolean）のデータ入力
- **用途**: 実験データの真偽値プロパティ入力

---

## レイアウト例

### 垂直レイアウトでのアイコン使用
```tsx
<Checkbox.Group
  value={selectedFeatures}
  onChange={setSelectedFeatures}
  style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
>
  <Checkbox value="notifications">
    <BellOutlined /> 通知を受け取る
  </Checkbox>
  <Checkbox value="emails">
    <MailOutlined /> メール通知
  </Checkbox>
  <Checkbox value="sms">
    <MobileOutlined /> SMS通知
  </Checkbox>
</Checkbox.Group>
```

### 水平レイアウトでの間隔調整
```tsx
<Checkbox.Group
  value={selectedFormats}
  onChange={setSelectedFormats}
  style={{ display: 'flex', gap: token.margin }}
>
  <Checkbox value="pdf">PDF</Checkbox>
  <Checkbox value="excel">Excel</Checkbox>
  <Checkbox value="csv">CSV</Checkbox>
</Checkbox.Group>
```

### Cardでのグループ化
```tsx
<Card title="表示設定" size="small">
  <Space direction="vertical" size="small">
    <Checkbox checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)}>
      グリッド表示
    </Checkbox>
    <Checkbox checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)}>
      ラベル表示
    </Checkbox>
    <Checkbox checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)}>
      凡例表示
    </Checkbox>
  </Space>
</Card>
```

---

## ラジオボタンとの使い分け

| 項目 | チェックボックス | ラジオボタン |
|------|----------------|------------|
| **選択数** | 複数選択可能 | 単一選択のみ |
| **未選択状態** | 可能 | 不可（必ず1つ選択） |
| **用途** | オプション機能、複数条件 | 排他的な選択肢 |
| **視覚的意味** | 独立した項目 | グループ内の選択 |
| **適切な数** | 2〜10個程度 | 2〜5個程度 |

**チェックボックスを使うべき例:**
- 興味のあるトピックを選択（複数可）
- エクスポートするファイル形式（複数可）
- 有効にする通知の種類（複数可）

**ラジオボタンを使うべき例:**
- 性別選択（男性・女性・その他）
- 配送方法（通常・速達・翌日）
- サイズ選択（S・M・L）

---

## まとめ

### DO（推奨）
✅ 複数選択可能な項目にチェックボックスを使用する
✅ 明確で統一されたラベルテキストを使用する
✅ 単独設定項目には単一チェックボックスを使用する
✅ 垂直レイアウトには適切な間隔（8px）を設定する
✅ アイコンを使って視認性を高める（必要に応じて）
✅ disabled状態を適切に使用する
✅ Form.Itemとの統合時は`valuePropName="checked"`を使用する
✅ Checkbox.Groupでは`value`と`onChange`を正しく設定する

### DON'T（非推奨）
❌ 単一選択にチェックボックスを使用しない
❌ 10個以上の選択肢でチェックボックスを使用しない
❌ 垂直と水平のレイアウトを同一画面内で混在させない
❌ ラベルなしのチェックボックスを作成しない
❌ 必須選択にチェックボックスを使用しない（ラジオボタンを使用）
❌ チェックボックスだけで説明を省略しない
❌ アクセシビリティを無視しない
❌ クリック領域を小さくしすぎない

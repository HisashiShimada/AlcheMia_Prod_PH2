# フォーム管理ポリシー

## 標準4パターン

### パターン1: 基本フォーム
**用途**: 一般的な入力フォーム、登録・編集画面

**レイアウト**
- labelCol: `{ span: 6 }` （ラベル幅25%）
- wrapperCol: `{ span: 18 }` （入力フィールド幅75%）
- layout: `horizontal`
- labelAlign: `right`

**スタイル**
- ラベルフォントサイズ: `token.fontSize` (14px)
- ラベル色: `token.colorText` (#212121)
- 必須マーカー色: `token.colorError` (#d32f2f)
- Form.Item間隔: `token.marginLG` (24px)

**バリデーション表示**
- エラーメッセージ色: `token.colorError` (#d32f2f)
- エラーメッセージサイズ: `token.fontSizeSM` (12px)
- validateStatus: `error` / `warning` / `success`
- help: エラーメッセージテキスト

---

### パターン2: コンパクトフォーム
**用途**: モーダル内、ドロワー内、画面幅が狭い場合

**レイアウト**
- labelCol: `{ span: 8 }` （ラベル幅33%）
- wrapperCol: `{ span: 16 }` （入力フィールド幅67%）
- layout: `horizontal`
- labelAlign: `right`

**スタイル**
- ラベルフォントサイズ: `token.fontSize` (14px)
- ラベル色: `token.colorText` (#212121)
- 必須マーカー色: `token.colorError` (#d32f2f)
- Form.Item間隔: `token.margin` (16px)

**特徴**
- ラベル幅を広げて入力フィールドとのバランスを保つ
- 間隔を狭めて縦スクロールを減らす

---

### パターン3: 縦配置フォーム
**用途**: モバイル表示、シンプルなフォーム、ログイン画面

**レイアウト**
- layout: `vertical`
- labelCol: 未指定（自動で100%）
- wrapperCol: 未指定（自動で100%）

**スタイル**
- ラベルフォントサイズ: `token.fontSize` (14px)
- ラベル色: `token.colorText` (#212121)
- 必須マーカー色: `token.colorError` (#d32f2f)
- Form.Item間隔: `token.marginLG` (24px)
- ラベルと入力の間隔: `token.marginXS` (8px)

**特徴**
- レスポンシブデザインに最適
- 視覚的に分かりやすい

---

### パターン4: インラインフォーム
**用途**: 検索フォーム、フィルター、ツールバー

**レイアウト**
- layout: `inline`
- labelCol: 未指定
- wrapperCol: 未指定

**スタイル**
- ラベルフォントサイズ: `token.fontSize` (14px)
- ラベル色: `token.colorText` (#212121)
- Form.Item間隔: `token.margin` (16px) - 横並び
- 入力フィールド幅: 固定幅（150px～250px）

**特徴**
- 横並びで複数の入力を配置
- コンパクトに表示

---

## フォーム構成要素

### Form.Item（フォームアイテム）

**必須属性**
- name: フィールド名（必須）
- label: ラベルテキスト（必須）
- rules: バリデーションルール（任意だが推奨）

**バリデーションルール例**
```typescript
rules={[
  { required: true, message: 'この項目は必須です' },
  { type: 'email', message: '有効なメールアドレスを入力してください' },
  { min: 8, message: '8文字以上で入力してください' },
  { max: 100, message: '100文字以内で入力してください' },
  { pattern: /^[0-9]+$/, message: '数字のみ入力してください' }
]}
```

**状態表示**
- validateStatus: `success` / `warning` / `error` / `validating`
- hasFeedback: true（バリデーションアイコン表示）
- help: ヘルプテキストまたはエラーメッセージ

---

### ラベル表示

**標準ラベル**
- フォントサイズ: `token.fontSize` (14px)
- フォント色: `token.colorText` (#212121)
- フォントウェイト: normal
- 右揃え（horizontal layout時）

**必須マーカー（*）**
- 色: `token.colorError` (#d32f2f)
- 位置: ラベルの前
- 自動表示: rules に required があると自動表示

**任意ラベル**
- 「（任意）」テキストをグレーで表示
- 色: `token.colorTextSecondary` (#757575)

---

### エラー表示

**エラーメッセージ**
- フォントサイズ: `token.fontSizeSM` (12px)
- 色: `token.colorError` (#d32f2f)
- 位置: 入力フィールドの下
- アニメーション: フェードイン（0.2s）

**エラー時のフィールドスタイル**
- ボーダー色: `token.colorError` (#d32f2f)
- フォーカスシャドウ: 0 0 0 2px `token.colorErrorBg`
- アイコン: CloseCircleFilled（赤）

**警告時のスタイル**
- ボーダー色: `token.colorWarning` (#ed6c02)
- アイコン: ExclamationCircleFilled（オレンジ）

**成功時のスタイル**
- ボーダー色: `token.colorSuccess` (#2e7d32)
- アイコン: CheckCircleFilled（緑）

---

## フォーム送信パターン

### パターンA: ボタン配置（右揃え）
**用途**: 標準的なフォーム

```typescript
<Form.Item wrapperCol={{ offset: 6, span: 18 }}>
  <Space>
    <Button onClick={onCancel}>キャンセル</Button>
    <Button type="primary" htmlType="submit">保存</Button>
  </Space>
</Form.Item>
```

**配置**
- offset: ラベル幅と同じ（labelColと同じspan）
- ボタン間隔: `token.margin` (16px)
- 順序: キャンセル → 保存（右が主要アクション）

---

### パターンB: ボタン配置（中央揃え）
**用途**: ログインフォーム、シンプルなフォーム

```typescript
<Form.Item wrapperCol={{ span: 24 }} style={{ textAlign: 'center' }}>
  <Button type="primary" htmlType="submit" block>
    ログイン
  </Button>
</Form.Item>
```

**配置**
- 中央揃え
- block: true（フル幅）
- 単一ボタン

---

### パターンC: ボタン配置（フッター固定）
**用途**: モーダル、ドロワー

```typescript
<Modal
  footer={[
    <Button key="cancel" onClick={onCancel}>キャンセル</Button>,
    <Button key="submit" type="primary" htmlType="submit" onClick={onSubmit}>
      保存
    </Button>
  ]}
>
  <Form>{/* フォーム内容 */}</Form>
</Modal>
```

**配置**
- モーダル/ドロワーのfooterで固定
- 順序: キャンセル → 保存

---

## バリデーションタイミング

### 標準設定
- validateTrigger: `onChange` - 入力時にリアルタイム検証
- validateDebounce: 300ms - 連続入力時の検証遅延

### 初回送信時のみ検証
```typescript
<Form validateTrigger="onSubmit">
  {/* フォーム内容 */}
</Form>
```

### フィールドごとの設定
```typescript
<Form.Item
  name="email"
  validateTrigger={['onBlur', 'onChange']}
  validateDebounce={500}
>
  <Input />
</Form.Item>
```

---

## レスポンシブ対応

### ブレークポイント別レイアウト

**デスクトップ（lg, xl, xxl）**
- パターン1: 基本フォーム（6:18）
- パターン2: コンパクトフォーム（8:16）

**タブレット（md）**
- パターン2: コンパクトフォーム（8:16）
- または パターン3: 縦配置フォーム

**モバイル（xs, sm）**
- パターン3: 縦配置フォーム（必須）

### レスポンシブ設定例
```typescript
const [form] = Form.useForm();
const isMobile = useBreakpoint()?.xs;

<Form
  form={form}
  layout={isMobile ? 'vertical' : 'horizontal'}
  labelCol={isMobile ? undefined : { span: 6 }}
  wrapperCol={isMobile ? undefined : { span: 18 }}
>
  {/* フォーム内容 */}
</Form>
```

---

## フォーム状態管理

### useForm Hook
```typescript
const [form] = Form.useForm();

// フォーム送信
const onFinish = (values: any) => {
  console.log('Success:', values);
};

// バリデーションエラー
const onFinishFailed = (errorInfo: any) => {
  console.log('Failed:', errorInfo);
};

// プログラムでの操作
form.setFieldsValue({ username: 'user123' }); // 値設定
form.getFieldValue('username'); // 値取得
form.validateFields(); // 手動検証
form.resetFields(); // リセット
```

---

## 初期値設定

### 方法1: initialValues（推奨）
```typescript
<Form
  initialValues={{
    username: '',
    email: '',
    remember: true
  }}
>
  {/* フォーム内容 */}
</Form>
```

### 方法2: setFieldsValue
```typescript
useEffect(() => {
  form.setFieldsValue({
    username: userData.username,
    email: userData.email
  });
}, [userData]);
```

---

## アクセシビリティ

### ラベルとフィールドの関連付け
- Form.Item の name 属性により自動関連付け
- label 属性により自動で `<label>` タグが生成される

### キーボード操作
- Tab: 次のフィールドへ移動
- Shift+Tab: 前のフィールドへ移動
- Enter: フォーム送信（button[type="submit"]）
- Esc: モーダル/ドロワーを閉じる

### スクリーンリーダー対応
- エラーメッセージは aria-describedby で関連付け
- 必須フィールドは aria-required で明示
- バリデーション状態は aria-invalid で通知

---

## パターン選択ガイド

| 用途 | 推奨パターン | 理由 |
|------|------------|------|
| 一般的な登録・編集画面 | パターン1（基本） | 読みやすく標準的 |
| モーダル内フォーム | パターン2（コンパクト） | 限られたスペースに最適 |
| ログイン画面 | パターン3（縦配置） | シンプルで視覚的 |
| 検索フォーム | パターン4（インライン） | コンパクトで効率的 |
| モバイル画面 | パターン3（縦配置） | タッチ操作に最適 |

---

## ベストプラクティス

### DO（推奨）
✅ Form.Item には必ず name を指定する
✅ バリデーションルールを適切に設定する
✅ エラーメッセージは具体的で分かりやすくする
✅ 必須フィールドには required ルールを設定する
✅ モバイル対応として縦配置レイアウトを用意する
✅ initialValues でデフォルト値を設定する
✅ onFinish / onFinishFailed でフォーム送信を処理する
✅ キャンセルボタンでフォームをリセットする

### DON'T（非推奨）
❌ Form.Item なしで直接 Input を配置しない
❌ バリデーションなしでフォームを送信しない
❌ エラーメッセージを「エラー」だけにしない
❌ ラベルなしでフィールドを配置しない
❌ 送信ボタンを disabled にしたまま放置しない
❌ グローバル変数でフォーム状態を管理しない
❌ 不必要に複雑なバリデーションを追加しない
❌ レスポンシブ対応を怠らない

---

## 補足: その他のフォーム要素

### DatePicker（日付入力）
- 高さ: 32px（Input と同じ）
- 幅: 200px（固定）
- フォーマット: `YYYY-MM-DD` / `YYYY/MM/DD`

### Select（選択）
- 高さ: 32px（Input と同じ）
- 幅: 150px / 200px / 250px（選択肢に応じて）

### Checkbox / Radio
- チェックボックス/ラジオボタンは独自のレイアウト
- Form.Item の valuePropName を "checked" に設定

### Upload（ファイルアップロード）
- ボタンスタイルまたはドラッグ&ドロップエリア
- 別途 upload_policy.md を参照

---

## 参考リンク

- [Ant Design Form Documentation](https://ant.design/components/form)
- [button_policy.md](./button_policy.md) - ボタン配置ルール
- [textbox_policy.md](./textbox_policy.md) - 入力フィールドルール
- [select_policy.md](./select_policy.md) - 選択フィールドルール
- [checkbox_policy.md](./checkbox_policy.md) - チェックボックスルール
- [radiobutton_policy.md](./radiobutton_policy.md) - ラジオボタンルール

# ポップアップ確認（Popconfirm）ポリシー

## 標準3パターン

### パターン1: 削除確認
**用途**: 削除など危険なアクション前の確認

- 最大幅: 300px
- パディング: 12px
- アイコン: ExclamationCircleOutlined（危険を示す警告アイコン）
- アイコン色: `token.colorError` (#d32f2f)
- タイトル: "削除してもよろしいですか？"など
- タイトル色: `token.colorText` (#212121)
- タイトルフォントサイズ: `token.fontSize` (14px)
- 説明: 削除の影響を説明（オプション）
- 説明色: `token.colorTextSecondary` (#757575)
- 説明フォントサイズ: `token.fontSizeSM` (12px)
- 確定ボタン: type="primary", danger=true（赤色ボタン）
- 確定ボタンテキスト: "削除"
- キャンセルボタン: type="default"
- キャンセルボタンテキスト: "キャンセル"
- 配置: top（上部、デフォルト）
- シャドウ: `token.boxShadowSecondary`

---

### パターン2: 標準確認
**用途**: 通常のアクション前の確認

- 最大幅: 300px
- パディング: 12px
- アイコン: QuestionCircleOutlined（疑問を示すアイコン）
- アイコン色: `token.colorPrimary` (#CF0027)
- タイトル: "実行してもよろしいですか？"など
- タイトル色: `token.colorText` (#212121)
- タイトルフォントサイズ: `token.fontSize` (14px)
- 説明: アクションの説明（オプション）
- 説明色: `token.colorTextSecondary` (#757575)
- 説明フォントサイズ: `token.fontSizeSM` (12px)
- 確定ボタン: type="primary"（青色ボタン）
- 確定ボタンテキスト: "OK" または "実行"
- キャンセルボタン: type="default"
- キャンセルボタンテキスト: "キャンセル"
- 配置: top（上部、デフォルト）
- シャドウ: `token.boxShadowSecondary`

---

### パターン3: 情報確認
**用途**: 情報提供を伴う確認

- 最大幅: 300px
- パディング: 12px
- アイコン: InfoCircleOutlined（情報を示すアイコン）
- アイコン色: `token.colorInfo` (#0093CF)
- タイトル: "この操作について"など
- タイトル色: `token.colorText` (#212121)
- タイトルフォントサイズ: `token.fontSize` (14px)
- 説明: 操作の詳細情報（推奨）
- 説明色: `token.colorTextSecondary` (#757575)
- 説明フォントサイズ: `token.fontSizeSM` (12px)
- 確定ボタン: type="primary"（青色ボタン）
- 確定ボタンテキスト: "実行"
- キャンセルボタン: type="default"
- キャンセルボタンテキスト: "キャンセル"
- 配置: top（上部、デフォルト）
- シャドウ: `token.boxShadowSecondary`

---

## 共通仕様（全パターン）

### 色定義

**背景**
- 背景色: `token.colorBgElevated` (#ffffff)

**ボーダー**
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- ボーダーラジアス: `token.borderRadius` (8px)

**シャドウ**
- シャドウ: `token.boxShadowSecondary` (0 4px 12px rgba(0,0,0,0.12))

**テキスト**
- タイトル色: `token.colorText` (#212121)
- 説明色: `token.colorTextSecondary` (#757575)

### レイアウト

**サイズ**
- 最大幅: 300px
- 最小幅: 200px
- パディング: 12px
- ボタン間隔: 8px

**配置オプション**
- `top`: 上部（デフォルト）
- `topLeft`: 左上
- `topRight`: 右上
- `bottom`: 下部
- `bottomLeft`: 左下
- `bottomRight`: 右下

### アニメーション

- 表示アニメーション: `0.2s ease-out`
- 非表示アニメーション: `0.1s ease-in`

---

## パターン選択

- 削除・破壊的な操作 → **パターン1（削除確認）**
- 通常の確認が必要な操作 → **パターン2（標準確認）**
- 情報提供を伴う確認 → **パターン3（情報確認）**

---

## 使用ガイドライン

### いつ使用するか

✅ **使用すべき場合:**
- データを削除する前
- 元に戻せない操作を実行する前
- 重要な変更を保存する前
- ユーザーの意図を再確認したい時

❌ **使用すべきでない場合:**
- 頻繁に実行される操作
- 明らかに安全な操作
- 既にモーダルで確認している操作
- ユーザーがすぐに取り消せる操作

### ベストプラクティス

**DO（推奨）:**
- 明確で簡潔なタイトルを使用する
- 操作の影響を説明文で補足する（重要な操作の場合）
- 確定ボタンのテキストは具体的なアクション名にする（"削除", "実行"など）
- 危険な操作には赤色のボタンを使用する

**DON'T（非推奨）:**
- 長すぎる説明文を記載する
- 曖昧なボタンテキストを使用する（"はい", "いいえ"）
- Popconfirmを多用する（モーダルの方が適切な場合がある）
- 非破壊的な操作でPopconfirmを使用する

---

## コード例

### パターン1: 削除確認

```tsx
import { Popconfirm, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

<Popconfirm
  title="削除してもよろしいですか？"
  description="この操作は取り消せません。"
  onConfirm={handleDelete}
  okText="削除"
  cancelText="キャンセル"
  okButtonProps={{ danger: true }}
>
  <Button danger icon={<DeleteOutlined />}>
    削除
  </Button>
</Popconfirm>
```

### パターン2: 標準確認

```tsx
import { Popconfirm, Button } from 'antd';

<Popconfirm
  title="実行してもよろしいですか？"
  description="この操作を実行します。"
  onConfirm={handleExecute}
  okText="実行"
  cancelText="キャンセル"
>
  <Button type="primary">
    実行
  </Button>
</Popconfirm>
```

### パターン3: 情報確認

```tsx
import { Popconfirm, Button } from 'antd';

<Popconfirm
  title="この操作について"
  description="この操作を実行すると、データが更新されます。よろしいですか？"
  onConfirm={handleUpdate}
  okText="実行"
  cancelText="キャンセル"
  icon={<InfoCircleOutlined style={{ color: '#0093CF' }} />}
>
  <Button type="primary">
    更新
  </Button>
</Popconfirm>
```

---

## アクセシビリティ

### キーボード操作

- `Tab`: フォーカス移動
- `Enter`: 確定ボタンを実行
- `Escape`: Popconfirmを閉じる（キャンセル）
- `Space`: フォーカスされたボタンを実行

### スクリーンリーダー対応

- タイトルと説明文は自動的に読み上げられる
- ボタンのラベルは明確に設定する
- `role="tooltip"` が自動的に設定される

---

## レスポンシブ対応

### モバイル（xs, sm）
- Popconfirmの幅は画面幅の90%まで縮小可能
- 最小幅: 200px
- ボタンは縦並び（必要に応じて）

### タブレット（md）
- 標準の配置と動作

### デスクトップ（lg, xl, xxl）
- 標準の配置と動作

---

## Modalとの使い分け

### Popconfirmを使用する場合
- 簡単な確認（1～2文程度）
- トリガー要素のすぐ近くに表示したい
- 軽量な操作

### Modalを使用する場合
- 複雑な説明が必要
- 追加の入力が必要
- 重要な意思決定
- 長い説明文やフォームを含む

---

## 関連コンポーネント

- [Modal（モーダル）](./modal_policy.md) - より複雑な確認ダイアログ
- [Button（ボタン）](./button_policy.md) - トリガー要素
- [Tooltip](./tooltip_policy.md) - 情報表示のみの場合

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-26 | 初版作成 | Development Team |

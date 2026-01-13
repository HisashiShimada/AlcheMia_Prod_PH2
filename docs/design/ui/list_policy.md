# リスト表示ポリシー

## 標準5パターン

### パターン1: シンプルリスト
**用途**: 基本的な項目リスト、メニュー項目
- アイテムの高さ: 48px
- フォントサイズ: `token.fontSize` (14px)
- パディング: 左右16px、上下12px
- ボーダー: 下部 1px solid `token.colorBorderSecondary`
- ホバー背景: `token.colorBgTextHover` (#f5f5f5)
- 選択時背景: `token.colorPrimaryBg` (#FFF1F3)
- 構成: テキストのみ

---

### パターン2: アイコン付きリスト
**用途**: 機能メニュー、ナビゲーション
- アイテムの高さ: 56px
- フォントサイズ: `token.fontSize` (14px)
- パディング: 左右16px、上下12px
- ボーダー: 下部 1px solid `token.colorBorderSecondary`
- ホバー背景: `token.colorBgTextHover` (#f5f5f5)
- 選択時背景: `token.colorPrimaryBg` (#FFF1F3)
- アイコンサイズ: 20px
- アイコン色: `token.colorPrimary` (#CF0027)
- 構成: アイコン（左） + テキスト

---

### パターン3: 説明付きリスト
**用途**: ユーザーリスト、ファイルリスト、詳細情報表示
- アイテムの高さ: 72px（可変）
- タイトルフォントサイズ: `token.fontSize` (14px)
- 説明フォントサイズ: `token.fontSizeSM` (12px)
- パディング: 左右16px、上下12px
- ボーダー: 下部 1px solid `token.colorBorderSecondary`
- ホバー背景: `token.colorBgTextHover` (#f5f5f5)
- 選択時背景: `token.colorPrimaryBg` (#FFF1F3)
- タイトル色: `token.colorText` (#212121)
- 説明色: `token.colorTextSecondary` (#757575)
- 構成: タイトル（太字） + 説明（1-2行）

---

### パターン4: アクション付きリスト
**用途**: 管理画面、操作可能なアイテムリスト
- アイテムの高さ: 64px
- フォントサイズ: `token.fontSize` (14px)
- パディング: 左右16px、上下12px
- ボーダー: 下部 1px solid `token.colorBorderSecondary`
- ホバー背景: `token.colorBgTextHover` (#f5f5f5)
- 構成: コンテンツ（左寄せ） + アクションボタン群（右寄せ）
- アクションボタン: Buttonコンポーネント（small size、type="link" または type="text"）
- ボタン間隔: `Space` size="small" (8px)

---

### パターン5: ステータス付きリスト
**用途**: タスクリスト、承認フロー、進捗管理
- アイテムの高さ: 72px（可変）
- タイトルフォントサイズ: `token.fontSize` (14px)
- 説明フォントサイズ: `token.fontSizeSM` (12px)
- パディング: 左右16px、上下12px
- ボーダー: 下部 1px solid `token.colorBorderSecondary`
- ホバー背景: `token.colorBgTextHover` (#f5f5f5)
- 構成: アバター/アイコン（左） + コンテンツ（中央） + ステータスバッジ（右）
- ステータスバッジ: Badge または Tag コンポーネント
- バッジ位置: 右上

---

## 共通仕様（全パターン）

### 色定義

**通常**
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))

**ホバー**
- 背景色: `token.colorBgTextHover` (#f5f5f5)
- テキスト色: `token.colorText` (#212121)

**選択時**
- 背景色: `token.colorPrimaryBg` (#FFF1F3)
- テキスト色: `token.colorText` (#212121)
- 左ボーダー: 3px solid `token.colorPrimary` (#CF0027)

**無効**
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- カーソル: not-allowed

### レイアウト

**リストコンテナ**
- 背景色: `token.colorBgContainer` (#ffffff)
- ボーダー: 1px solid `token.colorBorder` (rgba(0,0,0,0.12))
- 角丸: `token.borderRadiusLG` (12px)
- 最大高さ: 600px（スクロール可能）

**空状態（Empty State）**
- 高さ: 200px
- テキスト: "データがありません"
- アイコン: InboxOutlined (48px)
- アイコン色: `token.colorTextTertiary` (#9e9e9e)

**ローディング状態**
- Skeleton コンポーネント使用
- アイテム数: 5個
- アニメーション: wave

---

## パターン選択ガイド

- シンプルな項目リスト → **パターン1（シンプルリスト）**
- 機能メニュー、ナビゲーション → **パターン2（アイコン付きリスト）**
- ユーザー一覧、ファイル一覧 → **パターン3（説明付きリスト）**
- 管理操作が必要な一覧 → **パターン4（アクション付きリスト）**
- ステータス管理が必要な一覧 → **パターン5（ステータス付きリスト）**

---

## インタラクション

### クリック動作
- カーソル: pointer
- アニメーション: 0.2s ease-out
- 選択状態の切り替え: 単一選択 or 複数選択（Checkbox使用）

### キーボード操作
- ↑↓キー: アイテム間移動
- Enter: 選択/実行
- Space: 選択（Checkbox使用時）

### スクロール
- 最大高さ超過時: 縦スクロールバー表示
- スクロールバー幅: 8px
- スクロールバー色: `token.colorBorderSecondary`

---

## レスポンシブ対応

### モバイル（xs, sm）
- アイテムパディング: 左右12px
- アイコンサイズ: 18px
- フォントサイズ: 14px（変更なし）
- アクションボタン: ドロップダウンメニューに集約

### タブレット（md）
- 標準仕様を適用

### デスクトップ（lg, xl, xxl）
- 標準仕様を適用
- アイテムホバー時の視覚フィードバックを強化

---

## アクセシビリティ

### ARIA属性
- `role="list"` - リストコンテナ
- `role="listitem"` - 各アイテム
- `aria-selected="true"` - 選択状態
- `aria-disabled="true"` - 無効状態
- `aria-label` - スクリーンリーダー用ラベル

### フォーカス表示
- フォーカスアウトライン: 2px solid `token.colorPrimary`
- アウトラインオフセット: 2px

### コントラスト比
- 通常テキスト: 最低 4.5:1
- アイコン: 最低 3:1

---

## 使用コンポーネント

### Ant Design
- `List` - リストコンテナ
- `List.Item` - リストアイテム
- `List.Item.Meta` - メタ情報（アバター、タイトル、説明）
- `Avatar` - アバター表示
- `Badge` / `Tag` - ステータス表示
- `Button` - アクションボタン
- `Space` - アイテム間隔
- `Empty` - 空状態
- `Skeleton` - ローディング状態

### アイコン
- `@ant-design/icons` - 標準アイコン
- `lucide-react` - 補助アイコン

---

## 実装例

### パターン1: シンプルリスト
```tsx
<List
  dataSource={data}
  renderItem={(item) => (
    <List.Item>{item.name}</List.Item>
  )}
/>
```

### パターン2: アイコン付きリスト
```tsx
<List
  dataSource={data}
  renderItem={(item) => (
    <List.Item>
      <Space>
        <FileOutlined style={{ color: token.colorPrimary }} />
        {item.name}
      </Space>
    </List.Item>
  )}
/>
```

### パターン3: 説明付きリスト
```tsx
<List
  dataSource={data}
  renderItem={(item) => (
    <List.Item>
      <List.Item.Meta
        title={item.name}
        description={item.description}
      />
    </List.Item>
  )}
/>
```

### パターン4: アクション付きリスト
```tsx
<List
  dataSource={data}
  renderItem={(item) => (
    <List.Item
      actions={[
        <Button type="link" size="small">編集</Button>,
        <Button type="link" size="small" danger>削除</Button>
      ]}
    >
      <List.Item.Meta title={item.name} />
    </List.Item>
  )}
/>
```

### パターン5: ステータス付きリスト
```tsx
<List
  dataSource={data}
  renderItem={(item) => (
    <List.Item>
      <List.Item.Meta
        avatar={<Avatar icon={<UserOutlined />} />}
        title={item.name}
        description={item.description}
      />
      <Badge status={item.status} text={item.statusText} />
    </List.Item>
  )}
/>
```

---

## ベストプラクティス

### DO（推奨）
✅ リスト項目は均一な高さを保つ
✅ ホバー時の視覚フィードバックを提供する
✅ スクロール可能な場合は最大高さを設定する
✅ 空状態を適切に表示する
✅ ローディング状態を適切に表示する
✅ アクセシビリティに配慮する
✅ レスポンシブデザインを考慮する

### DON'T（非推奨）
❌ 項目高さを不均一にする（可読性低下）
❌ テキストを切り詰めすぎる（情報不足）
❌ アクションボタンを過剰に配置する（混乱）
❌ 色を過度に使用する（視覚的ノイズ）
❌ スクロール領域を不明確にする
❌ キーボード操作を無視する

---

## 関連ドキュメント

- [テーブルポリシー](./table_policy.md) - データテーブル表示
- [カードポリシー](./card_policy.md) - カード形式表示
- [バッジポリシー](./badge_policy.md) - ステータスバッジ
- [アバターポリシー](./user_avatar_policy.md) - ユーザーアバター
- [空状態ポリシー](./empty_state_policy.md) - 空状態表示

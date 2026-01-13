# ナビゲーションメニュー形状ポリシー

## 標準5パターン

### パターン1: ドロップダウンメニュー（Header用）
**用途**: ヘッダーのユーザーアクション、言語切替、設定メニュー

- コンポーネント: `Dropdown` + `Menu`
- 配置: 固定ヘッダー右側
- トリガー: `click`
- 配置位置: `bottomRight`
- 最小幅: `180px`
- 最大幅: `240px`
- アイコンサイズ: `14px`
- フォントサイズ: `token.fontSize` (14px)
- 行高さ: `40px`
- パディング: 左右 `12px`
- 項目間隔: なし（連続）
- ホバー背景: `token.colorBgTextHover` (#f5f5f5)
- 危険項目色: `token.colorError` (#d32f2f)
- 区切り線: `1px solid token.colorBorderSecondary`

**特徴**:
- Avatar クリックで開く
- チェックマーク表示（選択状態）
- 階層構造サポート（children）
- disabled 状態サポート
- danger フラグサポート

---

### パターン2: タブメニュー（SubHeader用）
**用途**: サブヘッダーの画面切り替え、機能切り替え

- コンポーネント: `Tabs`
- 配置: 固定サブヘッダー内（青背景）
- サイズ: `large`
- 背景色: `token.colorInfo` (#0093CF)
- テキスト色（非選択）: `rgba(255, 255, 255, 0.7)`
- テキスト色（選択時）: `#ffffff`
- テキスト色（ホバー）: `#ffffff`
- テキスト色（無効）: `rgba(255, 255, 255, 0.3)`
- フォントサイズ: `16px`
- フォントウェイト（非選択）: `400`
- フォントウェイト（選択時）: `600`
- パディング: 上下 `8px`、左右 `0`
- 項目間隔: 右 `24px`
- インジケーター色: `#ffffff`
- インジケーター高さ: `3px`
- インジケーター角丸: `3px 3px 0 0`

**特徴**:
- アイコン付きサポート
- 白色のアクティブインジケーター
- 青背景に最適化された色設定
- disabled 状態サポート

---

### パターン3: メニュー切り替えドロップダウン（SubHeader用）
**用途**: ロール別メニューの切り替え

- コンポーネント: `Dropdown` + `Menu` + `Button`
- ボタンタイプ: `primary` `ghost`
- 配置: サブヘッダー右側
- トリガー: `click`
- 配置位置: `bottomRight`
- 最小幅: `240px`
- ボタン高さ: `36px`
- ボタン角丸: `token.borderRadius` (8px)
- ボーダー色（通常）: `rgba(255, 255, 255, 0.8)`
- ボーダー色（ホバー）: `#ffffff`
- 背景色（通常）: `transparent`
- 背景色（ホバー）: `rgba(255, 255, 255, 0.15)`
- テキスト色: `#ffffff`
- フォントウェイト: `500`
- パディング: 左右 `token.marginLG` (24px)
- アイコン: `SwapOutlined`

**ホバーエフェクト**:
- 上方移動: `translateY(-2px)`
- シャドウ: `0 4px 12px rgba(0, 0, 0, 0.2)`

**特徴**:
- 現在のメニューは disabled 状態
- 5種類のメニュータイプ対応
- アイコン付きメニュー項目

---

### パターン4: サイドバーメニュー（垂直）
**用途**: メインナビゲーション、サイドバーメニュー

- コンポーネント: `Menu`
- モード: `inline`
- 幅: `256px`（デフォルト）、`280px`（広め）
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)
- フォントサイズ: `token.fontSize` (14px)
- 行高さ: `40px`
- パディング: 左右 `16px`
- 項目間隔: `4px`
- アクティブ背景: `token.colorPrimaryBg` (#FFF1F3)
- アクティブテキスト: `token.colorPrimary` (#CF0027)
- アクティブボーダー: 左側 `3px solid token.colorPrimary`
- ホバー背景: `token.colorBgTextHover` (#f5f5f5)
- アイコンサイズ: `16px`
- アイコンマージン: 右 `8px`

**特徴**:
- 階層構造サポート（サブメニュー）
- 折りたたみ可能
- 選択状態の永続化
- バッジ表示サポート

---

### パターン5: 水平メニュー
**用途**: トップナビゲーション、カテゴリ切り替え

- コンポーネント: `Menu`
- モード: `horizontal`
- 高さ: `48px`
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)
- フォントサイズ: `token.fontSize` (14px)
- パディング: 左右 `20px`
- 項目間隔: `0`
- アクティブテキスト: `token.colorPrimary` (#CF0027)
- アクティブボーダー: 下側 `2px solid token.colorPrimary`
- ホバーテキスト: `token.colorPrimaryHover` (#E63946)
- アイコンサイズ: `16px`
- アイコンマージン: 右 `8px`

**特徴**:
- レスポンシブ対応（モバイルで折りたたみ）
- 下線インジケーター
- サブメニュー対応

---

## 共通仕様（全パターン）

### 色定義

**通常**
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)
- アイコン色: `token.colorTextSecondary` (#757575)

**ホバー**
- 背景色: `token.colorBgTextHover` (#f5f5f5)
- テキスト色: `token.colorText` (#212121)
- アイコン色: `token.colorText` (#212121)

**選択/アクティブ**
- 背景色: `token.colorPrimaryBg` (#FFF1F3)
- テキスト色: `token.colorPrimary` (#CF0027)
- アイコン色: `token.colorPrimary` (#CF0027)
- ボーダー色: `token.colorPrimary` (#CF0027)

**無効**
- 背景色: `transparent`
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- アイコン色: `token.colorTextDisabled` (#bdbdbd)
- カーソル: `not-allowed`

**危険項目（削除等）**
- テキスト色: `token.colorError` (#d32f2f)
- アイコン色: `token.colorError` (#d32f2f)
- ホバー背景: `token.colorErrorBg` (#FFEBEE)

### アイコン

- サイズ: `14px`（ドロップダウン）、`16px`（サイドバー、水平メニュー）
- マージン: 右 `8px`
- カラー: テキスト色と同じ

### トランジション

- 色変化: `0.2s ease`
- 背景色変化: `0.2s ease`
- 移動: `0.3s ease-out`

---

## パターン選択

- **ヘッダーのユーザーアクション** → **パターン1（ドロップダウンメニュー）**
- **サブヘッダーの画面切り替え** → **パターン2（タブメニュー）**
- **ロール別メニュー切り替え** → **パターン3（メニュー切り替えドロップダウン）**
- **サイドバーのメインナビゲーション** → **パターン4（サイドバーメニュー）**
- **トップナビゲーション** → **パターン5（水平メニュー）**

---

## 実装例

### パターン1: ドロップダウンメニュー

```typescript
const menuItems: MenuProps['items'] = [
  {
    key: 'profile',
    label: 'プロフィール',
    icon: <UserOutlined />,
  },
  {
    key: 'settings',
    label: '設定',
    icon: <SettingOutlined />,
  },
  {
    type: 'divider',
  },
  {
    key: 'logout',
    label: 'ログアウト',
    icon: <LogoutOutlined />,
    danger: true,
  },
];

<Dropdown
  menu={{ items: menuItems }}
  trigger={['click']}
  placement="bottomRight"
>
  <Avatar>U</Avatar>
</Dropdown>
```

### パターン2: タブメニュー

```typescript
const tabItems: TabsProps['items'] = [
  {
    key: 'overview',
    label: '概要',
    icon: <AppstoreOutlined />,
  },
  {
    key: 'users',
    label: 'ユーザー管理',
    icon: <UserOutlined />,
  },
  {
    key: 'settings',
    label: '設定',
    icon: <SettingOutlined />,
  },
];

<Tabs
  activeKey={activeKey}
  items={tabItems}
  onChange={onTabChange}
  size="large"
/>
```

### パターン3: メニュー切り替えドロップダウン

```typescript
const menuItems: MenuProps['items'] = [
  {
    key: 'provider',
    label: 'プロバイダーメニュー',
    icon: <AppstoreOutlined />,
    onClick: () => onMenuChange('provider'),
  },
  {
    key: 'admin',
    label: 'システム管理者メニュー',
    icon: <TeamOutlined />,
    onClick: () => onMenuChange('admin'),
  },
];

<Dropdown
  menu={{ items: menuItems }}
  trigger={['click']}
  placement="bottomRight"
>
  <Button type="primary" ghost icon={<SwapOutlined />}>
    メニュー切替
  </Button>
</Dropdown>
```

### パターン4: サイドバーメニュー

```typescript
const menuItems: MenuProps['items'] = [
  {
    key: 'home',
    label: 'ホーム',
    icon: <HomeOutlined />,
  },
  {
    key: 'users',
    label: 'ユーザー管理',
    icon: <UserOutlined />,
    children: [
      {
        key: 'users-list',
        label: 'ユーザー一覧',
      },
      {
        key: 'users-create',
        label: 'ユーザー作成',
      },
    ],
  },
];

<Menu
  mode="inline"
  selectedKeys={[selectedKey]}
  items={menuItems}
  style={{ width: 256 }}
/>
```

### パターン5: 水平メニュー

```typescript
const menuItems: MenuProps['items'] = [
  {
    key: 'dashboard',
    label: 'ダッシュボード',
    icon: <DashboardOutlined />,
  },
  {
    key: 'projects',
    label: 'プロジェクト',
    icon: <ProjectOutlined />,
  },
  {
    key: 'reports',
    label: 'レポート',
    icon: <FileTextOutlined />,
  },
];

<Menu
  mode="horizontal"
  selectedKeys={[selectedKey]}
  items={menuItems}
  style={{ height: 48 }}
/>
```

---

## レスポンシブ対応

### モバイル（< 768px）
- サイドバーメニュー → Drawer に変換
- 水平メニュー → ハンバーガーメニューに変換
- タブメニュー → ドロップダウンに変換

### タブレット（768px - 1024px）
- サイドバー折りたたみ可能
- タブメニューはそのまま表示

### デスクトップ（> 1024px）
- 全メニュー展開表示
- ホバーエフェクト有効

---

## アクセシビリティ

### キーボード操作
- `Tab`: 次のメニュー項目へ
- `Shift + Tab`: 前のメニュー項目へ
- `Enter` / `Space`: メニュー項目を選択
- `ArrowUp` / `ArrowDown`: 垂直メニューで移動
- `ArrowLeft` / `ArrowRight`: 水平メニューで移動
- `Escape`: ドロップダウンを閉じる

### ARIA属性
- `role="menu"`: メニューコンテナ
- `role="menuitem"`: メニュー項目
- `aria-current="page"`: 現在のページ
- `aria-expanded`: サブメニューの展開状態
- `aria-disabled`: 無効状態

---

## ベストプラクティス

### DO（推奨）
✅ 階層は2階層まで
✅ メニュー項目は7±2個以内
✅ アイコンとテキストを併用
✅ 選択状態を明確に表示
✅ ホバーエフェクトを実装
✅ レスポンシブ対応を実装

### DON'T（非推奨）
❌ 3階層以上のネスト
❌ 長すぎるメニューラベル（20文字超）
❌ アイコンのみのメニュー項目
❌ 選択状態が不明確
❌ ホバーエフェクトなし
❌ モバイル対応なし

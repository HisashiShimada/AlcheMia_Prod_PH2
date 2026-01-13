# タブ切り替え形状ポリシー

## 標準3パターン

### パターン1: Line Tabs（標準タブ）
**用途**: コンテンツの切り替え全般
- タブヘッダー高さ: `token.controlHeight` (46px)
- フォントサイズ: `token.fontSize` (14px)
- インジケーター高さ: 2px
- インジケーター色: `token.colorPrimary` (#CF0027)
- タブ間隔: 32px
- パディング: 左右16px、上下12px
- 配置: 左揃え（デフォルト）
- タイプ: `type="line"`（デフォルト）

---

### パターン2: Card Tabs（カード型タブ）
**用途**: セクション分け、ページ内のコンテンツグループ
- タブヘッダー高さ: `token.controlHeight` (40px)
- フォントサイズ: `token.fontSize` (14px)
- ボーダー: 1px solid `token.colorBorder`
- ボーダー（アクティブ時）: 1px solid `token.colorPrimary`
- 角丸: `token.borderRadius` (8px) ※上部のみ
- タブ間隔: -1px（ボーダーを重ねる）
- パディング: 左右16px、上下8px
- 配置: 左揃え（デフォルト）
- タイプ: `type="card"`

---

### パターン3: Vertical Tabs（縦配置タブ）
**用途**: サイドバーでの設定項目切り替え、多数のタブ項目
- タブ幅: 200px（固定）
- タブ高さ: `token.controlHeight` (46px)
- フォントサイズ: `token.fontSize` (14px)
- インジケーター幅: 3px
- インジケーター色: `token.colorPrimary` (#CF0027)
- タブ間隔: 4px
- パディング: 左右16px、上下12px
- 配置: `tabPosition="left"`

---

## 共通仕様（全パターン）

### 色定義

**Line Tabs（パターン1）**

通常タブ:
- テキスト色: `token.colorTextSecondary` (#757575)
- 背景色: transparent

ホバー時:
- テキスト色: `token.colorPrimaryHover` (#E63946)
- 背景色: transparent

アクティブタブ:
- テキスト色: `token.colorPrimary` (#CF0027)
- 背景色: transparent
- インジケーター: 2px solid `token.colorPrimary`

無効タブ:
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- 背景色: transparent

---

**Card Tabs（パターン2）**

通常タブ:
- テキスト色: `token.colorTextSecondary` (#757575)
- 背景色: `token.colorBgContainer` (#ffffff)
- ボーダー: 1px solid `token.colorBorder`

ホバー時:
- テキスト色: `token.colorPrimaryHover` (#E63946)
- 背景色: `token.colorBgContainer` (#ffffff)
- ボーダー: 1px solid `token.colorBorder`

アクティブタブ:
- テキスト色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorBgContainer` (#ffffff)
- ボーダー: 1px solid `token.colorPrimary`
- 下ボーダー: なし（コンテンツエリアと一体化）

無効タブ:
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- 背景色: `token.colorBgContainerDisabled` (#f5f5f5)
- ボーダー: 1px solid `token.colorBorderSecondary`

---

**Vertical Tabs（パターン3）**

通常タブ:
- テキスト色: `token.colorTextSecondary` (#757575)
- 背景色: transparent

ホバー時:
- テキスト色: `token.colorPrimaryHover` (#E63946)
- 背景色: `token.colorBgTextHover` (#f5f5f5)

アクティブタブ:
- テキスト色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorPrimaryBg` (#FFF1F3)
- 左インジケーター: 3px solid `token.colorPrimary`

無効タブ:
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- 背景色: transparent

---

### アイコンの使用

**アイコン付きタブ**
- アイコンサイズ: 16px
- アイコンとテキストの間隔: 8px
- アイコン色: テキスト色と同じ

**例**:
```tsx
<Tabs
  items={[
    {
      key: '1',
      label: (
        <Space size={8}>
          <HomeOutlined style={{ fontSize: 16 }} />
          ホーム
        </Space>
      ),
      children: 'Content'
    }
  ]}
/>
```

---

### 特殊な状態

**編集可能なタブ（Editable Tabs）**
- タイプ: `type="editable-card"`
- 追加ボタン: `<PlusOutlined />` 右側に配置
- 閉じるボタン: `<CloseOutlined />` 各タブ内に配置
- 用途: ドキュメントエディタ、複数ファイル管理

**中央揃えタブ（Centered Tabs）**
- プロパティ: `centered={true}`
- 用途: ページ全体のナビゲーション、ランディングページ

**追加コンテンツ付きタブ**
- プロパティ: `tabBarExtraContent`
- 配置: タブバーの右端
- 用途: アクションボタン、検索ボックスなど

---

## パターン選択

- コンテンツの切り替え全般 → **パターン1（Line Tabs）**
- セクション分け、ページ内のコンテンツグループ → **パターン2（Card Tabs）**
- サイドバーでの設定項目切り替え、多数のタブ項目 → **パターン3（Vertical Tabs）**

---

## 除外されたパターンと標準パターンの対応

以下のパターンは標準3パターンから除外されていますが、必要に応じて使用できます。

### Editable Tabs（編集可能なタブ）
- **対応する標準パターン**: パターン2（Card Tabs）の変種
- **除外理由**: 使用頻度が低く、特殊用途のため
- **形状**: パターン2とほぼ同じ（Card型）
- **差異**: 追加ボタン（+）と閉じるボタン（×）あり
- **用途**: ドキュメントエディタ、複数ファイル管理、ブラウザタブ風UI

### Centered Tabs（中央揃えタブ）
- **対応する標準パターン**: パターン1（Line Tabs）の配置変更
- **除外理由**: 使用頻度が低いため
- **形状**: パターン1と同じ
- **差異**: `centered={true}` でタブを中央揃えにする
- **用途**: ページ全体のナビゲーション、ランディングページ

### Size Variations（サイズバリエーション）
- **対応する標準パターン**: パターン1の大きさ変更
- **除外理由**: 基本サイズで統一するため
- **形状**: `size="large"` または `size="small"`
- **差異**: 高さとフォントサイズが変わる
- **用途**: 特殊なデザイン要求がある場合のみ

### Icon Only Tabs（アイコンのみタブ）
- **対応する標準パターン**: パターン1（Line Tabs）の簡略版
- **除外理由**: アクセシビリティ上の問題があるため
- **形状**: パターン1と同じだがテキストなし
- **差異**: アイコンのみで構成
- **用途**: モバイル対応時など限定的

---

## 実装上の注意点

### タブの数
- **1-5個**: パターン1（Line Tabs）推奨
- **6-10個**: パターン3（Vertical Tabs）検討
- **11個以上**: ドロップダウンメニューやアコーディオンを検討

### レスポンシブ対応
- モバイル: タブを縦配置に変更、またはドロップダウンメニューに変換
- タブレット: 標準のLine TabsまたはCard Tabs
- デスクトップ: すべてのパターンを使用可能

### アクセシビリティ
- キーボード操作: 矢印キーでタブ間を移動
- スクリーンリーダー: `role="tablist"`, `role="tab"`, `role="tabpanel"` を自動設定
- フォーカス表示: アウトライン2px solid `token.colorPrimary`

### パフォーマンス
- 遅延レンダリング: `destroyInactiveTabPane={true}` で非アクティブタブを破棄
- 大量のタブ: 仮想スクロールを検討（カスタム実装が必要）

---

## 使用例

### パターン1: Line Tabs（標準）
```tsx
<Tabs
  type="line"
  items={[
    { key: '1', label: '基本情報', children: '基本情報コンテンツ' },
    { key: '2', label: '詳細設定', children: '詳細設定コンテンツ' },
    { key: '3', label: '履歴', children: '履歴コンテンツ' }
  ]}
/>
```

### パターン2: Card Tabs
```tsx
<Tabs
  type="card"
  items={[
    { key: '1', label: 'セクション1', children: 'セクション1コンテンツ' },
    { key: '2', label: 'セクション2', children: 'セクション2コンテンツ' }
  ]}
/>
```

### パターン3: Vertical Tabs
```tsx
<Tabs
  tabPosition="left"
  items={[
    { key: '1', label: 'アカウント設定', children: 'アカウント設定コンテンツ' },
    { key: '2', label: 'セキュリティ', children: 'セキュリティコンテンツ' },
    { key: '3', label: '通知設定', children: '通知設定コンテンツ' }
  ]}
/>

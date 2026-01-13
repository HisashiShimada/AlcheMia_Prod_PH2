# ポップオーバー表示ポリシー

## 概要

ポップオーバーは、データの詳細情報や追加コンテキストを表示するためのオーバーレイコンポーネントです。Tooltipよりも複雑な内容を表示でき、インタラクティブな要素も含められます。

## 標準4パターン

### パターン1: シンプルなテキスト表示

**用途**: 簡潔な補足情報、短い説明文

**サイズ**
- 最大幅: 280px
- パディング: 12px
- 行間: 1.5715

**内容構成**
- タイトル（オプション）: `fontSizeLG` (16px)、`fontWeightStrong` (600)
- 本文: `fontSize` (14px)、`colorText`
- 最大3行程度を推奨

**使用例**
```tsx
<Popover
  content={
    <div style={{ maxWidth: 280 }}>
      このデータは最終更新日時に自動的に同期されます。
    </div>
  }
  title="自動同期"
>
  <InfoCircleOutlined />
</Popover>
```

---

### パターン2: データラベル＋値の表示

**用途**: 構造化されたデータの詳細表示、メタデータ表示

**サイズ**
- 最大幅: 320px
- パディング: 16px
- 行間: 1.5715

**内容構成**
- タイトル: `fontSizeLG` (16px)、`fontWeightStrong` (600)
- ラベル: `fontSize` (14px)、`colorTextSecondary`、右揃え
- 値: `fontSize` (14px)、`colorText`、左揃え
- 行間隔: 8px

**レイアウト**
- ラベルと値は2カラムレイアウト
- ラベル幅: 100px（固定）
- 値幅: 残りの領域

**使用例**
```tsx
<Popover
  content={
    <div style={{ minWidth: 280 }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
        ファイル情報
      </div>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>ファイル名:</Col>
          <Col span={14}>experiment_001.maiml</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>サイズ:</Col>
          <Col span={14}>2.4 MB</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>更新日時:</Col>
          <Col span={14}>2024-12-26 15:30</Col>
        </Row>
      </Space>
    </div>
  }
>
  <Button icon={<InfoCircleOutlined />} type="text" />
</Popover>
```

---

### パターン3: リスト表示

**用途**: 複数項目の詳細表示、関連データの一覧

**サイズ**
- 最大幅: 360px
- 最大高さ: 400px（スクロール可能）
- パディング: 16px

**内容構成**
- タイトル: `fontSizeLG` (16px)、`fontWeightStrong` (600)
- リストアイテム:
  - 高さ: 32px
  - パディング: 4px 8px
  - ボーダー下: 1px solid `colorBorderSecondary`
  - ホバー: 背景色 `colorBgTextHover`

**使用例**
```tsx
<Popover
  content={
    <div style={{ maxWidth: 360, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
        関連ファイル（5件）
      </div>
      <List
        size="small"
        dataSource={files}
        renderItem={(item) => (
          <List.Item>
            <Typography.Text>{item.name}</Typography.Text>
          </List.Item>
        )}
      />
    </div>
  }
>
  <Badge count={5}>
    <Button icon={<FileOutlined />} type="text" />
  </Badge>
</Popover>
```

---

### パターン4: アクション付き表示

**用途**: インタラクティブな操作を含む詳細表示、クイックアクション

**サイズ**
- 最大幅: 320px
- パディング: 16px

**内容構成**
- タイトル: `fontSizeLG` (16px)、`fontWeightStrong` (600)
- 本文エリア: データまたは説明
- アクションエリア:
  - マージントップ: 16px
  - ボーダー上: 1px solid `colorBorderSecondary`
  - パディングトップ: 12px
  - ボタンサイズ: `small`
  - ボタン間隔: 8px

**使用例**
```tsx
<Popover
  content={
    <div style={{ width: 280 }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
        データの削除
      </div>
      <div style={{ marginBottom: 16 }}>
        このデータを削除してもよろしいですか？この操作は取り消せません。
      </div>
      <div style={{ 
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        paddingTop: 12,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8
      }}>
        <Button size="small">キャンセル</Button>
        <Button size="small" type="primary" danger>削除</Button>
      </div>
    </div>
  }
  trigger="click"
>
  <Button icon={<DeleteOutlined />} danger type="text" />
</Popover>
```

---

## 共通仕様（全パターン）

### 色定義

**背景**
- 背景色: `token.colorBgElevated` (#ffffff)
- ボーダー: 1px solid `token.colorBorderSecondary` (rgba(0,0,0,0.06))

**テキスト**
- タイトル: `token.colorText` (#212121)、`fontWeightStrong` (600)
- 本文: `token.colorText` (#212121)
- ラベル: `token.colorTextSecondary` (#757575)

**シャドウ**
- `token.boxShadowSecondary` (0 4px 12px rgba(0, 0, 0, 0.12))

### サイズとスペーシング

**最大幅**
- パターン1: 280px
- パターン2: 320px
- パターン3: 360px
- パターン4: 320px

**パディング**
- パターン1: 12px
- パターン2〜4: 16px

**ボーダーラジアス**
- `token.borderRadiusLG` (12px)

**矢印サイズ**
- 幅: 16px
- 高さ: 8px

### 配置（placement）

**推奨配置**
- デフォルト: `top`（上部に表示）
- データテーブル: `rightTop`（右上）
- アイコンボタン: `bottomLeft`（左下）
- フォームフィールド: `right`（右側）

**利用可能な配置**
- `top`, `topLeft`, `topRight`
- `bottom`, `bottomLeft`, `bottomRight`
- `left`, `leftTop`, `leftBottom`
- `right`, `rightTop`, `rightBottom`

### トリガー方式（trigger）

**hover（デフォルト）**
- マウスホバーで表示
- 遅延: 100ms
- 用途: 情報表示のみ（パターン1〜3）

**click**
- クリックで表示/非表示切替
- 外部クリックで閉じる
- 用途: アクション付き表示（パターン4）

**focus**
- フォーカスで表示
- 用途: フォーム入力のヘルプ

### アニメーション

**表示**
- 時間: `token.motionDurationMid` (0.2s)
- イージング: `token.motionEaseOut`
- 効果: フェードイン + スライド（8px）

**非表示**
- 時間: `token.motionDurationFast` (0.1s)
- イージング: `token.motionEaseIn`
- 効果: フェードアウト

---

## パターン選択ガイド

### パターン1: シンプルなテキスト表示
- ✅ 簡単な補足説明
- ✅ ヘルプテキスト
- ✅ 注意事項
- ❌ 構造化されたデータ
- ❌ インタラクティブな操作

### パターン2: データラベル＋値の表示
- ✅ ファイル情報の詳細
- ✅ ユーザー情報の詳細
- ✅ プロジェクトメタデータ
- ✅ システム情報
- ❌ 長いリスト
- ❌ アクションボタン

### パターン3: リスト表示
- ✅ 関連ファイル一覧
- ✅ 履歴データ
- ✅ タグ一覧
- ✅ メンバー一覧
- ❌ 長い説明文
- ❌ フォーム入力

### パターン4: アクション付き表示
- ✅ クイック削除確認
- ✅ インライン編集
- ✅ ステータス変更
- ✅ 簡易フォーム
- ❌ 複雑なフォーム（→ Modalを使用）
- ❌ 読み取り専用の情報

---

## Tooltip vs Popover 選択基準

### Tooltipを使用する場合
- ✅ 1行の短い説明（20文字以内）
- ✅ ラベルの補足
- ✅ アイコンの説明
- ✅ ボタンの機能説明
- ❌ 構造化されたデータ
- ❌ インタラクティブな要素

### Popoverを使用する場合
- ✅ 複数行の説明
- ✅ 構造化されたデータ（ラベル+値）
- ✅ リストやテーブル
- ✅ リンクやボタン
- ✅ 簡易フォーム
- ❌ 非常に長いコンテンツ（→ Drawerを使用）

---

## Popover vs Modal/Drawer 選択基準

### Popoverを使用する場合
- ✅ 軽量な情報表示（5行以内）
- ✅ クイックアクション（1〜2ボタン）
- ✅ 親要素との関連性が強い
- ✅ コンテキストを保持したい
- ❌ 複雑なフォーム
- ❌ 大量のデータ

### Modalを使用する場合
- ✅ 重要な操作の確認
- ✅ 複雑なフォーム入力
- ✅ ユーザーの注意を集中させたい
- ✅ 画面全体のコンテキストから切り離す

### Drawerを使用する場合
- ✅ 詳細情報の表示（多数の項目）
- ✅ 編集フォーム（多数のフィールド）
- ✅ ワークフロー（複数ステップ）
- ✅ 一覧と詳細の同時表示

---

## アクセシビリティ

### キーボード操作
- `Esc`: Popoverを閉じる
- `Tab`: フォーカス移動（Popover内のインタラクティブ要素間）
- `Enter`/`Space`: ボタンの実行

### ARIA属性
- `role="tooltip"`: 情報表示のみの場合（パターン1〜3）
- `aria-label`: トリガー要素に説明を追加
- `aria-describedby`: Popoverとトリガー要素を関連付け

### フォーカス管理
- Popover表示時、フォーカスをPopover内に移動（アクション付きの場合）
- Popover閉鎖時、フォーカスをトリガー要素に戻す

---

## 実装上の注意点

### パフォーマンス
- `destroyTooltipOnHide`: 非表示時にDOMから削除（デフォルト: false）
- 大量のPopoverがある場合はtrueに設定を検討

### ポジション自動調整
- `autoAdjustOverflow`: 画面外にはみ出す場合、自動的に位置を調整（デフォルト: true）
- モーダル内で使用する場合は `getPopupContainer` を設定

### z-index
- デフォルト: 1030
- Modalより下、Tooltipより上

### 長いコンテンツの処理
- 最大高さを設定し、スクロール可能にする
- パターン3: `maxHeight: 400px, overflow: 'auto'`

---

## 禁止事項

### ❌ やってはいけないこと
1. **Popover内にPopoverを配置しない**
   - ユーザビリティが著しく低下
   - どうしても必要な場合はDrawerを使用

2. **長い文章（10行以上）を表示しない**
   - Popoverは軽量な情報表示用
   - 長文はDrawerまたは別ページで表示

3. **複雑なフォーム（5フィールド以上）を配置しない**
   - Popoverは簡易的な入力用
   - 複雑なフォームはModalまたはDrawerを使用

4. **hover + アクションの組み合わせを避ける**
   - ホバーは情報表示のみ
   - アクションが必要な場合はclickトリガーを使用

5. **モバイルでhoverトリガーを使用しない**
   - モバイルではclickトリガーに切り替え
   - または最初からclickトリガーを使用

---

## レスポンシブ対応

### モバイル（xs, sm）
- 最大幅: 画面幅の90%
- パディング: 12px
- placement: `bottom`（画面下部に固定）
- trigger: `click`（hoverをclickに変更）

### タブレット（md）
- 最大幅: 360px
- 標準の配置ルール

### デスクトップ（lg, xl, xxl）
- 標準仕様通り

---

## カスタマイズ例

### テーマカスタマイズ
```tsx
<ConfigProvider
  theme={{
    components: {
      Popover: {
        colorBgElevated: '#ffffff',
        boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',
        borderRadiusLG: 12,
        padding: 16,
      },
    },
  }}
>
  {/* アプリケーション */}
</ConfigProvider>
```

### カスタムスタイル
```tsx
<Popover
  overlayClassName="custom-popover"
  overlayStyle={{
    maxWidth: 400,
  }}
  overlayInnerStyle={{
    padding: 20,
  }}
>
  {/* トリガー要素 */}
</Popover>
```

---

## 使用頻度と優先度

### 高頻度（必須実装）
- パターン2: データラベル＋値の表示
  - データテーブルの詳細表示で頻繁に使用

### 中頻度（推奨実装）
- パターン1: シンプルなテキスト表示
  - ヘルプテキストで使用
- パターン3: リスト表示
  - 関連データの表示で使用

### 低頻度（オプション）
- パターン4: アクション付き表示
  - クイックアクションで使用
  - ただし、Popconfirmの方が適している場合が多い

---

## まとめ

ポップオーバーは、Tooltipよりも豊かな情報を表示し、Modalよりも軽量なインタラクションを提供します。適切なパターンを選択し、ユーザーの作業を妨げない配置とトリガー方式を選ぶことが重要です。

**原則**
- 情報表示 → hover、右側または上部配置
- アクション → click、下側または右下配置
- 簡潔に → 5行以内、1画面内に収める
- コンテキストを保持 → 親要素との関連性を明確に

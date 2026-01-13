# モーダルダイアログ形状ポリシー

## 標準3パターン

### パターン1: 標準モーダル（Medium）
**用途**: 一般的なフォーム入力、確認ダイアログ
- 幅: 520px（デフォルト）～700px
- 高さ: コンテンツに応じて自動調整
- 最大高さ: `calc(100vh - 200px)`
- ボーダーラジアス: `token.borderRadiusLG` (12px)
- シャドウ: `token.boxShadowTertiary` (0 8px 24px rgba(0, 0, 0, 0.16))
- マスク背景: rgba(0, 0, 0, 0.45)
- パディング:
  - ヘッダー: 上下16px、左右24px
  - ボディ: 24px
  - フッター: 上下10px、左右16px
- スクロール: ボディ部分のみスクロール可能

---

### パターン2: 大型モーダル（Large）
**用途**: 複雑な選択UI、詳細情報表示、複数ステップのウィザード
- 幅: 800px～1200px
- 高さ: コンテンツに応じて自動調整
- 最大高さ: `calc(100vh - 100px)`
- ボーダーラジアス: `token.borderRadiusLG` (12px)
- シャドウ: `token.boxShadowTertiary` (0 8px 24px rgba(0, 0, 0, 0.16))
- マスク背景: rgba(0, 0, 0, 0.45)
- パディング:
  - ヘッダー: 上下16px、左右24px
  - ボディ: 24px
  - フッター: 上下10px、左右16px
- スクロール: ボディ部分のみスクロール可能

---

### パターン3: 全画面モーダル（Fullscreen）
**用途**: ビューアー、エディタ、大量データの閲覧・編集
- 幅: `100vw`
- 高さ: `100vh`
- ボーダーラジアス: 0px（全画面のため角丸なし）
- シャドウ: なし
- マスク背景: なし（全画面表示のため不要）
- パディング:
  - ヘッダー: 上下16px、左右32px
  - ボディ: 0px（コンテンツが独自にパディングを持つ）
  - フッター: 上下16px、左右32px
- スクロール: ボディ部分のみスクロール可能
- 閉じるボタン: 右上に大きく配置（44px × 44px以上）

---

## 共通仕様（全パターン）

### 色定義

**背景色**
- モーダル背景: `token.colorBgElevated` (#ffffff)
- マスク背景: rgba(0, 0, 0, 0.45)
- ヘッダー背景: `token.colorBgElevated` (#ffffff)
- ボディ背景: `token.colorBgElevated` (#ffffff)
- フッター背景: `token.colorBgElevated` (#ffffff)

**ボーダー色**
- ヘッダー下ボーダー: `token.colorBorderSecondary` (rgba(0, 0, 0, 0.06))
- フッター上ボーダー: `token.colorBorderSecondary` (rgba(0, 0, 0, 0.06))

**テキスト色**
- タイトル: `token.colorText` (#212121)
- 本文: `token.colorText` (#212121)
- 補足テキスト: `token.colorTextSecondary` (#757575)

### アニメーション

**表示アニメーション**
- duration: `token.motionDurationMid` (0.2s)
- easing: `token.motionEaseOut`
- 効果: フェードイン + スケールアップ（0.95 → 1.0）

**非表示アニメーション**
- duration: `token.motionDurationMid` (0.2s)
- easing: `token.motionEaseIn`
- 効果: フェードアウト + スケールダウン（1.0 → 0.95）

### ヘッダー構成

**標準ヘッダー**
- タイトル: `fontSize: token.fontSizeLG` (16px)、`fontWeight: token.fontWeightStrong` (600)
- アイコン: オプション（タイトルの左側、16-20px）
- 閉じるボタン: 右上（×マーク、16px）
- 下ボーダー: 1px solid `token.colorBorderSecondary`

**全画面モーダルヘッダー**
- タイトル: `fontSize: token.fontSizeHeading4` (20px)、`fontWeight: token.fontWeightStrong` (600)
- アイコン: オプション（タイトルの左側、20-24px）
- 閉じるボタン: 右上（×マーク、20px、タッチ領域44px以上）
- 下ボーダー: 1px solid `token.colorBorderSecondary`

### フッター構成

**ボタン配置**
- 右揃え
- ボタン間隔: `token.marginXS` (8px)
- ボタン順序: 左から「戻る」「キャンセル」「決定/OK」
- プライマリボタン: 最右（決定/OKアクション）
- デフォルトボタン: その他のアクション

**ボタンパターン**
- 1ボタン: 「閉じる」のみ（情報表示モーダル）
- 2ボタン: 「キャンセル」「決定」（確認ダイアログ）
- 3ボタン以上: 「戻る」「キャンセル」「決定」（ウィザード形式）

### レスポンシブ対応

**モバイル（xs, sm: 〜767px）**
- パターン1・2: 幅100%、左右マージン16px
- パターン3: そのまま全画面
- 高さ: `calc(100vh - 32px)`

**タブレット（md: 768px〜991px）**
- パターン1: 幅600px
- パターン2: 幅700px
- パターン3: そのまま全画面

**デスクトップ（lg以上: 992px〜）**
- 指定された幅を使用

---

## パターン選択

- 一般的なフォーム入力、確認ダイアログ → **パターン1（標準モーダル）**
- 複雑な選択UI、詳細情報表示 → **パターン2（大型モーダル）**
- ビューアー、エディタ、大量データの閲覧・編集 → **パターン3（全画面モーダル）**

---

## 特殊パターンと実装例

### ドロワー（Drawer）
- **除外理由**: 別コンポーネント（横からスライドイン）のため
- **用途**: サイドメニュー、通知パネル、設定パネル
- **差異**: 画面端から表示、モーダルと異なりマスクの透明度が低い
- **幅**: デフォルト378px、サイズ指定可能

### ポップオーバー（Popover）
- **除外理由**: 軽量な吹き出し表示のため
- **用途**: ツールチップ、簡易な情報表示
- **差異**: マスクなし、小さなサイズ、対象要素に追従

### 確認ダイアログ（Modal.confirm）
- **対応する標準パターン**: パターン1（標準モーダル）の特殊形
- **用途**: 削除確認、重要なアクションの確認
- **差異**: 
  - アイコン付き（warning、info、error、success）
  - ボタンは「キャンセル」「OK」の2つ
  - コンテンツはシンプルなテキストのみ

---

## 実装上の注意点

### キーボード操作
- **Escキー**: モーダルを閉じる（全パターン共通）
- **Enterキー**: プライマリボタンのアクション（フォーカスがボタン以外の場合）
- **Tabキー**: フォーカス移動（モーダル内のみ）
- **フォーカストラップ**: モーダル外にフォーカスが移動しないようにする

### アクセシビリティ
- **role="dialog"**: ARIA属性を自動付与
- **aria-modal="true"**: モーダル状態を明示
- **aria-labelledby**: タイトルとの関連付け
- **aria-describedby**: 説明テキストとの関連付け（オプション）
- **フォーカス管理**: モーダル表示時に最初のフォーカス可能要素にフォーカス

### スクロール制御
- モーダル表示中はbody要素のスクロールを無効化
- モーダル内のスクロールは有効
- 全画面モーダルでは独自のスクロール管理を実装

### z-index管理
- モーダルマスク: z-index 1000
- モーダルコンテンツ: z-index 1000
- ネストされたモーダル: 親モーダルより+1000

### パフォーマンス最適化
- 大量データを表示する場合は仮想スクロール（Virtual List）を使用
- モーダル内の画像は遅延読み込み（Lazy Loading）
- 非表示時はDOMからアンマウント（destroyOnClose={true}）

---

## 使用コンポーネント

### Ant Design Modal
```tsx
import { Modal } from 'antd';

// パターン1: 標準モーダル
<Modal
  open={open}
  onOk={handleOk}
  onCancel={handleCancel}
  title="タイトル"
  width={520}
>
  {/* コンテンツ */}
</Modal>

// パターン2: 大型モーダル
<Modal
  open={open}
  onOk={handleOk}
  onCancel={handleCancel}
  title="タイトル"
  width={900}
>
  {/* コンテンツ */}
</Modal>

// パターン3: 全画面モーダル
<Modal
  open={open}
  onOk={handleOk}
  onCancel={handleCancel}
  title="タイトル"
  width="100vw"
  style={{ maxWidth: '100vw', top: 0, paddingBottom: 0 }}
  bodyStyle={{ height: 'calc(100vh - 110px)', overflow: 'auto' }}
>
  {/* コンテンツ */}
</Modal>
```

### カスタムフッター
```tsx
<Modal
  footer={
    <Space>
      <Button onClick={handleBack} icon={<ArrowLeftOutlined />}>
        戻る
      </Button>
      <Button onClick={handleCancel}>
        キャンセル
      </Button>
      <Button type="primary" onClick={handleOk}>
        決定
      </Button>
    </Space>
  }
>
  {/* コンテンツ */}
</Modal>
```

---

## デザイントークン参照

```typescript
// モーダル関連トークン
{
  // サイズ
  modalHeaderHeight: 55,
  modalFooterHeight: 62,
  
  // ボーダーラジアス
  borderRadiusLG: 12,
  
  // シャドウ
  boxShadowTertiary: '0 8px 24px rgba(0, 0, 0, 0.16)',
  
  // パディング
  paddingMD: 16,
  paddingLG: 24,
  
  // マージン
  marginXS: 8,
  marginSM: 12,
  
  // モーション
  motionDurationMid: '0.2s',
  motionEaseOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  motionEaseIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
}

# テキストボックス形状ポリシー
## 標準3パターン
### パターン1: 標準入力
**用途**: フォーム入力全般
- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- ボーダー: 1px solid `token.colorBorder`
- ボーダー（フォーカス時）: 1px solid `token.colorPrimary`
- 角丸: `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (11px)、上下4px
- 幅: 親要素に合わせる
---
### パターン2: 検索入力
**用途**: 検索・フィルタリング
- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- ボーダー: 1px solid `token.colorBorder`
- ボーダー（フォーカス時）: 1px solid `token.colorPrimary`
- 角丸: `token.borderRadius` (8px)
- パディング: 左右36px、上下4px
- 幅: **250px固定**（200-300pxの範囲で調整可）
- prefix: SearchOutlined（14px）
- allowClear: 必須
---
### パターン3: 複数行入力
**用途**: 説明文・長文入力
- 高さ: 96px（4行×24px）
- 行数: 4行固定
- フォントサイズ: `token.fontSize` (14px)
- ボーダー: 1px solid `token.colorBorder`
- ボーダー（フォーカス時）: 1px solid `token.colorPrimary`
- 角丸: `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (11px)、上下4px
- 幅: 親要素に合わせる
---
## 共通仕様（全パターン）
### 色定義
**通常**
- ボーダー色: `token.colorBorder` (rgba(0,0,0,0.12))
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

**ホバー**
- ボーダー色: `token.colorBorder` (rgba(0,0,0,0.12))
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

**フォーカス**
- ボーダー色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)
- シャドウ: 0 0 0 2px `token.colorPrimaryBg`

**無効**
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- 背景色: `token.colorBgContainerDisabled` (#f5f5f5)
- テキスト色: `token.colorTextDisabled` (#bdbdbd)

**エラー**
- ボーダー色: `token.colorError` (#d32f2f)
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

### 特殊な色
- プレースホルダー: `token.colorTextTertiary` (#9e9e9e)
- 検索アイコン: `token.colorTextSecondary` (#757575)
---
## パターン選択
- フォーム入力全般 → **パターン1（標準入力）**
- 検索・フィルタリング → **パターン2（検索入力）**
- 説明文・長文入力 → **パターン3（複数行入力）**
---
## 除外されたパターンと標準パターンの対応
以下のパターンは標準3パターンから除外されていますが、基本的には**パターン1（標準入力）**の変種として扱います。

### Select（選択入力）
- **対応する標準パターン**: パターン1（標準入力）の変種
- **除外理由**: 別コンポーネント（ドロップダウン）のため
- **形状**: パターン1とほぼ同じ（高さ32px、角丸8px）
- **差異**: 右側にドロップダウン矢印あり
- **幅**: 150px / 200px / 250px（選択肢の長さに応じて固定幅）

### InputNumber（数値入力）
- **対応する標準パターン**: パターン1（標準入力）の変種
- **除外理由**: 使用頻度が低く、特殊用途のため
- **形状**: パターン1とほぼ同じ（高さ32px、角丸8px）
- **差異**: 右側にステッパーボタン（増減ボタン）あり
- **幅**: 100%（親要素に合わせる）

### 大型入力（Large Size）
- **対応する標準パターン**: パターン1（標準入力）の大型版
- **除外理由**: ログイン画面専用で汎用性が低いため
- **形状**: パターン1を大きくしたもの
- **差異**: 高さ40px（vs 32px）、フォント16px（vs 14px）
- **用途**: ログイン画面のユーザー名・パスワード入力のみ

### 読み取り専用（Disabled Input）
- **対応する標準パターン**: パターン1（標準入力）の状態変化
- **除外理由**: 使用頻度が極めて低いため
- **形状**: パターン1と同じ（高さ32px、角丸8px）
- **差異**: disabled属性により背景色・テキスト色が変わる
- **用途**: 編集不可の情報表示
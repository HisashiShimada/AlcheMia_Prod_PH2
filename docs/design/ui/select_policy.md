# セレクト（Select）形状ポリシー

## 標準3パターン

### パターン1: 標準セレクト（固定幅150px）
**用途**: フィルター・絞込（短い選択肢）
- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- ボーダー: 1px solid `token.colorBorder`
- ボーダー（フォーカス時）: 1px solid `token.colorPrimary`
- 角丸: `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (11px)、上下4px
- 幅: **150px固定**
- allowClear: 任意（フィルター用途では推奨）

**使用例:**
- 所有者絞込
- 部門絞込
- ステータス絞込
- 優先度選択

---

### パターン2: 中型セレクト（固定幅200px）
**用途**: フィルター・絞込（やや長い選択肢）
- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- ボーダー: 1px solid `token.colorBorder`
- ボーダー（フォーカス時）: 1px solid `token.colorPrimary`
- 角丸: `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (11px)、上下4px
- 幅: **200px固定**
- allowClear: 任意（フィルター用途では推奨）

**使用例:**
- プロジェクトステータス絞込
- カテゴリ選択
- トランジション選択

---

### パターン3: フルワイド（可変幅）
**用途**: フォーム入力・複数選択
- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- ボーダー: 1px solid `token.colorBorder`
- ボーダー（フォーカス時）: 1px solid `token.colorPrimary`
- 角丸: `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (11px)、上下4px
- 幅: **100%（親要素に合わせる）**
- allowClear: 推奨

**使用例:**
- 作業者選択
- メンバー選択
- フォーム内の選択項目

---

## 共通仕様（全パターン）

### 色定義

**通常**
- ボーダー色: `token.colorBorder` (rgba(0,0,0,0.12))
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)
- 矢印色: `token.colorTextSecondary` (#757575)

**ホバー**
- ボーダー色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

**フォーカス（開いている状態）**
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

### ドロップダウンメニュー

**背景色**: `token.colorBgElevated` (#ffffff)
**シャドウ**: セカンダリシャドウ `0 4px 12px rgba(0, 0, 0, 0.12)`
**ボーダー**: `1px solid token.colorBorderSecondary`

**メニューアイテム（通常）**
- 背景色: `transparent`
- テキスト色: `token.colorText` (#212121)
- パディング: `5px 12px`

**メニューアイテム（ホバー）**
- 背景色: `token.colorBgTextHover` (#f5f5f5)
- テキスト色: `token.colorText` (#212121)

**メニューアイテム（選択済み）**
- 背景色: `token.colorPrimaryBg` (#FFF1F3)
- テキスト色: `token.colorPrimary` (#CF0027)
- アイコン: チェックマーク（赤）

### 特殊な色
- プレースホルダー: `token.colorTextTertiary` (#9e9e9e)
- ローディングスピナー: `token.colorPrimary` (#CF0027)
- クリアボタン: `token.colorTextSecondary` (#757575)

---

## パターン選択

- フィルター・絞込（短い選択肢） → **パターン1（150px固定）**
- フィルター・絞込（やや長い選択肢） → **パターン2（200px固定）**
- フォーム入力・選択項目 → **パターン3（フルワイド）**

---

## 除外されたパターンと標準パターンの対応

以下のパターンは標準3パターンから除外されていますが、基本的には**パターン1〜3のバリエーション**として扱います。

### 複数選択（mode="multiple"）
- **対応する標準パターン**: パターン3（フルワイド）の変種
- **除外理由**: 特殊な動作（複数選択）のため
- **形状**: パターン3とほぼ同じ
- **差異**: 選択した項目がタグとして表示され、高さが可変
- **幅**: 100%（親要素に合わせる）
- **用途**: メンバー選択、タグ選択

### タグ選択（mode="tags"）
- **対応する標準パターン**: パターン3（フルワイド）の変種
- **除外理由**: 自由入力可能な特殊用途のため
- **形状**: パターン3とほぼ同じ
- **差異**: ユーザーが任意の文字列を入力して新規タグを作成可能
- **幅**: 100%（親要素に合わせる）
- **用途**: キーワード入力、自由なタグ付け

### 検索可能セレクト（showSearch）
- **対応する標準パターン**: パターン1〜3に検索機能を追加
- **除外理由**: 標準パターンのオプション機能のため
- **形状**: パターン1〜3と同じ
- **差異**: showSearch={true}で検索ボックスが表示される
- **用途**: 選択肢が多い場合（10個以上）

### TreeSelect（ツリー構造選択）
- **対応する標準パターン**: パターン3（フルワイド）の変種
- **除外理由**: 特殊なUI構造（ツリー）のため
- **形状**: パターン3とほぼ同じ（高さ32px、角丸8px）
- **差異**: ドロップダウンメニューがツリー構造
- **幅**: 100%（親要素に合わせる）
- **用途**: フォルダー選択、組織階層選択

### Cascader（カスケード選択）
- **対応する標準パターン**: パターン2（200px固定）の変種
- **除外理由**: 階層的な選択UIのため
- **形状**: パターン2とほぼ同じ（高さ32px、角丸8px）
- **差異**: 段階的に選択肢が展開
- **幅**: 200px〜300px（階層の深さに応じて固定幅）
- **用途**: 地域選択、カテゴリ選択

### AutoComplete（自動補完）
- **対応する標準パターン**: パターン3（フルワイド）とInputの中間
- **除外理由**: 検索入力とセレクトのハイブリッドのため
- **形状**: パターン3とほぼ同じ（高さ32px、角丸8px）
- **差異**: 入力と同時に候補を表示
- **幅**: 100%（親要素に合わせる）または250px固定（検索用途）
- **用途**: 検索サジェスト、住所入力

### 大型セレクト（Large Size）
- **対応する標準パターン**: パターン1〜3の大型版
- **除外理由**: ログイン画面専用で汎用性が低いため
- **形状**: パターン1〜3を大きくしたもの
- **差異**: 高さ40px（vs 32px）、フォント16px（vs 14px）
- **用途**: ログイン画面、重要な選択項目

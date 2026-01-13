# ドロップダウン（Select）形状ポリシー

## 標準3パターン

### パターン1: 標準ドロップダウン（固定幅）
**用途**: フィルター・選択項目（短い選択肢）
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
- チェックアウトステータス絞込
- 優先度選択
- タイプ選択

---

### パターン2: 中型ドロップダウン（固定幅）
**用途**: フィルター・選択項目（やや長い選択肢）
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
- 対象範囲選択

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
- mode: 必要に応じて `multiple` または `tags`

**使用例:**
- 作業者選択
- メンバー選択（複数選択）
- タグ選択（複数選択）
- フォーム内の選択項目

---

## 共通仕様（全パターン）

### 色定義

**通常**
- ボーダー色: `token.colorBorder` (rgba(0,0,0,0.12))
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

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
- アイコン: チェックマーク（青）

**メニューアイテム（無効）**
- 背景色: `transparent`
- テキスト色: `token.colorTextDisabled` (#bdbdbd)

### プレースホルダー
- 色: `token.colorTextTertiary` (#9e9e9e)

### ローディング
- loading属性でスピナー表示
- スピナー色: `token.colorPrimary`

### 矢印アイコン
- 色: `token.colorTextSecondary` (#757575)
- サイズ: 12px
- 回転: ドロップダウン展開時180度回転

### クリアボタン（allowClear時）
- アイコン色: `token.colorTextSecondary` (#757575)
- ホバー時色: `token.colorText` (#212121)

---

## パターン選択

- フィルター・絞込（短い選択肢） → **パターン1（150px固定）**
- フィルター・絞込（やや長い選択肢） → **パターン2（200px固定）**
- フォーム入力・複数選択 → **パターン3（フルワイド）**

---

## 複数選択（mode="multiple"）

### パターン3の変種として実装

**用途**: 複数項目の選択
- 高さ: 自動（選択した項目数に応じて拡大）
- 最小高さ: `token.controlHeight` (32px)
- 幅: **100%（親要素に合わせる）**
- maxTagCount: 表示するタグの最大数（通常3〜5）
- maxTagPlaceholder: 残りのタグ数表示

**選択済みタグ**
- 背景色: `token.colorFillSecondary` (#f5f5f5)
- テキスト色: `token.colorText` (#212121)
- 高さ: 24px
- ボーダーラジアス: `token.borderRadiusSM` (4px)
- パディング: `0 7px`
- マージン: `2px 4px 2px 0`

**タグ閉じるボタン**
- アイコン: ×
- 色: `token.colorTextSecondary` (#757575)
- ホバー時色: `token.colorError` (#d32f2f)

---

## タグ選択（mode="tags"）

### パターン3の変種として実装

**用途**: 自由入力可能なタグ選択
- パターン3（フルワイド）と同じ基本仕様
- ユーザーが任意の文字列を入力して新規タグを作成可能
- Enterキーで確定

**使用例:**
- タグ付け機能
- キーワード入力

---

## 除外されたパターンと標準パターンの対応

以下のパターンは標準3パターンから除外されていますが、基本的には**パターン1〜3のバリエーション**として扱います。

### TreeSelect（ツリー構造選択）
- **対応する標準パターン**: パターン3（フルワイド）の変種
- **除外理由**: 特殊なUI構造のため
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
- **除外理由**: 検索入力とドロップダウンのハイブリッドのため
- **形状**: パターン3とほぼ同じ（高さ32px、角丸8px）
- **差異**: 入力と同時に候補を表示
- **幅**: 100%（親要素に合わせる）または250px固定（検索用途）
- **用途**: 検索サジェスト、住所入力

### 大型ドロップダウン（Large Size）
- **対応する標準パターン**: パターン1〜3の大型版
- **除外理由**: 特殊な用途で汎用性が低いため
- **形状**: パターン1〜3を大きくしたもの
- **差異**: 高さ40px（vs 32px）、フォント16px（vs 14px）
- **用途**: ログイン画面、重要な選択項目

### 検索可能ドロップダウン（showSearch）
- **対応する標準パターン**: パターン1〜3に検索機能を追加
- **除外理由**: 標準パターンのオプション機能のため
- **形状**: パターン1〜3と同じ
- **差異**: showSearch={true}で検索ボックスが表示される
- **用途**: 選択肢が多い場合（10個以上）

---

## 実装例

### パターン1: 標準ドロップダウン（150px固定）
```tsx
<Select
  style={{ width: 150 }}
  value={selectedValue}
  onChange={handleChange}
  options={[
    { value: 'option1', label: 'オプション1' },
    { value: 'option2', label: 'オプション2' },
    { value: 'option3', label: 'オプション3' },
  ]}
  allowClear
/>
```

### パターン2: 中型ドロップダウン（200px固定）
```tsx
<Select
  style={{ width: 200 }}
  value={selectedStatus}
  onChange={handleStatusChange}
  options={[
    { value: 'all', label: 'すべて' },
    { value: 'planning', label: '計画中' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '完了' },
  ]}
  allowClear
/>
```

### パターン3: フルワイド（可変幅）
```tsx
<Select
  style={{ width: '100%' }}
  value={selectedWorkerId}
  onChange={handleWorkerChange}
  placeholder="作業者を選択してください"
  allowClear
>
  {workers.map((worker) => (
    <Select.Option key={worker.id} value={worker.id}>
      {worker.name} ({worker.id})
    </Select.Option>
  ))}
</Select>
```

### 複数選択（mode="multiple"）
```tsx
<Select
  mode="multiple"
  style={{ width: '100%' }}
  value={selectedMembers}
  onChange={handleMembersChange}
  placeholder="メンバーを選択してください"
  maxTagCount={3}
  maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
  allowClear
>
  {members.map((member) => (
    <Select.Option key={member.id} value={member.id}>
      {member.name}
    </Select.Option>
  ))}
</Select>
```

### 検索可能ドロップダウン
```tsx
<Select
  style={{ width: 200 }}
  value={selectedTransitionId}
  onChange={handleTransitionChange}
  placeholder="トランジションを選択..."
  showSearch
  filterOption={(input, option) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
  }
  options={transitions.map((t) => ({
    value: t.id,
    label: t.displayName,
  }))}
  loading={loadingTransitions}
/>
```

---

## レスポンシブ対応

### モバイル（xs, sm）
- パターン1（150px） → `width: '100%'` に変更
- パターン2（200px） → `width: '100%'` に変更
- パターン3（100%） → そのまま

### タブレット（md）
- パターン1（150px） → そのまま
- パターン2（200px） → そのまま
- パターン3（100%） → そのまま

### デスクトップ（lg, xl, xxl）
- すべてのパターンをそのまま使用

---

## アクセシビリティ

### キーボード操作
- **Tab**: フォーカス移動
- **Enter / Space**: ドロップダウンを開く/閉じる
- **↑ / ↓**: 選択肢の移動
- **Esc**: ドロップダウンを閉じる
- **A-Z**: 入力された文字で始まる選択肢にジャンプ（showSearch時）

### ARIA属性
- Ant Designが自動的に以下を付与:
  - `role="combobox"`
  - `aria-expanded="true/false"`
  - `aria-haspopup="listbox"`
  - `aria-label` または `aria-labelledby`（必要に応じて追加）

### スクリーンリーダー対応
- 選択肢の数をアナウンス
- 選択済み項目をアナウンス
- 検索可能な場合、その旨をアナウンス

---

## ベストプラクティス

### DO（推奨）
✅ フィルター用途では固定幅（150px or 200px）を使用する
✅ フォーム入力では100%幅を使用する
✅ 選択肢が多い（10個以上）場合は`showSearch={true}`を追加する
✅ フィルター用途では`allowClear`を有効にする
✅ 複数選択では`maxTagCount`を設定する（推奨: 3〜5）
✅ `placeholder`でユーザーに期待する入力を明示する
✅ `loading`属性でデータ取得中を示す
✅ 選択肢に適切なラベルを付ける（IDだけでなく名前も表示）

### DON'T（非推奨）
❌ フィルター用途で100%幅を使用しない
❌ フォーム入力で固定幅（150px, 200px）を使用しない
❌ `placeholder`なしで使用しない
❌ 選択肢が多いのに検索機能を付けない
❌ 複数選択で`maxTagCount`を設定せずに使用しない（UIが崩れる）
❌ 無効状態（disabled）の説明なしに使用しない
❌ エラー状態の視覚的フィードバックなしに使用しない

---

## バリデーションとエラー表示

### 必須項目
```tsx
<Form.Item
  label="作業者"
  name="workerId"
  rules={[{ required: true, message: '作業者を選択してください' }]}
>
  <Select
    style={{ width: '100%' }}
    placeholder="作業者を選択してください"
  >
    {/* options */}
  </Select>
</Form.Item>
```

### エラー状態
- Ant DesignのFormコンポーネントが自動的にエラー状態を適用
- ボーダー色: `token.colorError` (#d32f2f)
- エラーメッセージ: フィールド下部に赤色で表示

---

## 関連ドキュメント

- [テキストボックス形状ポリシー](./textbox_policy.md)
- [ボタン形状ポリシー](./button_policy.md)
- [チェックボックス形状ポリシー](./checkbox_policy.md)
- [ラジオボタン形状ポリシー](./radiobutton_policy.md)
- [UIポリシー](../../.clinerules/ui_policy.md)
- [フロントエンド規約](../../.clinerules/frontend.md)

---

**作成日:** 2024-12-25  
**更新履歴:**
- 2024-12-25: 初版作成（全画面からドロップダウン使用パターンを抽出・分類）

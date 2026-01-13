# 結果ページ表示ポリシー

## 標準7パターン

### パターン1: 成功結果（Success）
**用途**: 処理成功後の完了画面
- コンポーネント: `Result`
- status: `"success"`
- アイコン色: `token.colorSuccess` (#2e7d32)
- タイトル色: `token.colorText` (#212121)
- サブタイトル色: `token.colorTextSecondary` (#757575)
- アイコンサイズ: 72px
- タイトルフォント: `token.fontSizeHeading3` (24px)、`token.fontWeightStrong` (600)
- サブタイトルフォント: `token.fontSize` (14px)
- 垂直マージン: `token.marginXXL` (48px)
- ボタン: プライマリボタン（次のアクション）+ デフォルトボタン（戻る）

---

### パターン2: エラー結果（Error）
**用途**: 処理失敗後のエラー画面
- コンポーネント: `Result`
- status: `"error"`
- アイコン色: `token.colorError` (#d32f2f)
- タイトル色: `token.colorText` (#212121)
- サブタイトル色: `token.colorTextSecondary` (#757575)
- アイコンサイズ: 72px
- タイトルフォント: `token.fontSizeHeading3` (24px)、`token.fontWeightStrong` (600)
- サブタイトルフォント: `token.fontSize` (14px)
- 垂直マージン: `token.marginXXL` (48px)
- ボタン: プライマリボタン（再試行）+ デフォルトボタン（戻る）

---

### パターン3: 警告結果（Warning）
**用途**: 処理完了したが注意が必要な場合
- コンポーネント: `Result`
- status: `"warning"`
- アイコン色: `token.colorWarning` (#ed6c02)
- タイトル色: `token.colorText` (#212121)
- サブタイトル色: `token.colorTextSecondary` (#757575)
- アイコンサイズ: 72px
- タイトルフォント: `token.fontSizeHeading3` (24px)、`token.fontWeightStrong` (600)
- サブタイトルフォント: `token.fontSize` (14px)
- 垂直マージン: `token.marginXXL` (48px)
- ボタン: プライマリボタン（確認）+ デフォルトボタン（戻る）

---

### パターン4: 情報結果（Info）
**用途**: 情報提供や案内画面
- コンポーネント: `Result`
- status: `"info"`
- アイコン色: `token.colorInfo` (#0093CF)
- タイトル色: `token.colorText` (#212121)
- サブタイトル色: `token.colorTextSecondary` (#757575)
- アイコンサイズ: 72px
- タイトルフォント: `token.fontSizeHeading3` (24px)、`token.fontWeightStrong` (600)
- サブタイトルフォント: `token.fontSize` (14px)
- 垂直マージン: `token.marginXXL` (48px)
- ボタン: プライマリボタン（次へ）

---

### パターン5: 404エラーページ（Not Found）
**用途**: ページが見つからない場合
- コンポーネント: `Result`
- status: `"404"`
- アイコン色: `token.colorTextTertiary` (#9e9e9e)
- タイトル: "404"
- サブタイトル: "お探しのページは見つかりませんでした"
- タイトル色: `token.colorText` (#212121)
- サブタイトル色: `token.colorTextSecondary` (#757575)
- アイコンサイズ: 72px
- タイトルフォント: `token.fontSizeHeading3` (24px)、`token.fontWeightStrong` (600)
- サブタイトルフォント: `token.fontSize` (14px)
- 垂直マージン: `token.marginXXL` (48px)
- ボタン: プライマリボタン（ホームに戻る）

---

### パターン6: 403アクセス拒否ページ（Forbidden）
**用途**: アクセス権限がない場合
- コンポーネント: `Result`
- status: `"403"`
- アイコン色: `token.colorTextTertiary` (#9e9e9e)
- タイトル: "403"
- サブタイトル: "このページへのアクセス権限がありません"
- タイトル色: `token.colorText` (#212121)
- サブタイトル色: `token.colorTextSecondary` (#757575)
- アイコンサイズ: 72px
- タイトルフォント: `token.fontSizeHeading3` (24px)、`token.fontWeightStrong` (600)
- サブタイトルフォント: `token.fontSize` (14px)
- 垂直マージン: `token.marginXXL` (48px)
- ボタン: プライマリボタン（ホームに戻る）

---

### パターン7: 500サーバーエラーページ（Server Error）
**用途**: サーバーエラーが発生した場合
- コンポーネント: `Result`
- status: `"500"`
- アイコン色: `token.colorTextTertiary` (#9e9e9e)
- タイトル: "500"
- サブタイトル: "サーバーエラーが発生しました"
- タイトル色: `token.colorText` (#212121)
- サブタイトル色: `token.colorTextSecondary` (#757575)
- アイコンサイズ: 72px
- タイトルフォント: `token.fontSizeHeading3` (24px)、`token.fontWeightStrong` (600)
- サブタイトルフォント: `token.fontSize` (14px)
- 垂直マージン: `token.marginXXL` (48px)
- ボタン: プライマリボタン（再試行）+ デフォルトボタン（ホームに戻る）

---

## 共通仕様（全パターン）

### レイアウト
- 水平方向: 中央揃え
- 垂直方向: 中央揃え（画面高さの中央）
- 最小高さ: `calc(100vh - 112px)` （ヘッダー64px + サブヘッダー48px）
- 背景色: `token.colorBgLayout` (#fafafa)
- 内部パディング: `token.marginXXL` (48px)

### アイコン
- サイズ: 72px × 72px
- スタイル: statusに応じた自動アイコン
- マージン下: `token.marginLG` (24px)

### タイトル
- フォントサイズ: `token.fontSizeHeading3` (24px)
- フォントウェイト: `token.fontWeightStrong` (600)
- 行の高さ: `token.lineHeightHeading3` (1.35)
- 色: `token.colorText` (#212121)
- マージン下: `token.marginSM` (12px)

### サブタイトル
- フォントサイズ: `token.fontSize` (14px)
- フォントウェイト: 400（通常）
- 行の高さ: `token.lineHeight` (1.5715)
- 色: `token.colorTextSecondary` (#757575)
- マージン下: `token.marginLG` (24px)
- 最大幅: 600px（長文の場合）

### 追加コンテンツ（extra）
- マージン上: `token.marginLG` (24px)
- ボタン間隔: `token.marginSM` (12px)（Spaceコンポーネント使用）

### ボタン配置
- 水平配置: Space コンポーネントで `horizontal`、`size="middle"` (16px)
- 順序: プライマリボタン（左） + デフォルトボタン（右）
- 単独ボタンの場合: プライマリボタンのみ

---

## カラー定義（status別）

### Success（成功）
- アイコン色: `token.colorSuccess` (#2e7d32)
- アイコン背景: `token.colorSuccessBg` (#E8F5E9)

### Error（エラー）
- アイコン色: `token.colorError` (#d32f2f)
- アイコン背景: `token.colorErrorBg` (#FFEBEE)

### Warning（警告）
- アイコン色: `token.colorWarning` (#ed6c02)
- アイコン背景: `token.colorWarningBg` (#FFF4E5)

### Info（情報）
- アイコン色: `token.colorInfo` (#0093CF)
- アイコン背景: `token.colorInfoBg` (#E6F7FC)

### 404 / 403 / 500（エラーページ）
- アイコン色: `token.colorTextTertiary` (#9e9e9e)
- アイコン背景: `token.colorFillQuaternary` (#f0f0f0)

---

## パターン選択ガイド

### 処理結果の表示
- 処理が成功した場合 → **パターン1（成功結果）**
- 処理が失敗した場合 → **パターン2（エラー結果）**
- 処理は完了したが注意が必要な場合 → **パターン3（警告結果）**
- 情報提供や案内画面 → **パターン4（情報結果）**

### エラーページの表示
- ページが存在しない場合 → **パターン5（404エラー）**
- アクセス権限がない場合 → **パターン6（403アクセス拒否）**
- サーバーエラーが発生した場合 → **パターン7（500サーバーエラー）**

---

## レスポンシブ対応

### デスクトップ（lg以上、992px以上）
- アイコンサイズ: 72px
- タイトルフォント: 24px
- サブタイトルフォント: 14px
- 内部パディング: 48px

### タブレット（md、768px～991px）
- アイコンサイズ: 64px
- タイトルフォント: 20px
- サブタイトルフォント: 14px
- 内部パディング: 32px

### モバイル（sm以下、767px以下）
- アイコンサイズ: 48px
- タイトルフォント: 18px
- サブタイトルフォント: 14px
- 内部パディング: 24px
- ボタン: ブロック表示（幅100%）

---

## 使用例

### パターン1: 成功結果
```tsx
<Result
  status="success"
  title="登録が完了しました"
  subTitle="ユーザー情報が正常に登録されました。"
  extra={[
    <Button type="primary" key="next">
      次へ進む
    </Button>,
    <Button key="back">
      一覧に戻る
    </Button>
  ]}
/>
```

### パターン2: エラー結果
```tsx
<Result
  status="error"
  title="登録に失敗しました"
  subTitle="エラーが発生しました。もう一度お試しください。"
  extra={[
    <Button type="primary" key="retry">
      再試行
    </Button>,
    <Button key="back">
      戻る
    </Button>
  ]}
/>
```

### パターン5: 404エラー
```tsx
<Result
  status="404"
  title="404"
  subTitle="お探しのページは見つかりませんでした"
  extra={
    <Button type="primary" href="/">
      ホームに戻る
    </Button>
  }
/>
```

---

## 注意事項

### DO（推奨）
✅ タイトルは簡潔に（15文字以内）
✅ サブタイトルで詳細を説明（80文字以内推奨）
✅ アクションボタンは1〜2個まで
✅ プライマリボタンは次のアクションに使用
✅ 画面中央に配置する

### DON'T（非推奨）
❌ タイトルに長文を入れない
❌ ボタンを3個以上配置しない
❌ サブタイトルを省略しない（必ず状況を説明）
❌ カスタムアイコンを無理に使用しない（標準statusを活用）
❌ 複雑なレイアウトを追加しない（シンプルに保つ）

---

## アクセシビリティ

### ARIA属性
- role: 自動的に適切な `role` が設定される
- aria-live: エラー時は `"assertive"`、情報時は `"polite"`

### キーボード操作
- Tab: ボタン間の移動
- Enter: ボタンの実行
- Escape: モーダル内の結果ページの場合、閉じる

### スクリーンリーダー
- タイトルとサブタイトルが自動的に読み上げられる
- statusに応じた適切な音声通知

---

## 関連コンポーネント
- [Alert/Notification](alert_notification_policy.md) - インライン通知
- [Modal](modal_policy.md) - モーダル内の結果表示
- [Button](button_policy.md) - アクションボタン

# タイポグラフィ（Typography）表示ポリシー

## 概要
本ポリシーは、データ表示用のテキスト要素（Title, Text, Paragraph）の標準パターンを定義します。
Ant Design v6のTypographyコンポーネントを使用し、一貫性のある視覚的階層と可読性を確保します。

---

## 標準パターン

### パターン1: ページタイトル（Title Level 1）
**用途**: ページの最上位見出し

**Typography.Title level={1}**
- フォントサイズ: `token.fontSizeHeading1` (38px)
- 行の高さ: `token.lineHeightHeading1` (1.21)
- フォントウェイト: `token.fontWeightStrong` (600)
- テキスト色: `token.colorText` (#212121)
- マージン: 下部 0.5em（19px）
- 用途例: ページタイトル、メインヘッダー

```tsx
<Typography.Title level={1}>ページタイトル</Typography.Title>
```

---

### パターン2: セクションタイトル（Title Level 2）
**用途**: ページ内の大セクション見出し

**Typography.Title level={2}**
- フォントサイズ: `token.fontSizeHeading2` (30px)
- 行の高さ: `token.lineHeightHeading2` (1.35)
- フォントウェイト: `token.fontWeightStrong` (600)
- テキスト色: `token.colorText` (#212121)
- マージン: 上部 1.5em（45px）、下部 0.5em（15px）
- 用途例: セクション見出し

```tsx
<Typography.Title level={2}>セクションタイトル</Typography.Title>
```

---

### パターン3: サブセクションタイトル（Title Level 3）
**用途**: セクション内のサブ見出し

**Typography.Title level={3}**
- フォントサイズ: `token.fontSizeHeading3` (24px)
- 行の高さ: `token.lineHeightHeading3` (1.35)
- フォントウェイト: `token.fontWeightStrong` (600)
- テキスト色: `token.colorText` (#212121)
- マージン: 上部 1em（24px）、下部 0.5em（12px）
- 用途例: サブセクション見出し、カード内タイトル

```tsx
<Typography.Title level={3}>サブセクションタイトル</Typography.Title>
```

---

### パターン4: 小見出し（Title Level 4）
**用途**: 詳細セクション、グループ化された項目の見出し

**Typography.Title level={4}**
- フォントサイズ: `token.fontSizeHeading4` (20px)
- 行の高さ: `token.lineHeightHeading4` (1.4)
- フォントウェイト: `token.fontWeightStrong` (600)
- テキスト色: `token.colorText` (#212121)
- マージン: 上部 1em（20px）、下部 0.5em（10px）
- 用途例: 小見出し、テーブル上部タイトル

```tsx
<Typography.Title level={4}>小見出し</Typography.Title>
```

---

### パターン5: 最小見出し（Title Level 5）
**用途**: 最小単位の見出し、リスト項目の見出し

**Typography.Title level={5}**
- フォントサイズ: `token.fontSizeHeading5` (16px)
- 行の高さ: `token.lineHeightHeading5` (1.5)
- フォントウェイト: `token.fontWeightStrong` (600)
- テキスト色: `token.colorText` (#212121)
- マージン: 上部 0.8em（12.8px）、下部 0.5em（8px）
- 用途例: リスト項目見出し、詳細情報のラベル

```tsx
<Typography.Title level={5}>最小見出し</Typography.Title>
```

---

### パターン6: 本文テキスト（Text）
**用途**: 通常の本文、説明文、ラベル

**Typography.Text**
- フォントサイズ: `token.fontSize` (14px)
- 行の高さ: `token.lineHeight` (1.5715)
- フォントウェイト: 400（通常）
- テキスト色: `token.colorText` (#212121)
- マージン: なし（インライン要素）
- 用途例: 本文、説明文、データ表示

```tsx
<Typography.Text>通常のテキスト</Typography.Text>
```

**バリエーション:**
```tsx
{/* 強調テキスト */}
<Typography.Text strong>強調テキスト</Typography.Text>

{/* 二次テキスト */}
<Typography.Text type="secondary">補足テキスト</Typography.Text>

{/* 成功メッセージ */}
<Typography.Text type="success">成功メッセージ</Typography.Text>

{/* 警告メッセージ */}
<Typography.Text type="warning">警告メッセージ</Typography.Text>

{/* エラーメッセージ */}
<Typography.Text type="danger">エラーメッセージ</Typography.Text>

{/* 無効状態 */}
<Typography.Text disabled>無効なテキスト</Typography.Text>

{/* コード */}
<Typography.Text code>コード表示</Typography.Text>

{/* 下線 */}
<Typography.Text underline>下線テキスト</Typography.Text>

{/* 削除線 */}
<Typography.Text delete>削除済みテキスト</Typography.Text>

{/* マーク（ハイライト） */}
<Typography.Text mark>ハイライトテキスト</Typography.Text>

{/* キーボード */}
<Typography.Text keyboard>Ctrl+C</Typography.Text>
```

---

### パターン7: 段落テキスト（Paragraph）
**用途**: 段落単位の長文テキスト

**Typography.Paragraph**
- フォントサイズ: `token.fontSize` (14px)
- 行の高さ: `token.lineHeight` (1.5715)
- フォントウェイト: 400（通常）
- テキスト色: `token.colorText` (#212121)
- マージン: 下部 1em（14px）
- 用途例: 説明文、注意事項、利用規約

```tsx
<Typography.Paragraph>
  これは段落テキストです。複数行にわたる長文を表示する際に使用します。
  段落として適切な行間とマージンが自動的に適用されます。
</Typography.Paragraph>
```

**省略表示機能:**
```tsx
{/* 1行省略 */}
<Typography.Paragraph ellipsis>
  非常に長いテキストは自動的に省略されます...
</Typography.Paragraph>

{/* 2行省略 */}
<Typography.Paragraph ellipsis={{ rows: 2 }}>
  複数行のテキストも指定した行数で省略できます。
  2行目以降は...で省略されます。
</Typography.Paragraph>

{/* 拡張可能な省略 */}
<Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'もっと見る' }}>
  拡張可能な省略表示も実装できます。
  「もっと見る」をクリックすると全文が表示されます。
</Typography.Paragraph>
```

---

## テキストサイズのバリエーション

### 小さいテキスト（Small）
- フォントサイズ: `token.fontSizeSM` (12px)
- 用途: キャプション、補足情報、フッター

```tsx
<Typography.Text style={{ fontSize: 12 }}>小さいテキスト</Typography.Text>
```

### 大きいテキスト（Large）
- フォントサイズ: `token.fontSizeLG` (16px)
- 用途: 重要な数値、強調したい情報

```tsx
<Typography.Text style={{ fontSize: 16 }}>大きいテキスト</Typography.Text>
```

---

## 共通仕様（全パターン）

### 色定義

**通常テキスト**
- テキスト色: `token.colorText` (#212121)
- 用途: 通常の本文、見出し

**二次テキスト（Secondary）**
- テキスト色: `token.colorTextSecondary` (#757575)
- 用途: 補足情報、キャプション、日時表示

**三次テキスト（Tertiary）**
- テキスト色: `token.colorTextTertiary` (#9e9e9e)
- 用途: プレースホルダー、ヒント

**無効テキスト（Disabled）**
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- 用途: 無効状態の情報

**成功テキスト（Success）**
- テキスト色: `token.colorSuccess` (#2e7d32)
- 用途: 成功メッセージ、完了状態

**警告テキスト（Warning）**
- テキスト色: `token.colorWarning` (#ed6c02)
- 用途: 警告メッセージ、注意事項

**エラーテキスト（Danger）**
- テキスト色: `token.colorError` (#d32f2f)
- 用途: エラーメッセージ、必須項目

**リンクテキスト（Link）**
- テキスト色: `token.colorPrimary` (#CF0027)
- ホバー色: `token.colorPrimaryHover` (#E63946)
- 用途: クリック可能なリンク

---

## コピー機能（Copyable）

長いテキストや重要な情報をコピーできるようにする場合：

```tsx
<Typography.Text copyable>コピー可能なテキスト</Typography.Text>

{/* カスタムコピーテキスト */}
<Typography.Text copyable={{ text: 'カスタムテキスト' }}>
  表示テキスト
</Typography.Text>

{/* コピー後のコールバック */}
<Typography.Text copyable={{ onCopy: () => message.success('コピーしました') }}>
  コピー可能なテキスト
</Typography.Text>
```

---

## 編集機能（Editable）

ユーザーがインライン編集できるテキスト：

```tsx
<Typography.Text editable={{ onChange: handleChange }}>
  編集可能なテキスト
</Typography.Text>

{/* カスタムアイコン */}
<Typography.Paragraph editable={{ 
  icon: <EditOutlined />,
  tooltip: '編集',
  onChange: handleChange 
}}>
  編集可能な段落
</Typography.Paragraph>
```

---

## パターン選択ガイド

### タイトル（Title）選択
| レベル | フォントサイズ | 用途 | 使用場面 |
|--------|--------------|------|----------|
| level={1} | 38px | ページタイトル | ページ最上部 |
| level={2} | 30px | セクション見出し | 主要セクション |
| level={3} | 24px | サブセクション | カード内、セクション内 |
| level={4} | 20px | 小見出し | テーブル上、グループ見出し |
| level={5} | 16px | 最小見出し | リスト項目、詳細ラベル |

### テキスト（Text）vs 段落（Paragraph）
- **短い1行テキスト** → Text
- **複数行の段落** → Paragraph
- **インライン表示** → Text
- **ブロック表示** → Paragraph

### テキストタイプ選択
| タイプ | 用途 | 色 |
|--------|------|-----|
| デフォルト | 通常テキスト | #212121 |
| secondary | 補足情報 | #757575 |
| success | 成功メッセージ | #2e7d32 |
| warning | 警告メッセージ | #ed6c02 |
| danger | エラーメッセージ | #d32f2f |
| disabled | 無効状態 | #bdbdbd |

---

## 使用例

### 1. ページヘッダー
```tsx
<Space direction="vertical" size="small">
  <Typography.Title level={1}>
    ユーザー管理
  </Typography.Title>
  <Typography.Text type="secondary">
    システム内のユーザーを管理します
  </Typography.Text>
</Space>
```

### 2. カード内のタイトルと説明
```tsx
<Card>
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <Typography.Title level={3}>
      プロジェクト設定
    </Typography.Title>
    <Typography.Paragraph>
      プロジェクトの基本設定を変更できます。
      変更内容は即座に反映されます。
    </Typography.Paragraph>
  </Space>
</Card>
```

### 3. データ表示
```tsx
<Space direction="vertical" size={0}>
  <Typography.Text type="secondary">作成日時</Typography.Text>
  <Typography.Text strong>2024-12-26 10:30:00</Typography.Text>
</Space>
```

### 4. ステータス表示
```tsx
<Space>
  <Typography.Text>状態:</Typography.Text>
  <Typography.Text type="success" strong>完了</Typography.Text>
</Space>
```

### 5. エラーメッセージ
```tsx
<Typography.Text type="danger">
  必須項目が入力されていません
</Typography.Text>
```

### 6. 省略表示
```tsx
<Typography.Paragraph 
  ellipsis={{ 
    rows: 3, 
    expandable: true, 
    symbol: '続きを読む' 
  }}
>
  {longText}
</Typography.Paragraph>
```

### 7. コピー可能な情報
```tsx
<Space>
  <Typography.Text type="secondary">プロジェクトID:</Typography.Text>
  <Typography.Text copyable>ABC-12345-XYZ</Typography.Text>
</Space>
```

---

## アクセシビリティ

### セマンティックHTML
- Title は適切な `<h1>` ～ `<h5>` タグに変換される
- 見出しレベルは階層的に使用する（h1 → h2 → h3）
- h1は1ページに1つのみ

### コントラスト比
- 通常テキスト: 最低 4.5:1
- 大きなテキスト（18px以上）: 最低 3:1
- すべてのカラーバリエーションでコントラスト基準を満たす

### スクリーンリーダー対応
- Titleは自動的にaria-levelが付与される
- type="secondary"などの装飾的な情報も適切に読み上げられる
- copyableやeditableは適切なaria属性が自動付与される

---

## パフォーマンス最適化

### 長文テキストの処理
```tsx
{/* 省略表示でパフォーマンス向上 */}
<Typography.Paragraph ellipsis={{ rows: 3 }}>
  {veryLongText}
</Typography.Paragraph>
```

### 動的テキストのメモ化
```tsx
const MemoizedText = React.memo(({ text }: { text: string }) => (
  <Typography.Text>{text}</Typography.Text>
));
```

---

## 注意事項

### DO（推奨）
✅ セマンティックな見出しレベルを使用する
✅ 色でtype属性を使用する（カスタムスタイルではなく）
✅ 長文にはParagraphを使用する
✅ copyableで重要な情報をコピー可能にする
✅ ellipsisで長文を省略する
✅ type="secondary"で補足情報を区別する

### DON'T（非推奨）
❌ 見出しレベルを飛ばさない（h1 → h3）
❌ 装飾目的でtitleのlevelを変更しない
❌ 色をインラインスタイルで直接指定しない
❌ Textで長文を表示しない（Paragraphを使う）
❌ セマンティクスを無視してスタイルのみで選択しない
❌ type="danger"を装飾目的で使用しない

---

## まとめ

このポリシーに従うことで：
- **統一感**: 一貫したテキスト階層とスタイル
- **可読性**: 適切なフォントサイズと行間
- **アクセシビリティ**: セマンティックなHTML構造
- **保守性**: type属性による意味的なスタイリング
- **パフォーマンス**: 省略表示による最適化

適切なTypographyコンポーネントを選択し、統一感のあるデータ表示を実現しましょう。

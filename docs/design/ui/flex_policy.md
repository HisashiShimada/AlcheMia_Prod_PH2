# Flexレイアウトポリシー

## 標準5パターン

### パターン1: 水平配置（両端揃え）
**用途**: ヘッダー、アクションバー、カード内のタイトルとボタン配置
- direction: `horizontal`
- justify: `space-between`
- align: `center`
- gap: `token.margin` (16px)
- wrap: なし

**典型的な用途**:
- ページヘッダー（タイトル + アクションボタン）
- カードヘッダー（タイトル + メニューアイコン）
- フォームフッター（キャンセル + 保存ボタン）

```tsx
<Flex justify="space-between" align="center" gap={16}>
  <div>タイトル</div>
  <Button>アクション</Button>
</Flex>
```

---

### パターン2: 水平配置（左寄せ）
**用途**: ボタングループ、フィルターコントロール、ツールバー
- direction: `horizontal`
- justify: `flex-start`
- align: `center`
- gap: `token.marginSM` (12px)
- wrap: なし

**典型的な用途**:
- ボタングループ（連続する操作ボタン）
- 検索バー + フィルター
- ページ内ナビゲーション

```tsx
<Flex justify="flex-start" align="center" gap={12}>
  <Button>ボタン1</Button>
  <Button>ボタン2</Button>
  <Button>ボタン3</Button>
</Flex>
```

---

### パターン3: 垂直配置（等間隔）
**用途**: フォーム、カード内コンテンツ、情報リスト
- direction: `vertical`
- justify: `flex-start`
- align: `stretch`
- gap: `token.marginLG` (24px)
- wrap: なし

**典型的な用途**:
- フォームフィールドの縦並び
- カード内の情報セクション
- ステップ表示

```tsx
<Flex vertical gap={24}>
  <FormItem>...</FormItem>
  <FormItem>...</FormItem>
  <FormItem>...</FormItem>
</Flex>
```

---

### パターン4: ラップ付き水平配置
**用途**: タグリスト、チップ表示、レスポンシブグリッド代替
- direction: `horizontal`
- justify: `flex-start`
- align: `center`
- gap: `token.marginXS` (8px)
- wrap: `wrap`

**典型的な用途**:
- タグ/ラベルの表示
- 検索結果フィルター
- 選択済みアイテムのチップ表示

```tsx
<Flex wrap="wrap" gap={8}>
  <Tag>タグ1</Tag>
  <Tag>タグ2</Tag>
  <Tag>タグ3</Tag>
</Flex>
```

---

### パターン5: 中央配置
**用途**: ローディング表示、エラーメッセージ、空状態表示
- direction: `vertical`
- justify: `center`
- align: `center`
- gap: `token.margin` (16px)
- wrap: なし

**典型的な用途**:
- スピナー + メッセージ
- エラーアイコン + エラーメッセージ
- Empty状態の表示

```tsx
<Flex vertical justify="center" align="center" gap={16} style={{ minHeight: '200px' }}>
  <Spin size="large" />
  <div>読み込み中...</div>
</Flex>
```

---

## 共通仕様（全パターン）

### Gap（間隔）の標準値

| サイズ | 値 | 用途 |
|--------|-----|------|
| `token.marginXS` | 8px | 密接な関係（タグ、アイコン+テキスト） |
| `token.marginSM` | 12px | ボタングループ、コントロールグループ |
| `token.margin` | 16px | 標準的な要素間隔（デフォルト） |
| `token.marginMD` | 20px | セクション内の中程度の間隔 |
| `token.marginLG` | 24px | フォームフィールド、カードセクション |
| `token.marginXL` | 32px | 大きなセクション区切り |
| `token.marginXXL` | 48px | ページレベルのセクション |

### Justify（主軸方向の配置）

| 値 | 用途 |
|----|------|
| `flex-start` | 左寄せ/上寄せ（デフォルト） |
| `center` | 中央寄せ |
| `flex-end` | 右寄せ/下寄せ |
| `space-between` | 両端揃え（最も一般的） |
| `space-around` | 等間隔配置（余白あり） |
| `space-evenly` | 完全等間隔配置 |

### Align（交差軸方向の配置）

| 値 | 用途 |
|----|------|
| `flex-start` | 上寄せ/左寄せ |
| `center` | 中央寄せ（最も一般的） |
| `flex-end` | 下寄せ/右寄せ |
| `stretch` | 伸縮（垂直レイアウトのデフォルト） |
| `baseline` | ベースライン揃え（テキスト混在時） |

### Wrap（折り返し）

| 値 | 用途 |
|----|------|
| `nowrap` | 折り返しなし（デフォルト） |
| `wrap` | 折り返しあり（タグ、チップなど） |
| `wrap-reverse` | 逆順折り返し（特殊用途） |

---

## パターン選択ガイド

### ヘッダー・アクションバー
→ **パターン1（水平配置・両端揃え）**
- タイトルとボタンを両端に配置
- gap: 16px

### ボタングループ・ツールバー
→ **パターン2（水平配置・左寄せ）**
- 複数のボタンやコントロールを横並び
- gap: 12px

### フォーム・情報リスト
→ **パターン3（垂直配置・等間隔）**
- フィールドやセクションを縦並び
- gap: 24px

### タグ・チップ表示
→ **パターン4（ラップ付き水平配置）**
- 可変数のタグを表示（自動折り返し）
- gap: 8px

### ローディング・エラー表示
→ **パターン5（中央配置）**
- アイコン/スピナーとメッセージを中央に配置
- gap: 16px

---

## 特殊なパターンと標準パターンの対応

### グリッド風レイアウト（複数行複数列）
- **対応する標準パターン**: パターン4（ラップ付き水平配置）の拡張
- **使用条件**: 列数が可変、かつ要素サイズが均一な場合
- **形状**: wrap="wrap" + flex: '0 0 calc((100% - gap * (n-1)) / n)'
- **用途**: カードグリッド、アイコングリッド
- **注意**: 固定グリッドが必要な場合はGridコンポーネントを使用

```tsx
<Flex wrap="wrap" gap={16}>
  <div style={{ flex: '0 0 calc((100% - 32px) / 3)' }}>カード1</div>
  <div style={{ flex: '0 0 calc((100% - 32px) / 3)' }}>カード2</div>
  <div style={{ flex: '0 0 calc((100% - 32px) / 3)' }}>カード3</div>
</Flex>
```

### 固定幅 + 可変幅のハイブリッド
- **対応する標準パターン**: パターン1（水平配置・両端揃え）の変種
- **使用条件**: 一部の要素を固定幅、残りを可変幅にする場合
- **形状**: justify="space-between" + flex: '0 0 auto' / flex: '1 1 0'
- **用途**: サイドバー + メインコンテンツ、アイコン + テキスト

```tsx
<Flex gap={16}>
  <div style={{ flex: '0 0 200px' }}>固定幅</div>
  <div style={{ flex: '1 1 0' }}>可変幅</div>
</Flex>
```

### 右寄せボタングループ
- **対応する標準パターン**: パターン2（水平配置・左寄せ）の変種
- **使用条件**: ボタンを右寄せにする場合（モーダルフッターなど）
- **形状**: justify="flex-end" + gap: 12px
- **用途**: モーダル/ドロワーのフッター、カードフッター

```tsx
<Flex justify="flex-end" gap={12}>
  <Button>キャンセル</Button>
  <Button type="primary">保存</Button>
</Flex>
```

### ネストされたFlex（複雑なレイアウト）
- **対応する標準パターン**: 複数パターンの組み合わせ
- **使用条件**: 複雑なレイアウトが必要な場合
- **形状**: 外側と内側で異なるFlexを使用
- **用途**: カード内の複雑な配置、フォームセクション

```tsx
<Flex vertical gap={24}>
  {/* 外側: 垂直配置 */}
  <Flex justify="space-between" align="center">
    {/* 内側: 水平配置・両端揃え */}
    <div>タイトル</div>
    <Button>編集</Button>
  </Flex>
  <div>コンテンツ</div>
</Flex>
```

### アイコン + テキストの組み合わせ
- **対応する標準パターン**: パターン2（水平配置・左寄せ）の小型版
- **使用条件**: アイコンとテキストを並べる場合
- **形状**: gap: 8px, align: "center"
- **用途**: ボタン内、ステータス表示、情報ラベル

```tsx
<Flex gap={8} align="center">
  <CheckCircleOutlined style={{ color: '#52c41a' }} />
  <span>完了</span>
</Flex>
```

---

## レスポンシブ対応

### モバイルでの調整
- 水平配置を垂直配置に変更する場合は `vertical` プロパティを動的に切り替え
- gap をモバイルでは小さめに調整（例: 24px → 16px）

```tsx
const isMobile = useBreakpoint().xs;

<Flex 
  vertical={isMobile} 
  gap={isMobile ? 16 : 24}
  justify={isMobile ? 'flex-start' : 'space-between'}
>
  {/* コンテンツ */}
</Flex>
```

### ラップの活用
- タブレット以下でラップを有効にすることで、自然な折り返しを実現

```tsx
const isTablet = useBreakpoint().md;

<Flex 
  wrap={isTablet ? 'wrap' : 'nowrap'} 
  gap={12}
>
  {/* ボタングループなど */}
</Flex>
```

---

## 使用上の注意

### ❌ 避けるべき使い方

1. **過度なネスト**: 3階層以上のFlex入れ子は可読性が低下
   - → より適切なレイアウトコンポーネント（Grid、Layout）を検討

2. **意味のないwrap**: 折り返しが発生しないのに`wrap`を指定
   - → wrap は本当に必要な場合のみ使用

3. **不適切なgap**: 要素間の関係性に合わないgap値
   - → 標準値（8/12/16/24px）を使用

4. **flex-growの乱用**: すべての要素に`flex: 1`を指定
   - → 意図的に伸縮させる要素のみ指定

### ✅ 推奨される使い方

1. **単純なレイアウトから開始**: 複雑になりそうな場合はGridやLayoutを検討

2. **セマンティックな構造**: 意味のある要素のグルーピング

3. **一貫したgap値**: プロジェクト全体で標準値を使用

4. **明示的なalign**: centerが必要な場合は明示的に指定

---

## 関連ドキュメント

- [Spacingポリシー](./spacing_policy.md) - 間隔の標準値
- [Gridレイアウトポリシー](./grid_layout_policy.md) - グリッドシステムとの使い分け
- [Layoutポリシー](./layout_policy.md) - ページ全体のレイアウト構造

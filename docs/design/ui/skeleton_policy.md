# スケルトンスクリーン形状ポリシー

## 標準5パターン

### パターン1: カード型スケルトン
**用途**: リスト表示、カード表示時のローディング
- 幅: 親要素に合わせる（100%）
- パディング: 24px
- 背景色: `token.colorBgContainer` (#ffffff)
- ボーダー: 1px solid `token.colorBorderSecondary`
- 角丸: `token.borderRadiusLG` (12px)
- 内容:
  - アバター: 48px × 48px（円形）
  - タイトル行: 幅80%、高さ16px
  - 段落: 3行（幅100%, 90%, 60%）、行高16px
- アニメーション: `active={true}`（波紋効果）

---

### パターン2: テーブル行スケルトン
**用途**: テーブルデータ読み込み中
- 幅: 親要素に合わせる（100%）
- 行数: 5行（固定）
- 段落設定: `rows={5}`
- タイトル非表示: `title={false}`
- アバター非表示: `avatar={false}`
- 段落幅: 各列に応じた幅（例: 15%, 25%, 30%, 20%, 10%）
- アニメーション: `active={true}`（波紋効果）

---

### パターン3: フォームスケルトン
**用途**: フォーム読み込み中
- 幅: 親要素に合わせる（100%）
- 構成:
  - ラベル: 幅100px、高さ14px、margin-bottom 8px
  - 入力欄: 幅100%、高さ32px、角丸8px
  - 間隔: 各フィールド間24px
- 繰り返し: 3-5フィールド
- アニメーション: `active={true}`（波紋効果）

---

### パターン4: テキストブロックスケルトン
**用途**: 記事本文、詳細説明読み込み中
- 幅: 親要素に合わせる（100%）
- タイトル行: 幅60%、高さ20px
- 段落: 8-10行、行高16px
- 段落幅パターン: [100%, 95%, 90%, 100%, 85%, 95%, 100%, 70%]
- アバター非表示: `avatar={false}`
- アニメーション: `active={true}`（波紋効果）

---

### パターン5: リストアイテムスケルトン
**用途**: リストアイテム読み込み中
- 幅: 親要素に合わせる（100%）
- アバター: 40px × 40px（円形）
- タイトル行: 幅70%、高さ16px
- 段落: 1-2行、行高14px
- 繰り返し: 3-8アイテム
- アイテム間隔: 16px
- アニメーション: `active={true}`（波紋効果）

---

## 共通仕様（全パターン）

### 色定義
**スケルトン要素**
- 背景色: `token.colorFillContent` (rgba(0, 0, 0, 0.06))
- グラデーション開始: `token.colorFillContent`
- グラデーション終了: `token.colorBgContainer` (より明るい)
- アニメーション速度: 1.4s

**コンテナ背景**
- 背景色: `token.colorBgContainer` (#ffffff)
- ボーダー: `token.colorBorderSecondary` (rgba(0,0,0,0.06))

### アニメーション
- タイプ: 波紋効果（shimmer）
- 有効化: `active={true}`
- 速度: 1.4秒/サイクル
- イージング: linear

### スペーシング
- カード内パディング: 24px
- アイテム間隔: 16px
- フィールド間隔: 24px
- セクション間隔: 32px

### ボーダーラジアス
- カード: `token.borderRadiusLG` (12px)
- 入力欄: `token.borderRadius` (8px)
- アバター: 50%（円形）
- テキスト行: `token.borderRadiusSM` (4px)

---

## パターン選択

- リスト・カード表示 → **パターン1（カード型スケルトン）**
- テーブルデータ → **パターン2（テーブル行スケルトン）**
- フォーム画面 → **パターン3（フォームスケルトン）**
- 記事・詳細画面 → **パターン4（テキストブロックスケルトン）**
- シンプルなリスト → **パターン5（リストアイテムスケルトン）**

---

## 特殊なパターン

### ボタンスケルトン
- **対応する標準パターン**: カスタムSkeleton.Button
- **形状**: 
  - 幅: 80-120px
  - 高さ: 32px
  - 角丸: 8px
- **用途**: アクションボタン読み込み中
- **実装**: `<Skeleton.Button active style={{ width: 100, height: 32, borderRadius: 8 }} />`

### アバタースケルトン
- **対応する標準パターン**: Skeleton.Avatar
- **形状**:
  - サイズ: small (24px) / default (40px) / large (48px)
  - 形状: 円形（shape="circle"）
- **用途**: ユーザーアバター読み込み中
- **実装**: `<Skeleton.Avatar active size="large" shape="circle" />`

### インプットスケルトン
- **対応する標準パターン**: Skeleton.Input
- **形状**:
  - 幅: 100%（親要素に合わせる）
  - 高さ: 32px
  - 角丸: 8px
- **用途**: 入力フィールド読み込み中
- **実装**: `<Skeleton.Input active style={{ height: 32, borderRadius: 8 }} />`

### 画像スケルトン
- **対応する標準パターン**: Skeleton.Image
- **形状**:
  - 幅: 指定サイズ（例: 200px × 200px）
  - 角丸: 8px
- **用途**: 画像読み込み中
- **実装**: `<Skeleton.Image active style={{ width: 200, height: 200, borderRadius: 8 }} />`

---

## 実装パターン例

### パターン1: カード型スケルトン
```tsx
<Card style={{ marginBottom: 16 }}>
  <Skeleton
    active
    avatar={{ size: 48, shape: 'circle' }}
    paragraph={{ rows: 3, width: ['100%', '90%', '60%'] }}
  />
</Card>
```

### パターン2: テーブル行スケルトン
```tsx
<Skeleton
  active
  title={false}
  avatar={false}
  paragraph={{ rows: 5 }}
/>
```

### パターン3: フォームスケルトン
```tsx
<Space direction="vertical" size={24} style={{ width: '100%' }}>
  {[1, 2, 3].map((item) => (
    <div key={item}>
      <Skeleton.Input
        active
        size="small"
        style={{ width: 100, height: 14, marginBottom: 8 }}
      />
      <Skeleton.Input
        active
        style={{ width: '100%', height: 32, borderRadius: 8 }}
      />
    </div>
  ))}
</Space>
```

### パターン4: テキストブロックスケルトン
```tsx
<Skeleton
  active
  avatar={false}
  title={{ width: '60%' }}
  paragraph={{
    rows: 8,
    width: ['100%', '95%', '90%', '100%', '85%', '95%', '100%', '70%']
  }}
/>
```

### パターン5: リストアイテムスケルトン
```tsx
<Space direction="vertical" size={16} style={{ width: '100%' }}>
  {[1, 2, 3, 4, 5].map((item) => (
    <Skeleton
      key={item}
      active
      avatar={{ size: 40, shape: 'circle' }}
      title={{ width: '70%' }}
      paragraph={{ rows: 1, width: '90%' }}
    />
  ))}
</Space>
```

---

## レスポンシブ対応

### モバイル（xs, sm）
- カード内パディング: 16px（24px → 16px）
- アイテム間隔: 12px（16px → 12px）
- アバターサイズ: 40px（48px → 40px）
- 段落行数: 減少（例: 8行 → 5行）

### タブレット（md）
- 標準仕様を使用

### デスクトップ（lg, xl, xxl）
- 標準仕様を使用
- 最大幅制限の検討（例: 1200px）

---

## 使用タイミング

### 必須の使用ケース
- 初回データロード（3秒以上かかる場合）
- ページ遷移時のデータ取得
- 無限スクロールの追加読み込み
- フィルタ・検索実行時のデータ更新

### 使用しないケース
- 即座に表示できるデータ（100ms未満）
- ボタンクリック後の短時間処理（500ms未満）
- インタラクティブな操作のフィードバック → Spinnerを使用

---

## ベストプラクティス

### DO（推奨）
✅ データ構造に合わせたスケルトンを選択する
✅ アニメーションを有効化（`active={true}`）する
✅ 実際のコンテンツと同じレイアウトを維持する
✅ ローディング時間が3秒を超える場合は必ず使用する
✅ 複数アイテムの場合は適切な繰り返し回数を設定する
✅ レスポンシブ対応を考慮する

### DON'T（非推奨）
❌ 短時間（500ms未満）のロードにスケルトンを使用しない
❌ 実際のコンテンツと大きく異なるレイアウトを使用しない
❌ アニメーションなしで使用しない（`active={false}`は避ける）
❌ 過度に多くのスケルトンを表示しない（最大10-15個）
❌ 固定の高さを設定せず、レイアウトシフトを発生させない
❌ スケルトンとSpinnerを同時に表示しない

---

## 組み合わせパターン

### ダッシュボード型
```tsx
<Row gutter={[16, 16]}>
  <Col span={24}>
    {/* ヘッダーエリア */}
    <Skeleton.Input active style={{ width: 300, height: 32 }} />
  </Col>
  <Col xs={24} md={12} lg={8}>
    {/* カード1 */}
    <Card>
      <Skeleton active paragraph={{ rows: 3 }} />
    </Card>
  </Col>
  <Col xs={24} md={12} lg={8}>
    {/* カード2 */}
    <Card>
      <Skeleton active paragraph={{ rows: 3 }} />
    </Card>
  </Col>
  <Col xs={24} md={12} lg={8}>
    {/* カード3 */}
    <Card>
      <Skeleton active paragraph={{ rows: 3 }} />
    </Card>
  </Col>
</Row>
```

### テーブル型
```tsx
<Card>
  <Space direction="vertical" size={16} style={{ width: '100%' }}>
    {/* 検索バー */}
    <Skeleton.Input active style={{ width: 250, height: 32 }} />
    
    {/* テーブルヘッダー */}
    <Skeleton.Input active style={{ width: '100%', height: 40 }} />
    
    {/* テーブル行 */}
    <Skeleton active title={false} paragraph={{ rows: 5 }} />
  </Space>
</Card>
```

### フォーム＋詳細型
```tsx
<Row gutter={24}>
  <Col xs={24} lg={12}>
    {/* フォームエリア */}
    <Card title="基本情報">
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {[1, 2, 3, 4].map((item) => (
          <div key={item}>
            <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
            <Skeleton.Input active style={{ width: '100%', height: 32 }} />
          </div>
        ))}
      </Space>
    </Card>
  </Col>
  <Col xs={24} lg={12}>
    {/* 詳細エリア */}
    <Card title="詳細情報">
      <Skeleton
        active
        avatar={false}
        title={{ width: '60%' }}
        paragraph={{ rows: 6 }}
      />
    </Card>
  </Col>
</Row>
```

---

## アクセシビリティ

### スクリーンリーダー対応
- `aria-busy="true"` を親要素に設定
- `aria-live="polite"` でローディング状態を通知
- ローディング完了時に `aria-busy="false"` に更新

### 実装例
```tsx
<div aria-busy={loading} aria-live="polite">
  {loading ? (
    <Skeleton active />
  ) : (
    <div>実際のコンテンツ</div>
  )}
</div>
```

---

## パフォーマンス考慮事項

### 最適化
- スケルトン要素は軽量なため、パフォーマンス影響は最小限
- アニメーションはCSS transformを使用（GPU加速）
- 大量のスケルトンを表示する場合は仮想スクロールを検討

### メモリ使用
- スケルトン表示中はデータを保持しない
- 不要なスケルトンはアンマウントする
- 長時間表示する場合はタイムアウト設定を検討

---

## バージョン情報
- Ant Design Version: 6.x
- 最終更新: 2025-12-26
- 対応ブラウザ: Chrome, Firefox, Safari, Edge (最新2バージョン)

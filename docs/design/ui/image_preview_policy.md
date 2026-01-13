# 画像表示（プレビュー機能付き）ポリシー

## 標準3パターン

### パターン1: サムネイル表示
**用途**: リスト内、カード内での小型表示

- サイズ: 64x64px または 96x96px（固定）
- 角丸: `token.borderRadius` (8px)
- ボーダー: 1px solid `token.colorBorder`
- オブジェクトフィット: `cover`（中央クロップ）
- カーソル: `pointer`（クリック可能）
- ホバーエフェクト: 半透明オーバーレイ + 拡大アイコン
- クリック動作: プレビューモーダルを開く

**使用コンポーネント**:
```tsx
import { Image } from 'antd';

<Image
  width={64}
  height={64}
  src="image-url"
  alt="画像の説明"
  style={{
    borderRadius: 8,
    objectFit: 'cover',
    border: '1px solid rgba(0,0,0,0.12)'
  }}
/>
```

---

### パターン2: 通常表示
**用途**: 詳細画面、フォームでの標準的な表示

- サイズ: 200x150px（4:3比率）または 240x180px
- 最大幅: 親要素の100%
- 角丸: `token.borderRadius` (8px)
- ボーダー: 1px solid `token.colorBorder`
- オブジェクトフィット: `contain`（全体表示）
- カーソル: `pointer`（クリック可能）
- ホバーエフェクト: 半透明オーバーレイ + 拡大アイコン
- クリック動作: プレビューモーダルを開く

**使用コンポーネント**:
```tsx
import { Image } from 'antd';

<Image
  width={200}
  height={150}
  src="image-url"
  alt="画像の説明"
  style={{
    borderRadius: 8,
    objectFit: 'contain',
    border: '1px solid rgba(0,0,0,0.12)'
  }}
/>
```

---

### パターン3: プレビューモーダル
**用途**: 画像の拡大表示

- サイズ: 画面サイズに応じて自動調整（最大90vw × 90vh）
- 背景: 半透明ブラック（rgba(0,0,0,0.85)）
- オブジェクトフィット: `contain`（全体表示）
- 機能:
  - ズームイン/アウト
  - 回転（時計回り/反時計回り）
  - 元のサイズに戻す
  - ダウンロード
  - 閉じる（×ボタン、ESCキー、背景クリック）
- ツールバー: 画面下部に固定
- キーボード操作: 左右矢印キーで複数画像の切り替え

**使用コンポーネント**:
```tsx
import { Image } from 'antd';

<Image.PreviewGroup>
  <Image src="image-1" />
  <Image src="image-2" />
  <Image src="image-3" />
</Image.PreviewGroup>
```

---

## 共通仕様（全パターン）

### 色定義

**通常**
- ボーダー色: `token.colorBorder` (rgba(0,0,0,0.12))
- 背景色: `token.colorBgContainer` (#ffffff)

**ホバー（サムネイル・通常表示）**
- オーバーレイ: rgba(0,0,0,0.3)
- アイコン色: #ffffff
- アイコンサイズ: 24px（サムネイル）、32px（通常表示）

**プレビューモーダル**
- 背景: rgba(0,0,0,0.85)
- ツールバー背景: rgba(0,0,0,0.1)
- ツールバーアイコン: #ffffff
- ツールバーアイコンホバー: `token.colorPrimary` (#CF0027)

**読み込み中**
- スケルトン背景: `token.colorBgContainerDisabled` (#f5f5f5)
- スピナー色: `token.colorPrimary` (#CF0027)

**エラー（画像が読み込めない場合）**
- 背景: `token.colorBgContainerDisabled` (#f5f5f5)
- ボーダー: 1px dashed `token.colorBorder`
- アイコン: PictureOutlined（グレー）
- テキスト色: `token.colorTextSecondary` (#757575)

---

## 複数画像表示パターン

### パターンA: グリッド表示（ギャラリー）
**用途**: 複数の画像を一覧表示

```tsx
<Image.PreviewGroup>
  <Space size={16} wrap>
    <Image width={96} height={96} src="image-1" />
    <Image width={96} height={96} src="image-2" />
    <Image width={96} height={96} src="image-3" />
    <Image width={96} height={96} src="image-4" />
  </Space>
</Image.PreviewGroup>
```

- グリッド間隔: 16px
- 1行あたり: 自動折り返し（親要素幅に応じて）
- プレビュー: 左右矢印で画像切り替え可能

---

### パターンB: カルーセル表示
**用途**: メイン画像とサムネイル選択

```tsx
<Space direction="vertical" size={16}>
  <Image
    width={400}
    height={300}
    src={selectedImage}
  />
  <Space size={8}>
    {images.map((img, index) => (
      <Image
        key={index}
        width={64}
        height={64}
        src={img}
        preview={false}
        onClick={() => setSelectedImage(img)}
        style={{
          cursor: 'pointer',
          border: selectedImage === img
            ? '2px solid #CF0027'
            : '1px solid rgba(0,0,0,0.12)'
        }}
      />
    ))}
  </Space>
</Space>
```

---

## 特殊パターン

### アバター画像（円形）
**対応する標準パターン**: パターン1（サムネイル）の変種

- 形状: 円形（border-radius: 50%）
- サイズ: 32px / 40px / 48px / 64px
- 用途: ユーザーアバター専用
- **除外理由**: user_avatar_policy.mdで別途定義

---

### アイコン画像（小型）
**対応する標準パターン**: パターン1（サムネイル）のより小型版

- サイズ: 24x24px / 32x32px
- 用途: ファイルタイプアイコン、ステータスアイコン
- プレビュー機能: 不要（クリック不可）
- **除外理由**: 装飾的な用途で、拡大表示の必要がないため

---

### 背景画像
**対応する標準パターン**: 画像表示ではなくCSS背景

- 用途: カードやセクションの背景
- 実装: `background-image` CSSプロパティ
- プレビュー機能: 不要
- **除外理由**: UIコンポーネントではなく、スタイリングの一部

---

## レスポンシブ対応

### モバイル（xs, sm）
- サムネイル: 64x64px
- 通常表示: 親要素の100%（最大幅制限なし）
- プレビューモーダル: 画面幅の95%

### タブレット（md）
- サムネイル: 96x96px
- 通常表示: 240x180px
- プレビューモーダル: 画面幅の90%

### デスクトップ（lg, xl, xxl）
- サムネイル: 96x96px
- 通常表示: 400x300px
- プレビューモーダル: 画面幅の90%（最大1200px）

---

## アクセシビリティ

### 必須項目
- **alt属性**: すべての画像に意味のある代替テキストを設定
- **キーボード操作**: Tabキーでフォーカス、Enterキーでプレビュー表示
- **スクリーンリーダー**: 画像の内容を説明するaria-label

### 推奨項目
- 画像読み込み中: 読み込み状態を示すスケルトンまたはスピナー
- エラー時: エラーメッセージと代替表示
- プレビューモーダル: ESCキーで閉じる、aria-modal="true"

---

## パターン選択フローチャート

```
画像を表示したい
  ├─ リスト・カード内の小さい表示
  │   └─ パターン1（サムネイル：64x64 or 96x96）
  │
  ├─ 詳細画面での標準的な表示
  │   └─ パターン2（通常表示：200x150 or 240x180）
  │
  ├─ 拡大表示が必要
  │   └─ パターン3（プレビューモーダル）
  │
  ├─ 複数画像を並べて表示
  │   ├─ ギャラリー形式 → パターンA（グリッド表示）
  │   └─ メイン+サムネイル → パターンB（カルーセル表示）
  │
  └─ ユーザーアバター
      └─ user_avatar_policy.mdを参照
```

---

## 実装例

### 基本的なサムネイル表示
```tsx
import { Image } from 'antd';

export function ThumbnailImage({ src, alt }: Props) {
  return (
    <Image
      width={64}
      height={64}
      src={src}
      alt={alt}
      style={{
        borderRadius: 8,
        objectFit: 'cover',
        border: '1px solid rgba(0,0,0,0.12)'
      }}
    />
  );
}
```

### ギャラリー表示
```tsx
import { Image, Space } from 'antd';

export function ImageGallery({ images }: Props) {
  return (
    <Image.PreviewGroup>
      <Space size={16} wrap>
        {images.map((img, index) => (
          <Image
            key={index}
            width={96}
            height={96}
            src={img.src}
            alt={img.alt}
            style={{
              borderRadius: 8,
              objectFit: 'cover',
              border: '1px solid rgba(0,0,0,0.12)'
            }}
          />
        ))}
      </Space>
    </Image.PreviewGroup>
  );
}
```

### フォールバック表示（画像エラー時）
```tsx
import { Image } from 'antd';
import { PictureOutlined } from '@ant-design/icons';

export function ImageWithFallback({ src, alt }: Props) {
  return (
    <Image
      width={200}
      height={150}
      src={src}
      alt={alt}
      fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23f5f5f5' width='200' height='150'/%3E%3C/svg%3E"
      placeholder={
        <div style={{
          width: 200,
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          border: '1px dashed rgba(0,0,0,0.12)',
          borderRadius: 8
        }}>
          <PictureOutlined style={{ fontSize: 32, color: '#757575' }} />
        </div>
      }
      style={{
        borderRadius: 8,
        objectFit: 'contain',
        border: '1px solid rgba(0,0,0,0.12)'
      }}
    />
  );
}
```

---

## 注意事項

1. **パフォーマンス**: 大量の画像を表示する場合は、遅延読み込み（Lazy Loading）を使用
2. **ファイルサイズ**: サムネイルには最適化された小さい画像を使用
3. **アスペクト比**: 画像の縦横比を維持するため、`objectFit: 'contain'` または `'cover'` を適切に選択
4. **プレビュー無効化**: 装飾的な画像やアイコンには `preview={false}` を設定
5. **セキュリティ**: 外部URLの画像を表示する場合は、Content Security Policy（CSP）を確認

---

## テーマトークン参照

- `token.borderRadius`: 8px - 画像の角丸
- `token.colorBorder`: rgba(0,0,0,0.12) - ボーダー色
- `token.colorBgContainer`: #ffffff - 背景色
- `token.colorBgContainerDisabled`: #f5f5f5 - 読み込み中・エラー時の背景
- `token.colorPrimary`: #CF0027 - ホバーアイコン色
- `token.colorTextSecondary`: #757575 - エラーテキスト色

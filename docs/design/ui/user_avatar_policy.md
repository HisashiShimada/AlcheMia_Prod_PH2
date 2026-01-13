# ユーザーアイコン表示ポリシー

## 標準3パターン

### パターン1: ヘッダー用アイコン（大）
**用途**: ヘッダー、ナビゲーションバー、プロフィール表示

- サイズ: `40px × 40px`
- 背景色: `token.colorPrimary` (#CF0027)
- テキスト色: `#ffffff`
- フォントサイズ: `16px`
- フォントウェイト: `600`
- 角丸: `50%`（完全な円形）
- 文字数: 2文字（姓の1文字目 + 名の1文字目）
- ボーダー: なし

**使用例**:
- ヘッダーの右上ユーザーメニュー
- プロフィールページのアイコン
- ユーザー設定画面

---

### パターン2: リスト用アイコン（中）
**用途**: テーブル、カード、リスト内のユーザー表示

- サイズ: `32px × 32px`
- 背景色: `token.colorPrimary` (#CF0027)
- テキスト色: `#ffffff`
- フォントサイズ: `14px`
- フォントウェイト: `600`
- 角丸: `50%`（完全な円形）
- 文字数: 2文字（姓の1文字目 + 名の1文字目）
- ボーダー: なし

**使用例**:
- ユーザー管理テーブルの行
- プロジェクトメンバー一覧
- タスク担当者表示
- カード内のユーザー情報

---

### パターン3: 小型アイコン（小）
**用途**: コメント、アクティビティログ、履歴表示

- サイズ: `24px × 24px`
- 背景色: `token.colorPrimary` (#CF0027)
- テキスト色: `#ffffff`
- フォントサイズ: `12px`
- フォントウェイト: `600`
- 角丸: `50%`（完全な円形）
- 文字数: 2文字（姓の1文字目 + 名の1文字目）
- ボーダー: なし

**使用例**:
- コメント欄のアイコン
- アクティビティログ
- 通知リスト
- チャット履歴

---

## 共通仕様（全パターン）

### 色定義

**通常状態**
- 背景色: `token.colorPrimary` (#CF0027)
- テキスト色: `#ffffff`
- ボーダー: なし

**ホバー状態**（クリック可能な場合のみ）
- 背景色: `token.colorPrimaryHover` (#E63946)
- テキスト色: `#ffffff`
- カーソル: `pointer`
- トランジション: `all 0.2s ease`

**無効状態**（非アクティブユーザー）
- 背景色: `token.colorTextQuaternary` (#bdbdbd)
- テキスト色: `#ffffff`
- 不透明度: `0.6`

**オンライン状態インジケーター**（オプション）
- 位置: 右下
- サイズ: アイコンサイズの25%
- オンライン色: `token.colorSuccess` (#2e7d32)
- オフライン色: `token.colorTextQuaternary` (#bdbdbd)
- ビジー色: `token.colorWarning` (#ed6c02)
- 退席色: `token.colorTextTertiary` (#9e9e9e)
- ボーダー: `2px solid #ffffff`

### ロールバッジ（オプション）

**表示位置**: アイコンの右上

**サイズと色**:
- **System Admin**: 
  - サイズ: 12px × 12px
  - 背景色: `token.colorError` (#d32f2f)
  - アイコン: Crown（王冠）
- **Data Admin**: 
  - サイズ: 12px × 12px
  - 背景色: `token.colorInfo` (#0093CF)
  - アイコン: Database
- **Experiment Admin**: 
  - サイズ: 12px × 12px
  - 背景色: `token.colorWarning` (#ed6c02)
  - アイコン: Settings
- **Worker**: 
  - ロールバッジなし

---

## 文字表示ルール

### 日本語ユーザー名
- **姓と名がある場合**: 姓の1文字目 + 名の1文字目
  - 例: `山田 太郎` → `山太`
  - 例: `佐藤 花子` → `佐花`
- **姓のみの場合**: 姓の最初の2文字
  - 例: `田中` → `田中`
- **1文字の場合**: その1文字のみ
  - 例: `鈴` → `鈴`

### 英語ユーザー名
- **First Name + Last Nameの場合**: First Nameの1文字目 + Last Nameの1文字目（大文字）
  - 例: `John Smith` → `JS`
  - 例: `Alice Johnson` → `AJ`
- **単一名の場合**: 最初の2文字（大文字）
  - 例: `Admin` → `AD`

### フォールバック
- ユーザー名が取得できない場合: `？`（クエスチョンマーク）
- 削除済みユーザー: `削` または `DE`（Deleted）

---

## アイコングループ表示

### 複数ユーザー表示（重ねて表示）

**用途**: プロジェクトメンバー、チーム表示

**パターン1（3人まで）**:
- 最大表示数: 3人
- 重なり: 左から順に `-8px` ずつ重ねる
- z-index: 左から順に小さくする（1番目が最前面）
- ボーダー: `2px solid #ffffff`（背景と区別するため）
- 4人目以降は `+N` のバッジで表示

**パターン2（リスト形式）**:
- 縦に並べる
- 間隔: `8px`
- 最大表示数: 5人
- 6人目以降は「他○名」と表示

---

## レスポンシブ対応

### モバイル（xs, sm）
- パターン1（ヘッダー用）: `32px × 32px`に縮小
- パターン2（リスト用）: `28px × 28px`に縮小
- パターン3（小型）: `20px × 20px`に縮小
- ロールバッジ: 非表示（タップで詳細表示）

### タブレット（md）
- 標準サイズを維持

### デスクトップ（lg, xl, xxl）
- 標準サイズを維持

---

## パターン選択ガイド

| 用途 | パターン | サイズ | 文字サイズ |
|------|---------|--------|-----------|
| ヘッダー、プロフィール | パターン1 | 40px | 16px |
| テーブル、カード | パターン2 | 32px | 14px |
| コメント、ログ | パターン3 | 24px | 12px |

---

## 実装例

### Ant Design Avatar コンポーネント使用

```tsx
import { Avatar, Badge } from 'antd';
import { UserOutlined, CrownOutlined } from '@ant-design/icons';

// パターン1: ヘッダー用（大）
<Avatar 
  size={40} 
  style={{ 
    backgroundColor: '#CF0027',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600
  }}
>
  山太
</Avatar>

// パターン2: リスト用（中）
<Avatar 
  size={32} 
  style={{ 
    backgroundColor: '#CF0027',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600
  }}
>
  佐花
</Avatar>

// パターン3: 小型（小）
<Avatar 
  size={24} 
  style={{ 
    backgroundColor: '#CF0027',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 600
  }}
>
  田中
</Avatar>

// ロールバッジ付き
<Badge
  count={<CrownOutlined style={{ color: '#ffffff' }} />}
  offset={[-5, 5]}
  style={{ backgroundColor: '#d32f2f' }}
>
  <Avatar size={40} style={{ backgroundColor: '#CF0027' }}>
    山太
  </Avatar>
</Badge>

// オンライン状態インジケーター付き
<Badge 
  dot 
  status="success" 
  offset={[-5, 35]}
>
  <Avatar size={40} style={{ backgroundColor: '#CF0027' }}>
    山太
  </Avatar>
</Badge>

// 複数ユーザー表示
<Avatar.Group 
  maxCount={3} 
  maxStyle={{ 
    color: '#CF0027', 
    backgroundColor: '#FFF1F3' 
  }}
>
  <Avatar style={{ backgroundColor: '#CF0027' }}>山太</Avatar>
  <Avatar style={{ backgroundColor: '#CF0027' }}>佐花</Avatar>
  <Avatar style={{ backgroundColor: '#CF0027' }}>田中</Avatar>
  <Avatar style={{ backgroundColor: '#CF0027' }}>鈴木</Avatar>
</Avatar.Group>
```

---

## アクセシビリティ

### スクリーンリーダー対応
- `aria-label` でユーザー名を明示
  - 例: `aria-label="山田 太郎"`
- 画像の場合は `alt` 属性を設定
  - 例: `alt="山田 太郎のプロフィール画像"`

### キーボード操作
- クリック可能な場合は `tabindex="0"` を設定
- Enterキーでクリックイベントを発火

### コントラスト比
- 背景色とテキスト色のコントラスト比: 4.5:1以上
- `#CF0027`（背景）と `#ffffff`（テキスト）: **7.5:1**（合格）

---

## 画像アイコンの扱い

ユーザーがプロフィール画像をアップロードしている場合:

1. **画像を優先表示**
   - `<Avatar src={imageUrl} />` を使用
   - 画像読み込みエラー時はフォールバック

2. **フォールバック**
   - 画像読み込み失敗時は文字アイコンを表示
   - `icon` プロパティで `<UserOutlined />` を指定

3. **画像サイズ最適化**
   - サーバー側でリサイズ（100px × 100px推奨）
   - WebP形式を優先、JPGをフォールバック

```tsx
<Avatar 
  size={40}
  src={user.avatarUrl}
  icon={<UserOutlined />}
  style={{ 
    backgroundColor: '#CF0027',
    color: '#ffffff'
  }}
>
  {!user.avatarUrl && getUserInitials(user.name)}
</Avatar>
```

---

## 注意事項

### DO（推奨）
✅ 常にユーザー名の最初の2文字を使用する
✅ 背景色は統一して `token.colorPrimary` を使用
✅ 文字は常に白色（#ffffff）にする
✅ 完全な円形（`border-radius: 50%`）にする
✅ ホバー時のフィードバックを提供する（クリック可能な場合）
✅ aria-labelでアクセシビリティを確保する

### DON'T（非推奨）
❌ サイズを任意の値にしない（標準3パターンを使用）
❌ 背景色を勝手に変えない
❌ 四角形のアイコンにしない
❌ 1文字だけを表示しない（フォールバック以外）
❌ 低いコントラスト比の色を使用しない
❌ オンライン状態インジケーターを大きくしすぎない

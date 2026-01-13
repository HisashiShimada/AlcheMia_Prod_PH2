# ツールチップ表示ポリシー

## 標準4パターン

### パターン1: 情報表示（アイコンホバー）
**用途**: フィールドやラベルの補足説明

- トリガー: `QuestionCircleOutlined` / `InfoCircleOutlined` アイコン（16px）
- トリガー色: `token.colorTextSecondary` (#757575)
- トリガー配置: ラベル右側、8px間隔
- 表示タイミング: ホバー時（0.5秒遅延）
- 背景色: `rgba(0, 0, 0, 0.85)`
- テキスト色: `#ffffff`
- フォントサイズ: `token.fontSize` (14px)
- 最大幅: `300px`
- パディング: 上下8px、左右12px
- 角丸: `token.borderRadiusSM` (4px)
- 矢印: あり

**実装例**:
```tsx
<Space>
  <span>ユーザー名</span>
  <Tooltip title="システムにログインするためのユーザー名です">
    <QuestionCircleOutlined style={{ color: token.colorTextSecondary }} />
  </Tooltip>
</Space>
```

---

### パターン2: データ省略時の全文表示
**用途**: 長いテキストの省略時に完全表示

- トリガー: 省略されたテキスト（`...`で終わる）
- トリガースタイル: 通常のテキスト表示、カーソル: pointer
- 表示タイミング: ホバー時（0.5秒遅延）
- 背景色: `rgba(0, 0, 0, 0.85)`
- テキスト色: `#ffffff`
- フォントサイズ: `token.fontSize` (14px)
- 最大幅: `400px`
- パディング: 上下8px、左右12px
- 角丸: `token.borderRadiusSM` (4px)
- 矢印: あり
- 折り返し: `whiteSpace: 'pre-wrap'`

**実装例**:
```tsx
<Tooltip title={fullText}>
  <Typography.Text ellipsis style={{ maxWidth: '200px', cursor: 'pointer' }}>
    {longText}
  </Typography.Text>
</Tooltip>
```

---

### パターン3: 操作説明（ボタン・リンク）
**用途**: ボタンやアイコンの操作説明

- トリガー: Button、IconButton、リンクなど
- 表示タイミング: ホバー時（0.8秒遅延）
- 背景色: `rgba(0, 0, 0, 0.85)`
- テキスト色: `#ffffff`
- フォントサイズ: `token.fontSizeSM` (12px)
- 最大幅: `200px`
- パディング: 上下6px、左右8px
- 角丸: `token.borderRadiusSM` (4px)
- 矢印: あり
- テキスト: 簡潔な動詞（「編集」「削除」「ダウンロード」など）

**実装例**:
```tsx
<Tooltip title="編集" mouseEnterDelay={0.8}>
  <Button icon={<EditOutlined />} />
</Tooltip>
```

---

### パターン4: 状態・ステータス説明
**用途**: バッジ、ステータスラベル、アイコンの詳細説明

- トリガー: Badge、Tag、Status などの状態表示要素
- トリガースタイル: カーソル: help
- 表示タイミング: ホバー時（0.5秒遅延）
- 背景色: `rgba(0, 0, 0, 0.85)`
- テキスト色: `#ffffff`
- フォントサイズ: `token.fontSize` (14px)
- 最大幅: `300px`
- パディング: 上下8px、左右12px
- 角丸: `token.borderRadiusSM` (4px)
- 矢印: あり
- 内容: 状態の意味や詳細説明

**実装例**:
```tsx
<Tooltip title="実験が正常に完了し、データが保存されました">
  <Badge status="success" text="完了" style={{ cursor: 'help' }} />
</Tooltip>
```

---

## 共通仕様（全パターン）

### 色定義
**背景色**
- 標準: `rgba(0, 0, 0, 0.85)` - 半透明の黒

**テキスト色**
- 標準: `#ffffff` - 白

**フォントサイズ**
- 情報表示: `token.fontSize` (14px)
- データ省略: `token.fontSize` (14px)
- 操作説明: `token.fontSizeSM` (12px)
- 状態説明: `token.fontSize` (14px)

### レイアウト
**パディング**
- 標準（情報・データ・状態）: 上下8px、左右12px
- 小型（操作説明）: 上下6px、左右8px

**角丸**
- 全パターン: `token.borderRadiusSM` (4px)

**最大幅**
- 情報表示: 300px
- データ省略: 400px（長文対応）
- 操作説明: 200px（簡潔）
- 状態説明: 300px

**矢印**
- 全パターン: あり
- 色: 背景色と同じ `rgba(0, 0, 0, 0.85)`

### 表示タイミング
**mouseEnterDelay（ホバー遅延）**
- 情報表示: 0.5秒
- データ省略: 0.5秒
- 操作説明: 0.8秒（誤操作防止）
- 状態説明: 0.5秒

**mouseLeaveDelay（非表示遅延）**
- 全パターン: 0.1秒

### 配置（placement）
**推奨配置**
- 情報表示: `top`（上）または `topRight`
- データ省略: `top`（上）
- 操作説明: `top`（上）
- 状態説明: `top`（上）または `right`

**画面端での自動調整**
- `autoAdjustOverflow: true`（デフォルト）

---

## 使用ガイドライン

### DO（推奨）
✅ 簡潔で分かりやすい説明文を使用する
✅ ホバー遅延を設定して誤表示を防ぐ
✅ 最大幅を設定して読みやすさを確保する
✅ アイコンの色を統一する（colorTextSecondary）
✅ 省略されたテキストには必ずツールチップを付ける
✅ カーソルスタイルで操作可能性を示す（pointer, help）

### DON'T（非推奨）
❌ 長すぎる説明文を表示しない（最大3-4行）
❌ 必須情報をツールチップにのみ表示しない
❌ ツールチップ内に操作可能な要素を含めない
❌ 複雑なHTML構造を含めない
❌ モバイルで重要な情報をツールチップに依存しない
❌ ツールチップを開いた状態で固定しない

---

## パターン選択

- フィールド・ラベルの補足説明 → **パターン1（情報表示）**
- 長いテキストの省略表示 → **パターン2（データ省略時の全文表示）**
- ボタン・アイコンの操作説明 → **パターン3（操作説明）**
- バッジ・ステータスの詳細 → **パターン4（状態・ステータス説明）**

---

## 除外されたパターンと標準パターンの対応

以下のパターンは標準4パターンから除外されていますが、必要に応じて標準パターンの変種として扱います。

### Popover（複雑な内容表示）
- **対応する標準パターン**: パターン1の拡張版
- **除外理由**: Tooltip より複雑で、HTML要素やリンクを含むため
- **形状**: Tooltip より大きく、タイトル・コンテンツを分離
- **差異**: クリックでも表示可能、最大幅制限なし
- **用途**: 詳細情報、複数行のリスト、リンクを含む説明

### Rich Tooltip（リッチコンテンツ）
- **対応する標準パターン**: パターン1の変種
- **除外理由**: 標準的な使用頻度が低いため
- **形状**: パターン1と同じ
- **差異**: JSX要素を`title`に指定可能（太字、色付けなど）
- **用途**: 強調表示が必要な説明

### Tooltip with Link（リンク付き）
- **対応する標準パターン**: Popover を使用
- **除外理由**: Tooltip はインタラクティブな要素を含まないため
- **推奨**: リンクが必要な場合は Popover を使用

### 常時表示 Tooltip
- **対応する標準パターン**: なし（非推奨）
- **除外理由**: ツールチップは一時的な情報表示のため
- **推奨**: 常時表示が必要な情報は通常のテキストとして表示

---

## アクセシビリティ

### キーボード操作
- ツールチップはフォーカス時にも表示される
- Escキーでツールチップを閉じる

### スクリーンリーダー
- `role="tooltip"`（自動設定）
- `aria-describedby`で関連付け（自動設定）
- 簡潔な説明文を使用

### カラーコントラスト
- 背景 `rgba(0, 0, 0, 0.85)` とテキスト `#ffffff` のコントラスト比: 19.77:1（WCAG AAA準拠）

---

## モバイル対応

### タッチデバイス
- タップでツールチップ表示
- 画面外をタップで閉じる
- 3秒後に自動的に閉じる（`autoClose: true`）

### レスポンシブ配置
- 画面サイズに応じて配置を自動調整
- モバイルでは下部に表示を推奨（指で隠れない）

---

## 実装テンプレート

### パターン1: 情報表示
```tsx
import { Space, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { theme } from 'antd';

const { useToken } = theme;

export default function InfoTooltipExample() {
  const { token } = useToken();
  
  return (
    <Space>
      <span>ユーザー名</span>
      <Tooltip 
        title="システムにログインするためのユーザー名です"
        mouseEnterDelay={0.5}
        placement="top"
      >
        <QuestionCircleOutlined 
          style={{ color: token.colorTextSecondary, fontSize: 16 }} 
        />
      </Tooltip>
    </Space>
  );
}
```

### パターン2: データ省略
```tsx
import { Tooltip, Typography } from 'antd';

export default function EllipsisTooltipExample() {
  const longText = 'これは非常に長いテキストで、画面に表示しきれない場合に省略されます。ツールチップで全文を表示します。';
  
  return (
    <Tooltip title={longText} mouseEnterDelay={0.5}>
      <Typography.Text 
        ellipsis 
        style={{ maxWidth: 200, cursor: 'pointer' }}
      >
        {longText}
      </Typography.Text>
    </Tooltip>
  );
}
```

### パターン3: 操作説明
```tsx
import { Tooltip, Button } from 'antd';
import { EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';

export default function ActionTooltipExample() {
  return (
    <>
      <Tooltip title="編集" mouseEnterDelay={0.8}>
        <Button icon={<EditOutlined />} />
      </Tooltip>
      <Tooltip title="削除" mouseEnterDelay={0.8}>
        <Button icon={<DeleteOutlined />} danger />
      </Tooltip>
      <Tooltip title="ダウンロード" mouseEnterDelay={0.8}>
        <Button icon={<DownloadOutlined />} />
      </Tooltip>
    </>
  );
}
```

### パターン4: 状態説明
```tsx
import { Tooltip, Badge, Tag } from 'antd';

export default function StatusTooltipExample() {
  return (
    <>
      <Tooltip 
        title="実験が正常に完了し、データが保存されました"
        mouseEnterDelay={0.5}
      >
        <Badge 
          status="success" 
          text="完了" 
          style={{ cursor: 'help' }} 
        />
      </Tooltip>
      
      <Tooltip 
        title="実験は現在進行中です"
        mouseEnterDelay={0.5}
      >
        <Tag color="processing" style={{ cursor: 'help' }}>
          進行中
        </Tag>
      </Tooltip>
    </>
  );
}

# ステータス（Tag）・ラベル（Label）形状ポリシー

## Tag（ステータス）の標準パターン

### パターン1: ステータス表示
**用途**: プロジェクト状態、タスク状態、進捗状況の表示

**デフォルト（標準）**
```tsx
<Tag color="default">保留中</Tag>
<Tag color="default">未選択</Tag>
<Tag color="default">無効</Tag>
```
- 色: グレー系
- 用途: 初期状態、無効状態、未設定状態

**情報（青系）**
```tsx
<Tag color="blue">開始</Tag>
<Tag color="cyan">進行中</Tag>
<Tag color="processing">処理中</Tag>
```
- 色: 青系（`#0093CF` - `token.colorInfo`）
- 用途: 進行中、処理中、情報表示

**成功（緑系）**
```tsx
<Tag color="green">完了</Tag>
<Tag color="success">成功</Tag>
<Tag color="success">チェックイン済み</Tag>
```
- 色: 緑系（`#2e7d32` - `token.colorSuccess`）
- 用途: 完了、成功、有効状態

**警告（橙系）**
```tsx
<Tag color="orange">作業中</Tag>
<Tag color="orange">チェックアウト中</Tag>
<Tag color="warning">警告</Tag>
```
- 色: 橙系（`#ed6c02` - `token.colorWarning`）
- 用途: 警告、注意喚起、一時的な状態

**エラー（赤系）**
```tsx
<Tag color="red">中断</Tag>
<Tag color="error">エラー</Tag>
<Tag color="red">強制終了</Tag>
```
- 色: 赤系（`#d32f2f` - `token.colorError`）
- 用途: エラー、失敗、異常状態

**特殊状態（紫系）**
```tsx
<Tag color="purple">レビュー待ち</Tag>
<Tag color="magenta">承認待ち</Tag>
```
- 色: 紫系
- 用途: レビュー待ち、承認待ち、特殊なステータス

---

### パターン2: カウント・数値表示
**用途**: 件数表示、統計情報

```tsx
<Tag color="blue">{totalProjects}</Tag>
<Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
<Tag color="success">{searchResults.length}件</Tag>
```

**特徴:**
- 条件付き色分け（0件の場合はdefault、それ以外はblue）
- 単位付き表示（「件」など）
- 数値を強調

---

### パターン3: カテゴリ・タグ表示
**用途**: カテゴリ分類、タグ付け、分類表示

```tsx
<Tag color="purple">{template.category}</Tag>
<Tag color="blue">{tag}</Tag>
<Tag color="blue">{file.type.toUpperCase()}</Tag>
```

**特徴:**
- カテゴリごとに固定色
- 小さめのフォント（`fontSize: 11`）
- 複数並べて表示可能

---

### パターン4: バージョン・識別表示
**用途**: バージョン番号、形式識別

```tsx
<Tag color="green">{file.version}</Tag>
<Tag color="blue">v{version}</Tag>
<Tag color="blue">{extension}</Tag>
```

**特徴:**
- バージョン: 緑系（`green`, `success`）
- 形式: 青系（`blue`）
- プレフィックス付き（`v1.0.0`など）

---

### パターン5: 選択状態表示
**用途**: 現在選択中、選択済みの表示

```tsx
<Tag color="blue">現在選択中</Tag>
<Tag color="red">選択中</Tag>
<Tag color="red">{selectedRowKeys.length} 件選択中</Tag>
```

**特徴:**
- 現在アクティブ: 青系（`blue`）
- 選択済み: 赤系（`red`）
- 件数付き表示

---

### パターン6: NEW・特殊マーク
**用途**: 新規項目、特別な状態の強調

```tsx
<Tag color="success" style={{ marginLeft: 8, fontSize: 10 }}>
  NEW
</Tag>
<Tag color="red" style={{ fontSize: 10, margin: 0 }}>
  Material
</Tag>
```

**特徴:**
- 小さめフォント（`fontSize: 10`）
- マージン調整（`marginLeft: 8`）
- 全大文字表記（`NEW`）

---

## Tag の共通仕様

### サイズ

**デフォルト**
```tsx
<Tag>デフォルト</Tag>  // 高さ: 24px
```

**小サイズ（カスタム）**
```tsx
<Tag style={{ fontSize: 10, margin: 0 }}>小</Tag>  // 高さ: 約18px
<Tag style={{ fontSize: 11 }}>小</Tag>  // 高さ: 約20px
```

### マージン・パディング

```tsx
// デフォルト
<Tag>タグ</Tag>  // margin: 0 8px 0 0

// マージンなし（密集配置）
<Tag style={{ margin: 0 }}>タグ</Tag>

// カスタムマージン（左に配置）
<Tag style={{ marginLeft: 8 }}>タグ</Tag>
```

### アイコン付き

```tsx
<Tag icon={<CheckCircleOutlined />} color="success">
  完了
</Tag>
<Tag icon={<ClockCircleOutlined />} color="processing">
  処理中
</Tag>
```

### closable（削除可能）

```tsx
<Tag closable onClose={(e) => handleClose(e)}>
  削除可能
</Tag>
```

---

## Label（Typography.Text）の標準パターン

### パターン1: 標準テキスト
**用途**: 通常のテキスト表示

```tsx
<Text>通常テキスト</Text>
```

- フォントサイズ: `token.fontSize` (14px)
- 色: `token.colorText` (#212121)

---

### パターン2: 強調テキスト
**用途**: ラベル、見出し、重要な情報

```tsx
<Text strong>強調テキスト</Text>
<Text strong style={{ fontSize: 16 }}>大きめ強調</Text>
```

- フォントウェイト: `token.fontWeightStrong` (600)
- 用途: フォームラベル、テーブル内の重要データ

---

### パターン3: セカンダリテキスト
**用途**: 補足情報、サブテキスト

```tsx
<Text type="secondary">補足テキスト</Text>
<Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
  小さめ補足
</Text>
```

- 色: `token.colorTextSecondary` (#757575)
- フォントサイズ: 通常14px、小さめ12px
- 用途: 説明文、サブ情報、時刻表示

---

### パターン4: 三次テキスト
**用途**: ヒント、プレースホルダー的な情報

```tsx
<Text type="tertiary">ヒントテキスト</Text>
```

- 色: `token.colorTextTertiary` (#9e9e9e)
- 用途: さらに目立たない補足情報

---

### パターン5: 無効テキスト
**用途**: 無効化された項目

```tsx
<Text disabled>無効テキスト</Text>
```

- 色: `token.colorTextDisabled` (#bdbdbd)
- 用途: 選択不可、無効な項目

---

### パターン6: 危険テキスト
**用途**: エラーメッセージ、警告

```tsx
<Text type="danger">エラーメッセージ</Text>
```

- 色: `token.colorError` (#d32f2f)
- 用途: エラー表示、削除確認

---

### パターン7: 成功テキスト
**用途**: 成功メッセージ

```tsx
<Text type="success">成功メッセージ</Text>
```

- 色: `token.colorSuccess` (#2e7d32)
- 用途: 処理成功、完了通知

---

### パターン8: 警告テキスト
**用途**: 警告メッセージ

```tsx
<Text type="warning">警告メッセージ</Text>
```

- 色: `token.colorWarning` (#ed6c02)
- 用途: 注意喚起、警告表示

---

### パターン9: カスタムカラーテキスト
**用途**: 特殊な色の強調

```tsx
<Text strong style={{ color: token.colorInfo }}>
  情報テキスト
</Text>
<Text strong style={{ color: token.colorPrimary }}>
  プライマリカラー
</Text>
```

- 色: カスタム指定
- 用途: 進捗率、特殊な強調

---

## Typography.Title（見出し）

### サイズ別

```tsx
<Title level={1}>H1見出し</Title>  // 38px
<Title level={2}>H2見出し</Title>  // 30px
<Title level={3}>H3見出し</Title>  // 24px
<Title level={4}>H4見出し</Title>  // 20px
<Title level={5}>H5見出し</Title>  // 16px
```

### 使用例

```tsx
<Title level={2}>ページタイトル</Title>
<Title level={3} style={{ marginTop: 24 }}>セクション見出し</Title>
<Title level={4}>サブセクション見出し</Title>
```

---

## Space コンポーネントとの組み合わせ

### 横並び配置

```tsx
<Space>
  <Text strong>ラベル:</Text>
  <Tag color="blue">値</Tag>
</Space>

<Space>
  <Text strong>ステータス:</Text>
  <Tag color={getStatusColor(status)}>
    {getStatusLabel(status)}
  </Tag>
</Space>
```

### 縦並び配置

```tsx
<Space direction="vertical">
  <Text strong>ファイル名</Text>
  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
    補足説明
  </Text>
</Space>
```

---

## 色の使い分けガイド

### ステータスTag

| 状態 | color | 用途 |
|------|-------|------|
| 未開始・保留 | `default` | 開始前、保留中、未選択 |
| 進行中 | `blue` / `cyan` | 開始、進行中、処理中 |
| 完了・成功 | `green` / `success` | 完了、成功、有効 |
| 警告・注意 | `orange` / `warning` | 警告、チェックアウト中 |
| エラー・中断 | `red` / `error` | エラー、中断、異常 |
| レビュー待ち | `purple` / `magenta` | レビュー待ち、承認待ち |
| 処理中（アニメーション） | `processing` | 実行中（点滅効果あり） |

### カウントTag

| 状態 | color | 用途 |
|------|-------|------|
| 0件 | `default` | データなし |
| 1件以上 | `blue` | 通常のカウント |
| エラー件数 | `red` | エラーや問題のカウント |
| 成功件数 | `success` | 成功や完了のカウント |

### カテゴリTag

| カテゴリ | color | 用途 |
|---------|-------|------|
| 標準カテゴリ | `blue` | 一般的な分類 |
| 重要カテゴリ | `purple` | 特殊な分類 |
| ファイル形式 | `blue` / `green` | MAIML、PDFなど |

---

## 実装パターン

### 動的色変更（ステータス）

```tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case 'not_started':
      return 'default';
    case 'started':
      return 'blue';
    case 'in_progress':
      return 'cyan';
    case 'completed':
      return 'success';
    case 'error':
      return 'error';
    case 'suspended':
      return 'orange';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'not_started':
      return '開始前';
    case 'started':
      return '開始';
    case 'in_progress':
      return '進行中';
    case 'completed':
      return '完了';
    case 'error':
      return 'エラー';
    case 'suspended':
      return '中断';
    default:
      return '不明';
  }
};

// 使用例
<Tag color={getStatusColor(status)}>
  {getStatusLabel(status)}
</Tag>
```

### 条件付き表示

```tsx
// カウント表示（0件の場合はグレー）
<Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>

// チェックアウト状態
{isCheckedOut ? (
  <Tag color="orange">チェックアウト中</Tag>
) : (
  <Tag color="success">チェックイン済み</Tag>
)}

// 新規マーク
{isNew && (
  <Tag color="success" style={{ marginLeft: 8, fontSize: 10 }}>
    NEW
  </Tag>
)}
```

### 複数Tag組み合わせ

```tsx
<Space size="small">
  <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
  {isCheckedOut && <Tag color="orange">チェックアウト中</Tag>}
  {matchCount > 0 && <Tag color="success">{matchCount}マッチ</Tag>}
</Space>
```

### ラベルとTag組み合わせ

```tsx
// パターン1: 横並び
<Space>
  <Text strong>プロジェクトステータス:</Text>
  <Tag color="blue">{projectStatus}</Tag>
</Space>

// パターン2: Descriptions内
<Descriptions.Item label="ステータス">
  <Tag color="blue">{status}</Tag>
</Descriptions.Item>

// パターン3: テーブル内
{
  title: 'ステータス',
  dataIndex: 'status',
  render: (status: string) => (
    <Tag color={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Tag>
  )
}
```

---

## ベストプラクティス

### DO（推奨）
✅ 色の意味を統一する（blue=進行中、green=完了など）
✅ ステータスは関数で色とラベルを管理する
✅ 条件付きで色を変更する（0件の場合はdefault など）
✅ 補足情報にはtype="secondary"を使う
✅ 強調すべき情報にはstrongを使う
✅ Space コンポーネントで適切に配置する
✅ 小さいTagには fontSize を調整する
✅ アイコン付きTagで視認性を向上させる

### DON'T（非推奨）
❌ 色の意味を統一しない（同じ状態で異なる色を使う）
❌ ハードコードされた色を直接使う
❌ Tagを過度に大きくしない
❌ 重要でない情報にstrongを多用しない
❌ type="danger"を警告以外で使わない
❌ 複数のTagを間隔なしで並べない
❌ 長いテキストをTagに入れない（Text使用を推奨）

---

## アクセシビリティ

### ARIA属性

```tsx
<Tag aria-label={`ステータス: ${getStatusLabel(status)}`} color={getStatusColor(status)}>
  {getStatusLabel(status)}
</Tag>
```

### セマンティックな使用

```tsx
// 良い例
<Space>
  <Text strong>ステータス:</Text>
  <Tag color="blue">進行中</Tag>
</Space>

// 悪い例（ラベルがない）
<Tag color="blue">進行中</Tag>  // 何のステータスか不明
```

---

## レスポンシブ対応

### モバイル向け調整

```tsx
// モバイルでは小さめに
<Tag 
  color="blue"
  style={{
    fontSize: isMobile ? 10 : 12,
    padding: isMobile ? '0 4px' : undefined
  }}
>
  ステータス
</Tag>

// テキストも調整
<Text 
  strong 
  style={{ 
    fontSize: isMobile ? token.fontSizeSM : token.fontSize 
  }}
>
  ラベル
</Text>
```

---

## 多言語化対応

### 国際化（i18n）

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

const { t } = useLanguage();

<Tag color={getStatusColor(status)}>
  {t(`status.${status}`)}  // 多言語対応
</Tag>

<Text strong>{t('label.projectName')}:</Text>
```

---

## 実装チェックリスト

### 必須項目
- [ ] 色の意味が統一されている
- [ ] ステータス表示に関数を使用している
- [ ] ラベルと値の組み合わせが適切
- [ ] Space で適切に配置されている
- [ ] type属性を適切に使用している

### 推奨項目
- [ ] 条件付き色変更を実装している
- [ ] ARIA属性を付与している
- [ ] レスポンシブ対応している
- [ ] 多言語化対応している
- [ ] 小さいTagのフォントサイズを調整している

### オプション項目
- [ ] アイコン付きTagを使用している
- [ ] アニメーション（processing）を使用している
- [ ] closable Tagを実装している
- [ ] カスタムスタイリングしている

---

## 参考実装

### ステータス表示の完全実装

```tsx
import { Tag, Space, Typography } from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  CloseCircleOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

type Status = 'not_started' | 'in_progress' | 'completed' | 'error';

interface StatusConfig {
  color: string;
  label: string;
  icon?: React.ReactNode;
}

const STATUS_CONFIG: Record<Status, StatusConfig> = {
  not_started: {
    color: 'default',
    label: '開始前',
    icon: undefined
  },
  in_progress: {
    color: 'processing',
    label: '進行中',
    icon: <ClockCircleOutlined />
  },
  completed: {
    color: 'success',
    label: '完了',
    icon: <CheckCircleOutlined />
  },
  error: {
    color: 'error',
    label: 'エラー',
    icon: <CloseCircleOutlined />
  }
};

export function StatusDisplay({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  
  return (
    <Space>
      <Text strong>ステータス:</Text>
      <Tag 
        icon={config.icon} 
        color={config.color}
        aria-label={`ステータス: ${config.label}`}
      >
        {config.label}
      </Tag>
    </Space>
  );
}
```

### カウント表示の完全実装

```tsx
interface CountDisplayProps {
  count: number;
  label: string;
  type?: 'default' | 'error' | 'success';
}

export function CountDisplay({ count, label, type = 'default' }: CountDisplayProps) {
  const getColor = () => {
    if (count === 0) return 'default';
    if (type === 'error') return 'red';
    if (type === 'success') return 'green';
    return 'blue';
  };

  return (
    <Space>
      <Text strong>{label}:</Text>
      <Tag color={getColor()}>{count}件</Tag>
    </Space>
  );
}
```

### 複数Tag組み合わせの完全実装

```tsx
interface ProjectStatusProps {
  status: Status;
  isCheckedOut: boolean;
  matchCount: number;
  tags: string[];
}

export function ProjectStatus({ 
  status, 
  isCheckedOut, 
  matchCount,
  tags 
}: ProjectStatusProps) {
  return (
    <Space size="small" wrap>
      <Tag color={STATUS_CONFIG[status].color}>
        {STATUS_CONFIG[status].label}
      </Tag>
      
      {isCheckedOut && (
        <Tag color="orange">チェックアウト中</Tag>
      )}
      
      {matchCount > 0 && (
        <Tag color="success">{matchCount}マッチ</Tag>
      )}
      
      {tags.map((tag, index) => (
        <Tag key={index} color="blue" style={{ fontSize: 11 }}>
          {tag}
        </Tag>
      ))}
    </Space>
  );
}

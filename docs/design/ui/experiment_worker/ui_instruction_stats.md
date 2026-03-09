# InstructionStats UI設計書

## メタデータ
- **コンポーネントID**: InstructionStats
- **コンポーネント名**: 指示統計コンポーネント
- **ファイルパス**: `frontend/src/components/ExperimentWorker/InstructionStats.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-19
- **最終更新日**: 2026-01-19

---

## 1. 概要

### 1.1 コンポーネントの目的
指示確認タブの上部に表示される統計サマリーコンポーネントです。全指示数、プロジェクト指示数、タスク指示数、トランジション指示数を4つの個別カードで視覚的に表示します。

### 1.2 主要機能
- 4種類の指示件数を個別カードで表示
- アイコンと色による視覚的な区別
- レスポンシブなグリッドレイアウト

### 1.3 使用場所
- InstructionConfirmationTab（指示確認タブ）のヘッダー部分

---

## 2. コンポーネント構成

### 2.1 画面イメージ
![指示統計コンポーネントイメージ](..\images\ui_instruction_stats.jpg)

### 2.2 レイアウト構造

```
┌─────────────────────────────────────────────────────────────────┐
│ Row (gutter: 16)                                                 │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│ │ Col (xs:24)  │ Col (xs:24)  │ Col (xs:24)  │ Col (xs:24)  │  │
│ │ (sm:12)      │ (sm:12)      │ (sm:12)      │ (sm:12)      │  │
│ │ (md:6)       │ (md:6)       │ (md:6)       │ (md:6)       │  │
│ │              │              │              │              │  │
│ │ StatCard     │ StatCard     │ StatCard     │ StatCard     │  │
│ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │  │
│ │ │[icon] 全 │ │ │[icon] プ │ │ │[icon] タ │ │ │[icon] ト │ │  │
│ │ │指示数 XX │ │ │ロジェクト│ │ │スク指示  │ │ │ランジ    │ │  │
│ │ │          │ │ │指示 XX   │ │ │XX        │ │ │ション指示│ │  │
│ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │  │
│ └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘

レスポンシブ動作:
- モバイル(xs): 縦1列（各カード全幅）
- タブレット(sm): 2列表示（各カード50%幅）
- デスクトップ(md~): 4列表示（各カード25%幅）
```

### 2.3 使用コンポーネント

#### Ant Design コンポーネント
- `Card` - 統計カード
- `Row`, `Col` - グリッドレイアウト
- `Typography.Text` - ラベルテキスト
- `Typography.Title` - 数値表示
- `theme` - デザイントークン取得

#### アイコン
- `FileTextOutlined` - 全指示数（青）
- `FileOutlined` - プロジェクト指示（緑）
- `ToolOutlined` - タスク指示（オレンジ）
- `AimOutlined` - トランジション指示（ピンク）

---

## 3. Props

```typescript
interface InstructionStatsProps {
  stats: {
    total: number;       // 全指示数
    file: number;        // プロジェクト指示数
    method: number;      // タスク指示数（メソッド指示）
    transition: number;  // トランジション指示数
    unread: number;      // 未読数（現在未使用）
  };
}
```

---

## 4. サブコンポーネント: StatCard

### 4.1 Props

```typescript
interface StatCardProps {
  icon: React.ReactNode;  // アイコン
  label: string;          // ラベルテキスト
  value: number;          // 表示する数値
  borderColor: string;    // 左ボーダー色
  iconColor: string;      // アイコンと数値の色
}
```

### 4.2 レイアウト

```
┌─StatCard─────────────────────────┐
│ ┌─────────────────────────────┐ │
│ │ [icon]  ラベル    数値     │ │
│ │  24px   14px     28px      │ │
│ │ (color) (secondary) (color)│ │
│ └─────────────────────────────┘ │
│ gap: 12px                       │
│ padding: 8px 24px               │
│ borderLeft: 4px solid (color)   │
└─────────────────────────────────┘
```

### 4.3 スタイル

```typescript
<Card
  style={{
    borderLeft: `4px solid ${borderColor}`,
    borderRadius: token.borderRadius,
    height: '100%',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  }}
  bodyStyle={{ padding: '8px 24px' }}
>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    {/* アイコン */}
    <div style={{ fontSize: 24, color: iconColor }}>
      {icon}
    </div>
    
    {/* ラベル */}
    <Text type="secondary" style={{ fontSize: 14 }}>
      {label}
    </Text>
    
    {/* 数値 */}
    <Title level={3} style={{ 
      margin: 0, 
      fontSize: 28, 
      fontWeight: 600, 
      color: iconColor 
    }}>
      {value}
    </Title>
  </div>
</Card>
```

---

## 5. 統計カードの定義

### 5.1 カード一覧

| カード | アイコン | ラベル | データソース | ボーダー色 | アイコン色 |
|--------|---------|--------|-------------|-----------|-----------|
| 全指示数 | FileTextOutlined | 全指示数 | stats.total | #1890ff（青） | #1890ff |
| プロジェクト指示 | FileOutlined | プロジェクト指示 | stats.file | #52c41a（緑） | #52c41a |
| タスク指示 | ToolOutlined | タスク指示 | stats.method | #fa8c16（オレンジ） | #fa8c16 |
| トランジション指示 | AimOutlined | トランジション指示 | stats.transition | #eb2f96（ピンク） | #eb2f96 |

### 5.2 色の意味

- **青（#1890ff）**: 全体の総計、情報
- **緑（#52c41a）**: プロジェクトレベル、成功
- **オレンジ（#fa8c16）**: タスクレベル、警告
- **ピンク（#eb2f96）**: トランジションレベル、重要

---

## 6. レスポンシブ設計

### 6.1 ブレークポイント

```typescript
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={6}>
    {/* StatCard */}
  </Col>
</Row>
```

| 画面サイズ | ブレークポイント | カラム設定 | 表示 |
|----------|----------------|----------|------|
| モバイル | xs (< 576px) | 24/24 | 縦1列 |
| タブレット | sm (≥ 576px) | 12/24 | 2列表示 |
| デスクトップ | md (≥ 768px) | 6/24 | 4列表示 |

### 6.2 ガター

- **水平ガター**: 16px
- **垂直ガター**: 16px（モバイル時に有効）

---

## 7. スタイリング

### 7.1 コンテナスタイル

```typescript
<div
  style={{
    backgroundColor: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: '8px',
  }}
>
```

### 7.2 カードスタイル

```typescript
// カード本体
borderLeft: `4px solid ${borderColor}`  // 左ボーダー（強調）
borderRadius: token.borderRadius
height: '100%'
boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'

// カードボディ
padding: '8px 24px'  // 縦8px、横24px

// 内部レイアウト
display: 'flex'
alignItems: 'center'
gap: 12px
```

### 7.3 テキストスタイル

```typescript
// アイコン
fontSize: 24
color: iconColor

// ラベル
type: 'secondary'
fontSize: 14

// 数値
level: 3
margin: 0
fontSize: 28
fontWeight: 600
color: iconColor
```

---

## 8. データの計算

### 8.1 現在の実装

- props経由で親コンポーネントから計算済みの統計データを受け取る
- このコンポーネント内では計算を行わない（プレゼンテーションコンポーネント）

### 8.2 親コンポーネントでの計算例

```typescript
// InstructionConfirmationTabなどで計算
const stats = useMemo(() => {
  return {
    total: instructions.length,
    file: instructions.filter(i => i.instructionType === 'file').length,
    method: instructions.filter(i => i.instructionType === 'method').length,
    transition: instructions.filter(i => i.instructionType === 'transition').length,
    unread: instructions.filter(i => !i.isRead).length,
  };
}, [instructions]);
```

---

## 9. アクセシビリティ

### 9.1 セマンティックHTML

- `Typography.Title`で数値を見出しとしてマークアップ
- `Typography.Text`でラベルを明示

### 9.2 視覚的な情報

- アイコンと色で視覚的に区別
- 数値を大きく表示（28px）
- ラベルを明確に表示

---

## 10. パフォーマンス考慮事項

### 10.1 最適化

- propsで受け取るだけのシンプルな構造
- 再レンダリングは親コンポーネントのstats更新時のみ
- メモ化の必要性は低い（軽量コンポーネント）

---

## 11. 備考

### 11.1 特記事項

1. **プレゼンテーションコンポーネント**
   - データの計算は行わない
   - 表示のみを担当

2. **未使用のunread**
   - stats.unreadは現在使用されていない
   - 将来、未読バッジの表示などに使用予定

3. **固定の4カード**
   - カード数は固定（4個）
   - 動的な追加・削除は想定していない

4. **ヘッダなしデザイン**
   - Cardコンポーネントにtitleなし
   - シンプルで直感的な表示

### 11.2 将来の拡張

1. 未読バッジの表示（stats.unread使用）
2. クリックで該当の指示にフィルタリング
3. カードのアニメーション（カウントアップなど）
4. カスタマイズ可能なカード（表示/非表示切り替え）
5. 期間フィルタ機能（今日、今週、今月など）

### 11.3 関連ドキュメント

- [InstructionConfirmationTab UI設計書](./ui_instruction_confirmation_tab.md)
- [InstructionGroup UI設計書](./ui_instruction_group.md)

---

## 12. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |

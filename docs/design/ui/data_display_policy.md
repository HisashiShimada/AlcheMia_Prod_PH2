# データ表示形状ポリシー

## 標準3パターン

### パターン1: Descriptionsによるデータ表示
**用途**: フォーム的なラベル・値のペア表示

- レイアウト: 横並び（ラベル：値）
- ラベル幅: 自動（内容に応じて調整）
- ラベルスタイル: **太字**（`strong`）
- 値スタイル: 通常
- 区切り線: あり（`bordered={true}`）
- 背景色: `token.colorBgContainer` (#ffffff)
- 1行あたりの列数: デスクトップ 2列、モバイル 1列

```tsx
<Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }}>
  <Descriptions.Item label="プロジェクト名">
    サンプルプロジェクト
  </Descriptions.Item>
  <Descriptions.Item label="ステータス">
    <Tag color="blue">進行中</Tag>
  </Descriptions.Item>
</Descriptions>
```

---

### パターン2: Statisticによる統計・数値表示
**用途**: 数値、統計情報の強調表示

- タイトル: `token.colorTextSecondary` (#757575)、14px
- 値: `token.colorText` (#212121)、24px、太字
- プレフィックス/サフィックス: 値と同じサイズ
- 値の色: 条件付き変更可能（増加: 緑、減少: 赤）
- 増減表示: 矢印アイコン + パーセンテージ

```tsx
<Statistic 
  title="総プロジェクト数" 
  value={112} 
  suffix="件"
/>

<Statistic
  title="完了率"
  value={85.5}
  precision={1}
  suffix="%"
  valueStyle={{ color: '#2e7d32' }}
  prefix={<ArrowUpOutlined />}
/>
```

---

### パターン3: Card内のラベル・値表示
**用途**: カード内での簡潔な情報表示

- レイアウト: 縦並び（ラベル → 値）
- ラベルスタイル: `type="secondary"`、12px
- 値スタイル: 通常または太字、14px
- 間隔: 4px（`Space size="small"`）
- 背景色: カードの背景色に依存

```tsx
<Card>
  <Space direction="vertical" size="small">
    <Text type="secondary" style={{ fontSize: 12 }}>
      プロジェクト名
    </Text>
    <Text strong>サンプルプロジェクト</Text>
  </Space>
</Card>
```

---

## 共通仕様（全パターン）

### ラベルスタイル

**標準ラベル（Descriptions、Card）**
- フォントウェイト: `token.fontWeightStrong` (600) または `strong`
- フォントサイズ: `token.fontSize` (14px)
- 色: `token.colorText` (#212121)

**セカンダリラベル（Card内）**
- フォントウェイト: 通常 (400)
- フォントサイズ: `token.fontSizeSM` (12px)
- 色: `token.colorTextSecondary` (#757575)

**Statisticタイトル**
- フォントウェイト: 通常 (400)
- フォントサイズ: `token.fontSize` (14px)
- 色: `token.colorTextSecondary` (#757575)

### 値スタイル

**通常値**
- フォントウェイト: 通常 (400)
- フォントサイズ: `token.fontSize` (14px)
- 色: `token.colorText` (#212121)

**強調値**
- フォントウェイト: `token.fontWeightStrong` (600)
- フォントサイズ: `token.fontSize` (14px)
- 色: `token.colorText` (#212121)

**統計値（Statistic）**
- フォントウェイト: `token.fontWeightStrong` (600)
- フォントサイズ: 24px
- 色: `token.colorText` (#212121) または条件付き色

**大型統計値（Statistic）**
- フォントウェイト: `token.fontWeightStrong` (600)
- フォントサイズ: 32px
- 色: `token.colorText` (#212121) または条件付き色

### ステータス表示（Tag）

データ表示内でのTag使用については、[status_label_policy.md](./status_label_policy.md) を参照してください。

**基本ルール:**
- Descriptions内: ラベルの右側に配置
- Card内: 値として配置
- Statistic内: サフィックスとして配置（稀）

### 空値の表示

**空値・未設定の表示方法:**
```tsx
// パターン1: ハイフン
<Descriptions.Item label="メモ">
  -
</Descriptions.Item>

// パターン2: 「未設定」テキスト
<Descriptions.Item label="担当者">
  <Text type="secondary">未設定</Text>
</Descriptions.Item>

// パターン3: 空Tag
<Descriptions.Item label="ステータス">
  <Tag color="default">未選択</Tag>
</Descriptions.Item>
```

### 長文表示

**長いテキストの処理:**
```tsx
// パターン1: 折り返し（デフォルト）
<Descriptions.Item label="説明">
  {longDescription}
</Descriptions.Item>

// パターン2: 省略（ellipsis）
<Descriptions.Item label="ファイルパス">
  <Text ellipsis style={{ maxWidth: 300 }}>
    {longFilePath}
  </Text>
</Descriptions.Item>

// パターン3: Tooltip付き省略
<Descriptions.Item label="URL">
  <Tooltip title={longUrl}>
    <Text ellipsis style={{ maxWidth: 300 }}>
      {longUrl}
    </Text>
  </Tooltip>
</Descriptions.Item>
```

---

## パターン選択

- フォーム的な情報表示 → **パターン1（Descriptions）**
- 数値・統計の強調表示 → **パターン2（Statistic）**
- カード内の簡潔な情報 → **パターン3（Card内表示）**

---

## 詳細パターン

### Descriptions パターン

#### パターン1-A: 基本的な情報表示
**用途**: プロジェクト詳細、ファイル情報、ユーザー情報

```tsx
<Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }}>
  <Descriptions.Item label="プロジェクト名">
    {project.name}
  </Descriptions.Item>
  <Descriptions.Item label="作成日">
    {formatDate(project.createdAt)}
  </Descriptions.Item>
  <Descriptions.Item label="作成者">
    {project.creator}
  </Descriptions.Item>
  <Descriptions.Item label="ステータス">
    <Tag color={getStatusColor(project.status)}>
      {getStatusLabel(project.status)}
    </Tag>
  </Descriptions.Item>
</Descriptions>
```

**特徴:**
- ボーダーあり（`bordered={true}`）
- 2列レイアウト（モバイルは1列）
- ラベルは太字
- 値は通常またはTag

---

#### パターン1-B: 複数行の詳細表示
**用途**: 詳細な説明、メタデータ表示

```tsx
<Descriptions bordered column={1} layout="vertical">
  <Descriptions.Item label="プロジェクト概要">
    {project.description}
  </Descriptions.Item>
  <Descriptions.Item label="備考">
    {project.notes || '-'}
  </Descriptions.Item>
</Descriptions>
```

**特徴:**
- 縦レイアウト（`layout="vertical"`）
- 1列のみ
- 長文表示に適している

---

#### パターン1-C: コンパクト表示
**用途**: スペースが限られた場所での情報表示

```tsx
<Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
  <Descriptions.Item label="ID">{file.id}</Descriptions.Item>
  <Descriptions.Item label="形式">{file.format}</Descriptions.Item>
  <Descriptions.Item label="サイズ">{formatFileSize(file.size)}</Descriptions.Item>
</Descriptions>
```

**特徴:**
- サイズ小（`size="small"`）
- ボーダーなし（デフォルト）
- 3列レイアウト
- パディングが小さい

---

### Statistic パターン

#### パターン2-A: 基本統計表示
**用途**: ダッシュボード、統計カード

```tsx
<Row gutter={16}>
  <Col span={6}>
    <Card>
      <Statistic 
        title="総プロジェクト数" 
        value={totalProjects} 
        suffix="件"
      />
    </Card>
  </Col>
  <Col span={6}>
    <Card>
      <Statistic 
        title="進行中" 
        value={inProgressProjects} 
        valueStyle={{ color: token.colorInfo }}
      />
    </Card>
  </Col>
  <Col span={6}>
    <Card>
      <Statistic 
        title="完了" 
        value={completedProjects} 
        valueStyle={{ color: token.colorSuccess }}
      />
    </Card>
  </Col>
  <Col span={6}>
    <Card>
      <Statistic 
        title="エラー" 
        value={errorProjects} 
        valueStyle={{ color: token.colorError }}
      />
    </Card>
  </Col>
</Row>
```

**特徴:**
- Card内に配置
- 条件付き色分け
- サフィックス付き
- グリッドレイアウト

---

#### パターン2-B: 増減表示付き統計
**用途**: 前回比較、増減率表示

```tsx
<Statistic
  title="月間完了数"
  value={currentMonth}
  precision={0}
  valueStyle={{ color: trend > 0 ? token.colorSuccess : token.colorError }}
  prefix={trend > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
  suffix={`/ 先月比 ${Math.abs(trend)}%`}
/>
```

**特徴:**
- 増減アイコン（矢印）
- 条件付き色変更
- パーセンテージ表示
- プレフィックス・サフィックス

---

#### パターン2-C: 大型統計表示
**用途**: 重要な数値の強調

```tsx
<Card bordered={false} style={{ background: token.colorPrimaryBg }}>
  <Statistic
    title="システム全体の実験数"
    value={totalExperiments}
    valueStyle={{ fontSize: 32, color: token.colorPrimary }}
    suffix="件"
  />
</Card>
```

**特徴:**
- フォントサイズ大（32px）
- 背景色付きCard
- プライマリカラー強調

---

#### パターン2-D: カウントダウン・タイマー
**用途**: 締切までの時間表示

```tsx
import { Statistic } from 'antd';
const { Countdown } = Statistic;

<Countdown 
  title="締切まで" 
  value={deadline} 
  format="D 日 H 時間 m 分 s 秒"
  onFinish={onDeadlineFinish}
/>
```

**特徴:**
- リアルタイム更新
- カスタム形式
- 完了時コールバック

---

### Card内表示パターン

#### パターン3-A: 縦並びラベル・値
**用途**: カード内の簡潔な情報表示

```tsx
<Card>
  <Space direction="vertical" size="small" style={{ width: '100%' }}>
    <Space direction="vertical" size={4}>
      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
        プロジェクト名
      </Text>
      <Text strong>{project.name}</Text>
    </Space>
    
    <Space direction="vertical" size={4}>
      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
        ステータス
      </Text>
      <Tag color={getStatusColor(project.status)}>
        {getStatusLabel(project.status)}
      </Tag>
    </Space>
  </Space>
</Card>
```

**特徴:**
- ラベルは上、値は下
- ラベルはセカンダリ色、小さめ（12px）
- 値は通常またはTag
- 間隔4px

---

#### パターン3-B: メタ情報表示
**用途**: カードフッター、補足情報

```tsx
<Card
  title={project.name}
  extra={<Tag color="blue">進行中</Tag>}
>
  <p>{project.description}</p>
  
  <Space split={<Divider type="vertical" />} style={{ marginTop: 16 }}>
    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
      作成日: {formatDate(project.createdAt)}
    </Text>
    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
      作成者: {project.creator}
    </Text>
    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
      実験数: {project.experimentCount}
    </Text>
  </Space>
</Card>
```

**特徴:**
- カードタイトル + extra（右上）
- 本文
- メタ情報を横並び（分割線付き）
- セカンダリ色、小さめフォント

---

#### パターン3-C: アイコン付き情報表示
**用途**: 視認性の高い情報表示

```tsx
<Card>
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <Space>
      <FolderOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
      <div>
        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          プロジェクト名
        </Text>
        <br />
        <Text strong>{project.name}</Text>
      </div>
    </Space>
    
    <Space>
      <UserOutlined style={{ fontSize: 20, color: token.colorInfo }} />
      <div>
        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          作成者
        </Text>
        <br />
        <Text>{project.creator}</Text>
      </div>
    </Space>
  </Space>
</Card>
```

**特徴:**
- アイコン（20px）
- ラベル・値を縦並び
- アイコンとテキストを横並び

---

## 複合パターン

### パターンA: Descriptions + Card
**用途**: 詳細情報を含むカード

```tsx
<Card title="プロジェクト詳細">
  <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }}>
    <Descriptions.Item label="プロジェクト名">
      {project.name}
    </Descriptions.Item>
    <Descriptions.Item label="ステータス">
      <Tag color={getStatusColor(project.status)}>
        {getStatusLabel(project.status)}
      </Tag>
    </Descriptions.Item>
    <Descriptions.Item label="作成日">
      {formatDate(project.createdAt)}
    </Descriptions.Item>
    <Descriptions.Item label="作成者">
      {project.creator}
    </Descriptions.Item>
  </Descriptions>
</Card>
```

---

### パターンB: Statistic Grid
**用途**: 複数の統計情報を並べて表示

```tsx
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="総プロジェクト数"
        value={stats.total}
        suffix="件"
      />
    </Card>
  </Col>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="進行中"
        value={stats.inProgress}
        valueStyle={{ color: token.colorInfo }}
      />
    </Card>
  </Col>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="完了"
        value={stats.completed}
        valueStyle={{ color: token.colorSuccess }}
      />
    </Card>
  </Col>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="エラー"
        value={stats.error}
        valueStyle={{ color: token.colorError }}
      />
    </Card>
  </Col>
</Row>
```

---

### パターンC: Card Carousel（情報カードスライダー）
**用途**: 複数のカードをスライド表示

```tsx
<Carousel autoplay>
  {projects.map(project => (
    <Card key={project.id}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Text strong style={{ fontSize: 18 }}>{project.name}</Text>
        
        <Descriptions size="small" column={1}>
          <Descriptions.Item label="ステータス">
            <Tag color={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="作成日">
            {formatDate(project.createdAt)}
          </Descriptions.Item>
        </Descriptions>
        
        <Statistic
          title="実験数"
          value={project.experimentCount}
          suffix="件"
        />
      </Space>
    </Card>
  ))}
</Carousel>
```

---

## レスポンシブ対応

### モバイル（xs: 0-575px）

```tsx
// Descriptions: 1列表示
<Descriptions column={{ xs: 1 }}>
  ...
</Descriptions>

// Statistic Grid: 1列表示
<Row gutter={[16, 16]}>
  <Col xs={24}>
    <Card><Statistic ... /></Card>
  </Col>
  <Col xs={24}>
    <Card><Statistic ... /></Card>
  </Col>
</Row>

// フォントサイズ調整
<Text style={{ fontSize: isMobile ? token.fontSizeSM : token.fontSize }}>
  テキスト
</Text>
```

---

### タブレット（sm: 576-767px）

```tsx
// Descriptions: 1-2列表示
<Descriptions column={{ xs: 1, sm: 1, md: 2 }}>
  ...
</Descriptions>

// Statistic Grid: 2列表示
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12}>
    <Card><Statistic ... /></Card>
  </Col>
  <Col xs={24} sm={12}>
    <Card><Statistic ... /></Card>
  </Col>
</Row>
```

---

### デスクトップ（md: 768px以上）

```tsx
// Descriptions: 2-3列表示
<Descriptions column={{ xs: 1, sm: 1, md: 2, lg: 3 }}>
  ...
</Descriptions>

// Statistic Grid: 4列表示
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={6}>
    <Card><Statistic ... /></Card>
  </Col>
  {/* 他の列 */}
</Row>
```

---

## アクセシビリティ

### ARIA属性

```tsx
// Descriptions
<Descriptions aria-label="プロジェクト情報">
  <Descriptions.Item label="プロジェクト名">
    {project.name}
  </Descriptions.Item>
</Descriptions>

// Statistic
<Statistic
  title="総プロジェクト数"
  value={total}
  aria-label={`総プロジェクト数は${total}件です`}
/>

// 空値の明示
<Descriptions.Item label="メモ">
  <Text type="secondary" aria-label="メモは未設定です">-</Text>
</Descriptions.Item>
```

---

### セマンティックHTML

```tsx
// 見出しレベルの適切な使用
<Card>
  <Title level={4}>プロジェクト詳細</Title>
  <Descriptions>
    ...
  </Descriptions>
</Card>

// リスト構造の使用
<Space direction="vertical" component="ul" style={{ listStyle: 'none' }}>
  <li>
    <Text type="secondary">プロジェクト名</Text>
    <br />
    <Text strong>{project.name}</Text>
  </li>
</Space>
```

---

## ベストプラクティス

### DO（推奨）
✅ Descriptionsで構造化されたデータを表示する
✅ Statisticで数値を強調表示する
✅ Card内では縦並びレイアウトを使う
✅ 空値には適切なフォールバック表示を用意する
✅ レスポンシブ対応のカラム数を指定する
✅ ラベルと値の視覚的階層を明確にする
✅ 条件付きで色を変更する（ステータス、統計値）
✅ 長文にはellipsisとTooltipを使う
✅ ARIA属性で情報を補完する

---

### DON'T（非推奨）
❌ Descriptionsを入力フォームとして使わない
❌ Statisticに長いテキストを入れない
❌ モバイルで3列以上のDescriptionsを使わない
❌ 空値を空白のままにしない
❌ ラベルと値の区別が不明確な表示をしない
❌ 統計値に不適切な色を使う（緑をエラーに使うなど）
❌ Cardを過度に複雑にしない
❌ レスポンシブ対応を省略しない

---

## 多言語化対応

### 国際化（i18n）

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

const { t } = useLanguage();

<Descriptions>
  <Descriptions.Item label={t('label.projectName')}>
    {project.name}
  </Descriptions.Item>
  <Descriptions.Item label={t('label.status')}>
    <Tag color={getStatusColor(project.status)}>
      {t(`status.${project.status}`)}
    </Tag>
  </Descriptions.Item>
</Descriptions>

<Statistic
  title={t('statistics.totalProjects')}
  value={total}
  suffix={t('unit.items')}
/>
```

---

## 実装チェックリスト

### 必須項目
- [ ] 適切なパターンを選択している（Descriptions / Statistic / Card）
- [ ] ラベルと値の視覚的階層が明確
- [ ] 空値に適切なフォールバック表示がある
- [ ] レスポンシブ対応のカラム数を指定している
- [ ] ステータス表示にTagを使用している

---

### 推奨項目
- [ ] 条件付き色変更を実装している
- [ ] 長文にellipsisを使用している
- [ ] ARIA属性を付与している
- [ ] 多言語化対応している
- [ ] 統計値の単位を表示している

---

### オプション項目
- [ ] アイコンを使用して視認性を向上させている
- [ ] 増減表示を実装している（Statistic）
- [ ] Tooltipで詳細情報を提供している
- [ ] アニメーション効果を使用している

---

## 参考実装

### 完全なプロジェクト詳細表示

```tsx
import { Card, Descriptions, Statistic, Tag, Space, Typography, Row, Col } from 'antd';
import { ArrowUpOutlined, FolderOutlined, UserOutlined } from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';

const { Text, Title } = Typography;

interface ProjectDetailProps {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    creator: string;
    createdAt: string;
    updatedAt: string;
    experimentCount: number;
    completedCount: number;
    errorCount: number;
  };
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  const { token } = useTheme();

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 統計情報 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="総実験数"
              value={project.experimentCount}
              suffix="件"
              valueStyle={{ color: token.colorInfo }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="完了"
              value={project.completedCount}
              suffix="件"
              valueStyle={{ color: token.colorSuccess }}
              prefix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="エラー"
              value={project.errorCount}
              suffix="件"
              valueStyle={{ 
                color: project.errorCount > 0 ? token.colorError : token.colorText 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 基本情報 */}
      <Card title="基本情報">
        <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }}>
          <Descriptions.Item label="プロジェクトID">
            {project.id}
          </Descriptions.Item>
          <Descriptions.Item label="プロジェクト名">
            <Text strong>{project.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="ステータス">
            <Tag color={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="作成者">
            {project.creator}
          </Descriptions.Item>
          <Descriptions.Item label="作成日">
            {formatDate(project.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="更新日

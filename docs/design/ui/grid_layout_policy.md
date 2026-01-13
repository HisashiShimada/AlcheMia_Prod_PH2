# グリッドレイアウトポリシー

## 概要

MaiML Viewerでは、Ant Designの24カラムグリッドシステムを採用し、レスポンシブで統一されたレイアウトを実現します。このドキュメントでは、全画面で使用する標準的なグリッドレイアウトパターンを定義します。

---

## 標準4パターン

### パターン1: フォームレイアウト（2カラム）

**用途**: データ入力フォーム、編集画面

#### デスクトップ（lg以上）
```tsx
<Row gutter={[16, 16]}>
  <Col span={12}>
    <Form.Item label="項目名" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
      <Input />
    </Form.Item>
  </Col>
  <Col span={12}>
    <Form.Item label="項目名" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
      <Input />
    </Form.Item>
  </Col>
</Row>
```

**仕様:**
- Row gutter: 水平 `16px`、垂直 `16px`
- Col span: デスクトップ `12`（2カラム）
- Form.Item labelCol: `span={8}` (33.3%)
- Form.Item wrapperCol: `span={16}` (66.7%)
- レスポンシブ: タブレット以下は `span={24}`（1カラム）

**レスポンシブ設定:**
```tsx
<Col xs={24} sm={24} md={24} lg={12} xl={12} xxl={12}>
```

---

### パターン2: カードグリッド（3-4カラム）

**用途**: メニュー画面、ダッシュボード、カード一覧

#### デスクトップ（xl以上） - 4カラム
```tsx
<Row gutter={[24, 24]}>
  <Col xs={24} sm={12} md={12} lg={8} xl={6} xxl={6}>
    <Card>コンテンツ</Card>
  </Col>
  <Col xs={24} sm={12} md={12} lg={8} xl={6} xxl={6}>
    <Card>コンテンツ</Card>
  </Col>
  {/* 繰り返し */}
</Row>
```

#### デスクトップ（lg） - 3カラム
```tsx
<Row gutter={[24, 24]}>
  <Col xs={24} sm={12} md={12} lg={8} xl={8} xxl={8}>
    <Card>コンテンツ</Card>
  </Col>
  {/* 繰り返し */}
</Row>
```

**仕様:**
- Row gutter: 水平 `24px`、垂直 `24px`
- Col span: 
  - xxl, xl: `6` (4カラム) または `8` (3カラム)
  - lg: `8` (3カラム)
  - md: `12` (2カラム)
  - sm: `12` (2カラム)
  - xs: `24` (1カラム)
- カード最小幅: `250px`
- カード推奨高さ: `150px - 200px`

---

### パターン3: データ表示グリッド（情報表示）

**用途**: 詳細情報表示、プロフィール画面

#### デスクトップ（lg以上）
```tsx
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={12} lg={8} xl={8} xxl={8}>
    <div className="info-item">
      <div className="info-label">ラベル</div>
      <div className="info-value">値</div>
    </div>
  </Col>
  {/* 繰り返し */}
</Row>
```

**仕様:**
- Row gutter: 水平 `16px`、垂直 `16px`
- Col span:
  - xxl, xl, lg: `8` (3カラム)
  - md: `12` (2カラム)
  - sm: `12` (2カラム)
  - xs: `24` (1カラム)
- ラベルフォント: `token.colorTextSecondary`, `12px`
- 値フォント: `token.colorText`, `14px`

**スタイル例:**
```tsx
const infoItemStyle = {
  padding: '12px 16px',
  background: token.colorBgContainer,
  borderRadius: token.borderRadius,
  border: `1px solid ${token.colorBorderSecondary}`,
};

const infoLabelStyle = {
  fontSize: 12,
  color: token.colorTextSecondary,
  marginBottom: 4,
};

const infoValueStyle = {
  fontSize: 14,
  color: token.colorText,
  fontWeight: 500,
};
```

---

### パターン4: サイドバー付きレイアウト

**用途**: 詳細画面、設定画面

#### デスクトップ（lg以上）
```tsx
<Row gutter={24}>
  <Col xs={24} sm={24} md={8} lg={6} xl={6} xxl={6}>
    {/* サイドバー */}
    <Card>ナビゲーション</Card>
  </Col>
  <Col xs={24} sm={24} md={16} lg={18} xl={18} xxl={18}>
    {/* メインコンテンツ */}
    <Card>コンテンツエリア</Card>
  </Col>
</Row>
```

**仕様:**
- Row gutter: 水平 `24px`
- サイドバー Col span:
  - xxl, xl, lg: `6` (25%)
  - md: `8` (33.3%)
  - sm, xs: `24` (100% - モバイルでは上下配置)
- メインコンテンツ Col span:
  - xxl, xl, lg: `18` (75%)
  - md: `16` (66.7%)
  - sm, xs: `24` (100%)
- サイドバー最小幅: `200px`
- メインコンテンツ最小幅: `600px`

---

## 共通仕様（全パターン）

### Gutter（間隔）設定

**水平・垂直Gutter:**
```tsx
// 標準（フォーム、データ表示）
<Row gutter={[16, 16]}>

// 広め（カードグリッド、サイドバー付き）
<Row gutter={[24, 24]}>

// カスタム（必要に応じて）
<Row gutter={[32, 24]}>
```

**推奨値:**
- `[16, 16]`: フォーム、データ表示（密度高め）
- `[24, 24]`: カードグリッド、ダッシュボード（標準）
- `[32, 32]`: 広々としたレイアウト（特殊用途）

### ブレークポイント

```typescript
screen: {
  xs: 480,    // モバイル（縦）
  sm: 576,    // モバイル（横）・タブレット（縦小）
  md: 768,    // タブレット（縦）
  lg: 992,    // タブレット（横）・小型ラップトップ
  xl: 1200,   // デスクトップ
  xxl: 1600   // 大型ディスプレイ
}
```

### レスポンシブ原則

1. **モバイルファースト**: 小さい画面から設計
2. **段階的拡張**: ブレークポイントごとに適切なカラム数
3. **可読性優先**: モバイルでは必ず1カラム（`span={24}`）
4. **タッチターゲット**: ボタン・リンクは最小 `44px x 44px`

### カラム数の推奨

| 画面サイズ | ブレークポイント | フォーム | カード | データ表示 | サイドバー |
|-----------|----------------|---------|--------|-----------|-----------|
| モバイル縦 | xs (< 480px) | 1列 (24) | 1列 (24) | 1列 (24) | 1列 (24) |
| モバイル横 | sm (< 576px) | 1列 (24) | 2列 (12) | 2列 (12) | 1列 (24) |
| タブレット縦 | md (< 768px) | 1列 (24) | 2列 (12) | 2列 (12) | 上下 (8+16) |
| タブレット横 | lg (< 992px) | 2列 (12) | 3列 (8) | 3列 (8) | 左右 (6+18) |
| デスクトップ | xl (< 1200px) | 2列 (12) | 4列 (6) | 3列 (8) | 左右 (6+18) |
| 大型画面 | xxl (>= 1600px) | 2列 (12) | 4列 (6) | 3列 (8) | 左右 (6+18) |

---

## パターン選択ガイド

### フォーム入力
- **ユーザー登録・編集** → パターン1（フォームレイアウト）
- **検索フィルター** → パターン1（フォームレイアウト）
- **設定画面** → パターン4（サイドバー付き）+ パターン1

### 一覧表示
- **メニュー画面** → パターン2（カードグリッド、3-4カラム）
- **ダッシュボード** → パターン2（カードグリッド、3-4カラム）
- **テーブル一覧** → フル幅（`span={24}`）、グリッド不要

### 詳細表示
- **プロフィール画面** → パターン3（データ表示グリッド）
- **詳細情報** → パターン4（サイドバー付き）+ パターン3
- **レポート表示** → パターン4（サイドバー付き）+ フル幅コンテンツ

---

## 実装例

### 例1: ユーザー登録フォーム（パターン1）

```tsx
import { Row, Col, Form, Input, Button } from 'antd';

export default function UserRegistrationForm() {
  return (
    <Form layout="horizontal">
      <Row gutter={[16, 16]}>
        {/* 氏名 */}
        <Col xs={24} sm={24} md={24} lg={12} xl={12} xxl={12}>
          <Form.Item 
            label="氏名" 
            name="name"
            labelCol={{ span: 8 }} 
            wrapperCol={{ span: 16 }}
          >
            <Input placeholder="山田 太郎" />
          </Form.Item>
        </Col>

        {/* メールアドレス */}
        <Col xs={24} sm={24} md={24} lg={12} xl={12} xxl={12}>
          <Form.Item 
            label="メールアドレス" 
            name="email"
            labelCol={{ span: 8 }} 
            wrapperCol={{ span: 16 }}
          >
            <Input placeholder="example@example.com" />
          </Form.Item>
        </Col>

        {/* 所属部署 */}
        <Col xs={24} sm={24} md={24} lg={12} xl={12} xxl={12}>
          <Form.Item 
            label="所属部署" 
            name="department"
            labelCol={{ span: 8 }} 
            wrapperCol={{ span: 16 }}
          >
            <Input placeholder="開発部" />
          </Form.Item>
        </Col>

        {/* 電話番号 */}
        <Col xs={24} sm={24} md={24} lg={12} xl={12} xxl={12}>
          <Form.Item 
            label="電話番号" 
            name="phone"
            labelCol={{ span: 8 }} 
            wrapperCol={{ span: 16 }}
          >
            <Input placeholder="03-1234-5678" />
          </Form.Item>
        </Col>

        {/* ボタン（フル幅） */}
        <Col span={24}>
          <Form.Item wrapperCol={{ span: 24 }} style={{ textAlign: 'right' }}>
            <Button type="default" style={{ marginRight: 8 }}>
              キャンセル
            </Button>
            <Button type="primary" htmlType="submit">
              登録
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
```

---

### 例2: メニュー画面（パターン2）

```tsx
import { Row, Col, Card } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  FileOutlined,
  DatabaseOutlined 
} from '@ant-design/icons';

export default function MenuGrid() {
  const menuItems = [
    { title: 'ユーザー管理', icon: <UserOutlined />, path: '/users' },
    { title: 'システム設定', icon: <SettingOutlined />, path: '/settings' },
    { title: 'ファイル管理', icon: <FileOutlined />, path: '/files' },
    { title: 'データベース', icon: <DatabaseOutlined />, path: '/database' },
  ];

  return (
    <Row gutter={[24, 24]}>
      {menuItems.map((item, index) => (
        <Col 
          key={index}
          xs={24} 
          sm={12} 
          md={12} 
          lg={8} 
          xl={6} 
          xxl={6}
        >
          <Card
            hoverable
            style={{ 
              height: 160,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {item.icon}
            </div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>
              {item.title}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
```

---

### 例3: プロフィール表示（パターン3）

```tsx
import { Row, Col, theme } from 'antd';

export default function ProfileDisplay() {
  const { token } = theme.useToken();

  const profileData = [
    { label: 'ユーザーID', value: 'USR-001' },
    { label: '氏名', value: '山田 太郎' },
    { label: 'メールアドレス', value: 'yamada@example.com' },
    { label: '所属部署', value: '開発部' },
    { label: '役職', value: 'エンジニア' },
    { label: '入社日', value: '2020年4月1日' },
  ];

  const infoItemStyle = {
    padding: '12px 16px',
    background: token.colorBgContainer,
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorderSecondary}`,
  };

  const infoLabelStyle = {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginBottom: 4,
  };

  const infoValueStyle = {
    fontSize: 14,
    color: token.colorText,
    fontWeight: 500,
  };

  return (
    <Row gutter={[16, 16]}>
      {profileData.map((item, index) => (
        <Col 
          key={index}
          xs={24} 
          sm={12} 
          md={12} 
          lg={8} 
          xl={8} 
          xxl={8}
        >
          <div style={infoItemStyle}>
            <div style={infoLabelStyle}>{item.label}</div>
            <div style={infoValueStyle}>{item.value}</div>
          </div>
        </Col>
      ))}
    </Row>
  );
}
```

---

### 例4: サイドバー付き詳細画面（パターン4）

```tsx
import { Row, Col, Card, Menu } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  LockOutlined 
} from '@ant-design/icons';

export default function DetailPageWithSidebar() {
  return (
    <Row gutter={24}>
      {/* サイドバー */}
      <Col xs={24} sm={24} md={8} lg={6} xl={6} xxl={6}>
        <Card>
          <Menu
            mode="inline"
            defaultSelectedKeys={['1']}
            items={[
              {
                key: '1',
                icon: <UserOutlined />,
                label: '基本情報',
              },
              {
                key: '2',
                icon: <SettingOutlined />,
                label: '詳細設定',
              },
              {
                key: '3',
                icon: <LockOutlined />,
                label: 'セキュリティ',
              },
            ]}
          />
        </Card>
      </Col>

      {/* メインコンテンツ */}
      <Col xs={24} sm={24} md={16} lg={18} xl={18} xxl={18}>
        <Card title="基本情報">
          <p>メインコンテンツエリア</p>
          <p>詳細情報を表示</p>
        </Card>
      </Col>
    </Row>
  );
}
```

---

## ベストプラクティス

### DO（推奨）

✅ **レスポンシブ設定を必ず含める**
```tsx
<Col xs={24} sm={12} md={12} lg={8} xl={6} xxl={6}>
```

✅ **適切なgutterを使用する**
```tsx
<Row gutter={[16, 16]}> // フォーム
<Row gutter={[24, 24]}> // カード
```

✅ **モバイルでは1カラム**
```tsx
<Col xs={24} sm={12} md={8}>
```

✅ **カラム数の合計を24にする**
```tsx
// OK: 12 + 12 = 24
<Col span={12}><Col span={12}>

// OK: 8 + 8 + 8 = 24
<Col span={8}><Col span={8}><Col span={8}>
```

✅ **フォームのlabelCol/wrapperColを統一する**
```tsx
<Form.Item labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
```

---

### DON'T（非推奨）

❌ **レスポンシブ設定を省略しない**
```tsx
// NG: モバイルで表示が崩れる
<Col span={6}>
```

❌ **カラム数の合計が24を超えない**
```tsx
// NG: 12 + 12 + 12 = 36（次の行に折り返される）
<Col span={12}><Col span={12}><Col span={12}>
```

❌ **gutterなしで隙間を作らない**
```tsx
// NG: 要素が詰まりすぎる
<Row>
  <Col span={12}><Col span={12}>
</Row>
```

❌ **フォームのlabelCol/wrapperColをバラバラにしない**
```tsx
// NG: ラベル幅が統一されない
<Form.Item labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
<Form.Item labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
```

❌ **カードグリッドで固定spanを使わない**
```tsx
// NG: レスポンシブに対応しない
<Col span={6}>
  <Card>
```

---

## パフォーマンス最適化

### 大量の要素を表示する場合

1. **仮想スクロールを検討**
   - 100個以上のカードを表示する場合
   - react-windowなどのライブラリを使用

2. **遅延読み込み（Lazy Loading）**
   - 画面外のカードは後から読み込む
   - Intersection Observer APIを活用

3. **ページネーション**
   - 1ページあたり12-24アイテムを推奨
   - 無限スクロールも選択肢

---

## アクセシビリティ

### キーボード操作

- Tab: カード間の移動
- Enter: カード選択
- Arrow Keys: グリッド内の移動（実装必要）

### スクリーンリーダー

```tsx
<Card aria-label="ユーザー管理メニュー" role="button" tabIndex={0}>
```

---

## まとめ

MaiML Viewerのグリッドレイアウトは、以下の4パターンを基本とします：

1. **パターン1: フォームレイアウト** - 2カラム、ラベル+入力
2. **パターン2: カードグリッド** - 3-4カラム、メニュー・ダッシュボード
3. **パターン3: データ表示グリッド** - 3カラム、情報表示
4. **パターン4: サイドバー付き** - 6:18または8:16の分割

これらのパターンを適切に使い分けることで、統一感のあるレスポンシブなUIを実現できます。

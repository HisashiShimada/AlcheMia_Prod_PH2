'use client';

import React, { useState } from 'react';
import {
  ConfigProvider,
  Card,
  Space,
  Typography,
  Divider,
  Button,
  Input,
  DatePicker,
  Select,
  Switch,
  Table,
  Modal,
  Popconfirm,
  Upload,
  Tag,
  theme as antdTheme,
  Row,
  Col,
  Alert,
  Form,
  Checkbox,
  Radio,
  Pagination,
} from 'antd';
import type { ThemeConfig, TableColumnsType } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import enUS from 'antd/locale/en_US';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// 基本テーマ設定
const baseTheme: ThemeConfig = {
  token: {
    colorPrimary: '#CF0027',
    colorInfo: '#0093CF',
    colorSuccess: '#2e7d32',
    colorWarning: '#ed6c02',
    colorError: '#d32f2f',
    colorBgLayout: '#fafafa',
    colorText: '#212121',
    colorTextSecondary: '#757575',
    colorBorder: 'rgba(0, 0, 0, 0.12)',
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans JP', sans-serif`,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    wireframe: false,
    motion: true,
  },
  components: {
    Button: {
      controlHeight: 32,
      borderRadius: 8,
    },
    Input: {
      controlHeight: 32,
      borderRadius: 8,
    },
    Card: {
      borderRadiusLG: 12,
    },
  },
};

// 組織別テーマ
const organizationThemes: Record<string, ThemeConfig['token']> = {
  org_001: {
    colorPrimary: '#CF0027',
    colorInfo: '#0093CF',
  },
  org_002: {
    colorPrimary: '#1976d2',
    colorInfo: '#0288d1',
  },
  org_003: {
    colorPrimary: '#388e3c',
    colorInfo: '#00796b',
  },
};

// サンプルデータ
const dataSource = [
  { key: '1', name: '山田太郎', age: 32, address: '東京都渋谷区' },
  { key: '2', name: '佐藤花子', age: 28, address: '大阪府大阪市' },
  { key: '3', name: 'John Smith', age: 35, address: 'New York, USA' },
];

const columns: TableColumnsType<typeof dataSource[0]> = [
  { title: '名前', dataIndex: 'name', key: 'name' },
  { title: '年齢', dataIndex: 'age', key: 'age' },
  { title: '住所', dataIndex: 'address', key: 'address' },
];

// 統一されたコンテンツコンポーネント
const DemoContent: React.FC<{ locale: 'ja' | 'en' }> = ({ locale }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* カラーパレット */}
      <Card title={locale === 'ja' ? 'カラーパレット' : 'Color Palette'}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small">
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  backgroundColor: '#CF0027',
                  borderRadius: 8,
                }} />
                <Text>Primary</Text>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  backgroundColor: '#0093CF',
                  borderRadius: 8,
                }} />
                <Text>Info</Text>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  backgroundColor: '#2e7d32',
                  borderRadius: 8,
                }} />
                <Text>Success</Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ボタン */}
      <Card title={locale === 'ja' ? 'ボタン' : 'Buttons'}>
        <Space wrap>
          <Button type="primary">{locale === 'ja' ? 'プライマリ' : 'Primary'}</Button>
          <Button>{locale === 'ja' ? 'デフォルト' : 'Default'}</Button>
          <Button type="dashed">{locale === 'ja' ? '破線' : 'Dashed'}</Button>
          <Button type="link">{locale === 'ja' ? 'リンク' : 'Link'}</Button>
        </Space>
      </Card>

      {/* フォーム */}
      <Card title={locale === 'ja' ? 'フォーム要素' : 'Form Elements'}>
        <Form layout="vertical">
          <Form.Item label={locale === 'ja' ? '名前' : 'Name'}>
            <Input placeholder={locale === 'ja' ? '名前を入力' : 'Enter name'} />
          </Form.Item>
          <Form.Item label={locale === 'ja' ? '日付' : 'Date'}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={locale === 'ja' ? '選択' : 'Select'}>
            <Select
              placeholder={locale === 'ja' ? '選択してください' : 'Please select'}
              options={[
                { label: locale === 'ja' ? 'オプション1' : 'Option 1', value: '1' },
                { label: locale === 'ja' ? 'オプション2' : 'Option 2', value: '2' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Checkbox>{locale === 'ja' ? '利用規約に同意する' : 'Agree to terms'}</Checkbox>
          </Form.Item>
          <Form.Item>
            <Radio.Group>
              <Radio value="1">{locale === 'ja' ? 'オプションA' : 'Option A'}</Radio>
              <Radio value="2">{locale === 'ja' ? 'オプションB' : 'Option B'}</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Card>

      {/* テーブル */}
      <Card title={locale === 'ja' ? 'テーブル' : 'Table'}>
        <Table dataSource={dataSource} columns={columns} pagination={false} />
        <Divider />
        <Pagination defaultCurrent={1} total={50} />
      </Card>

      {/* アラート */}
      <Card title={locale === 'ja' ? 'アラート' : 'Alerts'}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert message={locale === 'ja' ? '成功メッセージ' : 'Success message'} type="success" showIcon />
          <Alert message={locale === 'ja' ? '情報メッセージ' : 'Info message'} type="info" showIcon />
          <Alert message={locale === 'ja' ? '警告メッセージ' : 'Warning message'} type="warning" showIcon />
          <Alert message={locale === 'ja' ? 'エラーメッセージ' : 'Error message'} type="error" showIcon />
        </Space>
      </Card>

      {/* タグ */}
      <Card title={locale === 'ja' ? 'タグ' : 'Tags'}>
        <Space wrap>
          <Tag color="red">{locale === 'ja' ? '重要' : 'Important'}</Tag>
          <Tag color="blue">{locale === 'ja' ? '情報' : 'Info'}</Tag>
          <Tag color="green">{locale === 'ja' ? '完了' : 'Done'}</Tag>
          <Tag color="orange">{locale === 'ja' ? '保留' : 'Pending'}</Tag>
        </Space>
      </Card>

      {/* モーダル・Popconfirm */}
      <Card title={locale === 'ja' ? 'モーダル・確認' : 'Modal & Popconfirm'}>
        <Space>
          <Button type="primary" onClick={() => setIsModalVisible(true)}>
            {locale === 'ja' ? 'モーダルを開く' : 'Open Modal'}
          </Button>
          <Popconfirm
            title={locale === 'ja' ? '本当に削除しますか？' : 'Are you sure to delete?'}
            okText={locale === 'ja' ? 'はい' : 'Yes'}
            cancelText={locale === 'ja' ? 'いいえ' : 'No'}
          >
            <Button danger>{locale === 'ja' ? '削除' : 'Delete'}</Button>
          </Popconfirm>
        </Space>
        <Modal
          title={locale === 'ja' ? 'サンプルモーダル' : 'Sample Modal'}
          open={isModalVisible}
          onOk={() => setIsModalVisible(false)}
          onCancel={() => setIsModalVisible(false)}
        >
          <p>{locale === 'ja' ? 'これはモーダルの内容です。' : 'This is modal content.'}</p>
        </Modal>
      </Card>
    </Space>
  );
};

const ConfigProviderPatternsDemo: React.FC = () => {
  // パターン1: 基本テーマ
  const [pattern1Locale] = useState<'ja' | 'en'>('ja');

  // パターン2: ダークモード
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [pattern2Locale] = useState<'ja' | 'en'>('ja');

  // パターン3: 多言語切り替え
  const [pattern3Locale, setPattern3Locale] = useState<'ja' | 'en'>('ja');

  // パターン4: 組織別テーマ
  const [selectedOrg, setSelectedOrg] = useState<'org_001' | 'org_002' | 'org_003'>('org_001');

  // パターン5: コンパクトモード
  const [isCompact, setIsCompact] = useState(false);

  // パターン6: アルゴリズム組み合わせ
  const [combinedDark, setCombinedDark] = useState(false);
  const [combinedCompact, setCombinedCompact] = useState(false);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>テーマ設定・国際化 パターンデモ</Title>
          <Paragraph>
            ConfigProviderを使用して、Ant Designのグローバル設定を管理します。
            テーマ、国際化、コンポーネント設定を一元管理できます。
          </Paragraph>
        </div>

        <Divider />

        {/* パターン1: 基本テーマ（デフォルト） */}
        <Card>
          <Title level={3}>パターン1: 基本テーマ（デフォルト）</Title>
          <Paragraph>
            <Text strong>用途:</Text> 通常の画面全般<br />
            <Text type="secondary">プライマリカラー: #CF0027（赤系）、インフォカラー: #0093CF（青系）、言語: 日本語</Text>
          </Paragraph>
          <ConfigProvider theme={baseTheme} locale={jaJP}>
            <div style={{ background: '#fafafa', padding: '24px', borderRadius: '8px' }}>
              <DemoContent locale={pattern1Locale} />
            </div>
          </ConfigProvider>
        </Card>

        <Divider />

        {/* パターン2: ダークモード */}
        <Card>
          <Title level={3}>パターン2: ダークモード</Title>
          <Paragraph>
            <Text strong>用途:</Text> 夜間作業やダークモード対応<br />
            <Text type="secondary">darkAlgorithmを使用して自動的にダークテーマを適用</Text>
          </Paragraph>
          <Space style={{ marginBottom: 16 }}>
            <Text>ダークモード:</Text>
            <Switch checked={isDarkMode} onChange={setIsDarkMode} />
          </Space>
          <ConfigProvider
            theme={{
              ...baseTheme,
              algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
            }}
            locale={jaJP}
          >
            <div style={{ padding: '24px', borderRadius: '8px' }}>
              <DemoContent locale={pattern2Locale} />
            </div>
          </ConfigProvider>
        </Card>

        <Divider />

        {/* パターン3: 多言語切り替え */}
        <Card>
          <Title level={3}>パターン3: 多言語切り替え</Title>
          <Paragraph>
            <Text strong>用途:</Text> 国際化対応が必要な画面<br />
            <Text type="secondary">Ant Designの組み込みコンポーネントの言語も自動変更</Text>
          </Paragraph>
          <Space style={{ marginBottom: 16 }}>
            <Text>言語選択:</Text>
            <Select
              value={pattern3Locale}
              onChange={setPattern3Locale}
              style={{ width: 150 }}
              options={[
                { label: '日本語', value: 'ja' },
                { label: 'English', value: 'en' },
              ]}
            />
          </Space>
          <ConfigProvider
            theme={baseTheme}
            locale={pattern3Locale === 'ja' ? jaJP : enUS}
          >
            <div style={{ background: '#fafafa', padding: '24px', borderRadius: '8px' }}>
              <DemoContent locale={pattern3Locale} />
            </div>
          </ConfigProvider>
        </Card>

        <Divider />

        {/* パターン4: 組織別テーマ */}
        <Card>
          <Title level={3}>パターン4: 組織別テーマ（高度な使用）</Title>
          <Paragraph>
            <Text strong>用途:</Text> マルチテナントで組織ごとにテーマを変更<br />
            <Text type="secondary">組織IDに応じて動的にカラーを切り替え</Text>
          </Paragraph>
          <Space style={{ marginBottom: 16 }}>
            <Text>組織選択:</Text>
            <Select
              value={selectedOrg}
              onChange={setSelectedOrg}
              style={{ width: 200 }}
              options={[
                { label: '組織A（赤系）', value: 'org_001' },
                { label: '組織B（青系）', value: 'org_002' },
                { label: '組織C（緑系）', value: 'org_003' },
              ]}
            />
          </Space>
          <ConfigProvider
            theme={{
              ...baseTheme,
              token: {
                ...baseTheme.token,
                ...organizationThemes[selectedOrg],
              },
            }}
            locale={jaJP}
          >
            <div style={{ background: '#fafafa', padding: '24px', borderRadius: '8px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  message={`現在の組織: ${selectedOrg}`}
                  description="プライマリカラーとインフォカラーが組織ごとに異なります"
                  type="info"
                  showIcon
                />
                <Space wrap>
                  <Button type="primary">プライマリボタン</Button>
                  <Button>デフォルトボタン</Button>
                  <Tag color="blue">情報タグ</Tag>
                </Space>
              </Space>
            </div>
          </ConfigProvider>
        </Card>

        <Divider />

        {/* パターン5: コンパクトモード */}
        <Card>
          <Title level={3}>パターン5: コンパクトモード（高度な使用）</Title>
          <Paragraph>
            <Text strong>用途:</Text> 情報密度の高い画面<br />
            <Text type="secondary">compactAlgorithmを使用してコンポーネントを小さく表示</Text>
          </Paragraph>
          <Space style={{ marginBottom: 16 }}>
            <Text>コンパクトモード:</Text>
            <Switch checked={isCompact} onChange={setIsCompact} />
          </Space>
          <ConfigProvider
            theme={{
              ...baseTheme,
              algorithm: isCompact ? antdTheme.compactAlgorithm : antdTheme.defaultAlgorithm,
              token: {
                ...baseTheme.token,
                fontSize: isCompact ? 12 : 14,
              },
            }}
            locale={jaJP}
          >
            <div style={{ background: '#fafafa', padding: '24px', borderRadius: '8px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert message="コンパクトモードではコンポーネントが小さく表示されます" type="info" />
                <Space wrap>
                  <Button type="primary">ボタン</Button>
                  <Input placeholder="入力フィールド" style={{ width: 200 }} />
                  <Select
                    placeholder="選択"
                    style={{ width: 150 }}
                    options={[
                      { label: 'オプション1', value: '1' },
                      { label: 'オプション2', value: '2' },
                    ]}
                  />
                </Space>
                <Table
                  dataSource={dataSource.slice(0, 2)}
                  columns={columns}
                  pagination={false}
                  size="small"
                />
              </Space>
            </div>
          </ConfigProvider>
        </Card>

        <Divider />

        {/* パターン6: アルゴリズム組み合わせ */}
        <Card>
          <Title level={3}>パターン6: アルゴリズム組み合わせ（高度な使用）</Title>
          <Paragraph>
            <Text strong>用途:</Text> ダークモード + コンパクトモード<br />
            <Text type="secondary">複数のアルゴリズムを配列で指定して組み合わせ</Text>
          </Paragraph>
          <Space style={{ marginBottom: 16 }} wrap>
            <Space>
              <Text>ダークモード:</Text>
              <Switch checked={combinedDark} onChange={setCombinedDark} />
            </Space>
            <Space>
              <Text>コンパクトモード:</Text>
              <Switch checked={combinedCompact} onChange={setCombinedCompact} />
            </Space>
          </Space>
          <ConfigProvider
            theme={{
              ...baseTheme,
              algorithm: [
                ...(combinedDark ? [antdTheme.darkAlgorithm] : [antdTheme.defaultAlgorithm]),
                ...(combinedCompact ? [antdTheme.compactAlgorithm] : []),
              ],
            }}
            locale={jaJP}
          >
            <div style={{ padding: '24px', borderRadius: '8px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  message={`適用中: ${combinedDark ? 'ダークモード ' : ''}${combinedCompact ? 'コンパクトモード' : 'デフォルト'}`}
                  type="success"
                />
                <Space wrap>
                  <Button type="primary">プライマリ</Button>
                  <Button>デフォルト</Button>
                  <Input placeholder="入力" style={{ width: 200 }} />
                </Space>
                <Table
                  dataSource={dataSource.slice(0, 2)}
                  columns={columns}
                  pagination={false}
                  size={combinedCompact ? 'small' : 'middle'}
                />
              </Space>
            </div>
          </ConfigProvider>
        </Card>

        <Divider />

        {/* useToken デモ */}
        <Card>
          <Title level={3}>トークン参照方法（useToken フック）</Title>
          <Paragraph>
            <Text type="secondary">
              useToken フックを使用してテーマトークンにアクセスできます
            </Text>
          </Paragraph>
          <ConfigProvider theme={baseTheme} locale={jaJP}>
            <TokenDemo />
          </ConfigProvider>
        </Card>
      </Space>
    </div>
  );
};

// useToken デモコンポーネント
const TokenDemo: React.FC = () => {
  const { token } = antdTheme.useToken();

  return (
    <Card size="small">
      <Space direction="vertical">
        <Text>colorPrimary: <Tag color={token.colorPrimary}>{token.colorPrimary}</Tag></Text>
        <Text>fontSize: <Tag>{token.fontSize}px</Tag></Text>
        <Text>borderRadius: <Tag>{token.borderRadius}px</Tag></Text>
        <Text>margin: <Tag>{token.margin}px</Tag></Text>
        <Divider />
        <div style={{
          padding: token.margin,
          backgroundColor: token.colorPrimaryBg,
          borderRadius: token.borderRadius,
          border: `1px solid ${token.colorPrimary}`,
        }}>
          <Text style={{ color: token.colorPrimary, fontSize: token.fontSize }}>
            トークンを使用したスタイリング例
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default ConfigProviderPatternsDemo;

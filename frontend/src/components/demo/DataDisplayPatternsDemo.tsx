'use client';

import React, { useState } from 'react';
import {
  Card,
  Descriptions,
  Statistic,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Tooltip,
  Button,
  theme,
  Carousel,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  FolderOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Countdown } = Statistic;
const { useToken } = theme;

// ステータスヘルパー関数
const getStatusColor = (status: string) => {
  switch (status) {
    case 'not_started':
      return 'default';
    case 'started':
      return 'blue';
    case 'in_progress':
      return 'processing';
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'in_progress':
      return <ClockCircleOutlined />;
    case 'completed':
      return <CheckCircleOutlined />;
    case 'error':
      return <CloseCircleOutlined />;
    default:
      return undefined;
  }
};

// 日付フォーマット関数
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// ファイルサイズフォーマット関数
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// サンプルデータ
const sampleProject = {
  id: 'PRJ-2024-001',
  name: 'サンプルプロジェクト A',
  description: 'これはサンプルプロジェクトの説明文です。プロジェクトの目的や概要を記述します。',
  status: 'in_progress',
  creator: '山田太郎',
  createdAt: '2024-01-15',
  updatedAt: '2024-12-25',
  experimentCount: 24,
  completedCount: 18,
  errorCount: 2,
  tags: ['材料科学', '実験管理'],
  notes: '特記事項がある場合はここに記載されます。',
  category: '基礎研究',
  priority: 'high',
};

const sampleFile = {
  id: 'FILE-001',
  name: 'experiment_data_20241225.maiml',
  format: 'MAIML',
  size: 2048576,
  version: 'v1.2.0',
  uploadDate: '2024-12-25',
  path: '/projects/sample-project-a/experiments/2024/12/experiment_data_20241225.maiml',
};

const sampleProjects = [
  { id: 1, name: 'プロジェクト A', status: 'in_progress', experimentCount: 24, createdAt: '2024-01-15', creator: '山田太郎' },
  { id: 2, name: 'プロジェクト B', status: 'completed', experimentCount: 45, createdAt: '2024-02-20', creator: '佐藤花子' },
  { id: 3, name: 'プロジェクト C', status: 'error', experimentCount: 12, createdAt: '2024-03-10', creator: '鈴木一郎' },
];

const DataDisplayPatternsDemo: React.FC = () => {
  const { token } = useToken();
  const [deadline] = useState(() => Date.now() + 1000 * 60 * 60 * 24 * 7); // 7日後

  return (
    <div style={{ padding: '24px', background: token.colorBgLayout }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Title level={2}>データ表示パターン デモ</Title>
          <Text type="secondary">
            全画面のデータ表示に関するステータス、ラベル表示のパターンを確認できます
          </Text>
        </Card>

        {/* パターン1: Descriptionsパターン */}
        <Divider>
          <Title level={3}>パターン1: Descriptions による データ表示</Title>
        </Divider>

        {/* パターン1-A: 基本的な情報表示 */}
        <Card title="パターン1-A: 基本的な情報表示" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: プロジェクト詳細、ファイル情報、ユーザー情報
          </Text>
          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }}>
            <Descriptions.Item label="プロジェクトID">
              {sampleProject.id}
            </Descriptions.Item>
            <Descriptions.Item label="プロジェクト名">
              <Text strong>{sampleProject.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="ステータス">
              <Tag 
                icon={getStatusIcon(sampleProject.status)}
                color={getStatusColor(sampleProject.status)}
              >
                {getStatusLabel(sampleProject.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="作成者">
              {sampleProject.creator}
            </Descriptions.Item>
            <Descriptions.Item label="作成日">
              {formatDate(sampleProject.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="更新日">
              {formatDate(sampleProject.updatedAt)}
            </Descriptions.Item>
            <Descriptions.Item label="カテゴリ">
              <Tag color="purple">{sampleProject.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="優先度">
              <Tag color={sampleProject.priority === 'high' ? 'red' : 'default'}>
                {sampleProject.priority === 'high' ? '高' : '通常'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* パターン1-B: 複数行の詳細表示 */}
        <Card title="パターン1-B: 複数行の詳細表示" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: 詳細な説明、メタデータ表示
          </Text>
          <Descriptions bordered column={1} layout="vertical">
            <Descriptions.Item label="プロジェクト概要">
              {sampleProject.description}
            </Descriptions.Item>
            <Descriptions.Item label="備考">
              {sampleProject.notes}
            </Descriptions.Item>
            <Descriptions.Item label="タグ">
              <Space size="small">
                {sampleProject.tags.map((tag, index) => (
                  <Tag key={index} color="blue" style={{ fontSize: 11 }}>
                    {tag}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* パターン1-C: コンパクト表示 */}
        <Card title="パターン1-C: コンパクト表示" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: スペースが限られた場所での情報表示
          </Text>
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="ID">{sampleFile.id}</Descriptions.Item>
            <Descriptions.Item label="ファイル名">{sampleFile.name}</Descriptions.Item>
            <Descriptions.Item label="形式">
              <Tag color="green">{sampleFile.format}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="サイズ">
              {formatFileSize(sampleFile.size)}
            </Descriptions.Item>
            <Descriptions.Item label="バージョン">
              <Tag color="blue">{sampleFile.version}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="アップロード日">
              {formatDate(sampleFile.uploadDate)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 空値・長文表示 */}
        <Card title="空値・長文の表示パターン" bordered>
          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }}>
            <Descriptions.Item label="空値（ハイフン）">
              -
            </Descriptions.Item>
            <Descriptions.Item label="未設定">
              <Text type="secondary">未設定</Text>
            </Descriptions.Item>
            <Descriptions.Item label="未選択ステータス">
              <Tag color="default">未選択</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="通常表示">
              {sampleProject.description}
            </Descriptions.Item>
            <Descriptions.Item label="省略表示（ellipsis）">
              <Text ellipsis style={{ maxWidth: 200 }}>
                {sampleFile.path}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tooltip付き省略">
              <Tooltip title={sampleFile.path}>
                <Text ellipsis style={{ maxWidth: 200 }}>
                  {sampleFile.path}
                </Text>
              </Tooltip>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* パターン2: Statisticパターン */}
        <Divider>
          <Title level={3}>パターン2: Statistic による統計・数値表示</Title>
        </Divider>

        {/* パターン2-A: 基本統計表示 */}
        <Card title="パターン2-A: 基本統計表示" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: ダッシュボード、統計カード
          </Text>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="総実験数"
                  value={sampleProject.experimentCount}
                  suffix="件"
                  valueStyle={{ color: token.colorInfo }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="進行中"
                  value={sampleProject.experimentCount - sampleProject.completedCount - sampleProject.errorCount}
                  suffix="件"
                  valueStyle={{ color: token.colorInfo }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="完了"
                  value={sampleProject.completedCount}
                  suffix="件"
                  valueStyle={{ color: token.colorSuccess }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="エラー"
                  value={sampleProject.errorCount}
                  suffix="件"
                  valueStyle={{
                    color: sampleProject.errorCount > 0 ? token.colorError : token.colorText,
                  }}
                />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* パターン2-B: 増減表示付き統計 */}
        <Card title="パターン2-B: 増減表示付き統計" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: 前回比較、増減率表示
          </Text>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="月間完了数（増加）"
                  value={18}
                  precision={0}
                  valueStyle={{ color: token.colorSuccess }}
                  prefix={<ArrowUpOutlined />}
                  suffix="/ 先月比 +20%"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="平均処理時間（減少）"
                  value={32.5}
                  precision={1}
                  valueStyle={{ color: token.colorError }}
                  prefix={<ArrowDownOutlined />}
                  suffix="分 / 先月比 -15%"
                />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* パターン2-C: 大型統計表示 */}
        <Card title="パターン2-C: 大型統計表示" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: 重要な数値の強調
          </Text>
          <Card bordered={false} style={{ background: token.colorPrimaryBg }}>
            <Statistic
              title="システム全体の実験数"
              value={1248}
              valueStyle={{ fontSize: 32, color: token.colorPrimary }}
              suffix="件"
            />
          </Card>
        </Card>

        {/* パターン2-D: カウントダウン */}
        <Card title="パターン2-D: カウントダウン・タイマー" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: 締切までの時間表示
          </Text>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card>
                <Countdown
                  title="プロジェクト締切まで"
                  value={deadline}
                  format="D 日 H 時間 m 分 s 秒"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="完了率"
                  value={75}
                  precision={0}
                  suffix="%"
                  valueStyle={{ color: token.colorSuccess }}
                />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* パターン3: Card内表示パターン */}
        <Divider>
          <Title level={3}>パターン3: Card内のラベル・値表示</Title>
        </Divider>

        {/* パターン3-A: 縦並びラベル・値 */}
        <Card title="パターン3-A: 縦並びラベル・値" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: カード内の簡潔な情報表示
          </Text>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Space direction="vertical" size={4}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      プロジェクト名
                    </Text>
                    <Text strong>{sampleProject.name}</Text>
                  </Space>

                  <Space direction="vertical" size={4}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      ステータス
                    </Text>
                    <Tag
                      icon={getStatusIcon(sampleProject.status)}
                      color={getStatusColor(sampleProject.status)}
                    >
                      {getStatusLabel(sampleProject.status)}
                    </Tag>
                  </Space>

                  <Space direction="vertical" size={4}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      実験数
                    </Text>
                    <Text>{sampleProject.experimentCount}件</Text>
                  </Space>
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Space direction="vertical" size={4}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      作成者
                    </Text>
                    <Text strong>{sampleProject.creator}</Text>
                  </Space>

                  <Space direction="vertical" size={4}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      作成日
                    </Text>
                    <Text>{formatDate(sampleProject.createdAt)}</Text>
                  </Space>

                  <Space direction="vertical" size={4}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      更新日
                    </Text>
                    <Text>{formatDate(sampleProject.updatedAt)}</Text>
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* パターン3-B: メタ情報表示 */}
        <Card title="パターン3-B: メタ情報表示" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: カードフッター、補足情報
          </Text>
          <Card
            title={sampleProject.name}
            extra={
              <Tag
                icon={getStatusIcon(sampleProject.status)}
                color={getStatusColor(sampleProject.status)}
              >
                {getStatusLabel(sampleProject.status)}
              </Tag>
            }
          >
            <p>{sampleProject.description}</p>

            <Space split={<Divider type="vertical" />} style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                <CalendarOutlined /> 作成日: {formatDate(sampleProject.createdAt)}
              </Text>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                <UserOutlined /> 作成者: {sampleProject.creator}
              </Text>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                <FileOutlined /> 実験数: {sampleProject.experimentCount}
              </Text>
            </Space>
          </Card>
        </Card>

        {/* パターン3-C: アイコン付き情報表示 */}
        <Card title="パターン3-C: アイコン付き情報表示" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: 視認性の高い情報表示
          </Text>
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space>
                <FolderOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    プロジェクト名
                  </Text>
                  <br />
                  <Text strong>{sampleProject.name}</Text>
                </div>
              </Space>

              <Space>
                <UserOutlined style={{ fontSize: 20, color: token.colorInfo }} />
                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    作成者
                  </Text>
                  <br />
                  <Text>{sampleProject.creator}</Text>
                </div>
              </Space>

              <Space>
                <CalendarOutlined style={{ fontSize: 20, color: token.colorSuccess }} />
                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    作成日
                  </Text>
                  <br />
                  <Text>{formatDate(sampleProject.createdAt)}</Text>
                </div>
              </Space>
            </Space>
          </Card>
        </Card>

        {/* 複合パターン */}
        <Divider>
          <Title level={3}>複合パターン</Title>
        </Divider>

        {/* パターンA: Descriptions + Card */}
        <Card title="パターンA: Descriptions + Card" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: 詳細情報を含むカード
          </Text>
          <Card title="プロジェクト詳細">
            <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }}>
              <Descriptions.Item label="プロジェクト名">
                <Text strong>{sampleProject.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ステータス">
                <Tag
                  icon={getStatusIcon(sampleProject.status)}
                  color={getStatusColor(sampleProject.status)}
                >
                  {getStatusLabel(sampleProject.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="作成日">
                {formatDate(sampleProject.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="作成者">
                {sampleProject.creator}
              </Descriptions.Item>
              <Descriptions.Item label="実験数">
                {sampleProject.experimentCount}件
              </Descriptions.Item>
              <Descriptions.Item label="完了数">
                {sampleProject.completedCount}件
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Card>

        {/* パターンB: Statistic Grid（完全版） */}
        <Card title="パターンB: Statistic Grid（完全版）" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: 複数の統計情報を並べて表示
          </Text>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="総プロジェクト数"
                  value={120}
                  suffix="件"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="進行中"
                  value={45}
                  suffix="件"
                  valueStyle={{ color: token.colorInfo }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="完了"
                  value={68}
                  suffix="件"
                  valueStyle={{ color: token.colorSuccess }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="エラー"
                  value={7}
                  suffix="件"
                  valueStyle={{ color: token.colorError }}
                />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* パターンC: Card Carousel */}
        <Card title="パターンC: Card Carousel（情報カードスライダー）" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            用途: 複数のカードをスライド表示
          </Text>
          <Carousel autoplay>
            {sampleProjects.map((project) => (
              <div key={project.id}>
                <Card style={{ margin: '0 8px' }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 18 }}>
                      {project.name}
                    </Text>

                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="ステータス">
                        <Tag
                          icon={getStatusIcon(project.status)}
                          color={getStatusColor(project.status)}
                        >
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

                    <Statistic
                      title="実験数"
                      value={project.experimentCount}
                      suffix="件"
                      valueStyle={{ color: token.colorInfo }}
                    />
                  </Space>
                </Card>
              </div>
            ))}
          </Carousel>
        </Card>

        {/* レスポンシブデモ */}
        <Card title="レスポンシブ対応デモ" bordered>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            画面サイズに応じてカラム数が自動調整されます
          </Text>
          <Descriptions
            bordered
            column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
            title="マルチカラムレイアウト"
          >
            <Descriptions.Item label="項目1">値1</Descriptions.Item>
            <Descriptions.Item label="項目2">値2</Descriptions.Item>
            <Descriptions.Item label="項目3">値3</Descriptions.Item>
            <Descriptions.Item label="項目4">値4</Descriptions.Item>
            <Descriptions.Item label="項目5">値5</Descriptions.Item>
            <Descriptions.Item label="項目6">値6</Descriptions.Item>
          </Descriptions>

          <Divider />

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="モバイル: 1列" value={24} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="タブレット: 2列" value={12} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="デスクトップ: 4列" value={6} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="大画面: 4列" value={6} />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* 参考情報 */}
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Title level={4}>実装のポイント</Title>
            <ul>
              <li>Descriptionsは構造化されたデータの表示に使用</li>
              <li>Statisticは数値の強調表示に使用</li>
              <li>Card内表示は簡潔な情報提示に使用</li>
              <li>空値には適切なフォールバック表示を用意</li>
              <li>レスポンシブ対応でカラム数を調整</li>
              <li>条件付きで色を変更してステータスを視覚化</li>
              <li>長文にはellipsisとTooltipを使用</li>
            </ul>

            <Divider />

            <Title level={4}>関連ドキュメント</Title>
            <ul>
              <li>
                <a href="/docs/design/ui/data_display_policy.md" target="_blank" rel="noopener noreferrer">
                  データ表示形状ポリシー
                </a>
              </li>
              <li>
                <a href="/docs/design/ui/status_label_policy.md" target="_blank" rel="noopener noreferrer">
                  ステータス・ラベル形状ポリシー
                </a>
              </li>
            </ul>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default DataDisplayPatternsDemo;

'use client';

import React, { useState } from 'react';
import { 
  Card, 
  Space, 
  Divider, 
  Typography,
  Button,
  Input,
  Select,
  Form,
  Row,
  Col,
  Avatar,
  Statistic,
  Skeleton,
  List,
  message,
  theme,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  ProjectOutlined,
  FileTextOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export default function CardPatternsDemo() {
  const { token } = theme.useToken();
  const [isLoading, setIsLoading] = useState(false);

  // デモ用のハンドラー
  const handleClick = (label: string) => {
    message.info(`${label} がクリックされました`);
  };

  const handleLoadingToggle = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      message.success('データの読み込みが完了しました');
    }, 2000);
  };

  // リスト項目のサンプルデータ
  const listData = [
    { id: 1, name: '山田太郎', description: 'プロジェクトマネージャー' },
    { id: 2, name: '佐藤花子', description: 'データサイエンティスト' },
    { id: 3, name: '鈴木一郎', description: 'システムエンジニア' },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      <Title level={2}>カード形状ポリシー - デモ画面</Title>
      <Paragraph>
        card_policy.mdで定義された標準5パターンと関連する実装例を網羅的に表示します。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* パターン1: 標準カード */}
        <Card title="パターン1: 標準カード（Default）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>基本形</Title>
              <Paragraph type="secondary">
                用途: 一般的なコンテンツコンテナ、情報表示エリア、フォームエリア
              </Paragraph>
              
              <Card>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>プロジェクト名：</Text>
                    <Text>材料実験プロジェクトA</Text>
                  </div>
                  <div>
                    <Text strong>責任者：</Text>
                    <Text>山田太郎</Text>
                  </div>
                  <div>
                    <Text strong>開始日：</Text>
                    <Text>2024-01-01</Text>
                  </div>
                  <div>
                    <Text strong>ステータス：</Text>
                    <Text>進行中</Text>
                  </div>
                </Space>
              </Card>
            </div>

            <Divider />

            <div>
              <Title level={4}>タイトル付き</Title>
              <Card title="プロジェクト情報">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>プロジェクト名：</Text>
                    <Text>材料実験プロジェクトA</Text>
                  </div>
                  <div>
                    <Text strong>責任者：</Text>
                    <Text>山田太郎</Text>
                  </div>
                </Space>
              </Card>
            </div>

            <Divider />

            <div>
              <Title level={4}>extraプロパティ（ヘッダー右側コンテンツ）</Title>
              <Card
                title="プロジェクト情報"
                extra={<Button type="link">詳細</Button>}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>プロジェクト名：</Text>
                    <Text>材料実験プロジェクトA</Text>
                  </div>
                  <div>
                    <Text strong>責任者：</Text>
                    <Text>山田太郎</Text>
                  </div>
                </Space>
              </Card>
            </div>

            <Divider />

            <div>
              <Title level={4}>actionsプロパティ（カードアクション）</Title>
              <Card
                actions={[
                  <EditOutlined key="edit" onClick={() => handleClick('編集')} />,
                  <DeleteOutlined key="delete" onClick={() => handleClick('削除')} />,
                  <EllipsisOutlined key="ellipsis" onClick={() => handleClick('その他')} />,
                ]}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>プロジェクト名：</Text>
                    <Text>材料実験プロジェクトA</Text>
                  </div>
                  <div>
                    <Text strong>責任者：</Text>
                    <Text>山田太郎</Text>
                  </div>
                </Space>
              </Card>
            </div>

            <Divider />

            <div>
              <Title level={4}>bordered=false（ボーダーレス）</Title>
              <Card bordered={false} style={{ backgroundColor: token.colorBgLayout }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>プロジェクト名：</Text>
                    <Text>材料実験プロジェクトA</Text>
                  </div>
                  <div>
                    <Text strong>責任者：</Text>
                    <Text>山田太郎</Text>
                  </div>
                </Space>
              </Card>
            </div>
          </Space>
        </Card>

        {/* パターン2: 小型カード */}
        <Card title="パターン2: 小型カード（Small）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>基本形</Title>
              <Paragraph type="secondary">
                用途: 検索フィルターエリア、コンパクトな情報カード、サイドバーウィジェット
              </Paragraph>
              
              <Card 
                size="small" 
                title="検索条件"
                style={{ marginBottom: 16 }}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Input placeholder="プロジェクト名" />
                  <Select placeholder="ステータス" style={{ width: '100%' }}>
                    <Select.Option value="active">進行中</Select.Option>
                    <Select.Option value="completed">完了</Select.Option>
                  </Select>
                  <Button type="primary" block>検索</Button>
                </Space>
              </Card>
            </div>

            <Divider />

            <div>
              <Title level={4}>リスト項目として使用</Title>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {listData.map((item) => (
                  <Card key={item.id} size="small">
                    <Space>
                      <Avatar icon={<UserOutlined />} />
                      <div>
                        <Text strong>{item.name}</Text>
                        <br />
                        <Text type="secondary">{item.description}</Text>
                      </div>
                    </Space>
                  </Card>
                ))}
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>警告背景色</Title>
              <Card size="small" style={{ backgroundColor: token.colorWarningBg }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>注意事項</Text>
                  <Text>この操作を実行する前に確認してください。</Text>
                </Space>
              </Card>
            </div>
          </Space>
        </Card>

        {/* パターン3: ホバーカード */}
        <Card title="パターン3: ホバーカード（Hoverable）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>基本形</Title>
              <Paragraph type="secondary">
                用途: クリック可能なメニューカード、プロジェクト選択カード、アクションカード
              </Paragraph>
              
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card
                    hoverable
                    onClick={() => handleClick('プロジェクト管理')}
                    style={{
                      borderRadius: token.borderRadiusLG,
                      cursor: 'pointer',
                      transition: `all ${token.motionDurationMid} ease-out`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = token.boxShadowSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = token.boxShadow;
                    }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: token.borderRadius,
                        backgroundColor: token.colorPrimary,
                        color: 'white',
                      }}>
                        <ProjectOutlined style={{ fontSize: 30 }} />
                      </div>
                      <Title level={4} style={{ margin: 0 }}>プロジェクト管理</Title>
                      <Text type="secondary">プロジェクトの作成と管理</Text>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card
                    hoverable
                    onClick={() => handleClick('ユーザー管理')}
                    style={{
                      borderRadius: token.borderRadiusLG,
                      cursor: 'pointer',
                      transition: `all ${token.motionDurationMid} ease-out`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = token.boxShadowSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = token.boxShadow;
                    }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: token.borderRadius,
                        backgroundColor: token.colorInfo,
                        color: 'white',
                      }}>
                        <TeamOutlined style={{ fontSize: 30 }} />
                      </div>
                      <Title level={4} style={{ margin: 0 }}>ユーザー管理</Title>
                      <Text type="secondary">ユーザーの登録と権限管理</Text>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card
                    hoverable
                    onClick={() => handleClick('ドキュメント')}
                    style={{
                      borderRadius: token.borderRadiusLG,
                      cursor: 'pointer',
                      transition: `all ${token.motionDurationMid} ease-out`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = token.boxShadowSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = token.boxShadow;
                    }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: token.borderRadius,
                        backgroundColor: token.colorSuccess,
                        color: 'white',
                      }}>
                        <FileTextOutlined style={{ fontSize: 30 }} />
                      </div>
                      <Title level={4} style={{ margin: 0 }}>ドキュメント</Title>
                      <Text type="secondary">マニュアルとガイド</Text>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>

            <Divider />

            <div>
              <Title level={4}>無効状態（disabled）</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card
                    hoverable={false}
                    onClick={undefined}
                    style={{
                      borderRadius: token.borderRadiusLG,
                      cursor: 'not-allowed',
                      opacity: 0.6,
                      transition: `all ${token.motionDurationMid} ease-out`,
                    }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: token.borderRadius,
                        backgroundColor: token.colorBgSpotlight,
                        color: token.colorTextDisabled,
                      }}>
                        <ProjectOutlined style={{ fontSize: 30 }} />
                      </div>
                      <Title level={4} style={{ margin: 0, color: token.colorTextDisabled }}>
                        準備中
                      </Title>
                      <Text type="secondary">この機能は現在利用できません</Text>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          </Space>
        </Card>

        {/* パターン4: 統計カード */}
        <Card title="パターン4: 統計カード（Statistics）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>基本形</Title>
              <Paragraph type="secondary">
                用途: ダッシュボードの統計カード、KPI表示、数値サマリー
              </Paragraph>
              
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Card style={{ textAlign: 'center', backgroundColor: '#e6f7ff' }}>
                    <Title level={2} style={{ margin: 0, color: token.colorPrimary }}>42</Title>
                    <Text>アクティブプロジェクト</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card style={{ textAlign: 'center', backgroundColor: '#f6ffed' }}>
                    <Title level={2} style={{ margin: 0, color: token.colorSuccess }}>15</Title>
                    <Text>完了済み</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card style={{ textAlign: 'center', backgroundColor: '#fff7e6' }}>
                    <Title level={2} style={{ margin: 0, color: token.colorWarning }}>27</Title>
                    <Text>進行中</Text>
                  </Card>
                </Col>
              </Row>
            </div>

            <Divider />

            <div>
              <Title level={4}>Statisticコンポーネントとの組み合わせ</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title="アクティブユーザー"
                      value={112893}
                      prefix={<UserOutlined />}
                      valueStyle={{ color: token.colorPrimary }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title="完了タスク"
                      value={93}
                      suffix="/ 100"
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: token.colorSuccess }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title="保留中"
                      value={7}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: token.colorWarning }}
                    />
                  </Card>
                </Col>
              </Row>
            </div>

            <Divider />

            <div>
              <Title level={4}>アイコン付き統計カード</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">総プロジェクト数</Text>
                        <ProjectOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
                      </div>
                      <Title level={2} style={{ margin: 0 }}>84</Title>
                      <Text type="success">+12% vs 先月</Text>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">ユーザー数</Text>
                        <TeamOutlined style={{ fontSize: 24, color: token.colorInfo }} />
                      </div>
                      <Title level={2} style={{ margin: 0 }}>156</Title>
                      <Text type="success">+8% vs 先月</Text>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">完了率</Text>
                        <CheckCircleOutlined style={{ fontSize: 24, color: token.colorSuccess }} />
                      </div>
                      <Title level={2} style={{ margin: 0 }}>93%</Title>
                      <Text type="success">+5% vs 先月</Text>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">警告数</Text>
                        <ExclamationCircleOutlined style={{ fontSize: 24, color: token.colorWarning }} />
                      </div>
                      <Title level={2} style={{ margin: 0 }}>3</Title>
                      <Text type="danger">+2 vs 先週</Text>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          </Space>
        </Card>

        {/* パターン5: インナーカード */}
        <Card title="パターン5: インナーカード（Inner）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>基本形</Title>
              <Paragraph type="secondary">
                用途: 親カード内のサブセクション、グルーピングされたコンテンツ
              </Paragraph>
              
              <Card title="ドキュメント">
                <Paragraph>
                  このドキュメントには複数のセクションが含まれています。
                </Paragraph>
                
                <Card type="inner" title="セクション1: 概要" style={{ marginBottom: 16 }}>
                  <Paragraph>
                    このシステムは材料科学分野における実験データを管理・可視化するためのプラットフォームです。
                  </Paragraph>
                </Card>
                
                <Card type="inner" title="セクション2: 主要機能">
                  <Space direction="vertical" size="small">
                    <Text>• プロジェクト管理</Text>
                    <Text>• 実験記録</Text>
                    <Text>• データ可視化</Text>
                    <Text>• レポート生成</Text>
                  </Space>
                </Card>
              </Card>
            </div>

            <Divider />

            <div>
              <Title level={4}>ネストされた情報の階層表示</Title>
              <Card title="プロジェクト詳細">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>プロジェクト名：</Text>
                    <Text>材料実験プロジェクトA</Text>
                  </div>
                  
                  <Card type="inner" title="基本情報">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div>
                        <Text strong>責任者：</Text>
                        <Text>山田太郎</Text>
                      </div>
                      <div>
                        <Text strong>開始日：</Text>
                        <Text>2024-01-01</Text>
                      </div>
                      <div>
                        <Text strong>期限：</Text>
                        <Text>2024-12-31</Text>
                      </div>
                    </Space>
                  </Card>
                  
                  <Card type="inner" title="進捗状況">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div>
                        <Text strong>完了タスク：</Text>
                        <Text>15 / 20</Text>
                      </div>
                      <div>
                        <Text strong>進捗率：</Text>
                        <Text>75%</Text>
                      </div>
                    </Space>
                  </Card>
                </Space>
              </Card>
            </div>
          </Space>
        </Card>

        {/* スタイルカスタマイズ */}
        <Card title="スタイルカスタマイズ" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>styles prop（Ant Design 5.x以降）</Title>
              <Card
                title="カスタムスタイルカード"
                styles={{
                  header: {
                    backgroundColor: token.colorPrimaryBg,
                    borderBottom: `2px solid ${token.colorPrimary}`,
                  },
                  body: {
                    padding: token.paddingLG,
                    backgroundColor: token.colorBgLayout,
                  },
                }}
              >
                <Text>ヘッダーとボディに個別のスタイルを適用しています。</Text>
              </Card>
            </div>

            <Divider />

            <div>
              <Title level={4}>coverプロパティ（カバー画像）</Title>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Card
                    cover={
                      <div style={{ 
                        height: 200, 
                        backgroundColor: token.colorPrimaryBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ProjectOutlined style={{ fontSize: 64, color: token.colorPrimary }} />
                      </div>
                    }
                  >
                    <Card.Meta
                      title="プロジェクトA"
                      description="材料科学実験プロジェクト"
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          </Space>
        </Card>

        {/* ローディング状態 */}
        <Card title="ローディング状態" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Button onClick={handleLoadingToggle} style={{ marginBottom: 16 }}>
                ローディングを切り替え（2秒間）
              </Button>
              
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Card loading={isLoading} title="データ読み込み中">
                    <Text>このカードはローディング状態を表示します。</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card title="Skeletonを使用">
                    {isLoading ? (
                      <Skeleton active />
                    ) : (
                      <Text>データが読み込まれました。</Text>
                    )}
                  </Card>
                </Col>
              </Row>
            </div>
          </Space>
        </Card>

        {/* レスポンシブデザイン */}
        <Card title="レスポンシブデザイン" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>グリッドレイアウト</Title>
              <Paragraph type="secondary">
                画面サイズに応じてカラム数が変わります（xs:24, sm:12, md:8, lg:6）
              </Paragraph>
              
              <Row gutter={[16, 16]}>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <Col key={num} xs={24} sm={12} md={8} lg={6}>
                    <Card>
                      <div style={{ textAlign: 'center' }}>
                        <Title level={3} style={{ margin: 0 }}>{num}</Title>
                        <Text type="secondary">カード {num}</Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </Space>
        </Card>

        {/* パフォーマンス最適化 */}
        <Card title="パフォーマンス最適化 - 大量カードの表示" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>Listコンポーネントとの組み合わせ</Title>
              <Paragraph type="secondary">
                大量のカードを表示する場合はListコンポーネントとページネーションを使用
              </Paragraph>
              
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                dataSource={Array.from({ length: 12 }, (_, i) => ({
                  title: `プロジェクト ${i + 1}`,
                  content: `プロジェクト ${i + 1} の説明文です。`,
                }))}
                renderItem={(item) => (
                  <List.Item>
                    <Card title={item.title}>
                      {item.content}
                    </Card>
                  </List.Item>
                )}
                pagination={{
                  pageSize: 8,
                  showSizeChanger: true,
                  showTotal: (total) => `全 ${total} 件`,
                }}
              />
            </div>
          </Space>
        </Card>

        {/* フォームカード */}
        <Card title="よくあるユースケース - フォームカード" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>ユーザー登録フォーム</Title>
              <Card title="ユーザー登録">
                <Form layout="vertical">
                  <Form.Item label="ユーザー名" name="username">
                    <Input />
                  </Form.Item>
                  <Form.Item label="メールアドレス" name="email">
                    <Input type="email" />
                  </Form.Item>
                  <Form.Item label="所属組織" name="organization">
                    <Select placeholder="組織を選択">
                      <Select.Option value="org1">組織A</Select.Option>
                      <Select.Option value="org2">組織B</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit">
                        登録
                      </Button>
                      <Button>
                        キャンセル
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            </div>
          </Space>
        </Card>

      </Space>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Badge,
  Card,
  Space,
  Button,
  Avatar,
  List,
  Divider,
  Typography,
  Switch,
  InputNumber,
  Table,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  NotificationOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * 通知バッジ表示パターンのデモコンポーネント
 */
export default function BadgePatternsDemo() {
  const [count1, setCount1] = useState(5);
  const [count2, setCount2] = useState(150);
  const [showDot, setShowDot] = useState(true);

  // ユーザーステータスデータ
  const userData = [
    {
      key: '1',
      name: '田中太郎',
      email: 'tanaka@example.com',
      status: 'success' as const,
      statusText: 'オンライン',
    },
    {
      key: '2',
      name: '佐藤花子',
      email: 'sato@example.com',
      status: 'default' as const,
      statusText: 'オフライン',
    },
    {
      key: '3',
      name: '鈴木一郎',
      email: 'suzuki@example.com',
      status: 'processing' as const,
      statusText: '取り込み中',
    },
    {
      key: '4',
      name: '高橋美咲',
      email: 'takahashi@example.com',
      status: 'error' as const,
      statusText: 'エラー',
    },
    {
      key: '5',
      name: '渡辺健太',
      email: 'watanabe@example.com',
      status: 'warning' as const,
      statusText: '離席中',
    },
  ];

  // タスクステータスデータ
  const taskStatusData = [
    { status: 'success' as const, label: '完了', count: 15, icon: <CheckCircleOutlined /> },
    { status: 'processing' as const, label: '進行中', count: 8, icon: <SyncOutlined spin /> },
    { status: 'error' as const, label: 'エラー', count: 2, icon: <CloseCircleOutlined /> },
    { status: 'warning' as const, label: '保留中', count: 5, icon: <ClockCircleOutlined /> },
    { status: 'default' as const, label: '未着手', count: 20, icon: <MinusCircleOutlined /> },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Card>
          <Title level={2}>通知バッジ表示パターン</Title>
          <Paragraph>
            Ant Designの<code>Badge</code>コンポーネントを使用した3つの標準パターンのデモです。
          </Paragraph>
        </Card>

        {/* パターン1: 数値表示バッジ */}
        <Card title="パターン1: 数値表示バッジ（カウント表示）">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>基本パターン</Title>
              <Paragraph>未読通知数、未処理タスク数、新着件数の表示に使用</Paragraph>
              <Space size="large" wrap>
                <div style={{ textAlign: 'center' }}>
                  <Badge count={5}>
                    <BellOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>通知 (5件)</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge count={12}>
                    <MailOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>メール (12件)</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge count={99}>
                    <MessageOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>メッセージ (99件)</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge count={3}>
                    <ShoppingCartOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>カート (3個)</div>
                </div>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>100以上の数値（99+表示）</Title>
              <Space size="large" wrap>
                <div style={{ textAlign: 'center' }}>
                  <Badge count={150} overflowCount={99}>
                    <MailOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>150件 → 99+表示</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge count={999} overflowCount={99}>
                    <NotificationOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>999件 → 99+表示</div>
                </div>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>0件の場合（バッジ非表示）</Title>
              <Space size="large" wrap>
                <div style={{ textAlign: 'center' }}>
                  <Badge count={0} showZero={false}>
                    <BellOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>通知なし</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge count={0} showZero={false}>
                    <MailOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>メールなし</div>
                </div>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>インタラクティブデモ</Title>
              <Space direction="vertical" size="middle">
                <Space>
                  <Text>通知件数:</Text>
                  <InputNumber
                    min={0}
                    max={999}
                    value={count1}
                    onChange={(value) => setCount1(value || 0)}
                  />
                  <Badge count={count1} overflowCount={99}>
                    <BellOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                </Space>

                <Space>
                  <Text>メール件数:</Text>
                  <InputNumber
                    min={0}
                    max={999}
                    value={count2}
                    onChange={(value) => setCount2(value || 0)}
                  />
                  <Badge count={count2} overflowCount={99}>
                    <MailOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                </Space>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>サイズバリエーション</Title>
              <Space size="large" align="start" wrap>
                <div style={{ textAlign: 'center' }}>
                  <Badge count={5} size="default">
                    <Avatar icon={<UserOutlined />} size={40} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>default (20px)</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge count={5} size="small">
                    <Avatar icon={<UserOutlined />} size={32} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>small (16px)</div>
                </div>
              </Space>
            </div>
          </Space>
        </Card>

        {/* パターン2: ドット表示バッジ */}
        <Card title="パターン2: ドット表示バッジ（新着通知）">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>基本パターン</Title>
              <Paragraph>新着情報の有無、更新の有無を示す（件数不要な場合）</Paragraph>
              <Space size="large" wrap>
                <div style={{ textAlign: 'center' }}>
                  <Badge dot>
                    <BellOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>新着通知あり</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge dot>
                    <NotificationOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>更新あり</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge dot>
                    <MessageOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>未読メッセージ</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge dot>
                    <Avatar icon={<UserOutlined />} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>アバター通知</div>
                </div>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>新着なし（ドット非表示）</Title>
              <Space size="large" wrap>
                <div style={{ textAlign: 'center' }}>
                  <Badge dot={false}>
                    <BellOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>通知なし</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Badge dot={false}>
                    <Avatar icon={<UserOutlined />} />
                  </Badge>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>更新なし</div>
                </div>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>インタラクティブデモ（条件付き表示）</Title>
              <Space direction="vertical" size="middle">
                <Space>
                  <Text>ドット表示:</Text>
                  <Switch checked={showDot} onChange={setShowDot} />
                  <Badge dot={showDot}>
                    <BellOutlined style={{ fontSize: 24, color: '#757575' }} />
                  </Badge>
                  <Text type="secondary">{showDot ? '新着あり' : '新着なし'}</Text>
                </Space>
              </Space>
            </div>
          </Space>
        </Card>

        {/* パターン3: ステータスバッジ */}
        <Card title="パターン3: ステータスバッジ（状態表示）">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>基本パターン（ドットのみ）</Title>
              <Space size="large" wrap>
                <Badge status="success" />
                <Badge status="processing" />
                <Badge status="default" />
                <Badge status="error" />
                <Badge status="warning" />
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>テキスト付き表示</Title>
              <Space direction="vertical" size="middle">
                <Badge status="success" text="オンライン" />
                <Badge status="processing" text="処理中" />
                <Badge status="default" text="オフライン" />
                <Badge status="error" text="エラー" />
                <Badge status="warning" text="警告" />
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>ステータス色定義</Title>
              <Card>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Space>
                        <Badge status="success" />
                        <Text strong>success</Text>
                      </Space>
                      <div style={{ marginLeft: 22, color: '#757575', fontSize: 12 }}>
                        完了、承認済み、オンライン
                      </div>
                    </Col>
                    <Col span={12}>
                      <div
                        style={{
                          width: 100,
                          height: 24,
                          backgroundColor: '#2e7d32',
                          borderRadius: 4,
                        }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        #2e7d32
                      </Text>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Space>
                        <Badge status="processing" />
                        <Text strong>processing</Text>
                      </Space>
                      <div style={{ marginLeft: 22, color: '#757575', fontSize: 12 }}>
                        処理中、進行中
                      </div>
                    </Col>
                    <Col span={12}>
                      <div
                        style={{
                          width: 100,
                          height: 24,
                          backgroundColor: '#0093CF',
                          borderRadius: 4,
                        }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        #0093CF
                      </Text>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Space>
                        <Badge status="default" />
                        <Text strong>default</Text>
                      </Space>
                      <div style={{ marginLeft: 22, color: '#757575', fontSize: 12 }}>
                        オフライン、未設定
                      </div>
                    </Col>
                    <Col span={12}>
                      <div
                        style={{
                          width: 100,
                          height: 24,
                          backgroundColor: '#bdbdbd',
                          borderRadius: 4,
                        }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        #bdbdbd
                      </Text>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Space>
                        <Badge status="error" />
                        <Text strong>error</Text>
                      </Space>
                      <div style={{ marginLeft: 22, color: '#757575', fontSize: 12 }}>
                        エラー、却下、期限切れ
                      </div>
                    </Col>
                    <Col span={12}>
                      <div
                        style={{
                          width: 100,
                          height: 24,
                          backgroundColor: '#d32f2f',
                          borderRadius: 4,
                        }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        #d32f2f
                      </Text>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Space>
                        <Badge status="warning" />
                        <Text strong>warning</Text>
                      </Space>
                      <div style={{ marginLeft: 22, color: '#757575', fontSize: 12 }}>
                        警告、保留中
                      </div>
                    </Col>
                    <Col span={12}>
                      <div
                        style={{
                          width: 100,
                          height: 24,
                          backgroundColor: '#ed6c02',
                          borderRadius: 4,
                        }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        #ed6c02
                      </Text>
                    </Col>
                  </Row>
                </Space>
              </Card>
            </div>

            <Divider />

            <div>
              <Title level={4}>ユーザーステータス一覧の例</Title>
              <List
                bordered
                dataSource={userData}
                renderItem={(user) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Badge dot status={user.status}>
                          <Avatar icon={<UserOutlined />} />
                        </Badge>
                      }
                      title={user.name}
                      description={
                        <Space>
                          <Text type="secondary">{user.email}</Text>
                          <Badge status={user.status} text={user.statusText} />
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>

            <Divider />

            <div>
              <Title level={4}>タスクステータス表示の例</Title>
              <Card title="タスク状況">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {taskStatusData.map((task) => (
                    <div
                      key={task.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Space>
                        {task.icon}
                        <Badge status={task.status} text={task.label} />
                      </Space>
                      <Tag>{task.count}件</Tag>
                    </div>
                  ))}
                </Space>
              </Card>
            </div>
          </Space>
        </Card>

        {/* 複合使用例 */}
        <Card title="複合使用例">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>ヘッダー通知アイコン</Title>
              <Card>
                <Space size={24}>
                  <div style={{ textAlign: 'center' }}>
                    <Badge count={5}>
                      <BellOutlined style={{ fontSize: 24, color: '#757575', cursor: 'pointer' }} />
                    </Badge>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>通知</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <Badge count={12} overflowCount={9}>
                      <MailOutlined style={{ fontSize: 24, color: '#757575', cursor: 'pointer' }} />
                    </Badge>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>メール</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <Badge dot>
                      <MessageOutlined
                        style={{ fontSize: 24, color: '#757575', cursor: 'pointer' }}
                      />
                    </Badge>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>メッセージ</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <Badge count={3}>
                      <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
                    </Badge>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#757575' }}>プロフィール</div>
                  </div>
                </Space>
              </Card>
            </div>

            <Divider />

            <div>
              <Title level={4}>ボタン内での使用</Title>
              <Space wrap>
                <Button type="primary">
                  通知 <Badge count={5} style={{ marginLeft: 8, backgroundColor: '#ffffff', color: '#CF0027' }} />
                </Button>

                <Button>
                  メッセージ <Badge count={10} style={{ marginLeft: 8 }} />
                </Button>

                <Button>
                  タスク <Badge dot style={{ marginLeft: 8 }} />
                </Button>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>テーブル内での使用</Title>
              <Table
                dataSource={userData}
                columns={[
                  {
                    title: '名前',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name, record) => (
                      <Space>
                        <Badge dot status={record.status}>
                          <Avatar icon={<UserOutlined />} />
                        </Badge>
                        {name}
                      </Space>
                    ),
                  },
                  {
                    title: 'メール',
                    dataIndex: 'email',
                    key: 'email',
                  },
                  {
                    title: 'ステータス',
                    dataIndex: 'statusText',
                    key: 'status',
                    render: (text, record) => <Badge status={record.status} text={text} />,
                  },
                ]}
                pagination={false}
              />
            </div>
          </Space>
        </Card>

        {/* 使用禁止パターン */}
        <Card
          title="❌ 使用禁止パターン"
          style={{ borderColor: '#d32f2f' }}
          headStyle={{ backgroundColor: '#FFEBEE', color: '#d32f2f' }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>❌ 多色使用（統一性がない）</Title>
              <Space size="large" wrap>
                <Badge count={5} color="blue">
                  <BellOutlined style={{ fontSize: 24 }} />
                </Badge>
                <Badge count={5} color="green">
                  <MailOutlined style={{ fontSize: 24 }} />
                </Badge>
                <Badge count={5} color="orange">
                  <MessageOutlined style={{ fontSize: 24 }} />
                </Badge>
              </Space>
              <Paragraph type="danger" style={{ marginTop: 8 }}>
                理由: 数値バッジは error カラー（#d32f2f）で統一すべき
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={4}>❌ 極端に大きな数値表示</Title>
              <Space size="large" wrap>
                <Badge count={9999}>
                  <MailOutlined style={{ fontSize: 24 }} />
                </Badge>
                <Badge count={99999}>
                  <BellOutlined style={{ fontSize: 24 }} />
                </Badge>
              </Space>
              <Paragraph type="danger" style={{ marginTop: 8 }}>
                理由: "99+"で統一し、極端に大きな数値は避ける（overflowCount={`{99}`}を使用）
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={4}>❌ 意味のない0表示</Title>
              <Space size="large" wrap>
                <Badge count={0} showZero>
                  <BellOutlined style={{ fontSize: 24 }} />
                </Badge>
                <Badge count={0} showZero>
                  <MailOutlined style={{ fontSize: 24 }} />
                </Badge>
              </Space>
              <Paragraph type="danger" style={{ marginTop: 8 }}>
                理由: 件数が0の場合はバッジを非表示にする（showZero={`{false}`}）
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={4}>❌ バッジの重複使用</Title>
              <Badge count={5}>
                <Badge dot>
                  <BellOutlined style={{ fontSize: 24 }} />
                </Badge>
              </Badge>
              <Paragraph type="danger" style={{ marginTop: 8 }}>
                理由: 1つのアイコンに複数のバッジを重ねると混乱を招く
              </Paragraph>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}

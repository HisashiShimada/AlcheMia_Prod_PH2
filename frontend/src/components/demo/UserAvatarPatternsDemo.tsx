'use client';

import React, { useState } from 'react';
import { 
  Avatar, 
  Badge, 
  Card, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Divider,
  Switch,
  Table,
  List,
  Tag,
  Button,
  Tooltip
} from 'antd';
import { 
  UserOutlined,
  CrownOutlined,
  DatabaseOutlined,
  SettingOutlined,
  CheckCircleFilled,
  MessageOutlined,
  HistoryOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// ユーザーデータ
const users = [
  { id: 1, name: '山田 太郎', nameEn: 'Taro Yamada', role: 'system_admin', online: true, email: 'yamada@example.com' },
  { id: 2, name: '佐藤 花子', nameEn: 'Hanako Sato', role: 'data_admin', online: true, email: 'sato@example.com' },
  { id: 3, name: '田中 健一', nameEn: 'Kenichi Tanaka', role: 'experiment_admin', online: false, email: 'tanaka@example.com' },
  { id: 4, name: '鈴木 美咲', nameEn: 'Misaki Suzuki', role: 'worker', online: true, email: 'suzuki@example.com' },
  { id: 5, name: 'John Smith', nameEn: 'John Smith', role: 'worker', online: false, email: 'john@example.com' },
  { id: 6, name: 'Alice Johnson', nameEn: 'Alice Johnson', role: 'data_admin', online: true, email: 'alice@example.com' },
];

// イニシャル取得関数
const getUserInitials = (name: string): string => {
  if (!name) return '？';
  
  // 英語名の判定（アルファベットのみで構成されているか）
  const isEnglish = /^[a-zA-Z\s]+$/.test(name);
  
  if (isEnglish) {
    // 英語名の場合
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    } else if (parts.length === 1 && parts[0].length === 1) {
      return parts[0].toUpperCase();
    }
  } else {
    // 日本語名の場合
    const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length >= 2) {
      // 姓と名がある場合
      return parts[0][0] + parts[1][0];
    } else if (parts.length === 1) {
      // 姓のみの場合
      if (parts[0].length >= 2) {
        return parts[0].substring(0, 2);
      } else {
        return parts[0];
      }
    }
  }
  
  return '？';
};

// ロールバッジ取得関数
const getRoleBadge = (role: string) => {
  switch (role) {
    case 'system_admin':
      return { icon: <CrownOutlined style={{ color: '#ffffff', fontSize: '8px' }} />, color: '#d32f2f' };
    case 'data_admin':
      return { icon: <DatabaseOutlined style={{ color: '#ffffff', fontSize: '8px' }} />, color: '#0093CF' };
    case 'experiment_admin':
      return { icon: <SettingOutlined style={{ color: '#ffffff', fontSize: '8px' }} />, color: '#ed6c02' };
    default:
      return null;
  }
};

// ロール名取得関数
const getRoleName = (role: string) => {
  const roleMap: Record<string, string> = {
    system_admin: 'System Admin',
    data_admin: 'Data Admin',
    experiment_admin: 'Experiment Admin',
    worker: 'Worker'
  };
  return roleMap[role] || role;
};

// ユーザーアバターコンポーネント
interface UserAvatarProps {
  user: typeof users[0];
  size: number;
  fontSize: number;
  showBadge?: boolean;
  showOnlineStatus?: boolean;
  clickable?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size,
  fontSize,
  showBadge = false,
  showOnlineStatus = false,
  clickable = false
}) => {
  const initials = getUserInitials(user.name);
  const roleBadge = getRoleBadge(user.role);
  
  const avatarStyle = {
    backgroundColor: '#CF0027',
    color: '#ffffff',
    fontSize: `${fontSize}px`,
    fontWeight: 600,
    cursor: clickable ? 'pointer' : 'default',
    transition: 'all 0.2s ease'
  };
  
  const hoverStyle = clickable ? {
    ':hover': {
      backgroundColor: '#E63946'
    }
  } : {};

  let avatar = (
    <Tooltip title={`${user.name} (${getRoleName(user.role)})`}>
      <Avatar 
        size={size}
        style={avatarStyle}
        aria-label={user.name}
      >
        {initials}
      </Avatar>
    </Tooltip>
  );

  // オンライン状態インジケーター
  if (showOnlineStatus) {
    avatar = (
      <Badge 
        dot 
        status={user.online ? 'success' : 'default'}
        offset={[-3, size - 7]}
      >
        {avatar}
      </Badge>
    );
  }

  // ロールバッジ
  if (showBadge && roleBadge) {
    avatar = (
      <Badge
        count={roleBadge.icon}
        offset={[-2, 5]}
        style={{ 
          backgroundColor: roleBadge.color,
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #ffffff'
        }}
      >
        {avatar}
      </Badge>
    );
  }

  return avatar;
};

const UserAvatarPatternsDemo: React.FC = () => {
  const [showBadge, setShowBadge] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [clickable, setClickable] = useState(false);

  // テーブル用カラム定義
  const columns = [
    {
      title: 'ユーザー',
      key: 'user',
      width: 300,
      render: (_: unknown, record: typeof users[0]) => (
        <Space size={12}>
          <UserAvatar 
            user={record} 
            size={32} 
            fontSize={14}
            showBadge={showBadge}
            showOnlineStatus={showOnlineStatus}
            clickable={clickable}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'ロール',
      dataIndex: 'role',
      key: 'role',
      width: 200,
      render: (role: string) => (
        <Tag color={role.includes('admin') ? 'red' : 'default'}>
          {getRoleName(role)}
        </Tag>
      )
    },
    {
      title: 'ステータス',
      dataIndex: 'online',
      key: 'status',
      width: 120,
      render: (online: boolean) => (
        <Tag color={online ? 'success' : 'default'} icon={online ? <CheckCircleFilled /> : undefined}>
          {online ? 'オンライン' : 'オフライン'}
        </Tag>
      )
    }
  ];

  // アクティビティログデータ
  const activities = [
    { user: users[0], action: 'プロジェクトを作成しました', time: '5分前' },
    { user: users[1], action: 'ファイルをアップロードしました', time: '10分前' },
    { user: users[2], action: '実験記録を更新しました', time: '15分前' },
    { user: users[3], action: 'コメントを追加しました', time: '20分前' },
    { user: users[4], action: 'タスクを完了しました', time: '25分前' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2}>ユーザーアイコン表示パターン</Title>
      <Paragraph>
        ユーザーアイコンの標準3パターンと各種バリエーションを表示します。
      </Paragraph>

      {/* コントロールパネル */}
      <Card style={{ marginBottom: '24px', backgroundColor: '#fafafa' }}>
        <Space size="large">
          <Space>
            <Text strong>ロールバッジ:</Text>
            <Switch checked={showBadge} onChange={setShowBadge} />
          </Space>
          <Space>
            <Text strong>オンライン状態:</Text>
            <Switch checked={showOnlineStatus} onChange={setShowOnlineStatus} />
          </Space>
          <Space>
            <Text strong>クリック可能:</Text>
            <Switch checked={clickable} onChange={setClickable} />
          </Space>
        </Space>
      </Card>

      <Divider />

      {/* パターン1: ヘッダー用（大） */}
      <Card title="パターン1: ヘッダー用アイコン（大）" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>サイズ: 40px × 40px | フォント: 16px | 用途: ヘッダー、プロフィール</Text>
          </div>
          
          <Row gutter={[24, 24]}>
            {users.map(user => (
              <Col key={user.id} xs={12} sm={8} md={6} lg={4}>
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <UserAvatar 
                    user={user}
                    size={40}
                    fontSize={16}
                    showBadge={showBadge}
                    showOnlineStatus={showOnlineStatus}
                    clickable={clickable}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500 }}>{user.name}</div>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {getRoleName(user.role)}
                    </Text>
                  </div>
                </Space>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>

      {/* パターン2: リスト用（中） */}
      <Card title="パターン2: リスト用アイコン（中）" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>サイズ: 32px × 32px | フォント: 14px | 用途: テーブル、カード、リスト</Text>
          </div>

          {/* テーブル表示例 */}
          <div>
            <Title level={5}>テーブル表示例</Title>
            <Table 
              columns={columns}
              dataSource={users}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </div>

          {/* カード表示例 */}
          <div>
            <Title level={5}>カード表示例</Title>
            <Row gutter={[16, 16]}>
              {users.slice(0, 3).map(user => (
                <Col key={user.id} xs={24} sm={12} md={8}>
                  <Card 
                    hoverable
                    style={{ height: '100%' }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Space size={12}>
                        <UserAvatar 
                          user={user}
                          size={32}
                          fontSize={14}
                          showBadge={showBadge}
                          showOnlineStatus={showOnlineStatus}
                          clickable={clickable}
                        />
                        <div>
                          <div style={{ fontWeight: 500 }}>{user.name}</div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {getRoleName(user.role)}
                          </Text>
                        </div>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '13px' }}>
                        {user.email}
                      </Text>
                      <Space>
                        <Tag color={user.online ? 'success' : 'default'}>
                          {user.online ? 'オンライン' : 'オフライン'}
                        </Tag>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </Space>
      </Card>

      {/* パターン3: 小型（小） */}
      <Card title="パターン3: 小型アイコン（小）" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>サイズ: 24px × 24px | フォント: 12px | 用途: コメント、ログ、履歴</Text>
          </div>

          {/* アクティビティログ表示例 */}
          <div>
            <Title level={5}>アクティビティログ表示例</Title>
            <List
              bordered
              dataSource={activities}
              renderItem={(item) => (
                <List.Item>
                  <Space size={12} style={{ width: '100%' }}>
                    <UserAvatar 
                      user={item.user}
                      size={24}
                      fontSize={12}
                      showOnlineStatus={false}
                      clickable={clickable}
                    />
                    <div style={{ flex: 1 }}>
                      <Space direction="vertical" size={0}>
                        <Space size={8}>
                          <Text strong style={{ fontSize: '13px' }}>{item.user.name}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {item.action}
                          </Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          <HistoryOutlined style={{ marginRight: '4px' }} />
                          {item.time}
                        </Text>
                      </Space>
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          </div>

          {/* コメント表示例 */}
          <div>
            <Title level={5}>コメント表示例</Title>
            <Card>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {users.slice(0, 3).map(user => (
                  <Space key={user.id} align="start" size={12}>
                    <UserAvatar 
                      user={user}
                      size={24}
                      fontSize={12}
                      showOnlineStatus={false}
                      clickable={clickable}
                    />
                    <div style={{ flex: 1 }}>
                      <Space direction="vertical" size={4}>
                        <Space size={8}>
                          <Text strong style={{ fontSize: '12px' }}>{user.name}</Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>2時間前</Text>
                        </Space>
                        <Text style={{ fontSize: '13px' }}>
                          実験データの分析結果を確認しました。次のステップに進めます。
                        </Text>
                      </Space>
                    </div>
                  </Space>
                ))}
              </Space>
            </Card>
          </div>
        </Space>
      </Card>

      {/* 複数ユーザー表示（Avatar.Group） */}
      <Card title="複数ユーザー表示（Avatar.Group）" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>用途: プロジェクトメンバー、チーム表示</Text>
          </div>

          <Row gutter={[16, 24]}>
            <Col xs={24} md={12}>
              <Card title="3人まで表示（40px）" size="small">
                <Avatar.Group 
                  maxCount={3}
                  size={40}
                  maxStyle={{ 
                    color: '#CF0027', 
                    backgroundColor: '#FFF1F3',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {users.map(user => (
                    <Tooltip key={user.id} title={user.name}>
                      <Avatar 
                        style={{ 
                          backgroundColor: '#CF0027',
                          fontSize: '16px',
                          fontWeight: 600
                        }}
                      >
                        {getUserInitials(user.name)}
                      </Avatar>
                    </Tooltip>
                  ))}
                </Avatar.Group>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="4人まで表示（32px）" size="small">
                <Avatar.Group 
                  maxCount={4}
                  size={32}
                  maxStyle={{ 
                    color: '#CF0027', 
                    backgroundColor: '#FFF1F3',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {users.map(user => (
                    <Tooltip key={user.id} title={user.name}>
                      <Avatar 
                        style={{ 
                          backgroundColor: '#CF0027',
                          fontSize: '14px',
                          fontWeight: 600
                        }}
                      >
                        {getUserInitials(user.name)}
                      </Avatar>
                    </Tooltip>
                  ))}
                </Avatar.Group>
              </Card>
            </Col>
          </Row>

          <Card title="プロジェクトカードでの使用例" size="small">
            <Row gutter={[16, 16]}>
              {[
                { name: 'AIモデル開発プロジェクト', members: users.slice(0, 4) },
                { name: 'データ分析基盤構築', members: users.slice(1, 5) },
                { name: '実験管理システム改善', members: users.slice(2, 6) }
              ].map((project, index) => (
                <Col key={index} xs={24} md={8}>
                  <Card 
                    hoverable
                    title={<Text strong style={{ fontSize: '14px' }}>{project.name}</Text>}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                          チームメンバー ({project.members.length}人)
                        </Text>
                        <Avatar.Group 
                          maxCount={3}
                          size={32}
                          maxStyle={{ 
                            color: '#CF0027', 
                            backgroundColor: '#FFF1F3',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          {project.members.map(user => (
                            <Tooltip key={user.id} title={user.name}>
                              <Avatar 
                                style={{ 
                                  backgroundColor: '#CF0027',
                                  fontSize: '14px',
                                  fontWeight: 600
                                }}
                              >
                                {getUserInitials(user.name)}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </Avatar.Group>
                      </div>
                      <Button type="primary" size="small" block>
                        詳細を見る
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Space>
      </Card>

      {/* 状態バリエーション */}
      <Card title="状態バリエーション" style={{ marginBottom: '24px' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card title="通常状態" size="small">
              <Space align="center" size={16}>
                <UserAvatar 
                  user={users[0]}
                  size={40}
                  fontSize={16}
                  showBadge={false}
                  showOnlineStatus={false}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{users[0].name}</div>
                  <Text type="secondary">通常の表示</Text>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card title="ホバー状態（クリック可能）" size="small">
              <Space align="center" size={16}>
                <UserAvatar 
                  user={users[1]}
                  size={40}
                  fontSize={16}
                  showBadge={false}
                  showOnlineStatus={false}
                  clickable={true}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{users[1].name}</div>
                  <Text type="secondary">ホバーで色が変わる</Text>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card title="無効状態" size="small">
              <Space align="center" size={16}>
                <Avatar 
                  size={40}
                  style={{ 
                    backgroundColor: '#bdbdbd',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 600,
                    opacity: 0.6
                  }}
                >
                  非有効
                </Avatar>
                <div>
                  <div style={{ fontWeight: 500, color: '#bdbdbd' }}>非アクティブユーザー</div>
                  <Text type="secondary">無効状態の表示</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* レスポンシブ表示 */}
      <Card title="レスポンシブ対応">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>画面サイズに応じてアイコンサイズが変化します</Text>
          </div>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card title="モバイル (xs, sm)" size="small">
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <UserAvatar user={users[0]} size={32} fontSize={14} showBadge={showBadge} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    40px → 32px
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Card title="タブレット (md)" size="small">
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <UserAvatar user={users[1]} size={40} fontSize={16} showBadge={showBadge} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    標準サイズ (40px)
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Card title="デスクトップ (lg+)" size="small">
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <UserAvatar user={users[2]} size={40} fontSize={16} showBadge={showBadge} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    標準サイズ (40px)
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>
    </div>
  );
};

export default UserAvatarPatternsDemo;

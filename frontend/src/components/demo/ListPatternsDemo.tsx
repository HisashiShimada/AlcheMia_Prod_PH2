'use client';

import React, { useState } from 'react';
import {
  List,
  Card,
  Space,
  Typography,
  Button,
  Avatar,
  Badge,
  Tag,
  Empty,
  Skeleton,
  Divider,
  theme,
  Switch,
} from 'antd';
import {
  FileOutlined,
  UserOutlined,
  FolderOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  SettingOutlined,
  BellOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

// サンプルデータ
const simpleData = [
  { id: 1, name: 'ホーム' },
  { id: 2, name: 'プロフィール' },
  { id: 3, name: '設定' },
  { id: 4, name: '通知' },
  { id: 5, name: 'ヘルプ' },
];

const iconData = [
  { id: 1, name: 'ホーム', icon: <HomeOutlined /> },
  { id: 2, name: 'プロフィール', icon: <UserOutlined /> },
  { id: 3, name: '設定', icon: <SettingOutlined /> },
  { id: 4, name: '通知', icon: <BellOutlined /> },
  { id: 5, name: 'ファイル', icon: <FileOutlined /> },
];

const descriptionData = [
  {
    id: 1,
    name: '田中太郎',
    description: '開発部門 - シニアエンジニア',
    email: 'tanaka@example.com',
  },
  {
    id: 2,
    name: '佐藤花子',
    description: 'デザイン部門 - リードデザイナー',
    email: 'sato@example.com',
  },
  {
    id: 3,
    name: '鈴木一郎',
    description: 'マーケティング部門 - マネージャー',
    email: 'suzuki@example.com',
  },
  {
    id: 4,
    name: '高橋美咲',
    description: '人事部門 - アシスタント',
    email: 'takahashi@example.com',
  },
];

const actionData = [
  {
    id: 1,
    name: 'プロジェクトA',
    description: '2024年度の主要プロジェクト',
  },
  {
    id: 2,
    name: 'プロジェクトB',
    description: '研究開発フェーズ',
  },
  {
    id: 3,
    name: 'プロジェクトC',
    description: 'リリース準備中',
  },
  {
    id: 4,
    name: 'プロジェクトD',
    description: '企画段階',
  },
];

const statusData = [
  {
    id: 1,
    name: 'タスクA',
    description: '仕様書作成',
    status: 'success',
    statusText: '完了',
    avatar: 'A',
  },
  {
    id: 2,
    name: 'タスクB',
    description: 'デザイン確認',
    status: 'processing',
    statusText: '進行中',
    avatar: 'B',
  },
  {
    id: 3,
    name: 'タスクC',
    description: 'コードレビュー',
    status: 'default',
    statusText: '待機中',
    avatar: 'C',
  },
  {
    id: 4,
    name: 'タスクD',
    description: 'テスト実行',
    status: 'error',
    statusText: 'エラー',
    avatar: 'D',
  },
];

const ListPatternsDemo: React.FC = () => {
  const { token } = useToken();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const handleClick = (id: number) => {
    setSelectedId(selectedId === id ? null : id);
  };

  const handleLoadingToggle = () => {
    setLoading(!loading);
  };

  const handleEmptyToggle = () => {
    setShowEmpty(!showEmpty);
  };

  const listItemStyle = (id: number) => ({
    cursor: 'pointer',
    backgroundColor: selectedId === id ? token.colorPrimaryBg : token.colorBgContainer,
    borderLeft: selectedId === id ? `3px solid ${token.colorPrimary}` : 'none',
    paddingLeft: selectedId === id ? '13px' : '16px',
    transition: 'all 0.2s ease-out',
  });

  return (
    <div style={{ padding: '24px', backgroundColor: token.colorBgLayout }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Card>
          <Title level={2}>リスト表示パターン</Title>
          <Paragraph>
            Ant DesignのListコンポーネントを使用した5つの標準パターンを紹介します。
          </Paragraph>
          <Space>
            <Text>ローディング表示:</Text>
            <Switch checked={loading} onChange={handleLoadingToggle} />
            <Divider type="vertical" />
            <Text>空状態表示:</Text>
            <Switch checked={showEmpty} onChange={handleEmptyToggle} />
          </Space>
        </Card>

        {/* パターン1: シンプルリスト */}
        <Card
          title={
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 16 }}>
                パターン1: シンプルリスト
              </Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                用途: 基本的な項目リスト、メニュー項目
              </Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>仕様:</Text>
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>高さ: 48px</li>
                <li>フォントサイズ: 14px</li>
                <li>パディング: 左右16px、上下12px</li>
                <li>構成: テキストのみ</li>
              </ul>
            </div>

            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <List
                bordered
                dataSource={showEmpty ? [] : simpleData}
                locale={{ emptyText: <Empty description="データがありません" /> }}
                renderItem={(item) => (
                  <List.Item
                    style={listItemStyle(item.id)}
                    onClick={() => handleClick(item.id)}
                  >
                    {item.name}
                  </List.Item>
                )}
                style={{
                  borderRadius: token.borderRadiusLG,
                  maxHeight: '600px',
                  overflow: 'auto',
                }}
              />
            )}
          </Space>
        </Card>

        {/* パターン2: アイコン付きリスト */}
        <Card
          title={
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 16 }}>
                パターン2: アイコン付きリスト
              </Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                用途: 機能メニュー、ナビゲーション
              </Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>仕様:</Text>
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>高さ: 56px</li>
                <li>アイコンサイズ: 20px</li>
                <li>アイコン色: #CF0027（プライマリカラー）</li>
                <li>構成: アイコン（左） + テキスト</li>
              </ul>
            </div>

            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <List
                bordered
                dataSource={showEmpty ? [] : iconData}
                locale={{ emptyText: <Empty description="データがありません" /> }}
                renderItem={(item) => (
                  <List.Item
                    style={listItemStyle(item.id)}
                    onClick={() => handleClick(item.id)}
                  >
                    <Space>
                      {React.cloneElement(item.icon as React.ReactElement, {
                        style: { color: token.colorPrimary, fontSize: 20 },
                      })}
                      {item.name}
                    </Space>
                  </List.Item>
                )}
                style={{
                  borderRadius: token.borderRadiusLG,
                  maxHeight: '600px',
                  overflow: 'auto',
                }}
              />
            )}
          </Space>
        </Card>

        {/* パターン3: 説明付きリスト */}
        <Card
          title={
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 16 }}>
                パターン3: 説明付きリスト
              </Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                用途: ユーザーリスト、ファイルリスト、詳細情報表示
              </Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>仕様:</Text>
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>高さ: 72px（可変）</li>
                <li>タイトルフォント: 14px</li>
                <li>説明フォント: 12px</li>
                <li>構成: タイトル + 説明（1-2行）</li>
              </ul>
            </div>

            {loading ? (
              <Skeleton active avatar paragraph={{ rows: 4 }} />
            ) : (
              <List
                bordered
                dataSource={showEmpty ? [] : descriptionData}
                locale={{ emptyText: <Empty description="データがありません" /> }}
                renderItem={(item) => (
                  <List.Item
                    style={listItemStyle(item.id)}
                    onClick={() => handleClick(item.id)}
                  >
                    <List.Item.Meta
                      title={<Text strong>{item.name}</Text>}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.description}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <MailOutlined /> {item.email}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                style={{
                  borderRadius: token.borderRadiusLG,
                  maxHeight: '600px',
                  overflow: 'auto',
                }}
              />
            )}
          </Space>
        </Card>

        {/* パターン4: アクション付きリスト */}
        <Card
          title={
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 16 }}>
                パターン4: アクション付きリスト
              </Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                用途: 管理画面、操作可能なアイテムリスト
              </Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>仕様:</Text>
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>高さ: 64px</li>
                <li>構成: コンテンツ（左） + アクションボタン（右）</li>
                <li>ボタンタイプ: link または text</li>
                <li>ボタンサイズ: small</li>
              </ul>
            </div>

            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <List
                bordered
                dataSource={showEmpty ? [] : actionData}
                locale={{ emptyText: <Empty description="データがありません" /> }}
                renderItem={(item) => (
                  <List.Item
                    onClick={() => handleClick(item.id)}
                    actions={[
                      <Button
                        key="view"
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('View', item.id);
                        }}
                      >
                        表示
                      </Button>,
                      <Button
                        key="edit"
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Edit', item.id);
                        }}
                      >
                        編集
                      </Button>,
                      <Button
                        key="delete"
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Delete', item.id);
                        }}
                      >
                        削除
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={<Text strong>{item.name}</Text>}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.description}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
                style={{
                  borderRadius: token.borderRadiusLG,
                  maxHeight: '600px',
                  overflow: 'auto',
                }}
              />
            )}
          </Space>
        </Card>

        {/* パターン5: ステータス付きリスト */}
        <Card
          title={
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 16 }}>
                パターン5: ステータス付きリスト
              </Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                用途: タスクリスト、承認フロー、進捗管理
              </Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>仕様:</Text>
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>高さ: 72px（可変）</li>
                <li>構成: アバター（左） + コンテンツ（中央） + ステータス（右）</li>
                <li>ステータス: Badge または Tag コンポーネント</li>
              </ul>
            </div>

            {loading ? (
              <Skeleton active avatar paragraph={{ rows: 4 }} />
            ) : (
              <List
                bordered
                dataSource={showEmpty ? [] : statusData}
                locale={{ emptyText: <Empty description="データがありません" /> }}
                renderItem={(item) => (
                  <List.Item
                    style={listItemStyle(item.id)}
                    onClick={() => handleClick(item.id)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{
                            backgroundColor: token.colorPrimary,
                          }}
                        >
                          {item.avatar}
                        </Avatar>
                      }
                      title={<Text strong>{item.name}</Text>}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.description}
                        </Text>
                      }
                    />
                    <Badge
                      status={item.status as 'success' | 'processing' | 'default' | 'error' | 'warning'}
                      text={item.statusText}
                    />
                  </List.Item>
                )}
                style={{
                  borderRadius: token.borderRadiusLG,
                  maxHeight: '600px',
                  overflow: 'auto',
                }}
              />
            )}
          </Space>
        </Card>

        {/* ベストプラクティス */}
        <Card title="ベストプラクティス">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ color: token.colorSuccess }}>
                ✅ DO（推奨）
              </Text>
              <ul style={{ marginTop: 8 }}>
                <li>リスト項目は均一な高さを保つ</li>
                <li>ホバー時の視覚フィードバックを提供する</li>
                <li>スクロール可能な場合は最大高さを設定する</li>
                <li>空状態を適切に表示する</li>
                <li>ローディング状態を適切に表示する</li>
              </ul>
            </div>

            <div>
              <Text strong style={{ color: token.colorError }}>
                ❌ DON&apos;T（非推奨）
              </Text>
              <ul style={{ marginTop: 8 }}>
                <li>項目高さを不均一にする（可読性低下）</li>
                <li>テキストを切り詰めすぎる（情報不足）</li>
                <li>アクションボタンを過剰に配置する（混乱）</li>
                <li>色を過度に使用する（視覚的ノイズ）</li>
              </ul>
            </div>
          </Space>
        </Card>

        {/* 実装コード例 */}
        <Card title="実装コード例">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>パターン1: シンプルリスト</Text>
              <pre
                style={{
                  backgroundColor: token.colorBgLayout,
                  padding: 16,
                  borderRadius: token.borderRadius,
                  overflow: 'auto',
                }}
              >
                {`<List
  bordered
  dataSource={data}
  renderItem={(item) => (
    <List.Item>{item.name}</List.Item>
  )}
/>`}
              </pre>
            </div>

            <div>
              <Text strong>パターン3: 説明付きリスト</Text>
              <pre
                style={{
                  backgroundColor: token.colorBgLayout,
                  padding: 16,
                  borderRadius: token.borderRadius,
                  overflow: 'auto',
                }}
              >
                {`<List
  bordered
  dataSource={data}
  renderItem={(item) => (
    <List.Item>
      <List.Item.Meta
        title={item.name}
        description={item.description}
      />
    </List.Item>
  )}
/>`}
              </pre>
            </div>

            <div>
              <Text strong>パターン4: アクション付きリスト</Text>
              <pre
                style={{
                  backgroundColor: token.colorBgLayout,
                  padding: 16,
                  borderRadius: token.borderRadius,
                  overflow: 'auto',
                }}
              >
                {`<List
  bordered
  dataSource={data}
  renderItem={(item) => (
    <List.Item
      actions={[
        <Button type="link" size="small">編集</Button>,
        <Button type="link" size="small" danger>削除</Button>
      ]}
    >
      <List.Item.Meta title={item.name} />
    </List.Item>
  )}
/>`}
              </pre>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default ListPatternsDemo;

'use client';

import React, { useState } from 'react';
import { Layout, Card, Space, Typography, Tag, Button, Table, Form, Input, Row, Col, Tabs, message } from 'antd';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  UserOutlined,
  SaveOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Header from '@/components/common/Header';
import SubHeader from '@/components/common/SubHeader';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/**
 * レイアウト形状ポリシーのテスト画面
 * 
 * 標準3パターン + メインコンテンツ4パターンを表示:
 * 1. 2段ヘッダー + メインコンテンツ
 * 2. 1段ヘッダー + メインコンテンツ
 * 3. ヘッダーなし（フルスクリーン）
 * 
 * メインコンテンツ:
 * A. カード中心レイアウト
 * B. テーブル中心レイアウト
 * C. フォーム中心レイアウト
 * D. 2カラムレイアウト
 */
export default function LayoutPatternsDemo() {
  const [selectedPattern, setSelectedPattern] = useState<'pattern1' | 'pattern2' | 'pattern3'>('pattern1');
  const [contentPattern, setContentPattern] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [activeTab, setActiveTab] = useState('list');

  // モックユーザーデータ
  const mockUser = {
    id: '1',
    username: 'demo_user',
    displayName: 'デモユーザー',
    email: 'demo@example.com',
    role: 'system_admin',
    organizationId: '1',
    organizationName: 'デモ組織',
    isActive: true,
  };

  // テーブルデータ
  const tableData = [
    { key: '1', name: 'プロジェクトA', status: '進行中', date: '2024-01-15', manager: '山田太郎' },
    { key: '2', name: 'プロジェクトB', status: '完了', date: '2024-02-20', manager: '佐藤花子' },
    { key: '3', name: 'プロジェクトC', status: '計画中', date: '2024-03-10', manager: '鈴木一郎' },
  ];

  const tableColumns = [
    { title: 'プロジェクト名', dataIndex: 'name', key: 'name' },
    { title: 'ステータス', dataIndex: 'status', key: 'status' },
    { title: '日付', dataIndex: 'date', key: 'date' },
    { title: '担当者', dataIndex: 'manager', key: 'manager' },
  ];

  // パターンA: カード中心レイアウト
  const renderCardLayout = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="統計情報">
        <Row gutter={16}>
          <Col span={8}>
            <Card style={{ textAlign: 'center', backgroundColor: '#e6f7ff' }}>
              <Title level={2} style={{ margin: 0 }}>42</Title>
              <Text type="secondary">総プロジェクト数</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ textAlign: 'center', backgroundColor: '#f6ffed' }}>
              <Title level={2} style={{ margin: 0 }}>15</Title>
              <Text type="secondary">進行中</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ textAlign: 'center', backgroundColor: '#fff7e6' }}>
              <Title level={2} style={{ margin: 0 }}>27</Title>
              <Text type="secondary">完了</Text>
            </Card>
          </Col>
        </Row>
      </Card>
      
      <Card title="グラフ">
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
          <Text type="secondary">グラフエリア（仮）</Text>
        </div>
      </Card>
    </Space>
  );

  // パターンB: テーブル中心レイアウト
  const renderTableLayout = () => (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 検索フィルタ */}
        <Space>
          <Input.Search placeholder="検索" style={{ width: 250 }} />
          <Button>フィルタ</Button>
          <Button type="primary">新規作成</Button>
        </Space>
        
        {/* テーブル */}
        <Table columns={tableColumns} dataSource={tableData} pagination={{ pageSize: 10 }} />
      </Space>
    </Card>
  );

  // パターンC: フォーム中心レイアウト
  const renderFormLayout = () => (
    <Card title="プロジェクト登録">
      <Form layout="vertical">
        <Form.Item label="プロジェクト名" required>
          <Input placeholder="プロジェクト名を入力" />
        </Form.Item>
        
        <Form.Item label="概要">
          <Input.TextArea rows={4} placeholder="プロジェクトの概要を入力" />
        </Form.Item>
        
        <Form.Item label="担当者" required>
          <Input placeholder="担当者名を入力" />
        </Form.Item>
        
        <Form.Item label="期日">
          <Input type="date" />
        </Form.Item>
        
        {/* アクションボタン */}
        <Space>
          <Button type="primary" icon={<SaveOutlined />}>保存</Button>
          <Button>キャンセル</Button>
        </Space>
      </Form>
    </Card>
  );

  // パターンD: 2カラムレイアウト
  const renderTwoColumnLayout = () => (
    <Row gutter={24}>
      <Col span={16}>
        <Card title="詳細情報">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>プロジェクト名:</Text> プロジェクトA
            </div>
            <div>
              <Text strong>ステータス:</Text> <Tag color="blue">進行中</Tag>
            </div>
            <div>
              <Text strong>開始日:</Text> 2024-01-15
            </div>
            <div>
              <Text strong>担当者:</Text> 山田太郎
            </div>
            <div>
              <Text strong>概要:</Text>
              <Paragraph>
                このプロジェクトは、新しいシステムの開発を目的としています。
                現在、要件定義フェーズが完了し、設計フェーズに入っています。
              </Paragraph>
            </div>
          </Space>
        </Card>
      </Col>
      <Col span={8}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card title="関連情報" size="small">
            <Space direction="vertical" size="small">
              <Text>• 関連ドキュメント: 5件</Text>
              <Text>• タスク数: 12件</Text>
              <Text>• 完了率: 75%</Text>
            </Space>
          </Card>
          
          <Card title="最近の活動" size="small">
            <Space direction="vertical" size="small">
              <Text type="secondary">2024-03-10: タスク更新</Text>
              <Text type="secondary">2024-03-08: ドキュメント追加</Text>
              <Text type="secondary">2024-03-05: コメント投稿</Text>
            </Space>
          </Card>
        </Space>
      </Col>
    </Row>
  );

  // メインコンテンツのレンダリング
  const renderMainContent = () => {
    switch (contentPattern) {
      case 'A':
        return renderCardLayout();
      case 'B':
        return renderTableLayout();
      case 'C':
        return renderFormLayout();
      case 'D':
        return renderTwoColumnLayout();
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#fafafa' }}>
      <Title level={2}>ページレイアウト形状ポリシー - 全パターンテスト画面</Title>
      <Paragraph>
        標準3パターンのレイアウトとメインコンテンツの4パターンをテストできます。
      </Paragraph>

      {/* パターン選択UI */}
      <Card title="レイアウトパターン選択" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>1. レイアウトパターンを選択:</Text>
            <Space wrap>
              <Button
                type={selectedPattern === 'pattern1' ? 'primary' : 'default'}
                onClick={() => setSelectedPattern('pattern1')}
              >
                パターン1: 2段ヘッダー + メイン
              </Button>
              <Button
                type={selectedPattern === 'pattern2' ? 'primary' : 'default'}
                onClick={() => setSelectedPattern('pattern2')}
              >
                パターン2: 1段ヘッダー + メイン
              </Button>
              <Button
                type={selectedPattern === 'pattern3' ? 'primary' : 'default'}
                onClick={() => setSelectedPattern('pattern3')}
              >
                パターン3: ヘッダーなし
              </Button>
            </Space>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>2. メインコンテンツパターンを選択:</Text>
            <Space wrap>
              <Button
                type={contentPattern === 'A' ? 'primary' : 'default'}
                onClick={() => setContentPattern('A')}
              >
                パターンA: カード中心
              </Button>
              <Button
                type={contentPattern === 'B' ? 'primary' : 'default'}
                onClick={() => setContentPattern('B')}
              >
                パターンB: テーブル中心
              </Button>
              <Button
                type={contentPattern === 'C' ? 'primary' : 'default'}
                onClick={() => setContentPattern('C')}
              >
                パターンC: フォーム中心
              </Button>
              <Button
                type={contentPattern === 'D' ? 'primary' : 'default'}
                onClick={() => setContentPattern('D')}
              >
                パターンD: 2カラム
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      {/* プレビューエリア */}
      <Card title="プレビュー">
        <div style={{ border: '2px solid #d9d9d9', borderRadius: '8px', overflow: 'hidden' }}>
          {selectedPattern === 'pattern1' && (
            <Layout style={{ minHeight: '600px', backgroundColor: '#fff' }}>
              {/* Header（1段目） */}
              <div
                style={{
                  height: '64px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 50px',
                }}
              >
                <Title level={3} style={{ margin: 0, color: '#CF0027', fontSize: '24px' }}>
                  MaiML Viewer
                </Title>
                <Text type="secondary" style={{ flex: 1, marginLeft: '24px', fontSize: '16px' }}>
                  マルチモーダルデータプラットフォーム
                </Text>
                <Space>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 500 }}>デモユーザー</div>
                    <Text type="secondary">システム管理者 | デモ組織</Text>
                  </div>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#CF0027',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 600,
                    }}
                  >
                    デ
                  </div>
                </Space>
              </div>

              {/* SubHeader（2段目） */}
              <div
                style={{
                  height: '48px',
                  backgroundColor: '#0093CF',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 50px',
                }}
              >
                <Title level={4} style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: 600 }}>
                  プロジェクト管理
                </Title>
                <div style={{ flex: 1, marginLeft: '24px' }}>
                  <Space size="large">
                    <span
                      style={{
                        color: activeTab === 'list' ? 'white' : 'rgba(255,255,255,0.7)',
                        fontSize: '16px',
                        fontWeight: activeTab === 'list' ? 600 : 400,
                        cursor: 'pointer',
                        borderBottom: activeTab === 'list' ? '3px solid white' : 'none',
                        paddingBottom: '8px',
                      }}
                      onClick={() => setActiveTab('list')}
                    >
                      <UnorderedListOutlined /> 一覧
                    </span>
                    <span
                      style={{
                        color: activeTab === 'kanban' ? 'white' : 'rgba(255,255,255,0.7)',
                        fontSize: '16px',
                        fontWeight: activeTab === 'kanban' ? 600 : 400,
                        cursor: 'pointer',
                        borderBottom: activeTab === 'kanban' ? '3px solid white' : 'none',
                        paddingBottom: '8px',
                      }}
                      onClick={() => setActiveTab('kanban')}
                    >
                      <AppstoreOutlined /> カンバン
                    </span>
                  </Space>
                </div>
              </div>

              {/* メインコンテンツ */}
              <Content style={{ padding: '40px', backgroundColor: '#fafafa', minHeight: '488px' }}>
                {renderMainContent()}
              </Content>
            </Layout>
          )}

          {selectedPattern === 'pattern2' && (
            <Layout style={{ minHeight: '600px', backgroundColor: '#fff' }}>
              {/* Header（1段目）のみ */}
              <div
                style={{
                  height: '64px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 50px',
                }}
              >
                <Title level={3} style={{ margin: 0, color: '#CF0027', fontSize: '24px' }}>
                  MaiML Viewer
                </Title>
                <Text type="secondary" style={{ flex: 1, marginLeft: '24px', fontSize: '16px' }}>
                  マルチモーダルデータプラットフォーム
                </Text>
              </div>

              {/* メインコンテンツ */}
              <Content
                style={{
                  padding: '40px',
                  backgroundColor: '#fafafa',
                  minHeight: '536px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Card style={{ width: 400 }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Title level={3} style={{ textAlign: 'center', margin: 0 }}>
                      ログイン
                    </Title>
                    <Form layout="vertical">
                      <Form.Item label="ユーザー名">
                        <Input prefix={<UserOutlined />} placeholder="ユーザー名" size="large" />
                      </Form.Item>
                      <Form.Item label="パスワード">
                        <Input.Password placeholder="パスワード" size="large" />
                      </Form.Item>
                      <Button type="primary" size="large" block>
                        ログイン
                      </Button>
                    </Form>
                  </Space>
                </Card>
              </Content>
            </Layout>
          )}

          {selectedPattern === 'pattern3' && (
            <div
              style={{
                minHeight: '600px',
                backgroundColor: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
              }}
            >
              <Card style={{ maxWidth: 600, textAlign: 'center' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Title level={2}>メンテナンス中</Title>
                  <Paragraph>
                    現在、システムメンテナンスを実施しています。
                    <br />
                    しばらくお待ちください。
                  </Paragraph>
                  <Text type="secondary">予定終了時刻: 2024年12月25日 18:00</Text>
                </Space>
              </Card>
            </div>
          )}
        </div>
      </Card>

      {/* 仕様説明 */}
      <Title level={3} style={{ marginTop: '32px' }}>仕様説明</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* パターン1 */}
        <Card
          title={
            <Space>
              <Tag color="red">パターン1</Tag>
              <Text strong>2段ヘッダー + メインコンテンツ</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="small">
            <Text><strong>用途:</strong> 通常の業務画面、一覧画面、詳細画面</Text>
            <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>Header（1段目）:</strong> 高さ64px、白背景、固定</Text>
                <Text><strong>SubHeader（2段目）:</strong> 高さ48px、青背景（#0093CF）、固定</Text>
                <Text><strong>メインコンテンツ:</strong> margin-top 112px、背景 #fafafa</Text>
              </Space>
            </div>
          </Space>
        </Card>

        {/* パターン2 */}
        <Card
          title={
            <Space>
              <Tag color="blue">パターン2</Tag>
              <Text strong>1段ヘッダー + メインコンテンツ</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="small">
            <Text><strong>用途:</strong> ログイン画面、エラー画面、初期設定画面</Text>
            <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>Header（1段目）:</strong> 高さ64px、白背景、固定</Text>
                <Text><strong>メインコンテンツ:</strong> margin-top 64px、背景 #fafafa、中央配置</Text>
              </Space>
            </div>
          </Space>
        </Card>

        {/* パターン3 */}
        <Card
          title={
            <Space>
              <Tag color="green">パターン3</Tag>
              <Text strong>ヘッダーなし（フルスクリーン）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="small">
            <Text><strong>用途:</strong> モーダル内、メンテナンス画面、印刷プレビュー</Text>
            <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>メインコンテンツ:</strong> margin-top 0、100vh、中央配置</Text>
              </Space>
            </div>
          </Space>
        </Card>

        {/* メインコンテンツパターン */}
        <Card title="メインコンテンツの構成パターン">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="purple">パターンA</Tag>
              <Text strong> カード中心レイアウト</Text>
              <Text type="secondary" style={{ display: 'block', marginLeft: '24px' }}>
                用途: ダッシュボード、統計画面
              </Text>
            </div>
            <div>
              <Tag color="cyan">パターンB</Tag>
              <Text strong> テーブル中心レイアウト</Text>
              <Text type="secondary" style={{ display: 'block', marginLeft: '24px' }}>
                用途: 一覧画面、検索結果画面
              </Text>
            </div>
            <div>
              <Tag color="orange">パターンC</Tag>
              <Text strong> フォーム中心レイアウト</Text>
              <Text type="secondary" style={{ display: 'block', marginLeft: '24px' }}>
                用途: 登録画面、編集画面
              </Text>
            </div>
            <div>
              <Tag color="geekblue">パターンD</Tag>
              <Text strong> 2カラムレイアウト</Text>
              <Text type="secondary" style={{ display: 'block', marginLeft: '24px' }}>
                用途: 詳細画面、設定画面
              </Text>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}

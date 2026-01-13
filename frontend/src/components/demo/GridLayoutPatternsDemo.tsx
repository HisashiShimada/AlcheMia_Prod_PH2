'use client';

import React from 'react';
import { Row, Col, Card, Form, Input, Button, Menu, theme, Divider, Typography } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  SettingOutlined,
  FileOutlined,
  DatabaseOutlined,
  LockOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function GridLayoutPatternsDemo() {
  const { token } = theme.useToken();

  // パターン1: フォームレイアウト
  const renderFormLayout = () => (
    <Card title="パターン1: フォームレイアウト（2カラム）" style={{ marginBottom: 24 }}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        用途: データ入力フォーム、編集画面
      </Text>
      <Form layout="horizontal">
        <Row gutter={[16, 16]}>
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

          <Col xs={24} sm={24} md={24} lg={12} xl={12} xxl={12}>
            <Form.Item
              label="メールアドレス"
              name="email"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
            >
              <Input prefix={<MailOutlined />} placeholder="example@example.com" />
            </Form.Item>
          </Col>

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

          <Col xs={24} sm={24} md={24} lg={12} xl={12} xxl={12}>
            <Form.Item
              label="電話番号"
              name="phone"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
            >
              <Input prefix={<PhoneOutlined />} placeholder="03-1234-5678" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item wrapperCol={{ span: 24 }} style={{ textAlign: 'right', marginBottom: 0 }}>
              <Button type="default" style={{ marginRight: 8 }}>
                キャンセル
              </Button>
              <Button type="primary">
                登録
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Divider />
      <Text type="secondary" style={{ fontSize: 12 }}>
        <strong>仕様:</strong> Row gutter [16, 16] / Col lg={'{12}'} md={'{24}'} / Form.Item labelCol={'{8}'} wrapperCol={'{16}'}
      </Text>
    </Card>
  );

  // パターン2: カードグリッド（3-4カラム）
  const renderCardGrid = () => {
    const menuItems = [
      { title: 'ユーザー管理', icon: <UserOutlined />, description: 'ユーザーの登録・編集・削除' },
      { title: 'システム設定', icon: <SettingOutlined />, description: 'システムの各種設定' },
      { title: 'ファイル管理', icon: <FileOutlined />, description: 'ファイルのアップロード・管理' },
      { title: 'データベース', icon: <DatabaseOutlined />, description: 'データベースの管理' },
      { title: 'ホーム', icon: <HomeOutlined />, description: 'ホーム画面に戻る' },
      { title: 'セキュリティ', icon: <LockOutlined />, description: 'セキュリティ設定' },
    ];

    return (
      <Card title="パターン2: カードグリッド（3-4カラム）" style={{ marginBottom: 24 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          用途: メニュー画面、ダッシュボード、カード一覧
        </Text>
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
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12, color: token.colorPrimary }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                  {item.description}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Divider />
        <Text type="secondary" style={{ fontSize: 12 }}>
          <strong>仕様:</strong> Row gutter [24, 24] / Col xl={'{6}'} (4カラム) lg={'{8}'} (3カラム) md={'{12}'} (2カラム) xs={'{24}'} (1カラム)
        </Text>
      </Card>
    );
  };

  // パターン3: データ表示グリッド
  const renderDataGrid = () => {
    const profileData = [
      { label: 'ユーザーID', value: 'USR-001' },
      { label: '氏名', value: '山田 太郎' },
      { label: 'メールアドレス', value: 'yamada@example.com' },
      { label: '所属部署', value: '開発部' },
      { label: '役職', value: 'エンジニア' },
      { label: '入社日', value: '2020年4月1日' },
      { label: '勤続年数', value: '4年6ヶ月' },
      { label: 'ステータス', value: '在籍中' },
      { label: '最終ログイン', value: '2024-12-26 08:30' },
    ];

    const infoItemStyle = {
      padding: '12px 16px',
      background: token.colorBgContainer,
      borderRadius: token.borderRadius,
      border: `1px solid ${token.colorBorderSecondary}`,
      height: '100%',
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
      <Card title="パターン3: データ表示グリッド（情報表示）" style={{ marginBottom: 24 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          用途: 詳細情報表示、プロフィール画面
        </Text>
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

        <Divider />
        <Text type="secondary" style={{ fontSize: 12 }}>
          <strong>仕様:</strong> Row gutter [16, 16] / Col lg={'{8}'} (3カラム) md={'{12}'} (2カラム) xs={'{24}'} (1カラム)
        </Text>
      </Card>
    );
  };

  // パターン4: サイドバー付きレイアウト
  const renderSidebarLayout = () => (
    <Card title="パターン4: サイドバー付きレイアウト" style={{ marginBottom: 24 }}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        用途: 詳細画面、設定画面
      </Text>
      <Row gutter={24}>
        {/* サイドバー */}
        <Col xs={24} sm={24} md={8} lg={6} xl={6} xxl={6}>
          <Card
            title="ナビゲーション"
            size="small"
            style={{ background: token.colorBgLayout }}
          >
            <Menu
              mode="inline"
              defaultSelectedKeys={['1']}
              style={{ border: 'none', background: 'transparent' }}
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
                {
                  key: '4',
                  icon: <FileOutlined />,
                  label: 'ドキュメント',
                },
              ]}
            />
          </Card>
        </Col>

        {/* メインコンテンツ */}
        <Col xs={24} sm={24} md={16} lg={18} xl={18} xxl={18}>
          <Card title="基本情報" size="small">
            <div style={{ padding: '16px 0' }}>
              <Title level={5}>ユーザー情報の編集</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                ユーザーの基本情報を編集できます。変更後は保存ボタンを押してください。
              </Text>

              <Form layout="vertical">
                <Form.Item label="氏名" name="name">
                  <Input placeholder="山田 太郎" />
                </Form.Item>
                <Form.Item label="メールアドレス" name="email">
                  <Input placeholder="example@example.com" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary">保存</Button>
                  <Button style={{ marginLeft: 8 }}>キャンセル</Button>
                </Form.Item>
              </Form>
            </div>
          </Card>
        </Col>
      </Row>

      <Divider />
      <Text type="secondary" style={{ fontSize: 12 }}>
        <strong>仕様:</strong> Row gutter [24] / サイドバー Col lg={'{6}'} md={'{8}'} xs={'{24}'} / メインコンテンツ Col lg={'{18}'} md={'{16}'} xs={'{24}'}
      </Text>
    </Card>
  );

  // レスポンシブテスト
  const renderResponsiveTest = () => (
    <Card title="レスポンシブテスト" style={{ marginBottom: 24 }}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        ブラウザのウィンドウサイズを変更して、各パターンのレスポンシブ動作を確認してください。
      </Text>

      <div style={{ padding: '16px', background: token.colorBgLayout, borderRadius: token.borderRadius }}>
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Text strong>ブレークポイント一覧:</Text>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4} xxl={4}>
            <div style={{ padding: 8, background: token.colorBgContainer, borderRadius: token.borderRadius, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>xs (&lt;480px)</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4} xxl={4}>
            <div style={{ padding: 8, background: token.colorBgContainer, borderRadius: token.borderRadius, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>sm (&lt;576px)</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4} xxl={4}>
            <div style={{ padding: 8, background: token.colorBgContainer, borderRadius: token.borderRadius, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>md (&lt;768px)</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4} xxl={4}>
            <div style={{ padding: 8, background: token.colorBgContainer, borderRadius: token.borderRadius, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>lg (&lt;992px)</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4} xxl={4}>
            <div style={{ padding: 8, background: token.colorBgContainer, borderRadius: token.borderRadius, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>xl (&lt;1200px)</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4} xxl={4}>
            <div style={{ padding: 8, background: token.colorBgContainer, borderRadius: token.borderRadius, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>xxl (≥1600px)</Text>
            </div>
          </Col>
        </Row>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>グリッドレイアウトパターン</Title>
        <Text type="secondary">
          Ant Designの24カラムグリッドシステムを使用した標準レイアウトパターンのデモです。
        </Text>
      </div>

      {renderFormLayout()}
      {renderCardGrid()}
      {renderDataGrid()}
      {renderSidebarLayout()}
      {renderResponsiveTest()}
    </div>
  );
}

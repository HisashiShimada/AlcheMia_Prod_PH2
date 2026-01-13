'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Drawer, Form, Input, Select, Typography, Divider, Menu, theme, Descriptions, Tag } from 'antd';
import {
  SettingOutlined,
  InfoCircleOutlined,
  MenuOutlined,
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  TeamOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * サイドドロワーパターンのデモコンポーネント
 * 
 * 標準3パターン:
 * - パターン1: 標準サイドドロワー（右）- 幅378px
 * - パターン2: 詳細表示ドロワー（右）- 幅520px
 * - パターン3: ナビゲーションドロワー（左）- 幅256px
 */
const DrawerPatternsDemo: React.FC = () => {
  const { token } = theme.useToken();

  // パターン1: 標準サイドドロワー（右）
  const [pattern1Open, setPattern1Open] = useState(false);
  const [form1] = Form.useForm();

  // パターン2: 詳細表示ドロワー（右）
  const [pattern2Open, setPattern2Open] = useState(false);

  // パターン3: ナビゲーションドロワー（左）
  const [pattern3Open, setPattern3Open] = useState(false);

  // フォーム保存処理
  const handleSave = () => {
    form1.validateFields().then(values => {
      console.log('保存:', values);
      setPattern1Open(false);
      form1.resetFields();
    });
  };

  // メニューアイテム
  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'ホーム'
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'ユーザー管理'
    },
    {
      key: 'projects',
      icon: <FileTextOutlined />,
      label: 'プロジェクト'
    },
    {
      key: 'applications',
      icon: <AppstoreOutlined />,
      label: 'アプリケーション'
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: '分析'
    },
    {
      key: 'teams',
      icon: <TeamOutlined />,
      label: 'チーム'
    }
  ];

  // サンプルデータ
  const detailData = {
    id: 'PRJ-001',
    name: 'マテリアルインフォマティクスプロジェクト',
    status: 'active',
    owner: '山田太郎',
    created: '2024-01-15',
    updated: '2024-12-26',
    description: 'このプロジェクトは、機械学習を活用した新材料の探索と特性予測を目的としています。実験データの収集、解析、可視化を統合的に行います。',
    members: 15,
    experiments: 45,
    dataFiles: 230
  };

  return (
    <div style={{ padding: token.padding }}>
      <Title level={2}>サイドドロワーパターン</Title>
      <Paragraph>
        サイドドロワーは、補助的な情報表示や編集作業に使用するスライドパネルです。
        画面の左右から表示され、背景をマスクして焦点を当てます。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* パターン1: 標準サイドドロワー（右） */}
        <Card 
          title="パターン1: 標準サイドドロワー（右）"
          bordered={false}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途: </Text>
              <Text>フォーム編集・設定・プロパティ編集</Text>
            </div>
            <div>
              <Text strong>仕様: </Text>
              <Text>幅378px / 右配置 / フッター付き</Text>
            </div>
            
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => setPattern1Open(true)}
            >
              プロパティ編集を開く
            </Button>

            <Drawer
              title="プロパティ編集"
              placement="right"
              width={378}
              onClose={() => {
                setPattern1Open(false);
                form1.resetFields();
              }}
              open={pattern1Open}
              footer={
                <Space size="small" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button onClick={() => {
                    setPattern1Open(false);
                    form1.resetFields();
                  }}>
                    キャンセル
                  </Button>
                  <Button type="primary" onClick={handleSave}>
                    保存
                  </Button>
                </Space>
              }
            >
              <Form
                form={form1}
                layout="vertical"
                initialValues={{
                  projectName: '',
                  status: 'active',
                  description: ''
                }}
              >
                <Form.Item
                  label="プロジェクト名"
                  name="projectName"
                  rules={[{ required: true, message: 'プロジェクト名を入力してください' }]}
                >
                  <Input placeholder="プロジェクト名を入力" />
                </Form.Item>

                <Form.Item
                  label="ステータス"
                  name="status"
                  rules={[{ required: true, message: 'ステータスを選択してください' }]}
                >
                  <Select>
                    <Select.Option value="active">アクティブ</Select.Option>
                    <Select.Option value="pending">保留中</Select.Option>
                    <Select.Option value="completed">完了</Select.Option>
                    <Select.Option value="archived">アーカイブ</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="担当者"
                  name="owner"
                  rules={[{ required: true, message: '担当者を選択してください' }]}
                >
                  <Select placeholder="担当者を選択">
                    <Select.Option value="user1">山田太郎</Select.Option>
                    <Select.Option value="user2">佐藤花子</Select.Option>
                    <Select.Option value="user3">鈴木一郎</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="説明"
                  name="description"
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="プロジェクトの説明を入力"
                  />
                </Form.Item>

                <Form.Item
                  label="タグ"
                  name="tags"
                >
                  <Select mode="tags" placeholder="タグを追加">
                    <Select.Option value="材料">材料</Select.Option>
                    <Select.Option value="実験">実験</Select.Option>
                    <Select.Option value="解析">解析</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="優先度"
                  name="priority"
                >
                  <Select placeholder="優先度を選択">
                    <Select.Option value="high">高</Select.Option>
                    <Select.Option value="medium">中</Select.Option>
                    <Select.Option value="low">低</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
            </Drawer>
          </Space>
        </Card>

        {/* パターン2: 詳細表示ドロワー（右） */}
        <Card 
          title="パターン2: 詳細表示ドロワー（右）"
          bordered={false}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途: </Text>
              <Text>詳細情報表示・レビュー・プレビュー</Text>
            </div>
            <div>
              <Text strong>仕様: </Text>
              <Text>幅520px / 右配置 / フッター付き</Text>
            </div>
            
            <Button
              type="primary"
              icon={<InfoCircleOutlined />}
              onClick={() => setPattern2Open(true)}
            >
              詳細情報を表示
            </Button>

            <Drawer
              title="プロジェクト詳細"
              placement="right"
              width={520}
              onClose={() => setPattern2Open(false)}
              open={pattern2Open}
              footer={
                <Space size="small" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button onClick={() => setPattern2Open(false)}>
                    閉じる
                  </Button>
                  <Button type="primary" onClick={() => {
                    console.log('編集モードに切り替え');
                  }}>
                    編集
                  </Button>
                </Space>
              }
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* 基本情報 */}
                <div>
                  <Title level={4}>{detailData.name}</Title>
                  <Space>
                    <Tag color={detailData.status === 'active' ? 'green' : 'default'}>
                      {detailData.status === 'active' ? 'アクティブ' : 'その他'}
                    </Tag>
                    <Text type="secondary">ID: {detailData.id}</Text>
                  </Space>
                </div>

                <Divider />

                {/* 詳細情報 */}
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="担当者">
                    {detailData.owner}
                  </Descriptions.Item>
                  <Descriptions.Item label="作成日">
                    {detailData.created}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新日">
                    {detailData.updated}
                  </Descriptions.Item>
                  <Descriptions.Item label="メンバー数">
                    {detailData.members}名
                  </Descriptions.Item>
                  <Descriptions.Item label="実験数">
                    {detailData.experiments}件
                  </Descriptions.Item>
                  <Descriptions.Item label="データファイル">
                    {detailData.dataFiles}個
                  </Descriptions.Item>
                </Descriptions>

                <Divider />

                {/* 説明 */}
                <div>
                  <Title level={5}>プロジェクト説明</Title>
                  <Paragraph>
                    {detailData.description}
                  </Paragraph>
                </div>

                <Divider />

                {/* 統計情報 */}
                <div>
                  <Title level={5}>統計情報</Title>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>完了率</Text>
                      <Text strong>67%</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>進行中の実験</Text>
                      <Text strong>12件</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>完了した実験</Text>
                      <Text strong>30件</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>保留中の実験</Text>
                      <Text strong>3件</Text>
                    </div>
                  </Space>
                </div>
              </Space>
            </Drawer>
          </Space>
        </Card>

        {/* パターン3: ナビゲーションドロワー（左） */}
        <Card 
          title="パターン3: ナビゲーションドロワー（左）"
          bordered={false}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途: </Text>
              <Text>モバイルメニュー・サイドナビゲーション</Text>
            </div>
            <div>
              <Text strong>仕様: </Text>
              <Text>幅256px / 左配置 / フッターなし</Text>
            </div>
            
            <Button
              type="primary"
              icon={<MenuOutlined />}
              onClick={() => setPattern3Open(true)}
            >
              メニューを開く
            </Button>

            <Drawer
              title="メニュー"
              placement="left"
              width={256}
              onClose={() => setPattern3Open(false)}
              open={pattern3Open}
            >
              <Menu
                mode="inline"
                items={menuItems}
                onClick={(e) => {
                  console.log('選択されたメニュー:', e.key);
                  setPattern3Open(false);
                }}
              />
            </Drawer>
          </Space>
        </Card>

        {/* 仕様情報 */}
        <Card 
          title="共通仕様"
          bordered={false}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>背景色: </Text>
              <Text code>{token.colorBgElevated}</Text>
              <Text> (#ffffff)</Text>
            </div>
            <div>
              <Text strong>シャドウ: </Text>
              <Text>0 8px 24px rgba(0,0,0,0.16)</Text>
            </div>
            <div>
              <Text strong>マスク背景: </Text>
              <Text>rgba(0, 0, 0, 0.45)</Text>
            </div>
            <div>
              <Text strong>アニメーション: </Text>
              <Text>0.3s ease-in-out</Text>
            </div>
            <div>
              <Text strong>タイトル高さ: </Text>
              <Text>64px</Text>
            </div>
            <div>
              <Text strong>フッター高さ: </Text>
              <Text>64px</Text>
            </div>
            <div>
              <Text strong>コンテンツパディング: </Text>
              <Text>24px</Text>
            </div>
            <div>
              <Text strong>Zインデックス: </Text>
              <Text>1000（Drawer）/ 999（マスク）</Text>
            </div>

            <Divider />

            <div>
              <Title level={5}>レスポンシブ対応</Title>
              <Space direction="vertical" size="small">
                <Text>• モバイル（&lt; 768px）: パターン1・2は幅100%、パターン3は280px</Text>
                <Text>• タブレット（768px ～ 1024px）: パターン2は460px</Text>
                <Text>• デスクトップ（&gt; 1024px）: 標準幅を維持</Text>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={5}>アクセシビリティ</Title>
              <Space direction="vertical" size="small">
                <Text>• Escキー: ドロワーを閉じる</Text>
                <Text>• Tabキー: フォーカス移動（ドロワー内でループ）</Text>
                <Text>• role=&quot;dialog&quot;が自動設定</Text>
                <Text>• aria-modal=&quot;true&quot;でモーダル状態を示す</Text>
              </Space>
            </div>
          </Space>
        </Card>

        {/* ベストプラクティス */}
        <Card 
          title="ベストプラクティス"
          bordered={false}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5} style={{ color: token.colorSuccess }}>DO（推奨）</Title>
              <Space direction="vertical" size="small">
                <Text>✅ フォーム編集には標準サイドドロワー（378px）を使用する</Text>
                <Text>✅ 詳細情報表示には詳細表示ドロワー（520px）を使用する</Text>
                <Text>✅ フッターにアクションボタンを配置する</Text>
                <Text>✅ 閉じるボタンを常に表示する</Text>
                <Text>✅ マスククリックでドロワーを閉じる設定を維持する</Text>
                <Text>✅ Escキーでドロワーを閉じる設定を維持する</Text>
                <Text>✅ コンテンツが長い場合はスクロール可能にする</Text>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={5} style={{ color: token.colorError }}>DON'T（非推奨）</Title>
              <Space direction="vertical" size="small">
                <Text>❌ ドロワーを多段に重ねない（モーダルを使用）</Text>
                <Text>❌ ドロワー内でさらにドロワーを開かない</Text>
                <Text>❌ 幅を極端に大きくしない（736px以上は避ける）</Text>
                <Text>❌ フッターボタンを左寄せにしない（右寄せを推奨）</Text>
                <Text>❌ 上下配置（top/bottom）を使用しない</Text>
                <Text>❌ マスク背景を透明にしすぎない（視認性確保）</Text>
                <Text>❌ アニメーションを無効化しない</Text>
              </Space>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default DrawerPatternsDemo;

'use client';

import React, { useState } from 'react';
import {
  Popover,
  Button,
  Space,
  Card,
  Row,
  Col,
  List,
  Typography,
  Badge,
  Tag,
  Divider,
  Table,
  Avatar,
  theme,
  Input,
  Select,
} from 'antd';
import {
  InfoCircleOutlined,
  FileOutlined,
  DeleteOutlined,
  UserOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  DownloadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SettingOutlined,
  BellOutlined,
  StarOutlined,
} from '@ant-design/icons';

const { useToken } = theme;
const { Text, Title } = Typography;

/**
 * ポップオーバーパターンデモコンポーネント
 * 
 * 4つの標準パターンと各種使用例を表示
 */
export default function PopoverPatternsDemo() {
  const { token } = useToken();
  const [visible1, setVisible1] = useState(false);
  const [visible2, setVisible2] = useState(false);

  // パターン1: シンプルなテキスト表示
  const pattern1Content = (
    <div style={{ maxWidth: 280 }}>
      このデータは最終更新日時に自動的に同期されます。
      同期間隔は設定画面で変更できます。
    </div>
  );

  const pattern1WithTitle = (
    <div style={{ maxWidth: 280 }}>
      <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 16 }}>
        自動同期機能
      </div>
      このデータは最終更新日時に自動的に同期されます。
      同期間隔は設定画面で変更できます。
    </div>
  );

  // パターン2: データラベル＋値の表示
  const pattern2FileInfo = (
    <div style={{ minWidth: 280 }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
        ファイル情報
      </div>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>ファイル名:</Col>
          <Col span={14}>experiment_001.maiml</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>サイズ:</Col>
          <Col span={14}>2.4 MB</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>更新日時:</Col>
          <Col span={14}>2024-12-26 15:30</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>作成者:</Col>
          <Col span={14}>山田太郎</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>ステータス:</Col>
          <Col span={14}>
            <Tag color="success" icon={<CheckCircleOutlined />}>完了</Tag>
          </Col>
        </Row>
      </Space>
    </div>
  );

  const pattern2UserInfo = (
    <div style={{ minWidth: 280 }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
        ユーザー詳細
      </div>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>名前:</Col>
          <Col span={14}>山田太郎</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>役割:</Col>
          <Col span={14}>実験管理者</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>部署:</Col>
          <Col span={14}>材料科学部</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>メール:</Col>
          <Col span={14}>yamada@example.com</Col>
        </Row>
        <Row>
          <Col span={10} style={{ color: token.colorTextSecondary }}>最終ログイン:</Col>
          <Col span={14}>2024-12-26 14:25</Col>
        </Row>
      </Space>
    </div>
  );

  // パターン3: リスト表示
  const relatedFiles = [
    { id: 1, name: 'experiment_001.maiml', size: '2.4 MB' },
    { id: 2, name: 'experiment_002.maiml', size: '1.8 MB' },
    { id: 3, name: 'experiment_003.maiml', size: '3.1 MB' },
    { id: 4, name: 'analysis_result.csv', size: '854 KB' },
    { id: 5, name: 'sample_data.xlsx', size: '1.2 MB' },
  ];

  const pattern3FileList = (
    <div style={{ maxWidth: 360, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
        関連ファイル（5件）
      </div>
      <List
        size="small"
        dataSource={relatedFiles}
        renderItem={(item) => (
          <List.Item
            style={{
              padding: '8px 0',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Space>
              <FileOutlined style={{ color: token.colorTextSecondary }} />
              <div>
                <div>{item.name}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.size}
                </Text>
              </div>
            </Space>
          </List.Item>
        )}
      />
    </div>
  );

  const historyData = [
    { id: 1, action: '実験データを更新', user: '山田太郎', time: '15:30' },
    { id: 2, action: 'ファイルをアップロード', user: '佐藤花子', time: '14:20' },
    { id: 3, action: 'プロジェクトを作成', user: '田中一郎', time: '13:10' },
    { id: 4, action: 'メンバーを追加', user: '鈴木次郎', time: '12:00' },
  ];

  const pattern3HistoryList = (
    <div style={{ maxWidth: 360, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
        最近のアクティビティ
      </div>
      <List
        size="small"
        dataSource={historyData}
        renderItem={(item) => (
          <List.Item
            style={{
              padding: '8px 0',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div>{item.action}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.user} · {item.time}
              </Text>
            </Space>
          </List.Item>
        )}
      />
    </div>
  );

  // パターン4: アクション付き表示
  const pattern4DeleteAction = (
    <div style={{ width: 280 }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
        データの削除
      </div>
      <div style={{ marginBottom: 16 }}>
        このデータを削除してもよろしいですか？この操作は取り消せません。
      </div>
      <div
        style={{
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          paddingTop: 12,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        <Button size="small" onClick={() => setVisible1(false)}>
          キャンセル
        </Button>
        <Button
          size="small"
          type="primary"
          danger
          onClick={() => {
            setVisible1(false);
            // 削除処理
          }}
        >
          削除
        </Button>
      </div>
    </div>
  );

  const pattern4EditAction = (
    <div style={{ width: 280 }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
        クイック編集
      </div>
      <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 16 }}>
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: token.colorTextSecondary }}>
            タイトル
          </div>
          <Input size="small" defaultValue="実験データ" />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: token.colorTextSecondary }}>
            ステータス
          </div>
          <Select
            size="small"
            defaultValue="progress"
            style={{ width: '100%' }}
            options={[
              { value: 'progress', label: '進行中' },
              { value: 'completed', label: '完了' },
              { value: 'pending', label: '保留' },
            ]}
          />
        </div>
      </Space>
      <div
        style={{
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          paddingTop: 12,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        <Button size="small" onClick={() => setVisible2(false)}>
          キャンセル
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={() => {
            setVisible2(false);
            // 保存処理
          }}
        >
          保存
        </Button>
      </div>
    </div>
  );

  // 配置パターンのデモ用コンテンツ
  const placementContent = (
    <div style={{ maxWidth: 200 }}>
      この位置にポップオーバーが表示されます。
    </div>
  );

  // テーブルデモ用データ
  const tableData = [
    {
      key: '1',
      name: 'experiment_001.maiml',
      size: '2.4 MB',
      date: '2024-12-26',
      status: 'completed',
    },
    {
      key: '2',
      name: 'experiment_002.maiml',
      size: '1.8 MB',
      date: '2024-12-25',
      status: 'progress',
    },
    {
      key: '3',
      name: 'experiment_003.maiml',
      size: '3.1 MB',
      date: '2024-12-24',
      status: 'pending',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>ポップオーバー表示パターン</Title>
      <Text type="secondary">
        データの詳細情報や追加コンテキストを表示するための4つの標準パターン
      </Text>

      <Divider />

      {/* パターン1: シンプルなテキスト表示 */}
      <Card
        title="パターン1: シンプルなテキスト表示"
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>タイトルなし</Title>
            <Space>
              <Popover content={pattern1Content}>
                <Button icon={<InfoCircleOutlined />} type="text">
                  情報を表示
                </Button>
              </Popover>
              <Popover content={pattern1Content} trigger="click">
                <Button icon={<InfoCircleOutlined />}>
                  クリックで表示
                </Button>
              </Popover>
            </Space>
          </div>

          <div>
            <Title level={5}>タイトルあり</Title>
            <Space>
              <Popover content={pattern1WithTitle}>
                <Button icon={<SettingOutlined />} type="text">
                  設定情報
                </Button>
              </Popover>
              <Popover content={pattern1WithTitle}>
                <InfoCircleOutlined
                  style={{
                    fontSize: 18,
                    color: token.colorPrimary,
                    cursor: 'pointer',
                  }}
                />
              </Popover>
            </Space>
          </div>

          <div>
            <Title level={5}>警告メッセージ</Title>
            <Popover
              content={
                <div style={{ maxWidth: 280 }}>
                  <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 16 }}>
                    <WarningOutlined style={{ color: token.colorWarning, marginRight: 8 }} />
                    注意事項
                  </div>
                  このデータを変更すると、関連する実験結果にも影響を及ぼします。
                </div>
              }
            >
              <Button icon={<WarningOutlined />} type="text" style={{ color: token.colorWarning }}>
                注意事項を確認
              </Button>
            </Popover>
          </div>
        </Space>
      </Card>

      {/* パターン2: データラベル＋値の表示 */}
      <Card
        title="パターン2: データラベル＋値の表示"
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>ファイル情報の表示</Title>
            <Space>
              <Popover content={pattern2FileInfo} placement="rightTop">
                <Button icon={<FileOutlined />} type="text">
                  experiment_001.maiml
                </Button>
              </Popover>
              <Popover content={pattern2FileInfo} trigger="click">
                <Button icon={<EyeOutlined />}>詳細を表示</Button>
              </Popover>
            </Space>
          </div>

          <div>
            <Title level={5}>ユーザー情報の表示</Title>
            <Space>
              <Popover content={pattern2UserInfo} placement="right">
                <Avatar
                  icon={<UserOutlined />}
                  style={{ cursor: 'pointer', backgroundColor: token.colorPrimary }}
                />
              </Popover>
              <Popover content={pattern2UserInfo}>
                <Button icon={<UserOutlined />} type="text">
                  山田太郎
                </Button>
              </Popover>
            </Space>
          </div>

          <div>
            <Title level={5}>テーブル内での使用例</Title>
            <Table
              dataSource={tableData}
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'ファイル名',
                  dataIndex: 'name',
                  key: 'name',
                  render: (text) => (
                    <Popover content={pattern2FileInfo} placement="rightTop">
                      <Button type="link" icon={<FileOutlined />}>
                        {text}
                      </Button>
                    </Popover>
                  ),
                },
                {
                  title: 'サイズ',
                  dataIndex: 'size',
                  key: 'size',
                  width: 120,
                },
                {
                  title: '更新日',
                  dataIndex: 'date',
                  key: 'date',
                  width: 120,
                },
                {
                  title: 'ステータス',
                  dataIndex: 'status',
                  key: 'status',
                  width: 100,
                  render: (status) => {
                    const statusMap = {
                      completed: { color: 'success', text: '完了' },
                      progress: { color: 'processing', text: '進行中' },
                      pending: { color: 'default', text: '保留' },
                    };
                    const { color, text } = statusMap[status as keyof typeof statusMap];
                    return <Tag color={color}>{text}</Tag>;
                  },
                },
              ]}
            />
          </div>
        </Space>
      </Card>

      {/* パターン3: リスト表示 */}
      <Card
        title="パターン3: リスト表示"
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>関連ファイル一覧</Title>
            <Space>
              <Popover content={pattern3FileList} placement="bottomLeft">
                <Badge count={5}>
                  <Button icon={<FolderOutlined />} type="text">
                    関連ファイル
                  </Button>
                </Badge>
              </Popover>
              <Popover content={pattern3FileList} trigger="click">
                <Button icon={<FileOutlined />}>
                  ファイル一覧を表示
                </Button>
              </Popover>
            </Space>
          </div>

          <div>
            <Title level={5}>アクティビティ履歴</Title>
            <Space>
              <Popover content={pattern3HistoryList} placement="bottomLeft">
                <Button icon={<ClockCircleOutlined />} type="text">
                  最近のアクティビティ
                </Button>
              </Popover>
              <Popover content={pattern3HistoryList} trigger="click">
                <Badge dot>
                  <BellOutlined
                    style={{
                      fontSize: 20,
                      color: token.colorTextSecondary,
                      cursor: 'pointer',
                    }}
                  />
                </Badge>
              </Popover>
            </Space>
          </div>
        </Space>
      </Card>

      {/* パターン4: アクション付き表示 */}
      <Card
        title="パターン4: アクション付き表示"
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>削除確認</Title>
            <Popover
              content={pattern4DeleteAction}
              trigger="click"
              open={visible1}
              onOpenChange={setVisible1}
            >
              <Button icon={<DeleteOutlined />} danger type="text">
                データを削除
              </Button>
            </Popover>
          </div>

          <div>
            <Title level={5}>クイック編集</Title>
            <Popover
              content={pattern4EditAction}
              trigger="click"
              open={visible2}
              onOpenChange={setVisible2}
            >
              <Button icon={<EditOutlined />}>
                編集
              </Button>
            </Popover>
          </div>

          <div>
            <Title level={5}>複数アクション</Title>
            <Popover
              content={
                <div style={{ width: 200 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      block
                      style={{ textAlign: 'left' }}
                    >
                      表示
                    </Button>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      block
                      style={{ textAlign: 'left' }}
                    >
                      編集
                    </Button>
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      block
                      style={{ textAlign: 'left' }}
                    >
                      ダウンロード
                    </Button>
                    <Divider style={{ margin: '8px 0' }} />
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      danger
                      block
                      style={{ textAlign: 'left' }}
                    >
                      削除
                    </Button>
                  </Space>
                </div>
              }
              trigger="click"
            >
              <Button>アクション</Button>
            </Popover>
          </div>
        </Space>
      </Card>

      {/* 配置パターン */}
      <Card
        title="配置パターン（placement）"
        style={{ marginBottom: 24 }}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Space direction="vertical" size="large" align="center">
            {/* 上部配置 */}
            <Space size="middle">
              <Popover content={placementContent} placement="topLeft">
                <Button>topLeft</Button>
              </Popover>
              <Popover content={placementContent} placement="top">
                <Button>top</Button>
              </Popover>
              <Popover content={placementContent} placement="topRight">
                <Button>topRight</Button>
              </Popover>
            </Space>

            {/* 中央配置 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: 500 }}>
              <Space direction="vertical" size="middle">
                <Popover content={placementContent} placement="leftTop">
                  <Button>leftTop</Button>
                </Popover>
                <Popover content={placementContent} placement="left">
                  <Button>left</Button>
                </Popover>
                <Popover content={placementContent} placement="leftBottom">
                  <Button>leftBottom</Button>
                </Popover>
              </Space>

              <Space direction="vertical" size="middle">
                <Popover content={placementContent} placement="rightTop">
                  <Button>rightTop</Button>
                </Popover>
                <Popover content={placementContent} placement="right">
                  <Button>right</Button>
                </Popover>
                <Popover content={placementContent} placement="rightBottom">
                  <Button>rightBottom</Button>
                </Popover>
              </Space>
            </div>

            {/* 下部配置 */}
            <Space size="middle">
              <Popover content={placementContent} placement="bottomLeft">
                <Button>bottomLeft</Button>
              </Popover>
              <Popover content={placementContent} placement="bottom">
                <Button>bottom</Button>
              </Popover>
              <Popover content={placementContent} placement="bottomRight">
                <Button>bottomRight</Button>
              </Popover>
            </Space>
          </Space>
        </div>
      </Card>

      {/* トリガー方式 */}
      <Card
        title="トリガー方式（trigger）"
        style={{ marginBottom: 24 }}
      >
        <Space size="large">
          <div>
            <Title level={5}>hover（デフォルト）</Title>
            <Popover content={<div style={{ maxWidth: 200 }}>ホバーで表示</div>}>
              <Button>ホバーで表示</Button>
            </Popover>
          </div>

          <div>
            <Title level={5}>click</Title>
            <Popover
              content={<div style={{ maxWidth: 200 }}>クリックで表示/非表示</div>}
              trigger="click"
            >
              <Button>クリックで表示</Button>
            </Popover>
          </div>

          <div>
            <Title level={5}>focus</Title>
            <Popover
              content={<div style={{ maxWidth: 200 }}>フォーカスで表示</div>}
              trigger="focus"
            >
              <Input placeholder="フォーカスで表示" style={{ width: 200 }} />
            </Popover>
          </div>
        </Space>
      </Card>

      {/* 実用例 */}
      <Card title="実用例" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>フォームのヘルプ</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Space>
                  <label>プロジェクト名</label>
                  <Popover
                    content={
                      <div style={{ maxWidth: 280 }}>
                        プロジェクト名は組織内で一意である必要があります。
                        英数字とハイフン、アンダースコアが使用できます。
                      </div>
                    }
                  >
                    <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
                  </Popover>
                </Space>
                <Input placeholder="project-name" style={{ width: 300, marginTop: 8 }} />
              </div>
            </Space>
          </div>

          <div>
            <Title level={5}>ステータスアイコン</Title>
            <Space size="large">
              <Popover
                content={
                  <div style={{ maxWidth: 200 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>完了</div>
                    すべての処理が正常に完了しました。
                  </div>
                }
              >
                <CheckCircleOutlined
                  style={{
                    fontSize: 24,
                    color: token.colorSuccess,
                    cursor: 'pointer',
                  }}
                />
              </Popover>

              <Popover
                content={
                  <div style={{ maxWidth: 200 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>警告</div>
                    いくつかの項目に問題があります。確認してください。
                  </div>
                }
              >
                <WarningOutlined
                  style={{
                    fontSize: 24,
                    color: token.colorWarning,
                    cursor: 'pointer',
                  }}
                />
              </Popover>
            </Space>
          </div>

          <div>
            <Title level={5}>お気に入り機能</Title>
            <Popover
              content={
                <div style={{ width: 200 }}>
                  <div style={{ marginBottom: 12, fontWeight: 600 }}>
                    お気に入りに追加
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    このプロジェクトをお気に入りに追加しますか？
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button size="small">キャンセル</Button>
                    <Button size="small" type="primary" icon={<StarOutlined />}>
                      追加
                    </Button>
                  </div>
                </div>
              }
              trigger="click"
            >
              <Button icon={<StarOutlined />} type="text">
                お気に入りに追加
              </Button>
            </Popover>
          </div>
        </Space>
      </Card>
    </div>
  );
}

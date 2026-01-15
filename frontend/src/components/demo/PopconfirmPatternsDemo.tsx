'use client';

import React, { useState } from 'react';
import {
  Card,
  Space,
  Button,
  Popconfirm,
  Typography,
  Divider,
  Row,
  Col,
  message,
  Table,
} from 'antd';
import {
  DeleteOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  EditOutlined,
  SaveOutlined,
  FileOutlined,
  UserDeleteOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * Popconfirm（ポップアップ確認）パターンデモコンポーネント
 * 
 * 全てのPopconfirmパターンを実装したデモページ
 */
export default function PopconfirmPatternsDemo() {
  const [messageApi, contextHolder] = message.useMessage();
  const [tableData, setTableData] = useState([
    { key: '1', name: 'データ1', status: '有効' },
    { key: '2', name: 'データ2', status: '有効' },
    { key: '3', name: 'データ3', status: '有効' },
  ]);

  // 削除ハンドラー
  const handleDelete = (record?: { key: string; name: string; status: string }) => {
    if (record) {
      setTableData(tableData.filter(item => item.key !== record.key));
      messageApi.success(`${record.name}を削除しました`);
    } else {
      messageApi.success('削除しました');
    }
  };

  // 実行ハンドラー
  const handleExecute = () => {
    messageApi.success('実行しました');
  };

  // 保存ハンドラー
  const handleSave = () => {
    messageApi.success('保存しました');
  };

  // 更新ハンドラー
  const handleUpdate = () => {
    messageApi.success('更新しました');
  };

  // キャンセルハンドラー
  const handleCancel = () => {
    messageApi.info('キャンセルしました');
  };

  // テーブルカラム定義
  const columns = [
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: { key: string; name: string; status: string }) => (
        <Space size="small">
          <Popconfirm
            title="削除してもよろしいですか？"
            description="この操作は取り消せません。"
            onConfirm={() => handleDelete(record)}
            onCancel={handleCancel}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      
      <Title level={2}>Popconfirm（ポップアップ確認）パターン</Title>
      <Paragraph>
        ユーザーの確認が必要な操作の前に表示される、軽量な確認ダイアログです。
      </Paragraph>

      {/* パターン1: 削除確認 */}
      <Card 
        title="パターン1: 削除確認" 
        style={{ marginBottom: 24 }}
      >
        <Paragraph>
          <Text strong>用途:</Text> 削除など危険なアクション前の確認
        </Paragraph>
        <Paragraph>
          <Text type="secondary">
            - アイコン: ExclamationCircleOutlined（警告）<br />
            - アイコン色: colorError (#d32f2f)<br />
            - 確定ボタン: type=&quot;primary&quot;, danger=true（赤色）<br />
            - 確定ボタンテキスト: &quot;削除&quot;
          </Text>
        </Paragraph>
        
        <Divider orientation="left" orientationMargin={0}>基本</Divider>
        <Space wrap size="middle">
          <Popconfirm
            title="削除してもよろしいですか？"
            description="この操作は取り消せません。"
            onConfirm={() => handleDelete()}
            onCancel={handleCancel}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              削除
            </Button>
          </Popconfirm>

          <Popconfirm
            title="ファイルを削除しますか？"
            description="削除されたファイルは復元できません。"
            onConfirm={() => handleDelete()}
            onCancel={handleCancel}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<FileOutlined />}>
              ファイル削除
            </Button>
          </Popconfirm>

          <Popconfirm
            title="ユーザーを削除しますか？"
            description="関連するすべてのデータも削除されます。"
            onConfirm={() => handleDelete()}
            onCancel={handleCancel}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<UserDeleteOutlined />}>
              ユーザー削除
            </Button>
          </Popconfirm>
        </Space>

        <Divider orientation="left" orientationMargin={0}>配置バリエーション</Divider>
        <Space wrap size="middle">
          <Popconfirm
            title="削除してもよろしいですか？"
            description="この操作は取り消せません。"
            placement="top"
            onConfirm={() => handleDelete()}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger>上部</Button>
          </Popconfirm>

          <Popconfirm
            title="削除してもよろしいですか？"
            description="この操作は取り消せません。"
            placement="topLeft"
            onConfirm={() => handleDelete()}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger>左上</Button>
          </Popconfirm>

          <Popconfirm
            title="削除してもよろしいですか？"
            description="この操作は取り消せません。"
            placement="topRight"
            onConfirm={() => handleDelete()}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger>右上</Button>
          </Popconfirm>

          <Popconfirm
            title="削除してもよろしいですか？"
            description="この操作は取り消せません。"
            placement="bottom"
            onConfirm={() => handleDelete()}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger>下部</Button>
          </Popconfirm>

          <Popconfirm
            title="削除してもよろしいですか？"
            description="この操作は取り消せません。"
            placement="bottomLeft"
            onConfirm={() => handleDelete()}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger>左下</Button>
          </Popconfirm>

          <Popconfirm
            title="削除してもよろしいですか？"
            description="この操作は取り消せません。"
            placement="bottomRight"
            onConfirm={() => handleDelete()}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button danger>右下</Button>
          </Popconfirm>
        </Space>

        <Divider orientation="left" orientationMargin={0}>テーブル内での使用例</Divider>
        <Table 
          columns={columns} 
          dataSource={tableData} 
          pagination={false}
          size="small"
        />
      </Card>

      {/* パターン2: 標準確認 */}
      <Card 
        title="パターン2: 標準確認" 
        style={{ marginBottom: 24 }}
      >
        <Paragraph>
          <Text strong>用途:</Text> 通常のアクション前の確認
        </Paragraph>
        <Paragraph>
          <Text type="secondary">
            - アイコン: QuestionCircleOutlined（疑問）<br />
            - アイコン色: colorPrimary (#CF0027)<br />
            - 確定ボタン: type=&quot;primary&quot;（青色）<br />
            - 確定ボタンテキスト: &quot;OK&quot; または &quot;実行&quot;
          </Text>
        </Paragraph>

        <Divider orientation="left" orientationMargin={0}>基本</Divider>
        <Space wrap size="middle">
          <Popconfirm
            title="実行してもよろしいですか？"
            description="この操作を実行します。"
            onConfirm={handleExecute}
            onCancel={handleCancel}
            okText="実行"
            cancelText="キャンセル"
            icon={<QuestionCircleOutlined style={{ color: '#CF0027' }} />}
          >
            <Button type="primary">
              実行
            </Button>
          </Popconfirm>

          <Popconfirm
            title="変更を保存しますか？"
            description="入力された内容が保存されます。"
            onConfirm={handleSave}
            onCancel={handleCancel}
            okText="保存"
            cancelText="キャンセル"
            icon={<QuestionCircleOutlined style={{ color: '#CF0027' }} />}
          >
            <Button type="primary" icon={<SaveOutlined />}>
              保存
            </Button>
          </Popconfirm>

          <Popconfirm
            title="編集を開始しますか？"
            description="この項目を編集モードにします。"
            onConfirm={handleExecute}
            onCancel={handleCancel}
            okText="編集"
            cancelText="キャンセル"
            icon={<QuestionCircleOutlined style={{ color: '#CF0027' }} />}
          >
            <Button icon={<EditOutlined />}>
              編集
            </Button>
          </Popconfirm>
        </Space>

        <Divider orientation="left" orientationMargin={0}>説明なし</Divider>
        <Space wrap size="middle">
          <Popconfirm
            title="実行してもよろしいですか？"
            onConfirm={handleExecute}
            onCancel={handleCancel}
            okText="OK"
            cancelText="キャンセル"
            icon={<QuestionCircleOutlined style={{ color: '#CF0027' }} />}
          >
            <Button type="primary">
              シンプル確認
            </Button>
          </Popconfirm>

          <Popconfirm
            title="続行しますか？"
            onConfirm={handleExecute}
            okText="続行"
            cancelText="キャンセル"
            icon={<QuestionCircleOutlined style={{ color: '#CF0027' }} />}
          >
            <Button>
              続行確認
            </Button>
          </Popconfirm>
        </Space>
      </Card>

      {/* パターン3: 情報確認 */}
      <Card 
        title="パターン3: 情報確認" 
        style={{ marginBottom: 24 }}
      >
        <Paragraph>
          <Text strong>用途:</Text> 情報提供を伴う確認
        </Paragraph>
        <Paragraph>
          <Text type="secondary">
            - アイコン: InfoCircleOutlined（情報）<br />
            - アイコン色: colorInfo (#0093CF)<br />
            - 確定ボタン: type=&quot;primary&quot;（青色）<br />
            - 確定ボタンテキスト: &quot;実行&quot;<br />
            - 説明: 推奨
          </Text>
        </Paragraph>

        <Divider orientation="left" orientationMargin={0}>基本</Divider>
        <Space wrap size="middle">
          <Popconfirm
            title="この操作について"
            description="この操作を実行すると、データが更新されます。よろしいですか？"
            onConfirm={handleUpdate}
            onCancel={handleCancel}
            okText="実行"
            cancelText="キャンセル"
            icon={<InfoCircleOutlined style={{ color: '#0093CF' }} />}
          >
            <Button type="primary">
              更新
            </Button>
          </Popconfirm>

          <Popconfirm
            title="データのエクスポート"
            description="現在のデータをCSVファイルとしてエクスポートします。"
            onConfirm={handleExecute}
            onCancel={handleCancel}
            okText="エクスポート"
            cancelText="キャンセル"
            icon={<InfoCircleOutlined style={{ color: '#0093CF' }} />}
          >
            <Button>
              エクスポート
            </Button>
          </Popconfirm>

          <Popconfirm
            title="設定のリセット"
            description="すべての設定がデフォルト値に戻ります。カスタマイズした内容は失われます。"
            onConfirm={handleExecute}
            onCancel={handleCancel}
            okText="リセット"
            cancelText="キャンセル"
            icon={<InfoCircleOutlined style={{ color: '#0093CF' }} />}
          >
            <Button>
              リセット
            </Button>
          </Popconfirm>
        </Space>

        <Divider orientation="left" orientationMargin={0}>長い説明文</Divider>
        <Space wrap size="middle">
          <Popconfirm
            title="重要な操作"
            description="この操作は複数のデータに影響を与えます。実行する前に、関連するすべてのデータをバックアップすることを推奨します。"
            onConfirm={handleExecute}
            onCancel={handleCancel}
            okText="実行"
            cancelText="キャンセル"
            icon={<InfoCircleOutlined style={{ color: '#0093CF' }} />}
          >
            <Button type="primary">
              一括更新
            </Button>
          </Popconfirm>
        </Space>
      </Card>

      {/* 組み合わせパターン */}
      <Card 
        title="組み合わせパターン" 
        style={{ marginBottom: 24 }}
      >
        <Paragraph>
          <Text strong>複数のPopconfirmを組み合わせた実用例</Text>
        </Paragraph>

        <Divider orientation="left" orientationMargin={0}>アクションボタングループ</Divider>
        <Space wrap size="middle">
          <Popconfirm
            title="変更を保存しますか？"
            onConfirm={handleSave}
            okText="保存"
            cancelText="キャンセル"
            icon={<QuestionCircleOutlined style={{ color: '#CF0027' }} />}
          >
            <Button type="primary" icon={<SaveOutlined />}>
              保存
            </Button>
          </Popconfirm>

          <Popconfirm
            title="変更を破棄しますか？"
            description="保存されていない変更は失われます。"
            onConfirm={() => handleDelete()}
            okText="破棄"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<CloseCircleOutlined />}>
              キャンセル
            </Button>
          </Popconfirm>
        </Space>

        <Divider orientation="left" orientationMargin={0}>状態に応じた確認</Divider>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small" title="下書き">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Popconfirm
                  title="公開してもよろしいですか？"
                  description="公開後は全ユーザーが閲覧可能になります。"
                  onConfirm={handleExecute}
                  okText="公開"
                  cancelText="キャンセル"
                  icon={<QuestionCircleOutlined style={{ color: '#CF0027' }} />}
                >
                  <Button type="primary" block>
                    公開
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="削除してもよろしいですか？"
                  onConfirm={() => handleDelete()}
                  okText="削除"
                  cancelText="キャンセル"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger block>
                    削除
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
          </Col>

          <Col span={8}>
            <Card size="small" title="公開中">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Popconfirm
                  title="非公開にしますか？"
                  description="非公開にすると、一般ユーザーは閲覧できなくなります。"
                  onConfirm={handleExecute}
                  okText="非公開にする"
                  cancelText="キャンセル"
                  icon={<QuestionCircleOutlined style={{ color: '#CF0027' }} />}
                >
                  <Button block>
                    非公開にする
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="削除してもよろしいですか？"
                  description="公開中のコンテンツを削除すると、ユーザーに影響があります。"
                  onConfirm={() => handleDelete()}
                  okText="削除"
                  cancelText="キャンセル"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger block>
                    削除
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
          </Col>

          <Col span={8}>
            <Card size="small" title="アーカイブ">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Popconfirm
                  title="復元しますか？"
                  description="アーカイブから復元し、再度編集可能にします。"
                  onConfirm={handleExecute}
                  okText="復元"
                  cancelText="キャンセル"
                  icon={<InfoCircleOutlined style={{ color: '#0093CF' }} />}
                >
                  <Button type="primary" block>
                    復元
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="完全に削除しますか？"
                  description="この操作は取り消せません。データは完全に削除されます。"
                  onConfirm={() => handleDelete()}
                  okText="完全削除"
                  cancelText="キャンセル"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger block>
                    完全削除
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 使用上の注意 */}
      <Card title="使用上の注意" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={5}>✅ 使用すべき場合</Title>
            <ul>
              <li>データを削除する前</li>
              <li>元に戻せない操作を実行する前</li>
              <li>重要な変更を保存する前</li>
              <li>ユーザーの意図を再確認したい時</li>
            </ul>
          </div>

          <div>
            <Title level={5}>❌ 使用すべきでない場合</Title>
            <ul>
              <li>頻繁に実行される操作</li>
              <li>明らかに安全な操作</li>
              <li>既にモーダルで確認している操作</li>
              <li>ユーザーがすぐに取り消せる操作</li>
            </ul>
          </div>

          <div>
            <Title level={5}>💡 ベストプラクティス</Title>
            <ul>
              <li>明確で簡潔なタイトルを使用する</li>
              <li>操作の影響を説明文で補足する（重要な操作の場合）</li>
              <li>確定ボタンのテキストは具体的なアクション名にする</li>
              <li>危険な操作には赤色のボタンを使用する</li>
              <li>長すぎる説明文は避ける（Modalを検討）</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  );
}

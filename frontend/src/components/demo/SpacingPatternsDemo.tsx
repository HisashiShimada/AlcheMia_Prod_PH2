'use client';

import React, { useState } from 'react';
import {
  Card,
  Space,
  Typography,
  Button,
  Input,
  Form,
  Select,
  Table,
  Row,
  Col,
  Divider,
  Tag,
  Alert,
  theme,
  Modal,
  Checkbox,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
  CloseOutlined,
  UploadOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

export default function SpacingPatternsDemo() {
  const { token } = useToken();
  const [modalOpen, setModalOpen] = useState(false);

  // テーブルデータ
  const tableData = [
    { key: '1', name: 'ユーザー1', email: 'user1@example.com', status: 'アクティブ' },
    { key: '2', name: 'ユーザー2', email: 'user2@example.com', status: 'アクティブ' },
    { key: '3', name: 'ユーザー3', email: 'user3@example.com', status: '非アクティブ' },
  ];

  const tableColumns = [
    { title: 'ID', dataIndex: 'key', key: 'key', width: 80 },
    { title: '名前', dataIndex: 'name', key: 'name' },
    { title: 'メールアドレス', dataIndex: 'email', key: 'email' },
    { title: 'ステータス', dataIndex: 'status', key: 'status' },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: () => (
        <Space size={8}>
          <Button size="small" icon={<EditOutlined />}>編集</Button>
          <Button size="small" type="link" icon={<EyeOutlined />}>詳細</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: token.colorBgLayout }}>
      <Space direction="vertical" size={32} style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Card>
          <Title level={2}>スペーシングパターン テストページ</Title>
          <Paragraph>
            このページでは、spacing_policy.mdに定義された全てのスペーシングパターンを視覚的に確認できます。
            各セクションは実際の使用例を示しています。
          </Paragraph>
        </Card>

        {/* パターン1: 密接な関係（8px） */}
        <Card title="パターン1: 密接な関係（8px）">
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <div>
              <Title level={4}>用途: 同一グループ内の密接に関連する要素</Title>
              <Paragraph>
                ラベルと入力フィールド、アイコンとテキスト、チェックボックスとラベル、フォーム内の連続する入力フィールド（縦方向）
              </Paragraph>
            </div>

            <Alert
              message="スペーシング値"
              description="8px (token.marginXS) / Space size='small'"
              type="info"
              showIcon
            />

            <Row gutter={[32, 16]}>
              {/* 例1: フォーム内の連続入力 */}
              <Col xs={24} lg={12}>
                <Card title="例1: フォーム内の連続入力フィールド" size="small">
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Input placeholder="ユーザー名" />
                    <Input placeholder="メールアドレス" />
                    <Input placeholder="電話番号" />
                  </Space>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="blue">Space size={8}</Tag>
                </Card>
              </Col>

              {/* 例2: アイコンとテキスト */}
              <Col xs={24} lg={12}>
                <Card title="例2: アイコンとテキストの間隔" size="small">
                  <Space direction="vertical" size={16}>
                    <Space size={8}>
                      <SearchOutlined style={{ fontSize: 14 }} />
                      <Text>検索</Text>
                    </Space>
                    <Space size={8}>
                      <PlusOutlined style={{ fontSize: 14 }} />
                      <Text>追加</Text>
                    </Space>
                    <Space size={8}>
                      <EditOutlined style={{ fontSize: 14 }} />
                      <Text>編集</Text>
                    </Space>
                  </Space>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="blue">Space size={8}</Tag>
                </Card>
              </Col>

              {/* 例3: チェックボックスとラベル */}
              <Col xs={24} lg={12}>
                <Card title="例3: チェックボックスとラベル" size="small">
                  <Space direction="vertical" size={8}>
                    <Checkbox>オプション1</Checkbox>
                    <Checkbox>オプション2</Checkbox>
                    <Checkbox>オプション3</Checkbox>
                  </Space>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="blue">Space size={8}</Tag>
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* パターン2: 関連する要素（16px） */}
        <Card title="パターン2: 関連する要素（16px）">
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <div>
              <Title level={4}>用途: 同一セクション内の関連する要素グループ</Title>
              <Paragraph>
                フォームグループ間、カード内のセクション間、ボタングループ内のボタン間（横方向）、テーブルと検索フィールド間
              </Paragraph>
            </div>

            <Alert
              message="スペーシング値"
              description="16px (token.margin) / Space size='middle'（デフォルト）"
              type="info"
              showIcon
            />

            <Row gutter={[32, 16]}>
              {/* 例1: フォームグループ間 */}
              <Col xs={24} lg={12}>
                <Card title="例1: フォームグループ間" size="small">
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    {/* グループ1 */}
                    <div>
                      <Text strong>基本情報</Text>
                      <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                        <Input placeholder="名前" />
                        <Input placeholder="メール" />
                      </Space>
                    </div>

                    {/* グループ2 */}
                    <div>
                      <Text strong>詳細情報</Text>
                      <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                        <Input placeholder="電話番号" />
                        <Input placeholder="住所" />
                      </Space>
                    </div>
                  </Space>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="green">Space size={16}</Tag>
                </Card>
              </Col>

              {/* 例2: テーブルと検索 */}
              <Col xs={24}>
                <Card title="例2: テーブルと検索フィールド間" size="small">
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Input.Search
                      placeholder="検索"
                      style={{ width: 250 }}
                      allowClear
                      prefix={<SearchOutlined />}
                    />
                    <Table
                      dataSource={tableData}
                      columns={tableColumns}
                      pagination={false}
                      size="small"
                    />
                  </Space>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="green">Space size={16}</Tag>
                </Card>
              </Col>

              {/* 例3: ボタングループ */}
              <Col xs={24} lg={12}>
                <Card title="例3: ボタングループ（横方向）" size="small">
                  <Space size={16}>
                    <Button icon={<UploadOutlined />}>CSVアップロード</Button>
                    <Button icon={<DownloadOutlined />}>CSVダウンロード</Button>
                    <Button type="primary" icon={<PlusOutlined />}>追加</Button>
                  </Space>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="green">Space size={16}</Tag>
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* パターン3: 明確に分離された要素（24px） */}
        <Card title="パターン3: 明確に分離された要素（24px）">
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <div>
              <Title level={4}>用途: 異なるセクション・機能グループの分離</Title>
              <Paragraph>
                ページ内の主要セクション間、カードコンポーネント間（縦方向）、タブコンテンツとタブバー間、テーブルとページネーション間
              </Paragraph>
            </div>

            <Alert
              message="スペーシング値"
              description="24px (token.marginLG) / Space size='large'"
              type="info"
              showIcon
            />

            <Row gutter={[32, 16]}>
              {/* 例1: カード間（縦方向） */}
              <Col xs={24}>
                <Card title="例1: カードコンポーネント間（縦方向）" size="small">
                  <Space direction="vertical" size={24} style={{ width: '100%' }}>
                    <Card size="small" style={{ background: token.colorBgLayout }}>
                      <Text>セクション1: ユーザー情報</Text>
                    </Card>
                    <Card size="small" style={{ background: token.colorBgLayout }}>
                      <Text>セクション2: アクティビティ</Text>
                    </Card>
                    <Card size="small" style={{ background: token.colorBgLayout }}>
                      <Text>セクション3: 設定</Text>
                    </Card>
                  </Space>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="orange">Space size={24}</Tag>
                </Card>
              </Col>

              {/* 例2: フォームとボタン */}
              <Col xs={24} lg={12}>
                <Card title="例2: フォームとアクションボタン間" size="small">
                  <Form layout="vertical">
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Form.Item label="ユーザー名">
                        <Input />
                      </Form.Item>
                      <Form.Item label="パスワード">
                        <Input.Password />
                      </Form.Item>
                    </Space>

                    <div style={{ marginTop: 24 }}>
                      <Space size={12}>
                        <Button type="primary">ログイン</Button>
                        <Button>キャンセル</Button>
                      </Space>
                    </div>
                  </Form>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="orange">marginTop: 24px</Tag>
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* パターン4: 大きく分離された要素（32px） */}
        <Card title="パターン4: 大きく分離された要素（32px）">
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <div>
              <Title level={4}>用途: 大きなコンテンツブロック間の分離</Title>
              <Paragraph>
                ページヘッダーとメインコンテンツ間、メインコンテンツとフッター間、モーダルヘッダーとボディ間、大きなカード間
              </Paragraph>
            </div>

            <Alert
              message="スペーシング値"
              description="32px (token.marginXL)"
              type="info"
              showIcon
            />

            <Row gutter={[32, 16]}>
              {/* 例1: ページ構造 */}
              <Col xs={24}>
                <Card title="例1: ページヘッダーとコンテンツ間" size="small">
                  <Space direction="vertical" size={32} style={{ width: '100%' }}>
                    <Card size="small" style={{ background: token.colorPrimaryBg }}>
                      <Text strong>ページヘッダー</Text>
                      <Paragraph style={{ margin: 0 }}>ページタイトルとブレッドクラム</Paragraph>
                    </Card>

                    <Card size="small" style={{ background: token.colorBgLayout }}>
                      <Text strong>メインコンテンツ</Text>
                      <Paragraph style={{ margin: 0 }}>実際のコンテンツエリア</Paragraph>
                    </Card>
                  </Space>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="red">Space size={32}</Tag>
                </Card>
              </Col>

              {/* 例2: モーダル構造を示すボタン */}
              <Col xs={24} lg={12}>
                <Card title="例2: モーダル構造（クリックで確認）" size="small">
                  <Button type="primary" onClick={() => setModalOpen(true)}>
                    モーダルを開く
                  </Button>
                  <Paragraph style={{ marginTop: 8 }}>
                    モーダルヘッダーとボディ間は32pxで分離されています
                  </Paragraph>
                  <Divider style={{ margin: '16px 0' }} />
                  <Tag color="red">modalBody marginTop: 32px</Tag>
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* コンテキスト別: カードレイアウト */}
        <Card title="コンテキスト別: カードレイアウト">
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Title level={4}>カード間スペーシング</Title>

            {/* グリッドレイアウト */}
            <div>
              <Text strong>グリッドレイアウト（Row gutter）</Text>
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={8}>
                  <Card size="small" title="カード1">
                    <Paragraph>水平16px、垂直16px</Paragraph>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card size="small" title="カード2">
                    <Paragraph>水平16px、垂直16px</Paragraph>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card size="small" title="カード3">
                    <Paragraph>水平16px、垂直16px</Paragraph>
                  </Card>
                </Col>
              </Row>
              <Tag color="blue" style={{ marginTop: 8 }}>gutter=[16, 16]</Tag>
            </div>

            <Divider />

            {/* 縦並び */}
            <div>
              <Text strong>縦並びレイアウト</Text>
              <Space direction="vertical" size={24} style={{ width: '100%', marginTop: 16 }}>
                <Card size="small" title="カード1">
                  <Paragraph>垂直24px</Paragraph>
                </Card>
                <Card size="small" title="カード2">
                  <Paragraph>垂直24px</Paragraph>
                </Card>
                <Card size="small" title="カード3">
                  <Paragraph>垂直24px</Paragraph>
                </Card>
              </Space>
              <Tag color="orange" style={{ marginTop: 8 }}>Space size={24}</Tag>
            </div>
          </Space>
        </Card>

        {/* コンテキスト別: ツールバー配置 */}
        <Card title="コンテキスト別: ツールバー配置">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Title level={4}>標準的なツールバー構成</Title>

            <Card size="small" style={{ background: token.colorBgLayout }}>
              <Space
                size="middle"
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <Space size={8}>
                  <Input.Search placeholder="検索" style={{ width: 250 }} allowClear />
                  <Button type="primary" icon={<SearchOutlined />}>
                    詳細検索
                  </Button>
                </Space>

                <Space size={8}>
                  <Button icon={<UploadOutlined />}>CSVアップロード</Button>
                  <Button icon={<DownloadOutlined />}>CSVダウンロード</Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{
                      backgroundColor: token.colorSuccess,
                      borderColor: token.colorSuccess,
                    }}
                  >
                    追加
                  </Button>
                  <Button icon={<ReloadOutlined />}>リロード</Button>
                </Space>
              </Space>
            </Card>

            <Alert
              message="ボタン間スペーシング"
              description="同一グループ内: 8px / グループ間: 16px（Space size='middle'）"
              type="success"
              showIcon
            />
          </Space>
        </Card>

        {/* レスポンシブスペーシング */}
        <Card title="レスポンシブスペーシング">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Title level={4}>画面サイズに応じた調整</Title>
            <Paragraph>
              ブレークポイント（xs, sm, md, lg, xl, xxl）に応じて、スペーシングを調整することが推奨されます。
            </Paragraph>

            <Alert
              message="推奨調整"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>モバイル（xs, sm）: 小さめのスペーシング（8px, 12px）</li>
                  <li>タブレット（md）: 標準スペーシング（16px）</li>
                  <li>デスクトップ（lg, xl, xxl）: 大きめのスペーシング（24px, 32px）</li>
                </ul>
              }
              type="warning"
              showIcon
            />
          </Space>
        </Card>

        {/* ベストプラクティス */}
        <Card title="ベストプラクティス">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="✅ DO（推奨）"
                headStyle={{ background: token.colorSuccessBg }}
              >
                <Space direction="vertical" size={8}>
                  <Text>• Spaceコンポーネントを優先的に使用する</Text>
                  <Text>• トークン値（token.marginXS等）を使用する</Text>
                  <Text>• 一貫性のある階層構造を保つ</Text>
                  <Text>• 8pxの倍数を使用する</Text>
                  <Text>• コンテキストに応じた適切な値を選択する</Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="❌ DON'T（非推奨）"
                headStyle={{ background: token.colorErrorBg }}
              >
                <Space direction="vertical" size={8}>
                  <Text>• 8pxの倍数でない値を使用しない（15px, 18px等）</Text>
                  <Text>• 過度な余白を設定しない（64px以上）</Text>
                  <Text>• 不十分な余白を設定しない（4px未満）</Text>
                  <Text>• 不統一なスペーシングを使用しない</Text>
                  <Text>• グローバルな余白を直接変更しない</Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* クイックリファレンス */}
        <Card title="クイックリファレンス">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Title level={4}>スペーシング値一覧</Title>

            <Table
              dataSource={[
                { key: '1', token: 'marginXS', px: '8px', use: '密接な関係（ラベル-入力、アイコン-テキスト）' },
                { key: '2', token: 'marginSM', px: '12px', use: 'ボタン間、小さな区切り' },
                { key: '3', token: 'margin', px: '16px', use: '標準スペーシング（セクション内、カード間）' },
                { key: '4', token: 'marginMD', px: '20px', use: '中程度の区切り' },
                { key: '5', token: 'marginLG', px: '24px', use: '明確な分離（セクション間）' },
                { key: '6', token: 'marginXL', px: '32px', use: '大きな分離（ヘッダー-コンテンツ）' },
                { key: '7', token: 'marginXXL', px: '48px', use: '超大きな分離（特別な場合のみ）' },
              ]}
              columns={[
                { title: 'トークン', dataIndex: 'token', key: 'token' },
                { title: 'ピクセル値', dataIndex: 'px', key: 'px' },
                { title: '用途', dataIndex: 'use', key: 'use' },
              ]}
              pagination={false}
              size="small"
            />
          </Space>
        </Card>
      </Space>

      {/* モーダル例 */}
      <Modal
        title="モーダルスペーシング例"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button>クリア</Button>
            <Space size={12}>
              <Button onClick={() => setModalOpen(false)} icon={<CloseOutlined />}>
                キャンセル
              </Button>
              <Button type="primary" icon={<SaveOutlined />}>
                保存
              </Button>
            </Space>
          </div>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            message="モーダル内部スペーシング"
            description="ヘッダー: 16px 24px / ボディ: 24px / フッター: 10px 16px"
            type="info"
            showIcon
          />

          <Form layout="vertical">
            <Form.Item label="項目1">
              <Input />
            </Form.Item>
            <Form.Item label="項目2">
              <Input />
            </Form.Item>
            <Form.Item label="項目3">
              <Select placeholder="選択してください" />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </div>
  );
}
